import { useMemo } from 'react';
import createDataUid from '../../Utilities/dataUid';

const SearchField = ({ doSearch, translation }) => {
	const searchIconDataUid = useMemo(() => createDataUid(), []);
	const searchInputId = useMemo(() => `json-render-search-${createDataUid()}`, []);

	return (
		<div class="c-card__body">
			<div class="c-field c-field__text">
				<label class="c-field__text--label u-sr__only" htmlFor={searchInputId}>
					{translation.search}
				</label>
				<div class="c-field__inner c-field__inner--text">
					<i
						class="c-icon c-field__icon c-icon--size-md material-icons"
						translate="no"
						role="img"
						aria-label="Icon: Undefined"
						data-uid={searchIconDataUid}
					>
						search
					</i>
					<input
						id={searchInputId}
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
};

export default SearchField;
