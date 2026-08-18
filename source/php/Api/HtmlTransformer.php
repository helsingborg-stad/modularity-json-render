<?php

namespace ModularityJsonRender\Api;

class HtmlTransformer {
    public function transform(array $data, ConfigInterface $config): string {
        $fieldMap = $config->getFieldMap();
        $headings = $this->getHeadingsFromFieldMap($fieldMap);
        $data = $this->mapHeadings($data);

        return modularity_json_renderer_render_blade_view('test', [
            'items' => $data ?? [],
            'headings' => $headings,
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

    private function getHeadingsFromFieldMap(array $fieldMap): array {
        $headings = [];
        if (!isset($fieldMap['heading']) || !is_array($fieldMap['heading'])) {
            return $headings;
        }
        $headings = array_column($fieldMap['heading'], 'heading');

        return $headings;
    }
}