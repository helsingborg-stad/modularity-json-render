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

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

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
          onClick: this.resetOptions,
          className: "button"
        }, "Reset settings")));
      } else if (showFieldSelection) {
        return React.createElement("div", null, React.createElement(_FieldSelection.default, {
          url: url,
          fieldMap: this.state.fieldMap,
          updateFieldMap: this.updateFieldMap
        }), React.createElement(_InputFields.default, this.state), React.createElement("p", null, React.createElement("a", {
          href: "#",
          onClick: this.resetOptions,
          className: "button"
        }, "Reset settings")));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7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LEVBSUMsVUFBQyxLQUFEO0FBQUEsV0FBWTtBQUFDLE1BQUEsS0FBSyxFQUFMO0FBQUQsS0FBWjtBQUFBLEdBSkQsQ0FBUDtBQU1IOztlQUVjLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3Rvcnkpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dDpjYW50IHRlc3QqL1xuICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsc1xuICAgIHJvb3Qub2JqZWN0UGF0aCA9IGZhY3RvcnkoKTtcbiAgfVxufSkodGhpcywgZnVuY3Rpb24oKXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIGZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgIGlmKG9iaiA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgLy90byBoYW5kbGUgb2JqZWN0cyB3aXRoIG51bGwgcHJvdG90eXBlcyAodG9vIGVkZ2UgY2FzZT8pXG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApXG4gIH1cblxuICBmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKXtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gdG9TdHJpbmcodHlwZSl7XG4gICAgcmV0dXJuIHRvU3RyLmNhbGwodHlwZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc09iamVjdChvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZyhvYmopID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xuICB9XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKG9iail7XG4gICAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dDpjYW50IHRlc3QqL1xuICAgIHJldHVybiB0b1N0ci5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH1cblxuICBmdW5jdGlvbiBpc0Jvb2xlYW4ob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nIHx8IHRvU3RyaW5nKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEtleShrZXkpe1xuICAgIHZhciBpbnRLZXkgPSBwYXJzZUludChrZXkpO1xuICAgIGlmIChpbnRLZXkudG9TdHJpbmcoKSA9PT0ga2V5KSB7XG4gICAgICByZXR1cm4gaW50S2V5O1xuICAgIH1cbiAgICByZXR1cm4ga2V5O1xuICB9XG5cbiAgZnVuY3Rpb24gZmFjdG9yeShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuICAgIHZhciBvYmplY3RQYXRoID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0UGF0aCkucmVkdWNlKGZ1bmN0aW9uKHByb3h5LCBwcm9wKSB7XG4gICAgICAgIGlmKHByb3AgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgICB9XG5cbiAgICAgICAgLyppc3RhbmJ1bCBpZ25vcmUgZWxzZSovXG4gICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0UGF0aFtwcm9wXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHByb3h5W3Byb3BdID0gb2JqZWN0UGF0aFtwcm9wXS5iaW5kKG9iamVjdFBhdGgsIG9iaik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICB9LCB7fSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIHJldHVybiAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgfHwgKHR5cGVvZiBwcm9wID09PSAnbnVtYmVyJyAmJiBBcnJheS5pc0FycmF5KG9iaikpIHx8IGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgaWYgKGhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApKSB7XG4gICAgICAgIHJldHVybiBvYmpbcHJvcF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHNldChvYmosIHBhdGguc3BsaXQoJy4nKS5tYXAoZ2V0S2V5KSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgICB9XG4gICAgICB2YXIgY3VycmVudFBhdGggPSBwYXRoWzBdO1xuICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKTtcbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlID09PSB2b2lkIDAgfHwgIWRvTm90UmVwbGFjZSkge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY3VycmVudFZhbHVlID09PSB2b2lkIDApIHtcbiAgICAgICAgLy9jaGVjayBpZiB3ZSBhc3N1bWUgYW4gYXJyYXlcbiAgICAgICAgaWYodHlwZW9mIHBhdGhbMV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgIH1cblxuICAgIG9iamVjdFBhdGguaGFzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAhIW9iajtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBqID0gZ2V0S2V5KHBhdGhbaV0pO1xuXG4gICAgICAgIGlmKCh0eXBlb2YgaiA9PT0gJ251bWJlcicgJiYgaXNBcnJheShvYmopICYmIGogPCBvYmoubGVuZ3RoKSB8fFxuICAgICAgICAgIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyA/IChqIGluIE9iamVjdChvYmopKSA6IGhhc093blByb3BlcnR5KG9iaiwgaikpKSB7XG4gICAgICAgICAgb2JqID0gb2JqW2pdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbnN1cmVFeGlzdHMgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIHRydWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLnNldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmluc2VydCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBhdCl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGF0ID0gfn5hdDtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG4gICAgICBhcnIuc3BsaWNlKGF0LCAwLCB2YWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW1wdHkgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlLCBpO1xuICAgICAgaWYgKCEodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAnJyk7XG4gICAgICB9IGVsc2UgaWYgKGlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgZmFsc2UpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIDApO1xuICAgICAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB2YWx1ZS5sZW5ndGggPSAwO1xuICAgICAgfSBlbHNlIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgZm9yIChpIGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKGhhc1NoYWxsb3dQcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2YWx1ZVtpXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIG51bGwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLnB1c2ggPSBmdW5jdGlvbiAob2JqLCBwYXRoIC8qLCB2YWx1ZXMgKi8pe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuXG4gICAgICBhcnIucHVzaC5hcHBseShhcnIsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmNvYWxlc2NlID0gZnVuY3Rpb24gKG9iaiwgcGF0aHMsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgdmFyIHZhbHVlO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGF0aHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKCh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aHNbaV0pKSAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZ2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgZGVmYXVsdFZhbHVlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmosIHBhdGguc3BsaXQoJy4nKSwgZGVmYXVsdFZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgdmFyIG5leHRPYmogPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aClcbiAgICAgIGlmIChuZXh0T2JqID09PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBuZXh0T2JqO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgZGVmYXVsdFZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5kZWwgPSBmdW5jdGlvbiBkZWwob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG5cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmosIHBhdGguc3BsaXQoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIGlmICghaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgICBvYmouc3BsaWNlKGN1cnJlbnRQYXRoLCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgb2JqW2N1cnJlbnRQYXRoXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIHJldHVybiBvYmplY3RQYXRoO1xuICB9XG5cbiAgdmFyIG1vZCA9IGZhY3RvcnkoKTtcbiAgbW9kLmNyZWF0ZSA9IGZhY3Rvcnk7XG4gIG1vZC53aXRoSW5oZXJpdGVkUHJvcHMgPSBmYWN0b3J5KHtpbmNsdWRlSW5oZXJpdGVkUHJvcHM6IHRydWV9KVxuICByZXR1cm4gbW9kO1xufSk7XG4iLCIndXNlIHN0cmljdCdcblxuY29uc3Qge2lzT2JqZWN0LCBnZXRLZXlzfSA9IHJlcXVpcmUoJy4vbGFuZycpXG5cbi8vIFBSSVZBVEUgUFJPUEVSVElFU1xuY29uc3QgQllQQVNTX01PREUgPSAnX19ieXBhc3NNb2RlJ1xuY29uc3QgSUdOT1JFX0NJUkNVTEFSID0gJ19faWdub3JlQ2lyY3VsYXInXG5jb25zdCBNQVhfREVFUCA9ICdfX21heERlZXAnXG5jb25zdCBDQUNIRSA9ICdfX2NhY2hlJ1xuY29uc3QgUVVFVUUgPSAnX19xdWV1ZSdcbmNvbnN0IFNUQVRFID0gJ19fc3RhdGUnXG5cbmNvbnN0IEVNUFRZX1NUQVRFID0ge31cblxuY2xhc3MgUmVjdXJzaXZlSXRlcmF0b3Ige1xuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IHJvb3RcbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtieXBhc3NNb2RlPTBdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2lnbm9yZUNpcmN1bGFyPWZhbHNlXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW21heERlZXA9MTAwXVxuICAgKi9cbiAgY29uc3RydWN0b3IgKHJvb3QsIGJ5cGFzc01vZGUgPSAwLCBpZ25vcmVDaXJjdWxhciA9IGZhbHNlLCBtYXhEZWVwID0gMTAwKSB7XG4gICAgdGhpc1tCWVBBU1NfTU9ERV0gPSBieXBhc3NNb2RlXG4gICAgdGhpc1tJR05PUkVfQ0lSQ1VMQVJdID0gaWdub3JlQ2lyY3VsYXJcbiAgICB0aGlzW01BWF9ERUVQXSA9IG1heERlZXBcbiAgICB0aGlzW0NBQ0hFXSA9IFtdXG4gICAgdGhpc1tRVUVVRV0gPSBbXVxuICAgIHRoaXNbU1RBVEVdID0gdGhpcy5nZXRTdGF0ZSh1bmRlZmluZWQsIHJvb3QpXG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBuZXh0ICgpIHtcbiAgICBjb25zdCB7bm9kZSwgcGF0aCwgZGVlcH0gPSB0aGlzW1NUQVRFXSB8fCBFTVBUWV9TVEFURVxuXG4gICAgaWYgKHRoaXNbTUFYX0RFRVBdID4gZGVlcCkge1xuICAgICAgaWYgKHRoaXMuaXNOb2RlKG5vZGUpKSB7XG4gICAgICAgIGlmICh0aGlzLmlzQ2lyY3VsYXIobm9kZSkpIHtcbiAgICAgICAgICBpZiAodGhpc1tJR05PUkVfQ0lSQ1VMQVJdKSB7XG4gICAgICAgICAgICAvLyBza2lwXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2lyY3VsYXIgcmVmZXJlbmNlJylcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRoaXMub25TdGVwSW50byh0aGlzW1NUQVRFXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0b3JzID0gdGhpcy5nZXRTdGF0ZXNPZkNoaWxkTm9kZXMobm9kZSwgcGF0aCwgZGVlcClcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IHRoaXNbQllQQVNTX01PREVdID8gJ3B1c2gnIDogJ3Vuc2hpZnQnXG4gICAgICAgICAgICB0aGlzW1FVRVVFXVttZXRob2RdKC4uLmRlc2NyaXB0b3JzKVxuICAgICAgICAgICAgdGhpc1tDQUNIRV0ucHVzaChub2RlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gdGhpc1tRVUVVRV0uc2hpZnQoKVxuICAgIGNvbnN0IGRvbmUgPSAhdmFsdWVcblxuICAgIHRoaXNbU1RBVEVdID0gdmFsdWVcblxuICAgIGlmIChkb25lKSB0aGlzLmRlc3Ryb3koKVxuXG4gICAgcmV0dXJuIHt2YWx1ZSwgZG9uZX1cbiAgfVxuICAvKipcbiAgICpcbiAgICovXG4gIGRlc3Ryb3kgKCkge1xuICAgIHRoaXNbUVVFVUVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW0NBQ0hFXS5sZW5ndGggPSAwXG4gICAgdGhpc1tTVEFURV0gPSBudWxsXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNOb2RlIChhbnkpIHtcbiAgICByZXR1cm4gaXNPYmplY3QoYW55KVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzTGVhZiAoYW55KSB7XG4gICAgcmV0dXJuICF0aGlzLmlzTm9kZShhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNDaXJjdWxhciAoYW55KSB7XG4gICAgcmV0dXJuIHRoaXNbQ0FDSEVdLmluZGV4T2YoYW55KSAhPT0gLTFcbiAgfVxuICAvKipcbiAgICogUmV0dXJucyBzdGF0ZXMgb2YgY2hpbGQgbm9kZXNcbiAgICogQHBhcmFtIHtPYmplY3R9IG5vZGVcbiAgICogQHBhcmFtIHtBcnJheX0gcGF0aFxuICAgKiBAcGFyYW0ge051bWJlcn0gZGVlcFxuICAgKiBAcmV0dXJucyB7QXJyYXk8T2JqZWN0Pn1cbiAgICovXG4gIGdldFN0YXRlc09mQ2hpbGROb2RlcyAobm9kZSwgcGF0aCwgZGVlcCkge1xuICAgIHJldHVybiBnZXRLZXlzKG5vZGUpLm1hcChrZXkgPT5cbiAgICAgIHRoaXMuZ2V0U3RhdGUobm9kZSwgbm9kZVtrZXldLCBrZXksIHBhdGguY29uY2F0KGtleSksIGRlZXAgKyAxKVxuICAgIClcbiAgfVxuICAvKipcbiAgICogUmV0dXJucyBzdGF0ZSBvZiBub2RlLiBDYWxscyBmb3IgZWFjaCBub2RlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyZW50XVxuICAgKiBAcGFyYW0geyp9IFtub2RlXVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2tleV1cbiAgICogQHBhcmFtIHtBcnJheX0gW3BhdGhdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbZGVlcF1cbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIGdldFN0YXRlIChwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCA9IFtdLCBkZWVwID0gMCkge1xuICAgIHJldHVybiB7cGFyZW50LCBub2RlLCBrZXksIHBhdGgsIGRlZXB9XG4gIH1cbiAgLyoqXG4gICAqIENhbGxiYWNrXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9uU3RlcEludG8gKHN0YXRlKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge1JlY3Vyc2l2ZUl0ZXJhdG9yfVxuICAgKi9cbiAgW1N5bWJvbC5pdGVyYXRvcl0gKCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWN1cnNpdmVJdGVyYXRvclxuIiwiJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuIiwiaW1wb3J0IExpc3RJdGVtIGZyb20gJy4vTGlzdEl0ZW0nO1xuaW1wb3J0IHJlY3Vyc2l2ZUl0ZXJhdG9yIGZyb20gJ3JlY3Vyc2l2ZS1pdGVyYXRvcic7XG5pbXBvcnQgb2JqZWN0UGF0aCBmcm9tICdvYmplY3QtcGF0aCc7XG5cbmNsYXNzIERhdGFMaXN0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMucmVuZGVyTm9kZXMgPSB0aGlzLnJlbmRlck5vZGVzLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuc2V0RmllbGRNYXAgPSB0aGlzLnNldEZpZWxkTWFwLmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgc2V0RmllbGRNYXAocGF0aCwgZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh7W2V2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkXTogcGF0aH0pO1xuICAgIH1cblxuICAgIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRhdGEpLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtID09PSAnb2JqZWN0UGF0aCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBjaGlsZCA9IDxMaXN0SXRlbSBrZXk9e2l0ZW0udG9TdHJpbmcoKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZT17aXRlbX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q9e2RhdGFbaXRlbV19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGRNYXA9e3RoaXMucHJvcHMuZmllbGRNYXB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGlja0NvbnRhaW5lcj17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGlja1RpdGxlPXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGlja0NvbnRlbnQ9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKX0vPjtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhW2l0ZW1dID09PSAnb2JqZWN0JyAmJiBkYXRhW2l0ZW1dICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQgPSBSZWFjdC5jbG9uZUVsZW1lbnQoY2hpbGQsIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IEFycmF5LmlzQXJyYXkoZGF0YVtpdGVtXSkgPyB0aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV1bMF0pIDogdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3QgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuXG4gICAgICAgIGxldCBkYXRhID0gdGhpcy5wcm9wcy5kYXRhO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRhdGFbMF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aH0gb2YgbmV3IHJlY3Vyc2l2ZUl0ZXJhdG9yKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlID09PSAnb2JqZWN0JyAmJiBub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFBhdGguc2V0KGRhdGEsIHBhdGhTdHJpbmcgKyAnLm9iamVjdFBhdGgnLCBwYXRoU3RyaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGgzPlNlbGVjdCBpdGVtcyBjb250YWluZXI8L2gzPlxuICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3NOYW1lPVwianNvbi10cmVlXCI+e3RoaXMucmVuZGVyTm9kZXMoZGF0YSl9PC91bD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgb2JqZWN0RGF0YSA9IG9iamVjdFBhdGguZ2V0KHRoaXMucHJvcHMuZGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0RGF0YSA9IG9iamVjdERhdGFbMF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aH0gb2YgbmV3IHJlY3Vyc2l2ZUl0ZXJhdG9yKG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RQYXRoLnNldChvYmplY3REYXRhLCBwYXRoU3RyaW5nLCBwYXRoU3RyaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGgzPlNlbGVjdCB0aXRsZSBhbmQgY29udGVudCBmaWVsZHM8L2gzPlxuICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3NOYW1lPVwianNvbi10cmVlXCI+e3RoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSl9PC91bD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IERhdGFMaXN0OyIsImltcG9ydCBEYXRhTGlzdCBmcm9tICcuL0RhdGFMaXN0JztcbmltcG9ydCBnZXRBcGlEYXRhIGZyb20gJy4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhJztcblxuY2xhc3MgRmllbGRTZWxlY3Rpb24gZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgaXRlbXM6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy51cGRhdGVGaWVsZE1hcCA9IHRoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9XG5cbiAgICBnZXREYXRhKCkge1xuICAgICAgICBjb25zdCB7dXJsfSA9IHRoaXMucHJvcHM7XG4gICAgICAgIGdldEFwaURhdGEodXJsKVxuICAgICAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAgICAgKHtyZXN1bHR9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0IHx8IE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogRXJyb3IoJ0NvdWxkIG5vdCBmZXRjaCBkYXRhIGZyb20gVVJMLicpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTG9hZGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdHJ1ZSwgaXRlbXM6IHJlc3VsdH0pO1xuICAgICAgICAgICAgICAgIH0sICh7ZXJyb3J9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe2lzTG9hZGVkOiB0cnVlLCBlcnJvcn0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuZ2V0RGF0YSgpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge2Vycm9yLCBpc0xvYWRlZCwgaXRlbXN9ID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdj48cD5FcnJvcjoge2Vycm9yLm1lc3NhZ2V9PC9wPjwvZGl2PjtcbiAgICAgICAgfSBlbHNlIGlmICghaXNMb2FkZWQpIHtcbiAgICAgICAgICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cInNwaW5uZXIgaXMtYWN0aXZlXCI+PC9kaXY+O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDxEYXRhTGlzdFxuICAgICAgICAgICAgICAgIGRhdGE9e2l0ZW1zfVxuICAgICAgICAgICAgICAgIHVybD17dGhpcy5wcm9wcy51cmx9XG4gICAgICAgICAgICAgICAgZmllbGRNYXA9e3RoaXMucHJvcHMuZmllbGRNYXB9XG4gICAgICAgICAgICAgICAgdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXB9Lz47XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZpZWxkU2VsZWN0aW9uOyIsImZ1bmN0aW9uIElucHV0RmllbGRzKHByb3BzKSB7XG4gICAgY29uc3Qge2ZpZWxkTWFwLCB1cmx9ID0gcHJvcHM7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm1vZF9qc29uX3JlbmRlcl91cmxcIiB2YWx1ZT17dXJsfS8+XG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJtb2RfanNvbl9yZW5kZXJfZmllbGRtYXBcIiB2YWx1ZT17SlNPTi5zdHJpbmdpZnkoZmllbGRNYXApfS8+XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IElucHV0RmllbGRzOyIsImZ1bmN0aW9uIExpc3RJdGVtKHByb3BzKSB7XG4gICAgY29uc3Qge3ZhbHVlLCBjaGlsZHJlbiwgZmllbGRNYXAsIG9iamVjdCwgb25DbGlja1RpdGxlLCBvbkNsaWNrQ29udGVudCwgb25DbGlja0NvbnRhaW5lcn0gPSBwcm9wcztcblxuICAgIGlmIChjaGlsZHJlbikge1xuICAgICAgICByZXR1cm4gKDxsaT5cbiAgICAgICAgICAgIHtBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgPHNwYW4+PHNwYW4gY2xhc3NOYW1lPVwiZGFzaGljb25zIGRhc2hpY29ucy1wb3J0Zm9saW9cIj48L3NwYW4+IHt2YWx1ZX0gPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJ0cmVlLXNlbGVjdFwiIGRhdGEtZmllbGQ9XCJpdGVtQ29udGFpbmVyXCIgb25DbGljaz17b25DbGlja0NvbnRhaW5lcn0+U2VsZWN0PC9hPjwvc3Bhbj4gOiAgPHNwYW4+e3ZhbHVlfTwvc3Bhbj59XG4gICAgICAgICAgICA8dWw+e2NoaWxkcmVufTwvdWw+XG4gICAgICAgIDwvbGk+KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKDxsaT5cbiAgICAgICAgICAgIHtmaWVsZE1hcC50aXRsZSA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLnRpdGxlID8gPHN0cm9uZz5UaXRsZTogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgICAgICB7ZmllbGRNYXAuY29udGVudCA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLmNvbnRlbnQgPyA8c3Ryb25nPkNvbnRlbnQ6IDwvc3Ryb25nPiA6ICcnfVxuICAgICAgICAgICAgPHNwYW4+e3ZhbHVlfTwvc3Bhbj5cbiAgICAgICAgICAgIHshZmllbGRNYXAudGl0bGUgJiYgKGZpZWxkTWFwLmNvbnRlbnQgIT09IG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJ0cmVlLXNlbGVjdFwiIGRhdGEtZmllbGQ9XCJ0aXRsZVwiIG9uQ2xpY2s9e29uQ2xpY2tUaXRsZX0+VGl0bGU8L2E+IDogJyd9XG4gICAgICAgICAgICB7IWZpZWxkTWFwLmNvbnRlbnQgJiYgKGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgP1xuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwidHJlZS1zZWxlY3RcIiBkYXRhLWZpZWxkPVwiY29udGVudFwiIG9uQ2xpY2s9e29uQ2xpY2tDb250ZW50fT5Db250ZW50PC9hPiA6ICcnfVxuICAgICAgICA8L2xpPik7XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMaXN0SXRlbTsiLCJpbXBvcnQgRmllbGRTZWxlY3Rpb24gZnJvbSAnLi9GaWVsZFNlbGVjdGlvbic7XG5pbXBvcnQgSW5wdXRGaWVsZHMgZnJvbSAnLi9JbnB1dEZpZWxkcyc7XG5pbXBvcnQgU3VtbWFyeSBmcm9tICcuL1N1bW1hcnknO1xuXG5jbGFzcyBTZXR0aW5ncyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHVybDogJycsXG4gICAgICAgICAgICBmaWVsZE1hcDoge1xuICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy51cmxDaGFuZ2UgPSB0aGlzLnVybENoYW5nZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmhhbmRsZVN1Ym1pdCA9IHRoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucmVzZXRPcHRpb25zID0gdGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy51cGRhdGVGaWVsZE1hcCA9IHRoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cblxuICAgIGluaXRPcHRpb25zKCkge1xuICAgICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dXJsOiBldmVudC50YXJnZXQudmFsdWV9KTtcbiAgICB9XG5cbiAgICBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7c2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsIHVybDogJycsIGZpZWxkTWFwOiB7aXRlbUNvbnRhaW5lcjogbnVsbCwgdGl0bGU6ICcnLCBjb250ZW50OiAnJ319KTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmllbGRNYXA6IG5ld1ZhbH0pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3Nob3dGaWVsZFNlbGVjdGlvbiwgdXJsfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IHtpdGVtQ29udGFpbmVyLCB0aXRsZSwgY29udGVudH0gPSB0aGlzLnN0YXRlLmZpZWxkTWFwO1xuXG4gICAgICAgIGlmICh1cmwgJiYgaXRlbUNvbnRhaW5lciAhPT0gbnVsbCAmJiB0aXRsZSAmJiBjb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxTdW1tYXJ5IHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnN9IGNsYXNzTmFtZT1cImJ1dHRvblwiPlJlc2V0IHNldHRpbmdzPC9hPjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxGaWVsZFNlbGVjdGlvbiB1cmw9e3VybH0gZmllbGRNYXA9e3RoaXMuc3RhdGUuZmllbGRNYXB9IHVwZGF0ZUZpZWxkTWFwPXt0aGlzLnVwZGF0ZUZpZWxkTWFwfS8+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPHA+PGEgaHJlZj1cIiNcIiBvbkNsaWNrPXt0aGlzLnJlc2V0T3B0aW9uc30gY2xhc3NOYW1lPVwiYnV0dG9uXCI+UmVzZXQgc2V0dGluZ3M8L2E+PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3cmFwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxmb3JtIG9uU3VibWl0PXt0aGlzLmhhbmRsZVN1Ym1pdH0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+RGF0YSBzb3VyY2U8L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGk+RW50ZXIgYSB2YWxpZCBKU09OIGFwaSB1cmwuPC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3NOYW1lPVwidXJsLWlucHV0XCIgdmFsdWU9e3VybH0gb25DaGFuZ2U9e3RoaXMudXJsQ2hhbmdlfS8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD48aW5wdXQgdHlwZT1cInN1Ym1pdFwiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tcHJpbWFyeVwiIHZhbHVlPVwiU3VibWl0XCIvPjwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBTZXR0aW5nczsiLCJmdW5jdGlvbiBTdW1tYXJ5KHByb3BzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIDxzdHJvbmc+RGF0YSBzb3VyY2U8L3N0cm9uZz48YnIvPlxuICAgICAgICAgICAgICAgIDxhIGhyZWY9e3Byb3BzLnVybH0gdGFyZ2V0PVwiX2JsYW5rXCI+e3Byb3BzLnVybH08L2E+XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICA8c3Ryb25nPlRpdGxlPC9zdHJvbmc+PGJyLz5cbiAgICAgICAgICAgICAgICB7cHJvcHMuZmllbGRNYXAudGl0bGUucmVwbGFjZSgnLicsICcg4oCTPiAnKX1cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIDxzdHJvbmc+Q29udGVudDwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICAgICAge3Byb3BzLmZpZWxkTWFwLmNvbnRlbnQucmVwbGFjZSgnLicsICcg4oCTPiAnKX1cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgU3VtbWFyeTsiLCJpbXBvcnQgU2V0dGluZ3MgZnJvbSAnLi9Db21wb25lbnRzL1NldHRpbmdzJztcblxuY29uc3QgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG5jb25zdCBkb21FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kSnNvblJlbmRlckVsZW1lbnQpO1xuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPFNldHRpbmdzIC8+LFxuICAgIGRvbUVsZW1lbnRcbik7IiwiZnVuY3Rpb24gZ2V0QXBpRGF0YSh1cmwpIHtcbiAgICByZXR1cm4gZmV0Y2godXJsKVxuICAgICAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcbiAgICAgICAgLnRoZW4oXG4gICAgICAgICAgICAocmVzdWx0KSA9PiAoe3Jlc3VsdH0pLFxuICAgICAgICAgICAgKGVycm9yKSA9PiAoe2Vycm9yfSlcbiAgICAgICAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZ2V0QXBpRGF0YTtcbiJdfQ==

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdChwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnJlbmRlck5vZGVzID0gX3RoaXMucmVuZGVyTm9kZXMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMuc2V0RmllbGRNYXAgPSBfdGhpcy5zZXRGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGlmIChpdGVtID09PSAnb2JqZWN0UGF0aCcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY2hpbGQgPSBSZWFjdC5jcmVhdGVFbGVtZW50KF9MaXN0SXRlbS5kZWZhdWx0LCB7XG4gICAgICAgICAga2V5OiBpdGVtLnRvU3RyaW5nKCksXG4gICAgICAgICAgdmFsdWU6IGl0ZW0sXG4gICAgICAgICAgb2JqZWN0OiBkYXRhW2l0ZW1dLFxuICAgICAgICAgIGZpZWxkTWFwOiBfdGhpczIucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgb25DbGlja0NvbnRhaW5lcjogZnVuY3Rpb24gb25DbGlja0NvbnRhaW5lcihlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb25DbGlja0NvbnRlbnQ6IGZ1bmN0aW9uIG9uQ2xpY2tDb250ZW50KGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczIuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoX3R5cGVvZihkYXRhW2l0ZW1dKSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzMi5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvciA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGZvciAodmFyIF9pdGVyYXRvciA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChkYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSAoX3N0ZXAgPSBfaXRlcmF0b3IubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWUpIHtcbiAgICAgICAgICAgIHZhciBfc3RlcCR2YWx1ZSA9IF9zdGVwLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwJHZhbHVlLnBhcmVudCxcbiAgICAgICAgICAgICAgICBub2RlID0gX3N0ZXAkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcCR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwJHZhbHVlLnBhdGg7XG5cbiAgICAgICAgICAgIGlmIChfdHlwZW9mKG5vZGUpID09PSAnb2JqZWN0JyAmJiBub2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgX2RpZEl0ZXJhdG9yRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gJiYgX2l0ZXJhdG9yLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvci5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yKSB7XG4gICAgICAgICAgICAgIHRocm93IF9pdGVyYXRvckVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCBpdGVtcyBjb250YWluZXJcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcImpzb24tdHJlZVwiXG4gICAgICAgIH0sIHRoaXMucmVuZGVyTm9kZXMoZGF0YSkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBvYmplY3REYXRhID0gX29iamVjdFBhdGguZGVmYXVsdC5nZXQodGhpcy5wcm9wcy5kYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3REYXRhKSkge1xuICAgICAgICAgIG9iamVjdERhdGEgPSBvYmplY3REYXRhWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yMiA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChvYmplY3REYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwMiR2YWx1ZSA9IF9zdGVwMi52YWx1ZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBfc3RlcDIkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcDIkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcDIkdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgIHBhdGggPSBfc3RlcDIkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHZhciBfcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuXG4gICAgICAgICAgICAgIF9vYmplY3RQYXRoLmRlZmF1bHQuc2V0KG9iamVjdERhdGEsIF9wYXRoU3RyaW5nLCBfcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yMiA9IGVycjtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvcjIucmV0dXJuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCB0aXRsZSBhbmQgY29udGVudCBmaWVsZHNcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcImpzb24tdHJlZVwiXG4gICAgICAgIH0sIHRoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRGF0YUxpc3Q7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IERhdGFMaXN0O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9MaXN0SXRlbVwiOjcsXCJvYmplY3QtcGF0aFwiOjEsXCJyZWN1cnNpdmUtaXRlcmF0b3JcIjoyfV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9EYXRhTGlzdCA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRGF0YUxpc3RcIikpO1xuXG52YXIgX2dldEFwaURhdGEgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRmllbGRTZWxlY3Rpb24gPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKEZpZWxkU2VsZWN0aW9uLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBGaWVsZFNlbGVjdGlvbihwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBGaWVsZFNlbGVjdGlvbik7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihGaWVsZFNlbGVjdGlvbikuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuICAgIF90aGlzLnVwZGF0ZUZpZWxkTWFwID0gX3RoaXMudXBkYXRlRmllbGRNYXAuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKEZpZWxkU2VsZWN0aW9uLCBbe1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImdldERhdGFcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0RGF0YSgpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgdXJsID0gdGhpcy5wcm9wcy51cmw7XG4gICAgICAoMCwgX2dldEFwaURhdGEuZGVmYXVsdCkodXJsKS50aGVuKGZ1bmN0aW9uIChfcmVmKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBfcmVmLnJlc3VsdDtcblxuICAgICAgICBpZiAoIXJlc3VsdCB8fCBPYmplY3Qua2V5cyhyZXN1bHQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgICBlcnJvcjogRXJyb3IoJ0NvdWxkIG5vdCBmZXRjaCBkYXRhIGZyb20gVVJMLicpLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgaXRlbXM6IHJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgIH0sIGZ1bmN0aW9uIChfcmVmMikge1xuICAgICAgICB2YXIgZXJyb3IgPSBfcmVmMi5lcnJvcjtcblxuICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgIGlzTG9hZGVkOiB0cnVlLFxuICAgICAgICAgIGVycm9yOiBlcnJvclxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuZ2V0RGF0YSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBlcnJvciA9IF90aGlzJHN0YXRlLmVycm9yLFxuICAgICAgICAgIGlzTG9hZGVkID0gX3RoaXMkc3RhdGUuaXNMb2FkZWQsXG4gICAgICAgICAgaXRlbXMgPSBfdGhpcyRzdGF0ZS5pdGVtcztcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFwiRXJyb3I6IFwiLCBlcnJvci5tZXNzYWdlKSk7XG4gICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcInNwaW5uZXIgaXMtYWN0aXZlXCJcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChfRGF0YUxpc3QuZGVmYXVsdCwge1xuICAgICAgICAgIGRhdGE6IGl0ZW1zLFxuICAgICAgICAgIHVybDogdGhpcy5wcm9wcy51cmwsXG4gICAgICAgICAgZmllbGRNYXA6IHRoaXMucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIEZpZWxkU2VsZWN0aW9uO1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBGaWVsZFNlbGVjdGlvbjtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCI6MTEsXCIuL0RhdGFMaXN0XCI6NH1dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIElucHV0RmllbGRzKHByb3BzKSB7XG4gIHZhciBmaWVsZE1hcCA9IHByb3BzLmZpZWxkTWFwLFxuICAgICAgdXJsID0gcHJvcHMudXJsO1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgIHR5cGU6IFwiaGlkZGVuXCIsXG4gICAgbmFtZTogXCJtb2RfanNvbl9yZW5kZXJfdXJsXCIsXG4gICAgdmFsdWU6IHVybFxuICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcImhpZGRlblwiLFxuICAgIG5hbWU6IFwibW9kX2pzb25fcmVuZGVyX2ZpZWxkbWFwXCIsXG4gICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KGZpZWxkTWFwKVxuICB9KSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IElucHV0RmllbGRzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIExpc3RJdGVtKHByb3BzKSB7XG4gIHZhciB2YWx1ZSA9IHByb3BzLnZhbHVlLFxuICAgICAgY2hpbGRyZW4gPSBwcm9wcy5jaGlsZHJlbixcbiAgICAgIGZpZWxkTWFwID0gcHJvcHMuZmllbGRNYXAsXG4gICAgICBvYmplY3QgPSBwcm9wcy5vYmplY3QsXG4gICAgICBvbkNsaWNrVGl0bGUgPSBwcm9wcy5vbkNsaWNrVGl0bGUsXG4gICAgICBvbkNsaWNrQ29udGVudCA9IHByb3BzLm9uQ2xpY2tDb250ZW50LFxuICAgICAgb25DbGlja0NvbnRhaW5lciA9IHByb3BzLm9uQ2xpY2tDb250YWluZXI7XG5cbiAgaWYgKGNoaWxkcmVuKSB7XG4gICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgIGNsYXNzTmFtZTogXCJkYXNoaWNvbnMgZGFzaGljb25zLXBvcnRmb2xpb1wiXG4gICAgfSksIFwiIFwiLCB2YWx1ZSwgXCIgXCIsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgY2xhc3NOYW1lOiBcInRyZWUtc2VsZWN0XCIsXG4gICAgICBcImRhdGEtZmllbGRcIjogXCJpdGVtQ29udGFpbmVyXCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGFpbmVyXG4gICAgfSwgXCJTZWxlY3RcIikpIDogUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgY2hpbGRyZW4pKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIG51bGwsIGZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgJiYgZmllbGRNYXAudGl0bGUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiVGl0bGU6IFwiKSA6ICcnLCBmaWVsZE1hcC5jb250ZW50ID09PSBvYmplY3QgJiYgZmllbGRNYXAuY29udGVudCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJDb250ZW50OiBcIikgOiAnJywgUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCAhZmllbGRNYXAudGl0bGUgJiYgZmllbGRNYXAuY29udGVudCAhPT0gb2JqZWN0ICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICBocmVmOiBcIiNcIixcbiAgICAgIGNsYXNzTmFtZTogXCJ0cmVlLXNlbGVjdFwiLFxuICAgICAgXCJkYXRhLWZpZWxkXCI6IFwidGl0bGVcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tUaXRsZVxuICAgIH0sIFwiVGl0bGVcIikgOiAnJywgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcImNvbnRlbnRcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tDb250ZW50XG4gICAgfSwgXCJDb250ZW50XCIpIDogJycpO1xuICB9XG59XG5cbnZhciBfZGVmYXVsdCA9IExpc3RJdGVtO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbnZhciBfRmllbGRTZWxlY3Rpb24gPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0ZpZWxkU2VsZWN0aW9uXCIpKTtcblxudmFyIF9JbnB1dEZpZWxkcyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vSW5wdXRGaWVsZHNcIikpO1xuXG52YXIgX1N1bW1hcnkgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL1N1bW1hcnlcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9XG5cbmZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKGNhbGwgJiYgKF90eXBlb2YoY2FsbCkgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikpIHsgcmV0dXJuIGNhbGw7IH0gcmV0dXJuIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZik7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxudmFyIFNldHRpbmdzID1cbi8qI19fUFVSRV9fKi9cbmZ1bmN0aW9uIChfUmVhY3QkQ29tcG9uZW50KSB7XG4gIF9pbmhlcml0cyhTZXR0aW5ncywgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgZnVuY3Rpb24gU2V0dGluZ3MocHJvcHMpIHtcbiAgICB2YXIgX3RoaXM7XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU2V0dGluZ3MpO1xuXG4gICAgX3RoaXMgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCBfZ2V0UHJvdG90eXBlT2YoU2V0dGluZ3MpLmNhbGwodGhpcywgcHJvcHMpKTtcbiAgICBfdGhpcy5zdGF0ZSA9IHtcbiAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gICAgICB1cmw6ICcnLFxuICAgICAgZmllbGRNYXA6IHtcbiAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgfVxuICAgIH07XG4gICAgX3RoaXMudXJsQ2hhbmdlID0gX3RoaXMudXJsQ2hhbmdlLmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIF90aGlzLmhhbmRsZVN1Ym1pdCA9IF90aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICBfdGhpcy5yZXNldE9wdGlvbnMgPSBfdGhpcy5yZXNldE9wdGlvbnMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMudXBkYXRlRmllbGRNYXAgPSBfdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoU2V0dGluZ3MsIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbml0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0T3B0aW9ucygpIHtcbiAgICAgIGlmICh0eXBlb2YgbW9kSnNvblJlbmRlci5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IG1vZEpzb25SZW5kZXIub3B0aW9ucztcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVybENoYW5nZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB1cmw6IGV2ZW50LnRhcmdldC52YWx1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImhhbmRsZVN1Ym1pdFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVzZXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICB1cmw6ICcnLFxuICAgICAgICBmaWVsZE1hcDoge1xuICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdmFyIG5ld1ZhbCA9IE9iamVjdC5hc3NpZ24odGhpcy5zdGF0ZS5maWVsZE1hcCwgdmFsdWUpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGZpZWxkTWFwOiBuZXdWYWxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb24gPSBfdGhpcyRzdGF0ZS5zaG93RmllbGRTZWxlY3Rpb24sXG4gICAgICAgICAgdXJsID0gX3RoaXMkc3RhdGUudXJsO1xuICAgICAgdmFyIF90aGlzJHN0YXRlJGZpZWxkTWFwID0gdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICBpdGVtQ29udGFpbmVyID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuaXRlbUNvbnRhaW5lcixcbiAgICAgICAgICB0aXRsZSA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLnRpdGxlLFxuICAgICAgICAgIGNvbnRlbnQgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC5jb250ZW50O1xuXG4gICAgICBpZiAodXJsICYmIGl0ZW1Db250YWluZXIgIT09IG51bGwgJiYgdGl0bGUgJiYgY29udGVudCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9TdW1tYXJ5LmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgICAgIG9uQ2xpY2s6IHRoaXMucmVzZXRPcHRpb25zLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCBcIlJlc2V0IHNldHRpbmdzXCIpKSk7XG4gICAgICB9IGVsc2UgaWYgKHNob3dGaWVsZFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9GaWVsZFNlbGVjdGlvbi5kZWZhdWx0LCB7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZmllbGRNYXA6IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXBcbiAgICAgICAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgaHJlZjogXCIjXCIsXG4gICAgICAgICAgb25DbGljazogdGhpcy5yZXNldE9wdGlvbnMsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvblwiXG4gICAgICAgIH0sIFwiUmVzZXQgc2V0dGluZ3NcIikpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwid3JhcFwiXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIsIHtcbiAgICAgICAgICBvblN1Ym1pdDogdGhpcy5oYW5kbGVTdWJtaXRcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImxhYmVsXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJEYXRhIHNvdXJjZVwiKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwgbnVsbCwgXCJFbnRlciBhIHZhbGlkIEpTT04gYXBpIHVybC5cIikpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJ1cmwtaW5wdXRcIixcbiAgICAgICAgICB2YWx1ZTogdXJsLFxuICAgICAgICAgIG9uQ2hhbmdlOiB0aGlzLnVybENoYW5nZVxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICAgICAgICB0eXBlOiBcInN1Ym1pdFwiLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b24gYnV0dG9uLXByaW1hcnlcIixcbiAgICAgICAgICB2YWx1ZTogXCJTdWJtaXRcIlxuICAgICAgICB9KSkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIFNldHRpbmdzO1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBTZXR0aW5ncztcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4vRmllbGRTZWxlY3Rpb25cIjo1LFwiLi9JbnB1dEZpZWxkc1wiOjYsXCIuL1N1bW1hcnlcIjo5fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gU3VtbWFyeShwcm9wcykge1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiRGF0YSBzb3VyY2VcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgIGhyZWY6IHByb3BzLnVybCxcbiAgICB0YXJnZXQ6IFwiX2JsYW5rXCJcbiAgfSwgcHJvcHMudXJsKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJUaXRsZVwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBwcm9wcy5maWVsZE1hcC50aXRsZS5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIkNvbnRlbnRcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgcHJvcHMuZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IFN1bW1hcnk7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sMTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfU2V0dGluZ3MgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG52YXIgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcblJlYWN0RE9NLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KF9TZXR0aW5ncy5kZWZhdWx0LCBudWxsKSwgZG9tRWxlbWVudCk7XG5cbn0se1wiLi9Db21wb25lbnRzL1NldHRpbmdzXCI6OH1dLDExOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICByZXR1cm4gZmV0Y2godXJsKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICByZXR1cm4gcmVzLmpzb24oKTtcbiAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgfTtcbiAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yOiBlcnJvclxuICAgIH07XG4gIH0pO1xufVxuXG52YXIgX2RlZmF1bHQgPSBnZXRBcGlEYXRhO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dfSx7fSxbMTBdKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YjJKcVpXTjBMWEJoZEdndmFXNWtaWGd1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12Y21WamRYSnphWFpsTFdsMFpYSmhkRzl5TDNOeVl5OVNaV04xY25OcGRtVkpkR1Z5WVhSdmNpNXFjeUlzSW01dlpHVmZiVzlrZFd4bGN5OXlaV04xY25OcGRtVXRhWFJsY21GMGIzSXZjM0pqTDJ4aGJtY3Vhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5RVlYUmhUR2x6ZEM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMFpwWld4a1UyVnNaV04wYVc5dUxtcHpJaXdpYzI5MWNtTmxMMnB6TDBGa2JXbHVMME52YlhCdmJtVnVkSE12U1c1d2RYUkdhV1ZzWkhNdWFuTWlMQ0p6YjNWeVkyVXZhbk12UVdSdGFXNHZRMjl0Y0c5dVpXNTBjeTlNYVhOMFNYUmxiUzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5RGIyMXdiMjVsYm5SekwxTmxkSFJwYm1kekxtcHpJaXdpYzI5MWNtTmxMMnB6TDBGa2JXbHVMME52YlhCdmJtVnVkSE12VTNWdGJXRnllUzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5SmJtUmxlRUZrYldsdUxtcHpJaXdpYzI5MWNtTmxMMnB6TDFWMGFXeHBkR2xsY3k5blpYUkJjR2xFWVhSaExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOd1UwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU55U1VFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN096czdPenM3T3p0QlF5OUVRVHM3UVVGRFFUczdRVUZEUVRzN096czdPenM3T3pzN096czdPenM3T3pzN096czdPMGxCUlUwc1VUczdPenM3UVVGRFJpeHZRa0ZCV1N4TFFVRmFMRVZCUVcxQ08wRkJRVUU3TzBGQlFVRTdPMEZCUTJZc2EwWkJRVTBzUzBGQlRqdEJRVU5CTEZWQlFVc3NWMEZCVEN4SFFVRnRRaXhOUVVGTExGZEJRVXdzUTBGQmFVSXNTVUZCYWtJc2RVUkJRVzVDTzBGQlEwRXNWVUZCU3l4WFFVRk1MRWRCUVcxQ0xFMUJRVXNzVjBGQlRDeERRVUZwUWl4SlFVRnFRaXgxUkVGQmJrSTdRVUZJWlR0QlFVbHNRanM3T3p0blEwRkZWeXhKTEVWQlFVMHNTeXhGUVVGUE8wRkJRM0pDTEUxQlFVRXNTMEZCU3l4RFFVRkRMR05CUVU0N1FVRkRRU3hYUVVGTExFdEJRVXdzUTBGQlZ5eGpRVUZZTEhGQ1FVRTBRaXhMUVVGTExFTkJRVU1zVFVGQlRpeERRVUZoTEU5QlFXSXNRMEZCY1VJc1MwRkJha1FzUlVGQmVVUXNTVUZCZWtRN1FVRkRTRHM3TzJkRFFVVlhMRWtzUlVGQlRUdEJRVUZCT3p0QlFVTmtMR0ZCUVU4c1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeEpRVUZhTEVWQlFXdENMRWRCUVd4Q0xFTkJRWE5DTEZWQlFVRXNTVUZCU1N4RlFVRkpPMEZCUTJwRExGbEJRVWtzU1VGQlNTeExRVUZMTEZsQlFXSXNSVUZCTWtJN1FVRkRka0k3UVVGRFNEczdRVUZGUkN4WlFVRkpMRXRCUVVzc1IwRkJSeXh2UWtGQlF5eHBRa0ZCUkR0QlFVRlZMRlZCUVVFc1IwRkJSeXhGUVVGRkxFbEJRVWtzUTBGQlF5eFJRVUZNTEVWQlFXWTdRVUZEVlN4VlFVRkJMRXRCUVVzc1JVRkJSU3hKUVVScVFqdEJRVVZWTEZWQlFVRXNUVUZCVFN4RlFVRkZMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJSblJDTzBGQlIxVXNWVUZCUVN4UlFVRlJMRVZCUVVVc1RVRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFJRVWd2UWp0QlFVbFZMRlZCUVVFc1owSkJRV2RDTEVWQlFVVXNNRUpCUVVFc1EwRkJRenRCUVVGQkxHMUNRVUZKTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NRMEZCVnl4VlFVRTFRaXhGUVVGM1F5eERRVUY0UXl4RFFVRktPMEZCUVVFc1YwRktOMEk3UVVGTFZTeFZRVUZCTEZsQlFWa3NSVUZCUlN4elFrRkJRU3hEUVVGRE8wRkJRVUVzYlVKQlFVa3NUVUZCU1N4RFFVRkRMRmRCUVV3c1EwRkJhVUlzU1VGQlNTeERRVUZETEVsQlFVUXNRMEZCY2tJc1JVRkJOa0lzUTBGQk4wSXNRMEZCU2p0QlFVRkJMRmRCVEhwQ08wRkJUVlVzVlVGQlFTeGpRVUZqTEVWQlFVVXNkMEpCUVVFc1EwRkJRenRCUVVGQkxHMUNRVUZKTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFYSkNMRVZCUVRaQ0xFTkJRVGRDTEVOQlFVbzdRVUZCUVR0QlFVNHpRaXhWUVVGYU96dEJRVkZCTEZsQlFVa3NVVUZCVHl4SlFVRkpMRU5CUVVNc1NVRkJSQ3hEUVVGWUxFMUJRWE5DTEZGQlFYUkNMRWxCUVd0RExFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NTMEZCWlN4SlFVRnlSQ3hGUVVFeVJEdEJRVU4yUkN4VlFVRkJMRXRCUVVzc1IwRkJSeXhMUVVGTExFTkJRVU1zV1VGQlRpeERRVUZ0UWl4TFFVRnVRaXhGUVVFd1FqdEJRVU01UWl4WlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVd4Q0xFbEJRVFJDTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NRMEZCVnl4RFFVRllMRU5CUVdwQ0xFTkJRVFZDTEVkQlFUaEVMRTFCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVhKQ08wRkJSREZETEZkQlFURkNMRU5CUVZJN1FVRkhTRHM3UVVGRlJDeGxRVUZQTEV0QlFWQTdRVUZEU0N4UFFYQkNUU3hEUVVGUU8wRkJjVUpJT3pzN05rSkJSVkU3UVVGRFRDeFZRVUZOTEZGQlFWRXNSMEZCUnl4TFFVRkxMRXRCUVV3c1EwRkJWeXhSUVVFMVFqdEJRVVZCTEZWQlFVa3NTVUZCU1N4SFFVRkhMRXRCUVVzc1MwRkJUQ3hEUVVGWExFbEJRWFJDT3p0QlFVTkJMRlZCUVVrc1MwRkJTeXhEUVVGRExFOUJRVTRzUTBGQll5eEpRVUZrTEVOQlFVb3NSVUZCZVVJN1FVRkRja0lzVVVGQlFTeFJRVUZSTEVOQlFVTXNZVUZCVkN4SFFVRjVRaXhGUVVGNlFqdEJRVU5JT3p0QlFVVkVMRlZCUVVrc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCTDBJc1JVRkJjVU03UVVGRGFrTXNXVUZCU1N4TFFVRkxMRU5CUVVNc1QwRkJUaXhEUVVGakxFbEJRV1FzUTBGQlNpeEZRVUY1UWp0QlFVTnlRaXhWUVVGQkxFbEJRVWtzUjBGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUkN4RFFVRllPMEZCUTBnN08wRkJTR2RETzBGQlFVRTdRVUZCUVRzN1FVRkJRVHRCUVV0cVF5d3JRa0ZCYzBNc1NVRkJTU3d3UWtGQlNpeERRVUZ6UWl4SlFVRjBRaXhEUVVGMFF5dzRTRUZCYlVVN1FVRkJRVHRCUVVGQkxHZENRVUY2UkN4TlFVRjVSQ3hsUVVGNlJDeE5RVUY1UkR0QlFVRkJMR2RDUVVGcVJDeEpRVUZwUkN4bFFVRnFSQ3hKUVVGcFJEdEJRVUZCTEdkQ1FVRXpReXhIUVVFeVF5eGxRVUV6UXl4SFFVRXlRenRCUVVGQkxHZENRVUYwUXl4SlFVRnpReXhsUVVGMFF5eEpRVUZ6UXpzN1FVRkRMMFFzWjBKQlFVa3NVVUZCVHl4SlFVRlFMRTFCUVdkQ0xGRkJRV2hDTEVsQlFUUkNMRWxCUVVrc1MwRkJTeXhKUVVGNlF5eEZRVUVyUXp0QlFVTXpReXhyUWtGQlNTeFZRVUZWTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVV3c1EwRkJWU3hIUVVGV0xFTkJRV3BDT3p0QlFVTkJMR3REUVVGWExFZEJRVmdzUTBGQlpTeEpRVUZtTEVWQlFYRkNMRlZCUVZVc1IwRkJSeXhoUVVGc1F5eEZRVUZwUkN4VlFVRnFSRHRCUVVOSU8wRkJRMG83UVVGV1owTTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHM3UVVGWmFrTXNaVUZEU1N4cFEwRkRTU3g1UkVGRVNpeEZRVVZKTzBGQlFVa3NWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJaQ3hYUVVFeVFpeExRVUZMTEZkQlFVd3NRMEZCYVVJc1NVRkJha0lzUTBGQk0wSXNRMEZHU2l4RFFVUktPMEZCVFVnc1QwRnNRa1FzVFVGclFrODdRVUZEU0N4WlFVRkpMRlZCUVZVc1IwRkJSeXh2UWtGQlZ5eEhRVUZZTEVOQlFXVXNTMEZCU3l4TFFVRk1MRU5CUVZjc1NVRkJNVUlzUlVGQlowTXNVVUZCVVN4RFFVRkRMR0ZCUVhwRExFTkJRV3BDT3p0QlFVVkJMRmxCUVVrc1MwRkJTeXhEUVVGRExFOUJRVTRzUTBGQll5eFZRVUZrTEVOQlFVb3NSVUZCSzBJN1FVRkRNMElzVlVGQlFTeFZRVUZWTEVkQlFVY3NWVUZCVlN4RFFVRkRMRU5CUVVRc1EwRkJka0k3UVVGRFNEczdRVUZNUlR0QlFVRkJPMEZCUVVFN08wRkJRVUU3UVVGUFNDeG5RMEZCYzBNc1NVRkJTU3d3UWtGQlNpeERRVUZ6UWl4VlFVRjBRaXhEUVVGMFF5eHRTVUZCZVVVN1FVRkJRVHRCUVVGQkxHZENRVUV2UkN4TlFVRXJSQ3huUWtGQkwwUXNUVUZCSzBRN1FVRkJRU3huUWtGQmRrUXNTVUZCZFVRc1owSkJRWFpFTEVsQlFYVkVPMEZCUVVFc1owSkJRV3BFTEVkQlFXbEVMR2RDUVVGcVJDeEhRVUZwUkR0QlFVRkJMR2RDUVVFMVF5eEpRVUUwUXl4blFrRkJOVU1zU1VGQk5FTTdPMEZCUTNKRkxHZENRVUZKTEZGQlFVOHNTVUZCVUN4TlFVRm5RaXhSUVVGd1FpeEZRVUU0UWp0QlFVTXhRaXhyUWtGQlNTeFhRVUZWTEVkQlFVY3NTVUZCU1N4RFFVRkRMRWxCUVV3c1EwRkJWU3hIUVVGV0xFTkJRV3BDT3p0QlFVTkJMR3REUVVGWExFZEJRVmdzUTBGQlpTeFZRVUZtTEVWQlFUSkNMRmRCUVROQ0xFVkJRWFZETEZkQlFYWkRPMEZCUTBnN1FVRkRTanRCUVZwRk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdPMEZCWTBnc1pVRkRTU3hwUTBGRFNTeHJSVUZFU2l4RlFVVkpPMEZCUVVrc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlpDeFhRVUV5UWl4TFFVRkxMRmRCUVV3c1EwRkJhVUlzVlVGQmFrSXNRMEZCTTBJc1EwRkdTaXhEUVVSS08wRkJUVWc3UVVGRFNqczdPenRGUVc1R2EwSXNTMEZCU3l4RFFVRkRMRk03TzJWQmMwWmtMRkU3T3pzN096czdPenM3TzBGRE1VWm1PenRCUVVOQk96czdPenM3T3pzN096czdPenM3T3pzN096czdPMGxCUlUwc1l6czdPenM3UVVGRFJpd3dRa0ZCV1N4TFFVRmFMRVZCUVcxQ08wRkJRVUU3TzBGQlFVRTdPMEZCUTJZc2QwWkJRVTBzUzBGQlRqdEJRVU5CTEZWQlFVc3NTMEZCVEN4SFFVRmhPMEZCUTFRc1RVRkJRU3hMUVVGTExFVkJRVVVzU1VGRVJUdEJRVVZVTEUxQlFVRXNVVUZCVVN4RlFVRkZMRXRCUmtRN1FVRkhWQ3hOUVVGQkxFdEJRVXNzUlVGQlJUdEJRVWhGTEV0QlFXSTdRVUZOUVN4VlFVRkxMR05CUVV3c1IwRkJjMElzVFVGQlN5eGpRVUZNTEVOQlFXOUNMRWxCUVhCQ0xIVkVRVUYwUWp0QlFWSmxPMEZCVTJ4Q096czdPMjFEUVVWakxFc3NSVUZCVHp0QlFVTnNRaXhYUVVGTExFdEJRVXdzUTBGQlZ5eGpRVUZZTEVOQlFUQkNMRXRCUVRGQ08wRkJRMGc3T3pzNFFrRkZVenRCUVVGQk96dEJRVUZCTEZWQlEwTXNSMEZFUkN4SFFVTlJMRXRCUVVzc1MwRkVZaXhEUVVORExFZEJSRVE3UVVGRlRpd3JRa0ZCVnl4SFFVRllMRVZCUTBzc1NVRkVUQ3hEUVVWUkxHZENRVUZqTzBGQlFVRXNXVUZCV2l4TlFVRlpMRkZCUVZvc1RVRkJXVHM3UVVGRFZpeFpRVUZKTEVOQlFVTXNUVUZCUkN4SlFVRlhMRTFCUVUwc1EwRkJReXhKUVVGUUxFTkJRVmtzVFVGQldpeEZRVUZ2UWl4TlFVRndRaXhMUVVFclFpeERRVUU1UXl4RlFVRnBSRHRCUVVNM1F5eFZRVUZCTEUxQlFVa3NRMEZCUXl4UlFVRk1MRU5CUVdNN1FVRkRWaXhaUVVGQkxFdEJRVXNzUlVGQlJTeExRVUZMTEVOQlFVTXNaME5CUVVRc1EwRkVSanRCUVVWV0xGbEJRVUVzVVVGQlVTeEZRVUZGTzBGQlJrRXNWMEZCWkRzN1FVRkpRVHRCUVVOSU96dEJRVU5FTEZGQlFVRXNUVUZCU1N4RFFVRkRMRkZCUVV3c1EwRkJZenRCUVVGRExGVkJRVUVzVVVGQlVTeEZRVUZGTEVsQlFWZzdRVUZCYVVJc1ZVRkJRU3hMUVVGTExFVkJRVVU3UVVGQmVFSXNVMEZCWkR0QlFVTklMRTlCV0ZRc1JVRlhWeXhwUWtGQllUdEJRVUZCTEZsQlFWZ3NTMEZCVnl4VFFVRllMRXRCUVZjN08wRkJRMW9zVVVGQlFTeE5RVUZKTEVOQlFVTXNVVUZCVEN4RFFVRmpPMEZCUVVNc1ZVRkJRU3hSUVVGUkxFVkJRVVVzU1VGQldEdEJRVUZwUWl4VlFVRkJMRXRCUVVzc1JVRkJURHRCUVVGcVFpeFRRVUZrTzBGQlEwZ3NUMEZpVkR0QlFXVklPenM3ZDBOQlJXMUNPMEZCUTJoQ0xGZEJRVXNzVDBGQlREdEJRVU5JT3pzN05rSkJSVkU3UVVGQlFTeDNRa0ZETkVJc1MwRkJTeXhMUVVScVF6dEJRVUZCTEZWQlEwVXNTMEZFUml4bFFVTkZMRXRCUkVZN1FVRkJRU3hWUVVOVExGRkJSRlFzWlVGRFV5eFJRVVJVTzBGQlFVRXNWVUZEYlVJc1MwRkVia0lzWlVGRGJVSXNTMEZFYmtJN08wRkJSVXdzVlVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVUN4bFFVRlBMR2xEUVVGTExEQkRRVUZYTEV0QlFVc3NRMEZCUXl4UFFVRnFRaXhEUVVGTUxFTkJRVkE3UVVGRFNDeFBRVVpFTEUxQlJVOHNTVUZCU1N4RFFVRkRMRkZCUVV3c1JVRkJaVHRCUVVOc1FpeGxRVUZQTzBGQlFVc3NWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJaaXhWUVVGUU8wRkJRMGdzVDBGR1RTeE5RVVZCTzBGQlEwZ3NaVUZCVHl4dlFrRkJReXhwUWtGQlJEdEJRVU5JTEZWQlFVRXNTVUZCU1N4RlFVRkZMRXRCUkVnN1FVRkZTQ3hWUVVGQkxFZEJRVWNzUlVGQlJTeExRVUZMTEV0QlFVd3NRMEZCVnl4SFFVWmlPMEZCUjBnc1ZVRkJRU3hSUVVGUkxFVkJRVVVzUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZJYkVJN1FVRkpTQ3hWUVVGQkxHTkJRV01zUlVGQlJTeExRVUZMTzBGQlNteENMRlZCUVZBN1FVRkxTRHRCUVVOS096czdPMFZCY0VSM1FpeExRVUZMTEVOQlFVTXNVenM3WlVGMVJIQkNMR003T3pzN096czdPenM3TzBGRE1VUm1MRk5CUVZNc1YwRkJWQ3hEUVVGeFFpeExRVUZ5UWl4RlFVRTBRanRCUVVGQkxFMUJRMnBDTEZGQlJHbENMRWRCUTBFc1MwRkVRU3hEUVVOcVFpeFJRVVJwUWp0QlFVRkJMRTFCUTFBc1IwRkVUeXhIUVVOQkxFdEJSRUVzUTBGRFVDeEhRVVJQTzBGQlJYaENMRk5CUTBrc2FVTkJRMGs3UVVGQlR5eEpRVUZCTEVsQlFVa3NSVUZCUXl4UlFVRmFPMEZCUVhGQ0xFbEJRVUVzU1VGQlNTeEZRVUZETEhGQ1FVRXhRanRCUVVGblJDeEpRVUZCTEV0QlFVc3NSVUZCUlR0QlFVRjJSQ3hKUVVSS0xFVkJSVWs3UVVGQlR5eEpRVUZCTEVsQlFVa3NSVUZCUXl4UlFVRmFPMEZCUVhGQ0xFbEJRVUVzU1VGQlNTeEZRVUZETERCQ1FVRXhRanRCUVVGeFJDeEpRVUZCTEV0QlFVc3NSVUZCUlN4SlFVRkpMRU5CUVVNc1UwRkJUQ3hEUVVGbExGRkJRV1k3UVVGQk5VUXNTVUZHU2l4RFFVUktPMEZCVFVnN08yVkJSV01zVnpzN096czdPenM3T3pzN1FVTldaaXhUUVVGVExGRkJRVlFzUTBGQmEwSXNTMEZCYkVJc1JVRkJlVUk3UVVGQlFTeE5RVU5rTEV0QlJHTXNSMEZEZFVVc1MwRkVka1VzUTBGRFpDeExRVVJqTzBGQlFVRXNUVUZEVUN4UlFVUlBMRWRCUTNWRkxFdEJSSFpGTEVOQlExQXNVVUZFVHp0QlFVRkJMRTFCUTBjc1VVRkVTQ3hIUVVOMVJTeExRVVIyUlN4RFFVTkhMRkZCUkVnN1FVRkJRU3hOUVVOaExFMUJSR0lzUjBGRGRVVXNTMEZFZGtVc1EwRkRZU3hOUVVSaU8wRkJRVUVzVFVGRGNVSXNXVUZFY2tJc1IwRkRkVVVzUzBGRWRrVXNRMEZEY1VJc1dVRkVja0k3UVVGQlFTeE5RVU50UXl4alFVUnVReXhIUVVOMVJTeExRVVIyUlN4RFFVTnRReXhqUVVSdVF6dEJRVUZCTEUxQlEyMUVMR2RDUVVSdVJDeEhRVU4xUlN4TFFVUjJSU3hEUVVOdFJDeG5Ra0ZFYmtRN08wRkJSM0pDTEUxQlFVa3NVVUZCU2l4RlFVRmpPMEZCUTFZc1YwRkJVU3huUTBGRFNDeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRTFCUVdRc1MwRkJlVUlzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJjRVFzUjBGRFJ5eHJRMEZCVFR0QlFVRk5MRTFCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV2hDTEUxQlFVNHNUMEZCSzBRc1MwRkJMMFFzVDBGQmMwVTdRVUZCUnl4TlFVRkJMRWxCUVVrc1JVRkJReXhIUVVGU08wRkJRVmtzVFVGQlFTeFRRVUZUTEVWQlFVTXNZVUZCZEVJN1FVRkJiME1zYjBKQlFWY3NaVUZCTDBNN1FVRkJLMFFzVFVGQlFTeFBRVUZQTEVWQlFVVTdRVUZCZUVVc1owSkJRWFJGTEVOQlJFZ3NSMEZEZDB3c2EwTkJRVThzUzBGQlVDeERRVVp5VEN4RlFVZEtMR2REUVVGTExGRkJRVXdzUTBGSVNTeERRVUZTTzBGQlMwZ3NSMEZPUkN4TlFVMVBPMEZCUTBnc1YwRkJVU3huUTBGRFNDeFJRVUZSTEVOQlFVTXNTMEZCVkN4TFFVRnRRaXhOUVVGdVFpeEpRVUUyUWl4UlFVRlJMRU5CUVVNc1MwRkJkRU1zUjBGQk9FTXNPRU5CUVRsRExFZEJRWGxGTEVWQlJIUkZMRVZCUlVnc1VVRkJVU3hEUVVGRExFOUJRVlFzUzBGQmNVSXNUVUZCY2tJc1NVRkJLMElzVVVGQlVTeERRVUZETEU5QlFYaERMRWRCUVd0RUxHZEVRVUZzUkN4SFFVRXJSU3hGUVVZMVJTeEZRVWRLTEd0RFFVRlBMRXRCUVZBc1EwRklTU3hGUVVsSUxFTkJRVU1zVVVGQlVTeERRVUZETEV0QlFWWXNTVUZCYjBJc1VVRkJVU3hEUVVGRExFOUJRVlFzUzBGQmNVSXNUVUZCZWtNc1NVRkJiMFFzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJMMFVzUjBGRFJ6dEJRVUZITEUxQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hOUVVGQkxGTkJRVk1zUlVGQlF5eGhRVUYwUWp0QlFVRnZReXh2UWtGQlZ5eFBRVUV2UXp0QlFVRjFSQ3hOUVVGQkxFOUJRVThzUlVGQlJUdEJRVUZvUlN4bFFVUklMRWRCUXpaR0xFVkJUREZHTEVWQlRVZ3NRMEZCUXl4UlFVRlJMRU5CUVVNc1QwRkJWaXhKUVVGelFpeFJRVUZSTEVOQlFVTXNTMEZCVkN4TFFVRnRRaXhOUVVGNlF5eEpRVUZ2UkN4UlFVRlJMRU5CUVVNc1lVRkJWQ3hMUVVFeVFpeEpRVUV2UlN4SFFVTkhPMEZCUVVjc1RVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEUxQlFVRXNVMEZCVXl4RlFVRkRMR0ZCUVhSQ08wRkJRVzlETEc5Q1FVRlhMRk5CUVM5RE8wRkJRWGxFTEUxQlFVRXNUMEZCVHl4RlFVRkZPMEZCUVd4RkxHbENRVVJJTEVkQlEyMUhMRVZCVUdoSExFTkJRVkk3UVVGVFNEdEJRVU5LT3p0bFFVVmpMRkU3T3pzN096czdPenM3TzBGRGRFSm1PenRCUVVOQk96dEJRVU5CT3pzN096czdPenM3T3pzN096czdPenM3T3pzN08wbEJSVTBzVVRzN096czdRVUZEUml4dlFrRkJXU3hMUVVGYUxFVkJRVzFDTzBGQlFVRTdPMEZCUVVFN08wRkJRMllzYTBaQlFVMHNTMEZCVGp0QlFVTkJMRlZCUVVzc1MwRkJUQ3hIUVVGaE8wRkJRMVFzVFVGQlFTeHJRa0ZCYTBJc1JVRkJSU3hMUVVSWU8wRkJSVlFzVFVGQlFTeEhRVUZITEVWQlFVVXNSVUZHU1R0QlFVZFVMRTFCUVVFc1VVRkJVU3hGUVVGRk8wRkJRMDRzVVVGQlFTeGhRVUZoTEVWQlFVVXNTVUZFVkR0QlFVVk9MRkZCUVVFc1MwRkJTeXhGUVVGRkxFVkJSa1E3UVVGSFRpeFJRVUZCTEU5QlFVOHNSVUZCUlR0QlFVaElPMEZCU0VRc1MwRkJZanRCUVZWQkxGVkJRVXNzVTBGQlRDeEhRVUZwUWl4TlFVRkxMRk5CUVV3c1EwRkJaU3hKUVVGbUxIVkVRVUZxUWp0QlFVTkJMRlZCUVVzc1dVRkJUQ3hIUVVGdlFpeE5RVUZMTEZsQlFVd3NRMEZCYTBJc1NVRkJiRUlzZFVSQlFYQkNPMEZCUTBFc1ZVRkJTeXhaUVVGTUxFZEJRVzlDTEUxQlFVc3NXVUZCVEN4RFFVRnJRaXhKUVVGc1FpeDFSRUZCY0VJN1FVRkRRU3hWUVVGTExHTkJRVXdzUjBGQmMwSXNUVUZCU3l4alFVRk1MRU5CUVc5Q0xFbEJRWEJDTEhWRVFVRjBRanRCUVdabE8wRkJaMEpzUWpzN096dDNRMEZGYlVJN1FVRkRhRUlzVjBGQlN5eFhRVUZNTzBGQlEwZzdPenRyUTBGRllUdEJRVU5XTEZWQlFVa3NUMEZCVHl4aFFVRmhMRU5CUVVNc1QwRkJja0lzUzBGQmFVTXNWMEZCY2tNc1JVRkJhMFE3UVVGRE9VTXNXVUZCVFN4UFFVRlBMRWRCUVVjc1lVRkJZU3hEUVVGRExFOUJRVGxDTzBGQlEwRXNZVUZCU3l4UlFVRk1MRU5CUVdNN1FVRkRWaXhWUVVGQkxFZEJRVWNzUlVGQlJTeFBRVUZQTEVOQlFVTXNSMEZCVWl4SFFVRmpMRTlCUVU4c1EwRkJReXhIUVVGMFFpeEhRVUUwUWl4RlFVUjJRanRCUVVWV0xGVkJRVUVzVVVGQlVTeEZRVUZGTEU5QlFVOHNRMEZCUXl4UlFVRlNMRWRCUVcxQ0xFbEJRVWtzUTBGQlF5eExRVUZNTEVOQlFWY3NUMEZCVHl4RFFVRkRMRkZCUVc1Q0xFTkJRVzVDTEVkQlFXdEVPMEZCUTNoRUxGbEJRVUVzWVVGQllTeEZRVUZGTEVsQlJIbERPMEZCUlhoRUxGbEJRVUVzUzBGQlN5eEZRVUZGTEVWQlJtbEVPMEZCUjNoRUxGbEJRVUVzVDBGQlR5eEZRVUZGTzBGQlNDdERMRmRCUm14RU8wRkJUMVlzVlVGQlFTeHJRa0ZCYTBJc1JVRkJSU3hEUVVGRExFTkJRVU1zVDBGQlR5eERRVUZETzBGQlVIQkNMRk5CUVdRN1FVRlRTRHRCUVVOS096czdPRUpCUlZNc1N5eEZRVUZQTzBGQlEySXNWMEZCU3l4UlFVRk1MRU5CUVdNN1FVRkJReXhSUVVGQkxFZEJRVWNzUlVGQlJTeExRVUZMTEVOQlFVTXNUVUZCVGl4RFFVRmhPMEZCUVc1Q0xFOUJRV1E3UVVGRFNEczdPMmxEUVVWWkxFc3NSVUZCVHp0QlFVTm9RaXhOUVVGQkxFdEJRVXNzUTBGQlF5eGpRVUZPTzBGQlEwRXNWMEZCU3l4UlFVRk1MRU5CUVdNN1FVRkJReXhSUVVGQkxHdENRVUZyUWl4RlFVRkZPMEZCUVhKQ0xFOUJRV1E3UVVGRFNEczdPMmxEUVVWWkxFc3NSVUZCVHp0QlFVTm9RaXhOUVVGQkxFdEJRVXNzUTBGQlF5eGpRVUZPTzBGQlEwRXNWMEZCU3l4UlFVRk1MRU5CUVdNN1FVRkJReXhSUVVGQkxHdENRVUZyUWl4RlFVRkZMRXRCUVhKQ08wRkJRVFJDTEZGQlFVRXNSMEZCUnl4RlFVRkZMRVZCUVdwRE8wRkJRWEZETEZGQlFVRXNVVUZCVVN4RlFVRkZPMEZCUVVNc1ZVRkJRU3hoUVVGaExFVkJRVVVzU1VGQmFFSTdRVUZCYzBJc1ZVRkJRU3hMUVVGTExFVkJRVVVzUlVGQk4wSTdRVUZCYVVNc1ZVRkJRU3hQUVVGUExFVkJRVVU3UVVGQk1VTTdRVUZCTDBNc1QwRkJaRHRCUVVOSU96czdiVU5CUldNc1N5eEZRVUZQTzBGQlEyeENMRlZCUVUwc1RVRkJUU3hIUVVGSExFMUJRVTBzUTBGQlF5eE5RVUZRTEVOQlFXTXNTMEZCU3l4TFFVRk1MRU5CUVZjc1VVRkJla0lzUlVGQmJVTXNTMEZCYmtNc1EwRkJaanRCUVVOQkxGZEJRVXNzVVVGQlRDeERRVUZqTzBGQlFVTXNVVUZCUVN4UlFVRlJMRVZCUVVVN1FVRkJXQ3hQUVVGa08wRkJRMGc3T3pzMlFrRkZVVHRCUVVGQkxIZENRVU0yUWl4TFFVRkxMRXRCUkd4RE8wRkJRVUVzVlVGRFJTeHJRa0ZFUml4bFFVTkZMR3RDUVVSR08wRkJRVUVzVlVGRGMwSXNSMEZFZEVJc1pVRkRjMElzUjBGRWRFSTdRVUZCUVN4cFEwRkZiVU1zUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZHT1VNN1FVRkJRU3hWUVVWRkxHRkJSa1lzZDBKQlJVVXNZVUZHUmp0QlFVRkJMRlZCUldsQ0xFdEJSbXBDTEhkQ1FVVnBRaXhMUVVacVFqdEJRVUZCTEZWQlJYZENMRTlCUm5oQ0xIZENRVVYzUWl4UFFVWjRRanM3UVVGSlRDeFZRVUZKTEVkQlFVY3NTVUZCU1N4aFFVRmhMRXRCUVVzc1NVRkJla0lzU1VGQmFVTXNTMEZCYWtNc1NVRkJNRU1zVDBGQk9VTXNSVUZCZFVRN1FVRkRia1FzWlVGRFNTeHBRMEZEU1N4dlFrRkJReXhuUWtGQlJDeEZRVUZoTEV0QlFVc3NTMEZCYkVJc1EwRkVTaXhGUVVWSkxHOUNRVUZETEc5Q1FVRkVMRVZCUVdsQ0xFdEJRVXNzUzBGQmRFSXNRMEZHU2l4RlFVZEpMQ3RDUVVGSE8wRkJRVWNzVlVGQlFTeEpRVUZKTEVWQlFVTXNSMEZCVWp0QlFVRlpMRlZCUVVFc1QwRkJUeXhGUVVGRkxFdEJRVXNzV1VGQk1VSTdRVUZCZDBNc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQmJFUXNORUpCUVVnc1EwRklTaXhEUVVSS08wRkJUMGdzVDBGU1JDeE5RVkZQTEVsQlFVa3NhMEpCUVVvc1JVRkJkMEk3UVVGRE0wSXNaVUZEU1N4cFEwRkRTU3h2UWtGQlF5eDFRa0ZCUkR0QlFVRm5RaXhWUVVGQkxFZEJRVWNzUlVGQlJTeEhRVUZ5UWp0QlFVRXdRaXhWUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVRXZRenRCUVVGNVJDeFZRVUZCTEdOQlFXTXNSVUZCUlN4TFFVRkxPMEZCUVRsRkxGVkJSRW9zUlVGRlNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CUmtvc1JVRkhTU3dyUWtGQlJ6dEJRVUZITEZWQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hWUVVGQkxFOUJRVThzUlVGQlJTeExRVUZMTEZsQlFURkNPMEZCUVhkRExGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFXeEVMRFJDUVVGSUxFTkJTRW9zUTBGRVNqdEJRVTlJTEU5QlVrMHNUVUZSUVR0QlFVTklMR1ZCUTBrN1FVRkJTeXhWUVVGQkxGTkJRVk1zUlVGQlF6dEJRVUZtTEZkQlEwazdRVUZCVFN4VlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGTE8wRkJRWEpDTEZkQlEwa3NLMEpCUTBrc2JVTkJRMGtzYTBSQlJFb3NRMEZFU2l4RlFVbEpMQ3RDUVVwS0xFVkJTMGtzTmtSQlRFb3NRMEZFU2l4RlFWRkpPMEZCUVU4c1ZVRkJRU3hKUVVGSkxFVkJRVU1zVFVGQldqdEJRVUZ0UWl4VlFVRkJMRk5CUVZNc1JVRkJReXhYUVVFM1FqdEJRVUY1UXl4VlFVRkJMRXRCUVVzc1JVRkJSU3hIUVVGb1JEdEJRVUZ4UkN4VlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGTE8wRkJRWEJGTEZWQlVrb3NSVUZUU1N3clFrRkJSenRCUVVGUExGVkJRVUVzU1VGQlNTeEZRVUZETEZGQlFWbzdRVUZCY1VJc1ZVRkJRU3hUUVVGVExFVkJRVU1zZFVKQlFTOUNPMEZCUVhWRUxGVkJRVUVzUzBGQlN5eEZRVUZETzBGQlFUZEVMRlZCUVVnc1EwRlVTaXhEUVVSS0xFVkJXVWtzYjBKQlFVTXNiMEpCUVVRc1JVRkJhVUlzUzBGQlN5eExRVUYwUWl4RFFWcEtMRU5CUkVvN1FVRm5Ra2c3UVVGRFNqczdPenRGUVM5R2EwSXNTMEZCU3l4RFFVRkRMRk03TzJWQmEwZGtMRkU3T3pzN096czdPenM3TzBGRGRFZG1MRk5CUVZNc1QwRkJWQ3hEUVVGcFFpeExRVUZxUWl4RlFVRjNRanRCUVVOd1FpeFRRVU5KTEdsRFFVTkpMQ3RDUVVOSkxHdEVRVVJLTEVWQlEyZERMQ3RDUVVSb1F5eEZRVVZKTzBGQlFVY3NTVUZCUVN4SlFVRkpMRVZCUVVVc1MwRkJTeXhEUVVGRExFZEJRV1k3UVVGQmIwSXNTVUZCUVN4TlFVRk5MRVZCUVVNN1FVRkJNMElzUzBGQmNVTXNTMEZCU3l4RFFVRkRMRWRCUVRORExFTkJSa29zUTBGRVNpeEZRVXRKTEN0Q1FVTkpMRFJEUVVSS0xFVkJRekJDTEN0Q1FVUXhRaXhGUVVWTExFdEJRVXNzUTBGQlF5eFJRVUZPTEVOQlFXVXNTMEZCWml4RFFVRnhRaXhQUVVGeVFpeERRVUUyUWl4SFFVRTNRaXhGUVVGclF5eE5RVUZzUXl4RFFVWk1MRU5CVEVvc1JVRlRTU3dyUWtGRFNTdzRRMEZFU2l4RlFVTTBRaXdyUWtGRU5VSXNSVUZGU3l4TFFVRkxMRU5CUVVNc1VVRkJUaXhEUVVGbExFOUJRV1lzUTBGQmRVSXNUMEZCZGtJc1EwRkJLMElzUjBGQkwwSXNSVUZCYjBNc1RVRkJjRU1zUTBGR1RDeERRVlJLTEVOQlJFbzdRVUZuUWtnN08yVkJSV01zVHpzN096czdPMEZEYmtKbU96czdPMEZCUlVFc1NVRkJUU3h2UWtGQmIwSXNSMEZCUnl4M1FrRkJOMEk3UVVGRFFTeEpRVUZOTEZWQlFWVXNSMEZCUnl4UlFVRlJMRU5CUVVNc1kwRkJWQ3hEUVVGM1FpeHZRa0ZCZUVJc1EwRkJia0k3UVVGRlFTeFJRVUZSTEVOQlFVTXNUVUZCVkN4RFFVTkpMRzlDUVVGRExHbENRVUZFTEU5QlJFb3NSVUZGU1N4VlFVWktPenM3T3pzN096czdPMEZEVEVFc1UwRkJVeXhWUVVGVUxFTkJRVzlDTEVkQlFYQkNMRVZCUVhsQ08wRkJRM0pDTEZOQlFVOHNTMEZCU3l4RFFVRkRMRWRCUVVRc1EwRkJUQ3hEUVVOR0xFbEJSRVVzUTBGRFJ5eFZRVUZCTEVkQlFVYzdRVUZCUVN4WFFVRkpMRWRCUVVjc1EwRkJReXhKUVVGS0xFVkJRVW83UVVGQlFTeEhRVVJPTEVWQlJVWXNTVUZHUlN4RFFVZERMRlZCUVVNc1RVRkJSRHRCUVVGQkxGZEJRV0U3UVVGQlF5eE5RVUZCTEUxQlFVMHNSVUZCVGp0QlFVRkVMRXRCUVdJN1FVRkJRU3hIUVVoRUxFVkJTVU1zVlVGQlF5eExRVUZFTzBGQlFVRXNWMEZCV1R0QlFVRkRMRTFCUVVFc1MwRkJTeXhGUVVGTU8wRkJRVVFzUzBGQldqdEJRVUZCTEVkQlNrUXNRMEZCVUR0QlFVMUlPenRsUVVWakxGVWlMQ0ptYVd4bElqb2laMlZ1WlhKaGRHVmtMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSWlobWRXNWpkR2x2YmlncGUyWjFibU4wYVc5dUlISW9aU3h1TEhRcGUyWjFibU4wYVc5dUlHOG9hU3htS1h0cFppZ2hibHRwWFNsN2FXWW9JV1ZiYVYwcGUzWmhjaUJqUFZ3aVpuVnVZM1JwYjI1Y0lqMDlkSGx3Wlc5bUlISmxjWFZwY21VbUpuSmxjWFZwY21VN2FXWW9JV1ltSm1NcGNtVjBkWEp1SUdNb2FTd2hNQ2s3YVdZb2RTbHlaWFIxY200Z2RTaHBMQ0V3S1R0MllYSWdZVDF1WlhjZ1JYSnliM0lvWENKRFlXNXViM1FnWm1sdVpDQnRiMlIxYkdVZ0oxd2lLMmtyWENJblhDSXBPM1JvY205M0lHRXVZMjlrWlQxY0lrMVBSRlZNUlY5T1QxUmZSazlWVGtSY0lpeGhmWFpoY2lCd1BXNWJhVjA5ZTJWNGNHOXlkSE02ZTMxOU8yVmJhVjFiTUYwdVkyRnNiQ2h3TG1WNGNHOXlkSE1zWm5WdVkzUnBiMjRvY2lsN2RtRnlJRzQ5WlZ0cFhWc3hYVnR5WFR0eVpYUjFjbTRnYnlodWZIeHlLWDBzY0N4d0xtVjRjRzl5ZEhNc2NpeGxMRzRzZENsOWNtVjBkWEp1SUc1YmFWMHVaWGh3YjNKMGMzMW1iM0lvZG1GeUlIVTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaU3hwUFRBN2FUeDBMbXhsYm1kMGFEdHBLeXNwYnloMFcybGRLVHR5WlhSMWNtNGdiMzF5WlhSMWNtNGdjbjBwS0NraUxDSW9ablZ1WTNScGIyNGdLSEp2YjNRc0lHWmhZM1J2Y25rcGUxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNWNiaUFnTHlwcGMzUmhibUoxYkNCcFoyNXZjbVVnYm1WNGREcGpZVzUwSUhSbGMzUXFMMXh1SUNCcFppQW9kSGx3Wlc5bUlHMXZaSFZzWlNBOVBUMGdKMjlpYW1WamRDY2dKaVlnZEhsd1pXOW1JRzF2WkhWc1pTNWxlSEJ2Y25SeklEMDlQU0FuYjJKcVpXTjBKeWtnZTF4dUlDQWdJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdabUZqZEc5eWVTZ3BPMXh1SUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCa1pXWnBibVVnUFQwOUlDZG1kVzVqZEdsdmJpY2dKaVlnWkdWbWFXNWxMbUZ0WkNrZ2UxeHVJQ0FnSUM4dklFRk5SQzRnVW1WbmFYTjBaWElnWVhNZ1lXNGdZVzV2Ym5sdGIzVnpJRzF2WkhWc1pTNWNiaUFnSUNCa1pXWnBibVVvVzEwc0lHWmhZM1J2Y25rcE8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDOHZJRUp5YjNkelpYSWdaMnh2WW1Gc2MxeHVJQ0FnSUhKdmIzUXViMkpxWldOMFVHRjBhQ0E5SUdaaFkzUnZjbmtvS1R0Y2JpQWdmVnh1ZlNrb2RHaHBjeXdnWm5WdVkzUnBiMjRvS1h0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dVhHNGdJSFpoY2lCMGIxTjBjaUE5SUU5aWFtVmpkQzV3Y205MGIzUjVjR1V1ZEc5VGRISnBibWM3WEc0Z0lHWjFibU4wYVc5dUlHaGhjMDkzYmxCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUdsbUtHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJWY2JpQWdJQ0I5WEc0Z0lDQWdMeTkwYnlCb1lXNWtiR1VnYjJKcVpXTjBjeUIzYVhSb0lHNTFiR3dnY0hKdmRHOTBlWEJsY3lBb2RHOXZJR1ZrWjJVZ1kyRnpaVDhwWEc0Z0lDQWdjbVYwZFhKdUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWFHRnpUM2R1VUhKdmNHVnlkSGt1WTJGc2JDaHZZbW9zSUhCeWIzQXBYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJwYzBWdGNIUjVLSFpoYkhWbEtYdGNiaUFnSUNCcFppQW9JWFpoYkhWbEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLR2x6UVhKeVlYa29kbUZzZFdVcElDWW1JSFpoYkhWbExteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpUdGNiaUFnSUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCMllXeDFaU0FoUFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0JwYmlCMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0doaGMwOTNibEJ5YjNCbGNuUjVLSFpoYkhWbExDQnBLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnZEc5VGRISnBibWNvZEhsd1pTbDdYRzRnSUNBZ2NtVjBkWEp1SUhSdlUzUnlMbU5oYkd3b2RIbHdaU2s3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCcGMwOWlhbVZqZENodlltb3BlMXh1SUNBZ0lISmxkSFZ5YmlCMGVYQmxiMllnYjJKcUlEMDlQU0FuYjJKcVpXTjBKeUFtSmlCMGIxTjBjbWx1Wnlodlltb3BJRDA5UFNCY0lsdHZZbXBsWTNRZ1QySnFaV04wWFZ3aU8xeHVJQ0I5WEc1Y2JpQWdkbUZ5SUdselFYSnlZWGtnUFNCQmNuSmhlUzVwYzBGeWNtRjVJSHg4SUdaMWJtTjBhVzl1S0c5aWFpbDdYRzRnSUNBZ0x5cHBjM1JoYm1KMWJDQnBaMjV2Y21VZ2JtVjRkRHBqWVc1MElIUmxjM1FxTDF4dUlDQWdJSEpsZEhWeWJpQjBiMU4wY2k1allXeHNLRzlpYWlrZ1BUMDlJQ2RiYjJKcVpXTjBJRUZ5Y21GNVhTYzdYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJwYzBKdmIyeGxZVzRvYjJKcUtYdGNiaUFnSUNCeVpYUjFjbTRnZEhsd1pXOW1JRzlpYWlBOVBUMGdKMkp2YjJ4bFlXNG5JSHg4SUhSdlUzUnlhVzVuS0c5aWFpa2dQVDA5SUNkYmIySnFaV04wSUVKdmIyeGxZVzVkSnp0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHZGxkRXRsZVNoclpYa3BlMXh1SUNBZ0lIWmhjaUJwYm5STFpYa2dQU0J3WVhKelpVbHVkQ2hyWlhrcE8xeHVJQ0FnSUdsbUlDaHBiblJMWlhrdWRHOVRkSEpwYm1jb0tTQTlQVDBnYTJWNUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2FXNTBTMlY1TzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2EyVjVPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWm1GamRHOXllU2h2Y0hScGIyNXpLU0I3WEc0Z0lDQWdiM0IwYVc5dWN5QTlJRzl3ZEdsdmJuTWdmSHdnZTMxY2JseHVJQ0FnSUhaaGNpQnZZbXBsWTNSUVlYUm9JRDBnWm5WdVkzUnBiMjRvYjJKcUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1QySnFaV04wTG10bGVYTW9iMkpxWldOMFVHRjBhQ2t1Y21Wa2RXTmxLR1oxYm1OMGFXOXVLSEJ5YjNoNUxDQndjbTl3S1NCN1hHNGdJQ0FnSUNBZ0lHbG1LSEJ5YjNBZ1BUMDlJQ2RqY21WaGRHVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhCeWIzaDVPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0x5cHBjM1JoYm1KMWJDQnBaMjV2Y21VZ1pXeHpaU292WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2IySnFaV04wVUdGMGFGdHdjbTl3WFNBOVBUMGdKMloxYm1OMGFXOXVKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lIQnliM2g1VzNCeWIzQmRJRDBnYjJKcVpXTjBVR0YwYUZ0d2NtOXdYUzVpYVc1a0tHOWlhbVZqZEZCaGRHZ3NJRzlpYWlrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2ZUhrN1hHNGdJQ0FnSUNCOUxDQjdmU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJR1oxYm1OMGFXOXVJR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUFvYjNCMGFXOXVjeTVwYm1Oc2RXUmxTVzVvWlhKcGRHVmtVSEp2Y0hNZ2ZId2dLSFI1Y0dWdlppQndjbTl3SUQwOVBTQW5iblZ0WW1WeUp5QW1KaUJCY25KaGVTNXBjMEZ5Y21GNUtHOWlhaWtwSUh4OElHaGhjMDkzYmxCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrcFhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnWjJWMFUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltcGJjSEp2Y0YwN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJWMEtHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2w3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhCaGRHZ2dQVDA5SUNkdWRXMWlaWEluS1NCN1hHNGdJQ0FnSUNBZ0lIQmhkR2dnUFNCYmNHRjBhRjA3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmlBb0lYQmhkR2dnZkh3Z2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhanRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhObGRDaHZZbW9zSUhCaGRHZ3VjM0JzYVhRb0p5NG5LUzV0WVhBb1oyVjBTMlY1S1N3Z2RtRnNkV1VzSUdSdlRtOTBVbVZ3YkdGalpTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRkJoZEdnZ1BTQndZWFJvV3pCZE8xeHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUldZV3gxWlNBOUlHZGxkRk5vWVd4c2IzZFFjbTl3WlhKMGVTaHZZbW9zSUdOMWNuSmxiblJRWVhSb0tUdGNiaUFnSUNBZ0lHbG1JQ2h3WVhSb0xteGxibWQwYUNBOVBUMGdNU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9ZM1Z5Y21WdWRGWmhiSFZsSUQwOVBTQjJiMmxrSURBZ2ZId2dJV1J2VG05MFVtVndiR0ZqWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWx0amRYSnlaVzUwVUdGMGFGMGdQU0IyWVd4MVpUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZM1Z5Y21WdWRGWmhiSFZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9ZM1Z5Y21WdWRGWmhiSFZsSUQwOVBTQjJiMmxrSURBcElIdGNiaUFnSUNBZ0lDQWdMeTlqYUdWamF5QnBaaUIzWlNCaGMzTjFiV1VnWVc0Z1lYSnlZWGxjYmlBZ0lDQWdJQ0FnYVdZb2RIbHdaVzltSUhCaGRHaGJNVjBnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcVcyTjFjbkpsYm5SUVlYUm9YU0E5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWx0amRYSnlaVzUwVUdGMGFGMGdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWx0amRYSnlaVzUwVUdGMGFGMHNJSEJoZEdndWMyeHBZMlVvTVNrc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VhR0Z6SUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDa2dlMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYm5WdFltVnlKeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnVzNCaGRHaGRPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJSEJoZEdndWMzQnNhWFFvSnk0bktUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0NGd1lYUm9JSHg4SUhCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBaElXOWlhanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCd1lYUm9MbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJxSUQwZ1oyVjBTMlY1S0hCaGRHaGJhVjBwTzF4dVhHNGdJQ0FnSUNBZ0lHbG1LQ2gwZVhCbGIyWWdhaUE5UFQwZ0oyNTFiV0psY2ljZ0ppWWdhWE5CY25KaGVTaHZZbW9wSUNZbUlHb2dQQ0J2WW1vdWJHVnVaM1JvS1NCOGZGeHVJQ0FnSUNBZ0lDQWdJQ2h2Y0hScGIyNXpMbWx1WTJ4MVpHVkpibWhsY21sMFpXUlFjbTl3Y3lBL0lDaHFJR2x1SUU5aWFtVmpkQ2h2WW1vcEtTQTZJR2hoYzA5M2JsQnliM0JsY25SNUtHOWlhaXdnYWlrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcUlEMGdiMkpxVzJwZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVsYm5OMWNtVkZlR2x6ZEhNZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTbDdYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJSFJ5ZFdVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ0E5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBlMXh1SUNBZ0lDQWdjbVYwZFhKdUlITmxkQ2h2WW1vc0lIQmhkR2dzSUhaaGJIVmxMQ0JrYjA1dmRGSmxjR3hoWTJVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtbHVjMlZ5ZENBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ3NJSFpoYkhWbExDQmhkQ2w3WEc0Z0lDQWdJQ0IyWVhJZ1lYSnlJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9LVHRjYmlBZ0lDQWdJR0YwSUQwZ2ZuNWhkRHRjYmlBZ0lDQWdJR2xtSUNnaGFYTkJjbkpoZVNoaGNuSXBLU0I3WEc0Z0lDQWdJQ0FnSUdGeWNpQTlJRnRkTzF4dUlDQWdJQ0FnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ2h2WW1vc0lIQmhkR2dzSUdGeWNpazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQmhjbkl1YzNCc2FXTmxLR0YwTENBd0xDQjJZV3gxWlNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndVpXMXdkSGtnUFNCbWRXNWpkR2x2Ymlodlltb3NJSEJoZEdncElIdGNiaUFnSUNBZ0lHbG1JQ2hwYzBWdGNIUjVLSEJoZEdncEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjJiMmxrSURBN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhadmFXUWdNRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsTENCcE8xeHVJQ0FnSUNBZ2FXWWdLQ0VvZG1Gc2RXVWdQU0J2WW1wbFkzUlFZWFJvTG1kbGRDaHZZbW9zSUhCaGRHZ3BLU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZG05cFpDQXdPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhaaGJIVmxJRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENBbkp5azdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2x6UW05dmJHVmhiaWgyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBlWEJsYjJZZ2RtRnNkV1VnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lEQXBPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzBGeWNtRjVLSFpoYkhWbEtTa2dlMXh1SUNBZ0lDQWdJQ0IyWVd4MVpTNXNaVzVuZEdnZ1BTQXdPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzA5aWFtVmpkQ2gyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnWm05eUlDaHBJR2x1SUhaaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2gyWVd4MVpTd2dhU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsYkdWMFpTQjJZV3gxWlZ0cFhUdGNiaUFnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJRzUxYkd3cE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xuQjFjMmdnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb0lDOHFMQ0IyWVd4MVpYTWdLaThwZTF4dUlDQWdJQ0FnZG1GeUlHRnljaUE5SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQ2s3WEc0Z0lDQWdJQ0JwWmlBb0lXbHpRWEp5WVhrb1lYSnlLU2tnZTF4dUlDQWdJQ0FnSUNCaGNuSWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENCaGNuSXBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JoY25JdWNIVnphQzVoY0hCc2VTaGhjbklzSUVGeWNtRjVMbkJ5YjNSdmRIbHdaUzV6YkdsalpTNWpZV3hzS0dGeVozVnRaVzUwY3l3Z01pa3BPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQnZZbXBsWTNSUVlYUm9MbU52WVd4bGMyTmxJRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUhNc0lHUmxabUYxYkhSV1lXeDFaU2tnZTF4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsTzF4dVhHNGdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNQ3dnYkdWdUlEMGdjR0YwYUhNdWJHVnVaM1JvT3lCcElEd2diR1Z1T3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tDaDJZV3gxWlNBOUlHOWlhbVZqZEZCaGRHZ3VaMlYwS0c5aWFpd2djR0YwYUhOYmFWMHBLU0FoUFQwZ2RtOXBaQ0F3S1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCa1pXWmhkV3gwVm1Gc2RXVTdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VaMlYwSUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDd2daR1ZtWVhWc2RGWmhiSFZsS1h0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdjR0YwYUNBOUlGdHdZWFJvWFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDZ2hjR0YwYUNCOGZDQndZWFJvTG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJrWldaaGRXeDBWbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbWRsZENodlltb3NJSEJoZEdndWMzQnNhWFFvSnk0bktTd2daR1ZtWVhWc2RGWmhiSFZsS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlFZWFJvSUQwZ1oyVjBTMlY1S0hCaGRHaGJNRjBwTzF4dUlDQWdJQ0FnZG1GeUlHNWxlSFJQWW1vZ1BTQm5aWFJUYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCamRYSnlaVzUwVUdGMGFDbGNiaUFnSUNBZ0lHbG1JQ2h1WlhoMFQySnFJRDA5UFNCMmIybGtJREFwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptRjFiSFJXWVd4MVpUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdVpYaDBUMkpxTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxVzJOMWNuSmxiblJRWVhSb1hTd2djR0YwYUM1emJHbGpaU2d4S1N3Z1pHVm1ZWFZzZEZaaGJIVmxLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVrWld3Z1BTQm1kVzVqZEdsdmJpQmtaV3dvYjJKcUxDQndZWFJvS1NCN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQmJjR0YwYUYwN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2h2WW1vZ1BUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2FYTkZiWEIwZVNod1lYUm9LU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbVJsYkNodlltb3NJSEJoZEdndWMzQnNhWFFvSnk0bktTazdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwVUdGMGFDQTlJR2RsZEV0bGVTaHdZWFJvV3pCZEtUdGNiaUFnSUNBZ0lHbG1JQ2doYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2dZM1Z5Y21WdWRGQmhkR2dwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hwYzBGeWNtRjVLRzlpYWlrcElIdGNiaUFnSUNBZ0lDQWdJQ0J2WW1vdWMzQnNhV05sS0dOMWNuSmxiblJRWVhSb0xDQXhLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCa1pXeGxkR1VnYjJKcVcyTjFjbkpsYm5SUVlYUm9YVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WkdWc0tHOWlhbHRqZFhKeVpXNTBVR0YwYUYwc0lIQmhkR2d1YzJ4cFkyVW9NU2twTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTzF4dUlDQjlYRzVjYmlBZ2RtRnlJRzF2WkNBOUlHWmhZM1J2Y25rb0tUdGNiaUFnYlc5a0xtTnlaV0YwWlNBOUlHWmhZM1J2Y25rN1hHNGdJRzF2WkM1M2FYUm9TVzVvWlhKcGRHVmtVSEp2Y0hNZ1BTQm1ZV04wYjNKNUtIdHBibU5zZFdSbFNXNW9aWEpwZEdWa1VISnZjSE02SUhSeWRXVjlLVnh1SUNCeVpYUjFjbTRnYlc5a08xeHVmU2s3WEc0aUxDSW5kWE5sSUhOMGNtbGpkQ2RjYmx4dVkyOXVjM1FnZTJselQySnFaV04wTENCblpYUkxaWGx6ZlNBOUlISmxjWFZwY21Vb0p5NHZiR0Z1WnljcFhHNWNiaTh2SUZCU1NWWkJWRVVnVUZKUFVFVlNWRWxGVTF4dVkyOXVjM1FnUWxsUVFWTlRYMDFQUkVVZ1BTQW5YMTlpZVhCaGMzTk5iMlJsSjF4dVkyOXVjM1FnU1VkT1QxSkZYME5KVWtOVlRFRlNJRDBnSjE5ZmFXZHViM0psUTJseVkzVnNZWEluWEc1amIyNXpkQ0JOUVZoZlJFVkZVQ0E5SUNkZlgyMWhlRVJsWlhBblhHNWpiMjV6ZENCRFFVTklSU0E5SUNkZlgyTmhZMmhsSjF4dVkyOXVjM1FnVVZWRlZVVWdQU0FuWDE5eGRXVjFaU2RjYm1OdmJuTjBJRk5VUVZSRklEMGdKMTlmYzNSaGRHVW5YRzVjYm1OdmJuTjBJRVZOVUZSWlgxTlVRVlJGSUQwZ2UzMWNibHh1WTJ4aGMzTWdVbVZqZFhKemFYWmxTWFJsY21GMGIzSWdlMXh1SUNBdktpcGNiaUFnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I4UVhKeVlYbDlJSEp2YjNSY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJRnRpZVhCaGMzTk5iMlJsUFRCZFhHNGdJQ0FxSUVCd1lYSmhiU0I3UW05dmJHVmhibjBnVzJsbmJtOXlaVU5wY21OMWJHRnlQV1poYkhObFhWeHVJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnVzIxaGVFUmxaWEE5TVRBd1hWeHVJQ0FnS2k5Y2JpQWdZMjl1YzNSeWRXTjBiM0lnS0hKdmIzUXNJR0o1Y0dGemMwMXZaR1VnUFNBd0xDQnBaMjV2Y21WRGFYSmpkV3hoY2lBOUlHWmhiSE5sTENCdFlYaEVaV1Z3SUQwZ01UQXdLU0I3WEc0Z0lDQWdkR2hwYzF0Q1dWQkJVMU5mVFU5RVJWMGdQU0JpZVhCaGMzTk5iMlJsWEc0Z0lDQWdkR2hwYzF0SlIwNVBVa1ZmUTBsU1ExVk1RVkpkSUQwZ2FXZHViM0psUTJseVkzVnNZWEpjYmlBZ0lDQjBhR2x6VzAxQldGOUVSVVZRWFNBOUlHMWhlRVJsWlhCY2JpQWdJQ0IwYUdselcwTkJRMGhGWFNBOUlGdGRYRzRnSUNBZ2RHaHBjMXRSVlVWVlJWMGdQU0JiWFZ4dUlDQWdJSFJvYVhOYlUxUkJWRVZkSUQwZ2RHaHBjeTVuWlhSVGRHRjBaU2gxYm1SbFptbHVaV1FzSUhKdmIzUXBYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRQWW1wbFkzUjlYRzRnSUNBcUwxeHVJQ0J1WlhoMElDZ3BJSHRjYmlBZ0lDQmpiMjV6ZENCN2JtOWtaU3dnY0dGMGFDd2daR1ZsY0gwZ1BTQjBhR2x6VzFOVVFWUkZYU0I4ZkNCRlRWQlVXVjlUVkVGVVJWeHVYRzRnSUNBZ2FXWWdLSFJvYVhOYlRVRllYMFJGUlZCZElENGdaR1ZsY0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdWFYTk9iMlJsS0c1dlpHVXBLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDBhR2x6TG1selEybHlZM1ZzWVhJb2JtOWtaU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvZEdocGMxdEpSMDVQVWtWZlEwbFNRMVZNUVZKZEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QnphMmx3WEc0Z0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25RMmx5WTNWc1lYSWdjbVZtWlhKbGJtTmxKeWxjYmlBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0hSb2FYTXViMjVUZEdWd1NXNTBieWgwYUdselcxTlVRVlJGWFNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdOdmJuTjBJR1JsYzJOeWFYQjBiM0p6SUQwZ2RHaHBjeTVuWlhSVGRHRjBaWE5QWmtOb2FXeGtUbTlrWlhNb2JtOWtaU3dnY0dGMGFDd2daR1ZsY0NsY2JpQWdJQ0FnSUNBZ0lDQWdJR052Ym5OMElHMWxkR2h2WkNBOUlIUm9hWE5iUWxsUVFWTlRYMDFQUkVWZElEOGdKM0IxYzJnbklEb2dKM1Z1YzJocFpuUW5YRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpXMUZWUlZWRlhWdHRaWFJvYjJSZEtDNHVMbVJsYzJOeWFYQjBiM0p6S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwYzF0RFFVTklSVjB1Y0hWemFDaHViMlJsS1Z4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lHTnZibk4wSUhaaGJIVmxJRDBnZEdocGMxdFJWVVZWUlYwdWMyaHBablFvS1Z4dUlDQWdJR052Ym5OMElHUnZibVVnUFNBaGRtRnNkV1ZjYmx4dUlDQWdJSFJvYVhOYlUxUkJWRVZkSUQwZ2RtRnNkV1ZjYmx4dUlDQWdJR2xtSUNoa2IyNWxLU0IwYUdsekxtUmxjM1J5YjNrb0tWeHVYRzRnSUNBZ2NtVjBkWEp1SUh0MllXeDFaU3dnWkc5dVpYMWNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDcGNiaUFnSUNvdlhHNGdJR1JsYzNSeWIza2dLQ2tnZTF4dUlDQWdJSFJvYVhOYlVWVkZWVVZkTG14bGJtZDBhQ0E5SURCY2JpQWdJQ0IwYUdselcwTkJRMGhGWFM1c1pXNW5kR2dnUFNBd1hHNGdJQ0FnZEdocGMxdFRWRUZVUlYwZ1BTQnVkV3hzWEc0Z0lIMWNiaUFnTHlvcVhHNGdJQ0FxSUVCd1lYSmhiU0I3S24wZ1lXNTVYRzRnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnS2k5Y2JpQWdhWE5PYjJSbElDaGhibmtwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdhWE5QWW1wbFkzUW9ZVzU1S1Z4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNvdlhHNGdJR2x6VEdWaFppQW9ZVzU1S1NCN1hHNGdJQ0FnY21WMGRYSnVJQ0YwYUdsekxtbHpUbTlrWlNoaGJua3BYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdLaTljYmlBZ2FYTkRhWEpqZFd4aGNpQW9ZVzU1S1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhOYlEwRkRTRVZkTG1sdVpHVjRUMllvWVc1NUtTQWhQVDBnTFRGY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1VtVjBkWEp1Y3lCemRHRjBaWE1nYjJZZ1kyaHBiR1FnYm05a1pYTmNiaUFnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I5SUc1dlpHVmNiaUFnSUNvZ1FIQmhjbUZ0SUh0QmNuSmhlWDBnY0dGMGFGeHVJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnWkdWbGNGeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FYSnlZWGs4VDJKcVpXTjBQbjFjYmlBZ0lDb3ZYRzRnSUdkbGRGTjBZWFJsYzA5bVEyaHBiR1JPYjJSbGN5QW9ibTlrWlN3Z2NHRjBhQ3dnWkdWbGNDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCblpYUkxaWGx6S0c1dlpHVXBMbTFoY0NoclpYa2dQVDVjYmlBZ0lDQWdJSFJvYVhNdVoyVjBVM1JoZEdVb2JtOWtaU3dnYm05a1pWdHJaWGxkTENCclpYa3NJSEJoZEdndVkyOXVZMkYwS0d0bGVTa3NJR1JsWlhBZ0t5QXhLVnh1SUNBZ0lDbGNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dVbVYwZFhKdWN5QnpkR0YwWlNCdlppQnViMlJsTGlCRFlXeHNjeUJtYjNJZ1pXRmphQ0J1YjJSbFhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0JiY0dGeVpXNTBYVnh1SUNBZ0tpQkFjR0Z5WVcwZ2V5cDlJRnR1YjJSbFhWeHVJQ0FnS2lCQWNHRnlZVzBnZTFOMGNtbHVaMzBnVzJ0bGVWMWNiaUFnSUNvZ1FIQmhjbUZ0SUh0QmNuSmhlWDBnVzNCaGRHaGRYRzRnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCYlpHVmxjRjFjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMDlpYW1WamRIMWNiaUFnSUNvdlhHNGdJR2RsZEZOMFlYUmxJQ2h3WVhKbGJuUXNJRzV2WkdVc0lHdGxlU3dnY0dGMGFDQTlJRnRkTENCa1pXVndJRDBnTUNrZ2UxeHVJQ0FnSUhKbGRIVnliaUI3Y0dGeVpXNTBMQ0J1YjJSbExDQnJaWGtzSUhCaGRHZ3NJR1JsWlhCOVhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlFTmhiR3hpWVdOclhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0J6ZEdGMFpWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ292WEc0Z0lHOXVVM1JsY0VsdWRHOGdLSE4wWVhSbEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUhSeWRXVmNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMUpsWTNWeWMybDJaVWwwWlhKaGRHOXlmVnh1SUNBZ0tpOWNiaUFnVzFONWJXSnZiQzVwZEdWeVlYUnZjbDBnS0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwYUdselhHNGdJSDFjYm4xY2JseHViVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQlNaV04xY25OcGRtVkpkR1Z5WVhSdmNseHVJaXdpSjNWelpTQnpkSEpwWTNRblhHNHZLaXBjYmlBcUlFQndZWEpoYlNCN0tuMGdZVzU1WEc0Z0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFxTDF4dVpuVnVZM1JwYjI0Z2FYTlBZbXBsWTNRZ0tHRnVlU2tnZTF4dUlDQnlaWFIxY200Z1lXNTVJQ0U5UFNCdWRXeHNJQ1ltSUhSNWNHVnZaaUJoYm5rZ1BUMDlJQ2R2WW1wbFkzUW5YRzU5WEc0dktpcGNiaUFxSUVCd1lYSmhiU0I3S24wZ1lXNTVYRzRnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQXFMMXh1WTI5dWMzUWdlMmx6UVhKeVlYbDlJRDBnUVhKeVlYbGNiaThxS2x4dUlDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNvdlhHNW1kVzVqZEdsdmJpQnBjMEZ5Y21GNVRHbHJaU0FvWVc1NUtTQjdYRzRnSUdsbUlDZ2hhWE5QWW1wbFkzUW9ZVzU1S1NrZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUdsbUlDZ2hLQ2RzWlc1bmRHZ25JR2x1SUdGdWVTa3BJSEpsZEhWeWJpQm1ZV3h6WlZ4dUlDQmpiMjV6ZENCc1pXNW5kR2dnUFNCaGJua3ViR1Z1WjNSb1hHNGdJR2xtSUNnaGFYTk9kVzFpWlhJb2JHVnVaM1JvS1NrZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUdsbUlDaHNaVzVuZEdnZ1BpQXdLU0I3WEc0Z0lDQWdjbVYwZFhKdUlDaHNaVzVuZEdnZ0xTQXhLU0JwYmlCaGJubGNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQm1iM0lnS0dOdmJuTjBJR3RsZVNCcGJpQmhibmtwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpWeHVJQ0FnSUgxY2JpQWdmVnh1ZlZ4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselRuVnRZbVZ5SUNoaGJua3BJSHRjYmlBZ2NtVjBkWEp1SUhSNWNHVnZaaUJoYm5rZ1BUMDlJQ2R1ZFcxaVpYSW5YRzU5WEc0dktpcGNiaUFxSUVCd1lYSmhiU0I3VDJKcVpXTjBmRUZ5Y21GNWZTQnZZbXBsWTNSY2JpQXFJRUJ5WlhSMWNtNXpJSHRCY25KaGVUeFRkSEpwYm1jK2ZWeHVJQ292WEc1bWRXNWpkR2x2YmlCblpYUkxaWGx6SUNodlltcGxZM1FwSUh0Y2JpQWdZMjl1YzNRZ2EyVjVjMThnUFNCUFltcGxZM1F1YTJWNWN5aHZZbXBsWTNRcFhHNGdJR2xtSUNocGMwRnljbUY1S0c5aWFtVmpkQ2twSUh0Y2JpQWdJQ0F2THlCemEybHdJSE52Y25SY2JpQWdmU0JsYkhObElHbG1JQ2hwYzBGeWNtRjVUR2xyWlNodlltcGxZM1FwS1NCN1hHNGdJQ0FnWTI5dWMzUWdhVzVrWlhnZ1BTQnJaWGx6WHk1cGJtUmxlRTltS0Nkc1pXNW5kR2duS1Z4dUlDQWdJR2xtSUNocGJtUmxlQ0ErSUMweEtTQjdYRzRnSUNBZ0lDQnJaWGx6WHk1emNHeHBZMlVvYVc1a1pYZ3NJREVwWEc0Z0lDQWdmVnh1SUNBZ0lDOHZJSE5yYVhBZ2MyOXlkRnh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJQzh2SUhOdmNuUmNiaUFnSUNCclpYbHpYeTV6YjNKMEtDbGNiaUFnZlZ4dUlDQnlaWFIxY200Z2EyVjVjMTljYm4xY2JseHVaWGh3YjNKMGN5NW5aWFJMWlhseklEMGdaMlYwUzJWNWMxeHVaWGh3YjNKMGN5NXBjMEZ5Y21GNUlEMGdhWE5CY25KaGVWeHVaWGh3YjNKMGN5NXBjMEZ5Y21GNVRHbHJaU0E5SUdselFYSnlZWGxNYVd0bFhHNWxlSEJ2Y25SekxtbHpUMkpxWldOMElEMGdhWE5QWW1wbFkzUmNibVY0Y0c5eWRITXVhWE5PZFcxaVpYSWdQU0JwYzA1MWJXSmxjbHh1SWl3aWFXMXdiM0owSUV4cGMzUkpkR1Z0SUdaeWIyMGdKeTR2VEdsemRFbDBaVzBuTzF4dWFXMXdiM0owSUhKbFkzVnljMmwyWlVsMFpYSmhkRzl5SUdaeWIyMGdKM0psWTNWeWMybDJaUzFwZEdWeVlYUnZjaWM3WEc1cGJYQnZjblFnYjJKcVpXTjBVR0YwYUNCbWNtOXRJQ2R2WW1wbFkzUXRjR0YwYUNjN1hHNWNibU5zWVhOeklFUmhkR0ZNYVhOMElHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lod2NtOXdjeWtnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWh3Y205d2N5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWNtVnVaR1Z5VG05a1pYTWdQU0IwYUdsekxuSmxibVJsY2s1dlpHVnpMbUpwYm1Rb2RHaHBjeWs3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwUm1sbGJHUk5ZWEFnUFNCMGFHbHpMbk5sZEVacFpXeGtUV0Z3TG1KcGJtUW9kR2hwY3lrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYzJWMFJtbGxiR1JOWVhBb2NHRjBhQ3dnWlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnWlhabGJuUXVjSEpsZG1WdWRFUmxabUYxYkhRb0tUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1d2NtOXdjeTUxY0dSaGRHVkdhV1ZzWkUxaGNDaDdXMlYyWlc1MExuUmhjbWRsZEM1a1lYUmhjMlYwTG1acFpXeGtYVG9nY0dGMGFIMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2s1dlpHVnpLR1JoZEdFcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlFOWlhbVZqZEM1clpYbHpLR1JoZEdFcExtMWhjQ2hwZEdWdElEMCtJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hwZEdWdElEMDlQU0FuYjJKcVpXTjBVR0YwYUNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR3hsZENCamFHbHNaQ0E5SUR4TWFYTjBTWFJsYlNCclpYazllMmwwWlcwdWRHOVRkSEpwYm1jb0tYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZV3gxWlQxN2FYUmxiWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2WW1wbFkzUTllMlJoZEdGYmFYUmxiVjE5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm1sbGJHUk5ZWEE5ZTNSb2FYTXVjSEp2Y0hNdVptbGxiR1JOWVhCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IyNURiR2xqYTBOdmJuUmhhVzVsY2oxN1pTQTlQaUIwYUdsekxuTmxkRVpwWld4a1RXRndLR1JoZEdGYmFYUmxiVjB1YjJKcVpXTjBVR0YwYUN3Z1pTbDlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMjVEYkdsamExUnBkR3hsUFh0bElEMCtJSFJvYVhNdWMyVjBSbWxsYkdSTllYQW9aR0YwWVZ0cGRHVnRYU3dnWlNsOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IyNURiR2xqYTBOdmJuUmxiblE5ZTJVZ1BUNGdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDaGtZWFJoVzJsMFpXMWRMQ0JsS1gwdlBqdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQmtZWFJoVzJsMFpXMWRJRDA5UFNBbmIySnFaV04wSnlBbUppQmtZWFJoVzJsMFpXMWRJQ0U5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWTJocGJHUWdQU0JTWldGamRDNWpiRzl1WlVWc1pXMWxiblFvWTJocGJHUXNJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyaHBiR1J5Wlc0NklFRnljbUY1TG1selFYSnlZWGtvWkdGMFlWdHBkR1Z0WFNrZ1B5QjBhR2x6TG5KbGJtUmxjazV2WkdWektHUmhkR0ZiYVhSbGJWMWJNRjBwSURvZ2RHaHBjeTV5Wlc1a1pYSk9iMlJsY3loa1lYUmhXMmwwWlcxZEtWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnWTJocGJHUTdYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsYm1SbGNpZ3BJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdabWxsYkdSTllYQWdQU0IwYUdsekxuQnliM0J6TG1acFpXeGtUV0Z3TzF4dVhHNGdJQ0FnSUNBZ0lHeGxkQ0JrWVhSaElEMGdkR2hwY3k1d2NtOXdjeTVrWVhSaE8xeHVJQ0FnSUNBZ0lDQnBaaUFvUVhKeVlYa3VhWE5CY25KaGVTaGtZWFJoS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQTlJQ2NuTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdhV1lnS0dacFpXeGtUV0Z3TG1sMFpXMURiMjUwWVdsdVpYSWdQVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2hCY25KaGVTNXBjMEZ5Y21GNUtHUmhkR0VwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZU0E5SUdSaGRHRmJNRjA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnZjaUFvYkdWMElIdHdZWEpsYm5Rc0lHNXZaR1VzSUd0bGVTd2djR0YwYUgwZ2IyWWdibVYzSUhKbFkzVnljMmwyWlVsMFpYSmhkRzl5S0dSaGRHRXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCdWIyUmxJRDA5UFNBbmIySnFaV04wSnlBbUppQnViMlJsSUNFOVBTQnVkV3hzS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR3hsZENCd1lYUm9VM1J5YVc1bklEMGdjR0YwYUM1cWIybHVLQ2N1SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamRGQmhkR2d1YzJWMEtHUmhkR0VzSUhCaGRHaFRkSEpwYm1jZ0t5QW5MbTlpYW1WamRGQmhkR2duTENCd1lYUm9VM1J5YVc1bktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdnelBsTmxiR1ZqZENCcGRHVnRjeUJqYjI1MFlXbHVaWEk4TDJnelBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4ZFd3Z1kyeGhjM05PWVcxbFBWd2lhbk52YmkxMGNtVmxYQ0krZTNSb2FYTXVjbVZ1WkdWeVRtOWtaWE1vWkdGMFlTbDlQQzkxYkQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCc1pYUWdiMkpxWldOMFJHRjBZU0E5SUc5aWFtVmpkRkJoZEdndVoyVjBLSFJvYVhNdWNISnZjSE11WkdGMFlTd2dabWxsYkdSTllYQXVhWFJsYlVOdmJuUmhhVzVsY2lrN1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaEJjbkpoZVM1cGMwRnljbUY1S0c5aWFtVmpkRVJoZEdFcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxWldOMFJHRjBZU0E5SUc5aWFtVmpkRVJoZEdGYk1GMDdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdadmNpQW9iR1YwSUh0d1lYSmxiblFzSUc1dlpHVXNJR3RsZVN3Z2NHRjBhSDBnYjJZZ2JtVjNJSEpsWTNWeWMybDJaVWwwWlhKaGRHOXlLRzlpYW1WamRFUmhkR0VwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnViMlJsSUNFOVBTQW5iMkpxWldOMEp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCc1pYUWdjR0YwYUZOMGNtbHVaeUE5SUhCaGRHZ3VhbTlwYmlnbkxpY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ2h2WW1wbFkzUkVZWFJoTENCd1lYUm9VM1J5YVc1bkxDQndZWFJvVTNSeWFXNW5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHZ3pQbE5sYkdWamRDQjBhWFJzWlNCaGJtUWdZMjl1ZEdWdWRDQm1hV1ZzWkhNOEwyZ3pQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGRXd2dZMnhoYzNOT1lXMWxQVndpYW5OdmJpMTBjbVZsWENJK2UzUm9hWE11Y21WdVpHVnlUbTlrWlhNb2IySnFaV04wUkdGMFlTbDlQQzkxYkQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVSaGRHRk1hWE4wT3lJc0ltbHRjRzl5ZENCRVlYUmhUR2x6ZENCbWNtOXRJQ2N1TDBSaGRHRk1hWE4wSnp0Y2JtbHRjRzl5ZENCblpYUkJjR2xFWVhSaElHWnliMjBnSnk0dUx5NHVMMVYwYVd4cGRHbGxjeTluWlhSQmNHbEVZWFJoSnp0Y2JseHVZMnhoYzNNZ1JtbGxiR1JUWld4bFkzUnBiMjRnWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZibk4wY25WamRHOXlLSEJ5YjNCektTQjdYRzRnSUNBZ0lDQWdJSE4xY0dWeUtIQnliM0J6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6ZEdGMFpTQTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnljbTl5T2lCdWRXeHNMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2FYTk1iMkZrWldRNklHWmhiSE5sTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdhWFJsYlhNNklGdGRYRzRnSUNBZ0lDQWdJSDA3WEc1Y2JpQWdJQ0FnSUNBZ2RHaHBjeTUxY0dSaGRHVkdhV1ZzWkUxaGNDQTlJSFJvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIWmhiSFZsS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JuWlhSRVlYUmhLQ2tnZTF4dUlDQWdJQ0FnSUNCamIyNXpkQ0I3ZFhKc2ZTQTlJSFJvYVhNdWNISnZjSE03WEc0Z0lDQWdJQ0FnSUdkbGRFRndhVVJoZEdFb2RYSnNLVnh1SUNBZ0lDQWdJQ0FnSUNBZ0xuUm9aVzRvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnS0h0eVpYTjFiSFI5S1NBOVBpQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDZ2hjbVZ6ZFd4MElIeDhJRTlpYW1WamRDNXJaWGx6S0hKbGMzVnNkQ2t1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxjbkp2Y2pvZ1JYSnliM0lvSjBOdmRXeGtJRzV2ZENCbVpYUmphQ0JrWVhSaElHWnliMjBnVlZKTUxpY3BMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdselRHOWhaR1ZrT2lCMGNuVmxYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0cGMweHZZV1JsWkRvZ2RISjFaU3dnYVhSbGJYTTZJSEpsYzNWc2RIMHBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDBzSUNoN1pYSnliM0o5S1NBOVBpQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMmx6VEc5aFpHVmtPaUIwY25WbExDQmxjbkp2Y24wcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnWTI5dGNHOXVaVzUwUkdsa1RXOTFiblFvS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WjJWMFJHRjBZU2dwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsYm1SbGNpZ3BJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdlMlZ5Y205eUxDQnBjMHh2WVdSbFpDd2dhWFJsYlhOOUlEMGdkR2hwY3k1emRHRjBaVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHVnljbTl5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdQR1JwZGo0OGNENUZjbkp2Y2pvZ2UyVnljbTl5TG0xbGMzTmhaMlY5UEM5d1Bqd3ZaR2wyUGp0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDZ2hhWE5NYjJGa1pXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBOFpHbDJJR05zWVhOelRtRnRaVDFjSW5Od2FXNXVaWElnYVhNdFlXTjBhWFpsWENJK1BDOWthWFkrTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlEeEVZWFJoVEdsemRGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHUmhkR0U5ZTJsMFpXMXpmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFZ5YkQxN2RHaHBjeTV3Y205d2N5NTFjbXg5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm1sbGJHUk5ZWEE5ZTNSb2FYTXVjSEp2Y0hNdVptbGxiR1JOWVhCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYQmtZWFJsUm1sbGJHUk5ZWEE5ZTNSb2FYTXVkWEJrWVhSbFJtbGxiR1JOWVhCOUx6NDdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVacFpXeGtVMlZzWldOMGFXOXVPeUlzSW1aMWJtTjBhVzl1SUVsdWNIVjBSbWxsYkdSektIQnliM0J6S1NCN1hHNGdJQ0FnWTI5dWMzUWdlMlpwWld4a1RXRndMQ0IxY214OUlEMGdjSEp2Y0hNN1hHNGdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUR4cGJuQjFkQ0IwZVhCbFBWd2lhR2xrWkdWdVhDSWdibUZ0WlQxY0ltMXZaRjlxYzI5dVgzSmxibVJsY2w5MWNteGNJaUIyWVd4MVpUMTdkWEpzZlM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4YVc1d2RYUWdkSGx3WlQxY0ltaHBaR1JsYmx3aUlHNWhiV1U5WENKdGIyUmZhbk52Ymw5eVpXNWtaWEpmWm1sbGJHUnRZWEJjSWlCMllXeDFaVDE3U2xOUFRpNXpkSEpwYm1kcFpua29abWxsYkdSTllYQXBmUzgrWEc0Z0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDazdYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVsdWNIVjBSbWxsYkdSek95SXNJbVoxYm1OMGFXOXVJRXhwYzNSSmRHVnRLSEJ5YjNCektTQjdYRzRnSUNBZ1kyOXVjM1FnZTNaaGJIVmxMQ0JqYUdsc1pISmxiaXdnWm1sbGJHUk5ZWEFzSUc5aWFtVmpkQ3dnYjI1RGJHbGphMVJwZEd4bExDQnZia05zYVdOclEyOXVkR1Z1ZEN3Z2IyNURiR2xqYTBOdmJuUmhhVzVsY24wZ1BTQndjbTl3Y3p0Y2JseHVJQ0FnSUdsbUlDaGphR2xzWkhKbGJpa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRHhzYVQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJSHRCY25KaGVTNXBjMEZ5Y21GNUtHOWlhbVZqZENrZ0ppWWdabWxsYkdSTllYQXVhWFJsYlVOdmJuUmhhVzVsY2lBOVBUMGdiblZzYkNBL1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BITndZVzQrUEhOd1lXNGdZMnhoYzNOT1lXMWxQVndpWkdGemFHbGpiMjV6SUdSaGMyaHBZMjl1Y3kxd2IzSjBabTlzYVc5Y0lqNDhMM053WVc0K0lIdDJZV3gxWlgwZ1BHRWdhSEpsWmoxY0lpTmNJaUJqYkdGemMwNWhiV1U5WENKMGNtVmxMWE5sYkdWamRGd2lJR1JoZEdFdFptbGxiR1E5WENKcGRHVnRRMjl1ZEdGcGJtVnlYQ0lnYjI1RGJHbGphejE3YjI1RGJHbGphME52Ym5SaGFXNWxjbjArVTJWc1pXTjBQQzloUGp3dmMzQmhiajRnT2lBZ1BITndZVzQrZTNaaGJIVmxmVHd2YzNCaGJqNTlYRzRnSUNBZ0lDQWdJQ0FnSUNBOGRXdytlMk5vYVd4a2NtVnVmVHd2ZFd3K1hHNGdJQ0FnSUNBZ0lEd3ZiR2srS1R0Y2JpQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRHhzYVQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJSHRtYVdWc1pFMWhjQzUwYVhSc1pTQTlQVDBnYjJKcVpXTjBJQ1ltSUdacFpXeGtUV0Z3TG5ScGRHeGxJRDhnUEhOMGNtOXVaejVVYVhSc1pUb2dQQzl6ZEhKdmJtYytJRG9nSnlkOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I3Wm1sbGJHUk5ZWEF1WTI5dWRHVnVkQ0E5UFQwZ2IySnFaV04wSUNZbUlHWnBaV3hrVFdGd0xtTnZiblJsYm5RZ1B5QThjM1J5YjI1blBrTnZiblJsYm5RNklEd3ZjM1J5YjI1blBpQTZJQ2NuZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdQSE53WVc0K2UzWmhiSFZsZlR3dmMzQmhiajVjYmlBZ0lDQWdJQ0FnSUNBZ0lIc2habWxsYkdSTllYQXVkR2wwYkdVZ0ppWWdLR1pwWld4a1RXRndMbU52Ym5SbGJuUWdJVDA5SUc5aWFtVmpkQ2tnSmlZZ1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUFoUFQwZ2JuVnNiQ0EvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdFZ2FISmxaajFjSWlOY0lpQmpiR0Z6YzA1aGJXVTlYQ0owY21WbExYTmxiR1ZqZEZ3aUlHUmhkR0V0Wm1sbGJHUTlYQ0owYVhSc1pWd2lJRzl1UTJ4cFkyczllMjl1UTJ4cFkydFVhWFJzWlgwK1ZHbDBiR1U4TDJFK0lEb2dKeWQ5WEc0Z0lDQWdJQ0FnSUNBZ0lDQjdJV1pwWld4a1RXRndMbU52Ym5SbGJuUWdKaVlnS0dacFpXeGtUV0Z3TG5ScGRHeGxJQ0U5UFNCdlltcGxZM1FwSUNZbUlHWnBaV3hrVFdGd0xtbDBaVzFEYjI1MFlXbHVaWElnSVQwOUlHNTFiR3dnUDF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4aElHaHlaV1k5WENJalhDSWdZMnhoYzNOT1lXMWxQVndpZEhKbFpTMXpaV3hsWTNSY0lpQmtZWFJoTFdacFpXeGtQVndpWTI5dWRHVnVkRndpSUc5dVEyeHBZMnM5ZTI5dVEyeHBZMnREYjI1MFpXNTBmVDVEYjI1MFpXNTBQQzloUGlBNklDY25mVnh1SUNBZ0lDQWdJQ0E4TDJ4cFBpazdYRzRnSUNBZ2ZWeHVmVnh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JNYVhOMFNYUmxiVHNpTENKcGJYQnZjblFnUm1sbGJHUlRaV3hsWTNScGIyNGdabkp2YlNBbkxpOUdhV1ZzWkZObGJHVmpkR2x2YmljN1hHNXBiWEJ2Y25RZ1NXNXdkWFJHYVdWc1pITWdabkp2YlNBbkxpOUpibkIxZEVacFpXeGtjeWM3WEc1cGJYQnZjblFnVTNWdGJXRnllU0JtY205dElDY3VMMU4xYlcxaGNua25PMXh1WEc1amJHRnpjeUJUWlhSMGFXNW5jeUJsZUhSbGJtUnpJRkpsWVdOMExrTnZiWEJ2Ym1WdWRDQjdYRzRnSUNBZ1kyOXVjM1J5ZFdOMGIzSW9jSEp2Y0hNcElIdGNiaUFnSUNBZ0lDQWdjM1Z3WlhJb2NISnZjSE1wTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbk4wWVhSbElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dU9pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0p5Y3NYRzRnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0RvZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzFEYjI1MFlXbHVaWEk2SUc1MWJHd3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2wwYkdVNklDY25MRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUTZJQ2NuWEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDA3WEc1Y2JpQWdJQ0FnSUNBZ2RHaHBjeTUxY214RGFHRnVaMlVnUFNCMGFHbHpMblZ5YkVOb1lXNW5aUzVpYVc1a0tIUm9hWE1wTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbWhoYm1Sc1pWTjFZbTFwZENBOUlIUm9hWE11YUdGdVpHeGxVM1ZpYldsMExtSnBibVFvZEdocGN5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWNtVnpaWFJQY0hScGIyNXpJRDBnZEdocGN5NXlaWE5sZEU5d2RHbHZibk11WW1sdVpDaDBhR2x6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTUxY0dSaGRHVkdhV1ZzWkUxaGNDQTlJSFJvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JqYjIxd2IyNWxiblJFYVdSTmIzVnVkQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVwYm1sMFQzQjBhVzl1Y3lncE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUdsdWFYUlBjSFJwYjI1ektDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUcxdlpFcHpiMjVTWlc1a1pYSXViM0IwYVc5dWN5QWhQVDBnSjNWdVpHVm1hVzVsWkNjcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdOdmJuTjBJRzl3ZEdsdmJuTWdQU0J0YjJSS2MyOXVVbVZ1WkdWeUxtOXdkR2x2Ym5NN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFjbXc2SUc5d2RHbHZibk11ZFhKc0lEOGdiM0IwYVc5dWN5NTFjbXdnT2lBbkp5eGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1hV1ZzWkUxaGNEb2diM0IwYVc5dWN5NW1hV1ZzWkUxaGNDQS9JRXBUVDA0dWNHRnljMlVvYjNCMGFXOXVjeTVtYVdWc1pFMWhjQ2tnT2lCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2wwWlcxRGIyNTBZV2x1WlhJNklHNTFiR3dzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUnBkR3hsT2lBbkp5eGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWTI5dWRHVnVkRG9nSnlkY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUxGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJqb2dJU0Z2Y0hScGIyNXpMblZ5YkZ4dUlDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY214RGFHRnVaMlVvWlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdkWEpzT2lCbGRtVnVkQzUwWVhKblpYUXVkbUZzZFdWOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCb1lXNWtiR1ZUZFdKdGFYUW9aWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdaWFpsYm5RdWNISmxkbVZ1ZEVSbFptRjFiSFFvS1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3YzJodmQwWnBaV3hrVTJWc1pXTjBhVzl1T2lCMGNuVmxmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ6WlhSUGNIUnBiMjV6S0dWMlpXNTBLU0I3WEc0Z0lDQWdJQ0FnSUdWMlpXNTBMbkJ5WlhabGJuUkVaV1poZFd4MEtDazdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMyVjBVM1JoZEdVb2UzTm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJqb2dabUZzYzJVc0lIVnliRG9nSnljc0lHWnBaV3hrVFdGd09pQjdhWFJsYlVOdmJuUmhhVzVsY2pvZ2JuVnNiQ3dnZEdsMGJHVTZJQ2NuTENCamIyNTBaVzUwT2lBbkozMTlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQjFjR1JoZEdWR2FXVnNaRTFoY0NoMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCamIyNXpkQ0J1WlhkV1lXd2dQU0JQWW1wbFkzUXVZWE56YVdkdUtIUm9hWE11YzNSaGRHVXVabWxsYkdSTllYQXNJSFpoYkhWbEtUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN1ptbGxiR1JOWVhBNklHNWxkMVpoYkgwcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGJtUmxjaWdwSUh0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnZTNOb2IzZEdhV1ZzWkZObGJHVmpkR2x2Yml3Z2RYSnNmU0E5SUhSb2FYTXVjM1JoZEdVN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUh0cGRHVnRRMjl1ZEdGcGJtVnlMQ0IwYVhSc1pTd2dZMjl1ZEdWdWRIMGdQU0IwYUdsekxuTjBZWFJsTG1acFpXeGtUV0Z3TzF4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2gxY213Z0ppWWdhWFJsYlVOdmJuUmhhVzVsY2lBaFBUMGdiblZzYkNBbUppQjBhWFJzWlNBbUppQmpiMjUwWlc1MEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4VGRXMXRZWEo1SUhzdUxpNTBhR2x6TG5OMFlYUmxmU0F2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThTVzV3ZFhSR2FXVnNaSE1nZXk0dUxuUm9hWE11YzNSaGRHVjlJQzgrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHdQanhoSUdoeVpXWTlYQ0lqWENJZ2IyNURiR2xqYXoxN2RHaHBjeTV5WlhObGRFOXdkR2x2Ym5OOUlHTnNZWE56VG1GdFpUMWNJbUoxZEhSdmJsd2lQbEpsYzJWMElITmxkSFJwYm1kelBDOWhQand2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzJodmQwWnBaV3hrVTJWc1pXTjBhVzl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhHYVdWc1pGTmxiR1ZqZEdsdmJpQjFjbXc5ZTNWeWJIMGdabWxsYkdSTllYQTllM1JvYVhNdWMzUmhkR1V1Wm1sbGJHUk5ZWEI5SUhWd1pHRjBaVVpwWld4a1RXRndQWHQwYUdsekxuVndaR0YwWlVacFpXeGtUV0Z3ZlM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhKYm5CMWRFWnBaV3hrY3lCN0xpNHVkR2hwY3k1emRHRjBaWDBnTHo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQSEErUEdFZ2FISmxaajFjSWlOY0lpQnZia05zYVdOclBYdDBhR2x6TG5KbGMyVjBUM0IwYVc5dWMzMGdZMnhoYzNOT1lXMWxQVndpWW5WMGRHOXVYQ0krVW1WelpYUWdjMlYwZEdsdVozTThMMkUrUEM5d1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHUnBkaUJqYkdGemMwNWhiV1U5WENKM2NtRndYQ0krWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeG1iM0p0SUc5dVUzVmliV2wwUFh0MGFHbHpMbWhoYm1Sc1pWTjFZbTFwZEgwK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGNENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YkdGaVpXdytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHpkSEp2Ym1jK1JHRjBZU0J6YjNWeVkyVThMM04wY205dVp6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDJ4aFltVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4aWNpOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdrK1JXNTBaWElnWVNCMllXeHBaQ0JLVTA5T0lHRndhU0IxY213dVBDOXBQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzl3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSjBaWGgwWENJZ1kyeGhjM05PWVcxbFBWd2lkWEpzTFdsdWNIVjBYQ0lnZG1Gc2RXVTllM1Z5YkgwZ2IyNURhR0Z1WjJVOWUzUm9hWE11ZFhKc1EyaGhibWRsZlM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGNENDhhVzV3ZFhRZ2RIbHdaVDFjSW5OMVltMXBkRndpSUdOc1lYTnpUbUZ0WlQxY0ltSjFkSFJ2YmlCaWRYUjBiMjR0Y0hKcGJXRnllVndpSUhaaGJIVmxQVndpVTNWaWJXbDBYQ0l2UGp3dmNENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEM5bWIzSnRQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFNXNXdkWFJHYVdWc1pITWdleTR1TG5Sb2FYTXVjM1JoZEdWOUlDOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzlrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQlRaWFIwYVc1bmN6c2lMQ0ptZFc1amRHbHZiaUJUZFcxdFlYSjVLSEJ5YjNCektTQjdYRzRnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ1BHUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lEeHdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh6ZEhKdmJtYytSR0YwWVNCemIzVnlZMlU4TDNOMGNtOXVaejQ4WW5JdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGhJR2h5WldZOWUzQnliM0J6TG5WeWJIMGdkR0Z5WjJWMFBWd2lYMkpzWVc1clhDSStlM0J5YjNCekxuVnliSDA4TDJFK1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4TDNBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGMzUnliMjVuUGxScGRHeGxQQzl6ZEhKdmJtYytQR0p5THo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCN2NISnZjSE11Wm1sbGJHUk5ZWEF1ZEdsMGJHVXVjbVZ3YkdGalpTZ25MaWNzSUNjZzRvQ1RQaUFuS1gxY2JpQWdJQ0FnSUNBZ0lDQWdJRHd2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJRHh3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4emRISnZibWMrUTI5dWRHVnVkRHd2YzNSeWIyNW5QanhpY2k4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2UzQnliM0J6TG1acFpXeGtUV0Z3TG1OdmJuUmxiblF1Y21Wd2JHRmpaU2duTGljc0lDY2c0b0NUUGlBbktYMWNiaUFnSUNBZ0lDQWdJQ0FnSUR3dmNENWNiaUFnSUNBZ0lDQWdQQzlrYVhZK1hHNGdJQ0FnS1R0Y2JuMWNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdVM1Z0YldGeWVUc2lMQ0pwYlhCdmNuUWdVMlYwZEdsdVozTWdabkp2YlNBbkxpOURiMjF3YjI1bGJuUnpMMU5sZEhScGJtZHpKenRjYmx4dVkyOXVjM1FnYlc5a1NuTnZibEpsYm1SbGNrVnNaVzFsYm5RZ1BTQW5iVzlrZFd4aGNtbDBlUzFxYzI5dUxYSmxibVJsY2ljN1hHNWpiMjV6ZENCa2IyMUZiR1Z0Wlc1MElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb2JXOWtTbk52YmxKbGJtUmxja1ZzWlcxbGJuUXBPMXh1WEc1U1pXRmpkRVJQVFM1eVpXNWtaWElvWEc0Z0lDQWdQRk5sZEhScGJtZHpJQzgrTEZ4dUlDQWdJR1J2YlVWc1pXMWxiblJjYmlrN0lpd2lablZ1WTNScGIyNGdaMlYwUVhCcFJHRjBZU2gxY213cElIdGNiaUFnSUNCeVpYUjFjbTRnWm1WMFkyZ29kWEpzS1Z4dUlDQWdJQ0FnSUNBdWRHaGxiaWh5WlhNZ1BUNGdjbVZ6TG1wemIyNG9LU2xjYmlBZ0lDQWdJQ0FnTG5Sb1pXNG9YRzRnSUNBZ0lDQWdJQ0FnSUNBb2NtVnpkV3gwS1NBOVBpQW9lM0psYzNWc2RIMHBMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0tHVnljbTl5S1NBOVBpQW9lMlZ5Y205eWZTbGNiaUFnSUNBZ0lDQWdLVHRjYm4xY2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1oyVjBRWEJwUkdGMFlUdGNiaUpkZlE9PVxuIl0sImZpbGUiOiJBZG1pbi9JbmRleEFkbWluLmpzIn0=
