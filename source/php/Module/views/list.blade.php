@card([
    'classList' => [$classes],
    'id' => 'mod-json-render-container'
])
    @if (!$hideTitle && !empty($post_title))
        @typography([
            "element" => "h4",
            "classList" => ["box-title"]
        ])
            {!! apply_filters('the_title', $post_title) !!}
        @endtypography
    @endif
    
    <div class="modularity-json-render"
         data-url="{{ $url }}"
         data-view="{{ $view }}"
         data-field-map="{{ $fieldMap }}"
         data-show-search="{{ $show_search ? true : false }}"
         data-show-pagination="{{ $show_pagination ? true : false }}"
         data-per-page="{{ $per_page ?? 10 }}">
    </div>
@endcard