<?php

// Add to Cart text/destination
add_filter( 'woocommerce_loop_add_to_cart_link', 'replacing_add_to_cart_button', 10, 2 );
function replacing_add_to_cart_button( $button, $product  ) {
    $button_text = __("Learn More", "woocommerce");
    $button = '<a class="button add_to_cart_button" href="' . $product->get_permalink() . '">' . $button_text . '</a>';

    return $button;
}

// Add to Cart Redirect
// add_filter( 'woocommerce_add_to_cart_redirect', 'redirect_checkout_add_cart' );
 
// function redirect_checkout_add_cart() {
//    return wc_get_cart_url();
// }


// Detect if User has purchased product within 1 year
function wc_customer_bought_product_last_365( $customer_email, $user_id, $product_id ) {
   global $wpdb;
 
   $result = apply_filters( 'woocommerce_pre_customer_bought_product', null, $customer_email, $user_id, $product_id );
 
   if ( null !== $result ) {
      return $result;
   }
 
   $transient_name = 'wc_cbp_' . md5( $customer_email . $user_id . WC_Cache_Helper::get_transient_version( 'orders' ) );
 
   if ( false === ( $result = get_transient( $transient_name ) ) ) {
      $customer_data = array( $user_id );
 
      if ( $user_id ) {
         $user = get_user_by( 'id', $user_id );
 
         if ( isset( $user->user_email ) ) {
            $customer_data[] = $user->user_email;
         }
      }
 
      if ( is_email( $customer_email ) ) {
         $customer_data[] = $customer_email;
      }
 
      $customer_data = array_map( 'esc_sql', array_filter( array_unique( $customer_data ) ) );
      $statuses      = array_map( 'esc_sql', wc_get_is_paid_statuses() );
 
      if ( sizeof( $customer_data ) == 0 ) {
         return false;
      }
 
      $result = $wpdb->get_col( "
         SELECT im.meta_value FROM {$wpdb->posts} AS p
         INNER JOIN {$wpdb->postmeta} AS pm ON p.ID = pm.post_id
         INNER JOIN {$wpdb->prefix}woocommerce_order_items AS i ON p.ID = i.order_id
         INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta AS im ON i.order_item_id = im.order_item_id
         WHERE p.post_status IN ( 'wc-" . implode( "','wc-", $statuses ) . "' )
            AND p.post_date > '" . date('Y-m-d', strtotime('-365 days')) . "'
            AND p.post_date > '" . date('2023-08-31') . "'
         AND pm.meta_key IN ( '_billing_email', '_customer_user' )
         AND im.meta_key IN ( '_product_id', '_variation_id' )
         AND im.meta_value != 0
         AND pm.meta_value IN ( '" . implode( "','", $customer_data ) . "' )
      " );
      $result = array_map( 'absint', $result );
 
      set_transient( $transient_name, $result, DAY_IN_SECONDS * 30 );
   }
   return in_array( absint( $product_id ), $result );
}


// Add theme support
add_action( 'after_setup_theme', 'woocommerce_support' );
function woocommerce_support() {
   add_theme_support( 'woocommerce' );
}  



// Only allow 1 product/subscription
add_filter( 'woocommerce_add_to_cart_validation', 'lentine_only_one_in_cart', 9999, 2 );
function lentine_only_one_in_cart( $passed, $added_product_id ) {
   wc_empty_cart();
   return $passed;
}



// Redirect to different checkout pages
add_filter( 'woocommerce_add_to_cart_redirect', 'lentine_add_to_cart_redirect', 10, 1 );
function lentine_add_to_cart_redirect( $url ) {

    $product_id = apply_filters( 'woocommerce_add_to_cart_product_id', absint( $_REQUEST['add-to-cart'] ) );

    if ( in_array( $product_id, array( 266, 36983 ) ) ) {
        $url = get_permalink( 263 );
    } else if (in_array( $product_id, array( 446, 37371 ) )){
        $url = get_permalink( 31 ); 
    } else {
      $url = '/checkout';
    }  
    return $url;
}





// Redirect to different Thank You pages
add_action( 'woocommerce_thankyou', 'lentine_redirectcustom');
function lentine_redirectcustom( $order_id ){
   $order = wc_get_order( $order_id );
      
   /* foreach( $order->get_items() as $item ) {
      if ( $item['product_id'] == 266 || $item['product_id'] == 36983 ) {
          wp_redirect( get_permalink( 210 ) );
      } else {
         wp_redirect( get_permalink( 461 ) );
      }
   } */
   wp_redirect( get_permalink( 44998 ) ); // https://lentinealexis.com/order-confirmation/
}


// Account Tab Order
// function reorder_account_menu( $items ) {
//    return array(
//          //  'dashboard'          => __( 'Dashboard', 'woocommerce' ),
//          'edit-account'       => __( 'Account', 'woocommerce' ),
//          'subscriptions'          => __( 'Subscriptions', 'woocommerce' ),
//          'orders'             => __( 'Orders', 'woocommerce' ),
//          'downloads'          => __( 'Downloads', 'woocommerce' ),
//          // 'edit-address'       => __( 'Addresses', 'woocommerce' ),
//          'customer-logout'    => __( 'Logout', 'woocommerce' ),
//    );
// }
// add_filter ( 'woocommerce_account_menu_items', 'reorder_account_menu' );



// Move Coupon Code
// remove_action( 'woocommerce_before_checkout_form', 'woocommerce_checkout_coupon_form', 10 );
// add_action( 'woocommerce_review_order_before_payment', 'woocommerce_checkout_coupon_form' );


// Ayurvedic Account Tab
if ( class_exists( 'WC_Product_Factory' ) ) {
   $wc_pf   = new WC_Product_Factory();
   $product = $wc_pf->get_product('446');
}
$current_user = wp_get_current_user();

function reorder_AYURVEDIC_account_menu( $items ) {
   return array(
         //  'dashboard'          => __( 'Dashboard', 'woocommerce' ),
         // 'edit-account'       => __( 'Account', 'woocommerce' ),
         'orders'             => __( 'Orders', 'woocommerce' ),
         'subscriptions'          => __( 'Subscriptions', 'woocommerce' ),
         'payment-methods'          => __( 'Payment Methods', 'woocommerce' ),
         'ayurvedic'           => __( 'Ayurvedic', 'woocommerce' ),
         // 'downloads'          => __( 'Downloads', 'woocommerce' ),
         'edit-address'       => __( 'Addresses', 'woocommerce' ),
         'customer-logout'    => __( 'Logout', 'woocommerce' ),
   );

}
add_filter ( 'woocommerce_account_menu_items', 'reorder_AYURVEDIC_account_menu' );


add_action( 'init', 'register_ayurvedic_endpoint');
function register_ayurvedic_endpoint() {
   add_rewrite_endpoint( 'ayurvedic', EP_ROOT | EP_PAGES );
}

add_filter( 'query_vars', 'ayurvedic_query_vars' );
function ayurvedic_query_vars( $vars ) {
   $vars[] = 'ayurvedic';
   return $vars;
}

add_filter( 'woocommerce_account_menu_items', 'add_ayurvedic_tab' );
function add_ayurvedic_tab( $items ) {
   $items['ayurvedic'] = 'Ayurvedic';
   return $items;
}

add_action( 'woocommerce_account_ayurvedic_endpoint', 'add_ayurvedic_content' );
function add_ayurvedic_content() {

   $current_user = wp_get_current_user();
   $current_user_id = $current_user->ID;

   $dosha_score = get_field('dosha_score', 'user_'.$current_user_id);

   if($dosha_score <= 67) {
      $dosha = 'Vata';
   } else if ($dosha_score > 67 & $dosha_score < 134) {
      $dosha = 'Pitta';
   } else if ($dosha_score >= 134) {
      $dosha = 'Kapha';
   }


   if($dosha_score) {
      echo '<div style="text-align: center;">';
         echo '<h3>Your Mind-Body Type is: ' . $dosha . '</h3>';
         echo '<p>All three doshas are present in everyone to some degree. How they appear, and in what proportion, is what makes each person unique. Usually one or two doshas predominate, dictating your tendencies in mind and body.</p>';
         echo '<a class="button" href="/ayurvedic-medicine/dosha-results/">Learn More</a>';

         echo '<div class="ayurvedic-followup">';
            echo '<h3>Book a 90 Minute Follow-Up Consultation</h3>';
            echo '<a class="button" href="/?add-to-cart=37371">Book Consultation</a>';
         echo '</div>';
      echo '</div>';
      
   } else {
      echo '<div style="text-align: center;">';
         echo '<h3>Determine Your Mind-Body Type</h3>';
         echo '<p>All three doshas are present in everyone to some degree. How they appear, and in what proportion, is what makes each person unique. Usually one or two doshas predominate, dictating your tendencies in mind and body.</p>';
         echo '<a class="button" href="/ayurvedic-medicine/dosha-quiz/">Take the Dosha Quiz</a>';

         echo '<div class="ayurvedic-followup">';
            echo '<h3>Book a 90 Minute Follow-Up Consultation</h3>';
            echo '<a class="button" href="/?add-to-cart=37371">Book Consultation</a>';
         echo '</div>';
      echo '</div>';
   }
}


// Classes for purchase types
add_filter( 'body_class', 'custom_class' );
function custom_class( $classes ) {

   // WooCommerce (with an initialized cart) must be active for these purchase-type classes.
   if ( ! function_exists( 'WC' ) || ! WC() || is_null( WC()->cart ) ) {
      return $classes;
   }

   if( ( function_exists( 'wcs_user_has_subscription' ) && wcs_user_has_subscription('', '', 'active') ) || current_user_can( 'administrator' ) || wc_customer_bought_product_last_365('', get_current_user_id(), 446)){
      $classes[] = 'recipe-customer';
   }

   $wc_pf = new WC_Product_Factory();
   $productAyurvedic = $wc_pf->get_product('446');
   $current_user = wp_get_current_user();
   
   if( wc_customer_bought_product( $current_user->email, $current_user->ID, $productAyurvedic->id ) ){
      $classes[] = 'ayurvedic-customer';
   }

   $monthly_product_id = 266;
   $monthly_product_cart_id = WC()->cart->generate_cart_id( $monthly_product_id );
   $monthly_in_cart = WC()->cart->find_product_in_cart( $monthly_product_cart_id );
  
   if ( $monthly_in_cart ) {
      $classes[] = 'monthly-in-cart';
   }

   $annual_product_id = 36983;
   $annual_product_cart_id = WC()->cart->generate_cart_id( $annual_product_id );
   $annual_in_cart = WC()->cart->find_product_in_cart( $annual_product_cart_id );
  
   if ( $annual_in_cart ) {
      $classes[] = 'annual-in-cart';
   }

	return $classes;
}





// Auto complete orders
add_filter( 'woocommerce_payment_complete_order_status', 'auto_complete_virtual_orders', 10, 3 );

function auto_complete_virtual_orders( $payment_complete_status, $order_id, $order ) {
   $current_status = $order->get_status();
   // We only want to update the status to 'completed' if it's coming from one of the following statuses:
   $allowed_current_statuses = array( 'on-hold', 'pending', 'failed' );

   if ( 'processing' === $payment_complete_status && in_array( $current_status, $allowed_current_statuses ) ) {

      $order_items = $order->get_items();

      // Create an array of products in the order
      $order_products = array_filter( array_map( function( $item ) {
      // Get associated product for each line item
         return $item->get_product();
      }, $order_items ), function( $product ) {
      // Remove non-products
         return !! $product;
      } );

      if ( count($order_products) > 0  ) {
         // Check if each product is 'virtual'
         $is_virtual_order = array_reduce( $order_products, function( $virtual_order_so_far, $product ) {
            return $virtual_order_so_far && $product->is_virtual();
         }, true );

         if ( $is_virtual_order ) {
            $payment_complete_status = 'completed';
         }
      }
   }
   return $payment_complete_status;
}




// Ayurvedic Email
// add_filter( 'woocommerce_email_recipient_new_order', 'conditional_recipient_new_email_notification', 15, 2 );
// function conditional_recipient_new_email_notification( $recipient, $order ) {
//     if( is_admin() ) return $recipient; 

//     $targeted_ids = array(446, 37371); 
//     $addr_email = 'shop@lentinealexis.com'; 

//     // Loop through orders items
//     foreach ($order->get_items() as $item_id => $item ) {
//         if ( in_array($item->get_variation_id(), $targeted_ids) || in_array($item->get_product_id(), $targeted_ids) ) {
//             $recipient .= ', ' . $addr_email;
//             break; 
//         }
//     }

//     return $recipient;
// }

// On order completed status
add_action('woocommerce_order_status_completed', 'ayurvedic_consultation_email', 20, 1 );
function ayurvedic_consultation_email( $order_id ) {
    $order = wc_get_order( $order_id );

    foreach ( $order->get_items() as $item_id => $item ) {
        $product = $item->get_product();

        $user = $order->get_user();
        $userEmail = $order->get_billing_email();
        $userFirstName = $order->get_billing_first_name();
        $userLastName = $order->get_billing_last_name();
        $userName = $userFirstName . ' ' . $userLastName;
        $orderDate = $order->get_date_paid();

        $the_id = $product->is_type('variation') ? $product->get_parent_id() : $product->get_id();

        if (  has_term( array( 446, 37371 ), 'product_id' ) ) {
            $to_email = 'shop@lentinealexis.com'; 
            $subject = "New Ayurvedic Consultation";
            $message = 'New Ayurvedic Consultation Customer - ' . $userName . ': <a href="mailto:' . $userEmail . '>' . $userEmail . '</a>';
            $headers = 'From: Lentine Alexis <shop@lentinealexis.com>' . "\r\n"; 

            wp_mail( $to_email, $subject, $message, $headers ); // Send email
            break; 
        }
    }
}



