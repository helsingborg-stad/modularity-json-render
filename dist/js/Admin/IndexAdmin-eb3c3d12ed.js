!function(){return function e(t,n,r){function i(a,l){if(!n[a]){if(!t[a]){var u="function"==typeof require&&require;if(!l&&u)return u(a,!0);if(o)return o(a,!0);var c=new Error("Cannot find module '"+a+"'");throw c.code="MODULE_NOT_FOUND",c}var s=n[a]={exports:{}};t[a][0].call(s.exports,function(e){return i(t[a][1][e]||e)},s,s.exports,e,t,n,r)}return n[a].exports}for(var o="function"==typeof require&&require,a=0;a<r.length;a++)i(r[a]);return i}}()({1:[function(e,t,n){!function(e,n){"use strict";"object"==typeof t&&"object"==typeof t.exports?t.exports=n():"function"==typeof define&&define.amd?define([],n):e.objectPath=n()}(this,function(){"use strict";var e=Object.prototype.toString;function t(e,t){return null!=e&&Object.prototype.hasOwnProperty.call(e,t)}function n(e){if(!e)return!0;if(i(e)&&0===e.length)return!0;if("string"!=typeof e){for(var n in e)if(t(e,n))return!1;return!0}return!1}function r(t){return e.call(t)}var i=Array.isArray||function(t){return"[object Array]"===e.call(t)};function o(e){var t=parseInt(e);return t.toString()===e?t:e}function a(e){e=e||{};var a=function(e){return Object.keys(a).reduce(function(t,n){return"create"===n?t:("function"==typeof a[n]&&(t[n]=a[n].bind(a,e)),t)},{})};function l(n,r){return e.includeInheritedProps||"number"==typeof r&&Array.isArray(n)||t(n,r)}function u(e,t){if(l(e,t))return e[t]}function c(e,t,n,r){if("number"==typeof t&&(t=[t]),!t||0===t.length)return e;if("string"==typeof t)return c(e,t.split(".").map(o),n,r);var i=t[0],a=u(e,i);return 1===t.length?(void 0!==a&&r||(e[i]=n),a):(void 0===a&&("number"==typeof t[1]?e[i]=[]:e[i]={}),c(e[i],t.slice(1),n,r))}return a.has=function(n,r){if("number"==typeof r?r=[r]:"string"==typeof r&&(r=r.split(".")),!r||0===r.length)return!!n;for(var a=0;a<r.length;a++){var l=o(r[a]);if(!("number"==typeof l&&i(n)&&l<n.length||(e.includeInheritedProps?l in Object(n):t(n,l))))return!1;n=n[l]}return!0},a.ensureExists=function(e,t,n){return c(e,t,n,!0)},a.set=function(e,t,n,r){return c(e,t,n,r)},a.insert=function(e,t,n,r){var o=a.get(e,t);r=~~r,i(o)||(o=[],a.set(e,t,o)),o.splice(r,0,n)},a.empty=function(e,t){var o,u;if(!n(t)&&(null!=e&&(o=a.get(e,t)))){if("string"==typeof o)return a.set(e,t,"");if(function(e){return"boolean"==typeof e||"[object Boolean]"===r(e)}(o))return a.set(e,t,!1);if("number"==typeof o)return a.set(e,t,0);if(i(o))o.length=0;else{if(!function(e){return"object"==typeof e&&"[object Object]"===r(e)}(o))return a.set(e,t,null);for(u in o)l(o,u)&&delete o[u]}}},a.push=function(e,t){var n=a.get(e,t);i(n)||(n=[],a.set(e,t,n)),n.push.apply(n,Array.prototype.slice.call(arguments,2))},a.coalesce=function(e,t,n){for(var r,i=0,o=t.length;i<o;i++)if(void 0!==(r=a.get(e,t[i])))return r;return n},a.get=function(e,t,n){if("number"==typeof t&&(t=[t]),!t||0===t.length)return e;if(null==e)return n;if("string"==typeof t)return a.get(e,t.split("."),n);var r=o(t[0]),i=u(e,r);return void 0===i?n:1===t.length?i:a.get(e[r],t.slice(1),n)},a.del=function(e,t){if("number"==typeof t&&(t=[t]),null==e)return e;if(n(t))return e;if("string"==typeof t)return a.del(e,t.split("."));var r=o(t[0]);return l(e,r)?1!==t.length?a.del(e[r],t.slice(1)):(i(e)?e.splice(r,1):delete e[r],e):e},a}var l=a();return l.create=a,l.withInheritedProps=a({includeInheritedProps:!0}),l})},{}],2:[function(e,t,n){"use strict";const{isObject:r,getKeys:i}=e("./lang"),o="__bypassMode",a="__ignoreCircular",l="__maxDeep",u="__cache",c="__queue",s="__state",f={};t.exports=class{constructor(e,t=0,n=!1,r=100){this[o]=t,this[a]=n,this[l]=r,this[u]=[],this[c]=[],this[s]=this.getState(void 0,e)}next(){const{node:e,path:t,deep:n}=this[s]||f;if(this[l]>n&&this.isNode(e))if(this.isCircular(e)){if(!this[a])throw new Error("Circular reference")}else if(this.onStepInto(this[s])){const r=this.getStatesOfChildNodes(e,t,n),i=this[o]?"push":"unshift";this[c][i](...r),this[u].push(e)}const r=this[c].shift(),i=!r;return this[s]=r,i&&this.destroy(),{value:r,done:i}}destroy(){this[c].length=0,this[u].length=0,this[s]=null}isNode(e){return r(e)}isLeaf(e){return!this.isNode(e)}isCircular(e){return-1!==this[u].indexOf(e)}getStatesOfChildNodes(e,t,n){return i(e).map(r=>this.getState(e,e[r],r,t.concat(r),n+1))}getState(e,t,n,r=[],i=0){return{parent:e,node:t,key:n,path:r,deep:i}}onStepInto(e){return!0}[Symbol.iterator](){return this}}},{"./lang":3}],3:[function(e,t,n){"use strict";function r(e){return null!==e&&"object"==typeof e}const{isArray:i}=Array;function o(e){if(!r(e))return!1;if(!("length"in e))return!1;const t=e.length;if(!a(t))return!1;if(t>0)return t-1 in e;for(const t in e)return!1}function a(e){return"number"==typeof e}n.getKeys=function(e){const t=Object.keys(e);if(i(e));else if(o(e)){const e=t.indexOf("length");e>-1&&t.splice(e,1)}else t.sort();return t},n.isArray=i,n.isArrayLike=o,n.isObject=r,n.isNumber=a},{}],4:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=a(e("./ListItem")),i=a(e("recursive-iterator")),o=a(e("object-path"));function a(e){return e&&e.__esModule?e:{default:e}}function l(e){return(l="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function u(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function c(e,t){return!t||"object"!==l(t)&&"function"!=typeof t?function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e):t}function s(e){return(s=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function f(e,t){return(f=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}var p=function(e){function t(){return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),c(this,s(t).apply(this,arguments))}var n,a,p;return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&f(e,t)}(t,React.Component),n=t,(a=[{key:"setFieldMap",value:function(e,t){var n,r,i;t.preventDefault(),this.props.updateFieldMap((n={},r=t.target.dataset.field,i=e,r in n?Object.defineProperty(n,r,{value:i,enumerable:!0,configurable:!0,writable:!0}):n[r]=i,n))}},{key:"renderNodes",value:function(e){var t=this;return Object.keys(e).map(function(n){if("objectPath"!==n){var i=React.createElement(r.default,{key:n.toString(),value:n,object:e[n],fieldMap:t.props.fieldMap,onClickContainer:function(r){return t.setFieldMap(e[n].objectPath,r)},onClickTitle:function(r){return t.setFieldMap(e[n],r)},onClickContent:function(r){return t.setFieldMap(e[n],r)},translation:t.props.translation});return"object"===l(e[n])&&null!==e[n]&&(i=React.cloneElement(i,{children:Array.isArray(e[n])?t.renderNodes(e[n][0]):t.renderNodes(e[n])})),i}})}},{key:"render",value:function(){var e=this.props,t=e.translation,n=e.data,r=this.props.fieldMap;if(Array.isArray(n)&&(r.itemContainer=""),null===r.itemContainer){Array.isArray(n)&&(function(e){throw new Error('"'+e+'" is read-only')}("data"),n=n[0]);var a=!0,u=!1,c=void 0;try{for(var s,f=new i.default(n)[Symbol.iterator]();!(a=(s=f.next()).done);a=!0){var p=s.value,d=(p.parent,p.node),y=(p.key,p.path);if("object"===l(d)&&null!==d){var h=y.join(".");o.default.set(n,h+".objectPath",h)}}}catch(e){u=!0,c=e}finally{try{a||null==f.return||f.return()}finally{if(u)throw c}}return React.createElement("div",null,React.createElement("h3",null,t.selectItemsContainer),React.createElement("ul",{className:"json-tree"},this.renderNodes(n)))}var m=o.default.get(n,r.itemContainer);Array.isArray(m)&&(m=m[0]);var b=!0,v=!1,g=void 0;try{for(var E,R=new i.default(m)[Symbol.iterator]();!(b=(E=R.next()).done);b=!0){var j=E.value;j.parent,d=j.node,j.key,y=j.path;if("object"!==l(d)){var O=y.join(".");o.default.set(m,O,O)}}}catch(e){v=!0,g=e}finally{try{b||null==R.return||R.return()}finally{if(v)throw g}}return React.createElement("div",null,React.createElement("h3",null,t.selectTitleContent),React.createElement("ul",{className:"json-tree"},this.renderNodes(m)))}}])&&u(n.prototype,a),p&&u(n,p),t}();n.default=p},{"./ListItem":7,"object-path":1,"recursive-iterator":2}],5:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=o(e("./DataList")),i=o(e("../../Utilities/getApiData"));function o(e){return e&&e.__esModule?e:{default:e}}function a(e){return(a="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function l(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function u(e){return(u=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function c(e,t){return(c=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function s(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}var f=function(e){function t(e){var n,r,i;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),r=this,(n=!(i=u(t).call(this,e))||"object"!==a(i)&&"function"!=typeof i?s(r):i).state={error:null,isLoaded:!1,items:[]},n.updateFieldMap=n.updateFieldMap.bind(s(s(n))),n}var n,o,f;return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&c(e,t)}(t,React.Component),n=t,(o=[{key:"updateFieldMap",value:function(e){this.props.updateFieldMap(e)}},{key:"getData",value:function(){var e=this,t=this.props,n=t.url,r=t.translation;(0,i.default)(n).then(function(t){var n=t.result;n&&0!==Object.keys(n).length?e.setState({isLoaded:!0,items:n}):e.setState({error:Error(r.couldNotFetch),isLoaded:!0})},function(t){var n=t.error;e.setState({isLoaded:!0,error:n})})}},{key:"componentDidMount",value:function(){this.getData()}},{key:"render",value:function(){var e=this.props,t=e.url,n=e.fieldMap,i=e.translation,o=this.state,a=o.error,l=o.isLoaded,u=o.items;return a?React.createElement("div",{className:"notice notice-error inline"},React.createElement("p",null,a.message)):l?React.createElement(r.default,{data:u,url:t,fieldMap:n,updateFieldMap:this.updateFieldMap,translation:i}):React.createElement("div",{className:"spinner is-active"})}}])&&l(n.prototype,o),f&&l(n,f),t}();n.default=f},{"../../Utilities/getApiData":11,"./DataList":4}],6:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=function(e){var t=e.fieldMap,n=e.url;return React.createElement("div",null,React.createElement("input",{type:"hidden",name:"mod_json_render_url",value:n}),React.createElement("input",{type:"hidden",name:"mod_json_render_fieldmap",value:JSON.stringify(t)}))};n.default=r},{}],7:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=function(e){var t=e.value,n=e.children,r=e.fieldMap,i=e.object,o=e.onClickTitle,a=e.onClickContent,l=e.onClickContainer,u=e.translation;return n?React.createElement("li",null,Array.isArray(i)&&null===r.itemContainer?React.createElement("span",null,React.createElement("span",{className:"dashicons dashicons-portfolio"})," ",t," ",React.createElement("a",{href:"#",className:"tree-select","data-field":"itemContainer",onClick:l},u.select)):React.createElement("span",null,t),React.createElement("ul",null,n)):React.createElement("li",null,r.title===i&&r.title?React.createElement("strong",null,u.title,": "):"",r.content===i&&r.content?React.createElement("strong",null,u.content,": "):"",React.createElement("span",null,t),r.title||r.content===i||null===r.itemContainer?"":React.createElement("a",{href:"#",className:"tree-select","data-field":"title",onClick:o},u.title),r.content||r.title===i||null===r.itemContainer?"":React.createElement("a",{href:"#",className:"tree-select","data-field":"content",onClick:a},u.content))};n.default=r},{}],8:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=a(e("./FieldSelection")),i=a(e("./InputFields")),o=a(e("./Summary"));function a(e){return e&&e.__esModule?e:{default:e}}function l(e){return(l="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function u(){return(u=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e}).apply(this,arguments)}function c(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function s(e,t){return!t||"object"!==l(t)&&"function"!=typeof t?function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e):t}function f(e){return(f=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function p(e,t){return(p=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}var d=function(e){function t(e){var n;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),(n=s(this,f(t).call(this,e))).state={showFieldSelection:!1,url:"",fieldMap:{itemContainer:null,title:"",content:""}},n}var n,a,l;return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&p(e,t)}(t,React.Component),n=t,(a=[{key:"componentDidMount",value:function(){this.initOptions()}},{key:"initOptions",value:function(){if(void 0!==modJsonRender.options){var e=modJsonRender.options;this.setState({url:e.url?e.url:"",fieldMap:e.fieldMap?JSON.parse(e.fieldMap):{itemContainer:null,title:"",content:""},showFieldSelection:!!e.url})}}},{key:"urlChange",value:function(e){this.setState({url:e.target.value})}},{key:"handleSubmit",value:function(e){e.preventDefault(),this.setState({showFieldSelection:!0})}},{key:"resetOptions",value:function(e){e.preventDefault(),this.setState({showFieldSelection:!1,url:"",fieldMap:{itemContainer:null,title:"",content:""}})}},{key:"updateFieldMap",value:function(e){var t=Object.assign(this.state.fieldMap,e);this.setState({fieldMap:t})}},{key:"render",value:function(){var e=this.props.translation,t=this.state,n=t.showFieldSelection,a=t.url,l=this.state.fieldMap,c=l.itemContainer,s=l.title,f=l.content;return a&&null!==c&&s&&f?React.createElement("div",null,React.createElement(o.default,u({},this.state,{translation:e})),React.createElement(i.default,this.state),React.createElement("p",null,React.createElement("a",{href:"#",onClick:this.resetOptions.bind(this),className:"button"},e.resetSettings))):n?React.createElement("div",null,React.createElement(r.default,{url:a,fieldMap:this.state.fieldMap,updateFieldMap:this.updateFieldMap.bind(this),translation:e}),React.createElement(i.default,this.state),React.createElement("p",null,React.createElement("a",{href:"#",onClick:this.resetOptions.bind(this),className:"button"},e.resetSettings))):React.createElement("div",{className:"wrap"},React.createElement("form",{onSubmit:this.handleSubmit.bind(this)},React.createElement("p",null,React.createElement("label",null,React.createElement("strong",null,"API URL")),React.createElement("br",null),React.createElement("i",null,e.validJsonUrl)),React.createElement("input",{type:"text",className:"url-input",value:a,onChange:this.urlChange.bind(this)}),React.createElement("p",null,React.createElement("input",{type:"submit",className:"button button-primary",value:e.sendRequest}))),React.createElement(i.default,this.state))}}])&&c(n.prototype,a),l&&c(n,l),t}();n.default=d},{"./FieldSelection":5,"./InputFields":6,"./Summary":9}],9:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=function(e){var t=e.url,n=e.fieldMap,r=e.translation;return React.createElement("div",null,React.createElement("p",null,React.createElement("strong",null,"API URL"),React.createElement("br",null),React.createElement("a",{href:t,target:"_blank"},t)),React.createElement("p",null,React.createElement("strong",null,r.title),React.createElement("br",null),n.title.replace("."," –> ")),React.createElement("p",null,React.createElement("strong",null,r.content),React.createElement("br",null),n.content.replace("."," –> ")))};n.default=r},{}],10:[function(e,t,n){"use strict";var r,i=(r=e("./Components/Settings"))&&r.__esModule?r:{default:r};var o=document.getElementById("modularity-json-render"),a=modJsonRender.translation;ReactDOM.render(React.createElement(i.default,{translation:a}),o)},{"./Components/Settings":8}],11:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=function(e){return fetch(e).then(function(e){return e.json()}).then(function(e){return{result:e}},function(e){return{error:e}})};n.default=r},{}]},{},[10]);