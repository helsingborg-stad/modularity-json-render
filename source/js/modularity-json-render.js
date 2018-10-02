'use strict';

const ExampleComponent = require('./components/example.jsx');

var ModularityJsonRender = {};

ModularityJsonRender.App = class {
    constructor()
    {
        ReactDOM.render(
          <ExampleComponent />,
          document.getElementById('modularity-json-render-695')
        );
    }
}

new ModularityJsonRender.App();

