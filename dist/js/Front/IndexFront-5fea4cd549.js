!function(){return function e(t,n,r){function o(a,u){if(!n[a]){if(!t[a]){var c="function"==typeof require&&require;if(!u&&c)return c(a,!0);if(i)return i(a,!0);var s=new Error("Cannot find module '"+a+"'");throw s.code="MODULE_NOT_FOUND",s}var l=n[a]={exports:{}};t[a][0].call(l.exports,function(e){return o(t[a][1][e]||e)},l,l.exports,e,t,n,r)}return n[a].exports}for(var i="function"==typeof require&&require,a=0;a<r.length;a++)o(r[a]);return o}}()({1:[function(e,t,n){for(var r=[],o=0;o<256;++o)r[o]=(o+256).toString(16).substr(1);t.exports=function(e,t){var n=t||0,o=r;return[o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],"-",o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]],o[e[n++]]].join("")}},{}],2:[function(e,t,n){var r="undefined"!=typeof crypto&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto)||"undefined"!=typeof msCrypto&&"function"==typeof window.msCrypto.getRandomValues&&msCrypto.getRandomValues.bind(msCrypto);if(r){var o=new Uint8Array(16);t.exports=function(){return r(o),o}}else{var i=new Array(16);t.exports=function(){for(var e,t=0;t<16;t++)0==(3&t)&&(e=4294967296*Math.random()),i[t]=e>>>((3&t)<<3)&255;return i}}},{}],3:[function(e,t,n){var r,o,i=e("./lib/rng"),a=e("./lib/bytesToUuid"),u=0,c=0;t.exports=function(e,t,n){var s=t&&n||0,l=t||[],f=(e=e||{}).node||r,d=void 0!==e.clockseq?e.clockseq:o;if(null==f||null==d){var p=i();null==f&&(f=r=[1|p[0],p[1],p[2],p[3],p[4],p[5]]),null==d&&(d=o=16383&(p[6]<<8|p[7]))}var m=void 0!==e.msecs?e.msecs:(new Date).getTime(),y=void 0!==e.nsecs?e.nsecs:c+1,v=m-u+(y-c)/1e4;if(v<0&&void 0===e.clockseq&&(d=d+1&16383),(v<0||m>u)&&void 0===e.nsecs&&(y=0),y>=1e4)throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");u=m,c=y,o=d;var b=(1e4*(268435455&(m+=122192928e5))+y)%4294967296;l[s++]=b>>>24&255,l[s++]=b>>>16&255,l[s++]=b>>>8&255,l[s++]=255&b;var h=m/4294967296*1e4&268435455;l[s++]=h>>>8&255,l[s++]=255&h,l[s++]=h>>>24&15|16,l[s++]=h>>>16&255,l[s++]=d>>>8|128,l[s++]=255&d;for(var g=0;g<6;++g)l[s+g]=f[g];return t||a(l)}},{"./lib/bytesToUuid":1,"./lib/rng":2}],4:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=function(e){return React.createElement("div",{className:"accordion accordion-icon accordion-list"},e.items.map(function(e){return React.createElement("section",{className:"accordion-section",key:e.id},React.createElement("label",{tabIndex:"0",className:"accordion-toggle",htmlFor:"accordion-section-1"},e.title),React.createElement("div",{className:"accordion-content"},e.content))}))};n.default=r},{}],5:[function(e,t,n){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var r=i(e("./Accordion")),o=i(e("uuid/v1"));function i(e){return e&&e.__esModule?e:{default:e}}function a(e){return(a="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function u(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function c(e,t){return!t||"object"!==a(t)&&"function"!=typeof t?function(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}(e):t}function s(e){return(s=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)})(e)}function l(e,t){return(l=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e})(e,t)}var f=function(e){function t(){var e;return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),(e=c(this,s(t).call(this))).state={error:null,isLoaded:!1,items:[]},e}var n,i,a;return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&l(e,t)}(t,React.Component),n=t,(i=[{key:"componentDidMount",value:function(){this.getApiData()}},{key:"mapData",value:function(e){var t=this,n=this.props.fieldMap,r=this.getObjectProp(e,n.itemContainer?n.itemContainer.split("."):[]);if(r&&0!==Object.keys(r).length)return r=(r=r.map(function(e){return{id:(0,o.default)(),title:t.getObjectProp(e,n.title.split(".")),content:t.getObjectProp(e,n.content.split("."))}})).filter(function(e){return e.id&&e.title&&e.content})}},{key:"getObjectProp",value:function(e,t){if(0===t.length)return e;for(var n=0;n<t.length;n++){if(!e.hasOwnProperty(t[n]))return console.log("Invalid map key"),null;e=e[t[n]]}return e}},{key:"getApiData",value:function(){var e=this;fetch(this.props.url).then(function(e){return e.json()}).then(function(t){var n=e.mapData(t);n&&0!==Object.keys(n).length?e.setState({isLoaded:!0,items:n}):e.setState({error:{message:"Empty data"},isLoaded:!0})},function(t){e.setState({isLoaded:!0,error:t})})}},{key:"render",value:function(){var e=this.state,t=e.error,n=e.isLoaded,o=e.items;return t?React.createElement("div",null,"Error: ",t.message):n?React.createElement(r.default,{items:o}):React.createElement("div",null,"Loading...")}}])&&u(n.prototype,i),a&&u(n,a),t}();n.default=f},{"./Accordion":4,"uuid/v1":3}],6:[function(e,t,n){"use strict";var r,o=(r=e("./Components/JsonParser"))&&r.__esModule?r:{default:r};var i=document.getElementById("modularity-json-render");ReactDOM.render(React.createElement(o.default,{url:i.dataset.url,fieldMap:JSON.parse(i.dataset.fieldmap)}),i)},{"./Components/JsonParser":5}]},{},[6]);