@element([
    'attributeList' => [
        'data-js-pagination-target' => true,
    ]
])
    @includeFirst(['content.' . $view, 'content.accordiontable'])
    @pagination([
        'classList' => [
            'u-margin__y--3',
            'u-display--none',
            'u-justify-content--center'
        ],
        'current' => 1,
        'useJS' => true,
        'perPage' => 10,
        'keepDOM' => true,
        'async' => true
    ])
    @endpagination
@endelement