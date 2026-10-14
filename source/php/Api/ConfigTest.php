<?php

declare(strict_types=1);

namespace ModularityJsonRender\Api;

use PHPUnit\Framework\TestCase;
use WpService\Implementations\FakeWpService;

class ConfigTest extends TestCase
{
    /**
     * @dataProvider fieldMapProvider
     */
    public function testGetFieldMapDecodesStoredAndLegacyEncodedValues(
        mixed $storedFieldMap,
        array $expectedFieldMap
    ): void {
        $config = new Config(new FakeWpService([
            'getPostMeta' => $storedFieldMap,
        ]), '123');

        static::assertSame($expectedFieldMap, $config->getFieldMap());
    }

    public static function fieldMapProvider(): array
    {
        return [
            'stored JSON' => [
                '{"heading":[]}',
                ['heading' => []],
            ],
            'HTML entity encoded JSON' => [
                '{&quot;heading&quot;:[]}',
                ['heading' => []],
            ],
            'slash escaped JSON' => [
                '{\\"heading\\":[]}',
                ['heading' => []],
            ],
            'invalid JSON' => [
                '{invalid',
                [],
            ],
            'missing meta value' => [
                null,
                [],
            ],
        ];
    }
}
