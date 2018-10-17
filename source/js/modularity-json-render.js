'use strict';

const JsonParser = require('./Api/JsonParser.js');
const JsonRenderContainer = require('./components/list.jsx');

const App = class {

    constructor()
    {
        this.moduleSlug = 'modularity-json-render';
        this.renderModule();
    }

    /*
     *
     */
    getDomElement()
    {
        if(typeof this.domElementCache == 'undefined') {
            this.domElementCache = document.getElementById(this.moduleSlug);
        }
        return this.domElementCache;
    }

    getDomAttributes()
    {
        //Define store object
        var domAttributes = {};

        //Store data
        domAttributes.dataUrl = this.getDomElement().getAttribute('data-url');
        domAttributes.dataFieldmap = this.getDomElement().getAttribute('data-fieldmap');

        //Return data
        return domAttributes;
    }

    renderModule()
    {

        if (this.getDomElement() == null) {
            return;
        }

        const api = new JsonParser(this.getDomAttributes().dataUrl, this.getDomAttributes().dataFieldmap);

        console.log(api.request());

        ReactDOM.render(
            <JsonRenderContainer
                api={api}
            />,
            this.getDomElement()
        );

    }
};

new App();

