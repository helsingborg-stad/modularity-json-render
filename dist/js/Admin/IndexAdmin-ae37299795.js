!function(){return function t(e,r,n){function o(a,s){if(!r[a]){if(!e[a]){var u="function"==typeof require&&require;if(!s&&u)return u(a,!0);if(i)return i(a,!0);var l=new Error("Cannot find module '"+a+"'");throw l.code="MODULE_NOT_FOUND",l}var c=r[a]={exports:{}};e[a][0].call(c.exports,function(t){return o(e[a][1][t]||t)},c,c.exports,t,e,r,n)}return r[a].exports}for(var i="function"==typeof require&&require,a=0;a<n.length;a++)o(n[a]);return o}}()({1:[function(t,e,r){(function(n,o){!function(t,n){"object"==typeof r&&void 0!==e?e.exports=n():"function"==typeof define&&define.amd?define(n):t.ES6Promise=n()}(this,function(){"use strict";function e(t){return"function"==typeof t}var r=Array.isArray?Array.isArray:function(t){return"[object Array]"===Object.prototype.toString.call(t)},i=0,a=void 0,s=void 0,u=function(t,e){y[i]=t,y[i+1]=e,2===(i+=2)&&(s?s(b):g())};var l="undefined"!=typeof window?window:void 0,c=l||{},f=c.MutationObserver||c.WebKitMutationObserver,p="undefined"==typeof self&&void 0!==n&&"[object process]"==={}.toString.call(n),h="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel;function d(){var t=setTimeout;return function(){return t(b,1)}}var y=new Array(1e3);function b(){for(var t=0;t<i;t+=2){(0,y[t])(y[t+1]),y[t]=void 0,y[t+1]=void 0}i=0}var m,v,_,w,g=void 0;function E(t,e){var r=this,n=new this.constructor(R);void 0===n[O]&&U(n);var o=r._state;if(o){var i=arguments[o-1];u(function(){return N(o,n,i,r._result)})}else B(r,n,t,e);return n}function j(t){if(t&&"object"==typeof t&&t.constructor===this)return t;var e=new this(R);return M(e,t),e}p?g=function(){return n.nextTick(b)}:f?(v=0,_=new f(b),w=document.createTextNode(""),_.observe(w,{characterData:!0}),g=function(){w.data=v=++v%2}):h?((m=new MessageChannel).port1.onmessage=b,g=function(){return m.port2.postMessage(0)}):g=void 0===l&&"function"==typeof t?function(){try{var t=Function("return this")().require("vertx");return void 0!==(a=t.runOnLoop||t.runOnContext)?function(){a(b)}:d()}catch(t){return d()}}():d();var O=Math.random().toString(36).substring(2);function R(){}var A=void 0,S=1,P=2,T={error:null};function C(t){try{return t.then}catch(t){return T.error=t,T}}function x(t,r,n){r.constructor===t.constructor&&n===E&&r.constructor.resolve===j?function(t,e){e._state===S?F(t,e._result):e._state===P?I(t,e._result):B(e,void 0,function(e){return M(t,e)},function(e){return I(t,e)})}(t,r):n===T?(I(t,T.error),T.error=null):void 0===n?F(t,r):e(n)?function(t,e,r){u(function(t){var n=!1,o=function(t,e,r,n){try{t.call(e,r,n)}catch(t){return t}}(r,e,function(r){n||(n=!0,e!==r?M(t,r):F(t,r))},function(e){n||(n=!0,I(t,e))},t._label);!n&&o&&(n=!0,I(t,o))},t)}(t,r,n):F(t,r)}function M(t,e){var r,n;t===e?I(t,new TypeError("You cannot resolve a promise with itself")):(n=typeof(r=e),null===r||"object"!==n&&"function"!==n?F(t,e):x(t,e,C(e)))}function k(t){t._onerror&&t._onerror(t._result),L(t)}function F(t,e){t._state===A&&(t._result=e,t._state=S,0!==t._subscribers.length&&u(L,t))}function I(t,e){t._state===A&&(t._state=P,t._result=e,u(k,t))}function B(t,e,r,n){var o=t._subscribers,i=o.length;t._onerror=null,o[i]=e,o[i+S]=r,o[i+P]=n,0===i&&t._state&&u(L,t)}function L(t){var e=t._subscribers,r=t._state;if(0!==e.length){for(var n=void 0,o=void 0,i=t._result,a=0;a<e.length;a+=3)n=e[a],o=e[a+r],n?N(r,n,o,i):o(i);t._subscribers.length=0}}function N(t,r,n,o){var i=e(n),a=void 0,s=void 0,u=void 0,l=void 0;if(i){if((a=function(t,e){try{return t(e)}catch(t){return T.error=t,T}}(n,o))===T?(l=!0,s=a.error,a.error=null):u=!0,r===a)return void I(r,new TypeError("A promises callback cannot return that same promise."))}else a=o,u=!0;r._state!==A||(i&&u?M(r,a):l?I(r,s):t===S?F(r,a):t===P&&I(r,a))}var D=0;function U(t){t[O]=D++,t._state=void 0,t._result=void 0,t._subscribers=[]}var q=function(){function t(t,e){this._instanceConstructor=t,this.promise=new t(R),this.promise[O]||U(this.promise),r(e)?(this.length=e.length,this._remaining=e.length,this._result=new Array(this.length),0===this.length?F(this.promise,this._result):(this.length=this.length||0,this._enumerate(e),0===this._remaining&&F(this.promise,this._result))):I(this.promise,new Error("Array Methods must be provided an Array"))}return t.prototype._enumerate=function(t){for(var e=0;this._state===A&&e<t.length;e++)this._eachEntry(t[e],e)},t.prototype._eachEntry=function(t,e){var r=this._instanceConstructor,n=r.resolve;if(n===j){var o=C(t);if(o===E&&t._state!==A)this._settledAt(t._state,e,t._result);else if("function"!=typeof o)this._remaining--,this._result[e]=t;else if(r===H){var i=new r(R);x(i,t,o),this._willSettleAt(i,e)}else this._willSettleAt(new r(function(e){return e(t)}),e)}else this._willSettleAt(n(t),e)},t.prototype._settledAt=function(t,e,r){var n=this.promise;n._state===A&&(this._remaining--,t===P?I(n,r):this._result[e]=r),0===this._remaining&&F(n,this._result)},t.prototype._willSettleAt=function(t,e){var r=this;B(t,void 0,function(t){return r._settledAt(S,e,t)},function(t){return r._settledAt(P,e,t)})},t}();var H=function(){function t(e){this[O]=D++,this._result=this._state=void 0,this._subscribers=[],R!==e&&("function"!=typeof e&&function(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}(),this instanceof t?function(t,e){try{e(function(e){M(t,e)},function(e){I(t,e)})}catch(e){I(t,e)}}(this,e):function(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}())}return t.prototype.catch=function(t){return this.then(null,t)},t.prototype.finally=function(t){var r=this.constructor;return e(t)?this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})}):this.then(t,t)},t}();return H.prototype.then=E,H.all=function(t){return new q(this,t).promise},H.race=function(t){var e=this;return r(t)?new e(function(r,n){for(var o=t.length,i=0;i<o;i++)e.resolve(t[i]).then(r,n)}):new e(function(t,e){return e(new TypeError("You must pass an array to race."))})},H.resolve=j,H.reject=function(t){var e=new this(R);return I(e,t),e},H._setScheduler=function(t){s=t},H._setAsap=function(t){u=t},H._asap=u,H.polyfill=function(){var t=void 0;if(void 0!==o)t=o;else if("undefined"!=typeof self)t=self;else try{t=Function("return this")()}catch(t){throw new Error("polyfill failed because global object is unavailable in this environment")}var e=t.Promise;if(e){var r=null;try{r=Object.prototype.toString.call(e.resolve())}catch(t){}if("[object Promise]"===r&&!e.cast)return}t.Promise=H},H.Promise=H,H})}).call(this,t("_process"),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{_process:4}],2:[function(t,e,r){t("whatwg-fetch"),e.exports=self.fetch.bind(self)},{"whatwg-fetch":6}],3:[function(t,e,r){!function(t,r){"use strict";"object"==typeof e&&"object"==typeof e.exports?e.exports=r():"function"==typeof define&&define.amd?define([],r):t.objectPath=r()}(this,function(){"use strict";var t=Object.prototype.toString;function e(t,e){return null!=t&&Object.prototype.hasOwnProperty.call(t,e)}function r(t){if(!t)return!0;if(o(t)&&0===t.length)return!0;if("string"!=typeof t){for(var r in t)if(e(t,r))return!1;return!0}return!1}function n(e){return t.call(e)}var o=Array.isArray||function(e){return"[object Array]"===t.call(e)};function i(t){var e=parseInt(t);return e.toString()===t?e:t}function a(t){t=t||{};var a=function(t){return Object.keys(a).reduce(function(e,r){return"create"===r?e:("function"==typeof a[r]&&(e[r]=a[r].bind(a,t)),e)},{})};function s(r,n){return t.includeInheritedProps||"number"==typeof n&&Array.isArray(r)||e(r,n)}function u(t,e){if(s(t,e))return t[e]}function l(t,e,r,n){if("number"==typeof e&&(e=[e]),!e||0===e.length)return t;if("string"==typeof e)return l(t,e.split(".").map(i),r,n);var o=e[0],a=u(t,o);return 1===e.length?(void 0!==a&&n||(t[o]=r),a):(void 0===a&&("number"==typeof e[1]?t[o]=[]:t[o]={}),l(t[o],e.slice(1),r,n))}return a.has=function(r,n){if("number"==typeof n?n=[n]:"string"==typeof n&&(n=n.split(".")),!n||0===n.length)return!!r;for(var a=0;a<n.length;a++){var s=i(n[a]);if(!("number"==typeof s&&o(r)&&s<r.length||(t.includeInheritedProps?s in Object(r):e(r,s))))return!1;r=r[s]}return!0},a.ensureExists=function(t,e,r){return l(t,e,r,!0)},a.set=function(t,e,r,n){return l(t,e,r,n)},a.insert=function(t,e,r,n){var i=a.get(t,e);n=~~n,o(i)||(i=[],a.set(t,e,i)),i.splice(n,0,r)},a.empty=function(t,e){var i,u;if(!r(e)&&(null!=t&&(i=a.get(t,e)))){if("string"==typeof i)return a.set(t,e,"");if(function(t){return"boolean"==typeof t||"[object Boolean]"===n(t)}(i))return a.set(t,e,!1);if("number"==typeof i)return a.set(t,e,0);if(o(i))i.length=0;else{if(!function(t){return"object"==typeof t&&"[object Object]"===n(t)}(i))return a.set(t,e,null);for(u in i)s(i,u)&&delete i[u]}}},a.push=function(t,e){var r=a.get(t,e);o(r)||(r=[],a.set(t,e,r)),r.push.apply(r,Array.prototype.slice.call(arguments,2))},a.coalesce=function(t,e,r){for(var n,o=0,i=e.length;o<i;o++)if(void 0!==(n=a.get(t,e[o])))return n;return r},a.get=function(t,e,r){if("number"==typeof e&&(e=[e]),!e||0===e.length)return t;if(null==t)return r;if("string"==typeof e)return a.get(t,e.split("."),r);var n=i(e[0]),o=u(t,n);return void 0===o?r:1===e.length?o:a.get(t[n],e.slice(1),r)},a.del=function(t,e){if("number"==typeof e&&(e=[e]),null==t)return t;if(r(e))return t;if("string"==typeof e)return a.del(t,e.split("."));var n=i(e[0]);return s(t,n)?1!==e.length?a.del(t[n],e.slice(1)):(o(t)?t.splice(n,1):delete t[n],t):t},a}var s=a();return s.create=a,s.withInheritedProps=a({includeInheritedProps:!0}),s})},{}],4:[function(t,e,r){var n,o,i=e.exports={};function a(){throw new Error("setTimeout has not been defined")}function s(){throw new Error("clearTimeout has not been defined")}function u(t){if(n===setTimeout)return setTimeout(t,0);if((n===a||!n)&&setTimeout)return n=setTimeout,setTimeout(t,0);try{return n(t,0)}catch(e){try{return n.call(null,t,0)}catch(e){return n.call(this,t,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:a}catch(t){n=a}try{o="function"==typeof clearTimeout?clearTimeout:s}catch(t){o=s}}();var l,c=[],f=!1,p=-1;function h(){f&&l&&(f=!1,l.length?c=l.concat(c):p=-1,c.length&&d())}function d(){if(!f){var t=u(h);f=!0;for(var e=c.length;e;){for(l=c,c=[];++p<e;)l&&l[p].run();p=-1,e=c.length}l=null,f=!1,function(t){if(o===clearTimeout)return clearTimeout(t);if((o===s||!o)&&clearTimeout)return o=clearTimeout,clearTimeout(t);try{o(t)}catch(e){try{return o.call(null,t)}catch(e){return o.call(this,t)}}}(t)}}function y(t,e){this.fun=t,this.array=e}function b(){}i.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)e[r-1]=arguments[r];c.push(new y(t,e)),1!==c.length||f||u(d)},y.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=b,i.addListener=b,i.once=b,i.off=b,i.removeListener=b,i.removeAllListeners=b,i.emit=b,i.prependListener=b,i.prependOnceListener=b,i.listeners=function(t){return[]},i.binding=function(t){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(t){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},{}],5:[function(t,e,r){var n,o;n=this,o=function(){return function(t){var e={};function r(n){if(e[n])return e[n].exports;var o=e[n]={exports:{},id:n,loaded:!1};return t[n].call(o.exports,o,o.exports,r),o.loaded=!0,o.exports}return r.m=t,r.c=e,r.p="",r(0)}([function(t,e,r){"use strict";var n=function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")},o=r(1),i=o.isObject,a=o.getKeys,s="__bypassMode",u="__ignoreCircular",l="__maxDeep",c="__cache",f="__queue",p="__state",h={},d=function(){function t(e){var r=void 0===arguments[1]?0:arguments[1],o=void 0!==arguments[2]&&arguments[2],i=void 0===arguments[3]?100:arguments[3];n(this,t),this[s]=r,this[u]=o,this[l]=i,this[c]=[],this[f]=[],this[p]=this.getState(void 0,e),this.__makeIterable()}var e,r,o;return e=t,o={next:{value:function(){var t=this[p]||h,e=t.node,r=t.path,n=t.deep;if(this[l]>n&&this.isNode(e))if(this.isCircular(e)){if(!this[u])throw new Error("Circular reference")}else if(this.onStepInto(this[p])){var o,i=this.getStatesOfChildNodes(e,r,n),a=this[s]?"push":"unshift";(o=this[f])[a].apply(o,function(t){if(Array.isArray(t)){for(var e=0,r=Array(t.length);e<t.length;e++)r[e]=t[e];return r}return Array.from(t)}(i)),this[c].push(e)}var d=this[f].shift(),y=!d;return this[p]=d,y&&this.destroy(),{value:d,done:y}},writable:!0,configurable:!0},destroy:{value:function(){this[f].length=0,this[c].length=0,this[p]=null},writable:!0,configurable:!0},isNode:{value:function(t){return i(t)},writable:!0,configurable:!0},isLeaf:{value:function(t){return!this.isNode(t)},writable:!0,configurable:!0},isCircular:{value:function(t){return-1!==this[c].indexOf(t)},writable:!0,configurable:!0},getStatesOfChildNodes:{value:function(t,e,r){var n=this;return a(t).map(function(o){return n.getState(t,t[o],o,e.concat(o),r+1)})},writable:!0,configurable:!0},getState:{value:function(t,e,r){return{parent:t,node:e,key:r,path:void 0===arguments[3]?[]:arguments[3],deep:void 0===arguments[4]?0:arguments[4]}},writable:!0,configurable:!0},onStepInto:{value:function(t){return!0},writable:!0,configurable:!0},__makeIterable:{value:function(){var t=this;try{this[Symbol.iterator]=function(){return t}}catch(t){}},writable:!0,configurable:!0}},(r=null)&&Object.defineProperties(e,r),o&&Object.defineProperties(e.prototype,o),t}();t.exports=d},function(t,e){"use strict";function r(t){return null!==t&&"object"==typeof t}e.isObject=r,e.isArrayLike=o,e.isNumber=i,e.getKeys=function(t){var e=Object.keys(t);if(n(t));else if(o(t)){var r=e.indexOf("length");r>-1&&e.splice(r,1)}else e=e.sort();return e};var n=e.isArray=Array.isArray;function o(t){if(!r(t))return!1;if(!("length"in t))return!1;var e=t.length;if(!i(e))return!1;if(e>0)return e-1 in t;for(var n in t)return!1}function i(t){return"number"==typeof t}Object.defineProperty(e,"__esModule",{value:!0})}])},"object"==typeof r&&"object"==typeof e?e.exports=o():"function"==typeof define&&define.amd?define([],o):"object"==typeof r?r.RecursiveIterator=o():n.RecursiveIterator=o()},{}],6:[function(t,e,r){!function(t){"use strict";if(!t.fetch){var e={searchParams:"URLSearchParams"in t,iterable:"Symbol"in t&&"iterator"in Symbol,blob:"FileReader"in t&&"Blob"in t&&function(){try{return new Blob,!0}catch(t){return!1}}(),formData:"FormData"in t,arrayBuffer:"ArrayBuffer"in t};if(e.arrayBuffer)var r=["[object Int8Array]","[object Uint8Array]","[object Uint8ClampedArray]","[object Int16Array]","[object Uint16Array]","[object Int32Array]","[object Uint32Array]","[object Float32Array]","[object Float64Array]"],n=function(t){return t&&DataView.prototype.isPrototypeOf(t)},o=ArrayBuffer.isView||function(t){return t&&r.indexOf(Object.prototype.toString.call(t))>-1};c.prototype.append=function(t,e){t=s(t),e=u(e);var r=this.map[t];this.map[t]=r?r+","+e:e},c.prototype.delete=function(t){delete this.map[s(t)]},c.prototype.get=function(t){return t=s(t),this.has(t)?this.map[t]:null},c.prototype.has=function(t){return this.map.hasOwnProperty(s(t))},c.prototype.set=function(t,e){this.map[s(t)]=u(e)},c.prototype.forEach=function(t,e){for(var r in this.map)this.map.hasOwnProperty(r)&&t.call(e,this.map[r],r,this)},c.prototype.keys=function(){var t=[];return this.forEach(function(e,r){t.push(r)}),l(t)},c.prototype.values=function(){var t=[];return this.forEach(function(e){t.push(e)}),l(t)},c.prototype.entries=function(){var t=[];return this.forEach(function(e,r){t.push([r,e])}),l(t)},e.iterable&&(c.prototype[Symbol.iterator]=c.prototype.entries);var i=["DELETE","GET","HEAD","OPTIONS","POST","PUT"];b.prototype.clone=function(){return new b(this,{body:this._bodyInit})},y.call(b.prototype),y.call(v.prototype),v.prototype.clone=function(){return new v(this._bodyInit,{status:this.status,statusText:this.statusText,headers:new c(this.headers),url:this.url})},v.error=function(){var t=new v(null,{status:0,statusText:""});return t.type="error",t};var a=[301,302,303,307,308];v.redirect=function(t,e){if(-1===a.indexOf(e))throw new RangeError("Invalid status code");return new v(null,{status:e,headers:{location:t}})},t.Headers=c,t.Request=b,t.Response=v,t.fetch=function(t,r){return new Promise(function(n,o){var i=new b(t,r),a=new XMLHttpRequest;a.onload=function(){var t,e,r={status:a.status,statusText:a.statusText,headers:(t=a.getAllResponseHeaders()||"",e=new c,t.split(/\r?\n/).forEach(function(t){var r=t.split(":"),n=r.shift().trim();if(n){var o=r.join(":").trim();e.append(n,o)}}),e)};r.url="responseURL"in a?a.responseURL:r.headers.get("X-Request-URL");var o="response"in a?a.response:a.responseText;n(new v(o,r))},a.onerror=function(){o(new TypeError("Network request failed"))},a.ontimeout=function(){o(new TypeError("Network request failed"))},a.open(i.method,i.url,!0),"include"===i.credentials&&(a.withCredentials=!0),"responseType"in a&&e.blob&&(a.responseType="blob"),i.headers.forEach(function(t,e){a.setRequestHeader(e,t)}),a.send(void 0===i._bodyInit?null:i._bodyInit)})},t.fetch.polyfill=!0}function s(t){if("string"!=typeof t&&(t=String(t)),/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(t))throw new TypeError("Invalid character in header field name");return t.toLowerCase()}function u(t){return"string"!=typeof t&&(t=String(t)),t}function l(t){var r={next:function(){var e=t.shift();return{done:void 0===e,value:e}}};return e.iterable&&(r[Symbol.iterator]=function(){return r}),r}function c(t){this.map={},t instanceof c?t.forEach(function(t,e){this.append(e,t)},this):Array.isArray(t)?t.forEach(function(t){this.append(t[0],t[1])},this):t&&Object.getOwnPropertyNames(t).forEach(function(e){this.append(e,t[e])},this)}function f(t){if(t.bodyUsed)return Promise.reject(new TypeError("Already read"));t.bodyUsed=!0}function p(t){return new Promise(function(e,r){t.onload=function(){e(t.result)},t.onerror=function(){r(t.error)}})}function h(t){var e=new FileReader,r=p(e);return e.readAsArrayBuffer(t),r}function d(t){if(t.slice)return t.slice(0);var e=new Uint8Array(t.byteLength);return e.set(new Uint8Array(t)),e.buffer}function y(){return this.bodyUsed=!1,this._initBody=function(t){if(this._bodyInit=t,t)if("string"==typeof t)this._bodyText=t;else if(e.blob&&Blob.prototype.isPrototypeOf(t))this._bodyBlob=t;else if(e.formData&&FormData.prototype.isPrototypeOf(t))this._bodyFormData=t;else if(e.searchParams&&URLSearchParams.prototype.isPrototypeOf(t))this._bodyText=t.toString();else if(e.arrayBuffer&&e.blob&&n(t))this._bodyArrayBuffer=d(t.buffer),this._bodyInit=new Blob([this._bodyArrayBuffer]);else{if(!e.arrayBuffer||!ArrayBuffer.prototype.isPrototypeOf(t)&&!o(t))throw new Error("unsupported BodyInit type");this._bodyArrayBuffer=d(t)}else this._bodyText="";this.headers.get("content-type")||("string"==typeof t?this.headers.set("content-type","text/plain;charset=UTF-8"):this._bodyBlob&&this._bodyBlob.type?this.headers.set("content-type",this._bodyBlob.type):e.searchParams&&URLSearchParams.prototype.isPrototypeOf(t)&&this.headers.set("content-type","application/x-www-form-urlencoded;charset=UTF-8"))},e.blob&&(this.blob=function(){var t=f(this);if(t)return t;if(this._bodyBlob)return Promise.resolve(this._bodyBlob);if(this._bodyArrayBuffer)return Promise.resolve(new Blob([this._bodyArrayBuffer]));if(this._bodyFormData)throw new Error("could not read FormData body as blob");return Promise.resolve(new Blob([this._bodyText]))},this.arrayBuffer=function(){return this._bodyArrayBuffer?f(this)||Promise.resolve(this._bodyArrayBuffer):this.blob().then(h)}),this.text=function(){var t,e,r,n=f(this);if(n)return n;if(this._bodyBlob)return t=this._bodyBlob,e=new FileReader,r=p(e),e.readAsText(t),r;if(this._bodyArrayBuffer)return Promise.resolve(function(t){for(var e=new Uint8Array(t),r=new Array(e.length),n=0;n<e.length;n++)r[n]=String.fromCharCode(e[n]);return r.join("")}(this._bodyArrayBuffer));if(this._bodyFormData)throw new Error("could not read FormData body as text");return Promise.resolve(this._bodyText)},e.formData&&(this.formData=function(){return this.text().then(m)}),this.json=function(){return this.text().then(JSON.parse)},this}function b(t,e){var r,n,o=(e=e||{}).body;if(t instanceof b){if(t.bodyUsed)throw new TypeError("Already read");this.url=t.url,this.credentials=t.credentials,e.headers||(this.headers=new c(t.headers)),this.method=t.method,this.mode=t.mode,o||null==t._bodyInit||(o=t._bodyInit,t.bodyUsed=!0)}else this.url=String(t);if(this.credentials=e.credentials||this.credentials||"omit",!e.headers&&this.headers||(this.headers=new c(e.headers)),this.method=(r=e.method||this.method||"GET",n=r.toUpperCase(),i.indexOf(n)>-1?n:r),this.mode=e.mode||this.mode||null,this.referrer=null,("GET"===this.method||"HEAD"===this.method)&&o)throw new TypeError("Body not allowed for GET or HEAD requests");this._initBody(o)}function m(t){var e=new FormData;return t.trim().split("&").forEach(function(t){if(t){var r=t.split("="),n=r.shift().replace(/\+/g," "),o=r.join("=").replace(/\+/g," ");e.append(decodeURIComponent(n),decodeURIComponent(o))}}),e}function v(t,e){e||(e={}),this.type="default",this.status="status"in e?e.status:200,this.ok=this.status>=200&&this.status<300,this.statusText="statusText"in e?e.statusText:"OK",this.headers=new c(e.headers),this.url=e.url||"",this._initBody(t)}}("undefined"!=typeof self?self:this)},{}],7:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var n=a(t("./ListItem")),o=a(t("recursive-iterator")),i=a(t("object-path"));function a(t){return t&&t.__esModule?t:{default:t}}function s(t){return(s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function u(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function l(t,e){return!e||"object"!==s(e)&&"function"!=typeof e?function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t):e}function c(t){return(c=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function f(t,e){return(f=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}var p=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),l(this,c(e).apply(this,arguments))}var r,a,p;return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&f(t,e)}(e,React.Component),r=e,(a=[{key:"setFieldMap",value:function(t,e){var r,n,o;e.preventDefault(),this.props.updateFieldMap((r={},n=e.target.dataset.field,o=t,n in r?Object.defineProperty(r,n,{value:o,enumerable:!0,configurable:!0,writable:!0}):r[n]=o,r))}},{key:"renderNodes",value:function(t){var e=this;return Object.keys(t).map(function(r){if("objectPath"!==r){var o=React.createElement(n.default,{key:r.toString(),value:r,object:t[r],fieldMap:e.props.fieldMap,onClickContainer:function(n){return e.setFieldMap(t[r].objectPath,n)},onClickTitle:function(n){return e.setFieldMap(t[r],n)},onClickContent:function(n){return e.setFieldMap(t[r],n)},translation:e.props.translation});return"object"===s(t[r])&&null!==t[r]&&(o=React.cloneElement(o,{children:Array.isArray(t[r])?e.renderNodes(t[r][0]):e.renderNodes(t[r])})),o}})}},{key:"render",value:function(){var t=this.props,e=t.translation,r=t.data,n=this.props.fieldMap;if(Array.isArray(r)&&(n.itemContainer=""),null===n.itemContainer){Array.isArray(r)&&(function(t){throw new Error('"'+t+'" is read-only')}("data"),r=r[0]);var a=!0,u=!1,l=void 0;try{for(var c,f=new o.default(r)[Symbol.iterator]();!(a=(c=f.next()).done);a=!0){var p=c.value,h=(p.parent,p.node),d=(p.key,p.path);if("object"===s(h)&&null!==h){var y=d.join(".");i.default.set(r,y+".objectPath",y)}}}catch(t){u=!0,l=t}finally{try{a||null==f.return||f.return()}finally{if(u)throw l}}return React.createElement("div",null,React.createElement("h3",null,e.selectItemsContainer),React.createElement("ul",{className:"json-tree"},this.renderNodes(r)))}var b=i.default.get(r,n.itemContainer);Array.isArray(b)&&(b=b[0]);var m=!0,v=!1,_=void 0;try{for(var w,g=new o.default(b)[Symbol.iterator]();!(m=(w=g.next()).done);m=!0){var E=w.value;E.parent,h=E.node,E.key,d=E.path;if("object"!==s(h)){var j=d.join(".");i.default.set(b,j,j)}}}catch(t){v=!0,_=t}finally{try{m||null==g.return||g.return()}finally{if(v)throw _}}return React.createElement("div",null,React.createElement("h3",null,e.selectTitleContent),React.createElement("ul",{className:"json-tree"},this.renderNodes(b)))}}])&&u(r.prototype,a),p&&u(r,p),e}();r.default=p},{"./ListItem":10,"object-path":3,"recursive-iterator":5}],8:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var n=i(t("./DataList")),o=i(t("../../Utilities/getApiData"));function i(t){return t&&t.__esModule?t:{default:t}}function a(t){return(a="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function s(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function u(t,e){return!e||"object"!==a(e)&&"function"!=typeof e?function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t):e}function l(t){return(l=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function c(t,e){return(c=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}var f=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),u(this,l(e).apply(this,arguments))}var r,i,a;return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&c(t,e)}(e,React.Component),r=e,(i=[{key:"componentDidMount",value:function(){this.getData()}},{key:"getData",value:function(){var t=this,e=this.props,r=e.url,n=e.translation;(0,o.default)(r).then(function(e){var r=e.result;if(!r||0===Object.keys(r).length)return t.props.setError(Error(n.couldNotFetch)),void t.props.setLoaded(!0);t.props.setItems(r),t.props.setLoaded(!0)},function(e){var r=e.error;t.props.setLoaded(!0),t.props.setError(r)})}},{key:"updateFieldMap",value:function(t){this.props.updateFieldMap(t)}},{key:"render",value:function(){var t=this.props,e=t.url,r=t.error,o=t.fieldMap,i=t.translation,a=t.isLoaded,s=t.items;return r?React.createElement("div",{className:"notice notice-error inline"},React.createElement("p",null,r.message)):a?React.createElement(n.default,{data:s,url:e,fieldMap:o,updateFieldMap:this.updateFieldMap.bind(this),translation:i}):React.createElement("div",{className:"spinner is-active"})}}])&&s(r.prototype,i),a&&s(r,a),e}();r.default=f},{"../../Utilities/getApiData":14,"./DataList":7}],9:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var n=function(t){var e=t.fieldMap,r=t.url;return React.createElement("div",null,React.createElement("input",{type:"hidden",name:"mod_json_render_url",value:r}),React.createElement("input",{type:"hidden",name:"mod_json_render_fieldmap",value:JSON.stringify(e)}))};r.default=n},{}],10:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var n=function(t){var e=t.value,r=t.children,n=t.fieldMap,o=t.object,i=t.onClickTitle,a=t.onClickContent,s=t.onClickContainer,u=t.translation;return r?React.createElement("li",null,Array.isArray(o)&&null===n.itemContainer?React.createElement("span",null,React.createElement("span",{className:"dashicons dashicons-portfolio"})," ",e," ",React.createElement("a",{href:"#",className:"tree-select","data-field":"itemContainer",onClick:s},u.select)):React.createElement("span",null,e),React.createElement("ul",null,r)):React.createElement("li",null,n.title===o&&n.title?React.createElement("strong",null,u.title,": "):"",n.content===o&&n.content?React.createElement("strong",null,u.content,": "):"",React.createElement("span",null,e),n.title||n.content===o||null===n.itemContainer?"":React.createElement("a",{href:"#",className:"tree-select","data-field":"title",onClick:i},u.title),n.content||n.title===o||null===n.itemContainer?"":React.createElement("a",{href:"#",className:"tree-select","data-field":"content",onClick:a},u.content))};r.default=n},{}],11:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var n=a(t("./FieldSelection")),o=a(t("./InputFields")),i=a(t("./Summary"));function a(t){return t&&t.__esModule?t:{default:t}}function s(t){return(s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function u(){return(u=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var r=arguments[e];for(var n in r)Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n])}return t}).apply(this,arguments)}function l(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}function c(t,e){return!e||"object"!==s(e)&&"function"!=typeof e?function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t):e}function f(t){return(f=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)})(t)}function p(t,e){return(p=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}var h=function(t){function e(t){var r;return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),(r=c(this,f(e).call(this,t))).state={showFieldSelection:!1,url:"",isLoaded:!1,error:null,items:[],fieldMap:{itemContainer:null,title:"",content:""}},r}var r,a,s;return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&p(t,e)}(e,React.Component),r=e,(a=[{key:"componentDidMount",value:function(){this.initOptions()}},{key:"initOptions",value:function(){if(void 0!==modJsonRender.options){var t=modJsonRender.options;this.setState({url:t.url?t.url:"",fieldMap:t.fieldMap?JSON.parse(t.fieldMap):{itemContainer:null,title:"",content:""},showFieldSelection:!!t.url})}}},{key:"urlChange",value:function(t){this.setState({url:t.target.value})}},{key:"handleSubmit",value:function(t){t.preventDefault(),this.setState({showFieldSelection:!0})}},{key:"resetOptions",value:function(t){t.preventDefault(),this.setState({showFieldSelection:!1,url:"",fieldMap:{itemContainer:null,title:"",content:""}})}},{key:"updateFieldMap",value:function(t){var e=Object.assign(this.state.fieldMap,t);this.setState({fieldMap:e})}},{key:"setError",value:function(t){this.setState({error:t})}},{key:"setLoaded",value:function(t){this.setState({isLoaded:t})}},{key:"setItems",value:function(t){this.setState({items:t})}},{key:"render",value:function(){var t=this.props.translation,e=this.state,r=e.showFieldSelection,a=e.url,s=e.error,l=e.isLoaded,c=e.items,f=this.state.fieldMap,p=f.itemContainer,h=f.title,d=f.content;return a&&null!==p&&h&&d?React.createElement("div",null,React.createElement(i.default,u({},this.state,{translation:t})),React.createElement(o.default,this.state),React.createElement("p",null,React.createElement("a",{href:"#",onClick:this.resetOptions.bind(this),className:"button"},t.resetSettings))):r?React.createElement("div",null,React.createElement(n.default,{url:a,error:s,setError:this.setError.bind(this),isLoaded:l,setLoaded:this.setLoaded.bind(this),items:c,setItems:this.setItems.bind(this),fieldMap:this.state.fieldMap,updateFieldMap:this.updateFieldMap.bind(this),translation:t}),React.createElement(o.default,this.state),React.createElement("p",null,React.createElement("a",{href:"#",onClick:this.resetOptions.bind(this),className:"button"},t.resetSettings))):React.createElement("div",{className:"wrap"},React.createElement("form",{onSubmit:this.handleSubmit.bind(this)},React.createElement("p",null,React.createElement("label",null,React.createElement("strong",null,"API URL")),React.createElement("br",null),React.createElement("i",null,t.validJsonUrl)),React.createElement("input",{type:"text",className:"url-input",value:a,onChange:this.urlChange.bind(this)}),React.createElement("p",null,React.createElement("input",{type:"submit",className:"button button-primary",value:t.sendRequest}))),React.createElement(o.default,this.state))}}])&&l(r.prototype,a),s&&l(r,s),e}();r.default=h},{"./FieldSelection":8,"./InputFields":9,"./Summary":12}],12:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var n=function(t){var e=t.url,r=t.fieldMap,n=t.translation;return React.createElement("div",null,React.createElement("p",null,React.createElement("strong",null,"API URL"),React.createElement("br",null),React.createElement("a",{href:e,target:"_blank"},e)),React.createElement("p",null,React.createElement("strong",null,n.title),React.createElement("br",null),r.title.replace("."," –> ")),React.createElement("p",null,React.createElement("strong",null,n.content),React.createElement("br",null),r.content.replace("."," –> ")))};r.default=n},{}],13:[function(t,e,r){"use strict";t("es6-promise"),t("isomorphic-fetch");var n,o=(n=t("./Components/Settings"))&&n.__esModule?n:{default:n};var i=document.getElementById("modularity-json-render"),a=modJsonRender.translation;ReactDOM.render(React.createElement(o.default,{translation:a}),i)},{"./Components/Settings":11,"es6-promise":1,"isomorphic-fetch":2}],14:[function(t,e,r){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=void 0;var n=function(t){return fetch(t).then(function(t){return t.json()}).then(function(t){return{result:t}},function(t){return{error:t}})};r.default=n},{}]},{},[13]);