@foreach($items as $item)
    @if(!empty($item['heading'][0]))
        @collection__item([])
            @typography([
                'element' => 'h3',
                'variant' => 'h6'
            ])
                {{ $item['heading'][0] }}
            @endtypography
        @endcollection__item
    @endif
@endforeach