{{-- @card([
    'classList' => explode(' ', $classes),
    'id' => 'data-js-mod-json-render-container'
])
    @if (!$hideTitle && !empty($post_title))
        <div class="c-card__header">
            
                @typography([
                    'element' => 'h4'
                ])
                    {!! apply_filters('the_title', $post_title) !!}
                @endtypography
            
        </div>
    @endif

    <div class="modularity-json-render"
         data-url="{{ $url }}"
         data-view="{{ $view }}"
         data-field-map="{{ $fieldMap }}"
         data-show-search="{{ $show_search ? true : false }}"
         data-show-pagination="{{ $show_pagination ? true : false }}"
         data-per-page="{{ $per_page ?? 10 }}">
    </div>

@endcard --}}
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