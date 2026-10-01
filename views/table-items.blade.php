@foreach($items as $item)
    @table__row([
        'attributeList' => [
            'data-js-pagination-item' => true
        ]
    ])
        @foreach($item['heading'] as $heading)
            @table__cell([])
                {{ $heading }}
            @endtable__cell
        @endforeach
    @endtable__row
@endforeach