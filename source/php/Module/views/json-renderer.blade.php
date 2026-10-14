@element([
    'attributeList' => [
        'data-js-pagination-target' => true,
    ]
])
    @card([
    ])
        @includeWhen((!$hideTitle && !empty($postTitle)), 'partials.post-title')
        @includeFirst(['content.' . $view, 'content.accordiontable'])
    @endcard
    @if(!empty($show_pagination))
        @pagination([
            'classList' => [
                'u-margin__y--3',
                'u-display--none',
                'u-justify-content--center'
            ],
            'current' => 1,
            'useJS' => true,
            'perPage' => !empty($per_page) ? $per_page : 10,
            'keepDOM' => true,
            'async' => true
        ])
        @endpagination
    @endif
@endelement
