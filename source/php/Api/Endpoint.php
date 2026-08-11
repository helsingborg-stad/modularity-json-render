<?php

declare(strict_types=1);

namespace ModularityJsonRender\Api;

use Municipio\Api\RestApiEndpoint;
use WP_REST_Request;
use WP_REST_Response;
use WpService\WpService;

class Endpoint extends RestApiEndpoint
{
    public function __construct(private WpService $wpService)
    {
    }
    private const ROUTE = '/get';

    public function handleRegisterRestRoute(): bool
    {
        return register_rest_route(MODULARITYJSONRENDER_ENDPOINT, self::ROUTE, [
            'methods' => 'GET',
            'callback' => [$this, 'handleRequest'],
            'permission_callback' => '__return_true',
            'args' => [
                'id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    },
                ],
            ],
        ]);
    }
    public function handleRequest(WP_REST_Request $request): WP_REST_Response
    {
        $moduleId = $request->get_param('id');

        if (!$moduleId) {
            return new WP_REST_Response([
                'error' => 'Missing module ID',
            ], 400);
        }

        $config        = new Config($this->wpService, $moduleId);
        $data          = (new FetchData($config, $this->wpService))->fetch();
        $extractedData = (new ExtractData($config, $this->wpService, $data))->extract();
        die;
        if (empty($data)) {
            return new WP_REST_Response([
                'error' => 'No data found',
            ], 404);
        }


        return new WP_REST_Response("", 200);
    }
}