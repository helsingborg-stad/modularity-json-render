<?php

namespace ModularityJsonRender\Api;

use WpService\WpService;

class FetchData
{
    public function __construct(
        private ConfigInterface $config,
        private WpService $wpService,
    ) {}

    public function fetch(): array
    {
        $url = $this->config->getUrl();

        if (!$url) {
            return [];
        }

        $data = $this->wpService->wpRemoteGet($url);
        $body = json_decode($this->wpService->wpRemoteRetrieveBody($data), true);

        return !empty($body) && is_array($body) ? $body : [];
    }
}