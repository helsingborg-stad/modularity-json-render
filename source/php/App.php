<?php

namespace ModularityJsonRender;

class App
{
    public function __construct()
    {
        //Register scripts
        add_action('wp_enqueue_scripts', array($this, 'enqueueStyles'));
        add_action('wp_enqueue_scripts', array($this, 'enqueueScripts'));

        //Init ACF import
        add_action('plugins_loaded', array($this, 'initAcfImportExport'));

        //Init module
        add_action('plugins_loaded', array($this, 'registerModule'));
        add_action('Modularity/Module/TemplatePath', array($this, 'registerModuleTemplate'));

        //Run subclasses
        add_action('init', array($this, 'init'));
    }

    /**
     * Init required subclasses
     * @return void
     */
    public function init()
    {
        new Structure(); //Parse and provide json structure
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
     * Run ACF import & export funcitonality
     * @return void
     */
    public function initAcfImportExport()
    {
        $acfExportManager = new \AcfExportManager\AcfExportManager();
        $acfExportManager->setTextdomain('modularity-json-render');
        $acfExportManager->setExportFolder(MODULARITYJSONRENDER_PATH . 'acf-fields/');
        $acfExportManager->autoExport(array(
            'configuration' => 'group_5bb1ccff7600b',
        ));
        $acfExportManager->import();
    }

    /**
     * Register required style
     * @return void
     */
    public function enqueueStyles()
    {
        wp_register_style('modularity-json-render', MODULARITYJSONRENDER_URL . '/dist/' . \ModularityJsonRender\Helper\CacheBust::name('css/modularity-json-render.css'));
    }

    /**
     * Register required scripts
     * @return void
     */
    public function enqueueScripts()
    {
        wp_register_script('modularity-json-render', MODULARITYJSONRENDER_URL . '/dist/' . \ModularityJsonRender\Helper\CacheBust::name('js/modularity-json-render.js'));
    }
}
