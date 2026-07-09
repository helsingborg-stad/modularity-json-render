<?php

namespace ModularityJsonRender\Api;

use Municipio\Api\RestApiEndpoint;
use WP_REST_Request;
use WP_REST_Response;

class Endpoint extends RestApiEndpoint {
    private const ROUTE = '';

    public function handleRegisterRestRoute(): bool
    {
        return register_rest_route('modularity-json-renderer/v1/', self::ROUTE, [
            'methods' => 'GET',
            'callback' => [$this, 'handleRequest'],
            'permission_callback' => '__return_true',
        ]);
    }


    public function handleRequest(WP_REST_Request $request)
    {
        return new WP_REST_Response(true, 200);
    }
}