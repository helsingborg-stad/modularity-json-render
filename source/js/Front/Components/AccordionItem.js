const AccordionItem = ({heading, content, view}) =>
    <section className="accordion-section">

        {view === 'accordion' &&
        <label tabIndex="0" className="accordion-toggle" htmlFor="accordion-section-1">
            {heading[0]}
        </label>
        }

        {view === 'accordiontable' &&
        <label tabIndex="0" className="accordion-toggle" htmlFor="accordion-section-1">
                <span className="accordion-table">
                {heading.map((title, i) => (
                    <span key={i} className="column-header">{title}</span>
                ))}
                </span>
        </label>
        }

        <div className="accordion-content">
            {content.filter(section => section.value).map((section, i) => (
                <div key={i} className="u-mb-2">
                    {section.title &&
                    <h2>{section.title}</h2>
                    }
                    <p>{section.value}</p>
                </div>
            ))}
        </div>

    </section>;

export default AccordionItem;