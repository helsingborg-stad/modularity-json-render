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

        if (!is_string($fieldmap)) {
            return [];
        }

        $fieldMapVariants = [
            $fieldmap,
            html_entity_decode($fieldmap),
            stripslashes($fieldmap),
            html_entity_decode(stripslashes($fieldmap)),
        ];

        foreach (array_unique($fieldMapVariants) as $fieldMapVariant) {
            $decodedFieldMap = json_decode($fieldMapVariant, true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedFieldMap)) {
                return $decodedFieldMap;
            }
        }

        return [];
    }
}
