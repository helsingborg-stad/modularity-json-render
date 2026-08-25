<?php

namespace ModularityJsonRender;

use WpUtilService\Features\Enqueue\EnqueueManager;
use Municipio\Api\RestApiEndpointsRegistry;
use WpService\WpService;

class App
{
    public function __construct(
        private WpService $wpService,
        private EnqueueManager $wpEnqueue,
    ) {
        //Register scripts
        add_action('admin_enqueue_scripts', [$this, 'registerAdminAssets']);

        //Init module
        add_action('init', [$this, 'registerModule']);

        //Register meta boxes
        add_action('add_meta_boxes', [$this, 'registerMetaBoxes']);

        RestApiEndpointsRegistry::add(new \ModularityJsonRender\Api\Endpoint($this->wpService));
    }

    /**
     * Register the module
     * @return void
     */
    public function registerModule()
    {
        if (function_exists('modularity_register_module')) {
            modularity_register_module(
                MODULARITYJSONRENDER_PATH . 'source/php/Module/',
                'JsonRender',
            );
        }
    }

    /**
     * Register meta boxes
     * @return void
     */
    public function registerMetaBoxes()
    {
        add_meta_box(
            'json-api-fields',
            __('Data settings', 'modularity-json-render'),
            static function () {
                echo '<div id="modularity-json-render"></div>';
            },
            'mod-json-render',
            'normal',
            'high',
        );
    }
}
