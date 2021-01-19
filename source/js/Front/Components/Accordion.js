import AccordionItem from './AccordionItem';
import SearchField from './SearchField';

const Accordion = ({items, showSearch, doSearch, translation, view, fieldMap, itemClicked}) =>
    <div>

        <div
            id="jsonRenderData"
            className="c-collection c-collection--bordered c-collection--sharp-top"
            js-expand-container=""
            data-uid="5fce30f28f9d0">

            {showSearch && <SearchField
                    doSearch={doSearch}
                    translation={translation}
                />
            }

            {Object.keys(items).length === 0 &&
                <div className="gutter"><p>{translation.noResults}</p></div>
            }

            {view === 'accordiontable' &&
                <header className="c-accordion__button-wrapper">
                    {fieldMap.heading.map((heading, i) => (
                        <span key={'acTable'+i}
                              className={'match-heading'}>
                            {heading.heading}
                        </span>
                    ))}
                    <span className="colum-alignment">&nbsp;</span>
                </header>
            }

            {items.map((item, index) => (
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
    </div>;

export default Accordion;