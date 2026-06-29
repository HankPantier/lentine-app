<?php
/**
 * Plugin Name: Supabase Auth Bridge
 * Description: Authenticates WordPress logins against Supabase (single source of truth for auth +
 *   subscription tier) instead of WooCommerce. On a successful Supabase sign-in the user is matched
 *   to the existing WP user by email; their tier is cached and exposed via btf_user_has_tier() for
 *   content gating. Native WP auth remains as a graceful fallback (so admins keep working).
 *
 * Config (define in wp-config.php — NEVER commit):
 *   define( 'SUPABASE_URL', 'https://<ref>.supabase.co' );
 *   define( 'SUPABASE_ANON_KEY', '<anon public key>' );
 *   define( 'SUPABASE_SERVICE_ROLE_KEY', '<service role key>' );  // server-side only
 *
 * If the constants are absent the bridge stays inert and WordPress authenticates normally.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const BTF_TIER_TTL = 600; // seconds to cache a user's resolved tier before re-checking Supabase

/** Whether the Supabase bridge is configured (all three constants present). */
function btf_bridge_enabled() {
	return defined( 'SUPABASE_URL' ) && SUPABASE_URL
		&& defined( 'SUPABASE_ANON_KEY' ) && SUPABASE_ANON_KEY
		&& defined( 'SUPABASE_SERVICE_ROLE_KEY' ) && SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Sign in to Supabase with email + password. Returns array( 'access_token', 'uid' ) on success,
 * or false on any failure (bad credentials, network, misconfig).
 */
function btf_supabase_sign_in( $email, $password ) {
	if ( ! btf_bridge_enabled() ) {
		return false;
	}
	$res = wp_remote_post(
		rtrim( SUPABASE_URL, '/' ) . '/auth/v1/token?grant_type=password',
		array(
			'timeout' => 12,
			'headers' => array(
				'apikey'       => SUPABASE_ANON_KEY,
				'Content-Type' => 'application/json',
			),
			'body'    => wp_json_encode(
				array(
					'email'    => $email,
					'password' => $password,
				)
			),
		)
	);
	if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
		return false;
	}
	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( empty( $data['access_token'] ) || empty( $data['user']['id'] ) ) {
		return false;
	}
	return array(
		'access_token' => $data['access_token'],
		'uid'          => $data['user']['id'],
	);
}

/**
 * Resolve a Supabase user's entitling subscription tier ('recipe' | 'back_to_forward' | '').
 * Reads via the service role (server-side only) so RLS doesn't hide other-user rows.
 */
function btf_get_subscription_tier( $uid ) {
	if ( ! btf_bridge_enabled() || ! $uid ) {
		return '';
	}
	$url = rtrim( SUPABASE_URL, '/' ) . '/rest/v1/subscriptions'
		. '?user_id=eq.' . rawurlencode( $uid )
		. '&status=in.(active,trialing)'
		. '&select=' . rawurlencode( 'subscription_tiers(slug)' );
	$res = wp_remote_get(
		$url,
		array(
			'timeout' => 12,
			'headers' => array(
				'apikey'        => SUPABASE_SERVICE_ROLE_KEY,
				'Authorization' => 'Bearer ' . SUPABASE_SERVICE_ROLE_KEY,
			),
		)
	);
	if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
		return '';
	}
	$rows = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( empty( $rows ) || ! is_array( $rows ) ) {
		return '';
	}
	$slug = isset( $rows[0]['subscription_tiers']['slug'] ) ? $rows[0]['subscription_tiers']['slug'] : '';
	return ( 'recipe' === $slug || 'back_to_forward' === $slug ) ? $slug : '';
}

/**
 * The current user's cached tier, refreshing from Supabase when stale. Returns '' for users with
 * no entitling subscription (or who didn't sign in through the bridge).
 */
function btf_current_tier( $user_id = null ) {
	$user_id = $user_id ? $user_id : get_current_user_id();
	if ( ! $user_id ) {
		return '';
	}
	$uid = get_user_meta( $user_id, 'btf_supabase_uid', true );
	if ( ! $uid ) {
		return '';
	}
	$checked_at = (int) get_user_meta( $user_id, 'btf_tier_checked_at', true );
	if ( $checked_at && ( time() - $checked_at ) < BTF_TIER_TTL ) {
		return (string) get_user_meta( $user_id, 'btf_tier', true );
	}
	$tier = btf_get_subscription_tier( $uid );
	update_user_meta( $user_id, 'btf_tier', $tier );
	update_user_meta( $user_id, 'btf_tier_checked_at', time() );
	return $tier;
}

/**
 * Whether the current user satisfies a content gate. `recipe` content is satisfied by EITHER paid
 * tier; `back_to_forward` content only by back_to_forward. Mirrors the app + edge-function rule.
 */
function btf_user_has_tier( $required ) {
	if ( ! is_user_logged_in() ) {
		return false;
	}
	$tier = btf_current_tier();
	if ( 'recipe' === $required ) {
		return ( 'recipe' === $tier || 'back_to_forward' === $tier );
	}
	if ( 'back_to_forward' === $required ) {
		return ( 'back_to_forward' === $tier );
	}
	return false;
}

/**
 * Authenticate against Supabase, then resolve to the matching WP user by email. Runs after WP's
 * native username/email checks (priority 20): on Supabase success we take over; on any Supabase
 * failure we return whatever native auth produced (graceful fallback — keeps admin login working).
 */
function btf_authenticate( $user, $username, $password ) {
	if ( ! btf_bridge_enabled() || empty( $username ) || empty( $password ) ) {
		return $user;
	}
	$signin = btf_supabase_sign_in( $username, $password );
	if ( ! $signin ) {
		return $user; // fall back to native WP auth result
	}
	$wp_user = get_user_by( 'email', $username );
	if ( ! $wp_user ) {
		// Supabase knows this user but WP doesn't (email drift) — log and fall back.
		error_log( '[supabase-bridge] Supabase sign-in ok but no WP user for email: ' . $username );
		return $user;
	}
	update_user_meta( $wp_user->ID, 'btf_supabase_uid', $signin['uid'] );
	// Prime the tier cache immediately so the first gated page render is correct.
	$tier = btf_get_subscription_tier( $signin['uid'] );
	update_user_meta( $wp_user->ID, 'btf_tier', $tier );
	update_user_meta( $wp_user->ID, 'btf_tier_checked_at', time() );
	return $wp_user;
}
add_filter( 'authenticate', 'btf_authenticate', 25, 3 );

/** Drop the cached tier on logout so the next sign-in re-resolves it. */
function btf_clear_tier_cache() {
	$user_id = get_current_user_id();
	if ( $user_id ) {
		delete_user_meta( $user_id, 'btf_tier' );
		delete_user_meta( $user_id, 'btf_tier_checked_at' );
	}
}
add_action( 'wp_logout', 'btf_clear_tier_cache' );
