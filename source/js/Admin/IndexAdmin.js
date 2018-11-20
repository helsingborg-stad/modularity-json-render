// Polyfills
import '@babel/polyfill';
import 'es6-promise';
import 'isomorphic-fetch';
// Components
import Settings from './Components/Settings';

const modJsonRenderElement = 'modularity-json-render';
const domElement = document.getElementById(modJsonRenderElement);
const {translation} = modJsonRender;

ReactDOM.render(
    <Settings translation={translation} />,
    domElement
);