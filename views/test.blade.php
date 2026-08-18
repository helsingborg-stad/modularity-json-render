@typography([])
    TEST
@endtypography
@accordion([
    'heading' => $headings ?? []
])
    @foreach($items as $item)
        @accordion__item([
            'heading' => $item['heading'] ?? [],
        ])
            @foreach($item['content'] ?? [] as $content)
                @if (!empty($content['value']))
                    @if (!empty($content['label']))
                        @typography([
                            'element' => 'h3',
                            'variant' => 'h4',
                        ])
                            {{ $content['label'] }}
                        @endtypography
                    @endif
                    {{ $content['value'] }}
                @endif
            @endforeach
        @endaccordion__item
    @endforeach
@endaccordion