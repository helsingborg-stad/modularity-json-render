<?php

namespace ModularityJsonRender\Api;
use ModularityJsonRender\Api\ExtractDataInterface;
use WpService\WpService;

class ExtractData implements ExtractDataInterface
{
    public function __construct(
        private ConfigInterface $config,
        private WpService $wpService,
        private array $data = []
    ) {}

    public function extract(): array
    {
        $fieldMap = $this->config->getFieldMap();
        $extractedSpecifiedData = $this->extractWantedData($fieldMap);
        $mappedHeadingLocation = $this->mapDataLocations($fieldMap['heading'] ?? []);
        $mappedContentLocation = $this->mapDataLocations($fieldMap['content'] ?? []);
        $mappedData = $this->mapData($extractedSpecifiedData, $mappedContentLocation, $mappedHeadingLocation);

        return $mappedData;
    }

    private function mapData(
        array $extractedSpecifiedData,
        array $mappedContentLocation,
        array $mappedHeadingLocation
    ): array
    {
        $mappedData = [];

        foreach ($extractedSpecifiedData as $item) {
            $mappedItem = [];

            foreach ($mappedHeadingLocation as $heading) {
                if (empty($heading['location'])) {
                    continue;
                }
                $mappedItem['heading'][] = [
                    'label' => $heading['label'],
                    'value' => $this->getValueByLocation(
                        $item,
                        $heading['location']
                    )]; 
            }

            $mappedItem['content'] = [];

            foreach ($mappedContentLocation as $content) {
                if (empty($content['location'])) {
                    continue;
                }

                $mappedItem['content'][] = [
                    'label' => $content['label'],
                    'value' => $this->getValueByLocation(
                        $item,
                        $content['location']
                    ),
                ];
            }

            $mappedData[] = $mappedItem;
        }

        return $mappedData;
    }

    private function getValueByLocation(array $item, array $location): mixed
    {
        $value = $item;

        foreach ($location as $key) {
            if (!isset($value[$key])) {
                return null;
            }

            $value = $value[$key];
        }

        return $value;
    }

    private function mapDataLocations(array $field): array
    {
        $mappedItems = [];
        foreach ($field as  $item) {
            $label = $item['heading'] ?? '';
            $location = !empty($item['item']['value']) ? explode('.', $item['item']['value']) : [];

            $mappedItems[] = [
                'label' => $label,
                'location' => $location,
            ];
        }


        return $mappedItems;
    }

    private function extractWantedData(array $fieldMap): array
    {
        if (empty($fieldMap['itemContainer'])) {
            return $this->data;
        }

        if (!isset($this->data[$fieldMap['itemContainer']])) {
            return [];
        }

        return $this->data[$fieldMap['itemContainer']];
    }
}