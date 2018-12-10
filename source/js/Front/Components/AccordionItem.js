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
                    <span key={i} className="column-header" dangerouslySetInnerHTML={{__html: title}} />
                ))}
                </span>
        </label>
        }

        <div className="accordion-content">
            {content.filter(section => section.value).map((section, i) => (
                <div key={i} className="u-mb-2">
                    {section.title &&
                    <h4>{section.title}</h4>
                    }
                    <div dangerouslySetInnerHTML={{__html: section.value}} />
                </div>
            ))}
        </div>

    </section>;

export default AccordionItem;