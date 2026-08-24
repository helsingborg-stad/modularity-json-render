@element([
    'attributeList' => [
        'data-js-pagination-target' => true,
    ]
])
    @accordion([
        'heading' => $headings ?? [],
        'attributeList' => [
            'data-js-pagination-container' => true,
            'data-js-data-js-mod-json-render-container' => $id
        ]
    ])
        <!-- Container for fetched data -->
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