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
          className: "spinner is-active"
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
  return React.createElement("li", null, fieldMap.title === object && fieldMap.title ? React.createElement("strong", null, "Title: ") : '', fieldMap.content === object && fieldMap.content ? React.createElement("strong", null, "Content: ") : '', children ? React.createElement("strong", null, value) : React.createElement("span", null, value), !children && !fieldMap.title && fieldMap.content !== object && fieldMap.itemContainer !== null ? React.createElement("a", {
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
    className: "sub-object"
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
          className: "url-input",
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
  return React.createElement("ul", null, React.createElement("li", null, "Data source: ", props.url), React.createElement("li", null, "Title: ", props.fieldMap.title), React.createElement("li", null, "Content: ", props.fieldMap.content));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7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Q0FESixFQUVJLDJDQUFZLEtBQUssQ0FBQyxRQUFOLENBQWUsS0FBM0IsQ0FGSixFQUdJLDZDQUFjLEtBQUssQ0FBQyxRQUFOLENBQWUsT0FBN0IsQ0FISixDQURKO0FBT0g7O2VBRWMsTzs7Ozs7O0FDVmY7Ozs7QUFFQSxJQUFNLG9CQUFvQixHQUFHLHdCQUE3QjtBQUNBLElBQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFULENBQXdCLG9CQUF4QixDQUFuQjtBQUVBLFFBQVEsQ0FBQyxNQUFULENBQ0ksb0JBQUMsaUJBQUQsT0FESixFQUVJLFVBRko7Ozs7Ozs7Ozs7QUNMQSxTQUFTLFVBQVQsQ0FBb0IsR0FBcEIsRUFBeUI7QUFDckIsU0FBTyxLQUFLLENBQUMsR0FBRCxDQUFMLENBQ0YsSUFERSxDQUNHLFVBQUEsR0FBRztBQUFBLFdBQUksR0FBRyxDQUFDLElBQUosRUFBSjtBQUFBLEdBRE4sRUFFRixJQUZFLENBR0MsVUFBQyxNQUFEO0FBQUEsV0FBYTtBQUFDLE1BQUEsTUFBTSxFQUFOO0FBQUQsS0FBYjtBQUFBLEdBSEQsRUFJQyxVQUFDLEtBQUQ7QUFBQSxXQUFZO0FBQUMsTUFBQSxLQUFLLEVBQUw7QUFBRCxLQUFaO0FBQUEsR0FKRCxDQUFQO0FBTUg7O2VBRWMsVSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5vYmplY3RQYXRoID0gZmFjdG9yeSgpO1xuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgaWYob2JqID09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvL3RvIGhhbmRsZSBvYmplY3RzIHdpdGggbnVsbCBwcm90b3R5cGVzICh0b28gZWRnZSBjYXNlPylcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcClcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpe1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKXtcbiAgICByZXR1cm4gdG9TdHIuY2FsbCh0eXBlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XG4gIH1cblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKXtcbiAgICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gICAgcmV0dXJuIHRvU3RyLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQm9vbGVhbihvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0S2V5KGtleSl7XG4gICAgdmFyIGludEtleSA9IHBhcnNlSW50KGtleSk7XG4gICAgaWYgKGludEtleS50b1N0cmluZygpID09PSBrZXkpIHtcbiAgICAgIHJldHVybiBpbnRLZXk7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBmYWN0b3J5KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gICAgdmFyIG9iamVjdFBhdGggPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3RQYXRoKS5yZWR1Y2UoZnVuY3Rpb24ocHJveHksIHByb3ApIHtcbiAgICAgICAgaWYocHJvcCA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICAgIH1cblxuICAgICAgICAvKmlzdGFuYnVsIGlnbm9yZSBlbHNlKi9cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RQYXRoW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcHJveHlbcHJvcF0gPSBvYmplY3RQYXRoW3Byb3BdLmJpbmQob2JqZWN0UGF0aCwgb2JqKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgIH0sIHt9KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgcmV0dXJuIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyB8fCAodHlwZW9mIHByb3AgPT09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkob2JqKSkgfHwgaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLm1hcChnZXRLZXkpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IHBhdGhbMF07XG4gICAgICB2YXIgY3VycmVudFZhbHVlID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCB8fCAhZG9Ob3RSZXBsYWNlKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCkge1xuICAgICAgICAvL2NoZWNrIGlmIHdlIGFzc3VtZSBhbiBhcnJheVxuICAgICAgICBpZih0eXBlb2YgcGF0aFsxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfVxuXG4gICAgb2JqZWN0UGF0aC5oYXMgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICEhb2JqO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGogPSBnZXRLZXkocGF0aFtpXSk7XG5cbiAgICAgICAgaWYoKHR5cGVvZiBqID09PSAnbnVtYmVyJyAmJiBpc0FycmF5KG9iaikgJiYgaiA8IG9iai5sZW5ndGgpIHx8XG4gICAgICAgICAgKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzID8gKGogaW4gT2JqZWN0KG9iaikpIDogaGFzT3duUHJvcGVydHkob2JqLCBqKSkpIHtcbiAgICAgICAgICBvYmogPSBvYmpbal07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVuc3VyZUV4aXN0cyA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguaW5zZXJ0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGF0KXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgYXQgPSB+fmF0O1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cbiAgICAgIGFyci5zcGxpY2UoYXQsIDAsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbXB0eSA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUsIGk7XG4gICAgICBpZiAoISh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCkpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsICcnKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHZhbHVlLmxlbmd0aCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICBmb3IgKGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgbnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGgucHVzaCA9IGZ1bmN0aW9uIChvYmosIHBhdGggLyosIHZhbHVlcyAqLyl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG5cbiAgICAgIGFyci5wdXNoLmFwcGx5KGFyciwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguY29hbGVzY2UgPSBmdW5jdGlvbiAob2JqLCBwYXRocywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoc1tpXSkpICE9PSB2b2lkIDApIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBkZWZhdWx0VmFsdWUpe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLCBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICB2YXIgbmV4dE9iaiA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKVxuICAgICAgaWYgKG5leHRPYmogPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG5leHRPYmo7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCBkZWZhdWx0VmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmRlbCA9IGZ1bmN0aW9uIGRlbChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZih0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9iaiwgcGF0aC5zcGxpdCgnLicpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgaWYgKCFoYXNTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgIG9iai5zcGxpY2UoY3VycmVudFBhdGgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvYmpbY3VycmVudFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iamVjdFBhdGg7XG4gIH1cblxuICB2YXIgbW9kID0gZmFjdG9yeSgpO1xuICBtb2QuY3JlYXRlID0gZmFjdG9yeTtcbiAgbW9kLndpdGhJbmhlcml0ZWRQcm9wcyA9IGZhY3Rvcnkoe2luY2x1ZGVJbmhlcml0ZWRQcm9wczogdHJ1ZX0pXG4gIHJldHVybiBtb2Q7XG59KTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG4iLCIndXNlIHN0cmljdCdcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCAoYW55KSB7XG4gIHJldHVybiBhbnkgIT09IG51bGwgJiYgdHlwZW9mIGFueSA9PT0gJ29iamVjdCdcbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5jb25zdCB7aXNBcnJheX0gPSBBcnJheVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlIChhbnkpIHtcbiAgaWYgKCFpc09iamVjdChhbnkpKSByZXR1cm4gZmFsc2VcbiAgaWYgKCEoJ2xlbmd0aCcgaW4gYW55KSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGxlbmd0aCA9IGFueS5sZW5ndGhcbiAgaWYgKCFpc051bWJlcihsZW5ndGgpKSByZXR1cm4gZmFsc2VcbiAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gKGxlbmd0aCAtIDEpIGluIGFueVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFueSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIgKGFueSkge1xuICByZXR1cm4gdHlwZW9mIGFueSA9PT0gJ251bWJlcidcbn1cbi8qKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5PFN0cmluZz59XG4gKi9cbmZ1bmN0aW9uIGdldEtleXMgKG9iamVjdCkge1xuICBjb25zdCBrZXlzXyA9IE9iamVjdC5rZXlzKG9iamVjdClcbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkge1xuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2UgaWYgKGlzQXJyYXlMaWtlKG9iamVjdCkpIHtcbiAgICBjb25zdCBpbmRleCA9IGtleXNfLmluZGV4T2YoJ2xlbmd0aCcpXG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIGtleXNfLnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSB7XG4gICAgLy8gc29ydFxuICAgIGtleXNfLnNvcnQoKVxuICB9XG4gIHJldHVybiBrZXlzX1xufVxuXG5leHBvcnRzLmdldEtleXMgPSBnZXRLZXlzXG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5XG5leHBvcnRzLmlzQXJyYXlMaWtlID0gaXNBcnJheUxpa2VcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdFxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyXG4iLCJpbXBvcnQgTGlzdEl0ZW0gZnJvbSAnLi9MaXN0SXRlbSc7XG5pbXBvcnQgcmVjdXJzaXZlSXRlcmF0b3IgZnJvbSAncmVjdXJzaXZlLWl0ZXJhdG9yJztcbmltcG9ydCBvYmplY3RQYXRoIGZyb20gJ29iamVjdC1wYXRoJztcblxuY2xhc3MgRGF0YUxpc3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJOb2RlcyA9IHRoaXMucmVuZGVyTm9kZXMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zZXRGaWVsZE1hcCA9IHRoaXMuc2V0RmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBzZXRGaWVsZE1hcChwYXRoLCBldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHtbZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGRdOiBwYXRofSk7XG4gICAgfVxuXG4gICAgcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGNoaWxkID0gPExpc3RJdGVtIGtleT17aXRlbS50b1N0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtpdGVtfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdD17ZGF0YVtpdGVtXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGFpbmVyPXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrVGl0bGU9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGVudD17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfS8+O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbaXRlbV0gPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiB0aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgICAgbGV0IGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3IoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IGl0ZW1zIGNvbnRhaW5lcjwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bD57dGhpcy5yZW5kZXJOb2RlcyhkYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBvYmplY3REYXRhID0gb2JqZWN0UGF0aC5nZXQodGhpcy5wcm9wcy5kYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3Iob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFBhdGguc2V0KG9iamVjdERhdGEsIHBhdGhTdHJpbmcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IHRpdGxlIGFuZCBjb250ZW50IGZpZWxkczwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bD57dGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRGF0YUxpc3Q7IiwiaW1wb3J0IERhdGFMaXN0IGZyb20gJy4vRGF0YUxpc3QnO1xuaW1wb3J0IGdldEFwaURhdGEgZnJvbSAnLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGEnO1xuXG5jbGFzcyBGaWVsZFNlbGVjdGlvbiBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICAgICAgICBpdGVtczogW11cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnVwZGF0ZUZpZWxkTWFwID0gdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAodmFsdWUpO1xuICAgIH1cblxuICAgIGdldERhdGEoKSB7XG4gICAgICAgIGNvbnN0IHt1cmx9ID0gdGhpcy5wcm9wcztcbiAgICAgICAgZ2V0QXBpRGF0YSh1cmwpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICAoe3Jlc3VsdH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBFcnJvcignQ291bGQgbm90IGZldGNoIGRhdGEgZnJvbSBVUkwuJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe2lzTG9hZGVkOiB0cnVlLCBpdGVtczogcmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgfSwgKHtlcnJvcn0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7aXNMb2FkZWQ6IHRydWUsIGVycm9yfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCB7ZXJyb3IsIGlzTG9hZGVkLCBpdGVtc30gPSB0aGlzLnN0YXRlO1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiA8ZGl2PjxwPkVycm9yOiB7ZXJyb3IubWVzc2FnZX08L3A+PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIj48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gPERhdGFMaXN0XG4gICAgICAgICAgICAgICAgZGF0YT17aXRlbXN9XG4gICAgICAgICAgICAgICAgdXJsPXt0aGlzLnByb3BzLnVybH1cbiAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICB1cGRhdGVGaWVsZE1hcD17dGhpcy51cGRhdGVGaWVsZE1hcH0vPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRmllbGRTZWxlY3Rpb247IiwiZnVuY3Rpb24gSW5wdXRGaWVsZHMocHJvcHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX3VybFwiIHZhbHVlPXtwcm9wcy51cmx9Lz5cbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiIHZhbHVlPXtKU09OLnN0cmluZ2lmeShwcm9wcy5maWVsZE1hcCl9Lz5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgSW5wdXRGaWVsZHM7IiwiZnVuY3Rpb24gTGlzdEl0ZW0ocHJvcHMpIHtcbiAgICBjb25zdCB7dmFsdWUsIGNoaWxkcmVuLCBmaWVsZE1hcCwgb2JqZWN0LCBvbkNsaWNrVGl0bGUsIG9uQ2xpY2tDb250ZW50LCBvbkNsaWNrQ29udGFpbmVyfSA9IHByb3BzO1xuICAgIHJldHVybiAoPGxpPlxuICAgICAgICB7ZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCAmJiBmaWVsZE1hcC50aXRsZSAgPyA8c3Ryb25nPlRpdGxlOiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAge2ZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCAmJiBmaWVsZE1hcC5jb250ZW50ID8gPHN0cm9uZz5Db250ZW50OiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAge2NoaWxkcmVuID8gPHN0cm9uZz57dmFsdWV9PC9zdHJvbmc+IDogPHNwYW4+e3ZhbHVlfTwvc3Bhbj59XG4gICAgICAgIHshY2hpbGRyZW4gJiYgIWZpZWxkTWFwLnRpdGxlICYmIChmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgP1xuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXNtYWxsXCIgZGF0YS1maWVsZD1cInRpdGxlXCIgb25DbGljaz17b25DbGlja1RpdGxlfT5UaXRsZTwvYT4gOiAnJ31cbiAgICAgICAgeyFjaGlsZHJlbiAmJiAoZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCkgJiYgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/XG4gICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tc21hbGxcIiBkYXRhLWZpZWxkPVwiY29udGVudFwiXG4gICAgICAgICAgICAgICBvbkNsaWNrPXtvbkNsaWNrQ29udGVudH0+Q29udGVudDwvYT4gOiAnJ31cbiAgICAgICAge2NoaWxkcmVuICYmIEFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsID9cbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiIGRhdGEtZmllbGQ9XCJpdGVtQ29udGFpbmVyXCJcbiAgICAgICAgICAgICAgIG9uQ2xpY2s9e29uQ2xpY2tDb250YWluZXJ9PlNlbGVjdDwvYT4gOiAnJ31cbiAgICAgICAge2NoaWxkcmVuID8gPHNwYW4gY2xhc3NOYW1lPVwiZGFzaGljb25zIGRhc2hpY29ucy1hcnJvdy1kb3duXCI+PC9zcGFuPiA6ICcnfVxuICAgICAgICB7Y2hpbGRyZW4gPyA8dWwgY2xhc3NOYW1lPVwic3ViLW9iamVjdFwiPntjaGlsZHJlbn08L3VsPiA6ICcnfVxuICAgIDwvbGk+KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgTGlzdEl0ZW07IiwiaW1wb3J0IEZpZWxkU2VsZWN0aW9uIGZyb20gJy4vRmllbGRTZWxlY3Rpb24nO1xuaW1wb3J0IElucHV0RmllbGRzIGZyb20gJy4vSW5wdXRGaWVsZHMnO1xuaW1wb3J0IFN1bW1hcnkgZnJvbSAnLi9TdW1tYXJ5JztcblxuY29uc3QgaW5pdGlhbFN0YXRlID0ge1xuICAgIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gICAgdXJsOiAnJyxcbiAgICBmaWVsZE1hcDoge1xuICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgfVxufTtcblxuY2xhc3MgU2V0dGluZ3MgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IGluaXRpYWxTdGF0ZTtcblxuICAgICAgICB0aGlzLnVybENoYW5nZSA9IHRoaXMudXJsQ2hhbmdlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuaGFuZGxlU3VibWl0ID0gdGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5yZXNldE9wdGlvbnMgPSB0aGlzLnJlc2V0T3B0aW9ucy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnVwZGF0ZUZpZWxkTWFwID0gdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICB0aGlzLmluaXRPcHRpb25zKCk7XG4gICAgfVxuXG4gICAgaW5pdE9wdGlvbnMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbW9kSnNvblJlbmRlci5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IG1vZEpzb25SZW5kZXIub3B0aW9ucztcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgICAgICAgIHVybDogb3B0aW9ucy51cmwgPyBvcHRpb25zLnVybCA6ICcnLFxuICAgICAgICAgICAgICAgIGZpZWxkTWFwOiBvcHRpb25zLmZpZWxkTWFwID8gSlNPTi5wYXJzZShvcHRpb25zLmZpZWxkTWFwKSA6IHtpdGVtQ29udGFpbmVyOiBudWxsLCB0aXRsZTogJycsIGNvbnRlbnQ6ICcnfSxcbiAgICAgICAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXJsQ2hhbmdlKGV2ZW50KSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3VybDogZXZlbnQudGFyZ2V0LnZhbHVlfSk7XG4gICAgfVxuXG4gICAgaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogdHJ1ZX0pO1xuICAgIH1cblxuICAgIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKGluaXRpYWxTdGF0ZSk7XG4gICAgfVxuXG4gICAgdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgICAgY29uc3QgbmV3VmFsID0gT2JqZWN0LmFzc2lnbih0aGlzLnN0YXRlLmZpZWxkTWFwLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpZWxkTWFwOiBuZXdWYWx9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHtzaG93RmllbGRTZWxlY3Rpb24sIHVybH0gPSB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCB7aXRlbUNvbnRhaW5lciwgdGl0bGUsIGNvbnRlbnR9ID0gdGhpcy5zdGF0ZS5maWVsZE1hcDtcblxuICAgICAgICBpZiAodXJsICYmIGl0ZW1Db250YWluZXIgIT09IG51bGwgJiYgdGl0bGUgJiYgY29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8U3VtbWFyeSB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIG9uQ2xpY2s9e3RoaXMucmVzZXRPcHRpb25zfSBjbGFzc05hbWU9XCJidXR0b25cIj5SZXNldCBzZXR0aW5nczwvYT5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxGaWVsZFNlbGVjdGlvbiB1cmw9e3VybH0gZmllbGRNYXA9e3RoaXMuc3RhdGUuZmllbGRNYXB9IHVwZGF0ZUZpZWxkTWFwPXt0aGlzLnVwZGF0ZUZpZWxkTWFwfS8+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBvbkNsaWNrPXt0aGlzLnJlc2V0T3B0aW9uc30gY2xhc3NOYW1lPVwiYnV0dG9uXCI+UmVzZXQgc2V0dGluZ3M8L2E+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIndyYXBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e3RoaXMuaGFuZGxlU3VibWl0fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz5EYXRhIHNvdXJjZTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJyLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aT5FbnRlciBhIHZhbGlkIEpTT04gYXBpIHVybC48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzc05hbWU9XCJ1cmwtaW5wdXRcIiB2YWx1ZT17dXJsfSBvbkNoYW5nZT17dGhpcy51cmxDaGFuZ2V9Lz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPjxpbnB1dCB0eXBlPVwic3VibWl0XCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIgdmFsdWU9XCJTdWJtaXRcIi8+PC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNldHRpbmdzOyIsImZ1bmN0aW9uIFN1bW1hcnkocHJvcHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8dWw+XG4gICAgICAgICAgICA8bGk+RGF0YSBzb3VyY2U6IHtwcm9wcy51cmx9PC9saT5cbiAgICAgICAgICAgIDxsaT5UaXRsZToge3Byb3BzLmZpZWxkTWFwLnRpdGxlfTwvbGk+XG4gICAgICAgICAgICA8bGk+Q29udGVudDoge3Byb3BzLmZpZWxkTWFwLmNvbnRlbnR9PC9saT5cbiAgICAgICAgPC91bD5cbiAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBTdW1tYXJ5OyIsImltcG9ydCBTZXR0aW5ncyBmcm9tICcuL0NvbXBvbmVudHMvU2V0dGluZ3MnO1xuXG5jb25zdCBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbmNvbnN0IGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8U2V0dGluZ3MgLz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdChwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnJlbmRlck5vZGVzID0gX3RoaXMucmVuZGVyTm9kZXMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMuc2V0RmllbGRNYXAgPSBfdGhpcy5zZXRGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGlmIChpdGVtID09PSAnb2JqZWN0UGF0aCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBSZWFjdC5jcmVhdGVFbGVtZW50KF9MaXN0SXRlbS5kZWZhdWx0LCB7XG4gICAgICAgICAga2V5OiBpdGVtLnRvU3RyaW5nKCksXG4gICAgICAgICAgdmFsdWU6IGl0ZW0sXG4gICAgICAgICAgb2JqZWN0OiBkYXRhW2l0ZW1dLFxuICAgICAgICAgIGZpZWxkTWFwOiBfdGhpczIucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgb25DbGlja0NvbnRhaW5lcjogZnVuY3Rpb24gb25DbGlja0NvbnRhaW5lcihlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb25DbGlja0NvbnRlbnQ6IGZ1bmN0aW9uIG9uQ2xpY2tDb250ZW50KGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczIuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoX3R5cGVvZihkYXRhW2l0ZW1dKSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvciA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvciA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChkYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcCR2YWx1ZSA9IF9zdGVwLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcCR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpID09PSAnb2JqZWN0JyAmJiBub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvci5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCBpdGVtcyBjb250YWluZXJcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCBudWxsLCB0aGlzLnJlbmRlck5vZGVzKGRhdGEpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2JqZWN0RGF0YSA9IF9vYmplY3RQYXRoLmRlZmF1bHQuZ2V0KHRoaXMucHJvcHMuZGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lcik7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWU7XG4gICAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvcjIgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yMiA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvcjIgPSBuZXcgX3JlY3Vyc2l2ZUl0ZXJhdG9yLmRlZmF1bHQob2JqZWN0RGF0YSlbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDI7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSAoX3N0ZXAyID0gX2l0ZXJhdG9yMi5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcDIkdmFsdWUgPSBfc3RlcDIudmFsdWUsXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gX3N0ZXAyJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAyJHZhbHVlLm5vZGUsXG4gICAgICAgICAgICAgICAga2V5ID0gX3N0ZXAyJHZhbHVlLmtleSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3N0ZXAyJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICB2YXIgX3BhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcblxuICAgICAgICAgICAgICBfb2JqZWN0UGF0aC5kZWZhdWx0LnNldChvYmplY3REYXRhLCBfcGF0aFN0cmluZywgX3BhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IyID0gdHJ1ZTtcbiAgICAgICAgICBfaXRlcmF0b3JFcnJvcjIgPSBlcnI7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgJiYgX2l0ZXJhdG9yMi5yZXR1cm4gIT0gbnVsbCkge1xuICAgICAgICAgICAgICBfaXRlcmF0b3IyLnJldHVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IyKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaDNcIiwgbnVsbCwgXCJTZWxlY3QgdGl0bGUgYW5kIGNvbnRlbnQgZmllbGRzXCIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgdGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBEYXRhTGlzdDtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRGF0YUxpc3Q7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0xpc3RJdGVtXCI6NyxcIm9iamVjdC1wYXRoXCI6MSxcInJlY3Vyc2l2ZS1pdGVyYXRvclwiOjJ9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0RhdGFMaXN0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9EYXRhTGlzdFwiKSk7XG5cbnZhciBfZ2V0QXBpRGF0YSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbnZhciBGaWVsZFNlbGVjdGlvbiA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoRmllbGRTZWxlY3Rpb24sIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIEZpZWxkU2VsZWN0aW9uKHByb3BzKSB7XG4gICAgdmFyIF90aGlzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEZpZWxkU2VsZWN0aW9uKTtcblxuICAgIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKEZpZWxkU2VsZWN0aW9uKS5jYWxsKHRoaXMsIHByb3BzKSk7XG4gICAgX3RoaXMuc3RhdGUgPSB7XG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgIGl0ZW1zOiBbXVxuICAgIH07XG4gICAgX3RoaXMudXBkYXRlRmllbGRNYXAgPSBfdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRmllbGRTZWxlY3Rpb24sIFt7XG4gICAga2V5OiBcInVwZGF0ZUZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0RGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXREYXRhKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciB1cmwgPSB0aGlzLnByb3BzLnVybDtcbiAgICAgICgwLCBfZ2V0QXBpRGF0YS5kZWZhdWx0KSh1cmwpLnRoZW4oZnVuY3Rpb24gKF9yZWYpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IF9yZWYucmVzdWx0O1xuXG4gICAgICAgIGlmICghcmVzdWx0IHx8IE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICAgIGVycm9yOiBFcnJvcignQ291bGQgbm90IGZldGNoIGRhdGEgZnJvbSBVUkwuJyksXG4gICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICBpdGVtczogcmVzdWx0XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKF9yZWYyKSB7XG4gICAgICAgIHZhciBlcnJvciA9IF9yZWYyLmVycm9yO1xuXG4gICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUgPSB0aGlzLnN0YXRlLFxuICAgICAgICAgIGVycm9yID0gX3RoaXMkc3RhdGUuZXJyb3IsXG4gICAgICAgICAgaXNMb2FkZWQgPSBfdGhpcyRzdGF0ZS5pc0xvYWRlZCxcbiAgICAgICAgICBpdGVtcyA9IF90aGlzJHN0YXRlLml0ZW1zO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgXCJFcnJvcjogXCIsIGVycm9yLm1lc3NhZ2UpKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwic3Bpbm5lciBpcy1hY3RpdmVcIlxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KF9EYXRhTGlzdC5kZWZhdWx0LCB7XG4gICAgICAgICAgZGF0YTogaXRlbXMsXG4gICAgICAgICAgdXJsOiB0aGlzLnByb3BzLnVybCxcbiAgICAgICAgICBmaWVsZE1hcDogdGhpcy5wcm9wcy5maWVsZE1hcCxcbiAgICAgICAgICB1cGRhdGVGaWVsZE1hcDogdGhpcy51cGRhdGVGaWVsZE1hcFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRmllbGRTZWxlY3Rpb247XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IEZpZWxkU2VsZWN0aW9uO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGFcIjoxMSxcIi4vRGF0YUxpc3RcIjo0fV0sNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gSW5wdXRGaWVsZHMocHJvcHMpIHtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcImhpZGRlblwiLFxuICAgIG5hbWU6IFwibW9kX2pzb25fcmVuZGVyX3VybFwiLFxuICAgIHZhbHVlOiBwcm9wcy51cmxcbiAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiLFxuICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShwcm9wcy5maWVsZE1hcClcbiAgfSkpO1xufVxuXG52YXIgX2RlZmF1bHQgPSBJbnB1dEZpZWxkcztcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XSw3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBMaXN0SXRlbShwcm9wcykge1xuICB2YXIgdmFsdWUgPSBwcm9wcy52YWx1ZSxcbiAgICAgIGNoaWxkcmVuID0gcHJvcHMuY2hpbGRyZW4sXG4gICAgICBmaWVsZE1hcCA9IHByb3BzLmZpZWxkTWFwLFxuICAgICAgb2JqZWN0ID0gcHJvcHMub2JqZWN0LFxuICAgICAgb25DbGlja1RpdGxlID0gcHJvcHMub25DbGlja1RpdGxlLFxuICAgICAgb25DbGlja0NvbnRlbnQgPSBwcm9wcy5vbkNsaWNrQ29udGVudCxcbiAgICAgIG9uQ2xpY2tDb250YWluZXIgPSBwcm9wcy5vbkNsaWNrQ29udGFpbmVyO1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIG51bGwsIGZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgJiYgZmllbGRNYXAudGl0bGUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiVGl0bGU6IFwiKSA6ICcnLCBmaWVsZE1hcC5jb250ZW50ID09PSBvYmplY3QgJiYgZmllbGRNYXAuY29udGVudCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJDb250ZW50OiBcIikgOiAnJywgY2hpbGRyZW4gPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHZhbHVlKSA6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgIWNoaWxkcmVuICYmICFmaWVsZE1hcC50aXRsZSAmJiBmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiBcIiNcIixcbiAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiLFxuICAgIFwiZGF0YS1maWVsZFwiOiBcInRpdGxlXCIsXG4gICAgb25DbGljazogb25DbGlja1RpdGxlXG4gIH0sIFwiVGl0bGVcIikgOiAnJywgIWNoaWxkcmVuICYmIGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QgJiYgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiBcIiNcIixcbiAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiLFxuICAgIFwiZGF0YS1maWVsZFwiOiBcImNvbnRlbnRcIixcbiAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGVudFxuICB9LCBcIkNvbnRlbnRcIikgOiAnJywgY2hpbGRyZW4gJiYgQXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgaHJlZjogXCIjXCIsXG4gICAgY2xhc3NOYW1lOiBcImJ1dHRvbiBidXR0b24tc21hbGxcIixcbiAgICBcImRhdGEtZmllbGRcIjogXCJpdGVtQ29udGFpbmVyXCIsXG4gICAgb25DbGljazogb25DbGlja0NvbnRhaW5lclxuICB9LCBcIlNlbGVjdFwiKSA6ICcnLCBjaGlsZHJlbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICBjbGFzc05hbWU6IFwiZGFzaGljb25zIGRhc2hpY29ucy1hcnJvdy1kb3duXCJcbiAgfSkgOiAnJywgY2hpbGRyZW4gPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwge1xuICAgIGNsYXNzTmFtZTogXCJzdWItb2JqZWN0XCJcbiAgfSwgY2hpbGRyZW4pIDogJycpO1xufVxuXG52YXIgX2RlZmF1bHQgPSBMaXN0SXRlbTtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XSw4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0ZpZWxkU2VsZWN0aW9uID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9GaWVsZFNlbGVjdGlvblwiKSk7XG5cbnZhciBfSW5wdXRGaWVsZHMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0lucHV0RmllbGRzXCIpKTtcblxudmFyIF9TdW1tYXJ5ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9TdW1tYXJ5XCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbnZhciBpbml0aWFsU3RhdGUgPSB7XG4gIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gIHVybDogJycsXG4gIGZpZWxkTWFwOiB7XG4gICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICB0aXRsZTogJycsXG4gICAgY29udGVudDogJydcbiAgfVxufTtcblxudmFyIFNldHRpbmdzID1cbi8qI19fUFVSRV9fKi9cbmZ1bmN0aW9uIChfUmVhY3QkQ29tcG9uZW50KSB7XG4gIF9pbmhlcml0cyhTZXR0aW5ncywgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgZnVuY3Rpb24gU2V0dGluZ3MocHJvcHMpIHtcbiAgICB2YXIgX3RoaXM7XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU2V0dGluZ3MpO1xuXG4gICAgX3RoaXMgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCBfZ2V0UHJvdG90eXBlT2YoU2V0dGluZ3MpLmNhbGwodGhpcywgcHJvcHMpKTtcbiAgICBfdGhpcy5zdGF0ZSA9IGluaXRpYWxTdGF0ZTtcbiAgICBfdGhpcy51cmxDaGFuZ2UgPSBfdGhpcy51cmxDaGFuZ2UuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMuaGFuZGxlU3VibWl0ID0gX3RoaXMuaGFuZGxlU3VibWl0LmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIF90aGlzLnJlc2V0T3B0aW9ucyA9IF90aGlzLnJlc2V0T3B0aW9ucy5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICBfdGhpcy51cGRhdGVGaWVsZE1hcCA9IF90aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIHJldHVybiBfdGhpcztcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhTZXR0aW5ncywgW3tcbiAgICBrZXk6IFwiY29tcG9uZW50RGlkTW91bnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICB0aGlzLmluaXRPcHRpb25zKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImluaXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGluaXRPcHRpb25zKCkge1xuICAgICAgaWYgKHR5cGVvZiBtb2RKc29uUmVuZGVyLm9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gbW9kSnNvblJlbmRlci5vcHRpb25zO1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7XG4gICAgICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwidXJsQ2hhbmdlXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVybENoYW5nZShldmVudCkge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIHVybDogZXZlbnQudGFyZ2V0LnZhbHVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiaGFuZGxlU3VibWl0XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGhhbmRsZVN1Ym1pdChldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZXNldE9wdGlvbnNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5zZXRTdGF0ZShpbml0aWFsU3RhdGUpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdmFyIG5ld1ZhbCA9IE9iamVjdC5hc3NpZ24odGhpcy5zdGF0ZS5maWVsZE1hcCwgdmFsdWUpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGZpZWxkTWFwOiBuZXdWYWxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb24gPSBfdGhpcyRzdGF0ZS5zaG93RmllbGRTZWxlY3Rpb24sXG4gICAgICAgICAgdXJsID0gX3RoaXMkc3RhdGUudXJsO1xuICAgICAgdmFyIF90aGlzJHN0YXRlJGZpZWxkTWFwID0gdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICBpdGVtQ29udGFpbmVyID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuaXRlbUNvbnRhaW5lcixcbiAgICAgICAgICB0aXRsZSA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLnRpdGxlLFxuICAgICAgICAgIGNvbnRlbnQgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC5jb250ZW50O1xuXG4gICAgICBpZiAodXJsICYmIGl0ZW1Db250YWluZXIgIT09IG51bGwgJiYgdGl0bGUgJiYgY29udGVudCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9TdW1tYXJ5LmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgICAgIG9uQ2xpY2s6IHRoaXMucmVzZXRPcHRpb25zLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCBcIlJlc2V0IHNldHRpbmdzXCIpKTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0ZpZWxkU2VsZWN0aW9uLmRlZmF1bHQsIHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBmaWVsZE1hcDogdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICB1cGRhdGVGaWVsZE1hcDogdGhpcy51cGRhdGVGaWVsZE1hcFxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucyxcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uXCJcbiAgICAgICAgfSwgXCJSZXNldCBzZXR0aW5nc1wiKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcIndyYXBcIlxuICAgICAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiLCB7XG4gICAgICAgICAgb25TdWJtaXQ6IHRoaXMuaGFuZGxlU3VibWl0XG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiRGF0YSBzb3VyY2VcIikpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnJcIiwgbnVsbCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIG51bGwsIFwiRW50ZXIgYSB2YWxpZCBKU09OIGFwaSB1cmwuXCIpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICBjbGFzc05hbWU6IFwidXJsLWlucHV0XCIsXG4gICAgICAgICAgdmFsdWU6IHVybCxcbiAgICAgICAgICBvbkNoYW5nZTogdGhpcy51cmxDaGFuZ2VcbiAgICAgICAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgICAgICAgdHlwZTogXCJzdWJtaXRcIixcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIsXG4gICAgICAgICAgdmFsdWU6IFwiU3VibWl0XCJcbiAgICAgICAgfSkpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSkpO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBTZXR0aW5ncztcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gU2V0dGluZ3M7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0ZpZWxkU2VsZWN0aW9uXCI6NSxcIi4vSW5wdXRGaWVsZHNcIjo2LFwiLi9TdW1tYXJ5XCI6OX1dLDk6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIFN1bW1hcnkocHJvcHMpIHtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgXCJEYXRhIHNvdXJjZTogXCIsIHByb3BzLnVybCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBcIlRpdGxlOiBcIiwgcHJvcHMuZmllbGRNYXAudGl0bGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgXCJDb250ZW50OiBcIiwgcHJvcHMuZmllbGRNYXAuY29udGVudCkpO1xufVxuXG52YXIgX2RlZmF1bHQgPSBTdW1tYXJ5O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDEwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX1NldHRpbmdzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9Db21wb25lbnRzL1NldHRpbmdzXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xudmFyIGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5SZWFjdERPTS5yZW5kZXIoUmVhY3QuY3JlYXRlRWxlbWVudChfU2V0dGluZ3MuZGVmYXVsdCwgbnVsbCksIGRvbUVsZW1lbnQpO1xuXG59LHtcIi4vQ29tcG9uZW50cy9TZXR0aW5nc1wiOjh9XSwxMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gZ2V0QXBpRGF0YSh1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybCkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN1bHQ6IHJlc3VsdFxuICAgIH07XG4gIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjogZXJyb3JcbiAgICB9O1xuICB9KTtcbn1cblxudmFyIF9kZWZhdWx0ID0gZ2V0QXBpRGF0YTtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XX0se30sWzEwXSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmIySnFaV04wTFhCaGRHZ3ZhVzVrWlhndWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmNtVmpkWEp6YVhabExXbDBaWEpoZEc5eUwzTnlZeTlTWldOMWNuTnBkbVZKZEdWeVlYUnZjaTVxY3lJc0ltNXZaR1ZmYlc5a2RXeGxjeTl5WldOMWNuTnBkbVV0YVhSbGNtRjBiM0l2YzNKakwyeGhibWN1YW5NaUxDSnpiM1Z5WTJVdmFuTXZRV1J0YVc0dlEyOXRjRzl1Wlc1MGN5OUVZWFJoVEdsemRDNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlEYjIxd2IyNWxiblJ6TDBacFpXeGtVMlZzWldOMGFXOXVMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlNXNXdkWFJHYVdWc1pITXVhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5TWFYTjBTWFJsYlM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMU5sZEhScGJtZHpMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlUzVnRiV0Z5ZVM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOUpibVJsZUVGa2JXbHVMbXB6SWl3aWMyOTFjbU5sTDJwekwxVjBhV3hwZEdsbGN5OW5aWFJCY0dsRVlYUmhMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVTndVMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOeVNVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPenM3T3pzN096dEJReTlFUVRzN1FVRkRRVHM3UVVGRFFUczdPenM3T3pzN096czdPenM3T3pzN096czdPenM3TzBsQlJVMHNVVHM3T3pzN1FVRkRSaXh2UWtGQldTeExRVUZhTEVWQlFXMUNPMEZCUVVFN08wRkJRVUU3TzBGQlEyWXNhMFpCUVUwc1MwRkJUanRCUVVOQkxGVkJRVXNzVjBGQlRDeEhRVUZ0UWl4TlFVRkxMRmRCUVV3c1EwRkJhVUlzU1VGQmFrSXNkVVJCUVc1Q08wRkJRMEVzVlVGQlN5eFhRVUZNTEVkQlFXMUNMRTFCUVVzc1YwRkJUQ3hEUVVGcFFpeEpRVUZxUWl4MVJFRkJia0k3UVVGSVpUdEJRVWxzUWpzN096dG5RMEZGVnl4SkxFVkJRVTBzU3l4RlFVRlBPMEZCUTNKQ0xFMUJRVUVzUzBGQlN5eERRVUZETEdOQlFVNDdRVUZEUVN4WFFVRkxMRXRCUVV3c1EwRkJWeXhqUVVGWUxIRkNRVUUwUWl4TFFVRkxMRU5CUVVNc1RVRkJUaXhEUVVGaExFOUJRV0lzUTBGQmNVSXNTMEZCYWtRc1JVRkJlVVFzU1VGQmVrUTdRVUZEU0RzN08yZERRVVZYTEVrc1JVRkJUVHRCUVVGQk96dEJRVU5rTEdGQlFVOHNUVUZCVFN4RFFVRkRMRWxCUVZBc1EwRkJXU3hKUVVGYUxFVkJRV3RDTEVkQlFXeENMRU5CUVhOQ0xGVkJRVUVzU1VGQlNTeEZRVUZKTzBGQlEycERMRmxCUVVrc1NVRkJTU3hMUVVGTExGbEJRV0lzUlVGQk1rSTdRVUZEZGtJN1FVRkRTRHM3UVVGRlJDeFpRVUZKTEV0QlFVc3NSMEZCUnl4dlFrRkJReXhwUWtGQlJEdEJRVUZWTEZWQlFVRXNSMEZCUnl4RlFVRkZMRWxCUVVrc1EwRkJReXhSUVVGTUxFVkJRV1k3UVVGRFZTeFZRVUZCTEV0QlFVc3NSVUZCUlN4SlFVUnFRanRCUVVWVkxGVkJRVUVzVFVGQlRTeEZRVUZGTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUm5SQ08wRkJSMVVzVlVGQlFTeFJRVUZSTEVWQlFVVXNUVUZCU1N4RFFVRkRMRXRCUVV3c1EwRkJWeXhSUVVndlFqdEJRVWxWTEZWQlFVRXNaMEpCUVdkQ0xFVkJRVVVzTUVKQlFVRXNRMEZCUXp0QlFVRkJMRzFDUVVGSkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUTBGQlZ5eFZRVUUxUWl4RlFVRjNReXhEUVVGNFF5eERRVUZLTzBGQlFVRXNWMEZLTjBJN1FVRkxWU3hWUVVGQkxGbEJRVmtzUlVGQlJTeHpRa0ZCUVN4RFFVRkRPMEZCUVVFc2JVSkJRVWtzVFVGQlNTeERRVUZETEZkQlFVd3NRMEZCYVVJc1NVRkJTU3hEUVVGRExFbEJRVVFzUTBGQmNrSXNSVUZCTmtJc1EwRkJOMElzUTBGQlNqdEJRVUZCTEZkQlRIcENPMEZCVFZVc1ZVRkJRU3hqUVVGakxFVkJRVVVzZDBKQlFVRXNRMEZCUXp0QlFVRkJMRzFDUVVGSkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRWEpDTEVWQlFUWkNMRU5CUVRkQ0xFTkJRVW83UVVGQlFUdEJRVTR6UWl4VlFVRmFPenRCUVZGQkxGbEJRVWtzVVVGQlR5eEpRVUZKTEVOQlFVTXNTVUZCUkN4RFFVRllMRTFCUVhOQ0xGRkJRWFJDTEVsQlFXdERMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUzBGQlpTeEpRVUZ5UkN4RlFVRXlSRHRCUVVOMlJDeFZRVUZCTEV0QlFVc3NSMEZCUnl4TFFVRkxMRU5CUVVNc1dVRkJUaXhEUVVGdFFpeExRVUZ1UWl4RlFVRXdRanRCUVVNNVFpeFpRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1QwRkJUaXhEUVVGakxFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFXeENMRWxCUVRSQ0xFMUJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUTBGQlZ5eERRVUZZTEVOQlFXcENMRU5CUVRWQ0xFZEJRVGhFTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFYSkNPMEZCUkRGRExGZEJRVEZDTEVOQlFWSTdRVUZIU0RzN1FVRkZSQ3hsUVVGUExFdEJRVkE3UVVGRFNDeFBRWEJDVFN4RFFVRlFPMEZCY1VKSU96czdOa0pCUlZFN1FVRkRUQ3hWUVVGTkxGRkJRVkVzUjBGQlJ5eExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVRTFRanRCUVVWQkxGVkJRVWtzU1VGQlNTeEhRVUZITEV0QlFVc3NTMEZCVEN4RFFVRlhMRWxCUVhSQ096dEJRVU5CTEZWQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU0c1EwRkJZeXhKUVVGa0xFTkJRVW9zUlVGQmVVSTdRVUZEY2tJc1VVRkJRU3hSUVVGUkxFTkJRVU1zWVVGQlZDeEhRVUY1UWl4RlFVRjZRanRCUVVOSU96dEJRVVZFTEZWQlFVa3NVVUZCVVN4RFFVRkRMR0ZCUVZRc1MwRkJNa0lzU1VGQkwwSXNSVUZCY1VNN1FVRkRha01zV1VGQlNTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVdRc1EwRkJTaXhGUVVGNVFqdEJRVU55UWl4VlFVRkJMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlJDeERRVUZZTzBGQlEwZzdPMEZCU0dkRE8wRkJRVUU3UVVGQlFUczdRVUZCUVR0QlFVdHFReXdyUWtGQmMwTXNTVUZCU1N3d1FrRkJTaXhEUVVGelFpeEpRVUYwUWl4RFFVRjBReXc0U0VGQmJVVTdRVUZCUVR0QlFVRkJMR2RDUVVGNlJDeE5RVUY1UkN4bFFVRjZSQ3hOUVVGNVJEdEJRVUZCTEdkQ1FVRnFSQ3hKUVVGcFJDeGxRVUZxUkN4SlFVRnBSRHRCUVVGQkxHZENRVUV6UXl4SFFVRXlReXhsUVVFelF5eEhRVUV5UXp0QlFVRkJMR2RDUVVGMFF5eEpRVUZ6UXl4bFFVRjBReXhKUVVGelF6czdRVUZETDBRc1owSkJRVWtzVVVGQlR5eEpRVUZRTEUxQlFXZENMRkZCUVdoQ0xFbEJRVFJDTEVsQlFVa3NTMEZCU3l4SlFVRjZReXhGUVVFclF6dEJRVU16UXl4clFrRkJTU3hWUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVd3NRMEZCVlN4SFFVRldMRU5CUVdwQ096dEJRVU5CTEd0RFFVRlhMRWRCUVZnc1EwRkJaU3hKUVVGbUxFVkJRWEZDTEZWQlFWVXNSMEZCUnl4aFFVRnNReXhGUVVGcFJDeFZRVUZxUkR0QlFVTklPMEZCUTBvN1FVRldaME03UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVRzN1FVRlpha01zWlVGRFNTeHBRMEZEU1N4NVJFRkVTaXhGUVVWSkxHZERRVUZMTEV0QlFVc3NWMEZCVEN4RFFVRnBRaXhKUVVGcVFpeERRVUZNTEVOQlJrb3NRMEZFU2p0QlFVMUlMRTlCYkVKRUxFMUJhMEpQTzBGQlEwZ3NXVUZCU1N4VlFVRlZMRWRCUVVjc2IwSkJRVmNzUjBGQldDeERRVUZsTEV0QlFVc3NTMEZCVEN4RFFVRlhMRWxCUVRGQ0xFVkJRV2RETEZGQlFWRXNRMEZCUXl4aFFVRjZReXhEUVVGcVFqczdRVUZGUVN4WlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGT0xFTkJRV01zVlVGQlpDeERRVUZLTEVWQlFTdENPMEZCUXpOQ0xGVkJRVUVzVlVGQlZTeEhRVUZITEZWQlFWVXNRMEZCUXl4RFFVRkVMRU5CUVhaQ08wRkJRMGc3TzBGQlRFVTdRVUZCUVR0QlFVRkJPenRCUVVGQk8wRkJUMGdzWjBOQlFYTkRMRWxCUVVrc01FSkJRVW9zUTBGQmMwSXNWVUZCZEVJc1EwRkJkRU1zYlVsQlFYbEZPMEZCUVVFN1FVRkJRU3huUWtGQkwwUXNUVUZCSzBRc1owSkJRUzlFTEUxQlFTdEVPMEZCUVVFc1owSkJRWFpFTEVsQlFYVkVMR2RDUVVGMlJDeEpRVUYxUkR0QlFVRkJMR2RDUVVGcVJDeEhRVUZwUkN4blFrRkJha1FzUjBGQmFVUTdRVUZCUVN4blFrRkJOVU1zU1VGQk5FTXNaMEpCUVRWRExFbEJRVFJET3p0QlFVTnlSU3huUWtGQlNTeFJRVUZQTEVsQlFWQXNUVUZCWjBJc1VVRkJjRUlzUlVGQk9FSTdRVUZETVVJc2EwSkJRVWtzVjBGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRk1MRU5CUVZVc1IwRkJWaXhEUVVGcVFqczdRVUZEUVN4clEwRkJWeXhIUVVGWUxFTkJRV1VzVlVGQlppeEZRVUV5UWl4WFFVRXpRaXhGUVVGMVF5eFhRVUYyUXp0QlFVTklPMEZCUTBvN1FVRmFSVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCT3p0QlFXTklMR1ZCUTBrc2FVTkJRMGtzYTBWQlJFb3NSVUZGU1N4blEwRkJTeXhMUVVGTExGZEJRVXdzUTBGQmFVSXNWVUZCYWtJc1EwRkJUQ3hEUVVaS0xFTkJSRW83UVVGTlNEdEJRVU5LT3pzN08wVkJia1pyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUZ6Um1Rc1VUczdPenM3T3pzN096czdRVU14Um1ZN08wRkJRMEU3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN1NVRkZUU3hqT3pzN096dEJRVU5HTERCQ1FVRlpMRXRCUVZvc1JVRkJiVUk3UVVGQlFUczdRVUZCUVRzN1FVRkRaaXgzUmtGQlRTeExRVUZPTzBGQlEwRXNWVUZCU3l4TFFVRk1MRWRCUVdFN1FVRkRWQ3hOUVVGQkxFdEJRVXNzUlVGQlJTeEpRVVJGTzBGQlJWUXNUVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkdSRHRCUVVkVUxFMUJRVUVzUzBGQlN5eEZRVUZGTzBGQlNFVXNTMEZCWWp0QlFVMUJMRlZCUVVzc1kwRkJUQ3hIUVVGelFpeE5RVUZMTEdOQlFVd3NRMEZCYjBJc1NVRkJjRUlzZFVSQlFYUkNPMEZCVW1VN1FVRlRiRUk3T3pzN2JVTkJSV01zU3l4RlFVRlBPMEZCUTJ4Q0xGZEJRVXNzUzBGQlRDeERRVUZYTEdOQlFWZ3NRMEZCTUVJc1MwRkJNVUk3UVVGRFNEczdPemhDUVVWVE8wRkJRVUU3TzBGQlFVRXNWVUZEUXl4SFFVUkVMRWRCUTFFc1MwRkJTeXhMUVVSaUxFTkJRME1zUjBGRVJEdEJRVVZPTEN0Q1FVRlhMRWRCUVZnc1JVRkRTeXhKUVVSTUxFTkJSVkVzWjBKQlFXTTdRVUZCUVN4WlFVRmFMRTFCUVZrc1VVRkJXaXhOUVVGWk96dEJRVU5XTEZsQlFVa3NRMEZCUXl4TlFVRkVMRWxCUVZjc1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeE5RVUZhTEVWQlFXOUNMRTFCUVhCQ0xFdEJRU3RDTEVOQlFUbERMRVZCUVdsRU8wRkJRemRETEZWQlFVRXNUVUZCU1N4RFFVRkRMRkZCUVV3c1EwRkJZenRCUVVOV0xGbEJRVUVzUzBGQlN5eEZRVUZGTEV0QlFVc3NRMEZCUXl4blEwRkJSQ3hEUVVSR08wRkJSVllzV1VGQlFTeFJRVUZSTEVWQlFVVTdRVUZHUVN4WFFVRmtPenRCUVVsQk8wRkJRMGc3TzBGQlEwUXNVVUZCUVN4TlFVRkpMRU5CUVVNc1VVRkJUQ3hEUVVGak8wRkJRVU1zVlVGQlFTeFJRVUZSTEVWQlFVVXNTVUZCV0R0QlFVRnBRaXhWUVVGQkxFdEJRVXNzUlVGQlJUdEJRVUY0UWl4VFFVRmtPMEZCUTBnc1QwRllWQ3hGUVZkWExHbENRVUZoTzBGQlFVRXNXVUZCV0N4TFFVRlhMRk5CUVZnc1MwRkJWenM3UVVGRFdpeFJRVUZCTEUxQlFVa3NRMEZCUXl4UlFVRk1MRU5CUVdNN1FVRkJReXhWUVVGQkxGRkJRVkVzUlVGQlJTeEpRVUZZTzBGQlFXbENMRlZCUVVFc1MwRkJTeXhGUVVGTU8wRkJRV3BDTEZOQlFXUTdRVUZEU0N4UFFXSlVPMEZCWlVnN096dDNRMEZGYlVJN1FVRkRhRUlzVjBGQlN5eFBRVUZNTzBGQlEwZzdPenMyUWtGRlVUdEJRVUZCTEhkQ1FVTTBRaXhMUVVGTExFdEJSR3BETzBGQlFVRXNWVUZEUlN4TFFVUkdMR1ZCUTBVc1MwRkVSanRCUVVGQkxGVkJRMU1zVVVGRVZDeGxRVU5UTEZGQlJGUTdRVUZCUVN4VlFVTnRRaXhMUVVSdVFpeGxRVU50UWl4TFFVUnVRanM3UVVGRlRDeFZRVUZKTEV0QlFVb3NSVUZCVnp0QlFVTlFMR1ZCUVU4c2FVTkJRVXNzTUVOQlFWY3NTMEZCU3l4RFFVRkRMRTlCUVdwQ0xFTkJRVXdzUTBGQlVEdEJRVU5JTEU5QlJrUXNUVUZGVHl4SlFVRkpMRU5CUVVNc1VVRkJUQ3hGUVVGbE8wRkJRMnhDTEdWQlFVODdRVUZCU3l4VlFVRkJMRk5CUVZNc1JVRkJRenRCUVVGbUxGVkJRVkE3UVVGRFNDeFBRVVpOTEUxQlJVRTdRVUZEU0N4bFFVRlBMRzlDUVVGRExHbENRVUZFTzBGQlEwZ3NWVUZCUVN4SlFVRkpMRVZCUVVVc1MwRkVTRHRCUVVWSUxGVkJRVUVzUjBGQlJ5eEZRVUZGTEV0QlFVc3NTMEZCVEN4RFFVRlhMRWRCUm1JN1FVRkhTQ3hWUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVaHNRanRCUVVsSUxGVkJRVUVzWTBGQll5eEZRVUZGTEV0QlFVczdRVUZLYkVJc1ZVRkJVRHRCUVV0SU8wRkJRMG83T3pzN1JVRndSSGRDTEV0QlFVc3NRMEZCUXl4VE96dGxRWFZFY0VJc1l6czdPenM3T3pzN096czdRVU14UkdZc1UwRkJVeXhYUVVGVUxFTkJRWEZDTEV0QlFYSkNMRVZCUVRSQ08wRkJRM2hDTEZOQlEwa3NhVU5CUTBrN1FVRkJUeXhKUVVGQkxFbEJRVWtzUlVGQlF5eFJRVUZhTzBGQlFYRkNMRWxCUVVFc1NVRkJTU3hGUVVGRExIRkNRVUV4UWp0QlFVRm5SQ3hKUVVGQkxFdEJRVXNzUlVGQlJTeExRVUZMTEVOQlFVTTdRVUZCTjBRc1NVRkVTaXhGUVVWSk8wRkJRVThzU1VGQlFTeEpRVUZKTEVWQlFVTXNVVUZCV2p0QlFVRnhRaXhKUVVGQkxFbEJRVWtzUlVGQlF5d3dRa0ZCTVVJN1FVRkJjVVFzU1VGQlFTeExRVUZMTEVWQlFVVXNTVUZCU1N4RFFVRkRMRk5CUVV3c1EwRkJaU3hMUVVGTExFTkJRVU1zVVVGQmNrSTdRVUZCTlVRc1NVRkdTaXhEUVVSS08wRkJUVWc3TzJWQlJXTXNWenM3T3pzN096czdPenM3UVVOVVppeFRRVUZUTEZGQlFWUXNRMEZCYTBJc1MwRkJiRUlzUlVGQmVVSTdRVUZCUVN4TlFVTmtMRXRCUkdNc1IwRkRkVVVzUzBGRWRrVXNRMEZEWkN4TFFVUmpPMEZCUVVFc1RVRkRVQ3hSUVVSUExFZEJRM1ZGTEV0QlJIWkZMRU5CUTFBc1VVRkVUenRCUVVGQkxFMUJRMGNzVVVGRVNDeEhRVU4xUlN4TFFVUjJSU3hEUVVOSExGRkJSRWc3UVVGQlFTeE5RVU5oTEUxQlJHSXNSMEZEZFVVc1MwRkVka1VzUTBGRFlTeE5RVVJpTzBGQlFVRXNUVUZEY1VJc1dVRkVja0lzUjBGRGRVVXNTMEZFZGtVc1EwRkRjVUlzV1VGRWNrSTdRVUZCUVN4TlFVTnRReXhqUVVSdVF5eEhRVU4xUlN4TFFVUjJSU3hEUVVOdFF5eGpRVVJ1UXp0QlFVRkJMRTFCUTIxRUxHZENRVVJ1UkN4SFFVTjFSU3hMUVVSMlJTeERRVU50UkN4blFrRkVia1E3UVVGRmNrSXNVMEZCVVN4blEwRkRTQ3hSUVVGUkxFTkJRVU1zUzBGQlZDeExRVUZ0UWl4TlFVRnVRaXhKUVVFMlFpeFJRVUZSTEVOQlFVTXNTMEZCZEVNc1IwRkJLME1zT0VOQlFTOURMRWRCUVRCRkxFVkJSSFpGTEVWQlJVZ3NVVUZCVVN4RFFVRkRMRTlCUVZRc1MwRkJjVUlzVFVGQmNrSXNTVUZCSzBJc1VVRkJVU3hEUVVGRExFOUJRWGhETEVkQlFXdEVMR2RFUVVGc1JDeEhRVUVyUlN4RlFVWTFSU3hGUVVkSUxGRkJRVkVzUjBGQlJ5eHZRMEZCVXl4TFFVRlVMRU5CUVVnc1IwRkJPRUlzYTBOQlFVOHNTMEZCVUN4RFFVaHVReXhGUVVsSUxFTkJRVU1zVVVGQlJDeEpRVUZoTEVOQlFVTXNVVUZCVVN4RFFVRkRMRXRCUVhaQ0xFbEJRV2xETEZGQlFWRXNRMEZCUXl4UFFVRlVMRXRCUVhGQ0xFMUJRWFJFTEVsQlFXbEZMRkZCUVZFc1EwRkJReXhoUVVGVUxFdEJRVEpDTEVsQlFUVkdMRWRCUTBjN1FVRkJSeXhKUVVGQkxFbEJRVWtzUlVGQlF5eEhRVUZTTzBGQlFWa3NTVUZCUVN4VFFVRlRMRVZCUVVNc2NVSkJRWFJDTzBGQlFUUkRMR3RDUVVGWExFOUJRWFpFTzBGQlFTdEVMRWxCUVVFc1QwRkJUeXhGUVVGRk8wRkJRWGhGTEdGQlJFZ3NSMEZEY1Vjc1JVRk1iRWNzUlVGTlNDeERRVUZETEZGQlFVUXNTVUZCWXl4UlFVRlJMRU5CUVVNc1MwRkJWQ3hMUVVGdFFpeE5RVUZxUXl4SlFVRTBReXhEUVVGRExGRkJRVkVzUTBGQlF5eFBRVUYwUkN4SlFVRnBSU3hSUVVGUkxFTkJRVU1zWVVGQlZDeExRVUV5UWl4SlFVRTFSaXhIUVVOSE8wRkJRVWNzU1VGQlFTeEpRVUZKTEVWQlFVTXNSMEZCVWp0QlFVRlpMRWxCUVVFc1UwRkJVeXhGUVVGRExIRkNRVUYwUWp0QlFVRTBReXhyUWtGQlZ5eFRRVUYyUkR0QlFVTkhMRWxCUVVFc1QwRkJUeXhGUVVGRk8wRkJSRm9zWlVGRVNDeEhRVVUyUXl4RlFWSXhReXhGUVZOSUxGRkJRVkVzU1VGQlNTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRTFCUVdRc1EwRkJXaXhKUVVGeFF5eFJRVUZSTEVOQlFVTXNZVUZCVkN4TFFVRXlRaXhKUVVGb1JTeEhRVU5ITzBGQlFVY3NTVUZCUVN4SlFVRkpMRVZCUVVNc1IwRkJVanRCUVVGWkxFbEJRVUVzVTBGQlV5eEZRVUZETEhGQ1FVRjBRanRCUVVFMFF5eHJRa0ZCVnl4bFFVRjJSRHRCUVVOSExFbEJRVUVzVDBGQlR5eEZRVUZGTzBGQlJGb3NZMEZFU0N4SFFVVTRReXhGUVZnelF5eEZRVmxJTEZGQlFWRXNSMEZCUnp0QlFVRk5MRWxCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV2hDTEVsQlFVZ3NSMEZCT0VRc1JVRmFia1VzUlVGaFNDeFJRVUZSTEVkQlFVYzdRVUZCU1N4SlFVRkJMRk5CUVZNc1JVRkJRenRCUVVGa0xFdEJRVFJDTEZGQlFUVkNMRU5CUVVnc1IwRkJaMFFzUlVGaWNrUXNRMEZCVWp0QlFXVklPenRsUVVWakxGRTdPenM3T3pzN096czdPMEZEYmtKbU96dEJRVU5CT3p0QlFVTkJPenM3T3pzN096czdPenM3T3pzN096czdPenM3TzBGQlJVRXNTVUZCVFN4WlFVRlpMRWRCUVVjN1FVRkRha0lzUlVGQlFTeHJRa0ZCYTBJc1JVRkJSU3hMUVVSSU8wRkJSV3BDTEVWQlFVRXNSMEZCUnl4RlFVRkZMRVZCUmxrN1FVRkhha0lzUlVGQlFTeFJRVUZSTEVWQlFVVTdRVUZEVGl4SlFVRkJMR0ZCUVdFc1JVRkJSU3hKUVVSVU8wRkJSVTRzU1VGQlFTeExRVUZMTEVWQlFVVXNSVUZHUkR0QlFVZE9MRWxCUVVFc1QwRkJUeXhGUVVGRk8wRkJTRWc3UVVGSVR5eERRVUZ5UWpzN1NVRlZUU3hST3pzN096dEJRVU5HTEc5Q1FVRlpMRXRCUVZvc1JVRkJiVUk3UVVGQlFUczdRVUZCUVRzN1FVRkRaaXhyUmtGQlRTeExRVUZPTzBGQlEwRXNWVUZCU3l4TFFVRk1MRWRCUVdFc1dVRkJZanRCUVVWQkxGVkJRVXNzVTBGQlRDeEhRVUZwUWl4TlFVRkxMRk5CUVV3c1EwRkJaU3hKUVVGbUxIVkVRVUZxUWp0QlFVTkJMRlZCUVVzc1dVRkJUQ3hIUVVGdlFpeE5RVUZMTEZsQlFVd3NRMEZCYTBJc1NVRkJiRUlzZFVSQlFYQkNPMEZCUTBFc1ZVRkJTeXhaUVVGTUxFZEJRVzlDTEUxQlFVc3NXVUZCVEN4RFFVRnJRaXhKUVVGc1FpeDFSRUZCY0VJN1FVRkRRU3hWUVVGTExHTkJRVXdzUjBGQmMwSXNUVUZCU3l4alFVRk1MRU5CUVc5Q0xFbEJRWEJDTEhWRVFVRjBRanRCUVZCbE8wRkJVV3hDT3pzN08zZERRVVZ0UWp0QlFVTm9RaXhYUVVGTExGZEJRVXc3UVVGRFNEczdPMnREUVVWaE8wRkJRMVlzVlVGQlNTeFBRVUZQTEdGQlFXRXNRMEZCUXl4UFFVRnlRaXhMUVVGcFF5eFhRVUZ5UXl4RlFVRnJSRHRCUVVNNVF5eFpRVUZOTEU5QlFVOHNSMEZCUnl4aFFVRmhMRU5CUVVNc1QwRkJPVUk3UVVGRFFTeGhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVTldMRlZCUVVFc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eEhRVUZTTEVkQlFXTXNUMEZCVHl4RFFVRkRMRWRCUVhSQ0xFZEJRVFJDTEVWQlJIWkNPMEZCUlZZc1ZVRkJRU3hSUVVGUkxFVkJRVVVzVDBGQlR5eERRVUZETEZGQlFWSXNSMEZCYlVJc1NVRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFBRVUZQTEVOQlFVTXNVVUZCYmtJc1EwRkJia0lzUjBGQmEwUTdRVUZCUXl4WlFVRkJMR0ZCUVdFc1JVRkJSU3hKUVVGb1FqdEJRVUZ6UWl4WlFVRkJMRXRCUVVzc1JVRkJSU3hGUVVFM1FqdEJRVUZwUXl4WlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVFeFF5eFhRVVpzUkR0QlFVZFdMRlZCUVVFc2EwSkJRV3RDTEVWQlFVVXNRMEZCUXl4RFFVRkRMRTlCUVU4c1EwRkJRenRCUVVod1FpeFRRVUZrTzBGQlMwZzdRVUZEU2pzN096aENRVVZUTEVzc1JVRkJUenRCUVVOaUxGZEJRVXNzVVVGQlRDeERRVUZqTzBGQlFVTXNVVUZCUVN4SFFVRkhMRVZCUVVVc1MwRkJTeXhEUVVGRExFMUJRVTRzUTBGQllUdEJRVUZ1UWl4UFFVRmtPMEZCUTBnN096dHBRMEZGV1N4TExFVkJRVTg3UVVGRGFFSXNUVUZCUVN4TFFVRkxMRU5CUVVNc1kwRkJUanRCUVVOQkxGZEJRVXNzVVVGQlRDeERRVUZqTzBGQlFVTXNVVUZCUVN4clFrRkJhMElzUlVGQlJUdEJRVUZ5UWl4UFFVRmtPMEZCUTBnN096dHBRMEZGV1N4TExFVkJRVTg3UVVGRGFFSXNUVUZCUVN4TFFVRkxMRU5CUVVNc1kwRkJUanRCUVVOQkxGZEJRVXNzVVVGQlRDeERRVUZqTEZsQlFXUTdRVUZEU0RzN08yMURRVVZqTEVzc1JVRkJUenRCUVVOc1FpeFZRVUZOTEUxQlFVMHNSMEZCUnl4TlFVRk5MRU5CUVVNc1RVRkJVQ3hEUVVGakxFdEJRVXNzUzBGQlRDeERRVUZYTEZGQlFYcENMRVZCUVcxRExFdEJRVzVETEVOQlFXWTdRVUZEUVN4WFFVRkxMRkZCUVV3c1EwRkJZenRCUVVGRExGRkJRVUVzVVVGQlVTeEZRVUZGTzBGQlFWZ3NUMEZCWkR0QlFVTklPenM3TmtKQlJWRTdRVUZCUVN4M1FrRkROa0lzUzBGQlN5eExRVVJzUXp0QlFVRkJMRlZCUTBVc2EwSkJSRVlzWlVGRFJTeHJRa0ZFUmp0QlFVRkJMRlZCUTNOQ0xFZEJSSFJDTEdWQlEzTkNMRWRCUkhSQ08wRkJRVUVzYVVOQlJXMURMRXRCUVVzc1MwRkJUQ3hEUVVGWExGRkJSamxETzBGQlFVRXNWVUZGUlN4aFFVWkdMSGRDUVVWRkxHRkJSa1k3UVVGQlFTeFZRVVZwUWl4TFFVWnFRaXgzUWtGRmFVSXNTMEZHYWtJN1FVRkJRU3hWUVVWM1FpeFBRVVo0UWl4M1FrRkZkMElzVDBGR2VFSTdPMEZCU1V3c1ZVRkJTU3hIUVVGSExFbEJRVWtzWVVGQllTeExRVUZMTEVsQlFYcENMRWxCUVdsRExFdEJRV3BETEVsQlFUQkRMRTlCUVRsRExFVkJRWFZFTzBGQlEyNUVMR1ZCUTBrc2FVTkJRMGtzYjBKQlFVTXNaMEpCUVVRc1JVRkJZU3hMUVVGTExFdEJRV3hDTEVOQlJFb3NSVUZGU1N4dlFrRkJReXh2UWtGQlJDeEZRVUZwUWl4TFFVRkxMRXRCUVhSQ0xFTkJSa29zUlVGSFNUdEJRVUZITEZWQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hWUVVGQkxFOUJRVThzUlVGQlJTeExRVUZMTEZsQlFURkNPMEZCUVhkRExGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFXeEVMRFJDUVVoS0xFTkJSRW83UVVGUFNDeFBRVkpFTEUxQlVVOHNTVUZCU1N4clFrRkJTaXhGUVVGM1FqdEJRVU16UWl4bFFVTkpMR2xEUVVOSkxHOUNRVUZETEhWQ1FVRkVPMEZCUVdkQ0xGVkJRVUVzUjBGQlJ5eEZRVUZGTEVkQlFYSkNPMEZCUVRCQ0xGVkJRVUVzVVVGQlVTeEZRVUZGTEV0QlFVc3NTMEZCVEN4RFFVRlhMRkZCUVM5RE8wRkJRWGxFTEZWQlFVRXNZMEZCWXl4RlFVRkZMRXRCUVVzN1FVRkJPVVVzVlVGRVNpeEZRVVZKTEc5Q1FVRkRMRzlDUVVGRUxFVkJRV2xDTEV0QlFVc3NTMEZCZEVJc1EwRkdTaXhGUVVkSk8wRkJRVWNzVlVGQlFTeEpRVUZKTEVWQlFVTXNSMEZCVWp0QlFVRlpMRlZCUVVFc1QwRkJUeXhGUVVGRkxFdEJRVXNzV1VGQk1VSTdRVUZCZDBNc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQmJFUXNORUpCU0Vvc1EwRkVTanRCUVU5SUxFOUJVazBzVFVGUlFUdEJRVU5JTEdWQlEwazdRVUZCU3l4VlFVRkJMRk5CUVZNc1JVRkJRenRCUVVGbUxGZEJRMGs3UVVGQlRTeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxPMEZCUVhKQ0xGZEJRMGtzSzBKQlEwa3NiVU5CUTBrc2EwUkJSRW9zUTBGRVNpeEZRVWxKTEN0Q1FVcEtMRVZCUzBrc05rUkJURW9zUTBGRVNpeEZRVkZKTzBGQlFVOHNWVUZCUVN4SlFVRkpMRVZCUVVNc1RVRkJXanRCUVVGdFFpeFZRVUZCTEZOQlFWTXNSVUZCUXl4WFFVRTNRanRCUVVGNVF5eFZRVUZCTEV0QlFVc3NSVUZCUlN4SFFVRm9SRHRCUVVGeFJDeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxPMEZCUVhCRkxGVkJVa29zUlVGVFNTd3JRa0ZCUnp0QlFVRlBMRlZCUVVFc1NVRkJTU3hGUVVGRExGRkJRVm83UVVGQmNVSXNWVUZCUVN4VFFVRlRMRVZCUVVNc2RVSkJRUzlDTzBGQlFYVkVMRlZCUVVFc1MwRkJTeXhGUVVGRE8wRkJRVGRFTEZWQlFVZ3NRMEZVU2l4RFFVUktMRVZCV1Vrc2IwSkJRVU1zYjBKQlFVUXNSVUZCYVVJc1MwRkJTeXhMUVVGMFFpeERRVnBLTEVOQlJFbzdRVUZuUWtnN1FVRkRTanM3T3p0RlFXNUdhMElzUzBGQlN5eERRVUZETEZNN08yVkJjMFprTEZFN096czdPenM3T3pzN08wRkRjRWRtTEZOQlFWTXNUMEZCVkN4RFFVRnBRaXhMUVVGcVFpeEZRVUYzUWp0QlFVTndRaXhUUVVOSkxHZERRVU5KTEdsRVFVRnJRaXhMUVVGTExFTkJRVU1zUjBGQmVFSXNRMEZFU2l4RlFVVkpMREpEUVVGWkxFdEJRVXNzUTBGQlF5eFJRVUZPTEVOQlFXVXNTMEZCTTBJc1EwRkdTaXhGUVVkSkxEWkRRVUZqTEV0QlFVc3NRMEZCUXl4UlFVRk9MRU5CUVdVc1QwRkJOMElzUTBGSVNpeERRVVJLTzBGQlQwZzdPMlZCUldNc1R6czdPenM3TzBGRFZtWTdPenM3UVVGRlFTeEpRVUZOTEc5Q1FVRnZRaXhIUVVGSExIZENRVUUzUWp0QlFVTkJMRWxCUVUwc1ZVRkJWU3hIUVVGSExGRkJRVkVzUTBGQlF5eGpRVUZVTEVOQlFYZENMRzlDUVVGNFFpeERRVUZ1UWp0QlFVVkJMRkZCUVZFc1EwRkJReXhOUVVGVUxFTkJRMGtzYjBKQlFVTXNhVUpCUVVRc1QwRkVTaXhGUVVWSkxGVkJSa283T3pzN096czdPenM3UVVOTVFTeFRRVUZUTEZWQlFWUXNRMEZCYjBJc1IwRkJjRUlzUlVGQmVVSTdRVUZEY2tJc1UwRkJUeXhMUVVGTExFTkJRVU1zUjBGQlJDeERRVUZNTEVOQlEwWXNTVUZFUlN4RFFVTkhMRlZCUVVFc1IwRkJSenRCUVVGQkxGZEJRVWtzUjBGQlJ5eERRVUZETEVsQlFVb3NSVUZCU2p0QlFVRkJMRWRCUkU0c1JVRkZSaXhKUVVaRkxFTkJSME1zVlVGQlF5eE5RVUZFTzBGQlFVRXNWMEZCWVR0QlFVRkRMRTFCUVVFc1RVRkJUU3hGUVVGT08wRkJRVVFzUzBGQllqdEJRVUZCTEVkQlNFUXNSVUZKUXl4VlFVRkRMRXRCUVVRN1FVRkJRU3hYUVVGWk8wRkJRVU1zVFVGQlFTeExRVUZMTEVWQlFVdzdRVUZCUkN4TFFVRmFPMEZCUVVFc1IwRktSQ3hEUVVGUU8wRkJUVWc3TzJWQlJXTXNWU0lzSW1acGJHVWlPaUpuWlc1bGNtRjBaV1F1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaUtHWjFibU4wYVc5dUtDbDdablZ1WTNScGIyNGdjaWhsTEc0c2RDbDdablZ1WTNScGIyNGdieWhwTEdZcGUybG1LQ0Z1VzJsZEtYdHBaaWdoWlZ0cFhTbDdkbUZ5SUdNOVhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjbVZ4ZFdseVpTWW1jbVZ4ZFdseVpUdHBaaWdoWmlZbVl5bHlaWFIxY200Z1l5aHBMQ0V3S1R0cFppaDFLWEpsZEhWeWJpQjFLR2tzSVRBcE8zWmhjaUJoUFc1bGR5QkZjbkp2Y2loY0lrTmhibTV2ZENCbWFXNWtJRzF2WkhWc1pTQW5YQ0lyYVN0Y0lpZGNJaWs3ZEdoeWIzY2dZUzVqYjJSbFBWd2lUVTlFVlV4RlgwNVBWRjlHVDFWT1JGd2lMR0Y5ZG1GeUlIQTlibHRwWFQxN1pYaHdiM0owY3pwN2ZYMDdaVnRwWFZzd1hTNWpZV3hzS0hBdVpYaHdiM0owY3l4bWRXNWpkR2x2YmloeUtYdDJZWElnYmoxbFcybGRXekZkVzNKZE8zSmxkSFZ5YmlCdktHNThmSElwZlN4d0xIQXVaWGh3YjNKMGN5eHlMR1VzYml4MEtYMXlaWFIxY200Z2JsdHBYUzVsZUhCdmNuUnpmV1p2Y2loMllYSWdkVDFjSW1aMWJtTjBhVzl1WENJOVBYUjVjR1Z2WmlCeVpYRjFhWEpsSmlaeVpYRjFhWEpsTEdrOU1EdHBQSFF1YkdWdVozUm9PMmtyS3lsdktIUmJhVjBwTzNKbGRIVnliaUJ2ZlhKbGRIVnliaUJ5ZlNrb0tTSXNJaWhtZFc1amRHbHZiaUFvY205dmRDd2dabUZqZEc5eWVTbDdYRzRnSUNkMWMyVWdjM1J5YVdOMEp6dGNibHh1SUNBdkttbHpkR0Z1WW5Wc0lHbG5ibTl5WlNCdVpYaDBPbU5oYm5RZ2RHVnpkQ292WEc0Z0lHbG1JQ2gwZVhCbGIyWWdiVzlrZFd4bElEMDlQU0FuYjJKcVpXTjBKeUFtSmlCMGVYQmxiMllnYlc5a2RXeGxMbVY0Y0c5eWRITWdQVDA5SUNkdlltcGxZM1FuS1NCN1hHNGdJQ0FnYlc5a2RXeGxMbVY0Y0c5eWRITWdQU0JtWVdOMGIzSjVLQ2s3WEc0Z0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlHUmxabWx1WlNBOVBUMGdKMloxYm1OMGFXOXVKeUFtSmlCa1pXWnBibVV1WVcxa0tTQjdYRzRnSUNBZ0x5OGdRVTFFTGlCU1pXZHBjM1JsY2lCaGN5QmhiaUJoYm05dWVXMXZkWE1nYlc5a2RXeGxMbHh1SUNBZ0lHUmxabWx1WlNoYlhTd2dabUZqZEc5eWVTazdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdMeThnUW5KdmQzTmxjaUJuYkc5aVlXeHpYRzRnSUNBZ2NtOXZkQzV2WW1wbFkzUlFZWFJvSUQwZ1ptRmpkRzl5ZVNncE8xeHVJQ0I5WEc1OUtTaDBhR2x6TENCbWRXNWpkR2x2YmlncGUxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNWNiaUFnZG1GeUlIUnZVM1J5SUQwZ1QySnFaV04wTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1Wnp0Y2JpQWdablZ1WTNScGIyNGdhR0Z6VDNkdVVISnZjR1Z5ZEhrb2IySnFMQ0J3Y205d0tTQjdYRzRnSUNBZ2FXWW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpWeHVJQ0FnSUgxY2JpQWdJQ0F2TDNSdklHaGhibVJzWlNCdlltcGxZM1J6SUhkcGRHZ2diblZzYkNCd2NtOTBiM1I1Y0dWeklDaDBiMjhnWldSblpTQmpZWE5sUHlsY2JpQWdJQ0J5WlhSMWNtNGdUMkpxWldOMExuQnliM1J2ZEhsd1pTNW9ZWE5QZDI1UWNtOXdaWEowZVM1allXeHNLRzlpYWl3Z2NISnZjQ2xjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdselJXMXdkSGtvZG1Gc2RXVXBlMXh1SUNBZ0lHbG1JQ2doZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvYVhOQmNuSmhlU2gyWVd4MVpTa2dKaVlnZG1Gc2RXVXViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlIWmhiSFZsSUNFOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUdsdUlIWmhiSFZsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2FHRnpUM2R1VUhKdmNHVnlkSGtvZG1Gc2RXVXNJR2twS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCMGIxTjBjbWx1WnloMGVYQmxLWHRjYmlBZ0lDQnlaWFIxY200Z2RHOVRkSEl1WTJGc2JDaDBlWEJsS1R0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpUMkpxWldOMEtHOWlhaWw3WEc0Z0lDQWdjbVYwZFhKdUlIUjVjR1Z2WmlCdlltb2dQVDA5SUNkdlltcGxZM1FuSUNZbUlIUnZVM1J5YVc1bktHOWlhaWtnUFQwOUlGd2lXMjlpYW1WamRDQlBZbXBsWTNSZFhDSTdYRzRnSUgxY2JseHVJQ0IyWVhJZ2FYTkJjbkpoZVNBOUlFRnljbUY1TG1selFYSnlZWGtnZkh3Z1puVnVZM1JwYjI0b2IySnFLWHRjYmlBZ0lDQXZLbWx6ZEdGdVluVnNJR2xuYm05eVpTQnVaWGgwT21OaGJuUWdkR1Z6ZENvdlhHNGdJQ0FnY21WMGRYSnVJSFJ2VTNSeUxtTmhiR3dvYjJKcUtTQTlQVDBnSjF0dlltcGxZM1FnUVhKeVlYbGRKenRjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdselFtOXZiR1ZoYmlodlltb3BlMXh1SUNBZ0lISmxkSFZ5YmlCMGVYQmxiMllnYjJKcUlEMDlQU0FuWW05dmJHVmhiaWNnZkh3Z2RHOVRkSEpwYm1jb2IySnFLU0E5UFQwZ0oxdHZZbXBsWTNRZ1FtOXZiR1ZoYmwwbk8xeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdaMlYwUzJWNUtHdGxlU2w3WEc0Z0lDQWdkbUZ5SUdsdWRFdGxlU0E5SUhCaGNuTmxTVzUwS0d0bGVTazdYRzRnSUNBZ2FXWWdLR2x1ZEV0bGVTNTBiMU4wY21sdVp5Z3BJRDA5UFNCclpYa3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnBiblJMWlhrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnJaWGs3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCbVlXTjBiM0o1S0c5d2RHbHZibk1wSUh0Y2JpQWdJQ0J2Y0hScGIyNXpJRDBnYjNCMGFXOXVjeUI4ZkNCN2ZWeHVYRzRnSUNBZ2RtRnlJRzlpYW1WamRGQmhkR2dnUFNCbWRXNWpkR2x2Ymlodlltb3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQlBZbXBsWTNRdWEyVjVjeWh2WW1wbFkzUlFZWFJvS1M1eVpXUjFZMlVvWm5WdVkzUnBiMjRvY0hKdmVIa3NJSEJ5YjNBcElIdGNiaUFnSUNBZ0lDQWdhV1lvY0hKdmNDQTlQVDBnSjJOeVpXRjBaU2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2NISnZlSGs3WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQXZLbWx6ZEdGdVluVnNJR2xuYm05eVpTQmxiSE5sS2k5Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnZZbXBsWTNSUVlYUm9XM0J5YjNCZElEMDlQU0FuWm5WdVkzUnBiMjRuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjSEp2ZUhsYmNISnZjRjBnUFNCdlltcGxZM1JRWVhSb1czQnliM0JkTG1KcGJtUW9iMkpxWldOMFVHRjBhQ3dnYjJKcUtUdGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ3Y205NGVUdGNiaUFnSUNBZ0lIMHNJSHQ5S1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUNodmNIUnBiMjV6TG1sdVkyeDFaR1ZKYm1obGNtbDBaV1JRY205d2N5QjhmQ0FvZEhsd1pXOW1JSEJ5YjNBZ1BUMDlJQ2R1ZFcxaVpYSW5JQ1ltSUVGeWNtRjVMbWx6UVhKeVlYa29iMkpxS1NrZ2ZId2dhR0Z6VDNkdVVISnZjR1Z5ZEhrb2IySnFMQ0J3Y205d0tTbGNiaUFnSUNCOVhHNWNiaUFnSUNCbWRXNWpkR2x2YmlCblpYUlRhR0ZzYkc5M1VISnZjR1Z5ZEhrb2IySnFMQ0J3Y205d0tTQjdYRzRnSUNBZ0lDQnBaaUFvYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbHR3Y205d1hUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCbWRXNWpkR2x2YmlCelpYUW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTd2daRzlPYjNSU1pYQnNZV05sS1h0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdjR0YwYUNBOUlGdHdZWFJvWFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDZ2hjR0YwYUNCOGZDQndZWFJvTG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwTG0xaGNDaG5aWFJMWlhrcExDQjJZV3gxWlN3Z1pHOU9iM1JTWlhCc1lXTmxLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwVUdGMGFDQTlJSEJoZEdoYk1GMDdYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRlpoYkhWbElEMGdaMlYwVTJoaGJHeHZkMUJ5YjNCbGNuUjVLRzlpYWl3Z1kzVnljbVZ1ZEZCaGRHZ3BPMXh1SUNBZ0lDQWdhV1lnS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hqZFhKeVpXNTBWbUZzZFdVZ1BUMDlJSFp2YVdRZ01DQjhmQ0FoWkc5T2IzUlNaWEJzWVdObEtTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcVcyTjFjbkpsYm5SUVlYUm9YU0E5SUhaaGJIVmxPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJqZFhKeVpXNTBWbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2hqZFhKeVpXNTBWbUZzZFdVZ1BUMDlJSFp2YVdRZ01Da2dlMXh1SUNBZ0lDQWdJQ0F2TDJOb1pXTnJJR2xtSUhkbElHRnpjM1Z0WlNCaGJpQmhjbkpoZVZ4dUlDQWdJQ0FnSUNCcFppaDBlWEJsYjJZZ2NHRjBhRnN4WFNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnSUNCdlltcGJZM1Z5Y21WdWRGQmhkR2hkSUQwZ1cxMDdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcVcyTjFjbkpsYm5SUVlYUm9YU0E5SUh0OU8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnpaWFFvYjJKcVcyTjFjbkpsYm5SUVlYUm9YU3dnY0dGMGFDNXpiR2xqWlNneEtTd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVvWVhNZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9LU0I3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhCaGRHZ2dQVDA5SUNkdWRXMWlaWEluS1NCN1hHNGdJQ0FnSUNBZ0lIQmhkR2dnUFNCYmNHRjBhRjA3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnY0dGMGFDNXpjR3hwZENnbkxpY3BPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb0lYQmhkR2dnZkh3Z2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlDRWhiMkpxTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElIQmhkR2d1YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdvZ1BTQm5aWFJMWlhrb2NHRjBhRnRwWFNrN1hHNWNiaUFnSUNBZ0lDQWdhV1lvS0hSNWNHVnZaaUJxSUQwOVBTQW5iblZ0WW1WeUp5QW1KaUJwYzBGeWNtRjVLRzlpYWlrZ0ppWWdhaUE4SUc5aWFpNXNaVzVuZEdncElIeDhYRzRnSUNBZ0lDQWdJQ0FnS0c5d2RHbHZibk11YVc1amJIVmtaVWx1YUdWeWFYUmxaRkJ5YjNCeklEOGdLR29nYVc0Z1QySnFaV04wS0c5aWFpa3BJRG9nYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCcUtTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCdlltb2dQU0J2WW1wYmFsMDdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0J2WW1wbFkzUlFZWFJvTG1WdWMzVnlaVVY0YVhOMGN5QTlJR1oxYm1OMGFXOXVJQ2h2WW1vc0lIQmhkR2dzSUhaaGJIVmxLWHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnpaWFFvYjJKcUxDQndZWFJvTENCMllXeDFaU3dnZEhKMVpTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VjMlYwSUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2w3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjMlYwS0c5aWFpd2djR0YwYUN3Z2RtRnNkV1VzSUdSdlRtOTBVbVZ3YkdGalpTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VhVzV6WlhKMElEMGdablZ1WTNScGIyNGdLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJR0YwS1h0Y2JpQWdJQ0FnSUhaaGNpQmhjbklnUFNCdlltcGxZM1JRWVhSb0xtZGxkQ2h2WW1vc0lIQmhkR2dwTzF4dUlDQWdJQ0FnWVhRZ1BTQitmbUYwTzF4dUlDQWdJQ0FnYVdZZ0tDRnBjMEZ5Y21GNUtHRnljaWtwSUh0Y2JpQWdJQ0FnSUNBZ1lYSnlJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z1lYSnlLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR0Z5Y2k1emNHeHBZMlVvWVhRc0lEQXNJSFpoYkhWbEtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNWxiWEIwZVNBOUlHWjFibU4wYVc5dUtHOWlhaXdnY0dGMGFDa2dlMXh1SUNBZ0lDQWdhV1lnS0dselJXMXdkSGtvY0dGMGFDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFp2YVdRZ01EdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2h2WW1vZ1BUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RtOXBaQ0F3TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCMllYSWdkbUZzZFdVc0lHazdYRzRnSUNBZ0lDQnBaaUFvSVNoMllXeDFaU0E5SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQ2twS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMmIybGtJREE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2RtRnNkV1VnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lDY25LVHRjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvYVhOQ2IyOXNaV0Z1S0haaGJIVmxLU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1elpYUW9iMkpxTENCd1lYUm9MQ0JtWVd4elpTazdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQjJZV3gxWlNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dNQ2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dselFYSnlZWGtvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdJQ0FnSUhaaGJIVmxMbXhsYm1kMGFDQTlJREE3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dselQySnFaV04wS0haaGJIVmxLU2tnZTF4dUlDQWdJQ0FnSUNCbWIzSWdLR2tnYVc0Z2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0haaGJIVmxMQ0JwS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWkdWc1pYUmxJSFpoYkhWbFcybGRPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnYm5Wc2JDazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VjSFZ6YUNBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ2dMeW9zSUhaaGJIVmxjeUFxTHlsN1hHNGdJQ0FnSUNCMllYSWdZWEp5SUQwZ2IySnFaV04wVUdGMGFDNW5aWFFvYjJKcUxDQndZWFJvS1R0Y2JpQWdJQ0FnSUdsbUlDZ2hhWE5CY25KaGVTaGhjbklwS1NCN1hHNGdJQ0FnSUNBZ0lHRnljaUE5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lHRnljaWs3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdGeWNpNXdkWE5vTG1Gd2NHeDVLR0Z5Y2l3Z1FYSnlZWGt1Y0hKdmRHOTBlWEJsTG5Oc2FXTmxMbU5oYkd3b1lYSm5kVzFsYm5SekxDQXlLU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1WTI5aGJHVnpZMlVnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb2N5d2daR1ZtWVhWc2RGWmhiSFZsS1NCN1hHNGdJQ0FnSUNCMllYSWdkbUZzZFdVN1hHNWNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3TENCc1pXNGdQU0J3WVhSb2N5NXNaVzVuZEdnN0lHa2dQQ0JzWlc0N0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNCcFppQW9LSFpoYkhWbElEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2IySnFMQ0J3WVhSb2MxdHBYU2twSUNFOVBTQjJiMmxrSURBcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHUmxabUYxYkhSV1lXeDFaVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVuWlhRZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9MQ0JrWldaaGRXeDBWbUZzZFdVcGUxeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5iblZ0WW1WeUp5a2dlMXh1SUNBZ0lDQWdJQ0J3WVhSb0lEMGdXM0JoZEdoZE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLQ0Z3WVhSb0lIeDhJSEJoZEdndWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1vN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptRjFiSFJXWVd4MVpUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WjJWMEtHOWlhaXdnY0dGMGFDNXpjR3hwZENnbkxpY3BMQ0JrWldaaGRXeDBWbUZzZFdVcE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRkJoZEdnZ1BTQm5aWFJMWlhrb2NHRjBhRnN3WFNrN1hHNGdJQ0FnSUNCMllYSWdibVY0ZEU5aWFpQTlJR2RsZEZOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lHTjFjbkpsYm5SUVlYUm9LVnh1SUNBZ0lDQWdhV1lnS0c1bGVIUlBZbW9nUFQwOUlIWnZhV1FnTUNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1pHVm1ZWFZzZEZaaGJIVmxPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURFcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHNWxlSFJQWW1vN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCdlltcGxZM1JRWVhSb0xtZGxkQ2h2WW1wYlkzVnljbVZ1ZEZCaGRHaGRMQ0J3WVhSb0xuTnNhV05sS0RFcExDQmtaV1poZFd4MFZtRnNkV1VwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0J2WW1wbFkzUlFZWFJvTG1SbGJDQTlJR1oxYm1OMGFXOXVJR1JsYkNodlltb3NJSEJoZEdncElIdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJRnR3WVhSb1hUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0c5aWFpQTlQU0J1ZFd4c0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaHBjMFZ0Y0hSNUtIQmhkR2dwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnBaaWgwZVhCbGIyWWdjR0YwYUNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WkdWc0tHOWlhaXdnY0dGMGFDNXpjR3hwZENnbkxpY3BLVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SUVlYUm9JRDBnWjJWMFMyVjVLSEJoZEdoYk1GMHBPMXh1SUNBZ0lDQWdhV1lnS0NGb1lYTlRhR0ZzYkc5M1VISnZjR1Z5ZEhrb2IySnFMQ0JqZFhKeVpXNTBVR0YwYUNrcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZb2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURFcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0dselFYSnlZWGtvYjJKcUtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUc5aWFpNXpjR3hwWTJVb1kzVnljbVZ1ZEZCaGRHZ3NJREVwTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lHUmxiR1YwWlNCdlltcGJZM1Z5Y21WdWRGQmhkR2hkTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1a1pXd29iMkpxVzJOMWNuSmxiblJRWVhSb1hTd2djR0YwYUM1emJHbGpaU2d4S1NrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdnN1hHNGdJSDFjYmx4dUlDQjJZWElnYlc5a0lEMGdabUZqZEc5eWVTZ3BPMXh1SUNCdGIyUXVZM0psWVhSbElEMGdabUZqZEc5eWVUdGNiaUFnYlc5a0xuZHBkR2hKYm1obGNtbDBaV1JRY205d2N5QTlJR1poWTNSdmNua29lMmx1WTJ4MVpHVkpibWhsY21sMFpXUlFjbTl3Y3pvZ2RISjFaWDBwWEc0Z0lISmxkSFZ5YmlCdGIyUTdYRzU5S1R0Y2JpSXNJaWQxYzJVZ2MzUnlhV04wSjF4dVhHNWpiMjV6ZENCN2FYTlBZbXBsWTNRc0lHZGxkRXRsZVhOOUlEMGdjbVZ4ZFdseVpTZ25MaTlzWVc1bkp5bGNibHh1THk4Z1VGSkpWa0ZVUlNCUVVrOVFSVkpVU1VWVFhHNWpiMjV6ZENCQ1dWQkJVMU5mVFU5RVJTQTlJQ2RmWDJKNWNHRnpjMDF2WkdVblhHNWpiMjV6ZENCSlIwNVBVa1ZmUTBsU1ExVk1RVklnUFNBblgxOXBaMjV2Y21WRGFYSmpkV3hoY2lkY2JtTnZibk4wSUUxQldGOUVSVVZRSUQwZ0oxOWZiV0Y0UkdWbGNDZGNibU52Ym5OMElFTkJRMGhGSUQwZ0oxOWZZMkZqYUdVblhHNWpiMjV6ZENCUlZVVlZSU0E5SUNkZlgzRjFaWFZsSjF4dVkyOXVjM1FnVTFSQlZFVWdQU0FuWDE5emRHRjBaU2RjYmx4dVkyOXVjM1FnUlUxUVZGbGZVMVJCVkVVZ1BTQjdmVnh1WEc1amJHRnpjeUJTWldOMWNuTnBkbVZKZEdWeVlYUnZjaUI3WEc0Z0lDOHFLbHh1SUNBZ0tpQkFjR0Z5WVcwZ2UwOWlhbVZqZEh4QmNuSmhlWDBnY205dmRGeHVJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnVzJKNWNHRnpjMDF2WkdVOU1GMWNiaUFnSUNvZ1FIQmhjbUZ0SUh0Q2IyOXNaV0Z1ZlNCYmFXZHViM0psUTJseVkzVnNZWEk5Wm1Gc2MyVmRYRzRnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCYmJXRjRSR1ZsY0QweE1EQmRYRzRnSUNBcUwxeHVJQ0JqYjI1emRISjFZM1J2Y2lBb2NtOXZkQ3dnWW5sd1lYTnpUVzlrWlNBOUlEQXNJR2xuYm05eVpVTnBjbU4xYkdGeUlEMGdabUZzYzJVc0lHMWhlRVJsWlhBZ1BTQXhNREFwSUh0Y2JpQWdJQ0IwYUdselcwSlpVRUZUVTE5TlQwUkZYU0E5SUdKNWNHRnpjMDF2WkdWY2JpQWdJQ0IwYUdselcwbEhUazlTUlY5RFNWSkRWVXhCVWwwZ1BTQnBaMjV2Y21WRGFYSmpkV3hoY2x4dUlDQWdJSFJvYVhOYlRVRllYMFJGUlZCZElEMGdiV0Y0UkdWbGNGeHVJQ0FnSUhSb2FYTmJRMEZEU0VWZElEMGdXMTFjYmlBZ0lDQjBhR2x6VzFGVlJWVkZYU0E5SUZ0ZFhHNGdJQ0FnZEdocGMxdFRWRUZVUlYwZ1BTQjBhR2x6TG1kbGRGTjBZWFJsS0hWdVpHVm1hVzVsWkN3Z2NtOXZkQ2xjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUUhKbGRIVnlibk1nZTA5aWFtVmpkSDFjYmlBZ0lDb3ZYRzRnSUc1bGVIUWdLQ2tnZTF4dUlDQWdJR052Ym5OMElIdHViMlJsTENCd1lYUm9MQ0JrWldWd2ZTQTlJSFJvYVhOYlUxUkJWRVZkSUh4OElFVk5VRlJaWDFOVVFWUkZYRzVjYmlBZ0lDQnBaaUFvZEdocGMxdE5RVmhmUkVWRlVGMGdQaUJrWldWd0tTQjdYRzRnSUNBZ0lDQnBaaUFvZEdocGN5NXBjMDV2WkdVb2JtOWtaU2twSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFJvYVhNdWFYTkRhWEpqZFd4aGNpaHViMlJsS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJR2xtSUNoMGFHbHpXMGxIVGs5U1JWOURTVkpEVlV4QlVsMHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJSE5yYVhCY2JpQWdJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2REYVhKamRXeGhjaUJ5WldabGNtVnVZMlVuS1Z4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTV2YmxOMFpYQkpiblJ2S0hSb2FYTmJVMVJCVkVWZEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXVjM1FnWkdWelkzSnBjSFJ2Y25NZ1BTQjBhR2x6TG1kbGRGTjBZWFJsYzA5bVEyaHBiR1JPYjJSbGN5aHViMlJsTENCd1lYUm9MQ0JrWldWd0tWeHVJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWMzUWdiV1YwYUc5a0lEMGdkR2hwYzF0Q1dWQkJVMU5mVFU5RVJWMGdQeUFuY0hWemFDY2dPaUFuZFc1emFHbG1kQ2RjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE5iVVZWRlZVVmRXMjFsZEdodlpGMG9MaTR1WkdWelkzSnBjSFJ2Y25NcFhHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdselcwTkJRMGhGWFM1d2RYTm9LRzV2WkdVcFhHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdZMjl1YzNRZ2RtRnNkV1VnUFNCMGFHbHpXMUZWUlZWRlhTNXphR2xtZENncFhHNGdJQ0FnWTI5dWMzUWdaRzl1WlNBOUlDRjJZV3gxWlZ4dVhHNGdJQ0FnZEdocGMxdFRWRUZVUlYwZ1BTQjJZV3gxWlZ4dVhHNGdJQ0FnYVdZZ0tHUnZibVVwSUhSb2FYTXVaR1Z6ZEhKdmVTZ3BYRzVjYmlBZ0lDQnlaWFIxY200Z2UzWmhiSFZsTENCa2IyNWxmVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLbHh1SUNBZ0tpOWNiaUFnWkdWemRISnZlU0FvS1NCN1hHNGdJQ0FnZEdocGMxdFJWVVZWUlYwdWJHVnVaM1JvSUQwZ01GeHVJQ0FnSUhSb2FYTmJRMEZEU0VWZExteGxibWQwYUNBOUlEQmNiaUFnSUNCMGFHbHpXMU5VUVZSRlhTQTlJRzUxYkd4Y2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBcUwxeHVJQ0JwYzA1dlpHVWdLR0Z1ZVNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJwYzA5aWFtVmpkQ2hoYm5rcFhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlFQndZWEpoYlNCN0tuMGdZVzU1WEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0tpOWNiaUFnYVhOTVpXRm1JQ2hoYm5rcElIdGNiaUFnSUNCeVpYUjFjbTRnSVhSb2FYTXVhWE5PYjJSbEtHRnVlU2xjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FxTDF4dUlDQnBjME5wY21OMWJHRnlJQ2hoYm5rcElIdGNiaUFnSUNCeVpYUjFjbTRnZEdocGMxdERRVU5JUlYwdWFXNWtaWGhQWmloaGJua3BJQ0U5UFNBdE1WeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQlNaWFIxY201eklITjBZWFJsY3lCdlppQmphR2xzWkNCdWIyUmxjMXh1SUNBZ0tpQkFjR0Z5WVcwZ2UwOWlhbVZqZEgwZ2JtOWtaVnh1SUNBZ0tpQkFjR0Z5WVcwZ2UwRnljbUY1ZlNCd1lYUm9YRzRnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCa1pXVndYRzRnSUNBcUlFQnlaWFIxY201eklIdEJjbkpoZVR4UFltcGxZM1ErZlZ4dUlDQWdLaTljYmlBZ1oyVjBVM1JoZEdWelQyWkRhR2xzWkU1dlpHVnpJQ2h1YjJSbExDQndZWFJvTENCa1pXVndLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHZGxkRXRsZVhNb2JtOWtaU2t1YldGd0tHdGxlU0E5UGx4dUlDQWdJQ0FnZEdocGN5NW5aWFJUZEdGMFpTaHViMlJsTENCdWIyUmxXMnRsZVYwc0lHdGxlU3dnY0dGMGFDNWpiMjVqWVhRb2EyVjVLU3dnWkdWbGNDQXJJREVwWEc0Z0lDQWdLVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJTWlhSMWNtNXpJSE4wWVhSbElHOW1JRzV2WkdVdUlFTmhiR3h6SUdadmNpQmxZV05vSUc1dlpHVmNiaUFnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I5SUZ0d1lYSmxiblJkWEc0Z0lDQXFJRUJ3WVhKaGJTQjdLbjBnVzI1dlpHVmRYRzRnSUNBcUlFQndZWEpoYlNCN1UzUnlhVzVuZlNCYmEyVjVYVnh1SUNBZ0tpQkFjR0Z5WVcwZ2UwRnljbUY1ZlNCYmNHRjBhRjFjYmlBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlGdGtaV1Z3WFZ4dUlDQWdLaUJBY21WMGRYSnVjeUI3VDJKcVpXTjBmVnh1SUNBZ0tpOWNiaUFnWjJWMFUzUmhkR1VnS0hCaGNtVnVkQ3dnYm05a1pTd2dhMlY1TENCd1lYUm9JRDBnVzEwc0lHUmxaWEFnUFNBd0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUh0d1lYSmxiblFzSUc1dlpHVXNJR3RsZVN3Z2NHRjBhQ3dnWkdWbGNIMWNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRMkZzYkdKaFkydGNiaUFnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I5SUhOMFlYUmxYRzRnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnS2k5Y2JpQWdiMjVUZEdWd1NXNTBieUFvYzNSaGRHVXBJSHRjYmlBZ0lDQnlaWFIxY200Z2RISjFaVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJBY21WMGRYSnVjeUI3VW1WamRYSnphWFpsU1hSbGNtRjBiM0o5WEc0Z0lDQXFMMXh1SUNCYlUzbHRZbTlzTG1sMFpYSmhkRzl5WFNBb0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUhSb2FYTmNiaUFnZlZ4dWZWeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJRkpsWTNWeWMybDJaVWwwWlhKaGRHOXlYRzRpTENJbmRYTmxJSE4wY21samRDZGNiaThxS2x4dUlDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNvdlhHNW1kVzVqZEdsdmJpQnBjMDlpYW1WamRDQW9ZVzU1S1NCN1hHNGdJSEpsZEhWeWJpQmhibmtnSVQwOUlHNTFiR3dnSmlZZ2RIbHdaVzltSUdGdWVTQTlQVDBnSjI5aWFtVmpkQ2RjYm4xY2JpOHFLbHh1SUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ292WEc1amIyNXpkQ0I3YVhOQmNuSmhlWDBnUFNCQmNuSmhlVnh1THlvcVhHNGdLaUJBY0dGeVlXMGdleXA5SUdGdWVWeHVJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0tpOWNibVoxYm1OMGFXOXVJR2x6UVhKeVlYbE1hV3RsSUNoaGJua3BJSHRjYmlBZ2FXWWdLQ0ZwYzA5aWFtVmpkQ2hoYm5rcEtTQnlaWFIxY200Z1ptRnNjMlZjYmlBZ2FXWWdLQ0VvSjJ4bGJtZDBhQ2NnYVc0Z1lXNTVLU2tnY21WMGRYSnVJR1poYkhObFhHNGdJR052Ym5OMElHeGxibWQwYUNBOUlHRnVlUzVzWlc1bmRHaGNiaUFnYVdZZ0tDRnBjMDUxYldKbGNpaHNaVzVuZEdncEtTQnlaWFIxY200Z1ptRnNjMlZjYmlBZ2FXWWdLR3hsYm1kMGFDQStJREFwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdLR3hsYm1kMGFDQXRJREVwSUdsdUlHRnVlVnh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJR1p2Y2lBb1kyOXVjM1FnYTJWNUlHbHVJR0Z1ZVNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUNBZ2ZWeHVJQ0I5WEc1OVhHNHZLaXBjYmlBcUlFQndZWEpoYlNCN0tuMGdZVzU1WEc0Z0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFxTDF4dVpuVnVZM1JwYjI0Z2FYTk9kVzFpWlhJZ0tHRnVlU2tnZTF4dUlDQnlaWFIxY200Z2RIbHdaVzltSUdGdWVTQTlQVDBnSjI1MWJXSmxjaWRjYm4xY2JpOHFLbHh1SUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I4UVhKeVlYbDlJRzlpYW1WamRGeHVJQ29nUUhKbGRIVnlibk1nZTBGeWNtRjVQRk4wY21sdVp6NTlYRzRnS2k5Y2JtWjFibU4wYVc5dUlHZGxkRXRsZVhNZ0tHOWlhbVZqZENrZ2UxeHVJQ0JqYjI1emRDQnJaWGx6WHlBOUlFOWlhbVZqZEM1clpYbHpLRzlpYW1WamRDbGNiaUFnYVdZZ0tHbHpRWEp5WVhrb2IySnFaV04wS1NrZ2UxeHVJQ0FnSUM4dklITnJhWEFnYzI5eWRGeHVJQ0I5SUdWc2MyVWdhV1lnS0dselFYSnlZWGxNYVd0bEtHOWlhbVZqZENrcElIdGNiaUFnSUNCamIyNXpkQ0JwYm1SbGVDQTlJR3RsZVhOZkxtbHVaR1Y0VDJZb0oyeGxibWQwYUNjcFhHNGdJQ0FnYVdZZ0tHbHVaR1Y0SUQ0Z0xURXBJSHRjYmlBZ0lDQWdJR3RsZVhOZkxuTndiR2xqWlNocGJtUmxlQ3dnTVNsY2JpQWdJQ0I5WEc0Z0lDQWdMeThnYzJ0cGNDQnpiM0owWEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z2MyOXlkRnh1SUNBZ0lHdGxlWE5mTG5OdmNuUW9LVnh1SUNCOVhHNGdJSEpsZEhWeWJpQnJaWGx6WDF4dWZWeHVYRzVsZUhCdmNuUnpMbWRsZEV0bGVYTWdQU0JuWlhSTFpYbHpYRzVsZUhCdmNuUnpMbWx6UVhKeVlYa2dQU0JwYzBGeWNtRjVYRzVsZUhCdmNuUnpMbWx6UVhKeVlYbE1hV3RsSUQwZ2FYTkJjbkpoZVV4cGEyVmNibVY0Y0c5eWRITXVhWE5QWW1wbFkzUWdQU0JwYzA5aWFtVmpkRnh1Wlhod2IzSjBjeTVwYzA1MWJXSmxjaUE5SUdselRuVnRZbVZ5WEc0aUxDSnBiWEJ2Y25RZ1RHbHpkRWwwWlcwZ1puSnZiU0FuTGk5TWFYTjBTWFJsYlNjN1hHNXBiWEJ2Y25RZ2NtVmpkWEp6YVhabFNYUmxjbUYwYjNJZ1puSnZiU0FuY21WamRYSnphWFpsTFdsMFpYSmhkRzl5Snp0Y2JtbHRjRzl5ZENCdlltcGxZM1JRWVhSb0lHWnliMjBnSjI5aWFtVmpkQzF3WVhSb0p6dGNibHh1WTJ4aGMzTWdSR0YwWVV4cGMzUWdaWGgwWlc1a2N5QlNaV0ZqZEM1RGIyMXdiMjVsYm5RZ2UxeHVJQ0FnSUdOdmJuTjBjblZqZEc5eUtIQnliM0J6S1NCN1hHNGdJQ0FnSUNBZ0lITjFjR1Z5S0hCeWIzQnpLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXlaVzVrWlhKT2IyUmxjeUE5SUhSb2FYTXVjbVZ1WkdWeVRtOWtaWE11WW1sdVpDaDBhR2x6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSR2FXVnNaRTFoY0NBOUlIUm9hWE11YzJWMFJtbGxiR1JOWVhBdVltbHVaQ2gwYUdsektUdGNiaUFnSUNCOVhHNWNiaUFnSUNCelpYUkdhV1ZzWkUxaGNDaHdZWFJvTENCbGRtVnVkQ2tnZTF4dUlDQWdJQ0FnSUNCbGRtVnVkQzV3Y21WMlpXNTBSR1ZtWVhWc2RDZ3BPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuQnliM0J6TG5Wd1pHRjBaVVpwWld4a1RXRndLSHRiWlhabGJuUXVkR0Z5WjJWMExtUmhkR0Z6WlhRdVptbGxiR1JkT2lCd1lYUm9mU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ1WkdWeVRtOWtaWE1vWkdGMFlTa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdUMkpxWldOMExtdGxlWE1vWkdGMFlTa3ViV0Z3S0dsMFpXMGdQVDRnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dsMFpXMGdQVDA5SUNkdlltcGxZM1JRWVhSb0p5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYkdWMElHTm9hV3hrSUQwZ1BFeHBjM1JKZEdWdElHdGxlVDE3YVhSbGJTNTBiMU4wY21sdVp5Z3BmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoYkhWbFBYdHBkR1Z0ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5aWFtVmpkRDE3WkdGMFlWdHBkR1Z0WFgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0QxN2RHaHBjeTV3Y205d2N5NW1hV1ZzWkUxaGNIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZia05zYVdOclEyOXVkR0ZwYm1WeVBYdGxJRDArSUhSb2FYTXVjMlYwUm1sbGJHUk5ZWEFvWkdGMFlWdHBkR1Z0WFM1dlltcGxZM1JRWVhSb0xDQmxLWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2YmtOc2FXTnJWR2wwYkdVOWUyVWdQVDRnZEdocGN5NXpaWFJHYVdWc1pFMWhjQ2hrWVhSaFcybDBaVzFkTENCbEtYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZia05zYVdOclEyOXVkR1Z1ZEQxN1pTQTlQaUIwYUdsekxuTmxkRVpwWld4a1RXRndLR1JoZEdGYmFYUmxiVjBzSUdVcGZTOCtPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JR1JoZEdGYmFYUmxiVjBnUFQwOUlDZHZZbXBsWTNRbklDWW1JR1JoZEdGYmFYUmxiVjBnSVQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamFHbHNaQ0E5SUZKbFlXTjBMbU5zYjI1bFJXeGxiV1Z1ZENoamFHbHNaQ3dnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmphR2xzWkhKbGJqb2dRWEp5WVhrdWFYTkJjbkpoZVNoa1lYUmhXMmwwWlcxZEtTQS9JSFJvYVhNdWNtVnVaR1Z5VG05a1pYTW9aR0YwWVZ0cGRHVnRYVnN3WFNrZ09pQjBhR2x6TG5KbGJtUmxjazV2WkdWektHUmhkR0ZiYVhSbGJWMHBYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCamFHbHNaRHRjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WdVpHVnlLQ2tnZTF4dUlDQWdJQ0FnSUNCamIyNXpkQ0JtYVdWc1pFMWhjQ0E5SUhSb2FYTXVjSEp2Y0hNdVptbGxiR1JOWVhBN1hHNWNiaUFnSUNBZ0lDQWdiR1YwSUdSaGRHRWdQU0IwYUdsekxuQnliM0J6TG1SaGRHRTdYRzRnSUNBZ0lDQWdJR2xtSUNoQmNuSmhlUzVwYzBGeWNtRjVLR1JoZEdFcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJRDBnSnljN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0JwWmlBb1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUE5UFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29aR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmtZWFJoSUQwZ1pHRjBZVnN3WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoc1pYUWdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb2ZTQnZaaUJ1WlhjZ2NtVmpkWEp6YVhabFNYUmxjbUYwYjNJb1pHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHNXZaR1VnUFQwOUlDZHZZbXBsWTNRbklDWW1JRzV2WkdVZ0lUMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYkdWMElIQmhkR2hUZEhKcGJtY2dQU0J3WVhSb0xtcHZhVzRvSnk0bktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYjJKcVpXTjBVR0YwYUM1elpYUW9aR0YwWVN3Z2NHRjBhRk4wY21sdVp5QXJJQ2N1YjJKcVpXTjBVR0YwYUNjc0lIQmhkR2hUZEhKcGJtY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGFETStVMlZzWldOMElHbDBaVzF6SUdOdmJuUmhhVzVsY2p3dmFETStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4MWJENTdkR2hwY3k1eVpXNWtaWEpPYjJSbGN5aGtZWFJoS1gwOEwzVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3hsZENCdlltcGxZM1JFWVhSaElEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2RHaHBjeTV3Y205d2N5NWtZWFJoTENCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlLVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29iMkpxWldOMFJHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdlltcGxZM1JFWVhSaElEMGdiMkpxWldOMFJHRjBZVnN3WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoc1pYUWdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb2ZTQnZaaUJ1WlhjZ2NtVmpkWEp6YVhabFNYUmxjbUYwYjNJb2IySnFaV04wUkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc1dlpHVWdJVDA5SUNkdlltcGxZM1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR3hsZENCd1lYUm9VM1J5YVc1bklEMGdjR0YwYUM1cWIybHVLQ2N1SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhbVZqZEVSaGRHRXNJSEJoZEdoVGRISnBibWNzSUhCaGRHaFRkSEpwYm1jcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YURNK1UyVnNaV04wSUhScGRHeGxJR0Z1WkNCamIyNTBaVzUwSUdacFpXeGtjend2YURNK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHgxYkQ1N2RHaHBjeTV5Wlc1a1pYSk9iMlJsY3lodlltcGxZM1JFWVhSaEtYMDhMM1ZzUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibjFjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnUkdGMFlVeHBjM1E3SWl3aWFXMXdiM0owSUVSaGRHRk1hWE4wSUdaeWIyMGdKeTR2UkdGMFlVeHBjM1FuTzF4dWFXMXdiM0owSUdkbGRFRndhVVJoZEdFZ1puSnZiU0FuTGk0dkxpNHZWWFJwYkdsMGFXVnpMMmRsZEVGd2FVUmhkR0VuTzF4dVhHNWpiR0Z6Y3lCR2FXVnNaRk5sYkdWamRHbHZiaUJsZUhSbGJtUnpJRkpsWVdOMExrTnZiWEJ2Ym1WdWRDQjdYRzRnSUNBZ1kyOXVjM1J5ZFdOMGIzSW9jSEp2Y0hNcElIdGNiaUFnSUNBZ0lDQWdjM1Z3WlhJb2NISnZjSE1wTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbk4wWVhSbElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pYSnliM0k2SUc1MWJHd3NYRzRnSUNBZ0lDQWdJQ0FnSUNCcGMweHZZV1JsWkRvZ1ptRnNjMlVzWEc0Z0lDQWdJQ0FnSUNBZ0lDQnBkR1Z0Y3pvZ1cxMWNiaUFnSUNBZ0lDQWdmVHRjYmx4dUlDQWdJQ0FnSUNCMGFHbHpMblZ3WkdGMFpVWnBaV3hrVFdGd0lEMGdkR2hwY3k1MWNHUmhkR1ZHYVdWc1pFMWhjQzVpYVc1a0tIUm9hWE1wTzF4dUlDQWdJSDFjYmx4dUlDQWdJSFZ3WkdGMFpVWnBaV3hrVFdGd0tIWmhiSFZsS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0hKdmNITXVkWEJrWVhSbFJtbGxiR1JOWVhBb2RtRnNkV1VwTzF4dUlDQWdJSDFjYmx4dUlDQWdJR2RsZEVSaGRHRW9LU0I3WEc0Z0lDQWdJQ0FnSUdOdmJuTjBJSHQxY214OUlEMGdkR2hwY3k1d2NtOXdjenRjYmlBZ0lDQWdJQ0FnWjJWMFFYQnBSR0YwWVNoMWNtd3BYRzRnSUNBZ0lDQWdJQ0FnSUNBdWRHaGxiaWhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FvZTNKbGMzVnNkSDBwSUQwK0lIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRnlaWE4xYkhRZ2ZId2dUMkpxWldOMExtdGxlWE1vY21WemRXeDBLUzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHVnljbTl5T2lCRmNuSnZjaWduUTI5MWJHUWdibTkwSUdabGRHTm9JR1JoZEdFZ1puSnZiU0JWVWt3dUp5a3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVhOTWIyRmtaV1E2SUhSeWRXVmNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvZTJselRHOWhaR1ZrT2lCMGNuVmxMQ0JwZEdWdGN6b2djbVZ6ZFd4MGZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU3dnS0h0bGNuSnZjbjBwSUQwK0lIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdhWE5NYjJGa1pXUTZJSFJ5ZFdVc0lHVnljbTl5ZlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JqYjIxd2IyNWxiblJFYVdSTmIzVnVkQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVuWlhSRVlYUmhLQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ1WkdWeUtDa2dlMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQjdaWEp5YjNJc0lHbHpURzloWkdWa0xDQnBkR1Z0YzMwZ1BTQjBhR2x6TG5OMFlYUmxPMXh1SUNBZ0lDQWdJQ0JwWmlBb1pYSnliM0lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQThaR2wyUGp4d1BrVnljbTl5T2lCN1pYSnliM0l1YldWemMyRm5aWDA4TDNBK1BDOWthWFkrTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tDRnBjMHh2WVdSbFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpYzNCcGJtNWxjaUJwY3kxaFkzUnBkbVZjSWo0OEwyUnBkajQ3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1BFUmhkR0ZNYVhOMFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVDE3YVhSbGJYTjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEpzUFh0MGFHbHpMbkJ5YjNCekxuVnliSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRDE3ZEdocGN5NXdjbTl3Y3k1bWFXVnNaRTFoY0gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWNHUmhkR1ZHYVdWc1pFMWhjRDE3ZEdocGN5NTFjR1JoZEdWR2FXVnNaRTFoY0gwdlBqdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibjFjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnUm1sbGJHUlRaV3hsWTNScGIyNDdJaXdpWm5WdVkzUnBiMjRnU1c1d2RYUkdhV1ZzWkhNb2NISnZjSE1wSUh0Y2JpQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSm9hV1JrWlc1Y0lpQnVZVzFsUFZ3aWJXOWtYMnB6YjI1ZmNtVnVaR1Z5WDNWeWJGd2lJSFpoYkhWbFBYdHdjbTl3Y3k1MWNteDlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lEeHBibkIxZENCMGVYQmxQVndpYUdsa1pHVnVYQ0lnYm1GdFpUMWNJbTF2WkY5cWMyOXVYM0psYm1SbGNsOW1hV1ZzWkcxaGNGd2lJSFpoYkhWbFBYdEtVMDlPTG5OMGNtbHVaMmxtZVNod2NtOXdjeTVtYVdWc1pFMWhjQ2w5THo1Y2JpQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdLVHRjYm4xY2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1NXNXdkWFJHYVdWc1pITTdJaXdpWm5WdVkzUnBiMjRnVEdsemRFbDBaVzBvY0hKdmNITXBJSHRjYmlBZ0lDQmpiMjV6ZENCN2RtRnNkV1VzSUdOb2FXeGtjbVZ1TENCbWFXVnNaRTFoY0N3Z2IySnFaV04wTENCdmJrTnNhV05yVkdsMGJHVXNJRzl1UTJ4cFkydERiMjUwWlc1MExDQnZia05zYVdOclEyOXVkR0ZwYm1WeWZTQTlJSEJ5YjNCek8xeHVJQ0FnSUhKbGRIVnliaUFvUEd4cFBseHVJQ0FnSUNBZ0lDQjdabWxsYkdSTllYQXVkR2wwYkdVZ1BUMDlJRzlpYW1WamRDQW1KaUJtYVdWc1pFMWhjQzUwYVhSc1pTQWdQeUE4YzNSeWIyNW5QbFJwZEd4bE9pQThMM04wY205dVp6NGdPaUFuSjMxY2JpQWdJQ0FnSUNBZ2UyWnBaV3hrVFdGd0xtTnZiblJsYm5RZ1BUMDlJRzlpYW1WamRDQW1KaUJtYVdWc1pFMWhjQzVqYjI1MFpXNTBJRDhnUEhOMGNtOXVaejVEYjI1MFpXNTBPaUE4TDNOMGNtOXVaejRnT2lBbkozMWNiaUFnSUNBZ0lDQWdlMk5vYVd4a2NtVnVJRDhnUEhOMGNtOXVaejU3ZG1Gc2RXVjlQQzl6ZEhKdmJtYytJRG9nUEhOd1lXNCtlM1poYkhWbGZUd3ZjM0JoYmo1OVhHNGdJQ0FnSUNBZ0lIc2hZMmhwYkdSeVpXNGdKaVlnSVdacFpXeGtUV0Z3TG5ScGRHeGxJQ1ltSUNobWFXVnNaRTFoY0M1amIyNTBaVzUwSUNFOVBTQnZZbXBsWTNRcElDWW1JR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJZ0lUMDlJRzUxYkd3Z1AxeHVJQ0FnSUNBZ0lDQWdJQ0FnUEdFZ2FISmxaajFjSWlOY0lpQmpiR0Z6YzA1aGJXVTlYQ0ppZFhSMGIyNGdZblYwZEc5dUxYTnRZV3hzWENJZ1pHRjBZUzFtYVdWc1pEMWNJblJwZEd4bFhDSWdiMjVEYkdsamF6MTdiMjVEYkdsamExUnBkR3hsZlQ1VWFYUnNaVHd2WVQ0Z09pQW5KMzFjYmlBZ0lDQWdJQ0FnZXlGamFHbHNaSEpsYmlBbUppQW9abWxsYkdSTllYQXVkR2wwYkdVZ0lUMDlJRzlpYW1WamRDa2dKaVlnSVdacFpXeGtUV0Z3TG1OdmJuUmxiblFnSmlZZ1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUFoUFQwZ2JuVnNiQ0EvWEc0Z0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0ltSjFkSFJ2YmlCaWRYUjBiMjR0YzIxaGJHeGNJaUJrWVhSaExXWnBaV3hrUFZ3aVkyOXVkR1Z1ZEZ3aVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUFh0dmJrTnNhV05yUTI5dWRHVnVkSDArUTI5dWRHVnVkRHd2WVQ0Z09pQW5KMzFjYmlBZ0lDQWdJQ0FnZTJOb2FXeGtjbVZ1SUNZbUlFRnljbUY1TG1selFYSnlZWGtvYjJKcVpXTjBLU0FtSmlCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJRDA5UFNCdWRXeHNJRDljYmlBZ0lDQWdJQ0FnSUNBZ0lEeGhJR2h5WldZOVhDSWpYQ0lnWTJ4aGMzTk9ZVzFsUFZ3aVluVjBkRzl1SUdKMWRIUnZiaTF6YldGc2JGd2lJR1JoZEdFdFptbGxiR1E5WENKcGRHVnRRMjl1ZEdGcGJtVnlYQ0pjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzl1UTJ4cFkyczllMjl1UTJ4cFkydERiMjUwWVdsdVpYSjlQbE5sYkdWamREd3ZZVDRnT2lBbkozMWNiaUFnSUNBZ0lDQWdlMk5vYVd4a2NtVnVJRDhnUEhOd1lXNGdZMnhoYzNOT1lXMWxQVndpWkdGemFHbGpiMjV6SUdSaGMyaHBZMjl1Y3kxaGNuSnZkeTFrYjNkdVhDSStQQzl6Y0dGdVBpQTZJQ2NuZlZ4dUlDQWdJQ0FnSUNCN1kyaHBiR1J5Wlc0Z1B5QThkV3dnWTJ4aGMzTk9ZVzFsUFZ3aWMzVmlMVzlpYW1WamRGd2lQbnRqYUdsc1pISmxibjA4TDNWc1BpQTZJQ2NuZlZ4dUlDQWdJRHd2YkdrK0tUdGNibjFjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnVEdsemRFbDBaVzA3SWl3aWFXMXdiM0owSUVacFpXeGtVMlZzWldOMGFXOXVJR1p5YjIwZ0p5NHZSbWxsYkdSVFpXeGxZM1JwYjI0bk8xeHVhVzF3YjNKMElFbHVjSFYwUm1sbGJHUnpJR1p5YjIwZ0p5NHZTVzV3ZFhSR2FXVnNaSE1uTzF4dWFXMXdiM0owSUZOMWJXMWhjbmtnWm5KdmJTQW5MaTlUZFcxdFlYSjVKenRjYmx4dVkyOXVjM1FnYVc1cGRHbGhiRk4wWVhSbElEMGdlMXh1SUNBZ0lITm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJqb2dabUZzYzJVc1hHNGdJQ0FnZFhKc09pQW5KeXhjYmlBZ0lDQm1hV1ZzWkUxaGNEb2dlMXh1SUNBZ0lDQWdJQ0JwZEdWdFEyOXVkR0ZwYm1WeU9pQnVkV3hzTEZ4dUlDQWdJQ0FnSUNCMGFYUnNaVG9nSnljc1hHNGdJQ0FnSUNBZ0lHTnZiblJsYm5RNklDY25YRzRnSUNBZ2ZWeHVmVHRjYmx4dVkyeGhjM01nVTJWMGRHbHVaM01nWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZibk4wY25WamRHOXlLSEJ5YjNCektTQjdYRzRnSUNBZ0lDQWdJSE4xY0dWeUtIQnliM0J6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6ZEdGMFpTQTlJR2x1YVhScFlXeFRkR0YwWlR0Y2JseHVJQ0FnSUNBZ0lDQjBhR2x6TG5WeWJFTm9ZVzVuWlNBOUlIUm9hWE11ZFhKc1EyaGhibWRsTG1KcGJtUW9kR2hwY3lrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YUdGdVpHeGxVM1ZpYldsMElEMGdkR2hwY3k1b1lXNWtiR1ZUZFdKdGFYUXVZbWx1WkNoMGFHbHpLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXlaWE5sZEU5d2RHbHZibk1nUFNCMGFHbHpMbkpsYzJWMFQzQjBhVzl1Y3k1aWFXNWtLSFJvYVhNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5Wd1pHRjBaVVpwWld4a1RXRndJRDBnZEdocGN5NTFjR1JoZEdWR2FXVnNaRTFoY0M1aWFXNWtLSFJvYVhNcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUdOdmJYQnZibVZ1ZEVScFpFMXZkVzUwS0NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1sdWFYUlBjSFJwYjI1ektDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXNXBkRTl3ZEdsdmJuTW9LU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2JXOWtTbk52YmxKbGJtUmxjaTV2Y0hScGIyNXpJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXVjM1FnYjNCMGFXOXVjeUE5SUcxdlpFcHpiMjVTWlc1a1pYSXViM0IwYVc5dWN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ2IzQjBhVzl1Y3k1MWNtd2dQeUJ2Y0hScGIyNXpMblZ5YkNBNklDY25MRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndPaUJ2Y0hScGIyNXpMbVpwWld4a1RXRndJRDhnU2xOUFRpNXdZWEp6WlNodmNIUnBiMjV6TG1acFpXeGtUV0Z3S1NBNklIdHBkR1Z0UTI5dWRHRnBibVZ5T2lCdWRXeHNMQ0IwYVhSc1pUb2dKeWNzSUdOdmJuUmxiblE2SUNjbmZTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnphRzkzUm1sbGJHUlRaV3hsWTNScGIyNDZJQ0VoYjNCMGFXOXVjeTUxY214Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnZFhKc1EyaGhibWRsS0dWMlpXNTBLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lM1Z5YkRvZ1pYWmxiblF1ZEdGeVoyVjBMblpoYkhWbGZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FHRnVaR3hsVTNWaWJXbDBLR1YyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJR1YyWlc1MExuQnlaWFpsYm5SRVpXWmhkV3gwS0NrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvZTNOb2IzZEdhV1ZzWkZObGJHVmpkR2x2YmpvZ2RISjFaWDBwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsYzJWMFQzQjBhVzl1Y3lobGRtVnVkQ2tnZTF4dUlDQWdJQ0FnSUNCbGRtVnVkQzV3Y21WMlpXNTBSR1ZtWVhWc2RDZ3BPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtHbHVhWFJwWVd4VGRHRjBaU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkWEJrWVhSbFJtbGxiR1JOWVhBb2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnYm1WM1ZtRnNJRDBnVDJKcVpXTjBMbUZ6YzJsbmJpaDBhR2x6TG5OMFlYUmxMbVpwWld4a1RXRndMQ0IyWVd4MVpTazdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMyVjBVM1JoZEdVb2UyWnBaV3hrVFdGd09pQnVaWGRXWVd4OUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpXNWtaWElvS1NCN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUh0emFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0c0lIVnliSDBnUFNCMGFHbHpMbk4wWVhSbE8xeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN2FYUmxiVU52Ym5SaGFXNWxjaXdnZEdsMGJHVXNJR052Ym5SbGJuUjlJRDBnZEdocGN5NXpkR0YwWlM1bWFXVnNaRTFoY0R0Y2JseHVJQ0FnSUNBZ0lDQnBaaUFvZFhKc0lDWW1JR2wwWlcxRGIyNTBZV2x1WlhJZ0lUMDlJRzUxYkd3Z0ppWWdkR2wwYkdVZ0ppWWdZMjl1ZEdWdWRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFUzVnRiV0Z5ZVNCN0xpNHVkR2hwY3k1emRHRjBaWDBnTHo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQRWx1Y0hWMFJtbGxiR1J6SUhzdUxpNTBhR2x6TG5OMFlYUmxmU0F2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUc5dVEyeHBZMnM5ZTNSb2FYTXVjbVZ6WlhSUGNIUnBiMjV6ZlNCamJHRnpjMDVoYldVOVhDSmlkWFIwYjI1Y0lqNVNaWE5sZENCelpYUjBhVzVuY3p3dllUNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMMlJwZGo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4R2FXVnNaRk5sYkdWamRHbHZiaUIxY213OWUzVnliSDBnWm1sbGJHUk5ZWEE5ZTNSb2FYTXVjM1JoZEdVdVptbGxiR1JOWVhCOUlIVndaR0YwWlVacFpXeGtUV0Z3UFh0MGFHbHpMblZ3WkdGMFpVWnBaV3hrVFdGd2ZTOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4SmJuQjFkRVpwWld4a2N5QjdMaTR1ZEdocGN5NXpkR0YwWlgwZ0x6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdFZ2FISmxaajFjSWlOY0lpQnZia05zYVdOclBYdDBhR2x6TG5KbGMyVjBUM0IwYVc5dWMzMGdZMnhoYzNOT1lXMWxQVndpWW5WMGRHOXVYQ0krVW1WelpYUWdjMlYwZEdsdVozTThMMkUrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEM5a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMklHTnNZWE56VG1GdFpUMWNJbmR5WVhCY0lqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdadmNtMGdiMjVUZFdKdGFYUTllM1JvYVhNdWFHRnVaR3hsVTNWaWJXbDBmVDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHNZV0psYkQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhOMGNtOXVaejVFWVhSaElITnZkWEpqWlR3dmMzUnliMjVuUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZiR0ZpWld3K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR0p5THo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThhVDVGYm5SbGNpQmhJSFpoYkdsa0lFcFRUMDRnWVhCcElIVnliQzQ4TDJrK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwzQStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThhVzV3ZFhRZ2RIbHdaVDFjSW5SbGVIUmNJaUJqYkdGemMwNWhiV1U5WENKMWNtd3RhVzV3ZFhSY0lpQjJZV3gxWlQxN2RYSnNmU0J2YmtOb1lXNW5aVDE3ZEdocGN5NTFjbXhEYUdGdVoyVjlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh3UGp4cGJuQjFkQ0IwZVhCbFBWd2ljM1ZpYldsMFhDSWdZMnhoYzNOT1lXMWxQVndpWW5WMGRHOXVJR0oxZEhSdmJpMXdjbWx0WVhKNVhDSWdkbUZzZFdVOVhDSlRkV0p0YVhSY0lpOCtQQzl3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMMlp2Y20wK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhKYm5CMWRFWnBaV3hrY3lCN0xpNHVkR2hwY3k1emRHRjBaWDBnTHo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUZObGRIUnBibWR6T3lJc0ltWjFibU4wYVc5dUlGTjFiVzFoY25rb2NISnZjSE1wSUh0Y2JpQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0E4ZFd3K1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4YkdrK1JHRjBZU0J6YjNWeVkyVTZJSHR3Y205d2N5NTFjbXg5UEM5c2FUNWNiaUFnSUNBZ0lDQWdJQ0FnSUR4c2FUNVVhWFJzWlRvZ2UzQnliM0J6TG1acFpXeGtUV0Z3TG5ScGRHeGxmVHd2YkdrK1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4YkdrK1EyOXVkR1Z1ZERvZ2UzQnliM0J6TG1acFpXeGtUV0Z3TG1OdmJuUmxiblI5UEM5c2FUNWNiaUFnSUNBZ0lDQWdQQzkxYkQ1Y2JpQWdJQ0FwTzF4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQlRkVzF0WVhKNU95SXNJbWx0Y0c5eWRDQlRaWFIwYVc1bmN5Qm1jbTl0SUNjdUwwTnZiWEJ2Ym1WdWRITXZVMlYwZEdsdVozTW5PMXh1WEc1amIyNXpkQ0J0YjJSS2MyOXVVbVZ1WkdWeVJXeGxiV1Z1ZENBOUlDZHRiMlIxYkdGeWFYUjVMV3B6YjI0dGNtVnVaR1Z5Snp0Y2JtTnZibk4wSUdSdmJVVnNaVzFsYm5RZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNodGIyUktjMjl1VW1WdVpHVnlSV3hsYldWdWRDazdYRzVjYmxKbFlXTjBSRTlOTG5KbGJtUmxjaWhjYmlBZ0lDQThVMlYwZEdsdVozTWdMejRzWEc0Z0lDQWdaRzl0Uld4bGJXVnVkRnh1S1RzaUxDSm1kVzVqZEdsdmJpQm5aWFJCY0dsRVlYUmhLSFZ5YkNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJtWlhSamFDaDFjbXdwWEc0Z0lDQWdJQ0FnSUM1MGFHVnVLSEpsY3lBOVBpQnlaWE11YW5OdmJpZ3BLVnh1SUNBZ0lDQWdJQ0F1ZEdobGJpaGNiaUFnSUNBZ0lDQWdJQ0FnSUNoeVpYTjFiSFFwSUQwK0lDaDdjbVZ6ZFd4MGZTa3NYRzRnSUNBZ0lDQWdJQ0FnSUNBb1pYSnliM0lwSUQwK0lDaDdaWEp5YjNKOUtWeHVJQ0FnSUNBZ0lDQXBPMXh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCblpYUkJjR2xFWVhSaE8xeHVJbDE5XG4iXSwiZmlsZSI6IkFkbWluL0luZGV4QWRtaW4uanMifQ==
