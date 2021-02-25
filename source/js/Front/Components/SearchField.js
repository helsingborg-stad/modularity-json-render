const SearchField = ({doSearch, translation}) =>
    <div class="c-card__body">
        <div class="c-field c-field__text">
            <input aria-labelledby="c-field__03795285" type="text" name="json-render-search" onChange={doSearch} placeholder={translation.filterOn} />
            <label id="c-field__03795285" class="c-field__text--label">{translation.search}</label>
        </div>
    </div>;

export default SearchField;