const AccordionItem = ({ heading, content, view, index, itemClicked }) => (
	<details className="c-accordion__item" style={{ '--c-accordion__item--heading-count': heading.length ?? 1 }}>
		<summary className="c-accordion__item__heading">
			{heading.map((title, i) => (
				<span className="c-accordion__item__heading-item c-typography__variant--h5" role="heading">
					{heading[i]}
				</span>
			))}
			<span className="c-icon c-accordion__item__icon c-icon--keyboard-arrow-down c-icon--material c-icon--material-keyboard_arrow_down material-symbols material-symbols-rounded material-symbols-sharp material-symbols-outlined  c-icon--size-md" data-material-symbol="keyboard_arrow_down" aria-label="Expand"></span>
		</summary>

		<div className="c-accordion__item__content" id={'c-accordion__aria-jasonRender-' + index} aria-hidden="true" style={{"--c-accordion--inset-padding-x": "32px", "--c-accordion--inset-padding-y": "24px"}}>
			{content
				.filter((section) => section.value)
				.map((section, i) => (
					<p key={i} className="u-mb-2">
						{section.title && <h4>{section.title}</h4>}

						<div dangerouslySetInnerHTML={{ __html: section.value }} />
					</p>
				))}
		</div>
	</details>
);

export default AccordionItem;
