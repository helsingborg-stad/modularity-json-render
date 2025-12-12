// Polyfills
import 'es6-promise';
import 'isomorphic-fetch';
// Components
import Settings from './Components/Settings';
import { translation } from './Config/config';
import ReactDOM from 'react-dom';

const modJsonRenderElement = 'modularity-json-render';
const domElement = document.getElementById(modJsonRenderElement);

ReactDOM.render(<Settings translation={translation} />, domElement);
