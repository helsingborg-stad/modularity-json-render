<?php

namespace ModularityJsonRender\Api;

use ModularityJsonRender\Api\ConfigInterface;
use WpService\WpService;

class Config implements ConfigInterface
{
    public function __construct(private WpService $wpService, private string $id)
    {}

    public function getUrl(): string
    {
        return $this->wpService->getPostMeta($this->id, 'json_url', true);
    }

    public function getView(): string
    {
        return $this->wpService->getPostMeta($this->id, 'view', true);
    }

    public function getFieldMap(): array
    {
        $fieldmap = $this->wpService->getPostMeta($this->id, 'fieldmap', true);
        $fieldmap = json_decode(html_entity_decode(stripslashes($fieldmap)), true);

        return $fieldmap;
    }
}