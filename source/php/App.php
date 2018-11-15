<?php

namespace ModularityJsonRender;

class App
{
    public function __construct()
    {
        //Register scripts
        add_action('wp_enqueue_scripts', array($this, 'registerFrontendAssets'));
        add_action('admin_enqueue_scripts', array($this, 'registerAdminAssets'));

        //Init module
        add_action('plugins_loaded', array($this, 'registerModule'));
        add_action('Modularity/Module/TemplatePath', array($this, 'registerModuleTemplate'));

        //Register meta boxes
        add_action('add_meta_boxes', array($this, 'registerMetaBoxes'));
    }

    /**
     * Register the module
     * @return void
     */
    public function registerModule()
    {
        if (function_exists('modularity_register_module')) {
            modularity_register_module(
                MODULARITYJSONRENDER_PATH . 'Source/php/Module/',
                'JsonRender'
            );
        }
    }

    /**
     * Register module view
     * @param  $paths In what paths the module template resides
     * @return array
     */

    public function registerModuleTemplate($paths)
    {
        $paths[] = MODULARITYJSONRENDER_PATH . 'Source/php/Module/views/';
        return $paths;
    }

    /**
     * Register required frontend scripts
     * @return void
     */
    public function registerFrontendAssets()
    {
        if (file_exists(MODULARITYJSONRENDER_PATH . '/dist/' . Helper\CacheBust::name('js/Front/IndexFront.js'))) {
            wp_register_script('modularity-json-render', MODULARITYJSONRENDER_URL . '/dist/' . Helper\CacheBust::name('js/Front/IndexFront.js'), array('jquery', 'react', 'react-dom'));
        }
    }

    /**
     * Register required admin scripts & styles
     * @return void
     */
    public function registerAdminAssets()
    {
        if (file_exists(MODULARITYJSONRENDER_PATH . '/dist/' . Helper\CacheBust::name('css/modularity-json-render-admin.css'))) {
            wp_register_style('modularity-json-render-admin', MODULARITYJSONRENDER_URL . '/dist/' . Helper\CacheBust::name('css/modularity-json-render-admin.css'));
        }

        if (file_exists(MODULARITYJSONRENDER_PATH . '/dist/' . Helper\CacheBust::name('js/Admin/IndexAdmin.js'))) {
            wp_register_script('modularity-json-render-admin-js', MODULARITYJSONRENDER_URL . '/dist/' . Helper\CacheBust::name('js/Admin/IndexAdmin.js'), array('jquery', 'react', 'react-dom'), false, true);
        }
    }

    /**
     * Register meta boxes
     * @return void
     */
    public function registerMetaBoxes()
    {
        add_meta_box('json-api-fields', __('Data settings', 'modularity-json-render'),
            function () {
                echo '<div id="modularity-json-render"></div>';
            }, 'mod-json-render', 'normal', 'high');
    }
}
