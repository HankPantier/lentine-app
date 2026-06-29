<?php 
    get_header(); 

    if ( class_exists( 'WC_Product_Factory' ) ) {
        $wc_pf   = new WC_Product_Factory();
        $product = $wc_pf->get_product('266');
    }
    $current_user = wp_get_current_user();

    // Recipe gating reads the member's tier from Supabase (single source of truth) via the
    // supabase-bridge mu-plugin. Recipes unlock for EITHER paid tier; admins always see content.
    if ( function_exists( 'btf_user_has_tier' ) && ( btf_user_has_tier( 'recipe' ) || current_user_can( 'administrator' ) ) ) {
        $subscriber = 'MEMBER';
    } else {
        $subscriber = '';
    }


    $visibility = get_field('visibility');
    // echo $visibility;
    // $visibility = 'paid';

    // recipe: 45783 - recipe-library-membership
    // b2f: 45782 - back-to-forward-membership

    // iW testing 10 July 2025 */
    // https://www.google.com/search?client=safari&rls=en&q=woocommerce+subscriptions+see+if+user+has+subscription&ie=UTF-8&oe=UTF-8
    
    /* echo '<pre>';
    print_r( $current_user );
    echo '</pre>';

    echo '<h1>visibility: ' . $visibility . '</h1>';
    */
    
    // (Legacy WooCommerce membership/subscription gating removed — $subscriber is resolved from
    //  the Supabase tier above. One source of truth for tier lives in Supabase.)


    

    $seasonLabels = array();
    $seasonField = get_field_object('season');
    $seasonValues = get_field('season');
    foreach ($seasonValues as $seasonValue) {
        $seasonLabels[] = $seasonField['choices'][ $seasonValue ];
    }

    $categoryLabels = array();
    $categoryField = get_field_object('category');
    $categoryValues = get_field('category');
    foreach ($categoryValues as $categoryValue) {
        $categoryLabels[] = $categoryField['choices'][ $categoryValue ];
    }

    $doshaLabels = array();
    $doshaField = get_field_object('dosha');
    $doshaValues = get_field('dosha');
    // $doshaLabel = $doshaField['choices'][ $doshaValue ];
    foreach ($doshaValues as $doshaValue) {
        $doshaLabels[] = $doshaField['choices'][ $doshaValue ];
    }

    $recipeNotes = get_field('notes');
    $recipeSize = get_field('size');
    $recipeSizeUnit = get_field('size_unit');
    $recipeTime = get_field('time');
    $recipeServingBlurb = get_field('serving_blurb');

    $recapExcerpt = '<p>' . get_the_excerpt() . '</p>';

    $flavorNotes = get_field('flavor_notes');
    $flavorSweet = get_field('flavor_sweet');
    $flavorSalty = get_field('flavor_salty');
    $flavorSour = get_field('flavor_sour');
    $flavorBitter = get_field('flavor_bitter');
    $flavorAstringent = get_field('flavor_astringent');
    $flavorPungent = get_field('flavor_pungent');
    
    if(empty($flavorSweet)) { $flavorSweet = 'N/A'; }
    if(empty($flavorSalty)) { $flavorSalty = 'N/A'; }
    if(empty($flavorSour)) { $flavorSour = 'N/A'; }
    if(empty($flavorBitter)) { $flavorBitter = 'N/A'; }
    if(empty($flavorAstringent)) { $flavorAstringent = 'N/A'; }
    if(empty($flavorPungent)) { $flavorPungent = 'N/A'; }

    $image = get_the_post_thumbnail_url();
    $class = '';

    if($image) {
        $image = ' style="background-image: url(' . $image . ')" ';
        $class = ' bkgd-image ';
    }
?>

<div class="component recipe-single">
    <div class="component hero <?php echo $class; ?>" <?php echo $image; ?>>
        <div class="content-wrap">
            <h1><?php the_title(); ?></h1>
            <?php the_excerpt(); ?>
            <?php //if($visibility == 'free' || $subscriber == 'MEMBER') : ?>
                <a class="button" href="#recipe-notes">Jump to Recipe</a> 
                <?php echo do_shortcode('[favorite_button]'); ?>
            <?php //endif; ?>
        </div>
    </div>

    <div class="categories">
        <?php if($seasonLabels) : ?><h5>Season: <span><?php echo implode(', ', $seasonLabels); ?></span></h5><?php endif; ?>
        <!-- <?php if($categoryLabels) : ?><h5>Category: <span><?php echo implode(', ', $categoryLabels); ?></span></h5><?php endif; ?> -->
        <?php if($doshaLabels) : ?><h5>Dosha: <span><?php echo implode(', ', $doshaLabels); ?></span></h5><?php endif; ?>
        <!-- <p>|</p> -->
        <!-- <h5 class="servings-wrapper">Serves: 
            <span>
                <button class="spinner-button step-up">+</button>
                <input id="servingSize" dir="rtl" type="number" value="<?php echo $recipeSize; ?>" data-original="<?php echo $recipeSize; ?>" min="<?php echo $recipeSize; ?>" step="<?php echo $recipeSize; ?>">
                <?php echo $recipeSizeUnit; ?>
                <button class="spinner-button step-down">-</button>
            </span>
        </h5>
        <h5>Active Time: <span><?php echo $recipeTime; ?></span></h5> -->
        <?php //echo do_shortcode('[favorite_button]'); ?>
    </div>

    <div class="section-wrap">
        <?php /* MOVED FROM BELOW: added ability for anyone to see the intro */ ?>
        <!-- <h2 class="recipe-title"><?php the_title(); ?></h2> -->
        <?php the_field('intro'); ?>
        <?php /* END: MOVED FROM BELOW: added ability for anyone to see the intro */ ?>

        <?php if($visibility == 'free' || $subscriber == 'MEMBER') : ?>
            <?php /* <h2 class="recipe-title"><?php the_title(); ?></h2> -->
            <?php the_field('intro'); ?> */ ?>

            <?php 
                if($recipeNotes) {
                    echo '<div id="recipe-notes" class="recipe-notes">';
                        echo '<h3>Recipe Notes</h3>';
                        echo $recipeNotes; 
                    echo '</div>';
                }
            ?>

            <?php 
                if($flavorNotes) {
                    echo '<div class="flavor-notes">';
                        echo '<h3>Flavor Notes</h3>';
                        echo $flavorNotes; 

                        echo '<ul>';
                            echo '<li><strong>SWEET:</strong> ' . $flavorSweet . '</li>';
                            echo '<li><strong>SALTY:</strong> ' . $flavorSalty . '</li>';
                            echo '<li><strong>SOUR:</strong> ' . $flavorSour . '</li>';
                            echo '<li><strong>BITTER:</strong> ' . $flavorBitter . '</li>';
                            echo '<li><strong>ASTRINGENT:</strong> ' . $flavorAstringent . '</li>';
                            echo '<li><strong>PUNGENT:</strong> ' . $flavorPungent . '</li>';
                        echo '</ul>';
                    echo '</div>';
                }
            ?>

            <div id="recipe" class="recap">
                <h2 class="recap-header"><?php the_title(); ?></h2>
                <?php echo $recapExcerpt; ?>
                <?php if($image) { ?>
                    <div class="bkgd-image recap-image" <?php echo $image; ?>></div>
                <?php } ?>

                <div class="recipe-serving-bar">
                    <h5><?php echo $recipeServingBlurb; ?></h5>
                    <p>|</p>
                    <h5 class="active-time">Active Time: <span><?php echo $recipeTime; ?></span></h5>
                    <p>|</p>
                    <h5 class="servings-wrapper">Serves: 
                        <span>
                            <button class="spinner-button step-up">+</button>
                            <input id="servingSize" dir="rtl" type="number" value="<?php echo $recipeSize; ?>" data-original="<?php echo $recipeSize; ?>" min="<?php echo $recipeSize; ?>" step="<?php echo $recipeSize; ?>">
                            <?php echo $recipeSizeUnit; ?>
                            <button class="spinner-button step-down">-</button>
                        </span>
                    </h5>
                    
                </div>
            </div>
            
            <div class="recipe-details">
                <div class="column">
                    <?php 
                        if ( have_rows('ingredient_section') ) :
                            echo '<h3>Ingredients</h3>';

                            while ( have_rows('ingredient_section') ) : the_row();
                                
                                $ingredientHeadline = get_sub_field('headline');
                                if($ingredientHeadline) {
                                    echo '<h4>' . $ingredientHeadline . '</h4>';
                                }
                                echo '<ul class="ingredients">';
                                
                                while ( have_rows('ingredients') ) : the_row();
                                    $amount = get_sub_field('amount');
                                    $unit = get_sub_field('unit');
                                    $ingredient = get_sub_field('name');
                                    $notes = get_sub_field('notes');
                                    $link = get_sub_field('link');
                                    $linkStart = '';
                                    $linkEnd = '';

                                    if($notes) {
                                        $notes = ' <span>(' . $notes . ')</span>';
                                    }

                                    if($unit) { 
                                        $unit = ' <span class="unit">' . $unit . '</span>'; 
                                    }

                                    if($amount) {
                                        $amount = '<span class="amount" data-original="' . $amount . '">' . $amount . '</span>' . $unit . ' ';
                                    }        
                                    
                                    if($link) {
                                        $linkStart = '<a href="' . $link . '" target="_blank">';
                                        $linkEnd = '</a>';
                                    }

                                    echo '<li>' . $linkStart . $amount . $ingredient . $notes . $linkEnd . '</li>';

                                endwhile;

                                echo '</ul>';

                            endwhile;
                        endif;
                    ?>
                </div>

                <div class="column">
                    <?php 
                        if ( have_rows('instructions') ) :
                            echo '<h3>Instructions</h3>';
                            echo '<ul class="recipe-instructions">';

                            $stepNumber = 1;
                            while ( have_rows('instructions') ) : the_row();
                                $headline = get_sub_field('headline');
                                $wysiwyg = get_sub_field('content'); 
                                echo '<li><h4 class="step-headline"><span class="step-number">' . $stepNumber . '</span>' . $headline . '</h4>' . $wysiwyg . '</li>';

                                $stepNumber++;
                            endwhile;
                            echo '</ul>';
                        endif;
                    ?>
                </div>
            </div>

        <?php else : ?>
            <div class="locked-content">
                <h3>Oops, Looks Like You're Not a Member!</h3>
                <p>That's ok, just sign up or log in to see this recipe.</p>
                <div class="button-wrap">
                    <a class="button" href="/my-account">LOG IN</a>
                    <a class="button" href="/?add-to-cart=266">LEVEL UP</a>
                </div>
            </div>

        <?php endif; ?>

    </div>
    
</div>


<!-- Related Recipes  -->
<?php get_template_part( 'components/related-recipes' ); ?>


<!-- Join Footer -->
<?php if($visibility == 'free' && $subscriber != 'MEMBER') : ?>
    <div id="recipe-join-cta">
        <div class="content-wrap">
            <h4>Get more from this recipe!</h4>
            <a class="button" href="/?add-to-cart=266">LEVEL UP</a>
        </div>
    </div>
<?php endif; ?>

<?php get_footer(); ?>