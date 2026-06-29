<?php 
    get_header(); 

    $image = get_the_post_thumbnail_url();
    $visibility = get_field('visibility');
    $class = '';
    $subscriber = '';

    if($image) {
        $image = ' style="background-image: url(' . $image . ')" ';
        $class = ' bkgd-image ';
    }


    // recipe: 45783 - recipe-library-membership
    // b2f: 45782 - back-to-forward-membership


   // Back-to-Forward posts gate on the Supabase `back_to_forward` tier (single source of truth)
   // via the supabase-bridge mu-plugin. Admins always see content.
   if ( function_exists( 'btf_user_has_tier' ) && ( btf_user_has_tier( 'back_to_forward' ) || current_user_can( 'administrator' ) ) ) {
       $subscriber = 'MEMBER';
   }

?>

<div class="component blog-single">
    <div class="component hero <?php echo $class; ?>" <?php echo $image; ?>>
        <div class="content-wrap">
            <h1><?php the_title(); ?></h1>
            <?php //the_excerpt(); ?>  
        </div>
    </div>

    <div class="section-wrap">
        <?php if($visibility != 'paid' || $subscriber == 'MEMBER' || current_user_can('administrator')) : ?>
            <?php the_content(); ?>
        <?php else : ?>
            <div class="locked-content">
                <h3>Oops, Looks Like You're Not a Member!</h3>
                <p>That's ok, just sign up or log in to see this post.</p>
                <div class="button-wrap">
                    <a class="button" href="/my-account">LOG IN</a>
                    <a class="button" href="/?add-to-cart=266">LEVEL UP</a>
                </div>
            </div>
        <?php endif; ?>
    </div>    
</div>



<!-- Related Posts  -->
<?php get_template_part( 'components/related-posts' ); ?>



<style>
    .blog-single {
        flex: 100%;
        flex-wrap: wrap;
        justify-content: center;
    }

    .blog-single .hero {
        flex: 100%;
    }

    .blog-single .section-wrap {
        /* display: flex; */
        max-width: 60rem;
        margin: 3rem 0;
    }

    .blog-single .post-meta {
        display: flex;
        justify-content: center;
        grid-gap: 1rem;
        background: var(--color-tan);
        padding: 2rem;
        margin-bottom: 2rem;
    }

    .blog-single .post-meta h5 {
        margin-right: 1rem;
        margin-bottom: 0;
    }

    .blog-single .post-meta h5:last-of-type {
        margin-bottom: 0;
    }

    .blog-single .post-meta h5 span {
        font-weight: normal;
    }
</style>

<?php get_footer(); ?>