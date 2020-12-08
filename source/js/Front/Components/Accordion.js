import AccordionItem from './AccordionItem';
import SearchField from './SearchField';
import uuidv1 from 'uuid/v1';

const Accordion = ({items, showSearch, doSearch, translation, view, fieldMap}) =>
    <div>
        {view === 'accordiontable' &&
        <header className="accordion-table accordion-table-head">
            {fieldMap.heading.map((heading, i) => (
                <span key={i} className="column-header">
                        {heading.heading}
                    </span>
            ))}
        </header>
        }

        <div id="5fce30f28f9be"
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
                    index={uuidv1()}
                />
            ))}
        </div>
    </div>;

export default Accordion;