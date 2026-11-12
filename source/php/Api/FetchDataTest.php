<?php

declare(strict_types=1);

namespace ModularityJsonRender\Api;

use PHPUnit\Framework\TestCase;
use WpService\Implementations\FakeWpService;

class FetchDataTest extends TestCase
{
    public function testFetchReadsConfiguredUrlAndDecodesResponse(): void
    {
        $response = ['body' => '{"items":[{"name":"Ada"}]}'];
        $wpService = new FakeWpService([
            'getPostMeta' => 'https://example.test/data',
            'wpRemoteGet' => $response,
            'wpRemoteRetrieveBody' => $response['body'],
        ]);

        $result = (new FetchData(new Config($wpService, '123'), $wpService))->fetch();

        static::assertSame(['items' => [['name' => 'Ada']]], $result);
        static::assertSame([[123, 'json_url', true]], $wpService->methodCalls['getPostMeta']);
        static::assertSame([['https://example.test/data']], $wpService->methodCalls['wpRemoteGet']);
        static::assertSame([[$response]], $wpService->methodCalls['wpRemoteRetrieveBody']);
    }

    public function testFetchDoesNotRequestAnEmptyUrl(): void
    {
        $wpService = new FakeWpService(['getPostMeta' => '']);

        static::assertSame([], (new FetchData(new Config($wpService, '123'), $wpService))->fetch());
        static::assertArrayNotHasKey('wpRemoteGet', $wpService->methodCalls);
    }
}
