import FetchData from "./fetchData";

class JsonParser {
    constructor(
        private id: string,
        private container: HTMLElement
    ) {
    }

    public async init() {
        const data = await new FetchData().fetch(this.id);
        const template = document.createElement('template');
        template.innerHTML = data;

        this.container.appendChild(template.content);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-js-mod-json-render-container]').forEach((container) => {
        const id = container.getAttribute('data-js-mod-json-render-container');

        if (!id) {
            console.error('No id found for data-js-mod-json-render-container');
            return;
        }

        new JsonParser(id, container as HTMLElement).init();
    });
});