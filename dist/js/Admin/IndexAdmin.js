(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (root, factory){
  'use strict';

  /*istanbul ignore next:cant test*/
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else {
    // Browser globals
    root.objectPath = factory();
  }
})(this, function(){
  'use strict';

  var toStr = Object.prototype.toString;
  function hasOwnProperty(obj, prop) {
    if(obj == null) {
      return false
    }
    //to handle objects with null prototypes (too edge case?)
    return Object.prototype.hasOwnProperty.call(obj, prop)
  }

  function isEmpty(value){
    if (!value) {
      return true;
    }
    if (isArray(value) && value.length === 0) {
        return true;
    } else if (typeof value !== 'string') {
        for (var i in value) {
            if (hasOwnProperty(value, i)) {
                return false;
            }
        }
        return true;
    }
    return false;
  }

  function toString(type){
    return toStr.call(type);
  }

  function isObject(obj){
    return typeof obj === 'object' && toString(obj) === "[object Object]";
  }

  var isArray = Array.isArray || function(obj){
    /*istanbul ignore next:cant test*/
    return toStr.call(obj) === '[object Array]';
  }

  function isBoolean(obj){
    return typeof obj === 'boolean' || toString(obj) === '[object Boolean]';
  }

  function getKey(key){
    var intKey = parseInt(key);
    if (intKey.toString() === key) {
      return intKey;
    }
    return key;
  }

  function factory(options) {
    options = options || {}

    var objectPath = function(obj) {
      return Object.keys(objectPath).reduce(function(proxy, prop) {
        if(prop === 'create') {
          return proxy;
        }

        /*istanbul ignore else*/
        if (typeof objectPath[prop] === 'function') {
          proxy[prop] = objectPath[prop].bind(objectPath, obj);
        }

        return proxy;
      }, {});
    };

    function hasShallowProperty(obj, prop) {
      return (options.includeInheritedProps || (typeof prop === 'number' && Array.isArray(obj)) || hasOwnProperty(obj, prop))
    }

    function getShallowProperty(obj, prop) {
      if (hasShallowProperty(obj, prop)) {
        return obj[prop];
      }
    }

    function set(obj, path, value, doNotReplace){
      if (typeof path === 'number') {
        path = [path];
      }
      if (!path || path.length === 0) {
        return obj;
      }
      if (typeof path === 'string') {
        return set(obj, path.split('.').map(getKey), value, doNotReplace);
      }
      var currentPath = path[0];
      var currentValue = getShallowProperty(obj, currentPath);
      if (path.length === 1) {
        if (currentValue === void 0 || !doNotReplace) {
          obj[currentPath] = value;
        }
        return currentValue;
      }

      if (currentValue === void 0) {
        //check if we assume an array
        if(typeof path[1] === 'number') {
          obj[currentPath] = [];
        } else {
          obj[currentPath] = {};
        }
      }

      return set(obj[currentPath], path.slice(1), value, doNotReplace);
    }

    objectPath.has = function (obj, path) {
      if (typeof path === 'number') {
        path = [path];
      } else if (typeof path === 'string') {
        path = path.split('.');
      }

      if (!path || path.length === 0) {
        return !!obj;
      }

      for (var i = 0; i < path.length; i++) {
        var j = getKey(path[i]);

        if((typeof j === 'number' && isArray(obj) && j < obj.length) ||
          (options.includeInheritedProps ? (j in Object(obj)) : hasOwnProperty(obj, j))) {
          obj = obj[j];
        } else {
          return false;
        }
      }

      return true;
    };

    objectPath.ensureExists = function (obj, path, value){
      return set(obj, path, value, true);
    };

    objectPath.set = function (obj, path, value, doNotReplace){
      return set(obj, path, value, doNotReplace);
    };

    objectPath.insert = function (obj, path, value, at){
      var arr = objectPath.get(obj, path);
      at = ~~at;
      if (!isArray(arr)) {
        arr = [];
        objectPath.set(obj, path, arr);
      }
      arr.splice(at, 0, value);
    };

    objectPath.empty = function(obj, path) {
      if (isEmpty(path)) {
        return void 0;
      }
      if (obj == null) {
        return void 0;
      }

      var value, i;
      if (!(value = objectPath.get(obj, path))) {
        return void 0;
      }

      if (typeof value === 'string') {
        return objectPath.set(obj, path, '');
      } else if (isBoolean(value)) {
        return objectPath.set(obj, path, false);
      } else if (typeof value === 'number') {
        return objectPath.set(obj, path, 0);
      } else if (isArray(value)) {
        value.length = 0;
      } else if (isObject(value)) {
        for (i in value) {
          if (hasShallowProperty(value, i)) {
            delete value[i];
          }
        }
      } else {
        return objectPath.set(obj, path, null);
      }
    };

    objectPath.push = function (obj, path /*, values */){
      var arr = objectPath.get(obj, path);
      if (!isArray(arr)) {
        arr = [];
        objectPath.set(obj, path, arr);
      }

      arr.push.apply(arr, Array.prototype.slice.call(arguments, 2));
    };

    objectPath.coalesce = function (obj, paths, defaultValue) {
      var value;

      for (var i = 0, len = paths.length; i < len; i++) {
        if ((value = objectPath.get(obj, paths[i])) !== void 0) {
          return value;
        }
      }

      return defaultValue;
    };

    objectPath.get = function (obj, path, defaultValue){
      if (typeof path === 'number') {
        path = [path];
      }
      if (!path || path.length === 0) {
        return obj;
      }
      if (obj == null) {
        return defaultValue;
      }
      if (typeof path === 'string') {
        return objectPath.get(obj, path.split('.'), defaultValue);
      }

      var currentPath = getKey(path[0]);
      var nextObj = getShallowProperty(obj, currentPath)
      if (nextObj === void 0) {
        return defaultValue;
      }

      if (path.length === 1) {
        return nextObj;
      }

      return objectPath.get(obj[currentPath], path.slice(1), defaultValue);
    };

    objectPath.del = function del(obj, path) {
      if (typeof path === 'number') {
        path = [path];
      }

      if (obj == null) {
        return obj;
      }

      if (isEmpty(path)) {
        return obj;
      }
      if(typeof path === 'string') {
        return objectPath.del(obj, path.split('.'));
      }

      var currentPath = getKey(path[0]);
      if (!hasShallowProperty(obj, currentPath)) {
        return obj;
      }

      if(path.length === 1) {
        if (isArray(obj)) {
          obj.splice(currentPath, 1);
        } else {
          delete obj[currentPath];
        }
      } else {
        return objectPath.del(obj[currentPath], path.slice(1));
      }

      return obj;
    }

    return objectPath;
  }

  var mod = factory();
  mod.create = factory;
  mod.withInheritedProps = factory({includeInheritedProps: true})
  return mod;
});

},{}],2:[function(require,module,exports){
'use strict'

const {isObject, getKeys} = require('./lang')

// PRIVATE PROPERTIES
const BYPASS_MODE = '__bypassMode'
const IGNORE_CIRCULAR = '__ignoreCircular'
const MAX_DEEP = '__maxDeep'
const CACHE = '__cache'
const QUEUE = '__queue'
const STATE = '__state'

const EMPTY_STATE = {}

class RecursiveIterator {
  /**
   * @param {Object|Array} root
   * @param {Number} [bypassMode=0]
   * @param {Boolean} [ignoreCircular=false]
   * @param {Number} [maxDeep=100]
   */
  constructor (root, bypassMode = 0, ignoreCircular = false, maxDeep = 100) {
    this[BYPASS_MODE] = bypassMode
    this[IGNORE_CIRCULAR] = ignoreCircular
    this[MAX_DEEP] = maxDeep
    this[CACHE] = []
    this[QUEUE] = []
    this[STATE] = this.getState(undefined, root)
  }
  /**
   * @returns {Object}
   */
  next () {
    const {node, path, deep} = this[STATE] || EMPTY_STATE

    if (this[MAX_DEEP] > deep) {
      if (this.isNode(node)) {
        if (this.isCircular(node)) {
          if (this[IGNORE_CIRCULAR]) {
            // skip
          } else {
            throw new Error('Circular reference')
          }
        } else {
          if (this.onStepInto(this[STATE])) {
            const descriptors = this.getStatesOfChildNodes(node, path, deep)
            const method = this[BYPASS_MODE] ? 'push' : 'unshift'
            this[QUEUE][method](...descriptors)
            this[CACHE].push(node)
          }
        }
      }
    }

    const value = this[QUEUE].shift()
    const done = !value

    this[STATE] = value

    if (done) this.destroy()

    return {value, done}
  }
  /**
   *
   */
  destroy () {
    this[QUEUE].length = 0
    this[CACHE].length = 0
    this[STATE] = null
  }
  /**
   * @param {*} any
   * @returns {Boolean}
   */
  isNode (any) {
    return isObject(any)
  }
  /**
   * @param {*} any
   * @returns {Boolean}
   */
  isLeaf (any) {
    return !this.isNode(any)
  }
  /**
   * @param {*} any
   * @returns {Boolean}
   */
  isCircular (any) {
    return this[CACHE].indexOf(any) !== -1
  }
  /**
   * Returns states of child nodes
   * @param {Object} node
   * @param {Array} path
   * @param {Number} deep
   * @returns {Array<Object>}
   */
  getStatesOfChildNodes (node, path, deep) {
    return getKeys(node).map(key =>
      this.getState(node, node[key], key, path.concat(key), deep + 1)
    )
  }
  /**
   * Returns state of node. Calls for each node
   * @param {Object} [parent]
   * @param {*} [node]
   * @param {String} [key]
   * @param {Array} [path]
   * @param {Number} [deep]
   * @returns {Object}
   */
  getState (parent, node, key, path = [], deep = 0) {
    return {parent, node, key, path, deep}
  }
  /**
   * Callback
   * @param {Object} state
   * @returns {Boolean}
   */
  onStepInto (state) {
    return true
  }
  /**
   * @returns {RecursiveIterator}
   */
  [Symbol.iterator] () {
    return this
  }
}

module.exports = RecursiveIterator

},{"./lang":3}],3:[function(require,module,exports){
'use strict'
/**
 * @param {*} any
 * @returns {Boolean}
 */
function isObject (any) {
  return any !== null && typeof any === 'object'
}
/**
 * @param {*} any
 * @returns {Boolean}
 */
const {isArray} = Array
/**
 * @param {*} any
 * @returns {Boolean}
 */
function isArrayLike (any) {
  if (!isObject(any)) return false
  if (!('length' in any)) return false
  const length = any.length
  if (!isNumber(length)) return false
  if (length > 0) {
    return (length - 1) in any
  } else {
    for (const key in any) {
      return false
    }
  }
}
/**
 * @param {*} any
 * @returns {Boolean}
 */
function isNumber (any) {
  return typeof any === 'number'
}
/**
 * @param {Object|Array} object
 * @returns {Array<String>}
 */
function getKeys (object) {
  const keys_ = Object.keys(object)
  if (isArray(object)) {
    // skip sort
  } else if (isArrayLike(object)) {
    const index = keys_.indexOf('length')
    if (index > -1) {
      keys_.splice(index, 1)
    }
    // skip sort
  } else {
    // sort
    keys_.sort()
  }
  return keys_
}

exports.getKeys = getKeys
exports.isArray = isArray
exports.isArrayLike = isArrayLike
exports.isObject = isObject
exports.isNumber = isNumber

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ListItem = _interopRequireDefault(require("./ListItem"));

var _recursiveIterator = _interopRequireDefault(require("recursive-iterator"));

var _objectPath = _interopRequireDefault(require("object-path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

var DataList =
/*#__PURE__*/
function (_React$Component) {
  _inherits(DataList, _React$Component);

  function DataList(props) {
    var _this;

    _classCallCheck(this, DataList);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(DataList).call(this, props));
    _this.renderNodes = _this.renderNodes.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    _this.setFieldMap = _this.setFieldMap.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    return _this;
  }

  _createClass(DataList, [{
    key: "setFieldMap",
    value: function setFieldMap(path, event) {
      event.preventDefault();
      this.props.updateFieldMap(_defineProperty({}, event.target.dataset.field, path));
    }
  }, {
    key: "renderNodes",
    value: function renderNodes(data) {
      var _this2 = this;

      return Object.keys(data).map(function (item) {
        if (item === 'objectPath') {
          return;
        }

        var child = React.createElement(_ListItem.default, {
          key: item.toString(),
          value: item,
          object: data[item],
          fieldMap: _this2.props.fieldMap,
          onClickContainer: function onClickContainer(e) {
            return _this2.setFieldMap(data[item].objectPath, e);
          },
          onClickTitle: function onClickTitle(e) {
            return _this2.setFieldMap(data[item], e);
          },
          onClickContent: function onClickContent(e) {
            return _this2.setFieldMap(data[item], e);
          }
        });

        if (_typeof(data[item]) === 'object' && data[item] !== null) {
          child = React.cloneElement(child, {
            children: Array.isArray(data[item]) ? _this2.renderNodes(data[item][0]) : _this2.renderNodes(data[item])
          });
        }

        return child;
      });
    }
  }, {
    key: "render",
    value: function render() {
      var fieldMap = this.props.fieldMap;
      var data = this.props.data;

      if (Array.isArray(data)) {
        fieldMap.itemContainer = '';
      }

      if (fieldMap.itemContainer === null) {
        if (Array.isArray(data)) {
          data = data[0];
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = new _recursiveIterator.default(data)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _step.value,
                parent = _step$value.parent,
                node = _step$value.node,
                key = _step$value.key,
                path = _step$value.path;

            if (_typeof(node) === 'object' && node !== null) {
              var pathString = path.join('.');

              _objectPath.default.set(data, pathString + '.objectPath', pathString);
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        return React.createElement("div", null, React.createElement("h3", null, "Select items container"), React.createElement("ul", null, this.renderNodes(data)));
      } else {
        var objectData = _objectPath.default.get(this.props.data, fieldMap.itemContainer);

        if (Array.isArray(objectData)) {
          objectData = objectData[0];
        }

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = new _recursiveIterator.default(objectData)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _step2$value = _step2.value,
                parent = _step2$value.parent,
                node = _step2$value.node,
                key = _step2$value.key,
                path = _step2$value.path;

            if (_typeof(node) !== 'object') {
              var _pathString = path.join('.');

              _objectPath.default.set(objectData, _pathString, _pathString);
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        return React.createElement("div", null, React.createElement("h3", null, "Select title and content fields"), React.createElement("ul", null, this.renderNodes(objectData)));
      }
    }
  }]);

  return DataList;
}(React.Component);

var _default = DataList;
exports.default = _default;

},{"./ListItem":7,"object-path":1,"recursive-iterator":2}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _DataList = _interopRequireDefault(require("./DataList"));

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

var FieldSelection =
/*#__PURE__*/
function (_React$Component) {
  _inherits(FieldSelection, _React$Component);

  function FieldSelection(props) {
    var _this;

    _classCallCheck(this, FieldSelection);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(FieldSelection).call(this, props));
    _this.state = {
      error: null,
      isLoaded: false,
      items: []
    };
    _this.updateFieldMap = _this.updateFieldMap.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    return _this;
  }

  _createClass(FieldSelection, [{
    key: "updateFieldMap",
    value: function updateFieldMap(value) {
      this.props.updateFieldMap(value);
    }
  }, {
    key: "getData",
    value: function getData() {
      var _this2 = this;

      var url = this.props.url;
      (0, _getApiData.default)(url).then(function (_ref) {
        var result = _ref.result;

        if (!result || Object.keys(result).length === 0) {
          _this2.setState({
            error: Error('Could not fetch data from URL.'),
            isLoaded: true
          });

          return;
        }

        _this2.setState({
          isLoaded: true,
          items: result
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
    key: "componentDidMount",
    value: function componentDidMount() {
      this.getData();
    }
  }, {
    key: "render",
    value: function render() {
      var _this$state = this.state,
          error = _this$state.error,
          isLoaded = _this$state.isLoaded,
          items = _this$state.items;

      if (error) {
        return React.createElement("div", null, React.createElement("p", null, "Error: ", error.message));
      } else if (!isLoaded) {
        return React.createElement("div", {
          className: "spinner is-active",
          style: {
            float: 'none',
            display: 'block',
            width: 'auto',
            height: 'auto',
            padding: '10px 10px 30px 10px'
          }
        });
      } else {
        return React.createElement(_DataList.default, {
          data: items,
          url: this.props.url,
          fieldMap: this.props.fieldMap,
          updateFieldMap: this.updateFieldMap
        });
      }
    }
  }]);

  return FieldSelection;
}(React.Component);

var _default = FieldSelection;
exports.default = _default;

},{"../../Utilities/getApiData":11,"./DataList":4}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function InputFields(props) {
  return React.createElement("div", null, React.createElement("input", {
    type: "hidden",
    name: "mod_json_render_url",
    value: props.url
  }), React.createElement("input", {
    type: "hidden",
    name: "mod_json_render_fieldmap",
    value: JSON.stringify(props.fieldMap)
  }));
}

var _default = InputFields;
exports.default = _default;

},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function ListItem(props) {
  var value = props.value,
      children = props.children,
      fieldMap = props.fieldMap,
      object = props.object,
      onClickTitle = props.onClickTitle,
      onClickContent = props.onClickContent,
      onClickContainer = props.onClickContainer;
  return React.createElement("li", null, fieldMap.title === object ? React.createElement("strong", null, "Title: ") : '', fieldMap.content === object ? React.createElement("strong", null, "Content: ") : '', children ? React.createElement("strong", null, value) : React.createElement("span", null, value), !children && !fieldMap.title && fieldMap.content !== object && fieldMap.itemContainer !== null ? React.createElement("a", {
    href: "#",
    className: "button button-small",
    "data-field": "title",
    onClick: onClickTitle
  }, "Title") : '', !children && fieldMap.title !== object && !fieldMap.content && fieldMap.itemContainer !== null ? React.createElement("a", {
    href: "#",
    className: "button button-small",
    "data-field": "content",
    onClick: onClickContent
  }, "Content") : '', children && Array.isArray(object) && fieldMap.itemContainer === null ? React.createElement("a", {
    href: "#",
    className: "button button-small",
    "data-field": "itemContainer",
    onClick: onClickContainer
  }, "Select") : '', children ? React.createElement("span", {
    className: "dashicons dashicons-arrow-down"
  }) : '', children ? React.createElement("ul", {
    style: {
      paddingLeft: 15,
      borderLeft: '2px solid #ccc'
    }
  }, children) : '');
}

var _default = ListItem;
exports.default = _default;

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _FieldSelection = _interopRequireDefault(require("./FieldSelection"));

var _InputFields = _interopRequireDefault(require("./InputFields"));

var _Summary = _interopRequireDefault(require("./Summary"));

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

var initialState = {
  showFieldSelection: false,
  url: '',
  fieldMap: {
    itemContainer: null,
    title: '',
    content: ''
  }
};

var Settings =
/*#__PURE__*/
function (_React$Component) {
  _inherits(Settings, _React$Component);

  function Settings(props) {
    var _this;

    _classCallCheck(this, Settings);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Settings).call(this, props));
    _this.state = initialState;
    _this.urlChange = _this.urlChange.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    _this.handleSubmit = _this.handleSubmit.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    _this.resetOptions = _this.resetOptions.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    _this.updateFieldMap = _this.updateFieldMap.bind(_assertThisInitialized(_assertThisInitialized(_this)));
    return _this;
  }

  _createClass(Settings, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      this.initOptions();
    }
  }, {
    key: "initOptions",
    value: function initOptions() {
      if (typeof modJsonRender.options !== 'undefined') {
        var options = modJsonRender.options;
        this.setState({
          url: options.url ? options.url : '',
          fieldMap: options.fieldMap ? JSON.parse(options.fieldMap) : {
            itemContainer: null,
            title: '',
            content: ''
          },
          showFieldSelection: !!options.url
        });
      }
    }
  }, {
    key: "urlChange",
    value: function urlChange(event) {
      this.setState({
        url: event.target.value
      });
    }
  }, {
    key: "handleSubmit",
    value: function handleSubmit(event) {
      event.preventDefault();
      this.setState({
        showFieldSelection: true
      });
    }
  }, {
    key: "resetOptions",
    value: function resetOptions(event) {
      event.preventDefault();
      this.setState(initialState);
    }
  }, {
    key: "updateFieldMap",
    value: function updateFieldMap(value) {
      var newVal = Object.assign(this.state.fieldMap, value);
      this.setState({
        fieldMap: newVal
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this$state = this.state,
          showFieldSelection = _this$state.showFieldSelection,
          url = _this$state.url;
      var _this$state$fieldMap = this.state.fieldMap,
          itemContainer = _this$state$fieldMap.itemContainer,
          title = _this$state$fieldMap.title,
          content = _this$state$fieldMap.content;

      if (url && itemContainer !== null && title && content) {
        return React.createElement("div", null, React.createElement(_Summary.default, this.state), React.createElement(_InputFields.default, this.state), React.createElement("a", {
          href: "#",
          onClick: this.resetOptions,
          className: "button"
        }, "Reset settings"));
      } else if (showFieldSelection) {
        return React.createElement("div", null, React.createElement(_FieldSelection.default, {
          url: url,
          fieldMap: this.state.fieldMap,
          updateFieldMap: this.updateFieldMap
        }), React.createElement(_InputFields.default, this.state), React.createElement("a", {
          href: "#",
          onClick: this.resetOptions,
          className: "button"
        }, "Reset settings"));
      } else {
        return React.createElement("div", {
          className: "wrap"
        }, React.createElement("form", {
          onSubmit: this.handleSubmit
        }, React.createElement("p", null, React.createElement("label", null, React.createElement("strong", null, "Data source")), React.createElement("br", null), React.createElement("i", null, "Enter a valid JSON api url.")), React.createElement("input", {
          type: "text",
          style: {
            width: '100%'
          },
          value: url,
          onChange: this.urlChange
        }), React.createElement("p", null, React.createElement("input", {
          type: "submit",
          className: "button button-primary",
          value: "Submit"
        }))), React.createElement(_InputFields.default, this.state));
      }
    }
  }]);

  return Settings;
}(React.Component);

var _default = Settings;
exports.default = _default;

},{"./FieldSelection":5,"./InputFields":6,"./Summary":9}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function Summary(props) {
  return React.createElement("ul", null, React.createElement("li", {
    style: {
      wordBreak: 'break-all'
    }
  }, "Data source: ", props.url), React.createElement("li", null, "Title: ", props.fieldMap.title), React.createElement("li", null, "Content: ", props.fieldMap.content));
}

var _default = Summary;
exports.default = _default;

},{}],10:[function(require,module,exports){
"use strict";

var _Settings = _interopRequireDefault(require("./Components/Settings"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var modJsonRenderElement = 'modularity-json-render';
var domElement = document.getElementById(modJsonRenderElement);
ReactDOM.render(React.createElement(_Settings.default, null), domElement);

},{"./Components/Settings":8}],11:[function(require,module,exports){
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

},{}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7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RUFBQztBQUE3RCxVQUFILENBVEosQ0FESixFQVlJLG9CQUFDLG9CQUFELEVBQWlCLEtBQUssS0FBdEIsQ0FaSixDQURKO0FBZ0JIO0FBQ0o7Ozs7RUFuRmtCLEtBQUssQ0FBQyxTOztlQXNGZCxROzs7Ozs7Ozs7OztBQ3BHZixTQUFTLE9BQVQsQ0FBaUIsS0FBakIsRUFBd0I7QUFDcEIsU0FDSSxnQ0FDSTtBQUFJLElBQUEsS0FBSyxFQUFFO0FBQUMsTUFBQSxTQUFTLEVBQUU7QUFBWjtBQUFYLHNCQUFtRCxLQUFLLENBQUMsR0FBekQsQ0FESixFQUVJLDJDQUFZLEtBQUssQ0FBQyxRQUFOLENBQWUsS0FBM0IsQ0FGSixFQUdJLDZDQUFjLEtBQUssQ0FBQyxRQUFOLENBQWUsT0FBN0IsQ0FISixDQURKO0FBT0g7O2VBRWMsTzs7Ozs7O0FDVmY7Ozs7QUFFQSxJQUFNLG9CQUFvQixHQUFHLHdCQUE3QjtBQUNBLElBQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFULENBQXdCLG9CQUF4QixDQUFuQjtBQUVBLFFBQVEsQ0FBQyxNQUFULENBQ0ksb0JBQUMsaUJBQUQsT0FESixFQUVJLFVBRko7Ozs7Ozs7Ozs7QUNMQSxTQUFTLFVBQVQsQ0FBb0IsR0FBcEIsRUFBeUI7QUFDckIsU0FBTyxLQUFLLENBQUMsR0FBRCxDQUFMLENBQ0YsSUFERSxDQUNHLFVBQUEsR0FBRztBQUFBLFdBQUksR0FBRyxDQUFDLElBQUosRUFBSjtBQUFBLEdBRE4sRUFFRixJQUZFLENBR0MsVUFBQyxNQUFEO0FBQUEsV0FBYTtBQUFDLE1BQUEsTUFBTSxFQUFOO0FBQUQsS0FBYjtBQUFBLEdBSEQsRUFJQyxVQUFDLEtBQUQ7QUFBQSxXQUFZO0FBQUMsTUFBQSxLQUFLLEVBQUw7QUFBRCxLQUFaO0FBQUEsR0FKRCxDQUFQO0FBTUg7O2VBRWMsVSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5vYmplY3RQYXRoID0gZmFjdG9yeSgpO1xuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgaWYob2JqID09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvL3RvIGhhbmRsZSBvYmplY3RzIHdpdGggbnVsbCBwcm90b3R5cGVzICh0b28gZWRnZSBjYXNlPylcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcClcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpe1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKXtcbiAgICByZXR1cm4gdG9TdHIuY2FsbCh0eXBlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XG4gIH1cblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKXtcbiAgICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gICAgcmV0dXJuIHRvU3RyLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQm9vbGVhbihvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0S2V5KGtleSl7XG4gICAgdmFyIGludEtleSA9IHBhcnNlSW50KGtleSk7XG4gICAgaWYgKGludEtleS50b1N0cmluZygpID09PSBrZXkpIHtcbiAgICAgIHJldHVybiBpbnRLZXk7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBmYWN0b3J5KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gICAgdmFyIG9iamVjdFBhdGggPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3RQYXRoKS5yZWR1Y2UoZnVuY3Rpb24ocHJveHksIHByb3ApIHtcbiAgICAgICAgaWYocHJvcCA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICAgIH1cblxuICAgICAgICAvKmlzdGFuYnVsIGlnbm9yZSBlbHNlKi9cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RQYXRoW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcHJveHlbcHJvcF0gPSBvYmplY3RQYXRoW3Byb3BdLmJpbmQob2JqZWN0UGF0aCwgb2JqKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgIH0sIHt9KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgcmV0dXJuIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyB8fCAodHlwZW9mIHByb3AgPT09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkob2JqKSkgfHwgaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLm1hcChnZXRLZXkpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IHBhdGhbMF07XG4gICAgICB2YXIgY3VycmVudFZhbHVlID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCB8fCAhZG9Ob3RSZXBsYWNlKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCkge1xuICAgICAgICAvL2NoZWNrIGlmIHdlIGFzc3VtZSBhbiBhcnJheVxuICAgICAgICBpZih0eXBlb2YgcGF0aFsxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfVxuXG4gICAgb2JqZWN0UGF0aC5oYXMgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICEhb2JqO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGogPSBnZXRLZXkocGF0aFtpXSk7XG5cbiAgICAgICAgaWYoKHR5cGVvZiBqID09PSAnbnVtYmVyJyAmJiBpc0FycmF5KG9iaikgJiYgaiA8IG9iai5sZW5ndGgpIHx8XG4gICAgICAgICAgKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzID8gKGogaW4gT2JqZWN0KG9iaikpIDogaGFzT3duUHJvcGVydHkob2JqLCBqKSkpIHtcbiAgICAgICAgICBvYmogPSBvYmpbal07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVuc3VyZUV4aXN0cyA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguaW5zZXJ0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGF0KXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgYXQgPSB+fmF0O1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cbiAgICAgIGFyci5zcGxpY2UoYXQsIDAsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbXB0eSA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUsIGk7XG4gICAgICBpZiAoISh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCkpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsICcnKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHZhbHVlLmxlbmd0aCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICBmb3IgKGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgbnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGgucHVzaCA9IGZ1bmN0aW9uIChvYmosIHBhdGggLyosIHZhbHVlcyAqLyl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG5cbiAgICAgIGFyci5wdXNoLmFwcGx5KGFyciwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguY29hbGVzY2UgPSBmdW5jdGlvbiAob2JqLCBwYXRocywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoc1tpXSkpICE9PSB2b2lkIDApIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBkZWZhdWx0VmFsdWUpe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLCBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICB2YXIgbmV4dE9iaiA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKVxuICAgICAgaWYgKG5leHRPYmogPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG5leHRPYmo7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCBkZWZhdWx0VmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmRlbCA9IGZ1bmN0aW9uIGRlbChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZih0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9iaiwgcGF0aC5zcGxpdCgnLicpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgaWYgKCFoYXNTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgIG9iai5zcGxpY2UoY3VycmVudFBhdGgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvYmpbY3VycmVudFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iamVjdFBhdGg7XG4gIH1cblxuICB2YXIgbW9kID0gZmFjdG9yeSgpO1xuICBtb2QuY3JlYXRlID0gZmFjdG9yeTtcbiAgbW9kLndpdGhJbmhlcml0ZWRQcm9wcyA9IGZhY3Rvcnkoe2luY2x1ZGVJbmhlcml0ZWRQcm9wczogdHJ1ZX0pXG4gIHJldHVybiBtb2Q7XG59KTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG4iLCIndXNlIHN0cmljdCdcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCAoYW55KSB7XG4gIHJldHVybiBhbnkgIT09IG51bGwgJiYgdHlwZW9mIGFueSA9PT0gJ29iamVjdCdcbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5jb25zdCB7aXNBcnJheX0gPSBBcnJheVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlIChhbnkpIHtcbiAgaWYgKCFpc09iamVjdChhbnkpKSByZXR1cm4gZmFsc2VcbiAgaWYgKCEoJ2xlbmd0aCcgaW4gYW55KSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGxlbmd0aCA9IGFueS5sZW5ndGhcbiAgaWYgKCFpc051bWJlcihsZW5ndGgpKSByZXR1cm4gZmFsc2VcbiAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gKGxlbmd0aCAtIDEpIGluIGFueVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFueSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIgKGFueSkge1xuICByZXR1cm4gdHlwZW9mIGFueSA9PT0gJ251bWJlcidcbn1cbi8qKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5PFN0cmluZz59XG4gKi9cbmZ1bmN0aW9uIGdldEtleXMgKG9iamVjdCkge1xuICBjb25zdCBrZXlzXyA9IE9iamVjdC5rZXlzKG9iamVjdClcbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkge1xuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2UgaWYgKGlzQXJyYXlMaWtlKG9iamVjdCkpIHtcbiAgICBjb25zdCBpbmRleCA9IGtleXNfLmluZGV4T2YoJ2xlbmd0aCcpXG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIGtleXNfLnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSB7XG4gICAgLy8gc29ydFxuICAgIGtleXNfLnNvcnQoKVxuICB9XG4gIHJldHVybiBrZXlzX1xufVxuXG5leHBvcnRzLmdldEtleXMgPSBnZXRLZXlzXG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5XG5leHBvcnRzLmlzQXJyYXlMaWtlID0gaXNBcnJheUxpa2VcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdFxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyXG4iLCJpbXBvcnQgTGlzdEl0ZW0gZnJvbSAnLi9MaXN0SXRlbSc7XG5pbXBvcnQgcmVjdXJzaXZlSXRlcmF0b3IgZnJvbSAncmVjdXJzaXZlLWl0ZXJhdG9yJztcbmltcG9ydCBvYmplY3RQYXRoIGZyb20gJ29iamVjdC1wYXRoJztcblxuY2xhc3MgRGF0YUxpc3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJOb2RlcyA9IHRoaXMucmVuZGVyTm9kZXMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zZXRGaWVsZE1hcCA9IHRoaXMuc2V0RmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBzZXRGaWVsZE1hcChwYXRoLCBldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHtbZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGRdOiBwYXRofSk7XG4gICAgfVxuXG4gICAgcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGNoaWxkID0gPExpc3RJdGVtIGtleT17aXRlbS50b1N0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtpdGVtfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdD17ZGF0YVtpdGVtXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGFpbmVyPXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrVGl0bGU9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGVudD17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfS8+O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbaXRlbV0gPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiB0aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgICAgbGV0IGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3IoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IGl0ZW1zIGNvbnRhaW5lcjwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bD57dGhpcy5yZW5kZXJOb2RlcyhkYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBvYmplY3REYXRhID0gb2JqZWN0UGF0aC5nZXQodGhpcy5wcm9wcy5kYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3Iob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFBhdGguc2V0KG9iamVjdERhdGEsIHBhdGhTdHJpbmcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IHRpdGxlIGFuZCBjb250ZW50IGZpZWxkczwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bD57dGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRGF0YUxpc3Q7IiwiaW1wb3J0IERhdGFMaXN0IGZyb20gJy4vRGF0YUxpc3QnO1xuaW1wb3J0IGdldEFwaURhdGEgZnJvbSAnLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGEnO1xuXG5jbGFzcyBGaWVsZFNlbGVjdGlvbiBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICAgICAgICBpdGVtczogW11cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnVwZGF0ZUZpZWxkTWFwID0gdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAodmFsdWUpO1xuICAgIH1cblxuICAgIGdldERhdGEoKSB7XG4gICAgICAgIGNvbnN0IHt1cmx9ID0gdGhpcy5wcm9wcztcbiAgICAgICAgZ2V0QXBpRGF0YSh1cmwpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICAoe3Jlc3VsdH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBFcnJvcignQ291bGQgbm90IGZldGNoIGRhdGEgZnJvbSBVUkwuJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe2lzTG9hZGVkOiB0cnVlLCBpdGVtczogcmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgfSwgKHtlcnJvcn0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7aXNMb2FkZWQ6IHRydWUsIGVycm9yfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCB7ZXJyb3IsIGlzTG9hZGVkLCBpdGVtc30gPSB0aGlzLnN0YXRlO1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiA8ZGl2PjxwPkVycm9yOiB7ZXJyb3IubWVzc2FnZX08L3A+PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIiBzdHlsZT17e1xuICAgICAgICAgICAgICAgIGZsb2F0OiAnbm9uZScsXG4gICAgICAgICAgICAgICAgZGlzcGxheTogJ2Jsb2NrJyxcbiAgICAgICAgICAgICAgICB3aWR0aDogJ2F1dG8nLFxuICAgICAgICAgICAgICAgIGhlaWdodDogJ2F1dG8nLFxuICAgICAgICAgICAgICAgIHBhZGRpbmc6ICcxMHB4IDEwcHggMzBweCAxMHB4J1xuICAgICAgICAgICAgfX0+PC9kaXY+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDxEYXRhTGlzdFxuICAgICAgICAgICAgICAgIGRhdGE9e2l0ZW1zfVxuICAgICAgICAgICAgICAgIHVybD17dGhpcy5wcm9wcy51cmx9XG4gICAgICAgICAgICAgICAgZmllbGRNYXA9e3RoaXMucHJvcHMuZmllbGRNYXB9XG4gICAgICAgICAgICAgICAgdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXB9Lz47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZpZWxkU2VsZWN0aW9uOyIsImZ1bmN0aW9uIElucHV0RmllbGRzKHByb3BzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm1vZF9qc29uX3JlbmRlcl91cmxcIiB2YWx1ZT17cHJvcHMudXJsfS8+XG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJtb2RfanNvbl9yZW5kZXJfZmllbGRtYXBcIiB2YWx1ZT17SlNPTi5zdHJpbmdpZnkocHJvcHMuZmllbGRNYXApfS8+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IElucHV0RmllbGRzOyIsImZ1bmN0aW9uIExpc3RJdGVtKHByb3BzKSB7XG4gICAgY29uc3Qge3ZhbHVlLCBjaGlsZHJlbiwgZmllbGRNYXAsIG9iamVjdCwgb25DbGlja1RpdGxlLCBvbkNsaWNrQ29udGVudCwgb25DbGlja0NvbnRhaW5lcn0gPSBwcm9wcztcbiAgICByZXR1cm4gKDxsaT5cbiAgICAgICAge2ZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgPyA8c3Ryb25nPlRpdGxlOiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAge2ZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCA/IDxzdHJvbmc+Q29udGVudDogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgIHtjaGlsZHJlbiA/IDxzdHJvbmc+e3ZhbHVlfTwvc3Ryb25nPiA6IDxzcGFuPnt2YWx1ZX08L3NwYW4+fVxuICAgICAgICB7IWNoaWxkcmVuICYmICFmaWVsZE1hcC50aXRsZSAmJiAoZmllbGRNYXAuY29udGVudCAhPT0gb2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiIGRhdGEtZmllbGQ9XCJ0aXRsZVwiIG9uQ2xpY2s9e29uQ2xpY2tUaXRsZX0+VGl0bGU8L2E+IDogJyd9XG4gICAgICAgIHshY2hpbGRyZW4gJiYgKGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QpICYmICFmaWVsZE1hcC5jb250ZW50ICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgP1xuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXNtYWxsXCIgZGF0YS1maWVsZD1cImNvbnRlbnRcIlxuICAgICAgICAgICAgICAgb25DbGljaz17b25DbGlja0NvbnRlbnR9PkNvbnRlbnQ8L2E+IDogJyd9XG4gICAgICAgIHtjaGlsZHJlbiAmJiBBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCA/XG4gICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tc21hbGxcIiBkYXRhLWZpZWxkPVwiaXRlbUNvbnRhaW5lclwiXG4gICAgICAgICAgICAgICBvbkNsaWNrPXtvbkNsaWNrQ29udGFpbmVyfT5TZWxlY3Q8L2E+IDogJyd9XG4gICAgICAgIHtjaGlsZHJlbiA/IDxzcGFuIGNsYXNzTmFtZT1cImRhc2hpY29ucyBkYXNoaWNvbnMtYXJyb3ctZG93blwiPjwvc3Bhbj4gOiAnJ31cbiAgICAgICAge2NoaWxkcmVuID8gPHVsIHN0eWxlPXt7cGFkZGluZ0xlZnQ6IDE1LCBib3JkZXJMZWZ0OiAnMnB4IHNvbGlkICNjY2MnfX0+e2NoaWxkcmVufTwvdWw+IDogJyd9XG4gICAgPC9saT4pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBMaXN0SXRlbTsiLCJpbXBvcnQgRmllbGRTZWxlY3Rpb24gZnJvbSAnLi9GaWVsZFNlbGVjdGlvbic7XG5pbXBvcnQgSW5wdXRGaWVsZHMgZnJvbSAnLi9JbnB1dEZpZWxkcyc7XG5pbXBvcnQgU3VtbWFyeSBmcm9tICcuL1N1bW1hcnknO1xuXG5jb25zdCBpbml0aWFsU3RhdGUgPSB7XG4gICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICB1cmw6ICcnLFxuICAgIGZpZWxkTWFwOiB7XG4gICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgY29udGVudDogJydcbiAgICB9XG59O1xuXG5jbGFzcyBTZXR0aW5ncyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0gaW5pdGlhbFN0YXRlO1xuXG4gICAgICAgIHRoaXMudXJsQ2hhbmdlID0gdGhpcy51cmxDaGFuZ2UuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5oYW5kbGVTdWJtaXQgPSB0aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlc2V0T3B0aW9ucyA9IHRoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMudXBkYXRlRmllbGRNYXAgPSB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuaW5pdE9wdGlvbnMoKTtcbiAgICB9XG5cbiAgICBpbml0T3B0aW9ucygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2RKc29uUmVuZGVyLm9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gbW9kSnNvblJlbmRlci5vcHRpb25zO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge2l0ZW1Db250YWluZXI6IG51bGwsIHRpdGxlOiAnJywgY29udGVudDogJyd9LFxuICAgICAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dXJsOiBldmVudC50YXJnZXQudmFsdWV9KTtcbiAgICB9XG5cbiAgICBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7c2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoaW5pdGlhbFN0YXRlKTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmllbGRNYXA6IG5ld1ZhbH0pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3Nob3dGaWVsZFNlbGVjdGlvbiwgdXJsfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IHtpdGVtQ29udGFpbmVyLCB0aXRsZSwgY29udGVudH0gPSB0aGlzLnN0YXRlLmZpZWxkTWFwO1xuXG4gICAgICAgIGlmICh1cmwgJiYgaXRlbUNvbnRhaW5lciAhPT0gbnVsbCAmJiB0aXRsZSAmJiBjb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxTdW1tYXJ5IHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnN9IGNsYXNzTmFtZT1cImJ1dHRvblwiPlJlc2V0IHNldHRpbmdzPC9hPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChzaG93RmllbGRTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPEZpZWxkU2VsZWN0aW9uIHVybD17dXJsfSBmaWVsZE1hcD17dGhpcy5zdGF0ZS5maWVsZE1hcH0gdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXB9Lz5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIG9uQ2xpY2s9e3RoaXMucmVzZXRPcHRpb25zfSBjbGFzc05hbWU9XCJidXR0b25cIj5SZXNldCBzZXR0aW5nczwvYT5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwid3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17dGhpcy5oYW5kbGVTdWJtaXR9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPkRhdGEgc291cmNlPC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpPkVudGVyIGEgdmFsaWQgSlNPTiBhcGkgdXJsLjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHN0eWxlPXt7d2lkdGg6ICcxMDAlJ319IHZhbHVlPXt1cmx9IG9uQ2hhbmdlPXt0aGlzLnVybENoYW5nZX0vPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+PGlucHV0IHR5cGU9XCJzdWJtaXRcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXByaW1hcnlcIiB2YWx1ZT1cIlN1Ym1pdFwiLz48L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU2V0dGluZ3M7IiwiZnVuY3Rpb24gU3VtbWFyeShwcm9wcykge1xuICAgIHJldHVybiAoXG4gICAgICAgIDx1bD5cbiAgICAgICAgICAgIDxsaSBzdHlsZT17e3dvcmRCcmVhazogJ2JyZWFrLWFsbCd9fT5EYXRhIHNvdXJjZToge3Byb3BzLnVybH08L2xpPlxuICAgICAgICAgICAgPGxpPlRpdGxlOiB7cHJvcHMuZmllbGRNYXAudGl0bGV9PC9saT5cbiAgICAgICAgICAgIDxsaT5Db250ZW50OiB7cHJvcHMuZmllbGRNYXAuY29udGVudH08L2xpPlxuICAgICAgICA8L3VsPlxuICAgICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IFN1bW1hcnk7IiwiaW1wb3J0IFNldHRpbmdzIGZyb20gJy4vQ29tcG9uZW50cy9TZXR0aW5ncyc7XG5cbmNvbnN0IG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xuY29uc3QgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxTZXR0aW5ncyAvPixcbiAgICBkb21FbGVtZW50XG4pOyIsImZ1bmN0aW9uIGdldEFwaURhdGEodXJsKSB7XG4gICAgcmV0dXJuIGZldGNoKHVybClcbiAgICAgICAgLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXG4gICAgICAgIC50aGVuKFxuICAgICAgICAgICAgKHJlc3VsdCkgPT4gKHtyZXN1bHR9KSxcbiAgICAgICAgICAgIChlcnJvcikgPT4gKHtlcnJvcn0pXG4gICAgICAgICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldEFwaURhdGE7XG4iXX0=

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdChwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnJlbmRlck5vZGVzID0gX3RoaXMucmVuZGVyTm9kZXMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMuc2V0RmllbGRNYXAgPSBfdGhpcy5zZXRGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGlmIChpdGVtID09PSAnb2JqZWN0UGF0aCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBSZWFjdC5jcmVhdGVFbGVtZW50KF9MaXN0SXRlbS5kZWZhdWx0LCB7XG4gICAgICAgICAga2V5OiBpdGVtLnRvU3RyaW5nKCksXG4gICAgICAgICAgdmFsdWU6IGl0ZW0sXG4gICAgICAgICAgb2JqZWN0OiBkYXRhW2l0ZW1dLFxuICAgICAgICAgIGZpZWxkTWFwOiBfdGhpczIucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgb25DbGlja0NvbnRhaW5lcjogZnVuY3Rpb24gb25DbGlja0NvbnRhaW5lcihlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb25DbGlja0NvbnRlbnQ6IGZ1bmN0aW9uIG9uQ2xpY2tDb250ZW50KGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczIuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoX3R5cGVvZihkYXRhW2l0ZW1dKSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvciA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvciA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChkYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcCR2YWx1ZSA9IF9zdGVwLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcCR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpID09PSAnb2JqZWN0JyAmJiBub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvci5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCBpdGVtcyBjb250YWluZXJcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCBudWxsLCB0aGlzLnJlbmRlck5vZGVzKGRhdGEpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2JqZWN0RGF0YSA9IF9vYmplY3RQYXRoLmRlZmF1bHQuZ2V0KHRoaXMucHJvcHMuZGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lcik7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWU7XG4gICAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvcjIgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yMiA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvcjIgPSBuZXcgX3JlY3Vyc2l2ZUl0ZXJhdG9yLmRlZmF1bHQob2JqZWN0RGF0YSlbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDI7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSAoX3N0ZXAyID0gX2l0ZXJhdG9yMi5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcDIkdmFsdWUgPSBfc3RlcDIudmFsdWUsXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gX3N0ZXAyJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAyJHZhbHVlLm5vZGUsXG4gICAgICAgICAgICAgICAga2V5ID0gX3N0ZXAyJHZhbHVlLmtleSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3N0ZXAyJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICB2YXIgX3BhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcblxuICAgICAgICAgICAgICBfb2JqZWN0UGF0aC5kZWZhdWx0LnNldChvYmplY3REYXRhLCBfcGF0aFN0cmluZywgX3BhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IyID0gdHJ1ZTtcbiAgICAgICAgICBfaXRlcmF0b3JFcnJvcjIgPSBlcnI7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgJiYgX2l0ZXJhdG9yMi5yZXR1cm4gIT0gbnVsbCkge1xuICAgICAgICAgICAgICBfaXRlcmF0b3IyLnJldHVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IyKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaDNcIiwgbnVsbCwgXCJTZWxlY3QgdGl0bGUgYW5kIGNvbnRlbnQgZmllbGRzXCIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgdGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBEYXRhTGlzdDtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRGF0YUxpc3Q7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0xpc3RJdGVtXCI6NyxcIm9iamVjdC1wYXRoXCI6MSxcInJlY3Vyc2l2ZS1pdGVyYXRvclwiOjJ9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0RhdGFMaXN0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9EYXRhTGlzdFwiKSk7XG5cbnZhciBfZ2V0QXBpRGF0YSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbnZhciBGaWVsZFNlbGVjdGlvbiA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoRmllbGRTZWxlY3Rpb24sIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIEZpZWxkU2VsZWN0aW9uKHByb3BzKSB7XG4gICAgdmFyIF90aGlzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEZpZWxkU2VsZWN0aW9uKTtcblxuICAgIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKEZpZWxkU2VsZWN0aW9uKS5jYWxsKHRoaXMsIHByb3BzKSk7XG4gICAgX3RoaXMuc3RhdGUgPSB7XG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgIGl0ZW1zOiBbXVxuICAgIH07XG4gICAgX3RoaXMudXBkYXRlRmllbGRNYXAgPSBfdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRmllbGRTZWxlY3Rpb24sIFt7XG4gICAga2V5OiBcInVwZGF0ZUZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0RGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXREYXRhKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciB1cmwgPSB0aGlzLnByb3BzLnVybDtcbiAgICAgICgwLCBfZ2V0QXBpRGF0YS5kZWZhdWx0KSh1cmwpLnRoZW4oZnVuY3Rpb24gKF9yZWYpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IF9yZWYucmVzdWx0O1xuXG4gICAgICAgIGlmICghcmVzdWx0IHx8IE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICAgIGVycm9yOiBFcnJvcignQ291bGQgbm90IGZldGNoIGRhdGEgZnJvbSBVUkwuJyksXG4gICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICBpdGVtczogcmVzdWx0XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKF9yZWYyKSB7XG4gICAgICAgIHZhciBlcnJvciA9IF9yZWYyLmVycm9yO1xuXG4gICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUgPSB0aGlzLnN0YXRlLFxuICAgICAgICAgIGVycm9yID0gX3RoaXMkc3RhdGUuZXJyb3IsXG4gICAgICAgICAgaXNMb2FkZWQgPSBfdGhpcyRzdGF0ZS5pc0xvYWRlZCxcbiAgICAgICAgICBpdGVtcyA9IF90aGlzJHN0YXRlLml0ZW1zO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgXCJFcnJvcjogXCIsIGVycm9yLm1lc3NhZ2UpKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwic3Bpbm5lciBpcy1hY3RpdmVcIixcbiAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgZmxvYXQ6ICdub25lJyxcbiAgICAgICAgICAgIGRpc3BsYXk6ICdibG9jaycsXG4gICAgICAgICAgICB3aWR0aDogJ2F1dG8nLFxuICAgICAgICAgICAgaGVpZ2h0OiAnYXV0bycsXG4gICAgICAgICAgICBwYWRkaW5nOiAnMTBweCAxMHB4IDMwcHggMTBweCdcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0RhdGFMaXN0LmRlZmF1bHQsIHtcbiAgICAgICAgICBkYXRhOiBpdGVtcyxcbiAgICAgICAgICB1cmw6IHRoaXMucHJvcHMudXJsLFxuICAgICAgICAgIGZpZWxkTWFwOiB0aGlzLnByb3BzLmZpZWxkTWFwLFxuICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwOiB0aGlzLnVwZGF0ZUZpZWxkTWFwXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBGaWVsZFNlbGVjdGlvbjtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRmllbGRTZWxlY3Rpb247XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiOjExLFwiLi9EYXRhTGlzdFwiOjR9XSw2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBJbnB1dEZpZWxkcyhwcm9wcykge1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgIHR5cGU6IFwiaGlkZGVuXCIsXG4gICAgbmFtZTogXCJtb2RfanNvbl9yZW5kZXJfdXJsXCIsXG4gICAgdmFsdWU6IHByb3BzLnVybFxuICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcImhpZGRlblwiLFxuICAgIG5hbWU6IFwibW9kX2pzb25fcmVuZGVyX2ZpZWxkbWFwXCIsXG4gICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KHByb3BzLmZpZWxkTWFwKVxuICB9KSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IElucHV0RmllbGRzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIExpc3RJdGVtKHByb3BzKSB7XG4gIHZhciB2YWx1ZSA9IHByb3BzLnZhbHVlLFxuICAgICAgY2hpbGRyZW4gPSBwcm9wcy5jaGlsZHJlbixcbiAgICAgIGZpZWxkTWFwID0gcHJvcHMuZmllbGRNYXAsXG4gICAgICBvYmplY3QgPSBwcm9wcy5vYmplY3QsXG4gICAgICBvbkNsaWNrVGl0bGUgPSBwcm9wcy5vbkNsaWNrVGl0bGUsXG4gICAgICBvbkNsaWNrQ29udGVudCA9IHByb3BzLm9uQ2xpY2tDb250ZW50LFxuICAgICAgb25DbGlja0NvbnRhaW5lciA9IHByb3BzLm9uQ2xpY2tDb250YWluZXI7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJUaXRsZTogXCIpIDogJycsIGZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJDb250ZW50OiBcIikgOiAnJywgY2hpbGRyZW4gPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHZhbHVlKSA6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgIWNoaWxkcmVuICYmICFmaWVsZE1hcC50aXRsZSAmJiBmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiBcIiNcIixcbiAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiLFxuICAgIFwiZGF0YS1maWVsZFwiOiBcInRpdGxlXCIsXG4gICAgb25DbGljazogb25DbGlja1RpdGxlXG4gIH0sIFwiVGl0bGVcIikgOiAnJywgIWNoaWxkcmVuICYmIGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QgJiYgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiBcIiNcIixcbiAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiLFxuICAgIFwiZGF0YS1maWVsZFwiOiBcImNvbnRlbnRcIixcbiAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGVudFxuICB9LCBcIkNvbnRlbnRcIikgOiAnJywgY2hpbGRyZW4gJiYgQXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgaHJlZjogXCIjXCIsXG4gICAgY2xhc3NOYW1lOiBcImJ1dHRvbiBidXR0b24tc21hbGxcIixcbiAgICBcImRhdGEtZmllbGRcIjogXCJpdGVtQ29udGFpbmVyXCIsXG4gICAgb25DbGljazogb25DbGlja0NvbnRhaW5lclxuICB9LCBcIlNlbGVjdFwiKSA6ICcnLCBjaGlsZHJlbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICBjbGFzc05hbWU6IFwiZGFzaGljb25zIGRhc2hpY29ucy1hcnJvdy1kb3duXCJcbiAgfSkgOiAnJywgY2hpbGRyZW4gPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwge1xuICAgIHN0eWxlOiB7XG4gICAgICBwYWRkaW5nTGVmdDogMTUsXG4gICAgICBib3JkZXJMZWZ0OiAnMnB4IHNvbGlkICNjY2MnXG4gICAgfVxuICB9LCBjaGlsZHJlbikgOiAnJyk7XG59XG5cbnZhciBfZGVmYXVsdCA9IExpc3RJdGVtO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbnZhciBfRmllbGRTZWxlY3Rpb24gPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0ZpZWxkU2VsZWN0aW9uXCIpKTtcblxudmFyIF9JbnB1dEZpZWxkcyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vSW5wdXRGaWVsZHNcIikpO1xuXG52YXIgX1N1bW1hcnkgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL1N1bW1hcnlcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9XG5cbmZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKGNhbGwgJiYgKF90eXBlb2YoY2FsbCkgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikpIHsgcmV0dXJuIGNhbGw7IH0gcmV0dXJuIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZik7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxudmFyIGluaXRpYWxTdGF0ZSA9IHtcbiAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgdXJsOiAnJyxcbiAgZmllbGRNYXA6IHtcbiAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgIHRpdGxlOiAnJyxcbiAgICBjb250ZW50OiAnJ1xuICB9XG59O1xuXG52YXIgU2V0dGluZ3MgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKFNldHRpbmdzLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBTZXR0aW5ncyhwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBTZXR0aW5ncyk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihTZXR0aW5ncykuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0gaW5pdGlhbFN0YXRlO1xuICAgIF90aGlzLnVybENoYW5nZSA9IF90aGlzLnVybENoYW5nZS5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICBfdGhpcy5oYW5kbGVTdWJtaXQgPSBfdGhpcy5oYW5kbGVTdWJtaXQuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMucmVzZXRPcHRpb25zID0gX3RoaXMucmVzZXRPcHRpb25zLmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIF90aGlzLnVwZGF0ZUZpZWxkTWFwID0gX3RoaXMudXBkYXRlRmllbGRNYXAuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFNldHRpbmdzLCBbe1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuaW5pdE9wdGlvbnMoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiaW5pdE9wdGlvbnNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gaW5pdE9wdGlvbnMoKSB7XG4gICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgIHVybDogb3B0aW9ucy51cmwgPyBvcHRpb25zLnVybCA6ICcnLFxuICAgICAgICAgIGZpZWxkTWFwOiBvcHRpb25zLmZpZWxkTWFwID8gSlNPTi5wYXJzZShvcHRpb25zLmZpZWxkTWFwKSA6IHtcbiAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiAhIW9wdGlvbnMudXJsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cmxDaGFuZ2VcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXJsQ2hhbmdlKGV2ZW50KSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgdXJsOiBldmVudC50YXJnZXQudmFsdWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJoYW5kbGVTdWJtaXRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlc2V0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZXNldE9wdGlvbnMoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKGluaXRpYWxTdGF0ZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVwZGF0ZUZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICB2YXIgbmV3VmFsID0gT2JqZWN0LmFzc2lnbih0aGlzLnN0YXRlLmZpZWxkTWFwLCB2YWx1ZSk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgZmllbGRNYXA6IG5ld1ZhbFxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUgPSB0aGlzLnN0YXRlLFxuICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbiA9IF90aGlzJHN0YXRlLnNob3dGaWVsZFNlbGVjdGlvbixcbiAgICAgICAgICB1cmwgPSBfdGhpcyRzdGF0ZS51cmw7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUkZmllbGRNYXAgPSB0aGlzLnN0YXRlLmZpZWxkTWFwLFxuICAgICAgICAgIGl0ZW1Db250YWluZXIgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC5pdGVtQ29udGFpbmVyLFxuICAgICAgICAgIHRpdGxlID0gX3RoaXMkc3RhdGUkZmllbGRNYXAudGl0bGUsXG4gICAgICAgICAgY29udGVudCA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLmNvbnRlbnQ7XG5cbiAgICAgIGlmICh1cmwgJiYgaXRlbUNvbnRhaW5lciAhPT0gbnVsbCAmJiB0aXRsZSAmJiBjb250ZW50KSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX1N1bW1hcnkuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgaHJlZjogXCIjXCIsXG4gICAgICAgICAgb25DbGljazogdGhpcy5yZXNldE9wdGlvbnMsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvblwiXG4gICAgICAgIH0sIFwiUmVzZXQgc2V0dGluZ3NcIikpO1xuICAgICAgfSBlbHNlIGlmIChzaG93RmllbGRTZWxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChfRmllbGRTZWxlY3Rpb24uZGVmYXVsdCwge1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIGZpZWxkTWFwOiB0aGlzLnN0YXRlLmZpZWxkTWFwLFxuICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwOiB0aGlzLnVwZGF0ZUZpZWxkTWFwXG4gICAgICAgIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgICAgIG9uQ2xpY2s6IHRoaXMucmVzZXRPcHRpb25zLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCBcIlJlc2V0IHNldHRpbmdzXCIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwid3JhcFwiXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIsIHtcbiAgICAgICAgICBvblN1Ym1pdDogdGhpcy5oYW5kbGVTdWJtaXRcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImxhYmVsXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJEYXRhIHNvdXJjZVwiKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwgbnVsbCwgXCJFbnRlciBhIHZhbGlkIEpTT04gYXBpIHVybC5cIikpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICB3aWR0aDogJzEwMCUnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB2YWx1ZTogdXJsLFxuICAgICAgICAgIG9uQ2hhbmdlOiB0aGlzLnVybENoYW5nZVxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICAgICAgICB0eXBlOiBcInN1Ym1pdFwiLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b24gYnV0dG9uLXByaW1hcnlcIixcbiAgICAgICAgICB2YWx1ZTogXCJTdWJtaXRcIlxuICAgICAgICB9KSkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIFNldHRpbmdzO1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBTZXR0aW5ncztcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4vRmllbGRTZWxlY3Rpb25cIjo1LFwiLi9JbnB1dEZpZWxkc1wiOjYsXCIuL1N1bW1hcnlcIjo5fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gU3VtbWFyeShwcm9wcykge1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCB7XG4gICAgc3R5bGU6IHtcbiAgICAgIHdvcmRCcmVhazogJ2JyZWFrLWFsbCdcbiAgICB9XG4gIH0sIFwiRGF0YSBzb3VyY2U6IFwiLCBwcm9wcy51cmwpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgXCJUaXRsZTogXCIsIHByb3BzLmZpZWxkTWFwLnRpdGxlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIG51bGwsIFwiQ29udGVudDogXCIsIHByb3BzLmZpZWxkTWFwLmNvbnRlbnQpKTtcbn1cblxudmFyIF9kZWZhdWx0ID0gU3VtbWFyeTtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XSwxMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF9TZXR0aW5ncyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vQ29tcG9uZW50cy9TZXR0aW5nc1wiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbnZhciBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbnZhciBkb21FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kSnNvblJlbmRlckVsZW1lbnQpO1xuUmVhY3RET00ucmVuZGVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoX1NldHRpbmdzLmRlZmF1bHQsIG51bGwpLCBkb21FbGVtZW50KTtcblxufSx7XCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIjo4fV0sMTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIGdldEFwaURhdGEodXJsKSB7XG4gIHJldHVybiBmZXRjaCh1cmwpLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgIHJldHVybiByZXMuanNvbigpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICB9O1xuICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3I6IGVycm9yXG4gICAgfTtcbiAgfSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IGdldEFwaURhdGE7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV19LHt9LFsxMF0pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZiMkpxWldOMExYQmhkR2d2YVc1a1pYZ3Vhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjbVZqZFhKemFYWmxMV2wwWlhKaGRHOXlMM055WXk5U1pXTjFjbk5wZG1WSmRHVnlZWFJ2Y2k1cWN5SXNJbTV2WkdWZmJXOWtkV3hsY3k5eVpXTjFjbk5wZG1VdGFYUmxjbUYwYjNJdmMzSmpMMnhoYm1jdWFuTWlMQ0p6YjNWeVkyVXZhbk12UVdSdGFXNHZRMjl0Y0c5dVpXNTBjeTlFWVhSaFRHbHpkQzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5RGIyMXdiMjVsYm5SekwwWnBaV3hrVTJWc1pXTjBhVzl1TG1weklpd2ljMjkxY21ObEwycHpMMEZrYldsdUwwTnZiWEJ2Ym1WdWRITXZTVzV3ZFhSR2FXVnNaSE11YW5NaUxDSnpiM1Z5WTJVdmFuTXZRV1J0YVc0dlEyOXRjRzl1Wlc1MGN5OU1hWE4wU1hSbGJTNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlEYjIxd2IyNWxiblJ6TDFObGRIUnBibWR6TG1weklpd2ljMjkxY21ObEwycHpMMEZrYldsdUwwTnZiWEJ2Ym1WdWRITXZVM1Z0YldGeWVTNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlKYm1SbGVFRmtiV2x1TG1weklpd2ljMjkxY21ObEwycHpMMVYwYVd4cGRHbGxjeTluWlhSQmNHbEVZWFJoTG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJPMEZEUVVFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU53VTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVTnlTVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3T3pzN096czdPenRCUXk5RVFUczdRVUZEUVRzN1FVRkRRVHM3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN08wbEJSVTBzVVRzN096czdRVUZEUml4dlFrRkJXU3hMUVVGYUxFVkJRVzFDTzBGQlFVRTdPMEZCUVVFN08wRkJRMllzYTBaQlFVMHNTMEZCVGp0QlFVTkJMRlZCUVVzc1YwRkJUQ3hIUVVGdFFpeE5RVUZMTEZkQlFVd3NRMEZCYVVJc1NVRkJha0lzZFVSQlFXNUNPMEZCUTBFc1ZVRkJTeXhYUVVGTUxFZEJRVzFDTEUxQlFVc3NWMEZCVEN4RFFVRnBRaXhKUVVGcVFpeDFSRUZCYmtJN1FVRklaVHRCUVVsc1FqczdPenRuUTBGRlZ5eEpMRVZCUVUwc1N5eEZRVUZQTzBGQlEzSkNMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEV0QlFVd3NRMEZCVnl4alFVRllMSEZDUVVFMFFpeExRVUZMTEVOQlFVTXNUVUZCVGl4RFFVRmhMRTlCUVdJc1EwRkJjVUlzUzBGQmFrUXNSVUZCZVVRc1NVRkJla1E3UVVGRFNEczdPMmREUVVWWExFa3NSVUZCVFR0QlFVRkJPenRCUVVOa0xHRkJRVThzVFVGQlRTeERRVUZETEVsQlFWQXNRMEZCV1N4SlFVRmFMRVZCUVd0Q0xFZEJRV3hDTEVOQlFYTkNMRlZCUVVFc1NVRkJTU3hGUVVGSk8wRkJRMnBETEZsQlFVa3NTVUZCU1N4TFFVRkxMRmxCUVdJc1JVRkJNa0k3UVVGRGRrSTdRVUZEU0RzN1FVRkZSQ3haUVVGSkxFdEJRVXNzUjBGQlJ5eHZRa0ZCUXl4cFFrRkJSRHRCUVVGVkxGVkJRVUVzUjBGQlJ5eEZRVUZGTEVsQlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdZN1FVRkRWU3hWUVVGQkxFdEJRVXNzUlVGQlJTeEpRVVJxUWp0QlFVVlZMRlZCUVVFc1RVRkJUU3hGUVVGRkxFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlJuUkNPMEZCUjFVc1ZVRkJRU3hSUVVGUkxFVkJRVVVzVFVGQlNTeERRVUZETEV0QlFVd3NRMEZCVnl4UlFVZ3ZRanRCUVVsVkxGVkJRVUVzWjBKQlFXZENMRVZCUVVVc01FSkJRVUVzUTBGQlF6dEJRVUZCTEcxQ1FVRkpMRTFCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1EwRkJWeXhWUVVFMVFpeEZRVUYzUXl4RFFVRjRReXhEUVVGS08wRkJRVUVzVjBGS04wSTdRVUZMVlN4VlFVRkJMRmxCUVZrc1JVRkJSU3h6UWtGQlFTeERRVUZETzBGQlFVRXNiVUpCUVVrc1RVRkJTU3hEUVVGRExGZEJRVXdzUTBGQmFVSXNTVUZCU1N4RFFVRkRMRWxCUVVRc1EwRkJja0lzUlVGQk5rSXNRMEZCTjBJc1EwRkJTanRCUVVGQkxGZEJUSHBDTzBGQlRWVXNWVUZCUVN4alFVRmpMRVZCUVVVc2QwSkJRVUVzUTBGQlF6dEJRVUZCTEcxQ1FVRkpMRTFCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVhKQ0xFVkJRVFpDTEVOQlFUZENMRU5CUVVvN1FVRkJRVHRCUVU0elFpeFZRVUZhT3p0QlFWRkJMRmxCUVVrc1VVRkJUeXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZZTEUxQlFYTkNMRkZCUVhSQ0xFbEJRV3RETEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1MwRkJaU3hKUVVGeVJDeEZRVUV5UkR0QlFVTjJSQ3hWUVVGQkxFdEJRVXNzUjBGQlJ5eExRVUZMTEVOQlFVTXNXVUZCVGl4RFFVRnRRaXhMUVVGdVFpeEZRVUV3UWp0QlFVTTVRaXhaUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRV3hDTEVsQlFUUkNMRTFCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1EwRkJWeXhEUVVGWUxFTkJRV3BDTEVOQlFUVkNMRWRCUVRoRUxFMUJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRWEpDTzBGQlJERkRMRmRCUVRGQ0xFTkJRVkk3UVVGSFNEczdRVUZGUkN4bFFVRlBMRXRCUVZBN1FVRkRTQ3hQUVhCQ1RTeERRVUZRTzBGQmNVSklPenM3TmtKQlJWRTdRVUZEVEN4VlFVRk5MRkZCUVZFc1IwRkJSeXhMUVVGTExFdEJRVXdzUTBGQlZ5eFJRVUUxUWp0QlFVVkJMRlZCUVVrc1NVRkJTU3hIUVVGSExFdEJRVXNzUzBGQlRDeERRVUZYTEVsQlFYUkNPenRCUVVOQkxGVkJRVWtzUzBGQlN5eERRVUZETEU5QlFVNHNRMEZCWXl4SlFVRmtMRU5CUVVvc1JVRkJlVUk3UVVGRGNrSXNVVUZCUVN4UlFVRlJMRU5CUVVNc1lVRkJWQ3hIUVVGNVFpeEZRVUY2UWp0QlFVTklPenRCUVVWRUxGVkJRVWtzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJMMElzUlVGQmNVTTdRVUZEYWtNc1dVRkJTU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEVsQlFXUXNRMEZCU2l4RlFVRjVRanRCUVVOeVFpeFZRVUZCTEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNc1EwRkJSQ3hEUVVGWU8wRkJRMGc3TzBGQlNHZERPMEZCUVVFN1FVRkJRVHM3UVVGQlFUdEJRVXRxUXl3clFrRkJjME1zU1VGQlNTd3dRa0ZCU2l4RFFVRnpRaXhKUVVGMFFpeERRVUYwUXl3NFNFRkJiVVU3UVVGQlFUdEJRVUZCTEdkQ1FVRjZSQ3hOUVVGNVJDeGxRVUY2UkN4TlFVRjVSRHRCUVVGQkxHZENRVUZxUkN4SlFVRnBSQ3hsUVVGcVJDeEpRVUZwUkR0QlFVRkJMR2RDUVVFelF5eEhRVUV5UXl4bFFVRXpReXhIUVVFeVF6dEJRVUZCTEdkQ1FVRjBReXhKUVVGelF5eGxRVUYwUXl4SlFVRnpRenM3UVVGREwwUXNaMEpCUVVrc1VVRkJUeXhKUVVGUUxFMUJRV2RDTEZGQlFXaENMRWxCUVRSQ0xFbEJRVWtzUzBGQlN5eEpRVUY2UXl4RlFVRXJRenRCUVVNelF5eHJRa0ZCU1N4VlFVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVXdzUTBGQlZTeEhRVUZXTEVOQlFXcENPenRCUVVOQkxHdERRVUZYTEVkQlFWZ3NRMEZCWlN4SlFVRm1MRVZCUVhGQ0xGVkJRVlVzUjBGQlJ5eGhRVUZzUXl4RlFVRnBSQ3hWUVVGcVJEdEJRVU5JTzBGQlEwbzdRVUZXWjBNN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUczdRVUZaYWtNc1pVRkRTU3hwUTBGRFNTeDVSRUZFU2l4RlFVVkpMR2REUVVGTExFdEJRVXNzVjBGQlRDeERRVUZwUWl4SlFVRnFRaXhEUVVGTUxFTkJSa29zUTBGRVNqdEJRVTFJTEU5QmJFSkVMRTFCYTBKUE8wRkJRMGdzV1VGQlNTeFZRVUZWTEVkQlFVY3NiMEpCUVZjc1IwRkJXQ3hEUVVGbExFdEJRVXNzUzBGQlRDeERRVUZYTEVsQlFURkNMRVZCUVdkRExGRkJRVkVzUTBGQlF5eGhRVUY2UXl4RFFVRnFRanM3UVVGRlFTeFpRVUZKTEV0QlFVc3NRMEZCUXl4UFFVRk9MRU5CUVdNc1ZVRkJaQ3hEUVVGS0xFVkJRU3RDTzBGQlF6TkNMRlZCUVVFc1ZVRkJWU3hIUVVGSExGVkJRVlVzUTBGQlF5eERRVUZFTEVOQlFYWkNPMEZCUTBnN08wRkJURVU3UVVGQlFUdEJRVUZCT3p0QlFVRkJPMEZCVDBnc1owTkJRWE5ETEVsQlFVa3NNRUpCUVVvc1EwRkJjMElzVlVGQmRFSXNRMEZCZEVNc2JVbEJRWGxGTzBGQlFVRTdRVUZCUVN4blFrRkJMMFFzVFVGQkswUXNaMEpCUVM5RUxFMUJRU3RFTzBGQlFVRXNaMEpCUVhaRUxFbEJRWFZFTEdkQ1FVRjJSQ3hKUVVGMVJEdEJRVUZCTEdkQ1FVRnFSQ3hIUVVGcFJDeG5Ra0ZCYWtRc1IwRkJhVVE3UVVGQlFTeG5Ra0ZCTlVNc1NVRkJORU1zWjBKQlFUVkRMRWxCUVRSRE96dEJRVU55UlN4blFrRkJTU3hSUVVGUExFbEJRVkFzVFVGQlowSXNVVUZCY0VJc1JVRkJPRUk3UVVGRE1VSXNhMEpCUVVrc1YwRkJWU3hIUVVGSExFbEJRVWtzUTBGQlF5eEpRVUZNTEVOQlFWVXNSMEZCVml4RFFVRnFRanM3UVVGRFFTeHJRMEZCVnl4SFFVRllMRU5CUVdVc1ZVRkJaaXhGUVVFeVFpeFhRVUV6UWl4RlFVRjFReXhYUVVGMlF6dEJRVU5JTzBGQlEwbzdRVUZhUlR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk96dEJRV05JTEdWQlEwa3NhVU5CUTBrc2EwVkJSRW9zUlVGRlNTeG5RMEZCU3l4TFFVRkxMRmRCUVV3c1EwRkJhVUlzVlVGQmFrSXNRMEZCVEN4RFFVWktMRU5CUkVvN1FVRk5TRHRCUVVOS096czdPMFZCYmtaclFpeExRVUZMTEVOQlFVTXNVenM3WlVGelJtUXNVVHM3T3pzN096czdPenM3UVVNeFJtWTdPMEZCUTBFN096czdPenM3T3pzN096czdPenM3T3pzN096czdTVUZGVFN4ak96czdPenRCUVVOR0xEQkNRVUZaTEV0QlFWb3NSVUZCYlVJN1FVRkJRVHM3UVVGQlFUczdRVUZEWml4M1JrRkJUU3hMUVVGT08wRkJRMEVzVlVGQlN5eExRVUZNTEVkQlFXRTdRVUZEVkN4TlFVRkJMRXRCUVVzc1JVRkJSU3hKUVVSRk8wRkJSVlFzVFVGQlFTeFJRVUZSTEVWQlFVVXNTMEZHUkR0QlFVZFVMRTFCUVVFc1MwRkJTeXhGUVVGRk8wRkJTRVVzUzBGQllqdEJRVTFCTEZWQlFVc3NZMEZCVEN4SFFVRnpRaXhOUVVGTExHTkJRVXdzUTBGQmIwSXNTVUZCY0VJc2RVUkJRWFJDTzBGQlVtVTdRVUZUYkVJN096czdiVU5CUldNc1N5eEZRVUZQTzBGQlEyeENMRmRCUVVzc1MwRkJUQ3hEUVVGWExHTkJRVmdzUTBGQk1FSXNTMEZCTVVJN1FVRkRTRHM3T3poQ1FVVlRPMEZCUVVFN08wRkJRVUVzVlVGRFF5eEhRVVJFTEVkQlExRXNTMEZCU3l4TFFVUmlMRU5CUTBNc1IwRkVSRHRCUVVWT0xDdENRVUZYTEVkQlFWZ3NSVUZEU3l4SlFVUk1MRU5CUlZFc1owSkJRV003UVVGQlFTeFpRVUZhTEUxQlFWa3NVVUZCV2l4TlFVRlpPenRCUVVOV0xGbEJRVWtzUTBGQlF5eE5RVUZFTEVsQlFWY3NUVUZCVFN4RFFVRkRMRWxCUVZBc1EwRkJXU3hOUVVGYUxFVkJRVzlDTEUxQlFYQkNMRXRCUVN0Q0xFTkJRVGxETEVWQlFXbEVPMEZCUXpkRExGVkJRVUVzVFVGQlNTeERRVUZETEZGQlFVd3NRMEZCWXp0QlFVTldMRmxCUVVFc1MwRkJTeXhGUVVGRkxFdEJRVXNzUTBGQlF5eG5RMEZCUkN4RFFVUkdPMEZCUlZZc1dVRkJRU3hSUVVGUkxFVkJRVVU3UVVGR1FTeFhRVUZrT3p0QlFVbEJPMEZCUTBnN08wRkJRMFFzVVVGQlFTeE5RVUZKTEVOQlFVTXNVVUZCVEN4RFFVRmpPMEZCUVVNc1ZVRkJRU3hSUVVGUkxFVkJRVVVzU1VGQldEdEJRVUZwUWl4VlFVRkJMRXRCUVVzc1JVRkJSVHRCUVVGNFFpeFRRVUZrTzBGQlEwZ3NUMEZZVkN4RlFWZFhMR2xDUVVGaE8wRkJRVUVzV1VGQldDeExRVUZYTEZOQlFWZ3NTMEZCVnpzN1FVRkRXaXhSUVVGQkxFMUJRVWtzUTBGQlF5eFJRVUZNTEVOQlFXTTdRVUZCUXl4VlFVRkJMRkZCUVZFc1JVRkJSU3hKUVVGWU8wRkJRV2xDTEZWQlFVRXNTMEZCU3l4RlFVRk1PMEZCUVdwQ0xGTkJRV1E3UVVGRFNDeFBRV0pVTzBGQlpVZzdPenQzUTBGRmJVSTdRVUZEYUVJc1YwRkJTeXhQUVVGTU8wRkJRMGc3T3pzMlFrRkZVVHRCUVVGQkxIZENRVU0wUWl4TFFVRkxMRXRCUkdwRE8wRkJRVUVzVlVGRFJTeExRVVJHTEdWQlEwVXNTMEZFUmp0QlFVRkJMRlZCUTFNc1VVRkVWQ3hsUVVOVExGRkJSRlE3UVVGQlFTeFZRVU50UWl4TFFVUnVRaXhsUVVOdFFpeExRVVJ1UWpzN1FVRkZUQ3hWUVVGSkxFdEJRVW9zUlVGQlZ6dEJRVU5RTEdWQlFVOHNhVU5CUVVzc01FTkJRVmNzUzBGQlN5eERRVUZETEU5QlFXcENMRU5CUVV3c1EwRkJVRHRCUVVOSUxFOUJSa1FzVFVGRlR5eEpRVUZKTEVOQlFVTXNVVUZCVEN4RlFVRmxPMEZCUTJ4Q0xHVkJRVTg3UVVGQlN5eFZRVUZCTEZOQlFWTXNSVUZCUXl4dFFrRkJaanRCUVVGdFF5eFZRVUZCTEV0QlFVc3NSVUZCUlR0QlFVTTNReXhaUVVGQkxFdEJRVXNzUlVGQlJTeE5RVVJ6UXp0QlFVVTNReXhaUVVGQkxFOUJRVThzUlVGQlJTeFBRVVp2UXp0QlFVYzNReXhaUVVGQkxFdEJRVXNzUlVGQlJTeE5RVWh6UXp0QlFVazNReXhaUVVGQkxFMUJRVTBzUlVGQlJTeE5RVXB4UXp0QlFVczNReXhaUVVGQkxFOUJRVThzUlVGQlJUdEJRVXh2UXp0QlFVRXhReXhWUVVGUU8wRkJUMGdzVDBGU1RTeE5RVkZCTzBGQlEwZ3NaVUZCVHl4dlFrRkJReXhwUWtGQlJEdEJRVU5JTEZWQlFVRXNTVUZCU1N4RlFVRkZMRXRCUkVnN1FVRkZTQ3hWUVVGQkxFZEJRVWNzUlVGQlJTeExRVUZMTEV0QlFVd3NRMEZCVnl4SFFVWmlPMEZCUjBnc1ZVRkJRU3hSUVVGUkxFVkJRVVVzUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZJYkVJN1FVRkpTQ3hWUVVGQkxHTkJRV01zUlVGQlJTeExRVUZMTzBGQlNteENMRlZCUVZBN1FVRkxTRHRCUVVOS096czdPMFZCTVVSM1FpeExRVUZMTEVOQlFVTXNVenM3WlVFMlJIQkNMR003T3pzN096czdPenM3TzBGRGFFVm1MRk5CUVZNc1YwRkJWQ3hEUVVGeFFpeExRVUZ5UWl4RlFVRTBRanRCUVVONFFpeFRRVU5KTEdsRFFVTkpPMEZCUVU4c1NVRkJRU3hKUVVGSkxFVkJRVU1zVVVGQldqdEJRVUZ4UWl4SlFVRkJMRWxCUVVrc1JVRkJReXh4UWtGQk1VSTdRVUZCWjBRc1NVRkJRU3hMUVVGTExFVkJRVVVzUzBGQlN5eERRVUZETzBGQlFUZEVMRWxCUkVvc1JVRkZTVHRCUVVGUExFbEJRVUVzU1VGQlNTeEZRVUZETEZGQlFWbzdRVUZCY1VJc1NVRkJRU3hKUVVGSkxFVkJRVU1zTUVKQlFURkNPMEZCUVhGRUxFbEJRVUVzUzBGQlN5eEZRVUZGTEVsQlFVa3NRMEZCUXl4VFFVRk1MRU5CUVdVc1MwRkJTeXhEUVVGRExGRkJRWEpDTzBGQlFUVkVMRWxCUmtvc1EwRkVTanRCUVUxSU96dGxRVVZqTEZjN096czdPenM3T3pzN08wRkRWR1lzVTBGQlV5eFJRVUZVTEVOQlFXdENMRXRCUVd4Q0xFVkJRWGxDTzBGQlFVRXNUVUZEWkN4TFFVUmpMRWRCUTNWRkxFdEJSSFpGTEVOQlEyUXNTMEZFWXp0QlFVRkJMRTFCUTFBc1VVRkVUeXhIUVVOMVJTeExRVVIyUlN4RFFVTlFMRkZCUkU4N1FVRkJRU3hOUVVOSExGRkJSRWdzUjBGRGRVVXNTMEZFZGtVc1EwRkRSeXhSUVVSSU8wRkJRVUVzVFVGRFlTeE5RVVJpTEVkQlEzVkZMRXRCUkhaRkxFTkJRMkVzVFVGRVlqdEJRVUZCTEUxQlEzRkNMRmxCUkhKQ0xFZEJRM1ZGTEV0QlJIWkZMRU5CUTNGQ0xGbEJSSEpDTzBGQlFVRXNUVUZEYlVNc1kwRkVia01zUjBGRGRVVXNTMEZFZGtVc1EwRkRiVU1zWTBGRWJrTTdRVUZCUVN4TlFVTnRSQ3huUWtGRWJrUXNSMEZEZFVVc1MwRkVka1VzUTBGRGJVUXNaMEpCUkc1RU8wRkJSWEpDTEZOQlFWRXNaME5CUTBnc1VVRkJVU3hEUVVGRExFdEJRVlFzUzBGQmJVSXNUVUZCYmtJc1IwRkJORUlzT0VOQlFUVkNMRWRCUVhWRUxFVkJSSEJFTEVWQlJVZ3NVVUZCVVN4RFFVRkRMRTlCUVZRc1MwRkJjVUlzVFVGQmNrSXNSMEZCT0VJc1owUkJRVGxDTEVkQlFUSkVMRVZCUm5oRUxFVkJSMGdzVVVGQlVTeEhRVUZITEc5RFFVRlRMRXRCUVZRc1EwRkJTQ3hIUVVFNFFpeHJRMEZCVHl4TFFVRlFMRU5CU0c1RExFVkJTVWdzUTBGQlF5eFJRVUZFTEVsQlFXRXNRMEZCUXl4UlFVRlJMRU5CUVVNc1MwRkJka0lzU1VGQmFVTXNVVUZCVVN4RFFVRkRMRTlCUVZRc1MwRkJjVUlzVFVGQmRFUXNTVUZCYVVVc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCTlVZc1IwRkRSenRCUVVGSExFbEJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4SlFVRkJMRk5CUVZNc1JVRkJReXh4UWtGQmRFSTdRVUZCTkVNc2EwSkJRVmNzVDBGQmRrUTdRVUZCSzBRc1NVRkJRU3hQUVVGUExFVkJRVVU3UVVGQmVFVXNZVUZFU0N4SFFVTnhSeXhGUVV4c1J5eEZRVTFJTEVOQlFVTXNVVUZCUkN4SlFVRmpMRkZCUVZFc1EwRkJReXhMUVVGVUxFdEJRVzFDTEUxQlFXcERMRWxCUVRSRExFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFYUkVMRWxCUVdsRkxGRkJRVkVzUTBGQlF5eGhRVUZVTEV0QlFUSkNMRWxCUVRWR0xFZEJRMGM3UVVGQlJ5eEpRVUZCTEVsQlFVa3NSVUZCUXl4SFFVRlNPMEZCUVZrc1NVRkJRU3hUUVVGVExFVkJRVU1zY1VKQlFYUkNPMEZCUVRSRExHdENRVUZYTEZOQlFYWkVPMEZCUTBjc1NVRkJRU3hQUVVGUExFVkJRVVU3UVVGRVdpeGxRVVJJTEVkQlJUWkRMRVZCVWpGRExFVkJVMGdzVVVGQlVTeEpRVUZKTEV0QlFVc3NRMEZCUXl4UFFVRk9MRU5CUVdNc1RVRkJaQ3hEUVVGYUxFbEJRWEZETEZGQlFWRXNRMEZCUXl4aFFVRlVMRXRCUVRKQ0xFbEJRV2hGTEVkQlEwYzdRVUZCUnl4SlFVRkJMRWxCUVVrc1JVRkJReXhIUVVGU08wRkJRVmtzU1VGQlFTeFRRVUZUTEVWQlFVTXNjVUpCUVhSQ08wRkJRVFJETEd0Q1FVRlhMR1ZCUVhaRU8wRkJRMGNzU1VGQlFTeFBRVUZQTEVWQlFVVTdRVUZFV2l4alFVUklMRWRCUlRoRExFVkJXRE5ETEVWQldVZ3NVVUZCVVN4SFFVRkhPMEZCUVUwc1NVRkJRU3hUUVVGVExFVkJRVU03UVVGQmFFSXNTVUZCU0N4SFFVRTRSQ3hGUVZwdVJTeEZRV0ZJTEZGQlFWRXNSMEZCUnp0QlFVRkpMRWxCUVVFc1MwRkJTeXhGUVVGRk8wRkJRVU1zVFVGQlFTeFhRVUZYTEVWQlFVVXNSVUZCWkR0QlFVRnJRaXhOUVVGQkxGVkJRVlVzUlVGQlJUdEJRVUU1UWp0QlFVRllMRXRCUVRaRUxGRkJRVGRFTEVOQlFVZ3NSMEZCYVVZc1JVRmlkRVlzUTBGQlVqdEJRV1ZJT3p0bFFVVmpMRkU3T3pzN096czdPenM3TzBGRGJrSm1PenRCUVVOQk96dEJRVU5CT3pzN096czdPenM3T3pzN096czdPenM3T3pzN08wRkJSVUVzU1VGQlRTeFpRVUZaTEVkQlFVYzdRVUZEYWtJc1JVRkJRU3hyUWtGQmEwSXNSVUZCUlN4TFFVUklPMEZCUldwQ0xFVkJRVUVzUjBGQlJ5eEZRVUZGTEVWQlJsazdRVUZIYWtJc1JVRkJRU3hSUVVGUkxFVkJRVVU3UVVGRFRpeEpRVUZCTEdGQlFXRXNSVUZCUlN4SlFVUlVPMEZCUlU0c1NVRkJRU3hMUVVGTExFVkJRVVVzUlVGR1JEdEJRVWRPTEVsQlFVRXNUMEZCVHl4RlFVRkZPMEZCU0VnN1FVRklUeXhEUVVGeVFqczdTVUZWVFN4Uk96czdPenRCUVVOR0xHOUNRVUZaTEV0QlFWb3NSVUZCYlVJN1FVRkJRVHM3UVVGQlFUczdRVUZEWml4clJrRkJUU3hMUVVGT08wRkJRMEVzVlVGQlN5eExRVUZNTEVkQlFXRXNXVUZCWWp0QlFVVkJMRlZCUVVzc1UwRkJUQ3hIUVVGcFFpeE5RVUZMTEZOQlFVd3NRMEZCWlN4SlFVRm1MSFZFUVVGcVFqdEJRVU5CTEZWQlFVc3NXVUZCVEN4SFFVRnZRaXhOUVVGTExGbEJRVXdzUTBGQmEwSXNTVUZCYkVJc2RVUkJRWEJDTzBGQlEwRXNWVUZCU3l4WlFVRk1MRWRCUVc5Q0xFMUJRVXNzV1VGQlRDeERRVUZyUWl4SlFVRnNRaXgxUkVGQmNFSTdRVUZEUVN4VlFVRkxMR05CUVV3c1IwRkJjMElzVFVGQlN5eGpRVUZNTEVOQlFXOUNMRWxCUVhCQ0xIVkVRVUYwUWp0QlFWQmxPMEZCVVd4Q096czdPM2REUVVWdFFqdEJRVU5vUWl4WFFVRkxMRmRCUVV3N1FVRkRTRHM3TzJ0RFFVVmhPMEZCUTFZc1ZVRkJTU3hQUVVGUExHRkJRV0VzUTBGQlF5eFBRVUZ5UWl4TFFVRnBReXhYUVVGeVF5eEZRVUZyUkR0QlFVTTVReXhaUVVGTkxFOUJRVThzUjBGQlJ5eGhRVUZoTEVOQlFVTXNUMEZCT1VJN1FVRkRRU3hoUVVGTExGRkJRVXdzUTBGQll6dEJRVU5XTEZWQlFVRXNSMEZCUnl4RlFVRkZMRTlCUVU4c1EwRkJReXhIUVVGU0xFZEJRV01zVDBGQlR5eERRVUZETEVkQlFYUkNMRWRCUVRSQ0xFVkJSSFpDTzBGQlJWWXNWVUZCUVN4UlFVRlJMRVZCUVVVc1QwRkJUeXhEUVVGRExGRkJRVklzUjBGQmJVSXNTVUZCU1N4RFFVRkRMRXRCUVV3c1EwRkJWeXhQUVVGUExFTkJRVU1zVVVGQmJrSXNRMEZCYmtJc1IwRkJhMFE3UVVGQlF5eFpRVUZCTEdGQlFXRXNSVUZCUlN4SlFVRm9RanRCUVVGelFpeFpRVUZCTEV0QlFVc3NSVUZCUlN4RlFVRTNRanRCUVVGcFF5eFpRVUZCTEU5QlFVOHNSVUZCUlR0QlFVRXhReXhYUVVac1JEdEJRVWRXTEZWQlFVRXNhMEpCUVd0Q0xFVkJRVVVzUTBGQlF5eERRVUZETEU5QlFVOHNRMEZCUXp0QlFVaHdRaXhUUVVGa08wRkJTMGc3UVVGRFNqczdPemhDUVVWVExFc3NSVUZCVHp0QlFVTmlMRmRCUVVzc1VVRkJUQ3hEUVVGak8wRkJRVU1zVVVGQlFTeEhRVUZITEVWQlFVVXNTMEZCU3l4RFFVRkRMRTFCUVU0c1EwRkJZVHRCUVVGdVFpeFBRVUZrTzBGQlEwZzdPenRwUTBGRldTeExMRVZCUVU4N1FVRkRhRUlzVFVGQlFTeExRVUZMTEVOQlFVTXNZMEZCVGp0QlFVTkJMRmRCUVVzc1VVRkJUQ3hEUVVGak8wRkJRVU1zVVVGQlFTeHJRa0ZCYTBJc1JVRkJSVHRCUVVGeVFpeFBRVUZrTzBGQlEwZzdPenRwUTBGRldTeExMRVZCUVU4N1FVRkRhRUlzVFVGQlFTeExRVUZMTEVOQlFVTXNZMEZCVGp0QlFVTkJMRmRCUVVzc1VVRkJUQ3hEUVVGakxGbEJRV1E3UVVGRFNEczdPMjFEUVVWakxFc3NSVUZCVHp0QlFVTnNRaXhWUVVGTkxFMUJRVTBzUjBGQlJ5eE5RVUZOTEVOQlFVTXNUVUZCVUN4RFFVRmpMRXRCUVVzc1MwRkJUQ3hEUVVGWExGRkJRWHBDTEVWQlFXMURMRXRCUVc1RExFTkJRV1k3UVVGRFFTeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc1VVRkJVU3hGUVVGRk8wRkJRVmdzVDBGQlpEdEJRVU5JT3pzN05rSkJSVkU3UVVGQlFTeDNRa0ZETmtJc1MwRkJTeXhMUVVSc1F6dEJRVUZCTEZWQlEwVXNhMEpCUkVZc1pVRkRSU3hyUWtGRVJqdEJRVUZCTEZWQlEzTkNMRWRCUkhSQ0xHVkJRM05DTEVkQlJIUkNPMEZCUVVFc2FVTkJSVzFETEV0QlFVc3NTMEZCVEN4RFFVRlhMRkZCUmpsRE8wRkJRVUVzVlVGRlJTeGhRVVpHTEhkQ1FVVkZMR0ZCUmtZN1FVRkJRU3hWUVVWcFFpeExRVVpxUWl4M1FrRkZhVUlzUzBGR2FrSTdRVUZCUVN4VlFVVjNRaXhQUVVaNFFpeDNRa0ZGZDBJc1QwRkdlRUk3TzBGQlNVd3NWVUZCU1N4SFFVRkhMRWxCUVVrc1lVRkJZU3hMUVVGTExFbEJRWHBDTEVsQlFXbERMRXRCUVdwRExFbEJRVEJETEU5QlFUbERMRVZCUVhWRU8wRkJRMjVFTEdWQlEwa3NhVU5CUTBrc2IwSkJRVU1zWjBKQlFVUXNSVUZCWVN4TFFVRkxMRXRCUVd4Q0xFTkJSRW9zUlVGRlNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CUmtvc1JVRkhTVHRCUVVGSExGVkJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4VlFVRkJMRTlCUVU4c1JVRkJSU3hMUVVGTExGbEJRVEZDTzBGQlFYZERMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV3hFTERSQ1FVaEtMRU5CUkVvN1FVRlBTQ3hQUVZKRUxFMUJVVThzU1VGQlNTeHJRa0ZCU2l4RlFVRjNRanRCUVVNelFpeGxRVU5KTEdsRFFVTkpMRzlDUVVGRExIVkNRVUZFTzBGQlFXZENMRlZCUVVFc1IwRkJSeXhGUVVGRkxFZEJRWEpDTzBGQlFUQkNMRlZCUVVFc1VVRkJVU3hGUVVGRkxFdEJRVXNzUzBGQlRDeERRVUZYTEZGQlFTOURPMEZCUVhsRUxGVkJRVUVzWTBGQll5eEZRVUZGTEV0QlFVczdRVUZCT1VVc1ZVRkVTaXhGUVVWSkxHOUNRVUZETEc5Q1FVRkVMRVZCUVdsQ0xFdEJRVXNzUzBGQmRFSXNRMEZHU2l4RlFVZEpPMEZCUVVjc1ZVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEZWQlFVRXNUMEZCVHl4RlFVRkZMRXRCUVVzc1dVRkJNVUk3UVVGQmQwTXNWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJiRVFzTkVKQlNFb3NRMEZFU2p0QlFVOUlMRTlCVWswc1RVRlJRVHRCUVVOSUxHVkJRMGs3UVVGQlN5eFZRVUZCTEZOQlFWTXNSVUZCUXp0QlFVRm1MRmRCUTBrN1FVRkJUU3hWUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTzBGQlFYSkNMRmRCUTBrc0swSkJRMGtzYlVOQlEwa3NhMFJCUkVvc1EwRkVTaXhGUVVsSkxDdENRVXBLTEVWQlMwa3NOa1JCVEVvc1EwRkVTaXhGUVZGSk8wRkJRVThzVlVGQlFTeEpRVUZKTEVWQlFVTXNUVUZCV2p0QlFVRnRRaXhWUVVGQkxFdEJRVXNzUlVGQlJUdEJRVUZETEZsQlFVRXNTMEZCU3l4RlFVRkZPMEZCUVZJc1YwRkJNVUk3UVVGQk1rTXNWVUZCUVN4TFFVRkxMRVZCUVVVc1IwRkJiRVE3UVVGQmRVUXNWVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkJTenRCUVVGMFJTeFZRVkpLTEVWQlUwa3NLMEpCUVVjN1FVRkJUeXhWUVVGQkxFbEJRVWtzUlVGQlF5eFJRVUZhTzBGQlFYRkNMRlZCUVVFc1UwRkJVeXhGUVVGRExIVkNRVUV2UWp0QlFVRjFSQ3hWUVVGQkxFdEJRVXNzUlVGQlF6dEJRVUUzUkN4VlFVRklMRU5CVkVvc1EwRkVTaXhGUVZsSkxHOUNRVUZETEc5Q1FVRkVMRVZCUVdsQ0xFdEJRVXNzUzBGQmRFSXNRMEZhU2l4RFFVUktPMEZCWjBKSU8wRkJRMG83T3pzN1JVRnVSbXRDTEV0QlFVc3NRMEZCUXl4VE96dGxRWE5HWkN4Uk96czdPenM3T3pzN096dEJRM0JIWml4VFFVRlRMRTlCUVZRc1EwRkJhVUlzUzBGQmFrSXNSVUZCZDBJN1FVRkRjRUlzVTBGRFNTeG5RMEZEU1R0QlFVRkpMRWxCUVVFc1MwRkJTeXhGUVVGRk8wRkJRVU1zVFVGQlFTeFRRVUZUTEVWQlFVVTdRVUZCV2p0QlFVRllMSE5DUVVGdFJDeExRVUZMTEVOQlFVTXNSMEZCZWtRc1EwRkVTaXhGUVVWSkxESkRRVUZaTEV0QlFVc3NRMEZCUXl4UlFVRk9MRU5CUVdVc1MwRkJNMElzUTBGR1NpeEZRVWRKTERaRFFVRmpMRXRCUVVzc1EwRkJReXhSUVVGT0xFTkJRV1VzVDBGQk4wSXNRMEZJU2l4RFFVUktPMEZCVDBnN08yVkJSV01zVHpzN096czdPMEZEVm1ZN096czdRVUZGUVN4SlFVRk5MRzlDUVVGdlFpeEhRVUZITEhkQ1FVRTNRanRCUVVOQkxFbEJRVTBzVlVGQlZTeEhRVUZITEZGQlFWRXNRMEZCUXl4alFVRlVMRU5CUVhkQ0xHOUNRVUY0UWl4RFFVRnVRanRCUVVWQkxGRkJRVkVzUTBGQlF5eE5RVUZVTEVOQlEwa3NiMEpCUVVNc2FVSkJRVVFzVDBGRVNpeEZRVVZKTEZWQlJrbzdPenM3T3pzN096czdRVU5NUVN4VFFVRlRMRlZCUVZRc1EwRkJiMElzUjBGQmNFSXNSVUZCZVVJN1FVRkRja0lzVTBGQlR5eExRVUZMTEVOQlFVTXNSMEZCUkN4RFFVRk1MRU5CUTBZc1NVRkVSU3hEUVVOSExGVkJRVUVzUjBGQlJ6dEJRVUZCTEZkQlFVa3NSMEZCUnl4RFFVRkRMRWxCUVVvc1JVRkJTanRCUVVGQkxFZEJSRTRzUlVGRlJpeEpRVVpGTEVOQlIwTXNWVUZCUXl4TlFVRkVPMEZCUVVFc1YwRkJZVHRCUVVGRExFMUJRVUVzVFVGQlRTeEZRVUZPTzBGQlFVUXNTMEZCWWp0QlFVRkJMRWRCU0VRc1JVRkpReXhWUVVGRExFdEJRVVE3UVVGQlFTeFhRVUZaTzBGQlFVTXNUVUZCUVN4TFFVRkxMRVZCUVV3N1FVRkJSQ3hMUVVGYU8wRkJRVUVzUjBGS1JDeERRVUZRTzBGQlRVZzdPMlZCUldNc1ZTSXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpS0daMWJtTjBhVzl1S0NsN1puVnVZM1JwYjI0Z2NpaGxMRzRzZENsN1puVnVZM1JwYjI0Z2J5aHBMR1lwZTJsbUtDRnVXMmxkS1h0cFppZ2haVnRwWFNsN2RtRnlJR005WENKbWRXNWpkR2x2Ymx3aVBUMTBlWEJsYjJZZ2NtVnhkV2x5WlNZbWNtVnhkV2x5WlR0cFppZ2haaVltWXlseVpYUjFjbTRnWXlocExDRXdLVHRwWmloMUtYSmxkSFZ5YmlCMUtHa3NJVEFwTzNaaGNpQmhQVzVsZHlCRmNuSnZjaWhjSWtOaGJtNXZkQ0JtYVc1a0lHMXZaSFZzWlNBblhDSXJhU3RjSWlkY0lpazdkR2h5YjNjZ1lTNWpiMlJsUFZ3aVRVOUVWVXhGWDA1UFZGOUdUMVZPUkZ3aUxHRjlkbUZ5SUhBOWJsdHBYVDE3Wlhod2IzSjBjenA3ZlgwN1pWdHBYVnN3WFM1allXeHNLSEF1Wlhod2IzSjBjeXhtZFc1amRHbHZiaWh5S1h0MllYSWdiajFsVzJsZFd6RmRXM0pkTzNKbGRIVnliaUJ2S0c1OGZISXBmU3h3TEhBdVpYaHdiM0owY3l4eUxHVXNiaXgwS1gxeVpYUjFjbTRnYmx0cFhTNWxlSEJ2Y25SemZXWnZjaWgyWVhJZ2RUMWNJbVoxYm1OMGFXOXVYQ0k5UFhSNWNHVnZaaUJ5WlhGMWFYSmxKaVp5WlhGMWFYSmxMR2s5TUR0cFBIUXViR1Z1WjNSb08ya3JLeWx2S0hSYmFWMHBPM0psZEhWeWJpQnZmWEpsZEhWeWJpQnlmU2tvS1NJc0lpaG1kVzVqZEdsdmJpQW9jbTl2ZEN3Z1ptRmpkRzl5ZVNsN1hHNGdJQ2QxYzJVZ2MzUnlhV04wSnp0Y2JseHVJQ0F2S21semRHRnVZblZzSUdsbmJtOXlaU0J1WlhoME9tTmhiblFnZEdWemRDb3ZYRzRnSUdsbUlDaDBlWEJsYjJZZ2JXOWtkV3hsSUQwOVBTQW5iMkpxWldOMEp5QW1KaUIwZVhCbGIyWWdiVzlrZFd4bExtVjRjRzl5ZEhNZ1BUMDlJQ2R2WW1wbFkzUW5LU0I3WEc0Z0lDQWdiVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQm1ZV04wYjNKNUtDazdYRzRnSUgwZ1pXeHpaU0JwWmlBb2RIbHdaVzltSUdSbFptbHVaU0E5UFQwZ0oyWjFibU4wYVc5dUp5QW1KaUJrWldacGJtVXVZVzFrS1NCN1hHNGdJQ0FnTHk4Z1FVMUVMaUJTWldkcGMzUmxjaUJoY3lCaGJpQmhibTl1ZVcxdmRYTWdiVzlrZFd4bExseHVJQ0FnSUdSbFptbHVaU2hiWFN3Z1ptRmpkRzl5ZVNrN1hHNGdJSDBnWld4elpTQjdYRzRnSUNBZ0x5OGdRbkp2ZDNObGNpQm5iRzlpWVd4elhHNGdJQ0FnY205dmRDNXZZbXBsWTNSUVlYUm9JRDBnWm1GamRHOXllU2dwTzF4dUlDQjlYRzU5S1NoMGFHbHpMQ0JtZFc1amRHbHZiaWdwZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JpQWdkbUZ5SUhSdlUzUnlJRDBnVDJKcVpXTjBMbkJ5YjNSdmRIbHdaUzUwYjFOMGNtbHVaenRjYmlBZ1puVnVZM1JwYjI0Z2FHRnpUM2R1VUhKdmNHVnlkSGtvYjJKcUxDQndjbTl3S1NCN1hHNGdJQ0FnYVdZb2IySnFJRDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlZ4dUlDQWdJSDFjYmlBZ0lDQXZMM1J2SUdoaGJtUnNaU0J2WW1wbFkzUnpJSGRwZEdnZ2JuVnNiQ0J3Y205MGIzUjVjR1Z6SUNoMGIyOGdaV1JuWlNCallYTmxQeWxjYmlBZ0lDQnlaWFIxY200Z1QySnFaV04wTG5CeWIzUnZkSGx3WlM1b1lYTlBkMjVRY205d1pYSjBlUzVqWVd4c0tHOWlhaXdnY0hKdmNDbGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR2x6Ulcxd2RIa29kbUZzZFdVcGUxeHVJQ0FnSUdsbUlDZ2hkbUZzZFdVcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lIMWNiaUFnSUNCcFppQW9hWE5CY25KaGVTaDJZV3gxWlNrZ0ppWWdkbUZzZFdVdWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgwZ1pXeHpaU0JwWmlBb2RIbHdaVzltSUhaaGJIVmxJQ0U5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQm1iM0lnS0haaGNpQnBJR2x1SUhaaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYUdGelQzZHVVSEp2Y0dWeWRIa29kbUZzZFdVc0lHa3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUIwYjFOMGNtbHVaeWgwZVhCbEtYdGNiaUFnSUNCeVpYUjFjbTRnZEc5VGRISXVZMkZzYkNoMGVYQmxLVHRjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdselQySnFaV04wS0c5aWFpbDdYRzRnSUNBZ2NtVjBkWEp1SUhSNWNHVnZaaUJ2WW1vZ1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUhSdlUzUnlhVzVuS0c5aWFpa2dQVDA5SUZ3aVcyOWlhbVZqZENCUFltcGxZM1JkWENJN1hHNGdJSDFjYmx4dUlDQjJZWElnYVhOQmNuSmhlU0E5SUVGeWNtRjVMbWx6UVhKeVlYa2dmSHdnWm5WdVkzUnBiMjRvYjJKcUtYdGNiaUFnSUNBdkttbHpkR0Z1WW5Wc0lHbG5ibTl5WlNCdVpYaDBPbU5oYm5RZ2RHVnpkQ292WEc0Z0lDQWdjbVYwZFhKdUlIUnZVM1J5TG1OaGJHd29iMkpxS1NBOVBUMGdKMXR2WW1wbFkzUWdRWEp5WVhsZEp6dGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR2x6UW05dmJHVmhiaWh2WW1vcGUxeHVJQ0FnSUhKbGRIVnliaUIwZVhCbGIyWWdiMkpxSUQwOVBTQW5ZbTl2YkdWaGJpY2dmSHdnZEc5VGRISnBibWNvYjJKcUtTQTlQVDBnSjF0dlltcGxZM1FnUW05dmJHVmhibDBuTzF4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1oyVjBTMlY1S0d0bGVTbDdYRzRnSUNBZ2RtRnlJR2x1ZEV0bGVTQTlJSEJoY25ObFNXNTBLR3RsZVNrN1hHNGdJQ0FnYVdZZ0tHbHVkRXRsZVM1MGIxTjBjbWx1WnlncElEMDlQU0JyWlhrcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCcGJuUkxaWGs3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCclpYazdYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJtWVdOMGIzSjVLRzl3ZEdsdmJuTXBJSHRjYmlBZ0lDQnZjSFJwYjI1eklEMGdiM0IwYVc5dWN5QjhmQ0I3ZlZ4dVhHNGdJQ0FnZG1GeUlHOWlhbVZqZEZCaGRHZ2dQU0JtZFc1amRHbHZiaWh2WW1vcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCUFltcGxZM1F1YTJWNWN5aHZZbXBsWTNSUVlYUm9LUzV5WldSMVkyVW9ablZ1WTNScGIyNG9jSEp2ZUhrc0lIQnliM0FwSUh0Y2JpQWdJQ0FnSUNBZ2FXWW9jSEp2Y0NBOVBUMGdKMk55WldGMFpTY3BJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnY0hKdmVIazdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBdkttbHpkR0Z1WW5Wc0lHbG5ibTl5WlNCbGJITmxLaTljYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCdlltcGxZM1JRWVhSb1czQnliM0JkSUQwOVBTQW5ablZ1WTNScGIyNG5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NISnZlSGxiY0hKdmNGMGdQU0J2WW1wbFkzUlFZWFJvVzNCeWIzQmRMbUpwYm1Rb2IySnFaV04wVUdGMGFDd2diMkpxS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQndjbTk0ZVR0Y2JpQWdJQ0FnSUgwc0lIdDlLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdablZ1WTNScGIyNGdhR0Z6VTJoaGJHeHZkMUJ5YjNCbGNuUjVLRzlpYWl3Z2NISnZjQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJQ2h2Y0hScGIyNXpMbWx1WTJ4MVpHVkpibWhsY21sMFpXUlFjbTl3Y3lCOGZDQW9kSGx3Wlc5bUlIQnliM0FnUFQwOUlDZHVkVzFpWlhJbklDWW1JRUZ5Y21GNUxtbHpRWEp5WVhrb2IySnFLU2tnZkh3Z2FHRnpUM2R1VUhKdmNHVnlkSGtvYjJKcUxDQndjbTl3S1NsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0JtZFc1amRHbHZiaUJuWlhSVGFHRnNiRzkzVUhKdmNHVnlkSGtvYjJKcUxDQndjbTl3S1NCN1hHNGdJQ0FnSUNCcFppQW9hR0Z6VTJoaGJHeHZkMUJ5YjNCbGNuUjVLRzlpYWl3Z2NISnZjQ2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFsdHdjbTl3WFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6WlhRb2IySnFMQ0J3WVhSb0xDQjJZV3gxWlN3Z1pHOU9iM1JTWlhCc1lXTmxLWHRjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NHRjBhQ0E5SUZ0d1lYUm9YVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNnaGNHRjBhQ0I4ZkNCd1lYUm9MbXhsYm1kMGFDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWMEtHOWlhaXdnY0dGMGFDNXpjR3hwZENnbkxpY3BMbTFoY0NoblpYUkxaWGtwTENCMllXeDFaU3dnWkc5T2IzUlNaWEJzWVdObEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lIWmhjaUJqZFhKeVpXNTBVR0YwYUNBOUlIQmhkR2hiTUYwN1hHNGdJQ0FnSUNCMllYSWdZM1Z5Y21WdWRGWmhiSFZsSUQwZ1oyVjBVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnWTNWeWNtVnVkRkJoZEdncE8xeHVJQ0FnSUNBZ2FXWWdLSEJoZEdndWJHVnVaM1JvSUQwOVBTQXhLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaGpkWEp5Wlc1MFZtRnNkV1VnUFQwOUlIWnZhV1FnTUNCOGZDQWhaRzlPYjNSU1pYQnNZV05sS1NCN1hHNGdJQ0FnSUNBZ0lDQWdiMkpxVzJOMWNuSmxiblJRWVhSb1hTQTlJSFpoYkhWbE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmpkWEp5Wlc1MFZtRnNkV1U3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaGpkWEp5Wlc1MFZtRnNkV1VnUFQwOUlIWnZhV1FnTUNrZ2UxeHVJQ0FnSUNBZ0lDQXZMMk5vWldOcklHbG1JSGRsSUdGemMzVnRaU0JoYmlCaGNuSmhlVnh1SUNBZ0lDQWdJQ0JwWmloMGVYQmxiMllnY0dGMGFGc3hYU0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdJQ0J2WW1wYlkzVnljbVZ1ZEZCaGRHaGRJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdiMkpxVzJOMWNuSmxiblJRWVhSb1hTQTlJSHQ5TzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCelpYUW9iMkpxVzJOMWNuSmxiblJRWVhSb1hTd2djR0YwYUM1emJHbGpaU2d4S1N3Z2RtRnNkV1VzSUdSdlRtOTBVbVZ3YkdGalpTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNW9ZWE1nUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb0tTQjdYRzRnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JSEJoZEdnZ1BUMDlJQ2R1ZFcxaVpYSW5LU0I3WEc0Z0lDQWdJQ0FnSUhCaGRHZ2dQU0JiY0dGMGFGMDdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0J3WVhSb0lEMGdjR0YwYUM1emNHeHBkQ2duTGljcE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaUFvSVhCaGRHZ2dmSHdnY0dGMGFDNXNaVzVuZEdnZ1BUMDlJREFwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUNFaGIySnFPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUhCaGRHZ3ViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR29nUFNCblpYUkxaWGtvY0dGMGFGdHBYU2s3WEc1Y2JpQWdJQ0FnSUNBZ2FXWW9LSFI1Y0dWdlppQnFJRDA5UFNBbmJuVnRZbVZ5SnlBbUppQnBjMEZ5Y21GNUtHOWlhaWtnSmlZZ2FpQThJRzlpYWk1c1pXNW5kR2dwSUh4OFhHNGdJQ0FnSUNBZ0lDQWdLRzl3ZEdsdmJuTXVhVzVqYkhWa1pVbHVhR1Z5YVhSbFpGQnliM0J6SUQ4Z0tHb2dhVzRnVDJKcVpXTjBLRzlpYWlrcElEb2dhR0Z6VDNkdVVISnZjR1Z5ZEhrb2IySnFMQ0JxS1NrcElIdGNiaUFnSUNBZ0lDQWdJQ0J2WW1vZ1BTQnZZbXBiYWwwN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQnZZbXBsWTNSUVlYUm9MbVZ1YzNWeVpVVjRhWE4wY3lBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ3NJSFpoYkhWbEtYdGNiaUFnSUNBZ0lISmxkSFZ5YmlCelpYUW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTd2dkSEoxWlNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndWMyVjBJRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUN3Z2RtRnNkV1VzSUdSdlRtOTBVbVZ3YkdGalpTbDdYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJR1J2VG05MFVtVndiR0ZqWlNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndWFXNXpaWEowSUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHRjBLWHRjYmlBZ0lDQWdJSFpoY2lCaGNuSWdQU0J2WW1wbFkzUlFZWFJvTG1kbGRDaHZZbW9zSUhCaGRHZ3BPMXh1SUNBZ0lDQWdZWFFnUFNCK2ZtRjBPMXh1SUNBZ0lDQWdhV1lnS0NGcGMwRnljbUY1S0dGeWNpa3BJSHRjYmlBZ0lDQWdJQ0FnWVhKeUlEMGdXMTA3WEc0Z0lDQWdJQ0FnSUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnWVhKeUtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHRnljaTV6Y0d4cFkyVW9ZWFFzSURBc0lIWmhiSFZsS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1bGJYQjBlU0E5SUdaMWJtTjBhVzl1S0c5aWFpd2djR0YwYUNrZ2UxeHVJQ0FnSUNBZ2FXWWdLR2x6Ulcxd2RIa29jR0YwYUNrcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIWnZhV1FnTUR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDaHZZbW9nUFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZG05cFpDQXdPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ2RtRnNkV1VzSUdrN1hHNGdJQ0FnSUNCcFppQW9JU2gyWVd4MVpTQTlJRzlpYW1WamRGQmhkR2d1WjJWMEtHOWlhaXdnY0dGMGFDa3BLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIyYjJsa0lEQTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnZG1Gc2RXVWdQVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltcGxZM1JRWVhSb0xuTmxkQ2h2WW1vc0lIQmhkR2dzSUNjbktUdGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9hWE5DYjI5c1pXRnVLSFpoYkhWbEtTa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxWldOMFVHRjBhQzV6WlhRb2IySnFMQ0J3WVhSb0xDQm1ZV3h6WlNrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCMllXeDFaU0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z01DazdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2x6UVhKeVlYa29kbUZzZFdVcEtTQjdYRzRnSUNBZ0lDQWdJSFpoYkhWbExteGxibWQwYUNBOUlEQTdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2x6VDJKcVpXTjBLSFpoYkhWbEtTa2dlMXh1SUNBZ0lDQWdJQ0JtYjNJZ0tHa2dhVzRnZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9hR0Z6VTJoaGJHeHZkMUJ5YjNCbGNuUjVLSFpoYkhWbExDQnBLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaR1ZzWlhSbElIWmhiSFZsVzJsZE8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2diblZzYkNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndWNIVnphQ0E5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnZ0x5b3NJSFpoYkhWbGN5QXFMeWw3WEc0Z0lDQWdJQ0IyWVhJZ1lYSnlJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9LVHRjYmlBZ0lDQWdJR2xtSUNnaGFYTkJjbkpoZVNoaGNuSXBLU0I3WEc0Z0lDQWdJQ0FnSUdGeWNpQTlJRnRkTzF4dUlDQWdJQ0FnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ2h2WW1vc0lIQmhkR2dzSUdGeWNpazdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR0Z5Y2k1d2RYTm9MbUZ3Y0d4NUtHRnljaXdnUVhKeVlYa3VjSEp2ZEc5MGVYQmxMbk5zYVdObExtTmhiR3dvWVhKbmRXMWxiblJ6TENBeUtTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VZMjloYkdWelkyVWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvY3l3Z1pHVm1ZWFZzZEZaaGJIVmxLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RtRnNkV1U3WEc1Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdMQ0JzWlc0Z1BTQndZWFJvY3k1c1pXNW5kR2c3SUdrZ1BDQnNaVzQ3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb0tIWmhiSFZsSUQwZ2IySnFaV04wVUdGMGFDNW5aWFFvYjJKcUxDQndZWFJvYzF0cFhTa3BJQ0U5UFNCMmIybGtJREFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2RtRnNkV1U3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptRjFiSFJXWVd4MVpUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNW5aWFFnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb0xDQmtaV1poZFd4MFZtRnNkV1VwZTF4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmJuVnRZbVZ5SnlrZ2UxeHVJQ0FnSUNBZ0lDQndZWFJvSUQwZ1czQmhkR2hkTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tDRndZWFJvSUh4OElIQmhkR2d1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmlBb2IySnFJRDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1JsWm1GMWJIUldZV3gxWlR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZ3VaMlYwS0c5aWFpd2djR0YwYUM1emNHeHBkQ2duTGljcExDQmtaV1poZFd4MFZtRnNkV1VwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCMllYSWdZM1Z5Y21WdWRGQmhkR2dnUFNCblpYUkxaWGtvY0dGMGFGc3dYU2s3WEc0Z0lDQWdJQ0IyWVhJZ2JtVjRkRTlpYWlBOUlHZGxkRk5vWVd4c2IzZFFjbTl3WlhKMGVTaHZZbW9zSUdOMWNuSmxiblJRWVhSb0tWeHVJQ0FnSUNBZ2FXWWdLRzVsZUhSUFltb2dQVDA5SUhadmFXUWdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWkdWbVlYVnNkRlpoYkhWbE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaUFvY0dGMGFDNXNaVzVuZEdnZ1BUMDlJREVwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc1bGVIUlBZbW83WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG1kbGRDaHZZbXBiWTNWeWNtVnVkRkJoZEdoZExDQndZWFJvTG5Oc2FXTmxLREVwTENCa1pXWmhkV3gwVm1Gc2RXVXBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQnZZbXBsWTNSUVlYUm9MbVJsYkNBOUlHWjFibU4wYVc5dUlHUmxiQ2h2WW1vc0lIQmhkR2dwSUh0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdjR0YwYUNBOUlGdHdZWFJvWFR0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLRzlpYWlBOVBTQnVkV3hzS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNocGMwVnRjSFI1S0hCaGRHZ3BLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1vN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZ3VaR1ZzS0c5aWFpd2djR0YwYUM1emNHeHBkQ2duTGljcEtUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJRWVhSb0lEMGdaMlYwUzJWNUtIQmhkR2hiTUYwcE8xeHVJQ0FnSUNBZ2FXWWdLQ0ZvWVhOVGFHRnNiRzkzVUhKdmNHVnlkSGtvYjJKcUxDQmpkWEp5Wlc1MFVHRjBhQ2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lvY0dGMGFDNXNaVzVuZEdnZ1BUMDlJREVwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2x6UVhKeVlYa29iMkpxS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWk1emNHeHBZMlVvWTNWeWNtVnVkRkJoZEdnc0lERXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUdSbGJHVjBaU0J2WW1wYlkzVnljbVZ1ZEZCaGRHaGRPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxWldOMFVHRjBhQzVrWld3b2IySnFXMk4xY25KbGJuUlFZWFJvWFN3Z2NHRjBhQzV6YkdsalpTZ3hLU2s3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ2WW1vN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2c3WEc0Z0lIMWNibHh1SUNCMllYSWdiVzlrSUQwZ1ptRmpkRzl5ZVNncE8xeHVJQ0J0YjJRdVkzSmxZWFJsSUQwZ1ptRmpkRzl5ZVR0Y2JpQWdiVzlrTG5kcGRHaEpibWhsY21sMFpXUlFjbTl3Y3lBOUlHWmhZM1J2Y25rb2UybHVZMngxWkdWSmJtaGxjbWwwWldSUWNtOXdjem9nZEhKMVpYMHBYRzRnSUhKbGRIVnliaUJ0YjJRN1hHNTlLVHRjYmlJc0lpZDFjMlVnYzNSeWFXTjBKMXh1WEc1amIyNXpkQ0I3YVhOUFltcGxZM1FzSUdkbGRFdGxlWE45SUQwZ2NtVnhkV2x5WlNnbkxpOXNZVzVuSnlsY2JseHVMeThnVUZKSlZrRlVSU0JRVWs5UVJWSlVTVVZUWEc1amIyNXpkQ0JDV1ZCQlUxTmZUVTlFUlNBOUlDZGZYMko1Y0dGemMwMXZaR1VuWEc1amIyNXpkQ0JKUjA1UFVrVmZRMGxTUTFWTVFWSWdQU0FuWDE5cFoyNXZjbVZEYVhKamRXeGhjaWRjYm1OdmJuTjBJRTFCV0Y5RVJVVlFJRDBnSjE5ZmJXRjRSR1ZsY0NkY2JtTnZibk4wSUVOQlEwaEZJRDBnSjE5ZlkyRmphR1VuWEc1amIyNXpkQ0JSVlVWVlJTQTlJQ2RmWDNGMVpYVmxKMXh1WTI5dWMzUWdVMVJCVkVVZ1BTQW5YMTl6ZEdGMFpTZGNibHh1WTI5dWMzUWdSVTFRVkZsZlUxUkJWRVVnUFNCN2ZWeHVYRzVqYkdGemN5QlNaV04xY25OcGRtVkpkR1Z5WVhSdmNpQjdYRzRnSUM4cUtseHVJQ0FnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSHhCY25KaGVYMGdjbTl2ZEZ4dUlDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNuMGdXMko1Y0dGemMwMXZaR1U5TUYxY2JpQWdJQ29nUUhCaGNtRnRJSHRDYjI5c1pXRnVmU0JiYVdkdWIzSmxRMmx5WTNWc1lYSTlabUZzYzJWZFhHNGdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0JiYldGNFJHVmxjRDB4TURCZFhHNGdJQ0FxTDF4dUlDQmpiMjV6ZEhKMVkzUnZjaUFvY205dmRDd2dZbmx3WVhOelRXOWtaU0E5SURBc0lHbG5ibTl5WlVOcGNtTjFiR0Z5SUQwZ1ptRnNjMlVzSUcxaGVFUmxaWEFnUFNBeE1EQXBJSHRjYmlBZ0lDQjBhR2x6VzBKWlVFRlRVMTlOVDBSRlhTQTlJR0o1Y0dGemMwMXZaR1ZjYmlBZ0lDQjBhR2x6VzBsSFRrOVNSVjlEU1ZKRFZVeEJVbDBnUFNCcFoyNXZjbVZEYVhKamRXeGhjbHh1SUNBZ0lIUm9hWE5iVFVGWVgwUkZSVkJkSUQwZ2JXRjRSR1ZsY0Z4dUlDQWdJSFJvYVhOYlEwRkRTRVZkSUQwZ1cxMWNiaUFnSUNCMGFHbHpXMUZWUlZWRlhTQTlJRnRkWEc0Z0lDQWdkR2hwYzF0VFZFRlVSVjBnUFNCMGFHbHpMbWRsZEZOMFlYUmxLSFZ1WkdWbWFXNWxaQ3dnY205dmRDbGNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMDlpYW1WamRIMWNiaUFnSUNvdlhHNGdJRzVsZUhRZ0tDa2dlMXh1SUNBZ0lHTnZibk4wSUh0dWIyUmxMQ0J3WVhSb0xDQmtaV1Z3ZlNBOUlIUm9hWE5iVTFSQlZFVmRJSHg4SUVWTlVGUlpYMU5VUVZSRlhHNWNiaUFnSUNCcFppQW9kR2hwYzF0TlFWaGZSRVZGVUYwZ1BpQmtaV1Z3S1NCN1hHNGdJQ0FnSUNCcFppQW9kR2hwY3k1cGMwNXZaR1VvYm05a1pTa3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUm9hWE11YVhORGFYSmpkV3hoY2lodWIyUmxLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2gwYUdselcwbEhUazlTUlY5RFNWSkRWVXhCVWwwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklITnJhWEJjYmlBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZERhWEpqZFd4aGNpQnlaV1psY21WdVkyVW5LVnh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvZEdocGN5NXZibE4wWlhCSmJuUnZLSFJvYVhOYlUxUkJWRVZkS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWMzUWdaR1Z6WTNKcGNIUnZjbk1nUFNCMGFHbHpMbWRsZEZOMFlYUmxjMDltUTJocGJHUk9iMlJsY3lodWIyUmxMQ0J3WVhSb0xDQmtaV1Z3S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1YzNRZ2JXVjBhRzlrSUQwZ2RHaHBjMXRDV1ZCQlUxTmZUVTlFUlYwZ1B5QW5jSFZ6YUNjZ09pQW5kVzV6YUdsbWRDZGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTmJVVlZGVlVWZFcyMWxkR2h2WkYwb0xpNHVaR1Z6WTNKcGNIUnZjbk1wWEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6VzBOQlEwaEZYUzV3ZFhOb0tHNXZaR1VwWEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ1kyOXVjM1FnZG1Gc2RXVWdQU0IwYUdselcxRlZSVlZGWFM1emFHbG1kQ2dwWEc0Z0lDQWdZMjl1YzNRZ1pHOXVaU0E5SUNGMllXeDFaVnh1WEc0Z0lDQWdkR2hwYzF0VFZFRlVSVjBnUFNCMllXeDFaVnh1WEc0Z0lDQWdhV1lnS0dSdmJtVXBJSFJvYVhNdVpHVnpkSEp2ZVNncFhHNWNiaUFnSUNCeVpYUjFjbTRnZTNaaGJIVmxMQ0JrYjI1bGZWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tseHVJQ0FnS2k5Y2JpQWdaR1Z6ZEhKdmVTQW9LU0I3WEc0Z0lDQWdkR2hwYzF0UlZVVlZSVjB1YkdWdVozUm9JRDBnTUZ4dUlDQWdJSFJvYVhOYlEwRkRTRVZkTG14bGJtZDBhQ0E5SURCY2JpQWdJQ0IwYUdselcxTlVRVlJGWFNBOUlHNTFiR3hjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FxTDF4dUlDQnBjMDV2WkdVZ0tHRnVlU2tnZTF4dUlDQWdJSEpsZEhWeWJpQnBjMDlpYW1WamRDaGhibmtwWEc0Z0lIMWNiaUFnTHlvcVhHNGdJQ0FxSUVCd1lYSmhiU0I3S24wZ1lXNTVYRzRnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnS2k5Y2JpQWdhWE5NWldGbUlDaGhibmtwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdJWFJvYVhNdWFYTk9iMlJsS0dGdWVTbGNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQXFMMXh1SUNCcGMwTnBjbU4xYkdGeUlDaGhibmtwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwYzF0RFFVTklSVjB1YVc1a1pYaFBaaWhoYm5rcElDRTlQU0F0TVZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCU1pYUjFjbTV6SUhOMFlYUmxjeUJ2WmlCamFHbHNaQ0J1YjJSbGMxeHVJQ0FnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSDBnYm05a1pWeHVJQ0FnS2lCQWNHRnlZVzBnZTBGeWNtRjVmU0J3WVhSb1hHNGdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0JrWldWd1hHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0QmNuSmhlVHhQWW1wbFkzUStmVnh1SUNBZ0tpOWNiaUFnWjJWMFUzUmhkR1Z6VDJaRGFHbHNaRTV2WkdWeklDaHViMlJsTENCd1lYUm9MQ0JrWldWd0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUdkbGRFdGxlWE1vYm05a1pTa3ViV0Z3S0d0bGVTQTlQbHh1SUNBZ0lDQWdkR2hwY3k1blpYUlRkR0YwWlNodWIyUmxMQ0J1YjJSbFcydGxlVjBzSUd0bGVTd2djR0YwYUM1amIyNWpZWFFvYTJWNUtTd2daR1ZsY0NBcklERXBYRzRnSUNBZ0tWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQlNaWFIxY201eklITjBZWFJsSUc5bUlHNXZaR1V1SUVOaGJHeHpJR1p2Y2lCbFlXTm9JRzV2WkdWY2JpQWdJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjlJRnR3WVhKbGJuUmRYRzRnSUNBcUlFQndZWEpoYlNCN0tuMGdXMjV2WkdWZFhHNGdJQ0FxSUVCd1lYSmhiU0I3VTNSeWFXNW5mU0JiYTJWNVhWeHVJQ0FnS2lCQWNHRnlZVzBnZTBGeWNtRjVmU0JiY0dGMGFGMWNiaUFnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUZ0a1pXVndYVnh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdUMkpxWldOMGZWeHVJQ0FnS2k5Y2JpQWdaMlYwVTNSaGRHVWdLSEJoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb0lEMGdXMTBzSUdSbFpYQWdQU0F3S1NCN1hHNGdJQ0FnY21WMGRYSnVJSHR3WVhKbGJuUXNJRzV2WkdVc0lHdGxlU3dnY0dGMGFDd2daR1ZsY0gxY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1EyRnNiR0poWTJ0Y2JpQWdJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjlJSE4wWVhSbFhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdLaTljYmlBZ2IyNVRkR1Z3U1c1MGJ5QW9jM1JoZEdVcElIdGNiaUFnSUNCeVpYUjFjbTRnZEhKMVpWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdVbVZqZFhKemFYWmxTWFJsY21GMGIzSjlYRzRnSUNBcUwxeHVJQ0JiVTNsdFltOXNMbWwwWlhKaGRHOXlYU0FvS1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhOY2JpQWdmVnh1ZlZ4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlGSmxZM1Z5YzJsMlpVbDBaWEpoZEc5eVhHNGlMQ0luZFhObElITjBjbWxqZENkY2JpOHFLbHh1SUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ292WEc1bWRXNWpkR2x2YmlCcGMwOWlhbVZqZENBb1lXNTVLU0I3WEc0Z0lISmxkSFZ5YmlCaGJua2dJVDA5SUc1MWJHd2dKaVlnZEhsd1pXOW1JR0Z1ZVNBOVBUMGdKMjlpYW1WamRDZGNibjFjYmk4cUtseHVJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDb3ZYRzVqYjI1emRDQjdhWE5CY25KaGVYMGdQU0JCY25KaGVWeHVMeW9xWEc0Z0tpQkFjR0Z5WVcwZ2V5cDlJR0Z1ZVZ4dUlDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpRWEp5WVhsTWFXdGxJQ2hoYm5rcElIdGNiaUFnYVdZZ0tDRnBjMDlpYW1WamRDaGhibmtwS1NCeVpYUjFjbTRnWm1Gc2MyVmNiaUFnYVdZZ0tDRW9KMnhsYm1kMGFDY2dhVzRnWVc1NUtTa2djbVYwZFhKdUlHWmhiSE5sWEc0Z0lHTnZibk4wSUd4bGJtZDBhQ0E5SUdGdWVTNXNaVzVuZEdoY2JpQWdhV1lnS0NGcGMwNTFiV0psY2loc1pXNW5kR2dwS1NCeVpYUjFjbTRnWm1Gc2MyVmNiaUFnYVdZZ0tHeGxibWQwYUNBK0lEQXBJSHRjYmlBZ0lDQnlaWFIxY200Z0tHeGxibWQwYUNBdElERXBJR2x1SUdGdWVWeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lHWnZjaUFvWTI5dWMzUWdhMlY1SUdsdUlHRnVlU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1poYkhObFhHNGdJQ0FnZlZ4dUlDQjlYRzU5WEc0dktpcGNiaUFxSUVCd1lYSmhiU0I3S24wZ1lXNTVYRzRnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQXFMMXh1Wm5WdVkzUnBiMjRnYVhOT2RXMWlaWElnS0dGdWVTa2dlMXh1SUNCeVpYUjFjbTRnZEhsd1pXOW1JR0Z1ZVNBOVBUMGdKMjUxYldKbGNpZGNibjFjYmk4cUtseHVJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjhRWEp5WVhsOUlHOWlhbVZqZEZ4dUlDb2dRSEpsZEhWeWJuTWdlMEZ5Y21GNVBGTjBjbWx1Wno1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdkbGRFdGxlWE1nS0c5aWFtVmpkQ2tnZTF4dUlDQmpiMjV6ZENCclpYbHpYeUE5SUU5aWFtVmpkQzVyWlhsektHOWlhbVZqZENsY2JpQWdhV1lnS0dselFYSnlZWGtvYjJKcVpXTjBLU2tnZTF4dUlDQWdJQzh2SUhOcmFYQWdjMjl5ZEZ4dUlDQjlJR1ZzYzJVZ2FXWWdLR2x6UVhKeVlYbE1hV3RsS0c5aWFtVmpkQ2twSUh0Y2JpQWdJQ0JqYjI1emRDQnBibVJsZUNBOUlHdGxlWE5mTG1sdVpHVjRUMllvSjJ4bGJtZDBhQ2NwWEc0Z0lDQWdhV1lnS0dsdVpHVjRJRDRnTFRFcElIdGNiaUFnSUNBZ0lHdGxlWE5mTG5Od2JHbGpaU2hwYm1SbGVDd2dNU2xjYmlBZ0lDQjlYRzRnSUNBZ0x5OGdjMnRwY0NCemIzSjBYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdMeThnYzI5eWRGeHVJQ0FnSUd0bGVYTmZMbk52Y25Rb0tWeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCclpYbHpYMXh1ZlZ4dVhHNWxlSEJ2Y25SekxtZGxkRXRsZVhNZ1BTQm5aWFJMWlhselhHNWxlSEJ2Y25SekxtbHpRWEp5WVhrZ1BTQnBjMEZ5Y21GNVhHNWxlSEJ2Y25SekxtbHpRWEp5WVhsTWFXdGxJRDBnYVhOQmNuSmhlVXhwYTJWY2JtVjRjRzl5ZEhNdWFYTlBZbXBsWTNRZ1BTQnBjMDlpYW1WamRGeHVaWGh3YjNKMGN5NXBjMDUxYldKbGNpQTlJR2x6VG5WdFltVnlYRzRpTENKcGJYQnZjblFnVEdsemRFbDBaVzBnWm5KdmJTQW5MaTlNYVhOMFNYUmxiU2M3WEc1cGJYQnZjblFnY21WamRYSnphWFpsU1hSbGNtRjBiM0lnWm5KdmJTQW5jbVZqZFhKemFYWmxMV2wwWlhKaGRHOXlKenRjYm1sdGNHOXlkQ0J2WW1wbFkzUlFZWFJvSUdaeWIyMGdKMjlpYW1WamRDMXdZWFJvSnp0Y2JseHVZMnhoYzNNZ1JHRjBZVXhwYzNRZ1pYaDBaVzVrY3lCU1pXRmpkQzVEYjIxd2IyNWxiblFnZTF4dUlDQWdJR052Ym5OMGNuVmpkRzl5S0hCeWIzQnpLU0I3WEc0Z0lDQWdJQ0FnSUhOMWNHVnlLSEJ5YjNCektUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1eVpXNWtaWEpPYjJSbGN5QTlJSFJvYVhNdWNtVnVaR1Z5VG05a1pYTXVZbWx1WkNoMGFHbHpLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJHYVdWc1pFMWhjQ0E5SUhSb2FYTXVjMlYwUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J6WlhSR2FXVnNaRTFoY0Nod1lYUm9MQ0JsZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0JsZG1WdWRDNXdjbVYyWlc1MFJHVm1ZWFZzZENncE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIdGJaWFpsYm5RdWRHRnlaMlYwTG1SaGRHRnpaWFF1Wm1sbGJHUmRPaUJ3WVhSb2ZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5VG05a1pYTW9aR0YwWVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1QySnFaV04wTG10bGVYTW9aR0YwWVNrdWJXRndLR2wwWlcwZ1BUNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR2wwWlcwZ1BUMDlJQ2R2WW1wbFkzUlFZWFJvSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdiR1YwSUdOb2FXeGtJRDBnUEV4cGMzUkpkR1Z0SUd0bGVUMTdhWFJsYlM1MGIxTjBjbWx1WnlncGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhiSFZsUFh0cGRHVnRmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamREMTdaR0YwWVZ0cGRHVnRYWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRDE3ZEdocGN5NXdjbTl3Y3k1bWFXVnNaRTFoY0gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHRnBibVZ5UFh0bElEMCtJSFJvYVhNdWMyVjBSbWxsYkdSTllYQW9aR0YwWVZ0cGRHVnRYUzV2WW1wbFkzUlFZWFJvTENCbEtYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZia05zYVdOclZHbDBiR1U5ZTJVZ1BUNGdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDaGtZWFJoVzJsMFpXMWRMQ0JsS1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHVnVkRDE3WlNBOVBpQjBhR2x6TG5ObGRFWnBaV3hrVFdGd0tHUmhkR0ZiYVhSbGJWMHNJR1VwZlM4K08xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHUmhkR0ZiYVhSbGJWMGdQVDA5SUNkdlltcGxZM1FuSUNZbUlHUmhkR0ZiYVhSbGJWMGdJVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqYUdsc1pDQTlJRkpsWVdOMExtTnNiMjVsUld4bGJXVnVkQ2hqYUdsc1pDd2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamFHbHNaSEpsYmpvZ1FYSnlZWGt1YVhOQmNuSmhlU2hrWVhSaFcybDBaVzFkS1NBL0lIUm9hWE11Y21WdVpHVnlUbTlrWlhNb1pHRjBZVnRwZEdWdFhWc3dYU2tnT2lCMGFHbHpMbkpsYm1SbGNrNXZaR1Z6S0dSaGRHRmJhWFJsYlYwcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJqYUdsc1pEdGNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ1WkdWeUtDa2dlMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQm1hV1ZzWkUxaGNDQTlJSFJvYVhNdWNISnZjSE11Wm1sbGJHUk5ZWEE3WEc1Y2JpQWdJQ0FnSUNBZ2JHVjBJR1JoZEdFZ1BTQjBhR2x6TG5CeWIzQnpMbVJoZEdFN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hCY25KaGVTNXBjMEZ5Y21GNUtHUmhkR0VwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlEMGdKeWM3WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnBaaUFvWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQTlQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLRUZ5Y21GNUxtbHpRWEp5WVhrb1pHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCa1lYUmhJRDBnWkdGMFlWc3dYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2hzWlhRZ2UzQmhjbVZ1ZEN3Z2JtOWtaU3dnYTJWNUxDQndZWFJvZlNCdlppQnVaWGNnY21WamRYSnphWFpsU1hSbGNtRjBiM0lvWkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc1dlpHVWdQVDA5SUNkdlltcGxZM1FuSUNZbUlHNXZaR1VnSVQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiR1YwSUhCaGRHaFRkSEpwYm1jZ1BTQndZWFJvTG1wdmFXNG9KeTRuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxWldOMFVHRjBhQzV6WlhRb1pHRjBZU3dnY0dGMGFGTjBjbWx1WnlBcklDY3ViMkpxWldOMFVHRjBhQ2NzSUhCaGRHaFRkSEpwYm1jcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YURNK1UyVnNaV04wSUdsMFpXMXpJR052Ym5SaGFXNWxjand2YURNK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHgxYkQ1N2RHaHBjeTV5Wlc1a1pYSk9iMlJsY3loa1lYUmhLWDA4TDNWc1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHeGxkQ0J2WW1wbFkzUkVZWFJoSUQwZ2IySnFaV04wVUdGMGFDNW5aWFFvZEdocGN5NXdjbTl3Y3k1a1lYUmhMQ0JtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUtUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLRUZ5Y21GNUxtbHpRWEp5WVhrb2IySnFaV04wUkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2WW1wbFkzUkVZWFJoSUQwZ2IySnFaV04wUkdGMFlWc3dYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2hzWlhRZ2UzQmhjbVZ1ZEN3Z2JtOWtaU3dnYTJWNUxDQndZWFJvZlNCdlppQnVaWGNnY21WamRYSnphWFpsU1hSbGNtRjBiM0lvYjJKcVpXTjBSR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JRzV2WkdVZ0lUMDlJQ2R2WW1wbFkzUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHeGxkQ0J3WVhSb1UzUnlhVzVuSUQwZ2NHRjBhQzVxYjJsdUtDY3VKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFtVmpkRVJoZEdFc0lIQmhkR2hUZEhKcGJtY3NJSEJoZEdoVGRISnBibWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlDaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThhRE0rVTJWc1pXTjBJSFJwZEd4bElHRnVaQ0JqYjI1MFpXNTBJR1pwWld4a2N6d3ZhRE0rWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeDFiRDU3ZEdocGN5NXlaVzVrWlhKT2IyUmxjeWh2WW1wbFkzUkVZWFJoS1gwOEwzVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMWNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdSR0YwWVV4cGMzUTdJaXdpYVcxd2IzSjBJRVJoZEdGTWFYTjBJR1p5YjIwZ0p5NHZSR0YwWVV4cGMzUW5PMXh1YVcxd2IzSjBJR2RsZEVGd2FVUmhkR0VnWm5KdmJTQW5MaTR2TGk0dlZYUnBiR2wwYVdWekwyZGxkRUZ3YVVSaGRHRW5PMXh1WEc1amJHRnpjeUJHYVdWc1pGTmxiR1ZqZEdsdmJpQmxlSFJsYm1SeklGSmxZV04wTGtOdmJYQnZibVZ1ZENCN1hHNGdJQ0FnWTI5dWMzUnlkV04wYjNJb2NISnZjSE1wSUh0Y2JpQWdJQ0FnSUNBZ2MzVndaWElvY0hKdmNITXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTjBZWFJsSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSTZJRzUxYkd3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwYzB4dllXUmxaRG9nWm1Gc2MyVXNYRzRnSUNBZ0lDQWdJQ0FnSUNCcGRHVnRjem9nVzExY2JpQWdJQ0FnSUNBZ2ZUdGNibHh1SUNBZ0lDQWdJQ0IwYUdsekxuVndaR0YwWlVacFpXeGtUV0Z3SUQwZ2RHaHBjeTUxY0dSaGRHVkdhV1ZzWkUxaGNDNWlhVzVrS0hSb2FYTXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lIVndaR0YwWlVacFpXeGtUV0Z3S0haaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjSEp2Y0hNdWRYQmtZWFJsUm1sbGJHUk5ZWEFvZG1Gc2RXVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHZGxkRVJoZEdFb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdDFjbXg5SUQwZ2RHaHBjeTV3Y205d2N6dGNiaUFnSUNBZ0lDQWdaMlYwUVhCcFJHRjBZU2gxY213cFhHNGdJQ0FnSUNBZ0lDQWdJQ0F1ZEdobGJpaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQW9lM0psYzNWc2RIMHBJRDArSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGeVpYTjFiSFFnZkh3Z1QySnFaV04wTG10bGVYTW9jbVZ6ZFd4MEtTNXNaVzVuZEdnZ1BUMDlJREFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWeWNtOXlPaUJGY25KdmNpZ25RMjkxYkdRZ2JtOTBJR1psZEdOb0lHUmhkR0VnWm5KdmJTQlZVa3d1Snlrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWE5NYjJGa1pXUTZJSFJ5ZFdWY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMmx6VEc5aFpHVmtPaUIwY25WbExDQnBkR1Z0Y3pvZ2NtVnpkV3gwZlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTd2dLSHRsY25KdmNuMHBJRDArSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2FYTk1iMkZrWldRNklIUnlkV1VzSUdWeWNtOXlmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQmpiMjF3YjI1bGJuUkVhV1JOYjNWdWRDZ3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NW5aWFJFWVhSaEtDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5S0NrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN1pYSnliM0lzSUdselRHOWhaR1ZrTENCcGRHVnRjMzBnUFNCMGFHbHpMbk4wWVhSbE8xeHVJQ0FnSUNBZ0lDQnBaaUFvWlhKeWIzSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBOFpHbDJQanh3UGtWeWNtOXlPaUI3WlhKeWIzSXViV1Z6YzJGblpYMDhMM0ErUEM5a2FYWStPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0NGcGMweHZZV1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRHhrYVhZZ1kyeGhjM05PWVcxbFBWd2ljM0JwYm01bGNpQnBjeTFoWTNScGRtVmNJaUJ6ZEhsc1pUMTdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1pzYjJGME9pQW5ibTl1WlNjc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHbHpjR3hoZVRvZ0oySnNiMk5ySnl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCM2FXUjBhRG9nSjJGMWRHOG5MRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2hsYVdkb2REb2dKMkYxZEc4bkxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIQmhaR1JwYm1jNklDY3hNSEI0SURFd2NIZ2dNekJ3ZUNBeE1IQjRKMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZYMCtQQzlrYVhZK08xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRHhFWVhSaFRHbHpkRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1JoZEdFOWUybDBaVzF6ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhWeWJEMTdkR2hwY3k1d2NtOXdjeTUxY214OVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptbGxiR1JOWVhBOWUzUm9hWE11Y0hKdmNITXVabWxsYkdSTllYQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEJrWVhSbFJtbGxiR1JOWVhBOWUzUm9hWE11ZFhCa1lYUmxSbWxsYkdSTllYQjlMejQ3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1OVhHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElFWnBaV3hrVTJWc1pXTjBhVzl1T3lJc0ltWjFibU4wYVc5dUlFbHVjSFYwUm1sbGJHUnpLSEJ5YjNCektTQjdYRzRnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ1BHUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lEeHBibkIxZENCMGVYQmxQVndpYUdsa1pHVnVYQ0lnYm1GdFpUMWNJbTF2WkY5cWMyOXVYM0psYm1SbGNsOTFjbXhjSWlCMllXeDFaVDE3Y0hKdmNITXVkWEpzZlM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4YVc1d2RYUWdkSGx3WlQxY0ltaHBaR1JsYmx3aUlHNWhiV1U5WENKdGIyUmZhbk52Ymw5eVpXNWtaWEpmWm1sbGJHUnRZWEJjSWlCMllXeDFaVDE3U2xOUFRpNXpkSEpwYm1kcFpua29jSEp2Y0hNdVptbGxiR1JOWVhBcGZTOCtYRzRnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNrN1hHNTlYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRWx1Y0hWMFJtbGxiR1J6T3lJc0ltWjFibU4wYVc5dUlFeHBjM1JKZEdWdEtIQnliM0J6S1NCN1hHNGdJQ0FnWTI5dWMzUWdlM1poYkhWbExDQmphR2xzWkhKbGJpd2dabWxsYkdSTllYQXNJRzlpYW1WamRDd2diMjVEYkdsamExUnBkR3hsTENCdmJrTnNhV05yUTI5dWRHVnVkQ3dnYjI1RGJHbGphME52Ym5SaGFXNWxjbjBnUFNCd2NtOXdjenRjYmlBZ0lDQnlaWFIxY200Z0tEeHNhVDVjYmlBZ0lDQWdJQ0FnZTJacFpXeGtUV0Z3TG5ScGRHeGxJRDA5UFNCdlltcGxZM1FnUHlBOGMzUnliMjVuUGxScGRHeGxPaUE4TDNOMGNtOXVaejRnT2lBbkozMWNiaUFnSUNBZ0lDQWdlMlpwWld4a1RXRndMbU52Ym5SbGJuUWdQVDA5SUc5aWFtVmpkQ0EvSUR4emRISnZibWMrUTI5dWRHVnVkRG9nUEM5emRISnZibWMrSURvZ0p5ZDlYRzRnSUNBZ0lDQWdJSHRqYUdsc1pISmxiaUEvSUR4emRISnZibWMrZTNaaGJIVmxmVHd2YzNSeWIyNW5QaUE2SUR4emNHRnVQbnQyWVd4MVpYMDhMM053WVc0K2ZWeHVJQ0FnSUNBZ0lDQjdJV05vYVd4a2NtVnVJQ1ltSUNGbWFXVnNaRTFoY0M1MGFYUnNaU0FtSmlBb1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZENBaFBUMGdiMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlDRTlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUR4aElHaHlaV1k5WENJalhDSWdZMnhoYzNOT1lXMWxQVndpWW5WMGRHOXVJR0oxZEhSdmJpMXpiV0ZzYkZ3aUlHUmhkR0V0Wm1sbGJHUTlYQ0owYVhSc1pWd2lJRzl1UTJ4cFkyczllMjl1UTJ4cFkydFVhWFJzWlgwK1ZHbDBiR1U4TDJFK0lEb2dKeWQ5WEc0Z0lDQWdJQ0FnSUhzaFkyaHBiR1J5Wlc0Z0ppWWdLR1pwWld4a1RXRndMblJwZEd4bElDRTlQU0J2WW1wbFkzUXBJQ1ltSUNGbWFXVnNaRTFoY0M1amIyNTBaVzUwSUNZbUlHWnBaV3hrVFdGd0xtbDBaVzFEYjI1MFlXbHVaWElnSVQwOUlHNTFiR3dnUDF4dUlDQWdJQ0FnSUNBZ0lDQWdQR0VnYUhKbFpqMWNJaU5jSWlCamJHRnpjMDVoYldVOVhDSmlkWFIwYjI0Z1luVjBkRzl1TFhOdFlXeHNYQ0lnWkdGMFlTMW1hV1ZzWkQxY0ltTnZiblJsYm5SY0lseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IyNURiR2xqYXoxN2IyNURiR2xqYTBOdmJuUmxiblI5UGtOdmJuUmxiblE4TDJFK0lEb2dKeWQ5WEc0Z0lDQWdJQ0FnSUh0amFHbHNaSEpsYmlBbUppQkJjbkpoZVM1cGMwRnljbUY1S0c5aWFtVmpkQ2tnSmlZZ1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUE5UFQwZ2JuVnNiQ0EvWEc0Z0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0ltSjFkSFJ2YmlCaWRYUjBiMjR0YzIxaGJHeGNJaUJrWVhSaExXWnBaV3hrUFZ3aWFYUmxiVU52Ym5SaGFXNWxjbHdpWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2YmtOc2FXTnJQWHR2YmtOc2FXTnJRMjl1ZEdGcGJtVnlmVDVUWld4bFkzUThMMkUrSURvZ0p5ZDlYRzRnSUNBZ0lDQWdJSHRqYUdsc1pISmxiaUEvSUR4emNHRnVJR05zWVhOelRtRnRaVDFjSW1SaGMyaHBZMjl1Y3lCa1lYTm9hV052Ym5NdFlYSnliM2N0Wkc5M2Jsd2lQand2YzNCaGJqNGdPaUFuSjMxY2JpQWdJQ0FnSUNBZ2UyTm9hV3hrY21WdUlEOGdQSFZzSUhOMGVXeGxQWHQ3Y0dGa1pHbHVaMHhsWm5RNklERTFMQ0JpYjNKa1pYSk1aV1owT2lBbk1uQjRJSE52Ykdsa0lDTmpZMk1uZlgwK2UyTm9hV3hrY21WdWZUd3ZkV3crSURvZ0p5ZDlYRzRnSUNBZ1BDOXNhVDRwTzF4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQk1hWE4wU1hSbGJUc2lMQ0pwYlhCdmNuUWdSbWxsYkdSVFpXeGxZM1JwYjI0Z1puSnZiU0FuTGk5R2FXVnNaRk5sYkdWamRHbHZiaWM3WEc1cGJYQnZjblFnU1c1d2RYUkdhV1ZzWkhNZ1puSnZiU0FuTGk5SmJuQjFkRVpwWld4a2N5YzdYRzVwYlhCdmNuUWdVM1Z0YldGeWVTQm1jbTl0SUNjdUwxTjFiVzFoY25rbk8xeHVYRzVqYjI1emRDQnBibWwwYVdGc1UzUmhkR1VnUFNCN1hHNGdJQ0FnYzJodmQwWnBaV3hrVTJWc1pXTjBhVzl1T2lCbVlXeHpaU3hjYmlBZ0lDQjFjbXc2SUNjbkxGeHVJQ0FnSUdacFpXeGtUV0Z3T2lCN1hHNGdJQ0FnSUNBZ0lHbDBaVzFEYjI1MFlXbHVaWEk2SUc1MWJHd3NYRzRnSUNBZ0lDQWdJSFJwZEd4bE9pQW5KeXhjYmlBZ0lDQWdJQ0FnWTI5dWRHVnVkRG9nSnlkY2JpQWdJQ0I5WEc1OU8xeHVYRzVqYkdGemN5QlRaWFIwYVc1bmN5QmxlSFJsYm1SeklGSmxZV04wTGtOdmJYQnZibVZ1ZENCN1hHNGdJQ0FnWTI5dWMzUnlkV04wYjNJb2NISnZjSE1wSUh0Y2JpQWdJQ0FnSUNBZ2MzVndaWElvY0hKdmNITXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTjBZWFJsSUQwZ2FXNXBkR2xoYkZOMFlYUmxPMXh1WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkWEpzUTJoaGJtZGxJRDBnZEdocGN5NTFjbXhEYUdGdVoyVXVZbWx1WkNoMGFHbHpLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NW9ZVzVrYkdWVGRXSnRhWFFnUFNCMGFHbHpMbWhoYm1Sc1pWTjFZbTFwZEM1aWFXNWtLSFJvYVhNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5KbGMyVjBUM0IwYVc5dWN5QTlJSFJvYVhNdWNtVnpaWFJQY0hScGIyNXpMbUpwYm1Rb2RHaHBjeWs3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkWEJrWVhSbFJtbGxiR1JOWVhBZ1BTQjBhR2x6TG5Wd1pHRjBaVVpwWld4a1RXRndMbUpwYm1Rb2RHaHBjeWs3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdZMjl0Y0c5dVpXNTBSR2xrVFc5MWJuUW9LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVhVzVwZEU5d2RHbHZibk1vS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JwYm1sMFQzQjBhVzl1Y3lncElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ0YjJSS2MyOXVVbVZ1WkdWeUxtOXdkR2x2Ym5NZ0lUMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emRDQnZjSFJwYjI1eklEMGdiVzlrU25OdmJsSmxibVJsY2k1dmNIUnBiMjV6TzF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUJ2Y0hScGIyNXpMblZ5YkNBL0lHOXdkR2x2Ym5NdWRYSnNJRG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptbGxiR1JOWVhBNklHOXdkR2x2Ym5NdVptbGxiR1JOWVhBZ1B5QktVMDlPTG5CaGNuTmxLRzl3ZEdsdmJuTXVabWxsYkdSTllYQXBJRG9nZTJsMFpXMURiMjUwWVdsdVpYSTZJRzUxYkd3c0lIUnBkR3hsT2lBbkp5d2dZMjl1ZEdWdWREb2dKeWQ5TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOb2IzZEdhV1ZzWkZObGJHVmpkR2x2YmpvZ0lTRnZjSFJwYjI1ekxuVnliRnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQjFjbXhEYUdGdVoyVW9aWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2RYSnNPaUJsZG1WdWRDNTBZWEpuWlhRdWRtRnNkV1Y5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JvWVc1a2JHVlRkV0p0YVhRb1pYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ1pYWmxiblF1Y0hKbGRtVnVkRVJsWm1GMWJIUW9LVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdjMmh2ZDBacFpXeGtVMlZzWldOMGFXOXVPaUIwY25WbGZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnpaWFJQY0hScGIyNXpLR1YyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJR1YyWlc1MExuQnlaWFpsYm5SRVpXWmhkV3gwS0NrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvYVc1cGRHbGhiRk4wWVhSbEtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCMWNHUmhkR1ZHYVdWc1pFMWhjQ2gyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQnVaWGRXWVd3Z1BTQlBZbXBsWTNRdVlYTnphV2R1S0hSb2FYTXVjM1JoZEdVdVptbGxiR1JOWVhBc0lIWmhiSFZsS1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3Wm1sbGJHUk5ZWEE2SUc1bGQxWmhiSDBwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsYm1SbGNpZ3BJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdlM05vYjNkR2FXVnNaRk5sYkdWamRHbHZiaXdnZFhKc2ZTQTlJSFJvYVhNdWMzUmhkR1U3WEc0Z0lDQWdJQ0FnSUdOdmJuTjBJSHRwZEdWdFEyOXVkR0ZwYm1WeUxDQjBhWFJzWlN3Z1kyOXVkR1Z1ZEgwZ1BTQjBhR2x6TG5OMFlYUmxMbVpwWld4a1RXRndPMXh1WEc0Z0lDQWdJQ0FnSUdsbUlDaDFjbXdnSmlZZ2FYUmxiVU52Ym5SaGFXNWxjaUFoUFQwZ2JuVnNiQ0FtSmlCMGFYUnNaU0FtSmlCamIyNTBaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhUZFcxdFlYSjVJSHN1TGk1MGFHbHpMbk4wWVhSbGZTQXZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFNXNXdkWFJHYVdWc1pITWdleTR1TG5Sb2FYTXVjM1JoZEdWOUlDOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4aElHaHlaV1k5WENJalhDSWdiMjVEYkdsamF6MTdkR2hwY3k1eVpYTmxkRTl3ZEdsdmJuTjlJR05zWVhOelRtRnRaVDFjSW1KMWRIUnZibHdpUGxKbGMyVjBJSE5sZEhScGJtZHpQQzloUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2h6YUc5M1JtbGxiR1JUWld4bFkzUnBiMjRwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQW9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR1JwZGo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQRVpwWld4a1UyVnNaV04wYVc5dUlIVnliRDE3ZFhKc2ZTQm1hV1ZzWkUxaGNEMTdkR2hwY3k1emRHRjBaUzVtYVdWc1pFMWhjSDBnZFhCa1lYUmxSbWxsYkdSTllYQTllM1JvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEI5THo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQRWx1Y0hWMFJtbGxiR1J6SUhzdUxpNTBhR2x6TG5OMFlYUmxmU0F2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUc5dVEyeHBZMnM5ZTNSb2FYTXVjbVZ6WlhSUGNIUnBiMjV6ZlNCamJHRnpjMDVoYldVOVhDSmlkWFIwYjI1Y0lqNVNaWE5sZENCelpYUjBhVzVuY3p3dllUNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMMlJwZGo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFlnWTJ4aGMzTk9ZVzFsUFZ3aWQzSmhjRndpUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThabTl5YlNCdmJsTjFZbTFwZEQxN2RHaHBjeTVvWVc1a2JHVlRkV0p0YVhSOVBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BIQStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEd4aFltVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThjM1J5YjI1blBrUmhkR0VnYzI5MWNtTmxQQzl6ZEhKdmJtYytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEM5c1lXSmxiRDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFluSXZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4cFBrVnVkR1Z5SUdFZ2RtRnNhV1FnU2xOUFRpQmhjR2tnZFhKc0xqd3ZhVDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4cGJuQjFkQ0IwZVhCbFBWd2lkR1Y0ZEZ3aUlITjBlV3hsUFh0N2QybGtkR2c2SUNjeE1EQWxKMzE5SUhaaGJIVmxQWHQxY214OUlHOXVRMmhoYm1kbFBYdDBhR2x6TG5WeWJFTm9ZVzVuWlgwdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BIQStQR2x1Y0hWMElIUjVjR1U5WENKemRXSnRhWFJjSWlCamJHRnpjMDVoYldVOVhDSmlkWFIwYjI0Z1luVjBkRzl1TFhCeWFXMWhjbmxjSWlCMllXeDFaVDFjSWxOMVltMXBkRndpTHo0OEwzQStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlptOXliVDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BFbHVjSFYwUm1sbGJHUnpJSHN1TGk1MGFHbHpMbk4wWVhSbGZTQXZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMWNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdVMlYwZEdsdVozTTdJaXdpWm5WdVkzUnBiMjRnVTNWdGJXRnllU2h3Y205d2N5a2dlMXh1SUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lEeDFiRDVjYmlBZ0lDQWdJQ0FnSUNBZ0lEeHNhU0J6ZEhsc1pUMTdlM2R2Y21SQ2NtVmhhem9nSjJKeVpXRnJMV0ZzYkNkOWZUNUVZWFJoSUhOdmRYSmpaVG9nZTNCeWIzQnpMblZ5YkgwOEwyeHBQbHh1SUNBZ0lDQWdJQ0FnSUNBZ1BHeHBQbFJwZEd4bE9pQjdjSEp2Y0hNdVptbGxiR1JOWVhBdWRHbDBiR1Y5UEM5c2FUNWNiaUFnSUNBZ0lDQWdJQ0FnSUR4c2FUNURiMjUwWlc1ME9pQjdjSEp2Y0hNdVptbGxiR1JOWVhBdVkyOXVkR1Z1ZEgwOEwyeHBQbHh1SUNBZ0lDQWdJQ0E4TDNWc1BseHVJQ0FnSUNrN1hHNTlYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRk4xYlcxaGNuazdJaXdpYVcxd2IzSjBJRk5sZEhScGJtZHpJR1p5YjIwZ0p5NHZRMjl0Y0c5dVpXNTBjeTlUWlhSMGFXNW5jeWM3WEc1Y2JtTnZibk4wSUcxdlpFcHpiMjVTWlc1a1pYSkZiR1Z0Wlc1MElEMGdKMjF2WkhWc1lYSnBkSGt0YW5OdmJpMXlaVzVrWlhJbk8xeHVZMjl1YzNRZ1pHOXRSV3hsYldWdWRDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tHMXZaRXB6YjI1U1pXNWtaWEpGYkdWdFpXNTBLVHRjYmx4dVVtVmhZM1JFVDAwdWNtVnVaR1Z5S0Z4dUlDQWdJRHhUWlhSMGFXNW5jeUF2UGl4Y2JpQWdJQ0JrYjIxRmJHVnRaVzUwWEc0cE95SXNJbVoxYm1OMGFXOXVJR2RsZEVGd2FVUmhkR0VvZFhKc0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUdabGRHTm9LSFZ5YkNsY2JpQWdJQ0FnSUNBZ0xuUm9aVzRvY21WeklEMCtJSEpsY3k1cWMyOXVLQ2twWEc0Z0lDQWdJQ0FnSUM1MGFHVnVLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0tISmxjM1ZzZENrZ1BUNGdLSHR5WlhOMWJIUjlLU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDaGxjbkp2Y2lrZ1BUNGdLSHRsY25KdmNuMHBYRzRnSUNBZ0lDQWdJQ2s3WEc1OVhHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHZGxkRUZ3YVVSaGRHRTdYRzRpWFgwPVxuIl0sImZpbGUiOiJBZG1pbi9JbmRleEFkbWluLmpzIn0=
