@table([
    'async' => true
])
        @if(!empty($headings))
            @table__head([])
                @table__row([]) 
                    @foreach($headings as $heading)
                        @table__cell([
                            'componentElement' => 'th',
                            'index' => $loop->index
                        ])
                            {{ $heading }}
                        @endtable__cell
                    @endforeach
                @endtable__row
            @endtable__head
        @endif
        @table__body([
            'attributeList' => [
                'data-js-mod-json-render-container' => $id,
                'data-js-pagination-container' => true
            ]
        ])
        @endtable__body
@endtable