<?php

/**
 * Plugin Name:       Modularity Json Render
 * Plugin URI:        (#plugin_url#)
 * Description:       Renders JSON api:s as a list etc.
 * Version:           1.0.0
 * Author:            Sebastian Thulin
 * Author URI:        (#plugin_author_url#)
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       modularity-json-render
 * Domain Path:       /languages
 */

 // Protect agains direct file access
if (! defined('WPINC')) {
    die;
}

define('MODULARITYJSONRENDER_PATH', plugin_dir_path(__FILE__));
define('MODULARITYJSONRENDER_URL', plugins_url('', __FILE__));
define('MODULARITYJSONRENDER_TEMPLATE_PATH', MODULARITYJSONRENDER_PATH . 'templates/');

load_plugin_textdomain('modularity-json-render', false, plugin_basename(dirname(__FILE__)) . '/languages');

require_once MODULARITYJSONRENDER_PATH . 'source/php/Vendor/Psr4ClassLoader.php';
require_once MODULARITYJSONRENDER_PATH . 'Public.php';

// Instantiate and register the autoloader
$loader = new ModularityJsonRender\Vendor\Psr4ClassLoader();
$loader->addPrefix('ModularityJsonRender', MODULARITYJSONRENDER_PATH);
$loader->addPrefix('ModularityJsonRender', MODULARITYJSONRENDER_PATH . 'source/php/');
$loader->register();

// Start application
new ModularityJsonRender\App();
