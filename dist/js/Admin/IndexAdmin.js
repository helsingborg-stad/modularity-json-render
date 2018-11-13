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

        return React.createElement("div", null, React.createElement("h3", null, "Select items container"), React.createElement("ul", {
          className: "json-tree"
        }, this.renderNodes(data)));
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

        return React.createElement("div", null, React.createElement("h3", null, "Select title and content fields"), React.createElement("ul", {
          className: "json-tree"
        }, this.renderNodes(objectData)));
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
  var fieldMap = props.fieldMap,
      url = props.url;
  return React.createElement("div", null, React.createElement("input", {
    type: "hidden",
    name: "mod_json_render_url",
    value: url
  }), React.createElement("input", {
    type: "hidden",
    name: "mod_json_render_fieldmap",
    value: JSON.stringify(fieldMap)
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

  if (children) {
    return React.createElement("li", null, Array.isArray(object) && fieldMap.itemContainer === null ? React.createElement("span", null, React.createElement("span", {
      className: "dashicons dashicons-portfolio"
    }), " ", value, " ", React.createElement("a", {
      href: "#",
      className: "tree-select",
      "data-field": "itemContainer",
      onClick: onClickContainer
    }, "Select")) : React.createElement("span", null, value), React.createElement("ul", null, children));
  } else {
    return React.createElement("li", null, fieldMap.title === object && fieldMap.title ? React.createElement("strong", null, "Title: ") : '', fieldMap.content === object && fieldMap.content ? React.createElement("strong", null, "Content: ") : '', React.createElement("span", null, value), !fieldMap.title && fieldMap.content !== object && fieldMap.itemContainer !== null ? React.createElement("a", {
      href: "#",
      className: "tree-select",
      "data-field": "title",
      onClick: onClickTitle
    }, "Title") : '', !fieldMap.content && fieldMap.title !== object && fieldMap.itemContainer !== null ? React.createElement("a", {
      href: "#",
      className: "tree-select",
      "data-field": "content",
      onClick: onClickContent
    }, "Content") : '');
  }
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

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Settings =
/*#__PURE__*/
function (_React$Component) {
  _inherits(Settings, _React$Component);

  function Settings(props) {
    var _this;

    _classCallCheck(this, Settings);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Settings).call(this, props));
    _this.state = {
      showFieldSelection: false,
      url: '',
      fieldMap: {
        itemContainer: null,
        title: '',
        content: ''
      }
    };
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
      this.setState({
        showFieldSelection: false,
        url: '',
        fieldMap: {
          itemContainer: null,
          title: '',
          content: ''
        }
      });
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
        return React.createElement("div", null, React.createElement(_Summary.default, this.state), React.createElement(_InputFields.default, this.state), React.createElement("p", null, React.createElement("a", {
          href: "#",
          onClick: this.resetOptions.bind(this),
          className: "button"
        }, "Reset settings")));
      } else if (showFieldSelection) {
        return React.createElement("div", null, React.createElement(_FieldSelection.default, {
          url: url,
          fieldMap: this.state.fieldMap,
          updateFieldMap: this.updateFieldMap.bind(this)
        }), React.createElement(_InputFields.default, this.state), React.createElement("p", null, React.createElement("a", {
          href: "#",
          onClick: this.resetOptions,
          className: "button"
        }, "Reset settings")));
      } else {
        return React.createElement("div", {
          className: "wrap"
        }, React.createElement("form", {
          onSubmit: this.handleSubmit.bind(this)
        }, React.createElement("p", null, React.createElement("label", null, React.createElement("strong", null, "Data source")), React.createElement("br", null), React.createElement("i", null, "Enter a valid JSON api url.")), React.createElement("input", {
          type: "text",
          className: "url-input",
          value: url,
          onChange: this.urlChange.bind(this)
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
  return React.createElement("div", null, React.createElement("p", null, React.createElement("strong", null, "Data source"), React.createElement("br", null), React.createElement("a", {
    href: props.url,
    target: "_blank"
  }, props.url)), React.createElement("p", null, React.createElement("strong", null, "Title"), React.createElement("br", null), props.fieldMap.title.replace('.', ' –> ')), React.createElement("p", null, React.createElement("strong", null, "Content"), React.createElement("br", null), props.fieldMap.content.replace('.', ' –> ')));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7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ImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5vYmplY3RQYXRoID0gZmFjdG9yeSgpO1xuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgaWYob2JqID09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvL3RvIGhhbmRsZSBvYmplY3RzIHdpdGggbnVsbCBwcm90b3R5cGVzICh0b28gZWRnZSBjYXNlPylcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcClcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpe1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKXtcbiAgICByZXR1cm4gdG9TdHIuY2FsbCh0eXBlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XG4gIH1cblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKXtcbiAgICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gICAgcmV0dXJuIHRvU3RyLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQm9vbGVhbihvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0S2V5KGtleSl7XG4gICAgdmFyIGludEtleSA9IHBhcnNlSW50KGtleSk7XG4gICAgaWYgKGludEtleS50b1N0cmluZygpID09PSBrZXkpIHtcbiAgICAgIHJldHVybiBpbnRLZXk7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBmYWN0b3J5KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gICAgdmFyIG9iamVjdFBhdGggPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3RQYXRoKS5yZWR1Y2UoZnVuY3Rpb24ocHJveHksIHByb3ApIHtcbiAgICAgICAgaWYocHJvcCA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICAgIH1cblxuICAgICAgICAvKmlzdGFuYnVsIGlnbm9yZSBlbHNlKi9cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RQYXRoW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcHJveHlbcHJvcF0gPSBvYmplY3RQYXRoW3Byb3BdLmJpbmQob2JqZWN0UGF0aCwgb2JqKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgIH0sIHt9KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgcmV0dXJuIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyB8fCAodHlwZW9mIHByb3AgPT09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkob2JqKSkgfHwgaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLm1hcChnZXRLZXkpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IHBhdGhbMF07XG4gICAgICB2YXIgY3VycmVudFZhbHVlID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCB8fCAhZG9Ob3RSZXBsYWNlKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCkge1xuICAgICAgICAvL2NoZWNrIGlmIHdlIGFzc3VtZSBhbiBhcnJheVxuICAgICAgICBpZih0eXBlb2YgcGF0aFsxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfVxuXG4gICAgb2JqZWN0UGF0aC5oYXMgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICEhb2JqO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGogPSBnZXRLZXkocGF0aFtpXSk7XG5cbiAgICAgICAgaWYoKHR5cGVvZiBqID09PSAnbnVtYmVyJyAmJiBpc0FycmF5KG9iaikgJiYgaiA8IG9iai5sZW5ndGgpIHx8XG4gICAgICAgICAgKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzID8gKGogaW4gT2JqZWN0KG9iaikpIDogaGFzT3duUHJvcGVydHkob2JqLCBqKSkpIHtcbiAgICAgICAgICBvYmogPSBvYmpbal07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVuc3VyZUV4aXN0cyA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguaW5zZXJ0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGF0KXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgYXQgPSB+fmF0O1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cbiAgICAgIGFyci5zcGxpY2UoYXQsIDAsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbXB0eSA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUsIGk7XG4gICAgICBpZiAoISh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCkpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsICcnKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHZhbHVlLmxlbmd0aCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICBmb3IgKGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgbnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGgucHVzaCA9IGZ1bmN0aW9uIChvYmosIHBhdGggLyosIHZhbHVlcyAqLyl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG5cbiAgICAgIGFyci5wdXNoLmFwcGx5KGFyciwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguY29hbGVzY2UgPSBmdW5jdGlvbiAob2JqLCBwYXRocywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoc1tpXSkpICE9PSB2b2lkIDApIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBkZWZhdWx0VmFsdWUpe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLCBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICB2YXIgbmV4dE9iaiA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKVxuICAgICAgaWYgKG5leHRPYmogPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG5leHRPYmo7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCBkZWZhdWx0VmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmRlbCA9IGZ1bmN0aW9uIGRlbChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZih0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9iaiwgcGF0aC5zcGxpdCgnLicpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgaWYgKCFoYXNTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgIG9iai5zcGxpY2UoY3VycmVudFBhdGgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvYmpbY3VycmVudFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iamVjdFBhdGg7XG4gIH1cblxuICB2YXIgbW9kID0gZmFjdG9yeSgpO1xuICBtb2QuY3JlYXRlID0gZmFjdG9yeTtcbiAgbW9kLndpdGhJbmhlcml0ZWRQcm9wcyA9IGZhY3Rvcnkoe2luY2x1ZGVJbmhlcml0ZWRQcm9wczogdHJ1ZX0pXG4gIHJldHVybiBtb2Q7XG59KTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG4iLCIndXNlIHN0cmljdCdcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCAoYW55KSB7XG4gIHJldHVybiBhbnkgIT09IG51bGwgJiYgdHlwZW9mIGFueSA9PT0gJ29iamVjdCdcbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5jb25zdCB7aXNBcnJheX0gPSBBcnJheVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlIChhbnkpIHtcbiAgaWYgKCFpc09iamVjdChhbnkpKSByZXR1cm4gZmFsc2VcbiAgaWYgKCEoJ2xlbmd0aCcgaW4gYW55KSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGxlbmd0aCA9IGFueS5sZW5ndGhcbiAgaWYgKCFpc051bWJlcihsZW5ndGgpKSByZXR1cm4gZmFsc2VcbiAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gKGxlbmd0aCAtIDEpIGluIGFueVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFueSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIgKGFueSkge1xuICByZXR1cm4gdHlwZW9mIGFueSA9PT0gJ251bWJlcidcbn1cbi8qKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5PFN0cmluZz59XG4gKi9cbmZ1bmN0aW9uIGdldEtleXMgKG9iamVjdCkge1xuICBjb25zdCBrZXlzXyA9IE9iamVjdC5rZXlzKG9iamVjdClcbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkge1xuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2UgaWYgKGlzQXJyYXlMaWtlKG9iamVjdCkpIHtcbiAgICBjb25zdCBpbmRleCA9IGtleXNfLmluZGV4T2YoJ2xlbmd0aCcpXG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIGtleXNfLnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSB7XG4gICAgLy8gc29ydFxuICAgIGtleXNfLnNvcnQoKVxuICB9XG4gIHJldHVybiBrZXlzX1xufVxuXG5leHBvcnRzLmdldEtleXMgPSBnZXRLZXlzXG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5XG5leHBvcnRzLmlzQXJyYXlMaWtlID0gaXNBcnJheUxpa2VcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdFxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyXG4iLCJpbXBvcnQgTGlzdEl0ZW0gZnJvbSAnLi9MaXN0SXRlbSc7XG5pbXBvcnQgcmVjdXJzaXZlSXRlcmF0b3IgZnJvbSAncmVjdXJzaXZlLWl0ZXJhdG9yJztcbmltcG9ydCBvYmplY3RQYXRoIGZyb20gJ29iamVjdC1wYXRoJztcblxuY2xhc3MgRGF0YUxpc3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJOb2RlcyA9IHRoaXMucmVuZGVyTm9kZXMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zZXRGaWVsZE1hcCA9IHRoaXMuc2V0RmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBzZXRGaWVsZE1hcChwYXRoLCBldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHtbZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGRdOiBwYXRofSk7XG4gICAgfVxuXG4gICAgcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGNoaWxkID0gPExpc3RJdGVtIGtleT17aXRlbS50b1N0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtpdGVtfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdD17ZGF0YVtpdGVtXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGFpbmVyPXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrVGl0bGU9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGVudD17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfS8+O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbaXRlbV0gPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiB0aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgICAgbGV0IGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3IoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IGl0ZW1zIGNvbnRhaW5lcjwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJqc29uLXRyZWVcIj57dGhpcy5yZW5kZXJOb2RlcyhkYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBvYmplY3REYXRhID0gb2JqZWN0UGF0aC5nZXQodGhpcy5wcm9wcy5kYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3Iob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFBhdGguc2V0KG9iamVjdERhdGEsIHBhdGhTdHJpbmcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IHRpdGxlIGFuZCBjb250ZW50IGZpZWxkczwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJqc29uLXRyZWVcIj57dGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRGF0YUxpc3Q7IiwiaW1wb3J0IERhdGFMaXN0IGZyb20gJy4vRGF0YUxpc3QnO1xuaW1wb3J0IGdldEFwaURhdGEgZnJvbSAnLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGEnO1xuXG5jbGFzcyBGaWVsZFNlbGVjdGlvbiBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICAgICAgICBpdGVtczogW11cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnVwZGF0ZUZpZWxkTWFwID0gdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAodmFsdWUpO1xuICAgIH1cblxuICAgIGdldERhdGEoKSB7XG4gICAgICAgIGNvbnN0IHt1cmx9ID0gdGhpcy5wcm9wcztcbiAgICAgICAgZ2V0QXBpRGF0YSh1cmwpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICAoe3Jlc3VsdH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBFcnJvcignQ291bGQgbm90IGZldGNoIGRhdGEgZnJvbSBVUkwuJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe2lzTG9hZGVkOiB0cnVlLCBpdGVtczogcmVzdWx0fSk7XG4gICAgICAgICAgICAgICAgfSwgKHtlcnJvcn0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7aXNMb2FkZWQ6IHRydWUsIGVycm9yfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCB7ZXJyb3IsIGlzTG9hZGVkLCBpdGVtc30gPSB0aGlzLnN0YXRlO1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiA8ZGl2PjxwPkVycm9yOiB7ZXJyb3IubWVzc2FnZX08L3A+PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIj48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gPERhdGFMaXN0XG4gICAgICAgICAgICAgICAgZGF0YT17aXRlbXN9XG4gICAgICAgICAgICAgICAgdXJsPXt0aGlzLnByb3BzLnVybH1cbiAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICB1cGRhdGVGaWVsZE1hcD17dGhpcy51cGRhdGVGaWVsZE1hcH0vPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRmllbGRTZWxlY3Rpb247IiwiZnVuY3Rpb24gSW5wdXRGaWVsZHMocHJvcHMpIHtcbiAgICBjb25zdCB7ZmllbGRNYXAsIHVybH0gPSBwcm9wcztcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX3VybFwiIHZhbHVlPXt1cmx9Lz5cbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiIHZhbHVlPXtKU09OLnN0cmluZ2lmeShmaWVsZE1hcCl9Lz5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgSW5wdXRGaWVsZHM7IiwiZnVuY3Rpb24gTGlzdEl0ZW0ocHJvcHMpIHtcbiAgICBjb25zdCB7dmFsdWUsIGNoaWxkcmVuLCBmaWVsZE1hcCwgb2JqZWN0LCBvbkNsaWNrVGl0bGUsIG9uQ2xpY2tDb250ZW50LCBvbkNsaWNrQ29udGFpbmVyfSA9IHByb3BzO1xuXG4gICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgIHJldHVybiAoPGxpPlxuICAgICAgICAgICAge0FycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsID9cbiAgICAgICAgICAgICAgICA8c3Bhbj48c3BhbiBjbGFzc05hbWU9XCJkYXNoaWNvbnMgZGFzaGljb25zLXBvcnRmb2xpb1wiPjwvc3Bhbj4ge3ZhbHVlfSA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cIml0ZW1Db250YWluZXJcIiBvbkNsaWNrPXtvbkNsaWNrQ29udGFpbmVyfT5TZWxlY3Q8L2E+PC9zcGFuPiA6ICA8c3Bhbj57dmFsdWV9PC9zcGFuPn1cbiAgICAgICAgICAgIDx1bD57Y2hpbGRyZW59PC91bD5cbiAgICAgICAgPC9saT4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoPGxpPlxuICAgICAgICAgICAge2ZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgJiYgZmllbGRNYXAudGl0bGUgPyA8c3Ryb25nPlRpdGxlOiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAgICAgIHtmaWVsZE1hcC5jb250ZW50ID09PSBvYmplY3QgJiYgZmllbGRNYXAuY29udGVudCA/IDxzdHJvbmc+Q29udGVudDogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgICAgICA8c3Bhbj57dmFsdWV9PC9zcGFuPlxuICAgICAgICAgICAgeyFmaWVsZE1hcC50aXRsZSAmJiAoZmllbGRNYXAuY29udGVudCAhPT0gb2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cInRpdGxlXCIgb25DbGljaz17b25DbGlja1RpdGxlfT5UaXRsZTwvYT4gOiAnJ31cbiAgICAgICAgICAgIHshZmllbGRNYXAuY29udGVudCAmJiAoZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJ0cmVlLXNlbGVjdFwiIGRhdGEtZmllbGQ9XCJjb250ZW50XCIgb25DbGljaz17b25DbGlja0NvbnRlbnR9PkNvbnRlbnQ8L2E+IDogJyd9XG4gICAgICAgIDwvbGk+KTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExpc3RJdGVtOyIsImltcG9ydCBGaWVsZFNlbGVjdGlvbiBmcm9tICcuL0ZpZWxkU2VsZWN0aW9uJztcbmltcG9ydCBJbnB1dEZpZWxkcyBmcm9tICcuL0lucHV0RmllbGRzJztcbmltcG9ydCBTdW1tYXJ5IGZyb20gJy4vU3VtbWFyeSc7XG5cbmNsYXNzIFNldHRpbmdzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgICAgIGZpZWxkTWFwOiB7XG4gICAgICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cblxuICAgIGluaXRPcHRpb25zKCkge1xuICAgICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dXJsOiBldmVudC50YXJnZXQudmFsdWV9KTtcbiAgICB9XG5cbiAgICBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7c2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsIHVybDogJycsIGZpZWxkTWFwOiB7aXRlbUNvbnRhaW5lcjogbnVsbCwgdGl0bGU6ICcnLCBjb250ZW50OiAnJ319KTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmllbGRNYXA6IG5ld1ZhbH0pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3Nob3dGaWVsZFNlbGVjdGlvbiwgdXJsfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IHtpdGVtQ29udGFpbmVyLCB0aXRsZSwgY29udGVudH0gPSB0aGlzLnN0YXRlLmZpZWxkTWFwO1xuXG4gICAgICAgIGlmICh1cmwgJiYgaXRlbUNvbnRhaW5lciAhPT0gbnVsbCAmJiB0aXRsZSAmJiBjb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxTdW1tYXJ5IHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKX0gY2xhc3NOYW1lPVwiYnV0dG9uXCI+UmVzZXQgc2V0dGluZ3M8L2E+PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChzaG93RmllbGRTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPEZpZWxkU2VsZWN0aW9uIHVybD17dXJsfSBmaWVsZE1hcD17dGhpcy5zdGF0ZS5maWVsZE1hcH0gdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKX0vPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnN9IGNsYXNzTmFtZT1cImJ1dHRvblwiPlJlc2V0IHNldHRpbmdzPC9hPjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwid3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17dGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+RGF0YSBzb3VyY2U8L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGk+RW50ZXIgYSB2YWxpZCBKU09OIGFwaSB1cmwuPC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3NOYW1lPVwidXJsLWlucHV0XCIgdmFsdWU9e3VybH0gb25DaGFuZ2U9e3RoaXMudXJsQ2hhbmdlLmJpbmQodGhpcyl9Lz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPjxpbnB1dCB0eXBlPVwic3VibWl0XCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIgdmFsdWU9XCJTdWJtaXRcIi8+PC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNldHRpbmdzOyIsImZ1bmN0aW9uIFN1bW1hcnkocHJvcHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgPHN0cm9uZz5EYXRhIHNvdXJjZTwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj17cHJvcHMudXJsfSB0YXJnZXQ9XCJfYmxhbmtcIj57cHJvcHMudXJsfTwvYT5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIDxzdHJvbmc+VGl0bGU8L3N0cm9uZz48YnIvPlxuICAgICAgICAgICAgICAgIHtwcm9wcy5maWVsZE1hcC50aXRsZS5yZXBsYWNlKCcuJywgJyDigJM+ICcpfVxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgPHN0cm9uZz5Db250ZW50PC9zdHJvbmc+PGJyLz5cbiAgICAgICAgICAgICAgICB7cHJvcHMuZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpfVxuICAgICAgICAgICAgPC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBTdW1tYXJ5OyIsImltcG9ydCBTZXR0aW5ncyBmcm9tICcuL0NvbXBvbmVudHMvU2V0dGluZ3MnO1xuXG5jb25zdCBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbmNvbnN0IGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8U2V0dGluZ3MgLz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdChwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnJlbmRlck5vZGVzID0gX3RoaXMucmVuZGVyTm9kZXMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMuc2V0RmllbGRNYXAgPSBfdGhpcy5zZXRGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGlmIChpdGVtID09PSAnb2JqZWN0UGF0aCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBSZWFjdC5jcmVhdGVFbGVtZW50KF9MaXN0SXRlbS5kZWZhdWx0LCB7XG4gICAgICAgICAga2V5OiBpdGVtLnRvU3RyaW5nKCksXG4gICAgICAgICAgdmFsdWU6IGl0ZW0sXG4gICAgICAgICAgb2JqZWN0OiBkYXRhW2l0ZW1dLFxuICAgICAgICAgIGZpZWxkTWFwOiBfdGhpczIucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgb25DbGlja0NvbnRhaW5lcjogZnVuY3Rpb24gb25DbGlja0NvbnRhaW5lcihlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb25DbGlja0NvbnRlbnQ6IGZ1bmN0aW9uIG9uQ2xpY2tDb250ZW50KGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczIuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoX3R5cGVvZihkYXRhW2l0ZW1dKSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvciA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvciA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChkYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcCR2YWx1ZSA9IF9zdGVwLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcCR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpID09PSAnb2JqZWN0JyAmJiBub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvci5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCBpdGVtcyBjb250YWluZXJcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcImpzb24tdHJlZVwiXG4gICAgICAgIH0sIHRoaXMucmVuZGVyTm9kZXMoZGF0YSkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBvYmplY3REYXRhID0gX29iamVjdFBhdGguZGVmYXVsdC5nZXQodGhpcy5wcm9wcy5kYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3REYXRhKSkge1xuICAgICAgICAgIG9iamVjdERhdGEgPSBvYmplY3REYXRhWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yMiA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChvYmplY3REYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwMiR2YWx1ZSA9IF9zdGVwMi52YWx1ZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBfc3RlcDIkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcDIkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcDIkdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgIHBhdGggPSBfc3RlcDIkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHZhciBfcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuXG4gICAgICAgICAgICAgIF9vYmplY3RQYXRoLmRlZmF1bHQuc2V0KG9iamVjdERhdGEsIF9wYXRoU3RyaW5nLCBfcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yMiA9IGVycjtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvcjIucmV0dXJuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCB0aXRsZSBhbmQgY29udGVudCBmaWVsZHNcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcImpzb24tdHJlZVwiXG4gICAgICAgIH0sIHRoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRGF0YUxpc3Q7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IERhdGFMaXN0O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9MaXN0SXRlbVwiOjcsXCJvYmplY3QtcGF0aFwiOjEsXCJyZWN1cnNpdmUtaXRlcmF0b3JcIjoyfV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9EYXRhTGlzdCA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRGF0YUxpc3RcIikpO1xuXG52YXIgX2dldEFwaURhdGEgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRmllbGRTZWxlY3Rpb24gPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKEZpZWxkU2VsZWN0aW9uLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBGaWVsZFNlbGVjdGlvbihwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBGaWVsZFNlbGVjdGlvbik7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihGaWVsZFNlbGVjdGlvbikuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuICAgIF90aGlzLnVwZGF0ZUZpZWxkTWFwID0gX3RoaXMudXBkYXRlRmllbGRNYXAuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKEZpZWxkU2VsZWN0aW9uLCBbe1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImdldERhdGFcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0RGF0YSgpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgdXJsID0gdGhpcy5wcm9wcy51cmw7XG4gICAgICAoMCwgX2dldEFwaURhdGEuZGVmYXVsdCkodXJsKS50aGVuKGZ1bmN0aW9uIChfcmVmKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBfcmVmLnJlc3VsdDtcblxuICAgICAgICBpZiAoIXJlc3VsdCB8fCBPYmplY3Qua2V5cyhyZXN1bHQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgICBlcnJvcjogRXJyb3IoJ0NvdWxkIG5vdCBmZXRjaCBkYXRhIGZyb20gVVJMLicpLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgaXRlbXM6IHJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgIH0sIGZ1bmN0aW9uIChfcmVmMikge1xuICAgICAgICB2YXIgZXJyb3IgPSBfcmVmMi5lcnJvcjtcblxuICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgIGlzTG9hZGVkOiB0cnVlLFxuICAgICAgICAgIGVycm9yOiBlcnJvclxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuZ2V0RGF0YSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBlcnJvciA9IF90aGlzJHN0YXRlLmVycm9yLFxuICAgICAgICAgIGlzTG9hZGVkID0gX3RoaXMkc3RhdGUuaXNMb2FkZWQsXG4gICAgICAgICAgaXRlbXMgPSBfdGhpcyRzdGF0ZS5pdGVtcztcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFwiRXJyb3I6IFwiLCBlcnJvci5tZXNzYWdlKSk7XG4gICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcInNwaW5uZXIgaXMtYWN0aXZlXCJcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChfRGF0YUxpc3QuZGVmYXVsdCwge1xuICAgICAgICAgIGRhdGE6IGl0ZW1zLFxuICAgICAgICAgIHVybDogdGhpcy5wcm9wcy51cmwsXG4gICAgICAgICAgZmllbGRNYXA6IHRoaXMucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIEZpZWxkU2VsZWN0aW9uO1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBGaWVsZFNlbGVjdGlvbjtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCI6MTEsXCIuL0RhdGFMaXN0XCI6NH1dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIElucHV0RmllbGRzKHByb3BzKSB7XG4gIHZhciBmaWVsZE1hcCA9IHByb3BzLmZpZWxkTWFwLFxuICAgICAgdXJsID0gcHJvcHMudXJsO1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgIHR5cGU6IFwiaGlkZGVuXCIsXG4gICAgbmFtZTogXCJtb2RfanNvbl9yZW5kZXJfdXJsXCIsXG4gICAgdmFsdWU6IHVybFxuICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcImhpZGRlblwiLFxuICAgIG5hbWU6IFwibW9kX2pzb25fcmVuZGVyX2ZpZWxkbWFwXCIsXG4gICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KGZpZWxkTWFwKVxuICB9KSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IElucHV0RmllbGRzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIExpc3RJdGVtKHByb3BzKSB7XG4gIHZhciB2YWx1ZSA9IHByb3BzLnZhbHVlLFxuICAgICAgY2hpbGRyZW4gPSBwcm9wcy5jaGlsZHJlbixcbiAgICAgIGZpZWxkTWFwID0gcHJvcHMuZmllbGRNYXAsXG4gICAgICBvYmplY3QgPSBwcm9wcy5vYmplY3QsXG4gICAgICBvbkNsaWNrVGl0bGUgPSBwcm9wcy5vbkNsaWNrVGl0bGUsXG4gICAgICBvbkNsaWNrQ29udGVudCA9IHByb3BzLm9uQ2xpY2tDb250ZW50LFxuICAgICAgb25DbGlja0NvbnRhaW5lciA9IHByb3BzLm9uQ2xpY2tDb250YWluZXI7XG5cbiAgaWYgKGNoaWxkcmVuKSB7XG4gICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgIGNsYXNzTmFtZTogXCJkYXNoaWNvbnMgZGFzaGljb25zLXBvcnRmb2xpb1wiXG4gICAgfSksIFwiIFwiLCB2YWx1ZSwgXCIgXCIsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgY2xhc3NOYW1lOiBcInRyZWUtc2VsZWN0XCIsXG4gICAgICBcImRhdGEtZmllbGRcIjogXCJpdGVtQ29udGFpbmVyXCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGFpbmVyXG4gICAgfSwgXCJTZWxlY3RcIikpIDogUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgY2hpbGRyZW4pKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIG51bGwsIGZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgJiYgZmllbGRNYXAudGl0bGUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiVGl0bGU6IFwiKSA6ICcnLCBmaWVsZE1hcC5jb250ZW50ID09PSBvYmplY3QgJiYgZmllbGRNYXAuY29udGVudCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJDb250ZW50OiBcIikgOiAnJywgUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCAhZmllbGRNYXAudGl0bGUgJiYgZmllbGRNYXAuY29udGVudCAhPT0gb2JqZWN0ICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICBocmVmOiBcIiNcIixcbiAgICAgIGNsYXNzTmFtZTogXCJ0cmVlLXNlbGVjdFwiLFxuICAgICAgXCJkYXRhLWZpZWxkXCI6IFwidGl0bGVcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tUaXRsZVxuICAgIH0sIFwiVGl0bGVcIikgOiAnJywgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcImNvbnRlbnRcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tDb250ZW50XG4gICAgfSwgXCJDb250ZW50XCIpIDogJycpO1xuICB9XG59XG5cbnZhciBfZGVmYXVsdCA9IExpc3RJdGVtO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbnZhciBfRmllbGRTZWxlY3Rpb24gPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0ZpZWxkU2VsZWN0aW9uXCIpKTtcblxudmFyIF9JbnB1dEZpZWxkcyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vSW5wdXRGaWVsZHNcIikpO1xuXG52YXIgX1N1bW1hcnkgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL1N1bW1hcnlcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9XG5cbmZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKGNhbGwgJiYgKF90eXBlb2YoY2FsbCkgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikpIHsgcmV0dXJuIGNhbGw7IH0gcmV0dXJuIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZik7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxudmFyIFNldHRpbmdzID1cbi8qI19fUFVSRV9fKi9cbmZ1bmN0aW9uIChfUmVhY3QkQ29tcG9uZW50KSB7XG4gIF9pbmhlcml0cyhTZXR0aW5ncywgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgZnVuY3Rpb24gU2V0dGluZ3MocHJvcHMpIHtcbiAgICB2YXIgX3RoaXM7XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU2V0dGluZ3MpO1xuXG4gICAgX3RoaXMgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCBfZ2V0UHJvdG90eXBlT2YoU2V0dGluZ3MpLmNhbGwodGhpcywgcHJvcHMpKTtcbiAgICBfdGhpcy5zdGF0ZSA9IHtcbiAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gICAgICB1cmw6ICcnLFxuICAgICAgZmllbGRNYXA6IHtcbiAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFNldHRpbmdzLCBbe1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuaW5pdE9wdGlvbnMoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiaW5pdE9wdGlvbnNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gaW5pdE9wdGlvbnMoKSB7XG4gICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgIHVybDogb3B0aW9ucy51cmwgPyBvcHRpb25zLnVybCA6ICcnLFxuICAgICAgICAgIGZpZWxkTWFwOiBvcHRpb25zLmZpZWxkTWFwID8gSlNPTi5wYXJzZShvcHRpb25zLmZpZWxkTWFwKSA6IHtcbiAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiAhIW9wdGlvbnMudXJsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cmxDaGFuZ2VcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXJsQ2hhbmdlKGV2ZW50KSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgdXJsOiBldmVudC50YXJnZXQudmFsdWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJoYW5kbGVTdWJtaXRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlc2V0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZXNldE9wdGlvbnMoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgZmllbGRNYXA6IHtcbiAgICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwidXBkYXRlRmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgIHZhciBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBmaWVsZE1hcDogbmV3VmFsXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSA9IHRoaXMuc3RhdGUsXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uID0gX3RoaXMkc3RhdGUuc2hvd0ZpZWxkU2VsZWN0aW9uLFxuICAgICAgICAgIHVybCA9IF90aGlzJHN0YXRlLnVybDtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSRmaWVsZE1hcCA9IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgaXRlbUNvbnRhaW5lciA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLml0ZW1Db250YWluZXIsXG4gICAgICAgICAgdGl0bGUgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC50aXRsZSxcbiAgICAgICAgICBjb250ZW50ID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuY29udGVudDtcblxuICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChfU3VtbWFyeS5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucy5iaW5kKHRoaXMpLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCBcIlJlc2V0IHNldHRpbmdzXCIpKSk7XG4gICAgICB9IGVsc2UgaWYgKHNob3dGaWVsZFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9GaWVsZFNlbGVjdGlvbi5kZWZhdWx0LCB7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZmllbGRNYXA6IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKVxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucyxcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uXCJcbiAgICAgICAgfSwgXCJSZXNldCBzZXR0aW5nc1wiKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJ3cmFwXCJcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImZvcm1cIiwge1xuICAgICAgICAgIG9uU3VibWl0OiB0aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKHRoaXMpXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiRGF0YSBzb3VyY2VcIikpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnJcIiwgbnVsbCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIG51bGwsIFwiRW50ZXIgYSB2YWxpZCBKU09OIGFwaSB1cmwuXCIpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICBjbGFzc05hbWU6IFwidXJsLWlucHV0XCIsXG4gICAgICAgICAgdmFsdWU6IHVybCxcbiAgICAgICAgICBvbkNoYW5nZTogdGhpcy51cmxDaGFuZ2UuYmluZCh0aGlzKVxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICAgICAgICB0eXBlOiBcInN1Ym1pdFwiLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b24gYnV0dG9uLXByaW1hcnlcIixcbiAgICAgICAgICB2YWx1ZTogXCJTdWJtaXRcIlxuICAgICAgICB9KSkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIFNldHRpbmdzO1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBTZXR0aW5ncztcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4vRmllbGRTZWxlY3Rpb25cIjo1LFwiLi9JbnB1dEZpZWxkc1wiOjYsXCIuL1N1bW1hcnlcIjo5fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gU3VtbWFyeShwcm9wcykge1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiRGF0YSBzb3VyY2VcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgIGhyZWY6IHByb3BzLnVybCxcbiAgICB0YXJnZXQ6IFwiX2JsYW5rXCJcbiAgfSwgcHJvcHMudXJsKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJUaXRsZVwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBwcm9wcy5maWVsZE1hcC50aXRsZS5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIkNvbnRlbnRcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgcHJvcHMuZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IFN1bW1hcnk7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sMTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfU2V0dGluZ3MgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG52YXIgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcblJlYWN0RE9NLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KF9TZXR0aW5ncy5kZWZhdWx0LCBudWxsKSwgZG9tRWxlbWVudCk7XG5cbn0se1wiLi9Db21wb25lbnRzL1NldHRpbmdzXCI6OH1dLDExOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICByZXR1cm4gZmV0Y2godXJsKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICByZXR1cm4gcmVzLmpzb24oKTtcbiAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgfTtcbiAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yOiBlcnJvclxuICAgIH07XG4gIH0pO1xufVxuXG52YXIgX2RlZmF1bHQgPSBnZXRBcGlEYXRhO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dfSx7fSxbMTBdKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YjJKcVpXTjBMWEJoZEdndmFXNWtaWGd1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12Y21WamRYSnphWFpsTFdsMFpYSmhkRzl5TDNOeVl5OVNaV04xY25OcGRtVkpkR1Z5WVhSdmNpNXFjeUlzSW01dlpHVmZiVzlrZFd4bGN5OXlaV04xY25OcGRtVXRhWFJsY21GMGIzSXZjM0pqTDJ4aGJtY3Vhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5RVlYUmhUR2x6ZEM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMFpwWld4a1UyVnNaV04wYVc5dUxtcHpJaXdpYzI5MWNtTmxMMnB6TDBGa2JXbHVMME52YlhCdmJtVnVkSE12U1c1d2RYUkdhV1ZzWkhNdWFuTWlMQ0p6YjNWeVkyVXZhbk12UVdSdGFXNHZRMjl0Y0c5dVpXNTBjeTlNYVhOMFNYUmxiUzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5RGIyMXdiMjVsYm5SekwxTmxkSFJwYm1kekxtcHpJaXdpYzI5MWNtTmxMMnB6TDBGa2JXbHVMME52YlhCdmJtVnVkSE12VTNWdGJXRnllUzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5SmJtUmxlRUZrYldsdUxtcHpJaXdpYzI5MWNtTmxMMnB6TDFWMGFXeHBkR2xsY3k5blpYUkJjR2xFWVhSaExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOd1UwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU55U1VFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN096czdPenM3T3p0QlF5OUVRVHM3UVVGRFFUczdRVUZEUVRzN096czdPenM3T3pzN096czdPenM3T3pzN096czdPMGxCUlUwc1VUczdPenM3UVVGRFJpeHZRa0ZCV1N4TFFVRmFMRVZCUVcxQ08wRkJRVUU3TzBGQlFVRTdPMEZCUTJZc2EwWkJRVTBzUzBGQlRqdEJRVU5CTEZWQlFVc3NWMEZCVEN4SFFVRnRRaXhOUVVGTExGZEJRVXdzUTBGQmFVSXNTVUZCYWtJc2RVUkJRVzVDTzBGQlEwRXNWVUZCU3l4WFFVRk1MRWRCUVcxQ0xFMUJRVXNzVjBGQlRDeERRVUZwUWl4SlFVRnFRaXgxUkVGQmJrSTdRVUZJWlR0QlFVbHNRanM3T3p0blEwRkZWeXhKTEVWQlFVMHNTeXhGUVVGUE8wRkJRM0pDTEUxQlFVRXNTMEZCU3l4RFFVRkRMR05CUVU0N1FVRkRRU3hYUVVGTExFdEJRVXdzUTBGQlZ5eGpRVUZZTEhGQ1FVRTBRaXhMUVVGTExFTkJRVU1zVFVGQlRpeERRVUZoTEU5QlFXSXNRMEZCY1VJc1MwRkJha1FzUlVGQmVVUXNTVUZCZWtRN1FVRkRTRHM3TzJkRFFVVlhMRWtzUlVGQlRUdEJRVUZCT3p0QlFVTmtMR0ZCUVU4c1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeEpRVUZhTEVWQlFXdENMRWRCUVd4Q0xFTkJRWE5DTEZWQlFVRXNTVUZCU1N4RlFVRkpPMEZCUTJwRExGbEJRVWtzU1VGQlNTeExRVUZMTEZsQlFXSXNSVUZCTWtJN1FVRkRka0k3UVVGRFNEczdRVUZGUkN4WlFVRkpMRXRCUVVzc1IwRkJSeXh2UWtGQlF5eHBRa0ZCUkR0QlFVRlZMRlZCUVVFc1IwRkJSeXhGUVVGRkxFbEJRVWtzUTBGQlF5eFJRVUZNTEVWQlFXWTdRVUZEVlN4VlFVRkJMRXRCUVVzc1JVRkJSU3hKUVVScVFqdEJRVVZWTEZWQlFVRXNUVUZCVFN4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJSblJDTzBGQlIxVXNWVUZCUVN4UlFVRlJMRVZCUVVVc1RVRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFJRVWd2UWp0QlFVbFZMRlZCUVVFc1owSkJRV2RDTEVWQlFVVXNNRUpCUVVFc1EwRkJRenRCUVVGQkxHMUNRVUZKTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NRMEZCVnl4VlFVRTFRaXhGUVVGM1F5eERRVUY0UXl4RFFVRktPMEZCUVVFc1YwRktOMEk3UVVGTFZTeFZRVUZCTEZsQlFWa3NSVUZCUlN4elFrRkJRU3hEUVVGRE8wRkJRVUVzYlVKQlFVa3NUVUZCU1N4RFFVRkRMRmRCUVV3c1EwRkJhVUlzU1VGQlNTeERRVUZETEVsQlFVUXNRMEZCY2tJc1JVRkJOa0lzUTBGQk4wSXNRMEZCU2p0QlFVRkJMRmRCVEhwQ08wRkJUVlVzVlVGQlFTeGpRVUZqTEVWQlFVVXNkMEpCUVVFc1EwRkJRenRCUVVGQkxHMUNRVUZKTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFYSkNMRVZCUVRaQ0xFTkJRVGRDTEVOQlFVbzdRVUZCUVR0QlFVNHpRaXhWUVVGYU96dEJRVkZCTEZsQlFVa3NVVUZCVHl4SlFVRkpMRU5CUVVNc1NVRkJSQ3hEUVVGWUxFMUJRWE5DTEZGQlFYUkNMRWxCUVd0RExFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NTMEZCWlN4SlFVRnlSQ3hGUVVFeVJEdEJRVU4yUkN4VlFVRkJMRXRCUVVzc1IwRkJSeXhMUVVGTExFTkJRVU1zV1VGQlRpeERRVUZ0UWl4TFFVRnVRaXhGUVVFd1FqdEJRVU01UWl4WlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVd4Q0xFbEJRVFJDTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NRMEZCVnl4RFFVRllMRU5CUVdwQ0xFTkJRVFZDTEVkQlFUaEVMRTFCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVhKQ08wRkJSREZETEZkQlFURkNMRU5CUVZJN1FVRkhTRHM3UVVGRlJDeGxRVUZQTEV0QlFWQTdRVUZEU0N4UFFYQkNUU3hEUVVGUU8wRkJjVUpJT3pzN05rSkJSVkU3UVVGRFRDeFZRVUZOTEZGQlFWRXNSMEZCUnl4TFFVRkxMRXRCUVV3c1EwRkJWeXhSUVVFMVFqdEJRVVZCTEZWQlFVa3NTVUZCU1N4SFFVRkhMRXRCUVVzc1MwRkJUQ3hEUVVGWExFbEJRWFJDT3p0QlFVTkJMRlZCUVVrc1MwRkJTeXhEUVVGRExFOUJRVTRzUTBGQll5eEpRVUZrTEVOQlFVb3NSVUZCZVVJN1FVRkRja0lzVVVGQlFTeFJRVUZSTEVOQlFVTXNZVUZCVkN4SFFVRjVRaXhGUVVGNlFqdEJRVU5JT3p0QlFVVkVMRlZCUVVrc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCTDBJc1JVRkJjVU03UVVGRGFrTXNXVUZCU1N4TFFVRkxMRU5CUVVNc1QwRkJUaXhEUVVGakxFbEJRV1FzUTBGQlNpeEZRVUY1UWp0QlFVTnlRaXhWUVVGQkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUkN4RFFVRllPMEZCUTBnN08wRkJTR2RETzBGQlFVRTdRVUZCUVRzN1FVRkJRVHRCUVV0cVF5d3JRa0ZCYzBNc1NVRkJTU3d3UWtGQlNpeERRVUZ6UWl4SlFVRjBRaXhEUVVGMFF5dzRTRUZCYlVVN1FVRkJRVHRCUVVGQkxHZENRVUY2UkN4TlFVRjVSQ3hsUVVGNlJDeE5RVUY1UkR0QlFVRkJMR2RDUVVGcVJDeEpRVUZwUkN4bFFVRnFSQ3hKUVVGcFJEdEJRVUZCTEdkQ1FVRXpReXhIUVVFeVF5eGxRVUV6UXl4SFFVRXlRenRCUVVGQkxHZENRVUYwUXl4SlFVRnpReXhsUVVGMFF5eEpRVUZ6UXpzN1FVRkRMMFFzWjBKQlFVa3NVVUZCVHl4SlFVRlFMRTFCUVdkQ0xGRkJRV2hDTEVsQlFUUkNMRWxCUVVrc1MwRkJTeXhKUVVGNlF5eEZRVUVyUXp0QlFVTXpReXhyUWtGQlNTeFZRVUZWTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVV3c1EwRkJWU3hIUVVGV0xFTkJRV3BDT3p0QlFVTkJMR3REUVVGWExFZEJRVmdzUTBGQlpTeEpRVUZtTEVWQlFYRkNMRlZCUVZVc1IwRkJSeXhoUVVGc1F5eEZRVUZwUkN4VlFVRnFSRHRCUVVOSU8wRkJRMG83UVVGV1owTTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHM3UVVGWmFrTXNaVUZEU1N4cFEwRkRTU3g1UkVGRVNpeEZRVVZKTzBGQlFVa3NWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJaQ3hYUVVFeVFpeExRVUZMTEZkQlFVd3NRMEZCYVVJc1NVRkJha0lzUTBGQk0wSXNRMEZHU2l4RFFVUktPMEZCVFVnc1QwRnNRa1FzVFVGclFrODdRVUZEU0N4WlFVRkpMRlZCUVZVc1IwRkJSeXh2UWtGQlZ5eEhRVUZZTEVOQlFXVXNTMEZCU3l4TFFVRk1MRU5CUVZjc1NVRkJNVUlzUlVGQlowTXNVVUZCVVN4RFFVRkRMR0ZCUVhwRExFTkJRV3BDT3p0QlFVVkJMRmxCUVVrc1MwRkJTeXhEUVVGRExFOUJRVTRzUTBGQll5eFZRVUZrTEVOQlFVb3NSVUZCSzBJN1FVRkRNMElzVlVGQlFTeFZRVUZWTEVkQlFVY3NWVUZCVlN4RFFVRkRMRU5CUVVRc1EwRkJka0k3UVVGRFNEczdRVUZNUlR0QlFVRkJPMEZCUVVFN08wRkJRVUU3UVVGUFNDeG5RMEZCYzBNc1NVRkJTU3d3UWtGQlNpeERRVUZ6UWl4VlFVRjBRaXhEUVVGMFF5eHRTVUZCZVVVN1FVRkJRVHRCUVVGQkxHZENRVUV2UkN4TlFVRXJSQ3huUWtGQkwwUXNUVUZCSzBRN1FVRkJRU3huUWtGQmRrUXNTVUZCZFVRc1owSkJRWFpFTEVsQlFYVkVPMEZCUVVFc1owSkJRV3BFTEVkQlFXbEVMR2RDUVVGcVJDeEhRVUZwUkR0QlFVRkJMR2RDUVVFMVF5eEpRVUUwUXl4blFrRkJOVU1zU1VGQk5FTTdPMEZCUTNKRkxHZENRVUZKTEZGQlFVOHNTVUZCVUN4TlFVRm5RaXhSUVVGd1FpeEZRVUU0UWp0QlFVTXhRaXhyUWtGQlNTeFhRVUZWTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVV3c1EwRkJWU3hIUVVGV0xFTkJRV3BDT3p0QlFVTkJMR3REUVVGWExFZEJRVmdzUTBGQlpTeFZRVUZtTEVWQlFUSkNMRmRCUVROQ0xFVkJRWFZETEZkQlFYWkRPMEZCUTBnN1FVRkRTanRCUVZwRk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdPMEZCWTBnc1pVRkRTU3hwUTBGRFNTeHJSVUZFU2l4RlFVVkpPMEZCUVVrc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlpDeFhRVUV5UWl4TFFVRkxMRmRCUVV3c1EwRkJhVUlzVlVGQmFrSXNRMEZCTTBJc1EwRkdTaXhEUVVSS08wRkJUVWc3UVVGRFNqczdPenRGUVc1R2EwSXNTMEZCU3l4RFFVRkRMRk03TzJWQmMwWmtMRkU3T3pzN096czdPenM3TzBGRE1VWm1PenRCUVVOQk96czdPenM3T3pzN096czdPenM3T3pzN096czdPMGxCUlUwc1l6czdPenM3UVVGRFJpd3dRa0ZCV1N4TFFVRmFMRVZCUVcxQ08wRkJRVUU3TzBGQlFVRTdPMEZCUTJZc2QwWkJRVTBzUzBGQlRqdEJRVU5CTEZWQlFVc3NTMEZCVEN4SFFVRmhPMEZCUTFRc1RVRkJRU3hMUVVGTExFVkJRVVVzU1VGRVJUdEJRVVZVTEUxQlFVRXNVVUZCVVN4RlFVRkZMRXRCUmtRN1FVRkhWQ3hOUVVGQkxFdEJRVXNzUlVGQlJUdEJRVWhGTEV0QlFXSTdRVUZOUVN4VlFVRkxMR05CUVV3c1IwRkJjMElzVFVGQlN5eGpRVUZNTEVOQlFXOUNMRWxCUVhCQ0xIVkVRVUYwUWp0QlFWSmxPMEZCVTJ4Q096czdPMjFEUVVWakxFc3NSVUZCVHp0QlFVTnNRaXhYUVVGTExFdEJRVXdzUTBGQlZ5eGpRVUZZTEVOQlFUQkNMRXRCUVRGQ08wRkJRMGc3T3pzNFFrRkZVenRCUVVGQk96dEJRVUZCTEZWQlEwTXNSMEZFUkN4SFFVTlJMRXRCUVVzc1MwRkVZaXhEUVVORExFZEJSRVE3UVVGRlRpd3JRa0ZCVnl4SFFVRllMRVZCUTBzc1NVRkVUQ3hEUVVWUkxHZENRVUZqTzBGQlFVRXNXVUZCV2l4TlFVRlpMRkZCUVZvc1RVRkJXVHM3UVVGRFZpeFpRVUZKTEVOQlFVTXNUVUZCUkN4SlFVRlhMRTFCUVUwc1EwRkJReXhKUVVGUUxFTkJRVmtzVFVGQldpeEZRVUZ2UWl4TlFVRndRaXhMUVVFclFpeERRVUU1UXl4RlFVRnBSRHRCUVVNM1F5eFZRVUZCTEUxQlFVa3NRMEZCUXl4UlFVRk1MRU5CUVdNN1FVRkRWaXhaUVVGQkxFdEJRVXNzUlVGQlJTeExRVUZMTEVOQlFVTXNaME5CUVVRc1EwRkVSanRCUVVWV0xGbEJRVUVzVVVGQlVTeEZRVUZGTzBGQlJrRXNWMEZCWkRzN1FVRkpRVHRCUVVOSU96dEJRVU5FTEZGQlFVRXNUVUZCU1N4RFFVRkRMRkZCUVV3c1EwRkJZenRCUVVGRExGVkJRVUVzVVVGQlVTeEZRVUZGTEVsQlFWZzdRVUZCYVVJc1ZVRkJRU3hMUVVGTExFVkJRVVU3UVVGQmVFSXNVMEZCWkR0QlFVTklMRTlCV0ZRc1JVRlhWeXhwUWtGQllUdEJRVUZCTEZsQlFWZ3NTMEZCVnl4VFFVRllMRXRCUVZjN08wRkJRMW9zVVVGQlFTeE5RVUZKTEVOQlFVTXNVVUZCVEN4RFFVRmpPMEZCUVVNc1ZVRkJRU3hSUVVGUkxFVkJRVVVzU1VGQldEdEJRVUZwUWl4VlFVRkJMRXRCUVVzc1JVRkJURHRCUVVGcVFpeFRRVUZrTzBGQlEwZ3NUMEZpVkR0QlFXVklPenM3ZDBOQlJXMUNPMEZCUTJoQ0xGZEJRVXNzVDBGQlREdEJRVU5JT3pzN05rSkJSVkU3UVVGQlFTeDNRa0ZETkVJc1MwRkJTeXhMUVVScVF6dEJRVUZCTEZWQlEwVXNTMEZFUml4bFFVTkZMRXRCUkVZN1FVRkJRU3hWUVVOVExGRkJSRlFzWlVGRFV5eFJRVVJVTzBGQlFVRXNWVUZEYlVJc1MwRkVia0lzWlVGRGJVSXNTMEZFYmtJN08wRkJSVXdzVlVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVUN4bFFVRlBMR2xEUVVGTExEQkRRVUZYTEV0QlFVc3NRMEZCUXl4UFFVRnFRaXhEUVVGTUxFTkJRVkE3UVVGRFNDeFBRVVpFTEUxQlJVOHNTVUZCU1N4RFFVRkRMRkZCUVV3c1JVRkJaVHRCUVVOc1FpeGxRVUZQTzBGQlFVc3NWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJaaXhWUVVGUU8wRkJRMGdzVDBGR1RTeE5RVVZCTzBGQlEwZ3NaVUZCVHl4dlFrRkJReXhwUWtGQlJEdEJRVU5JTEZWQlFVRXNTVUZCU1N4RlFVRkZMRXRCUkVnN1FVRkZTQ3hWUVVGQkxFZEJRVWNzUlVGQlJTeExRVUZMTEV0QlFVd3NRMEZCVnl4SFFVWmlPMEZCUjBnc1ZVRkJRU3hSUVVGUkxFVkJRVVVzUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZJYkVJN1FVRkpTQ3hWUVVGQkxHTkJRV01zUlVGQlJTeExRVUZMTzBGQlNteENMRlZCUVZBN1FVRkxTRHRCUVVOS096czdPMFZCY0VSM1FpeExRVUZMTEVOQlFVTXNVenM3WlVGMVJIQkNMR003T3pzN096czdPenM3TzBGRE1VUm1MRk5CUVZNc1YwRkJWQ3hEUVVGeFFpeExRVUZ5UWl4RlFVRTBRanRCUVVGQkxFMUJRMnBDTEZGQlJHbENMRWRCUTBFc1MwRkVRU3hEUVVOcVFpeFJRVVJwUWp0QlFVRkJMRTFCUTFBc1IwRkVUeXhIUVVOQkxFdEJSRUVzUTBGRFVDeEhRVVJQTzBGQlJYaENMRk5CUTBrc2FVTkJRMGs3UVVGQlR5eEpRVUZCTEVsQlFVa3NSVUZCUXl4UlFVRmFPMEZCUVhGQ0xFbEJRVUVzU1VGQlNTeEZRVUZETEhGQ1FVRXhRanRCUVVGblJDeEpRVUZCTEV0QlFVc3NSVUZCUlR0QlFVRjJSQ3hKUVVSS0xFVkJSVWs3UVVGQlR5eEpRVUZCTEVsQlFVa3NSVUZCUXl4UlFVRmFPMEZCUVhGQ0xFbEJRVUVzU1VGQlNTeEZRVUZETERCQ1FVRXhRanRCUVVGeFJDeEpRVUZCTEV0QlFVc3NSVUZCUlN4SlFVRkpMRU5CUVVNc1UwRkJUQ3hEUVVGbExGRkJRV1k3UVVGQk5VUXNTVUZHU2l4RFFVUktPMEZCVFVnN08yVkJSV01zVnpzN096czdPenM3T3pzN1FVTldaaXhUUVVGVExGRkJRVlFzUTBGQmEwSXNTMEZCYkVJc1JVRkJlVUk3UVVGQlFTeE5RVU5rTEV0QlJHTXNSMEZEZFVVc1MwRkVka1VzUTBGRFpDeExRVVJqTzBGQlFVRXNUVUZEVUN4UlFVUlBMRWRCUTNWRkxFdEJSSFpGTEVOQlExQXNVVUZFVHp0QlFVRkJMRTFCUTBjc1VVRkVTQ3hIUVVOMVJTeExRVVIyUlN4RFFVTkhMRkZCUkVnN1FVRkJRU3hOUVVOaExFMUJSR0lzUjBGRGRVVXNTMEZFZGtVc1EwRkRZU3hOUVVSaU8wRkJRVUVzVFVGRGNVSXNXVUZFY2tJc1IwRkRkVVVzUzBGRWRrVXNRMEZEY1VJc1dVRkVja0k3UVVGQlFTeE5RVU50UXl4alFVUnVReXhIUVVOMVJTeExRVVIyUlN4RFFVTnRReXhqUVVSdVF6dEJRVUZCTEUxQlEyMUVMR2RDUVVSdVJDeEhRVU4xUlN4TFFVUjJSU3hEUVVOdFJDeG5Ra0ZFYmtRN08wRkJSM0pDTEUxQlFVa3NVVUZCU2l4RlFVRmpPMEZCUTFZc1YwRkJVU3huUTBGRFNDeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRTFCUVdRc1MwRkJlVUlzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJjRVFzUjBGRFJ5eHJRMEZCVFR0QlFVRk5MRTFCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV2hDTEUxQlFVNHNUMEZCSzBRc1MwRkJMMFFzVDBGQmMwVTdRVUZCUnl4TlFVRkJMRWxCUVVrc1JVRkJReXhIUVVGU08wRkJRVmtzVFVGQlFTeFRRVUZUTEVWQlFVTXNZVUZCZEVJN1FVRkJiME1zYjBKQlFWY3NaVUZCTDBNN1FVRkJLMFFzVFVGQlFTeFBRVUZQTEVWQlFVVTdRVUZCZUVVc1owSkJRWFJGTEVOQlJFZ3NSMEZEZDB3c2EwTkJRVThzUzBGQlVDeERRVVp5VEN4RlFVZEtMR2REUVVGTExGRkJRVXdzUTBGSVNTeERRVUZTTzBGQlMwZ3NSMEZPUkN4TlFVMVBPMEZCUTBnc1YwRkJVU3huUTBGRFNDeFJRVUZSTEVOQlFVTXNTMEZCVkN4TFFVRnRRaXhOUVVGdVFpeEpRVUUyUWl4UlFVRlJMRU5CUVVNc1MwRkJkRU1zUjBGQk9FTXNPRU5CUVRsRExFZEJRWGxGTEVWQlJIUkZMRVZCUlVnc1VVRkJVU3hEUVVGRExFOUJRVlFzUzBGQmNVSXNUVUZCY2tJc1NVRkJLMElzVVVGQlVTeERRVUZETEU5QlFYaERMRWRCUVd0RUxHZEVRVUZzUkN4SFFVRXJSU3hGUVVZMVJTeEZRVWRLTEd0RFFVRlBMRXRCUVZBc1EwRklTU3hGUVVsSUxFTkJRVU1zVVVGQlVTeERRVUZETEV0QlFWWXNTVUZCYjBJc1VVRkJVU3hEUVVGRExFOUJRVlFzUzBGQmNVSXNUVUZCZWtNc1NVRkJiMFFzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJMMFVzUjBGRFJ6dEJRVUZITEUxQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hOUVVGQkxGTkJRVk1zUlVGQlF5eGhRVUYwUWp0QlFVRnZReXh2UWtGQlZ5eFBRVUV2UXp0QlFVRjFSQ3hOUVVGQkxFOUJRVThzUlVGQlJUdEJRVUZvUlN4bFFVUklMRWRCUXpaR0xFVkJUREZHTEVWQlRVZ3NRMEZCUXl4UlFVRlJMRU5CUVVNc1QwRkJWaXhKUVVGelFpeFJRVUZSTEVOQlFVTXNTMEZCVkN4TFFVRnRRaXhOUVVGNlF5eEpRVUZ2UkN4UlFVRlJMRU5CUVVNc1lVRkJWQ3hMUVVFeVFpeEpRVUV2UlN4SFFVTkhPMEZCUVVjc1RVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEUxQlFVRXNVMEZCVXl4RlFVRkRMR0ZCUVhSQ08wRkJRVzlETEc5Q1FVRlhMRk5CUVM5RE8wRkJRWGxFTEUxQlFVRXNUMEZCVHl4RlFVRkZPMEZCUVd4RkxHbENRVVJJTEVkQlEyMUhMRVZCVUdoSExFTkJRVkk3UVVGVFNEdEJRVU5LT3p0bFFVVmpMRkU3T3pzN096czdPenM3TzBGRGRFSm1PenRCUVVOQk96dEJRVU5CT3pzN096czdPenM3T3pzN096czdPenM3T3pzN08wbEJSVTBzVVRzN096czdRVUZEUml4dlFrRkJXU3hMUVVGYUxFVkJRVzFDTzBGQlFVRTdPMEZCUVVFN08wRkJRMllzYTBaQlFVMHNTMEZCVGp0QlFVTkJMRlZCUVVzc1MwRkJUQ3hIUVVGaE8wRkJRMVFzVFVGQlFTeHJRa0ZCYTBJc1JVRkJSU3hMUVVSWU8wRkJSVlFzVFVGQlFTeEhRVUZITEVWQlFVVXNSVUZHU1R0QlFVZFVMRTFCUVVFc1VVRkJVU3hGUVVGRk8wRkJRMDRzVVVGQlFTeGhRVUZoTEVWQlFVVXNTVUZFVkR0QlFVVk9MRkZCUVVFc1MwRkJTeXhGUVVGRkxFVkJSa1E3UVVGSFRpeFJRVUZCTEU5QlFVOHNSVUZCUlR0QlFVaElPMEZCU0VRc1MwRkJZanRCUVVabE8wRkJWMnhDT3pzN08zZERRVVZ0UWp0QlFVTm9RaXhYUVVGTExGZEJRVXc3UVVGRFNEczdPMnREUVVWaE8wRkJRMVlzVlVGQlNTeFBRVUZQTEdGQlFXRXNRMEZCUXl4UFFVRnlRaXhMUVVGcFF5eFhRVUZ5UXl4RlFVRnJSRHRCUVVNNVF5eFpRVUZOTEU5QlFVOHNSMEZCUnl4aFFVRmhMRU5CUVVNc1QwRkJPVUk3UVVGRFFTeGhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVTldMRlZCUVVFc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eEhRVUZTTEVkQlFXTXNUMEZCVHl4RFFVRkRMRWRCUVhSQ0xFZEJRVFJDTEVWQlJIWkNPMEZCUlZZc1ZVRkJRU3hSUVVGUkxFVkJRVVVzVDBGQlR5eERRVUZETEZGQlFWSXNSMEZCYlVJc1NVRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFBRVUZQTEVOQlFVTXNVVUZCYmtJc1EwRkJia0lzUjBGQmEwUTdRVUZEZUVRc1dVRkJRU3hoUVVGaExFVkJRVVVzU1VGRWVVTTdRVUZGZUVRc1dVRkJRU3hMUVVGTExFVkJRVVVzUlVGR2FVUTdRVUZIZUVRc1dVRkJRU3hQUVVGUExFVkJRVVU3UVVGSUswTXNWMEZHYkVRN1FVRlBWaXhWUVVGQkxHdENRVUZyUWl4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU03UVVGUWNFSXNVMEZCWkR0QlFWTklPMEZCUTBvN096czRRa0ZGVXl4TExFVkJRVTg3UVVGRFlpeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc1IwRkJSeXhGUVVGRkxFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRTdRVUZCYmtJc1QwRkJaRHRCUVVOSU96czdhVU5CUlZrc1N5eEZRVUZQTzBGQlEyaENMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc2EwSkJRV3RDTEVWQlFVVTdRVUZCY2tJc1QwRkJaRHRCUVVOSU96czdhVU5CUlZrc1N5eEZRVUZQTzBGQlEyaENMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc2EwSkJRV3RDTEVWQlFVVXNTMEZCY2tJN1FVRkJORUlzVVVGQlFTeEhRVUZITEVWQlFVVXNSVUZCYWtNN1FVRkJjVU1zVVVGQlFTeFJRVUZSTEVWQlFVVTdRVUZCUXl4VlFVRkJMR0ZCUVdFc1JVRkJSU3hKUVVGb1FqdEJRVUZ6UWl4VlFVRkJMRXRCUVVzc1JVRkJSU3hGUVVFM1FqdEJRVUZwUXl4VlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVFeFF6dEJRVUV2UXl4UFFVRmtPMEZCUTBnN096dHRRMEZGWXl4TExFVkJRVTg3UVVGRGJFSXNWVUZCVFN4TlFVRk5MRWRCUVVjc1RVRkJUU3hEUVVGRExFMUJRVkFzUTBGQll5eExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVRjZRaXhGUVVGdFF5eExRVUZ1UXl4RFFVRm1PMEZCUTBFc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEZGQlFWRXNSVUZCUlR0QlFVRllMRTlCUVdRN1FVRkRTRHM3T3paQ1FVVlJPMEZCUVVFc2QwSkJRelpDTEV0QlFVc3NTMEZFYkVNN1FVRkJRU3hWUVVORkxHdENRVVJHTEdWQlEwVXNhMEpCUkVZN1FVRkJRU3hWUVVOelFpeEhRVVIwUWl4bFFVTnpRaXhIUVVSMFFqdEJRVUZCTEdsRFFVVnRReXhMUVVGTExFdEJRVXdzUTBGQlZ5eFJRVVk1UXp0QlFVRkJMRlZCUlVVc1lVRkdSaXgzUWtGRlJTeGhRVVpHTzBGQlFVRXNWVUZGYVVJc1MwRkdha0lzZDBKQlJXbENMRXRCUm1wQ08wRkJRVUVzVlVGRmQwSXNUMEZHZUVJc2QwSkJSWGRDTEU5QlJuaENPenRCUVVsTUxGVkJRVWtzUjBGQlJ5eEpRVUZKTEdGQlFXRXNTMEZCU3l4SlFVRjZRaXhKUVVGcFF5eExRVUZxUXl4SlFVRXdReXhQUVVFNVF5eEZRVUYxUkR0QlFVTnVSQ3hsUVVOSkxHbERRVU5KTEc5Q1FVRkRMR2RDUVVGRUxFVkJRV0VzUzBGQlN5eExRVUZzUWl4RFFVUktMRVZCUlVrc2IwSkJRVU1zYjBKQlFVUXNSVUZCYVVJc1MwRkJTeXhMUVVGMFFpeERRVVpLTEVWQlIwa3NLMEpCUVVjN1FVRkJSeXhWUVVGQkxFbEJRVWtzUlVGQlF5eEhRVUZTTzBGQlFWa3NWVUZCUVN4UFFVRlBMRVZCUVVVc1MwRkJTeXhaUVVGTUxFTkJRV3RDTEVsQlFXeENMRU5CUVhWQ0xFbEJRWFpDTEVOQlFYSkNPMEZCUVcxRUxGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFUZEVMRFJDUVVGSUxFTkJTRW9zUTBGRVNqdEJRVTlJTEU5QlVrUXNUVUZSVHl4SlFVRkpMR3RDUVVGS0xFVkJRWGRDTzBGQlF6TkNMR1ZCUTBrc2FVTkJRMGtzYjBKQlFVTXNkVUpCUVVRN1FVRkJaMElzVlVGQlFTeEhRVUZITEVWQlFVVXNSMEZCY2tJN1FVRkJNRUlzVlVGQlFTeFJRVUZSTEVWQlFVVXNTMEZCU3l4TFFVRk1MRU5CUVZjc1VVRkJMME03UVVGQmVVUXNWVUZCUVN4alFVRmpMRVZCUVVVc1MwRkJTeXhqUVVGTUxFTkJRVzlDTEVsQlFYQkNMRU5CUVhsQ0xFbEJRWHBDTzBGQlFYcEZMRlZCUkVvc1JVRkZTU3h2UWtGQlF5eHZRa0ZCUkN4RlFVRnBRaXhMUVVGTExFdEJRWFJDTEVOQlJrb3NSVUZIU1N3clFrRkJSenRCUVVGSExGVkJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4VlFVRkJMRTlCUVU4c1JVRkJSU3hMUVVGTExGbEJRVEZDTzBGQlFYZERMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV3hFTERSQ1FVRklMRU5CU0Vvc1EwRkVTanRCUVU5SUxFOUJVazBzVFVGUlFUdEJRVU5JTEdWQlEwazdRVUZCU3l4VlFVRkJMRk5CUVZNc1JVRkJRenRCUVVGbUxGZEJRMGs3UVVGQlRTeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRmxCUVV3c1EwRkJhMElzU1VGQmJFSXNRMEZCZFVJc1NVRkJka0k3UVVGQmFFSXNWMEZEU1N3clFrRkRTU3h0UTBGRFNTeHJSRUZFU2l4RFFVUktMRVZCU1Vrc0swSkJTa29zUlVGTFNTdzJSRUZNU2l4RFFVUktMRVZCVVVrN1FVRkJUeXhWUVVGQkxFbEJRVWtzUlVGQlF5eE5RVUZhTzBGQlFXMUNMRlZCUVVFc1UwRkJVeXhGUVVGRExGZEJRVGRDTzBGQlFYbERMRlZCUVVFc1MwRkJTeXhGUVVGRkxFZEJRV2hFTzBGQlFYRkVMRlZCUVVFc1VVRkJVU3hGUVVGRkxFdEJRVXNzVTBGQlRDeERRVUZsTEVsQlFXWXNRMEZCYjBJc1NVRkJjRUk3UVVGQkwwUXNWVUZTU2l4RlFWTkpMQ3RDUVVGSE8wRkJRVThzVlVGQlFTeEpRVUZKTEVWQlFVTXNVVUZCV2p0QlFVRnhRaXhWUVVGQkxGTkJRVk1zUlVGQlF5eDFRa0ZCTDBJN1FVRkJkVVFzVlVGQlFTeExRVUZMTEVWQlFVTTdRVUZCTjBRc1ZVRkJTQ3hEUVZSS0xFTkJSRW9zUlVGWlNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CV2tvc1EwRkVTanRCUVdkQ1NEdEJRVU5LT3pzN08wVkJNVVpyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUUyUm1Rc1VUczdPenM3T3pzN096czdRVU5xUjJZc1UwRkJVeXhQUVVGVUxFTkJRV2xDTEV0QlFXcENMRVZCUVhkQ08wRkJRM0JDTEZOQlEwa3NhVU5CUTBrc0swSkJRMGtzYTBSQlJFb3NSVUZEWjBNc0swSkJSR2hETEVWQlJVazdRVUZCUnl4SlFVRkJMRWxCUVVrc1JVRkJSU3hMUVVGTExFTkJRVU1zUjBGQlpqdEJRVUZ2UWl4SlFVRkJMRTFCUVUwc1JVRkJRenRCUVVFelFpeExRVUZ4UXl4TFFVRkxMRU5CUVVNc1IwRkJNME1zUTBGR1NpeERRVVJLTEVWQlMwa3NLMEpCUTBrc05FTkJSRW9zUlVGRE1FSXNLMEpCUkRGQ0xFVkJSVXNzUzBGQlN5eERRVUZETEZGQlFVNHNRMEZCWlN4TFFVRm1MRU5CUVhGQ0xFOUJRWEpDTEVOQlFUWkNMRWRCUVRkQ0xFVkJRV3RETEUxQlFXeERMRU5CUmt3c1EwRk1TaXhGUVZOSkxDdENRVU5KTERoRFFVUktMRVZCUXpSQ0xDdENRVVExUWl4RlFVVkxMRXRCUVVzc1EwRkJReXhSUVVGT0xFTkJRV1VzVDBGQlppeERRVUYxUWl4UFFVRjJRaXhEUVVFclFpeEhRVUV2UWl4RlFVRnZReXhOUVVGd1F5eERRVVpNTEVOQlZFb3NRMEZFU2p0QlFXZENTRHM3WlVGRll5eFBPenM3T3pzN1FVTnVRbVk3T3pzN1FVRkZRU3hKUVVGTkxHOUNRVUZ2UWl4SFFVRkhMSGRDUVVFM1FqdEJRVU5CTEVsQlFVMHNWVUZCVlN4SFFVRkhMRkZCUVZFc1EwRkJReXhqUVVGVUxFTkJRWGRDTEc5Q1FVRjRRaXhEUVVGdVFqdEJRVVZCTEZGQlFWRXNRMEZCUXl4TlFVRlVMRU5CUTBrc2IwSkJRVU1zYVVKQlFVUXNUMEZFU2l4RlFVVkpMRlZCUmtvN096czdPenM3T3pzN1FVTk1RU3hUUVVGVExGVkJRVlFzUTBGQmIwSXNSMEZCY0VJc1JVRkJlVUk3UVVGRGNrSXNVMEZCVHl4TFFVRkxMRU5CUVVNc1IwRkJSQ3hEUVVGTUxFTkJRMFlzU1VGRVJTeERRVU5ITEZWQlFVRXNSMEZCUnp0QlFVRkJMRmRCUVVrc1IwRkJSeXhEUVVGRExFbEJRVW9zUlVGQlNqdEJRVUZCTEVkQlJFNHNSVUZGUml4SlFVWkZMRU5CUjBNc1ZVRkJReXhOUVVGRU8wRkJRVUVzVjBGQllUdEJRVUZETEUxQlFVRXNUVUZCVFN4RlFVRk9PMEZCUVVRc1MwRkJZanRCUVVGQkxFZEJTRVFzUlVGSlF5eFZRVUZETEV0QlFVUTdRVUZCUVN4WFFVRlpPMEZCUVVNc1RVRkJRU3hMUVVGTExFVkJRVXc3UVVGQlJDeExRVUZhTzBGQlFVRXNSMEZLUkN4RFFVRlFPMEZCVFVnN08yVkJSV01zVlNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWlobWRXNWpkR2x2YmlBb2NtOXZkQ3dnWm1GamRHOXllU2w3WEc0Z0lDZDFjMlVnYzNSeWFXTjBKenRjYmx4dUlDQXZLbWx6ZEdGdVluVnNJR2xuYm05eVpTQnVaWGgwT21OaGJuUWdkR1Z6ZENvdlhHNGdJR2xtSUNoMGVYQmxiMllnYlc5a2RXeGxJRDA5UFNBbmIySnFaV04wSnlBbUppQjBlWEJsYjJZZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFQwOUlDZHZZbXBsWTNRbktTQjdYRzRnSUNBZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFNCbVlXTjBiM0o1S0NrN1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JR1JsWm1sdVpTQTlQVDBnSjJaMWJtTjBhVzl1SnlBbUppQmtaV1pwYm1VdVlXMWtLU0I3WEc0Z0lDQWdMeThnUVUxRUxpQlNaV2RwYzNSbGNpQmhjeUJoYmlCaGJtOXVlVzF2ZFhNZ2JXOWtkV3hsTGx4dUlDQWdJR1JsWm1sdVpTaGJYU3dnWm1GamRHOXllU2s3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1FuSnZkM05sY2lCbmJHOWlZV3h6WEc0Z0lDQWdjbTl2ZEM1dlltcGxZM1JRWVhSb0lEMGdabUZqZEc5eWVTZ3BPMXh1SUNCOVhHNTlLU2gwYUdsekxDQm1kVzVqZEdsdmJpZ3BlMXh1SUNBbmRYTmxJSE4wY21samRDYzdYRzVjYmlBZ2RtRnlJSFJ2VTNSeUlEMGdUMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp6dGNiaUFnWm5WdVkzUnBiMjRnYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU0I3WEc0Z0lDQWdhV1lvYjJKcUlEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbVlXeHpaVnh1SUNBZ0lIMWNiaUFnSUNBdkwzUnZJR2hoYm1Sc1pTQnZZbXBsWTNSeklIZHBkR2dnYm5Wc2JDQndjbTkwYjNSNWNHVnpJQ2gwYjI4Z1pXUm5aU0JqWVhObFB5bGNiaUFnSUNCeVpYUjFjbTRnVDJKcVpXTjBMbkJ5YjNSdmRIbHdaUzVvWVhOUGQyNVFjbTl3WlhKMGVTNWpZV3hzS0c5aWFpd2djSEp2Y0NsY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpSVzF3ZEhrb2RtRnNkV1VwZTF4dUlDQWdJR2xtSUNnaGRtRnNkV1VwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb2FYTkJjbkpoZVNoMllXeDFaU2tnSmlZZ2RtRnNkV1V1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSFpoYkhWbElDRTlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElHbHVJSFpoYkhWbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hR0Z6VDNkdVVISnZjR1Z5ZEhrb2RtRnNkV1VzSUdrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQjBiMU4wY21sdVp5aDBlWEJsS1h0Y2JpQWdJQ0J5WlhSMWNtNGdkRzlUZEhJdVkyRnNiQ2gwZVhCbEtUdGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR2x6VDJKcVpXTjBLRzlpYWlsN1hHNGdJQ0FnY21WMGRYSnVJSFI1Y0dWdlppQnZZbW9nUFQwOUlDZHZZbXBsWTNRbklDWW1JSFJ2VTNSeWFXNW5LRzlpYWlrZ1BUMDlJRndpVzI5aWFtVmpkQ0JQWW1wbFkzUmRYQ0k3WEc0Z0lIMWNibHh1SUNCMllYSWdhWE5CY25KaGVTQTlJRUZ5Y21GNUxtbHpRWEp5WVhrZ2ZId2dablZ1WTNScGIyNG9iMkpxS1h0Y2JpQWdJQ0F2S21semRHRnVZblZzSUdsbmJtOXlaU0J1WlhoME9tTmhiblFnZEdWemRDb3ZYRzRnSUNBZ2NtVjBkWEp1SUhSdlUzUnlMbU5oYkd3b2IySnFLU0E5UFQwZ0oxdHZZbXBsWTNRZ1FYSnlZWGxkSnp0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpRbTl2YkdWaGJpaHZZbW9wZTF4dUlDQWdJSEpsZEhWeWJpQjBlWEJsYjJZZ2IySnFJRDA5UFNBblltOXZiR1ZoYmljZ2ZId2dkRzlUZEhKcGJtY29iMkpxS1NBOVBUMGdKMXR2WW1wbFkzUWdRbTl2YkdWaGJsMG5PMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWjJWMFMyVjVLR3RsZVNsN1hHNGdJQ0FnZG1GeUlHbHVkRXRsZVNBOUlIQmhjbk5sU1c1MEtHdGxlU2s3WEc0Z0lDQWdhV1lnS0dsdWRFdGxlUzUwYjFOMGNtbHVaeWdwSUQwOVBTQnJaWGtwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYm5STFpYazdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJyWlhrN1hHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQm1ZV04wYjNKNUtHOXdkR2x2Ym5NcElIdGNiaUFnSUNCdmNIUnBiMjV6SUQwZ2IzQjBhVzl1Y3lCOGZDQjdmVnh1WEc0Z0lDQWdkbUZ5SUc5aWFtVmpkRkJoZEdnZ1BTQm1kVzVqZEdsdmJpaHZZbW9wSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJQWW1wbFkzUXVhMlY1Y3lodlltcGxZM1JRWVhSb0tTNXlaV1IxWTJVb1puVnVZM1JwYjI0b2NISnZlSGtzSUhCeWIzQXBJSHRjYmlBZ0lDQWdJQ0FnYVdZb2NISnZjQ0E5UFQwZ0oyTnlaV0YwWlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2ZUhrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0F2S21semRHRnVZblZzSUdsbmJtOXlaU0JsYkhObEtpOWNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ2WW1wbFkzUlFZWFJvVzNCeWIzQmRJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzRnSUNBZ0lDQWdJQ0FnY0hKdmVIbGJjSEp2Y0YwZ1BTQnZZbXBsWTNSUVlYUm9XM0J5YjNCZExtSnBibVFvYjJKcVpXTjBVR0YwYUN3Z2IySnFLVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCd2NtOTRlVHRjYmlBZ0lDQWdJSDBzSUh0OUtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ1puVnVZM1JwYjI0Z2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnY0hKdmNDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlDaHZjSFJwYjI1ekxtbHVZMngxWkdWSmJtaGxjbWwwWldSUWNtOXdjeUI4ZkNBb2RIbHdaVzltSUhCeWIzQWdQVDA5SUNkdWRXMWlaWEluSUNZbUlFRnljbUY1TG1selFYSnlZWGtvYjJKcUtTa2dmSHdnYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU2xjYmlBZ0lDQjlYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQm5aWFJUYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU0I3WEc0Z0lDQWdJQ0JwWmlBb2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnY0hKdmNDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWx0d2NtOXdYVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQnpaWFFvYjJKcUxDQndZWFJvTENCMllXeDFaU3dnWkc5T2IzUlNaWEJzWVdObEtYdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJRnR3WVhSb1hUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2doY0dGMGFDQjhmQ0J3WVhSb0xteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjMlYwS0c5aWFpd2djR0YwYUM1emNHeHBkQ2duTGljcExtMWhjQ2huWlhSTFpYa3BMQ0IyWVd4MVpTd2daRzlPYjNSU1pYQnNZV05sS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFVHRjBhQ0E5SUhCaGRHaGJNRjA3WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZaaGJIVmxJRDBnWjJWMFUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2dZM1Z5Y21WdWRGQmhkR2dwTzF4dUlDQWdJQ0FnYVdZZ0tIQmhkR2d1YkdWdVozUm9JRDA5UFNBeEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoamRYSnlaVzUwVm1Gc2RXVWdQVDA5SUhadmFXUWdNQ0I4ZkNBaFpHOU9iM1JTWlhCc1lXTmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2IySnFXMk4xY25KbGJuUlFZWFJvWFNBOUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCamRYSnlaVzUwVm1Gc2RXVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNoamRYSnlaVzUwVm1Gc2RXVWdQVDA5SUhadmFXUWdNQ2tnZTF4dUlDQWdJQ0FnSUNBdkwyTm9aV05ySUdsbUlIZGxJR0Z6YzNWdFpTQmhiaUJoY25KaGVWeHVJQ0FnSUNBZ0lDQnBaaWgwZVhCbGIyWWdjR0YwYUZzeFhTQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbXBiWTNWeWNtVnVkRkJoZEdoZElEMGdXMTA3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2IySnFXMk4xY25KbGJuUlFZWFJvWFNBOUlIdDlPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6WlhRb2IySnFXMk4xY25KbGJuUlFZWFJvWFN3Z2NHRjBhQzV6YkdsalpTZ3hLU3dnZG1Gc2RXVXNJR1J2VG05MFVtVndiR0ZqWlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1b1lYTWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvS1NCN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQmJjR0YwYUYwN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQndZWFJvSUQwZ2NHRjBhQzV6Y0d4cGRDZ25MaWNwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9JWEJoZEdnZ2ZId2djR0YwYUM1c1pXNW5kR2dnUFQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJQ0VoYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEJoZEdndWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHb2dQU0JuWlhSTFpYa29jR0YwYUZ0cFhTazdYRzVjYmlBZ0lDQWdJQ0FnYVdZb0tIUjVjR1Z2WmlCcUlEMDlQU0FuYm5WdFltVnlKeUFtSmlCcGMwRnljbUY1S0c5aWFpa2dKaVlnYWlBOElHOWlhaTVzWlc1bmRHZ3BJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0tHOXdkR2x2Ym5NdWFXNWpiSFZrWlVsdWFHVnlhWFJsWkZCeWIzQnpJRDhnS0dvZ2FXNGdUMkpxWldOMEtHOWlhaWtwSURvZ2FHRnpUM2R1VUhKdmNHVnlkSGtvYjJKcUxDQnFLU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbW9nUFNCdlltcGJhbDA3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtVnVjM1Z5WlVWNGFYTjBjeUE5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnc0lIWmhiSFZsS1h0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6WlhRb2IySnFMQ0J3WVhSb0xDQjJZV3gxWlN3Z2RISjFaU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1YzJWMElEMGdablZ1WTNScGIyNGdLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJR1J2VG05MFVtVndiR0ZqWlNsN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYzJWMEtHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1YVc1elpYSjBJRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUN3Z2RtRnNkV1VzSUdGMEtYdGNiaUFnSUNBZ0lIWmhjaUJoY25JZ1BTQnZZbXBsWTNSUVlYUm9MbWRsZENodlltb3NJSEJoZEdncE8xeHVJQ0FnSUNBZ1lYUWdQU0IrZm1GME8xeHVJQ0FnSUNBZ2FXWWdLQ0ZwYzBGeWNtRjVLR0Z5Y2lrcElIdGNiaUFnSUNBZ0lDQWdZWEp5SUQwZ1cxMDdYRzRnSUNBZ0lDQWdJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dZWEp5S1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdGeWNpNXpjR3hwWTJVb1lYUXNJREFzSUhaaGJIVmxLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVsYlhCMGVTQTlJR1oxYm1OMGFXOXVLRzlpYWl3Z2NHRjBhQ2tnZTF4dUlDQWdJQ0FnYVdZZ0tHbHpSVzF3ZEhrb2NHRjBhQ2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhadmFXUWdNRHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNodlltb2dQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbTlwWkNBd08xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVXNJR2s3WEc0Z0lDQWdJQ0JwWmlBb0lTaDJZV3gxWlNBOUlHOWlhbVZqZEZCaGRHZ3VaMlYwS0c5aWFpd2djR0YwYUNrcEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjJiMmxrSURBN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdkbUZzZFdVZ1BUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJQ2NuS1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2FYTkNiMjlzWldGdUtIWmhiSFZsS1NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUIyWVd4MVpTQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnTUNrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpRWEp5WVhrb2RtRnNkV1VwS1NCN1hHNGdJQ0FnSUNBZ0lIWmhiSFZsTG14bGJtZDBhQ0E5SURBN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpUMkpxWldOMEtIWmhiSFZsS1NrZ2UxeHVJQ0FnSUNBZ0lDQm1iM0lnS0drZ2FXNGdkbUZzZFdVcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtIWmhiSFZsTENCcEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pHVnNaWFJsSUhaaGJIVmxXMmxkTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z2JuVnNiQ2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1Y0hWemFDQTlJR1oxYm1OMGFXOXVJQ2h2WW1vc0lIQmhkR2dnTHlvc0lIWmhiSFZsY3lBcUx5bDdYRzRnSUNBZ0lDQjJZWElnWVhKeUlEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2IySnFMQ0J3WVhSb0tUdGNiaUFnSUNBZ0lHbG1JQ2doYVhOQmNuSmhlU2hoY25JcEtTQjdYRzRnSUNBZ0lDQWdJR0Z5Y2lBOUlGdGRPMXh1SUNBZ0lDQWdJQ0J2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJR0Z5Y2lrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHRnljaTV3ZFhOb0xtRndjR3g1S0dGeWNpd2dRWEp5WVhrdWNISnZkRzkwZVhCbExuTnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpMQ0F5S1NrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndVkyOWhiR1Z6WTJVZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9jeXdnWkdWbVlYVnNkRlpoYkhWbEtTQjdYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVTdYRzVjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd0xDQnNaVzRnUFNCd1lYUm9jeTVzWlc1bmRHZzdJR2tnUENCc1pXNDdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvS0haaGJIVmxJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9jMXRwWFNrcElDRTlQU0IyYjJsa0lEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnY21WMGRYSnVJR1JsWm1GMWJIUldZV3gxWlR0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1blpYUWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvTENCa1pXWmhkV3gwVm1Gc2RXVXBlMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYm5WdFltVnlKeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnVzNCaGRHaGRPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0NGd1lYUm9JSHg4SUhCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnBaaUFvYjJKcUlEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHUmxabUYxYkhSV1lXeDFaVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwTENCa1pXWmhkV3gwVm1Gc2RXVXBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZCaGRHZ2dQU0JuWlhSTFpYa29jR0YwYUZzd1hTazdYRzRnSUNBZ0lDQjJZWElnYm1WNGRFOWlhaUE5SUdkbGRGTm9ZV3hzYjNkUWNtOXdaWEowZVNodlltb3NJR04xY25KbGJuUlFZWFJvS1Z4dUlDQWdJQ0FnYVdZZ0tHNWxlSFJQWW1vZ1BUMDlJSFp2YVdRZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaR1ZtWVhWc2RGWmhiSFZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9jR0YwYUM1c1pXNW5kR2dnUFQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzVsZUhSUFltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbWRsZENodlltcGJZM1Z5Y21WdWRGQmhkR2hkTENCd1lYUm9Mbk5zYVdObEtERXBMQ0JrWldaaGRXeDBWbUZzZFdVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtUmxiQ0E5SUdaMWJtTjBhVzl1SUdSbGJDaHZZbW9zSUhCaGRHZ3BJSHRjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NHRjBhQ0E5SUZ0d1lYUm9YVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1vN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2hwYzBWdGNIUjVLSEJoZEdncEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmloMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndVpHVnNLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlFZWFJvSUQwZ1oyVjBTMlY1S0hCaGRHaGJNRjBwTzF4dUlDQWdJQ0FnYVdZZ0tDRm9ZWE5UYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCamRYSnlaVzUwVUdGMGFDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWW9jR0YwYUM1c1pXNW5kR2dnUFQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHpRWEp5WVhrb2IySnFLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHOWlhaTV6Y0d4cFkyVW9ZM1Z5Y21WdWRGQmhkR2dzSURFcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJR1JsYkdWMFpTQnZZbXBiWTNWeWNtVnVkRkJoZEdoZE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNWtaV3dvYjJKcVcyTjFjbkpsYm5SUVlYUm9YU3dnY0dGMGFDNXpiR2xqWlNneEtTazdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZzdYRzRnSUgxY2JseHVJQ0IyWVhJZ2JXOWtJRDBnWm1GamRHOXllU2dwTzF4dUlDQnRiMlF1WTNKbFlYUmxJRDBnWm1GamRHOXllVHRjYmlBZ2JXOWtMbmRwZEdoSmJtaGxjbWwwWldSUWNtOXdjeUE5SUdaaFkzUnZjbmtvZTJsdVkyeDFaR1ZKYm1obGNtbDBaV1JRY205d2N6b2dkSEoxWlgwcFhHNGdJSEpsZEhWeWJpQnRiMlE3WEc1OUtUdGNiaUlzSWlkMWMyVWdjM1J5YVdOMEoxeHVYRzVqYjI1emRDQjdhWE5QWW1wbFkzUXNJR2RsZEV0bGVYTjlJRDBnY21WeGRXbHlaU2duTGk5c1lXNW5KeWxjYmx4dUx5OGdVRkpKVmtGVVJTQlFVazlRUlZKVVNVVlRYRzVqYjI1emRDQkNXVkJCVTFOZlRVOUVSU0E5SUNkZlgySjVjR0Z6YzAxdlpHVW5YRzVqYjI1emRDQkpSMDVQVWtWZlEwbFNRMVZNUVZJZ1BTQW5YMTlwWjI1dmNtVkRhWEpqZFd4aGNpZGNibU52Ym5OMElFMUJXRjlFUlVWUUlEMGdKMTlmYldGNFJHVmxjQ2RjYm1OdmJuTjBJRU5CUTBoRklEMGdKMTlmWTJGamFHVW5YRzVqYjI1emRDQlJWVVZWUlNBOUlDZGZYM0YxWlhWbEoxeHVZMjl1YzNRZ1UxUkJWRVVnUFNBblgxOXpkR0YwWlNkY2JseHVZMjl1YzNRZ1JVMVFWRmxmVTFSQlZFVWdQU0I3ZlZ4dVhHNWpiR0Z6Y3lCU1pXTjFjbk5wZG1WSmRHVnlZWFJ2Y2lCN1hHNGdJQzhxS2x4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeEJjbkpoZVgwZ2NtOXZkRnh1SUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ1cySjVjR0Z6YzAxdlpHVTlNRjFjYmlBZ0lDb2dRSEJoY21GdElIdENiMjlzWldGdWZTQmJhV2R1YjNKbFEybHlZM1ZzWVhJOVptRnNjMlZkWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmJiV0Y0UkdWbGNEMHhNREJkWEc0Z0lDQXFMMXh1SUNCamIyNXpkSEoxWTNSdmNpQW9jbTl2ZEN3Z1lubHdZWE56VFc5a1pTQTlJREFzSUdsbmJtOXlaVU5wY21OMWJHRnlJRDBnWm1Gc2MyVXNJRzFoZUVSbFpYQWdQU0F4TURBcElIdGNiaUFnSUNCMGFHbHpXMEpaVUVGVFUxOU5UMFJGWFNBOUlHSjVjR0Z6YzAxdlpHVmNiaUFnSUNCMGFHbHpXMGxIVGs5U1JWOURTVkpEVlV4QlVsMGdQU0JwWjI1dmNtVkRhWEpqZFd4aGNseHVJQ0FnSUhSb2FYTmJUVUZZWDBSRlJWQmRJRDBnYldGNFJHVmxjRnh1SUNBZ0lIUm9hWE5iUTBGRFNFVmRJRDBnVzExY2JpQWdJQ0IwYUdselcxRlZSVlZGWFNBOUlGdGRYRzRnSUNBZ2RHaHBjMXRUVkVGVVJWMGdQU0IwYUdsekxtZGxkRk4wWVhSbEtIVnVaR1ZtYVc1bFpDd2djbTl2ZENsY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwOWlhbVZqZEgxY2JpQWdJQ292WEc0Z0lHNWxlSFFnS0NrZ2UxeHVJQ0FnSUdOdmJuTjBJSHR1YjJSbExDQndZWFJvTENCa1pXVndmU0E5SUhSb2FYTmJVMVJCVkVWZElIeDhJRVZOVUZSWlgxTlVRVlJGWEc1Y2JpQWdJQ0JwWmlBb2RHaHBjMXROUVZoZlJFVkZVRjBnUGlCa1pXVndLU0I3WEc0Z0lDQWdJQ0JwWmlBb2RHaHBjeTVwYzA1dlpHVW9ibTlrWlNrcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSb2FYTXVhWE5EYVhKamRXeGhjaWh1YjJSbEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaDBhR2x6VzBsSFRrOVNSVjlEU1ZKRFZVeEJVbDBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhOcmFYQmNiaUFnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkRGFYSmpkV3hoY2lCeVpXWmxjbVZ1WTJVbktWeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9kR2hwY3k1dmJsTjBaWEJKYm5SdktIUm9hWE5iVTFSQlZFVmRLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1YzNRZ1pHVnpZM0pwY0hSdmNuTWdQU0IwYUdsekxtZGxkRk4wWVhSbGMwOW1RMmhwYkdST2IyUmxjeWh1YjJSbExDQndZWFJvTENCa1pXVndLVnh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXVjM1FnYldWMGFHOWtJRDBnZEdocGMxdENXVkJCVTFOZlRVOUVSVjBnUHlBbmNIVnphQ2NnT2lBbmRXNXphR2xtZENkY2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhOYlVWVkZWVVZkVzIxbGRHaHZaRjBvTGk0dVpHVnpZM0pwY0hSdmNuTXBYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpXME5CUTBoRlhTNXdkWE5vS0c1dlpHVXBYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWTI5dWMzUWdkbUZzZFdVZ1BTQjBhR2x6VzFGVlJWVkZYUzV6YUdsbWRDZ3BYRzRnSUNBZ1kyOXVjM1FnWkc5dVpTQTlJQ0YyWVd4MVpWeHVYRzRnSUNBZ2RHaHBjMXRUVkVGVVJWMGdQU0IyWVd4MVpWeHVYRzRnSUNBZ2FXWWdLR1J2Ym1VcElIUm9hWE11WkdWemRISnZlU2dwWEc1Y2JpQWdJQ0J5WlhSMWNtNGdlM1poYkhWbExDQmtiMjVsZlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2x4dUlDQWdLaTljYmlBZ1pHVnpkSEp2ZVNBb0tTQjdYRzRnSUNBZ2RHaHBjMXRSVlVWVlJWMHViR1Z1WjNSb0lEMGdNRnh1SUNBZ0lIUm9hWE5iUTBGRFNFVmRMbXhsYm1kMGFDQTlJREJjYmlBZ0lDQjBhR2x6VzFOVVFWUkZYU0E5SUc1MWJHeGNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQXFMMXh1SUNCcGMwNXZaR1VnS0dGdWVTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCcGMwOWlhbVZqZENoaGJua3BYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdLaTljYmlBZ2FYTk1aV0ZtSUNoaGJua3BJSHRjYmlBZ0lDQnlaWFIxY200Z0lYUm9hWE11YVhOT2IyUmxLR0Z1ZVNsY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBcUwxeHVJQ0JwYzBOcGNtTjFiR0Z5SUNoaGJua3BJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjMXREUVVOSVJWMHVhVzVrWlhoUFppaGhibmtwSUNFOVBTQXRNVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJTWlhSMWNtNXpJSE4wWVhSbGN5QnZaaUJqYUdsc1pDQnViMlJsYzF4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdibTlrWlZ4dUlDQWdLaUJBY0dGeVlXMGdlMEZ5Y21GNWZTQndZWFJvWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmtaV1Z3WEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRCY25KaGVUeFBZbXBsWTNRK2ZWeHVJQ0FnS2k5Y2JpQWdaMlYwVTNSaGRHVnpUMlpEYUdsc1pFNXZaR1Z6SUNodWIyUmxMQ0J3WVhSb0xDQmtaV1Z3S1NCN1hHNGdJQ0FnY21WMGRYSnVJR2RsZEV0bGVYTW9ibTlrWlNrdWJXRndLR3RsZVNBOVBseHVJQ0FnSUNBZ2RHaHBjeTVuWlhSVGRHRjBaU2h1YjJSbExDQnViMlJsVzJ0bGVWMHNJR3RsZVN3Z2NHRjBhQzVqYjI1allYUW9hMlY1S1N3Z1pHVmxjQ0FySURFcFhHNGdJQ0FnS1Z4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCU1pYUjFjbTV6SUhOMFlYUmxJRzltSUc1dlpHVXVJRU5oYkd4eklHWnZjaUJsWVdOb0lHNXZaR1ZjYmlBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlGdHdZWEpsYm5SZFhHNGdJQ0FxSUVCd1lYSmhiU0I3S24wZ1cyNXZaR1ZkWEc0Z0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmJhMlY1WFZ4dUlDQWdLaUJBY0dGeVlXMGdlMEZ5Y21GNWZTQmJjR0YwYUYxY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJRnRrWldWd1hWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1QySnFaV04wZlZ4dUlDQWdLaTljYmlBZ1oyVjBVM1JoZEdVZ0tIQmhjbVZ1ZEN3Z2JtOWtaU3dnYTJWNUxDQndZWFJvSUQwZ1cxMHNJR1JsWlhBZ1BTQXdLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIdHdZWEpsYm5Rc0lHNXZaR1VzSUd0bGVTd2djR0YwYUN3Z1pHVmxjSDFjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUTJGc2JHSmhZMnRjYmlBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlITjBZWFJsWEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0tpOWNiaUFnYjI1VGRHVndTVzUwYnlBb2MzUmhkR1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkSEoxWlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1VtVmpkWEp6YVhabFNYUmxjbUYwYjNKOVhHNGdJQ0FxTDF4dUlDQmJVM2x0WW05c0xtbDBaWEpoZEc5eVhTQW9LU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE5jYmlBZ2ZWeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZKbFkzVnljMmwyWlVsMFpYSmhkRzl5WEc0aUxDSW5kWE5sSUhOMGNtbGpkQ2RjYmk4cUtseHVJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDb3ZYRzVtZFc1amRHbHZiaUJwYzA5aWFtVmpkQ0FvWVc1NUtTQjdYRzRnSUhKbGRIVnliaUJoYm5rZ0lUMDlJRzUxYkd3Z0ppWWdkSGx3Wlc5bUlHRnVlU0E5UFQwZ0oyOWlhbVZqZENkY2JuMWNiaThxS2x4dUlDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNvdlhHNWpiMjV6ZENCN2FYTkJjbkpoZVgwZ1BTQkJjbkpoZVZ4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselFYSnlZWGxNYVd0bElDaGhibmtwSUh0Y2JpQWdhV1lnS0NGcGMwOWlhbVZqZENoaGJua3BLU0J5WlhSMWNtNGdabUZzYzJWY2JpQWdhV1lnS0NFb0oyeGxibWQwYUNjZ2FXNGdZVzU1S1NrZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUdOdmJuTjBJR3hsYm1kMGFDQTlJR0Z1ZVM1c1pXNW5kR2hjYmlBZ2FXWWdLQ0ZwYzA1MWJXSmxjaWhzWlc1bmRHZ3BLU0J5WlhSMWNtNGdabUZzYzJWY2JpQWdhV1lnS0d4bGJtZDBhQ0ErSURBcElIdGNiaUFnSUNCeVpYUjFjbTRnS0d4bGJtZDBhQ0F0SURFcElHbHVJR0Z1ZVZ4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUdadmNpQW9ZMjl1YzNRZ2EyVjVJR2x1SUdGdWVTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sWEc0Z0lDQWdmVnh1SUNCOVhHNTlYRzR2S2lwY2JpQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBcUwxeHVablZ1WTNScGIyNGdhWE5PZFcxaVpYSWdLR0Z1ZVNrZ2UxeHVJQ0J5WlhSMWNtNGdkSGx3Wlc5bUlHRnVlU0E5UFQwZ0oyNTFiV0psY2lkY2JuMWNiaThxS2x4dUlDb2dRSEJoY21GdElIdFBZbXBsWTNSOFFYSnlZWGw5SUc5aWFtVmpkRnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwRnljbUY1UEZOMGNtbHVaejU5WEc0Z0tpOWNibVoxYm1OMGFXOXVJR2RsZEV0bGVYTWdLRzlpYW1WamRDa2dlMXh1SUNCamIyNXpkQ0JyWlhselh5QTlJRTlpYW1WamRDNXJaWGx6S0c5aWFtVmpkQ2xjYmlBZ2FXWWdLR2x6UVhKeVlYa29iMkpxWldOMEtTa2dlMXh1SUNBZ0lDOHZJSE5yYVhBZ2MyOXlkRnh1SUNCOUlHVnNjMlVnYVdZZ0tHbHpRWEp5WVhsTWFXdGxLRzlpYW1WamRDa3BJSHRjYmlBZ0lDQmpiMjV6ZENCcGJtUmxlQ0E5SUd0bGVYTmZMbWx1WkdWNFQyWW9KMnhsYm1kMGFDY3BYRzRnSUNBZ2FXWWdLR2x1WkdWNElENGdMVEVwSUh0Y2JpQWdJQ0FnSUd0bGVYTmZMbk53YkdsalpTaHBibVJsZUN3Z01TbGNiaUFnSUNCOVhHNGdJQ0FnTHk4Z2MydHBjQ0J6YjNKMFhHNGdJSDBnWld4elpTQjdYRzRnSUNBZ0x5OGdjMjl5ZEZ4dUlDQWdJR3RsZVhOZkxuTnZjblFvS1Z4dUlDQjlYRzRnSUhKbGRIVnliaUJyWlhselgxeHVmVnh1WEc1bGVIQnZjblJ6TG1kbGRFdGxlWE1nUFNCblpYUkxaWGx6WEc1bGVIQnZjblJ6TG1selFYSnlZWGtnUFNCcGMwRnljbUY1WEc1bGVIQnZjblJ6TG1selFYSnlZWGxNYVd0bElEMGdhWE5CY25KaGVVeHBhMlZjYm1WNGNHOXlkSE11YVhOUFltcGxZM1FnUFNCcGMwOWlhbVZqZEZ4dVpYaHdiM0owY3k1cGMwNTFiV0psY2lBOUlHbHpUblZ0WW1WeVhHNGlMQ0pwYlhCdmNuUWdUR2x6ZEVsMFpXMGdabkp2YlNBbkxpOU1hWE4wU1hSbGJTYzdYRzVwYlhCdmNuUWdjbVZqZFhKemFYWmxTWFJsY21GMGIzSWdabkp2YlNBbmNtVmpkWEp6YVhabExXbDBaWEpoZEc5eUp6dGNibWx0Y0c5eWRDQnZZbXBsWTNSUVlYUm9JR1p5YjIwZ0oyOWlhbVZqZEMxd1lYUm9KenRjYmx4dVkyeGhjM01nUkdGMFlVeHBjM1FnWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZibk4wY25WamRHOXlLSEJ5YjNCektTQjdYRzRnSUNBZ0lDQWdJSE4xY0dWeUtIQnliM0J6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV5Wlc1a1pYSk9iMlJsY3lBOUlIUm9hWE11Y21WdVpHVnlUbTlrWlhNdVltbHVaQ2gwYUdsektUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDQTlJSFJvYVhNdWMyVjBSbWxsYkdSTllYQXVZbWx1WkNoMGFHbHpLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnpaWFJHYVdWc1pFMWhjQ2h3WVhSb0xDQmxkbVZ1ZENrZ2UxeHVJQ0FnSUNBZ0lDQmxkbVZ1ZEM1d2NtVjJaVzUwUkdWbVlYVnNkQ2dwTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbkJ5YjNCekxuVndaR0YwWlVacFpXeGtUV0Z3S0h0YlpYWmxiblF1ZEdGeVoyVjBMbVJoZEdGelpYUXVabWxsYkdSZE9pQndZWFJvZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WdVpHVnlUbTlrWlhNb1pHRjBZU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnVDJKcVpXTjBMbXRsZVhNb1pHRjBZU2t1YldGd0tHbDBaVzBnUFQ0Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tHbDBaVzBnUFQwOUlDZHZZbXBsWTNSUVlYUm9KeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2JHVjBJR05vYVd4a0lEMGdQRXhwYzNSSmRHVnRJR3RsZVQxN2FYUmxiUzUwYjFOMGNtbHVaeWdwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGJIVmxQWHRwZEdWdGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHOWlhbVZqZEQxN1pHRjBZVnRwZEdWdFhYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1hV1ZzWkUxaGNEMTdkR2hwY3k1d2NtOXdjeTVtYVdWc1pFMWhjSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2YmtOc2FXTnJRMjl1ZEdGcGJtVnlQWHRsSUQwK0lIUm9hWE11YzJWMFJtbGxiR1JOWVhBb1pHRjBZVnRwZEdWdFhTNXZZbXBsWTNSUVlYUm9MQ0JsS1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yVkdsMGJHVTllMlVnUFQ0Z2RHaHBjeTV6WlhSR2FXVnNaRTFoY0Noa1lYUmhXMmwwWlcxZExDQmxLWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2YmtOc2FXTnJRMjl1ZEdWdWREMTdaU0E5UGlCMGFHbHpMbk5sZEVacFpXeGtUV0Z3S0dSaGRHRmJhWFJsYlYwc0lHVXBmUzgrTzF4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUdSaGRHRmJhWFJsYlYwZ1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUdSaGRHRmJhWFJsYlYwZ0lUMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmphR2xzWkNBOUlGSmxZV04wTG1Oc2IyNWxSV3hsYldWdWRDaGphR2xzWkN3Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqYUdsc1pISmxiam9nUVhKeVlYa3VhWE5CY25KaGVTaGtZWFJoVzJsMFpXMWRLU0EvSUhSb2FYTXVjbVZ1WkdWeVRtOWtaWE1vWkdGMFlWdHBkR1Z0WFZzd1hTa2dPaUIwYUdsekxuSmxibVJsY2s1dlpHVnpLR1JoZEdGYmFYUmxiVjBwWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQmphR2xzWkR0Y2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5S0NrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCbWFXVnNaRTFoY0NBOUlIUm9hWE11Y0hKdmNITXVabWxsYkdSTllYQTdYRzVjYmlBZ0lDQWdJQ0FnYkdWMElHUmhkR0VnUFNCMGFHbHpMbkJ5YjNCekxtUmhkR0U3WEc0Z0lDQWdJQ0FnSUdsbUlDaEJjbkpoZVM1cGMwRnljbUY1S0dSaGRHRXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1hV1ZzWkUxaGNDNXBkR1Z0UTI5dWRHRnBibVZ5SUQwZ0p5YzdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCcFppQW9abWxsYkdSTllYQXVhWFJsYlVOdmJuUmhhVzVsY2lBOVBUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tFRnljbUY1TG1selFYSnlZWGtvWkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JrWVhSaElEMGdaR0YwWVZzd1hUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaHNaWFFnZTNCaGNtVnVkQ3dnYm05a1pTd2dhMlY1TENCd1lYUm9mU0J2WmlCdVpYY2djbVZqZFhKemFYWmxTWFJsY21GMGIzSW9aR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JRzV2WkdVZ1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUc1dlpHVWdJVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2JHVjBJSEJoZEdoVGRISnBibWNnUFNCd1lYUm9MbXB2YVc0b0p5NG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IySnFaV04wVUdGMGFDNXpaWFFvWkdGMFlTd2djR0YwYUZOMGNtbHVaeUFySUNjdWIySnFaV04wVUdGMGFDY3NJSEJoZEdoVGRISnBibWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlDaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThhRE0rVTJWc1pXTjBJR2wwWlcxeklHTnZiblJoYVc1bGNqd3ZhRE0rWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeDFiQ0JqYkdGemMwNWhiV1U5WENKcWMyOXVMWFJ5WldWY0lqNTdkR2hwY3k1eVpXNWtaWEpPYjJSbGN5aGtZWFJoS1gwOEwzVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR3hsZENCdlltcGxZM1JFWVhSaElEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2RHaHBjeTV3Y205d2N5NWtZWFJoTENCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlLVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29iMkpxWldOMFJHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdlltcGxZM1JFWVhSaElEMGdiMkpxWldOMFJHRjBZVnN3WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoc1pYUWdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb2ZTQnZaaUJ1WlhjZ2NtVmpkWEp6YVhabFNYUmxjbUYwYjNJb2IySnFaV04wUkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc1dlpHVWdJVDA5SUNkdlltcGxZM1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR3hsZENCd1lYUm9VM1J5YVc1bklEMGdjR0YwYUM1cWIybHVLQ2N1SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhbVZqZEVSaGRHRXNJSEJoZEdoVGRISnBibWNzSUhCaGRHaFRkSEpwYm1jcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YURNK1UyVnNaV04wSUhScGRHeGxJR0Z1WkNCamIyNTBaVzUwSUdacFpXeGtjend2YURNK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHgxYkNCamJHRnpjMDVoYldVOVhDSnFjMjl1TFhSeVpXVmNJajU3ZEdocGN5NXlaVzVrWlhKT2IyUmxjeWh2WW1wbFkzUkVZWFJoS1gwOEwzVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMWNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdSR0YwWVV4cGMzUTdJaXdpYVcxd2IzSjBJRVJoZEdGTWFYTjBJR1p5YjIwZ0p5NHZSR0YwWVV4cGMzUW5PMXh1YVcxd2IzSjBJR2RsZEVGd2FVUmhkR0VnWm5KdmJTQW5MaTR2TGk0dlZYUnBiR2wwYVdWekwyZGxkRUZ3YVVSaGRHRW5PMXh1WEc1amJHRnpjeUJHYVdWc1pGTmxiR1ZqZEdsdmJpQmxlSFJsYm1SeklGSmxZV04wTGtOdmJYQnZibVZ1ZENCN1hHNGdJQ0FnWTI5dWMzUnlkV04wYjNJb2NISnZjSE1wSUh0Y2JpQWdJQ0FnSUNBZ2MzVndaWElvY0hKdmNITXBPMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTjBZWFJsSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSTZJRzUxYkd3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwYzB4dllXUmxaRG9nWm1Gc2MyVXNYRzRnSUNBZ0lDQWdJQ0FnSUNCcGRHVnRjem9nVzExY2JpQWdJQ0FnSUNBZ2ZUdGNibHh1SUNBZ0lDQWdJQ0IwYUdsekxuVndaR0YwWlVacFpXeGtUV0Z3SUQwZ2RHaHBjeTUxY0dSaGRHVkdhV1ZzWkUxaGNDNWlhVzVrS0hSb2FYTXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lIVndaR0YwWlVacFpXeGtUV0Z3S0haaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjSEp2Y0hNdWRYQmtZWFJsUm1sbGJHUk5ZWEFvZG1Gc2RXVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHZGxkRVJoZEdFb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdDFjbXg5SUQwZ2RHaHBjeTV3Y205d2N6dGNiaUFnSUNBZ0lDQWdaMlYwUVhCcFJHRjBZU2gxY213cFhHNGdJQ0FnSUNBZ0lDQWdJQ0F1ZEdobGJpaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQW9lM0psYzNWc2RIMHBJRDArSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0NGeVpYTjFiSFFnZkh3Z1QySnFaV04wTG10bGVYTW9jbVZ6ZFd4MEtTNXNaVzVuZEdnZ1BUMDlJREFwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWeWNtOXlPaUJGY25KdmNpZ25RMjkxYkdRZ2JtOTBJR1psZEdOb0lHUmhkR0VnWm5KdmJTQlZVa3d1Snlrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWE5NYjJGa1pXUTZJSFJ5ZFdWY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMmx6VEc5aFpHVmtPaUIwY25WbExDQnBkR1Z0Y3pvZ2NtVnpkV3gwZlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTd2dLSHRsY25KdmNuMHBJRDArSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2FYTk1iMkZrWldRNklIUnlkV1VzSUdWeWNtOXlmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQmpiMjF3YjI1bGJuUkVhV1JOYjNWdWRDZ3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NW5aWFJFWVhSaEtDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5S0NrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN1pYSnliM0lzSUdselRHOWhaR1ZrTENCcGRHVnRjMzBnUFNCMGFHbHpMbk4wWVhSbE8xeHVJQ0FnSUNBZ0lDQnBaaUFvWlhKeWIzSXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBOFpHbDJQanh3UGtWeWNtOXlPaUI3WlhKeWIzSXViV1Z6YzJGblpYMDhMM0ErUEM5a2FYWStPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0NGcGMweHZZV1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRHhrYVhZZ1kyeGhjM05PWVcxbFBWd2ljM0JwYm01bGNpQnBjeTFoWTNScGRtVmNJajQ4TDJScGRqNDdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnUEVSaGRHRk1hWE4wWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWkdGMFlUMTdhWFJsYlhOOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNQWHQwYUdsekxuQnliM0J6TG5WeWJIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1hV1ZzWkUxaGNEMTdkR2hwY3k1d2NtOXdjeTVtYVdWc1pFMWhjSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNEMTdkR2hwY3k1MWNHUmhkR1ZHYVdWc1pFMWhjSDB2UGp0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMWNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdSbWxsYkdSVFpXeGxZM1JwYjI0N0lpd2lablZ1WTNScGIyNGdTVzV3ZFhSR2FXVnNaSE1vY0hKdmNITXBJSHRjYmlBZ0lDQmpiMjV6ZENCN1ptbGxiR1JOWVhBc0lIVnliSDBnUFNCd2NtOXdjenRjYmlBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQThaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdQR2x1Y0hWMElIUjVjR1U5WENKb2FXUmtaVzVjSWlCdVlXMWxQVndpYlc5a1gycHpiMjVmY21WdVpHVnlYM1Z5YkZ3aUlIWmhiSFZsUFh0MWNteDlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lEeHBibkIxZENCMGVYQmxQVndpYUdsa1pHVnVYQ0lnYm1GdFpUMWNJbTF2WkY5cWMyOXVYM0psYm1SbGNsOW1hV1ZzWkcxaGNGd2lJSFpoYkhWbFBYdEtVMDlPTG5OMGNtbHVaMmxtZVNobWFXVnNaRTFoY0NsOUx6NWNiaUFnSUNBZ0lDQWdQQzlrYVhZK1hHNGdJQ0FnS1R0Y2JuMWNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdTVzV3ZFhSR2FXVnNaSE03SWl3aVpuVnVZM1JwYjI0Z1RHbHpkRWwwWlcwb2NISnZjSE1wSUh0Y2JpQWdJQ0JqYjI1emRDQjdkbUZzZFdVc0lHTm9hV3hrY21WdUxDQm1hV1ZzWkUxaGNDd2diMkpxWldOMExDQnZia05zYVdOclZHbDBiR1VzSUc5dVEyeHBZMnREYjI1MFpXNTBMQ0J2YmtOc2FXTnJRMjl1ZEdGcGJtVnlmU0E5SUhCeWIzQnpPMXh1WEc0Z0lDQWdhV1lnS0dOb2FXeGtjbVZ1S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1BHeHBQbHh1SUNBZ0lDQWdJQ0FnSUNBZ2UwRnljbUY1TG1selFYSnlZWGtvYjJKcVpXTjBLU0FtSmlCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJRDA5UFNCdWRXeHNJRDljYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YzNCaGJqNDhjM0JoYmlCamJHRnpjMDVoYldVOVhDSmtZWE5vYVdOdmJuTWdaR0Z6YUdsamIyNXpMWEJ2Y25SbWIyeHBiMXdpUGp3dmMzQmhiajRnZTNaaGJIVmxmU0E4WVNCb2NtVm1QVndpSTF3aUlHTnNZWE56VG1GdFpUMWNJblJ5WldVdGMyVnNaV04wWENJZ1pHRjBZUzFtYVdWc1pEMWNJbWwwWlcxRGIyNTBZV2x1WlhKY0lpQnZia05zYVdOclBYdHZia05zYVdOclEyOXVkR0ZwYm1WeWZUNVRaV3hsWTNROEwyRStQQzl6Y0dGdVBpQTZJQ0E4YzNCaGJqNTdkbUZzZFdWOVBDOXpjR0Z1UG4xY2JpQWdJQ0FnSUNBZ0lDQWdJRHgxYkQ1N1kyaHBiR1J5Wlc1OVBDOTFiRDVjYmlBZ0lDQWdJQ0FnUEM5c2FUNHBPMXh1SUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1BHeHBQbHh1SUNBZ0lDQWdJQ0FnSUNBZ2UyWnBaV3hrVFdGd0xuUnBkR3hsSUQwOVBTQnZZbXBsWTNRZ0ppWWdabWxsYkdSTllYQXVkR2wwYkdVZ1B5QThjM1J5YjI1blBsUnBkR3hsT2lBOEwzTjBjbTl1Wno0Z09pQW5KMzFjYmlBZ0lDQWdJQ0FnSUNBZ0lIdG1hV1ZzWkUxaGNDNWpiMjUwWlc1MElEMDlQU0J2WW1wbFkzUWdKaVlnWm1sbGJHUk5ZWEF1WTI5dWRHVnVkQ0EvSUR4emRISnZibWMrUTI5dWRHVnVkRG9nUEM5emRISnZibWMrSURvZ0p5ZDlYRzRnSUNBZ0lDQWdJQ0FnSUNBOGMzQmhiajU3ZG1Gc2RXVjlQQzl6Y0dGdVBseHVJQ0FnSUNBZ0lDQWdJQ0FnZXlGbWFXVnNaRTFoY0M1MGFYUnNaU0FtSmlBb1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZENBaFBUMGdiMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlDRTlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0luUnlaV1V0YzJWc1pXTjBYQ0lnWkdGMFlTMW1hV1ZzWkQxY0luUnBkR3hsWENJZ2IyNURiR2xqYXoxN2IyNURiR2xqYTFScGRHeGxmVDVVYVhSc1pUd3ZZVDRnT2lBbkozMWNiaUFnSUNBZ0lDQWdJQ0FnSUhzaFptbGxiR1JOWVhBdVkyOXVkR1Z1ZENBbUppQW9abWxsYkdSTllYQXVkR2wwYkdVZ0lUMDlJRzlpYW1WamRDa2dKaVlnWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQWhQVDBnYm5Wc2JDQS9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR0VnYUhKbFpqMWNJaU5jSWlCamJHRnpjMDVoYldVOVhDSjBjbVZsTFhObGJHVmpkRndpSUdSaGRHRXRabWxsYkdROVhDSmpiMjUwWlc1MFhDSWdiMjVEYkdsamF6MTdiMjVEYkdsamEwTnZiblJsYm5SOVBrTnZiblJsYm5ROEwyRStJRG9nSnlkOVhHNGdJQ0FnSUNBZ0lEd3ZiR2srS1R0Y2JpQWdJQ0I5WEc1OVhHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElFeHBjM1JKZEdWdE95SXNJbWx0Y0c5eWRDQkdhV1ZzWkZObGJHVmpkR2x2YmlCbWNtOXRJQ2N1TDBacFpXeGtVMlZzWldOMGFXOXVKenRjYm1sdGNHOXlkQ0JKYm5CMWRFWnBaV3hrY3lCbWNtOXRJQ2N1TDBsdWNIVjBSbWxsYkdSekp6dGNibWx0Y0c5eWRDQlRkVzF0WVhKNUlHWnliMjBnSnk0dlUzVnRiV0Z5ZVNjN1hHNWNibU5zWVhOeklGTmxkSFJwYm1keklHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lod2NtOXdjeWtnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWh3Y205d2N5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6YUc5M1JtbGxiR1JUWld4bFkzUnBiMjQ2SUdaaGJITmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUFuSnl4Y2JpQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndPaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVhSbGJVTnZiblJoYVc1bGNqb2diblZzYkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFYUnNaVG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZERvZ0p5ZGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNCOVhHNWNiaUFnSUNCamIyMXdiMjVsYm5SRWFXUk5iM1Z1ZENncElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1cGJtbDBUM0IwYVc5dWN5Z3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHbHVhWFJQY0hScGIyNXpLQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHMXZaRXB6YjI1U1pXNWtaWEl1YjNCMGFXOXVjeUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZibk4wSUc5d2RHbHZibk1nUFNCdGIyUktjMjl1VW1WdVpHVnlMbTl3ZEdsdmJuTTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213NklHOXdkR2x2Ym5NdWRYSnNJRDhnYjNCMGFXOXVjeTUxY213Z09pQW5KeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRG9nYjNCMGFXOXVjeTVtYVdWc1pFMWhjQ0EvSUVwVFQwNHVjR0Z5YzJVb2IzQjBhVzl1Y3k1bWFXVnNaRTFoY0NrZ09pQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsMFpXMURiMjUwWVdsdVpYSTZJRzUxYkd3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwZEd4bE9pQW5KeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZERvZ0p5ZGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nSVNGdmNIUnBiMjV6TG5WeWJGeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCMWNteERhR0Z1WjJVb1pYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3ZFhKc09pQmxkbVZ1ZEM1MFlYSm5aWFF1ZG1Gc2RXVjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQm9ZVzVrYkdWVGRXSnRhWFFvWlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnWlhabGJuUXVjSEpsZG1WdWRFUmxabUYxYkhRb0tUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dU9pQjBjblZsZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WelpYUlBjSFJwYjI1ektHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lM05vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nWm1Gc2MyVXNJSFZ5YkRvZ0p5Y3NJR1pwWld4a1RXRndPaUI3YVhSbGJVTnZiblJoYVc1bGNqb2diblZzYkN3Z2RHbDBiR1U2SUNjbkxDQmpiMjUwWlc1ME9pQW5KMzE5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCdVpYZFdZV3dnUFNCUFltcGxZM1F1WVhOemFXZHVLSFJvYVhNdWMzUmhkR1V1Wm1sbGJHUk5ZWEFzSUhaaGJIVmxLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdabWxsYkdSTllYQTZJRzVsZDFaaGJIMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2lncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzTm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJpd2dkWEpzZlNBOUlIUm9hWE11YzNSaGRHVTdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdHBkR1Z0UTI5dWRHRnBibVZ5TENCMGFYUnNaU3dnWTI5dWRHVnVkSDBnUFNCMGFHbHpMbk4wWVhSbExtWnBaV3hrVFdGd08xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoMWNtd2dKaVlnYVhSbGJVTnZiblJoYVc1bGNpQWhQVDBnYm5Wc2JDQW1KaUIwYVhSc1pTQW1KaUJqYjI1MFpXNTBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeFRkVzF0WVhKNUlIc3VMaTUwYUdsekxuTjBZWFJsZlNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4U1c1d2RYUkdhV1ZzWkhNZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh3UGp4aElHaHlaV1k5WENJalhDSWdiMjVEYkdsamF6MTdkR2hwY3k1eVpYTmxkRTl3ZEdsdmJuTXVZbWx1WkNoMGFHbHpLWDBnWTJ4aGMzTk9ZVzFsUFZ3aVluVjBkRzl1WENJK1VtVnpaWFFnYzJWMGRHbHVaM004TDJFK1BDOXdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHphRzkzUm1sbGJHUlRaV3hsWTNScGIyNHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BFWnBaV3hrVTJWc1pXTjBhVzl1SUhWeWJEMTdkWEpzZlNCbWFXVnNaRTFoY0QxN2RHaHBjeTV6ZEdGMFpTNW1hV1ZzWkUxaGNIMGdkWEJrWVhSbFJtbGxiR1JOWVhBOWUzUm9hWE11ZFhCa1lYUmxSbWxsYkdSTllYQXVZbWx1WkNoMGFHbHpLWDB2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThTVzV3ZFhSR2FXVnNaSE1nZXk0dUxuUm9hWE11YzNSaGRHVjlJQzgrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHdQanhoSUdoeVpXWTlYQ0lqWENJZ2IyNURiR2xqYXoxN2RHaHBjeTV5WlhObGRFOXdkR2x2Ym5OOUlHTnNZWE56VG1GdFpUMWNJbUoxZEhSdmJsd2lQbEpsYzJWMElITmxkSFJwYm1kelBDOWhQand2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpZDNKaGNGd2lQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFptOXliU0J2YmxOMVltMXBkRDE3ZEdocGN5NW9ZVzVrYkdWVGRXSnRhWFF1WW1sdVpDaDBhR2x6S1gwK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGNENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YkdGaVpXdytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHpkSEp2Ym1jK1JHRjBZU0J6YjNWeVkyVThMM04wY205dVp6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDJ4aFltVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4aWNpOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdrK1JXNTBaWElnWVNCMllXeHBaQ0JLVTA5T0lHRndhU0IxY213dVBDOXBQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzl3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSjBaWGgwWENJZ1kyeGhjM05PWVcxbFBWd2lkWEpzTFdsdWNIVjBYQ0lnZG1Gc2RXVTllM1Z5YkgwZ2IyNURhR0Z1WjJVOWUzUm9hWE11ZFhKc1EyaGhibWRsTG1KcGJtUW9kR2hwY3lsOUx6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHdQanhwYm5CMWRDQjBlWEJsUFZ3aWMzVmliV2wwWENJZ1kyeGhjM05PWVcxbFBWd2lZblYwZEc5dUlHSjFkSFJ2Ymkxd2NtbHRZWEo1WENJZ2RtRnNkV1U5WENKVGRXSnRhWFJjSWk4K1BDOXdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyWnZjbTArWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeEpibkIxZEVacFpXeGtjeUI3TGk0dWRHaHBjeTV6ZEdGMFpYMGdMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDJScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRk5sZEhScGJtZHpPeUlzSW1aMWJtTjBhVzl1SUZOMWJXMWhjbmtvY0hKdmNITXBJSHRjYmlBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQThaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdQSEErWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhOMGNtOXVaejVFWVhSaElITnZkWEpqWlR3dmMzUnliMjVuUGp4aWNpOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR0VnYUhKbFpqMTdjSEp2Y0hNdWRYSnNmU0IwWVhKblpYUTlYQ0pmWW14aGJtdGNJajU3Y0hKdmNITXVkWEpzZlR3dllUNWNiaUFnSUNBZ0lDQWdJQ0FnSUR3dmNENWNiaUFnSUNBZ0lDQWdJQ0FnSUR4d1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHpkSEp2Ym1jK1ZHbDBiR1U4TDNOMGNtOXVaejQ4WW5JdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIdHdjbTl3Y3k1bWFXVnNaRTFoY0M1MGFYUnNaUzV5WlhCc1lXTmxLQ2N1Snl3Z0p5RGlnSk0rSUNjcGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnUEM5d1BseHVJQ0FnSUNBZ0lDQWdJQ0FnUEhBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BITjBjbTl1Wno1RGIyNTBaVzUwUEM5emRISnZibWMrUEdKeUx6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjdjSEp2Y0hNdVptbGxiR1JOWVhBdVkyOXVkR1Z1ZEM1eVpYQnNZV05sS0NjdUp5d2dKeURpZ0pNK0lDY3BmVnh1SUNBZ0lDQWdJQ0FnSUNBZ1BDOXdQbHh1SUNBZ0lDQWdJQ0E4TDJScGRqNWNiaUFnSUNBcE8xeHVmVnh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JUZFcxdFlYSjVPeUlzSW1sdGNHOXlkQ0JUWlhSMGFXNW5jeUJtY205dElDY3VMME52YlhCdmJtVnVkSE12VTJWMGRHbHVaM01uTzF4dVhHNWpiMjV6ZENCdGIyUktjMjl1VW1WdVpHVnlSV3hsYldWdWRDQTlJQ2R0YjJSMWJHRnlhWFI1TFdwemIyNHRjbVZ1WkdWeUp6dGNibU52Ym5OMElHUnZiVVZzWlcxbGJuUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaHRiMlJLYzI5dVVtVnVaR1Z5Uld4bGJXVnVkQ2s3WEc1Y2JsSmxZV04wUkU5TkxuSmxibVJsY2loY2JpQWdJQ0E4VTJWMGRHbHVaM01nTHo0c1hHNGdJQ0FnWkc5dFJXeGxiV1Z1ZEZ4dUtUc2lMQ0ptZFc1amRHbHZiaUJuWlhSQmNHbEVZWFJoS0hWeWJDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCbVpYUmphQ2gxY213cFhHNGdJQ0FnSUNBZ0lDNTBhR1Z1S0hKbGN5QTlQaUJ5WlhNdWFuTnZiaWdwS1Z4dUlDQWdJQ0FnSUNBdWRHaGxiaWhjYmlBZ0lDQWdJQ0FnSUNBZ0lDaHlaWE4xYkhRcElEMCtJQ2g3Y21WemRXeDBmU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQW9aWEp5YjNJcElEMCtJQ2g3WlhKeWIzSjlLVnh1SUNBZ0lDQWdJQ0FwTzF4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQm5aWFJCY0dsRVlYUmhPMXh1SWwxOVxuIl0sImZpbGUiOiJBZG1pbi9JbmRleEFkbWluLmpzIn0=
