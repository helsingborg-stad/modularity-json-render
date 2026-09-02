<?php

namespace ModularityJsonRender\Api;

use ModularityJsonRender\Api\ConfigInterface;

class HtmlTransformer {
    public function transform(array $data, ConfigInterface $config): string {
        $data = $this->mapHeadings($data);

        return modularity_json_renderer_render_blade_view('json-renderer-item-view', [
            'items' => $data ?? [],
            'view' => $config->getView(),
        ]);
    }

    private function mapHeadings(array $data): array {
        if (empty($data)) {
            return [];
        }

        foreach ($data as &$item) {
            if (!isset($item['heading']) || !is_array($item['heading'])) {
                continue;
            }

            $item['heading'] = array_column($item['heading'], 'value');
        }

        return $data;
    }
}