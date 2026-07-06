<?php
/**
 * Template Name: App Landing
 *
 * Directs site visitors to the Lentine Alexis app — membership exploration and
 * dosha-personalized content now live in-app. Assign this template to a page in
 * WP Admin (Pages → Edit → Template → "App Landing"); the page's own content
 * (if any) renders above the app section, so the copy stays editable in-admin.
 *
 * Store links: add ACF text fields `app_store_url` and `play_store_url` to the
 * page (optional). Until they're set, the buttons show a "coming soon" note.
 */

get_header();

$app_store_url = function_exists( 'get_field' ) ? get_field( 'app_store_url' ) : '';
$play_store_url = function_exists( 'get_field' ) ? get_field( 'play_store_url' ) : '';
$has_store_links = ! empty( $app_store_url ) || ! empty( $play_store_url );
?>

<div class="component app-landing">
    <div class="component hero">
        <div class="content-wrap">
            <h1><?php the_title(); ?></h1>
        </div>
    </div>

    <div class="section-wrap">
        <?php
        // The page's own editable copy, if the owner adds any.
        while ( have_posts() ) :
            the_post();
            the_content();
        endwhile;
        ?>

        <div class="app-intro">
            <h5 class="app-eyebrow">The Lentine Alexis App</h5>
            <h2>Your practice, <em>in your pocket</em></h2>
            <p>
                Discover your dosha, receive recipes and rituals matched to your constitution,
                and read every member story and recipe — right from your phone. Your existing
                membership signs straight in.
            </p>
        </div>

        <ol class="app-steps">
            <li>
                <strong>Get the app</strong>
                <span>Download Lentine Alexis for iPhone or Android.</span>
            </li>
            <li>
                <strong>Sign in</strong>
                <span>Members: use your lentinealexis.com email. First time in the app?
                Choose &ldquo;Already a member&rdquo; and set your password from the sign-in screen.</span>
            </li>
            <li>
                <strong>Begin your journey</strong>
                <span>Take the two-minute dosha quiz and your daily rituals and recipes
                shape themselves around you.</span>
            </li>
        </ol>

        <div class="button-wrap app-buttons">
            <?php if ( ! empty( $app_store_url ) ) : ?>
                <a class="button" href="<?php echo esc_url( $app_store_url ); ?>">DOWNLOAD FOR IPHONE</a>
            <?php endif; ?>
            <?php if ( ! empty( $play_store_url ) ) : ?>
                <a class="button" href="<?php echo esc_url( $play_store_url ); ?>">DOWNLOAD FOR ANDROID</a>
            <?php endif; ?>
            <?php if ( ! $has_store_links ) : ?>
                <p class="app-coming-soon"><em>The app arrives on the App Store and Google Play soon &mdash;
                check back here, or watch your inbox for the launch note.</em></p>
            <?php endif; ?>
        </div>
    </div>
</div>

<style>
    .app-landing {
        flex: 100%;
        flex-wrap: wrap;
        justify-content: center;
    }

    .app-landing .hero {
        flex: 100%;
        background: #000033;
    }

    .app-landing .hero h1 {
        color: #f4f0ec;
    }

    .app-landing .section-wrap {
        max-width: 60rem;
        margin: 3rem 0;
    }

    .app-landing .app-eyebrow {
        color: #3FBECC;
        font-style: italic;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 0.5rem;
    }

    .app-landing .app-intro h2 em {
        color: #3FBECC;
    }

    .app-landing .app-steps {
        list-style: none;
        counter-reset: app-step;
        margin: 2rem 0;
        padding: 0;
    }

    .app-landing .app-steps li {
        counter-increment: app-step;
        display: flex;
        flex-direction: column;
        border: 1px solid rgba(0, 0, 51, 0.12);
        background: #ffffff;
        padding: 1.25rem 1.5rem 1.25rem 4rem;
        margin-bottom: 1rem;
        position: relative;
    }

    .app-landing .app-steps li::before {
        content: counter(app-step);
        position: absolute;
        left: 1.25rem;
        top: 1.25rem;
        width: 1.75rem;
        height: 1.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000033;
        color: #ffffff;
        font-style: italic;
    }

    .app-landing .app-steps li strong {
        color: #000033;
    }

    .app-landing .app-steps li span {
        color: rgba(0, 0, 51, 0.7);
        margin-top: 0.25rem;
    }

    .app-landing .app-buttons {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-top: 1.5rem;
    }

    .app-landing .app-coming-soon {
        color: rgba(0, 0, 51, 0.7);
    }
</style>

<?php get_footer(); ?>
