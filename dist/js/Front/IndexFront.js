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

var _getApiData = _interopRequireDefault(require("../../Utilities/getApiData"));

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
      this.getData();
    }
  }, {
    key: "getData",
    value: function getData() {
      var _this2 = this;

      var url = this.props.url;
      (0, _getApiData.default)(url).then(function (_ref) {
        var result = _ref.result;

        var data = _this2.mapData(result);

        if (!data || Object.keys(data).length === 0) {
          _this2.setState({
            error: Error('Could not fetch data from URL.'),
            isLoaded: true
          });

          return;
        }

        _this2.setState({
          isLoaded: true,
          items: data
        });
      }, function (_ref2) {
        var error = _ref2.error;

        _this2.setState({
          isLoaded: true,
          error: error
        });
      });
    }
  }, {
    key: "mapData",
    value: function mapData(jsonData) {
      var _this3 = this;

      var fieldMap = this.props.fieldMap; // Get the object containing items from JSON

      var items = this.getObjectProp(jsonData, fieldMap.itemContainer ? fieldMap.itemContainer.split('.') : []);

      if (!items || Object.keys(items).length === 0) {
        return;
      } // Map the data items


      items = items.map(function (item) {
        return {
          id: (0, _v.default)(),
          title: _this3.getObjectProp(item, fieldMap.title.split('.')),
          content: _this3.getObjectProp(item, fieldMap.content.split('.'))
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

},{"../../Utilities/getApiData":7,"./Accordion":4,"uuid/v1":3}],6:[function(require,module,exports){
"use strict";

var _JsonParser = _interopRequireDefault(require("./Components/JsonParser"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var modJsonRenderElement = 'modularity-json-render';
var domElement = document.getElementById(modJsonRenderElement);
ReactDOM.render(React.createElement(_JsonParser.default, {
  url: domElement.dataset.url,
  fieldMap: JSON.parse(domElement.dataset.fieldmap)
}), domElement);

},{"./Components/JsonParser":5}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function getApiData(url) {
  return fetch(url).then(function (res) {
    return res.json();
  }).then(function (result) {
    return {
      result: result
    };
  }, function (error) {
    return {
      error: error
    };
  });
}

var _default = getApiData;
exports.default = _default;

},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92MS5qcyIsInNvdXJjZS9qcy9Gcm9udC9Db21wb25lbnRzL0FjY29yZGlvbi5qcyIsInNvdXJjZS9qcy9Gcm9udC9Db21wb25lbnRzL0pzb25QYXJzZXIuanMiLCJzb3VyY2UvanMvRnJvbnQvSW5kZXhGcm9udC5qcyIsInNvdXJjZS9qcy9VdGlsaXRpZXMvZ2V0QXBpRGF0YS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QU1IOztlQUVjLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKipcbiAqIENvbnZlcnQgYXJyYXkgb2YgMTYgYnl0ZSB2YWx1ZXMgdG8gVVVJRCBzdHJpbmcgZm9ybWF0IG9mIHRoZSBmb3JtOlxuICogWFhYWFhYWFgtWFhYWC1YWFhYLVhYWFgtWFhYWFhYWFhYWFhYXG4gKi9cbnZhciBieXRlVG9IZXggPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyArK2kpIHtcbiAgYnl0ZVRvSGV4W2ldID0gKGkgKyAweDEwMCkudG9TdHJpbmcoMTYpLnN1YnN0cigxKTtcbn1cblxuZnVuY3Rpb24gYnl0ZXNUb1V1aWQoYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBvZmZzZXQgfHwgMDtcbiAgdmFyIGJ0aCA9IGJ5dGVUb0hleDtcbiAgLy8gam9pbiB1c2VkIHRvIGZpeCBtZW1vcnkgaXNzdWUgY2F1c2VkIGJ5IGNvbmNhdGVuYXRpb246IGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMxNzUjYzRcbiAgcmV0dXJuIChbYnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXV0pLmpvaW4oJycpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJ5dGVzVG9VdWlkO1xuIiwiLy8gVW5pcXVlIElEIGNyZWF0aW9uIHJlcXVpcmVzIGEgaGlnaCBxdWFsaXR5IHJhbmRvbSAjIGdlbmVyYXRvci4gIEluIHRoZVxuLy8gYnJvd3NlciB0aGlzIGlzIGEgbGl0dGxlIGNvbXBsaWNhdGVkIGR1ZSB0byB1bmtub3duIHF1YWxpdHkgb2YgTWF0aC5yYW5kb20oKVxuLy8gYW5kIGluY29uc2lzdGVudCBzdXBwb3J0IGZvciB0aGUgYGNyeXB0b2AgQVBJLiAgV2UgZG8gdGhlIGJlc3Qgd2UgY2FuIHZpYVxuLy8gZmVhdHVyZS1kZXRlY3Rpb25cblxuLy8gZ2V0UmFuZG9tVmFsdWVzIG5lZWRzIHRvIGJlIGludm9rZWQgaW4gYSBjb250ZXh0IHdoZXJlIFwidGhpc1wiIGlzIGEgQ3J5cHRvXG4vLyBpbXBsZW1lbnRhdGlvbi4gQWxzbywgZmluZCB0aGUgY29tcGxldGUgaW1wbGVtZW50YXRpb24gb2YgY3J5cHRvIG9uIElFMTEuXG52YXIgZ2V0UmFuZG9tVmFsdWVzID0gKHR5cGVvZihjcnlwdG8pICE9ICd1bmRlZmluZWQnICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKGNyeXB0bykpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgKHR5cGVvZihtc0NyeXB0bykgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5tc0NyeXB0by5nZXRSYW5kb21WYWx1ZXMgPT0gJ2Z1bmN0aW9uJyAmJiBtc0NyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChtc0NyeXB0bykpO1xuXG5pZiAoZ2V0UmFuZG9tVmFsdWVzKSB7XG4gIC8vIFdIQVRXRyBjcnlwdG8gUk5HIC0gaHR0cDovL3dpa2kud2hhdHdnLm9yZy93aWtpL0NyeXB0b1xuICB2YXIgcm5kczggPSBuZXcgVWludDhBcnJheSgxNik7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW5kZWZcblxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHdoYXR3Z1JORygpIHtcbiAgICBnZXRSYW5kb21WYWx1ZXMocm5kczgpO1xuICAgIHJldHVybiBybmRzODtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIE1hdGgucmFuZG9tKCktYmFzZWQgKFJORylcbiAgLy9cbiAgLy8gSWYgYWxsIGVsc2UgZmFpbHMsIHVzZSBNYXRoLnJhbmRvbSgpLiAgSXQncyBmYXN0LCBidXQgaXMgb2YgdW5zcGVjaWZpZWRcbiAgLy8gcXVhbGl0eS5cbiAgdmFyIHJuZHMgPSBuZXcgQXJyYXkoMTYpO1xuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbWF0aFJORygpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgcjsgaSA8IDE2OyBpKyspIHtcbiAgICAgIGlmICgoaSAmIDB4MDMpID09PSAwKSByID0gTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMDAwO1xuICAgICAgcm5kc1tpXSA9IHIgPj4+ICgoaSAmIDB4MDMpIDw8IDMpICYgMHhmZjtcbiAgICB9XG5cbiAgICByZXR1cm4gcm5kcztcbiAgfTtcbn1cbiIsInZhciBybmcgPSByZXF1aXJlKCcuL2xpYi9ybmcnKTtcbnZhciBieXRlc1RvVXVpZCA9IHJlcXVpcmUoJy4vbGliL2J5dGVzVG9VdWlkJyk7XG5cbi8vICoqYHYxKClgIC0gR2VuZXJhdGUgdGltZS1iYXNlZCBVVUlEKipcbi8vXG4vLyBJbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vTGlvc0svVVVJRC5qc1xuLy8gYW5kIGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS91dWlkLmh0bWxcblxudmFyIF9ub2RlSWQ7XG52YXIgX2Nsb2Nrc2VxO1xuXG4vLyBQcmV2aW91cyB1dWlkIGNyZWF0aW9uIHRpbWVcbnZhciBfbGFzdE1TZWNzID0gMDtcbnZhciBfbGFzdE5TZWNzID0gMDtcblxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkIGZvciBBUEkgZGV0YWlsc1xuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIHZhciBiID0gYnVmIHx8IFtdO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgbm9kZSA9IG9wdGlvbnMubm9kZSB8fCBfbm9kZUlkO1xuICB2YXIgY2xvY2tzZXEgPSBvcHRpb25zLmNsb2Nrc2VxICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNsb2Nrc2VxIDogX2Nsb2Nrc2VxO1xuXG4gIC8vIG5vZGUgYW5kIGNsb2Nrc2VxIG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgdG8gcmFuZG9tIHZhbHVlcyBpZiB0aGV5J3JlIG5vdFxuICAvLyBzcGVjaWZpZWQuICBXZSBkbyB0aGlzIGxhemlseSB0byBtaW5pbWl6ZSBpc3N1ZXMgcmVsYXRlZCB0byBpbnN1ZmZpY2llbnRcbiAgLy8gc3lzdGVtIGVudHJvcHkuICBTZWUgIzE4OVxuICBpZiAobm9kZSA9PSBudWxsIHx8IGNsb2Nrc2VxID09IG51bGwpIHtcbiAgICB2YXIgc2VlZEJ5dGVzID0gcm5nKCk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgLy8gUGVyIDQuNSwgY3JlYXRlIGFuZCA0OC1iaXQgbm9kZSBpZCwgKDQ3IHJhbmRvbSBiaXRzICsgbXVsdGljYXN0IGJpdCA9IDEpXG4gICAgICBub2RlID0gX25vZGVJZCA9IFtcbiAgICAgICAgc2VlZEJ5dGVzWzBdIHwgMHgwMSxcbiAgICAgICAgc2VlZEJ5dGVzWzFdLCBzZWVkQnl0ZXNbMl0sIHNlZWRCeXRlc1szXSwgc2VlZEJ5dGVzWzRdLCBzZWVkQnl0ZXNbNV1cbiAgICAgIF07XG4gICAgfVxuICAgIGlmIChjbG9ja3NlcSA9PSBudWxsKSB7XG4gICAgICAvLyBQZXIgNC4yLjIsIHJhbmRvbWl6ZSAoMTQgYml0KSBjbG9ja3NlcVxuICAgICAgY2xvY2tzZXEgPSBfY2xvY2tzZXEgPSAoc2VlZEJ5dGVzWzZdIDw8IDggfCBzZWVkQnl0ZXNbN10pICYgMHgzZmZmO1xuICAgIH1cbiAgfVxuXG4gIC8vIFVVSUQgdGltZXN0YW1wcyBhcmUgMTAwIG5hbm8tc2Vjb25kIHVuaXRzIHNpbmNlIHRoZSBHcmVnb3JpYW4gZXBvY2gsXG4gIC8vICgxNTgyLTEwLTE1IDAwOjAwKS4gIEpTTnVtYmVycyBhcmVuJ3QgcHJlY2lzZSBlbm91Z2ggZm9yIHRoaXMsIHNvXG4gIC8vIHRpbWUgaXMgaGFuZGxlZCBpbnRlcm5hbGx5IGFzICdtc2VjcycgKGludGVnZXIgbWlsbGlzZWNvbmRzKSBhbmQgJ25zZWNzJ1xuICAvLyAoMTAwLW5hbm9zZWNvbmRzIG9mZnNldCBmcm9tIG1zZWNzKSBzaW5jZSB1bml4IGVwb2NoLCAxOTcwLTAxLTAxIDAwOjAwLlxuICB2YXIgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuICB2YXIgbnNlY3MgPSBvcHRpb25zLm5zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zZWNzIDogX2xhc3ROU2VjcyArIDE7XG5cbiAgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuICB2YXIgZHQgPSAobXNlY3MgLSBfbGFzdE1TZWNzKSArIChuc2VjcyAtIF9sYXN0TlNlY3MpLzEwMDAwO1xuXG4gIC8vIFBlciA0LjIuMS4yLCBCdW1wIGNsb2Nrc2VxIG9uIGNsb2NrIHJlZ3Jlc3Npb25cbiAgaWYgKGR0IDwgMCAmJiBvcHRpb25zLmNsb2Nrc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBjbG9ja3NlcSA9IGNsb2Nrc2VxICsgMSAmIDB4M2ZmZjtcbiAgfVxuXG4gIC8vIFJlc2V0IG5zZWNzIGlmIGNsb2NrIHJlZ3Jlc3NlcyAobmV3IGNsb2Nrc2VxKSBvciB3ZSd2ZSBtb3ZlZCBvbnRvIGEgbmV3XG4gIC8vIHRpbWUgaW50ZXJ2YWxcbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH1cblxuICAvLyBQZXIgNC4yLjEuMiBUaHJvdyBlcnJvciBpZiB0b28gbWFueSB1dWlkcyBhcmUgcmVxdWVzdGVkXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXVpZC52MSgpOiBDYW5cXCd0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlYycpO1xuICB9XG5cbiAgX2xhc3RNU2VjcyA9IG1zZWNzO1xuICBfbGFzdE5TZWNzID0gbnNlY3M7XG4gIF9jbG9ja3NlcSA9IGNsb2Nrc2VxO1xuXG4gIC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICAvLyBgdGltZV9sb3dgXG4gIHZhciB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gdGwgPj4+IDI0ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDE2ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfbWlkYFxuICB2YXIgdG1oID0gKG1zZWNzIC8gMHgxMDAwMDAwMDAgKiAxMDAwMCkgJiAweGZmZmZmZmY7XG4gIGJbaSsrXSA9IHRtaCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRtaCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfaGlnaF9hbmRfdmVyc2lvbmBcbiAgYltpKytdID0gdG1oID4+PiAyNCAmIDB4ZiB8IDB4MTA7IC8vIGluY2x1ZGUgdmVyc2lvblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjtcblxuICAvLyBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGAgKFBlciA0LjIuMiAtIGluY2x1ZGUgdmFyaWFudClcbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwO1xuXG4gIC8vIGBjbG9ja19zZXFfbG93YFxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgLy8gYG5vZGVgXG4gIGZvciAodmFyIG4gPSAwOyBuIDwgNjsgKytuKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiA/IGJ1ZiA6IGJ5dGVzVG9VdWlkKGIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHYxO1xuIiwiZnVuY3Rpb24gQWNjb3JkaW9uKHByb3BzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhY2NvcmRpb24gYWNjb3JkaW9uLWljb24gYWNjb3JkaW9uLWxpc3RcIj5cbiAgICAgICAgICAgIHtwcm9wcy5pdGVtcy5tYXAoaXRlbSA9PiAoXG4gICAgICAgICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwiYWNjb3JkaW9uLXNlY3Rpb25cIiBrZXk9e2l0ZW0uaWR9PlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWwgdGFiSW5kZXg9XCIwXCIgY2xhc3NOYW1lPVwiYWNjb3JkaW9uLXRvZ2dsZVwiIGh0bWxGb3I9XCJhY2NvcmRpb24tc2VjdGlvbi0xXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS50aXRsZX1cbiAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhY2NvcmRpb24tY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW0uY29udGVudH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9zZWN0aW9uPlxuICAgICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IEFjY29yZGlvbjsiLCJpbXBvcnQgQWNjb3JkaW9uIGZyb20gJy4vQWNjb3JkaW9uJztcbmltcG9ydCB1dWlkdjEgZnJvbSAndXVpZC92MSc7XG5pbXBvcnQgZ2V0QXBpRGF0YSBmcm9tICcuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YSc7XG5cbmNsYXNzIEpzb25QYXJzZXIgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuZ2V0RGF0YSgpO1xuICAgIH1cblxuICAgIGdldERhdGEoKSB7XG4gICAgICAgIGNvbnN0IHt1cmx9ID0gdGhpcy5wcm9wcztcbiAgICAgICAgZ2V0QXBpRGF0YSh1cmwpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICAoe3Jlc3VsdH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMubWFwRGF0YShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogRXJyb3IoJ0NvdWxkIG5vdCBmZXRjaCBkYXRhIGZyb20gVVJMLicpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTG9hZGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdHJ1ZSwgaXRlbXM6IGRhdGF9KTtcbiAgICAgICAgICAgICAgICB9LCAoe2Vycm9yfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdHJ1ZSwgZXJyb3J9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIG1hcERhdGEoanNvbkRhdGEpIHtcbiAgICAgICAgY29uc3Qge2ZpZWxkTWFwfSA9IHRoaXMucHJvcHM7XG4gICAgICAgIC8vIEdldCB0aGUgb2JqZWN0IGNvbnRhaW5pbmcgaXRlbXMgZnJvbSBKU09OXG4gICAgICAgIGxldCBpdGVtcyA9IHRoaXMuZ2V0T2JqZWN0UHJvcChqc29uRGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA/IGZpZWxkTWFwLml0ZW1Db250YWluZXIuc3BsaXQoJy4nKSA6IFtdKTtcbiAgICAgICAgaWYgKCFpdGVtcyB8fCBPYmplY3Qua2V5cyhpdGVtcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWFwIHRoZSBkYXRhIGl0ZW1zXG4gICAgICAgIGl0ZW1zID0gaXRlbXMubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgICAgIGlkOiB1dWlkdjEoKSxcbiAgICAgICAgICAgIHRpdGxlOiB0aGlzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAudGl0bGUuc3BsaXQoJy4nKSksXG4gICAgICAgICAgICBjb250ZW50OiB0aGlzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAuY29udGVudC5zcGxpdCgnLicpKVxuICAgICAgICB9KSk7XG4gICAgICAgIC8vIFJlbW92ZSBvYmplY3RzIHdpdGggbWlzc2luZyBmaWVsZHNcbiAgICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLmlkICYmIGl0ZW0udGl0bGUgJiYgaXRlbS5jb250ZW50O1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgZ2V0T2JqZWN0UHJvcChvYmosIGtleXMpIHtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleXNbaV0pKSB7XG4gICAgICAgICAgICAgICAgb2JqID0gb2JqW2tleXNbaV1dO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBtYXAga2V5Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge2Vycm9yLCBpc0xvYWRlZCwgaXRlbXN9ID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdj5FcnJvcjoge2Vycm9yLm1lc3NhZ2V9PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXY+TG9hZGluZy4uLjwvZGl2PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPEFjY29yZGlvbiBpdGVtcz17aXRlbXN9Lz5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEpzb25QYXJzZXI7IiwiaW1wb3J0IEpzb25QYXJzZXIgZnJvbSAnLi9Db21wb25lbnRzL0pzb25QYXJzZXInO1xuXG5jb25zdCBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbmNvbnN0IGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8SnNvblBhcnNlciB1cmw9e2RvbUVsZW1lbnQuZGF0YXNldC51cmx9IGZpZWxkTWFwPXtKU09OLnBhcnNlKGRvbUVsZW1lbnQuZGF0YXNldC5maWVsZG1hcCl9Lz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJGcm9udC9JbmRleEZyb250LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG52YXIgYnl0ZVRvSGV4ID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG59XG5cbmZ1bmN0aW9uIGJ5dGVzVG9VdWlkKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBidGggPSBieXRlVG9IZXg7XG4gIC8vIGpvaW4gdXNlZCB0byBmaXggbWVtb3J5IGlzc3VlIGNhdXNlZCBieSBjb25jYXRlbmF0aW9uOiBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMTc1I2M0XG4gIHJldHVybiAoW2J0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sIFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV1dKS5qb2luKCcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBieXRlc1RvVXVpZDtcblxufSx7fV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxuXG4vLyBnZXRSYW5kb21WYWx1ZXMgbmVlZHMgdG8gYmUgaW52b2tlZCBpbiBhIGNvbnRleHQgd2hlcmUgXCJ0aGlzXCIgaXMgYSBDcnlwdG9cbi8vIGltcGxlbWVudGF0aW9uLiBBbHNvLCBmaW5kIHRoZSBjb21wbGV0ZSBpbXBsZW1lbnRhdGlvbiBvZiBjcnlwdG8gb24gSUUxMS5cbnZhciBnZXRSYW5kb21WYWx1ZXMgPSAodHlwZW9mKGNyeXB0bykgIT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mKG1zQ3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93Lm1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcyA9PSAnZnVuY3Rpb24nICYmIG1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKG1zQ3J5cHRvKSk7XG5cbmlmIChnZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hhdHdnUk5HKCkge1xuICAgIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufSBlbHNlIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgcm5kcyA9IG5ldyBBcnJheSgxNik7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXRoUk5HKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBybmRzO1xuICB9O1xufVxuXG59LHt9XSwzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBybmcgPSByZXF1aXJlKCcuL2xpYi9ybmcnKTtcbnZhciBieXRlc1RvVXVpZCA9IHJlcXVpcmUoJy4vbGliL2J5dGVzVG9VdWlkJyk7XG5cbi8vICoqYHYxKClgIC0gR2VuZXJhdGUgdGltZS1iYXNlZCBVVUlEKipcbi8vXG4vLyBJbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vTGlvc0svVVVJRC5qc1xuLy8gYW5kIGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS91dWlkLmh0bWxcblxudmFyIF9ub2RlSWQ7XG52YXIgX2Nsb2Nrc2VxO1xuXG4vLyBQcmV2aW91cyB1dWlkIGNyZWF0aW9uIHRpbWVcbnZhciBfbGFzdE1TZWNzID0gMDtcbnZhciBfbGFzdE5TZWNzID0gMDtcblxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkIGZvciBBUEkgZGV0YWlsc1xuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIHZhciBiID0gYnVmIHx8IFtdO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgbm9kZSA9IG9wdGlvbnMubm9kZSB8fCBfbm9kZUlkO1xuICB2YXIgY2xvY2tzZXEgPSBvcHRpb25zLmNsb2Nrc2VxICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNsb2Nrc2VxIDogX2Nsb2Nrc2VxO1xuXG4gIC8vIG5vZGUgYW5kIGNsb2Nrc2VxIG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgdG8gcmFuZG9tIHZhbHVlcyBpZiB0aGV5J3JlIG5vdFxuICAvLyBzcGVjaWZpZWQuICBXZSBkbyB0aGlzIGxhemlseSB0byBtaW5pbWl6ZSBpc3N1ZXMgcmVsYXRlZCB0byBpbnN1ZmZpY2llbnRcbiAgLy8gc3lzdGVtIGVudHJvcHkuICBTZWUgIzE4OVxuICBpZiAobm9kZSA9PSBudWxsIHx8IGNsb2Nrc2VxID09IG51bGwpIHtcbiAgICB2YXIgc2VlZEJ5dGVzID0gcm5nKCk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgLy8gUGVyIDQuNSwgY3JlYXRlIGFuZCA0OC1iaXQgbm9kZSBpZCwgKDQ3IHJhbmRvbSBiaXRzICsgbXVsdGljYXN0IGJpdCA9IDEpXG4gICAgICBub2RlID0gX25vZGVJZCA9IFtcbiAgICAgICAgc2VlZEJ5dGVzWzBdIHwgMHgwMSxcbiAgICAgICAgc2VlZEJ5dGVzWzFdLCBzZWVkQnl0ZXNbMl0sIHNlZWRCeXRlc1szXSwgc2VlZEJ5dGVzWzRdLCBzZWVkQnl0ZXNbNV1cbiAgICAgIF07XG4gICAgfVxuICAgIGlmIChjbG9ja3NlcSA9PSBudWxsKSB7XG4gICAgICAvLyBQZXIgNC4yLjIsIHJhbmRvbWl6ZSAoMTQgYml0KSBjbG9ja3NlcVxuICAgICAgY2xvY2tzZXEgPSBfY2xvY2tzZXEgPSAoc2VlZEJ5dGVzWzZdIDw8IDggfCBzZWVkQnl0ZXNbN10pICYgMHgzZmZmO1xuICAgIH1cbiAgfVxuXG4gIC8vIFVVSUQgdGltZXN0YW1wcyBhcmUgMTAwIG5hbm8tc2Vjb25kIHVuaXRzIHNpbmNlIHRoZSBHcmVnb3JpYW4gZXBvY2gsXG4gIC8vICgxNTgyLTEwLTE1IDAwOjAwKS4gIEpTTnVtYmVycyBhcmVuJ3QgcHJlY2lzZSBlbm91Z2ggZm9yIHRoaXMsIHNvXG4gIC8vIHRpbWUgaXMgaGFuZGxlZCBpbnRlcm5hbGx5IGFzICdtc2VjcycgKGludGVnZXIgbWlsbGlzZWNvbmRzKSBhbmQgJ25zZWNzJ1xuICAvLyAoMTAwLW5hbm9zZWNvbmRzIG9mZnNldCBmcm9tIG1zZWNzKSBzaW5jZSB1bml4IGVwb2NoLCAxOTcwLTAxLTAxIDAwOjAwLlxuICB2YXIgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuICB2YXIgbnNlY3MgPSBvcHRpb25zLm5zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zZWNzIDogX2xhc3ROU2VjcyArIDE7XG5cbiAgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuICB2YXIgZHQgPSAobXNlY3MgLSBfbGFzdE1TZWNzKSArIChuc2VjcyAtIF9sYXN0TlNlY3MpLzEwMDAwO1xuXG4gIC8vIFBlciA0LjIuMS4yLCBCdW1wIGNsb2Nrc2VxIG9uIGNsb2NrIHJlZ3Jlc3Npb25cbiAgaWYgKGR0IDwgMCAmJiBvcHRpb25zLmNsb2Nrc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBjbG9ja3NlcSA9IGNsb2Nrc2VxICsgMSAmIDB4M2ZmZjtcbiAgfVxuXG4gIC8vIFJlc2V0IG5zZWNzIGlmIGNsb2NrIHJlZ3Jlc3NlcyAobmV3IGNsb2Nrc2VxKSBvciB3ZSd2ZSBtb3ZlZCBvbnRvIGEgbmV3XG4gIC8vIHRpbWUgaW50ZXJ2YWxcbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH1cblxuICAvLyBQZXIgNC4yLjEuMiBUaHJvdyBlcnJvciBpZiB0b28gbWFueSB1dWlkcyBhcmUgcmVxdWVzdGVkXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXVpZC52MSgpOiBDYW5cXCd0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlYycpO1xuICB9XG5cbiAgX2xhc3RNU2VjcyA9IG1zZWNzO1xuICBfbGFzdE5TZWNzID0gbnNlY3M7XG4gIF9jbG9ja3NlcSA9IGNsb2Nrc2VxO1xuXG4gIC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICAvLyBgdGltZV9sb3dgXG4gIHZhciB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gdGwgPj4+IDI0ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDE2ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfbWlkYFxuICB2YXIgdG1oID0gKG1zZWNzIC8gMHgxMDAwMDAwMDAgKiAxMDAwMCkgJiAweGZmZmZmZmY7XG4gIGJbaSsrXSA9IHRtaCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRtaCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfaGlnaF9hbmRfdmVyc2lvbmBcbiAgYltpKytdID0gdG1oID4+PiAyNCAmIDB4ZiB8IDB4MTA7IC8vIGluY2x1ZGUgdmVyc2lvblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjtcblxuICAvLyBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGAgKFBlciA0LjIuMiAtIGluY2x1ZGUgdmFyaWFudClcbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwO1xuXG4gIC8vIGBjbG9ja19zZXFfbG93YFxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgLy8gYG5vZGVgXG4gIGZvciAodmFyIG4gPSAwOyBuIDwgNjsgKytuKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiA/IGJ1ZiA6IGJ5dGVzVG9VdWlkKGIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHYxO1xuXG59LHtcIi4vbGliL2J5dGVzVG9VdWlkXCI6MSxcIi4vbGliL3JuZ1wiOjJ9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBBY2NvcmRpb24ocHJvcHMpIHtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgIGNsYXNzTmFtZTogXCJhY2NvcmRpb24gYWNjb3JkaW9uLWljb24gYWNjb3JkaW9uLWxpc3RcIlxuICB9LCBwcm9wcy5pdGVtcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcInNlY3Rpb25cIiwge1xuICAgICAgY2xhc3NOYW1lOiBcImFjY29yZGlvbi1zZWN0aW9uXCIsXG4gICAgICBrZXk6IGl0ZW0uaWRcbiAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIiwge1xuICAgICAgdGFiSW5kZXg6IFwiMFwiLFxuICAgICAgY2xhc3NOYW1lOiBcImFjY29yZGlvbi10b2dnbGVcIixcbiAgICAgIGh0bWxGb3I6IFwiYWNjb3JkaW9uLXNlY3Rpb24tMVwiXG4gICAgfSwgaXRlbS50aXRsZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgY2xhc3NOYW1lOiBcImFjY29yZGlvbi1jb250ZW50XCJcbiAgICB9LCBpdGVtLmNvbnRlbnQpKTtcbiAgfSkpO1xufVxuXG52YXIgX2RlZmF1bHQgPSBBY2NvcmRpb247XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9BY2NvcmRpb24gPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0FjY29yZGlvblwiKSk7XG5cbnZhciBfdiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcInV1aWQvdjFcIikpO1xuXG52YXIgX2dldEFwaURhdGEgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgSnNvblBhcnNlciA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoSnNvblBhcnNlciwgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgZnVuY3Rpb24gSnNvblBhcnNlcigpIHtcbiAgICB2YXIgX3RoaXM7XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgSnNvblBhcnNlcik7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihKc29uUGFyc2VyKS5jYWxsKHRoaXMpKTtcbiAgICBfdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgaXRlbXM6IFtdXG4gICAgfTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoSnNvblBhcnNlciwgW3tcbiAgICBrZXk6IFwiY29tcG9uZW50RGlkTW91bnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICB0aGlzLmdldERhdGEoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0RGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXREYXRhKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciB1cmwgPSB0aGlzLnByb3BzLnVybDtcbiAgICAgICgwLCBfZ2V0QXBpRGF0YS5kZWZhdWx0KSh1cmwpLnRoZW4oZnVuY3Rpb24gKF9yZWYpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IF9yZWYucmVzdWx0O1xuXG4gICAgICAgIHZhciBkYXRhID0gX3RoaXMyLm1hcERhdGEocmVzdWx0KTtcblxuICAgICAgICBpZiAoIWRhdGEgfHwgT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICAgIGVycm9yOiBFcnJvcignQ291bGQgbm90IGZldGNoIGRhdGEgZnJvbSBVUkwuJyksXG4gICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICBpdGVtczogZGF0YVxuICAgICAgICB9KTtcbiAgICAgIH0sIGZ1bmN0aW9uIChfcmVmMikge1xuICAgICAgICB2YXIgZXJyb3IgPSBfcmVmMi5lcnJvcjtcblxuICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgIGlzTG9hZGVkOiB0cnVlLFxuICAgICAgICAgIGVycm9yOiBlcnJvclxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJtYXBEYXRhXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIG1hcERhdGEoanNvbkRhdGEpIHtcbiAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwOyAvLyBHZXQgdGhlIG9iamVjdCBjb250YWluaW5nIGl0ZW1zIGZyb20gSlNPTlxuXG4gICAgICB2YXIgaXRlbXMgPSB0aGlzLmdldE9iamVjdFByb3AoanNvbkRhdGEsIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPyBmaWVsZE1hcC5pdGVtQ29udGFpbmVyLnNwbGl0KCcuJykgOiBbXSk7XG5cbiAgICAgIGlmICghaXRlbXMgfHwgT2JqZWN0LmtleXMoaXRlbXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9IC8vIE1hcCB0aGUgZGF0YSBpdGVtc1xuXG5cbiAgICAgIGl0ZW1zID0gaXRlbXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6ICgwLCBfdi5kZWZhdWx0KSgpLFxuICAgICAgICAgIHRpdGxlOiBfdGhpczMuZ2V0T2JqZWN0UHJvcChpdGVtLCBmaWVsZE1hcC50aXRsZS5zcGxpdCgnLicpKSxcbiAgICAgICAgICBjb250ZW50OiBfdGhpczMuZ2V0T2JqZWN0UHJvcChpdGVtLCBmaWVsZE1hcC5jb250ZW50LnNwbGl0KCcuJykpXG4gICAgICAgIH07XG4gICAgICB9KTsgLy8gUmVtb3ZlIG9iamVjdHMgd2l0aCBtaXNzaW5nIGZpZWxkc1xuXG4gICAgICBpdGVtcyA9IGl0ZW1zLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5pZCAmJiBpdGVtLnRpdGxlICYmIGl0ZW0uY29udGVudDtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJnZXRPYmplY3RQcm9wXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGdldE9iamVjdFByb3Aob2JqLCBrZXlzKSB7XG4gICAgICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5c1tpXSkpIHtcbiAgICAgICAgICBvYmogPSBvYmpba2V5c1tpXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0ludmFsaWQgbWFwIGtleScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUgPSB0aGlzLnN0YXRlLFxuICAgICAgICAgIGVycm9yID0gX3RoaXMkc3RhdGUuZXJyb3IsXG4gICAgICAgICAgaXNMb2FkZWQgPSBfdGhpcyRzdGF0ZS5pc0xvYWRlZCxcbiAgICAgICAgICBpdGVtcyA9IF90aGlzJHN0YXRlLml0ZW1zO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgXCJFcnJvcjogXCIsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIGlmICghaXNMb2FkZWQpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgXCJMb2FkaW5nLi4uXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0FjY29yZGlvbi5kZWZhdWx0LCB7XG4gICAgICAgICAgaXRlbXM6IGl0ZW1zXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBKc29uUGFyc2VyO1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBKc29uUGFyc2VyO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGFcIjo3LFwiLi9BY2NvcmRpb25cIjo0LFwidXVpZC92MVwiOjN9XSw2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX0pzb25QYXJzZXIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0NvbXBvbmVudHMvSnNvblBhcnNlclwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbnZhciBkb21FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kSnNvblJlbmRlckVsZW1lbnQpO1xuUmVhY3RET00ucmVuZGVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0pzb25QYXJzZXIuZGVmYXVsdCwge1xuICB1cmw6IGRvbUVsZW1lbnQuZGF0YXNldC51cmwsXG4gIGZpZWxkTWFwOiBKU09OLnBhcnNlKGRvbUVsZW1lbnQuZGF0YXNldC5maWVsZG1hcClcbn0pLCBkb21FbGVtZW50KTtcblxufSx7XCIuL0NvbXBvbmVudHMvSnNvblBhcnNlclwiOjV9XSw3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICByZXR1cm4gZmV0Y2godXJsKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICByZXR1cm4gcmVzLmpzb24oKTtcbiAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgfTtcbiAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yOiBlcnJvclxuICAgIH07XG4gIH0pO1xufVxuXG52YXIgX2RlZmF1bHQgPSBnZXRBcGlEYXRhO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dfSx7fSxbNl0pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZkWFZwWkM5c2FXSXZZbmwwWlhOVWIxVjFhV1F1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12ZFhWcFpDOXNhV0l2Y201bkxXSnliM2R6WlhJdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmRYVnBaQzkyTVM1cWN5SXNJbk52ZFhKalpTOXFjeTlHY205dWRDOURiMjF3YjI1bGJuUnpMMEZqWTI5eVpHbHZiaTVxY3lJc0luTnZkWEpqWlM5cWN5OUdjbTl1ZEM5RGIyMXdiMjVsYm5SekwwcHpiMjVRWVhKelpYSXVhbk1pTENKemIzVnlZMlV2YW5NdlJuSnZiblF2U1c1a1pYaEdjbTl1ZEM1cWN5SXNJbk52ZFhKalpTOXFjeTlWZEdsc2FYUnBaWE12WjJWMFFYQnBSR0YwWVM1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHRCUTBGQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUTNoQ1FUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEJRMnhEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenM3T3pzN096czdRVU0zUjBFc1UwRkJVeXhUUVVGVUxFTkJRVzFDTEV0QlFXNUNMRVZCUVRCQ08wRkJRM1JDTEZOQlEwazdRVUZCU3l4SlFVRkJMRk5CUVZNc1JVRkJRenRCUVVGbUxFdEJRMHNzUzBGQlN5eERRVUZETEV0QlFVNHNRMEZCV1N4SFFVRmFMRU5CUVdkQ0xGVkJRVUVzU1VGQlNUdEJRVUZCTEZkQlEycENPMEZCUVZNc1RVRkJRU3hUUVVGVExFVkJRVU1zYlVKQlFXNUNPMEZCUVhWRExFMUJRVUVzUjBGQlJ5eEZRVUZGTEVsQlFVa3NRMEZCUXp0QlFVRnFSQ3hQUVVOSk8wRkJRVThzVFVGQlFTeFJRVUZSTEVWQlFVTXNSMEZCYUVJN1FVRkJiMElzVFVGQlFTeFRRVUZUTEVWQlFVTXNhMEpCUVRsQ08wRkJRV2xFTEUxQlFVRXNUMEZCVHl4RlFVRkRPMEZCUVhwRUxFOUJRMHNzU1VGQlNTeERRVUZETEV0QlJGWXNRMEZFU2l4RlFVbEpPMEZCUVVzc1RVRkJRU3hUUVVGVExFVkJRVU03UVVGQlppeFBRVU5MTEVsQlFVa3NRMEZCUXl4UFFVUldMRU5CU2tvc1EwRkVhVUk3UVVGQlFTeEhRVUZ3UWl4RFFVUk1MRU5CUkVvN1FVRmpTRHM3WlVGRll5eFRPenM3T3pzN096czdPenRCUTJwQ1pqczdRVUZEUVRzN1FVRkRRVHM3T3pzN096czdPenM3T3pzN096czdPenM3T3p0SlFVVk5MRlU3T3pzN08wRkJRMFlzZDBKQlFXTTdRVUZCUVRzN1FVRkJRVHM3UVVGRFZqdEJRVU5CTEZWQlFVc3NTMEZCVEN4SFFVRmhPMEZCUTFRc1RVRkJRU3hMUVVGTExFVkJRVVVzU1VGRVJUdEJRVVZVTEUxQlFVRXNVVUZCVVN4RlFVRkZMRXRCUmtRN1FVRkhWQ3hOUVVGQkxFdEJRVXNzUlVGQlJUdEJRVWhGTEV0QlFXSTdRVUZHVlR0QlFVOWlPenM3TzNkRFFVVnRRanRCUVVOb1FpeFhRVUZMTEU5QlFVdzdRVUZEU0RzN096aENRVVZUTzBGQlFVRTdPMEZCUVVFc1ZVRkRReXhIUVVSRUxFZEJRMUVzUzBGQlN5eExRVVJpTEVOQlEwTXNSMEZFUkR0QlFVVk9MQ3RDUVVGWExFZEJRVmdzUlVGRFN5eEpRVVJNTEVOQlJWRXNaMEpCUVdNN1FVRkJRU3haUVVGYUxFMUJRVmtzVVVGQldpeE5RVUZaT3p0QlFVTldMRmxCUVUwc1NVRkJTU3hIUVVGSExFMUJRVWtzUTBGQlF5eFBRVUZNTEVOQlFXRXNUVUZCWWl4RFFVRmlPenRCUVVOQkxGbEJRVWtzUTBGQlF5eEpRVUZFTEVsQlFWTXNUVUZCVFN4RFFVRkRMRWxCUVZBc1EwRkJXU3hKUVVGYUxFVkJRV3RDTEUxQlFXeENMRXRCUVRaQ0xFTkJRVEZETEVWQlFUWkRPMEZCUTNwRExGVkJRVUVzVFVGQlNTeERRVUZETEZGQlFVd3NRMEZCWXp0QlFVTldMRmxCUVVFc1MwRkJTeXhGUVVGRkxFdEJRVXNzUTBGQlF5eG5RMEZCUkN4RFFVUkdPMEZCUlZZc1dVRkJRU3hSUVVGUkxFVkJRVVU3UVVGR1FTeFhRVUZrT3p0QlFVbEJPMEZCUTBnN08wRkJRMFFzVVVGQlFTeE5RVUZKTEVOQlFVTXNVVUZCVEN4RFFVRmpPMEZCUVVNc1ZVRkJRU3hSUVVGUkxFVkJRVVVzU1VGQldEdEJRVUZwUWl4VlFVRkJMRXRCUVVzc1JVRkJSVHRCUVVGNFFpeFRRVUZrTzBGQlEwZ3NUMEZhVkN4RlFWbFhMR2xDUVVGaE8wRkJRVUVzV1VGQldDeExRVUZYTEZOQlFWZ3NTMEZCVnpzN1FVRkRXaXhSUVVGQkxFMUJRVWtzUTBGQlF5eFJRVUZNTEVOQlFXTTdRVUZCUXl4VlFVRkJMRkZCUVZFc1JVRkJSU3hKUVVGWU8wRkJRV2xDTEZWQlFVRXNTMEZCU3l4RlFVRk1PMEZCUVdwQ0xGTkJRV1E3UVVGRFNDeFBRV1JVTzBGQlowSklPenM3TkVKQlJVOHNVU3hGUVVGVk8wRkJRVUU3TzBGQlFVRXNWVUZEVUN4UlFVUlBMRWRCUTBzc1MwRkJTeXhMUVVSV0xFTkJRMUFzVVVGRVR5eEZRVVZrT3p0QlFVTkJMRlZCUVVrc1MwRkJTeXhIUVVGSExFdEJRVXNzWVVGQlRDeERRVUZ0UWl4UlFVRnVRaXhGUVVFMlFpeFJRVUZSTEVOQlFVTXNZVUZCVkN4SFFVRjVRaXhSUVVGUkxFTkJRVU1zWVVGQlZDeERRVUYxUWl4TFFVRjJRaXhEUVVFMlFpeEhRVUUzUWl4RFFVRjZRaXhIUVVFMlJDeEZRVUV4Uml4RFFVRmFPenRCUVVOQkxGVkJRVWtzUTBGQlF5eExRVUZFTEVsQlFWVXNUVUZCVFN4RFFVRkRMRWxCUVZBc1EwRkJXU3hMUVVGYUxFVkJRVzFDTEUxQlFXNUNMRXRCUVRoQ0xFTkJRVFZETEVWQlFTdERPMEZCUXpORE8wRkJRMGdzVDBGT1lTeERRVTlrT3pzN1FVRkRRU3hOUVVGQkxFdEJRVXNzUjBGQlJ5eExRVUZMTEVOQlFVTXNSMEZCVGl4RFFVRlZMRlZCUVVFc1NVRkJTVHRCUVVGQkxHVkJRVXM3UVVGRGRrSXNWVUZCUVN4RlFVRkZMRVZCUVVVc2FVSkJSRzFDTzBGQlJYWkNMRlZCUVVFc1MwRkJTeXhGUVVGRkxFMUJRVWtzUTBGQlF5eGhRVUZNTEVOQlFXMUNMRWxCUVc1Q0xFVkJRWGxDTEZGQlFWRXNRMEZCUXl4TFFVRlVMRU5CUVdVc1MwRkJaaXhEUVVGeFFpeEhRVUZ5UWl4RFFVRjZRaXhEUVVablFqdEJRVWQyUWl4VlFVRkJMRTlCUVU4c1JVRkJSU3hOUVVGSkxFTkJRVU1zWVVGQlRDeERRVUZ0UWl4SlFVRnVRaXhGUVVGNVFpeFJRVUZSTEVOQlFVTXNUMEZCVkN4RFFVRnBRaXhMUVVGcVFpeERRVUYxUWl4SFFVRjJRaXhEUVVGNlFqdEJRVWhqTEZOQlFVdzdRVUZCUVN4UFFVRmtMRU5CUVZJc1EwRlNZeXhEUVdGa096dEJRVU5CTEUxQlFVRXNTMEZCU3l4SFFVRkhMRXRCUVVzc1EwRkJReXhOUVVGT0xFTkJRV0VzVlVGQlZTeEpRVUZXTEVWQlFXZENPMEZCUTJwRExHVkJRVThzU1VGQlNTeERRVUZETEVWQlFVd3NTVUZCVnl4SlFVRkpMRU5CUVVNc1MwRkJhRUlzU1VGQmVVSXNTVUZCU1N4RFFVRkRMRTlCUVhKRE8wRkJRMGdzVDBGR1R5eERRVUZTTzBGQlNVRXNZVUZCVHl4TFFVRlFPMEZCUTBnN096dHJRMEZGWVN4SExFVkJRVXNzU1N4RlFVRk5PMEZCUTNKQ0xGVkJRVWtzU1VGQlNTeERRVUZETEUxQlFVd3NTMEZCWjBJc1EwRkJjRUlzUlVGQmRVSTdRVUZEYmtJc1pVRkJUeXhIUVVGUU8wRkJRMGc3TzBGQlJVUXNWMEZCU3l4SlFVRkpMRU5CUVVNc1IwRkJSeXhEUVVGaUxFVkJRV2RDTEVOQlFVTXNSMEZCUnl4SlFVRkpMRU5CUVVNc1RVRkJla0lzUlVGQmFVTXNRMEZCUXl4RlFVRnNReXhGUVVGelF6dEJRVU5zUXl4WlFVRkpMRWRCUVVjc1EwRkJReXhqUVVGS0xFTkJRVzFDTEVsQlFVa3NRMEZCUXl4RFFVRkVMRU5CUVhaQ0xFTkJRVW9zUlVGQmFVTTdRVUZETjBJc1ZVRkJRU3hIUVVGSExFZEJRVWNzUjBGQlJ5eERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkVMRU5CUVV3c1EwRkJWRHRCUVVOSUxGTkJSa1FzVFVGRlR6dEJRVU5JTEZWQlFVRXNUMEZCVHl4RFFVRkRMRWRCUVZJc1EwRkJXU3hwUWtGQldqdEJRVU5CTEdsQ1FVRlBMRWxCUVZBN1FVRkRTRHRCUVVOS096dEJRVVZFTEdGQlFVOHNSMEZCVUR0QlFVTklPenM3TmtKQlJWRTdRVUZCUVN4M1FrRkRORUlzUzBGQlN5eExRVVJxUXp0QlFVRkJMRlZCUTBVc1MwRkVSaXhsUVVORkxFdEJSRVk3UVVGQlFTeFZRVU5UTEZGQlJGUXNaVUZEVXl4UlFVUlVPMEZCUVVFc1ZVRkRiVUlzUzBGRWJrSXNaVUZEYlVJc1MwRkVia0k3TzBGQlJVd3NWVUZCU1N4TFFVRktMRVZCUVZjN1FVRkRVQ3hsUVVGUExEUkRRVUZoTEV0QlFVc3NRMEZCUXl4UFFVRnVRaXhEUVVGUU8wRkJRMGdzVDBGR1JDeE5RVVZQTEVsQlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRiRUlzWlVGQlR5dzRRMEZCVUR0QlFVTklMRTlCUmswc1RVRkZRVHRCUVVOSUxHVkJRMGtzYjBKQlFVTXNhMEpCUVVRN1FVRkJWeXhWUVVGQkxFdEJRVXNzUlVGQlJUdEJRVUZzUWl4VlFVUktPMEZCUjBnN1FVRkRTanM3T3p0RlFXNUdiMElzUzBGQlN5eERRVUZETEZNN08yVkJjMFpvUWl4Vk96czdPenM3UVVNeFJtWTdPenM3UVVGRlFTeEpRVUZOTEc5Q1FVRnZRaXhIUVVGSExIZENRVUUzUWp0QlFVTkJMRWxCUVUwc1ZVRkJWU3hIUVVGSExGRkJRVkVzUTBGQlF5eGpRVUZVTEVOQlFYZENMRzlDUVVGNFFpeERRVUZ1UWp0QlFVVkJMRkZCUVZFc1EwRkJReXhOUVVGVUxFTkJRMGtzYjBKQlFVTXNiVUpCUVVRN1FVRkJXU3hGUVVGQkxFZEJRVWNzUlVGQlJTeFZRVUZWTEVOQlFVTXNUMEZCV0N4RFFVRnRRaXhIUVVGd1F6dEJRVUY1UXl4RlFVRkJMRkZCUVZFc1JVRkJSU3hKUVVGSkxFTkJRVU1zUzBGQlRDeERRVUZYTEZWQlFWVXNRMEZCUXl4UFFVRllMRU5CUVcxQ0xGRkJRVGxDTzBGQlFXNUVMRVZCUkVvc1JVRkZTU3hWUVVaS096czdPenM3T3pzN08wRkRURUVzVTBGQlV5eFZRVUZVTEVOQlFXOUNMRWRCUVhCQ0xFVkJRWGxDTzBGQlEzSkNMRk5CUVU4c1MwRkJTeXhEUVVGRExFZEJRVVFzUTBGQlRDeERRVU5HTEVsQlJFVXNRMEZEUnl4VlFVRkJMRWRCUVVjN1FVRkJRU3hYUVVGSkxFZEJRVWNzUTBGQlF5eEpRVUZLTEVWQlFVbzdRVUZCUVN4SFFVUk9MRVZCUlVZc1NVRkdSU3hEUVVkRExGVkJRVU1zVFVGQlJEdEJRVUZCTEZkQlFXRTdRVUZCUXl4TlFVRkJMRTFCUVUwc1JVRkJUanRCUVVGRUxFdEJRV0k3UVVGQlFTeEhRVWhFTEVWQlNVTXNWVUZCUXl4TFFVRkVPMEZCUVVFc1YwRkJXVHRCUVVGRExFMUJRVUVzUzBGQlN5eEZRVUZNTzBGQlFVUXNTMEZCV2p0QlFVRkJMRWRCU2tRc1EwRkJVRHRCUVUxSU96dGxRVVZqTEZVaUxDSm1hV3hsSWpvaVoyVnVaWEpoZEdWa0xtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJaWhtZFc1amRHbHZiaWdwZTJaMWJtTjBhVzl1SUhJb1pTeHVMSFFwZTJaMWJtTjBhVzl1SUc4b2FTeG1LWHRwWmlnaGJsdHBYU2w3YVdZb0lXVmJhVjBwZTNaaGNpQmpQVndpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUhKbGNYVnBjbVVtSm5KbGNYVnBjbVU3YVdZb0lXWW1KbU1wY21WMGRYSnVJR01vYVN3aE1DazdhV1lvZFNseVpYUjFjbTRnZFNocExDRXdLVHQyWVhJZ1lUMXVaWGNnUlhKeWIzSW9YQ0pEWVc1dWIzUWdabWx1WkNCdGIyUjFiR1VnSjF3aUsya3JYQ0luWENJcE8zUm9jbTkzSUdFdVkyOWtaVDFjSWsxUFJGVk1SVjlPVDFSZlJrOVZUa1JjSWl4aGZYWmhjaUJ3UFc1YmFWMDllMlY0Y0c5eWRITTZlMzE5TzJWYmFWMWJNRjB1WTJGc2JDaHdMbVY0Y0c5eWRITXNablZ1WTNScGIyNG9jaWw3ZG1GeUlHNDlaVnRwWFZzeFhWdHlYVHR5WlhSMWNtNGdieWh1Zkh4eUtYMHNjQ3h3TG1WNGNHOXlkSE1zY2l4bExHNHNkQ2w5Y21WMGRYSnVJRzViYVYwdVpYaHdiM0owYzMxbWIzSW9kbUZ5SUhVOVhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjbVZ4ZFdseVpTWW1jbVZ4ZFdseVpTeHBQVEE3YVR4MExteGxibWQwYUR0cEt5c3BieWgwVzJsZEtUdHlaWFIxY200Z2IzMXlaWFIxY200Z2NuMHBLQ2tpTENJdktpcGNiaUFxSUVOdmJuWmxjblFnWVhKeVlYa2diMllnTVRZZ1lubDBaU0IyWVd4MVpYTWdkRzhnVlZWSlJDQnpkSEpwYm1jZ1ptOXliV0YwSUc5bUlIUm9aU0JtYjNKdE9seHVJQ29nV0ZoWVdGaFlXRmd0V0ZoWVdDMVlXRmhZTFZoWVdGZ3RXRmhZV0ZoWVdGaFlXRmhZWEc0Z0tpOWNiblpoY2lCaWVYUmxWRzlJWlhnZ1BTQmJYVHRjYm1admNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z01qVTJPeUFySzJrcElIdGNiaUFnWW5sMFpWUnZTR1Y0VzJsZElEMGdLR2tnS3lBd2VERXdNQ2t1ZEc5VGRISnBibWNvTVRZcExuTjFZbk4wY2lneEtUdGNibjFjYmx4dVpuVnVZM1JwYjI0Z1lubDBaWE5VYjFWMWFXUW9ZblZtTENCdlptWnpaWFFwSUh0Y2JpQWdkbUZ5SUdrZ1BTQnZabVp6WlhRZ2ZId2dNRHRjYmlBZ2RtRnlJR0owYUNBOUlHSjVkR1ZVYjBobGVEdGNiaUFnTHk4Z2FtOXBiaUIxYzJWa0lIUnZJR1pwZUNCdFpXMXZjbmtnYVhOemRXVWdZMkYxYzJWa0lHSjVJR052Ym1OaGRHVnVZWFJwYjI0NklHaDBkSEJ6T2k4dlluVm5jeTVqYUhKdmJXbDFiUzV2Y21jdmNDOTJPQzlwYzNOMVpYTXZaR1YwWVdsc1AybGtQVE14TnpVall6UmNiaUFnY21WMGRYSnVJQ2hiWW5Sb1cySjFabHRwS3l0ZFhTd2dZblJvVzJKMVpsdHBLeXRkWFN3Z1hHNWNkR0owYUZ0aWRXWmJhU3NyWFYwc0lHSjBhRnRpZFdaYmFTc3JYVjBzSUNjdEp5eGNibHgwWW5Sb1cySjFabHRwS3l0ZFhTd2dZblJvVzJKMVpsdHBLeXRkWFN3Z0p5MG5MRnh1WEhSaWRHaGJZblZtVzJrcksxMWRMQ0JpZEdoYlluVm1XMmtySzExZExDQW5MU2NzWEc1Y2RHSjBhRnRpZFdaYmFTc3JYVjBzSUdKMGFGdGlkV1piYVNzclhWMHNJQ2N0Snl4Y2JseDBZblJvVzJKMVpsdHBLeXRkWFN3Z1luUm9XMkoxWmx0cEt5dGRYU3hjYmx4MFluUm9XMkoxWmx0cEt5dGRYU3dnWW5Sb1cySjFabHRwS3l0ZFhTeGNibHgwWW5Sb1cySjFabHRwS3l0ZFhTd2dZblJvVzJKMVpsdHBLeXRkWFYwcExtcHZhVzRvSnljcE8xeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUdKNWRHVnpWRzlWZFdsa08xeHVJaXdpTHk4Z1ZXNXBjWFZsSUVsRUlHTnlaV0YwYVc5dUlISmxjWFZwY21WeklHRWdhR2xuYUNCeGRXRnNhWFI1SUhKaGJtUnZiU0FqSUdkbGJtVnlZWFJ2Y2k0Z0lFbHVJSFJvWlZ4dUx5OGdZbkp2ZDNObGNpQjBhR2x6SUdseklHRWdiR2wwZEd4bElHTnZiWEJzYVdOaGRHVmtJR1IxWlNCMGJ5QjFibXR1YjNkdUlIRjFZV3hwZEhrZ2IyWWdUV0YwYUM1eVlXNWtiMjBvS1Z4dUx5OGdZVzVrSUdsdVkyOXVjMmx6ZEdWdWRDQnpkWEJ3YjNKMElHWnZjaUIwYUdVZ1lHTnllWEIwYjJBZ1FWQkpMaUFnVjJVZ1pHOGdkR2hsSUdKbGMzUWdkMlVnWTJGdUlIWnBZVnh1THk4Z1ptVmhkSFZ5WlMxa1pYUmxZM1JwYjI1Y2JseHVMeThnWjJWMFVtRnVaRzl0Vm1Gc2RXVnpJRzVsWldSeklIUnZJR0psSUdsdWRtOXJaV1FnYVc0Z1lTQmpiMjUwWlhoMElIZG9aWEpsSUZ3aWRHaHBjMXdpSUdseklHRWdRM0o1Y0hSdlhHNHZMeUJwYlhCc1pXMWxiblJoZEdsdmJpNGdRV3h6Ynl3Z1ptbHVaQ0IwYUdVZ1kyOXRjR3hsZEdVZ2FXMXdiR1Z0Wlc1MFlYUnBiMjRnYjJZZ1kzSjVjSFJ2SUc5dUlFbEZNVEV1WEc1MllYSWdaMlYwVW1GdVpHOXRWbUZzZFdWeklEMGdLSFI1Y0dWdlppaGpjbmx3ZEc4cElDRTlJQ2QxYm1SbFptbHVaV1FuSUNZbUlHTnllWEIwYnk1blpYUlNZVzVrYjIxV1lXeDFaWE1nSmlZZ1kzSjVjSFJ2TG1kbGRGSmhibVJ2YlZaaGJIVmxjeTVpYVc1a0tHTnllWEIwYnlrcElIeDhYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0tIUjVjR1Z2WmlodGMwTnllWEIwYnlrZ0lUMGdKM1Z1WkdWbWFXNWxaQ2NnSmlZZ2RIbHdaVzltSUhkcGJtUnZkeTV0YzBOeWVYQjBieTVuWlhSU1lXNWtiMjFXWVd4MVpYTWdQVDBnSjJaMWJtTjBhVzl1SnlBbUppQnRjME55ZVhCMGJ5NW5aWFJTWVc1a2IyMVdZV3gxWlhNdVltbHVaQ2h0YzBOeWVYQjBieWtwTzF4dVhHNXBaaUFvWjJWMFVtRnVaRzl0Vm1Gc2RXVnpLU0I3WEc0Z0lDOHZJRmRJUVZSWFJ5Qmpjbmx3ZEc4Z1VrNUhJQzBnYUhSMGNEb3ZMM2RwYTJrdWQyaGhkSGRuTG05eVp5OTNhV3RwTDBOeWVYQjBiMXh1SUNCMllYSWdjbTVrY3pnZ1BTQnVaWGNnVldsdWREaEJjbkpoZVNneE5pazdJQzh2SUdWemJHbHVkQzFrYVhOaFlteGxMV3hwYm1VZ2JtOHRkVzVrWldaY2JseHVJQ0J0YjJSMWJHVXVaWGh3YjNKMGN5QTlJR1oxYm1OMGFXOXVJSGRvWVhSM1oxSk9SeWdwSUh0Y2JpQWdJQ0JuWlhSU1lXNWtiMjFXWVd4MVpYTW9jbTVrY3pncE8xeHVJQ0FnSUhKbGRIVnliaUJ5Ym1Sek9EdGNiaUFnZlR0Y2JuMGdaV3h6WlNCN1hHNGdJQzh2SUUxaGRHZ3VjbUZ1Wkc5dEtDa3RZbUZ6WldRZ0tGSk9SeWxjYmlBZ0x5OWNiaUFnTHk4Z1NXWWdZV3hzSUdWc2MyVWdabUZwYkhNc0lIVnpaU0JOWVhSb0xuSmhibVJ2YlNncExpQWdTWFFuY3lCbVlYTjBMQ0JpZFhRZ2FYTWdiMllnZFc1emNHVmphV1pwWldSY2JpQWdMeThnY1hWaGJHbDBlUzVjYmlBZ2RtRnlJSEp1WkhNZ1BTQnVaWGNnUVhKeVlYa29NVFlwTzF4dVhHNGdJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdablZ1WTNScGIyNGdiV0YwYUZKT1J5Z3BJSHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTUN3Z2Nqc2dhU0E4SURFMk95QnBLeXNwSUh0Y2JpQWdJQ0FnSUdsbUlDZ29hU0FtSURCNE1ETXBJRDA5UFNBd0tTQnlJRDBnVFdGMGFDNXlZVzVrYjIwb0tTQXFJREI0TVRBd01EQXdNREF3TzF4dUlDQWdJQ0FnY201a2MxdHBYU0E5SUhJZ1BqNCtJQ2dvYVNBbUlEQjRNRE1wSUR3OElETXBJQ1lnTUhobVpqdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpYUjFjbTRnY201a2N6dGNiaUFnZlR0Y2JuMWNiaUlzSW5aaGNpQnlibWNnUFNCeVpYRjFhWEpsS0NjdUwyeHBZaTl5Ym1jbktUdGNiblpoY2lCaWVYUmxjMVJ2VlhWcFpDQTlJSEpsY1hWcGNtVW9KeTR2YkdsaUwySjVkR1Z6Vkc5VmRXbGtKeWs3WEc1Y2JpOHZJQ29xWUhZeEtDbGdJQzBnUjJWdVpYSmhkR1VnZEdsdFpTMWlZWE5sWkNCVlZVbEVLaXBjYmk4dlhHNHZMeUJKYm5Od2FYSmxaQ0JpZVNCb2RIUndjem92TDJkcGRHaDFZaTVqYjIwdlRHbHZjMHN2VlZWSlJDNXFjMXh1THk4Z1lXNWtJR2gwZEhBNkx5OWtiMk56TG5CNWRHaHZiaTV2Y21jdmJHbGljbUZ5ZVM5MWRXbGtMbWgwYld4Y2JseHVkbUZ5SUY5dWIyUmxTV1E3WEc1MllYSWdYMk5zYjJOcmMyVnhPMXh1WEc0dkx5QlFjbVYyYVc5MWN5QjFkV2xrSUdOeVpXRjBhVzl1SUhScGJXVmNiblpoY2lCZmJHRnpkRTFUWldOeklEMGdNRHRjYm5aaGNpQmZiR0Z6ZEU1VFpXTnpJRDBnTUR0Y2JseHVMeThnVTJWbElHaDBkSEJ6T2k4dloybDBhSFZpTG1OdmJTOWljbTl2Wm1FdmJtOWtaUzExZFdsa0lHWnZjaUJCVUVrZ1pHVjBZV2xzYzF4dVpuVnVZM1JwYjI0Z2RqRW9iM0IwYVc5dWN5d2dZblZtTENCdlptWnpaWFFwSUh0Y2JpQWdkbUZ5SUdrZ1BTQmlkV1lnSmlZZ2IyWm1jMlYwSUh4OElEQTdYRzRnSUhaaGNpQmlJRDBnWW5WbUlIeDhJRnRkTzF4dVhHNGdJRzl3ZEdsdmJuTWdQU0J2Y0hScGIyNXpJSHg4SUh0OU8xeHVJQ0IyWVhJZ2JtOWtaU0E5SUc5d2RHbHZibk11Ym05a1pTQjhmQ0JmYm05a1pVbGtPMXh1SUNCMllYSWdZMnh2WTJ0elpYRWdQU0J2Y0hScGIyNXpMbU5zYjJOcmMyVnhJQ0U5UFNCMWJtUmxabWx1WldRZ1B5QnZjSFJwYjI1ekxtTnNiMk5yYzJWeElEb2dYMk5zYjJOcmMyVnhPMXh1WEc0Z0lDOHZJRzV2WkdVZ1lXNWtJR05zYjJOcmMyVnhJRzVsWldRZ2RHOGdZbVVnYVc1cGRHbGhiR2w2WldRZ2RHOGdjbUZ1Wkc5dElIWmhiSFZsY3lCcFppQjBhR1Y1SjNKbElHNXZkRnh1SUNBdkx5QnpjR1ZqYVdacFpXUXVJQ0JYWlNCa2J5QjBhR2x6SUd4aGVtbHNlU0IwYnlCdGFXNXBiV2w2WlNCcGMzTjFaWE1nY21Wc1lYUmxaQ0IwYnlCcGJuTjFabVpwWTJsbGJuUmNiaUFnTHk4Z2MzbHpkR1Z0SUdWdWRISnZjSGt1SUNCVFpXVWdJekU0T1Z4dUlDQnBaaUFvYm05a1pTQTlQU0J1ZFd4c0lIeDhJR05zYjJOcmMyVnhJRDA5SUc1MWJHd3BJSHRjYmlBZ0lDQjJZWElnYzJWbFpFSjVkR1Z6SUQwZ2NtNW5LQ2s3WEc0Z0lDQWdhV1lnS0c1dlpHVWdQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdMeThnVUdWeUlEUXVOU3dnWTNKbFlYUmxJR0Z1WkNBME9DMWlhWFFnYm05a1pTQnBaQ3dnS0RRM0lISmhibVJ2YlNCaWFYUnpJQ3NnYlhWc2RHbGpZWE4wSUdKcGRDQTlJREVwWEc0Z0lDQWdJQ0J1YjJSbElEMGdYMjV2WkdWSlpDQTlJRnRjYmlBZ0lDQWdJQ0FnYzJWbFpFSjVkR1Z6V3pCZElId2dNSGd3TVN4Y2JpQWdJQ0FnSUNBZ2MyVmxaRUo1ZEdWeld6RmRMQ0J6WldWa1FubDBaWE5iTWwwc0lITmxaV1JDZVhSbGMxc3pYU3dnYzJWbFpFSjVkR1Z6V3pSZExDQnpaV1ZrUW5sMFpYTmJOVjFjYmlBZ0lDQWdJRjA3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2hqYkc5amEzTmxjU0E5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0F2THlCUVpYSWdOQzR5TGpJc0lISmhibVJ2YldsNlpTQW9NVFFnWW1sMEtTQmpiRzlqYTNObGNWeHVJQ0FnSUNBZ1kyeHZZMnR6WlhFZ1BTQmZZMnh2WTJ0elpYRWdQU0FvYzJWbFpFSjVkR1Z6V3paZElEdzhJRGdnZkNCelpXVmtRbmwwWlhOYk4xMHBJQ1lnTUhnelptWm1PMXh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJQzh2SUZWVlNVUWdkR2x0WlhOMFlXMXdjeUJoY21VZ01UQXdJRzVoYm04dGMyVmpiMjVrSUhWdWFYUnpJSE5wYm1ObElIUm9aU0JIY21WbmIzSnBZVzRnWlhCdlkyZ3NYRzRnSUM4dklDZ3hOVGd5TFRFd0xURTFJREF3T2pBd0tTNGdJRXBUVG5WdFltVnljeUJoY21WdUozUWdjSEpsWTJselpTQmxibTkxWjJnZ1ptOXlJSFJvYVhNc0lITnZYRzRnSUM4dklIUnBiV1VnYVhNZ2FHRnVaR3hsWkNCcGJuUmxjbTVoYkd4NUlHRnpJQ2R0YzJWamN5Y2dLR2x1ZEdWblpYSWdiV2xzYkdselpXTnZibVJ6S1NCaGJtUWdKMjV6WldOekoxeHVJQ0F2THlBb01UQXdMVzVoYm05elpXTnZibVJ6SUc5bVpuTmxkQ0JtY205dElHMXpaV056S1NCemFXNWpaU0IxYm1sNElHVndiMk5vTENBeE9UY3dMVEF4TFRBeElEQXdPakF3TGx4dUlDQjJZWElnYlhObFkzTWdQU0J2Y0hScGIyNXpMbTF6WldOeklDRTlQU0IxYm1SbFptbHVaV1FnUHlCdmNIUnBiMjV6TG0xelpXTnpJRG9nYm1WM0lFUmhkR1VvS1M1blpYUlVhVzFsS0NrN1hHNWNiaUFnTHk4Z1VHVnlJRFF1TWk0eExqSXNJSFZ6WlNCamIzVnVkQ0J2WmlCMWRXbGtKM01nWjJWdVpYSmhkR1ZrSUdSMWNtbHVaeUIwYUdVZ1kzVnljbVZ1ZENCamJHOWphMXh1SUNBdkx5QmplV05zWlNCMGJ5QnphVzExYkdGMFpTQm9hV2RvWlhJZ2NtVnpiMngxZEdsdmJpQmpiRzlqYTF4dUlDQjJZWElnYm5ObFkzTWdQU0J2Y0hScGIyNXpMbTV6WldOeklDRTlQU0IxYm1SbFptbHVaV1FnUHlCdmNIUnBiMjV6TG01elpXTnpJRG9nWDJ4aGMzUk9VMlZqY3lBcklERTdYRzVjYmlBZ0x5OGdWR2x0WlNCemFXNWpaU0JzWVhOMElIVjFhV1FnWTNKbFlYUnBiMjRnS0dsdUlHMXpaV056S1Z4dUlDQjJZWElnWkhRZ1BTQW9iWE5sWTNNZ0xTQmZiR0Z6ZEUxVFpXTnpLU0FySUNodWMyVmpjeUF0SUY5c1lYTjBUbE5sWTNNcEx6RXdNREF3TzF4dVhHNGdJQzh2SUZCbGNpQTBMakl1TVM0eUxDQkNkVzF3SUdOc2IyTnJjMlZ4SUc5dUlHTnNiMk5ySUhKbFozSmxjM05wYjI1Y2JpQWdhV1lnS0dSMElEd2dNQ0FtSmlCdmNIUnBiMjV6TG1Oc2IyTnJjMlZ4SUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQmpiRzlqYTNObGNTQTlJR05zYjJOcmMyVnhJQ3NnTVNBbUlEQjRNMlptWmp0Y2JpQWdmVnh1WEc0Z0lDOHZJRkpsYzJWMElHNXpaV056SUdsbUlHTnNiMk5ySUhKbFozSmxjM05sY3lBb2JtVjNJR05zYjJOcmMyVnhLU0J2Y2lCM1pTZDJaU0J0YjNabFpDQnZiblJ2SUdFZ2JtVjNYRzRnSUM4dklIUnBiV1VnYVc1MFpYSjJZV3hjYmlBZ2FXWWdLQ2hrZENBOElEQWdmSHdnYlhObFkzTWdQaUJmYkdGemRFMVRaV056S1NBbUppQnZjSFJwYjI1ekxtNXpaV056SUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQnVjMlZqY3lBOUlEQTdYRzRnSUgxY2JseHVJQ0F2THlCUVpYSWdOQzR5TGpFdU1pQlVhSEp2ZHlCbGNuSnZjaUJwWmlCMGIyOGdiV0Z1ZVNCMWRXbGtjeUJoY21VZ2NtVnhkV1Z6ZEdWa1hHNGdJR2xtSUNodWMyVmpjeUErUFNBeE1EQXdNQ2tnZTF4dUlDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25kWFZwWkM1Mk1TZ3BPaUJEWVc1Y1hDZDBJR055WldGMFpTQnRiM0psSUhSb1lXNGdNVEJOSUhWMWFXUnpMM05sWXljcE8xeHVJQ0I5WEc1Y2JpQWdYMnhoYzNSTlUyVmpjeUE5SUcxelpXTnpPMXh1SUNCZmJHRnpkRTVUWldOeklEMGdibk5sWTNNN1hHNGdJRjlqYkc5amEzTmxjU0E5SUdOc2IyTnJjMlZ4TzF4dVhHNGdJQzh2SUZCbGNpQTBMakV1TkNBdElFTnZiblpsY25RZ1puSnZiU0IxYm1sNElHVndiMk5vSUhSdklFZHlaV2R2Y21saGJpQmxjRzlqYUZ4dUlDQnRjMlZqY3lBclBTQXhNakl4T1RJNU1qZ3dNREF3TUR0Y2JseHVJQ0F2THlCZ2RHbHRaVjlzYjNkZ1hHNGdJSFpoY2lCMGJDQTlJQ2dvYlhObFkzTWdKaUF3ZUdabVptWm1abVlwSUNvZ01UQXdNREFnS3lCdWMyVmpjeWtnSlNBd2VERXdNREF3TURBd01EdGNiaUFnWWx0cEt5dGRJRDBnZEd3Z1BqNCtJREkwSUNZZ01IaG1aanRjYmlBZ1lsdHBLeXRkSUQwZ2RHd2dQajQrSURFMklDWWdNSGhtWmp0Y2JpQWdZbHRwS3l0ZElEMGdkR3dnUGo0K0lEZ2dKaUF3ZUdabU8xeHVJQ0JpVzJrcksxMGdQU0IwYkNBbUlEQjRabVk3WEc1Y2JpQWdMeThnWUhScGJXVmZiV2xrWUZ4dUlDQjJZWElnZEcxb0lEMGdLRzF6WldOeklDOGdNSGd4TURBd01EQXdNREFnS2lBeE1EQXdNQ2tnSmlBd2VHWm1abVptWm1ZN1hHNGdJR0piYVNzclhTQTlJSFJ0YUNBK1BqNGdPQ0FtSURCNFptWTdYRzRnSUdKYmFTc3JYU0E5SUhSdGFDQW1JREI0Wm1ZN1hHNWNiaUFnTHk4Z1lIUnBiV1ZmYUdsbmFGOWhibVJmZG1WeWMybHZibUJjYmlBZ1lsdHBLeXRkSUQwZ2RHMW9JRDQrUGlBeU5DQW1JREI0WmlCOElEQjRNVEE3SUM4dklHbHVZMngxWkdVZ2RtVnljMmx2Ymx4dUlDQmlXMmtySzEwZ1BTQjBiV2dnUGo0K0lERTJJQ1lnTUhobVpqdGNibHh1SUNBdkx5QmdZMnh2WTJ0ZmMyVnhYMmhwWDJGdVpGOXlaWE5sY25abFpHQWdLRkJsY2lBMExqSXVNaUF0SUdsdVkyeDFaR1VnZG1GeWFXRnVkQ2xjYmlBZ1lsdHBLeXRkSUQwZ1kyeHZZMnR6WlhFZ1BqNCtJRGdnZkNBd2VEZ3dPMXh1WEc0Z0lDOHZJR0JqYkc5amExOXpaWEZmYkc5M1lGeHVJQ0JpVzJrcksxMGdQU0JqYkc5amEzTmxjU0FtSURCNFptWTdYRzVjYmlBZ0x5OGdZRzV2WkdWZ1hHNGdJR1p2Y2lBb2RtRnlJRzRnUFNBd095QnVJRHdnTmpzZ0t5dHVLU0I3WEc0Z0lDQWdZbHRwSUNzZ2JsMGdQU0J1YjJSbFcyNWRPMXh1SUNCOVhHNWNiaUFnY21WMGRYSnVJR0oxWmlBL0lHSjFaaUE2SUdKNWRHVnpWRzlWZFdsa0tHSXBPMXh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlIWXhPMXh1SWl3aVpuVnVZM1JwYjI0Z1FXTmpiM0prYVc5dUtIQnliM0J6S1NCN1hHNGdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnUEdScGRpQmpiR0Z6YzA1aGJXVTlYQ0poWTJOdmNtUnBiMjRnWVdOamIzSmthVzl1TFdsamIyNGdZV05qYjNKa2FXOXVMV3hwYzNSY0lqNWNiaUFnSUNBZ0lDQWdJQ0FnSUh0d2NtOXdjeTVwZEdWdGN5NXRZWEFvYVhSbGJTQTlQaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhObFkzUnBiMjRnWTJ4aGMzTk9ZVzFsUFZ3aVlXTmpiM0prYVc5dUxYTmxZM1JwYjI1Y0lpQnJaWGs5ZTJsMFpXMHVhV1I5UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThiR0ZpWld3Z2RHRmlTVzVrWlhnOVhDSXdYQ0lnWTJ4aGMzTk9ZVzFsUFZ3aVlXTmpiM0prYVc5dUxYUnZaMmRzWlZ3aUlHaDBiV3hHYjNJOVhDSmhZMk52Y21ScGIyNHRjMlZqZEdsdmJpMHhYQ0krWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I3YVhSbGJTNTBhWFJzWlgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzlzWVdKbGJENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRpQmpiR0Z6YzA1aGJXVTlYQ0poWTJOdmNtUnBiMjR0WTI5dWRHVnVkRndpUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZTJsMFpXMHVZMjl1ZEdWdWRIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEM5a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzl6WldOMGFXOXVQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tTbDlYRzRnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNrN1hHNTlYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRUZqWTI5eVpHbHZianNpTENKcGJYQnZjblFnUVdOamIzSmthVzl1SUdaeWIyMGdKeTR2UVdOamIzSmthVzl1Snp0Y2JtbHRjRzl5ZENCMWRXbGtkakVnWm5KdmJTQW5kWFZwWkM5Mk1TYzdYRzVwYlhCdmNuUWdaMlYwUVhCcFJHRjBZU0JtY205dElDY3VMaTh1TGk5VmRHbHNhWFJwWlhNdloyVjBRWEJwUkdGMFlTYzdYRzVjYm1Oc1lYTnpJRXB6YjI1UVlYSnpaWElnWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZibk4wY25WamRHOXlLQ2tnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWdwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbk4wWVhSbElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pYSnliM0k2SUc1MWJHd3NYRzRnSUNBZ0lDQWdJQ0FnSUNCcGMweHZZV1JsWkRvZ1ptRnNjMlVzWEc0Z0lDQWdJQ0FnSUNBZ0lDQnBkR1Z0Y3pvZ1cxMHNYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdZMjl0Y0c5dVpXNTBSR2xrVFc5MWJuUW9LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVaMlYwUkdGMFlTZ3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHZGxkRVJoZEdFb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdDFjbXg5SUQwZ2RHaHBjeTV3Y205d2N6dGNiaUFnSUNBZ0lDQWdaMlYwUVhCcFJHRjBZU2gxY213cFhHNGdJQ0FnSUNBZ0lDQWdJQ0F1ZEdobGJpaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQW9lM0psYzNWc2RIMHBJRDArSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZMjl1YzNRZ1pHRjBZU0E5SUhSb2FYTXViV0Z3UkdGMFlTaHlaWE4xYkhRcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lXUmhkR0VnZkh3Z1QySnFaV04wTG10bGVYTW9aR0YwWVNrdWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JsY25KdmNqb2dSWEp5YjNJb0owTnZkV3hrSUc1dmRDQm1aWFJqYUNCa1lYUmhJR1p5YjIwZ1ZWSk1MaWNwTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbHpURzloWkdWa09pQjBjblZsWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtIdHBjMHh2WVdSbFpEb2dkSEoxWlN3Z2FYUmxiWE02SUdSaGRHRjlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5TENBb2UyVnljbTl5ZlNrZ1BUNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRwYzB4dllXUmxaRG9nZEhKMVpTd2daWEp5YjNKOUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUcxaGNFUmhkR0VvYW5OdmJrUmhkR0VwSUh0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnZTJacFpXeGtUV0Z3ZlNBOUlIUm9hWE11Y0hKdmNITTdYRzRnSUNBZ0lDQWdJQzh2SUVkbGRDQjBhR1VnYjJKcVpXTjBJR052Ym5SaGFXNXBibWNnYVhSbGJYTWdabkp2YlNCS1UwOU9YRzRnSUNBZ0lDQWdJR3hsZENCcGRHVnRjeUE5SUhSb2FYTXVaMlYwVDJKcVpXTjBVSEp2Y0NocWMyOXVSR0YwWVN3Z1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUEvSUdacFpXeGtUV0Z3TG1sMFpXMURiMjUwWVdsdVpYSXVjM0JzYVhRb0p5NG5LU0E2SUZ0ZEtUdGNiaUFnSUNBZ0lDQWdhV1lnS0NGcGRHVnRjeUI4ZkNCUFltcGxZM1F1YTJWNWN5aHBkR1Z0Y3lrdWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdMeThnVFdGd0lIUm9aU0JrWVhSaElHbDBaVzF6WEc0Z0lDQWdJQ0FnSUdsMFpXMXpJRDBnYVhSbGJYTXViV0Z3S0dsMFpXMGdQVDRnS0h0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xrT2lCMWRXbGtkakVvS1N4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJwZEd4bE9pQjBhR2x6TG1kbGRFOWlhbVZqZEZCeWIzQW9hWFJsYlN3Z1ptbGxiR1JOWVhBdWRHbDBiR1V1YzNCc2FYUW9KeTRuS1Nrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1MFpXNTBPaUIwYUdsekxtZGxkRTlpYW1WamRGQnliM0FvYVhSbGJTd2dabWxsYkdSTllYQXVZMjl1ZEdWdWRDNXpjR3hwZENnbkxpY3BLVnh1SUNBZ0lDQWdJQ0I5S1NrN1hHNGdJQ0FnSUNBZ0lDOHZJRkpsYlc5MlpTQnZZbXBsWTNSeklIZHBkR2dnYldsemMybHVaeUJtYVdWc1pITmNiaUFnSUNBZ0lDQWdhWFJsYlhNZ1BTQnBkR1Z0Y3k1bWFXeDBaWElvWm5WdVkzUnBiMjRnS0dsMFpXMHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCcGRHVnRMbWxrSUNZbUlHbDBaVzB1ZEdsMGJHVWdKaVlnYVhSbGJTNWpiMjUwWlc1ME8xeHVJQ0FnSUNBZ0lDQjlLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYVhSbGJYTTdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ1oyVjBUMkpxWldOMFVISnZjQ2h2WW1vc0lHdGxlWE1wSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR3RsZVhNdWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ1ptOXlJQ2hzWlhRZ2FTQTlJREE3SUdrZ1BDQnJaWGx6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9iMkpxTG1oaGMwOTNibEJ5YjNCbGNuUjVLR3RsZVhOYmFWMHBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYjJKcUlEMGdiMkpxVzJ0bGVYTmJhVjFkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmpiMjV6YjJ4bExteHZaeWduU1c1MllXeHBaQ0J0WVhBZ2EyVjVKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRzUxYkd3N1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2lncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UyVnljbTl5TENCcGMweHZZV1JsWkN3Z2FYUmxiWE45SUQwZ2RHaHBjeTV6ZEdGMFpUdGNiaUFnSUNBZ0lDQWdhV1lnS0dWeWNtOXlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1BHUnBkajVGY25KdmNqb2dlMlZ5Y205eUxtMWxjM05oWjJWOVBDOWthWFkrTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tDRnBjMHh2WVdSbFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4a2FYWStURzloWkdsdVp5NHVMand2WkdsMlBqdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEVGalkyOXlaR2x2YmlCcGRHVnRjejE3YVhSbGJYTjlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVwemIyNVFZWEp6WlhJN0lpd2lhVzF3YjNKMElFcHpiMjVRWVhKelpYSWdabkp2YlNBbkxpOURiMjF3YjI1bGJuUnpMMHB6YjI1UVlYSnpaWEluTzF4dVhHNWpiMjV6ZENCdGIyUktjMjl1VW1WdVpHVnlSV3hsYldWdWRDQTlJQ2R0YjJSMWJHRnlhWFI1TFdwemIyNHRjbVZ1WkdWeUp6dGNibU52Ym5OMElHUnZiVVZzWlcxbGJuUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaHRiMlJLYzI5dVVtVnVaR1Z5Uld4bGJXVnVkQ2s3WEc1Y2JsSmxZV04wUkU5TkxuSmxibVJsY2loY2JpQWdJQ0E4U25OdmJsQmhjbk5sY2lCMWNtdzllMlJ2YlVWc1pXMWxiblF1WkdGMFlYTmxkQzUxY214OUlHWnBaV3hrVFdGd1BYdEtVMDlPTG5CaGNuTmxLR1J2YlVWc1pXMWxiblF1WkdGMFlYTmxkQzVtYVdWc1pHMWhjQ2w5THo0c1hHNGdJQ0FnWkc5dFJXeGxiV1Z1ZEZ4dUtUc2lMQ0ptZFc1amRHbHZiaUJuWlhSQmNHbEVZWFJoS0hWeWJDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCbVpYUmphQ2gxY213cFhHNGdJQ0FnSUNBZ0lDNTBhR1Z1S0hKbGN5QTlQaUJ5WlhNdWFuTnZiaWdwS1Z4dUlDQWdJQ0FnSUNBdWRHaGxiaWhjYmlBZ0lDQWdJQ0FnSUNBZ0lDaHlaWE4xYkhRcElEMCtJQ2g3Y21WemRXeDBmU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQW9aWEp5YjNJcElEMCtJQ2g3WlhKeWIzSjlLVnh1SUNBZ0lDQWdJQ0FwTzF4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQm5aWFJCY0dsRVlYUmhPMXh1SWwxOVxuIl0sImZpbGUiOiJGcm9udC9JbmRleEZyb250LmpzIn0=
