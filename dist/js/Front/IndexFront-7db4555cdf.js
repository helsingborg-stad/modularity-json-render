!function(){return function e(t,n,r){function o(a,u){if(!n[a]){if(!t[a]){var c="function"==typeof require&&require;if(!u&&c)return c(a,!0);if(i)return i(a,!0);var l=new Error("Cannot find module '"+a+"'");throw l.code="MODULE_NOT_FOUND",l}var s=n[a]={exports:{}};t[a][0].call(s.exports,function(e){return o(t[a][1][e]||e)},s,s.exports,e,t,n,r)}return n[a].exports}for(var i="function"==typeof require&&require,a=0;a<r.length;a++)o(r[a]);return o}}()({1:[function(e,t,n){for(var r=[],o=0;o<256;++o)r[o]=(o+256).toString(16).substr(1);t.exports=function(e,t){var n=t||0,o=r;return[o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]]].join("")}},{}],2:[function(e,t,n){var r="undefined"!=typeof crypto&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto)||"undefined"!=typeof msCrypto&&"function"==typeof window.msCrypto.getRandomValues&&msCrypto.getRandomValues.bind(msCrypto);if(r){var o=new Uint8Array(16);t.exports=function(){return r(o),o}}else{var i=new Array(16);t.exports=function(){for(var e,t=0;t<16;t++)0==(3&t)&&(e=4294967296*Math.random()),i[t]=e>>>((3&t)<<3)&255;return i}}},{}],3:[function(e,t,n){var r,o,i=e("./lib/rng"),a=e("./lib/bytesToUuid"),u=0,c=0;t.exports=function(e,t,n){var l=t&&n||0,s=t||[],f=(e=e||{}).node||r,d=void 0!==e.clockseq?e.clockseq:o;if(null==f||null==d){var p=i();null==f&&(f=r=[1|p[0],p[1],p[2],p[3],p[4],p[5]]),null==d&&(d=o=16383&(p[6]<<8|p[7]))}var v=void 0!==e.msecs?e.msecs:(new Date).getTime(),m=void 0!==e.nsecs?e.nsecs:c+1,y=v-u+(m-c)/1e4;if(y<0&&void 0===e.clockseq&&(d=d+1&16383),(y<0||v>u)&&void 0===e.nsecs&&(m=0),m>=1e4)throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");u=v,c=m,o=d;var b=(1e4*(268435455&(v+=122192928e5))+m)%4294967296;s[l++]=b>>>24&255,s[l++]=b>>>16&255,s[l++]=b>>>8&255,s[l++]=255&b;var h=v/4294967296*1e4&268435455;s[l++]=h>>>8&255,s[l++]=255&h,s[l++]=h>>>24&15|16,s[l++]=h>>>16&255,s[l++]=d>>>8|128,s[l++]=255&d;for(var g=0;g<6;++g)s[l+g]=f[g];return t||a(s)}},{"./lib/bytesToUuid":1,"./lib/rng":2}],4:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=function(e){return React.createElement("div",{className:"accordion accordion-icon accordion-list"},e.items.map(function(e){return React.createElement("section",{className:"accordion-section",key:e.id},React.createElement("label",{tabIndex:"0",className:"accordion-toggle",htmlFor:"accordion-section-1"},e.title),React.createElement("div",{className:"accordion-content"},e.content))}))};n.default=r},{}],5:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=a(e("./Accordion")),o=a(e("uuid/v1")),i=a(e("../../Utilities/getApiData"));function a(e){return e&&e.__esModule?e:{default:e}}function u(e){return(u="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function c(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function l(e,t){return!t||"object"!==u(t)&&"function"!=typeof t?function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e):t}function s(e){return(s=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function f(e,t){return(f=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}var d=function(e){function t(){var e;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),(e=l(this,s(t).call(this))).state={error:null,isLoaded:!1,items:[]},e}var n,a,u;return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&f(e,t)}(t,React.Component),n=t,(a=[{key:"componentDidMount",value:function(){this.getData()}},{key:"getData",value:function(){var e=this,t=this.props.url;(0,i.default)(t).then(function(t){var n=t.result,r=e.mapData(n);r&&0!==Object.keys(r).length?e.setState({isLoaded:!0,items:r}):e.setState({error:Error("Could not fetch data from URL."),isLoaded:!0})},function(t){var n=t.error;e.setState({isLoaded:!0,error:n})})}},{key:"mapData",value:function(e){var t=this,n=this.props.fieldMap,r=this.getObjectProp(e,n.itemContainer?n.itemContainer.split("."):[]);if(r&&0!==Object.keys(r).length)return r=(r=r.map(function(e){return{id:(0,o.default)(),title:t.getObjectProp(e,n.title.split(".")),content:t.getObjectProp(e,n.content.split("."))}})).filter(function(e){return e.id&&e.title&&e.content})}},{key:"getObjectProp",value:function(e,t){if(0===t.length)return e;for(var n=0;n<t.length;n++){if(!e.hasOwnProperty(t[n]))return console.log("Invalid map key"),null;e=e[t[n]]}return e}},{key:"render",value:function(){var e=this.state,t=e.error,n=e.isLoaded,o=e.items;return t?React.createElement("div",null,"Error: ",t.message):n?React.createElement(r.default,{items:o}):React.createElement("div",null,"Loading...")}}])&&c(n.prototype,a),u&&c(n,u),t}();n.default=d},{"../../Utilities/getApiData":7,"./Accordion":4,"uuid/v1":3}],6:[function(e,t,n){"use strict";var r,o=(r=e("./Components/JsonParser"))&&r.__esModule?r:{default:r};var i=document.getElementById("modularity-json-render");ReactDOM.render(React.createElement(o.default,{url:i.dataset.url,fieldMap:JSON.parse(i.dataset.fieldmap)}),i)},{"./Components/JsonParser":5}],7:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=function(e){return fetch(e).then(function(e){return e.json()}).then(function(e){return{result:e}},function(e){return{error:e}})};n.default=r},{}]},{},[6]);