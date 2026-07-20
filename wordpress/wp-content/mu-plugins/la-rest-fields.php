<?php
/**
 * Plugin Name: LA REST Fields
 * Description: Exposes the per-item `visibility`/`content_type` (and recipe sort labels) to the
 *   WP REST API, plus an auth-only route that assembles a recipe's body HTML from its ACF fields.
 *   Consumed by the Lentine app's `wp-articles` Supabase edge function. No secrets here.
 *
 * Why a mu-plugin: keeps the live theme byte-identical except the one `show_in_rest` line on the
 * recipe CPT, and survives theme updates. The PUBLIC REST surface carries only summaries + the
 * `visibility` flag (matching today's behaviour, where recipe/post hero titles already render to
 * logged-out users); the gated body is returned ONLY by the auth-only `la/v1/recipe/<slug>` route.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Map an ACF select field's stored values to their human labels (mirrors single-recipe.php). */
function la_acf_labels( $field_name, $post_id ) {
	if ( ! function_exists( 'get_field_object' ) ) {
		return array();
	}
	$field  = get_field_object( $field_name, $post_id );
	$values = get_field( $field_name, $post_id );
	$labels = array();
	if ( $values && is_array( $values ) && ! empty( $field['choices'] ) ) {
		foreach ( $values as $value ) {
			if ( isset( $field['choices'][ $value ] ) ) {
				$labels[] = $field['choices'][ $value ];
			}
		}
	}
	return $labels;
}

/**
 * The item's visibility, normalized to the app's two values; default `paid` (fail safe).
 *
 * Recipes carry a curated ACF `visibility` flag, so the raw read is trustworthy. Posts do
 * NOT — the field was never set on them (it reads as its 'free' default) while the site
 * actually restricts them via WooCommerce Memberships rules. Trusting the flag alone leaked
 * members-only post bodies (incl. live-session links) to anonymous app users. So for posts,
 * mirror the real gate: Memberships' own restriction check when the plugin is active, with a
 * fail-closed fallback (uncurated flag + members-area category => paid) when it isn't.
 */
function la_visibility( $post_id ) {
	$acf = function_exists( 'get_field' ) ? get_field( 'visibility', $post_id ) : '';

	if ( get_post_type( $post_id ) === 'post' ) {
		if ( function_exists( 'wc_memberships_is_post_content_restricted' ) ) {
			// Memberships is the live gate for posts — mirror it exactly (honoring the
			// per-post "force public" editorial override when the helper exists).
			$restricted = wc_memberships_is_post_content_restricted( $post_id )
				&& ! ( function_exists( 'wc_memberships_is_post_public' ) && wc_memberships_is_post_public( $post_id ) );
			if ( $restricted ) {
				return 'paid';
			}
			return ( $acf === 'paid' ) ? 'paid' : 'free';
		}
		// Memberships unavailable: a never-saved flag on a members-area post fails closed.
		$stored = get_post_meta( $post_id, 'visibility', true );
		if ( '' === $stored && has_category( 'back-forward', $post_id ) ) {
			return 'paid';
		}
	}

	return ( $acf === 'free' ) ? 'free' : 'paid';
}

// Force the recipe CPT into the REST API regardless of how (or where) the theme registers
// it. The theme's own `show_in_rest` line kept getting lost to prod→staging copies and
// theme updates; this filter wins over any registration, keeping the whole app bridge
// restorable by re-uploading mu-plugins alone.
add_filter(
	'register_post_type_args',
	function ( $args, $post_type ) {
		if ( 'recipe' === $post_type ) {
			$args['show_in_rest'] = true;
		}
		return $args;
	},
	10,
	2
);

add_action(
	'rest_api_init',
	function () {
		// visibility + content_type on both gated post types.
		foreach ( array( 'post', 'recipe' ) as $type ) {
			register_rest_field(
				$type,
				'visibility',
				array(
					'get_callback' => function ( $obj ) {
						return la_visibility( $obj['id'] );
					},
					'schema'       => array( 'type' => 'string' ),
				)
			);
			register_rest_field(
				$type,
				'content_type',
				array(
					'get_callback' => function ( $obj ) {
						return get_post_type( $obj['id'] ) === 'recipe' ? 'recipe' : 'post';
					},
					'schema'       => array( 'type' => 'string' ),
				)
			);
		}

		// Recipe sort labels (recipes carry no taxonomy — these come from ACF).
		foreach ( array( 'category', 'season', 'dosha' ) as $acf_field ) {
			register_rest_field(
				'recipe',
				$acf_field,
				array(
					'get_callback' => function ( $obj ) use ( $acf_field ) {
						return la_acf_labels( $acf_field, $obj['id'] );
					},
					'schema'       => array( 'type' => 'array' ),
				)
			);
		}

		// Auth-only: the assembled recipe body. Kept off the public REST surface so the gate
		// stays server-side — the app's edge function calls this with the WP Application Password,
		// and decides entitlement via the caller's Supabase tier before ever requesting it.
		register_rest_route(
			'la/v1',
			'/recipe/(?P<slug>[a-zA-Z0-9-]+)',
			array(
				'methods'             => 'GET',
				// Privileged route: ONLY the edge function may call it, authenticating as the admin
				// Application-Password user. The per-user TIER decision is made upstream in the edge
				// function from the caller's Supabase JWT. Requiring manage_options stops any
				// logged-in WP member from pulling paid recipe bodies directly (paywall bypass).
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'callback'            => 'la_recipe_body_route',
			)
		);
	}
);

/** REST callback: resolve a recipe by slug and return its assembled body HTML. */
function la_recipe_body_route( $request ) {
	$slug  = $request['slug'];
	$posts = get_posts(
		array(
			'name'           => $slug,
			'post_type'      => 'recipe',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
		)
	);
	if ( empty( $posts ) ) {
		return new WP_Error( 'not_found', 'Recipe not found', array( 'status' => 404 ) );
	}
	$post_id = $posts[0]->ID;
	return array(
		'id'          => $post_id,
		'slug'        => $slug,
		'visibility'  => la_visibility( $post_id ),
		'recipe_body' => la_cached_recipe_body( $post_id ),
	);
}

/**
 * The assembled body walks ~10 ACF repeaters — several seconds of PHP per request, and this
 * route is authenticated so WP Engine's page cache never applies. Cache the finished HTML in
 * a transient; editing the recipe (see the hooks below) rebuilds it on the next request.
 */
function la_cached_recipe_body( $post_id ) {
	$cache_key = 'la_recipe_body_' . $post_id;
	$body      = get_transient( $cache_key );
	if ( false === $body ) {
		$body = la_assemble_recipe_body( $post_id );
		set_transient( $cache_key, $body, 12 * HOUR_IN_SECONDS );
	}
	return $body;
}

// Invalidate on save: the classic editor path (save_post_recipe) and the ACF field save
// (acf/save_post at priority 20 = after the new field values are written).
add_action(
	'save_post_recipe',
	function ( $post_id ) {
		delete_transient( 'la_recipe_body_' . $post_id );
	}
);
add_action(
	'acf/save_post',
	function ( $post_id ) {
		if ( 'recipe' === get_post_type( $post_id ) ) {
			delete_transient( 'la_recipe_body_' . $post_id );
		}
	},
	20
);

/**
 * Assemble a recipe's gated body as clean HTML (h3/h4/ul/ol/p) for the app's HTML renderer.
 * Faithful port of the gated section of single-recipe.php (intro, recipe notes, flavor notes +
 * taste list, ingredients, instructions) minus web-only controls (serving spinner, favorite).
 */
function la_assemble_recipe_body( $post_id ) {
	$html = '';

	$intro = get_field( 'intro', $post_id );
	if ( $intro ) {
		$html .= $intro;
	}

	$notes = get_field( 'notes', $post_id );
	if ( $notes ) {
		$html .= '<h3>Recipe Notes</h3>' . $notes;
	}

	$flavor_notes = get_field( 'flavor_notes', $post_id );
	if ( $flavor_notes ) {
		$tastes = array(
			'SWEET'      => get_field( 'flavor_sweet', $post_id ),
			'SALTY'      => get_field( 'flavor_salty', $post_id ),
			'SOUR'       => get_field( 'flavor_sour', $post_id ),
			'BITTER'     => get_field( 'flavor_bitter', $post_id ),
			'ASTRINGENT' => get_field( 'flavor_astringent', $post_id ),
			'PUNGENT'    => get_field( 'flavor_pungent', $post_id ),
		);
		$html .= '<h3>Flavor Notes</h3>' . $flavor_notes . '<ul>';
		foreach ( $tastes as $label => $value ) {
			$html .= '<li><strong>' . $label . ':</strong> ' . ( $value ? $value : 'N/A' ) . '</li>';
		}
		$html .= '</ul>';
	}

	// Ingredients — repeater of sections, each with an optional headline + an ingredients sub-repeater.
	if ( have_rows( 'ingredient_section', $post_id ) ) {
		$html .= '<h3>Ingredients</h3>';
		while ( have_rows( 'ingredient_section', $post_id ) ) {
			the_row();
			$headline = get_sub_field( 'headline' );
			if ( $headline ) {
				$html .= '<h4>' . $headline . '</h4>';
			}
			$html .= '<ul>';
			while ( have_rows( 'ingredients' ) ) {
				the_row();
				$amount     = get_sub_field( 'amount' );
				$unit       = get_sub_field( 'unit' );
				$ingredient = get_sub_field( 'name' );
				$notes_sub  = get_sub_field( 'notes' );
				$parts      = trim( $amount . ' ' . $unit );
				$line       = trim( $parts . ' ' . $ingredient );
				if ( $notes_sub ) {
					$line .= ' (' . $notes_sub . ')';
				}
				$html .= '<li>' . $line . '</li>';
			}
			$html .= '</ul>';
		}
	}

	// Instructions — numbered steps, each with an optional headline + WYSIWYG content.
	if ( have_rows( 'instructions', $post_id ) ) {
		$html .= '<h3>Instructions</h3><ol>';
		while ( have_rows( 'instructions', $post_id ) ) {
			the_row();
			$headline = get_sub_field( 'headline' );
			$content  = get_sub_field( 'content' );
			$html    .= '<li>';
			if ( $headline ) {
				$html .= '<h4>' . $headline . '</h4>';
			}
			$html .= $content . '</li>';
		}
		$html .= '</ol>';
	}

	return $html;
}
