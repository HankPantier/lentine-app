<?php

function lentinealexis_register_cpts() {

	$labels = [
		"name" => __( "Recipes", "Lentine-Alexis-Theme" ),
		"singular_name" => __( "Recipe", "Know-How-Theme" ),
	];

	$args = [
		"label" => __( "Recipes", "Lentine-Alexis-Theme" ),
		"labels" => $labels,
		"description" => "",
		"public" => true,
		"publicly_queryable" => true,
		"show_ui" => true,
		"show_in_rest" => true,
		"rest_base" => "",
		"rest_controller_class" => "WP_REST_Posts_Controller",
		"has_archive" => false,
		"show_in_menu" => true,
		"show_in_nav_menus" => true,
		"delete_with_user" => false,
		"exclude_from_search" => false,
		"capability_type" => "post",
		"map_meta_cap" => true,
		"hierarchical" => false,
		"rewrite" => [ "slug" => "recipe", "with_front" => true ],
		"query_var" => true,
		// "menu_icon" => "dashicons-megaphone",
		// "taxonomies" => [ "category" ],
        'supports' => array('title', 'excerpt', 'thumbnail'),
	];

	register_post_type( "recipe", $args );

}

add_action( 'init', 'lentinealexis_register_cpts' );
