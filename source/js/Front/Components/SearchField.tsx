const SearchField = ({ doSearch, translation }) => (
	<div class="c-card__body">
		<div class="c-field c-field__text">
			<label class="c-field__text--label u-sr__only">{translation.search}</label>
			<div class="c-field__inner c-field__inner--text">
				<i
					class="c-icon c-field__icon c-icon--size-md material-icons"
					translate="no"
					role="img"
					aria-label="Icon: Undefined"
					data-uid="635fd4ef945e7"
				>
					search
				</i>
				<input
					aria-labelledby="c-field__03795285"
					aria-label={translation.searchInputAriaLabel}
					type="text"
					name="json-render-search"
					onChange={doSearch}
					placeholder={translation.filterOn}
				/>
			</div>
		</div>
	</div>
);

export default SearchField;
