@element([
    'attributeList' => [
        'data-js-pagination-target' => true,
    ]
])

    @accordion([
        'heading' => $headings ?? [],
    ])
        @element([
            'attributeList' => [
                'data-js-pagination-container' => true,
                'data-js-mod-json-render-container' => $id
            ]
        ])
            <!-- Container for fetched data -->
        @endelement
    @endaccordion
    @pagination([
        'current' => 1,
        'useJS' => true,
        'perPage' => 10,
        'keepDOM' => true,
        'async' => true
    ])
    @endpagination
@endelement