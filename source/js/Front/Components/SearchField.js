const SearchField = ({doSearch, translation}) =>
    <div class="c-field c-field__text u-padding__top--1 u-padding__bottom--1 u-padding__left--1 u-padding__right--1">
        <input type="text" name="json-render-search" onChange={doSearch} placeholder={translation.filterOn} />
        <label class="c-field__text--label">{translation.search}</label>
    </div>;

export default SearchField;