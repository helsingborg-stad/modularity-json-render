import AccordionItem from './AccordionItem';
import SearchField from './SearchField';

const Accordion = ({items, showSearch, doSearch, translation, view, fieldMap, itemClicked}) =>
    <div>

        <div
            id="jsonRenderData"
            className="c-accordion"
            js-expand-container=""
            data-uid="5fce30f28f9d0">

            {showSearch &&
            <SearchField
                doSearch={doSearch}
                translation={translation}
            />
            }
            {Object.keys(items).length === 0 &&
            <div className="gutter"><p>{translation.noResults}</p></div>
            }

            {items.map((item, index) => (

                <AccordionItem
                    key={item.id}
                    heading={item.heading}
                    content={item.content}
                    view={view}
                    index={index + '-' + Math.round(Math.random() * 100000000)}
                    itemClicked={itemClicked.bind(this)}
                    fieldMap={fieldMap}
                />
            ))}
        </div>
    </div>;

export default Accordion;