import { useMemo } from 'react';
import AccordionItem from './AccordionItem';
import SearchField from './SearchField';
import createDataUid from '../../Utilities/dataUid';

const Accordion = ({ items, showSearch, doSearch, translation, view, fieldMap, itemClicked, uid }) => {
	const accordionDataUid = useMemo(() => createDataUid(uid), [uid]);

	return (
		<div>
			<div
				id="jsonRenderData"
				className="c-collection c-collection--bordered c-collection--sharp-top c-accordion"
				js-expand-container=""
				data-uid={accordionDataUid}
			>
				{showSearch && <SearchField doSearch={doSearch} translation={translation} uid={uid} />}

				{Object.keys(items).length === 0 && (
					<div className="gutter">
						<p>{translation.noResults}</p>
					</div>
				)}

				{view === 'accordiontable' && (
					<header className="c-accordion__button-wrapper accordion-table__head">
						{fieldMap.heading.map((heading) => (
							<span key={JSON.stringify(heading)} className="match-heading">
								{heading.heading}
							</span>
						))}
						<span className="colum-alignment">&nbsp;</span>
					</header>
				)}

				{items.map((item) => (
					<AccordionItem
						className="c-collection__item c-collection__item--action"
						key={item.id}
						heading={item.heading}
						content={item.content}
						view={view}
						//index={index + '-' + Math.round(Math.random() * 100000000)}
						index={item.id}
						itemClicked={itemClicked.bind(this)}
						fieldMap={fieldMap}
					/>
				))}
			</div>
		</div>
	);
};

export default Accordion;
