import JsonParser from './Components/JsonParser';

const modJsonRenderElement = 'modularity-json-render';
const domElement = document.getElementById(modJsonRenderElement);

const props = {
    url: domElement.dataset.url,
    fieldMap: JSON.parse(domElement.dataset.fieldMap),
    showSearch: domElement.dataset.showSearch,
    showPagination: domElement.dataset.showPagination,
    perPage: parseInt(domElement.dataset.perPage)
};

ReactDOM.render(
    <JsonParser {...props}/>,
    domElement
);