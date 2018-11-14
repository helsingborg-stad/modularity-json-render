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

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var DataList =
/*#__PURE__*/
function (_React$Component) {
  _inherits(DataList, _React$Component);

  function DataList() {
    _classCallCheck(this, DataList);

    return _possibleConstructorReturn(this, _getPrototypeOf(DataList).apply(this, arguments));
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
      var _this = this;

      return Object.keys(data).map(function (item) {
        if (item === 'objectPath') {
          return;
        }

        var child = React.createElement(_ListItem.default, {
          key: item.toString(),
          value: item,
          object: data[item],
          fieldMap: _this.props.fieldMap,
          onClickContainer: function onClickContainer(e) {
            return _this.setFieldMap(data[item].objectPath, e);
          },
          onClickTitle: function onClickTitle(e) {
            return _this.setFieldMap(data[item], e);
          },
          onClickContent: function onClickContent(e) {
            return _this.setFieldMap(data[item], e);
          }
        });

        if (_typeof(data[item]) === 'object' && data[item] !== null) {
          child = React.cloneElement(child, {
            children: Array.isArray(data[item]) ? _this.renderNodes(data[item][0]) : _this.renderNodes(data[item])
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

var InputFields = function InputFields(_ref) {
  var fieldMap = _ref.fieldMap,
      url = _ref.url;
  return React.createElement("div", null, React.createElement("input", {
    type: "hidden",
    name: "mod_json_render_url",
    value: url
  }), React.createElement("input", {
    type: "hidden",
    name: "mod_json_render_fieldmap",
    value: JSON.stringify(fieldMap)
  }));
};

var _default = InputFields;
exports.default = _default;

},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var ListItem = function ListItem(_ref) {
  var value = _ref.value,
      children = _ref.children,
      fieldMap = _ref.fieldMap,
      object = _ref.object,
      onClickTitle = _ref.onClickTitle,
      onClickContent = _ref.onClickContent,
      onClickContainer = _ref.onClickContainer;

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
};

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

var Summary = function Summary(_ref) {
  var url = _ref.url,
      fieldMap = _ref.fieldMap;
  return React.createElement("div", null, React.createElement("p", null, React.createElement("strong", null, "Data source"), React.createElement("br", null), React.createElement("a", {
    href: url,
    target: "_blank"
  }, url)), React.createElement("p", null, React.createElement("strong", null, "Title"), React.createElement("br", null), fieldMap.title.replace('.', ' –> ')), React.createElement("p", null, React.createElement("strong", null, "Content"), React.createElement("br", null), fieldMap.content.replace('.', ' –> ')));
};

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7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QS9CLENBRkosQ0FESixFQUtJLCtCQUNJLDRDQURKLEVBQzBCLCtCQUQxQixFQUVLLFFBQVEsQ0FBQyxLQUFULENBQWUsT0FBZixDQUF1QixHQUF2QixFQUE0QixNQUE1QixDQUZMLENBTEosRUFTSSwrQkFDSSw4Q0FESixFQUM0QiwrQkFENUIsRUFFSyxRQUFRLENBQUMsT0FBVCxDQUFpQixPQUFqQixDQUF5QixHQUF6QixFQUE4QixNQUE5QixDQUZMLENBVEosQ0FEWTtBQUFBLENBQWhCOztlQWdCZSxPOzs7Ozs7QUNoQmY7Ozs7QUFFQSxJQUFNLG9CQUFvQixHQUFHLHdCQUE3QjtBQUNBLElBQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFULENBQXdCLG9CQUF4QixDQUFuQjtBQUVBLFFBQVEsQ0FBQyxNQUFULENBQ0ksb0JBQUMsaUJBQUQsT0FESixFQUVJLFVBRko7Ozs7Ozs7Ozs7QUNMQSxTQUFTLFVBQVQsQ0FBb0IsR0FBcEIsRUFBeUI7QUFDckIsU0FBTyxLQUFLLENBQUMsR0FBRCxDQUFMLENBQ0YsSUFERSxDQUNHLFVBQUEsR0FBRztBQUFBLFdBQUksR0FBRyxDQUFDLElBQUosRUFBSjtBQUFBLEdBRE4sRUFFRixJQUZFLENBR0MsVUFBQyxNQUFEO0FBQUEsV0FBYTtBQUFDLE1BQUEsTUFBTSxFQUFOO0FBQUQsS0FBYjtBQUFBLEdBSEQsRUFJQyxVQUFDLEtBQUQ7QUFBQSxXQUFZO0FBQUMsTUFBQSxLQUFLLEVBQUw7QUFBRCxLQUFaO0FBQUEsR0FKRCxDQUFQO0FBTUg7O2VBRWMsVSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5vYmplY3RQYXRoID0gZmFjdG9yeSgpO1xuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgaWYob2JqID09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvL3RvIGhhbmRsZSBvYmplY3RzIHdpdGggbnVsbCBwcm90b3R5cGVzICh0b28gZWRnZSBjYXNlPylcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcClcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpe1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKXtcbiAgICByZXR1cm4gdG9TdHIuY2FsbCh0eXBlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XG4gIH1cblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKXtcbiAgICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gICAgcmV0dXJuIHRvU3RyLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQm9vbGVhbihvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0S2V5KGtleSl7XG4gICAgdmFyIGludEtleSA9IHBhcnNlSW50KGtleSk7XG4gICAgaWYgKGludEtleS50b1N0cmluZygpID09PSBrZXkpIHtcbiAgICAgIHJldHVybiBpbnRLZXk7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBmYWN0b3J5KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gICAgdmFyIG9iamVjdFBhdGggPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3RQYXRoKS5yZWR1Y2UoZnVuY3Rpb24ocHJveHksIHByb3ApIHtcbiAgICAgICAgaWYocHJvcCA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICAgIH1cblxuICAgICAgICAvKmlzdGFuYnVsIGlnbm9yZSBlbHNlKi9cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RQYXRoW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcHJveHlbcHJvcF0gPSBvYmplY3RQYXRoW3Byb3BdLmJpbmQob2JqZWN0UGF0aCwgb2JqKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgIH0sIHt9KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgcmV0dXJuIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyB8fCAodHlwZW9mIHByb3AgPT09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkob2JqKSkgfHwgaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLm1hcChnZXRLZXkpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IHBhdGhbMF07XG4gICAgICB2YXIgY3VycmVudFZhbHVlID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCB8fCAhZG9Ob3RSZXBsYWNlKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCkge1xuICAgICAgICAvL2NoZWNrIGlmIHdlIGFzc3VtZSBhbiBhcnJheVxuICAgICAgICBpZih0eXBlb2YgcGF0aFsxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfVxuXG4gICAgb2JqZWN0UGF0aC5oYXMgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICEhb2JqO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGogPSBnZXRLZXkocGF0aFtpXSk7XG5cbiAgICAgICAgaWYoKHR5cGVvZiBqID09PSAnbnVtYmVyJyAmJiBpc0FycmF5KG9iaikgJiYgaiA8IG9iai5sZW5ndGgpIHx8XG4gICAgICAgICAgKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzID8gKGogaW4gT2JqZWN0KG9iaikpIDogaGFzT3duUHJvcGVydHkob2JqLCBqKSkpIHtcbiAgICAgICAgICBvYmogPSBvYmpbal07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVuc3VyZUV4aXN0cyA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguaW5zZXJ0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGF0KXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgYXQgPSB+fmF0O1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cbiAgICAgIGFyci5zcGxpY2UoYXQsIDAsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbXB0eSA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUsIGk7XG4gICAgICBpZiAoISh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCkpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsICcnKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHZhbHVlLmxlbmd0aCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICBmb3IgKGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgbnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGgucHVzaCA9IGZ1bmN0aW9uIChvYmosIHBhdGggLyosIHZhbHVlcyAqLyl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG5cbiAgICAgIGFyci5wdXNoLmFwcGx5KGFyciwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguY29hbGVzY2UgPSBmdW5jdGlvbiAob2JqLCBwYXRocywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoc1tpXSkpICE9PSB2b2lkIDApIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBkZWZhdWx0VmFsdWUpe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLCBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICB2YXIgbmV4dE9iaiA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKVxuICAgICAgaWYgKG5leHRPYmogPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG5leHRPYmo7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCBkZWZhdWx0VmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmRlbCA9IGZ1bmN0aW9uIGRlbChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZih0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9iaiwgcGF0aC5zcGxpdCgnLicpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgaWYgKCFoYXNTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgIG9iai5zcGxpY2UoY3VycmVudFBhdGgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvYmpbY3VycmVudFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iamVjdFBhdGg7XG4gIH1cblxuICB2YXIgbW9kID0gZmFjdG9yeSgpO1xuICBtb2QuY3JlYXRlID0gZmFjdG9yeTtcbiAgbW9kLndpdGhJbmhlcml0ZWRQcm9wcyA9IGZhY3Rvcnkoe2luY2x1ZGVJbmhlcml0ZWRQcm9wczogdHJ1ZX0pXG4gIHJldHVybiBtb2Q7XG59KTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG4iLCIndXNlIHN0cmljdCdcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCAoYW55KSB7XG4gIHJldHVybiBhbnkgIT09IG51bGwgJiYgdHlwZW9mIGFueSA9PT0gJ29iamVjdCdcbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5jb25zdCB7aXNBcnJheX0gPSBBcnJheVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlIChhbnkpIHtcbiAgaWYgKCFpc09iamVjdChhbnkpKSByZXR1cm4gZmFsc2VcbiAgaWYgKCEoJ2xlbmd0aCcgaW4gYW55KSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGxlbmd0aCA9IGFueS5sZW5ndGhcbiAgaWYgKCFpc051bWJlcihsZW5ndGgpKSByZXR1cm4gZmFsc2VcbiAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gKGxlbmd0aCAtIDEpIGluIGFueVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFueSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIgKGFueSkge1xuICByZXR1cm4gdHlwZW9mIGFueSA9PT0gJ251bWJlcidcbn1cbi8qKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5PFN0cmluZz59XG4gKi9cbmZ1bmN0aW9uIGdldEtleXMgKG9iamVjdCkge1xuICBjb25zdCBrZXlzXyA9IE9iamVjdC5rZXlzKG9iamVjdClcbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkge1xuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2UgaWYgKGlzQXJyYXlMaWtlKG9iamVjdCkpIHtcbiAgICBjb25zdCBpbmRleCA9IGtleXNfLmluZGV4T2YoJ2xlbmd0aCcpXG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIGtleXNfLnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSB7XG4gICAgLy8gc29ydFxuICAgIGtleXNfLnNvcnQoKVxuICB9XG4gIHJldHVybiBrZXlzX1xufVxuXG5leHBvcnRzLmdldEtleXMgPSBnZXRLZXlzXG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5XG5leHBvcnRzLmlzQXJyYXlMaWtlID0gaXNBcnJheUxpa2VcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdFxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyXG4iLCJpbXBvcnQgTGlzdEl0ZW0gZnJvbSAnLi9MaXN0SXRlbSc7XG5pbXBvcnQgcmVjdXJzaXZlSXRlcmF0b3IgZnJvbSAncmVjdXJzaXZlLWl0ZXJhdG9yJztcbmltcG9ydCBvYmplY3RQYXRoIGZyb20gJ29iamVjdC1wYXRoJztcblxuY2xhc3MgRGF0YUxpc3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAoe1tldmVudC50YXJnZXQuZGF0YXNldC5maWVsZF06IHBhdGh9KTtcbiAgICB9XG5cbiAgICByZW5kZXJOb2RlcyhkYXRhKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ29iamVjdFBhdGgnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgY2hpbGQgPSA8TGlzdEl0ZW0ga2V5PXtpdGVtLnRvU3RyaW5nKCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2l0ZW19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0PXtkYXRhW2l0ZW1dfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnByb3BzLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250YWluZXI9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLm9iamVjdFBhdGgsIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tUaXRsZT17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250ZW50PXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSl9Lz47XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtpdGVtXSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KGRhdGFbaXRlbV0pID8gdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IGZpZWxkTWFwID0gdGhpcy5wcm9wcy5maWVsZE1hcDtcblxuICAgICAgICBsZXQgZGF0YSA9IHRoaXMucHJvcHMuZGF0YTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhWzBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCB7cGFyZW50LCBub2RlLCBrZXksIHBhdGh9IG9mIG5ldyByZWN1cnNpdmVJdGVyYXRvcihkYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ29iamVjdCcgJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RQYXRoLnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMz5TZWxlY3QgaXRlbXMgY29udGFpbmVyPC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cImpzb24tdHJlZVwiPnt0aGlzLnJlbmRlck5vZGVzKGRhdGEpfTwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG9iamVjdERhdGEgPSBvYmplY3RQYXRoLmdldCh0aGlzLnByb3BzLmRhdGEsIGZpZWxkTWFwLml0ZW1Db250YWluZXIpO1xuXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3REYXRhKSkge1xuICAgICAgICAgICAgICAgIG9iamVjdERhdGEgPSBvYmplY3REYXRhWzBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCB7cGFyZW50LCBub2RlLCBrZXksIHBhdGh9IG9mIG5ldyByZWN1cnNpdmVJdGVyYXRvcihvYmplY3REYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqZWN0RGF0YSwgcGF0aFN0cmluZywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMz5TZWxlY3QgdGl0bGUgYW5kIGNvbnRlbnQgZmllbGRzPC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cImpzb24tdHJlZVwiPnt0aGlzLnJlbmRlck5vZGVzKG9iamVjdERhdGEpfTwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBEYXRhTGlzdDsiLCJpbXBvcnQgRGF0YUxpc3QgZnJvbSAnLi9EYXRhTGlzdCc7XG5pbXBvcnQgZ2V0QXBpRGF0YSBmcm9tICcuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YSc7XG5cbmNsYXNzIEZpZWxkU2VsZWN0aW9uIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGl0ZW1zOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMudXBkYXRlRmllbGRNYXAgPSB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgZ2V0RGF0YSgpIHtcbiAgICAgICAgY29uc3Qge3VybH0gPSB0aGlzLnByb3BzO1xuICAgICAgICBnZXRBcGlEYXRhKHVybClcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgICh7cmVzdWx0fSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCBPYmplY3Qua2V5cyhyZXN1bHQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IEVycm9yKCdDb3VsZCBub3QgZmV0Y2ggZGF0YSBmcm9tIFVSTC4nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7aXNMb2FkZWQ6IHRydWUsIGl0ZW1zOiByZXN1bHR9KTtcbiAgICAgICAgICAgICAgICB9LCAoe2Vycm9yfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdHJ1ZSwgZXJyb3J9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICB0aGlzLmdldERhdGEoKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHtlcnJvciwgaXNMb2FkZWQsIGl0ZW1zfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXY+PHA+RXJyb3I6IHtlcnJvci5tZXNzYWdlfTwvcD48L2Rpdj47XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJzcGlubmVyIGlzLWFjdGl2ZVwiPjwvZGl2PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiA8RGF0YUxpc3RcbiAgICAgICAgICAgICAgICBkYXRhPXtpdGVtc31cbiAgICAgICAgICAgICAgICB1cmw9e3RoaXMucHJvcHMudXJsfVxuICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnByb3BzLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwPXt0aGlzLnVwZGF0ZUZpZWxkTWFwfS8+O1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGaWVsZFNlbGVjdGlvbjsiLCJjb25zdCBJbnB1dEZpZWxkcyA9ICh7ZmllbGRNYXAsIHVybH0pID0+XG4gICAgPGRpdj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX3VybFwiIHZhbHVlPXt1cmx9Lz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX2ZpZWxkbWFwXCIgdmFsdWU9e0pTT04uc3RyaW5naWZ5KGZpZWxkTWFwKX0vPlxuICAgIDwvZGl2PjtcblxuZXhwb3J0IGRlZmF1bHQgSW5wdXRGaWVsZHM7IiwiY29uc3QgTGlzdEl0ZW0gPSAoe3ZhbHVlLCBjaGlsZHJlbiwgZmllbGRNYXAsIG9iamVjdCwgb25DbGlja1RpdGxlLCBvbkNsaWNrQ29udGVudCwgb25DbGlja0NvbnRhaW5lcn0pID0+IHtcbiAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgcmV0dXJuICg8bGk+XG4gICAgICAgICAgICB7QXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgP1xuICAgICAgICAgICAgICAgIDxzcGFuPjxzcGFuIGNsYXNzTmFtZT1cImRhc2hpY29ucyBkYXNoaWNvbnMtcG9ydGZvbGlvXCI+PC9zcGFuPiB7dmFsdWV9IDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwidHJlZS1zZWxlY3RcIiBkYXRhLWZpZWxkPVwiaXRlbUNvbnRhaW5lclwiIG9uQ2xpY2s9e29uQ2xpY2tDb250YWluZXJ9PlNlbGVjdDwvYT48L3NwYW4+IDogIDxzcGFuPnt2YWx1ZX08L3NwYW4+fVxuICAgICAgICAgICAgPHVsPntjaGlsZHJlbn08L3VsPlxuICAgICAgICA8L2xpPik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICg8bGk+XG4gICAgICAgICAgICB7ZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCAmJiBmaWVsZE1hcC50aXRsZSA/IDxzdHJvbmc+VGl0bGU6IDwvc3Ryb25nPiA6ICcnfVxuICAgICAgICAgICAge2ZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCAmJiBmaWVsZE1hcC5jb250ZW50ID8gPHN0cm9uZz5Db250ZW50OiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAgICAgIDxzcGFuPnt2YWx1ZX08L3NwYW4+XG4gICAgICAgICAgICB7IWZpZWxkTWFwLnRpdGxlICYmIChmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgP1xuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwidHJlZS1zZWxlY3RcIiBkYXRhLWZpZWxkPVwidGl0bGVcIiBvbkNsaWNrPXtvbkNsaWNrVGl0bGV9PlRpdGxlPC9hPiA6ICcnfVxuICAgICAgICAgICAgeyFmaWVsZE1hcC5jb250ZW50ICYmIChmaWVsZE1hcC50aXRsZSAhPT0gb2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cImNvbnRlbnRcIiBvbkNsaWNrPXtvbkNsaWNrQ29udGVudH0+Q29udGVudDwvYT4gOiAnJ31cbiAgICAgICAgPC9saT4pO1xuICAgIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IExpc3RJdGVtOyIsImltcG9ydCBGaWVsZFNlbGVjdGlvbiBmcm9tICcuL0ZpZWxkU2VsZWN0aW9uJztcbmltcG9ydCBJbnB1dEZpZWxkcyBmcm9tICcuL0lucHV0RmllbGRzJztcbmltcG9ydCBTdW1tYXJ5IGZyb20gJy4vU3VtbWFyeSc7XG5cbmNsYXNzIFNldHRpbmdzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgICAgIGZpZWxkTWFwOiB7XG4gICAgICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cblxuICAgIGluaXRPcHRpb25zKCkge1xuICAgICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dXJsOiBldmVudC50YXJnZXQudmFsdWV9KTtcbiAgICB9XG5cbiAgICBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7c2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsIHVybDogJycsIGZpZWxkTWFwOiB7aXRlbUNvbnRhaW5lcjogbnVsbCwgdGl0bGU6ICcnLCBjb250ZW50OiAnJ319KTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmllbGRNYXA6IG5ld1ZhbH0pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3Nob3dGaWVsZFNlbGVjdGlvbiwgdXJsfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IHtpdGVtQ29udGFpbmVyLCB0aXRsZSwgY29udGVudH0gPSB0aGlzLnN0YXRlLmZpZWxkTWFwO1xuXG4gICAgICAgIGlmICh1cmwgJiYgaXRlbUNvbnRhaW5lciAhPT0gbnVsbCAmJiB0aXRsZSAmJiBjb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxTdW1tYXJ5IHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKX0gY2xhc3NOYW1lPVwiYnV0dG9uXCI+UmVzZXQgc2V0dGluZ3M8L2E+PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChzaG93RmllbGRTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPEZpZWxkU2VsZWN0aW9uIHVybD17dXJsfSBmaWVsZE1hcD17dGhpcy5zdGF0ZS5maWVsZE1hcH0gdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKX0vPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnN9IGNsYXNzTmFtZT1cImJ1dHRvblwiPlJlc2V0IHNldHRpbmdzPC9hPjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwid3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17dGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+RGF0YSBzb3VyY2U8L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGk+RW50ZXIgYSB2YWxpZCBKU09OIGFwaSB1cmwuPC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3NOYW1lPVwidXJsLWlucHV0XCIgdmFsdWU9e3VybH0gb25DaGFuZ2U9e3RoaXMudXJsQ2hhbmdlLmJpbmQodGhpcyl9Lz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPjxpbnB1dCB0eXBlPVwic3VibWl0XCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIgdmFsdWU9XCJTdWJtaXRcIi8+PC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNldHRpbmdzOyIsImNvbnN0IFN1bW1hcnkgPSAoe3VybCwgZmllbGRNYXB9KSA9PlxuICAgIDxkaXY+XG4gICAgICAgIDxwPlxuICAgICAgICAgICAgPHN0cm9uZz5EYXRhIHNvdXJjZTwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICA8YSBocmVmPXt1cmx9IHRhcmdldD1cIl9ibGFua1wiPnt1cmx9PC9hPlxuICAgICAgICA8L3A+XG4gICAgICAgIDxwPlxuICAgICAgICAgICAgPHN0cm9uZz5UaXRsZTwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICB7ZmllbGRNYXAudGl0bGUucmVwbGFjZSgnLicsICcg4oCTPiAnKX1cbiAgICAgICAgPC9wPlxuICAgICAgICA8cD5cbiAgICAgICAgICAgIDxzdHJvbmc+Q29udGVudDwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICB7ZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpfVxuICAgICAgICA8L3A+XG4gICAgPC9kaXY+O1xuXG5leHBvcnQgZGVmYXVsdCBTdW1tYXJ5OyIsImltcG9ydCBTZXR0aW5ncyBmcm9tICcuL0NvbXBvbmVudHMvU2V0dGluZ3MnO1xuXG5jb25zdCBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbmNvbnN0IGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8U2V0dGluZ3MgLz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdCgpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRGF0YUxpc3QpO1xuXG4gICAgcmV0dXJuIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0xpc3RJdGVtLmRlZmF1bHQsIHtcbiAgICAgICAgICBrZXk6IGl0ZW0udG9TdHJpbmcoKSxcbiAgICAgICAgICB2YWx1ZTogaXRlbSxcbiAgICAgICAgICBvYmplY3Q6IGRhdGFbaXRlbV0sXG4gICAgICAgICAgZmllbGRNYXA6IF90aGlzLnByb3BzLmZpZWxkTWFwLFxuICAgICAgICAgIG9uQ2xpY2tDb250YWluZXI6IGZ1bmN0aW9uIG9uQ2xpY2tDb250YWluZXIoZSkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrQ29udGVudDogZnVuY3Rpb24gb25DbGlja0NvbnRlbnQoZSkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKF90eXBlb2YoZGF0YVtpdGVtXSkgPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgY2hpbGRyZW46IEFycmF5LmlzQXJyYXkoZGF0YVtpdGVtXSkgPyBfdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG4gICAgICB2YXIgZGF0YSA9IHRoaXMucHJvcHMuZGF0YTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9ICcnO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgIGRhdGEgPSBkYXRhWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlO1xuICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gbmV3IF9yZWN1cnNpdmVJdGVyYXRvci5kZWZhdWx0KGRhdGEpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IChfc3RlcCA9IF9pdGVyYXRvci5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwJHZhbHVlID0gX3N0ZXAudmFsdWUsXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gX3N0ZXAkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcCR2YWx1ZS5ub2RlLFxuICAgICAgICAgICAgICAgIGtleSA9IF9zdGVwJHZhbHVlLmtleSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3N0ZXAkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdmFyIHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcblxuICAgICAgICAgICAgICBfb2JqZWN0UGF0aC5kZWZhdWx0LnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvciA9IHRydWU7XG4gICAgICAgICAgX2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgX2l0ZXJhdG9yLnJldHVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImgzXCIsIG51bGwsIFwiU2VsZWN0IGl0ZW1zIGNvbnRhaW5lclwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwianNvbi10cmVlXCJcbiAgICAgICAgfSwgdGhpcy5yZW5kZXJOb2RlcyhkYXRhKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG9iamVjdERhdGEgPSBfb2JqZWN0UGF0aC5kZWZhdWx0LmdldCh0aGlzLnByb3BzLmRhdGEsIGZpZWxkTWFwLml0ZW1Db250YWluZXIpO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgb2JqZWN0RGF0YSA9IG9iamVjdERhdGFbMF07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlO1xuICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IyID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvcjIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IyID0gbmV3IF9yZWN1cnNpdmVJdGVyYXRvci5kZWZhdWx0KG9iamVjdERhdGEpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXAyOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gKF9zdGVwMiA9IF9pdGVyYXRvcjIubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlKSB7XG4gICAgICAgICAgICB2YXIgX3N0ZXAyJHZhbHVlID0gX3N0ZXAyLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwMiR2YWx1ZS5wYXJlbnQsXG4gICAgICAgICAgICAgICAgbm9kZSA9IF9zdGVwMiR2YWx1ZS5ub2RlLFxuICAgICAgICAgICAgICAgIGtleSA9IF9zdGVwMiR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwMiR2YWx1ZS5wYXRoO1xuXG4gICAgICAgICAgICBpZiAoX3R5cGVvZihub2RlKSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgdmFyIF9wYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQob2JqZWN0RGF0YSwgX3BhdGhTdHJpbmcsIF9wYXRoU3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIF9kaWRJdGVyYXRvckVycm9yMiA9IHRydWU7XG4gICAgICAgICAgX2l0ZXJhdG9yRXJyb3IyID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yICYmIF9pdGVyYXRvcjIucmV0dXJuICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgX2l0ZXJhdG9yMi5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yMikge1xuICAgICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImgzXCIsIG51bGwsIFwiU2VsZWN0IHRpdGxlIGFuZCBjb250ZW50IGZpZWxkc1wiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwianNvbi10cmVlXCJcbiAgICAgICAgfSwgdGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBEYXRhTGlzdDtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRGF0YUxpc3Q7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0xpc3RJdGVtXCI6NyxcIm9iamVjdC1wYXRoXCI6MSxcInJlY3Vyc2l2ZS1pdGVyYXRvclwiOjJ9XSw1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0RhdGFMaXN0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9EYXRhTGlzdFwiKSk7XG5cbnZhciBfZ2V0QXBpRGF0YSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbnZhciBGaWVsZFNlbGVjdGlvbiA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoRmllbGRTZWxlY3Rpb24sIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIEZpZWxkU2VsZWN0aW9uKHByb3BzKSB7XG4gICAgdmFyIF90aGlzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEZpZWxkU2VsZWN0aW9uKTtcblxuICAgIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKEZpZWxkU2VsZWN0aW9uKS5jYWxsKHRoaXMsIHByb3BzKSk7XG4gICAgX3RoaXMuc3RhdGUgPSB7XG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgIGl0ZW1zOiBbXVxuICAgIH07XG4gICAgX3RoaXMudXBkYXRlRmllbGRNYXAgPSBfdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRmllbGRTZWxlY3Rpb24sIFt7XG4gICAga2V5OiBcInVwZGF0ZUZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0RGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXREYXRhKCkge1xuICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgIHZhciB1cmwgPSB0aGlzLnByb3BzLnVybDtcbiAgICAgICgwLCBfZ2V0QXBpRGF0YS5kZWZhdWx0KSh1cmwpLnRoZW4oZnVuY3Rpb24gKF9yZWYpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IF9yZWYucmVzdWx0O1xuXG4gICAgICAgIGlmICghcmVzdWx0IHx8IE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICAgIGVycm9yOiBFcnJvcignQ291bGQgbm90IGZldGNoIGRhdGEgZnJvbSBVUkwuJyksXG4gICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMyLnNldFN0YXRlKHtcbiAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICBpdGVtczogcmVzdWx0XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKF9yZWYyKSB7XG4gICAgICAgIHZhciBlcnJvciA9IF9yZWYyLmVycm9yO1xuXG4gICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUgPSB0aGlzLnN0YXRlLFxuICAgICAgICAgIGVycm9yID0gX3RoaXMkc3RhdGUuZXJyb3IsXG4gICAgICAgICAgaXNMb2FkZWQgPSBfdGhpcyRzdGF0ZS5pc0xvYWRlZCxcbiAgICAgICAgICBpdGVtcyA9IF90aGlzJHN0YXRlLml0ZW1zO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgXCJFcnJvcjogXCIsIGVycm9yLm1lc3NhZ2UpKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwic3Bpbm5lciBpcy1hY3RpdmVcIlxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KF9EYXRhTGlzdC5kZWZhdWx0LCB7XG4gICAgICAgICAgZGF0YTogaXRlbXMsXG4gICAgICAgICAgdXJsOiB0aGlzLnByb3BzLnVybCxcbiAgICAgICAgICBmaWVsZE1hcDogdGhpcy5wcm9wcy5maWVsZE1hcCxcbiAgICAgICAgICB1cGRhdGVGaWVsZE1hcDogdGhpcy51cGRhdGVGaWVsZE1hcFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRmllbGRTZWxlY3Rpb247XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IEZpZWxkU2VsZWN0aW9uO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGFcIjoxMSxcIi4vRGF0YUxpc3RcIjo0fV0sNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIElucHV0RmllbGRzID0gZnVuY3Rpb24gSW5wdXRGaWVsZHMoX3JlZikge1xuICB2YXIgZmllbGRNYXAgPSBfcmVmLmZpZWxkTWFwLFxuICAgICAgdXJsID0gX3JlZi51cmw7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl91cmxcIixcbiAgICB2YWx1ZTogdXJsXG4gIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgIHR5cGU6IFwiaGlkZGVuXCIsXG4gICAgbmFtZTogXCJtb2RfanNvbl9yZW5kZXJfZmllbGRtYXBcIixcbiAgICB2YWx1ZTogSlNPTi5zdHJpbmdpZnkoZmllbGRNYXApXG4gIH0pKTtcbn07XG5cbnZhciBfZGVmYXVsdCA9IElucHV0RmllbGRzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbnZhciBMaXN0SXRlbSA9IGZ1bmN0aW9uIExpc3RJdGVtKF9yZWYpIHtcbiAgdmFyIHZhbHVlID0gX3JlZi52YWx1ZSxcbiAgICAgIGNoaWxkcmVuID0gX3JlZi5jaGlsZHJlbixcbiAgICAgIGZpZWxkTWFwID0gX3JlZi5maWVsZE1hcCxcbiAgICAgIG9iamVjdCA9IF9yZWYub2JqZWN0LFxuICAgICAgb25DbGlja1RpdGxlID0gX3JlZi5vbkNsaWNrVGl0bGUsXG4gICAgICBvbkNsaWNrQ29udGVudCA9IF9yZWYub25DbGlja0NvbnRlbnQsXG4gICAgICBvbkNsaWNrQ29udGFpbmVyID0gX3JlZi5vbkNsaWNrQ29udGFpbmVyO1xuXG4gIGlmIChjaGlsZHJlbikge1xuICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgQXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCB7XG4gICAgICBjbGFzc05hbWU6IFwiZGFzaGljb25zIGRhc2hpY29ucy1wb3J0Zm9saW9cIlxuICAgIH0pLCBcIiBcIiwgdmFsdWUsIFwiIFwiLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICBocmVmOiBcIiNcIixcbiAgICAgIGNsYXNzTmFtZTogXCJ0cmVlLXNlbGVjdFwiLFxuICAgICAgXCJkYXRhLWZpZWxkXCI6IFwiaXRlbUNvbnRhaW5lclwiLFxuICAgICAgb25DbGljazogb25DbGlja0NvbnRhaW5lclxuICAgIH0sIFwiU2VsZWN0XCIpKSA6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIG51bGwsIGNoaWxkcmVuKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBmaWVsZE1hcC50aXRsZSA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLnRpdGxlID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIlRpdGxlOiBcIikgOiAnJywgZmllbGRNYXAuY29udGVudCA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLmNvbnRlbnQgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiQ29udGVudDogXCIpIDogJycsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgIWZpZWxkTWFwLnRpdGxlICYmIGZpZWxkTWFwLmNvbnRlbnQgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcInRpdGxlXCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrVGl0bGVcbiAgICB9LCBcIlRpdGxlXCIpIDogJycsICFmaWVsZE1hcC5jb250ZW50ICYmIGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgY2xhc3NOYW1lOiBcInRyZWUtc2VsZWN0XCIsXG4gICAgICBcImRhdGEtZmllbGRcIjogXCJjb250ZW50XCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGVudFxuICAgIH0sIFwiQ29udGVudFwiKSA6ICcnKTtcbiAgfVxufTtcblxudmFyIF9kZWZhdWx0ID0gTGlzdEl0ZW07XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9GaWVsZFNlbGVjdGlvbiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRmllbGRTZWxlY3Rpb25cIikpO1xuXG52YXIgX0lucHV0RmllbGRzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9JbnB1dEZpZWxkc1wiKSk7XG5cbnZhciBfU3VtbWFyeSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vU3VtbWFyeVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgU2V0dGluZ3MgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKFNldHRpbmdzLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBTZXR0aW5ncyhwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBTZXR0aW5ncyk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihTZXR0aW5ncykuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgIHVybDogJycsXG4gICAgICBmaWVsZE1hcDoge1xuICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoU2V0dGluZ3MsIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbml0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0T3B0aW9ucygpIHtcbiAgICAgIGlmICh0eXBlb2YgbW9kSnNvblJlbmRlci5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IG1vZEpzb25SZW5kZXIub3B0aW9ucztcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVybENoYW5nZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB1cmw6IGV2ZW50LnRhcmdldC52YWx1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImhhbmRsZVN1Ym1pdFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVzZXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICB1cmw6ICcnLFxuICAgICAgICBmaWVsZE1hcDoge1xuICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdmFyIG5ld1ZhbCA9IE9iamVjdC5hc3NpZ24odGhpcy5zdGF0ZS5maWVsZE1hcCwgdmFsdWUpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGZpZWxkTWFwOiBuZXdWYWxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb24gPSBfdGhpcyRzdGF0ZS5zaG93RmllbGRTZWxlY3Rpb24sXG4gICAgICAgICAgdXJsID0gX3RoaXMkc3RhdGUudXJsO1xuICAgICAgdmFyIF90aGlzJHN0YXRlJGZpZWxkTWFwID0gdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICBpdGVtQ29udGFpbmVyID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuaXRlbUNvbnRhaW5lcixcbiAgICAgICAgICB0aXRsZSA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLnRpdGxlLFxuICAgICAgICAgIGNvbnRlbnQgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC5jb250ZW50O1xuXG4gICAgICBpZiAodXJsICYmIGl0ZW1Db250YWluZXIgIT09IG51bGwgJiYgdGl0bGUgJiYgY29udGVudCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9TdW1tYXJ5LmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgICAgIG9uQ2xpY2s6IHRoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyksXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvblwiXG4gICAgICAgIH0sIFwiUmVzZXQgc2V0dGluZ3NcIikpKTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0ZpZWxkU2VsZWN0aW9uLmRlZmF1bHQsIHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBmaWVsZE1hcDogdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICB1cGRhdGVGaWVsZE1hcDogdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpXG4gICAgICAgIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgICAgIG9uQ2xpY2s6IHRoaXMucmVzZXRPcHRpb25zLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCBcIlJlc2V0IHNldHRpbmdzXCIpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcIndyYXBcIlxuICAgICAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiLCB7XG4gICAgICAgICAgb25TdWJtaXQ6IHRoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcylcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImxhYmVsXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJEYXRhIHNvdXJjZVwiKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwgbnVsbCwgXCJFbnRlciBhIHZhbGlkIEpTT04gYXBpIHVybC5cIikpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJ1cmwtaW5wdXRcIixcbiAgICAgICAgICB2YWx1ZTogdXJsLFxuICAgICAgICAgIG9uQ2hhbmdlOiB0aGlzLnVybENoYW5nZS5iaW5kKHRoaXMpXG4gICAgICAgIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwic3VibWl0XCIsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvbiBidXR0b24tcHJpbWFyeVwiLFxuICAgICAgICAgIHZhbHVlOiBcIlN1Ym1pdFwiXG4gICAgICAgIH0pKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gU2V0dGluZ3M7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IFNldHRpbmdzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9GaWVsZFNlbGVjdGlvblwiOjUsXCIuL0lucHV0RmllbGRzXCI6NixcIi4vU3VtbWFyeVwiOjl9XSw5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgU3VtbWFyeSA9IGZ1bmN0aW9uIFN1bW1hcnkoX3JlZikge1xuICB2YXIgdXJsID0gX3JlZi51cmwsXG4gICAgICBmaWVsZE1hcCA9IF9yZWYuZmllbGRNYXA7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJEYXRhIHNvdXJjZVwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgaHJlZjogdXJsLFxuICAgIHRhcmdldDogXCJfYmxhbmtcIlxuICB9LCB1cmwpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIlRpdGxlXCIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnJcIiwgbnVsbCksIGZpZWxkTWFwLnRpdGxlLnJlcGxhY2UoJy4nLCAnIOKAkz4gJykpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiQ29udGVudFwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBmaWVsZE1hcC5jb250ZW50LnJlcGxhY2UoJy4nLCAnIOKAkz4gJykpKTtcbn07XG5cbnZhciBfZGVmYXVsdCA9IFN1bW1hcnk7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sMTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfU2V0dGluZ3MgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG52YXIgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcblJlYWN0RE9NLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KF9TZXR0aW5ncy5kZWZhdWx0LCBudWxsKSwgZG9tRWxlbWVudCk7XG5cbn0se1wiLi9Db21wb25lbnRzL1NldHRpbmdzXCI6OH1dLDExOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICByZXR1cm4gZmV0Y2godXJsKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICByZXR1cm4gcmVzLmpzb24oKTtcbiAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgfTtcbiAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yOiBlcnJvclxuICAgIH07XG4gIH0pO1xufVxuXG52YXIgX2RlZmF1bHQgPSBnZXRBcGlEYXRhO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dfSx7fSxbMTBdKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YjJKcVpXTjBMWEJoZEdndmFXNWtaWGd1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12Y21WamRYSnphWFpsTFdsMFpYSmhkRzl5TDNOeVl5OVNaV04xY25OcGRtVkpkR1Z5WVhSdmNpNXFjeUlzSW01dlpHVmZiVzlrZFd4bGN5OXlaV04xY25OcGRtVXRhWFJsY21GMGIzSXZjM0pqTDJ4aGJtY3Vhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5RVlYUmhUR2x6ZEM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMFpwWld4a1UyVnNaV04wYVc5dUxtcHpJaXdpYzI5MWNtTmxMMnB6TDBGa2JXbHVMME52YlhCdmJtVnVkSE12U1c1d2RYUkdhV1ZzWkhNdWFuTWlMQ0p6YjNWeVkyVXZhbk12UVdSdGFXNHZRMjl0Y0c5dVpXNTBjeTlNYVhOMFNYUmxiUzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5RGIyMXdiMjVsYm5SekwxTmxkSFJwYm1kekxtcHpJaXdpYzI5MWNtTmxMMnB6TDBGa2JXbHVMME52YlhCdmJtVnVkSE12VTNWdGJXRnllUzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5SmJtUmxlRUZrYldsdUxtcHpJaXdpYzI5MWNtTmxMMnB6TDFWMGFXeHBkR2xsY3k5blpYUkJjR2xFWVhSaExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOd1UwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU55U1VFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN096czdPenM3T3p0QlF5OUVRVHM3UVVGRFFUczdRVUZEUVRzN096czdPenM3T3pzN096czdPenM3T3pzN096czdPMGxCUlUwc1VUczdPenM3T3pzN096czdPenRuUTBGRFZTeEpMRVZCUVUwc1N5eEZRVUZQTzBGQlEzSkNMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEV0QlFVd3NRMEZCVnl4alFVRllMSEZDUVVFMFFpeExRVUZMTEVOQlFVTXNUVUZCVGl4RFFVRmhMRTlCUVdJc1EwRkJjVUlzUzBGQmFrUXNSVUZCZVVRc1NVRkJla1E3UVVGRFNEczdPMmREUVVWWExFa3NSVUZCVFR0QlFVRkJPenRCUVVOa0xHRkJRVThzVFVGQlRTeERRVUZETEVsQlFWQXNRMEZCV1N4SlFVRmFMRVZCUVd0Q0xFZEJRV3hDTEVOQlFYTkNMRlZCUVVFc1NVRkJTU3hGUVVGSk8wRkJRMnBETEZsQlFVa3NTVUZCU1N4TFFVRkxMRmxCUVdJc1JVRkJNa0k3UVVGRGRrSTdRVUZEU0RzN1FVRkZSQ3haUVVGSkxFdEJRVXNzUjBGQlJ5eHZRa0ZCUXl4cFFrRkJSRHRCUVVGVkxGVkJRVUVzUjBGQlJ5eEZRVUZGTEVsQlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdZN1FVRkRWU3hWUVVGQkxFdEJRVXNzUlVGQlJTeEpRVVJxUWp0QlFVVlZMRlZCUVVFc1RVRkJUU3hGUVVGRkxFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlJuUkNPMEZCUjFVc1ZVRkJRU3hSUVVGUkxFVkJRVVVzUzBGQlNTeERRVUZETEV0QlFVd3NRMEZCVnl4UlFVZ3ZRanRCUVVsVkxGVkJRVUVzWjBKQlFXZENMRVZCUVVVc01FSkJRVUVzUTBGQlF6dEJRVUZCTEcxQ1FVRkpMRXRCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1EwRkJWeXhWUVVFMVFpeEZRVUYzUXl4RFFVRjRReXhEUVVGS08wRkJRVUVzVjBGS04wSTdRVUZMVlN4VlFVRkJMRmxCUVZrc1JVRkJSU3h6UWtGQlFTeERRVUZETzBGQlFVRXNiVUpCUVVrc1MwRkJTU3hEUVVGRExGZEJRVXdzUTBGQmFVSXNTVUZCU1N4RFFVRkRMRWxCUVVRc1EwRkJja0lzUlVGQk5rSXNRMEZCTjBJc1EwRkJTanRCUVVGQkxGZEJUSHBDTzBGQlRWVXNWVUZCUVN4alFVRmpMRVZCUVVVc2QwSkJRVUVzUTBGQlF6dEJRVUZCTEcxQ1FVRkpMRXRCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVhKQ0xFVkJRVFpDTEVOQlFUZENMRU5CUVVvN1FVRkJRVHRCUVU0elFpeFZRVUZhT3p0QlFWRkJMRmxCUVVrc1VVRkJUeXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZZTEUxQlFYTkNMRkZCUVhSQ0xFbEJRV3RETEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1MwRkJaU3hKUVVGeVJDeEZRVUV5UkR0QlFVTjJSQ3hWUVVGQkxFdEJRVXNzUjBGQlJ5eExRVUZMTEVOQlFVTXNXVUZCVGl4RFFVRnRRaXhMUVVGdVFpeEZRVUV3UWp0QlFVTTVRaXhaUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRV3hDTEVsQlFUUkNMRXRCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1EwRkJWeXhEUVVGWUxFTkJRV3BDTEVOQlFUVkNMRWRCUVRoRUxFdEJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRWEpDTzBGQlJERkRMRmRCUVRGQ0xFTkJRVkk3UVVGSFNEczdRVUZGUkN4bFFVRlBMRXRCUVZBN1FVRkRTQ3hQUVhCQ1RTeERRVUZRTzBGQmNVSklPenM3TmtKQlJWRTdRVUZEVEN4VlFVRk5MRkZCUVZFc1IwRkJSeXhMUVVGTExFdEJRVXdzUTBGQlZ5eFJRVUUxUWp0QlFVVkJMRlZCUVVrc1NVRkJTU3hIUVVGSExFdEJRVXNzUzBGQlRDeERRVUZYTEVsQlFYUkNPenRCUVVOQkxGVkJRVWtzUzBGQlN5eERRVUZETEU5QlFVNHNRMEZCWXl4SlFVRmtMRU5CUVVvc1JVRkJlVUk3UVVGRGNrSXNVVUZCUVN4UlFVRlJMRU5CUVVNc1lVRkJWQ3hIUVVGNVFpeEZRVUY2UWp0QlFVTklPenRCUVVWRUxGVkJRVWtzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJMMElzUlVGQmNVTTdRVUZEYWtNc1dVRkJTU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEVsQlFXUXNRMEZCU2l4RlFVRjVRanRCUVVOeVFpeFZRVUZCTEVsQlFVa3NSMEZCUnl4SlFVRkpMRU5CUVVNc1EwRkJSQ3hEUVVGWU8wRkJRMGc3TzBGQlNHZERPMEZCUVVFN1FVRkJRVHM3UVVGQlFUdEJRVXRxUXl3clFrRkJjME1zU1VGQlNTd3dRa0ZCU2l4RFFVRnpRaXhKUVVGMFFpeERRVUYwUXl3NFNFRkJiVVU3UVVGQlFUdEJRVUZCTEdkQ1FVRjZSQ3hOUVVGNVJDeGxRVUY2UkN4TlFVRjVSRHRCUVVGQkxHZENRVUZxUkN4SlFVRnBSQ3hsUVVGcVJDeEpRVUZwUkR0QlFVRkJMR2RDUVVFelF5eEhRVUV5UXl4bFFVRXpReXhIUVVFeVF6dEJRVUZCTEdkQ1FVRjBReXhKUVVGelF5eGxRVUYwUXl4SlFVRnpRenM3UVVGREwwUXNaMEpCUVVrc1VVRkJUeXhKUVVGUUxFMUJRV2RDTEZGQlFXaENMRWxCUVRSQ0xFbEJRVWtzUzBGQlN5eEpRVUY2UXl4RlFVRXJRenRCUVVNelF5eHJRa0ZCU1N4VlFVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVXdzUTBGQlZTeEhRVUZXTEVOQlFXcENPenRCUVVOQkxHdERRVUZYTEVkQlFWZ3NRMEZCWlN4SlFVRm1MRVZCUVhGQ0xGVkJRVlVzUjBGQlJ5eGhRVUZzUXl4RlFVRnBSQ3hWUVVGcVJEdEJRVU5JTzBGQlEwbzdRVUZXWjBNN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUczdRVUZaYWtNc1pVRkRTU3hwUTBGRFNTeDVSRUZFU2l4RlFVVkpPMEZCUVVrc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlpDeFhRVUV5UWl4TFFVRkxMRmRCUVV3c1EwRkJhVUlzU1VGQmFrSXNRMEZCTTBJc1EwRkdTaXhEUVVSS08wRkJUVWdzVDBGc1FrUXNUVUZyUWs4N1FVRkRTQ3haUVVGSkxGVkJRVlVzUjBGQlJ5eHZRa0ZCVnl4SFFVRllMRU5CUVdVc1MwRkJTeXhMUVVGTUxFTkJRVmNzU1VGQk1VSXNSVUZCWjBNc1VVRkJVU3hEUVVGRExHRkJRWHBETEVOQlFXcENPenRCUVVWQkxGbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVNHNRMEZCWXl4VlFVRmtMRU5CUVVvc1JVRkJLMEk3UVVGRE0wSXNWVUZCUVN4VlFVRlZMRWRCUVVjc1ZVRkJWU3hEUVVGRExFTkJRVVFzUTBGQmRrSTdRVUZEU0RzN1FVRk1SVHRCUVVGQk8wRkJRVUU3TzBGQlFVRTdRVUZQU0N4blEwRkJjME1zU1VGQlNTd3dRa0ZCU2l4RFFVRnpRaXhWUVVGMFFpeERRVUYwUXl4dFNVRkJlVVU3UVVGQlFUdEJRVUZCTEdkQ1FVRXZSQ3hOUVVFclJDeG5Ra0ZCTDBRc1RVRkJLMFE3UVVGQlFTeG5Ra0ZCZGtRc1NVRkJkVVFzWjBKQlFYWkVMRWxCUVhWRU8wRkJRVUVzWjBKQlFXcEVMRWRCUVdsRUxHZENRVUZxUkN4SFFVRnBSRHRCUVVGQkxHZENRVUUxUXl4SlFVRTBReXhuUWtGQk5VTXNTVUZCTkVNN08wRkJRM0pGTEdkQ1FVRkpMRkZCUVU4c1NVRkJVQ3hOUVVGblFpeFJRVUZ3UWl4RlFVRTRRanRCUVVNeFFpeHJRa0ZCU1N4WFFVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVXdzUTBGQlZTeEhRVUZXTEVOQlFXcENPenRCUVVOQkxHdERRVUZYTEVkQlFWZ3NRMEZCWlN4VlFVRm1MRVZCUVRKQ0xGZEJRVE5DTEVWQlFYVkRMRmRCUVhaRE8wRkJRMGc3UVVGRFNqdEJRVnBGTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN08wRkJZMGdzWlVGRFNTeHBRMEZEU1N4clJVRkVTaXhGUVVWSk8wRkJRVWtzVlVGQlFTeFRRVUZUTEVWQlFVTTdRVUZCWkN4WFFVRXlRaXhMUVVGTExGZEJRVXdzUTBGQmFVSXNWVUZCYWtJc1EwRkJNMElzUTBGR1NpeERRVVJLTzBGQlRVZzdRVUZEU2pzN096dEZRVGRGYTBJc1MwRkJTeXhEUVVGRExGTTdPMlZCWjBaa0xGRTdPenM3T3pzN096czdPMEZEY0VabU96dEJRVU5CT3pzN096czdPenM3T3pzN096czdPenM3T3pzN08wbEJSVTBzWXpzN096czdRVUZEUml3d1FrRkJXU3hMUVVGYUxFVkJRVzFDTzBGQlFVRTdPMEZCUVVFN08wRkJRMllzZDBaQlFVMHNTMEZCVGp0QlFVTkJMRlZCUVVzc1MwRkJUQ3hIUVVGaE8wRkJRMVFzVFVGQlFTeExRVUZMTEVWQlFVVXNTVUZFUlR0QlFVVlVMRTFCUVVFc1VVRkJVU3hGUVVGRkxFdEJSa1E3UVVGSFZDeE5RVUZCTEV0QlFVc3NSVUZCUlR0QlFVaEZMRXRCUVdJN1FVRk5RU3hWUVVGTExHTkJRVXdzUjBGQmMwSXNUVUZCU3l4alFVRk1MRU5CUVc5Q0xFbEJRWEJDTEhWRVFVRjBRanRCUVZKbE8wRkJVMnhDT3pzN08yMURRVVZqTEVzc1JVRkJUenRCUVVOc1FpeFhRVUZMTEV0QlFVd3NRMEZCVnl4alFVRllMRU5CUVRCQ0xFdEJRVEZDTzBGQlEwZzdPenM0UWtGRlV6dEJRVUZCT3p0QlFVRkJMRlZCUTBNc1IwRkVSQ3hIUVVOUkxFdEJRVXNzUzBGRVlpeERRVU5ETEVkQlJFUTdRVUZGVGl3clFrRkJWeXhIUVVGWUxFVkJRMHNzU1VGRVRDeERRVVZSTEdkQ1FVRmpPMEZCUVVFc1dVRkJXaXhOUVVGWkxGRkJRVm9zVFVGQldUczdRVUZEVml4WlFVRkpMRU5CUVVNc1RVRkJSQ3hKUVVGWExFMUJRVTBzUTBGQlF5eEpRVUZRTEVOQlFWa3NUVUZCV2l4RlFVRnZRaXhOUVVGd1FpeExRVUVyUWl4RFFVRTVReXhGUVVGcFJEdEJRVU0zUXl4VlFVRkJMRTFCUVVrc1EwRkJReXhSUVVGTUxFTkJRV003UVVGRFZpeFpRVUZCTEV0QlFVc3NSVUZCUlN4TFFVRkxMRU5CUVVNc1owTkJRVVFzUTBGRVJqdEJRVVZXTEZsQlFVRXNVVUZCVVN4RlFVRkZPMEZCUmtFc1YwRkJaRHM3UVVGSlFUdEJRVU5JT3p0QlFVTkVMRkZCUVVFc1RVRkJTU3hEUVVGRExGRkJRVXdzUTBGQll6dEJRVUZETEZWQlFVRXNVVUZCVVN4RlFVRkZMRWxCUVZnN1FVRkJhVUlzVlVGQlFTeExRVUZMTEVWQlFVVTdRVUZCZUVJc1UwRkJaRHRCUVVOSUxFOUJXRlFzUlVGWFZ5eHBRa0ZCWVR0QlFVRkJMRmxCUVZnc1MwRkJWeXhUUVVGWUxFdEJRVmM3TzBGQlExb3NVVUZCUVN4TlFVRkpMRU5CUVVNc1VVRkJUQ3hEUVVGak8wRkJRVU1zVlVGQlFTeFJRVUZSTEVWQlFVVXNTVUZCV0R0QlFVRnBRaXhWUVVGQkxFdEJRVXNzUlVGQlREdEJRVUZxUWl4VFFVRmtPMEZCUTBnc1QwRmlWRHRCUVdWSU96czdkME5CUlcxQ08wRkJRMmhDTEZkQlFVc3NUMEZCVER0QlFVTklPenM3TmtKQlJWRTdRVUZCUVN4M1FrRkRORUlzUzBGQlN5eExRVVJxUXp0QlFVRkJMRlZCUTBVc1MwRkVSaXhsUVVORkxFdEJSRVk3UVVGQlFTeFZRVU5UTEZGQlJGUXNaVUZEVXl4UlFVUlVPMEZCUVVFc1ZVRkRiVUlzUzBGRWJrSXNaVUZEYlVJc1MwRkVia0k3TzBGQlJVd3NWVUZCU1N4TFFVRktMRVZCUVZjN1FVRkRVQ3hsUVVGUExHbERRVUZMTERCRFFVRlhMRXRCUVVzc1EwRkJReXhQUVVGcVFpeERRVUZNTEVOQlFWQTdRVUZEU0N4UFFVWkVMRTFCUlU4c1NVRkJTU3hEUVVGRExGRkJRVXdzUlVGQlpUdEJRVU5zUWl4bFFVRlBPMEZCUVVzc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlppeFZRVUZRTzBGQlEwZ3NUMEZHVFN4TlFVVkJPMEZCUTBnc1pVRkJUeXh2UWtGQlF5eHBRa0ZCUkR0QlFVTklMRlZCUVVFc1NVRkJTU3hGUVVGRkxFdEJSRWc3UVVGRlNDeFZRVUZCTEVkQlFVY3NSVUZCUlN4TFFVRkxMRXRCUVV3c1EwRkJWeXhIUVVaaU8wRkJSMGdzVlVGQlFTeFJRVUZSTEVWQlFVVXNTMEZCU3l4TFFVRk1MRU5CUVZjc1VVRkliRUk3UVVGSlNDeFZRVUZCTEdOQlFXTXNSVUZCUlN4TFFVRkxPMEZCU214Q0xGVkJRVkE3UVVGTFNEdEJRVU5LT3pzN08wVkJjRVIzUWl4TFFVRkxMRU5CUVVNc1V6czdaVUYxUkhCQ0xHTTdPenM3T3pzN096czdPMEZETVVSbUxFbEJRVTBzVjBGQlZ5eEhRVUZITEZOQlFXUXNWMEZCWXp0QlFVRkJMRTFCUVVVc1VVRkJSaXhSUVVGRkxGRkJRVVk3UVVGQlFTeE5RVUZaTEVkQlFWb3NVVUZCV1N4SFFVRmFPMEZCUVVFc1UwRkRhRUlzYVVOQlEwazdRVUZCVHl4SlFVRkJMRWxCUVVrc1JVRkJReXhSUVVGYU8wRkJRWEZDTEVsQlFVRXNTVUZCU1N4RlFVRkRMSEZDUVVFeFFqdEJRVUZuUkN4SlFVRkJMRXRCUVVzc1JVRkJSVHRCUVVGMlJDeEpRVVJLTEVWQlJVazdRVUZCVHl4SlFVRkJMRWxCUVVrc1JVRkJReXhSUVVGYU8wRkJRWEZDTEVsQlFVRXNTVUZCU1N4RlFVRkRMREJDUVVFeFFqdEJRVUZ4UkN4SlFVRkJMRXRCUVVzc1JVRkJSU3hKUVVGSkxFTkJRVU1zVTBGQlRDeERRVUZsTEZGQlFXWTdRVUZCTlVRc1NVRkdTaXhEUVVSblFqdEJRVUZCTEVOQlFYQkNPenRsUVUxbExGYzdPenM3T3pzN096czdPMEZEVG1Zc1NVRkJUU3hSUVVGUkxFZEJRVWNzVTBGQldDeFJRVUZYTEU5QlFYbEdPMEZCUVVFc1RVRkJka1lzUzBGQmRVWXNVVUZCZGtZc1MwRkJkVVk3UVVGQlFTeE5RVUZvUml4UlFVRm5SaXhSUVVGb1JpeFJRVUZuUmp0QlFVRkJMRTFCUVhSRkxGRkJRWE5GTEZGQlFYUkZMRkZCUVhORk8wRkJRVUVzVFVGQk5VUXNUVUZCTkVRc1VVRkJOVVFzVFVGQk5FUTdRVUZCUVN4TlFVRndSQ3haUVVGdlJDeFJRVUZ3UkN4WlFVRnZSRHRCUVVGQkxFMUJRWFJETEdOQlFYTkRMRkZCUVhSRExHTkJRWE5ETzBGQlFVRXNUVUZCZEVJc1owSkJRWE5DTEZGQlFYUkNMR2RDUVVGelFqczdRVUZEZEVjc1RVRkJTU3hSUVVGS0xFVkJRV003UVVGRFZpeFhRVUZSTEdkRFFVTklMRXRCUVVzc1EwRkJReXhQUVVGT0xFTkJRV01zVFVGQlpDeExRVUY1UWl4UlFVRlJMRU5CUVVNc1lVRkJWQ3hMUVVFeVFpeEpRVUZ3UkN4SFFVTkhMR3REUVVGTk8wRkJRVTBzVFVGQlFTeFRRVUZUTEVWQlFVTTdRVUZCYUVJc1RVRkJUaXhQUVVFclJDeExRVUV2UkN4UFFVRnpSVHRCUVVGSExFMUJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4TlFVRkJMRk5CUVZNc1JVRkJReXhoUVVGMFFqdEJRVUZ2UXl4dlFrRkJWeXhsUVVFdlF6dEJRVUVyUkN4TlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVGNFJTeG5Ra0ZCZEVVc1EwRkVTQ3hIUVVOM1RDeHJRMEZCVHl4TFFVRlFMRU5CUm5KTUxFVkJSMG9zWjBOQlFVc3NVVUZCVEN4RFFVaEpMRU5CUVZJN1FVRkxTQ3hIUVU1RUxFMUJUVTg3UVVGRFNDeFhRVUZSTEdkRFFVTklMRkZCUVZFc1EwRkJReXhMUVVGVUxFdEJRVzFDTEUxQlFXNUNMRWxCUVRaQ0xGRkJRVkVzUTBGQlF5eExRVUYwUXl4SFFVRTRReXc0UTBGQk9VTXNSMEZCZVVVc1JVRkVkRVVzUlVGRlNDeFJRVUZSTEVOQlFVTXNUMEZCVkN4TFFVRnhRaXhOUVVGeVFpeEpRVUVyUWl4UlFVRlJMRU5CUVVNc1QwRkJlRU1zUjBGQmEwUXNaMFJCUVd4RUxFZEJRU3RGTEVWQlJqVkZMRVZCUjBvc2EwTkJRVThzUzBGQlVDeERRVWhKTEVWQlNVZ3NRMEZCUXl4UlFVRlJMRU5CUVVNc1MwRkJWaXhKUVVGdlFpeFJRVUZSTEVOQlFVTXNUMEZCVkN4TFFVRnhRaXhOUVVGNlF5eEpRVUZ2UkN4UlFVRlJMRU5CUVVNc1lVRkJWQ3hMUVVFeVFpeEpRVUV2UlN4SFFVTkhPMEZCUVVjc1RVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEUxQlFVRXNVMEZCVXl4RlFVRkRMR0ZCUVhSQ08wRkJRVzlETEc5Q1FVRlhMRTlCUVM5RE8wRkJRWFZFTEUxQlFVRXNUMEZCVHl4RlFVRkZPMEZCUVdoRkxHVkJSRWdzUjBGRE5rWXNSVUZNTVVZc1JVRk5TQ3hEUVVGRExGRkJRVkVzUTBGQlF5eFBRVUZXTEVsQlFYTkNMRkZCUVZFc1EwRkJReXhMUVVGVUxFdEJRVzFDTEUxQlFYcERMRWxCUVc5RUxGRkJRVkVzUTBGQlF5eGhRVUZVTEV0QlFUSkNMRWxCUVM5RkxFZEJRMGM3UVVGQlJ5eE5RVUZCTEVsQlFVa3NSVUZCUXl4SFFVRlNPMEZCUVZrc1RVRkJRU3hUUVVGVExFVkJRVU1zWVVGQmRFSTdRVUZCYjBNc2IwSkJRVmNzVTBGQkwwTTdRVUZCZVVRc1RVRkJRU3hQUVVGUExFVkJRVVU3UVVGQmJFVXNhVUpCUkVnc1IwRkRiVWNzUlVGUWFFY3NRMEZCVWp0QlFWTklPMEZCUTBvc1EwRnNRa1E3TzJWQmIwSmxMRkU3T3pzN096czdPenM3TzBGRGNFSm1PenRCUVVOQk96dEJRVU5CT3pzN096czdPenM3T3pzN096czdPenM3T3pzN08wbEJSVTBzVVRzN096czdRVUZEUml4dlFrRkJXU3hMUVVGYUxFVkJRVzFDTzBGQlFVRTdPMEZCUVVFN08wRkJRMllzYTBaQlFVMHNTMEZCVGp0QlFVTkJMRlZCUVVzc1MwRkJUQ3hIUVVGaE8wRkJRMVFzVFVGQlFTeHJRa0ZCYTBJc1JVRkJSU3hMUVVSWU8wRkJSVlFzVFVGQlFTeEhRVUZITEVWQlFVVXNSVUZHU1R0QlFVZFVMRTFCUVVFc1VVRkJVU3hGUVVGRk8wRkJRMDRzVVVGQlFTeGhRVUZoTEVWQlFVVXNTVUZFVkR0QlFVVk9MRkZCUVVFc1MwRkJTeXhGUVVGRkxFVkJSa1E3UVVGSFRpeFJRVUZCTEU5QlFVOHNSVUZCUlR0QlFVaElPMEZCU0VRc1MwRkJZanRCUVVabE8wRkJWMnhDT3pzN08zZERRVVZ0UWp0QlFVTm9RaXhYUVVGTExGZEJRVXc3UVVGRFNEczdPMnREUVVWaE8wRkJRMVlzVlVGQlNTeFBRVUZQTEdGQlFXRXNRMEZCUXl4UFFVRnlRaXhMUVVGcFF5eFhRVUZ5UXl4RlFVRnJSRHRCUVVNNVF5eFpRVUZOTEU5QlFVOHNSMEZCUnl4aFFVRmhMRU5CUVVNc1QwRkJPVUk3UVVGRFFTeGhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVTldMRlZCUVVFc1IwRkJSeXhGUVVGRkxFOUJRVThzUTBGQlF5eEhRVUZTTEVkQlFXTXNUMEZCVHl4RFFVRkRMRWRCUVhSQ0xFZEJRVFJDTEVWQlJIWkNPMEZCUlZZc1ZVRkJRU3hSUVVGUkxFVkJRVVVzVDBGQlR5eERRVUZETEZGQlFWSXNSMEZCYlVJc1NVRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFBRVUZQTEVOQlFVTXNVVUZCYmtJc1EwRkJia0lzUjBGQmEwUTdRVUZEZUVRc1dVRkJRU3hoUVVGaExFVkJRVVVzU1VGRWVVTTdRVUZGZUVRc1dVRkJRU3hMUVVGTExFVkJRVVVzUlVGR2FVUTdRVUZIZUVRc1dVRkJRU3hQUVVGUExFVkJRVVU3UVVGSUswTXNWMEZHYkVRN1FVRlBWaXhWUVVGQkxHdENRVUZyUWl4RlFVRkZMRU5CUVVNc1EwRkJReXhQUVVGUExFTkJRVU03UVVGUWNFSXNVMEZCWkR0QlFWTklPMEZCUTBvN096czRRa0ZGVXl4TExFVkJRVTg3UVVGRFlpeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc1IwRkJSeXhGUVVGRkxFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRTdRVUZCYmtJc1QwRkJaRHRCUVVOSU96czdhVU5CUlZrc1N5eEZRVUZQTzBGQlEyaENMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc2EwSkJRV3RDTEVWQlFVVTdRVUZCY2tJc1QwRkJaRHRCUVVOSU96czdhVU5CUlZrc1N5eEZRVUZQTzBGQlEyaENMRTFCUVVFc1MwRkJTeXhEUVVGRExHTkJRVTQ3UVVGRFFTeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc2EwSkJRV3RDTEVWQlFVVXNTMEZCY2tJN1FVRkJORUlzVVVGQlFTeEhRVUZITEVWQlFVVXNSVUZCYWtNN1FVRkJjVU1zVVVGQlFTeFJRVUZSTEVWQlFVVTdRVUZCUXl4VlFVRkJMR0ZCUVdFc1JVRkJSU3hKUVVGb1FqdEJRVUZ6UWl4VlFVRkJMRXRCUVVzc1JVRkJSU3hGUVVFM1FqdEJRVUZwUXl4VlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVFeFF6dEJRVUV2UXl4UFFVRmtPMEZCUTBnN096dHRRMEZGWXl4TExFVkJRVTg3UVVGRGJFSXNWVUZCVFN4TlFVRk5MRWRCUVVjc1RVRkJUU3hEUVVGRExFMUJRVkFzUTBGQll5eExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVRjZRaXhGUVVGdFF5eExRVUZ1UXl4RFFVRm1PMEZCUTBFc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEZGQlFWRXNSVUZCUlR0QlFVRllMRTlCUVdRN1FVRkRTRHM3T3paQ1FVVlJPMEZCUVVFc2QwSkJRelpDTEV0QlFVc3NTMEZFYkVNN1FVRkJRU3hWUVVORkxHdENRVVJHTEdWQlEwVXNhMEpCUkVZN1FVRkJRU3hWUVVOelFpeEhRVVIwUWl4bFFVTnpRaXhIUVVSMFFqdEJRVUZCTEdsRFFVVnRReXhMUVVGTExFdEJRVXdzUTBGQlZ5eFJRVVk1UXp0QlFVRkJMRlZCUlVVc1lVRkdSaXgzUWtGRlJTeGhRVVpHTzBGQlFVRXNWVUZGYVVJc1MwRkdha0lzZDBKQlJXbENMRXRCUm1wQ08wRkJRVUVzVlVGRmQwSXNUMEZHZUVJc2QwSkJSWGRDTEU5QlJuaENPenRCUVVsTUxGVkJRVWtzUjBGQlJ5eEpRVUZKTEdGQlFXRXNTMEZCU3l4SlFVRjZRaXhKUVVGcFF5eExRVUZxUXl4SlFVRXdReXhQUVVFNVF5eEZRVUYxUkR0QlFVTnVSQ3hsUVVOSkxHbERRVU5KTEc5Q1FVRkRMR2RDUVVGRUxFVkJRV0VzUzBGQlN5eExRVUZzUWl4RFFVUktMRVZCUlVrc2IwSkJRVU1zYjBKQlFVUXNSVUZCYVVJc1MwRkJTeXhMUVVGMFFpeERRVVpLTEVWQlIwa3NLMEpCUVVjN1FVRkJSeXhWUVVGQkxFbEJRVWtzUlVGQlF5eEhRVUZTTzBGQlFWa3NWVUZCUVN4UFFVRlBMRVZCUVVVc1MwRkJTeXhaUVVGTUxFTkJRV3RDTEVsQlFXeENMRU5CUVhWQ0xFbEJRWFpDTEVOQlFYSkNPMEZCUVcxRUxGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFUZEVMRFJDUVVGSUxFTkJTRW9zUTBGRVNqdEJRVTlJTEU5QlVrUXNUVUZSVHl4SlFVRkpMR3RDUVVGS0xFVkJRWGRDTzBGQlF6TkNMR1ZCUTBrc2FVTkJRMGtzYjBKQlFVTXNkVUpCUVVRN1FVRkJaMElzVlVGQlFTeEhRVUZITEVWQlFVVXNSMEZCY2tJN1FVRkJNRUlzVlVGQlFTeFJRVUZSTEVWQlFVVXNTMEZCU3l4TFFVRk1MRU5CUVZjc1VVRkJMME03UVVGQmVVUXNWVUZCUVN4alFVRmpMRVZCUVVVc1MwRkJTeXhqUVVGTUxFTkJRVzlDTEVsQlFYQkNMRU5CUVhsQ0xFbEJRWHBDTzBGQlFYcEZMRlZCUkVvc1JVRkZTU3h2UWtGQlF5eHZRa0ZCUkN4RlFVRnBRaXhMUVVGTExFdEJRWFJDTEVOQlJrb3NSVUZIU1N3clFrRkJSenRCUVVGSExGVkJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4VlFVRkJMRTlCUVU4c1JVRkJSU3hMUVVGTExGbEJRVEZDTzBGQlFYZERMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV3hFTERSQ1FVRklMRU5CU0Vvc1EwRkVTanRCUVU5SUxFOUJVazBzVFVGUlFUdEJRVU5JTEdWQlEwazdRVUZCU3l4VlFVRkJMRk5CUVZNc1JVRkJRenRCUVVGbUxGZEJRMGs3UVVGQlRTeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRmxCUVV3c1EwRkJhMElzU1VGQmJFSXNRMEZCZFVJc1NVRkJka0k3UVVGQmFFSXNWMEZEU1N3clFrRkRTU3h0UTBGRFNTeHJSRUZFU2l4RFFVUktMRVZCU1Vrc0swSkJTa29zUlVGTFNTdzJSRUZNU2l4RFFVUktMRVZCVVVrN1FVRkJUeXhWUVVGQkxFbEJRVWtzUlVGQlF5eE5RVUZhTzBGQlFXMUNMRlZCUVVFc1UwRkJVeXhGUVVGRExGZEJRVGRDTzBGQlFYbERMRlZCUVVFc1MwRkJTeXhGUVVGRkxFZEJRV2hFTzBGQlFYRkVMRlZCUVVFc1VVRkJVU3hGUVVGRkxFdEJRVXNzVTBGQlRDeERRVUZsTEVsQlFXWXNRMEZCYjBJc1NVRkJjRUk3UVVGQkwwUXNWVUZTU2l4RlFWTkpMQ3RDUVVGSE8wRkJRVThzVlVGQlFTeEpRVUZKTEVWQlFVTXNVVUZCV2p0QlFVRnhRaXhWUVVGQkxGTkJRVk1zUlVGQlF5eDFRa0ZCTDBJN1FVRkJkVVFzVlVGQlFTeExRVUZMTEVWQlFVTTdRVUZCTjBRc1ZVRkJTQ3hEUVZSS0xFTkJSRW9zUlVGWlNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CV2tvc1EwRkVTanRCUVdkQ1NEdEJRVU5LT3pzN08wVkJNVVpyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUUyUm1Rc1VUczdPenM3T3pzN096czdRVU5xUjJZc1NVRkJUU3hQUVVGUExFZEJRVWNzVTBGQlZpeFBRVUZWTzBGQlFVRXNUVUZCUlN4SFFVRkdMRkZCUVVVc1IwRkJSanRCUVVGQkxFMUJRVThzVVVGQlVDeFJRVUZQTEZGQlFWQTdRVUZCUVN4VFFVTmFMR2xEUVVOSkxDdENRVU5KTEd0RVFVUktMRVZCUTJkRExDdENRVVJvUXl4RlFVVkpPMEZCUVVjc1NVRkJRU3hKUVVGSkxFVkJRVVVzUjBGQlZEdEJRVUZqTEVsQlFVRXNUVUZCVFN4RlFVRkRPMEZCUVhKQ0xFdEJRU3RDTEVkQlFTOUNMRU5CUmtvc1EwRkVTaXhGUVV0SkxDdENRVU5KTERSRFFVUktMRVZCUXpCQ0xDdENRVVF4UWl4RlFVVkxMRkZCUVZFc1EwRkJReXhMUVVGVUxFTkJRV1VzVDBGQlppeERRVUYxUWl4SFFVRjJRaXhGUVVFMFFpeE5RVUUxUWl4RFFVWk1MRU5CVEVvc1JVRlRTU3dyUWtGRFNTdzRRMEZFU2l4RlFVTTBRaXdyUWtGRU5VSXNSVUZGU3l4UlFVRlJMRU5CUVVNc1QwRkJWQ3hEUVVGcFFpeFBRVUZxUWl4RFFVRjVRaXhIUVVGNlFpeEZRVUU0UWl4TlFVRTVRaXhEUVVaTUxFTkJWRW9zUTBGRVdUdEJRVUZCTEVOQlFXaENPenRsUVdkQ1pTeFBPenM3T3pzN1FVTm9RbVk3T3pzN1FVRkZRU3hKUVVGTkxHOUNRVUZ2UWl4SFFVRkhMSGRDUVVFM1FqdEJRVU5CTEVsQlFVMHNWVUZCVlN4SFFVRkhMRkZCUVZFc1EwRkJReXhqUVVGVUxFTkJRWGRDTEc5Q1FVRjRRaXhEUVVGdVFqdEJRVVZCTEZGQlFWRXNRMEZCUXl4TlFVRlVMRU5CUTBrc2IwSkJRVU1zYVVKQlFVUXNUMEZFU2l4RlFVVkpMRlZCUmtvN096czdPenM3T3pzN1FVTk1RU3hUUVVGVExGVkJRVlFzUTBGQmIwSXNSMEZCY0VJc1JVRkJlVUk3UVVGRGNrSXNVMEZCVHl4TFFVRkxMRU5CUVVNc1IwRkJSQ3hEUVVGTUxFTkJRMFlzU1VGRVJTeERRVU5ITEZWQlFVRXNSMEZCUnp0QlFVRkJMRmRCUVVrc1IwRkJSeXhEUVVGRExFbEJRVW9zUlVGQlNqdEJRVUZCTEVkQlJFNHNSVUZGUml4SlFVWkZMRU5CUjBNc1ZVRkJReXhOUVVGRU8wRkJRVUVzVjBGQllUdEJRVUZETEUxQlFVRXNUVUZCVFN4RlFVRk9PMEZCUVVRc1MwRkJZanRCUVVGQkxFZEJTRVFzUlVGSlF5eFZRVUZETEV0QlFVUTdRVUZCUVN4WFFVRlpPMEZCUVVNc1RVRkJRU3hMUVVGTExFVkJRVXc3UVVGQlJDeExRVUZhTzBGQlFVRXNSMEZLUkN4RFFVRlFPMEZCVFVnN08yVkJSV01zVlNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWlobWRXNWpkR2x2YmlBb2NtOXZkQ3dnWm1GamRHOXllU2w3WEc0Z0lDZDFjMlVnYzNSeWFXTjBKenRjYmx4dUlDQXZLbWx6ZEdGdVluVnNJR2xuYm05eVpTQnVaWGgwT21OaGJuUWdkR1Z6ZENvdlhHNGdJR2xtSUNoMGVYQmxiMllnYlc5a2RXeGxJRDA5UFNBbmIySnFaV04wSnlBbUppQjBlWEJsYjJZZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFQwOUlDZHZZbXBsWTNRbktTQjdYRzRnSUNBZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFNCbVlXTjBiM0o1S0NrN1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JR1JsWm1sdVpTQTlQVDBnSjJaMWJtTjBhVzl1SnlBbUppQmtaV1pwYm1VdVlXMWtLU0I3WEc0Z0lDQWdMeThnUVUxRUxpQlNaV2RwYzNSbGNpQmhjeUJoYmlCaGJtOXVlVzF2ZFhNZ2JXOWtkV3hsTGx4dUlDQWdJR1JsWm1sdVpTaGJYU3dnWm1GamRHOXllU2s3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1FuSnZkM05sY2lCbmJHOWlZV3h6WEc0Z0lDQWdjbTl2ZEM1dlltcGxZM1JRWVhSb0lEMGdabUZqZEc5eWVTZ3BPMXh1SUNCOVhHNTlLU2gwYUdsekxDQm1kVzVqZEdsdmJpZ3BlMXh1SUNBbmRYTmxJSE4wY21samRDYzdYRzVjYmlBZ2RtRnlJSFJ2VTNSeUlEMGdUMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp6dGNiaUFnWm5WdVkzUnBiMjRnYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU0I3WEc0Z0lDQWdhV1lvYjJKcUlEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbVlXeHpaVnh1SUNBZ0lIMWNiaUFnSUNBdkwzUnZJR2hoYm1Sc1pTQnZZbXBsWTNSeklIZHBkR2dnYm5Wc2JDQndjbTkwYjNSNWNHVnpJQ2gwYjI4Z1pXUm5aU0JqWVhObFB5bGNiaUFnSUNCeVpYUjFjbTRnVDJKcVpXTjBMbkJ5YjNSdmRIbHdaUzVvWVhOUGQyNVFjbTl3WlhKMGVTNWpZV3hzS0c5aWFpd2djSEp2Y0NsY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpSVzF3ZEhrb2RtRnNkV1VwZTF4dUlDQWdJR2xtSUNnaGRtRnNkV1VwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb2FYTkJjbkpoZVNoMllXeDFaU2tnSmlZZ2RtRnNkV1V1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSFpoYkhWbElDRTlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElHbHVJSFpoYkhWbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hR0Z6VDNkdVVISnZjR1Z5ZEhrb2RtRnNkV1VzSUdrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQjBiMU4wY21sdVp5aDBlWEJsS1h0Y2JpQWdJQ0J5WlhSMWNtNGdkRzlUZEhJdVkyRnNiQ2gwZVhCbEtUdGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR2x6VDJKcVpXTjBLRzlpYWlsN1hHNGdJQ0FnY21WMGRYSnVJSFI1Y0dWdlppQnZZbW9nUFQwOUlDZHZZbXBsWTNRbklDWW1JSFJ2VTNSeWFXNW5LRzlpYWlrZ1BUMDlJRndpVzI5aWFtVmpkQ0JQWW1wbFkzUmRYQ0k3WEc0Z0lIMWNibHh1SUNCMllYSWdhWE5CY25KaGVTQTlJRUZ5Y21GNUxtbHpRWEp5WVhrZ2ZId2dablZ1WTNScGIyNG9iMkpxS1h0Y2JpQWdJQ0F2S21semRHRnVZblZzSUdsbmJtOXlaU0J1WlhoME9tTmhiblFnZEdWemRDb3ZYRzRnSUNBZ2NtVjBkWEp1SUhSdlUzUnlMbU5oYkd3b2IySnFLU0E5UFQwZ0oxdHZZbXBsWTNRZ1FYSnlZWGxkSnp0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpRbTl2YkdWaGJpaHZZbW9wZTF4dUlDQWdJSEpsZEhWeWJpQjBlWEJsYjJZZ2IySnFJRDA5UFNBblltOXZiR1ZoYmljZ2ZId2dkRzlUZEhKcGJtY29iMkpxS1NBOVBUMGdKMXR2WW1wbFkzUWdRbTl2YkdWaGJsMG5PMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWjJWMFMyVjVLR3RsZVNsN1hHNGdJQ0FnZG1GeUlHbHVkRXRsZVNBOUlIQmhjbk5sU1c1MEtHdGxlU2s3WEc0Z0lDQWdhV1lnS0dsdWRFdGxlUzUwYjFOMGNtbHVaeWdwSUQwOVBTQnJaWGtwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYm5STFpYazdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJyWlhrN1hHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQm1ZV04wYjNKNUtHOXdkR2x2Ym5NcElIdGNiaUFnSUNCdmNIUnBiMjV6SUQwZ2IzQjBhVzl1Y3lCOGZDQjdmVnh1WEc0Z0lDQWdkbUZ5SUc5aWFtVmpkRkJoZEdnZ1BTQm1kVzVqZEdsdmJpaHZZbW9wSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJQWW1wbFkzUXVhMlY1Y3lodlltcGxZM1JRWVhSb0tTNXlaV1IxWTJVb1puVnVZM1JwYjI0b2NISnZlSGtzSUhCeWIzQXBJSHRjYmlBZ0lDQWdJQ0FnYVdZb2NISnZjQ0E5UFQwZ0oyTnlaV0YwWlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2ZUhrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0F2S21semRHRnVZblZzSUdsbmJtOXlaU0JsYkhObEtpOWNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ2WW1wbFkzUlFZWFJvVzNCeWIzQmRJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzRnSUNBZ0lDQWdJQ0FnY0hKdmVIbGJjSEp2Y0YwZ1BTQnZZbXBsWTNSUVlYUm9XM0J5YjNCZExtSnBibVFvYjJKcVpXTjBVR0YwYUN3Z2IySnFLVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCd2NtOTRlVHRjYmlBZ0lDQWdJSDBzSUh0OUtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ1puVnVZM1JwYjI0Z2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnY0hKdmNDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlDaHZjSFJwYjI1ekxtbHVZMngxWkdWSmJtaGxjbWwwWldSUWNtOXdjeUI4ZkNBb2RIbHdaVzltSUhCeWIzQWdQVDA5SUNkdWRXMWlaWEluSUNZbUlFRnljbUY1TG1selFYSnlZWGtvYjJKcUtTa2dmSHdnYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU2xjYmlBZ0lDQjlYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQm5aWFJUYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU0I3WEc0Z0lDQWdJQ0JwWmlBb2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnY0hKdmNDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWx0d2NtOXdYVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQnpaWFFvYjJKcUxDQndZWFJvTENCMllXeDFaU3dnWkc5T2IzUlNaWEJzWVdObEtYdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJRnR3WVhSb1hUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2doY0dGMGFDQjhmQ0J3WVhSb0xteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjMlYwS0c5aWFpd2djR0YwYUM1emNHeHBkQ2duTGljcExtMWhjQ2huWlhSTFpYa3BMQ0IyWVd4MVpTd2daRzlPYjNSU1pYQnNZV05sS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFVHRjBhQ0E5SUhCaGRHaGJNRjA3WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZaaGJIVmxJRDBnWjJWMFUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2dZM1Z5Y21WdWRGQmhkR2dwTzF4dUlDQWdJQ0FnYVdZZ0tIQmhkR2d1YkdWdVozUm9JRDA5UFNBeEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoamRYSnlaVzUwVm1Gc2RXVWdQVDA5SUhadmFXUWdNQ0I4ZkNBaFpHOU9iM1JTWlhCc1lXTmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2IySnFXMk4xY25KbGJuUlFZWFJvWFNBOUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCamRYSnlaVzUwVm1Gc2RXVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNoamRYSnlaVzUwVm1Gc2RXVWdQVDA5SUhadmFXUWdNQ2tnZTF4dUlDQWdJQ0FnSUNBdkwyTm9aV05ySUdsbUlIZGxJR0Z6YzNWdFpTQmhiaUJoY25KaGVWeHVJQ0FnSUNBZ0lDQnBaaWgwZVhCbGIyWWdjR0YwYUZzeFhTQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbXBiWTNWeWNtVnVkRkJoZEdoZElEMGdXMTA3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2IySnFXMk4xY25KbGJuUlFZWFJvWFNBOUlIdDlPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6WlhRb2IySnFXMk4xY25KbGJuUlFZWFJvWFN3Z2NHRjBhQzV6YkdsalpTZ3hLU3dnZG1Gc2RXVXNJR1J2VG05MFVtVndiR0ZqWlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1b1lYTWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvS1NCN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQmJjR0YwYUYwN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQndZWFJvSUQwZ2NHRjBhQzV6Y0d4cGRDZ25MaWNwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9JWEJoZEdnZ2ZId2djR0YwYUM1c1pXNW5kR2dnUFQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJQ0VoYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEJoZEdndWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHb2dQU0JuWlhSTFpYa29jR0YwYUZ0cFhTazdYRzVjYmlBZ0lDQWdJQ0FnYVdZb0tIUjVjR1Z2WmlCcUlEMDlQU0FuYm5WdFltVnlKeUFtSmlCcGMwRnljbUY1S0c5aWFpa2dKaVlnYWlBOElHOWlhaTVzWlc1bmRHZ3BJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0tHOXdkR2x2Ym5NdWFXNWpiSFZrWlVsdWFHVnlhWFJsWkZCeWIzQnpJRDhnS0dvZ2FXNGdUMkpxWldOMEtHOWlhaWtwSURvZ2FHRnpUM2R1VUhKdmNHVnlkSGtvYjJKcUxDQnFLU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbW9nUFNCdlltcGJhbDA3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtVnVjM1Z5WlVWNGFYTjBjeUE5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnc0lIWmhiSFZsS1h0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6WlhRb2IySnFMQ0J3WVhSb0xDQjJZV3gxWlN3Z2RISjFaU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1YzJWMElEMGdablZ1WTNScGIyNGdLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJR1J2VG05MFVtVndiR0ZqWlNsN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYzJWMEtHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1YVc1elpYSjBJRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUN3Z2RtRnNkV1VzSUdGMEtYdGNiaUFnSUNBZ0lIWmhjaUJoY25JZ1BTQnZZbXBsWTNSUVlYUm9MbWRsZENodlltb3NJSEJoZEdncE8xeHVJQ0FnSUNBZ1lYUWdQU0IrZm1GME8xeHVJQ0FnSUNBZ2FXWWdLQ0ZwYzBGeWNtRjVLR0Z5Y2lrcElIdGNiaUFnSUNBZ0lDQWdZWEp5SUQwZ1cxMDdYRzRnSUNBZ0lDQWdJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dZWEp5S1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdGeWNpNXpjR3hwWTJVb1lYUXNJREFzSUhaaGJIVmxLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVsYlhCMGVTQTlJR1oxYm1OMGFXOXVLRzlpYWl3Z2NHRjBhQ2tnZTF4dUlDQWdJQ0FnYVdZZ0tHbHpSVzF3ZEhrb2NHRjBhQ2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhadmFXUWdNRHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNodlltb2dQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbTlwWkNBd08xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVXNJR2s3WEc0Z0lDQWdJQ0JwWmlBb0lTaDJZV3gxWlNBOUlHOWlhbVZqZEZCaGRHZ3VaMlYwS0c5aWFpd2djR0YwYUNrcEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjJiMmxrSURBN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdkbUZzZFdVZ1BUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJQ2NuS1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2FYTkNiMjlzWldGdUtIWmhiSFZsS1NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUIyWVd4MVpTQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnTUNrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpRWEp5WVhrb2RtRnNkV1VwS1NCN1hHNGdJQ0FnSUNBZ0lIWmhiSFZsTG14bGJtZDBhQ0E5SURBN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpUMkpxWldOMEtIWmhiSFZsS1NrZ2UxeHVJQ0FnSUNBZ0lDQm1iM0lnS0drZ2FXNGdkbUZzZFdVcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtIWmhiSFZsTENCcEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pHVnNaWFJsSUhaaGJIVmxXMmxkTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z2JuVnNiQ2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1Y0hWemFDQTlJR1oxYm1OMGFXOXVJQ2h2WW1vc0lIQmhkR2dnTHlvc0lIWmhiSFZsY3lBcUx5bDdYRzRnSUNBZ0lDQjJZWElnWVhKeUlEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2IySnFMQ0J3WVhSb0tUdGNiaUFnSUNBZ0lHbG1JQ2doYVhOQmNuSmhlU2hoY25JcEtTQjdYRzRnSUNBZ0lDQWdJR0Z5Y2lBOUlGdGRPMXh1SUNBZ0lDQWdJQ0J2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJR0Z5Y2lrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHRnljaTV3ZFhOb0xtRndjR3g1S0dGeWNpd2dRWEp5WVhrdWNISnZkRzkwZVhCbExuTnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpMQ0F5S1NrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndVkyOWhiR1Z6WTJVZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9jeXdnWkdWbVlYVnNkRlpoYkhWbEtTQjdYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVTdYRzVjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd0xDQnNaVzRnUFNCd1lYUm9jeTVzWlc1bmRHZzdJR2tnUENCc1pXNDdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvS0haaGJIVmxJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9jMXRwWFNrcElDRTlQU0IyYjJsa0lEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnY21WMGRYSnVJR1JsWm1GMWJIUldZV3gxWlR0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1blpYUWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvTENCa1pXWmhkV3gwVm1Gc2RXVXBlMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYm5WdFltVnlKeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnVzNCaGRHaGRPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0NGd1lYUm9JSHg4SUhCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnBaaUFvYjJKcUlEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHUmxabUYxYkhSV1lXeDFaVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwTENCa1pXWmhkV3gwVm1Gc2RXVXBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZCaGRHZ2dQU0JuWlhSTFpYa29jR0YwYUZzd1hTazdYRzRnSUNBZ0lDQjJZWElnYm1WNGRFOWlhaUE5SUdkbGRGTm9ZV3hzYjNkUWNtOXdaWEowZVNodlltb3NJR04xY25KbGJuUlFZWFJvS1Z4dUlDQWdJQ0FnYVdZZ0tHNWxlSFJQWW1vZ1BUMDlJSFp2YVdRZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaR1ZtWVhWc2RGWmhiSFZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9jR0YwYUM1c1pXNW5kR2dnUFQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzVsZUhSUFltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbWRsZENodlltcGJZM1Z5Y21WdWRGQmhkR2hkTENCd1lYUm9Mbk5zYVdObEtERXBMQ0JrWldaaGRXeDBWbUZzZFdVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtUmxiQ0E5SUdaMWJtTjBhVzl1SUdSbGJDaHZZbW9zSUhCaGRHZ3BJSHRjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NHRjBhQ0E5SUZ0d1lYUm9YVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1vN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2hwYzBWdGNIUjVLSEJoZEdncEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmloMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndVpHVnNLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlFZWFJvSUQwZ1oyVjBTMlY1S0hCaGRHaGJNRjBwTzF4dUlDQWdJQ0FnYVdZZ0tDRm9ZWE5UYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCamRYSnlaVzUwVUdGMGFDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWW9jR0YwYUM1c1pXNW5kR2dnUFQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHpRWEp5WVhrb2IySnFLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHOWlhaTV6Y0d4cFkyVW9ZM1Z5Y21WdWRGQmhkR2dzSURFcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJR1JsYkdWMFpTQnZZbXBiWTNWeWNtVnVkRkJoZEdoZE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNWtaV3dvYjJKcVcyTjFjbkpsYm5SUVlYUm9YU3dnY0dGMGFDNXpiR2xqWlNneEtTazdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZzdYRzRnSUgxY2JseHVJQ0IyWVhJZ2JXOWtJRDBnWm1GamRHOXllU2dwTzF4dUlDQnRiMlF1WTNKbFlYUmxJRDBnWm1GamRHOXllVHRjYmlBZ2JXOWtMbmRwZEdoSmJtaGxjbWwwWldSUWNtOXdjeUE5SUdaaFkzUnZjbmtvZTJsdVkyeDFaR1ZKYm1obGNtbDBaV1JRY205d2N6b2dkSEoxWlgwcFhHNGdJSEpsZEhWeWJpQnRiMlE3WEc1OUtUdGNiaUlzSWlkMWMyVWdjM1J5YVdOMEoxeHVYRzVqYjI1emRDQjdhWE5QWW1wbFkzUXNJR2RsZEV0bGVYTjlJRDBnY21WeGRXbHlaU2duTGk5c1lXNW5KeWxjYmx4dUx5OGdVRkpKVmtGVVJTQlFVazlRUlZKVVNVVlRYRzVqYjI1emRDQkNXVkJCVTFOZlRVOUVSU0E5SUNkZlgySjVjR0Z6YzAxdlpHVW5YRzVqYjI1emRDQkpSMDVQVWtWZlEwbFNRMVZNUVZJZ1BTQW5YMTlwWjI1dmNtVkRhWEpqZFd4aGNpZGNibU52Ym5OMElFMUJXRjlFUlVWUUlEMGdKMTlmYldGNFJHVmxjQ2RjYm1OdmJuTjBJRU5CUTBoRklEMGdKMTlmWTJGamFHVW5YRzVqYjI1emRDQlJWVVZWUlNBOUlDZGZYM0YxWlhWbEoxeHVZMjl1YzNRZ1UxUkJWRVVnUFNBblgxOXpkR0YwWlNkY2JseHVZMjl1YzNRZ1JVMVFWRmxmVTFSQlZFVWdQU0I3ZlZ4dVhHNWpiR0Z6Y3lCU1pXTjFjbk5wZG1WSmRHVnlZWFJ2Y2lCN1hHNGdJQzhxS2x4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeEJjbkpoZVgwZ2NtOXZkRnh1SUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ1cySjVjR0Z6YzAxdlpHVTlNRjFjYmlBZ0lDb2dRSEJoY21GdElIdENiMjlzWldGdWZTQmJhV2R1YjNKbFEybHlZM1ZzWVhJOVptRnNjMlZkWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmJiV0Y0UkdWbGNEMHhNREJkWEc0Z0lDQXFMMXh1SUNCamIyNXpkSEoxWTNSdmNpQW9jbTl2ZEN3Z1lubHdZWE56VFc5a1pTQTlJREFzSUdsbmJtOXlaVU5wY21OMWJHRnlJRDBnWm1Gc2MyVXNJRzFoZUVSbFpYQWdQU0F4TURBcElIdGNiaUFnSUNCMGFHbHpXMEpaVUVGVFUxOU5UMFJGWFNBOUlHSjVjR0Z6YzAxdlpHVmNiaUFnSUNCMGFHbHpXMGxIVGs5U1JWOURTVkpEVlV4QlVsMGdQU0JwWjI1dmNtVkRhWEpqZFd4aGNseHVJQ0FnSUhSb2FYTmJUVUZZWDBSRlJWQmRJRDBnYldGNFJHVmxjRnh1SUNBZ0lIUm9hWE5iUTBGRFNFVmRJRDBnVzExY2JpQWdJQ0IwYUdselcxRlZSVlZGWFNBOUlGdGRYRzRnSUNBZ2RHaHBjMXRUVkVGVVJWMGdQU0IwYUdsekxtZGxkRk4wWVhSbEtIVnVaR1ZtYVc1bFpDd2djbTl2ZENsY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwOWlhbVZqZEgxY2JpQWdJQ292WEc0Z0lHNWxlSFFnS0NrZ2UxeHVJQ0FnSUdOdmJuTjBJSHR1YjJSbExDQndZWFJvTENCa1pXVndmU0E5SUhSb2FYTmJVMVJCVkVWZElIeDhJRVZOVUZSWlgxTlVRVlJGWEc1Y2JpQWdJQ0JwWmlBb2RHaHBjMXROUVZoZlJFVkZVRjBnUGlCa1pXVndLU0I3WEc0Z0lDQWdJQ0JwWmlBb2RHaHBjeTVwYzA1dlpHVW9ibTlrWlNrcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSb2FYTXVhWE5EYVhKamRXeGhjaWh1YjJSbEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaDBhR2x6VzBsSFRrOVNSVjlEU1ZKRFZVeEJVbDBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhOcmFYQmNiaUFnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkRGFYSmpkV3hoY2lCeVpXWmxjbVZ1WTJVbktWeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9kR2hwY3k1dmJsTjBaWEJKYm5SdktIUm9hWE5iVTFSQlZFVmRLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1YzNRZ1pHVnpZM0pwY0hSdmNuTWdQU0IwYUdsekxtZGxkRk4wWVhSbGMwOW1RMmhwYkdST2IyUmxjeWh1YjJSbExDQndZWFJvTENCa1pXVndLVnh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXVjM1FnYldWMGFHOWtJRDBnZEdocGMxdENXVkJCVTFOZlRVOUVSVjBnUHlBbmNIVnphQ2NnT2lBbmRXNXphR2xtZENkY2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhOYlVWVkZWVVZkVzIxbGRHaHZaRjBvTGk0dVpHVnpZM0pwY0hSdmNuTXBYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpXME5CUTBoRlhTNXdkWE5vS0c1dlpHVXBYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWTI5dWMzUWdkbUZzZFdVZ1BTQjBhR2x6VzFGVlJWVkZYUzV6YUdsbWRDZ3BYRzRnSUNBZ1kyOXVjM1FnWkc5dVpTQTlJQ0YyWVd4MVpWeHVYRzRnSUNBZ2RHaHBjMXRUVkVGVVJWMGdQU0IyWVd4MVpWeHVYRzRnSUNBZ2FXWWdLR1J2Ym1VcElIUm9hWE11WkdWemRISnZlU2dwWEc1Y2JpQWdJQ0J5WlhSMWNtNGdlM1poYkhWbExDQmtiMjVsZlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2x4dUlDQWdLaTljYmlBZ1pHVnpkSEp2ZVNBb0tTQjdYRzRnSUNBZ2RHaHBjMXRSVlVWVlJWMHViR1Z1WjNSb0lEMGdNRnh1SUNBZ0lIUm9hWE5iUTBGRFNFVmRMbXhsYm1kMGFDQTlJREJjYmlBZ0lDQjBhR2x6VzFOVVFWUkZYU0E5SUc1MWJHeGNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQXFMMXh1SUNCcGMwNXZaR1VnS0dGdWVTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCcGMwOWlhbVZqZENoaGJua3BYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdLaTljYmlBZ2FYTk1aV0ZtSUNoaGJua3BJSHRjYmlBZ0lDQnlaWFIxY200Z0lYUm9hWE11YVhOT2IyUmxLR0Z1ZVNsY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBcUwxeHVJQ0JwYzBOcGNtTjFiR0Z5SUNoaGJua3BJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjMXREUVVOSVJWMHVhVzVrWlhoUFppaGhibmtwSUNFOVBTQXRNVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJTWlhSMWNtNXpJSE4wWVhSbGN5QnZaaUJqYUdsc1pDQnViMlJsYzF4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdibTlrWlZ4dUlDQWdLaUJBY0dGeVlXMGdlMEZ5Y21GNWZTQndZWFJvWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmtaV1Z3WEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRCY25KaGVUeFBZbXBsWTNRK2ZWeHVJQ0FnS2k5Y2JpQWdaMlYwVTNSaGRHVnpUMlpEYUdsc1pFNXZaR1Z6SUNodWIyUmxMQ0J3WVhSb0xDQmtaV1Z3S1NCN1hHNGdJQ0FnY21WMGRYSnVJR2RsZEV0bGVYTW9ibTlrWlNrdWJXRndLR3RsZVNBOVBseHVJQ0FnSUNBZ2RHaHBjeTVuWlhSVGRHRjBaU2h1YjJSbExDQnViMlJsVzJ0bGVWMHNJR3RsZVN3Z2NHRjBhQzVqYjI1allYUW9hMlY1S1N3Z1pHVmxjQ0FySURFcFhHNGdJQ0FnS1Z4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCU1pYUjFjbTV6SUhOMFlYUmxJRzltSUc1dlpHVXVJRU5oYkd4eklHWnZjaUJsWVdOb0lHNXZaR1ZjYmlBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlGdHdZWEpsYm5SZFhHNGdJQ0FxSUVCd1lYSmhiU0I3S24wZ1cyNXZaR1ZkWEc0Z0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmJhMlY1WFZ4dUlDQWdLaUJBY0dGeVlXMGdlMEZ5Y21GNWZTQmJjR0YwYUYxY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJRnRrWldWd1hWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1QySnFaV04wZlZ4dUlDQWdLaTljYmlBZ1oyVjBVM1JoZEdVZ0tIQmhjbVZ1ZEN3Z2JtOWtaU3dnYTJWNUxDQndZWFJvSUQwZ1cxMHNJR1JsWlhBZ1BTQXdLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIdHdZWEpsYm5Rc0lHNXZaR1VzSUd0bGVTd2djR0YwYUN3Z1pHVmxjSDFjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUTJGc2JHSmhZMnRjYmlBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlITjBZWFJsWEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0tpOWNiaUFnYjI1VGRHVndTVzUwYnlBb2MzUmhkR1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkSEoxWlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1VtVmpkWEp6YVhabFNYUmxjbUYwYjNKOVhHNGdJQ0FxTDF4dUlDQmJVM2x0WW05c0xtbDBaWEpoZEc5eVhTQW9LU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE5jYmlBZ2ZWeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZKbFkzVnljMmwyWlVsMFpYSmhkRzl5WEc0aUxDSW5kWE5sSUhOMGNtbGpkQ2RjYmk4cUtseHVJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDb3ZYRzVtZFc1amRHbHZiaUJwYzA5aWFtVmpkQ0FvWVc1NUtTQjdYRzRnSUhKbGRIVnliaUJoYm5rZ0lUMDlJRzUxYkd3Z0ppWWdkSGx3Wlc5bUlHRnVlU0E5UFQwZ0oyOWlhbVZqZENkY2JuMWNiaThxS2x4dUlDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNvdlhHNWpiMjV6ZENCN2FYTkJjbkpoZVgwZ1BTQkJjbkpoZVZ4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselFYSnlZWGxNYVd0bElDaGhibmtwSUh0Y2JpQWdhV1lnS0NGcGMwOWlhbVZqZENoaGJua3BLU0J5WlhSMWNtNGdabUZzYzJWY2JpQWdhV1lnS0NFb0oyeGxibWQwYUNjZ2FXNGdZVzU1S1NrZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUdOdmJuTjBJR3hsYm1kMGFDQTlJR0Z1ZVM1c1pXNW5kR2hjYmlBZ2FXWWdLQ0ZwYzA1MWJXSmxjaWhzWlc1bmRHZ3BLU0J5WlhSMWNtNGdabUZzYzJWY2JpQWdhV1lnS0d4bGJtZDBhQ0ErSURBcElIdGNiaUFnSUNCeVpYUjFjbTRnS0d4bGJtZDBhQ0F0SURFcElHbHVJR0Z1ZVZ4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUdadmNpQW9ZMjl1YzNRZ2EyVjVJR2x1SUdGdWVTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sWEc0Z0lDQWdmVnh1SUNCOVhHNTlYRzR2S2lwY2JpQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBcUwxeHVablZ1WTNScGIyNGdhWE5PZFcxaVpYSWdLR0Z1ZVNrZ2UxeHVJQ0J5WlhSMWNtNGdkSGx3Wlc5bUlHRnVlU0E5UFQwZ0oyNTFiV0psY2lkY2JuMWNiaThxS2x4dUlDb2dRSEJoY21GdElIdFBZbXBsWTNSOFFYSnlZWGw5SUc5aWFtVmpkRnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwRnljbUY1UEZOMGNtbHVaejU5WEc0Z0tpOWNibVoxYm1OMGFXOXVJR2RsZEV0bGVYTWdLRzlpYW1WamRDa2dlMXh1SUNCamIyNXpkQ0JyWlhselh5QTlJRTlpYW1WamRDNXJaWGx6S0c5aWFtVmpkQ2xjYmlBZ2FXWWdLR2x6UVhKeVlYa29iMkpxWldOMEtTa2dlMXh1SUNBZ0lDOHZJSE5yYVhBZ2MyOXlkRnh1SUNCOUlHVnNjMlVnYVdZZ0tHbHpRWEp5WVhsTWFXdGxLRzlpYW1WamRDa3BJSHRjYmlBZ0lDQmpiMjV6ZENCcGJtUmxlQ0E5SUd0bGVYTmZMbWx1WkdWNFQyWW9KMnhsYm1kMGFDY3BYRzRnSUNBZ2FXWWdLR2x1WkdWNElENGdMVEVwSUh0Y2JpQWdJQ0FnSUd0bGVYTmZMbk53YkdsalpTaHBibVJsZUN3Z01TbGNiaUFnSUNCOVhHNGdJQ0FnTHk4Z2MydHBjQ0J6YjNKMFhHNGdJSDBnWld4elpTQjdYRzRnSUNBZ0x5OGdjMjl5ZEZ4dUlDQWdJR3RsZVhOZkxuTnZjblFvS1Z4dUlDQjlYRzRnSUhKbGRIVnliaUJyWlhselgxeHVmVnh1WEc1bGVIQnZjblJ6TG1kbGRFdGxlWE1nUFNCblpYUkxaWGx6WEc1bGVIQnZjblJ6TG1selFYSnlZWGtnUFNCcGMwRnljbUY1WEc1bGVIQnZjblJ6TG1selFYSnlZWGxNYVd0bElEMGdhWE5CY25KaGVVeHBhMlZjYm1WNGNHOXlkSE11YVhOUFltcGxZM1FnUFNCcGMwOWlhbVZqZEZ4dVpYaHdiM0owY3k1cGMwNTFiV0psY2lBOUlHbHpUblZ0WW1WeVhHNGlMQ0pwYlhCdmNuUWdUR2x6ZEVsMFpXMGdabkp2YlNBbkxpOU1hWE4wU1hSbGJTYzdYRzVwYlhCdmNuUWdjbVZqZFhKemFYWmxTWFJsY21GMGIzSWdabkp2YlNBbmNtVmpkWEp6YVhabExXbDBaWEpoZEc5eUp6dGNibWx0Y0c5eWRDQnZZbXBsWTNSUVlYUm9JR1p5YjIwZ0oyOWlhbVZqZEMxd1lYUm9KenRjYmx4dVkyeGhjM01nUkdGMFlVeHBjM1FnWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lITmxkRVpwWld4a1RXRndLSEJoZEdnc0lHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjSEp2Y0hNdWRYQmtZWFJsUm1sbGJHUk5ZWEFvZTF0bGRtVnVkQzUwWVhKblpYUXVaR0YwWVhObGRDNW1hV1ZzWkYwNklIQmhkR2g5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5Wlc1a1pYSk9iMlJsY3loa1lYUmhLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJQWW1wbFkzUXVhMlY1Y3loa1lYUmhLUzV0WVhBb2FYUmxiU0E5UGlCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2FYUmxiU0E5UFQwZ0oyOWlhbVZqZEZCaGRHZ25LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCc1pYUWdZMmhwYkdRZ1BTQThUR2x6ZEVsMFpXMGdhMlY1UFh0cGRHVnRMblJ2VTNSeWFXNW5LQ2w5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc2RXVTllMmwwWlcxOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IySnFaV04wUFh0a1lYUmhXMmwwWlcxZGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnBaV3hrVFdGd1BYdDBhR2x6TG5CeWIzQnpMbVpwWld4a1RXRndmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzl1UTJ4cFkydERiMjUwWVdsdVpYSTllMlVnUFQ0Z2RHaHBjeTV6WlhSR2FXVnNaRTFoY0Noa1lYUmhXMmwwWlcxZExtOWlhbVZqZEZCaGRHZ3NJR1VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5dVEyeHBZMnRVYVhSc1pUMTdaU0E5UGlCMGFHbHpMbk5sZEVacFpXeGtUV0Z3S0dSaGRHRmJhWFJsYlYwc0lHVXBmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzl1UTJ4cFkydERiMjUwWlc1MFBYdGxJRDArSUhSb2FYTXVjMlYwUm1sbGJHUk5ZWEFvWkdGMFlWdHBkR1Z0WFN3Z1pTbDlMejQ3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnWkdGMFlWdHBkR1Z0WFNBOVBUMGdKMjlpYW1WamRDY2dKaVlnWkdGMFlWdHBkR1Z0WFNBaFBUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTm9hV3hrSUQwZ1VtVmhZM1F1WTJ4dmJtVkZiR1Z0Wlc1MEtHTm9hV3hrTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05vYVd4a2NtVnVPaUJCY25KaGVTNXBjMEZ5Y21GNUtHUmhkR0ZiYVhSbGJWMHBJRDhnZEdocGN5NXlaVzVrWlhKT2IyUmxjeWhrWVhSaFcybDBaVzFkV3pCZEtTQTZJSFJvYVhNdWNtVnVaR1Z5VG05a1pYTW9aR0YwWVZ0cGRHVnRYU2xjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHTm9hV3hrTzF4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpXNWtaWElvS1NCN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUdacFpXeGtUV0Z3SUQwZ2RHaHBjeTV3Y205d2N5NW1hV1ZzWkUxaGNEdGNibHh1SUNBZ0lDQWdJQ0JzWlhRZ1pHRjBZU0E5SUhSb2FYTXVjSEp2Y0hNdVpHRjBZVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tFRnljbUY1TG1selFYSnlZWGtvWkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHWnBaV3hrVFdGd0xtbDBaVzFEYjI1MFlXbHVaWElnUFNBbkp6dGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUdsbUlDaG1hV1ZzWkUxaGNDNXBkR1Z0UTI5dWRHRnBibVZ5SUQwOVBTQnVkV3hzS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1FYSnlZWGt1YVhOQmNuSmhlU2hrWVhSaEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1JoZEdFZ1BTQmtZWFJoV3pCZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0JtYjNJZ0tHeGxkQ0I3Y0dGeVpXNTBMQ0J1YjJSbExDQnJaWGtzSUhCaGRHaDlJRzltSUc1bGR5QnlaV04xY25OcGRtVkpkR1Z5WVhSdmNpaGtZWFJoS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdibTlrWlNBOVBUMGdKMjlpYW1WamRDY2dKaVlnYm05a1pTQWhQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCc1pYUWdjR0YwYUZOMGNtbHVaeUE5SUhCaGRHZ3VhbTlwYmlnbkxpY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ2hrWVhSaExDQndZWFJvVTNSeWFXNW5JQ3NnSnk1dlltcGxZM1JRWVhSb0p5d2djR0YwYUZOMGNtbHVaeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeG9NejVUWld4bFkzUWdhWFJsYlhNZ1kyOXVkR0ZwYm1WeVBDOW9NejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BIVnNJR05zWVhOelRtRnRaVDFjSW1wemIyNHRkSEpsWlZ3aVBudDBhR2x6TG5KbGJtUmxjazV2WkdWektHUmhkR0VwZlR3dmRXdytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzlrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FwTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdiR1YwSUc5aWFtVmpkRVJoZEdFZ1BTQnZZbXBsWTNSUVlYUm9MbWRsZENoMGFHbHpMbkJ5YjNCekxtUmhkR0VzSUdacFpXeGtUV0Z3TG1sMFpXMURiMjUwWVdsdVpYSXBPMXh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvUVhKeVlYa3VhWE5CY25KaGVTaHZZbXBsWTNSRVlYUmhLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5aWFtVmpkRVJoZEdFZ1BTQnZZbXBsWTNSRVlYUmhXekJkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0d4bGRDQjdjR0Z5Wlc1MExDQnViMlJsTENCclpYa3NJSEJoZEdoOUlHOW1JRzVsZHlCeVpXTjFjbk5wZG1WSmRHVnlZWFJ2Y2lodlltcGxZM1JFWVhSaEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYm05a1pTQWhQVDBnSjI5aWFtVmpkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiR1YwSUhCaGRHaFRkSEpwYm1jZ1BTQndZWFJvTG1wdmFXNG9KeTRuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxWldOMFVHRjBhQzV6WlhRb2IySnFaV04wUkdGMFlTd2djR0YwYUZOMGNtbHVaeXdnY0dGMGFGTjBjbWx1WnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhvTXo1VFpXeGxZM1FnZEdsMGJHVWdZVzVrSUdOdmJuUmxiblFnWm1sbGJHUnpQQzlvTXo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQSFZzSUdOc1lYTnpUbUZ0WlQxY0ltcHpiMjR0ZEhKbFpWd2lQbnQwYUdsekxuSmxibVJsY2s1dlpHVnpLRzlpYW1WamRFUmhkR0VwZlR3dmRXdytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzlrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQkVZWFJoVEdsemREc2lMQ0pwYlhCdmNuUWdSR0YwWVV4cGMzUWdabkp2YlNBbkxpOUVZWFJoVEdsemRDYzdYRzVwYlhCdmNuUWdaMlYwUVhCcFJHRjBZU0JtY205dElDY3VMaTh1TGk5VmRHbHNhWFJwWlhNdloyVjBRWEJwUkdGMFlTYzdYRzVjYm1Oc1lYTnpJRVpwWld4a1UyVnNaV04wYVc5dUlHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lod2NtOXdjeWtnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWh3Y205d2N5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsY25KdmNqb2diblZzYkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR2x6VEc5aFpHVmtPaUJtWVd4elpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUdsMFpXMXpPaUJiWFZ4dUlDQWdJQ0FnSUNCOU8xeHVYRzRnSUNBZ0lDQWdJSFJvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEFnUFNCMGFHbHpMblZ3WkdGMFpVWnBaV3hrVFdGd0xtSnBibVFvZEdocGN5azdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RYQmtZWFJsUm1sbGJHUk5ZWEFvZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXdjbTl3Y3k1MWNHUmhkR1ZHYVdWc1pFMWhjQ2gyWVd4MVpTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ1oyVjBSR0YwWVNncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzVnliSDBnUFNCMGFHbHpMbkJ5YjNCek8xeHVJQ0FnSUNBZ0lDQm5aWFJCY0dsRVlYUmhLSFZ5YkNsY2JpQWdJQ0FnSUNBZ0lDQWdJQzUwYUdWdUtGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDaDdjbVZ6ZFd4MGZTa2dQVDRnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVhKbGMzVnNkQ0I4ZkNCUFltcGxZM1F1YTJWNWN5aHlaWE4xYkhRcExteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSTZJRVZ5Y205eUtDZERiM1ZzWkNCdWIzUWdabVYwWTJnZ1pHRjBZU0JtY205dElGVlNUQzRuS1N4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBjMHh2WVdSbFpEb2dkSEoxWlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdhWE5NYjJGa1pXUTZJSFJ5ZFdVc0lHbDBaVzF6T2lCeVpYTjFiSFI5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUxDQW9lMlZ5Y205eWZTa2dQVDRnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0cGMweHZZV1JsWkRvZ2RISjFaU3dnWlhKeWIzSjlLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHTnZiWEJ2Ym1WdWRFUnBaRTF2ZFc1MEtDa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxtZGxkRVJoZEdFb0tUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpXNWtaWElvS1NCN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUh0bGNuSnZjaXdnYVhOTWIyRmtaV1FzSUdsMFpXMXpmU0E5SUhSb2FYTXVjM1JoZEdVN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hsY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4a2FYWStQSEErUlhKeWIzSTZJSHRsY25KdmNpNXRaWE56WVdkbGZUd3ZjRDQ4TDJScGRqNDdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvSVdselRHOWhaR1ZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdQR1JwZGlCamJHRnpjMDVoYldVOVhDSnpjR2x1Ym1WeUlHbHpMV0ZqZEdsMlpWd2lQand2WkdsMlBqdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUE4UkdGMFlVeHBjM1JjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JrWVhSaFBYdHBkR1Z0YzMxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWNtdzllM1JvYVhNdWNISnZjSE11ZFhKc2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnBaV3hrVFdGd1BYdDBhR2x6TG5CeWIzQnpMbVpwWld4a1RXRndmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFZ3WkdGMFpVWnBaV3hrVFdGd1BYdDBhR2x6TG5Wd1pHRjBaVVpwWld4a1RXRndmUzgrTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQkdhV1ZzWkZObGJHVmpkR2x2YmpzaUxDSmpiMjV6ZENCSmJuQjFkRVpwWld4a2N5QTlJQ2g3Wm1sbGJHUk5ZWEFzSUhWeWJIMHBJRDArWEc0Z0lDQWdQR1JwZGo1Y2JpQWdJQ0FnSUNBZ1BHbHVjSFYwSUhSNWNHVTlYQ0pvYVdSa1pXNWNJaUJ1WVcxbFBWd2liVzlrWDJwemIyNWZjbVZ1WkdWeVgzVnliRndpSUhaaGJIVmxQWHQxY214OUx6NWNiaUFnSUNBZ0lDQWdQR2x1Y0hWMElIUjVjR1U5WENKb2FXUmtaVzVjSWlCdVlXMWxQVndpYlc5a1gycHpiMjVmY21WdVpHVnlYMlpwWld4a2JXRndYQ0lnZG1Gc2RXVTllMHBUVDA0dWMzUnlhVzVuYVdaNUtHWnBaV3hrVFdGd0tYMHZQbHh1SUNBZ0lEd3ZaR2wyUGp0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1NXNXdkWFJHYVdWc1pITTdJaXdpWTI5dWMzUWdUR2x6ZEVsMFpXMGdQU0FvZTNaaGJIVmxMQ0JqYUdsc1pISmxiaXdnWm1sbGJHUk5ZWEFzSUc5aWFtVmpkQ3dnYjI1RGJHbGphMVJwZEd4bExDQnZia05zYVdOclEyOXVkR1Z1ZEN3Z2IyNURiR2xqYTBOdmJuUmhhVzVsY24wcElEMCtJSHRjYmlBZ0lDQnBaaUFvWTJocGJHUnlaVzRwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUNnOGJHaytYRzRnSUNBZ0lDQWdJQ0FnSUNCN1FYSnlZWGt1YVhOQmNuSmhlU2h2WW1wbFkzUXBJQ1ltSUdacFpXeGtUV0Z3TG1sMFpXMURiMjUwWVdsdVpYSWdQVDA5SUc1MWJHd2dQMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh6Y0dGdVBqeHpjR0Z1SUdOc1lYTnpUbUZ0WlQxY0ltUmhjMmhwWTI5dWN5QmtZWE5vYVdOdmJuTXRjRzl5ZEdadmJHbHZYQ0krUEM5emNHRnVQaUI3ZG1Gc2RXVjlJRHhoSUdoeVpXWTlYQ0lqWENJZ1kyeGhjM05PWVcxbFBWd2lkSEpsWlMxelpXeGxZM1JjSWlCa1lYUmhMV1pwWld4a1BWd2lhWFJsYlVOdmJuUmhhVzVsY2x3aUlHOXVRMnhwWTJzOWUyOXVRMnhwWTJ0RGIyNTBZV2x1WlhKOVBsTmxiR1ZqZER3dllUNDhMM053WVc0K0lEb2dJRHh6Y0dGdVBudDJZV3gxWlgwOEwzTndZVzQrZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdQSFZzUG50amFHbHNaSEpsYm4wOEwzVnNQbHh1SUNBZ0lDQWdJQ0E4TDJ4cFBpazdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUNnOGJHaytYRzRnSUNBZ0lDQWdJQ0FnSUNCN1ptbGxiR1JOWVhBdWRHbDBiR1VnUFQwOUlHOWlhbVZqZENBbUppQm1hV1ZzWkUxaGNDNTBhWFJzWlNBL0lEeHpkSEp2Ym1jK1ZHbDBiR1U2SUR3dmMzUnliMjVuUGlBNklDY25mVnh1SUNBZ0lDQWdJQ0FnSUNBZ2UyWnBaV3hrVFdGd0xtTnZiblJsYm5RZ1BUMDlJRzlpYW1WamRDQW1KaUJtYVdWc1pFMWhjQzVqYjI1MFpXNTBJRDhnUEhOMGNtOXVaejVEYjI1MFpXNTBPaUE4TDNOMGNtOXVaejRnT2lBbkozMWNiaUFnSUNBZ0lDQWdJQ0FnSUR4emNHRnVQbnQyWVd4MVpYMDhMM053WVc0K1hHNGdJQ0FnSUNBZ0lDQWdJQ0I3SVdacFpXeGtUV0Z3TG5ScGRHeGxJQ1ltSUNobWFXVnNaRTFoY0M1amIyNTBaVzUwSUNFOVBTQnZZbXBsWTNRcElDWW1JR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJZ0lUMDlJRzUxYkd3Z1AxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGhJR2h5WldZOVhDSWpYQ0lnWTJ4aGMzTk9ZVzFsUFZ3aWRISmxaUzF6Wld4bFkzUmNJaUJrWVhSaExXWnBaV3hrUFZ3aWRHbDBiR1ZjSWlCdmJrTnNhV05yUFh0dmJrTnNhV05yVkdsMGJHVjlQbFJwZEd4bFBDOWhQaUE2SUNjbmZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZXlGbWFXVnNaRTFoY0M1amIyNTBaVzUwSUNZbUlDaG1hV1ZzWkUxaGNDNTBhWFJzWlNBaFBUMGdiMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlDRTlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0luUnlaV1V0YzJWc1pXTjBYQ0lnWkdGMFlTMW1hV1ZzWkQxY0ltTnZiblJsYm5SY0lpQnZia05zYVdOclBYdHZia05zYVdOclEyOXVkR1Z1ZEgwK1EyOXVkR1Z1ZER3dllUNGdPaUFuSjMxY2JpQWdJQ0FnSUNBZ1BDOXNhVDRwTzF4dUlDQWdJSDFjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElFeHBjM1JKZEdWdE95SXNJbWx0Y0c5eWRDQkdhV1ZzWkZObGJHVmpkR2x2YmlCbWNtOXRJQ2N1TDBacFpXeGtVMlZzWldOMGFXOXVKenRjYm1sdGNHOXlkQ0JKYm5CMWRFWnBaV3hrY3lCbWNtOXRJQ2N1TDBsdWNIVjBSbWxsYkdSekp6dGNibWx0Y0c5eWRDQlRkVzF0WVhKNUlHWnliMjBnSnk0dlUzVnRiV0Z5ZVNjN1hHNWNibU5zWVhOeklGTmxkSFJwYm1keklHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lod2NtOXdjeWtnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWh3Y205d2N5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6YUc5M1JtbGxiR1JUWld4bFkzUnBiMjQ2SUdaaGJITmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUFuSnl4Y2JpQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndPaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVhSbGJVTnZiblJoYVc1bGNqb2diblZzYkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFYUnNaVG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZERvZ0p5ZGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNCOVhHNWNiaUFnSUNCamIyMXdiMjVsYm5SRWFXUk5iM1Z1ZENncElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1cGJtbDBUM0IwYVc5dWN5Z3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHbHVhWFJQY0hScGIyNXpLQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHMXZaRXB6YjI1U1pXNWtaWEl1YjNCMGFXOXVjeUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZibk4wSUc5d2RHbHZibk1nUFNCdGIyUktjMjl1VW1WdVpHVnlMbTl3ZEdsdmJuTTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213NklHOXdkR2x2Ym5NdWRYSnNJRDhnYjNCMGFXOXVjeTUxY213Z09pQW5KeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRG9nYjNCMGFXOXVjeTVtYVdWc1pFMWhjQ0EvSUVwVFQwNHVjR0Z5YzJVb2IzQjBhVzl1Y3k1bWFXVnNaRTFoY0NrZ09pQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsMFpXMURiMjUwWVdsdVpYSTZJRzUxYkd3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwZEd4bE9pQW5KeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZERvZ0p5ZGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nSVNGdmNIUnBiMjV6TG5WeWJGeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCMWNteERhR0Z1WjJVb1pYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3ZFhKc09pQmxkbVZ1ZEM1MFlYSm5aWFF1ZG1Gc2RXVjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQm9ZVzVrYkdWVGRXSnRhWFFvWlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnWlhabGJuUXVjSEpsZG1WdWRFUmxabUYxYkhRb0tUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dU9pQjBjblZsZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WelpYUlBjSFJwYjI1ektHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lM05vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nWm1Gc2MyVXNJSFZ5YkRvZ0p5Y3NJR1pwWld4a1RXRndPaUI3YVhSbGJVTnZiblJoYVc1bGNqb2diblZzYkN3Z2RHbDBiR1U2SUNjbkxDQmpiMjUwWlc1ME9pQW5KMzE5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCdVpYZFdZV3dnUFNCUFltcGxZM1F1WVhOemFXZHVLSFJvYVhNdWMzUmhkR1V1Wm1sbGJHUk5ZWEFzSUhaaGJIVmxLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdabWxsYkdSTllYQTZJRzVsZDFaaGJIMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2lncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzTm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJpd2dkWEpzZlNBOUlIUm9hWE11YzNSaGRHVTdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdHBkR1Z0UTI5dWRHRnBibVZ5TENCMGFYUnNaU3dnWTI5dWRHVnVkSDBnUFNCMGFHbHpMbk4wWVhSbExtWnBaV3hrVFdGd08xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoMWNtd2dKaVlnYVhSbGJVTnZiblJoYVc1bGNpQWhQVDBnYm5Wc2JDQW1KaUIwYVhSc1pTQW1KaUJqYjI1MFpXNTBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeFRkVzF0WVhKNUlIc3VMaTUwYUdsekxuTjBZWFJsZlNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4U1c1d2RYUkdhV1ZzWkhNZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh3UGp4aElHaHlaV1k5WENJalhDSWdiMjVEYkdsamF6MTdkR2hwY3k1eVpYTmxkRTl3ZEdsdmJuTXVZbWx1WkNoMGFHbHpLWDBnWTJ4aGMzTk9ZVzFsUFZ3aVluVjBkRzl1WENJK1VtVnpaWFFnYzJWMGRHbHVaM004TDJFK1BDOXdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHphRzkzUm1sbGJHUlRaV3hsWTNScGIyNHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BFWnBaV3hrVTJWc1pXTjBhVzl1SUhWeWJEMTdkWEpzZlNCbWFXVnNaRTFoY0QxN2RHaHBjeTV6ZEdGMFpTNW1hV1ZzWkUxaGNIMGdkWEJrWVhSbFJtbGxiR1JOWVhBOWUzUm9hWE11ZFhCa1lYUmxSbWxsYkdSTllYQXVZbWx1WkNoMGFHbHpLWDB2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThTVzV3ZFhSR2FXVnNaSE1nZXk0dUxuUm9hWE11YzNSaGRHVjlJQzgrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHdQanhoSUdoeVpXWTlYQ0lqWENJZ2IyNURiR2xqYXoxN2RHaHBjeTV5WlhObGRFOXdkR2x2Ym5OOUlHTnNZWE56VG1GdFpUMWNJbUoxZEhSdmJsd2lQbEpsYzJWMElITmxkSFJwYm1kelBDOWhQand2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpZDNKaGNGd2lQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFptOXliU0J2YmxOMVltMXBkRDE3ZEdocGN5NW9ZVzVrYkdWVGRXSnRhWFF1WW1sdVpDaDBhR2x6S1gwK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGNENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YkdGaVpXdytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHpkSEp2Ym1jK1JHRjBZU0J6YjNWeVkyVThMM04wY205dVp6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDJ4aFltVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4aWNpOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdrK1JXNTBaWElnWVNCMllXeHBaQ0JLVTA5T0lHRndhU0IxY213dVBDOXBQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzl3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSjBaWGgwWENJZ1kyeGhjM05PWVcxbFBWd2lkWEpzTFdsdWNIVjBYQ0lnZG1Gc2RXVTllM1Z5YkgwZ2IyNURhR0Z1WjJVOWUzUm9hWE11ZFhKc1EyaGhibWRsTG1KcGJtUW9kR2hwY3lsOUx6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHdQanhwYm5CMWRDQjBlWEJsUFZ3aWMzVmliV2wwWENJZ1kyeGhjM05PWVcxbFBWd2lZblYwZEc5dUlHSjFkSFJ2Ymkxd2NtbHRZWEo1WENJZ2RtRnNkV1U5WENKVGRXSnRhWFJjSWk4K1BDOXdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyWnZjbTArWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeEpibkIxZEVacFpXeGtjeUI3TGk0dWRHaHBjeTV6ZEdGMFpYMGdMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDJScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRk5sZEhScGJtZHpPeUlzSW1OdmJuTjBJRk4xYlcxaGNua2dQU0FvZTNWeWJDd2dabWxsYkdSTllYQjlLU0E5UGx4dUlDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lEeHdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ1BITjBjbTl1Wno1RVlYUmhJSE52ZFhKalpUd3ZjM1J5YjI1blBqeGljaTgrWEc0Z0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBYdDFjbXg5SUhSaGNtZGxkRDFjSWw5aWJHRnVhMXdpUG50MWNteDlQQzloUGx4dUlDQWdJQ0FnSUNBOEwzQStYRzRnSUNBZ0lDQWdJRHh3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdQSE4wY205dVp6NVVhWFJzWlR3dmMzUnliMjVuUGp4aWNpOCtYRzRnSUNBZ0lDQWdJQ0FnSUNCN1ptbGxiR1JOWVhBdWRHbDBiR1V1Y21Wd2JHRmpaU2duTGljc0lDY2c0b0NUUGlBbktYMWNiaUFnSUNBZ0lDQWdQQzl3UGx4dUlDQWdJQ0FnSUNBOGNENWNiaUFnSUNBZ0lDQWdJQ0FnSUR4emRISnZibWMrUTI5dWRHVnVkRHd2YzNSeWIyNW5QanhpY2k4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0I3Wm1sbGJHUk5ZWEF1WTI5dWRHVnVkQzV5WlhCc1lXTmxLQ2N1Snl3Z0p5RGlnSk0rSUNjcGZWeHVJQ0FnSUNBZ0lDQThMM0ErWEc0Z0lDQWdQQzlrYVhZK08xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQlRkVzF0WVhKNU95SXNJbWx0Y0c5eWRDQlRaWFIwYVc1bmN5Qm1jbTl0SUNjdUwwTnZiWEJ2Ym1WdWRITXZVMlYwZEdsdVozTW5PMXh1WEc1amIyNXpkQ0J0YjJSS2MyOXVVbVZ1WkdWeVJXeGxiV1Z1ZENBOUlDZHRiMlIxYkdGeWFYUjVMV3B6YjI0dGNtVnVaR1Z5Snp0Y2JtTnZibk4wSUdSdmJVVnNaVzFsYm5RZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNodGIyUktjMjl1VW1WdVpHVnlSV3hsYldWdWRDazdYRzVjYmxKbFlXTjBSRTlOTG5KbGJtUmxjaWhjYmlBZ0lDQThVMlYwZEdsdVozTWdMejRzWEc0Z0lDQWdaRzl0Uld4bGJXVnVkRnh1S1RzaUxDSm1kVzVqZEdsdmJpQm5aWFJCY0dsRVlYUmhLSFZ5YkNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJtWlhSamFDaDFjbXdwWEc0Z0lDQWdJQ0FnSUM1MGFHVnVLSEpsY3lBOVBpQnlaWE11YW5OdmJpZ3BLVnh1SUNBZ0lDQWdJQ0F1ZEdobGJpaGNiaUFnSUNBZ0lDQWdJQ0FnSUNoeVpYTjFiSFFwSUQwK0lDaDdjbVZ6ZFd4MGZTa3NYRzRnSUNBZ0lDQWdJQ0FnSUNBb1pYSnliM0lwSUQwK0lDaDdaWEp5YjNKOUtWeHVJQ0FnSUNBZ0lDQXBPMXh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCblpYUkJjR2xFWVhSaE8xeHVJbDE5XG4iXSwiZmlsZSI6IkFkbWluL0luZGV4QWRtaW4uanMifQ==
