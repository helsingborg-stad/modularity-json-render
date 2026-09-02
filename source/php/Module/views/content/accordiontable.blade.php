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