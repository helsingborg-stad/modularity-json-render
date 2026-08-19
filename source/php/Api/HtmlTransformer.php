<?php

namespace ModularityJsonRender\Api;

class HtmlTransformer {
    public function transform(array $data): string {
        $data = $this->mapHeadings($data);

        return modularity_json_renderer_render_blade_view('test', [
            'items' => $data ?? [],
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