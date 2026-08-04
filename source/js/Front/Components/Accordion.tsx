import AccordionItem from './AccordionItem';
import SearchField from './SearchField';

const Accordion = ({ items, showSearch, doSearch, translation, view, fieldMap, itemClicked }) => (
	<div>
		<div
			id="jsonRenderData"
			className="c-accordion"
			style={{ '--c-accordion--heading-count': fieldMap.heading.length ?? 1 }}
			js-expand-container=""
			data-uid="5fce30f28f9d0"
		>
			{showSearch && <SearchField doSearch={doSearch} translation={translation} />}

			{Object.keys(items).length === 0 && (
				<div className="gutter">
					<p>{translation.noResults}</p>
				</div>
			)}

			{view === 'accordiontable' && (
				<div className='c-accordion__heading'>
					{fieldMap.heading.map((heading, i) => (
						<span key={'acTable' + i} className="c-element c-accordion__heading-item">
							{heading.heading}
						</span>
					))}
				</div>
			)}

				{items.map((item, index) => (
					<AccordionItem
						heading={item.heading}
						content={item.content}
						view={view}
						index={item.id}
						itemClicked={itemClicked.bind(this)}
						key={item.id}
					/>
				))}
		</div>
	</div>
);

export default Accordion;
