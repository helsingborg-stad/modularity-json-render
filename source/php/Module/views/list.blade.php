<div class="{{ $classes }}">
    <div class="c-card c-card--panel">
        <div class="c-card__header">
        
            @if (!$hideTitle && !empty($post_title))
                <h4 class="c-typography c-typography__variant--p">{!! apply_filters('the_title', $post_title) !!}</h4>
            @endif
            
        </div>
       
        <div class="modularity-json-render"
             data-url="{{ $url }}"
             data-view="{{ $view }}"
             data-field-map="{{ $fieldMap }}"
             data-show-search="{{ $show_search ? true : false }}"
             data-show-pagination="{{ $show_pagination ? true : false }}"
             data-per-page="{{ $per_page ?? 10 }}">
        </div>
    </div>
    
</div>