!function(){return function e(t,n,r){function i(l,o){if(!n[l]){if(!t[l]){var u="function"==typeof require&&require;if(!o&&u)return u(l,!0);if(a)return a(l,!0);var c=new Error("Cannot find module '"+l+"'");throw c.code="MODULE_NOT_FOUND",c}var s=n[l]={exports:{}};t[l][0].call(s.exports,function(e){return i(t[l][1][e]||e)},s,s.exports,e,t,n,r)}return n[l].exports}for(var a="function"==typeof require&&require,l=0;l<r.length;l++)i(r[l]);return i}}()({1:[function(e,t,n){!function(e,n){"use strict";"object"==typeof t&&"object"==typeof t.exports?t.exports=n():"function"==typeof define&&define.amd?define([],n):e.objectPath=n()}(this,function(){"use strict";var e=Object.prototype.toString;function t(e,t){return null!=e&&Object.prototype.hasOwnProperty.call(e,t)}function n(e){if(!e)return!0;if(i(e)&&0===e.length)return!0;if("string"!=typeof e){for(var n in e)if(t(e,n))return!1;return!0}return!1}function r(t){return e.call(t)}var i=Array.isArray||function(t){return"[object Array]"===e.call(t)};function a(e){var t=parseInt(e);return t.toString()===e?t:e}function l(e){e=e||{};var l=function(e){return Object.keys(l).reduce(function(t,n){return"create"===n?t:("function"==typeof l[n]&&(t[n]=l[n].bind(l,e)),t)},{})};function o(n,r){return e.includeInheritedProps||"number"==typeof r&&Array.isArray(n)||t(n,r)}function u(e,t){if(o(e,t))return e[t]}function c(e,t,n,r){if("number"==typeof t&&(t=[t]),!t||0===t.length)return e;if("string"==typeof t)return c(e,t.split(".").map(a),n,r);var i=t[0],l=u(e,i);return 1===t.length?(void 0!==l&&r||(e[i]=n),l):(void 0===l&&("number"==typeof t[1]?e[i]=[]:e[i]={}),c(e[i],t.slice(1),n,r))}return l.has=function(n,r){if("number"==typeof r?r=[r]:"string"==typeof r&&(r=r.split(".")),!r||0===r.length)return!!n;for(var l=0;l<r.length;l++){var o=a(r[l]);if(!("number"==typeof o&&i(n)&&o<n.length||(e.includeInheritedProps?o in Object(n):t(n,o))))return!1;n=n[o]}return!0},l.ensureExists=function(e,t,n){return c(e,t,n,!0)},l.set=function(e,t,n,r){return c(e,t,n,r)},l.insert=function(e,t,n,r){var a=l.get(e,t);r=~~r,i(a)||(a=[],l.set(e,t,a)),a.splice(r,0,n)},l.empty=function(e,t){var a,u;if(!n(t)&&(null!=e&&(a=l.get(e,t)))){if("string"==typeof a)return l.set(e,t,"");if(function(e){return"boolean"==typeof e||"[object Boolean]"===r(e)}(a))return l.set(e,t,!1);if("number"==typeof a)return l.set(e,t,0);if(i(a))a.length=0;else{if(!function(e){return"object"==typeof e&&"[object Object]"===r(e)}(a))return l.set(e,t,null);for(u in a)o(a,u)&&delete a[u]}}},l.push=function(e,t){var n=l.get(e,t);i(n)||(n=[],l.set(e,t,n)),n.push.apply(n,Array.prototype.slice.call(arguments,2))},l.coalesce=function(e,t,n){for(var r,i=0,a=t.length;i<a;i++)if(void 0!==(r=l.get(e,t[i])))return r;return n},l.get=function(e,t,n){if("number"==typeof t&&(t=[t]),!t||0===t.length)return e;if(null==e)return n;if("string"==typeof t)return l.get(e,t.split("."),n);var r=a(t[0]),i=u(e,r);return void 0===i?n:1===t.length?i:l.get(e[r],t.slice(1),n)},l.del=function(e,t){if("number"==typeof t&&(t=[t]),null==e)return e;if(n(t))return e;if("string"==typeof t)return l.del(e,t.split("."));var r=a(t[0]);return o(e,r)?1!==t.length?l.del(e[r],t.slice(1)):(i(e)?e.splice(r,1):delete e[r],e):e},l}var o=l();return o.create=l,o.withInheritedProps=l({includeInheritedProps:!0}),o})},{}],2:[function(e,t,n){"use strict";const{isObject:r,getKeys:i}=e("./lang"),a="__bypassMode",l="__ignoreCircular",o="__maxDeep",u="__cache",c="__queue",s="__state",f={};t.exports=class{constructor(e,t=0,n=!1,r=100){this[a]=t,this[l]=n,this[o]=r,this[u]=[],this[c]=[],this[s]=this.getState(void 0,e)}next(){const{node:e,path:t,deep:n}=this[s]||f;if(this[o]>n&&this.isNode(e))if(this.isCircular(e)){if(!this[l])throw new Error("Circular reference")}else if(this.onStepInto(this[s])){const r=this.getStatesOfChildNodes(e,t,n),i=this[a]?"push":"unshift";this[c][i](...r),this[u].push(e)}const r=this[c].shift(),i=!r;return this[s]=r,i&&this.destroy(),{value:r,done:i}}destroy(){this[c].length=0,this[u].length=0,this[s]=null}isNode(e){return r(e)}isLeaf(e){return!this.isNode(e)}isCircular(e){return-1!==this[u].indexOf(e)}getStatesOfChildNodes(e,t,n){return i(e).map(r=>this.getState(e,e[r],r,t.concat(r),n+1))}getState(e,t,n,r=[],i=0){return{parent:e,node:t,key:n,path:r,deep:i}}onStepInto(e){return!0}[Symbol.iterator](){return this}}},{"./lang":3}],3:[function(e,t,n){"use strict";function r(e){return null!==e&&"object"==typeof e}const{isArray:i}=Array;function a(e){if(!r(e))return!1;if(!("length"in e))return!1;const t=e.length;if(!l(t))return!1;if(t>0)return t-1 in e;for(const t in e)return!1}function l(e){return"number"==typeof e}n.getKeys=function(e){const t=Object.keys(e);if(i(e));else if(a(e)){const e=t.indexOf("length");e>-1&&t.splice(e,1)}else t.sort();return t},n.isArray=i,n.isArrayLike=a,n.isObject=r,n.isNumber=l},{}],4:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=a(e("recursive-iterator")),i=a(e("object-path"));function a(e){return e&&e.__esModule?e:{default:e}}function l(e){return(l="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function u(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function c(e,t,n){return t&&u(e.prototype,t),n&&u(e,n),e}function s(e,t){return!t||"object"!==l(t)&&"function"!=typeof t?h(e):t}function f(e){return(f=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function d(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&p(e,t)}function p(e,t){return(p=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}function h(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}var m=React.Component,y={showFieldSelection:!1,url:"",fieldMap:{itemContainer:null,title:"",content:""}},v=function(e){function t(e){var n;return o(this,t),(n=s(this,f(t).call(this,e))).state=y,n.urlChange=n.urlChange.bind(h(h(n))),n.handleSubmit=n.handleSubmit.bind(h(h(n))),n.resetOptions=n.resetOptions.bind(h(h(n))),n.updateFieldMap=n.updateFieldMap.bind(h(h(n))),n}return d(t,m),c(t,[{key:"componentDidMount",value:function(){this.initOptions()}},{key:"initOptions",value:function(){if(void 0!==modJsonRender.options){var e=modJsonRender.options;this.setState({url:e.url?e.url:"",fieldMap:e.fieldMap?JSON.parse(e.fieldMap):{itemContainer:null,title:"",content:""},showFieldSelection:!!e.url})}}},{key:"urlChange",value:function(e){this.setState({url:e.target.value})}},{key:"handleSubmit",value:function(e){e.preventDefault(),this.setState({showFieldSelection:!0})}},{key:"resetOptions",value:function(e){e.preventDefault(),this.setState(y)}},{key:"updateFieldMap",value:function(e){var t=Object.assign(this.state.fieldMap,e);this.setState({fieldMap:t})}},{key:"render",value:function(){var e=this.state,t=e.showFieldSelection,n=e.url,r=this.state.fieldMap,i=r.itemContainer,a=r.title,l=r.content;return n&&null!==i&&a&&l?React.createElement("div",null,React.createElement(g,this.state),React.createElement(b,this.state),React.createElement("a",{href:"#",onClick:this.resetOptions,className:"button"},"Reset settings")):t?React.createElement("div",null,React.createElement(E,{url:n,fieldMap:this.state.fieldMap,updateFieldMap:this.updateFieldMap}),React.createElement(b,this.state),React.createElement("a",{href:"#",onClick:this.resetOptions,className:"button"},"Reset settings")):React.createElement("div",{className:"wrap"},React.createElement("form",{onSubmit:this.handleSubmit},React.createElement("p",null,React.createElement("label",null,React.createElement("strong",null,"Data source")),React.createElement("br",null),React.createElement("i",null,"Enter a valid JSON api url.")),React.createElement("input",{type:"text",style:{width:"100%"},value:n,onChange:this.urlChange}),React.createElement("p",null,React.createElement("input",{type:"submit",className:"button button-primary",value:"Submit"}))),React.createElement(b,this.state))}}]),t}();function b(e){return React.createElement("div",null,React.createElement("input",{type:"hidden",name:"mod_json_render_url",value:e.url}),React.createElement("input",{type:"hidden",name:"mod_json_render_fieldmap",value:JSON.stringify(e.fieldMap)}))}function g(e){return React.createElement("div",null,React.createElement("ul",null,React.createElement("li",{style:{wordBreak:"break-all"}},"Data source: ",e.url),React.createElement("li",null,"Title: ",e.fieldMap.title),React.createElement("li",null,"Content: ",e.fieldMap.content)))}n.default=v;var E=function(e){function t(e){var n;return o(this,t),(n=s(this,f(t).call(this,e))).state={error:null,isLoaded:!1,items:[]},n.updateFieldMap=n.updateFieldMap.bind(h(h(n))),n}return d(t,m),c(t,[{key:"updateFieldMap",value:function(e){this.props.updateFieldMap(e)}},{key:"getApiData",value:function(){var e=this;fetch(this.props.url).then(function(e){return e.json()}).then(function(t){e.setState({isLoaded:!0,items:t})},function(t){e.setState({isLoaded:!0,error:t})})}},{key:"componentDidMount",value:function(){this.getApiData()}},{key:"render",value:function(){var e=this.state,t=e.error,n=e.isLoaded,r=e.items;return t?React.createElement("div",null,"Error: ",t.message):n?React.createElement(C,{data:r,url:this.props.url,fieldMap:this.props.fieldMap,updateFieldMap:this.updateFieldMap}):React.createElement("div",{className:"spinner is-active",style:{float:"none",display:"block",width:"auto",height:"auto",padding:"10px 10px 30px 10px"}})}}]),t}();function R(e){var t=e.value,n=e.children,r=e.fieldMap,i=e.object,a=e.onClickTitle,l=e.onClickContent,o=e.onClickContainer;return React.createElement("li",null,r.title===i?React.createElement("strong",null,"Title: "):"",r.content===i?React.createElement("strong",null,"Content: "):"",n?React.createElement("strong",null,t):React.createElement("span",null,t),n||r.title||r.content===i||null===r.itemContainer?"":React.createElement("a",{href:"#",className:"button button-small","data-field":"title",onClick:a},"Title"),n||r.title===i||r.content||null===r.itemContainer?"":React.createElement("a",{href:"#",className:"button button-small","data-field":"content",onClick:l},"Content"),n&&Array.isArray(i)&&null===r.itemContainer?React.createElement("a",{href:"#",className:"button button-small","data-field":"itemContainer",onClick:o},"Select"):"",n?React.createElement("span",{className:"dashicons dashicons-arrow-down"}):"",n?React.createElement("ul",{style:{paddingLeft:15,borderLeft:"2px solid #ccc"}},n):"")}var C=function(e){function t(e){var n;return o(this,t),(n=s(this,f(t).call(this,e))).renderNodes=n.renderNodes.bind(h(h(n))),n.setFieldMap=n.setFieldMap.bind(h(h(n))),n}return d(t,m),c(t,[{key:"setFieldMap",value:function(e,t){var n,r,i;t.preventDefault(),this.props.updateFieldMap((n={},r=t.target.dataset.field,i=e,r in n?Object.defineProperty(n,r,{value:i,enumerable:!0,configurable:!0,writable:!0}):n[r]=i,n))}},{key:"renderNodes",value:function(e){var t=this;return Object.keys(e).map(function(n){if("objectPath"!==n){var r=React.createElement(R,{key:n.toString(),value:n,object:e[n],fieldMap:t.props.fieldMap,onClickContainer:function(r){return t.setFieldMap(e[n].objectPath,r)},onClickTitle:function(r){return t.setFieldMap(e[n],r)},onClickContent:function(r){return t.setFieldMap(e[n],r)}});return"object"===l(e[n])&&null!==e[n]&&(r=React.cloneElement(r,{children:Array.isArray(e[n])?t.renderNodes(e[n][0]):t.renderNodes(e[n])})),r}})}},{key:"render",value:function(){var e=this.props.fieldMap,t=this.props.data;if(Array.isArray(t)&&(e.itemContainer=""),null===e.itemContainer){Array.isArray(t)&&(t=t[0]);var n=!0,a=!1,o=void 0;try{for(var u,c=new r.default(t)[Symbol.iterator]();!(n=(u=c.next()).done);n=!0){var s=u.value,f=(s.parent,s.node),d=(s.key,s.path);if("object"===l(f)&&null!==f){var p=d.join(".");i.default.set(t,p+".objectPath",p)}}}catch(e){a=!0,o=e}finally{try{n||null==c.return||c.return()}finally{if(a)throw o}}return React.createElement("div",null,React.createElement("h3",null,"Select items container"),React.createElement("ul",null,this.renderNodes(t)))}var h=i.default.get(this.props.data,e.itemContainer);Array.isArray(h)&&(h=h[0]);var m=!0,y=!1,v=void 0;try{for(var b,g=new r.default(h)[Symbol.iterator]();!(m=(b=g.next()).done);m=!0){var E=b.value;E.parent,f=E.node,E.key,d=E.path;if("object"!==l(f)){var R=d.join(".");i.default.set(h,R,R)}}}catch(e){y=!0,v=e}finally{try{m||null==g.return||g.return()}finally{if(y)throw v}}return React.createElement("div",null,React.createElement("h3",null,"Select title and content fields"),React.createElement("ul",null,this.renderNodes(h)))}}]),t}()},{"object-path":1,"recursive-iterator":2}],5:[function(e,t,n){"use strict";var r,i=(r=e("./Components/Settings"))&&r.__esModule?r:{default:r};var a=document.getElementById("modularity-json-render");ReactDOM.render(React.createElement(i.default,null),a)},{"./Components/Settings":4}]},{},[5]);