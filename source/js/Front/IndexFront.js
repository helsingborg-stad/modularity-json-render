import JsonParser from './Components/JsonParser';

const modJsonRenderElement = 'modularity-json-render';
const domElement = document.getElementById(modJsonRenderElement);

ReactDOM.render(
    <JsonParser url={domElement.dataset.url}
                fieldMap={JSON.parse(domElement.dataset.fieldmap)}
                showSearch={true}
                showPagination={true}
                perPage={8}/>,
    domElement
);