const Accordion = ({items, showSearch, doSearch, translation}) =>
    <div className="accordion accordion-icon accordion-list">
        {showSearch ?
            <div className="accordion-search">
                <input type="text" name="json-render-search" onChange={doSearch} placeholder={translation.filterOn}/>
            </div> : ''}
        {Object.keys(items).length === 0 ? <div className="gutter"><p>{translation.noResults}</p></div> : ''}
        {items.map(item => (
            <section className="accordion-section" key={item.id}>
                <label tabIndex="0" className="accordion-toggle" htmlFor="accordion-section-1">
                    {item.title}
                </label>
                <div className="accordion-content">
                    {item.content}
                </div>
            </section>
        ))}
    </div>;

export default Accordion;