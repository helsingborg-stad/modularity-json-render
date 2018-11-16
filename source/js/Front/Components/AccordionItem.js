const AccordionItem = ({title, content}) =>
    <section className="accordion-section">
        <label tabIndex="0" className="accordion-toggle" htmlFor="accordion-section-1">
            {title}
        </label>
        <div className="accordion-content">
            {content}
        </div>
    </section>;

export default AccordionItem;