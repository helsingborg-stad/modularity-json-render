import FetchData from "./fetchData";

class JsonParser {
    constructor(
        private id: string,
        private container: HTMLElement
    ) {
    }

    public init() {
        const data = new FetchData().fetch(this.id);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[mod-json-render-container]').forEach((container) => {
        const id = container.getAttribute('mod-json-render-container');

        if (!id) {
            console.error('No id found for mod-json-render-container');
            return;
        }

        new JsonParser(id, container as HTMLElement).init();
    });
});