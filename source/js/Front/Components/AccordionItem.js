const AccordionItem = ({heading, content, view, index, itemClicked}) =>
    <section className="accordion-section c-accordion__section">

        {view === 'accordiontable' &&
        <button tabIndex="-1"
                className="accordion-toggle c-accordion__button u-padding__x--3 u-padding__y--2"
                htmlFor="accordion-section-1">
                    <span className="accordion-table">
                    {heading.map((title, i) => (
                        <span key={i} className="column-header" dangerouslySetInnerHTML={{__html: title}}/>
                    ))}
                        <i id=""
                           className="c-icon c-accordion__icon c-icon--size-md material-icons">keyboard_arrow_down</i>
                    </span>
        </button>
        }

        {view === 'accordion' &&
        <button
            onClick={itemClicked.bind(this)}
            class="c-accordion__button"
            aria-controls={'c-accordion__aria-jasonRender-' + index}
            aria-expanded="false"
            js-expand-button=""
            htmlFor="accordion-section-1">

                <span
                    className="c-accordion__button-wrapper"
                    tabIndex="-1">
                        {heading[0]}
                    <i id="" className="c-icon c-accordion__icon c-icon--size-md material-icons">keyboard_arrow_down</i>
                </span>
        </button>

        }

        <div
            class="c-accordion__content"
            id={'c-accordion__aria-jasonRender-' + index}
            aria-hidden="true">

            {content.filter(section => section.value).map((section, i) => (
                <div key={i} className="u-mb-2">
                    {section.title &&
                    <h4>{section.title}</h4>
                    }

                    <div dangerouslySetInnerHTML={{__html: section.value}}/>
                </div>
            ))}
        </div>

    </section>;

export default AccordionItem;