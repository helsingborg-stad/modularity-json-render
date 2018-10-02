'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const ExampleComponent = require('./components/example.jsx');

var ModularityJsonRender = {};

ModularityJsonRender.App = class {
    constructor()
    {
        console.log("test");

        ReactDOM.render(
          <ExampleComponent />,
          document.getElementById('modularity-json-render-695')
        );
    }
}

new ModularityJsonRender.App();

