'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const ExampleComponent = require('./components/example.jsx');

var ModularityJsonRender = {};

ModularityJsonRender.App = class {
    constructor()
    {
        ReactDOM.render(
          <ExampleComponent />,
          document.getElementById('example-component')
        );
    }
}

new ModularityJsonRender.App();

