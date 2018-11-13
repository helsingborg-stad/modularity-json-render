<div class="{{ $classes }}">
    @if (!$hideTitle && !empty($post_title))
        <h4 class="box-title">{!! apply_filters('the_title', $post_title) !!}</h4>
    @endif
    <div id="modularity-json-render" data-module-id="{{ $ID }}" data-url="{{ $url }}" data-fieldmap={{ $fieldMap }}></div>
</div>