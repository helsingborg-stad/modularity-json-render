@card([])
    @if(!empty($headings[0]))
        @card__header()
            @typography([
                'element' => 'h2',
                'variant' => 'h6',
                'classList' => [
                    'u-margin--o'
                ]
            ])
                {{ $headings[0] }}
            @endtypography
        @endcard__header

        @collection([
            'bordered' => true,
            'sharpTop' => true,
            'attributeList' => [
                'data-js-pagination-container' => true,
                'data-js-mod-json-render-container' => $id
            ]
        ])
        @endcollection
    @endif
@endcard