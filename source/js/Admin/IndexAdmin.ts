import 'es6-promise';
import 'isomorphic-fetch';
import { v4 as uuidv4 } from 'uuid';
import getApiData from '../Utilities/getApiData';
import { getDate, getDateTime, isDate } from '../Utilities/date';

interface Translation {
	resetSettings: string;
	validJsonUrl: string;
	sendRequest: string;
	selectItemsContainer: string;
	infoFields: string;
	title: string;
	heading: string;
	headings: string;
	content: string;
	select: string;
	couldNotFetch: string;
	list: string;
	accordion: string;
	accordiontable: string;
	table: string;
	selectView: string;
	dragAndDropInfo: string;
	value: string;
	prefix: string;
	suffix: string;
	selectDateFormat: string;
	none: string;
	[key: string]: string;
}

interface OptionValues {
	url?: string | null;
	view?: string | null;
	fieldMap?: string | null;
}

interface ModJsonRenderData {
	translation: Translation;
	options?: OptionValues;
}

interface FieldMapItem {
	field: string;
	value: string;
	sample: string;
}

interface FieldMapEntry {
	id: string;
	heading: string;
	prefix: string;
	suffix: string;
	dateFormat: string;
	item: FieldMapItem;
}

interface FieldMap {
	itemContainer: string | null;
	heading: FieldMapEntry[];
	content: FieldMapEntry[];
}

interface AppState {
	showFieldSelection: boolean;
	url: string;
	view: string;
	isLoaded: boolean;
	errorMessage: string | null;
	rawData: unknown;
	containerPaths: string[];
	availableFieldPaths: string[];
	itemSample: Record<string, unknown> | null;
	fieldMap: FieldMap;
}

declare global {
	interface Window {
		modJsonRender?: ModJsonRenderData;
	}
}

class JsonRenderAdminApp {
	private rootElement: HTMLElement;
	private translation: Translation;
	private state: AppState;

	constructor(rootElement: HTMLElement, translation: Translation) {
		this.rootElement = rootElement;
		this.translation = translation;
		this.state = {
			showFieldSelection: false,
			url: '',
			view: 'list',
			isLoaded: false,
			errorMessage: null,
			rawData: null,
			containerPaths: [],
			availableFieldPaths: [],
			itemSample: null,
			fieldMap: {
				itemContainer: null,
				heading: [],
				content: [],
			},
		};
	}

	public init(): void {
		this.initOptions();
		this.render();

		if (this.state.showFieldSelection) {
			void this.loadData();
		}
	}

	private initOptions(): void {
		const options = window.modJsonRender?.options;
		if (!options) {
			return;
		}

		const defaultFieldMap: FieldMap = {
			itemContainer: null,
			heading: [],
			content: [],
		};

		let parsedFieldMap = defaultFieldMap;

		if (options.fieldMap) {
			try {
				const rawFieldMap = JSON.parse(options.fieldMap) as Partial<FieldMap>;
				parsedFieldMap = {
					itemContainer: rawFieldMap.itemContainer ?? null,
					heading: Array.isArray(rawFieldMap.heading)
						? rawFieldMap.heading.map((entry) => this.normalizeEntry(entry, this.translation.heading))
						: [],
					content: Array.isArray(rawFieldMap.content)
						? rawFieldMap.content.map((entry) => this.normalizeEntry(entry, this.translation.content))
						: [],
				};
			} catch (_error) {
				parsedFieldMap = defaultFieldMap;
			}
		}

		this.state.url = options.url ?? '';
		this.state.view = options.view ?? 'list';
		this.state.fieldMap = parsedFieldMap;
		this.state.showFieldSelection = Boolean(options.url);
	}

	private normalizeEntry(entry: Partial<FieldMapEntry>, fallbackHeading: string): FieldMapEntry {
		const fieldPath = entry.item?.value ?? '';
		return {
			id: entry.id ?? uuidv4(),
			heading: entry.heading ?? fallbackHeading,
			prefix: entry.prefix ?? '',
			suffix: entry.suffix ?? '',
			dateFormat: entry.dateFormat ?? '',
			item: {
				field: entry.item?.field ?? this.getFieldName(fieldPath),
				value: fieldPath,
				sample: entry.item?.sample ?? '',
			},
		};
	}

	private async loadData(): Promise<void> {
		if (!this.state.url) {
			this.state.errorMessage = this.translation.validJsonUrl;
			this.state.isLoaded = true;
			this.render();
			return;
		}

		this.state.isLoaded = false;
		this.state.errorMessage = null;
		this.render();

		const response = (await getApiData(this.state.url)) as { result?: unknown; error?: unknown };

		if (response.error) {
			this.state.errorMessage =
				response.error instanceof Error ? response.error.message : this.translation.couldNotFetch;
			this.state.isLoaded = true;
			this.render();
			return;
		}

		if (!response.result || (typeof response.result === 'object' && Object.keys(response.result as Record<string, unknown>).length === 0)) {
			this.state.errorMessage = this.translation.couldNotFetch;
			this.state.isLoaded = true;
			this.render();
			return;
		}

		this.state.rawData = response.result;
		this.state.containerPaths = this.collectContainerPaths(response.result);

		if (Array.isArray(response.result) && this.state.fieldMap.itemContainer === null) {
			this.state.fieldMap.itemContainer = '';
		}

		this.updateDerivedFieldData();
		this.state.isLoaded = true;
		this.render();
	}

	private collectContainerPaths(data: unknown): string[] {
		const paths = new Set<string>();

		if (Array.isArray(data)) {
			paths.add('');
		}

		const traverse = (node: unknown, currentPath: string): void => {
			if (Array.isArray(node)) {
				if (node.length > 0 && typeof node[0] === 'object' && node[0] !== null) {
					paths.add(currentPath);
					traverse(node[0], currentPath);
				}
				return;
			}

			if (typeof node !== 'object' || node === null) {
				return;
			}

			Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
				const path = currentPath ? `${currentPath}.${key}` : key;
				traverse(value, path);
			});
		};

		traverse(data, '');
		return Array.from(paths).filter((path, index, all) => all.indexOf(path) === index);
	}

	private collectLeafPaths(data: unknown, prefix = ''): string[] {
		if (data === null || typeof data !== 'object') {
			return prefix ? [prefix] : [];
		}

		if (Array.isArray(data)) {
			if (data.length === 0) {
				return prefix ? [prefix] : [];
			}
			return this.collectLeafPaths(data[0], prefix);
		}

		const results: string[] = [];
		Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
			const path = prefix ? `${prefix}.${key}` : key;
			if (value !== null && typeof value === 'object') {
				results.push(...this.collectLeafPaths(value, path));
			} else {
				results.push(path);
			}
		});

		return results;
	}

	private getObjectProp(data: unknown, path: string | null): unknown {
		if (path === null) {
			return null;
		}

		if (!path) {
			return data;
		}

		const keys = path.split('.');
		let current: unknown = data;

		for (let index = 0; index < keys.length; index++) {
			const key = keys[index];
			if (typeof current === 'object' && current !== null && Object.prototype.hasOwnProperty.call(current, key)) {
				current = (current as Record<string, unknown>)[key];
			} else {
				return null;
			}
		}

		return current;
	}

	private getItemSampleFromContainer(data: unknown, containerPath: string | null): Record<string, unknown> | null {
		const containerData = this.getObjectProp(data, containerPath);

		if (Array.isArray(containerData)) {
			const sample = containerData[0];
			return typeof sample === 'object' && sample !== null ? (sample as Record<string, unknown>) : null;
		}

		if (typeof containerData === 'object' && containerData !== null) {
			return containerData as Record<string, unknown>;
		}

		return null;
	}

	private updateDerivedFieldData(): void {
		if (!this.state.rawData) {
			this.state.availableFieldPaths = [];
			this.state.itemSample = null;
			return;
		}

		const sample = this.getItemSampleFromContainer(this.state.rawData, this.state.fieldMap.itemContainer);
		this.state.itemSample = sample;
		this.state.availableFieldPaths = sample ? this.collectLeafPaths(sample) : [];

		this.state.fieldMap.heading = this.state.fieldMap.heading.map((entry) => this.syncEntrySample(entry));
		this.state.fieldMap.content = this.state.fieldMap.content.map((entry) => this.syncEntrySample(entry));
	}

	private syncEntrySample(entry: FieldMapEntry): FieldMapEntry {
		const sampleValue = this.getSampleValue(entry.item.value);
		return {
			...entry,
			item: {
				...entry.item,
				sample: sampleValue,
				field: this.getFieldName(entry.item.value),
			},
		};
	}

	private getFieldName(path: string): string {
		if (!path) {
			return '';
		}

		const parts = path.split('.');
		return parts[parts.length - 1] ?? '';
	}

	private getSampleValue(path: string): string {
		if (!this.state.itemSample || !path) {
			return '';
		}

		const value = this.getObjectProp(this.state.itemSample, path);
		if (value === null || typeof value === 'undefined') {
			return '';
		}

		const asString = String(value);
		return asString.length > 50 ? `${asString.substring(0, 50)}...` : asString;
	}

	private getDropAreas(view: string): Array<{ id: 'heading' | 'content'; limit: number | null; label: string }> {
		switch (view) {
			case 'list':
				return [{ id: 'heading', limit: 1, label: this.translation.heading }];
			case 'accordion':
				return [
					{ id: 'heading', limit: 1, label: this.translation.heading },
					{ id: 'content', limit: null, label: this.translation.content },
				];
			case 'accordiontable':
				return [
					{ id: 'heading', limit: null, label: this.translation.headings },
					{ id: 'content', limit: null, label: this.translation.content },
				];
			case 'table':
				return [{ id: 'heading', limit: null, label: this.translation.headings }];
			default:
				return [{ id: 'heading', limit: 1, label: this.translation.heading }];
		}
	}

	private setUrl(url: string): void {
		this.state.url = url;
		this.render();
	}

	private setView(view: string): void {
		this.state.view = view;
		const dropAreas = this.getDropAreas(view);
		const areaIds = dropAreas.map((area) => area.id);

		if (!areaIds.includes('content')) {
			this.state.fieldMap.content = [];
		}

		dropAreas.forEach((area) => {
			if (area.limit !== null && this.state.fieldMap[area.id].length > area.limit) {
				this.state.fieldMap[area.id] = this.state.fieldMap[area.id].slice(0, area.limit);
			}
		});

		this.render();
	}

	private setItemContainer(path: string): void {
		this.state.fieldMap.itemContainer = path;
		this.state.fieldMap.heading = [];
		this.state.fieldMap.content = [];
		this.updateDerivedFieldData();
		this.render();
	}

	private addFieldMapEntry(type: 'heading' | 'content'): void {
		const list = this.state.fieldMap[type];
		const selectedPath = this.state.availableFieldPaths[0] ?? '';
		const newEntry: FieldMapEntry = {
			id: uuidv4(),
			heading: type === 'heading' ? this.translation.heading : this.translation.content,
			prefix: '',
			suffix: '',
			dateFormat: '',
			item: {
				field: this.getFieldName(selectedPath),
				value: selectedPath,
				sample: this.getSampleValue(selectedPath),
			},
		};

		list.push(newEntry);
		this.render();
	}

	private removeFieldMapEntry(type: 'heading' | 'content', id: string): void {
		this.state.fieldMap[type] = this.state.fieldMap[type].filter((entry) => entry.id !== id);
		this.render();
	}

	private moveFieldMapEntry(type: 'heading' | 'content', id: string, direction: -1 | 1): void {
		const list = this.state.fieldMap[type];
		const currentIndex = list.findIndex((entry) => entry.id === id);
		const targetIndex = currentIndex + direction;

		if (currentIndex < 0 || targetIndex < 0 || targetIndex >= list.length) {
			return;
		}

		const currentItem = list[currentIndex];
		list[currentIndex] = list[targetIndex];
		list[targetIndex] = currentItem;
		this.render();
	}

	private updateFieldMapEntry(type: 'heading' | 'content', id: string, key: keyof FieldMapEntry | 'itemValue', value: string): void {
		this.state.fieldMap[type] = this.state.fieldMap[type].map((entry) => {
			if (entry.id !== id) {
				return entry;
			}

			if (key === 'itemValue') {
				return {
					...entry,
					item: {
						field: this.getFieldName(value),
						value,
						sample: this.getSampleValue(value),
					},
				};
			}

			return {
				...entry,
				[key]: value,
			};
		});

		this.render();
	}

	private submitUrlForm(event: Event): void {
		event.preventDefault();
		this.state.showFieldSelection = true;
		void this.loadData();
	}

	private resetOptions(event: Event): void {
		event.preventDefault();
		this.state = {
			showFieldSelection: false,
			url: '',
			view: 'list',
			isLoaded: false,
			errorMessage: null,
			rawData: null,
			containerPaths: [],
			availableFieldPaths: [],
			itemSample: null,
			fieldMap: {
				itemContainer: null,
				heading: [],
				content: [],
			},
		};

		this.render();
	}

	private render(): void {
		this.rootElement.innerHTML = '';
		const wrapper = document.createElement('div');

		if (!this.state.showFieldSelection) {
			wrapper.appendChild(this.renderUrlForm());
		} else {
			wrapper.appendChild(this.renderFieldSelection());
			const resetContainer = document.createElement('p');
			const resetButton = document.createElement('a');
			resetButton.href = '#';
			resetButton.className = 'button';
			resetButton.textContent = this.translation.resetSettings;
			resetButton.addEventListener('click', (event) => this.resetOptions(event));
			resetContainer.appendChild(resetButton);
			wrapper.appendChild(resetContainer);
		}

		wrapper.appendChild(this.renderHiddenInputs());
		this.rootElement.appendChild(wrapper);
	}

	private renderUrlForm(): HTMLElement {
		const container = document.createElement('div');
		container.className = 'wrap';

		const form = document.createElement('form');
		form.addEventListener('submit', (event) => this.submitUrlForm(event));

		const intro = document.createElement('p');
		intro.innerHTML = `<label><strong>API URL</strong></label><br /><i>${this.translation.validJsonUrl}</i>`;

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'large-text';
		input.value = this.state.url;
		input.addEventListener('input', (event) => this.setUrl((event.target as HTMLInputElement).value));

		const submitParagraph = document.createElement('p');
		const submit = document.createElement('input');
		submit.type = 'submit';
		submit.className = 'button button-primary';
		submit.value = this.translation.sendRequest;
		submitParagraph.appendChild(submit);

		form.appendChild(intro);
		form.appendChild(input);
		form.appendChild(submitParagraph);
		container.appendChild(form);

		return container;
	}

	private renderFieldSelection(): HTMLElement {
		const container = document.createElement('div');

		if (this.state.errorMessage) {
			const error = document.createElement('div');
			error.className = 'notice notice-error inline';
			error.innerHTML = `<p>${this.state.errorMessage}</p>`;
			container.appendChild(error);
			return container;
		}

		if (!this.state.isLoaded) {
			const spinner = document.createElement('div');
			spinner.className = 'spinner is-active';
			container.appendChild(spinner);
			return container;
		}

		if (!this.state.fieldMap.itemContainer && this.state.fieldMap.itemContainer !== '') {
			container.appendChild(this.renderContainerSelection());
			return container;
		}

		container.appendChild(this.renderMappingEditor());
		return container;
	}

	private renderContainerSelection(): HTMLElement {
		const container = document.createElement('div');

		const heading = document.createElement('h3');
		heading.textContent = this.translation.selectItemsContainer;
		container.appendChild(heading);

		const list = document.createElement('ul');
		list.className = 'json-tree';

		this.state.containerPaths.forEach((path) => {
			const item = document.createElement('li');
			const title = document.createElement('strong');
			title.innerHTML = `<span class="dashicons dashicons-portfolio"></span> ${path || 'root'}`;

			const action = document.createElement('a');
			action.href = '#';
			action.className = 'tree-select';
			action.textContent = this.translation.select;
			action.addEventListener('click', (event) => {
				event.preventDefault();
				this.setItemContainer(path);
			});

			item.appendChild(title);
			item.appendChild(document.createTextNode(' '));
			item.appendChild(action);
			list.appendChild(item);
		});

		container.appendChild(list);
		return container;
	}

	private renderMappingEditor(): HTMLElement {
		const grid = document.createElement('div');
		grid.className = 'grid nav-menus-php';

		const left = document.createElement('div');
		left.className = 'grid__item';

		const infoHeading = document.createElement('h3');
		infoHeading.textContent = this.translation.infoFields;
		left.appendChild(infoHeading);

		const infoText = document.createElement('p');
		infoText.innerHTML = `<i>${this.translation.dragAndDropInfo}</i>`;
		left.appendChild(infoText);

		const fieldList = document.createElement('ul');
		fieldList.className = 'json-tree';
		this.state.availableFieldPaths.forEach((path) => {
			const li = document.createElement('li');
			li.textContent = `${path} (${this.getSampleValue(path)})`;
			fieldList.appendChild(li);
		});
		left.appendChild(fieldList);

		const right = document.createElement('div');
		right.className = 'grid__item';
		right.appendChild(this.renderViewOptions());

		const dropContainer = document.createElement('div');
		dropContainer.className = 'drop-container';

		this.getDropAreas(this.state.view).forEach((area) => {
			const section = document.createElement('div');
			const sectionTitle = document.createElement('h3');
			sectionTitle.textContent = area.label;
			section.appendChild(sectionTitle);

			section.appendChild(this.renderFieldMapArea(area.id, area.limit));
			dropContainer.appendChild(section);
		});

		right.appendChild(dropContainer);

		grid.appendChild(left);
		grid.appendChild(right);

		return grid;
	}

	private renderViewOptions(): HTMLElement {
		const wrapper = document.createElement('div');
		const title = document.createElement('h3');
		title.textContent = this.translation.selectView;
		wrapper.appendChild(title);

		const options = [
			{ value: 'list', label: this.translation.list },
			{ value: 'accordion', label: this.translation.accordion },
			{ value: 'accordiontable', label: this.translation.accordiontable },
			{ value: 'table', label: this.translation.table },
		];

		options.forEach((option) => {
			const radio = document.createElement('div');
			radio.className = 'radio';

			const label = document.createElement('label');
			const input = document.createElement('input');
			input.type = 'radio';
			input.value = option.value;
			input.name = 'mod-json-render-view';
			input.checked = this.state.view === option.value;
			input.addEventListener('change', () => this.setView(option.value));

			label.appendChild(input);
			label.appendChild(document.createTextNode(option.label));
			radio.appendChild(label);
			wrapper.appendChild(radio);
		});

		return wrapper;
	}

	private renderFieldMapArea(type: 'heading' | 'content', limit: number | null): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'drop-area drop-area--white';

		const entries = this.state.fieldMap[type];

		entries.forEach((entry, index) => {
			wrapper.appendChild(this.renderFieldMapEntry(type, entry, index, entries.length));
		});

		const canAddMore = limit === null || entries.length < limit;
		if (canAddMore) {
			const addButton = document.createElement('button');
			addButton.type = 'button';
			addButton.className = 'button';
			addButton.textContent = `${this.translation.select} ${type}`;
			addButton.addEventListener('click', () => this.addFieldMapEntry(type));
			wrapper.appendChild(addButton);
		}

		return wrapper;
	}

	private renderFieldMapEntry(type: 'heading' | 'content', entry: FieldMapEntry, index: number, total: number): HTMLElement {
		const container = document.createElement('div');
		container.className = 'drop-area__item';

		const titleRow = document.createElement('p');
		titleRow.className = 'description description-wide';
		titleRow.innerHTML = `<strong>${entry.item.field || this.translation.value}</strong> (${entry.item.sample})`;
		container.appendChild(titleRow);

		container.appendChild(
			this.renderInputField(this.translation.title, entry.heading, (value) =>
				this.updateFieldMapEntry(type, entry.id, 'heading', value),
			),
		);
		container.appendChild(
			this.renderInputField(this.translation.prefix, entry.prefix, (value) =>
				this.updateFieldMapEntry(type, entry.id, 'prefix', value),
			),
		);
		container.appendChild(
			this.renderInputField(this.translation.suffix, entry.suffix, (value) =>
				this.updateFieldMapEntry(type, entry.id, 'suffix', value),
			),
		);

		container.appendChild(this.renderPathSelector(type, entry));
		container.appendChild(this.renderDateFormatSelector(type, entry));

		const actions = document.createElement('p');
		actions.className = 'description description-wide';

		const remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'button';
		remove.textContent = 'Remove';
		remove.addEventListener('click', () => this.removeFieldMapEntry(type, entry.id));
		actions.appendChild(remove);

		if (index > 0) {
			const up = document.createElement('button');
			up.type = 'button';
			up.className = 'button';
			up.textContent = '↑';
			up.addEventListener('click', () => this.moveFieldMapEntry(type, entry.id, -1));
			actions.appendChild(document.createTextNode(' '));
			actions.appendChild(up);
		}

		if (index < total - 1) {
			const down = document.createElement('button');
			down.type = 'button';
			down.className = 'button';
			down.textContent = '↓';
			down.addEventListener('click', () => this.moveFieldMapEntry(type, entry.id, 1));
			actions.appendChild(document.createTextNode(' '));
			actions.appendChild(down);
		}

		container.appendChild(actions);
		return container;
	}

	private renderInputField(labelText: string, value: string, onChange: (value: string) => void): HTMLElement {
		const paragraph = document.createElement('p');
		paragraph.className = 'description description-wide';

		const label = document.createElement('label');
		label.textContent = labelText;
		label.appendChild(document.createElement('br'));

		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'large-text';
		input.value = value;
		input.addEventListener('input', (event) => onChange((event.target as HTMLInputElement).value));

		label.appendChild(input);
		paragraph.appendChild(label);
		return paragraph;
	}

	private renderPathSelector(type: 'heading' | 'content', entry: FieldMapEntry): HTMLElement {
		const paragraph = document.createElement('p');
		paragraph.className = 'description description-wide';

		const label = document.createElement('label');
		label.textContent = this.translation.value;
		label.appendChild(document.createElement('br'));

		const select = document.createElement('select');
		select.className = 'large-text';
		select.addEventListener('change', (event) => {
			this.updateFieldMapEntry(type, entry.id, 'itemValue', (event.target as HTMLSelectElement).value);
		});

		this.state.availableFieldPaths.forEach((path) => {
			const option = document.createElement('option');
			option.value = path;
			option.textContent = `${path} (${this.getSampleValue(path)})`;
			option.selected = entry.item.value === path;
			select.appendChild(option);
		});

		label.appendChild(select);
		paragraph.appendChild(label);

		return paragraph;
	}

	private renderDateFormatSelector(type: 'heading' | 'content', entry: FieldMapEntry): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.className = 'description description-wide';

		const sample = entry.item.sample;
		if (!sample || !isDate(sample)) {
			return wrapper;
		}

		const label = document.createElement('label');
		label.textContent = this.translation.selectDateFormat;
		wrapper.appendChild(label);

		[
			{ value: '', text: this.translation.none },
			{ value: 'Y-m-d', text: getDate(sample) },
			{ value: 'Y-m-d H:i', text: getDateTime(sample) },
		].forEach((format) => {
			const radio = document.createElement('div');
			radio.className = 'radio';
			const radioLabel = document.createElement('label');
			const input = document.createElement('input');
			input.type = 'radio';
			input.name = `date-format-${type}-${entry.id}`;
			input.value = format.value;
			input.checked = entry.dateFormat === format.value;
			input.addEventListener('change', () => this.updateFieldMapEntry(type, entry.id, 'dateFormat', format.value));

			radioLabel.appendChild(input);
			radioLabel.appendChild(document.createTextNode(format.text));
			radio.appendChild(radioLabel);
			wrapper.appendChild(radio);
		});

		return wrapper;
	}

	private renderHiddenInputs(): HTMLElement {
		const wrapper = document.createElement('div');

		const urlInput = document.createElement('input');
		urlInput.type = 'hidden';
		urlInput.name = 'mod_json_render_url';
		urlInput.value = this.state.url;

		const viewInput = document.createElement('input');
		viewInput.type = 'hidden';
		viewInput.name = 'mod_json_render_view';
		viewInput.value = this.state.view;

		const fieldMapInput = document.createElement('input');
		fieldMapInput.type = 'hidden';
		fieldMapInput.name = 'mod_json_render_fieldmap';
		fieldMapInput.value = JSON.stringify(this.state.fieldMap);

		wrapper.appendChild(urlInput);
		wrapper.appendChild(viewInput);
		wrapper.appendChild(fieldMapInput);

		return wrapper;
	}
}

const rootElement = document.getElementById('modularity-json-render');
const translation = window.modJsonRender?.translation;

if (rootElement && translation) {
	const app = new JsonRenderAdminApp(rootElement, translation);
	app.init();
}
