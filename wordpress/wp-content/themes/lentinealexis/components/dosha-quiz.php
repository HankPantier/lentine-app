<?php 
    if ( class_exists( 'WC_Product_Factory' ) ) {
        $wc_pf   = new WC_Product_Factory();
        $product = $wc_pf->get_product('446');
    }
    $current_user = wp_get_current_user();

    $headline = get_sub_field('headline');
    $blurb = get_sub_field('blurb');
    $blurbPurchased = get_sub_field('blurb_purchased');
    $intro = get_sub_field('intro');
    $not_logged_in = get_sub_field('not_logged_in');
    $form = get_sub_field('form');

    $featured_img_url = get_the_post_thumbnail_url($post->ID, 'full'); 
?>

<section class="component hero" <?php if( $featured_img_url ) { ?> style="background-image: url(<?php echo $featured_img_url; ?>); background-repeat: no-repeat; background-position: center center; background-size: cover;" <?php } ?>>
    <div class="content-wrap">
        
        <?php 
            echo '<h1>' . $headline . '</h1>';

            if( ( function_exists( 'wcs_user_has_subscription' ) && wcs_user_has_subscription('', '', 'active') ) || current_user_can( 'administrator' ) || wc_customer_bought_product_last_365('', get_current_user_id(), 446) || wc_customer_bought_product_last_365('', get_current_user_id(), 41609)|| wc_customer_bought_product_last_365('', get_current_user_id(), 41610)){
                echo '<p>' . $blurbPurchased . '</p>';
            } else {
                echo '<p>' . $blurb . '</p>';

                echo '<a class="button" href="/ayurvedic-medicine/book-a-consultation/">Book a Consultation</a>';
            }
        ?>
        
    </div>
</section>







<?php /* commented out request to NOT have paywall on dosha quiz :: if( wcs_user_has_subscription('', '', 'active') || current_user_can( 'administrator' ) || wc_customer_bought_product_last_365('', get_current_user_id(), 446) || wc_customer_bought_product_last_365('', get_current_user_id(), 41609)|| wc_customer_bought_product_last_365('', get_current_user_id(), 41610)){ */ ?>
    <section class="component form dosha-quiz">
        <div class="section-wrap">
            <?php if ( is_user_logged_in() ) { ?>
                <p class="quiz-intro"><?php echo $intro; ?></p>
                <?php echo do_shortcode($form); ?> 
            <?php } else { ?>
                <p class="quiz-intro"><?php echo $not_logged_in; ?></p>

                <div class="container">
                    <div class="column">
                        <h3>Already a member?</h3>
                        <h2>Login</h2>
                        <?php echo do_shortcode("[ninja_form id=12]"); ?> 
                    </div>
                    <div class="column">
                        <h3>Ready to get started?</h3>
                        <h2>Register now</h2>
                        <?php echo do_shortcode("[ninja_form id=11]"); ?> 
                    </div>
                </div>
            <?php } ?>

            
        </div>
    </section>
<?php /* END: commented out request to NOT have paywall on dosha quiz :: } */ ?>