function Accordion(props) {
    return (
        <div className="accordion accordion-icon accordion-list">
            {props.items.map(item => (
                <section className="accordion-section" key={item.id}>
                    <label tabIndex="0" className="accordion-toggle" htmlFor="accordion-section-1">
                        {item.title}
                    </label>
                    <div className="accordion-content">
                        {item.content}
                    </div>
                </section>
            ))}
        </div>
    );
}

export default Accordion;