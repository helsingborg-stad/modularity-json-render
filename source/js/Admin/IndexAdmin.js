// Polyfills
import 'es6-promise';
import 'isomorphic-fetch';
// Components
import Settings from './Components/Settings';
import {translation} from './Config/config';

const modJsonRenderElement = 'modularity-json-render';
const domElement = document.getElementById(modJsonRenderElement);

ReactDOM.render(
    <Settings translation={translation} />,
    domElement
);