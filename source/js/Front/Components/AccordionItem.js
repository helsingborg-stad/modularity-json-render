const AccordionItem = ({heading, content, view, index, itemClicked}) =>
    <section className="accordion-section c-accordion__section">

        {view === 'accordiontable' &&
        <button
            onClick={itemClicked.bind(this)}
            className="c-accordion__button column-headings-flex"
            aria-controls={'c-accordion__aria-jasonRender-' + index}
            aria-expanded="false"
            js-expand-button=""
            htmlFor={'c-accordion__aria-jasonRender-' + index}>
            <span className="c-accordion__button-wrapper">
                {heading.map((title, i) => (

                    <span key={i}
                          className={'match-heading'}
                          tabIndex="-1">
                                {heading[i]}
                       </span>
                ))}
                <i id="" className="c-icon c-accordion__icon c-icon--size-md material-icons">keyboard_arrow_down</i>
            </span>

        </button>
        }


        {view === 'accordion' &&
        <button
            onClick={itemClicked.bind(this)}
            className="c-accordion__button "
            aria-controls={'c-accordion__aria-jasonRender-' + index}
            aria-expanded="false"
            js-expand-button=""
            htmlFor={'c-accordion__aria-jasonRender-' + index}>

                <span
                    className="c-accordion__button-wrapper"
                    tabIndex="-1">
                        {heading[0]}
                    <i id="" className="c-icon c-accordion__icon c-icon--size-md material-icons">keyboard_arrow_down</i>
                </span>

        </button>
        }

        <div
            className="c-accordion__content"
            id={'c-accordion__aria-jasonRender-' + index}
            aria-hidden="true">

            {content.filter(section => section.value).map((section, i) => (
                <p key={i} className="u-mb-2">
                    {section.title &&
                    <h4>{section.title}</h4>
                    }

                    <div dangerouslySetInnerHTML={{__html: section.value}}/>
                </p>
            ))}
        </div>

    </section>
;

export default AccordionItem;