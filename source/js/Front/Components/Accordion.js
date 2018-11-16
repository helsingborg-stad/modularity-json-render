import AccordionItem from './AccordionItem';

const Accordion = ({items, showSearch, doSearch, translation}) =>
    <div className="accordion accordion-icon accordion-list">
        {showSearch ?
            <div className="accordion-search">
                <input type="text" name="json-render-search" onChange={doSearch} placeholder={translation.filterOn}/>
            </div> : ''}
        {Object.keys(items).length === 0 ? <div className="gutter"><p>{translation.noResults}</p></div> : ''}
        {items.map(item => (
            <AccordionItem
                key={item.id}
                title={item.title}
                content={item.content}
            />
        ))}
    </div>;

export default Accordion;