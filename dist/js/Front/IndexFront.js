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
  var items = props.items,
      doSearch = props.doSearch;
  return React.createElement("div", {
    className: "accordion accordion-icon accordion-list"
  }, React.createElement("div", {
    className: "accordion-search"
  }, React.createElement("input", {
    type: "text",
    name: "json-render-search",
    onChange: doSearch,
    placeholder: "Filter on..."
  })), items.map(function (item) {
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

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

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
      items: [],
      filteredItems: []
    };
    _this.handleSearch = _this.handleSearch.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    _this.getObjectProp = _this.getObjectProp.bind(_assertThisInitialized(_assertThisInitialized(_this)));
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
          items: data,
          filteredItems: data
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
    key: "handleSearch",
    value: function handleSearch(event) {
      var searchString = event.target.value;
      var filteredItems = this.state.items;
      filteredItems = filteredItems.filter(function (item) {
        var title = item.title.toLowerCase();
        var content = item.content.toLowerCase();
        return title.indexOf(searchString.toLowerCase()) !== -1 || content.indexOf(searchString.toLowerCase()) !== -1;
      });
      this.setState({
        filteredItems: filteredItems
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this$state = this.state,
          error = _this$state.error,
          isLoaded = _this$state.isLoaded,
          filteredItems = _this$state.filteredItems;

      if (error) {
        return React.createElement("div", null, "Error: ", error.message);
      } else if (!isLoaded) {
        return React.createElement("div", null, "Loading...");
      } else {
        return React.createElement(_Accordion.default, {
          doSearch: this.handleSearch,
          items: filteredItems
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92MS5qcyIsInNvdXJjZS9qcy9Gcm9udC9Db21wb25lbnRzL0FjY29yZGlvbi5qcyIsInNvdXJjZS9qcy9Gcm9udC9Db21wb25lbnRzL0pzb25QYXJzZXIuanMiLCJzb3VyY2UvanMvRnJvbnQvSW5kZXhGcm9udC5qcyIsInNvdXJjZS9qcy9VdGlsaXRpZXMvZ2V0QXBpRGF0YS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7QUM3R0EsU0FBUyxTQUFULENBQW1CLEtBQW5CLEVBQTBCO0FBQUEsTUFDZixLQURlLEdBQ0ksS0FESixDQUNmLEtBRGU7QUFBQSxNQUNSLFFBRFEsR0FDSSxLQURKLENBQ1IsUUFEUTtBQUV0QixTQUNJO0FBQUssSUFBQSxTQUFTLEVBQUM7QUFBZixLQUVJO0FBQUssSUFBQSxTQUFTLEVBQUM7QUFBZixLQUNJO0FBQU8sSUFBQSxJQUFJLEVBQUMsTUFBWjtBQUFtQixJQUFBLElBQUksRUFBQyxvQkFBeEI7QUFBNkMsSUFBQSxRQUFRLEVBQUUsUUFBdkQ7QUFBaUUsSUFBQSxXQUFXLEVBQUM7QUFBN0UsSUFESixDQUZKLEVBTUssS0FBSyxDQUFDLEdBQU4sQ0FBVSxVQUFBLElBQUk7QUFBQSxXQUNYO0FBQVMsTUFBQSxTQUFTLEVBQUMsbUJBQW5CO0FBQXVDLE1BQUEsR0FBRyxFQUFFLElBQUksQ0FBQztBQUFqRCxPQUNJO0FBQU8sTUFBQSxRQUFRLEVBQUMsR0FBaEI7QUFBb0IsTUFBQSxTQUFTLEVBQUMsa0JBQTlCO0FBQWlELE1BQUEsT0FBTyxFQUFDO0FBQXpELE9BQ0ssSUFBSSxDQUFDLEtBRFYsQ0FESixFQUlJO0FBQUssTUFBQSxTQUFTLEVBQUM7QUFBZixPQUNLLElBQUksQ0FBQyxPQURWLENBSkosQ0FEVztBQUFBLEdBQWQsQ0FOTCxDQURKO0FBbUJIOztlQUVjLFM7Ozs7Ozs7Ozs7O0FDdkJmOztBQUNBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRU0sVTs7Ozs7QUFDRix3QkFBYztBQUFBOztBQUFBOztBQUNWO0FBQ0EsVUFBSyxLQUFMLEdBQWE7QUFDVCxNQUFBLEtBQUssRUFBRSxJQURFO0FBRVQsTUFBQSxRQUFRLEVBQUUsS0FGRDtBQUdULE1BQUEsS0FBSyxFQUFFLEVBSEU7QUFJVCxNQUFBLGFBQWEsRUFBRTtBQUpOLEtBQWI7QUFPQSxVQUFLLFlBQUwsR0FBb0IsTUFBSyxZQUFMLENBQWtCLElBQWxCLHVEQUFwQjtBQUNBLFVBQUssYUFBTCxHQUFxQixNQUFLLGFBQUwsQ0FBbUIsSUFBbkIsdURBQXJCO0FBVlU7QUFXYjs7Ozt3Q0FFbUI7QUFDaEIsV0FBSyxPQUFMO0FBQ0g7Ozs4QkFFUztBQUFBOztBQUFBLFVBQ0MsR0FERCxHQUNRLEtBQUssS0FEYixDQUNDLEdBREQ7QUFFTiwrQkFBVyxHQUFYLEVBQ0ssSUFETCxDQUVRLGdCQUFjO0FBQUEsWUFBWixNQUFZLFFBQVosTUFBWTs7QUFDVixZQUFNLElBQUksR0FBRyxNQUFJLENBQUMsT0FBTCxDQUFhLE1BQWIsQ0FBYjs7QUFDQSxZQUFJLENBQUMsSUFBRCxJQUFTLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBWixFQUFrQixNQUFsQixLQUE2QixDQUExQyxFQUE2QztBQUN6QyxVQUFBLE1BQUksQ0FBQyxRQUFMLENBQWM7QUFDVixZQUFBLEtBQUssRUFBRSxLQUFLLENBQUMsZ0NBQUQsQ0FERjtBQUVWLFlBQUEsUUFBUSxFQUFFO0FBRkEsV0FBZDs7QUFJQTtBQUNIOztBQUNELFFBQUEsTUFBSSxDQUFDLFFBQUwsQ0FBYztBQUNWLFVBQUEsUUFBUSxFQUFFLElBREE7QUFFVixVQUFBLEtBQUssRUFBRSxJQUZHO0FBR1YsVUFBQSxhQUFhLEVBQUU7QUFITCxTQUFkO0FBS0gsT0FoQlQsRUFnQlcsaUJBQWE7QUFBQSxZQUFYLEtBQVcsU0FBWCxLQUFXOztBQUNaLFFBQUEsTUFBSSxDQUFDLFFBQUwsQ0FBYztBQUFDLFVBQUEsUUFBUSxFQUFFLElBQVg7QUFBaUIsVUFBQSxLQUFLLEVBQUw7QUFBakIsU0FBZDtBQUNILE9BbEJUO0FBb0JIOzs7NEJBRU8sUSxFQUFVO0FBQUE7O0FBQUEsVUFDUCxRQURPLEdBQ0ssS0FBSyxLQURWLENBQ1AsUUFETyxFQUVkOztBQUNBLFVBQUksS0FBSyxHQUFHLEtBQUssYUFBTCxDQUFtQixRQUFuQixFQUE2QixRQUFRLENBQUMsYUFBVCxHQUF5QixRQUFRLENBQUMsYUFBVCxDQUF1QixLQUF2QixDQUE2QixHQUE3QixDQUF6QixHQUE2RCxFQUExRixDQUFaOztBQUNBLFVBQUksQ0FBQyxLQUFELElBQVUsTUFBTSxDQUFDLElBQVAsQ0FBWSxLQUFaLEVBQW1CLE1BQW5CLEtBQThCLENBQTVDLEVBQStDO0FBQzNDO0FBQ0gsT0FOYSxDQU9kOzs7QUFDQSxNQUFBLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBTixDQUFVLFVBQUEsSUFBSTtBQUFBLGVBQUs7QUFDdkIsVUFBQSxFQUFFLEVBQUUsaUJBRG1CO0FBRXZCLFVBQUEsS0FBSyxFQUFFLE1BQUksQ0FBQyxhQUFMLENBQW1CLElBQW5CLEVBQXlCLFFBQVEsQ0FBQyxLQUFULENBQWUsS0FBZixDQUFxQixHQUFyQixDQUF6QixDQUZnQjtBQUd2QixVQUFBLE9BQU8sRUFBRSxNQUFJLENBQUMsYUFBTCxDQUFtQixJQUFuQixFQUF5QixRQUFRLENBQUMsT0FBVCxDQUFpQixLQUFqQixDQUF1QixHQUF2QixDQUF6QjtBQUhjLFNBQUw7QUFBQSxPQUFkLENBQVIsQ0FSYyxDQWFkOztBQUNBLE1BQUEsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFOLENBQWEsVUFBVSxJQUFWLEVBQWdCO0FBQ2pDLGVBQU8sSUFBSSxDQUFDLEVBQUwsSUFBVyxJQUFJLENBQUMsS0FBaEIsSUFBeUIsSUFBSSxDQUFDLE9BQXJDO0FBQ0gsT0FGTyxDQUFSO0FBSUEsYUFBTyxLQUFQO0FBQ0g7OztrQ0FFYSxHLEVBQUssSSxFQUFNO0FBQ3JCLFVBQUksSUFBSSxDQUFDLE1BQUwsS0FBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsZUFBTyxHQUFQO0FBQ0g7O0FBRUQsV0FBSyxJQUFJLENBQUMsR0FBRyxDQUFiLEVBQWdCLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBekIsRUFBaUMsQ0FBQyxFQUFsQyxFQUFzQztBQUNsQyxZQUFJLEdBQUcsQ0FBQyxjQUFKLENBQW1CLElBQUksQ0FBQyxDQUFELENBQXZCLENBQUosRUFBaUM7QUFDN0IsVUFBQSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFELENBQUwsQ0FBVDtBQUNILFNBRkQsTUFFTztBQUNILFVBQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxpQkFBWjtBQUNBLGlCQUFPLElBQVA7QUFDSDtBQUNKOztBQUVELGFBQU8sR0FBUDtBQUNIOzs7aUNBRVksSyxFQUFPO0FBQ2hCLFVBQUksWUFBWSxHQUFHLEtBQUssQ0FBQyxNQUFOLENBQWEsS0FBaEM7QUFFQSxVQUFJLGFBQWEsR0FBRyxLQUFLLEtBQUwsQ0FBVyxLQUEvQjtBQUNBLE1BQUEsYUFBYSxHQUFHLGFBQWEsQ0FBQyxNQUFkLENBQXFCLFVBQUMsSUFBRCxFQUFVO0FBQzNDLFlBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFMLENBQVcsV0FBWCxFQUFaO0FBQ0EsWUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQUwsQ0FBYSxXQUFiLEVBQWQ7QUFDQSxlQUFPLEtBQUssQ0FBQyxPQUFOLENBQWMsWUFBWSxDQUFDLFdBQWIsRUFBZCxNQUE4QyxDQUFDLENBQS9DLElBQW9ELE9BQU8sQ0FBQyxPQUFSLENBQWdCLFlBQVksQ0FBQyxXQUFiLEVBQWhCLE1BQWdELENBQUMsQ0FBNUc7QUFDSCxPQUplLENBQWhCO0FBS0EsV0FBSyxRQUFMLENBQWM7QUFDVixRQUFBLGFBQWEsRUFBYjtBQURVLE9BQWQ7QUFHSDs7OzZCQUVRO0FBQUEsd0JBQ29DLEtBQUssS0FEekM7QUFBQSxVQUNFLEtBREYsZUFDRSxLQURGO0FBQUEsVUFDUyxRQURULGVBQ1MsUUFEVDtBQUFBLFVBQ21CLGFBRG5CLGVBQ21CLGFBRG5COztBQUdMLFVBQUksS0FBSixFQUFXO0FBQ1AsZUFBTyw0Q0FBYSxLQUFLLENBQUMsT0FBbkIsQ0FBUDtBQUNILE9BRkQsTUFFTyxJQUFJLENBQUMsUUFBTCxFQUFlO0FBQ2xCLGVBQU8sOENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPLG9CQUFDLGtCQUFEO0FBQVcsVUFBQSxRQUFRLEVBQUUsS0FBSyxZQUExQjtBQUNXLFVBQUEsS0FBSyxFQUFFO0FBRGxCLFVBQVA7QUFFSDtBQUNKOzs7O0VBekdvQixLQUFLLENBQUMsUzs7ZUE0R2hCLFU7Ozs7OztBQ2hIZjs7OztBQUVBLElBQU0sb0JBQW9CLEdBQUcsd0JBQTdCO0FBQ0EsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQVQsQ0FBd0Isb0JBQXhCLENBQW5CO0FBRUEsUUFBUSxDQUFDLE1BQVQsQ0FDSSxvQkFBQyxtQkFBRDtBQUFZLEVBQUEsR0FBRyxFQUFFLFVBQVUsQ0FBQyxPQUFYLENBQW1CLEdBQXBDO0FBQXlDLEVBQUEsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFMLENBQVcsVUFBVSxDQUFDLE9BQVgsQ0FBbUIsUUFBOUI7QUFBbkQsRUFESixFQUVJLFVBRko7Ozs7Ozs7Ozs7QUNMQSxTQUFTLFVBQVQsQ0FBb0IsR0FBcEIsRUFBeUI7QUFDckIsU0FBTyxLQUFLLENBQUMsR0FBRCxDQUFMLENBQ0YsSUFERSxDQUNHLFVBQUEsR0FBRztBQUFBLFdBQUksR0FBRyxDQUFDLElBQUosRUFBSjtBQUFBLEdBRE4sRUFFRixJQUZFLENBR0MsVUFBQyxNQUFEO0FBQUEsV0FBYTtBQUFDLE1BQUEsTUFBTSxFQUFOO0FBQUQsS0FBYjtBQUFBLEdBSEQsRUFJQyxVQUFDLEtBQUQ7QUFBQSxXQUFZO0FBQUMsTUFBQSxLQUFLLEVBQUw7QUFBRCxLQUFaO0FBQUEsR0FKRCxDQUFQO0FBTUg7O2VBRWMsVSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qKlxuICogQ29udmVydCBhcnJheSBvZiAxNiBieXRlIHZhbHVlcyB0byBVVUlEIHN0cmluZyBmb3JtYXQgb2YgdGhlIGZvcm06XG4gKiBYWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFhcbiAqL1xudmFyIGJ5dGVUb0hleCA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICBieXRlVG9IZXhbaV0gPSAoaSArIDB4MTAwKS50b1N0cmluZygxNikuc3Vic3RyKDEpO1xufVxuXG5mdW5jdGlvbiBieXRlc1RvVXVpZChidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IG9mZnNldCB8fCAwO1xuICB2YXIgYnRoID0gYnl0ZVRvSGV4O1xuICAvLyBqb2luIHVzZWQgdG8gZml4IG1lbW9yeSBpc3N1ZSBjYXVzZWQgYnkgY29uY2F0ZW5hdGlvbjogaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzE3NSNjNFxuICByZXR1cm4gKFtidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCBcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dXSkuam9pbignJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnl0ZXNUb1V1aWQ7XG4iLCIvLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxuXG4vLyBnZXRSYW5kb21WYWx1ZXMgbmVlZHMgdG8gYmUgaW52b2tlZCBpbiBhIGNvbnRleHQgd2hlcmUgXCJ0aGlzXCIgaXMgYSBDcnlwdG9cbi8vIGltcGxlbWVudGF0aW9uLiBBbHNvLCBmaW5kIHRoZSBjb21wbGV0ZSBpbXBsZW1lbnRhdGlvbiBvZiBjcnlwdG8gb24gSUUxMS5cbnZhciBnZXRSYW5kb21WYWx1ZXMgPSAodHlwZW9mKGNyeXB0bykgIT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mKG1zQ3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93Lm1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcyA9PSAnZnVuY3Rpb24nICYmIG1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKG1zQ3J5cHRvKSk7XG5cbmlmIChnZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hhdHdnUk5HKCkge1xuICAgIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufSBlbHNlIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgcm5kcyA9IG5ldyBBcnJheSgxNik7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXRoUk5HKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBybmRzO1xuICB9O1xufVxuIiwidmFyIHJuZyA9IHJlcXVpcmUoJy4vbGliL3JuZycpO1xudmFyIGJ5dGVzVG9VdWlkID0gcmVxdWlyZSgnLi9saWIvYnl0ZXNUb1V1aWQnKTtcblxuLy8gKipgdjEoKWAgLSBHZW5lcmF0ZSB0aW1lLWJhc2VkIFVVSUQqKlxuLy9cbi8vIEluc3BpcmVkIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9MaW9zSy9VVUlELmpzXG4vLyBhbmQgaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L3V1aWQuaHRtbFxuXG52YXIgX25vZGVJZDtcbnZhciBfY2xvY2tzZXE7XG5cbi8vIFByZXZpb3VzIHV1aWQgY3JlYXRpb24gdGltZVxudmFyIF9sYXN0TVNlY3MgPSAwO1xudmFyIF9sYXN0TlNlY3MgPSAwO1xuXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2Jyb29mYS9ub2RlLXV1aWQgZm9yIEFQSSBkZXRhaWxzXG5mdW5jdGlvbiB2MShvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IGJ1ZiAmJiBvZmZzZXQgfHwgMDtcbiAgdmFyIGIgPSBidWYgfHwgW107XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHZhciBub2RlID0gb3B0aW9ucy5ub2RlIHx8IF9ub2RlSWQ7XG4gIHZhciBjbG9ja3NlcSA9IG9wdGlvbnMuY2xvY2tzZXEgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2xvY2tzZXEgOiBfY2xvY2tzZXE7XG5cbiAgLy8gbm9kZSBhbmQgY2xvY2tzZXEgbmVlZCB0byBiZSBpbml0aWFsaXplZCB0byByYW5kb20gdmFsdWVzIGlmIHRoZXkncmUgbm90XG4gIC8vIHNwZWNpZmllZC4gIFdlIGRvIHRoaXMgbGF6aWx5IHRvIG1pbmltaXplIGlzc3VlcyByZWxhdGVkIHRvIGluc3VmZmljaWVudFxuICAvLyBzeXN0ZW0gZW50cm9weS4gIFNlZSAjMTg5XG4gIGlmIChub2RlID09IG51bGwgfHwgY2xvY2tzZXEgPT0gbnVsbCkge1xuICAgIHZhciBzZWVkQnl0ZXMgPSBybmcoKTtcbiAgICBpZiAobm9kZSA9PSBudWxsKSB7XG4gICAgICAvLyBQZXIgNC41LCBjcmVhdGUgYW5kIDQ4LWJpdCBub2RlIGlkLCAoNDcgcmFuZG9tIGJpdHMgKyBtdWx0aWNhc3QgYml0ID0gMSlcbiAgICAgIG5vZGUgPSBfbm9kZUlkID0gW1xuICAgICAgICBzZWVkQnl0ZXNbMF0gfCAweDAxLFxuICAgICAgICBzZWVkQnl0ZXNbMV0sIHNlZWRCeXRlc1syXSwgc2VlZEJ5dGVzWzNdLCBzZWVkQnl0ZXNbNF0sIHNlZWRCeXRlc1s1XVxuICAgICAgXTtcbiAgICB9XG4gICAgaWYgKGNsb2Nrc2VxID09IG51bGwpIHtcbiAgICAgIC8vIFBlciA0LjIuMiwgcmFuZG9taXplICgxNCBiaXQpIGNsb2Nrc2VxXG4gICAgICBjbG9ja3NlcSA9IF9jbG9ja3NlcSA9IChzZWVkQnl0ZXNbNl0gPDwgOCB8IHNlZWRCeXRlc1s3XSkgJiAweDNmZmY7XG4gICAgfVxuICB9XG5cbiAgLy8gVVVJRCB0aW1lc3RhbXBzIGFyZSAxMDAgbmFuby1zZWNvbmQgdW5pdHMgc2luY2UgdGhlIEdyZWdvcmlhbiBlcG9jaCxcbiAgLy8gKDE1ODItMTAtMTUgMDA6MDApLiAgSlNOdW1iZXJzIGFyZW4ndCBwcmVjaXNlIGVub3VnaCBmb3IgdGhpcywgc29cbiAgLy8gdGltZSBpcyBoYW5kbGVkIGludGVybmFsbHkgYXMgJ21zZWNzJyAoaW50ZWdlciBtaWxsaXNlY29uZHMpIGFuZCAnbnNlY3MnXG4gIC8vICgxMDAtbmFub3NlY29uZHMgb2Zmc2V0IGZyb20gbXNlY3MpIHNpbmNlIHVuaXggZXBvY2gsIDE5NzAtMDEtMDEgMDA6MDAuXG4gIHZhciBtc2VjcyA9IG9wdGlvbnMubXNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubXNlY3MgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAvLyBQZXIgNC4yLjEuMiwgdXNlIGNvdW50IG9mIHV1aWQncyBnZW5lcmF0ZWQgZHVyaW5nIHRoZSBjdXJyZW50IGNsb2NrXG4gIC8vIGN5Y2xlIHRvIHNpbXVsYXRlIGhpZ2hlciByZXNvbHV0aW9uIGNsb2NrXG4gIHZhciBuc2VjcyA9IG9wdGlvbnMubnNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNlY3MgOiBfbGFzdE5TZWNzICsgMTtcblxuICAvLyBUaW1lIHNpbmNlIGxhc3QgdXVpZCBjcmVhdGlvbiAoaW4gbXNlY3MpXG4gIHZhciBkdCA9IChtc2VjcyAtIF9sYXN0TVNlY3MpICsgKG5zZWNzIC0gX2xhc3ROU2VjcykvMTAwMDA7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIEJ1bXAgY2xvY2tzZXEgb24gY2xvY2sgcmVncmVzc2lvblxuICBpZiAoZHQgPCAwICYmIG9wdGlvbnMuY2xvY2tzZXEgPT09IHVuZGVmaW5lZCkge1xuICAgIGNsb2Nrc2VxID0gY2xvY2tzZXEgKyAxICYgMHgzZmZmO1xuICB9XG5cbiAgLy8gUmVzZXQgbnNlY3MgaWYgY2xvY2sgcmVncmVzc2VzIChuZXcgY2xvY2tzZXEpIG9yIHdlJ3ZlIG1vdmVkIG9udG8gYSBuZXdcbiAgLy8gdGltZSBpbnRlcnZhbFxuICBpZiAoKGR0IDwgMCB8fCBtc2VjcyA+IF9sYXN0TVNlY3MpICYmIG9wdGlvbnMubnNlY3MgPT09IHVuZGVmaW5lZCkge1xuICAgIG5zZWNzID0gMDtcbiAgfVxuXG4gIC8vIFBlciA0LjIuMS4yIFRocm93IGVycm9yIGlmIHRvbyBtYW55IHV1aWRzIGFyZSByZXF1ZXN0ZWRcbiAgaWYgKG5zZWNzID49IDEwMDAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1dWlkLnYxKCk6IENhblxcJ3QgY3JlYXRlIG1vcmUgdGhhbiAxME0gdXVpZHMvc2VjJyk7XG4gIH1cblxuICBfbGFzdE1TZWNzID0gbXNlY3M7XG4gIF9sYXN0TlNlY3MgPSBuc2VjcztcbiAgX2Nsb2Nrc2VxID0gY2xvY2tzZXE7XG5cbiAgLy8gUGVyIDQuMS40IC0gQ29udmVydCBmcm9tIHVuaXggZXBvY2ggdG8gR3JlZ29yaWFuIGVwb2NoXG4gIG1zZWNzICs9IDEyMjE5MjkyODAwMDAwO1xuXG4gIC8vIGB0aW1lX2xvd2BcbiAgdmFyIHRsID0gKChtc2VjcyAmIDB4ZmZmZmZmZikgKiAxMDAwMCArIG5zZWNzKSAlIDB4MTAwMDAwMDAwO1xuICBiW2krK10gPSB0bCA+Pj4gMjQgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gMTYgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsICYgMHhmZjtcblxuICAvLyBgdGltZV9taWRgXG4gIHZhciB0bWggPSAobXNlY3MgLyAweDEwMDAwMDAwMCAqIDEwMDAwKSAmIDB4ZmZmZmZmZjtcbiAgYltpKytdID0gdG1oID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdG1oICYgMHhmZjtcblxuICAvLyBgdGltZV9oaWdoX2FuZF92ZXJzaW9uYFxuICBiW2krK10gPSB0bWggPj4+IDI0ICYgMHhmIHwgMHgxMDsgLy8gaW5jbHVkZSB2ZXJzaW9uXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMTYgJiAweGZmO1xuXG4gIC8vIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYCAoUGVyIDQuMi4yIC0gaW5jbHVkZSB2YXJpYW50KVxuICBiW2krK10gPSBjbG9ja3NlcSA+Pj4gOCB8IDB4ODA7XG5cbiAgLy8gYGNsb2NrX3NlcV9sb3dgXG4gIGJbaSsrXSA9IGNsb2Nrc2VxICYgMHhmZjtcblxuICAvLyBgbm9kZWBcbiAgZm9yICh2YXIgbiA9IDA7IG4gPCA2OyArK24pIHtcbiAgICBiW2kgKyBuXSA9IG5vZGVbbl07XG4gIH1cblxuICByZXR1cm4gYnVmID8gYnVmIDogYnl0ZXNUb1V1aWQoYik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdjE7XG4iLCJmdW5jdGlvbiBBY2NvcmRpb24ocHJvcHMpIHtcbiAgICBjb25zdCB7aXRlbXMsIGRvU2VhcmNofSA9IHByb3BzO1xuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWNjb3JkaW9uIGFjY29yZGlvbi1pY29uIGFjY29yZGlvbi1saXN0XCI+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWNjb3JkaW9uLXNlYXJjaFwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJqc29uLXJlbmRlci1zZWFyY2hcIiBvbkNoYW5nZT17ZG9TZWFyY2h9IHBsYWNlaG9sZGVyPVwiRmlsdGVyIG9uLi4uXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICB7aXRlbXMubWFwKGl0ZW0gPT4gKFxuICAgICAgICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImFjY29yZGlvbi1zZWN0aW9uXCIga2V5PXtpdGVtLmlkfT5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIHRhYkluZGV4PVwiMFwiIGNsYXNzTmFtZT1cImFjY29yZGlvbi10b2dnbGVcIiBodG1sRm9yPVwiYWNjb3JkaW9uLXNlY3Rpb24tMVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW0udGl0bGV9XG4gICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWNjb3JkaW9uLWNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLmNvbnRlbnR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBBY2NvcmRpb247IiwiaW1wb3J0IEFjY29yZGlvbiBmcm9tICcuL0FjY29yZGlvbic7XG5pbXBvcnQgdXVpZHYxIGZyb20gJ3V1aWQvdjEnO1xuaW1wb3J0IGdldEFwaURhdGEgZnJvbSAnLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGEnO1xuXG5jbGFzcyBKc29uUGFyc2VyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgaXRlbXM6IFtdLFxuICAgICAgICAgICAgZmlsdGVyZWRJdGVtczogW11cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmhhbmRsZVNlYXJjaCA9IHRoaXMuaGFuZGxlU2VhcmNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZ2V0T2JqZWN0UHJvcCA9IHRoaXMuZ2V0T2JqZWN0UHJvcC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICB0aGlzLmdldERhdGEoKTtcbiAgICB9XG5cbiAgICBnZXREYXRhKCkge1xuICAgICAgICBjb25zdCB7dXJsfSA9IHRoaXMucHJvcHM7XG4gICAgICAgIGdldEFwaURhdGEodXJsKVxuICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgKHtyZXN1bHR9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLm1hcERhdGEocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8IE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IEVycm9yKCdDb3VsZCBub3QgZmV0Y2ggZGF0YSBmcm9tIFVSTC4nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWRJdGVtczogZGF0YVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCAoe2Vycm9yfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdHJ1ZSwgZXJyb3J9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIG1hcERhdGEoanNvbkRhdGEpIHtcbiAgICAgICAgY29uc3Qge2ZpZWxkTWFwfSA9IHRoaXMucHJvcHM7XG4gICAgICAgIC8vIEdldCB0aGUgb2JqZWN0IGNvbnRhaW5pbmcgaXRlbXMgZnJvbSBKU09OXG4gICAgICAgIGxldCBpdGVtcyA9IHRoaXMuZ2V0T2JqZWN0UHJvcChqc29uRGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA/IGZpZWxkTWFwLml0ZW1Db250YWluZXIuc3BsaXQoJy4nKSA6IFtdKTtcbiAgICAgICAgaWYgKCFpdGVtcyB8fCBPYmplY3Qua2V5cyhpdGVtcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWFwIHRoZSBkYXRhIGl0ZW1zXG4gICAgICAgIGl0ZW1zID0gaXRlbXMubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgICAgIGlkOiB1dWlkdjEoKSxcbiAgICAgICAgICAgIHRpdGxlOiB0aGlzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAudGl0bGUuc3BsaXQoJy4nKSksXG4gICAgICAgICAgICBjb250ZW50OiB0aGlzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAuY29udGVudC5zcGxpdCgnLicpKVxuICAgICAgICB9KSk7XG4gICAgICAgIC8vIFJlbW92ZSBvYmplY3RzIHdpdGggbWlzc2luZyBmaWVsZHNcbiAgICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLmlkICYmIGl0ZW0udGl0bGUgJiYgaXRlbS5jb250ZW50O1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfVxuXG4gICAgZ2V0T2JqZWN0UHJvcChvYmosIGtleXMpIHtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleXNbaV0pKSB7XG4gICAgICAgICAgICAgICAgb2JqID0gb2JqW2tleXNbaV1dO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBtYXAga2V5Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIGhhbmRsZVNlYXJjaChldmVudCkge1xuICAgICAgICBsZXQgc2VhcmNoU3RyaW5nID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXG4gICAgICAgIGxldCBmaWx0ZXJlZEl0ZW1zID0gdGhpcy5zdGF0ZS5pdGVtcztcbiAgICAgICAgZmlsdGVyZWRJdGVtcyA9IGZpbHRlcmVkSXRlbXMuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBsZXQgdGl0bGUgPSBpdGVtLnRpdGxlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBsZXQgY29udGVudCA9IGl0ZW0uY29udGVudC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRpdGxlLmluZGV4T2Yoc2VhcmNoU3RyaW5nLnRvTG93ZXJDYXNlKCkpICE9PSAtMSB8fCBjb250ZW50LmluZGV4T2Yoc2VhcmNoU3RyaW5nLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgICAgZmlsdGVyZWRJdGVtc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHtlcnJvciwgaXNMb2FkZWQsIGZpbHRlcmVkSXRlbXN9ID0gdGhpcy5zdGF0ZTtcblxuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiA8ZGl2PkVycm9yOiB7ZXJyb3IubWVzc2FnZX08L2Rpdj47XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdj5Mb2FkaW5nLi4uPC9kaXY+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDxBY2NvcmRpb24gZG9TZWFyY2g9e3RoaXMuaGFuZGxlU2VhcmNofVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM9e2ZpbHRlcmVkSXRlbXN9Lz47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEpzb25QYXJzZXI7IiwiaW1wb3J0IEpzb25QYXJzZXIgZnJvbSAnLi9Db21wb25lbnRzL0pzb25QYXJzZXInO1xuXG5jb25zdCBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbmNvbnN0IGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8SnNvblBhcnNlciB1cmw9e2RvbUVsZW1lbnQuZGF0YXNldC51cmx9IGZpZWxkTWFwPXtKU09OLnBhcnNlKGRvbUVsZW1lbnQuZGF0YXNldC5maWVsZG1hcCl9Lz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJGcm9udC9JbmRleEZyb250LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG52YXIgYnl0ZVRvSGV4ID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG59XG5cbmZ1bmN0aW9uIGJ5dGVzVG9VdWlkKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBidGggPSBieXRlVG9IZXg7XG4gIC8vIGpvaW4gdXNlZCB0byBmaXggbWVtb3J5IGlzc3VlIGNhdXNlZCBieSBjb25jYXRlbmF0aW9uOiBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMTc1I2M0XG4gIHJldHVybiAoW2J0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sIFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV1dKS5qb2luKCcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBieXRlc1RvVXVpZDtcblxufSx7fV0sMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4vLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxuXG4vLyBnZXRSYW5kb21WYWx1ZXMgbmVlZHMgdG8gYmUgaW52b2tlZCBpbiBhIGNvbnRleHQgd2hlcmUgXCJ0aGlzXCIgaXMgYSBDcnlwdG9cbi8vIGltcGxlbWVudGF0aW9uLiBBbHNvLCBmaW5kIHRoZSBjb21wbGV0ZSBpbXBsZW1lbnRhdGlvbiBvZiBjcnlwdG8gb24gSUUxMS5cbnZhciBnZXRSYW5kb21WYWx1ZXMgPSAodHlwZW9mKGNyeXB0bykgIT0gJ3VuZGVmaW5lZCcgJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mKG1zQ3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93Lm1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcyA9PSAnZnVuY3Rpb24nICYmIG1zQ3J5cHRvLmdldFJhbmRvbVZhbHVlcy5iaW5kKG1zQ3J5cHRvKSk7XG5cbmlmIChnZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gd2hhdHdnUk5HKCkge1xuICAgIGdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufSBlbHNlIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgcm5kcyA9IG5ldyBBcnJheSgxNik7XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtYXRoUk5HKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBybmRzO1xuICB9O1xufVxuXG59LHt9XSwzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbnZhciBybmcgPSByZXF1aXJlKCcuL2xpYi9ybmcnKTtcbnZhciBieXRlc1RvVXVpZCA9IHJlcXVpcmUoJy4vbGliL2J5dGVzVG9VdWlkJyk7XG5cbi8vICoqYHYxKClgIC0gR2VuZXJhdGUgdGltZS1iYXNlZCBVVUlEKipcbi8vXG4vLyBJbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vTGlvc0svVVVJRC5qc1xuLy8gYW5kIGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS91dWlkLmh0bWxcblxudmFyIF9ub2RlSWQ7XG52YXIgX2Nsb2Nrc2VxO1xuXG4vLyBQcmV2aW91cyB1dWlkIGNyZWF0aW9uIHRpbWVcbnZhciBfbGFzdE1TZWNzID0gMDtcbnZhciBfbGFzdE5TZWNzID0gMDtcblxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkIGZvciBBUEkgZGV0YWlsc1xuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIHZhciBiID0gYnVmIHx8IFtdO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB2YXIgbm9kZSA9IG9wdGlvbnMubm9kZSB8fCBfbm9kZUlkO1xuICB2YXIgY2xvY2tzZXEgPSBvcHRpb25zLmNsb2Nrc2VxICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNsb2Nrc2VxIDogX2Nsb2Nrc2VxO1xuXG4gIC8vIG5vZGUgYW5kIGNsb2Nrc2VxIG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgdG8gcmFuZG9tIHZhbHVlcyBpZiB0aGV5J3JlIG5vdFxuICAvLyBzcGVjaWZpZWQuICBXZSBkbyB0aGlzIGxhemlseSB0byBtaW5pbWl6ZSBpc3N1ZXMgcmVsYXRlZCB0byBpbnN1ZmZpY2llbnRcbiAgLy8gc3lzdGVtIGVudHJvcHkuICBTZWUgIzE4OVxuICBpZiAobm9kZSA9PSBudWxsIHx8IGNsb2Nrc2VxID09IG51bGwpIHtcbiAgICB2YXIgc2VlZEJ5dGVzID0gcm5nKCk7XG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xuICAgICAgLy8gUGVyIDQuNSwgY3JlYXRlIGFuZCA0OC1iaXQgbm9kZSBpZCwgKDQ3IHJhbmRvbSBiaXRzICsgbXVsdGljYXN0IGJpdCA9IDEpXG4gICAgICBub2RlID0gX25vZGVJZCA9IFtcbiAgICAgICAgc2VlZEJ5dGVzWzBdIHwgMHgwMSxcbiAgICAgICAgc2VlZEJ5dGVzWzFdLCBzZWVkQnl0ZXNbMl0sIHNlZWRCeXRlc1szXSwgc2VlZEJ5dGVzWzRdLCBzZWVkQnl0ZXNbNV1cbiAgICAgIF07XG4gICAgfVxuICAgIGlmIChjbG9ja3NlcSA9PSBudWxsKSB7XG4gICAgICAvLyBQZXIgNC4yLjIsIHJhbmRvbWl6ZSAoMTQgYml0KSBjbG9ja3NlcVxuICAgICAgY2xvY2tzZXEgPSBfY2xvY2tzZXEgPSAoc2VlZEJ5dGVzWzZdIDw8IDggfCBzZWVkQnl0ZXNbN10pICYgMHgzZmZmO1xuICAgIH1cbiAgfVxuXG4gIC8vIFVVSUQgdGltZXN0YW1wcyBhcmUgMTAwIG5hbm8tc2Vjb25kIHVuaXRzIHNpbmNlIHRoZSBHcmVnb3JpYW4gZXBvY2gsXG4gIC8vICgxNTgyLTEwLTE1IDAwOjAwKS4gIEpTTnVtYmVycyBhcmVuJ3QgcHJlY2lzZSBlbm91Z2ggZm9yIHRoaXMsIHNvXG4gIC8vIHRpbWUgaXMgaGFuZGxlZCBpbnRlcm5hbGx5IGFzICdtc2VjcycgKGludGVnZXIgbWlsbGlzZWNvbmRzKSBhbmQgJ25zZWNzJ1xuICAvLyAoMTAwLW5hbm9zZWNvbmRzIG9mZnNldCBmcm9tIG1zZWNzKSBzaW5jZSB1bml4IGVwb2NoLCAxOTcwLTAxLTAxIDAwOjAwLlxuICB2YXIgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuICB2YXIgbnNlY3MgPSBvcHRpb25zLm5zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zZWNzIDogX2xhc3ROU2VjcyArIDE7XG5cbiAgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuICB2YXIgZHQgPSAobXNlY3MgLSBfbGFzdE1TZWNzKSArIChuc2VjcyAtIF9sYXN0TlNlY3MpLzEwMDAwO1xuXG4gIC8vIFBlciA0LjIuMS4yLCBCdW1wIGNsb2Nrc2VxIG9uIGNsb2NrIHJlZ3Jlc3Npb25cbiAgaWYgKGR0IDwgMCAmJiBvcHRpb25zLmNsb2Nrc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBjbG9ja3NlcSA9IGNsb2Nrc2VxICsgMSAmIDB4M2ZmZjtcbiAgfVxuXG4gIC8vIFJlc2V0IG5zZWNzIGlmIGNsb2NrIHJlZ3Jlc3NlcyAobmV3IGNsb2Nrc2VxKSBvciB3ZSd2ZSBtb3ZlZCBvbnRvIGEgbmV3XG4gIC8vIHRpbWUgaW50ZXJ2YWxcbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH1cblxuICAvLyBQZXIgNC4yLjEuMiBUaHJvdyBlcnJvciBpZiB0b28gbWFueSB1dWlkcyBhcmUgcmVxdWVzdGVkXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXVpZC52MSgpOiBDYW5cXCd0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlYycpO1xuICB9XG5cbiAgX2xhc3RNU2VjcyA9IG1zZWNzO1xuICBfbGFzdE5TZWNzID0gbnNlY3M7XG4gIF9jbG9ja3NlcSA9IGNsb2Nrc2VxO1xuXG4gIC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICAvLyBgdGltZV9sb3dgXG4gIHZhciB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gdGwgPj4+IDI0ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDE2ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfbWlkYFxuICB2YXIgdG1oID0gKG1zZWNzIC8gMHgxMDAwMDAwMDAgKiAxMDAwMCkgJiAweGZmZmZmZmY7XG4gIGJbaSsrXSA9IHRtaCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRtaCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfaGlnaF9hbmRfdmVyc2lvbmBcbiAgYltpKytdID0gdG1oID4+PiAyNCAmIDB4ZiB8IDB4MTA7IC8vIGluY2x1ZGUgdmVyc2lvblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjtcblxuICAvLyBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGAgKFBlciA0LjIuMiAtIGluY2x1ZGUgdmFyaWFudClcbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwO1xuXG4gIC8vIGBjbG9ja19zZXFfbG93YFxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgLy8gYG5vZGVgXG4gIGZvciAodmFyIG4gPSAwOyBuIDwgNjsgKytuKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiA/IGJ1ZiA6IGJ5dGVzVG9VdWlkKGIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHYxO1xuXG59LHtcIi4vbGliL2J5dGVzVG9VdWlkXCI6MSxcIi4vbGliL3JuZ1wiOjJ9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBBY2NvcmRpb24ocHJvcHMpIHtcbiAgdmFyIGl0ZW1zID0gcHJvcHMuaXRlbXMsXG4gICAgICBkb1NlYXJjaCA9IHByb3BzLmRvU2VhcmNoO1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgY2xhc3NOYW1lOiBcImFjY29yZGlvbiBhY2NvcmRpb24taWNvbiBhY2NvcmRpb24tbGlzdFwiXG4gIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgIGNsYXNzTmFtZTogXCJhY2NvcmRpb24tc2VhcmNoXCJcbiAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcInRleHRcIixcbiAgICBuYW1lOiBcImpzb24tcmVuZGVyLXNlYXJjaFwiLFxuICAgIG9uQ2hhbmdlOiBkb1NlYXJjaCxcbiAgICBwbGFjZWhvbGRlcjogXCJGaWx0ZXIgb24uLi5cIlxuICB9KSksIGl0ZW1zLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwic2VjdGlvblwiLCB7XG4gICAgICBjbGFzc05hbWU6IFwiYWNjb3JkaW9uLXNlY3Rpb25cIixcbiAgICAgIGtleTogaXRlbS5pZFxuICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiLCB7XG4gICAgICB0YWJJbmRleDogXCIwXCIsXG4gICAgICBjbGFzc05hbWU6IFwiYWNjb3JkaW9uLXRvZ2dsZVwiLFxuICAgICAgaHRtbEZvcjogXCJhY2NvcmRpb24tc2VjdGlvbi0xXCJcbiAgICB9LCBpdGVtLnRpdGxlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICBjbGFzc05hbWU6IFwiYWNjb3JkaW9uLWNvbnRlbnRcIlxuICAgIH0sIGl0ZW0uY29udGVudCkpO1xuICB9KSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IEFjY29yZGlvbjtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0FjY29yZGlvbiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vQWNjb3JkaW9uXCIpKTtcblxudmFyIF92ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwidXVpZC92MVwiKSk7XG5cbnZhciBfZ2V0QXBpRGF0YSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbnZhciBKc29uUGFyc2VyID1cbi8qI19fUFVSRV9fKi9cbmZ1bmN0aW9uIChfUmVhY3QkQ29tcG9uZW50KSB7XG4gIF9pbmhlcml0cyhKc29uUGFyc2VyLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBKc29uUGFyc2VyKCkge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBKc29uUGFyc2VyKTtcblxuICAgIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKEpzb25QYXJzZXIpLmNhbGwodGhpcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICBpdGVtczogW10sXG4gICAgICBmaWx0ZXJlZEl0ZW1zOiBbXVxuICAgIH07XG4gICAgX3RoaXMuaGFuZGxlU2VhcmNoID0gX3RoaXMuaGFuZGxlU2VhcmNoLmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIF90aGlzLmdldE9iamVjdFByb3AgPSBfdGhpcy5nZXRPYmplY3RQcm9wLmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIHJldHVybiBfdGhpcztcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhKc29uUGFyc2VyLCBbe1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuZ2V0RGF0YSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJnZXREYXRhXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGdldERhdGEoKSB7XG4gICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgdmFyIHVybCA9IHRoaXMucHJvcHMudXJsO1xuICAgICAgKDAsIF9nZXRBcGlEYXRhLmRlZmF1bHQpKHVybCkudGhlbihmdW5jdGlvbiAoX3JlZikge1xuICAgICAgICB2YXIgcmVzdWx0ID0gX3JlZi5yZXN1bHQ7XG5cbiAgICAgICAgdmFyIGRhdGEgPSBfdGhpczIubWFwRGF0YShyZXN1bHQpO1xuXG4gICAgICAgIGlmICghZGF0YSB8fCBPYmplY3Qua2V5cyhkYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgICAgZXJyb3I6IEVycm9yKCdDb3VsZCBub3QgZmV0Y2ggZGF0YSBmcm9tIFVSTC4nKSxcbiAgICAgICAgICAgIGlzTG9hZGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgIGlzTG9hZGVkOiB0cnVlLFxuICAgICAgICAgIGl0ZW1zOiBkYXRhLFxuICAgICAgICAgIGZpbHRlcmVkSXRlbXM6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICB9LCBmdW5jdGlvbiAoX3JlZjIpIHtcbiAgICAgICAgdmFyIGVycm9yID0gX3JlZjIuZXJyb3I7XG5cbiAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICBlcnJvcjogZXJyb3JcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwibWFwRGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBtYXBEYXRhKGpzb25EYXRhKSB7XG4gICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgdmFyIGZpZWxkTWFwID0gdGhpcy5wcm9wcy5maWVsZE1hcDsgLy8gR2V0IHRoZSBvYmplY3QgY29udGFpbmluZyBpdGVtcyBmcm9tIEpTT05cblxuICAgICAgdmFyIGl0ZW1zID0gdGhpcy5nZXRPYmplY3RQcm9wKGpzb25EYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID8gZmllbGRNYXAuaXRlbUNvbnRhaW5lci5zcGxpdCgnLicpIDogW10pO1xuXG4gICAgICBpZiAoIWl0ZW1zIHx8IE9iamVjdC5rZXlzKGl0ZW1zKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSAvLyBNYXAgdGhlIGRhdGEgaXRlbXNcblxuXG4gICAgICBpdGVtcyA9IGl0ZW1zLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiAoMCwgX3YuZGVmYXVsdCkoKSxcbiAgICAgICAgICB0aXRsZTogX3RoaXMzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAudGl0bGUuc3BsaXQoJy4nKSksXG4gICAgICAgICAgY29udGVudDogX3RoaXMzLmdldE9iamVjdFByb3AoaXRlbSwgZmllbGRNYXAuY29udGVudC5zcGxpdCgnLicpKVxuICAgICAgICB9O1xuICAgICAgfSk7IC8vIFJlbW92ZSBvYmplY3RzIHdpdGggbWlzc2luZyBmaWVsZHNcblxuICAgICAgaXRlbXMgPSBpdGVtcy5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uaWQgJiYgaXRlbS50aXRsZSAmJiBpdGVtLmNvbnRlbnQ7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBpdGVtcztcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0T2JqZWN0UHJvcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRPYmplY3RQcm9wKG9iaiwga2V5cykge1xuICAgICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleXNbaV0pKSB7XG4gICAgICAgICAgb2JqID0gb2JqW2tleXNbaV1dO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdJbnZhbGlkIG1hcCBrZXknKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJoYW5kbGVTZWFyY2hcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gaGFuZGxlU2VhcmNoKGV2ZW50KSB7XG4gICAgICB2YXIgc2VhcmNoU3RyaW5nID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgdmFyIGZpbHRlcmVkSXRlbXMgPSB0aGlzLnN0YXRlLml0ZW1zO1xuICAgICAgZmlsdGVyZWRJdGVtcyA9IGZpbHRlcmVkSXRlbXMuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHZhciB0aXRsZSA9IGl0ZW0udGl0bGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSBpdGVtLmNvbnRlbnQudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIHRpdGxlLmluZGV4T2Yoc2VhcmNoU3RyaW5nLnRvTG93ZXJDYXNlKCkpICE9PSAtMSB8fCBjb250ZW50LmluZGV4T2Yoc2VhcmNoU3RyaW5nLnRvTG93ZXJDYXNlKCkpICE9PSAtMTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGZpbHRlcmVkSXRlbXM6IGZpbHRlcmVkSXRlbXNcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBlcnJvciA9IF90aGlzJHN0YXRlLmVycm9yLFxuICAgICAgICAgIGlzTG9hZGVkID0gX3RoaXMkc3RhdGUuaXNMb2FkZWQsXG4gICAgICAgICAgZmlsdGVyZWRJdGVtcyA9IF90aGlzJHN0YXRlLmZpbHRlcmVkSXRlbXM7XG5cbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBcIkVycm9yOiBcIiwgZXJyb3IubWVzc2FnZSk7XG4gICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBcIkxvYWRpbmcuLi5cIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChfQWNjb3JkaW9uLmRlZmF1bHQsIHtcbiAgICAgICAgICBkb1NlYXJjaDogdGhpcy5oYW5kbGVTZWFyY2gsXG4gICAgICAgICAgaXRlbXM6IGZpbHRlcmVkSXRlbXNcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIEpzb25QYXJzZXI7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IEpzb25QYXJzZXI7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiOjcsXCIuL0FjY29yZGlvblwiOjQsXCJ1dWlkL3YxXCI6M31dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfSnNvblBhcnNlciA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vQ29tcG9uZW50cy9Kc29uUGFyc2VyXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xudmFyIGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5SZWFjdERPTS5yZW5kZXIoUmVhY3QuY3JlYXRlRWxlbWVudChfSnNvblBhcnNlci5kZWZhdWx0LCB7XG4gIHVybDogZG9tRWxlbWVudC5kYXRhc2V0LnVybCxcbiAgZmllbGRNYXA6IEpTT04ucGFyc2UoZG9tRWxlbWVudC5kYXRhc2V0LmZpZWxkbWFwKVxufSksIGRvbUVsZW1lbnQpO1xuXG59LHtcIi4vQ29tcG9uZW50cy9Kc29uUGFyc2VyXCI6NX1dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIGdldEFwaURhdGEodXJsKSB7XG4gIHJldHVybiBmZXRjaCh1cmwpLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgIHJldHVybiByZXMuanNvbigpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICB9O1xuICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3I6IGVycm9yXG4gICAgfTtcbiAgfSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IGdldEFwaURhdGE7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV19LHt9LFs2XSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmRYVnBaQzlzYVdJdllubDBaWE5VYjFWMWFXUXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZkWFZwWkM5c2FXSXZjbTVuTFdKeWIzZHpaWEl1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12ZFhWcFpDOTJNUzVxY3lJc0luTnZkWEpqWlM5cWN5OUdjbTl1ZEM5RGIyMXdiMjVsYm5SekwwRmpZMjl5WkdsdmJpNXFjeUlzSW5OdmRYSmpaUzlxY3k5R2NtOXVkQzlEYjIxd2IyNWxiblJ6TDBwemIyNVFZWEp6WlhJdWFuTWlMQ0p6YjNWeVkyVXZhbk12Um5KdmJuUXZTVzVrWlhoR2NtOXVkQzVxY3lJc0luTnZkWEpqWlM5cWN5OVZkR2xzYVhScFpYTXZaMlYwUVhCcFJHRjBZUzVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFUdEJRMEZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEJRM2hDUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3p0QlEyeERRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96czdPenM3T3pzN1FVTTNSMEVzVTBGQlV5eFRRVUZVTEVOQlFXMUNMRXRCUVc1Q0xFVkJRVEJDTzBGQlFVRXNUVUZEWml4TFFVUmxMRWRCUTBrc1MwRkVTaXhEUVVObUxFdEJSR1U3UVVGQlFTeE5RVU5TTEZGQlJGRXNSMEZEU1N4TFFVUktMRU5CUTFJc1VVRkVVVHRCUVVWMFFpeFRRVU5KTzBGQlFVc3NTVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJaaXhMUVVWSk8wRkJRVXNzU1VGQlFTeFRRVUZUTEVWQlFVTTdRVUZCWml4TFFVTkpPMEZCUVU4c1NVRkJRU3hKUVVGSkxFVkJRVU1zVFVGQldqdEJRVUZ0UWl4SlFVRkJMRWxCUVVrc1JVRkJReXh2UWtGQmVFSTdRVUZCTmtNc1NVRkJRU3hSUVVGUkxFVkJRVVVzVVVGQmRrUTdRVUZCYVVVc1NVRkJRU3hYUVVGWExFVkJRVU03UVVGQk4wVXNTVUZFU2l4RFFVWktMRVZCVFVzc1MwRkJTeXhEUVVGRExFZEJRVTRzUTBGQlZTeFZRVUZCTEVsQlFVazdRVUZCUVN4WFFVTllPMEZCUVZNc1RVRkJRU3hUUVVGVExFVkJRVU1zYlVKQlFXNUNPMEZCUVhWRExFMUJRVUVzUjBGQlJ5eEZRVUZGTEVsQlFVa3NRMEZCUXp0QlFVRnFSQ3hQUVVOSk8wRkJRVThzVFVGQlFTeFJRVUZSTEVWQlFVTXNSMEZCYUVJN1FVRkJiMElzVFVGQlFTeFRRVUZUTEVWQlFVTXNhMEpCUVRsQ08wRkJRV2xFTEUxQlFVRXNUMEZCVHl4RlFVRkRPMEZCUVhwRUxFOUJRMHNzU1VGQlNTeERRVUZETEV0QlJGWXNRMEZFU2l4RlFVbEpPMEZCUVVzc1RVRkJRU3hUUVVGVExFVkJRVU03UVVGQlppeFBRVU5MTEVsQlFVa3NRMEZCUXl4UFFVUldMRU5CU2tvc1EwRkVWenRCUVVGQkxFZEJRV1FzUTBGT1RDeERRVVJLTzBGQmJVSklPenRsUVVWakxGTTdPenM3T3pzN096czdPMEZEZGtKbU96dEJRVU5CT3p0QlFVTkJPenM3T3pzN096czdPenM3T3pzN096czdPenM3TzBsQlJVMHNWVHM3T3pzN1FVRkRSaXgzUWtGQll6dEJRVUZCT3p0QlFVRkJPenRCUVVOV08wRkJRMEVzVlVGQlN5eExRVUZNTEVkQlFXRTdRVUZEVkN4TlFVRkJMRXRCUVVzc1JVRkJSU3hKUVVSRk8wRkJSVlFzVFVGQlFTeFJRVUZSTEVWQlFVVXNTMEZHUkR0QlFVZFVMRTFCUVVFc1MwRkJTeXhGUVVGRkxFVkJTRVU3UVVGSlZDeE5RVUZCTEdGQlFXRXNSVUZCUlR0QlFVcE9MRXRCUVdJN1FVRlBRU3hWUVVGTExGbEJRVXdzUjBGQmIwSXNUVUZCU3l4WlFVRk1MRU5CUVd0Q0xFbEJRV3hDTEhWRVFVRndRanRCUVVOQkxGVkJRVXNzWVVGQlRDeEhRVUZ4UWl4TlFVRkxMR0ZCUVV3c1EwRkJiVUlzU1VGQmJrSXNkVVJCUVhKQ08wRkJWbFU3UVVGWFlqczdPenQzUTBGRmJVSTdRVUZEYUVJc1YwRkJTeXhQUVVGTU8wRkJRMGc3T3pzNFFrRkZVenRCUVVGQk96dEJRVUZCTEZWQlEwTXNSMEZFUkN4SFFVTlJMRXRCUVVzc1MwRkVZaXhEUVVORExFZEJSRVE3UVVGRlRpd3JRa0ZCVnl4SFFVRllMRVZCUTBzc1NVRkVUQ3hEUVVWUkxHZENRVUZqTzBGQlFVRXNXVUZCV2l4TlFVRlpMRkZCUVZvc1RVRkJXVHM3UVVGRFZpeFpRVUZOTEVsQlFVa3NSMEZCUnl4TlFVRkpMRU5CUVVNc1QwRkJUQ3hEUVVGaExFMUJRV0lzUTBGQllqczdRVUZEUVN4WlFVRkpMRU5CUVVNc1NVRkJSQ3hKUVVGVExFMUJRVTBzUTBGQlF5eEpRVUZRTEVOQlFWa3NTVUZCV2l4RlFVRnJRaXhOUVVGc1FpeExRVUUyUWl4RFFVRXhReXhGUVVFMlF6dEJRVU42UXl4VlFVRkJMRTFCUVVrc1EwRkJReXhSUVVGTUxFTkJRV003UVVGRFZpeFpRVUZCTEV0QlFVc3NSVUZCUlN4TFFVRkxMRU5CUVVNc1owTkJRVVFzUTBGRVJqdEJRVVZXTEZsQlFVRXNVVUZCVVN4RlFVRkZPMEZCUmtFc1YwRkJaRHM3UVVGSlFUdEJRVU5JT3p0QlFVTkVMRkZCUVVFc1RVRkJTU3hEUVVGRExGRkJRVXdzUTBGQll6dEJRVU5XTEZWQlFVRXNVVUZCVVN4RlFVRkZMRWxCUkVFN1FVRkZWaXhWUVVGQkxFdEJRVXNzUlVGQlJTeEpRVVpITzBGQlIxWXNWVUZCUVN4aFFVRmhMRVZCUVVVN1FVRklUQ3hUUVVGa08wRkJTMGdzVDBGb1FsUXNSVUZuUWxjc2FVSkJRV0U3UVVGQlFTeFpRVUZZTEV0QlFWY3NVMEZCV0N4TFFVRlhPenRCUVVOYUxGRkJRVUVzVFVGQlNTeERRVUZETEZGQlFVd3NRMEZCWXp0QlFVRkRMRlZCUVVFc1VVRkJVU3hGUVVGRkxFbEJRVmc3UVVGQmFVSXNWVUZCUVN4TFFVRkxMRVZCUVV3N1FVRkJha0lzVTBGQlpEdEJRVU5JTEU5QmJFSlVPMEZCYjBKSU96czdORUpCUlU4c1VTeEZRVUZWTzBGQlFVRTdPMEZCUVVFc1ZVRkRVQ3hSUVVSUExFZEJRMHNzUzBGQlN5eExRVVJXTEVOQlExQXNVVUZFVHl4RlFVVmtPenRCUVVOQkxGVkJRVWtzUzBGQlN5eEhRVUZITEV0QlFVc3NZVUZCVEN4RFFVRnRRaXhSUVVGdVFpeEZRVUUyUWl4UlFVRlJMRU5CUVVNc1lVRkJWQ3hIUVVGNVFpeFJRVUZSTEVOQlFVTXNZVUZCVkN4RFFVRjFRaXhMUVVGMlFpeERRVUUyUWl4SFFVRTNRaXhEUVVGNlFpeEhRVUUyUkN4RlFVRXhSaXhEUVVGYU96dEJRVU5CTEZWQlFVa3NRMEZCUXl4TFFVRkVMRWxCUVZVc1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeExRVUZhTEVWQlFXMUNMRTFCUVc1Q0xFdEJRVGhDTEVOQlFUVkRMRVZCUVN0RE8wRkJRek5ETzBGQlEwZ3NUMEZPWVN4RFFVOWtPenM3UVVGRFFTeE5RVUZCTEV0QlFVc3NSMEZCUnl4TFFVRkxMRU5CUVVNc1IwRkJUaXhEUVVGVkxGVkJRVUVzU1VGQlNUdEJRVUZCTEdWQlFVczdRVUZEZGtJc1ZVRkJRU3hGUVVGRkxFVkJRVVVzYVVKQlJHMUNPMEZCUlhaQ0xGVkJRVUVzUzBGQlN5eEZRVUZGTEUxQlFVa3NRMEZCUXl4aFFVRk1MRU5CUVcxQ0xFbEJRVzVDTEVWQlFYbENMRkZCUVZFc1EwRkJReXhMUVVGVUxFTkJRV1VzUzBGQlppeERRVUZ4UWl4SFFVRnlRaXhEUVVGNlFpeERRVVpuUWp0QlFVZDJRaXhWUVVGQkxFOUJRVThzUlVGQlJTeE5RVUZKTEVOQlFVTXNZVUZCVEN4RFFVRnRRaXhKUVVGdVFpeEZRVUY1UWl4UlFVRlJMRU5CUVVNc1QwRkJWQ3hEUVVGcFFpeExRVUZxUWl4RFFVRjFRaXhIUVVGMlFpeERRVUY2UWp0QlFVaGpMRk5CUVV3N1FVRkJRU3hQUVVGa0xFTkJRVklzUTBGU1l5eERRV0ZrT3p0QlFVTkJMRTFCUVVFc1MwRkJTeXhIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRXNWVUZCVlN4SlFVRldMRVZCUVdkQ08wRkJRMnBETEdWQlFVOHNTVUZCU1N4RFFVRkRMRVZCUVV3c1NVRkJWeXhKUVVGSkxFTkJRVU1zUzBGQmFFSXNTVUZCZVVJc1NVRkJTU3hEUVVGRExFOUJRWEpETzBGQlEwZ3NUMEZHVHl4RFFVRlNPMEZCU1VFc1lVRkJUeXhMUVVGUU8wRkJRMGc3T3p0clEwRkZZU3hITEVWQlFVc3NTU3hGUVVGTk8wRkJRM0pDTEZWQlFVa3NTVUZCU1N4RFFVRkRMRTFCUVV3c1MwRkJaMElzUTBGQmNFSXNSVUZCZFVJN1FVRkRia0lzWlVGQlR5eEhRVUZRTzBGQlEwZzdPMEZCUlVRc1YwRkJTeXhKUVVGSkxFTkJRVU1zUjBGQlJ5eERRVUZpTEVWQlFXZENMRU5CUVVNc1IwRkJSeXhKUVVGSkxFTkJRVU1zVFVGQmVrSXNSVUZCYVVNc1EwRkJReXhGUVVGc1F5eEZRVUZ6UXp0QlFVTnNReXhaUVVGSkxFZEJRVWNzUTBGQlF5eGpRVUZLTEVOQlFXMUNMRWxCUVVrc1EwRkJReXhEUVVGRUxFTkJRWFpDTEVOQlFVb3NSVUZCYVVNN1FVRkROMElzVlVGQlFTeEhRVUZITEVkQlFVY3NSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRUxFTkJRVXdzUTBGQlZEdEJRVU5JTEZOQlJrUXNUVUZGVHp0QlFVTklMRlZCUVVFc1QwRkJUeXhEUVVGRExFZEJRVklzUTBGQldTeHBRa0ZCV2p0QlFVTkJMR2xDUVVGUExFbEJRVkE3UVVGRFNEdEJRVU5LT3p0QlFVVkVMR0ZCUVU4c1IwRkJVRHRCUVVOSU96czdhVU5CUlZrc1N5eEZRVUZQTzBGQlEyaENMRlZCUVVrc1dVRkJXU3hIUVVGSExFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRXNTMEZCYUVNN1FVRkZRU3hWUVVGSkxHRkJRV0VzUjBGQlJ5eExRVUZMTEV0QlFVd3NRMEZCVnl4TFFVRXZRanRCUVVOQkxFMUJRVUVzWVVGQllTeEhRVUZITEdGQlFXRXNRMEZCUXl4TlFVRmtMRU5CUVhGQ0xGVkJRVU1zU1VGQlJDeEZRVUZWTzBGQlF6TkRMRmxCUVVrc1MwRkJTeXhIUVVGSExFbEJRVWtzUTBGQlF5eExRVUZNTEVOQlFWY3NWMEZCV0N4RlFVRmFPMEZCUTBFc1dVRkJTU3hQUVVGUExFZEJRVWNzU1VGQlNTeERRVUZETEU5QlFVd3NRMEZCWVN4WFFVRmlMRVZCUVdRN1FVRkRRU3hsUVVGUExFdEJRVXNzUTBGQlF5eFBRVUZPTEVOQlFXTXNXVUZCV1N4RFFVRkRMRmRCUVdJc1JVRkJaQ3hOUVVFNFF5eERRVUZETEVOQlFTOURMRWxCUVc5RUxFOUJRVThzUTBGQlF5eFBRVUZTTEVOQlFXZENMRmxCUVZrc1EwRkJReXhYUVVGaUxFVkJRV2hDTEUxQlFXZEVMRU5CUVVNc1EwRkJOVWM3UVVGRFNDeFBRVXBsTEVOQlFXaENPMEZCUzBFc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGRFZpeFJRVUZCTEdGQlFXRXNSVUZCWWp0QlFVUlZMRTlCUVdRN1FVRkhTRHM3T3paQ1FVVlJPMEZCUVVFc2QwSkJRMjlETEV0QlFVc3NTMEZFZWtNN1FVRkJRU3hWUVVORkxFdEJSRVlzWlVGRFJTeExRVVJHTzBGQlFVRXNWVUZEVXl4UlFVUlVMR1ZCUTFNc1VVRkVWRHRCUVVGQkxGVkJRMjFDTEdGQlJHNUNMR1ZCUTIxQ0xHRkJSRzVDT3p0QlFVZE1MRlZCUVVrc1MwRkJTaXhGUVVGWE8wRkJRMUFzWlVGQlR5dzBRMEZCWVN4TFFVRkxMRU5CUVVNc1QwRkJia0lzUTBGQlVEdEJRVU5JTEU5QlJrUXNUVUZGVHl4SlFVRkpMRU5CUVVNc1VVRkJUQ3hGUVVGbE8wRkJRMnhDTEdWQlFVOHNPRU5CUVZBN1FVRkRTQ3hQUVVaTkxFMUJSVUU3UVVGRFNDeGxRVUZQTEc5Q1FVRkRMR3RDUVVGRU8wRkJRVmNzVlVGQlFTeFJRVUZSTEVWQlFVVXNTMEZCU3l4WlFVRXhRanRCUVVOWExGVkJRVUVzUzBGQlN5eEZRVUZGTzBGQlJHeENMRlZCUVZBN1FVRkZTRHRCUVVOS096czdPMFZCZWtkdlFpeExRVUZMTEVOQlFVTXNVenM3WlVFMFIyaENMRlU3T3pzN096dEJRMmhJWmpzN096dEJRVVZCTEVsQlFVMHNiMEpCUVc5Q0xFZEJRVWNzZDBKQlFUZENPMEZCUTBFc1NVRkJUU3hWUVVGVkxFZEJRVWNzVVVGQlVTeERRVUZETEdOQlFWUXNRMEZCZDBJc2IwSkJRWGhDTEVOQlFXNUNPMEZCUlVFc1VVRkJVU3hEUVVGRExFMUJRVlFzUTBGRFNTeHZRa0ZCUXl4dFFrRkJSRHRCUVVGWkxFVkJRVUVzUjBGQlJ5eEZRVUZGTEZWQlFWVXNRMEZCUXl4UFFVRllMRU5CUVcxQ0xFZEJRWEJETzBGQlFYbERMRVZCUVVFc1VVRkJVU3hGUVVGRkxFbEJRVWtzUTBGQlF5eExRVUZNTEVOQlFWY3NWVUZCVlN4RFFVRkRMRTlCUVZnc1EwRkJiVUlzVVVGQk9VSTdRVUZCYmtRc1JVRkVTaXhGUVVWSkxGVkJSa283T3pzN096czdPenM3UVVOTVFTeFRRVUZUTEZWQlFWUXNRMEZCYjBJc1IwRkJjRUlzUlVGQmVVSTdRVUZEY2tJc1UwRkJUeXhMUVVGTExFTkJRVU1zUjBGQlJDeERRVUZNTEVOQlEwWXNTVUZFUlN4RFFVTkhMRlZCUVVFc1IwRkJSenRCUVVGQkxGZEJRVWtzUjBGQlJ5eERRVUZETEVsQlFVb3NSVUZCU2p0QlFVRkJMRWRCUkU0c1JVRkZSaXhKUVVaRkxFTkJSME1zVlVGQlF5eE5RVUZFTzBGQlFVRXNWMEZCWVR0QlFVRkRMRTFCUVVFc1RVRkJUU3hGUVVGT08wRkJRVVFzUzBGQllqdEJRVUZCTEVkQlNFUXNSVUZKUXl4VlFVRkRMRXRCUVVRN1FVRkJRU3hYUVVGWk8wRkJRVU1zVFVGQlFTeExRVUZMTEVWQlFVdzdRVUZCUkN4TFFVRmFPMEZCUVVFc1IwRktSQ3hEUVVGUU8wRkJUVWc3TzJWQlJXTXNWU0lzSW1acGJHVWlPaUpuWlc1bGNtRjBaV1F1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaUtHWjFibU4wYVc5dUtDbDdablZ1WTNScGIyNGdjaWhsTEc0c2RDbDdablZ1WTNScGIyNGdieWhwTEdZcGUybG1LQ0Z1VzJsZEtYdHBaaWdoWlZ0cFhTbDdkbUZ5SUdNOVhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjbVZ4ZFdseVpTWW1jbVZ4ZFdseVpUdHBaaWdoWmlZbVl5bHlaWFIxY200Z1l5aHBMQ0V3S1R0cFppaDFLWEpsZEhWeWJpQjFLR2tzSVRBcE8zWmhjaUJoUFc1bGR5QkZjbkp2Y2loY0lrTmhibTV2ZENCbWFXNWtJRzF2WkhWc1pTQW5YQ0lyYVN0Y0lpZGNJaWs3ZEdoeWIzY2dZUzVqYjJSbFBWd2lUVTlFVlV4RlgwNVBWRjlHVDFWT1JGd2lMR0Y5ZG1GeUlIQTlibHRwWFQxN1pYaHdiM0owY3pwN2ZYMDdaVnRwWFZzd1hTNWpZV3hzS0hBdVpYaHdiM0owY3l4bWRXNWpkR2x2YmloeUtYdDJZWElnYmoxbFcybGRXekZkVzNKZE8zSmxkSFZ5YmlCdktHNThmSElwZlN4d0xIQXVaWGh3YjNKMGN5eHlMR1VzYml4MEtYMXlaWFIxY200Z2JsdHBYUzVsZUhCdmNuUnpmV1p2Y2loMllYSWdkVDFjSW1aMWJtTjBhVzl1WENJOVBYUjVjR1Z2WmlCeVpYRjFhWEpsSmlaeVpYRjFhWEpsTEdrOU1EdHBQSFF1YkdWdVozUm9PMmtyS3lsdktIUmJhVjBwTzNKbGRIVnliaUJ2ZlhKbGRIVnliaUJ5ZlNrb0tTSXNJaThxS2x4dUlDb2dRMjl1ZG1WeWRDQmhjbkpoZVNCdlppQXhOaUJpZVhSbElIWmhiSFZsY3lCMGJ5QlZWVWxFSUhOMGNtbHVaeUJtYjNKdFlYUWdiMllnZEdobElHWnZjbTA2WEc0Z0tpQllXRmhZV0ZoWVdDMVlXRmhZTFZoWVdGZ3RXRmhZV0MxWVdGaFlXRmhZV0ZoWVdGaGNiaUFxTDF4dWRtRnlJR0o1ZEdWVWIwaGxlQ0E5SUZ0ZE8xeHVabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0F5TlRZN0lDc3JhU2tnZTF4dUlDQmllWFJsVkc5SVpYaGJhVjBnUFNBb2FTQXJJREI0TVRBd0tTNTBiMU4wY21sdVp5Z3hOaWt1YzNWaWMzUnlLREVwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJpZVhSbGMxUnZWWFZwWkNoaWRXWXNJRzltWm5ObGRDa2dlMXh1SUNCMllYSWdhU0E5SUc5bVpuTmxkQ0I4ZkNBd08xeHVJQ0IyWVhJZ1luUm9JRDBnWW5sMFpWUnZTR1Y0TzF4dUlDQXZMeUJxYjJsdUlIVnpaV1FnZEc4Z1ptbDRJRzFsYlc5eWVTQnBjM04xWlNCallYVnpaV1FnWW5rZ1kyOXVZMkYwWlc1aGRHbHZiam9nYUhSMGNITTZMeTlpZFdkekxtTm9jbTl0YVhWdExtOXlaeTl3TDNZNEwybHpjM1ZsY3k5a1pYUmhhV3cvYVdROU16RTNOU05qTkZ4dUlDQnlaWFIxY200Z0tGdGlkR2hiWW5WbVcya3JLMTFkTENCaWRHaGJZblZtVzJrcksxMWRMQ0JjYmx4MFluUm9XMkoxWmx0cEt5dGRYU3dnWW5Sb1cySjFabHRwS3l0ZFhTd2dKeTBuTEZ4dVhIUmlkR2hiWW5WbVcya3JLMTFkTENCaWRHaGJZblZtVzJrcksxMWRMQ0FuTFNjc1hHNWNkR0owYUZ0aWRXWmJhU3NyWFYwc0lHSjBhRnRpZFdaYmFTc3JYVjBzSUNjdEp5eGNibHgwWW5Sb1cySjFabHRwS3l0ZFhTd2dZblJvVzJKMVpsdHBLeXRkWFN3Z0p5MG5MRnh1WEhSaWRHaGJZblZtVzJrcksxMWRMQ0JpZEdoYlluVm1XMmtySzExZExGeHVYSFJpZEdoYlluVm1XMmtySzExZExDQmlkR2hiWW5WbVcya3JLMTFkTEZ4dVhIUmlkR2hiWW5WbVcya3JLMTFkTENCaWRHaGJZblZtVzJrcksxMWRYU2t1YW05cGJpZ25KeWs3WEc1OVhHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdZbmwwWlhOVWIxVjFhV1E3WEc0aUxDSXZMeUJWYm1seGRXVWdTVVFnWTNKbFlYUnBiMjRnY21WeGRXbHlaWE1nWVNCb2FXZG9JSEYxWVd4cGRIa2djbUZ1Wkc5dElDTWdaMlZ1WlhKaGRHOXlMaUFnU1c0Z2RHaGxYRzR2THlCaWNtOTNjMlZ5SUhSb2FYTWdhWE1nWVNCc2FYUjBiR1VnWTI5dGNHeHBZMkYwWldRZ1pIVmxJSFJ2SUhWdWEyNXZkMjRnY1hWaGJHbDBlU0J2WmlCTllYUm9MbkpoYm1SdmJTZ3BYRzR2THlCaGJtUWdhVzVqYjI1emFYTjBaVzUwSUhOMWNIQnZjblFnWm05eUlIUm9aU0JnWTNKNWNIUnZZQ0JCVUVrdUlDQlhaU0JrYnlCMGFHVWdZbVZ6ZENCM1pTQmpZVzRnZG1saFhHNHZMeUJtWldGMGRYSmxMV1JsZEdWamRHbHZibHh1WEc0dkx5Qm5aWFJTWVc1a2IyMVdZV3gxWlhNZ2JtVmxaSE1nZEc4Z1ltVWdhVzUyYjJ0bFpDQnBiaUJoSUdOdmJuUmxlSFFnZDJobGNtVWdYQ0owYUdselhDSWdhWE1nWVNCRGNubHdkRzljYmk4dklHbHRjR3hsYldWdWRHRjBhVzl1TGlCQmJITnZMQ0JtYVc1a0lIUm9aU0JqYjIxd2JHVjBaU0JwYlhCc1pXMWxiblJoZEdsdmJpQnZaaUJqY25sd2RHOGdiMjRnU1VVeE1TNWNiblpoY2lCblpYUlNZVzVrYjIxV1lXeDFaWE1nUFNBb2RIbHdaVzltS0dOeWVYQjBieWtnSVQwZ0ozVnVaR1ZtYVc1bFpDY2dKaVlnWTNKNWNIUnZMbWRsZEZKaGJtUnZiVlpoYkhWbGN5QW1KaUJqY25sd2RHOHVaMlYwVW1GdVpHOXRWbUZzZFdWekxtSnBibVFvWTNKNWNIUnZLU2tnZkh4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FvZEhsd1pXOW1LRzF6UTNKNWNIUnZLU0FoUFNBbmRXNWtaV1pwYm1Wa0p5QW1KaUIwZVhCbGIyWWdkMmx1Wkc5M0xtMXpRM0o1Y0hSdkxtZGxkRkpoYm1SdmJWWmhiSFZsY3lBOVBTQW5ablZ1WTNScGIyNG5JQ1ltSUcxelEzSjVjSFJ2TG1kbGRGSmhibVJ2YlZaaGJIVmxjeTVpYVc1a0tHMXpRM0o1Y0hSdktTazdYRzVjYm1sbUlDaG5aWFJTWVc1a2IyMVdZV3gxWlhNcElIdGNiaUFnTHk4Z1YwaEJWRmRISUdOeWVYQjBieUJTVGtjZ0xTQm9kSFJ3T2k4dmQybHJhUzUzYUdGMGQyY3ViM0puTDNkcGEya3ZRM0o1Y0hSdlhHNGdJSFpoY2lCeWJtUnpPQ0E5SUc1bGR5QlZhVzUwT0VGeWNtRjVLREUyS1RzZ0x5OGdaWE5zYVc1MExXUnBjMkZpYkdVdGJHbHVaU0J1YnkxMWJtUmxabHh1WEc0Z0lHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1puVnVZM1JwYjI0Z2QyaGhkSGRuVWs1SEtDa2dlMXh1SUNBZ0lHZGxkRkpoYm1SdmJWWmhiSFZsY3loeWJtUnpPQ2s3WEc0Z0lDQWdjbVYwZFhKdUlISnVaSE00TzF4dUlDQjlPMXh1ZlNCbGJITmxJSHRjYmlBZ0x5OGdUV0YwYUM1eVlXNWtiMjBvS1MxaVlYTmxaQ0FvVWs1SEtWeHVJQ0F2TDF4dUlDQXZMeUJKWmlCaGJHd2daV3h6WlNCbVlXbHNjeXdnZFhObElFMWhkR2d1Y21GdVpHOXRLQ2t1SUNCSmRDZHpJR1poYzNRc0lHSjFkQ0JwY3lCdlppQjFibk53WldOcFptbGxaRnh1SUNBdkx5QnhkV0ZzYVhSNUxseHVJQ0IyWVhJZ2NtNWtjeUE5SUc1bGR5QkJjbkpoZVNneE5pazdYRzVjYmlBZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFNCbWRXNWpkR2x2YmlCdFlYUm9VazVIS0NrZ2UxeHVJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdMQ0J5T3lCcElEd2dNVFk3SUdrckt5a2dlMXh1SUNBZ0lDQWdhV1lnS0NocElDWWdNSGd3TXlrZ1BUMDlJREFwSUhJZ1BTQk5ZWFJvTG5KaGJtUnZiU2dwSUNvZ01IZ3hNREF3TURBd01EQTdYRzRnSUNBZ0lDQnlibVJ6VzJsZElEMGdjaUErUGo0Z0tDaHBJQ1lnTUhnd015a2dQRHdnTXlrZ0ppQXdlR1ptTzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsZEhWeWJpQnlibVJ6TzF4dUlDQjlPMXh1ZlZ4dUlpd2lkbUZ5SUhKdVp5QTlJSEpsY1hWcGNtVW9KeTR2YkdsaUwzSnVaeWNwTzF4dWRtRnlJR0o1ZEdWelZHOVZkV2xrSUQwZ2NtVnhkV2x5WlNnbkxpOXNhV0l2WW5sMFpYTlViMVYxYVdRbktUdGNibHh1THk4Z0tpcGdkakVvS1dBZ0xTQkhaVzVsY21GMFpTQjBhVzFsTFdKaGMyVmtJRlZWU1VRcUtseHVMeTljYmk4dklFbHVjM0JwY21Wa0lHSjVJR2gwZEhCek9pOHZaMmwwYUhWaUxtTnZiUzlNYVc5elN5OVZWVWxFTG1welhHNHZMeUJoYm1RZ2FIUjBjRG92TDJSdlkzTXVjSGwwYUc5dUxtOXlaeTlzYVdKeVlYSjVMM1YxYVdRdWFIUnRiRnh1WEc1MllYSWdYMjV2WkdWSlpEdGNiblpoY2lCZlkyeHZZMnR6WlhFN1hHNWNiaTh2SUZCeVpYWnBiM1Z6SUhWMWFXUWdZM0psWVhScGIyNGdkR2x0WlZ4dWRtRnlJRjlzWVhOMFRWTmxZM01nUFNBd08xeHVkbUZ5SUY5c1lYTjBUbE5sWTNNZ1BTQXdPMXh1WEc0dkx5QlRaV1VnYUhSMGNITTZMeTluYVhSb2RXSXVZMjl0TDJKeWIyOW1ZUzl1YjJSbExYVjFhV1FnWm05eUlFRlFTU0JrWlhSaGFXeHpYRzVtZFc1amRHbHZiaUIyTVNodmNIUnBiMjV6TENCaWRXWXNJRzltWm5ObGRDa2dlMXh1SUNCMllYSWdhU0E5SUdKMVppQW1KaUJ2Wm1aelpYUWdmSHdnTUR0Y2JpQWdkbUZ5SUdJZ1BTQmlkV1lnZkh3Z1cxMDdYRzVjYmlBZ2IzQjBhVzl1Y3lBOUlHOXdkR2x2Ym5NZ2ZId2dlMzA3WEc0Z0lIWmhjaUJ1YjJSbElEMGdiM0IwYVc5dWN5NXViMlJsSUh4OElGOXViMlJsU1dRN1hHNGdJSFpoY2lCamJHOWphM05sY1NBOUlHOXdkR2x2Ym5NdVkyeHZZMnR6WlhFZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUc5d2RHbHZibk11WTJ4dlkydHpaWEVnT2lCZlkyeHZZMnR6WlhFN1hHNWNiaUFnTHk4Z2JtOWtaU0JoYm1RZ1kyeHZZMnR6WlhFZ2JtVmxaQ0IwYnlCaVpTQnBibWwwYVdGc2FYcGxaQ0IwYnlCeVlXNWtiMjBnZG1Gc2RXVnpJR2xtSUhSb1pYa25jbVVnYm05MFhHNGdJQzh2SUhOd1pXTnBabWxsWkM0Z0lGZGxJR1J2SUhSb2FYTWdiR0Y2YVd4NUlIUnZJRzFwYm1sdGFYcGxJR2x6YzNWbGN5QnlaV3hoZEdWa0lIUnZJR2x1YzNWbVptbGphV1Z1ZEZ4dUlDQXZMeUJ6ZVhOMFpXMGdaVzUwY205d2VTNGdJRk5sWlNBak1UZzVYRzRnSUdsbUlDaHViMlJsSUQwOUlHNTFiR3dnZkh3Z1kyeHZZMnR6WlhFZ1BUMGdiblZzYkNrZ2UxeHVJQ0FnSUhaaGNpQnpaV1ZrUW5sMFpYTWdQU0J5Ym1jb0tUdGNiaUFnSUNCcFppQW9ibTlrWlNBOVBTQnVkV3hzS1NCN1hHNGdJQ0FnSUNBdkx5QlFaWElnTkM0MUxDQmpjbVZoZEdVZ1lXNWtJRFE0TFdKcGRDQnViMlJsSUdsa0xDQW9ORGNnY21GdVpHOXRJR0pwZEhNZ0t5QnRkV3gwYVdOaGMzUWdZbWwwSUQwZ01TbGNiaUFnSUNBZ0lHNXZaR1VnUFNCZmJtOWtaVWxrSUQwZ1cxeHVJQ0FnSUNBZ0lDQnpaV1ZrUW5sMFpYTmJNRjBnZkNBd2VEQXhMRnh1SUNBZ0lDQWdJQ0J6WldWa1FubDBaWE5iTVYwc0lITmxaV1JDZVhSbGMxc3lYU3dnYzJWbFpFSjVkR1Z6V3pOZExDQnpaV1ZrUW5sMFpYTmJORjBzSUhObFpXUkNlWFJsYzFzMVhWeHVJQ0FnSUNBZ1hUdGNiaUFnSUNCOVhHNGdJQ0FnYVdZZ0tHTnNiMk5yYzJWeElEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDOHZJRkJsY2lBMExqSXVNaXdnY21GdVpHOXRhWHBsSUNneE5DQmlhWFFwSUdOc2IyTnJjMlZ4WEc0Z0lDQWdJQ0JqYkc5amEzTmxjU0E5SUY5amJHOWphM05sY1NBOUlDaHpaV1ZrUW5sMFpYTmJObDBnUER3Z09DQjhJSE5sWldSQ2VYUmxjMXMzWFNrZ0ppQXdlRE5tWm1ZN1hHNGdJQ0FnZlZ4dUlDQjlYRzVjYmlBZ0x5OGdWVlZKUkNCMGFXMWxjM1JoYlhCeklHRnlaU0F4TURBZ2JtRnVieTF6WldOdmJtUWdkVzVwZEhNZ2MybHVZMlVnZEdobElFZHlaV2R2Y21saGJpQmxjRzlqYUN4Y2JpQWdMeThnS0RFMU9ESXRNVEF0TVRVZ01EQTZNREFwTGlBZ1NsTk9kVzFpWlhKeklHRnlaVzRuZENCd2NtVmphWE5sSUdWdWIzVm5hQ0JtYjNJZ2RHaHBjeXdnYzI5Y2JpQWdMeThnZEdsdFpTQnBjeUJvWVc1a2JHVmtJR2x1ZEdWeWJtRnNiSGtnWVhNZ0oyMXpaV056SnlBb2FXNTBaV2RsY2lCdGFXeHNhWE5sWTI5dVpITXBJR0Z1WkNBbmJuTmxZM01uWEc0Z0lDOHZJQ2d4TURBdGJtRnViM05sWTI5dVpITWdiMlptYzJWMElHWnliMjBnYlhObFkzTXBJSE5wYm1ObElIVnVhWGdnWlhCdlkyZ3NJREU1TnpBdE1ERXRNREVnTURBNk1EQXVYRzRnSUhaaGNpQnRjMlZqY3lBOUlHOXdkR2x2Ym5NdWJYTmxZM01nSVQwOUlIVnVaR1ZtYVc1bFpDQS9JRzl3ZEdsdmJuTXViWE5sWTNNZ09pQnVaWGNnUkdGMFpTZ3BMbWRsZEZScGJXVW9LVHRjYmx4dUlDQXZMeUJRWlhJZ05DNHlMakV1TWl3Z2RYTmxJR052ZFc1MElHOW1JSFYxYVdRbmN5Qm5aVzVsY21GMFpXUWdaSFZ5YVc1bklIUm9aU0JqZFhKeVpXNTBJR05zYjJOclhHNGdJQzh2SUdONVkyeGxJSFJ2SUhOcGJYVnNZWFJsSUdocFoyaGxjaUJ5WlhOdmJIVjBhVzl1SUdOc2IyTnJYRzRnSUhaaGNpQnVjMlZqY3lBOUlHOXdkR2x2Ym5NdWJuTmxZM01nSVQwOUlIVnVaR1ZtYVc1bFpDQS9JRzl3ZEdsdmJuTXVibk5sWTNNZ09pQmZiR0Z6ZEU1VFpXTnpJQ3NnTVR0Y2JseHVJQ0F2THlCVWFXMWxJSE5wYm1ObElHeGhjM1FnZFhWcFpDQmpjbVZoZEdsdmJpQW9hVzRnYlhObFkzTXBYRzRnSUhaaGNpQmtkQ0E5SUNodGMyVmpjeUF0SUY5c1lYTjBUVk5sWTNNcElDc2dLRzV6WldOeklDMGdYMnhoYzNST1UyVmpjeWt2TVRBd01EQTdYRzVjYmlBZ0x5OGdVR1Z5SURRdU1pNHhMaklzSUVKMWJYQWdZMnh2WTJ0elpYRWdiMjRnWTJ4dlkyc2djbVZuY21WemMybHZibHh1SUNCcFppQW9aSFFnUENBd0lDWW1JRzl3ZEdsdmJuTXVZMnh2WTJ0elpYRWdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUdOc2IyTnJjMlZ4SUQwZ1kyeHZZMnR6WlhFZ0t5QXhJQ1lnTUhnelptWm1PMXh1SUNCOVhHNWNiaUFnTHk4Z1VtVnpaWFFnYm5ObFkzTWdhV1lnWTJ4dlkyc2djbVZuY21WemMyVnpJQ2h1WlhjZ1kyeHZZMnR6WlhFcElHOXlJSGRsSjNabElHMXZkbVZrSUc5dWRHOGdZU0J1WlhkY2JpQWdMeThnZEdsdFpTQnBiblJsY25aaGJGeHVJQ0JwWmlBb0tHUjBJRHdnTUNCOGZDQnRjMlZqY3lBK0lGOXNZWE4wVFZObFkzTXBJQ1ltSUc5d2RHbHZibk11Ym5ObFkzTWdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUc1elpXTnpJRDBnTUR0Y2JpQWdmVnh1WEc0Z0lDOHZJRkJsY2lBMExqSXVNUzR5SUZSb2NtOTNJR1Z5Y205eUlHbG1JSFJ2YnlCdFlXNTVJSFYxYVdSeklHRnlaU0J5WlhGMVpYTjBaV1JjYmlBZ2FXWWdLRzV6WldOeklENDlJREV3TURBd0tTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkMWRXbGtMbll4S0NrNklFTmhibHhjSjNRZ1kzSmxZWFJsSUcxdmNtVWdkR2hoYmlBeE1FMGdkWFZwWkhNdmMyVmpKeWs3WEc0Z0lIMWNibHh1SUNCZmJHRnpkRTFUWldOeklEMGdiWE5sWTNNN1hHNGdJRjlzWVhOMFRsTmxZM01nUFNCdWMyVmpjenRjYmlBZ1gyTnNiMk5yYzJWeElEMGdZMnh2WTJ0elpYRTdYRzVjYmlBZ0x5OGdVR1Z5SURRdU1TNDBJQzBnUTI5dWRtVnlkQ0JtY205dElIVnVhWGdnWlhCdlkyZ2dkRzhnUjNKbFoyOXlhV0Z1SUdWd2IyTm9YRzRnSUcxelpXTnpJQ3M5SURFeU1qRTVNamt5T0RBd01EQXdPMXh1WEc0Z0lDOHZJR0IwYVcxbFgyeHZkMkJjYmlBZ2RtRnlJSFJzSUQwZ0tDaHRjMlZqY3lBbUlEQjRabVptWm1abVppa2dLaUF4TURBd01DQXJJRzV6WldOektTQWxJREI0TVRBd01EQXdNREF3TzF4dUlDQmlXMmtySzEwZ1BTQjBiQ0ErUGo0Z01qUWdKaUF3ZUdabU8xeHVJQ0JpVzJrcksxMGdQU0IwYkNBK1BqNGdNVFlnSmlBd2VHWm1PMXh1SUNCaVcya3JLMTBnUFNCMGJDQStQajRnT0NBbUlEQjRabVk3WEc0Z0lHSmJhU3NyWFNBOUlIUnNJQ1lnTUhobVpqdGNibHh1SUNBdkx5QmdkR2x0WlY5dGFXUmdYRzRnSUhaaGNpQjBiV2dnUFNBb2JYTmxZM01nTHlBd2VERXdNREF3TURBd01DQXFJREV3TURBd0tTQW1JREI0Wm1abVptWm1aanRjYmlBZ1lsdHBLeXRkSUQwZ2RHMW9JRDQrUGlBNElDWWdNSGhtWmp0Y2JpQWdZbHRwS3l0ZElEMGdkRzFvSUNZZ01IaG1aanRjYmx4dUlDQXZMeUJnZEdsdFpWOW9hV2RvWDJGdVpGOTJaWEp6YVc5dVlGeHVJQ0JpVzJrcksxMGdQU0IwYldnZ1BqNCtJREkwSUNZZ01IaG1JSHdnTUhneE1Ec2dMeThnYVc1amJIVmtaU0IyWlhKemFXOXVYRzRnSUdKYmFTc3JYU0E5SUhSdGFDQStQajRnTVRZZ0ppQXdlR1ptTzF4dVhHNGdJQzh2SUdCamJHOWphMTl6WlhGZmFHbGZZVzVrWDNKbGMyVnlkbVZrWUNBb1VHVnlJRFF1TWk0eUlDMGdhVzVqYkhWa1pTQjJZWEpwWVc1MEtWeHVJQ0JpVzJrcksxMGdQU0JqYkc5amEzTmxjU0ErUGo0Z09DQjhJREI0T0RBN1hHNWNiaUFnTHk4Z1lHTnNiMk5yWDNObGNWOXNiM2RnWEc0Z0lHSmJhU3NyWFNBOUlHTnNiMk5yYzJWeElDWWdNSGhtWmp0Y2JseHVJQ0F2THlCZ2JtOWtaV0JjYmlBZ1ptOXlJQ2gyWVhJZ2JpQTlJREE3SUc0Z1BDQTJPeUFySzI0cElIdGNiaUFnSUNCaVcya2dLeUJ1WFNBOUlHNXZaR1ZiYmwwN1hHNGdJSDFjYmx4dUlDQnlaWFIxY200Z1luVm1JRDhnWW5WbUlEb2dZbmwwWlhOVWIxVjFhV1FvWWlrN1hHNTlYRzVjYm0xdlpIVnNaUzVsZUhCdmNuUnpJRDBnZGpFN1hHNGlMQ0ptZFc1amRHbHZiaUJCWTJOdmNtUnBiMjRvY0hKdmNITXBJSHRjYmlBZ0lDQmpiMjV6ZENCN2FYUmxiWE1zSUdSdlUyVmhjbU5vZlNBOUlIQnliM0J6TzF4dUlDQWdJSEpsZEhWeWJpQW9YRzRnSUNBZ0lDQWdJRHhrYVhZZ1kyeGhjM05PWVcxbFBWd2lZV05qYjNKa2FXOXVJR0ZqWTI5eVpHbHZiaTFwWTI5dUlHRmpZMjl5WkdsdmJpMXNhWE4wWENJK1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpWVdOamIzSmthVzl1TFhObFlYSmphRndpUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4cGJuQjFkQ0IwZVhCbFBWd2lkR1Y0ZEZ3aUlHNWhiV1U5WENKcWMyOXVMWEpsYm1SbGNpMXpaV0Z5WTJoY0lpQnZia05vWVc1blpUMTdaRzlUWldGeVkyaDlJSEJzWVdObGFHOXNaR1Z5UFZ3aVJtbHNkR1Z5SUc5dUxpNHVYQ0lnTHo1Y2JpQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVYRzRnSUNBZ0lDQWdJQ0FnSUNCN2FYUmxiWE11YldGd0tHbDBaVzBnUFQ0Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHpaV04wYVc5dUlHTnNZWE56VG1GdFpUMWNJbUZqWTI5eVpHbHZiaTF6WldOMGFXOXVYQ0lnYTJWNVBYdHBkR1Z0TG1sa2ZUNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEd4aFltVnNJSFJoWWtsdVpHVjRQVndpTUZ3aUlHTnNZWE56VG1GdFpUMWNJbUZqWTI5eVpHbHZiaTEwYjJkbmJHVmNJaUJvZEcxc1JtOXlQVndpWVdOamIzSmthVzl1TFhObFkzUnBiMjR0TVZ3aVBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2UybDBaVzB1ZEdsMGJHVjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dmJHRmlaV3crWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFlnWTJ4aGMzTk9ZVzFsUFZ3aVlXTmpiM0prYVc5dUxXTnZiblJsYm5SY0lqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIdHBkR1Z0TG1OdmJuUmxiblI5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dmMyVmpkR2x2Ymo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ2twZlZ4dUlDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQXBPMXh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCQlkyTnZjbVJwYjI0N0lpd2lhVzF3YjNKMElFRmpZMjl5WkdsdmJpQm1jbTl0SUNjdUwwRmpZMjl5WkdsdmJpYzdYRzVwYlhCdmNuUWdkWFZwWkhZeElHWnliMjBnSjNWMWFXUXZkakVuTzF4dWFXMXdiM0owSUdkbGRFRndhVVJoZEdFZ1puSnZiU0FuTGk0dkxpNHZWWFJwYkdsMGFXVnpMMmRsZEVGd2FVUmhkR0VuTzF4dVhHNWpiR0Z6Y3lCS2MyOXVVR0Z5YzJWeUlHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lncElIdGNiaUFnSUNBZ0lDQWdjM1Z3WlhJb0tUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1emRHRjBaU0E5SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1Z5Y205eU9pQnVkV3hzTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdhWE5NYjJGa1pXUTZJR1poYkhObExGeHVJQ0FnSUNBZ0lDQWdJQ0FnYVhSbGJYTTZJRnRkTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdabWxzZEdWeVpXUkpkR1Z0Y3pvZ1cxMWNiaUFnSUNBZ0lDQWdmVHRjYmx4dUlDQWdJQ0FnSUNCMGFHbHpMbWhoYm1Sc1pWTmxZWEpqYUNBOUlIUm9hWE11YUdGdVpHeGxVMlZoY21Ob0xtSnBibVFvZEdocGN5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdVoyVjBUMkpxWldOMFVISnZjQ0E5SUhSb2FYTXVaMlYwVDJKcVpXTjBVSEp2Y0M1aWFXNWtLSFJvYVhNcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUdOdmJYQnZibVZ1ZEVScFpFMXZkVzUwS0NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1kbGRFUmhkR0VvS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JuWlhSRVlYUmhLQ2tnZTF4dUlDQWdJQ0FnSUNCamIyNXpkQ0I3ZFhKc2ZTQTlJSFJvYVhNdWNISnZjSE03WEc0Z0lDQWdJQ0FnSUdkbGRFRndhVVJoZEdFb2RYSnNLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0xuUm9aVzRvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnS0h0eVpYTjFiSFI5S1NBOVBpQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOdmJuTjBJR1JoZEdFZ1BTQjBhR2x6TG0xaGNFUmhkR0VvY21WemRXeDBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLQ0ZrWVhSaElIeDhJRTlpYW1WamRDNXJaWGx6S0dSaGRHRXBMbXhsYm1kMGFDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYSnliM0k2SUVWeWNtOXlLQ2REYjNWc1pDQnViM1FnWm1WMFkyZ2daR0YwWVNCbWNtOXRJRlZTVEM0bktTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwYzB4dllXUmxaRG9nZEhKMVpWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwYzB4dllXUmxaRG9nZEhKMVpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzF6T2lCa1lYUmhMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabWxzZEdWeVpXUkpkR1Z0Y3pvZ1pHRjBZVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0FvZTJWeWNtOXlmU2tnUFQ0Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtIdHBjMHh2WVdSbFpEb2dkSEoxWlN3Z1pYSnliM0o5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FwTzF4dUlDQWdJSDFjYmx4dUlDQWdJRzFoY0VSaGRHRW9hbk52YmtSaGRHRXBJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdlMlpwWld4a1RXRndmU0E5SUhSb2FYTXVjSEp2Y0hNN1hHNGdJQ0FnSUNBZ0lDOHZJRWRsZENCMGFHVWdiMkpxWldOMElHTnZiblJoYVc1cGJtY2dhWFJsYlhNZ1puSnZiU0JLVTA5T1hHNGdJQ0FnSUNBZ0lHeGxkQ0JwZEdWdGN5QTlJSFJvYVhNdVoyVjBUMkpxWldOMFVISnZjQ2hxYzI5dVJHRjBZU3dnWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQS9JR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJdWMzQnNhWFFvSnk0bktTQTZJRnRkS1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLQ0ZwZEdWdGN5QjhmQ0JQWW1wbFkzUXVhMlY1Y3locGRHVnRjeWt1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0x5OGdUV0Z3SUhSb1pTQmtZWFJoSUdsMFpXMXpYRzRnSUNBZ0lDQWdJR2wwWlcxeklEMGdhWFJsYlhNdWJXRndLR2wwWlcwZ1BUNGdLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbGtPaUIxZFdsa2RqRW9LU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnBkR3hsT2lCMGFHbHpMbWRsZEU5aWFtVmpkRkJ5YjNBb2FYUmxiU3dnWm1sbGJHUk5ZWEF1ZEdsMGJHVXVjM0JzYVhRb0p5NG5LU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmpiMjUwWlc1ME9pQjBhR2x6TG1kbGRFOWlhbVZqZEZCeWIzQW9hWFJsYlN3Z1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZEM1emNHeHBkQ2duTGljcEtWeHVJQ0FnSUNBZ0lDQjlLU2s3WEc0Z0lDQWdJQ0FnSUM4dklGSmxiVzkyWlNCdlltcGxZM1J6SUhkcGRHZ2diV2x6YzJsdVp5Qm1hV1ZzWkhOY2JpQWdJQ0FnSUNBZ2FYUmxiWE1nUFNCcGRHVnRjeTVtYVd4MFpYSW9ablZ1WTNScGIyNGdLR2wwWlcwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJwZEdWdExtbGtJQ1ltSUdsMFpXMHVkR2wwYkdVZ0ppWWdhWFJsYlM1amIyNTBaVzUwTzF4dUlDQWdJQ0FnSUNCOUtUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdhWFJsYlhNN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnWjJWMFQySnFaV04wVUhKdmNDaHZZbW9zSUd0bGVYTXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHdGxlWE11YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnWm05eUlDaHNaWFFnYVNBOUlEQTdJR2tnUENCclpYbHpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2IySnFMbWhoYzA5M2JsQnliM0JsY25SNUtHdGxlWE5iYVYwcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxSUQwZ2IySnFXMnRsZVhOYmFWMWRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamIyNXpiMnhsTG14dlp5Z25TVzUyWVd4cFpDQnRZWEFnYTJWNUp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHNTFiR3c3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUdoaGJtUnNaVk5sWVhKamFDaGxkbVZ1ZENrZ2UxeHVJQ0FnSUNBZ0lDQnNaWFFnYzJWaGNtTm9VM1J5YVc1bklEMGdaWFpsYm5RdWRHRnlaMlYwTG5aaGJIVmxPMXh1WEc0Z0lDQWdJQ0FnSUd4bGRDQm1hV3gwWlhKbFpFbDBaVzF6SUQwZ2RHaHBjeTV6ZEdGMFpTNXBkR1Z0Y3p0Y2JpQWdJQ0FnSUNBZ1ptbHNkR1Z5WldSSmRHVnRjeUE5SUdacGJIUmxjbVZrU1hSbGJYTXVabWxzZEdWeUtDaHBkR1Z0S1NBOVBpQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCc1pYUWdkR2wwYkdVZ1BTQnBkR1Z0TG5ScGRHeGxMblJ2VEc5M1pYSkRZWE5sS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JzWlhRZ1kyOXVkR1Z1ZENBOUlHbDBaVzB1WTI5dWRHVnVkQzUwYjB4dmQyVnlRMkZ6WlNncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSFJwZEd4bExtbHVaR1Y0VDJZb2MyVmhjbU5vVTNSeWFXNW5MblJ2VEc5M1pYSkRZWE5sS0NrcElDRTlQU0F0TVNCOGZDQmpiMjUwWlc1MExtbHVaR1Y0VDJZb2MyVmhjbU5vVTNSeWFXNW5MblJ2VEc5M1pYSkRZWE5sS0NrcElDRTlQU0F0TVR0Y2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMyVjBVM1JoZEdVb2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm1sc2RHVnlaV1JKZEdWdGMxeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaVzVrWlhJb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdGxjbkp2Y2l3Z2FYTk1iMkZrWldRc0lHWnBiSFJsY21Wa1NYUmxiWE45SUQwZ2RHaHBjeTV6ZEdGMFpUdGNibHh1SUNBZ0lDQWdJQ0JwWmlBb1pYSnliM0lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQThaR2wyUGtWeWNtOXlPaUI3WlhKeWIzSXViV1Z6YzJGblpYMDhMMlJwZGo0N1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9JV2x6VEc5aFpHVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1BHUnBkajVNYjJGa2FXNW5MaTR1UEM5a2FYWStPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4QlkyTnZjbVJwYjI0Z1pHOVRaV0Z5WTJnOWUzUm9hWE11YUdGdVpHeGxVMlZoY21Ob2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVhSbGJYTTllMlpwYkhSbGNtVmtTWFJsYlhOOUx6NDdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVwemIyNVFZWEp6WlhJN0lpd2lhVzF3YjNKMElFcHpiMjVRWVhKelpYSWdabkp2YlNBbkxpOURiMjF3YjI1bGJuUnpMMHB6YjI1UVlYSnpaWEluTzF4dVhHNWpiMjV6ZENCdGIyUktjMjl1VW1WdVpHVnlSV3hsYldWdWRDQTlJQ2R0YjJSMWJHRnlhWFI1TFdwemIyNHRjbVZ1WkdWeUp6dGNibU52Ym5OMElHUnZiVVZzWlcxbGJuUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaHRiMlJLYzI5dVVtVnVaR1Z5Uld4bGJXVnVkQ2s3WEc1Y2JsSmxZV04wUkU5TkxuSmxibVJsY2loY2JpQWdJQ0E4U25OdmJsQmhjbk5sY2lCMWNtdzllMlJ2YlVWc1pXMWxiblF1WkdGMFlYTmxkQzUxY214OUlHWnBaV3hrVFdGd1BYdEtVMDlPTG5CaGNuTmxLR1J2YlVWc1pXMWxiblF1WkdGMFlYTmxkQzVtYVdWc1pHMWhjQ2w5THo0c1hHNGdJQ0FnWkc5dFJXeGxiV1Z1ZEZ4dUtUc2lMQ0ptZFc1amRHbHZiaUJuWlhSQmNHbEVZWFJoS0hWeWJDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCbVpYUmphQ2gxY213cFhHNGdJQ0FnSUNBZ0lDNTBhR1Z1S0hKbGN5QTlQaUJ5WlhNdWFuTnZiaWdwS1Z4dUlDQWdJQ0FnSUNBdWRHaGxiaWhjYmlBZ0lDQWdJQ0FnSUNBZ0lDaHlaWE4xYkhRcElEMCtJQ2g3Y21WemRXeDBmU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQW9aWEp5YjNJcElEMCtJQ2g3WlhKeWIzSjlLVnh1SUNBZ0lDQWdJQ0FwTzF4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQm5aWFJCY0dsRVlYUmhPMXh1SWwxOVxuIl0sImZpbGUiOiJGcm9udC9JbmRleEZyb250LmpzIn0=
