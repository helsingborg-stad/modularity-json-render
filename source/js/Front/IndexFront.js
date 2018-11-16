import JsonParser from './Components/JsonParser';

const domElements = document.getElementsByClassName("modularity-json-render");

for (let i = 0; i < domElements.length; i++) {
    const element = domElements[i];
    ReactDOM.render(
        <JsonParser
            url={element.dataset.url}
            fieldMap={JSON.parse(element.dataset.fieldMap)}
            showSearch={element.dataset.showSearch}
            showPagination={element.dataset.showPagination}
            perPage={parseInt(element.dataset.perPage)}/>,
        element
    );
}