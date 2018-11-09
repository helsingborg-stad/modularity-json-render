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
    } // TODO move to util method

  }, {
    key: "getApiData",
    value: function getApiData() {
      var _this2 = this;

      fetch(this.props.url).then(function (res) {
        return res.json();
      }).then(function (result) {
        _this2.setState({
          isLoaded: true,
          items: result
        });
      }, function (error) {
        _this2.setState({
          isLoaded: true,
          error: error
        });
      });
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      this.getApiData();
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

},{"./DataList":4}],6:[function(require,module,exports){
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

},{"./Components/Settings":8}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QkFBbUQsS0FBSyxDQUFDLEdBQXpELENBREosRUFFSSwyQ0FBWSxLQUFLLENBQUMsUUFBTixDQUFlLEtBQTNCLENBRkosRUFHSSw2Q0FBYyxLQUFLLENBQUMsUUFBTixDQUFlLE9BQTdCLENBSEosQ0FESjtBQU9IOztlQUVjLE87Ozs7OztBQ1ZmOzs7O0FBRUEsSUFBTSxvQkFBb0IsR0FBRyx3QkFBN0I7QUFDQSxJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBVCxDQUF3QixvQkFBeEIsQ0FBbkI7QUFFQSxRQUFRLENBQUMsTUFBVCxDQUNJLG9CQUFDLGlCQUFELE9BREosRUFFSSxVQUZKIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbmNvbnN0IHtpc09iamVjdCwgZ2V0S2V5c30gPSByZXF1aXJlKCcuL2xhbmcnKVxuXG4vLyBQUklWQVRFIFBST1BFUlRJRVNcbmNvbnN0IEJZUEFTU19NT0RFID0gJ19fYnlwYXNzTW9kZSdcbmNvbnN0IElHTk9SRV9DSVJDVUxBUiA9ICdfX2lnbm9yZUNpcmN1bGFyJ1xuY29uc3QgTUFYX0RFRVAgPSAnX19tYXhEZWVwJ1xuY29uc3QgQ0FDSEUgPSAnX19jYWNoZSdcbmNvbnN0IFFVRVVFID0gJ19fcXVldWUnXG5jb25zdCBTVEFURSA9ICdfX3N0YXRlJ1xuXG5jb25zdCBFTVBUWV9TVEFURSA9IHt9XG5cbmNsYXNzIFJlY3Vyc2l2ZUl0ZXJhdG9yIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSByb290XG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbYnlwYXNzTW9kZT0wXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtpZ25vcmVDaXJjdWxhcj1mYWxzZV1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFttYXhEZWVwPTEwMF1cbiAgICovXG4gIGNvbnN0cnVjdG9yIChyb290LCBieXBhc3NNb2RlID0gMCwgaWdub3JlQ2lyY3VsYXIgPSBmYWxzZSwgbWF4RGVlcCA9IDEwMCkge1xuICAgIHRoaXNbQllQQVNTX01PREVdID0gYnlwYXNzTW9kZVxuICAgIHRoaXNbSUdOT1JFX0NJUkNVTEFSXSA9IGlnbm9yZUNpcmN1bGFyXG4gICAgdGhpc1tNQVhfREVFUF0gPSBtYXhEZWVwXG4gICAgdGhpc1tDQUNIRV0gPSBbXVxuICAgIHRoaXNbUVVFVUVdID0gW11cbiAgICB0aGlzW1NUQVRFXSA9IHRoaXMuZ2V0U3RhdGUodW5kZWZpbmVkLCByb290KVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgbmV4dCAoKSB7XG4gICAgY29uc3Qge25vZGUsIHBhdGgsIGRlZXB9ID0gdGhpc1tTVEFURV0gfHwgRU1QVFlfU1RBVEVcblxuICAgIGlmICh0aGlzW01BWF9ERUVQXSA+IGRlZXApIHtcbiAgICAgIGlmICh0aGlzLmlzTm9kZShub2RlKSkge1xuICAgICAgICBpZiAodGhpcy5pc0NpcmN1bGFyKG5vZGUpKSB7XG4gICAgICAgICAgaWYgKHRoaXNbSUdOT1JFX0NJUkNVTEFSXSkge1xuICAgICAgICAgICAgLy8gc2tpcFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NpcmN1bGFyIHJlZmVyZW5jZScpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0aGlzLm9uU3RlcEludG8odGhpc1tTVEFURV0pKSB7XG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdG9ycyA9IHRoaXMuZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzKG5vZGUsIHBhdGgsIGRlZXApXG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSB0aGlzW0JZUEFTU19NT0RFXSA/ICdwdXNoJyA6ICd1bnNoaWZ0J1xuICAgICAgICAgICAgdGhpc1tRVUVVRV1bbWV0aG9kXSguLi5kZXNjcmlwdG9ycylcbiAgICAgICAgICAgIHRoaXNbQ0FDSEVdLnB1c2gobm9kZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IHRoaXNbUVVFVUVdLnNoaWZ0KClcbiAgICBjb25zdCBkb25lID0gIXZhbHVlXG5cbiAgICB0aGlzW1NUQVRFXSA9IHZhbHVlXG5cbiAgICBpZiAoZG9uZSkgdGhpcy5kZXN0cm95KClcblxuICAgIHJldHVybiB7dmFsdWUsIGRvbmV9XG4gIH1cbiAgLyoqXG4gICAqXG4gICAqL1xuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzW1FVRVVFXS5sZW5ndGggPSAwXG4gICAgdGhpc1tDQUNIRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbU1RBVEVdID0gbnVsbFxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzTm9kZSAoYW55KSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0xlYWYgKGFueSkge1xuICAgIHJldHVybiAhdGhpcy5pc05vZGUoYW55KVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzQ2lyY3VsYXIgKGFueSkge1xuICAgIHJldHVybiB0aGlzW0NBQ0hFXS5pbmRleE9mKGFueSkgIT09IC0xXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGVzIG9mIGNoaWxkIG5vZGVzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhdGhcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlZXBcbiAgICogQHJldHVybnMge0FycmF5PE9iamVjdD59XG4gICAqL1xuICBnZXRTdGF0ZXNPZkNoaWxkTm9kZXMgKG5vZGUsIHBhdGgsIGRlZXApIHtcbiAgICByZXR1cm4gZ2V0S2V5cyhub2RlKS5tYXAoa2V5ID0+XG4gICAgICB0aGlzLmdldFN0YXRlKG5vZGUsIG5vZGVba2V5XSwga2V5LCBwYXRoLmNvbmNhdChrZXkpLCBkZWVwICsgMSlcbiAgICApXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGUgb2Ygbm9kZS4gQ2FsbHMgZm9yIGVhY2ggbm9kZVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3BhcmVudF1cbiAgICogQHBhcmFtIHsqfSBbbm9kZV1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXldXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtwYXRoXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW2RlZXBdXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBnZXRTdGF0ZSAocGFyZW50LCBub2RlLCBrZXksIHBhdGggPSBbXSwgZGVlcCA9IDApIHtcbiAgICByZXR1cm4ge3BhcmVudCwgbm9kZSwga2V5LCBwYXRoLCBkZWVwfVxuICB9XG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvblN0ZXBJbnRvIChzdGF0ZSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtSZWN1cnNpdmVJdGVyYXRvcn1cbiAgICovXG4gIFtTeW1ib2wuaXRlcmF0b3JdICgpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjdXJzaXZlSXRlcmF0b3JcbiIsIid1c2Ugc3RyaWN0J1xuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0IChhbnkpIHtcbiAgcmV0dXJuIGFueSAhPT0gbnVsbCAmJiB0eXBlb2YgYW55ID09PSAnb2JqZWN0J1xufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmNvbnN0IHtpc0FycmF5fSA9IEFycmF5XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNBcnJheUxpa2UgKGFueSkge1xuICBpZiAoIWlzT2JqZWN0KGFueSkpIHJldHVybiBmYWxzZVxuICBpZiAoISgnbGVuZ3RoJyBpbiBhbnkpKSByZXR1cm4gZmFsc2VcbiAgY29uc3QgbGVuZ3RoID0gYW55Lmxlbmd0aFxuICBpZiAoIWlzTnVtYmVyKGxlbmd0aCkpIHJldHVybiBmYWxzZVxuICBpZiAobGVuZ3RoID4gMCkge1xuICAgIHJldHVybiAobGVuZ3RoIC0gMSkgaW4gYW55XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYW55KSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWJlciAoYW55KSB7XG4gIHJldHVybiB0eXBlb2YgYW55ID09PSAnbnVtYmVyJ1xufVxuLyoqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gb2JqZWN0XG4gKiBAcmV0dXJucyB7QXJyYXk8U3RyaW5nPn1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5cyAob2JqZWN0KSB7XG4gIGNvbnN0IGtleXNfID0gT2JqZWN0LmtleXMob2JqZWN0KVxuICBpZiAoaXNBcnJheShvYmplY3QpKSB7XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSBpZiAoaXNBcnJheUxpa2Uob2JqZWN0KSkge1xuICAgIGNvbnN0IGluZGV4ID0ga2V5c18uaW5kZXhPZignbGVuZ3RoJylcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAga2V5c18uc3BsaWNlKGluZGV4LCAxKVxuICAgIH1cbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIHtcbiAgICAvLyBzb3J0XG4gICAga2V5c18uc29ydCgpXG4gIH1cbiAgcmV0dXJuIGtleXNfXG59XG5cbmV4cG9ydHMuZ2V0S2V5cyA9IGdldEtleXNcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXlcbmV4cG9ydHMuaXNBcnJheUxpa2UgPSBpc0FycmF5TGlrZVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXJcbiIsImltcG9ydCBMaXN0SXRlbSBmcm9tICcuL0xpc3RJdGVtJztcbmltcG9ydCByZWN1cnNpdmVJdGVyYXRvciBmcm9tICdyZWN1cnNpdmUtaXRlcmF0b3InO1xuaW1wb3J0IG9iamVjdFBhdGggZnJvbSAnb2JqZWN0LXBhdGgnO1xuXG5jbGFzcyBEYXRhTGlzdCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnJlbmRlck5vZGVzID0gdGhpcy5yZW5kZXJOb2Rlcy5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnNldEZpZWxkTWFwID0gdGhpcy5zZXRGaWVsZE1hcC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAoe1tldmVudC50YXJnZXQuZGF0YXNldC5maWVsZF06IHBhdGh9KTtcbiAgICB9XG5cbiAgICByZW5kZXJOb2RlcyhkYXRhKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ29iamVjdFBhdGgnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgY2hpbGQgPSA8TGlzdEl0ZW0ga2V5PXtpdGVtLnRvU3RyaW5nKCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2l0ZW19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0PXtkYXRhW2l0ZW1dfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnByb3BzLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250YWluZXI9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLm9iamVjdFBhdGgsIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tUaXRsZT17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250ZW50PXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSl9Lz47XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtpdGVtXSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KGRhdGFbaXRlbV0pID8gdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IGZpZWxkTWFwID0gdGhpcy5wcm9wcy5maWVsZE1hcDtcblxuICAgICAgICBsZXQgZGF0YSA9IHRoaXMucHJvcHMuZGF0YTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhWzBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCB7cGFyZW50LCBub2RlLCBrZXksIHBhdGh9IG9mIG5ldyByZWN1cnNpdmVJdGVyYXRvcihkYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ29iamVjdCcgJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RQYXRoLnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMz5TZWxlY3QgaXRlbXMgY29udGFpbmVyPC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsPnt0aGlzLnJlbmRlck5vZGVzKGRhdGEpfTwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG9iamVjdERhdGEgPSBvYmplY3RQYXRoLmdldCh0aGlzLnByb3BzLmRhdGEsIGZpZWxkTWFwLml0ZW1Db250YWluZXIpO1xuXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3REYXRhKSkge1xuICAgICAgICAgICAgICAgIG9iamVjdERhdGEgPSBvYmplY3REYXRhWzBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCB7cGFyZW50LCBub2RlLCBrZXksIHBhdGh9IG9mIG5ldyByZWN1cnNpdmVJdGVyYXRvcihvYmplY3REYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqZWN0RGF0YSwgcGF0aFN0cmluZywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMz5TZWxlY3QgdGl0bGUgYW5kIGNvbnRlbnQgZmllbGRzPC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsPnt0aGlzLnJlbmRlck5vZGVzKG9iamVjdERhdGEpfTwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBEYXRhTGlzdDsiLCJpbXBvcnQgRGF0YUxpc3QgZnJvbSAnLi9EYXRhTGlzdCc7XG5cbmNsYXNzIEZpZWxkU2VsZWN0aW9uIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGl0ZW1zOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMudXBkYXRlRmllbGRNYXAgPSB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyBtb3ZlIHRvIHV0aWwgbWV0aG9kXG4gICAgZ2V0QXBpRGF0YSgpIHtcbiAgICAgICAgZmV0Y2godGhpcy5wcm9wcy51cmwpXG4gICAgICAgICAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuZ2V0QXBpRGF0YSgpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge2Vycm9yLCBpc0xvYWRlZCwgaXRlbXN9ID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdj5FcnJvcjoge2Vycm9yLm1lc3NhZ2V9PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIiBzdHlsZT17e2Zsb2F0OiAnbm9uZScsIGRpc3BsYXk6ICdibG9jaycsIHdpZHRoOiAnYXV0bycsIGhlaWdodDogJ2F1dG8nLCBwYWRkaW5nOiAnMTBweCAxMHB4IDMwcHggMTBweCd9fT48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gPERhdGFMaXN0XG4gICAgICAgICAgICAgICAgZGF0YT17aXRlbXN9XG4gICAgICAgICAgICAgICAgdXJsPXt0aGlzLnByb3BzLnVybH1cbiAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICB1cGRhdGVGaWVsZE1hcD17dGhpcy51cGRhdGVGaWVsZE1hcH0vPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRmllbGRTZWxlY3Rpb247IiwiZnVuY3Rpb24gSW5wdXRGaWVsZHMocHJvcHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX3VybFwiIHZhbHVlPXtwcm9wcy51cmx9Lz5cbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiIHZhbHVlPXtKU09OLnN0cmluZ2lmeShwcm9wcy5maWVsZE1hcCl9Lz5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgSW5wdXRGaWVsZHM7IiwiZnVuY3Rpb24gTGlzdEl0ZW0ocHJvcHMpIHtcbiAgICBjb25zdCB7dmFsdWUsIGNoaWxkcmVuLCBmaWVsZE1hcCwgb2JqZWN0LCBvbkNsaWNrVGl0bGUsIG9uQ2xpY2tDb250ZW50LCBvbkNsaWNrQ29udGFpbmVyfSA9IHByb3BzO1xuICAgIHJldHVybiAoPGxpPlxuICAgICAgICB7ZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCA/IDxzdHJvbmc+VGl0bGU6IDwvc3Ryb25nPiA6ICcnfVxuICAgICAgICB7ZmllbGRNYXAuY29udGVudCA9PT0gb2JqZWN0ID8gPHN0cm9uZz5Db250ZW50OiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAge2NoaWxkcmVuID8gPHN0cm9uZz57dmFsdWV9PC9zdHJvbmc+IDogPHNwYW4+e3ZhbHVlfTwvc3Bhbj59XG4gICAgICAgIHshY2hpbGRyZW4gJiYgIWZpZWxkTWFwLnRpdGxlICYmIChmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgP1xuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXNtYWxsXCIgZGF0YS1maWVsZD1cInRpdGxlXCIgb25DbGljaz17b25DbGlja1RpdGxlfT5UaXRsZTwvYT4gOiAnJ31cbiAgICAgICAgeyFjaGlsZHJlbiAmJiAoZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCkgJiYgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/XG4gICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tc21hbGxcIiBkYXRhLWZpZWxkPVwiY29udGVudFwiXG4gICAgICAgICAgICAgICBvbkNsaWNrPXtvbkNsaWNrQ29udGVudH0+Q29udGVudDwvYT4gOiAnJ31cbiAgICAgICAge2NoaWxkcmVuICYmIEFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsID9cbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiIGRhdGEtZmllbGQ9XCJpdGVtQ29udGFpbmVyXCJcbiAgICAgICAgICAgICAgIG9uQ2xpY2s9e29uQ2xpY2tDb250YWluZXJ9PlNlbGVjdDwvYT4gOiAnJ31cbiAgICAgICAge2NoaWxkcmVuID8gPHNwYW4gY2xhc3NOYW1lPVwiZGFzaGljb25zIGRhc2hpY29ucy1hcnJvdy1kb3duXCI+PC9zcGFuPiA6ICcnfVxuICAgICAgICB7Y2hpbGRyZW4gPyA8dWwgc3R5bGU9e3twYWRkaW5nTGVmdDogMTUsIGJvcmRlckxlZnQ6ICcycHggc29saWQgI2NjYyd9fT57Y2hpbGRyZW59PC91bD4gOiAnJ31cbiAgICA8L2xpPik7XG59XG5cbmV4cG9ydCBkZWZhdWx0IExpc3RJdGVtOyIsImltcG9ydCBGaWVsZFNlbGVjdGlvbiBmcm9tICcuL0ZpZWxkU2VsZWN0aW9uJztcbmltcG9ydCBJbnB1dEZpZWxkcyBmcm9tICcuL0lucHV0RmllbGRzJztcbmltcG9ydCBTdW1tYXJ5IGZyb20gJy4vU3VtbWFyeSc7XG5cbmNvbnN0IGluaXRpYWxTdGF0ZSA9IHtcbiAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgIHVybDogJycsXG4gICAgZmllbGRNYXA6IHtcbiAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBjb250ZW50OiAnJ1xuICAgIH1cbn07XG5cbmNsYXNzIFNldHRpbmdzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBpbml0aWFsU3RhdGU7XG5cbiAgICAgICAgdGhpcy51cmxDaGFuZ2UgPSB0aGlzLnVybENoYW5nZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmhhbmRsZVN1Ym1pdCA9IHRoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucmVzZXRPcHRpb25zID0gdGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy51cGRhdGVGaWVsZE1hcCA9IHRoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cblxuICAgIGluaXRPcHRpb25zKCkge1xuICAgICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7aXRlbUNvbnRhaW5lcjogbnVsbCwgdGl0bGU6ICcnLCBjb250ZW50OiAnJ30sXG4gICAgICAgICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiAhIW9wdGlvbnMudXJsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHVybENoYW5nZShldmVudCkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHt1cmw6IGV2ZW50LnRhcmdldC52YWx1ZX0pO1xuICAgIH1cblxuICAgIGhhbmRsZVN1Ym1pdChldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtzaG93RmllbGRTZWxlY3Rpb246IHRydWV9KTtcbiAgICB9XG5cbiAgICByZXNldE9wdGlvbnMoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZShpbml0aWFsU3RhdGUpO1xuICAgIH1cblxuICAgIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IG5ld1ZhbCA9IE9iamVjdC5hc3NpZ24odGhpcy5zdGF0ZS5maWVsZE1hcCwgdmFsdWUpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtmaWVsZE1hcDogbmV3VmFsfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCB7c2hvd0ZpZWxkU2VsZWN0aW9uLCB1cmx9ID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3Qge2l0ZW1Db250YWluZXIsIHRpdGxlLCBjb250ZW50fSA9IHRoaXMuc3RhdGUuZmllbGRNYXA7XG5cbiAgICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPFN1bW1hcnkgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBvbkNsaWNrPXt0aGlzLnJlc2V0T3B0aW9uc30gY2xhc3NOYW1lPVwiYnV0dG9uXCI+UmVzZXQgc2V0dGluZ3M8L2E+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHNob3dGaWVsZFNlbGVjdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8RmllbGRTZWxlY3Rpb24gdXJsPXt1cmx9IGZpZWxkTWFwPXt0aGlzLnN0YXRlLmZpZWxkTWFwfSB1cGRhdGVGaWVsZE1hcD17dGhpcy51cGRhdGVGaWVsZE1hcH0vPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnN9IGNsYXNzTmFtZT1cImJ1dHRvblwiPlJlc2V0IHNldHRpbmdzPC9hPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3cmFwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxmb3JtIG9uU3VibWl0PXt0aGlzLmhhbmRsZVN1Ym1pdH0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+RGF0YSBzb3VyY2U8L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGk+RW50ZXIgYSB2YWxpZCBKU09OIGFwaSB1cmwuPC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgc3R5bGU9e3t3aWR0aDogJzEwMCUnfX0gdmFsdWU9e3VybH0gb25DaGFuZ2U9e3RoaXMudXJsQ2hhbmdlfS8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD48aW5wdXQgdHlwZT1cInN1Ym1pdFwiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tcHJpbWFyeVwiIHZhbHVlPVwiU3VibWl0XCIvPjwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBTZXR0aW5nczsiLCJmdW5jdGlvbiBTdW1tYXJ5KHByb3BzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPHVsPlxuICAgICAgICAgICAgPGxpIHN0eWxlPXt7d29yZEJyZWFrOiAnYnJlYWstYWxsJ319PkRhdGEgc291cmNlOiB7cHJvcHMudXJsfTwvbGk+XG4gICAgICAgICAgICA8bGk+VGl0bGU6IHtwcm9wcy5maWVsZE1hcC50aXRsZX08L2xpPlxuICAgICAgICAgICAgPGxpPkNvbnRlbnQ6IHtwcm9wcy5maWVsZE1hcC5jb250ZW50fTwvbGk+XG4gICAgICAgIDwvdWw+XG4gICAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgU3VtbWFyeTsiLCJpbXBvcnQgU2V0dGluZ3MgZnJvbSAnLi9Db21wb25lbnRzL1NldHRpbmdzJztcblxuY29uc3QgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG5jb25zdCBkb21FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kSnNvblJlbmRlckVsZW1lbnQpO1xuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPFNldHRpbmdzIC8+LFxuICAgIGRvbUVsZW1lbnRcbik7Il19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdChwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnJlbmRlck5vZGVzID0gX3RoaXMucmVuZGVyTm9kZXMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMuc2V0RmllbGRNYXAgPSBfdGhpcy5zZXRGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGlmIChpdGVtID09PSAnb2JqZWN0UGF0aCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBSZWFjdC5jcmVhdGVFbGVtZW50KF9MaXN0SXRlbS5kZWZhdWx0LCB7XG4gICAgICAgICAga2V5OiBpdGVtLnRvU3RyaW5nKCksXG4gICAgICAgICAgdmFsdWU6IGl0ZW0sXG4gICAgICAgICAgb2JqZWN0OiBkYXRhW2l0ZW1dLFxuICAgICAgICAgIGZpZWxkTWFwOiBfdGhpczIucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgb25DbGlja0NvbnRhaW5lcjogZnVuY3Rpb24gb25DbGlja0NvbnRhaW5lcihlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb25DbGlja0NvbnRlbnQ6IGZ1bmN0aW9uIG9uQ2xpY2tDb250ZW50KGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczIuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoX3R5cGVvZihkYXRhW2l0ZW1dKSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvciA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvciA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChkYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcCR2YWx1ZSA9IF9zdGVwLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcCR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpID09PSAnb2JqZWN0JyAmJiBub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvci5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCBpdGVtcyBjb250YWluZXJcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCBudWxsLCB0aGlzLnJlbmRlck5vZGVzKGRhdGEpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2JqZWN0RGF0YSA9IF9vYmplY3RQYXRoLmRlZmF1bHQuZ2V0KHRoaXMucHJvcHMuZGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lcik7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWU7XG4gICAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvcjIgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yMiA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvcjIgPSBuZXcgX3JlY3Vyc2l2ZUl0ZXJhdG9yLmRlZmF1bHQob2JqZWN0RGF0YSlbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDI7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSAoX3N0ZXAyID0gX2l0ZXJhdG9yMi5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcDIkdmFsdWUgPSBfc3RlcDIudmFsdWUsXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gX3N0ZXAyJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAyJHZhbHVlLm5vZGUsXG4gICAgICAgICAgICAgICAga2V5ID0gX3N0ZXAyJHZhbHVlLmtleSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3N0ZXAyJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICB2YXIgX3BhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcblxuICAgICAgICAgICAgICBfb2JqZWN0UGF0aC5kZWZhdWx0LnNldChvYmplY3REYXRhLCBfcGF0aFN0cmluZywgX3BhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IyID0gdHJ1ZTtcbiAgICAgICAgICBfaXRlcmF0b3JFcnJvcjIgPSBlcnI7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgJiYgX2l0ZXJhdG9yMi5yZXR1cm4gIT0gbnVsbCkge1xuICAgICAgICAgICAgICBfaXRlcmF0b3IyLnJldHVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IyKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaDNcIiwgbnVsbCwgXCJTZWxlY3QgdGl0bGUgYW5kIGNvbnRlbnQgZmllbGRzXCIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgdGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBEYXRhTGlzdDtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRGF0YUxpc3Q7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0xpc3RJdGVtXCI6NyxcIm9iamVjdC1wYXRoXCI6MSxcInJlY3Vyc2l2ZS1pdGVyYXRvclwiOjJ9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0RhdGFMaXN0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9EYXRhTGlzdFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRmllbGRTZWxlY3Rpb24gPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKEZpZWxkU2VsZWN0aW9uLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBGaWVsZFNlbGVjdGlvbihwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBGaWVsZFNlbGVjdGlvbik7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihGaWVsZFNlbGVjdGlvbikuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuICAgIF90aGlzLnVwZGF0ZUZpZWxkTWFwID0gX3RoaXMudXBkYXRlRmllbGRNYXAuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKEZpZWxkU2VsZWN0aW9uLCBbe1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfSAvLyBUT0RPIG1vdmUgdG8gdXRpbCBtZXRob2RcblxuICB9LCB7XG4gICAga2V5OiBcImdldEFwaURhdGFcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0QXBpRGF0YSgpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICBmZXRjaCh0aGlzLnByb3BzLnVybCkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgaXRlbXM6IHJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgIGlzTG9hZGVkOiB0cnVlLFxuICAgICAgICAgIGVycm9yOiBlcnJvclxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuZ2V0QXBpRGF0YSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBlcnJvciA9IF90aGlzJHN0YXRlLmVycm9yLFxuICAgICAgICAgIGlzTG9hZGVkID0gX3RoaXMkc3RhdGUuaXNMb2FkZWQsXG4gICAgICAgICAgaXRlbXMgPSBfdGhpcyRzdGF0ZS5pdGVtcztcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFwiRXJyb3I6IFwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwic3Bpbm5lciBpcy1hY3RpdmVcIixcbiAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgZmxvYXQ6ICdub25lJyxcbiAgICAgICAgICAgIGRpc3BsYXk6ICdibG9jaycsXG4gICAgICAgICAgICB3aWR0aDogJ2F1dG8nLFxuICAgICAgICAgICAgaGVpZ2h0OiAnYXV0bycsXG4gICAgICAgICAgICBwYWRkaW5nOiAnMTBweCAxMHB4IDMwcHggMTBweCdcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0RhdGFMaXN0LmRlZmF1bHQsIHtcbiAgICAgICAgICBkYXRhOiBpdGVtcyxcbiAgICAgICAgICB1cmw6IHRoaXMucHJvcHMudXJsLFxuICAgICAgICAgIGZpZWxkTWFwOiB0aGlzLnByb3BzLmZpZWxkTWFwLFxuICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwOiB0aGlzLnVwZGF0ZUZpZWxkTWFwXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBGaWVsZFNlbGVjdGlvbjtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRmllbGRTZWxlY3Rpb247XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0RhdGFMaXN0XCI6NH1dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIElucHV0RmllbGRzKHByb3BzKSB7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl91cmxcIixcbiAgICB2YWx1ZTogcHJvcHMudXJsXG4gIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgIHR5cGU6IFwiaGlkZGVuXCIsXG4gICAgbmFtZTogXCJtb2RfanNvbl9yZW5kZXJfZmllbGRtYXBcIixcbiAgICB2YWx1ZTogSlNPTi5zdHJpbmdpZnkocHJvcHMuZmllbGRNYXApXG4gIH0pKTtcbn1cblxudmFyIF9kZWZhdWx0ID0gSW5wdXRGaWVsZHM7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gTGlzdEl0ZW0ocHJvcHMpIHtcbiAgdmFyIHZhbHVlID0gcHJvcHMudmFsdWUsXG4gICAgICBjaGlsZHJlbiA9IHByb3BzLmNoaWxkcmVuLFxuICAgICAgZmllbGRNYXAgPSBwcm9wcy5maWVsZE1hcCxcbiAgICAgIG9iamVjdCA9IHByb3BzLm9iamVjdCxcbiAgICAgIG9uQ2xpY2tUaXRsZSA9IHByb3BzLm9uQ2xpY2tUaXRsZSxcbiAgICAgIG9uQ2xpY2tDb250ZW50ID0gcHJvcHMub25DbGlja0NvbnRlbnQsXG4gICAgICBvbkNsaWNrQ29udGFpbmVyID0gcHJvcHMub25DbGlja0NvbnRhaW5lcjtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBmaWVsZE1hcC50aXRsZSA9PT0gb2JqZWN0ID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIlRpdGxlOiBcIikgOiAnJywgZmllbGRNYXAuY29udGVudCA9PT0gb2JqZWN0ID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIkNvbnRlbnQ6IFwiKSA6ICcnLCBjaGlsZHJlbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgdmFsdWUpIDogUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCAhY2hpbGRyZW4gJiYgIWZpZWxkTWFwLnRpdGxlICYmIGZpZWxkTWFwLmNvbnRlbnQgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgIGhyZWY6IFwiI1wiLFxuICAgIGNsYXNzTmFtZTogXCJidXR0b24gYnV0dG9uLXNtYWxsXCIsXG4gICAgXCJkYXRhLWZpZWxkXCI6IFwidGl0bGVcIixcbiAgICBvbkNsaWNrOiBvbkNsaWNrVGl0bGVcbiAgfSwgXCJUaXRsZVwiKSA6ICcnLCAhY2hpbGRyZW4gJiYgZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCAmJiAhZmllbGRNYXAuY29udGVudCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgIGhyZWY6IFwiI1wiLFxuICAgIGNsYXNzTmFtZTogXCJidXR0b24gYnV0dG9uLXNtYWxsXCIsXG4gICAgXCJkYXRhLWZpZWxkXCI6IFwiY29udGVudFwiLFxuICAgIG9uQ2xpY2s6IG9uQ2xpY2tDb250ZW50XG4gIH0sIFwiQ29udGVudFwiKSA6ICcnLCBjaGlsZHJlbiAmJiBBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiBcIiNcIixcbiAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiLFxuICAgIFwiZGF0YS1maWVsZFwiOiBcIml0ZW1Db250YWluZXJcIixcbiAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGFpbmVyXG4gIH0sIFwiU2VsZWN0XCIpIDogJycsIGNoaWxkcmVuID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwge1xuICAgIGNsYXNzTmFtZTogXCJkYXNoaWNvbnMgZGFzaGljb25zLWFycm93LWRvd25cIlxuICB9KSA6ICcnLCBjaGlsZHJlbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCB7XG4gICAgc3R5bGU6IHtcbiAgICAgIHBhZGRpbmdMZWZ0OiAxNSxcbiAgICAgIGJvcmRlckxlZnQ6ICcycHggc29saWQgI2NjYydcbiAgICB9XG4gIH0sIGNoaWxkcmVuKSA6ICcnKTtcbn1cblxudmFyIF9kZWZhdWx0ID0gTGlzdEl0ZW07XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9GaWVsZFNlbGVjdGlvbiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRmllbGRTZWxlY3Rpb25cIikpO1xuXG52YXIgX0lucHV0RmllbGRzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9JbnB1dEZpZWxkc1wiKSk7XG5cbnZhciBfU3VtbWFyeSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vU3VtbWFyeVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgaW5pdGlhbFN0YXRlID0ge1xuICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICB1cmw6ICcnLFxuICBmaWVsZE1hcDoge1xuICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgdGl0bGU6ICcnLFxuICAgIGNvbnRlbnQ6ICcnXG4gIH1cbn07XG5cbnZhciBTZXR0aW5ncyA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoU2V0dGluZ3MsIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIFNldHRpbmdzKHByb3BzKSB7XG4gICAgdmFyIF90aGlzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFNldHRpbmdzKTtcblxuICAgIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKFNldHRpbmdzKS5jYWxsKHRoaXMsIHByb3BzKSk7XG4gICAgX3RoaXMuc3RhdGUgPSBpbml0aWFsU3RhdGU7XG4gICAgX3RoaXMudXJsQ2hhbmdlID0gX3RoaXMudXJsQ2hhbmdlLmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIF90aGlzLmhhbmRsZVN1Ym1pdCA9IF90aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICBfdGhpcy5yZXNldE9wdGlvbnMgPSBfdGhpcy5yZXNldE9wdGlvbnMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMudXBkYXRlRmllbGRNYXAgPSBfdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoU2V0dGluZ3MsIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbml0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0T3B0aW9ucygpIHtcbiAgICAgIGlmICh0eXBlb2YgbW9kSnNvblJlbmRlci5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IG1vZEpzb25SZW5kZXIub3B0aW9ucztcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVybENoYW5nZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB1cmw6IGV2ZW50LnRhcmdldC52YWx1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImhhbmRsZVN1Ym1pdFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVzZXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoaW5pdGlhbFN0YXRlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwidXBkYXRlRmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgIHZhciBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBmaWVsZE1hcDogbmV3VmFsXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSA9IHRoaXMuc3RhdGUsXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uID0gX3RoaXMkc3RhdGUuc2hvd0ZpZWxkU2VsZWN0aW9uLFxuICAgICAgICAgIHVybCA9IF90aGlzJHN0YXRlLnVybDtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSRmaWVsZE1hcCA9IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgaXRlbUNvbnRhaW5lciA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLml0ZW1Db250YWluZXIsXG4gICAgICAgICAgdGl0bGUgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC50aXRsZSxcbiAgICAgICAgICBjb250ZW50ID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuY29udGVudDtcblxuICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChfU3VtbWFyeS5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucyxcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uXCJcbiAgICAgICAgfSwgXCJSZXNldCBzZXR0aW5nc1wiKSk7XG4gICAgICB9IGVsc2UgaWYgKHNob3dGaWVsZFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9GaWVsZFNlbGVjdGlvbi5kZWZhdWx0LCB7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZmllbGRNYXA6IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXBcbiAgICAgICAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgaHJlZjogXCIjXCIsXG4gICAgICAgICAgb25DbGljazogdGhpcy5yZXNldE9wdGlvbnMsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvblwiXG4gICAgICAgIH0sIFwiUmVzZXQgc2V0dGluZ3NcIikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJ3cmFwXCJcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImZvcm1cIiwge1xuICAgICAgICAgIG9uU3VibWl0OiB0aGlzLmhhbmRsZVN1Ym1pdFxuICAgICAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIkRhdGEgc291cmNlXCIpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCBudWxsLCBcIkVudGVyIGEgdmFsaWQgSlNPTiBhcGkgdXJsLlwiKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgIHdpZHRoOiAnMTAwJSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHZhbHVlOiB1cmwsXG4gICAgICAgICAgb25DaGFuZ2U6IHRoaXMudXJsQ2hhbmdlXG4gICAgICAgIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwic3VibWl0XCIsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvbiBidXR0b24tcHJpbWFyeVwiLFxuICAgICAgICAgIHZhbHVlOiBcIlN1Ym1pdFwiXG4gICAgICAgIH0pKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gU2V0dGluZ3M7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IFNldHRpbmdzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9GaWVsZFNlbGVjdGlvblwiOjUsXCIuL0lucHV0RmllbGRzXCI6NixcIi4vU3VtbWFyeVwiOjl9XSw5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBTdW1tYXJ5KHByb3BzKSB7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIHtcbiAgICBzdHlsZToge1xuICAgICAgd29yZEJyZWFrOiAnYnJlYWstYWxsJ1xuICAgIH1cbiAgfSwgXCJEYXRhIHNvdXJjZTogXCIsIHByb3BzLnVybCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBcIlRpdGxlOiBcIiwgcHJvcHMuZmllbGRNYXAudGl0bGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgXCJDb250ZW50OiBcIiwgcHJvcHMuZmllbGRNYXAuY29udGVudCkpO1xufVxuXG52YXIgX2RlZmF1bHQgPSBTdW1tYXJ5O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDEwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX1NldHRpbmdzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9Db21wb25lbnRzL1NldHRpbmdzXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xudmFyIGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5SZWFjdERPTS5yZW5kZXIoUmVhY3QuY3JlYXRlRWxlbWVudChfU2V0dGluZ3MuZGVmYXVsdCwgbnVsbCksIGRvbUVsZW1lbnQpO1xuXG59LHtcIi4vQ29tcG9uZW50cy9TZXR0aW5nc1wiOjh9XX0se30sWzEwXSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmIySnFaV04wTFhCaGRHZ3ZhVzVrWlhndWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmNtVmpkWEp6YVhabExXbDBaWEpoZEc5eUwzTnlZeTlTWldOMWNuTnBkbVZKZEdWeVlYUnZjaTVxY3lJc0ltNXZaR1ZmYlc5a2RXeGxjeTl5WldOMWNuTnBkbVV0YVhSbGNtRjBiM0l2YzNKakwyeGhibWN1YW5NaUxDSnpiM1Z5WTJVdmFuTXZRV1J0YVc0dlEyOXRjRzl1Wlc1MGN5OUVZWFJoVEdsemRDNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlEYjIxd2IyNWxiblJ6TDBacFpXeGtVMlZzWldOMGFXOXVMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlNXNXdkWFJHYVdWc1pITXVhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5TWFYTjBTWFJsYlM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMU5sZEhScGJtZHpMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlUzVnRiV0Z5ZVM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOUpibVJsZUVGa2JXbHVMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVTndVMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOeVNVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPenM3T3pzN096dEJReTlFUVRzN1FVRkRRVHM3UVVGRFFUczdPenM3T3pzN096czdPenM3T3pzN096czdPenM3TzBsQlJVMHNVVHM3T3pzN1FVRkRSaXh2UWtGQldTeExRVUZhTEVWQlFXMUNPMEZCUVVFN08wRkJRVUU3TzBGQlEyWXNhMFpCUVUwc1MwRkJUanRCUVVOQkxGVkJRVXNzVjBGQlRDeEhRVUZ0UWl4TlFVRkxMRmRCUVV3c1EwRkJhVUlzU1VGQmFrSXNkVVJCUVc1Q08wRkJRMEVzVlVGQlN5eFhRVUZNTEVkQlFXMUNMRTFCUVVzc1YwRkJUQ3hEUVVGcFFpeEpRVUZxUWl4MVJFRkJia0k3UVVGSVpUdEJRVWxzUWpzN096dG5RMEZGVnl4SkxFVkJRVTBzU3l4RlFVRlBPMEZCUTNKQ0xFMUJRVUVzUzBGQlN5eERRVUZETEdOQlFVNDdRVUZEUVN4WFFVRkxMRXRCUVV3c1EwRkJWeXhqUVVGWUxIRkNRVUUwUWl4TFFVRkxMRU5CUVVNc1RVRkJUaXhEUVVGaExFOUJRV0lzUTBGQmNVSXNTMEZCYWtRc1JVRkJlVVFzU1VGQmVrUTdRVUZEU0RzN08yZERRVVZYTEVrc1JVRkJUVHRCUVVGQk96dEJRVU5rTEdGQlFVOHNUVUZCVFN4RFFVRkRMRWxCUVZBc1EwRkJXU3hKUVVGYUxFVkJRV3RDTEVkQlFXeENMRU5CUVhOQ0xGVkJRVUVzU1VGQlNTeEZRVUZKTzBGQlEycERMRmxCUVVrc1NVRkJTU3hMUVVGTExGbEJRV0lzUlVGQk1rSTdRVUZEZGtJN1FVRkRTRHM3UVVGRlJDeFpRVUZKTEV0QlFVc3NSMEZCUnl4dlFrRkJReXhwUWtGQlJEdEJRVUZWTEZWQlFVRXNSMEZCUnl4RlFVRkZMRWxCUVVrc1EwRkJReXhSUVVGTUxFVkJRV1k3UVVGRFZTeFZRVUZCTEV0QlFVc3NSVUZCUlN4SlFVUnFRanRCUVVWVkxGVkJRVUVzVFVGQlRTeEZRVUZGTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUm5SQ08wRkJSMVVzVlVGQlFTeFJRVUZSTEVWQlFVVXNUVUZCU1N4RFFVRkRMRXRCUVV3c1EwRkJWeXhSUVVndlFqdEJRVWxWTEZWQlFVRXNaMEpCUVdkQ0xFVkJRVVVzTUVKQlFVRXNRMEZCUXp0QlFVRkJMRzFDUVVGSkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUTBGQlZ5eFZRVUUxUWl4RlFVRjNReXhEUVVGNFF5eERRVUZLTzBGQlFVRXNWMEZLTjBJN1FVRkxWU3hWUVVGQkxGbEJRVmtzUlVGQlJTeHpRa0ZCUVN4RFFVRkRPMEZCUVVFc2JVSkJRVWtzVFVGQlNTeERRVUZETEZkQlFVd3NRMEZCYVVJc1NVRkJTU3hEUVVGRExFbEJRVVFzUTBGQmNrSXNSVUZCTmtJc1EwRkJOMElzUTBGQlNqdEJRVUZCTEZkQlRIcENPMEZCVFZVc1ZVRkJRU3hqUVVGakxFVkJRVVVzZDBKQlFVRXNRMEZCUXp0QlFVRkJMRzFDUVVGSkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRWEpDTEVWQlFUWkNMRU5CUVRkQ0xFTkJRVW83UVVGQlFUdEJRVTR6UWl4VlFVRmFPenRCUVZGQkxGbEJRVWtzVVVGQlR5eEpRVUZKTEVOQlFVTXNTVUZCUkN4RFFVRllMRTFCUVhOQ0xGRkJRWFJDTEVsQlFXdERMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUzBGQlpTeEpRVUZ5UkN4RlFVRXlSRHRCUVVOMlJDeFZRVUZCTEV0QlFVc3NSMEZCUnl4TFFVRkxMRU5CUVVNc1dVRkJUaXhEUVVGdFFpeExRVUZ1UWl4RlFVRXdRanRCUVVNNVFpeFpRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1QwRkJUaXhEUVVGakxFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFXeENMRWxCUVRSQ0xFMUJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUTBGQlZ5eERRVUZZTEVOQlFXcENMRU5CUVRWQ0xFZEJRVGhFTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFYSkNPMEZCUkRGRExGZEJRVEZDTEVOQlFWSTdRVUZIU0RzN1FVRkZSQ3hsUVVGUExFdEJRVkE3UVVGRFNDeFBRWEJDVFN4RFFVRlFPMEZCY1VKSU96czdOa0pCUlZFN1FVRkRUQ3hWUVVGTkxGRkJRVkVzUjBGQlJ5eExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVRTFRanRCUVVWQkxGVkJRVWtzU1VGQlNTeEhRVUZITEV0QlFVc3NTMEZCVEN4RFFVRlhMRWxCUVhSQ096dEJRVU5CTEZWQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU0c1EwRkJZeXhKUVVGa0xFTkJRVW9zUlVGQmVVSTdRVUZEY2tJc1VVRkJRU3hSUVVGUkxFTkJRVU1zWVVGQlZDeEhRVUY1UWl4RlFVRjZRanRCUVVOSU96dEJRVVZFTEZWQlFVa3NVVUZCVVN4RFFVRkRMR0ZCUVZRc1MwRkJNa0lzU1VGQkwwSXNSVUZCY1VNN1FVRkRha01zV1VGQlNTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVdRc1EwRkJTaXhGUVVGNVFqdEJRVU55UWl4VlFVRkJMRWxCUVVrc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlJDeERRVUZZTzBGQlEwZzdPMEZCU0dkRE8wRkJRVUU3UVVGQlFUczdRVUZCUVR0QlFVdHFReXdyUWtGQmMwTXNTVUZCU1N3d1FrRkJTaXhEUVVGelFpeEpRVUYwUWl4RFFVRjBReXc0U0VGQmJVVTdRVUZCUVR0QlFVRkJMR2RDUVVGNlJDeE5RVUY1UkN4bFFVRjZSQ3hOUVVGNVJEdEJRVUZCTEdkQ1FVRnFSQ3hKUVVGcFJDeGxRVUZxUkN4SlFVRnBSRHRCUVVGQkxHZENRVUV6UXl4SFFVRXlReXhsUVVFelF5eEhRVUV5UXp0QlFVRkJMR2RDUVVGMFF5eEpRVUZ6UXl4bFFVRjBReXhKUVVGelF6czdRVUZETDBRc1owSkJRVWtzVVVGQlR5eEpRVUZRTEUxQlFXZENMRkZCUVdoQ0xFbEJRVFJDTEVsQlFVa3NTMEZCU3l4SlFVRjZReXhGUVVFclF6dEJRVU16UXl4clFrRkJTU3hWUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVd3NRMEZCVlN4SFFVRldMRU5CUVdwQ096dEJRVU5CTEd0RFFVRlhMRWRCUVZnc1EwRkJaU3hKUVVGbUxFVkJRWEZDTEZWQlFWVXNSMEZCUnl4aFFVRnNReXhGUVVGcFJDeFZRVUZxUkR0QlFVTklPMEZCUTBvN1FVRldaME03UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVRzN1FVRlpha01zWlVGRFNTeHBRMEZEU1N4NVJFRkVTaXhGUVVWSkxHZERRVUZMTEV0QlFVc3NWMEZCVEN4RFFVRnBRaXhKUVVGcVFpeERRVUZNTEVOQlJrb3NRMEZFU2p0QlFVMUlMRTlCYkVKRUxFMUJhMEpQTzBGQlEwZ3NXVUZCU1N4VlFVRlZMRWRCUVVjc2IwSkJRVmNzUjBGQldDeERRVUZsTEV0QlFVc3NTMEZCVEN4RFFVRlhMRWxCUVRGQ0xFVkJRV2RETEZGQlFWRXNRMEZCUXl4aFFVRjZReXhEUVVGcVFqczdRVUZGUVN4WlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGT0xFTkJRV01zVlVGQlpDeERRVUZLTEVWQlFTdENPMEZCUXpOQ0xGVkJRVUVzVlVGQlZTeEhRVUZITEZWQlFWVXNRMEZCUXl4RFFVRkVMRU5CUVhaQ08wRkJRMGc3TzBGQlRFVTdRVUZCUVR0QlFVRkJPenRCUVVGQk8wRkJUMGdzWjBOQlFYTkRMRWxCUVVrc01FSkJRVW9zUTBGQmMwSXNWVUZCZEVJc1EwRkJkRU1zYlVsQlFYbEZPMEZCUVVFN1FVRkJRU3huUWtGQkwwUXNUVUZCSzBRc1owSkJRUzlFTEUxQlFTdEVPMEZCUVVFc1owSkJRWFpFTEVsQlFYVkVMR2RDUVVGMlJDeEpRVUYxUkR0QlFVRkJMR2RDUVVGcVJDeEhRVUZwUkN4blFrRkJha1FzUjBGQmFVUTdRVUZCUVN4blFrRkJOVU1zU1VGQk5FTXNaMEpCUVRWRExFbEJRVFJET3p0QlFVTnlSU3huUWtGQlNTeFJRVUZQTEVsQlFWQXNUVUZCWjBJc1VVRkJjRUlzUlVGQk9FSTdRVUZETVVJc2EwSkJRVWtzVjBGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRk1MRU5CUVZVc1IwRkJWaXhEUVVGcVFqczdRVUZEUVN4clEwRkJWeXhIUVVGWUxFTkJRV1VzVlVGQlppeEZRVUV5UWl4WFFVRXpRaXhGUVVGMVF5eFhRVUYyUXp0QlFVTklPMEZCUTBvN1FVRmFSVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCT3p0QlFXTklMR1ZCUTBrc2FVTkJRMGtzYTBWQlJFb3NSVUZGU1N4blEwRkJTeXhMUVVGTExGZEJRVXdzUTBGQmFVSXNWVUZCYWtJc1EwRkJUQ3hEUVVaS0xFTkJSRW83UVVGTlNEdEJRVU5LT3pzN08wVkJia1pyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUZ6Um1Rc1VUczdPenM3T3pzN096czdRVU14Um1ZN096czdPenM3T3pzN096czdPenM3T3pzN096czdTVUZGVFN4ak96czdPenRCUVVOR0xEQkNRVUZaTEV0QlFWb3NSVUZCYlVJN1FVRkJRVHM3UVVGQlFUczdRVUZEWml4M1JrRkJUU3hMUVVGT08wRkJRMEVzVlVGQlN5eExRVUZNTEVkQlFXRTdRVUZEVkN4TlFVRkJMRXRCUVVzc1JVRkJSU3hKUVVSRk8wRkJSVlFzVFVGQlFTeFJRVUZSTEVWQlFVVXNTMEZHUkR0QlFVZFVMRTFCUVVFc1MwRkJTeXhGUVVGRk8wRkJTRVVzUzBGQllqdEJRVTFCTEZWQlFVc3NZMEZCVEN4SFFVRnpRaXhOUVVGTExHTkJRVXdzUTBGQmIwSXNTVUZCY0VJc2RVUkJRWFJDTzBGQlVtVTdRVUZUYkVJN096czdiVU5CUldNc1N5eEZRVUZQTzBGQlEyeENMRmRCUVVzc1MwRkJUQ3hEUVVGWExHTkJRVmdzUTBGQk1FSXNTMEZCTVVJN1FVRkRTQ3hMTEVOQlJVUTdPenM3YVVOQlEyRTdRVUZCUVRzN1FVRkRWQ3hOUVVGQkxFdEJRVXNzUTBGQlF5eExRVUZMTEV0QlFVd3NRMEZCVnl4SFFVRmFMRU5CUVV3c1EwRkRTeXhKUVVSTUxFTkJRMVVzVlVGQlFTeEhRVUZITzBGQlFVRXNaVUZCU1N4SFFVRkhMRU5CUVVNc1NVRkJTaXhGUVVGS08wRkJRVUVzVDBGRVlpeEZRVVZMTEVsQlJrd3NRMEZIVVN4VlFVRkRMRTFCUVVRc1JVRkJXVHRCUVVOU0xGRkJRVUVzVFVGQlNTeERRVUZETEZGQlFVd3NRMEZCWXp0QlFVTldMRlZCUVVFc1VVRkJVU3hGUVVGRkxFbEJSRUU3UVVGRlZpeFZRVUZCTEV0QlFVc3NSVUZCUlR0QlFVWkhMRk5CUVdRN1FVRkpTQ3hQUVZKVUxFVkJVMUVzVlVGQlF5eExRVUZFTEVWQlFWYzdRVUZEVUN4UlFVRkJMRTFCUVVrc1EwRkJReXhSUVVGTUxFTkJRV003UVVGRFZpeFZRVUZCTEZGQlFWRXNSVUZCUlN4SlFVUkJPMEZCUlZZc1ZVRkJRU3hMUVVGTExFVkJRVXc3UVVGR1ZTeFRRVUZrTzBGQlNVZ3NUMEZrVkR0QlFXZENTRHM3TzNkRFFVVnRRanRCUVVOb1FpeFhRVUZMTEZWQlFVdzdRVUZEU0RzN096WkNRVVZSTzBGQlFVRXNkMEpCUXpSQ0xFdEJRVXNzUzBGRWFrTTdRVUZCUVN4VlFVTkZMRXRCUkVZc1pVRkRSU3hMUVVSR08wRkJRVUVzVlVGRFV5eFJRVVJVTEdWQlExTXNVVUZFVkR0QlFVRkJMRlZCUTIxQ0xFdEJSRzVDTEdWQlEyMUNMRXRCUkc1Q096dEJRVVZNTEZWQlFVa3NTMEZCU2l4RlFVRlhPMEZCUTFBc1pVRkJUeXcwUTBGQllTeExRVUZMTEVOQlFVTXNUMEZCYmtJc1EwRkJVRHRCUVVOSUxFOUJSa1FzVFVGRlR5eEpRVUZKTEVOQlFVTXNVVUZCVEN4RlFVRmxPMEZCUTJ4Q0xHVkJRVTg3UVVGQlN5eFZRVUZCTEZOQlFWTXNSVUZCUXl4dFFrRkJaanRCUVVGdFF5eFZRVUZCTEV0QlFVc3NSVUZCUlR0QlFVRkRMRmxCUVVFc1MwRkJTeXhGUVVGRkxFMUJRVkk3UVVGQlowSXNXVUZCUVN4UFFVRlBMRVZCUVVVc1QwRkJla0k3UVVGQmEwTXNXVUZCUVN4TFFVRkxMRVZCUVVVc1RVRkJla003UVVGQmFVUXNXVUZCUVN4TlFVRk5MRVZCUVVVc1RVRkJla1E3UVVGQmFVVXNXVUZCUVN4UFFVRlBMRVZCUVVVN1FVRkJNVVU3UVVGQk1VTXNWVUZCVUR0QlFVTklMRTlCUmswc1RVRkZRVHRCUVVOSUxHVkJRVThzYjBKQlFVTXNhVUpCUVVRN1FVRkRTQ3hWUVVGQkxFbEJRVWtzUlVGQlJTeExRVVJJTzBGQlJVZ3NWVUZCUVN4SFFVRkhMRVZCUVVVc1MwRkJTeXhMUVVGTUxFTkJRVmNzUjBGR1lqdEJRVWRJTEZWQlFVRXNVVUZCVVN4RlFVRkZMRXRCUVVzc1MwRkJUQ3hEUVVGWExGRkJTR3hDTzBGQlNVZ3NWVUZCUVN4alFVRmpMRVZCUVVVc1MwRkJTenRCUVVwc1FpeFZRVUZRTzBGQlMwZzdRVUZEU2pzN096dEZRWEpFZDBJc1MwRkJTeXhEUVVGRExGTTdPMlZCZDBSd1FpeGpPenM3T3pzN096czdPenRCUXpGRVppeFRRVUZUTEZkQlFWUXNRMEZCY1VJc1MwRkJja0lzUlVGQk5FSTdRVUZEZUVJc1UwRkRTU3hwUTBGRFNUdEJRVUZQTEVsQlFVRXNTVUZCU1N4RlFVRkRMRkZCUVZvN1FVRkJjVUlzU1VGQlFTeEpRVUZKTEVWQlFVTXNjVUpCUVRGQ08wRkJRV2RFTEVsQlFVRXNTMEZCU3l4RlFVRkZMRXRCUVVzc1EwRkJRenRCUVVFM1JDeEpRVVJLTEVWQlJVazdRVUZCVHl4SlFVRkJMRWxCUVVrc1JVRkJReXhSUVVGYU8wRkJRWEZDTEVsQlFVRXNTVUZCU1N4RlFVRkRMREJDUVVFeFFqdEJRVUZ4UkN4SlFVRkJMRXRCUVVzc1JVRkJSU3hKUVVGSkxFTkJRVU1zVTBGQlRDeERRVUZsTEV0QlFVc3NRMEZCUXl4UlFVRnlRanRCUVVFMVJDeEpRVVpLTEVOQlJFbzdRVUZOU0RzN1pVRkZZeXhYT3pzN096czdPenM3T3p0QlExUm1MRk5CUVZNc1VVRkJWQ3hEUVVGclFpeExRVUZzUWl4RlFVRjVRanRCUVVGQkxFMUJRMlFzUzBGRVl5eEhRVU4xUlN4TFFVUjJSU3hEUVVOa0xFdEJSR003UVVGQlFTeE5RVU5RTEZGQlJFOHNSMEZEZFVVc1MwRkVka1VzUTBGRFVDeFJRVVJQTzBGQlFVRXNUVUZEUnl4UlFVUklMRWRCUTNWRkxFdEJSSFpGTEVOQlEwY3NVVUZFU0R0QlFVRkJMRTFCUTJFc1RVRkVZaXhIUVVOMVJTeExRVVIyUlN4RFFVTmhMRTFCUkdJN1FVRkJRU3hOUVVOeFFpeFpRVVJ5UWl4SFFVTjFSU3hMUVVSMlJTeERRVU54UWl4WlFVUnlRanRCUVVGQkxFMUJRMjFETEdOQlJHNURMRWRCUTNWRkxFdEJSSFpGTEVOQlEyMURMR05CUkc1RE8wRkJRVUVzVFVGRGJVUXNaMEpCUkc1RUxFZEJRM1ZGTEV0QlJIWkZMRU5CUTIxRUxHZENRVVJ1UkR0QlFVVnlRaXhUUVVGUkxHZERRVU5JTEZGQlFWRXNRMEZCUXl4TFFVRlVMRXRCUVcxQ0xFMUJRVzVDTEVkQlFUUkNMRGhEUVVFMVFpeEhRVUYxUkN4RlFVUndSQ3hGUVVWSUxGRkJRVkVzUTBGQlF5eFBRVUZVTEV0QlFYRkNMRTFCUVhKQ0xFZEJRVGhDTEdkRVFVRTVRaXhIUVVFeVJDeEZRVVo0UkN4RlFVZElMRkZCUVZFc1IwRkJSeXh2UTBGQlV5eExRVUZVTEVOQlFVZ3NSMEZCT0VJc2EwTkJRVThzUzBGQlVDeERRVWh1UXl4RlFVbElMRU5CUVVNc1VVRkJSQ3hKUVVGaExFTkJRVU1zVVVGQlVTeERRVUZETEV0QlFYWkNMRWxCUVdsRExGRkJRVkVzUTBGQlF5eFBRVUZVTEV0QlFYRkNMRTFCUVhSRUxFbEJRV2xGTEZGQlFWRXNRMEZCUXl4aFFVRlVMRXRCUVRKQ0xFbEJRVFZHTEVkQlEwYzdRVUZCUnl4SlFVRkJMRWxCUVVrc1JVRkJReXhIUVVGU08wRkJRVmtzU1VGQlFTeFRRVUZUTEVWQlFVTXNjVUpCUVhSQ08wRkJRVFJETEd0Q1FVRlhMRTlCUVhaRU8wRkJRU3RFTEVsQlFVRXNUMEZCVHl4RlFVRkZPMEZCUVhoRkxHRkJSRWdzUjBGRGNVY3NSVUZNYkVjc1JVRk5TQ3hEUVVGRExGRkJRVVFzU1VGQll5eFJRVUZSTEVOQlFVTXNTMEZCVkN4TFFVRnRRaXhOUVVGcVF5eEpRVUUwUXl4RFFVRkRMRkZCUVZFc1EwRkJReXhQUVVGMFJDeEpRVUZwUlN4UlFVRlJMRU5CUVVNc1lVRkJWQ3hMUVVFeVFpeEpRVUUxUml4SFFVTkhPMEZCUVVjc1NVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEVsQlFVRXNVMEZCVXl4RlFVRkRMSEZDUVVGMFFqdEJRVUUwUXl4clFrRkJWeXhUUVVGMlJEdEJRVU5ITEVsQlFVRXNUMEZCVHl4RlFVRkZPMEZCUkZvc1pVRkVTQ3hIUVVVMlF5eEZRVkl4UXl4RlFWTklMRkZCUVZFc1NVRkJTU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEUxQlFXUXNRMEZCV2l4SlFVRnhReXhSUVVGUkxFTkJRVU1zWVVGQlZDeExRVUV5UWl4SlFVRm9SU3hIUVVOSE8wRkJRVWNzU1VGQlFTeEpRVUZKTEVWQlFVTXNSMEZCVWp0QlFVRlpMRWxCUVVFc1UwRkJVeXhGUVVGRExIRkNRVUYwUWp0QlFVRTBReXhyUWtGQlZ5eGxRVUYyUkR0QlFVTkhMRWxCUVVFc1QwRkJUeXhGUVVGRk8wRkJSRm9zWTBGRVNDeEhRVVU0UXl4RlFWZ3pReXhGUVZsSUxGRkJRVkVzUjBGQlJ6dEJRVUZOTEVsQlFVRXNVMEZCVXl4RlFVRkRPMEZCUVdoQ0xFbEJRVWdzUjBGQk9FUXNSVUZhYmtVc1JVRmhTQ3hSUVVGUkxFZEJRVWM3UVVGQlNTeEpRVUZCTEV0QlFVc3NSVUZCUlR0QlFVRkRMRTFCUVVFc1YwRkJWeXhGUVVGRkxFVkJRV1E3UVVGQmEwSXNUVUZCUVN4VlFVRlZMRVZCUVVVN1FVRkJPVUk3UVVGQldDeExRVUUyUkN4UlFVRTNSQ3hEUVVGSUxFZEJRV2xHTEVWQlluUkdMRU5CUVZJN1FVRmxTRHM3WlVGRll5eFJPenM3T3pzN096czdPenRCUTI1Q1pqczdRVUZEUVRzN1FVRkRRVHM3T3pzN096czdPenM3T3pzN096czdPenM3T3p0QlFVVkJMRWxCUVUwc1dVRkJXU3hIUVVGSE8wRkJRMnBDTEVWQlFVRXNhMEpCUVd0Q0xFVkJRVVVzUzBGRVNEdEJRVVZxUWl4RlFVRkJMRWRCUVVjc1JVRkJSU3hGUVVaWk8wRkJSMnBDTEVWQlFVRXNVVUZCVVN4RlFVRkZPMEZCUTA0c1NVRkJRU3hoUVVGaExFVkJRVVVzU1VGRVZEdEJRVVZPTEVsQlFVRXNTMEZCU3l4RlFVRkZMRVZCUmtRN1FVRkhUaXhKUVVGQkxFOUJRVThzUlVGQlJUdEJRVWhJTzBGQlNFOHNRMEZCY2tJN08wbEJWVTBzVVRzN096czdRVUZEUml4dlFrRkJXU3hMUVVGYUxFVkJRVzFDTzBGQlFVRTdPMEZCUVVFN08wRkJRMllzYTBaQlFVMHNTMEZCVGp0QlFVTkJMRlZCUVVzc1MwRkJUQ3hIUVVGaExGbEJRV0k3UVVGRlFTeFZRVUZMTEZOQlFVd3NSMEZCYVVJc1RVRkJTeXhUUVVGTUxFTkJRV1VzU1VGQlppeDFSRUZCYWtJN1FVRkRRU3hWUVVGTExGbEJRVXdzUjBGQmIwSXNUVUZCU3l4WlFVRk1MRU5CUVd0Q0xFbEJRV3hDTEhWRVFVRndRanRCUVVOQkxGVkJRVXNzV1VGQlRDeEhRVUZ2UWl4TlFVRkxMRmxCUVV3c1EwRkJhMElzU1VGQmJFSXNkVVJCUVhCQ08wRkJRMEVzVlVGQlN5eGpRVUZNTEVkQlFYTkNMRTFCUVVzc1kwRkJUQ3hEUVVGdlFpeEpRVUZ3UWl4MVJFRkJkRUk3UVVGUVpUdEJRVkZzUWpzN096dDNRMEZGYlVJN1FVRkRhRUlzVjBGQlN5eFhRVUZNTzBGQlEwZzdPenRyUTBGRllUdEJRVU5XTEZWQlFVa3NUMEZCVHl4aFFVRmhMRU5CUVVNc1QwRkJja0lzUzBGQmFVTXNWMEZCY2tNc1JVRkJhMFE3UVVGRE9VTXNXVUZCVFN4UFFVRlBMRWRCUVVjc1lVRkJZU3hEUVVGRExFOUJRVGxDTzBGQlEwRXNZVUZCU3l4UlFVRk1MRU5CUVdNN1FVRkRWaXhWUVVGQkxFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNSMEZCVWl4SFFVRmpMRTlCUVU4c1EwRkJReXhIUVVGMFFpeEhRVUUwUWl4RlFVUjJRanRCUVVWV0xGVkJRVUVzVVVGQlVTeEZRVUZGTEU5QlFVOHNRMEZCUXl4UlFVRlNMRWRCUVcxQ0xFbEJRVWtzUTBGQlF5eExRVUZNTEVOQlFWY3NUMEZCVHl4RFFVRkRMRkZCUVc1Q0xFTkJRVzVDTEVkQlFXdEVPMEZCUVVNc1dVRkJRU3hoUVVGaExFVkJRVVVzU1VGQmFFSTdRVUZCYzBJc1dVRkJRU3hMUVVGTExFVkJRVVVzUlVGQk4wSTdRVUZCYVVNc1dVRkJRU3hQUVVGUExFVkJRVVU3UVVGQk1VTXNWMEZHYkVRN1FVRkhWaXhWUVVGQkxHdENRVUZyUWl4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU03UVVGSWNFSXNVMEZCWkR0QlFVdElPMEZCUTBvN096czRRa0ZGVXl4TExFVkJRVTg3UVVGRFlpeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc1IwRkJSeXhGUVVGRkxFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRTdRVUZCYmtJc1QwRkJaRHRCUVVOSU96czdhVU5CUlZrc1N5eEZRVUZQTzBGQlEyaENMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc2EwSkJRV3RDTEVWQlFVVTdRVUZCY2tJc1QwRkJaRHRCUVVOSU96czdhVU5CUlZrc1N5eEZRVUZQTzBGQlEyaENMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEZGQlFVd3NRMEZCWXl4WlFVRmtPMEZCUTBnN096dHRRMEZGWXl4TExFVkJRVTg3UVVGRGJFSXNWVUZCVFN4TlFVRk5MRWRCUVVjc1RVRkJUU3hEUVVGRExFMUJRVkFzUTBGQll5eExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVRjZRaXhGUVVGdFF5eExRVUZ1UXl4RFFVRm1PMEZCUTBFc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEZGQlFWRXNSVUZCUlR0QlFVRllMRTlCUVdRN1FVRkRTRHM3T3paQ1FVVlJPMEZCUVVFc2QwSkJRelpDTEV0QlFVc3NTMEZFYkVNN1FVRkJRU3hWUVVORkxHdENRVVJHTEdWQlEwVXNhMEpCUkVZN1FVRkJRU3hWUVVOelFpeEhRVVIwUWl4bFFVTnpRaXhIUVVSMFFqdEJRVUZCTEdsRFFVVnRReXhMUVVGTExFdEJRVXdzUTBGQlZ5eFJRVVk1UXp0QlFVRkJMRlZCUlVVc1lVRkdSaXgzUWtGRlJTeGhRVVpHTzBGQlFVRXNWVUZGYVVJc1MwRkdha0lzZDBKQlJXbENMRXRCUm1wQ08wRkJRVUVzVlVGRmQwSXNUMEZHZUVJc2QwSkJSWGRDTEU5QlJuaENPenRCUVVsTUxGVkJRVWtzUjBGQlJ5eEpRVUZKTEdGQlFXRXNTMEZCU3l4SlFVRjZRaXhKUVVGcFF5eExRVUZxUXl4SlFVRXdReXhQUVVFNVF5eEZRVUYxUkR0QlFVTnVSQ3hsUVVOSkxHbERRVU5KTEc5Q1FVRkRMR2RDUVVGRUxFVkJRV0VzUzBGQlN5eExRVUZzUWl4RFFVUktMRVZCUlVrc2IwSkJRVU1zYjBKQlFVUXNSVUZCYVVJc1MwRkJTeXhMUVVGMFFpeERRVVpLTEVWQlIwazdRVUZCUnl4VlFVRkJMRWxCUVVrc1JVRkJReXhIUVVGU08wRkJRVmtzVlVGQlFTeFBRVUZQTEVWQlFVVXNTMEZCU3l4WlFVRXhRanRCUVVGM1F5eFZRVUZCTEZOQlFWTXNSVUZCUXp0QlFVRnNSQ3cwUWtGSVNpeERRVVJLTzBGQlQwZ3NUMEZTUkN4TlFWRlBMRWxCUVVrc2EwSkJRVW9zUlVGQmQwSTdRVUZETTBJc1pVRkRTU3hwUTBGRFNTeHZRa0ZCUXl4MVFrRkJSRHRCUVVGblFpeFZRVUZCTEVkQlFVY3NSVUZCUlN4SFFVRnlRanRCUVVFd1FpeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRXRCUVV3c1EwRkJWeXhSUVVFdlF6dEJRVUY1UkN4VlFVRkJMR05CUVdNc1JVRkJSU3hMUVVGTE8wRkJRVGxGTEZWQlJFb3NSVUZGU1N4dlFrRkJReXh2UWtGQlJDeEZRVUZwUWl4TFFVRkxMRXRCUVhSQ0xFTkJSa29zUlVGSFNUdEJRVUZITEZWQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hWUVVGQkxFOUJRVThzUlVGQlJTeExRVUZMTEZsQlFURkNPMEZCUVhkRExGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFXeEVMRFJDUVVoS0xFTkJSRW83UVVGUFNDeFBRVkpOTEUxQlVVRTdRVUZEU0N4bFFVTkpPMEZCUVVzc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlppeFhRVU5KTzBGQlFVMHNWVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkJTenRCUVVGeVFpeFhRVU5KTEN0Q1FVTkpMRzFEUVVOSkxHdEVRVVJLTEVOQlJFb3NSVUZKU1N3clFrRktTaXhGUVV0SkxEWkVRVXhLTEVOQlJFb3NSVUZSU1R0QlFVRlBMRlZCUVVFc1NVRkJTU3hGUVVGRExFMUJRVm83UVVGQmJVSXNWVUZCUVN4TFFVRkxMRVZCUVVVN1FVRkJReXhaUVVGQkxFdEJRVXNzUlVGQlJUdEJRVUZTTEZkQlFURkNPMEZCUVRKRExGVkJRVUVzUzBGQlN5eEZRVUZGTEVkQlFXeEVPMEZCUVhWRUxGVkJRVUVzVVVGQlVTeEZRVUZGTEV0QlFVczdRVUZCZEVVc1ZVRlNTaXhGUVZOSkxDdENRVUZITzBGQlFVOHNWVUZCUVN4SlFVRkpMRVZCUVVNc1VVRkJXanRCUVVGeFFpeFZRVUZCTEZOQlFWTXNSVUZCUXl4MVFrRkJMMEk3UVVGQmRVUXNWVUZCUVN4TFFVRkxMRVZCUVVNN1FVRkJOMFFzVlVGQlNDeERRVlJLTEVOQlJFb3NSVUZaU1N4dlFrRkJReXh2UWtGQlJDeEZRVUZwUWl4TFFVRkxMRXRCUVhSQ0xFTkJXa29zUTBGRVNqdEJRV2RDU0R0QlFVTktPenM3TzBWQmJrWnJRaXhMUVVGTExFTkJRVU1zVXpzN1pVRnpSbVFzVVRzN096czdPenM3T3pzN1FVTndSMllzVTBGQlV5eFBRVUZVTEVOQlFXbENMRXRCUVdwQ0xFVkJRWGRDTzBGQlEzQkNMRk5CUTBrc1owTkJRMGs3UVVGQlNTeEpRVUZCTEV0QlFVc3NSVUZCUlR0QlFVRkRMRTFCUVVFc1UwRkJVeXhGUVVGRk8wRkJRVm83UVVGQldDeHpRa0ZCYlVRc1MwRkJTeXhEUVVGRExFZEJRWHBFTEVOQlJFb3NSVUZGU1N3eVEwRkJXU3hMUVVGTExFTkJRVU1zVVVGQlRpeERRVUZsTEV0QlFUTkNMRU5CUmtvc1JVRkhTU3cyUTBGQll5eExRVUZMTEVOQlFVTXNVVUZCVGl4RFFVRmxMRTlCUVRkQ0xFTkJTRW9zUTBGRVNqdEJRVTlJT3p0bFFVVmpMRTg3T3pzN096dEJRMVptT3pzN08wRkJSVUVzU1VGQlRTeHZRa0ZCYjBJc1IwRkJSeXgzUWtGQk4wSTdRVUZEUVN4SlFVRk5MRlZCUVZVc1IwRkJSeXhSUVVGUkxFTkJRVU1zWTBGQlZDeERRVUYzUWl4dlFrRkJlRUlzUTBGQmJrSTdRVUZGUVN4UlFVRlJMRU5CUVVNc1RVRkJWQ3hEUVVOSkxHOUNRVUZETEdsQ1FVRkVMRTlCUkVvc1JVRkZTU3hWUVVaS0lpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUlvWm5WdVkzUnBiMjRvS1h0bWRXNWpkR2x2YmlCeUtHVXNiaXgwS1h0bWRXNWpkR2x2YmlCdktHa3NaaWw3YVdZb0lXNWJhVjBwZTJsbUtDRmxXMmxkS1h0MllYSWdZejFjSW1aMWJtTjBhVzl1WENJOVBYUjVjR1Z2WmlCeVpYRjFhWEpsSmlaeVpYRjFhWEpsTzJsbUtDRm1KaVpqS1hKbGRIVnliaUJqS0drc0lUQXBPMmxtS0hVcGNtVjBkWEp1SUhVb2FTd2hNQ2s3ZG1GeUlHRTlibVYzSUVWeWNtOXlLRndpUTJGdWJtOTBJR1pwYm1RZ2JXOWtkV3hsSUNkY0lpdHBLMXdpSjF3aUtUdDBhSEp2ZHlCaExtTnZaR1U5WENKTlQwUlZURVZmVGs5VVgwWlBWVTVFWENJc1lYMTJZWElnY0QxdVcybGRQWHRsZUhCdmNuUnpPbnQ5ZlR0bFcybGRXekJkTG1OaGJHd29jQzVsZUhCdmNuUnpMR1oxYm1OMGFXOXVLSElwZTNaaGNpQnVQV1ZiYVYxYk1WMWJjbDA3Y21WMGRYSnVJRzhvYm54OGNpbDlMSEFzY0M1bGVIQnZjblJ6TEhJc1pTeHVMSFFwZlhKbGRIVnliaUJ1VzJsZExtVjRjRzl5ZEhOOVptOXlLSFpoY2lCMVBWd2lablZ1WTNScGIyNWNJajA5ZEhsd1pXOW1JSEpsY1hWcGNtVW1KbkpsY1hWcGNtVXNhVDB3TzJrOGRDNXNaVzVuZEdnN2FTc3JLVzhvZEZ0cFhTazdjbVYwZFhKdUlHOTljbVYwZFhKdUlISjlLU2dwSWl3aUtHWjFibU4wYVc5dUlDaHliMjkwTENCbVlXTjBiM0o1S1h0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dVhHNGdJQzhxYVhOMFlXNWlkV3dnYVdkdWIzSmxJRzVsZUhRNlkyRnVkQ0IwWlhOMEtpOWNiaUFnYVdZZ0tIUjVjR1Z2WmlCdGIyUjFiR1VnUFQwOUlDZHZZbXBsWTNRbklDWW1JSFI1Y0dWdlppQnRiMlIxYkdVdVpYaHdiM0owY3lBOVBUMGdKMjlpYW1WamRDY3BJSHRjYmlBZ0lDQnRiMlIxYkdVdVpYaHdiM0owY3lBOUlHWmhZM1J2Y25rb0tUdGNiaUFnZlNCbGJITmxJR2xtSUNoMGVYQmxiMllnWkdWbWFXNWxJRDA5UFNBblpuVnVZM1JwYjI0bklDWW1JR1JsWm1sdVpTNWhiV1FwSUh0Y2JpQWdJQ0F2THlCQlRVUXVJRkpsWjJsemRHVnlJR0Z6SUdGdUlHRnViMjU1Ylc5MWN5QnRiMlIxYkdVdVhHNGdJQ0FnWkdWbWFXNWxLRnRkTENCbVlXTjBiM0o1S1R0Y2JpQWdmU0JsYkhObElIdGNiaUFnSUNBdkx5QkNjbTkzYzJWeUlHZHNiMkpoYkhOY2JpQWdJQ0J5YjI5MExtOWlhbVZqZEZCaGRHZ2dQU0JtWVdOMGIzSjVLQ2s3WEc0Z0lIMWNibjBwS0hSb2FYTXNJR1oxYm1OMGFXOXVLQ2w3WEc0Z0lDZDFjMlVnYzNSeWFXTjBKenRjYmx4dUlDQjJZWElnZEc5VGRISWdQU0JQWW1wbFkzUXVjSEp2ZEc5MGVYQmxMblJ2VTNSeWFXNW5PMXh1SUNCbWRXNWpkR2x2YmlCb1lYTlBkMjVRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwSUh0Y2JpQWdJQ0JwWmlodlltb2dQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sWEc0Z0lDQWdmVnh1SUNBZ0lDOHZkRzhnYUdGdVpHeGxJRzlpYW1WamRITWdkMmwwYUNCdWRXeHNJSEJ5YjNSdmRIbHdaWE1nS0hSdmJ5QmxaR2RsSUdOaGMyVS9LVnh1SUNBZ0lISmxkSFZ5YmlCUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG1oaGMwOTNibEJ5YjNCbGNuUjVMbU5oYkd3b2IySnFMQ0J3Y205d0tWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdhWE5GYlhCMGVTaDJZV3gxWlNsN1hHNGdJQ0FnYVdZZ0tDRjJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaHBjMEZ5Y21GNUtIWmhiSFZsS1NBbUppQjJZV3gxWlM1c1pXNW5kR2dnUFQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJ5ZFdVN1hHNGdJQ0FnZlNCbGJITmxJR2xtSUNoMGVYQmxiMllnZG1Gc2RXVWdJVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dhVzRnZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hvWVhOUGQyNVFjbTl3WlhKMGVTaDJZV3gxWlN3Z2FTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJSFJ2VTNSeWFXNW5LSFI1Y0dVcGUxeHVJQ0FnSUhKbGRIVnliaUIwYjFOMGNpNWpZV3hzS0hSNWNHVXBPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnYVhOUFltcGxZM1FvYjJKcUtYdGNiaUFnSUNCeVpYUjFjbTRnZEhsd1pXOW1JRzlpYWlBOVBUMGdKMjlpYW1WamRDY2dKaVlnZEc5VGRISnBibWNvYjJKcUtTQTlQVDBnWENKYmIySnFaV04wSUU5aWFtVmpkRjFjSWp0Y2JpQWdmVnh1WEc0Z0lIWmhjaUJwYzBGeWNtRjVJRDBnUVhKeVlYa3VhWE5CY25KaGVTQjhmQ0JtZFc1amRHbHZiaWh2WW1vcGUxeHVJQ0FnSUM4cWFYTjBZVzVpZFd3Z2FXZHViM0psSUc1bGVIUTZZMkZ1ZENCMFpYTjBLaTljYmlBZ0lDQnlaWFIxY200Z2RHOVRkSEl1WTJGc2JDaHZZbW9wSUQwOVBTQW5XMjlpYW1WamRDQkJjbkpoZVYwbk8xeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdhWE5DYjI5c1pXRnVLRzlpYWlsN1hHNGdJQ0FnY21WMGRYSnVJSFI1Y0dWdlppQnZZbW9nUFQwOUlDZGliMjlzWldGdUp5QjhmQ0IwYjFOMGNtbHVaeWh2WW1vcElEMDlQU0FuVzI5aWFtVmpkQ0JDYjI5c1pXRnVYU2M3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCblpYUkxaWGtvYTJWNUtYdGNiaUFnSUNCMllYSWdhVzUwUzJWNUlEMGdjR0Z5YzJWSmJuUW9hMlY1S1R0Y2JpQWdJQ0JwWmlBb2FXNTBTMlY1TG5SdlUzUnlhVzVuS0NrZ1BUMDlJR3RsZVNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdsdWRFdGxlVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUd0bGVUdGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR1poWTNSdmNua29iM0IwYVc5dWN5a2dlMXh1SUNBZ0lHOXdkR2x2Ym5NZ1BTQnZjSFJwYjI1eklIeDhJSHQ5WEc1Y2JpQWdJQ0IyWVhJZ2IySnFaV04wVUdGMGFDQTlJR1oxYm1OMGFXOXVLRzlpYWlrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUU5aWFtVmpkQzVyWlhsektHOWlhbVZqZEZCaGRHZ3BMbkpsWkhWalpTaG1kVzVqZEdsdmJpaHdjbTk0ZVN3Z2NISnZjQ2tnZTF4dUlDQWdJQ0FnSUNCcFppaHdjbTl3SUQwOVBTQW5ZM0psWVhSbEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJ3Y205NGVUdGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUM4cWFYTjBZVzVpZFd3Z2FXZHViM0psSUdWc2MyVXFMMXh1SUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc5aWFtVmpkRkJoZEdoYmNISnZjRjBnUFQwOUlDZG1kVzVqZEdsdmJpY3BJSHRjYmlBZ0lDQWdJQ0FnSUNCd2NtOTRlVnR3Y205d1hTQTlJRzlpYW1WamRGQmhkR2hiY0hKdmNGMHVZbWx1WkNodlltcGxZM1JRWVhSb0xDQnZZbW9wTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIQnliM2g1TzF4dUlDQWdJQ0FnZlN3Z2UzMHBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQm9ZWE5UYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdLRzl3ZEdsdmJuTXVhVzVqYkhWa1pVbHVhR1Z5YVhSbFpGQnliM0J6SUh4OElDaDBlWEJsYjJZZ2NISnZjQ0E5UFQwZ0oyNTFiV0psY2ljZ0ppWWdRWEp5WVhrdWFYTkJjbkpoZVNodlltb3BLU0I4ZkNCb1lYTlBkMjVRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwS1Z4dUlDQWdJSDFjYmx4dUlDQWdJR1oxYm1OMGFXOXVJR2RsZEZOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwSUh0Y2JpQWdJQ0FnSUdsbUlDaG9ZWE5UYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcVczQnliM0JkTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJR1oxYm1OMGFXOXVJSE5sZENodlltb3NJSEJoZEdnc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBlMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYm5WdFltVnlKeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnVzNCaGRHaGRPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0NGd1lYUm9JSHg4SUhCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JSEJoZEdnZ1BUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6WlhRb2IySnFMQ0J3WVhSb0xuTndiR2wwS0NjdUp5a3ViV0Z3S0dkbGRFdGxlU2tzSUhaaGJIVmxMQ0JrYjA1dmRGSmxjR3hoWTJVcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlFZWFJvSUQwZ2NHRjBhRnN3WFR0Y2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFZtRnNkV1VnUFNCblpYUlRhR0ZzYkc5M1VISnZjR1Z5ZEhrb2IySnFMQ0JqZFhKeVpXNTBVR0YwYUNrN1hHNGdJQ0FnSUNCcFppQW9jR0YwYUM1c1pXNW5kR2dnUFQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHTjFjbkpsYm5SV1lXeDFaU0E5UFQwZ2RtOXBaQ0F3SUh4OElDRmtiMDV2ZEZKbGNHeGhZMlVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbXBiWTNWeWNtVnVkRkJoZEdoZElEMGdkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTjFjbkpsYm5SV1lXeDFaVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tHTjFjbkpsYm5SV1lXeDFaU0E5UFQwZ2RtOXBaQ0F3S1NCN1hHNGdJQ0FnSUNBZ0lDOHZZMmhsWTJzZ2FXWWdkMlVnWVhOemRXMWxJR0Z1SUdGeWNtRjVYRzRnSUNBZ0lDQWdJR2xtS0hSNWNHVnZaaUJ3WVhSb1d6RmRJRDA5UFNBbmJuVnRZbVZ5SnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWx0amRYSnlaVzUwVUdGMGFGMGdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbXBiWTNWeWNtVnVkRkJoZEdoZElEMGdlMzA3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUhObGRDaHZZbXBiWTNWeWNtVnVkRkJoZEdoZExDQndZWFJvTG5Oc2FXTmxLREVwTENCMllXeDFaU3dnWkc5T2IzUlNaWEJzWVdObEtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtaGhjeUE5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdncElIdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJRnR3WVhSb1hUdGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQndZWFJvTG5Od2JHbDBLQ2N1SnlrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2doY0dGMGFDQjhmQ0J3WVhSb0xteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnSVNGdlltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnY0dGMGFDNXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdhaUE5SUdkbGRFdGxlU2h3WVhSb1cybGRLVHRjYmx4dUlDQWdJQ0FnSUNCcFppZ29kSGx3Wlc5bUlHb2dQVDA5SUNkdWRXMWlaWEluSUNZbUlHbHpRWEp5WVhrb2IySnFLU0FtSmlCcUlEd2diMkpxTG14bGJtZDBhQ2tnZkh4Y2JpQWdJQ0FnSUNBZ0lDQW9iM0IwYVc5dWN5NXBibU5zZFdSbFNXNW9aWEpwZEdWa1VISnZjSE1nUHlBb2FpQnBiaUJQWW1wbFkzUW9iMkpxS1NrZ09pQm9ZWE5QZDI1UWNtOXdaWEowZVNodlltb3NJR29wS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWlBOUlHOWlhbHRxWFR0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VaVzV6ZFhKbFJYaHBjM1J6SUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDd2dkbUZzZFdVcGUxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhObGRDaHZZbW9zSUhCaGRHZ3NJSFpoYkhWbExDQjBjblZsS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1elpYUWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvTENCMllXeDFaU3dnWkc5T2IzUlNaWEJzWVdObEtYdGNiaUFnSUNBZ0lISmxkSFZ5YmlCelpYUW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTd2daRzlPYjNSU1pYQnNZV05sS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1cGJuTmxjblFnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb0xDQjJZV3gxWlN3Z1lYUXBlMXh1SUNBZ0lDQWdkbUZ5SUdGeWNpQTlJRzlpYW1WamRGQmhkR2d1WjJWMEtHOWlhaXdnY0dGMGFDazdYRzRnSUNBZ0lDQmhkQ0E5SUg1K1lYUTdYRzRnSUNBZ0lDQnBaaUFvSVdselFYSnlZWGtvWVhKeUtTa2dlMXh1SUNBZ0lDQWdJQ0JoY25JZ1BTQmJYVHRjYmlBZ0lDQWdJQ0FnYjJKcVpXTjBVR0YwYUM1elpYUW9iMkpxTENCd1lYUm9MQ0JoY25JcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ1lYSnlMbk53YkdsalpTaGhkQ3dnTUN3Z2RtRnNkV1VwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0J2WW1wbFkzUlFZWFJvTG1WdGNIUjVJRDBnWm5WdVkzUnBiMjRvYjJKcUxDQndZWFJvS1NCN1hHNGdJQ0FnSUNCcFppQW9hWE5GYlhCMGVTaHdZWFJvS1NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RtOXBaQ0F3TzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIyYjJsa0lEQTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFpoY2lCMllXeDFaU3dnYVR0Y2JpQWdJQ0FnSUdsbUlDZ2hLSFpoYkhWbElEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2IySnFMQ0J3WVhSb0tTa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFp2YVdRZ01EdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUIyWVd4MVpTQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnSnljcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHBjMEp2YjJ4bFlXNG9kbUZzZFdVcEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lHWmhiSE5sS1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2RIbHdaVzltSUhaaGJIVmxJRDA5UFNBbmJuVnRZbVZ5SnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENBd0tUdGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9hWE5CY25KaGVTaDJZV3gxWlNrcElIdGNiaUFnSUNBZ0lDQWdkbUZzZFdVdWJHVnVaM1JvSUQwZ01EdGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9hWE5QWW1wbFkzUW9kbUZzZFdVcEtTQjdYRzRnSUNBZ0lDQWdJR1p2Y2lBb2FTQnBiaUIyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaG9ZWE5UYUdGc2JHOTNVSEp2Y0dWeWRIa29kbUZzZFdVc0lHa3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmtaV3hsZEdVZ2RtRnNkV1ZiYVYwN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxWldOMFVHRjBhQzV6WlhRb2IySnFMQ0J3WVhSb0xDQnVkV3hzS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1d2RYTm9JRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUNBdktpd2dkbUZzZFdWeklDb3ZLWHRjYmlBZ0lDQWdJSFpoY2lCaGNuSWdQU0J2WW1wbFkzUlFZWFJvTG1kbGRDaHZZbW9zSUhCaGRHZ3BPMXh1SUNBZ0lDQWdhV1lnS0NGcGMwRnljbUY1S0dGeWNpa3BJSHRjYmlBZ0lDQWdJQ0FnWVhKeUlEMGdXMTA3WEc0Z0lDQWdJQ0FnSUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnWVhKeUtUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdZWEp5TG5CMWMyZ3VZWEJ3Ykhrb1lYSnlMQ0JCY25KaGVTNXdjbTkwYjNSNWNHVXVjMnhwWTJVdVkyRnNiQ2hoY21kMWJXVnVkSE1zSURJcEtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNWpiMkZzWlhOalpTQTlJR1oxYm1OMGFXOXVJQ2h2WW1vc0lIQmhkR2h6TENCa1pXWmhkV3gwVm1Gc2RXVXBJSHRjYmlBZ0lDQWdJSFpoY2lCMllXeDFaVHRjYmx4dUlDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQXNJR3hsYmlBOUlIQmhkR2h6TG14bGJtZDBhRHNnYVNBOElHeGxianNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJR2xtSUNnb2RtRnNkV1VnUFNCdlltcGxZM1JRWVhSb0xtZGxkQ2h2WW1vc0lIQmhkR2h6VzJsZEtTa2dJVDA5SUhadmFXUWdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCMllXeDFaVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnWkdWbVlYVnNkRlpoYkhWbE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtZGxkQ0E5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnc0lHUmxabUYxYkhSV1lXeDFaU2w3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhCaGRHZ2dQVDA5SUNkdWRXMWlaWEluS1NCN1hHNGdJQ0FnSUNBZ0lIQmhkR2dnUFNCYmNHRjBhRjA3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmlBb0lYQmhkR2dnZkh3Z2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhanRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNodlltb2dQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaR1ZtWVhWc2RGWmhiSFZsTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNW5aWFFvYjJKcUxDQndZWFJvTG5Od2JHbDBLQ2N1Snlrc0lHUmxabUYxYkhSV1lXeDFaU2s3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFVHRjBhQ0E5SUdkbGRFdGxlU2h3WVhSb1d6QmRLVHRjYmlBZ0lDQWdJSFpoY2lCdVpYaDBUMkpxSUQwZ1oyVjBVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnWTNWeWNtVnVkRkJoZEdncFhHNGdJQ0FnSUNCcFppQW9ibVY0ZEU5aWFpQTlQVDBnZG05cFpDQXdLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJrWldaaGRXeDBWbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2h3WVhSb0xteGxibWQwYUNBOVBUMGdNU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYm1WNGRFOWlhanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WjJWMEtHOWlhbHRqZFhKeVpXNTBVR0YwYUYwc0lIQmhkR2d1YzJ4cFkyVW9NU2tzSUdSbFptRjFiSFJXWVd4MVpTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VaR1ZzSUQwZ1puVnVZM1JwYjI0Z1pHVnNLRzlpYWl3Z2NHRjBhQ2tnZTF4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmJuVnRZbVZ5SnlrZ2UxeHVJQ0FnSUNBZ0lDQndZWFJvSUQwZ1czQmhkR2hkTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0dselJXMXdkSGtvY0dGMGFDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWp0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUtIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNWtaV3dvYjJKcUxDQndZWFJvTG5Od2JHbDBLQ2N1SnlrcE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRkJoZEdnZ1BTQm5aWFJMWlhrb2NHRjBhRnN3WFNrN1hHNGdJQ0FnSUNCcFppQW9JV2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lHTjFjbkpsYm5SUVlYUm9LU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaWh3WVhSb0xteGxibWQwYUNBOVBUMGdNU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9hWE5CY25KaGVTaHZZbW9wS1NCN1hHNGdJQ0FnSUNBZ0lDQWdiMkpxTG5Od2JHbGpaU2hqZFhKeVpXNTBVR0YwYUN3Z01TazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnWkdWc1pYUmxJRzlpYWx0amRYSnlaVzUwVUdGMGFGMDdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbVJsYkNodlltcGJZM1Z5Y21WdWRGQmhkR2hkTENCd1lYUm9Mbk5zYVdObEtERXBLVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnY21WMGRYSnVJRzlpYWp0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhSMWNtNGdiMkpxWldOMFVHRjBhRHRjYmlBZ2ZWeHVYRzRnSUhaaGNpQnRiMlFnUFNCbVlXTjBiM0o1S0NrN1hHNGdJRzF2WkM1amNtVmhkR1VnUFNCbVlXTjBiM0o1TzF4dUlDQnRiMlF1ZDJsMGFFbHVhR1Z5YVhSbFpGQnliM0J6SUQwZ1ptRmpkRzl5ZVNoN2FXNWpiSFZrWlVsdWFHVnlhWFJsWkZCeWIzQnpPaUIwY25WbGZTbGNiaUFnY21WMGRYSnVJRzF2WkR0Y2JuMHBPMXh1SWl3aUozVnpaU0J6ZEhKcFkzUW5YRzVjYm1OdmJuTjBJSHRwYzA5aWFtVmpkQ3dnWjJWMFMyVjVjMzBnUFNCeVpYRjFhWEpsS0NjdUwyeGhibWNuS1Z4dVhHNHZMeUJRVWtsV1FWUkZJRkJTVDFCRlVsUkpSVk5jYm1OdmJuTjBJRUpaVUVGVFUxOU5UMFJGSUQwZ0oxOWZZbmx3WVhOelRXOWtaU2RjYm1OdmJuTjBJRWxIVGs5U1JWOURTVkpEVlV4QlVpQTlJQ2RmWDJsbmJtOXlaVU5wY21OMWJHRnlKMXh1WTI5dWMzUWdUVUZZWDBSRlJWQWdQU0FuWDE5dFlYaEVaV1Z3SjF4dVkyOXVjM1FnUTBGRFNFVWdQU0FuWDE5allXTm9aU2RjYm1OdmJuTjBJRkZWUlZWRklEMGdKMTlmY1hWbGRXVW5YRzVqYjI1emRDQlRWRUZVUlNBOUlDZGZYM04wWVhSbEoxeHVYRzVqYjI1emRDQkZUVkJVV1Y5VFZFRlVSU0E5SUh0OVhHNWNibU5zWVhOeklGSmxZM1Z5YzJsMlpVbDBaWEpoZEc5eUlIdGNiaUFnTHlvcVhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmRUZ5Y21GNWZTQnliMjkwWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmJZbmx3WVhOelRXOWtaVDB3WFZ4dUlDQWdLaUJBY0dGeVlXMGdlMEp2YjJ4bFlXNTlJRnRwWjI1dmNtVkRhWEpqZFd4aGNqMW1ZV3h6WlYxY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJRnR0WVhoRVpXVndQVEV3TUYxY2JpQWdJQ292WEc0Z0lHTnZibk4wY25WamRHOXlJQ2h5YjI5MExDQmllWEJoYzNOTmIyUmxJRDBnTUN3Z2FXZHViM0psUTJseVkzVnNZWElnUFNCbVlXeHpaU3dnYldGNFJHVmxjQ0E5SURFd01Da2dlMXh1SUNBZ0lIUm9hWE5iUWxsUVFWTlRYMDFQUkVWZElEMGdZbmx3WVhOelRXOWtaVnh1SUNBZ0lIUm9hWE5iU1VkT1QxSkZYME5KVWtOVlRFRlNYU0E5SUdsbmJtOXlaVU5wY21OMWJHRnlYRzRnSUNBZ2RHaHBjMXROUVZoZlJFVkZVRjBnUFNCdFlYaEVaV1Z3WEc0Z0lDQWdkR2hwYzF0RFFVTklSVjBnUFNCYlhWeHVJQ0FnSUhSb2FYTmJVVlZGVlVWZElEMGdXMTFjYmlBZ0lDQjBhR2x6VzFOVVFWUkZYU0E5SUhSb2FYTXVaMlYwVTNSaGRHVW9kVzVrWldacGJtVmtMQ0J5YjI5MEtWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdUMkpxWldOMGZWeHVJQ0FnS2k5Y2JpQWdibVY0ZENBb0tTQjdYRzRnSUNBZ1kyOXVjM1FnZTI1dlpHVXNJSEJoZEdnc0lHUmxaWEI5SUQwZ2RHaHBjMXRUVkVGVVJWMGdmSHdnUlUxUVZGbGZVMVJCVkVWY2JseHVJQ0FnSUdsbUlDaDBhR2x6VzAxQldGOUVSVVZRWFNBK0lHUmxaWEFwSUh0Y2JpQWdJQ0FnSUdsbUlDaDBhR2x6TG1selRtOWtaU2h1YjJSbEtTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTVwYzBOcGNtTjFiR0Z5S0c1dlpHVXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLSFJvYVhOYlNVZE9UMUpGWDBOSlVrTlZURUZTWFNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2MydHBjRnh1SUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0owTnBjbU4xYkdGeUlISmxabVZ5Wlc1alpTY3BYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2gwYUdsekxtOXVVM1JsY0VsdWRHOG9kR2hwYzF0VFZFRlVSVjBwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emRDQmtaWE5qY21sd2RHOXljeUE5SUhSb2FYTXVaMlYwVTNSaGRHVnpUMlpEYUdsc1pFNXZaR1Z6S0c1dlpHVXNJSEJoZEdnc0lHUmxaWEFwWEc0Z0lDQWdJQ0FnSUNBZ0lDQmpiMjV6ZENCdFpYUm9iMlFnUFNCMGFHbHpXMEpaVUVGVFUxOU5UMFJGWFNBL0lDZHdkWE5vSnlBNklDZDFibk5vYVdaMEoxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGMxdFJWVVZWUlYxYmJXVjBhRzlrWFNndUxpNWtaWE5qY21sd2RHOXljeWxjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE5iUTBGRFNFVmRMbkIxYzJnb2JtOWtaU2xjYmlBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCamIyNXpkQ0IyWVd4MVpTQTlJSFJvYVhOYlVWVkZWVVZkTG5Ob2FXWjBLQ2xjYmlBZ0lDQmpiMjV6ZENCa2IyNWxJRDBnSVhaaGJIVmxYRzVjYmlBZ0lDQjBhR2x6VzFOVVFWUkZYU0E5SUhaaGJIVmxYRzVjYmlBZ0lDQnBaaUFvWkc5dVpTa2dkR2hwY3k1a1pYTjBjbTk1S0NsY2JseHVJQ0FnSUhKbGRIVnliaUI3ZG1Gc2RXVXNJR1J2Ym1WOVhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcVhHNGdJQ0FxTDF4dUlDQmtaWE4wY205NUlDZ3BJSHRjYmlBZ0lDQjBhR2x6VzFGVlJWVkZYUzVzWlc1bmRHZ2dQU0F3WEc0Z0lDQWdkR2hwYzF0RFFVTklSVjB1YkdWdVozUm9JRDBnTUZ4dUlDQWdJSFJvYVhOYlUxUkJWRVZkSUQwZ2JuVnNiRnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJBY0dGeVlXMGdleXA5SUdGdWVWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ292WEc0Z0lHbHpUbTlrWlNBb1lXNTVLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHbHpUMkpxWldOMEtHRnVlU2xjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FxTDF4dUlDQnBjMHhsWVdZZ0tHRnVlU2tnZTF4dUlDQWdJSEpsZEhWeWJpQWhkR2hwY3k1cGMwNXZaR1VvWVc1NUtWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQkFjR0Z5WVcwZ2V5cDlJR0Z1ZVZ4dUlDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDb3ZYRzRnSUdselEybHlZM1ZzWVhJZ0tHRnVlU2tnZTF4dUlDQWdJSEpsZEhWeWJpQjBhR2x6VzBOQlEwaEZYUzVwYm1SbGVFOW1LR0Z1ZVNrZ0lUMDlJQzB4WEc0Z0lIMWNiaUFnTHlvcVhHNGdJQ0FxSUZKbGRIVnlibk1nYzNSaGRHVnpJRzltSUdOb2FXeGtJRzV2WkdWelhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0J1YjJSbFhHNGdJQ0FxSUVCd1lYSmhiU0I3UVhKeVlYbDlJSEJoZEdoY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJR1JsWlhCY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBGeWNtRjVQRTlpYW1WamRENTlYRzRnSUNBcUwxeHVJQ0JuWlhSVGRHRjBaWE5QWmtOb2FXeGtUbTlrWlhNZ0tHNXZaR1VzSUhCaGRHZ3NJR1JsWlhBcElIdGNiaUFnSUNCeVpYUjFjbTRnWjJWMFMyVjVjeWh1YjJSbEtTNXRZWEFvYTJWNUlEMCtYRzRnSUNBZ0lDQjBhR2x6TG1kbGRGTjBZWFJsS0c1dlpHVXNJRzV2WkdWYmEyVjVYU3dnYTJWNUxDQndZWFJvTG1OdmJtTmhkQ2hyWlhrcExDQmtaV1Z3SUNzZ01TbGNiaUFnSUNBcFhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlGSmxkSFZ5Ym5NZ2MzUmhkR1VnYjJZZ2JtOWtaUzRnUTJGc2JITWdabTl5SUdWaFkyZ2dibTlrWlZ4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdXM0JoY21WdWRGMWNiaUFnSUNvZ1FIQmhjbUZ0SUhzcWZTQmJibTlrWlYxY2JpQWdJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJRnRyWlhsZFhHNGdJQ0FxSUVCd1lYSmhiU0I3UVhKeVlYbDlJRnR3WVhSb1hWeHVJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnVzJSbFpYQmRYRzRnSUNBcUlFQnlaWFIxY201eklIdFBZbXBsWTNSOVhHNGdJQ0FxTDF4dUlDQm5aWFJUZEdGMFpTQW9jR0Z5Wlc1MExDQnViMlJsTENCclpYa3NJSEJoZEdnZ1BTQmJYU3dnWkdWbGNDQTlJREFwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb0xDQmtaV1Z3ZlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCRFlXeHNZbUZqYTF4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdjM1JoZEdWY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQXFMMXh1SUNCdmJsTjBaWEJKYm5SdklDaHpkR0YwWlNrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwY25WbFhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlFQnlaWFIxY201eklIdFNaV04xY25OcGRtVkpkR1Z5WVhSdmNuMWNiaUFnSUNvdlhHNGdJRnRUZVcxaWIyd3VhWFJsY21GMGIzSmRJQ2dwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwYzF4dUlDQjlYRzU5WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1VtVmpkWEp6YVhabFNYUmxjbUYwYjNKY2JpSXNJaWQxYzJVZ2MzUnlhV04wSjF4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselQySnFaV04wSUNoaGJua3BJSHRjYmlBZ2NtVjBkWEp1SUdGdWVTQWhQVDBnYm5Wc2JDQW1KaUIwZVhCbGIyWWdZVzU1SUQwOVBTQW5iMkpxWldOMEoxeHVmVnh1THlvcVhHNGdLaUJBY0dGeVlXMGdleXA5SUdGdWVWeHVJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0tpOWNibU52Ym5OMElIdHBjMEZ5Y21GNWZTQTlJRUZ5Y21GNVhHNHZLaXBjYmlBcUlFQndZWEpoYlNCN0tuMGdZVzU1WEc0Z0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFxTDF4dVpuVnVZM1JwYjI0Z2FYTkJjbkpoZVV4cGEyVWdLR0Z1ZVNrZ2UxeHVJQ0JwWmlBb0lXbHpUMkpxWldOMEtHRnVlU2twSUhKbGRIVnliaUJtWVd4elpWeHVJQ0JwWmlBb0lTZ25iR1Z1WjNSb0p5QnBiaUJoYm5rcEtTQnlaWFIxY200Z1ptRnNjMlZjYmlBZ1kyOXVjM1FnYkdWdVozUm9JRDBnWVc1NUxteGxibWQwYUZ4dUlDQnBaaUFvSVdselRuVnRZbVZ5S0d4bGJtZDBhQ2twSUhKbGRIVnliaUJtWVd4elpWeHVJQ0JwWmlBb2JHVnVaM1JvSUQ0Z01Da2dlMXh1SUNBZ0lISmxkSFZ5YmlBb2JHVnVaM1JvSUMwZ01Ta2dhVzRnWVc1NVhHNGdJSDBnWld4elpTQjdYRzRnSUNBZ1ptOXlJQ2hqYjI1emRDQnJaWGtnYVc0Z1lXNTVLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJWY2JpQWdJQ0I5WEc0Z0lIMWNibjFjYmk4cUtseHVJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDb3ZYRzVtZFc1amRHbHZiaUJwYzA1MWJXSmxjaUFvWVc1NUtTQjdYRzRnSUhKbGRIVnliaUIwZVhCbGIyWWdZVzU1SUQwOVBTQW5iblZ0WW1WeUoxeHVmVnh1THlvcVhHNGdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeEJjbkpoZVgwZ2IySnFaV04wWEc0Z0tpQkFjbVYwZFhKdWN5QjdRWEp5WVhrOFUzUnlhVzVuUG4xY2JpQXFMMXh1Wm5WdVkzUnBiMjRnWjJWMFMyVjVjeUFvYjJKcVpXTjBLU0I3WEc0Z0lHTnZibk4wSUd0bGVYTmZJRDBnVDJKcVpXTjBMbXRsZVhNb2IySnFaV04wS1Z4dUlDQnBaaUFvYVhOQmNuSmhlU2h2WW1wbFkzUXBLU0I3WEc0Z0lDQWdMeThnYzJ0cGNDQnpiM0owWEc0Z0lIMGdaV3h6WlNCcFppQW9hWE5CY25KaGVVeHBhMlVvYjJKcVpXTjBLU2tnZTF4dUlDQWdJR052Ym5OMElHbHVaR1Y0SUQwZ2EyVjVjMTh1YVc1a1pYaFBaaWduYkdWdVozUm9KeWxjYmlBZ0lDQnBaaUFvYVc1a1pYZ2dQaUF0TVNrZ2UxeHVJQ0FnSUNBZ2EyVjVjMTh1YzNCc2FXTmxLR2x1WkdWNExDQXhLVnh1SUNBZ0lIMWNiaUFnSUNBdkx5QnphMmx3SUhOdmNuUmNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQXZMeUJ6YjNKMFhHNGdJQ0FnYTJWNWMxOHVjMjl5ZENncFhHNGdJSDFjYmlBZ2NtVjBkWEp1SUd0bGVYTmZYRzU5WEc1Y2JtVjRjRzl5ZEhNdVoyVjBTMlY1Y3lBOUlHZGxkRXRsZVhOY2JtVjRjRzl5ZEhNdWFYTkJjbkpoZVNBOUlHbHpRWEp5WVhsY2JtVjRjRzl5ZEhNdWFYTkJjbkpoZVV4cGEyVWdQU0JwYzBGeWNtRjVUR2xyWlZ4dVpYaHdiM0owY3k1cGMwOWlhbVZqZENBOUlHbHpUMkpxWldOMFhHNWxlSEJ2Y25SekxtbHpUblZ0WW1WeUlEMGdhWE5PZFcxaVpYSmNiaUlzSW1sdGNHOXlkQ0JNYVhOMFNYUmxiU0JtY205dElDY3VMMHhwYzNSSmRHVnRKenRjYm1sdGNHOXlkQ0J5WldOMWNuTnBkbVZKZEdWeVlYUnZjaUJtY205dElDZHlaV04xY25OcGRtVXRhWFJsY21GMGIzSW5PMXh1YVcxd2IzSjBJRzlpYW1WamRGQmhkR2dnWm5KdmJTQW5iMkpxWldOMExYQmhkR2duTzF4dVhHNWpiR0Z6Y3lCRVlYUmhUR2x6ZENCbGVIUmxibVJ6SUZKbFlXTjBMa052YlhCdmJtVnVkQ0I3WEc0Z0lDQWdZMjl1YzNSeWRXTjBiM0lvY0hKdmNITXBJSHRjYmlBZ0lDQWdJQ0FnYzNWd1pYSW9jSEp2Y0hNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5KbGJtUmxjazV2WkdWeklEMGdkR2hwY3k1eVpXNWtaWEpPYjJSbGN5NWlhVzVrS0hSb2FYTXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkRVpwWld4a1RXRndJRDBnZEdocGN5NXpaWFJHYVdWc1pFMWhjQzVpYVc1a0tIUm9hWE1wTzF4dUlDQWdJSDFjYmx4dUlDQWdJSE5sZEVacFpXeGtUV0Z3S0hCaGRHZ3NJR1YyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJR1YyWlc1MExuQnlaWFpsYm5SRVpXWmhkV3gwS0NrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0hKdmNITXVkWEJrWVhSbFJtbGxiR1JOWVhBb2UxdGxkbVZ1ZEM1MFlYSm5aWFF1WkdGMFlYTmxkQzVtYVdWc1pGMDZJSEJoZEdoOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpXNWtaWEpPYjJSbGN5aGtZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCUFltcGxZM1F1YTJWNWN5aGtZWFJoS1M1dFlYQW9hWFJsYlNBOVBpQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hWFJsYlNBOVBUMGdKMjlpYW1WamRGQmhkR2duS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNaWFFnWTJocGJHUWdQU0E4VEdsemRFbDBaVzBnYTJWNVBYdHBkR1Z0TG5SdlUzUnlhVzVuS0NsOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1U5ZTJsMFpXMTlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxWldOMFBYdGtZWFJoVzJsMFpXMWRmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndQWHQwYUdsekxuQnliM0J6TG1acFpXeGtUV0Z3ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5dVEyeHBZMnREYjI1MFlXbHVaWEk5ZTJVZ1BUNGdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDaGtZWFJoVzJsMFpXMWRMbTlpYW1WamRGQmhkR2dzSUdVcGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHOXVRMnhwWTJ0VWFYUnNaVDE3WlNBOVBpQjBhR2x6TG5ObGRFWnBaV3hrVFdGd0tHUmhkR0ZiYVhSbGJWMHNJR1VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5dVEyeHBZMnREYjI1MFpXNTBQWHRsSUQwK0lIUm9hWE11YzJWMFJtbGxiR1JOWVhBb1pHRjBZVnRwZEdWdFhTd2daU2w5THo0N1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1pHRjBZVnRwZEdWdFhTQTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ1pHRjBZVnRwZEdWdFhTQWhQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05vYVd4a0lEMGdVbVZoWTNRdVkyeHZibVZGYkdWdFpXNTBLR05vYVd4a0xDQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOb2FXeGtjbVZ1T2lCQmNuSmhlUzVwYzBGeWNtRjVLR1JoZEdGYmFYUmxiVjBwSUQ4Z2RHaHBjeTV5Wlc1a1pYSk9iMlJsY3loa1lYUmhXMmwwWlcxZFd6QmRLU0E2SUhSb2FYTXVjbVZ1WkdWeVRtOWtaWE1vWkdGMFlWdHBkR1Z0WFNsY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR05vYVd4a08xeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaVzVrWlhJb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElHWnBaV3hrVFdGd0lEMGdkR2hwY3k1d2NtOXdjeTVtYVdWc1pFMWhjRHRjYmx4dUlDQWdJQ0FnSUNCc1pYUWdaR0YwWVNBOUlIUm9hWE11Y0hKdmNITXVaR0YwWVR0Y2JpQWdJQ0FnSUNBZ2FXWWdLRUZ5Y21GNUxtbHpRWEp5WVhrb1pHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJZ1BTQW5KenRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2htYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlEMDlQU0J1ZFd4c0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9RWEp5WVhrdWFYTkJjbkpoZVNoa1lYUmhLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdSaGRHRWdQU0JrWVhSaFd6QmRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLR3hsZENCN2NHRnlaVzUwTENCdWIyUmxMQ0JyWlhrc0lIQmhkR2g5SUc5bUlHNWxkeUJ5WldOMWNuTnBkbVZKZEdWeVlYUnZjaWhrWVhSaEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYm05a1pTQTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2JtOWtaU0FoUFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnNaWFFnY0dGMGFGTjBjbWx1WnlBOUlIQmhkR2d1YW05cGJpZ25MaWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZZbXBsWTNSUVlYUm9Mbk5sZENoa1lYUmhMQ0J3WVhSb1UzUnlhVzVuSUNzZ0p5NXZZbXBsWTNSUVlYUm9KeXdnY0dGMGFGTjBjbWx1WnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhvTXo1VFpXeGxZM1FnYVhSbGJYTWdZMjl1ZEdGcGJtVnlQQzlvTXo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQSFZzUG50MGFHbHpMbkpsYm1SbGNrNXZaR1Z6S0dSaGRHRXBmVHd2ZFd3K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JHVjBJRzlpYW1WamRFUmhkR0VnUFNCdlltcGxZM1JRWVhSb0xtZGxkQ2gwYUdsekxuQnliM0J6TG1SaGRHRXNJR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJcE8xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9RWEp5WVhrdWFYTkJjbkpoZVNodlltcGxZM1JFWVhSaEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamRFUmhkR0VnUFNCdlltcGxZM1JFWVhSaFd6QmRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLR3hsZENCN2NHRnlaVzUwTENCdWIyUmxMQ0JyWlhrc0lIQmhkR2g5SUc5bUlHNWxkeUJ5WldOMWNuTnBkbVZKZEdWeVlYUnZjaWh2WW1wbFkzUkVZWFJoS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdibTlrWlNBaFBUMGdKMjlpYW1WamRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JHVjBJSEJoZEdoVGRISnBibWNnUFNCd1lYUm9MbXB2YVc0b0p5NG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcVpXTjBSR0YwWVN3Z2NHRjBhRk4wY21sdVp5d2djR0YwYUZOMGNtbHVaeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeG9NejVUWld4bFkzUWdkR2wwYkdVZ1lXNWtJR052Ym5SbGJuUWdabWxsYkdSelBDOW9NejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BIVnNQbnQwYUdsekxuSmxibVJsY2s1dlpHVnpLRzlpYW1WamRFUmhkR0VwZlR3dmRXdytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzlrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQkVZWFJoVEdsemREc2lMQ0pwYlhCdmNuUWdSR0YwWVV4cGMzUWdabkp2YlNBbkxpOUVZWFJoVEdsemRDYzdYRzVjYm1Oc1lYTnpJRVpwWld4a1UyVnNaV04wYVc5dUlHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lod2NtOXdjeWtnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWh3Y205d2N5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsY25KdmNqb2diblZzYkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR2x6VEc5aFpHVmtPaUJtWVd4elpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUdsMFpXMXpPaUJiWFZ4dUlDQWdJQ0FnSUNCOU8xeHVYRzRnSUNBZ0lDQWdJSFJvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEFnUFNCMGFHbHpMblZ3WkdGMFpVWnBaV3hrVFdGd0xtSnBibVFvZEdocGN5azdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RYQmtZWFJsUm1sbGJHUk5ZWEFvZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXdjbTl3Y3k1MWNHUmhkR1ZHYVdWc1pFMWhjQ2gyWVd4MVpTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5OGdWRTlFVHlCdGIzWmxJSFJ2SUhWMGFXd2diV1YwYUc5a1hHNGdJQ0FnWjJWMFFYQnBSR0YwWVNncElIdGNiaUFnSUNBZ0lDQWdabVYwWTJnb2RHaHBjeTV3Y205d2N5NTFjbXdwWEc0Z0lDQWdJQ0FnSUNBZ0lDQXVkR2hsYmloeVpYTWdQVDRnY21WekxtcHpiMjRvS1NsY2JpQWdJQ0FnSUNBZ0lDQWdJQzUwYUdWdUtGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDaHlaWE4xYkhRcElEMCtJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwYzB4dllXUmxaRG9nZEhKMVpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzF6T2lCeVpYTjFiSFJjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FvWlhKeWIzSXBJRDArSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcGMweHZZV1JsWkRvZ2RISjFaU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1Z5Y205eVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdZMjl0Y0c5dVpXNTBSR2xrVFc5MWJuUW9LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVaMlYwUVhCcFJHRjBZU2dwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsYm1SbGNpZ3BJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdlMlZ5Y205eUxDQnBjMHh2WVdSbFpDd2dhWFJsYlhOOUlEMGdkR2hwY3k1emRHRjBaVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHVnljbTl5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdQR1JwZGo1RmNuSnZjam9nZTJWeWNtOXlMbTFsYzNOaFoyVjlQQzlrYVhZK08xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLQ0ZwYzB4dllXUmxaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlEeGthWFlnWTJ4aGMzTk9ZVzFsUFZ3aWMzQnBibTVsY2lCcGN5MWhZM1JwZG1WY0lpQnpkSGxzWlQxN2UyWnNiMkYwT2lBbmJtOXVaU2NzSUdScGMzQnNZWGs2SUNkaWJHOWpheWNzSUhkcFpIUm9PaUFuWVhWMGJ5Y3NJR2hsYVdkb2REb2dKMkYxZEc4bkxDQndZV1JrYVc1bk9pQW5NVEJ3ZUNBeE1IQjRJRE13Y0hnZ01UQndlQ2Q5ZlQ0OEwyUnBkajQ3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1BFUmhkR0ZNYVhOMFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVDE3YVhSbGJYTjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEpzUFh0MGFHbHpMbkJ5YjNCekxuVnliSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRDE3ZEdocGN5NXdjbTl3Y3k1bWFXVnNaRTFoY0gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWNHUmhkR1ZHYVdWc1pFMWhjRDE3ZEdocGN5NTFjR1JoZEdWR2FXVnNaRTFoY0gwdlBqdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibjFjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnUm1sbGJHUlRaV3hsWTNScGIyNDdJaXdpWm5WdVkzUnBiMjRnU1c1d2RYUkdhV1ZzWkhNb2NISnZjSE1wSUh0Y2JpQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSm9hV1JrWlc1Y0lpQnVZVzFsUFZ3aWJXOWtYMnB6YjI1ZmNtVnVaR1Z5WDNWeWJGd2lJSFpoYkhWbFBYdHdjbTl3Y3k1MWNteDlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lEeHBibkIxZENCMGVYQmxQVndpYUdsa1pHVnVYQ0lnYm1GdFpUMWNJbTF2WkY5cWMyOXVYM0psYm1SbGNsOW1hV1ZzWkcxaGNGd2lJSFpoYkhWbFBYdEtVMDlPTG5OMGNtbHVaMmxtZVNod2NtOXdjeTVtYVdWc1pFMWhjQ2w5THo1Y2JpQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdLVHRjYm4xY2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1NXNXdkWFJHYVdWc1pITTdJaXdpWm5WdVkzUnBiMjRnVEdsemRFbDBaVzBvY0hKdmNITXBJSHRjYmlBZ0lDQmpiMjV6ZENCN2RtRnNkV1VzSUdOb2FXeGtjbVZ1TENCbWFXVnNaRTFoY0N3Z2IySnFaV04wTENCdmJrTnNhV05yVkdsMGJHVXNJRzl1UTJ4cFkydERiMjUwWlc1MExDQnZia05zYVdOclEyOXVkR0ZwYm1WeWZTQTlJSEJ5YjNCek8xeHVJQ0FnSUhKbGRIVnliaUFvUEd4cFBseHVJQ0FnSUNBZ0lDQjdabWxsYkdSTllYQXVkR2wwYkdVZ1BUMDlJRzlpYW1WamRDQS9JRHh6ZEhKdmJtYytWR2wwYkdVNklEd3ZjM1J5YjI1blBpQTZJQ2NuZlZ4dUlDQWdJQ0FnSUNCN1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZENBOVBUMGdiMkpxWldOMElEOGdQSE4wY205dVp6NURiMjUwWlc1ME9pQThMM04wY205dVp6NGdPaUFuSjMxY2JpQWdJQ0FnSUNBZ2UyTm9hV3hrY21WdUlEOGdQSE4wY205dVp6NTdkbUZzZFdWOVBDOXpkSEp2Ym1jK0lEb2dQSE53WVc0K2UzWmhiSFZsZlR3dmMzQmhiajU5WEc0Z0lDQWdJQ0FnSUhzaFkyaHBiR1J5Wlc0Z0ppWWdJV1pwWld4a1RXRndMblJwZEd4bElDWW1JQ2htYVdWc1pFMWhjQzVqYjI1MFpXNTBJQ0U5UFNCdlltcGxZM1FwSUNZbUlHWnBaV3hrVFdGd0xtbDBaVzFEYjI1MFlXbHVaWElnSVQwOUlHNTFiR3dnUDF4dUlDQWdJQ0FnSUNBZ0lDQWdQR0VnYUhKbFpqMWNJaU5jSWlCamJHRnpjMDVoYldVOVhDSmlkWFIwYjI0Z1luVjBkRzl1TFhOdFlXeHNYQ0lnWkdGMFlTMW1hV1ZzWkQxY0luUnBkR3hsWENJZ2IyNURiR2xqYXoxN2IyNURiR2xqYTFScGRHeGxmVDVVYVhSc1pUd3ZZVDRnT2lBbkozMWNiaUFnSUNBZ0lDQWdleUZqYUdsc1pISmxiaUFtSmlBb1ptbGxiR1JOWVhBdWRHbDBiR1VnSVQwOUlHOWlhbVZqZENrZ0ppWWdJV1pwWld4a1RXRndMbU52Ym5SbGJuUWdKaVlnWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQWhQVDBnYm5Wc2JDQS9YRzRnSUNBZ0lDQWdJQ0FnSUNBOFlTQm9jbVZtUFZ3aUkxd2lJR05zWVhOelRtRnRaVDFjSW1KMWRIUnZiaUJpZFhSMGIyNHRjMjFoYkd4Y0lpQmtZWFJoTFdacFpXeGtQVndpWTI5dWRHVnVkRndpWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2YmtOc2FXTnJQWHR2YmtOc2FXTnJRMjl1ZEdWdWRIMCtRMjl1ZEdWdWREd3ZZVDRnT2lBbkozMWNiaUFnSUNBZ0lDQWdlMk5vYVd4a2NtVnVJQ1ltSUVGeWNtRjVMbWx6UVhKeVlYa29iMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlEMDlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUR4aElHaHlaV1k5WENJalhDSWdZMnhoYzNOT1lXMWxQVndpWW5WMGRHOXVJR0oxZEhSdmJpMXpiV0ZzYkZ3aUlHUmhkR0V0Wm1sbGJHUTlYQ0pwZEdWdFEyOXVkR0ZwYm1WeVhDSmNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lHOXVRMnhwWTJzOWUyOXVRMnhwWTJ0RGIyNTBZV2x1WlhKOVBsTmxiR1ZqZER3dllUNGdPaUFuSjMxY2JpQWdJQ0FnSUNBZ2UyTm9hV3hrY21WdUlEOGdQSE53WVc0Z1kyeGhjM05PWVcxbFBWd2laR0Z6YUdsamIyNXpJR1JoYzJocFkyOXVjeTFoY25KdmR5MWtiM2R1WENJK1BDOXpjR0Z1UGlBNklDY25mVnh1SUNBZ0lDQWdJQ0I3WTJocGJHUnlaVzRnUHlBOGRXd2djM1I1YkdVOWUzdHdZV1JrYVc1blRHVm1kRG9nTVRVc0lHSnZjbVJsY2t4bFpuUTZJQ2N5Y0hnZ2MyOXNhV1FnSTJOall5ZDlmVDU3WTJocGJHUnlaVzU5UEM5MWJENGdPaUFuSjMxY2JpQWdJQ0E4TDJ4cFBpazdYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUV4cGMzUkpkR1Z0T3lJc0ltbHRjRzl5ZENCR2FXVnNaRk5sYkdWamRHbHZiaUJtY205dElDY3VMMFpwWld4a1UyVnNaV04wYVc5dUp6dGNibWx0Y0c5eWRDQkpibkIxZEVacFpXeGtjeUJtY205dElDY3VMMGx1Y0hWMFJtbGxiR1J6Snp0Y2JtbHRjRzl5ZENCVGRXMXRZWEo1SUdaeWIyMGdKeTR2VTNWdGJXRnllU2M3WEc1Y2JtTnZibk4wSUdsdWFYUnBZV3hUZEdGMFpTQTlJSHRjYmlBZ0lDQnphRzkzUm1sbGJHUlRaV3hsWTNScGIyNDZJR1poYkhObExGeHVJQ0FnSUhWeWJEb2dKeWNzWEc0Z0lDQWdabWxsYkdSTllYQTZJSHRjYmlBZ0lDQWdJQ0FnYVhSbGJVTnZiblJoYVc1bGNqb2diblZzYkN4Y2JpQWdJQ0FnSUNBZ2RHbDBiR1U2SUNjbkxGeHVJQ0FnSUNBZ0lDQmpiMjUwWlc1ME9pQW5KMXh1SUNBZ0lIMWNibjA3WEc1Y2JtTnNZWE56SUZObGRIUnBibWR6SUdWNGRHVnVaSE1nVW1WaFkzUXVRMjl0Y0c5dVpXNTBJSHRjYmlBZ0lDQmpiMjV6ZEhKMVkzUnZjaWh3Y205d2N5a2dlMXh1SUNBZ0lDQWdJQ0J6ZFhCbGNpaHdjbTl3Y3lrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzNSaGRHVWdQU0JwYm1sMGFXRnNVM1JoZEdVN1hHNWNiaUFnSUNBZ0lDQWdkR2hwY3k1MWNteERhR0Z1WjJVZ1BTQjBhR2x6TG5WeWJFTm9ZVzVuWlM1aWFXNWtLSFJvYVhNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG1oaGJtUnNaVk4xWW0xcGRDQTlJSFJvYVhNdWFHRnVaR3hsVTNWaWJXbDBMbUpwYm1Rb2RHaHBjeWs3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjbVZ6WlhSUGNIUnBiMjV6SUQwZ2RHaHBjeTV5WlhObGRFOXdkR2x2Ym5NdVltbHVaQ2gwYUdsektUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1MWNHUmhkR1ZHYVdWc1pFMWhjQ0E5SUhSb2FYTXVkWEJrWVhSbFJtbGxiR1JOWVhBdVltbHVaQ2gwYUdsektUdGNiaUFnSUNCOVhHNWNiaUFnSUNCamIyMXdiMjVsYm5SRWFXUk5iM1Z1ZENncElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1cGJtbDBUM0IwYVc5dWN5Z3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHbHVhWFJQY0hScGIyNXpLQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHMXZaRXB6YjI1U1pXNWtaWEl1YjNCMGFXOXVjeUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZibk4wSUc5d2RHbHZibk1nUFNCdGIyUktjMjl1VW1WdVpHVnlMbTl3ZEdsdmJuTTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213NklHOXdkR2x2Ym5NdWRYSnNJRDhnYjNCMGFXOXVjeTUxY213Z09pQW5KeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRG9nYjNCMGFXOXVjeTVtYVdWc1pFMWhjQ0EvSUVwVFQwNHVjR0Z5YzJVb2IzQjBhVzl1Y3k1bWFXVnNaRTFoY0NrZ09pQjdhWFJsYlVOdmJuUmhhVzVsY2pvZ2JuVnNiQ3dnZEdsMGJHVTZJQ2NuTENCamIyNTBaVzUwT2lBbkozMHNYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMmh2ZDBacFpXeGtVMlZzWldOMGFXOXVPaUFoSVc5d2RHbHZibk11ZFhKc1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUhWeWJFTm9ZVzVuWlNobGRtVnVkQ2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHQxY213NklHVjJaVzUwTG5SaGNtZGxkQzUyWVd4MVpYMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHaGhibVJzWlZOMVltMXBkQ2hsZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0JsZG1WdWRDNXdjbVYyWlc1MFJHVm1ZWFZzZENncE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0emFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0NklIUnlkV1Y5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhObGRFOXdkR2x2Ym5Nb1pYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ1pYWmxiblF1Y0hKbGRtVnVkRVJsWm1GMWJIUW9LVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaHBibWwwYVdGc1UzUmhkR1VwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSFZ3WkdGMFpVWnBaV3hrVFdGd0tIWmhiSFZsS1NCN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUc1bGQxWmhiQ0E5SUU5aWFtVmpkQzVoYzNOcFoyNG9kR2hwY3k1emRHRjBaUzVtYVdWc1pFMWhjQ3dnZG1Gc2RXVXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtIdG1hV1ZzWkUxaGNEb2dibVYzVm1Gc2ZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5S0NrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dUxDQjFjbXg5SUQwZ2RHaHBjeTV6ZEdGMFpUdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UybDBaVzFEYjI1MFlXbHVaWElzSUhScGRHeGxMQ0JqYjI1MFpXNTBmU0E5SUhSb2FYTXVjM1JoZEdVdVptbGxiR1JOWVhBN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0hWeWJDQW1KaUJwZEdWdFEyOXVkR0ZwYm1WeUlDRTlQU0J1ZFd4c0lDWW1JSFJwZEd4bElDWW1JR052Ym5SbGJuUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BGTjFiVzFoY25rZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhKYm5CMWRFWnBaV3hrY3lCN0xpNHVkR2hwY3k1emRHRjBaWDBnTHo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR0VnYUhKbFpqMWNJaU5jSWlCdmJrTnNhV05yUFh0MGFHbHpMbkpsYzJWMFQzQjBhVzl1YzMwZ1kyeGhjM05PWVcxbFBWd2lZblYwZEc5dVhDSStVbVZ6WlhRZ2MyVjBkR2x1WjNNOEwyRStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzlrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FwTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFJtbGxiR1JUWld4bFkzUnBiMjRnZFhKc1BYdDFjbXg5SUdacFpXeGtUV0Z3UFh0MGFHbHpMbk4wWVhSbExtWnBaV3hrVFdGd2ZTQjFjR1JoZEdWR2FXVnNaRTFoY0QxN2RHaHBjeTUxY0dSaGRHVkdhV1ZzWkUxaGNIMHZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFNXNXdkWFJHYVdWc1pITWdleTR1TG5Sb2FYTXVjM1JoZEdWOUlDOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4aElHaHlaV1k5WENJalhDSWdiMjVEYkdsamF6MTdkR2hwY3k1eVpYTmxkRTl3ZEdsdmJuTjlJR05zWVhOelRtRnRaVDFjSW1KMWRIUnZibHdpUGxKbGMyVjBJSE5sZEhScGJtZHpQQzloUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRpQmpiR0Z6YzA1aGJXVTlYQ0ozY21Gd1hDSStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4bWIzSnRJRzl1VTNWaWJXbDBQWHQwYUdsekxtaGhibVJzWlZOMVltMXBkSDArWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThiR0ZpWld3K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4emRISnZibWMrUkdGMFlTQnpiM1Z5WTJVOEwzTjBjbTl1Wno1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMMnhoWW1Wc1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhpY2k4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR2srUlc1MFpYSWdZU0IyWVd4cFpDQktVMDlPSUdGd2FTQjFjbXd1UEM5cFBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOXdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR2x1Y0hWMElIUjVjR1U5WENKMFpYaDBYQ0lnYzNSNWJHVTllM3QzYVdSMGFEb2dKekV3TUNVbmZYMGdkbUZzZFdVOWUzVnliSDBnYjI1RGFHRnVaMlU5ZTNSb2FYTXVkWEpzUTJoaGJtZGxmUzgrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4Y0Q0OGFXNXdkWFFnZEhsd1pUMWNJbk4xWW0xcGRGd2lJR05zWVhOelRtRnRaVDFjSW1KMWRIUnZiaUJpZFhSMGIyNHRjSEpwYldGeWVWd2lJSFpoYkhWbFBWd2lVM1ZpYldsMFhDSXZQand2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzltYjNKdFBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4U1c1d2RYUkdhV1ZzWkhNZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCVFpYUjBhVzVuY3pzaUxDSm1kVzVqZEdsdmJpQlRkVzF0WVhKNUtIQnliM0J6S1NCN1hHNGdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnUEhWc1BseHVJQ0FnSUNBZ0lDQWdJQ0FnUEd4cElITjBlV3hsUFh0N2QyOXlaRUp5WldGck9pQW5ZbkpsWVdzdFlXeHNKMzE5UGtSaGRHRWdjMjkxY21ObE9pQjdjSEp2Y0hNdWRYSnNmVHd2YkdrK1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4YkdrK1ZHbDBiR1U2SUh0d2NtOXdjeTVtYVdWc1pFMWhjQzUwYVhSc1pYMDhMMnhwUGx4dUlDQWdJQ0FnSUNBZ0lDQWdQR3hwUGtOdmJuUmxiblE2SUh0d2NtOXdjeTVtYVdWc1pFMWhjQzVqYjI1MFpXNTBmVHd2YkdrK1hHNGdJQ0FnSUNBZ0lEd3ZkV3crWEc0Z0lDQWdLVHRjYm4xY2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1UzVnRiV0Z5ZVRzaUxDSnBiWEJ2Y25RZ1UyVjBkR2x1WjNNZ1puSnZiU0FuTGk5RGIyMXdiMjVsYm5SekwxTmxkSFJwYm1kekp6dGNibHh1WTI5dWMzUWdiVzlrU25OdmJsSmxibVJsY2tWc1pXMWxiblFnUFNBbmJXOWtkV3hoY21sMGVTMXFjMjl1TFhKbGJtUmxjaWM3WEc1amIyNXpkQ0JrYjIxRmJHVnRaVzUwSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvYlc5a1NuTnZibEpsYm1SbGNrVnNaVzFsYm5RcE8xeHVYRzVTWldGamRFUlBUUzV5Wlc1a1pYSW9YRzRnSUNBZ1BGTmxkSFJwYm1keklDOCtMRnh1SUNBZ0lHUnZiVVZzWlcxbGJuUmNiaWs3SWwxOVxuIl0sImZpbGUiOiJBZG1pbi9JbmRleEFkbWluLmpzIn0=
