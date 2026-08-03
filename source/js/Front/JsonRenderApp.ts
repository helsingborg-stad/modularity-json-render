import { v4 as uuidv4 } from 'uuid';
import getApiData from '../Utilities/getApiData';
import { getDate, getDateTime, isDate } from '../Utilities/date';

interface FieldMapItem {
	value: string;
}

interface FieldMapSection {
	item: FieldMapItem;
	heading?: string;
	prefix?: string;
	suffix?: string;
	dateFormat?: string;
}

export interface FieldMap {
	itemContainer?: string;
	heading: FieldMapSection[];
	content: FieldMapSection[];
}

export interface Translation {
	somethingWentWrong: string;
	noResults: string;
	filterOn: string;
	next: string;
	prev: string;
	search: string;
	searchInputAriaLabel: string;
	[key: string]: string;
}

export interface JsonRenderConfig {
	url: string;
	view: string;
	fieldMap: FieldMap;
	showSearch: boolean;
	showPagination: boolean;
	perPage: number;
	translation: Translation;
}

interface ContentItem {
	title: string;
	value: string;
}

interface RenderedItem {
	id: string;
	heading: string[];
	content: ContentItem[];
}

interface ItemValues {
	id: string;
	values: string[];
}

interface JsonRenderState {
	error: Error | null;
	isLoaded: boolean;
	items: RenderedItem[];
	itemValues: ItemValues[];
	filteredItems: RenderedItem[];
	paginatedItems: RenderedItem[];
	totalPages: number;
	currentPage: number;
}

export class JsonRenderApp {
	private root: HTMLElement;
	private config: JsonRenderConfig;
	private state: JsonRenderState;

	constructor(root: HTMLElement, config: JsonRenderConfig) {
		this.root = root;
		this.config = config;
		this.state = {
			error: null,
			isLoaded: false,
			items: [],
			itemValues: [],
			filteredItems: [],
			paginatedItems: [],
			totalPages: 0,
			currentPage: 1,
		};
	}

	public init(): void {
		this.render();
		void this.getData();
	}

	private async getData(): Promise<void> {
		const { perPage, showPagination, url } = this.config;
		const response = (await getApiData(url)) as {
			result?: unknown;
			error?: unknown;
		};

		if (response.error) {
			this.state.error = response.error instanceof Error ? response.error : new Error(String(response.error));
			this.state.isLoaded = true;
			this.render();
			return;
		}

		const data = this.mapData(response.result);

		if (!data || data.length === 0) {
			this.state.error = new Error('Could not fetch data from URL.');
			this.state.isLoaded = true;
			this.render();
			return;
		}

		this.state.isLoaded = true;
		this.state.items = data;
		this.state.filteredItems = data;
		this.state.paginatedItems = data;
		this.state.totalPages = this.getTotalPages(data.length, perPage);

		if (showPagination) {
			this.updateItemList();
		}

		this.render();
	}

	private mapData(jsonData: unknown): RenderedItem[] {
		const { fieldMap } = this.config;
		const itemContainerKeys = fieldMap.itemContainer ? fieldMap.itemContainer.split('.') : [];
		let items = this.getObjectProp(jsonData, itemContainerKeys);

		if (!Array.isArray(items) || items.length === 0) {
			return [];
		}

		const headingMap = Array.isArray(fieldMap.heading) ? fieldMap.heading : [];
		const contentMap = Array.isArray(fieldMap.content) ? fieldMap.content : [];

		const mappedItems = items.map((item) => ({
			id: uuidv4(),
			heading: headingMap.map((heading) => {
				const value = this.getMappedValue(item, heading);
				return `${heading.prefix ?? ''}${value}${heading.suffix ?? ''}`;
			}),
			content: contentMap.map((content) => {
				const value = this.getMappedValue(item, content);
				return {
					title: content.heading ?? '',
					value: `${content.prefix ?? ''}${value}${content.suffix ?? ''}`,
				};
			}),
		}));

		this.state.itemValues = mappedItems.map((item) => {
			const values = [...item.heading];
			item.content.forEach((section) => values.push(section.value));
			return {
				id: item.id,
				values,
			};
		});

		return mappedItems;
	}

	private getMappedValue(item: unknown, mapSection: FieldMapSection): string {
		const keyPath = mapSection?.item?.value ? mapSection.item.value.split('.') : [];
		let value = this.getObjectProp(item, keyPath);

		value = !value || value === 'null' ? '' : value;
		value = value && mapSection.prefix ? value : this.autoLink(value);
		value = value && isDate(value) && mapSection.dateFormat === 'Y-m-d' ? getDate(value) : value;
		value = value && isDate(value) && mapSection.dateFormat === 'Y-m-d H:i' ? getDateTime(value) : value;

		return String(value ?? '');
	}

	private getObjectProp(object: unknown, keys: string[]): unknown {
		if (keys.length === 0) {
			return object;
		}

		let current: unknown = object;

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];

			if (typeof current === 'object' && current !== null && Object.prototype.hasOwnProperty.call(current, key)) {
				current = (current as Record<string, unknown>)[key];
			} else {
				console.log('Invalid map key');
				return null;
			}
		}

		return current;
	}

	private autoLink(value: unknown): unknown {
		if (typeof value !== 'string' || !value) {
			return value;
		}

		const regex = /(?![^<]*>|[^<>]*<\/)((https?:)\/\/[a-z0-9&#=./\-?_]+)/gi;
		const replacement = '<a href="$1">$1</a>';

		return value.replace(regex, replacement);
	}

	private handleSearch(value: string): void {
		const searchValue = typeof value === 'string' ? value.toLowerCase() : value;
		const { itemValues, items } = this.state;
		const { perPage, showPagination } = this.config;

		const filteredItems = itemValues
			.filter((item) => {
				let isFound = false;
				item.values.forEach((fieldValue) => {
					const normalizedValue = String(fieldValue).toLowerCase();
					if (normalizedValue.indexOf(searchValue) !== -1) {
						isFound = true;
					}
				});
				return isFound;
			})
			.map((item) => items.find((entity) => entity.id === item.id))
			.filter((item): item is RenderedItem => Boolean(item));

		if (showPagination) {
			this.state.filteredItems = filteredItems;
			this.state.currentPage = 1;
			this.state.totalPages = this.getTotalPages(filteredItems.length, perPage);
			this.updateItemList();
		} else {
			this.state.filteredItems = filteredItems;
			this.state.paginatedItems = filteredItems;
		}

		this.render();
	}

	private updateItemList(): void {
		const { filteredItems, currentPage } = this.state;
		const { perPage } = this.config;
		const begin = (currentPage - 1) * perPage;
		const end = begin + perPage;

		this.state.paginatedItems = filteredItems.slice(begin, end);
	}

	private nextPage(): void {
		if (this.state.currentPage === this.state.totalPages) {
			return;
		}

		this.state.currentPage += 1;
		this.updateItemList();
		this.render();
	}

	private prevPage(): void {
		if (this.state.currentPage <= 1) {
			return;
		}

		this.state.currentPage -= 1;
		this.updateItemList();
		this.render();
	}

	private getTotalPages(totalItems: number, perPage: number): number {
		if (perPage <= 0) {
			return 0;
		}

		return Math.ceil(totalItems / perPage);
	}

	private render(): void {
		this.root.innerHTML = '';

		if (this.state.error) {
			this.root.appendChild(this.renderError());
			return;
		}

		if (!this.state.isLoaded) {
			this.root.appendChild(this.renderLoading());
			return;
		}

		const wrapper = document.createElement('div');
		wrapper.appendChild(this.switchView(this.config.view));

		if (this.config.showPagination) {
			const paginationWrapper = document.createElement('div');
			paginationWrapper.className = 'o-grid u-justify-content--center gutter';

			const fitContent = document.createElement('div');
			fitContent.className = 'grid-fit-content u-ml-auto';
			fitContent.appendChild(this.renderPagination());

			paginationWrapper.appendChild(fitContent);
			wrapper.appendChild(paginationWrapper);
		}

		this.root.appendChild(wrapper);
	}

	private renderError(): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'gutter';

		const warning = document.createElement('div');
		warning.className = 'notice warning';

		const icon = document.createElement('i');
		icon.className = 'pricon pricon-notice-warning';

		warning.appendChild(icon);
		warning.append(` ${this.config.translation.somethingWentWrong}`);
		wrapper.appendChild(warning);

		return wrapper;
	}

	private renderLoading(): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'gutter';

		const loading = document.createElement('div');
		loading.className = 'loading';

		for (let i = 0; i < 4; i++) {
			loading.appendChild(document.createElement('div'));
		}

		wrapper.appendChild(loading);
		return wrapper;
	}

	private switchView(view: string): HTMLElement {
		switch (view) {
			case 'accordion':
			case 'accordiontable':
				return this.renderAccordion(view);
			case 'table':
				return this.renderTable();
			default:
				return this.renderList();
		}
	}

	private renderSearchField(): HTMLElement {
		const cardBody = document.createElement('div');
		cardBody.className = 'c-card__body';

		const field = document.createElement('div');
		field.className = 'c-field c-field__text';

		const label = document.createElement('label');
		label.className = 'c-field__text--label u-sr__only';
		label.textContent = this.config.translation.search;

		const innerField = document.createElement('div');
		innerField.className = 'c-field__inner c-field__inner--text';

		const icon = document.createElement('i');
		icon.className = 'c-icon c-field__icon c-icon--size-md material-icons';
		icon.setAttribute('translate', 'no');
		icon.setAttribute('role', 'img');
		icon.setAttribute('aria-label', 'Icon: Undefined');
		icon.textContent = 'search';

		const input = document.createElement('input');
		input.setAttribute('aria-label', this.config.translation.searchInputAriaLabel);
		input.type = 'text';
		input.name = 'json-render-search';
		input.placeholder = this.config.translation.filterOn;
		input.addEventListener('input', (event) => {
			const value = (event.target as HTMLInputElement)?.value ?? '';
			this.handleSearch(value);
		});

		innerField.appendChild(icon);
		innerField.appendChild(input);
		field.appendChild(label);
		field.appendChild(innerField);
		cardBody.appendChild(field);

		return cardBody;
	}

	private renderNoResults(): HTMLElement {
		const gutter = document.createElement('div');
		gutter.className = 'gutter';

		const paragraph = document.createElement('p');
		paragraph.textContent = this.config.translation.noResults;

		gutter.appendChild(paragraph);
		return gutter;
	}

	private renderList(): HTMLElement {
		const wrapper = document.createElement('div');

		if (this.config.showSearch) {
			wrapper.appendChild(this.renderSearchField());
		}

		if (this.state.paginatedItems.length === 0) {
			wrapper.appendChild(this.renderNoResults());
			return wrapper;
		}

		const grid = document.createElement('div');
		grid.className = 'o-grid';

		const column = document.createElement('div');
		column.className = 'o-grid-12@xs';

		const list = document.createElement('ul');
		list.className = 'c-listing';

		this.state.paginatedItems.forEach((item) => {
			const listItem = document.createElement('li');
			listItem.className = 'c-listing__item';
			listItem.setAttribute('data-item-id', item.id);

			const label = document.createElement('div');
			label.className = 'c-listing__label';
			label.innerHTML = item.heading[0] ?? '';

			listItem.appendChild(label);
			list.appendChild(listItem);
		});

		column.appendChild(list);
		grid.appendChild(column);
		wrapper.appendChild(grid);

		return wrapper;
	}

	private renderTable(): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'c-table table-striped table-bordered';

		if (this.config.showSearch) {
			wrapper.appendChild(this.renderSearchField());
		}

		if (this.state.paginatedItems.length === 0) {
			wrapper.appendChild(this.renderNoResults());
			return wrapper;
		}

		const table = document.createElement('table');
		table.className = 'c-table__table';

		const tableHead = document.createElement('thead');
		tableHead.className = 'c-table__head';

		const headRow = document.createElement('tr');
		headRow.className = 'c-table__line';

		this.config.fieldMap.heading.forEach((heading) => {
			const header = document.createElement('th');
			header.className = 'c-table__column';
			header.textContent = heading.heading ?? '';
			headRow.appendChild(header);
		});

		tableHead.appendChild(headRow);

		const tableBody = document.createElement('tbody');
		tableBody.className = 'c-table__body';

		this.state.paginatedItems.forEach((item) => {
			const row = document.createElement('tr');
			row.className = 'c-table__line';
			row.setAttribute('data-item-id', item.id);

			item.heading.forEach((heading) => {
				const dataCell = document.createElement('td');
				dataCell.className = 'c-table__column';
				dataCell.innerHTML = heading;
				row.appendChild(dataCell);
			});

			tableBody.appendChild(row);
		});

		table.appendChild(tableHead);
		table.appendChild(tableBody);
		wrapper.appendChild(table);

		return wrapper;
	}

	private renderAccordion(view: string): HTMLElement {
		const wrapper = document.createElement('div');
		const accordion = document.createElement('div');
		accordion.id = 'jsonRenderData';
		accordion.className = 'c-accordion';
		accordion.style.setProperty('--c-accordion--heading-count', String(this.config.fieldMap.heading.length || 1));

		if (this.config.showSearch) {
			accordion.appendChild(this.renderSearchField());
		}

		if (this.state.paginatedItems.length === 0) {
			accordion.appendChild(this.renderNoResults());
			wrapper.appendChild(accordion);
			return wrapper;
		}

		if (view === 'accordiontable') {
			const headingRow = document.createElement('div');
			headingRow.className = 'c-accordion__heading';
			this.config.fieldMap.heading.forEach((heading) => {
				const headingItem = document.createElement('span');
				headingItem.className = 'c-element c-accordion__heading-item';
				headingItem.textContent = heading.heading ?? '';
				headingRow.appendChild(headingItem);
			});
			accordion.appendChild(headingRow);
		}

		this.state.paginatedItems.forEach((item) => {
			accordion.appendChild(this.renderAccordionItem(item));
		});

		wrapper.appendChild(accordion);
		return wrapper;
	}

	private renderAccordionItem(item: RenderedItem): HTMLElement {
		const details = document.createElement('details');
		details.className = 'c-accordion__item';
		details.style.setProperty('--c-accordion__item--heading-count', String(item.heading.length || 1));

		const summary = document.createElement('summary');
		summary.className = 'c-accordion__item__heading';

		item.heading.forEach((heading) => {
			const title = document.createElement('span');
			title.className = 'c-accordion__item__heading-item c-typography__variant--h5';
			title.setAttribute('role', 'heading');
			title.textContent = heading;
			summary.appendChild(title);
		});

		const icon = document.createElement('span');
		icon.className =
			'c-icon c-accordion__item__icon c-icon--keyboard-arrow-down c-icon--material c-icon--material-keyboard_arrow_down material-symbols material-symbols-rounded material-symbols-sharp material-symbols-outlined  c-icon--size-md';
		icon.setAttribute('data-material-symbol', 'keyboard_arrow_down');
		icon.setAttribute('aria-label', 'Expand');

		summary.appendChild(icon);
		details.appendChild(summary);

		const content = document.createElement('div');
		content.className = 'c-accordion__item__content';
		content.id = `c-accordion__aria-jasonRender-${item.id}`;
		content.setAttribute('aria-hidden', 'true');
		content.style.setProperty('--c-accordion--inset-padding-x', '32px');
		content.style.setProperty('--c-accordion--inset-padding-y', '24px');

		item.content
			.filter((section) => section.value)
			.forEach((section) => {
				const paragraph = document.createElement('p');
				paragraph.className = 'u-mb-2';

				if (section.title) {
					const sectionHeading = document.createElement('h4');
					sectionHeading.textContent = section.title;
					paragraph.appendChild(sectionHeading);
				}

				const value = document.createElement('div');
				value.innerHTML = section.value;
				paragraph.appendChild(value);

				content.appendChild(paragraph);
			});

		details.appendChild(content);
		return details;
	}

	private renderPagination(): HTMLElement {
		const footer = document.createElement('div');
		footer.className = 'c-card__footer';

		const grid = document.createElement('div');
		grid.className = 'o-grid';

		const prevColumn = document.createElement('div');
		prevColumn.className = 'o-grid-5';

		const prevButton = document.createElement('button');
		prevButton.type = 'button';
		prevButton.className = 'c-button c-button__filled c-button__filled--default c-button--md ripple ripple--before c-button--md c-button--lg@sm c-button--lg@xs';
		prevButton.disabled = this.state.currentPage <= 1;
		prevButton.innerHTML = `<span class="c-icon material-icons">navigate_before</span> <span class="u-display--none@xs u-display--none@sm">${this.config.translation.prev}</span>`;
		prevButton.addEventListener('click', () => this.prevPage());
		prevColumn.appendChild(prevButton);

		const pagesColumn = document.createElement('div');
		pagesColumn.className = 'o-grid-2 modularity-json-render__pages';
		const pagesText = document.createElement('span');
		pagesText.className = 'c-typography c-typography__variant--h3';
		pagesText.textContent = `${this.state.currentPage} / ${this.state.totalPages}`;
		pagesColumn.appendChild(pagesText);

		const nextColumn = document.createElement('div');
		nextColumn.className = 'o-grid-5';

		const floatRight = document.createElement('div');
		floatRight.className = 'u-float--right';

		const nextButton = document.createElement('button');
		nextButton.type = 'button';
		nextButton.className = 'c-button c-button__filled c-button__filled--default c-button--md ripple ripple--before';
		nextButton.disabled = this.state.currentPage === this.state.totalPages;
		nextButton.innerHTML = `<span class="u-display--none@xs u-display--none@sm">${this.config.translation.next}</span> <span class="u-hidden@xl c-icon material-icons">navigate_next</span>`;
		nextButton.addEventListener('click', () => this.nextPage());

		floatRight.appendChild(nextButton);
		nextColumn.appendChild(floatRight);

		grid.appendChild(prevColumn);
		grid.appendChild(pagesColumn);
		grid.appendChild(nextColumn);
		footer.appendChild(grid);

		return footer;
	}
}
