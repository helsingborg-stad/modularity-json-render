(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return ([bth[buf[i++]], bth[buf[i++]], 
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]]]).join('');
}

module.exports = bytesToUuid;

},{}],2:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto
// implementation. Also, find the complete implementation of crypto on IE11.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && typeof window.msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto));

if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

},{}],3:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;
var _clockseq;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189
  if (node == null || clockseq == null) {
    var seedBytes = rng();
    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [
        seedBytes[0] | 0x01,
        seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
      ];
    }
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  }

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":1,"./lib/rng":2}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function Accordion(props) {
  return React.createElement("div", {
    className: "accordion accordion-icon accordion-list"
  }, props.items.map(function (item) {
    return React.createElement("section", {
      className: "accordion-section",
      key: item.id
    }, React.createElement("label", {
      tabIndex: "0",
      className: "accordion-toggle",
      htmlFor: "accordion-section-1"
    }, item.title), React.createElement("div", {
      className: "accordion-content"
    }, item.content));
  }));
}

var _default = Accordion;
exports.default = _default;

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _Accordion = _interopRequireDefault(require("./Accordion"));

var _v = _interopRequireDefault(require("uuid/v1"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var JsonParser =
/*#__PURE__*/
function (_React$Component) {
  _inherits(JsonParser, _React$Component);

  function JsonParser() {
    var _this;

    _classCallCheck(this, JsonParser);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(JsonParser).call(this));
    _this.state = {
      error: null,
      isLoaded: false,
      items: []
    };
    return _this;
  }

  _createClass(JsonParser, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      this.getApiData();
    }
  }, {
    key: "mapData",
    value: function mapData(jsonData) {
      var _this2 = this;

      var fieldMap = this.props.fieldMap; // Get the object containing items from JSON

      var items = this.getObjectProp(jsonData, fieldMap.itemContainer ? fieldMap.itemContainer.split('.') : []);

      if (!items || Object.keys(items).length === 0) {
        return;
      } // Map the data items


      items = items.map(function (item) {
        return {
          id: (0, _v.default)(),
          title: _this2.getObjectProp(item, fieldMap.title.split('.')),
          content: _this2.getObjectProp(item, fieldMap.content.split('.'))
        };
      }); // Remove objects with missing fields

      items = items.filter(function (item) {
        return item.id && item.title && item.content;
      });
      return items;
    }
  }, {
    key: "getObjectProp",
    value: function getObjectProp(obj, keys) {
      if (keys.length === 0) {
        return obj;
      }

      for (var i = 0; i < keys.length; i++) {
        if (obj.hasOwnProperty(keys[i])) {
          obj = obj[keys[i]];
        } else {
          console.log('Invalid map key');
          return null;
        }
      }

      return obj;
    }
  }, {
    key: "getApiData",
    value: function getApiData() {
      var _this3 = this;

      fetch(this.props.url).then(function (res) {
        return res.json();
      }).then(function (result) {
        var data = _this3.mapData(result);

        if (!data || Object.keys(data).length === 0) {
          _this3.setState({
            error: {
              message: 'Empty data'
            },
            isLoaded: true
          });

          return;
        }

        _this3.setState({
          isLoaded: true,
          items: data
        });
      }, function (error) {
        _this3.setState({
          isLoaded: true,
          error: error
        });
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this$state = this.state,
          error = _this$state.error,
          isLoaded = _this$state.isLoaded,
          items = _this$state.items;

      if (error) {
        return React.createElement("div", null, "Error: ", error.message);
      } else if (!isLoaded) {
        return React.createElement("div", null, "Loading...");
      } else {
        return React.createElement(_Accordion.default, {
          items: items
        });
      }
    }
  }]);

  return JsonParser;
}(React.Component);

var _default = JsonParser;
exports.default = _default;

},{"./Accordion":4,"uuid/v1":3}],6:[function(require,module,exports){
"use strict";

var _JsonParser = _interopRequireDefault(require("./Components/JsonParser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var modJsonRenderElement = 'modularity-json-render';
var domElement = document.getElementById(modJsonRenderElement);
ReactDOM.render(React.createElement(_JsonParser.default, {
  url: domElement.dataset.url,
  fieldMap: JSON.parse(domElement.dataset.fieldmap)
}), domElement);

},{"./Components/JsonParser":5}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92MS5qcyIsInNvdXJjZS9qcy9Gcm9udC9Db21wb25lbnRzL0FjY29yZGlvbi5qcyIsInNvdXJjZS9qcy9Gcm9udC9Db21wb25lbnRzL0pzb25QYXJzZXIuanMiLCJzb3VyY2UvanMvRnJvbnQvSW5kZXhGcm9udC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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VDtBQXlCSDs7OzZCQUVRO0FBQUEsd0JBQzRCLEtBQUssS0FEakM7QUFBQSxVQUNFLEtBREYsZUFDRSxLQURGO0FBQUEsVUFDUyxRQURULGVBQ1MsUUFEVDtBQUFBLFVBQ21CLEtBRG5CLGVBQ21CLEtBRG5COztBQUVMLFVBQUksS0FBSixFQUFXO0FBQ1AsZUFBTyw0Q0FBYSxLQUFLLENBQUMsT0FBbkIsQ0FBUDtBQUNILE9BRkQsTUFFTyxJQUFJLENBQUMsUUFBTCxFQUFlO0FBQ2xCLGVBQU8sOENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUNJLG9CQUFDLGtCQUFEO0FBQVcsVUFBQSxLQUFLLEVBQUU7QUFBbEIsVUFESjtBQUdIO0FBQ0o7Ozs7RUEzRm9CLEtBQUssQ0FBQyxTOztlQThGaEIsVTs7Ozs7O0FDakdmOzs7O0FBRUEsSUFBTSxvQkFBb0IsR0FBRyx3QkFBN0I7QUFDQSxJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBVCxDQUF3QixvQkFBeEIsQ0FBbkI7QUFFQSxRQUFRLENBQUMsTUFBVCxDQUNJLG9CQUFDLG1CQUFEO0FBQVksRUFBQSxHQUFHLEVBQUUsVUFBVSxDQUFDLE9BQVgsQ0FBbUIsR0FBcEM7QUFBeUMsRUFBQSxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUwsQ0FBVyxVQUFVLENBQUMsT0FBWCxDQUFtQixRQUE5QjtBQUFuRCxFQURKLEVBRUksVUFGSiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qKlxuICogQ29udmVydCBhcnJheSBvZiAxNiBieXRlIHZhbHVlcyB0byBVVUlEIHN0cmluZyBmb3JtYXQgb2YgdGhlIGZvcm06XG4gKiBYWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFhcbiAqL1xudmFyIGJ5dGVUb0hleCA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICBieXRlVG9IZXhbaV0gPSAoaSArIDB4MTAwKS50b1N0cmluZygxNikuc3Vic3RyKDEpO1xufVxuXG5mdW5jdGlvbiBieXRlc1RvVXVpZChidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IG9mZnNldCB8fCAwO1xuICB2YXIgYnRoID0gYnl0ZVRvSGV4O1xuICAvLyBqb2luIHVzZWQgdG8gZml4IG1lbW9yeSBpc3N1ZSBjYXVzZWQgYnkgY29uY2F0ZW5hdGlvbjogaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzE3NSNjNFxuICByZXR1cm4gKFtidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCBcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dXSkuam9pbignJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnl0ZXNUb1V1aWQ7XG4iLCIvLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxuXG4vLyBnZXRSYW5kb21WYWx1ZXMgbmVlZHMgdG8gYmUgaW52b2tlZCBpbiBhIGNvbnRleHQgd2hlcmUgXCJ0aGlzXCIgaXMgYSBDcnlwdG9cbi8vIGltcGxlbWVudGF0aW9uLiBBbHNvLCBmaW5kIHRoZSBjb21wbGV0ZSBpbXBsZW1lbnRhdGlvbiBvZiBjcnlwdG8gb24gSUUxMS5cbnZhciBnZXRSYW5kb21WYWx1ZXMgPSAodHlwZW9mKGNyeXB0bykgIT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mKG1zQ3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93Lm1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcyA9PSAnZnVuY3Rpb24nICYmIG1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKG1zQ3J5cHRvKSk7XG5cbmlmIChnZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hhdHdnUk5HKCkge1xuICAgIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufSBlbHNlIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgcm5kcyA9IG5ldyBBcnJheSgxNik7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXRoUk5HKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBybmRzO1xuICB9O1xufVxuIiwidmFyIHJuZyA9IHJlcXVpcmUoJy4vbGliL3JuZycpO1xudmFyIGJ5dGVzVG9VdWlkID0gcmVxdWlyZSgnLi9saWIvYnl0ZXNUb1V1aWQnKTtcblxuLy8gKipgdjEoKWAgLSBHZW5lcmF0ZSB0aW1lLWJhc2VkIFVVSUQqKlxuLy9cbi8vIEluc3BpcmVkIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9MaW9zSy9VVUlELmpzXG4vLyBhbmQgaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L3V1aWQuaHRtbFxuXG52YXIgX25vZGVJZDtcbnZhciBfY2xvY2tzZXE7XG5cbi8vIFByZXZpb3VzIHV1aWQgY3JlYXRpb24gdGltZVxudmFyIF9sYXN0TVNlY3MgPSAwO1xudmFyIF9sYXN0TlNlY3MgPSAwO1xuXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2Jyb29mYS9ub2RlLXV1aWQgZm9yIEFQSSBkZXRhaWxzXG5mdW5jdGlvbiB2MShvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IGJ1ZiAmJiBvZmZzZXQgfHwgMDtcbiAgdmFyIGIgPSBidWYgfHwgW107XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBub2RlID0gb3B0aW9ucy5ub2RlIHx8IF9ub2RlSWQ7XG4gIHZhciBjbG9ja3NlcSA9IG9wdGlvbnMuY2xvY2tzZXEgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2xvY2tzZXEgOiBfY2xvY2tzZXE7XG5cbiAgLy8gbm9kZSBhbmQgY2xvY2tzZXEgbmVlZCB0byBiZSBpbml0aWFsaXplZCB0byByYW5kb20gdmFsdWVzIGlmIHRoZXkncmUgbm90XG4gIC8vIHNwZWNpZmllZC4gIFdlIGRvIHRoaXMgbGF6aWx5IHRvIG1pbmltaXplIGlzc3VlcyByZWxhdGVkIHRvIGluc3VmZmljaWVudFxuICAvLyBzeXN0ZW0gZW50cm9weS4gIFNlZSAjMTg5XG4gIGlmIChub2RlID09IG51bGwgfHwgY2xvY2tzZXEgPT0gbnVsbCkge1xuICAgIHZhciBzZWVkQnl0ZXMgPSBybmcoKTtcbiAgICBpZiAobm9kZSA9PSBudWxsKSB7XG4gICAgICAvLyBQZXIgNC41LCBjcmVhdGUgYW5kIDQ4LWJpdCBub2RlIGlkLCAoNDcgcmFuZG9tIGJpdHMgKyBtdWx0aWNhc3QgYml0ID0gMSlcbiAgICAgIG5vZGUgPSBfbm9kZUlkID0gW1xuICAgICAgICBzZWVkQnl0ZXNbMF0gfCAweDAxLFxuICAgICAgICBzZWVkQnl0ZXNbMV0sIHNlZWRCeXRlc1syXSwgc2VlZEJ5dGVzWzNdLCBzZWVkQnl0ZXNbNF0sIHNlZWRCeXRlc1s1XVxuICAgICAgXTtcbiAgICB9XG4gICAgaWYgKGNsb2Nrc2VxID09IG51bGwpIHtcbiAgICAgIC8vIFBlciA0LjIuMiwgcmFuZG9taXplICgxNCBiaXQpIGNsb2Nrc2VxXG4gICAgICBjbG9ja3NlcSA9IF9jbG9ja3NlcSA9IChzZWVkQnl0ZXNbNl0gPDwgOCB8IHNlZWRCeXRlc1s3XSkgJiAweDNmZmY7XG4gICAgfVxuICB9XG5cbiAgLy8gVVVJRCB0aW1lc3RhbXBzIGFyZSAxMDAgbmFuby1zZWNvbmQgdW5pdHMgc2luY2UgdGhlIEdyZWdvcmlhbiBlcG9jaCxcbiAgLy8gKDE1ODItMTAtMTUgMDA6MDApLiAgSlNOdW1iZXJzIGFyZW4ndCBwcmVjaXNlIGVub3VnaCBmb3IgdGhpcywgc29cbiAgLy8gdGltZSBpcyBoYW5kbGVkIGludGVybmFsbHkgYXMgJ21zZWNzJyAoaW50ZWdlciBtaWxsaXNlY29uZHMpIGFuZCAnbnNlY3MnXG4gIC8vICgxMDAtbmFub3NlY29uZHMgb2Zmc2V0IGZyb20gbXNlY3MpIHNpbmNlIHVuaXggZXBvY2gsIDE5NzAtMDEtMDEgMDA6MDAuXG4gIHZhciBtc2VjcyA9IG9wdGlvbnMubXNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubXNlY3MgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAvLyBQZXIgNC4yLjEuMiwgdXNlIGNvdW50IG9mIHV1aWQncyBnZW5lcmF0ZWQgZHVyaW5nIHRoZSBjdXJyZW50IGNsb2NrXG4gIC8vIGN5Y2xlIHRvIHNpbXVsYXRlIGhpZ2hlciByZXNvbHV0aW9uIGNsb2NrXG4gIHZhciBuc2VjcyA9IG9wdGlvbnMubnNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNlY3MgOiBfbGFzdE5TZWNzICsgMTtcblxuICAvLyBUaW1lIHNpbmNlIGxhc3QgdXVpZCBjcmVhdGlvbiAoaW4gbXNlY3MpXG4gIHZhciBkdCA9IChtc2VjcyAtIF9sYXN0TVNlY3MpICsgKG5zZWNzIC0gX2xhc3ROU2VjcykvMTAwMDA7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIEJ1bXAgY2xvY2tzZXEgb24gY2xvY2sgcmVncmVzc2lvblxuICBpZiAoZHQgPCAwICYmIG9wdGlvbnMuY2xvY2tzZXEgPT09IHVuZGVmaW5lZCkge1xuICAgIGNsb2Nrc2VxID0gY2xvY2tzZXEgKyAxICYgMHgzZmZmO1xuICB9XG5cbiAgLy8gUmVzZXQgbnNlY3MgaWYgY2xvY2sgcmVncmVzc2VzIChuZXcgY2xvY2tzZXEpIG9yIHdlJ3ZlIG1vdmVkIG9udG8gYSBuZXdcbiAgLy8gdGltZSBpbnRlcnZhbFxuICBpZiAoKGR0IDwgMCB8fCBtc2VjcyA+IF9sYXN0TVNlY3MpICYmIG9wdGlvbnMubnNlY3MgPT09IHVuZGVmaW5lZCkge1xuICAgIG5zZWNzID0gMDtcbiAgfVxuXG4gIC8vIFBlciA0LjIuMS4yIFRocm93IGVycm9yIGlmIHRvbyBtYW55IHV1aWRzIGFyZSByZXF1ZXN0ZWRcbiAgaWYgKG5zZWNzID49IDEwMDAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1dWlkLnYxKCk6IENhblxcJ3QgY3JlYXRlIG1vcmUgdGhhbiAxME0gdXVpZHMvc2VjJyk7XG4gIH1cblxuICBfbGFzdE1TZWNzID0gbXNlY3M7XG4gIF9sYXN0TlNlY3MgPSBuc2VjcztcbiAgX2Nsb2Nrc2VxID0gY2xvY2tzZXE7XG5cbiAgLy8gUGVyIDQuMS40IC0gQ29udmVydCBmcm9tIHVuaXggZXBvY2ggdG8gR3JlZ29yaWFuIGVwb2NoXG4gIG1zZWNzICs9IDEyMjE5MjkyODAwMDAwO1xuXG4gIC8vIGB0aW1lX2xvd2BcbiAgdmFyIHRsID0gKChtc2VjcyAmIDB4ZmZmZmZmZikgKiAxMDAwMCArIG5zZWNzKSAlIDB4MTAwMDAwMDAwO1xuICBiW2krK10gPSB0bCA+Pj4gMjQgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gMTYgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsICYgMHhmZjtcblxuICAvLyBgdGltZV9taWRgXG4gIHZhciB0bWggPSAobXNlY3MgLyAweDEwMDAwMDAwMCAqIDEwMDAwKSAmIDB4ZmZmZmZmZjtcbiAgYltpKytdID0gdG1oID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdG1oICYgMHhmZjtcblxuICAvLyBgdGltZV9oaWdoX2FuZF92ZXJzaW9uYFxuICBiW2krK10gPSB0bWggPj4+IDI0ICYgMHhmIHwgMHgxMDsgLy8gaW5jbHVkZSB2ZXJzaW9uXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMTYgJiAweGZmO1xuXG4gIC8vIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYCAoUGVyIDQuMi4yIC0gaW5jbHVkZSB2YXJpYW50KVxuICBiW2krK10gPSBjbG9ja3NlcSA+Pj4gOCB8IDB4ODA7XG5cbiAgLy8gYGNsb2NrX3NlcV9sb3dgXG4gIGJbaSsrXSA9IGNsb2Nrc2VxICYgMHhmZjtcblxuICAvLyBgbm9kZWBcbiAgZm9yICh2YXIgbiA9IDA7IG4gPCA2OyArK24pIHtcbiAgICBiW2kgKyBuXSA9IG5vZGVbbl07XG4gIH1cblxuICByZXR1cm4gYnVmID8gYnVmIDogYnl0ZXNUb1V1aWQoYik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdjE7XG4iLCJmdW5jdGlvbiBBY2NvcmRpb24ocHJvcHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFjY29yZGlvbiBhY2NvcmRpb24taWNvbiBhY2NvcmRpb24tbGlzdFwiPlxuICAgICAgICAgICAge3Byb3BzLml0ZW1zLm1hcChpdGVtID0+IChcbiAgICAgICAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJhY2NvcmRpb24tc2VjdGlvblwiIGtleT17aXRlbS5pZH0+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbCB0YWJJbmRleD1cIjBcIiBjbGFzc05hbWU9XCJhY2NvcmRpb24tdG9nZ2xlXCIgaHRtbEZvcj1cImFjY29yZGlvbi1zZWN0aW9uLTFcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLnRpdGxlfVxuICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFjY29yZGlvbi1jb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5jb250ZW50fVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L3NlY3Rpb24+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgQWNjb3JkaW9uOyIsImltcG9ydCBBY2NvcmRpb24gZnJvbSAnLi9BY2NvcmRpb24nO1xuaW1wb3J0IHV1aWR2MSBmcm9tICd1dWlkL3YxJztcblxuY2xhc3MgSnNvblBhcnNlciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5nZXRBcGlEYXRhKCk7XG4gICAgfVxuXG4gICAgbWFwRGF0YShqc29uRGF0YSkge1xuICAgICAgICBjb25zdCBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG4gICAgICAgIC8vIEdldCB0aGUgb2JqZWN0IGNvbnRhaW5pbmcgaXRlbXMgZnJvbSBKU09OXG4gICAgICAgIGxldCBpdGVtcyA9IHRoaXMuZ2V0T2JqZWN0UHJvcChqc29uRGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA/IGZpZWxkTWFwLml0ZW1Db250YWluZXIuc3BsaXQoJy4nKSA6IFtdKTtcbiAgICAgICAgaWYgKCFpdGVtcyB8fCBPYmplY3Qua2V5cyhpdGVtcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWFwIHRoZSBkYXRhIGl0ZW1zXG4gICAgICAgIGl0ZW1zID0gaXRlbXMubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgICAgIGlkOiB1dWlkdjEoKSxcbiAgICAgICAgICAgIHRpdGxlOiB0aGlzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAudGl0bGUuc3BsaXQoJy4nKSksXG4gICAgICAgICAgICBjb250ZW50OiB0aGlzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAuY29udGVudC5zcGxpdCgnLicpKVxuICAgICAgICB9KSk7XG4gICAgICAgIC8vIFJlbW92ZSBvYmplY3RzIHdpdGggbWlzc2luZyBmaWVsZHNcbiAgICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLmlkICYmIGl0ZW0udGl0bGUgJiYgaXRlbS5jb250ZW50O1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgZ2V0T2JqZWN0UHJvcChvYmosIGtleXMpIHtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleXNbaV0pKSB7XG4gICAgICAgICAgICAgICAgb2JqID0gb2JqW2tleXNbaV1dO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBtYXAga2V5Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIGdldEFwaURhdGEoKSB7XG4gICAgICAgIGZldGNoKHRoaXMucHJvcHMudXJsKVxuICAgICAgICAgICAgLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLm1hcERhdGEocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8IE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHttZXNzYWdlOiAnRW1wdHkgZGF0YSd9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTG9hZGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogZGF0YVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzTG9hZGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHtlcnJvciwgaXNMb2FkZWQsIGl0ZW1zfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXY+RXJyb3I6IHtlcnJvci5tZXNzYWdlfTwvZGl2PjtcbiAgICAgICAgfSBlbHNlIGlmICghaXNMb2FkZWQpIHtcbiAgICAgICAgICAgIHJldHVybiA8ZGl2PkxvYWRpbmcuLi48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxBY2NvcmRpb24gaXRlbXM9e2l0ZW1zfS8+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBKc29uUGFyc2VyOyIsImltcG9ydCBKc29uUGFyc2VyIGZyb20gJy4vQ29tcG9uZW50cy9Kc29uUGFyc2VyJztcblxuY29uc3QgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG5jb25zdCBkb21FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kSnNvblJlbmRlckVsZW1lbnQpO1xuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPEpzb25QYXJzZXIgdXJsPXtkb21FbGVtZW50LmRhdGFzZXQudXJsfSBmaWVsZE1hcD17SlNPTi5wYXJzZShkb21FbGVtZW50LmRhdGFzZXQuZmllbGRtYXApfS8+LFxuICAgIGRvbUVsZW1lbnRcbik7Il19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJGcm9udC9JbmRleEZyb250LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG52YXIgYnl0ZVRvSGV4ID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG59XG5cbmZ1bmN0aW9uIGJ5dGVzVG9VdWlkKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBidGggPSBieXRlVG9IZXg7XG4gIC8vIGpvaW4gdXNlZCB0byBmaXggbWVtb3J5IGlzc3VlIGNhdXNlZCBieSBjb25jYXRlbmF0aW9uOiBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMTc1I2M0XG4gIHJldHVybiAoW2J0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sIFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV1dKS5qb2luKCcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBieXRlc1RvVXVpZDtcblxufSx7fV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxuXG4vLyBnZXRSYW5kb21WYWx1ZXMgbmVlZHMgdG8gYmUgaW52b2tlZCBpbiBhIGNvbnRleHQgd2hlcmUgXCJ0aGlzXCIgaXMgYSBDcnlwdG9cbi8vIGltcGxlbWVudGF0aW9uLiBBbHNvLCBmaW5kIHRoZSBjb21wbGV0ZSBpbXBsZW1lbnRhdGlvbiBvZiBjcnlwdG8gb24gSUUxMS5cbnZhciBnZXRSYW5kb21WYWx1ZXMgPSAodHlwZW9mKGNyeXB0bykgIT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mKG1zQ3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93Lm1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcyA9PSAnZnVuY3Rpb24nICYmIG1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKG1zQ3J5cHRvKSk7XG5cbmlmIChnZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hhdHdnUk5HKCkge1xuICAgIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufSBlbHNlIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgcm5kcyA9IG5ldyBBcnJheSgxNik7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXRoUk5HKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBybmRzO1xuICB9O1xufVxuXG59LHt9XSwzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBybmcgPSByZXF1aXJlKCcuL2xpYi9ybmcnKTtcbnZhciBieXRlc1RvVXVpZCA9IHJlcXVpcmUoJy4vbGliL2J5dGVzVG9VdWlkJyk7XG5cbi8vICoqYHYxKClgIC0gR2VuZXJhdGUgdGltZS1iYXNlZCBVVUlEKipcbi8vXG4vLyBJbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vTGlvc0svVVVJRC5qc1xuLy8gYW5kIGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS91dWlkLmh0bWxcblxudmFyIF9ub2RlSWQ7XG52YXIgX2Nsb2Nrc2VxO1xuXG4vLyBQcmV2aW91cyB1dWlkIGNyZWF0aW9uIHRpbWVcbnZhciBfbGFzdE1TZWNzID0gMDtcbnZhciBfbGFzdE5TZWNzID0gMDtcblxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkIGZvciBBUEkgZGV0YWlsc1xuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIHZhciBiID0gYnVmIHx8IFtdO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgbm9kZSA9IG9wdGlvbnMubm9kZSB8fCBfbm9kZUlkO1xuICB2YXIgY2xvY2tzZXEgPSBvcHRpb25zLmNsb2Nrc2VxICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNsb2Nrc2VxIDogX2Nsb2Nrc2VxO1xuXG4gIC8vIG5vZGUgYW5kIGNsb2Nrc2VxIG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgdG8gcmFuZG9tIHZhbHVlcyBpZiB0aGV5J3JlIG5vdFxuICAvLyBzcGVjaWZpZWQuICBXZSBkbyB0aGlzIGxhemlseSB0byBtaW5pbWl6ZSBpc3N1ZXMgcmVsYXRlZCB0byBpbnN1ZmZpY2llbnRcbiAgLy8gc3lzdGVtIGVudHJvcHkuICBTZWUgIzE4OVxuICBpZiAobm9kZSA9PSBudWxsIHx8IGNsb2Nrc2VxID09IG51bGwpIHtcbiAgICB2YXIgc2VlZEJ5dGVzID0gcm5nKCk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgLy8gUGVyIDQuNSwgY3JlYXRlIGFuZCA0OC1iaXQgbm9kZSBpZCwgKDQ3IHJhbmRvbSBiaXRzICsgbXVsdGljYXN0IGJpdCA9IDEpXG4gICAgICBub2RlID0gX25vZGVJZCA9IFtcbiAgICAgICAgc2VlZEJ5dGVzWzBdIHwgMHgwMSxcbiAgICAgICAgc2VlZEJ5dGVzWzFdLCBzZWVkQnl0ZXNbMl0sIHNlZWRCeXRlc1szXSwgc2VlZEJ5dGVzWzRdLCBzZWVkQnl0ZXNbNV1cbiAgICAgIF07XG4gICAgfVxuICAgIGlmIChjbG9ja3NlcSA9PSBudWxsKSB7XG4gICAgICAvLyBQZXIgNC4yLjIsIHJhbmRvbWl6ZSAoMTQgYml0KSBjbG9ja3NlcVxuICAgICAgY2xvY2tzZXEgPSBfY2xvY2tzZXEgPSAoc2VlZEJ5dGVzWzZdIDw8IDggfCBzZWVkQnl0ZXNbN10pICYgMHgzZmZmO1xuICAgIH1cbiAgfVxuXG4gIC8vIFVVSUQgdGltZXN0YW1wcyBhcmUgMTAwIG5hbm8tc2Vjb25kIHVuaXRzIHNpbmNlIHRoZSBHcmVnb3JpYW4gZXBvY2gsXG4gIC8vICgxNTgyLTEwLTE1IDAwOjAwKS4gIEpTTnVtYmVycyBhcmVuJ3QgcHJlY2lzZSBlbm91Z2ggZm9yIHRoaXMsIHNvXG4gIC8vIHRpbWUgaXMgaGFuZGxlZCBpbnRlcm5hbGx5IGFzICdtc2VjcycgKGludGVnZXIgbWlsbGlzZWNvbmRzKSBhbmQgJ25zZWNzJ1xuICAvLyAoMTAwLW5hbm9zZWNvbmRzIG9mZnNldCBmcm9tIG1zZWNzKSBzaW5jZSB1bml4IGVwb2NoLCAxOTcwLTAxLTAxIDAwOjAwLlxuICB2YXIgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuICB2YXIgbnNlY3MgPSBvcHRpb25zLm5zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zZWNzIDogX2xhc3ROU2VjcyArIDE7XG5cbiAgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuICB2YXIgZHQgPSAobXNlY3MgLSBfbGFzdE1TZWNzKSArIChuc2VjcyAtIF9sYXN0TlNlY3MpLzEwMDAwO1xuXG4gIC8vIFBlciA0LjIuMS4yLCBCdW1wIGNsb2Nrc2VxIG9uIGNsb2NrIHJlZ3Jlc3Npb25cbiAgaWYgKGR0IDwgMCAmJiBvcHRpb25zLmNsb2Nrc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBjbG9ja3NlcSA9IGNsb2Nrc2VxICsgMSAmIDB4M2ZmZjtcbiAgfVxuXG4gIC8vIFJlc2V0IG5zZWNzIGlmIGNsb2NrIHJlZ3Jlc3NlcyAobmV3IGNsb2Nrc2VxKSBvciB3ZSd2ZSBtb3ZlZCBvbnRvIGEgbmV3XG4gIC8vIHRpbWUgaW50ZXJ2YWxcbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH1cblxuICAvLyBQZXIgNC4yLjEuMiBUaHJvdyBlcnJvciBpZiB0b28gbWFueSB1dWlkcyBhcmUgcmVxdWVzdGVkXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXVpZC52MSgpOiBDYW5cXCd0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlYycpO1xuICB9XG5cbiAgX2xhc3RNU2VjcyA9IG1zZWNzO1xuICBfbGFzdE5TZWNzID0gbnNlY3M7XG4gIF9jbG9ja3NlcSA9IGNsb2Nrc2VxO1xuXG4gIC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICAvLyBgdGltZV9sb3dgXG4gIHZhciB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gdGwgPj4+IDI0ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDE2ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfbWlkYFxuICB2YXIgdG1oID0gKG1zZWNzIC8gMHgxMDAwMDAwMDAgKiAxMDAwMCkgJiAweGZmZmZmZmY7XG4gIGJbaSsrXSA9IHRtaCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRtaCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfaGlnaF9hbmRfdmVyc2lvbmBcbiAgYltpKytdID0gdG1oID4+PiAyNCAmIDB4ZiB8IDB4MTA7IC8vIGluY2x1ZGUgdmVyc2lvblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjtcblxuICAvLyBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGAgKFBlciA0LjIuMiAtIGluY2x1ZGUgdmFyaWFudClcbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwO1xuXG4gIC8vIGBjbG9ja19zZXFfbG93YFxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgLy8gYG5vZGVgXG4gIGZvciAodmFyIG4gPSAwOyBuIDwgNjsgKytuKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiA/IGJ1ZiA6IGJ5dGVzVG9VdWlkKGIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHYxO1xuXG59LHtcIi4vbGliL2J5dGVzVG9VdWlkXCI6MSxcIi4vbGliL3JuZ1wiOjJ9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBBY2NvcmRpb24ocHJvcHMpIHtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgIGNsYXNzTmFtZTogXCJhY2NvcmRpb24gYWNjb3JkaW9uLWljb24gYWNjb3JkaW9uLWxpc3RcIlxuICB9LCBwcm9wcy5pdGVtcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcInNlY3Rpb25cIiwge1xuICAgICAgY2xhc3NOYW1lOiBcImFjY29yZGlvbi1zZWN0aW9uXCIsXG4gICAgICBrZXk6IGl0ZW0uaWRcbiAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIiwge1xuICAgICAgdGFiSW5kZXg6IFwiMFwiLFxuICAgICAgY2xhc3NOYW1lOiBcImFjY29yZGlvbi10b2dnbGVcIixcbiAgICAgIGh0bWxGb3I6IFwiYWNjb3JkaW9uLXNlY3Rpb24tMVwiXG4gICAgfSwgaXRlbS50aXRsZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgY2xhc3NOYW1lOiBcImFjY29yZGlvbi1jb250ZW50XCJcbiAgICB9LCBpdGVtLmNvbnRlbnQpKTtcbiAgfSkpO1xufVxuXG52YXIgX2RlZmF1bHQgPSBBY2NvcmRpb247XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9BY2NvcmRpb24gPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0FjY29yZGlvblwiKSk7XG5cbnZhciBfdiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcInV1aWQvdjFcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9XG5cbmZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKGNhbGwgJiYgKF90eXBlb2YoY2FsbCkgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikpIHsgcmV0dXJuIGNhbGw7IH0gcmV0dXJuIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZik7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxudmFyIEpzb25QYXJzZXIgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKEpzb25QYXJzZXIsIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIEpzb25QYXJzZXIoKSB7XG4gICAgdmFyIF90aGlzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEpzb25QYXJzZXIpO1xuXG4gICAgX3RoaXMgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCBfZ2V0UHJvdG90eXBlT2YoSnNvblBhcnNlcikuY2FsbCh0aGlzKSk7XG4gICAgX3RoaXMuc3RhdGUgPSB7XG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgIGl0ZW1zOiBbXVxuICAgIH07XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKEpzb25QYXJzZXIsIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5nZXRBcGlEYXRhKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcIm1hcERhdGFcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gbWFwRGF0YShqc29uRGF0YSkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7IC8vIEdldCB0aGUgb2JqZWN0IGNvbnRhaW5pbmcgaXRlbXMgZnJvbSBKU09OXG5cbiAgICAgIHZhciBpdGVtcyA9IHRoaXMuZ2V0T2JqZWN0UHJvcChqc29uRGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA/IGZpZWxkTWFwLml0ZW1Db250YWluZXIuc3BsaXQoJy4nKSA6IFtdKTtcblxuICAgICAgaWYgKCFpdGVtcyB8fCBPYmplY3Qua2V5cyhpdGVtcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gLy8gTWFwIHRoZSBkYXRhIGl0ZW1zXG5cblxuICAgICAgaXRlbXMgPSBpdGVtcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogKDAsIF92LmRlZmF1bHQpKCksXG4gICAgICAgICAgdGl0bGU6IF90aGlzMi5nZXRPYmplY3RQcm9wKGl0ZW0sIGZpZWxkTWFwLnRpdGxlLnNwbGl0KCcuJykpLFxuICAgICAgICAgIGNvbnRlbnQ6IF90aGlzMi5nZXRPYmplY3RQcm9wKGl0ZW0sIGZpZWxkTWFwLmNvbnRlbnQuc3BsaXQoJy4nKSlcbiAgICAgICAgfTtcbiAgICAgIH0pOyAvLyBSZW1vdmUgb2JqZWN0cyB3aXRoIG1pc3NpbmcgZmllbGRzXG5cbiAgICAgIGl0ZW1zID0gaXRlbXMuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLmlkICYmIGl0ZW0udGl0bGUgJiYgaXRlbS5jb250ZW50O1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImdldE9iamVjdFByb3BcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0T2JqZWN0UHJvcChvYmosIGtleXMpIHtcbiAgICAgIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXlzW2ldKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtrZXlzW2ldXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBtYXAga2V5Jyk7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0QXBpRGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRBcGlEYXRhKCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIGZldGNoKHRoaXMucHJvcHMudXJsKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBfdGhpczMubWFwRGF0YShyZXN1bHQpO1xuXG4gICAgICAgIGlmICghZGF0YSB8fCBPYmplY3Qua2V5cyhkYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBfdGhpczMuc2V0U3RhdGUoe1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ0VtcHR5IGRhdGEnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMy5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgaXRlbXM6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgX3RoaXMzLnNldFN0YXRlKHtcbiAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICBlcnJvcjogZXJyb3JcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSA9IHRoaXMuc3RhdGUsXG4gICAgICAgICAgZXJyb3IgPSBfdGhpcyRzdGF0ZS5lcnJvcixcbiAgICAgICAgICBpc0xvYWRlZCA9IF90aGlzJHN0YXRlLmlzTG9hZGVkLFxuICAgICAgICAgIGl0ZW1zID0gX3RoaXMkc3RhdGUuaXRlbXM7XG5cbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBcIkVycm9yOiBcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBcIkxvYWRpbmcuLi5cIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChfQWNjb3JkaW9uLmRlZmF1bHQsIHtcbiAgICAgICAgICBpdGVtczogaXRlbXNcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIEpzb25QYXJzZXI7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IEpzb25QYXJzZXI7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0FjY29yZGlvblwiOjQsXCJ1dWlkL3YxXCI6M31dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfSnNvblBhcnNlciA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vQ29tcG9uZW50cy9Kc29uUGFyc2VyXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xudmFyIGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5SZWFjdERPTS5yZW5kZXIoUmVhY3QuY3JlYXRlRWxlbWVudChfSnNvblBhcnNlci5kZWZhdWx0LCB7XG4gIHVybDogZG9tRWxlbWVudC5kYXRhc2V0LnVybCxcbiAgZmllbGRNYXA6IEpTT04ucGFyc2UoZG9tRWxlbWVudC5kYXRhc2V0LmZpZWxkbWFwKVxufSksIGRvbUVsZW1lbnQpO1xuXG59LHtcIi4vQ29tcG9uZW50cy9Kc29uUGFyc2VyXCI6NX1dfSx7fSxbNl0pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZkWFZwWkM5c2FXSXZZbmwwWlhOVWIxVjFhV1F1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12ZFhWcFpDOXNhV0l2Y201bkxXSnliM2R6WlhJdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmRYVnBaQzkyTVM1cWN5SXNJbk52ZFhKalpTOXFjeTlHY205dWRDOURiMjF3YjI1bGJuUnpMMEZqWTI5eVpHbHZiaTVxY3lJc0luTnZkWEpqWlM5cWN5OUdjbTl1ZEM5RGIyMXdiMjVsYm5SekwwcHpiMjVRWVhKelpYSXVhbk1pTENKemIzVnlZMlV2YW5NdlJuSnZiblF2U1c1a1pYaEdjbTl1ZEM1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHRCUTBGQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUTNoQ1FUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEJRMnhEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenM3T3pzN096czdRVU0zUjBFc1UwRkJVeXhUUVVGVUxFTkJRVzFDTEV0QlFXNUNMRVZCUVRCQ08wRkJRM1JDTEZOQlEwazdRVUZCU3l4SlFVRkJMRk5CUVZNc1JVRkJRenRCUVVGbUxFdEJRMHNzUzBGQlN5eERRVUZETEV0QlFVNHNRMEZCV1N4SFFVRmFMRU5CUVdkQ0xGVkJRVUVzU1VGQlNUdEJRVUZCTEZkQlEycENPMEZCUVZNc1RVRkJRU3hUUVVGVExFVkJRVU1zYlVKQlFXNUNPMEZCUVhWRExFMUJRVUVzUjBGQlJ5eEZRVUZGTEVsQlFVa3NRMEZCUXp0QlFVRnFSQ3hQUVVOSk8wRkJRVThzVFVGQlFTeFJRVUZSTEVWQlFVTXNSMEZCYUVJN1FVRkJiMElzVFVGQlFTeFRRVUZUTEVWQlFVTXNhMEpCUVRsQ08wRkJRV2xFTEUxQlFVRXNUMEZCVHl4RlFVRkRPMEZCUVhwRUxFOUJRMHNzU1VGQlNTeERRVUZETEV0QlJGWXNRMEZFU2l4RlFVbEpPMEZCUVVzc1RVRkJRU3hUUVVGVExFVkJRVU03UVVGQlppeFBRVU5MTEVsQlFVa3NRMEZCUXl4UFFVUldMRU5CU2tvc1EwRkVhVUk3UVVGQlFTeEhRVUZ3UWl4RFFVUk1MRU5CUkVvN1FVRmpTRHM3WlVGRll5eFRPenM3T3pzN096czdPenRCUTJwQ1pqczdRVUZEUVRzN096czdPenM3T3pzN096czdPenM3T3pzN096dEpRVVZOTEZVN096czdPMEZCUTBZc2QwSkJRV003UVVGQlFUczdRVUZCUVRzN1FVRkRWanRCUVVOQkxGVkJRVXNzUzBGQlRDeEhRVUZoTzBGQlExUXNUVUZCUVN4TFFVRkxMRVZCUVVVc1NVRkVSVHRCUVVWVUxFMUJRVUVzVVVGQlVTeEZRVUZGTEV0QlJrUTdRVUZIVkN4TlFVRkJMRXRCUVVzc1JVRkJSVHRCUVVoRkxFdEJRV0k3UVVGR1ZUdEJRVTlpT3pzN08zZERRVVZ0UWp0QlFVTm9RaXhYUVVGTExGVkJRVXc3UVVGRFNEczdPelJDUVVWUExGRXNSVUZCVlR0QlFVRkJPenRCUVVOa0xGVkJRVTBzVVVGQlVTeEhRVUZITEV0QlFVc3NTMEZCVEN4RFFVRlhMRkZCUVRWQ0xFTkJSR01zUTBGRlpEczdRVUZEUVN4VlFVRkpMRXRCUVVzc1IwRkJSeXhMUVVGTExHRkJRVXdzUTBGQmJVSXNVVUZCYmtJc1JVRkJOa0lzVVVGQlVTeERRVUZETEdGQlFWUXNSMEZCZVVJc1VVRkJVU3hEUVVGRExHRkJRVlFzUTBGQmRVSXNTMEZCZGtJc1EwRkJOa0lzUjBGQk4wSXNRMEZCZWtJc1IwRkJOa1FzUlVGQk1VWXNRMEZCV2pzN1FVRkRRU3hWUVVGSkxFTkJRVU1zUzBGQlJDeEpRVUZWTEUxQlFVMHNRMEZCUXl4SlFVRlFMRU5CUVZrc1MwRkJXaXhGUVVGdFFpeE5RVUZ1UWl4TFFVRTRRaXhEUVVFMVF5eEZRVUVyUXp0QlFVTXpRenRCUVVOSUxFOUJUbUVzUTBGUFpEczdPMEZCUTBFc1RVRkJRU3hMUVVGTExFZEJRVWNzUzBGQlN5eERRVUZETEVkQlFVNHNRMEZCVlN4VlFVRkJMRWxCUVVrN1FVRkJRU3hsUVVGTE8wRkJRM1pDTEZWQlFVRXNSVUZCUlN4RlFVRkZMR2xDUVVSdFFqdEJRVVYyUWl4VlFVRkJMRXRCUVVzc1JVRkJSU3hOUVVGSkxFTkJRVU1zWVVGQlRDeERRVUZ0UWl4SlFVRnVRaXhGUVVGNVFpeFJRVUZSTEVOQlFVTXNTMEZCVkN4RFFVRmxMRXRCUVdZc1EwRkJjVUlzUjBGQmNrSXNRMEZCZWtJc1EwRkdaMEk3UVVGSGRrSXNWVUZCUVN4UFFVRlBMRVZCUVVVc1RVRkJTU3hEUVVGRExHRkJRVXdzUTBGQmJVSXNTVUZCYmtJc1JVRkJlVUlzVVVGQlVTeERRVUZETEU5QlFWUXNRMEZCYVVJc1MwRkJha0lzUTBGQmRVSXNSMEZCZGtJc1EwRkJla0k3UVVGSVl5eFRRVUZNTzBGQlFVRXNUMEZCWkN4RFFVRlNMRU5CVW1Nc1EwRmhaRHM3UVVGRFFTeE5RVUZCTEV0QlFVc3NSMEZCUnl4TFFVRkxMRU5CUVVNc1RVRkJUaXhEUVVGaExGVkJRVlVzU1VGQlZpeEZRVUZuUWp0QlFVTnFReXhsUVVGUExFbEJRVWtzUTBGQlF5eEZRVUZNTEVsQlFWY3NTVUZCU1N4RFFVRkRMRXRCUVdoQ0xFbEJRWGxDTEVsQlFVa3NRMEZCUXl4UFFVRnlRenRCUVVOSUxFOUJSazhzUTBGQlVqdEJRVWxCTEdGQlFVOHNTMEZCVUR0QlFVTklPenM3YTBOQlJXRXNSeXhGUVVGTExFa3NSVUZCVFR0QlFVTnlRaXhWUVVGSkxFbEJRVWtzUTBGQlF5eE5RVUZNTEV0QlFXZENMRU5CUVhCQ0xFVkJRWFZDTzBGQlEyNUNMR1ZCUVU4c1IwRkJVRHRCUVVOSU96dEJRVVZFTEZkQlFVc3NTVUZCU1N4RFFVRkRMRWRCUVVjc1EwRkJZaXhGUVVGblFpeERRVUZETEVkQlFVY3NTVUZCU1N4RFFVRkRMRTFCUVhwQ0xFVkJRV2xETEVOQlFVTXNSVUZCYkVNc1JVRkJjME03UVVGRGJFTXNXVUZCU1N4SFFVRkhMRU5CUVVNc1kwRkJTaXhEUVVGdFFpeEpRVUZKTEVOQlFVTXNRMEZCUkN4RFFVRjJRaXhEUVVGS0xFVkJRV2xETzBGQlF6ZENMRlZCUVVFc1IwRkJSeXhIUVVGSExFZEJRVWNzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUkN4RFFVRk1MRU5CUVZRN1FVRkRTQ3hUUVVaRUxFMUJSVTg3UVVGRFNDeFZRVUZCTEU5QlFVOHNRMEZCUXl4SFFVRlNMRU5CUVZrc2FVSkJRVm83UVVGRFFTeHBRa0ZCVHl4SlFVRlFPMEZCUTBnN1FVRkRTanM3UVVGRlJDeGhRVUZQTEVkQlFWQTdRVUZEU0RzN08ybERRVVZaTzBGQlFVRTdPMEZCUTFRc1RVRkJRU3hMUVVGTExFTkJRVU1zUzBGQlN5eExRVUZNTEVOQlFWY3NSMEZCV2l4RFFVRk1MRU5CUTBzc1NVRkVUQ3hEUVVOVkxGVkJRVUVzUjBGQlJ6dEJRVUZCTEdWQlFVa3NSMEZCUnl4RFFVRkRMRWxCUVVvc1JVRkJTanRCUVVGQkxFOUJSR0lzUlVGRlN5eEpRVVpNTEVOQlIxRXNWVUZCUXl4TlFVRkVMRVZCUVZrN1FVRkRVaXhaUVVGTkxFbEJRVWtzUjBGQlJ5eE5RVUZKTEVOQlFVTXNUMEZCVEN4RFFVRmhMRTFCUVdJc1EwRkJZanM3UVVGRFFTeFpRVUZKTEVOQlFVTXNTVUZCUkN4SlFVRlRMRTFCUVUwc1EwRkJReXhKUVVGUUxFTkJRVmtzU1VGQldpeEZRVUZyUWl4TlFVRnNRaXhMUVVFMlFpeERRVUV4UXl4RlFVRTJRenRCUVVONlF5eFZRVUZCTEUxQlFVa3NRMEZCUXl4UlFVRk1MRU5CUVdNN1FVRkRWaXhaUVVGQkxFdEJRVXNzUlVGQlJUdEJRVUZETEdOQlFVRXNUMEZCVHl4RlFVRkZPMEZCUVZZc1lVRkVSenRCUVVWV0xGbEJRVUVzVVVGQlVTeEZRVUZGTzBGQlJrRXNWMEZCWkRzN1FVRkpRVHRCUVVOSU96dEJRVVZFTEZGQlFVRXNUVUZCU1N4RFFVRkRMRkZCUVV3c1EwRkJZenRCUVVOV0xGVkJRVUVzVVVGQlVTeEZRVUZGTEVsQlJFRTdRVUZGVml4VlFVRkJMRXRCUVVzc1JVRkJSVHRCUVVaSExGTkJRV1E3UVVGSlNDeFBRV3BDVkN4RlFXdENVU3hWUVVGRExFdEJRVVFzUlVGQlZ6dEJRVU5RTEZGQlFVRXNUVUZCU1N4RFFVRkRMRkZCUVV3c1EwRkJZenRCUVVOV0xGVkJRVUVzVVVGQlVTeEZRVUZGTEVsQlJFRTdRVUZGVml4VlFVRkJMRXRCUVVzc1JVRkJURHRCUVVaVkxGTkJRV1E3UVVGSlNDeFBRWFpDVkR0QlFYbENTRHM3T3paQ1FVVlJPMEZCUVVFc2QwSkJRelJDTEV0QlFVc3NTMEZFYWtNN1FVRkJRU3hWUVVORkxFdEJSRVlzWlVGRFJTeExRVVJHTzBGQlFVRXNWVUZEVXl4UlFVUlVMR1ZCUTFNc1VVRkVWRHRCUVVGQkxGVkJRMjFDTEV0QlJHNUNMR1ZCUTIxQ0xFdEJSRzVDT3p0QlFVVk1MRlZCUVVrc1MwRkJTaXhGUVVGWE8wRkJRMUFzWlVGQlR5dzBRMEZCWVN4TFFVRkxMRU5CUVVNc1QwRkJia0lzUTBGQlVEdEJRVU5JTEU5QlJrUXNUVUZGVHl4SlFVRkpMRU5CUVVNc1VVRkJUQ3hGUVVGbE8wRkJRMnhDTEdWQlFVOHNPRU5CUVZBN1FVRkRTQ3hQUVVaTkxFMUJSVUU3UVVGRFNDeGxRVU5KTEc5Q1FVRkRMR3RDUVVGRU8wRkJRVmNzVlVGQlFTeExRVUZMTEVWQlFVVTdRVUZCYkVJc1ZVRkVTanRCUVVkSU8wRkJRMG83T3pzN1JVRXpSbTlDTEV0QlFVc3NRMEZCUXl4VE96dGxRVGhHYUVJc1ZUczdPenM3TzBGRGFrZG1PenM3TzBGQlJVRXNTVUZCVFN4dlFrRkJiMElzUjBGQlJ5eDNRa0ZCTjBJN1FVRkRRU3hKUVVGTkxGVkJRVlVzUjBGQlJ5eFJRVUZSTEVOQlFVTXNZMEZCVkN4RFFVRjNRaXh2UWtGQmVFSXNRMEZCYmtJN1FVRkZRU3hSUVVGUkxFTkJRVU1zVFVGQlZDeERRVU5KTEc5Q1FVRkRMRzFDUVVGRU8wRkJRVmtzUlVGQlFTeEhRVUZITEVWQlFVVXNWVUZCVlN4RFFVRkRMRTlCUVZnc1EwRkJiVUlzUjBGQmNFTTdRVUZCZVVNc1JVRkJRU3hSUVVGUkxFVkJRVVVzU1VGQlNTeERRVUZETEV0QlFVd3NRMEZCVnl4VlFVRlZMRU5CUVVNc1QwRkJXQ3hEUVVGdFFpeFJRVUU1UWp0QlFVRnVSQ3hGUVVSS0xFVkJSVWtzVlVGR1NpSXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpS0daMWJtTjBhVzl1S0NsN1puVnVZM1JwYjI0Z2NpaGxMRzRzZENsN1puVnVZM1JwYjI0Z2J5aHBMR1lwZTJsbUtDRnVXMmxkS1h0cFppZ2haVnRwWFNsN2RtRnlJR005WENKbWRXNWpkR2x2Ymx3aVBUMTBlWEJsYjJZZ2NtVnhkV2x5WlNZbWNtVnhkV2x5WlR0cFppZ2haaVltWXlseVpYUjFjbTRnWXlocExDRXdLVHRwWmloMUtYSmxkSFZ5YmlCMUtHa3NJVEFwTzNaaGNpQmhQVzVsZHlCRmNuSnZjaWhjSWtOaGJtNXZkQ0JtYVc1a0lHMXZaSFZzWlNBblhDSXJhU3RjSWlkY0lpazdkR2h5YjNjZ1lTNWpiMlJsUFZ3aVRVOUVWVXhGWDA1UFZGOUdUMVZPUkZ3aUxHRjlkbUZ5SUhBOWJsdHBYVDE3Wlhod2IzSjBjenA3ZlgwN1pWdHBYVnN3WFM1allXeHNLSEF1Wlhod2IzSjBjeXhtZFc1amRHbHZiaWh5S1h0MllYSWdiajFsVzJsZFd6RmRXM0pkTzNKbGRIVnliaUJ2S0c1OGZISXBmU3h3TEhBdVpYaHdiM0owY3l4eUxHVXNiaXgwS1gxeVpYUjFjbTRnYmx0cFhTNWxlSEJ2Y25SemZXWnZjaWgyWVhJZ2RUMWNJbVoxYm1OMGFXOXVYQ0k5UFhSNWNHVnZaaUJ5WlhGMWFYSmxKaVp5WlhGMWFYSmxMR2s5TUR0cFBIUXViR1Z1WjNSb08ya3JLeWx2S0hSYmFWMHBPM0psZEhWeWJpQnZmWEpsZEhWeWJpQnlmU2tvS1NJc0lpOHFLbHh1SUNvZ1EyOXVkbVZ5ZENCaGNuSmhlU0J2WmlBeE5pQmllWFJsSUhaaGJIVmxjeUIwYnlCVlZVbEVJSE4wY21sdVp5Qm1iM0p0WVhRZ2IyWWdkR2hsSUdadmNtMDZYRzRnS2lCWVdGaFlXRmhZV0MxWVdGaFlMVmhZV0ZndFdGaFlXQzFZV0ZoWVdGaFlXRmhZV0ZoY2JpQXFMMXh1ZG1GeUlHSjVkR1ZVYjBobGVDQTlJRnRkTzF4dVptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQXlOVFk3SUNzcmFTa2dlMXh1SUNCaWVYUmxWRzlJWlhoYmFWMGdQU0FvYVNBcklEQjRNVEF3S1M1MGIxTjBjbWx1WnlneE5pa3VjM1ZpYzNSeUtERXBPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQmllWFJsYzFSdlZYVnBaQ2hpZFdZc0lHOW1abk5sZENrZ2UxeHVJQ0IyWVhJZ2FTQTlJRzltWm5ObGRDQjhmQ0F3TzF4dUlDQjJZWElnWW5Sb0lEMGdZbmwwWlZSdlNHVjRPMXh1SUNBdkx5QnFiMmx1SUhWelpXUWdkRzhnWm1sNElHMWxiVzl5ZVNCcGMzTjFaU0JqWVhWelpXUWdZbmtnWTI5dVkyRjBaVzVoZEdsdmJqb2dhSFIwY0hNNkx5OWlkV2R6TG1Ob2NtOXRhWFZ0TG05eVp5OXdMM1k0TDJsemMzVmxjeTlrWlhSaGFXdy9hV1E5TXpFM05TTmpORnh1SUNCeVpYUjFjbTRnS0Z0aWRHaGJZblZtVzJrcksxMWRMQ0JpZEdoYlluVm1XMmtySzExZExDQmNibHgwWW5Sb1cySjFabHRwS3l0ZFhTd2dZblJvVzJKMVpsdHBLeXRkWFN3Z0p5MG5MRnh1WEhSaWRHaGJZblZtVzJrcksxMWRMQ0JpZEdoYlluVm1XMmtySzExZExDQW5MU2NzWEc1Y2RHSjBhRnRpZFdaYmFTc3JYVjBzSUdKMGFGdGlkV1piYVNzclhWMHNJQ2N0Snl4Y2JseDBZblJvVzJKMVpsdHBLeXRkWFN3Z1luUm9XMkoxWmx0cEt5dGRYU3dnSnkwbkxGeHVYSFJpZEdoYlluVm1XMmtySzExZExDQmlkR2hiWW5WbVcya3JLMTFkTEZ4dVhIUmlkR2hiWW5WbVcya3JLMTFkTENCaWRHaGJZblZtVzJrcksxMWRMRnh1WEhSaWRHaGJZblZtVzJrcksxMWRMQ0JpZEdoYlluVm1XMmtySzExZFhTa3VhbTlwYmlnbkp5azdYRzU5WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1lubDBaWE5VYjFWMWFXUTdYRzRpTENJdkx5QlZibWx4ZFdVZ1NVUWdZM0psWVhScGIyNGdjbVZ4ZFdseVpYTWdZU0JvYVdkb0lIRjFZV3hwZEhrZ2NtRnVaRzl0SUNNZ1oyVnVaWEpoZEc5eUxpQWdTVzRnZEdobFhHNHZMeUJpY205M2MyVnlJSFJvYVhNZ2FYTWdZU0JzYVhSMGJHVWdZMjl0Y0d4cFkyRjBaV1FnWkhWbElIUnZJSFZ1YTI1dmQyNGdjWFZoYkdsMGVTQnZaaUJOWVhSb0xuSmhibVJ2YlNncFhHNHZMeUJoYm1RZ2FXNWpiMjV6YVhOMFpXNTBJSE4xY0hCdmNuUWdabTl5SUhSb1pTQmdZM0o1Y0hSdllDQkJVRWt1SUNCWFpTQmtieUIwYUdVZ1ltVnpkQ0IzWlNCallXNGdkbWxoWEc0dkx5Qm1aV0YwZFhKbExXUmxkR1ZqZEdsdmJseHVYRzR2THlCblpYUlNZVzVrYjIxV1lXeDFaWE1nYm1WbFpITWdkRzhnWW1VZ2FXNTJiMnRsWkNCcGJpQmhJR052Ym5SbGVIUWdkMmhsY21VZ1hDSjBhR2x6WENJZ2FYTWdZU0JEY25sd2RHOWNiaTh2SUdsdGNHeGxiV1Z1ZEdGMGFXOXVMaUJCYkhOdkxDQm1hVzVrSUhSb1pTQmpiMjF3YkdWMFpTQnBiWEJzWlcxbGJuUmhkR2x2YmlCdlppQmpjbmx3ZEc4Z2IyNGdTVVV4TVM1Y2JuWmhjaUJuWlhSU1lXNWtiMjFXWVd4MVpYTWdQU0FvZEhsd1pXOW1LR055ZVhCMGJ5a2dJVDBnSjNWdVpHVm1hVzVsWkNjZ0ppWWdZM0o1Y0hSdkxtZGxkRkpoYm1SdmJWWmhiSFZsY3lBbUppQmpjbmx3ZEc4dVoyVjBVbUZ1Wkc5dFZtRnNkV1Z6TG1KcGJtUW9ZM0o1Y0hSdktTa2dmSHhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQW9kSGx3Wlc5bUtHMXpRM0o1Y0hSdktTQWhQU0FuZFc1a1pXWnBibVZrSnlBbUppQjBlWEJsYjJZZ2QybHVaRzkzTG0xelEzSjVjSFJ2TG1kbGRGSmhibVJ2YlZaaGJIVmxjeUE5UFNBblpuVnVZM1JwYjI0bklDWW1JRzF6UTNKNWNIUnZMbWRsZEZKaGJtUnZiVlpoYkhWbGN5NWlhVzVrS0cxelEzSjVjSFJ2S1NrN1hHNWNibWxtSUNoblpYUlNZVzVrYjIxV1lXeDFaWE1wSUh0Y2JpQWdMeThnVjBoQlZGZEhJR055ZVhCMGJ5QlNUa2NnTFNCb2RIUndPaTh2ZDJscmFTNTNhR0YwZDJjdWIzSm5MM2RwYTJrdlEzSjVjSFJ2WEc0Z0lIWmhjaUJ5Ym1Sek9DQTlJRzVsZHlCVmFXNTBPRUZ5Y21GNUtERTJLVHNnTHk4Z1pYTnNhVzUwTFdScGMyRmliR1V0YkdsdVpTQnVieTExYm1SbFpseHVYRzRnSUcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnWm5WdVkzUnBiMjRnZDJoaGRIZG5VazVIS0NrZ2UxeHVJQ0FnSUdkbGRGSmhibVJ2YlZaaGJIVmxjeWh5Ym1Sek9DazdYRzRnSUNBZ2NtVjBkWEp1SUhKdVpITTRPMXh1SUNCOU8xeHVmU0JsYkhObElIdGNiaUFnTHk4Z1RXRjBhQzV5WVc1a2IyMG9LUzFpWVhObFpDQW9VazVIS1Z4dUlDQXZMMXh1SUNBdkx5QkpaaUJoYkd3Z1pXeHpaU0JtWVdsc2N5d2dkWE5sSUUxaGRHZ3VjbUZ1Wkc5dEtDa3VJQ0JKZENkeklHWmhjM1FzSUdKMWRDQnBjeUJ2WmlCMWJuTndaV05wWm1sbFpGeHVJQ0F2THlCeGRXRnNhWFI1TGx4dUlDQjJZWElnY201a2N5QTlJRzVsZHlCQmNuSmhlU2d4TmlrN1hHNWNiaUFnYlc5a2RXeGxMbVY0Y0c5eWRITWdQU0JtZFc1amRHbHZiaUJ0WVhSb1VrNUhLQ2tnZTF4dUlDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd0xDQnlPeUJwSUR3Z01UWTdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ2FXWWdLQ2hwSUNZZ01IZ3dNeWtnUFQwOUlEQXBJSElnUFNCTllYUm9MbkpoYm1SdmJTZ3BJQ29nTUhneE1EQXdNREF3TURBN1hHNGdJQ0FnSUNCeWJtUnpXMmxkSUQwZ2NpQStQajRnS0NocElDWWdNSGd3TXlrZ1BEd2dNeWtnSmlBd2VHWm1PMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkSFZ5YmlCeWJtUnpPMXh1SUNCOU8xeHVmVnh1SWl3aWRtRnlJSEp1WnlBOUlISmxjWFZwY21Vb0p5NHZiR2xpTDNKdVp5Y3BPMXh1ZG1GeUlHSjVkR1Z6Vkc5VmRXbGtJRDBnY21WeGRXbHlaU2duTGk5c2FXSXZZbmwwWlhOVWIxVjFhV1FuS1R0Y2JseHVMeThnS2lwZ2RqRW9LV0FnTFNCSFpXNWxjbUYwWlNCMGFXMWxMV0poYzJWa0lGVlZTVVFxS2x4dUx5OWNiaTh2SUVsdWMzQnBjbVZrSUdKNUlHaDBkSEJ6T2k4dloybDBhSFZpTG1OdmJTOU1hVzl6U3k5VlZVbEVMbXB6WEc0dkx5QmhibVFnYUhSMGNEb3ZMMlJ2WTNNdWNIbDBhRzl1TG05eVp5OXNhV0p5WVhKNUwzVjFhV1F1YUhSdGJGeHVYRzUyWVhJZ1gyNXZaR1ZKWkR0Y2JuWmhjaUJmWTJ4dlkydHpaWEU3WEc1Y2JpOHZJRkJ5WlhacGIzVnpJSFYxYVdRZ1kzSmxZWFJwYjI0Z2RHbHRaVnh1ZG1GeUlGOXNZWE4wVFZObFkzTWdQU0F3TzF4dWRtRnlJRjlzWVhOMFRsTmxZM01nUFNBd08xeHVYRzR2THlCVFpXVWdhSFIwY0hNNkx5OW5hWFJvZFdJdVkyOXRMMkp5YjI5bVlTOXViMlJsTFhWMWFXUWdabTl5SUVGUVNTQmtaWFJoYVd4elhHNW1kVzVqZEdsdmJpQjJNU2h2Y0hScGIyNXpMQ0JpZFdZc0lHOW1abk5sZENrZ2UxeHVJQ0IyWVhJZ2FTQTlJR0oxWmlBbUppQnZabVp6WlhRZ2ZId2dNRHRjYmlBZ2RtRnlJR0lnUFNCaWRXWWdmSHdnVzEwN1hHNWNiaUFnYjNCMGFXOXVjeUE5SUc5d2RHbHZibk1nZkh3Z2UzMDdYRzRnSUhaaGNpQnViMlJsSUQwZ2IzQjBhVzl1Y3k1dWIyUmxJSHg4SUY5dWIyUmxTV1E3WEc0Z0lIWmhjaUJqYkc5amEzTmxjU0E5SUc5d2RHbHZibk11WTJ4dlkydHpaWEVnSVQwOUlIVnVaR1ZtYVc1bFpDQS9JRzl3ZEdsdmJuTXVZMnh2WTJ0elpYRWdPaUJmWTJ4dlkydHpaWEU3WEc1Y2JpQWdMeThnYm05a1pTQmhibVFnWTJ4dlkydHpaWEVnYm1WbFpDQjBieUJpWlNCcGJtbDBhV0ZzYVhwbFpDQjBieUJ5WVc1a2IyMGdkbUZzZFdWeklHbG1JSFJvWlhrbmNtVWdibTkwWEc0Z0lDOHZJSE53WldOcFptbGxaQzRnSUZkbElHUnZJSFJvYVhNZ2JHRjZhV3g1SUhSdklHMXBibWx0YVhwbElHbHpjM1ZsY3lCeVpXeGhkR1ZrSUhSdklHbHVjM1ZtWm1samFXVnVkRnh1SUNBdkx5QnplWE4wWlcwZ1pXNTBjbTl3ZVM0Z0lGTmxaU0FqTVRnNVhHNGdJR2xtSUNodWIyUmxJRDA5SUc1MWJHd2dmSHdnWTJ4dlkydHpaWEVnUFQwZ2JuVnNiQ2tnZTF4dUlDQWdJSFpoY2lCelpXVmtRbmwwWlhNZ1BTQnlibWNvS1R0Y2JpQWdJQ0JwWmlBb2JtOWtaU0E5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0F2THlCUVpYSWdOQzQxTENCamNtVmhkR1VnWVc1a0lEUTRMV0pwZENCdWIyUmxJR2xrTENBb05EY2djbUZ1Wkc5dElHSnBkSE1nS3lCdGRXeDBhV05oYzNRZ1ltbDBJRDBnTVNsY2JpQWdJQ0FnSUc1dlpHVWdQU0JmYm05a1pVbGtJRDBnVzF4dUlDQWdJQ0FnSUNCelpXVmtRbmwwWlhOYk1GMGdmQ0F3ZURBeExGeHVJQ0FnSUNBZ0lDQnpaV1ZrUW5sMFpYTmJNVjBzSUhObFpXUkNlWFJsYzFzeVhTd2djMlZsWkVKNWRHVnpXek5kTENCelpXVmtRbmwwWlhOYk5GMHNJSE5sWldSQ2VYUmxjMXMxWFZ4dUlDQWdJQ0FnWFR0Y2JpQWdJQ0I5WEc0Z0lDQWdhV1lnS0dOc2IyTnJjMlZ4SUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUM4dklGQmxjaUEwTGpJdU1pd2djbUZ1Wkc5dGFYcGxJQ2d4TkNCaWFYUXBJR05zYjJOcmMyVnhYRzRnSUNBZ0lDQmpiRzlqYTNObGNTQTlJRjlqYkc5amEzTmxjU0E5SUNoelpXVmtRbmwwWlhOYk5sMGdQRHdnT0NCOElITmxaV1JDZVhSbGMxczNYU2tnSmlBd2VETm1abVk3WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnTHk4Z1ZWVkpSQ0IwYVcxbGMzUmhiWEJ6SUdGeVpTQXhNREFnYm1GdWJ5MXpaV052Ym1RZ2RXNXBkSE1nYzJsdVkyVWdkR2hsSUVkeVpXZHZjbWxoYmlCbGNHOWphQ3hjYmlBZ0x5OGdLREUxT0RJdE1UQXRNVFVnTURBNk1EQXBMaUFnU2xOT2RXMWlaWEp6SUdGeVpXNG5kQ0J3Y21WamFYTmxJR1Z1YjNWbmFDQm1iM0lnZEdocGN5d2djMjljYmlBZ0x5OGdkR2x0WlNCcGN5Qm9ZVzVrYkdWa0lHbHVkR1Z5Ym1Gc2JIa2dZWE1nSjIxelpXTnpKeUFvYVc1MFpXZGxjaUJ0YVd4c2FYTmxZMjl1WkhNcElHRnVaQ0FuYm5ObFkzTW5YRzRnSUM4dklDZ3hNREF0Ym1GdWIzTmxZMjl1WkhNZ2IyWm1jMlYwSUdaeWIyMGdiWE5sWTNNcElITnBibU5sSUhWdWFYZ2daWEJ2WTJnc0lERTVOekF0TURFdE1ERWdNREE2TURBdVhHNGdJSFpoY2lCdGMyVmpjeUE5SUc5d2RHbHZibk11YlhObFkzTWdJVDA5SUhWdVpHVm1hVzVsWkNBL0lHOXdkR2x2Ym5NdWJYTmxZM01nT2lCdVpYY2dSR0YwWlNncExtZGxkRlJwYldVb0tUdGNibHh1SUNBdkx5QlFaWElnTkM0eUxqRXVNaXdnZFhObElHTnZkVzUwSUc5bUlIVjFhV1FuY3lCblpXNWxjbUYwWldRZ1pIVnlhVzVuSUhSb1pTQmpkWEp5Wlc1MElHTnNiMk5yWEc0Z0lDOHZJR041WTJ4bElIUnZJSE5wYlhWc1lYUmxJR2hwWjJobGNpQnlaWE52YkhWMGFXOXVJR05zYjJOclhHNGdJSFpoY2lCdWMyVmpjeUE5SUc5d2RHbHZibk11Ym5ObFkzTWdJVDA5SUhWdVpHVm1hVzVsWkNBL0lHOXdkR2x2Ym5NdWJuTmxZM01nT2lCZmJHRnpkRTVUWldOeklDc2dNVHRjYmx4dUlDQXZMeUJVYVcxbElITnBibU5sSUd4aGMzUWdkWFZwWkNCamNtVmhkR2x2YmlBb2FXNGdiWE5sWTNNcFhHNGdJSFpoY2lCa2RDQTlJQ2h0YzJWamN5QXRJRjlzWVhOMFRWTmxZM01wSUNzZ0tHNXpaV056SUMwZ1gyeGhjM1JPVTJWamN5a3ZNVEF3TURBN1hHNWNiaUFnTHk4Z1VHVnlJRFF1TWk0eExqSXNJRUoxYlhBZ1kyeHZZMnR6WlhFZ2IyNGdZMnh2WTJzZ2NtVm5jbVZ6YzJsdmJseHVJQ0JwWmlBb1pIUWdQQ0F3SUNZbUlHOXdkR2x2Ym5NdVkyeHZZMnR6WlhFZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJR05zYjJOcmMyVnhJRDBnWTJ4dlkydHpaWEVnS3lBeElDWWdNSGd6Wm1abU8xeHVJQ0I5WEc1Y2JpQWdMeThnVW1WelpYUWdibk5sWTNNZ2FXWWdZMnh2WTJzZ2NtVm5jbVZ6YzJWeklDaHVaWGNnWTJ4dlkydHpaWEVwSUc5eUlIZGxKM1psSUcxdmRtVmtJRzl1ZEc4Z1lTQnVaWGRjYmlBZ0x5OGdkR2x0WlNCcGJuUmxjblpoYkZ4dUlDQnBaaUFvS0dSMElEd2dNQ0I4ZkNCdGMyVmpjeUErSUY5c1lYTjBUVk5sWTNNcElDWW1JRzl3ZEdsdmJuTXVibk5sWTNNZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJRzV6WldOeklEMGdNRHRjYmlBZ2ZWeHVYRzRnSUM4dklGQmxjaUEwTGpJdU1TNHlJRlJvY205M0lHVnljbTl5SUdsbUlIUnZieUJ0WVc1NUlIVjFhV1J6SUdGeVpTQnlaWEYxWlhOMFpXUmNiaUFnYVdZZ0tHNXpaV056SUQ0OUlERXdNREF3S1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2QxZFdsa0xuWXhLQ2s2SUVOaGJseGNKM1FnWTNKbFlYUmxJRzF2Y21VZ2RHaGhiaUF4TUUwZ2RYVnBaSE12YzJWakp5azdYRzRnSUgxY2JseHVJQ0JmYkdGemRFMVRaV056SUQwZ2JYTmxZM003WEc0Z0lGOXNZWE4wVGxObFkzTWdQU0J1YzJWamN6dGNiaUFnWDJOc2IyTnJjMlZ4SUQwZ1kyeHZZMnR6WlhFN1hHNWNiaUFnTHk4Z1VHVnlJRFF1TVM0MElDMGdRMjl1ZG1WeWRDQm1jbTl0SUhWdWFYZ2daWEJ2WTJnZ2RHOGdSM0psWjI5eWFXRnVJR1Z3YjJOb1hHNGdJRzF6WldOeklDczlJREV5TWpFNU1qa3lPREF3TURBd08xeHVYRzRnSUM4dklHQjBhVzFsWDJ4dmQyQmNiaUFnZG1GeUlIUnNJRDBnS0NodGMyVmpjeUFtSURCNFptWm1abVptWmlrZ0tpQXhNREF3TUNBcklHNXpaV056S1NBbElEQjRNVEF3TURBd01EQXdPMXh1SUNCaVcya3JLMTBnUFNCMGJDQStQajRnTWpRZ0ppQXdlR1ptTzF4dUlDQmlXMmtySzEwZ1BTQjBiQ0ErUGo0Z01UWWdKaUF3ZUdabU8xeHVJQ0JpVzJrcksxMGdQU0IwYkNBK1BqNGdPQ0FtSURCNFptWTdYRzRnSUdKYmFTc3JYU0E5SUhSc0lDWWdNSGhtWmp0Y2JseHVJQ0F2THlCZ2RHbHRaVjl0YVdSZ1hHNGdJSFpoY2lCMGJXZ2dQU0FvYlhObFkzTWdMeUF3ZURFd01EQXdNREF3TUNBcUlERXdNREF3S1NBbUlEQjRabVptWm1abVpqdGNiaUFnWWx0cEt5dGRJRDBnZEcxb0lENCtQaUE0SUNZZ01IaG1aanRjYmlBZ1lsdHBLeXRkSUQwZ2RHMW9JQ1lnTUhobVpqdGNibHh1SUNBdkx5QmdkR2x0WlY5b2FXZG9YMkZ1WkY5MlpYSnphVzl1WUZ4dUlDQmlXMmtySzEwZ1BTQjBiV2dnUGo0K0lESTBJQ1lnTUhobUlId2dNSGd4TURzZ0x5OGdhVzVqYkhWa1pTQjJaWEp6YVc5dVhHNGdJR0piYVNzclhTQTlJSFJ0YUNBK1BqNGdNVFlnSmlBd2VHWm1PMXh1WEc0Z0lDOHZJR0JqYkc5amExOXpaWEZmYUdsZllXNWtYM0psYzJWeWRtVmtZQ0FvVUdWeUlEUXVNaTR5SUMwZ2FXNWpiSFZrWlNCMllYSnBZVzUwS1Z4dUlDQmlXMmtySzEwZ1BTQmpiRzlqYTNObGNTQStQajRnT0NCOElEQjRPREE3WEc1Y2JpQWdMeThnWUdOc2IyTnJYM05sY1Y5c2IzZGdYRzRnSUdKYmFTc3JYU0E5SUdOc2IyTnJjMlZ4SUNZZ01IaG1aanRjYmx4dUlDQXZMeUJnYm05a1pXQmNiaUFnWm05eUlDaDJZWElnYmlBOUlEQTdJRzRnUENBMk95QXJLMjRwSUh0Y2JpQWdJQ0JpVzJrZ0t5QnVYU0E5SUc1dlpHVmJibDA3WEc0Z0lIMWNibHh1SUNCeVpYUjFjbTRnWW5WbUlEOGdZblZtSURvZ1lubDBaWE5VYjFWMWFXUW9ZaWs3WEc1OVhHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdkakU3WEc0aUxDSm1kVzVqZEdsdmJpQkJZMk52Y21ScGIyNG9jSEp2Y0hNcElIdGNiaUFnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBOFpHbDJJR05zWVhOelRtRnRaVDFjSW1GalkyOXlaR2x2YmlCaFkyTnZjbVJwYjI0dGFXTnZiaUJoWTJOdmNtUnBiMjR0YkdsemRGd2lQbHh1SUNBZ0lDQWdJQ0FnSUNBZ2UzQnliM0J6TG1sMFpXMXpMbTFoY0NocGRHVnRJRDArSUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGMyVmpkR2x2YmlCamJHRnpjMDVoYldVOVhDSmhZMk52Y21ScGIyNHRjMlZqZEdsdmJsd2lJR3RsZVQxN2FYUmxiUzVwWkgwK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhzWVdKbGJDQjBZV0pKYm1SbGVEMWNJakJjSWlCamJHRnpjMDVoYldVOVhDSmhZMk52Y21ScGIyNHRkRzluWjJ4bFhDSWdhSFJ0YkVadmNqMWNJbUZqWTI5eVpHbHZiaTF6WldOMGFXOXVMVEZjSWo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUh0cGRHVnRMblJwZEd4bGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDJ4aFltVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJJR05zWVhOelRtRnRaVDFjSW1GalkyOXlaR2x2YmkxamIyNTBaVzUwWENJK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCN2FYUmxiUzVqYjI1MFpXNTBmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDNObFkzUnBiMjQrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBLWDFjYmlBZ0lDQWdJQ0FnUEM5a2FYWStYRzRnSUNBZ0tUdGNibjFjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnUVdOamIzSmthVzl1T3lJc0ltbHRjRzl5ZENCQlkyTnZjbVJwYjI0Z1puSnZiU0FuTGk5QlkyTnZjbVJwYjI0bk8xeHVhVzF3YjNKMElIVjFhV1IyTVNCbWNtOXRJQ2QxZFdsa0wzWXhKenRjYmx4dVkyeGhjM01nU25OdmJsQmhjbk5sY2lCbGVIUmxibVJ6SUZKbFlXTjBMa052YlhCdmJtVnVkQ0I3WEc0Z0lDQWdZMjl1YzNSeWRXTjBiM0lvS1NCN1hHNGdJQ0FnSUNBZ0lITjFjR1Z5S0NrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzNSaGRHVWdQU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmxjbkp2Y2pvZ2JuVnNiQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHbHpURzloWkdWa09pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR2wwWlcxek9pQmJYU3hjYmlBZ0lDQWdJQ0FnZlR0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JqYjIxd2IyNWxiblJFYVdSTmIzVnVkQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVuWlhSQmNHbEVZWFJoS0NrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYldGd1JHRjBZU2hxYzI5dVJHRjBZU2tnZTF4dUlDQWdJQ0FnSUNCamIyNXpkQ0JtYVdWc1pFMWhjQ0E5SUhSb2FYTXVjSEp2Y0hNdVptbGxiR1JOWVhBN1hHNGdJQ0FnSUNBZ0lDOHZJRWRsZENCMGFHVWdiMkpxWldOMElHTnZiblJoYVc1cGJtY2dhWFJsYlhNZ1puSnZiU0JLVTA5T1hHNGdJQ0FnSUNBZ0lHeGxkQ0JwZEdWdGN5QTlJSFJvYVhNdVoyVjBUMkpxWldOMFVISnZjQ2hxYzI5dVJHRjBZU3dnWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQS9JR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJdWMzQnNhWFFvSnk0bktTQTZJRnRkS1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLQ0ZwZEdWdGN5QjhmQ0JQWW1wbFkzUXVhMlY1Y3locGRHVnRjeWt1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0x5OGdUV0Z3SUhSb1pTQmtZWFJoSUdsMFpXMXpYRzRnSUNBZ0lDQWdJR2wwWlcxeklEMGdhWFJsYlhNdWJXRndLR2wwWlcwZ1BUNGdLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbGtPaUIxZFdsa2RqRW9LU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnBkR3hsT2lCMGFHbHpMbWRsZEU5aWFtVmpkRkJ5YjNBb2FYUmxiU3dnWm1sbGJHUk5ZWEF1ZEdsMGJHVXVjM0JzYVhRb0p5NG5LU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmpiMjUwWlc1ME9pQjBhR2x6TG1kbGRFOWlhbVZqZEZCeWIzQW9hWFJsYlN3Z1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZEM1emNHeHBkQ2duTGljcEtWeHVJQ0FnSUNBZ0lDQjlLU2s3WEc0Z0lDQWdJQ0FnSUM4dklGSmxiVzkyWlNCdlltcGxZM1J6SUhkcGRHZ2diV2x6YzJsdVp5Qm1hV1ZzWkhOY2JpQWdJQ0FnSUNBZ2FYUmxiWE1nUFNCcGRHVnRjeTVtYVd4MFpYSW9ablZ1WTNScGIyNGdLR2wwWlcwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJwZEdWdExtbGtJQ1ltSUdsMFpXMHVkR2wwYkdVZ0ppWWdhWFJsYlM1amIyNTBaVzUwTzF4dUlDQWdJQ0FnSUNCOUtUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdhWFJsYlhNN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnWjJWMFQySnFaV04wVUhKdmNDaHZZbW9zSUd0bGVYTXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHdGxlWE11YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnWm05eUlDaHNaWFFnYVNBOUlEQTdJR2tnUENCclpYbHpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2IySnFMbWhoYzA5M2JsQnliM0JsY25SNUtHdGxlWE5iYVYwcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxSUQwZ2IySnFXMnRsZVhOYmFWMWRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG14dlp5Z25TVzUyWVd4cFpDQnRZWEFnYTJWNUp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHNTFiR3c3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUdkbGRFRndhVVJoZEdFb0tTQjdYRzRnSUNBZ0lDQWdJR1psZEdOb0tIUm9hWE11Y0hKdmNITXVkWEpzS1Z4dUlDQWdJQ0FnSUNBZ0lDQWdMblJvWlc0b2NtVnpJRDArSUhKbGN5NXFjMjl1S0NrcFhHNGdJQ0FnSUNBZ0lDQWdJQ0F1ZEdobGJpaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQW9jbVZ6ZFd4MEtTQTlQaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTnZibk4wSUdSaGRHRWdQU0IwYUdsekxtMWhjRVJoZEdFb2NtVnpkV3gwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGa1lYUmhJSHg4SUU5aWFtVmpkQzVyWlhsektHUmhkR0VwTG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaWEp5YjNJNklIdHRaWE56WVdkbE9pQW5SVzF3ZEhrZ1pHRjBZU2Q5TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbHpURzloWkdWa09pQjBjblZsWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWE5NYjJGa1pXUTZJSFJ5ZFdVc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcGRHVnRjem9nWkdGMFlWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDaGxjbkp2Y2lrZ1BUNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2x6VEc5aFpHVmtPaUIwY25WbExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYSnliM0pjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpXNWtaWElvS1NCN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUh0bGNuSnZjaXdnYVhOTWIyRmtaV1FzSUdsMFpXMXpmU0E5SUhSb2FYTXVjM1JoZEdVN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hsY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4a2FYWStSWEp5YjNJNklIdGxjbkp2Y2k1dFpYTnpZV2RsZlR3dlpHbDJQanRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNnaGFYTk1iMkZrWldRcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUE4WkdsMlBreHZZV1JwYm1jdUxpNDhMMlJwZGo0N1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhCWTJOdmNtUnBiMjRnYVhSbGJYTTllMmwwWlcxemZTOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVmVnh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JLYzI5dVVHRnljMlZ5T3lJc0ltbHRjRzl5ZENCS2MyOXVVR0Z5YzJWeUlHWnliMjBnSnk0dlEyOXRjRzl1Wlc1MGN5OUtjMjl1VUdGeWMyVnlKenRjYmx4dVkyOXVjM1FnYlc5a1NuTnZibEpsYm1SbGNrVnNaVzFsYm5RZ1BTQW5iVzlrZFd4aGNtbDBlUzFxYzI5dUxYSmxibVJsY2ljN1hHNWpiMjV6ZENCa2IyMUZiR1Z0Wlc1MElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb2JXOWtTbk52YmxKbGJtUmxja1ZzWlcxbGJuUXBPMXh1WEc1U1pXRmpkRVJQVFM1eVpXNWtaWElvWEc0Z0lDQWdQRXB6YjI1UVlYSnpaWElnZFhKc1BYdGtiMjFGYkdWdFpXNTBMbVJoZEdGelpYUXVkWEpzZlNCbWFXVnNaRTFoY0QxN1NsTlBUaTV3WVhKelpTaGtiMjFGYkdWdFpXNTBMbVJoZEdGelpYUXVabWxsYkdSdFlYQXBmUzgrTEZ4dUlDQWdJR1J2YlVWc1pXMWxiblJjYmlrN0lsMTlcbiJdLCJmaWxlIjoiRnJvbnQvSW5kZXhGcm9udC5qcyJ9
