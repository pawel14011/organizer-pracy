<?php
/**
 * Plugin Name:       Organizer Pracy
 * Plugin URI:        https://github.com/pawel14011/apka
 * Description:       Nowoczesny, bezoporowy planer tygodniowy w metodyce Local-First z obsługą Drag and Drop.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Organizer Pracy Team
 * Author URI:        https://github.com/pawel14011/apka
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       organizer-pracy
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Blokada bezpośredniego dostępu
}

define( 'ORGANIZER_PRACY_VERSION', '1.0.0' );
define( 'ORGANIZER_PRACY_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ORGANIZER_PRACY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Rejestracja i kolejkowanie zasobów wtyczki (JavaScript i CSS)
 */
function organizer_pracy_enqueue_scripts() {
    $js_path  = ORGANIZER_PRACY_PLUGIN_DIR . 'assets/organizer-pracy.js';
    $css_path = ORGANIZER_PRACY_PLUGIN_DIR . 'assets/organizer-pracy.css';

    // Wersjonowanie na podstawie czasu modyfikacji pliku zapobiega problemom z cache po aktualizacjach
    $js_ver  = file_exists( $js_path ) ? filemtime( $js_path ) : ORGANIZER_PRACY_VERSION;
    $css_ver = file_exists( $css_path ) ? filemtime( $css_path ) : ORGANIZER_PRACY_VERSION;

    if ( file_exists( $css_path ) ) {
        wp_enqueue_style(
            'organizer-pracy-css',
            ORGANIZER_PRACY_PLUGIN_URL . 'assets/organizer-pracy.css',
            array(),
            $css_ver
        );
    }

    if ( file_exists( $js_path ) ) {
        wp_enqueue_script(
            'organizer-pracy-js',
            ORGANIZER_PRACY_PLUGIN_URL . 'assets/organizer-pracy.js',
            array(),
            $js_ver,
            true // Ładowanie w stopce przed </body>
        );
    }
}

/**
 * Rejestracja Shortcode: [organizer_pracy]
 * Umożliwia wstawienie planera na dowolnej podstronie lub wpisie.
 */
function organizer_pracy_render_shortcode( $atts = array() ) {
    organizer_pracy_enqueue_scripts();

    $atts = shortcode_atts(
        array(
            'min_height' => '700px',
        ),
        $atts,
        'organizer_pracy'
    );

    $min_height = esc_attr( $atts['min_height'] );

    return '<div id="organizer-pracy-root" class="organizer-pracy-app" style="min-height: ' . $min_height . ';" data-testid="wp-organizer-root"></div>';
}
add_shortcode( 'organizer_pracy', 'organizer_pracy_render_shortcode' );

/**
 * Dodanie dedykowanej pozycji w menu panelu administracyjnego WordPress (WP-Admin)
 */
function organizer_pracy_add_admin_menu() {
    $hook_suffix = add_menu_page(
        __( 'Organizer Pracy', 'organizer-pracy' ),
        __( 'Organizer Pracy', 'organizer-pracy' ),
        'read', // Dostępne dla każdego zalogowanego użytkownika z uprawnieniem read
        'organizer-pracy',
        'organizer_pracy_render_admin_page',
        'dashicons-calendar-alt',
        30
    );

    // Ładuj skrypty wyłącznie na dedykowanej podstronie w panelu administracyjnym
    add_action( 'load-' . $hook_suffix, function() {
        add_action( 'admin_enqueue_scripts', 'organizer_pracy_enqueue_scripts' );
    } );
}
add_action( 'admin_menu', 'organizer_pracy_add_admin_menu' );

/**
 * Renderowanie widoku w panelu administracyjnym WP-Admin
 */
function organizer_pracy_render_admin_page() {
    ?>
    <div class="wrap" style="margin-right: 20px;">
        <h1 style="display: none;"><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <div id="organizer-pracy-root" class="organizer-pracy-app" style="min-height: 800px; margin-top: 15px;" data-testid="wp-organizer-admin-root"></div>
    </div>
    <?php
}
