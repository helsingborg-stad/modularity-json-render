import AccordionItem from './AccordionItem';
import SearchField from './SearchField';

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

        <div className="accordion accordion-icon accordion-list c-accordion">
            {showSearch &&
                <SearchField
                    doSearch={doSearch}
                    translation={translation}
                />
            }
            {Object.keys(items).length === 0 &&
            <div className="gutter"><p>{translation.noResults}</p></div>
            }
            {items.map(item => (
                <AccordionItem
                    key={item.id}
                    heading={item.heading}
                    content={item.content}
                    view={view}
                />
            ))}
        </div>
    </div>;

export default Accordion;