const AccordionItem = ({heading, content, view}) =>
    <section className="accordion-section c-accordion__section">
        {view === 'accordion' &&
        <button tabIndex="0" className="accordion-toggle c-accordion__button u-padding__x--3 u-padding__y--2" htmlFor="accordion-section-1">
            {heading[0]}
        </button>
        }

        {view === 'accordiontable' &&
        <button tabIndex="0" className="accordion-toggle c-accordion__button u-padding__x--3 u-padding__y--2" htmlFor="accordion-section-1">
                <span className="accordion-table">
                {heading.map((title, i) => (
                    <span key={i} className="column-header" dangerouslySetInnerHTML={{__html: title}} />
                ))}
                </span>
        </button>
        }

        <div className="accordion-content c-accordion__content" style={{display: "none"}}>
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