<?php

namespace ModularityJsonRender;

class App
{
    public function __construct()
    {
        add_action('admin_enqueue_scripts', array($this, 'enqueueStyles'));
        add_action('admin_enqueue_scripts', array($this, 'enqueueScripts'));
    }

    /**
     * Enqueue required style
     * @return void
     */
    public function enqueueStyles()
    {
        wp_register_style('modularity-json-render-css', MODULARITYJSONRENDER_URL . '/dist/' . \ModularityJsonRender\Helper\CacheBust::name('css/modularity-json-render.css'));
    }

    /**
     * Enqueue required scripts
     * @return void
     */
    public function enqueueScripts()
    {
        wp_register_script('modularity-json-render-js', MODULARITYJSONRENDER_URL . '/dist/' . \ModularityJsonRender\Helper\CacheBust::name('js/modularity-json-render.js'));
    }
}
