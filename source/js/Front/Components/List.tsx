import SearchField from './SearchField';

const List = ({ items, showSearch, doSearch, translation }) => (
	<div>
		{showSearch && <SearchField doSearch={doSearch} translation={translation} />}

		{Object.keys(items).length === 0 && (
			<div className="gutter">
				<p>{translation.noResults}</p>
			</div>
		)}

		{Object.keys(items).length > 0 && (
			<div className="o-grid">
				<div className="o-grid-12@xs">
					<ul className="c-listing">
						{items.map((item) => (
							<li key={item.id} className="c-listing__item">
								<div className="c-listing__label" dangerouslySetInnerHTML={{ __html: item.heading[0] }} />
							</li>
						))}
					</ul>
				</div>
			</div>
		)}
	</div>
);

export default List;
