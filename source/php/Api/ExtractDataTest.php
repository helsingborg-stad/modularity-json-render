<?php

declare(strict_types=1);

namespace ModularityJsonRender\Api;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for extraction and mapping pipeline.
 */
class ExtractDataTest extends TestCase
{
    /**
     * Ensures configured heading/content fields are mapped from nested payload data.
     */
    public function testExtractMapsConfiguredFieldsFromNestedData(): void
    {
        // Arrange
        $fieldMap = [
            'itemContainer' => 'items',
            'heading' => [
                [
                    'heading' => 'Name',
                    'prefix' => 'Mr/Ms ',
                    'suffix' => '!',
                    'item' => ['value' => 'profile.name'],
                ],
            ],
            'content' => [
                [
                    'heading' => 'Age',
                    'prefix' => 'Age: ',
                    'suffix' => ' years',
                    'item' => ['value' => 'profile.age'],
                ],
                [
                    'heading' => 'City',
                    'item' => ['value' => 'profile.city'],
                ],
            ],
        ];

        $data = [
            'items' => [
                ['profile' => ['name' => 'Alice', 'age' => 31]],
                ['profile' => ['name' => 'Bob', 'age' => 42]],
            ],
        ];

        $sut = new ExtractData(new InMemoryConfig($fieldMap), $data);

        // Act
        $result = $sut->extract();

        // Assert
        static::assertSame([
            [
                'heading' => [
                    ['label' => 'Name', 'prefix' => 'Mr/Ms ', 'suffix' => '!', 'value' => 'Alice'],
                ],
                'content' => [
                    ['label' => 'Age', 'prefix' => 'Age: ', 'suffix' => ' years', 'value' => 31],
                    ['label' => 'City', 'prefix' => null, 'suffix' => null, 'value' => null],
                ],
            ],
            [
                'heading' => [
                    ['label' => 'Name', 'prefix' => 'Mr/Ms ', 'suffix' => '!', 'value' => 'Bob'],
                ],
                'content' => [
                    ['label' => 'Age', 'prefix' => 'Age: ', 'suffix' => ' years', 'value' => 42],
                    ['label' => 'City', 'prefix' => null, 'suffix' => null, 'value' => null],
                ],
            ],
        ], $result);
    }

    /**
     * Ensures top-level list is used when itemContainer is not configured.
     */
    public function testExtractUsesTopLevelDataWhenItemContainerIsMissing(): void
    {
        // Arrange
        $fieldMap = [
            'heading' => [],
            'content' => [
                [
                    'heading' => 'Name',
                    'item' => ['value' => 'name'],
                ],
            ],
        ];

        $data = [
            ['name' => 'Ada'],
            ['name' => 'Grace'],
        ];

        $sut = new ExtractData(new InMemoryConfig($fieldMap), $data);

        // Act
        $result = $sut->extract();

        // Assert
        static::assertSame([
            [
                'content' => [
                    ['label' => 'Name', 'prefix' => null, 'suffix' => null, 'value' => 'Ada'],
                ],
            ],
            [
                'content' => [
                    ['label' => 'Name', 'prefix' => null, 'suffix' => null, 'value' => 'Grace'],
                ],
            ],
        ], $result);
    }

    /**
     * Ensures empty array is returned when configured container does not exist.
     */
    public function testExtractReturnsEmptyWhenConfiguredContainerDoesNotExist(): void
    {
        // Arrange
        $fieldMap = [
            'itemContainer' => 'missing',
            'heading' => [],
            'content' => [],
        ];

        $data = [
            'items' => [
                ['name' => 'Alice'],
            ],
        ];

        $sut = new ExtractData(new InMemoryConfig($fieldMap), $data);

        // Act
        $result = $sut->extract();

        // Assert
        static::assertSame([], $result);
    }

    /**
     * Ensures headings without a location retain their table column.
     */
    public function testExtractRetainsHeadingsWithoutLocation(): void
    {
        // Arrange
        $fieldMap = [
            'itemContainer' => 'items',
            'heading' => [
                [
                    'heading' => 'Invalid',
                    'item' => ['value' => ''],
                ],
            ],
            'content' => [
                [
                    'heading' => 'Also Invalid',
                    'item' => ['value' => ''],
                ],
            ],
        ];

        $data = [
            'items' => [
                ['profile' => ['name' => 'Alice']],
            ],
        ];

        $sut = new ExtractData(new InMemoryConfig($fieldMap), $data);

        // Act
        $result = $sut->extract();

        // Assert
        static::assertSame([
            [
                'heading' => [
                    ['label' => 'Invalid', 'prefix' => null, 'suffix' => null, 'value' => null],
                ],
                'content' => [],
            ],
        ], $result);
    }
}

/**
 * In-memory config fixture for extractor tests.
 */
class InMemoryConfig implements ConfigInterface
{
    /**
     * @param array<string, mixed> $fieldMap
     */
    public function __construct(private array $fieldMap)
    {
    }

    /**
     * @return string
     */
    public function getUrl(): string
    {
        return '';
    }

    /**
     * @return string
     */
    public function getView(): string
    {
        return '';
    }

    /**
     * @return array<string, mixed>
     */
    public function getFieldMap(): array
    {
        return $this->fieldMap;
    }
}
