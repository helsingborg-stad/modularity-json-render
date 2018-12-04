const SearchField = ({doSearch, translation}) =>
    <div className="accordion-search">
        <input type="text" name="json-render-search" onChange={doSearch} placeholder={translation.filterOn}/>
    </div>;

export default SearchField;