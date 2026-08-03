// Polyfills
import 'es6-promise';
import 'isomorphic-fetch';
import { FieldMap, JsonRenderApp, Translation } from './JsonRenderApp';

declare global {
	interface Window {
		modJsonRender?: {
			translation?: Translation;
		};
	}
}

const parseFieldMap = (serializedFieldMap: string | undefined): FieldMap => {
	if (!serializedFieldMap) {
		return {
			heading: [],
			content: [],
		};
	}

	try {
		const parsedData = JSON.parse(serializedFieldMap) as Partial<FieldMap>;
		return {
			itemContainer: parsedData.itemContainer,
			heading: Array.isArray(parsedData.heading) ? parsedData.heading : [],
			content: Array.isArray(parsedData.content) ? parsedData.content : [],
		};
	} catch (_error) {
		return {
			heading: [],
			content: [],
		};
	}
};

const parseBoolean = (value: string | undefined): boolean => {
	if (!value) {
		return false;
	}

	return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

const parsePerPage = (value: string | undefined): number => {
	const parsedValue = Number.parseInt(value ?? '', 10);
	if (Number.isNaN(parsedValue) || parsedValue < 1) {
		return 10;
	}

	return parsedValue;
};

document.addEventListener('DOMContentLoaded', () => {
	const domElements = document.getElementsByClassName('modularity-json-render');
	const translation = window.modJsonRender?.translation ?? null;

	if (translation === null) {
		return;
	}

	for (let i = 0; i < domElements.length; i++) {
		const element = domElements[i];

		if (!(element instanceof HTMLElement)) {
			continue;
		}

		const app = new JsonRenderApp(element, {
			url: element.dataset.url ?? '',
			view: element.dataset.view ?? 'list',
			fieldMap: parseFieldMap(element.dataset.fieldMap),
			showSearch: parseBoolean(element.dataset.showSearch),
			showPagination: parseBoolean(element.dataset.showPagination),
			perPage: parsePerPage(element.dataset.perPage),
			translation,
		});

		app.init();
	}
});
