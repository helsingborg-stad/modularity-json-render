const SearchField = ({doSearch, translation}) =>
    <div class="c-field c-field__text u-padding__bottom--0">
        <input type="text" name="json-render-search" onChange={doSearch} placeholder={translation.filterOn} />
        <label class="c-field__text--label">Search</label>
    </div>;

export default SearchField;