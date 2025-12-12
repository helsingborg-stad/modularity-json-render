/**
 *  Modified helpers from HBG Works styleguide
 *  This one is primary for the expandable items such as the expandable list or table
 */

/**
 * Toggles a button's and its siblings "pressed" state
 * @param button
 * @param expanded
 */
const toggleButton = (button, expanded) => {
	const attrContainer = '[js-expand-container]';
	const attrButton = '[js-expand-button]';

	const container = button.closest(attrContainer);
	let safeExpanded = expanded;

	if (!container) {
		throw new Error(`${attrButton} is missing outer ${attrContainer}`);
	}

	safeExpanded = toggleExpandItem(button, !expanded);

	if (safeExpanded) {
		const containerButtons = container.querySelectorAll(attrButton);
		containerButtons.forEach((other) => {
			if (other !== button) {
				toggleExpandItem(other, false);
			}
		});
	}
};

/**
 * Toggle helper
 * @param button
 * @param expanded
 * @returns {boolean}
 */
const toggleExpandItem = (button, expanded) => {
	let safeExpanded = expanded;

	if (typeof safeExpanded !== 'boolean') {
		safeExpanded = button.getAttribute('aria-expanded') === 'false';
	}

	button.setAttribute('aria-expanded', safeExpanded);

	const id = button.getAttribute('aria-controls');
	const controls = document.getElementById(id);

	if (!controls) {
		throw new Error(`No toggle target found with id: "${id}"`);
	}

	if (safeExpanded) {
		controls.setAttribute('aria-hidden', 'false');
	} else {
		controls.setAttribute('aria-hidden', 'true');
	}

	return safeExpanded;
};

/**
 * Trigger for eventlisterner
 * @param params
 * @returns {function(): void}
 */
const triggerEventListener = (params) => () => {
	const expanded = params.element.getAttribute('aria-expanded') === 'true';
	toggleButton(params.element, expanded);
};

export { toggleButton, toggleExpandItem, triggerEventListener };
