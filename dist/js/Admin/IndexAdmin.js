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

function _readOnlyError(name) { throw new Error("\"" + name + "\" is read-only"); }

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
          },
          translation: _this.props.translation
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
      var _this$props = this.props,
          translation = _this$props.translation,
          data = _this$props.data;
      var fieldMap = this.props.fieldMap;

      if (Array.isArray(data)) {
        fieldMap.itemContainer = '';
      }

      if (fieldMap.itemContainer === null) {
        if (Array.isArray(data)) {
          data = (_readOnlyError("data"), data[0]);
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

        return React.createElement("div", null, React.createElement("h3", null, translation.selectItemsContainer), React.createElement("ul", {
          className: "json-tree"
        }, this.renderNodes(data)));
      } else {
        var objectData = _objectPath.default.get(data, fieldMap.itemContainer);

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

        return React.createElement("div", null, React.createElement("h3", null, translation.selectTitleContent), React.createElement("ul", {
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

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var FieldSelection =
/*#__PURE__*/
function (_React$Component) {
  _inherits(FieldSelection, _React$Component);

  function FieldSelection() {
    _classCallCheck(this, FieldSelection);

    return _possibleConstructorReturn(this, _getPrototypeOf(FieldSelection).apply(this, arguments));
  }

  _createClass(FieldSelection, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      this.getData();
    }
  }, {
    key: "getData",
    value: function getData() {
      var _this = this;

      var _this$props = this.props,
          url = _this$props.url,
          translation = _this$props.translation;
      (0, _getApiData.default)(url).then(function (_ref) {
        var result = _ref.result;

        if (!result || Object.keys(result).length === 0) {
          _this.props.setError(Error(translation.couldNotFetch));

          _this.props.setLoaded(true);

          return;
        }

        _this.props.setItems(result);

        _this.props.setLoaded(true);
      }, function (_ref2) {
        var error = _ref2.error;

        _this.props.setLoaded(true);

        _this.props.setError(error);
      });
    }
  }, {
    key: "updateFieldMap",
    value: function updateFieldMap(value) {
      this.props.updateFieldMap(value);
    }
  }, {
    key: "render",
    value: function render() {
      var _this$props2 = this.props,
          url = _this$props2.url,
          error = _this$props2.error,
          fieldMap = _this$props2.fieldMap,
          translation = _this$props2.translation,
          isLoaded = _this$props2.isLoaded,
          items = _this$props2.items;

      if (error) {
        return React.createElement("div", {
          className: "notice notice-error inline"
        }, React.createElement("p", null, error.message));
      } else if (!isLoaded) {
        return React.createElement("div", {
          className: "spinner is-active"
        });
      } else {
        return React.createElement(_DataList.default, {
          data: items,
          url: url,
          fieldMap: fieldMap,
          updateFieldMap: this.updateFieldMap.bind(this),
          translation: translation
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
      onClickContainer = _ref.onClickContainer,
      translation = _ref.translation;

  if (children) {
    return React.createElement("li", null, Array.isArray(object) && fieldMap.itemContainer === null ? React.createElement("span", null, React.createElement("span", {
      className: "dashicons dashicons-portfolio"
    }), " ", value, " ", React.createElement("a", {
      href: "#",
      className: "tree-select",
      "data-field": "itemContainer",
      onClick: onClickContainer
    }, translation.select)) : React.createElement("span", null, value), React.createElement("ul", null, children));
  } else {
    return React.createElement("li", null, fieldMap.title === object && fieldMap.title ? React.createElement("strong", null, translation.title, ": ") : '', fieldMap.content === object && fieldMap.content ? React.createElement("strong", null, translation.content, ": ") : '', React.createElement("span", null, value), !fieldMap.title && fieldMap.content !== object && fieldMap.itemContainer !== null ? React.createElement("a", {
      href: "#",
      className: "tree-select",
      "data-field": "title",
      onClick: onClickTitle
    }, translation.title) : '', !fieldMap.content && fieldMap.title !== object && fieldMap.itemContainer !== null ? React.createElement("a", {
      href: "#",
      className: "tree-select",
      "data-field": "content",
      onClick: onClickContent
    }, translation.content) : '');
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

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

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
      isLoaded: false,
      error: null,
      items: [],
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
    key: "setError",
    value: function setError(error) {
      this.setState({
        error: error
      });
    }
  }, {
    key: "setLoaded",
    value: function setLoaded(value) {
      this.setState({
        isLoaded: value
      });
    }
  }, {
    key: "setItems",
    value: function setItems(items) {
      this.setState({
        items: items
      });
    }
  }, {
    key: "render",
    value: function render() {
      var translation = this.props.translation;
      var _this$state = this.state,
          showFieldSelection = _this$state.showFieldSelection,
          url = _this$state.url,
          error = _this$state.error,
          isLoaded = _this$state.isLoaded,
          items = _this$state.items;
      var _this$state$fieldMap = this.state.fieldMap,
          itemContainer = _this$state$fieldMap.itemContainer,
          title = _this$state$fieldMap.title,
          content = _this$state$fieldMap.content;

      if (url && itemContainer !== null && title && content) {
        return React.createElement("div", null, React.createElement(_Summary.default, _extends({}, this.state, {
          translation: translation
        })), React.createElement(_InputFields.default, this.state), React.createElement("p", null, React.createElement("a", {
          href: "#",
          onClick: this.resetOptions.bind(this),
          className: "button"
        }, translation.resetSettings)));
      } else if (showFieldSelection) {
        return React.createElement("div", null, React.createElement(_FieldSelection.default, {
          url: url,
          error: error,
          setError: this.setError.bind(this),
          isLoaded: isLoaded,
          setLoaded: this.setLoaded.bind(this),
          items: items,
          setItems: this.setItems.bind(this),
          fieldMap: this.state.fieldMap,
          updateFieldMap: this.updateFieldMap.bind(this),
          translation: translation
        }), React.createElement(_InputFields.default, this.state), React.createElement("p", null, React.createElement("a", {
          href: "#",
          onClick: this.resetOptions.bind(this),
          className: "button"
        }, translation.resetSettings)));
      } else {
        return React.createElement("div", {
          className: "wrap"
        }, React.createElement("form", {
          onSubmit: this.handleSubmit.bind(this)
        }, React.createElement("p", null, React.createElement("label", null, React.createElement("strong", null, "API URL")), React.createElement("br", null), React.createElement("i", null, translation.validJsonUrl)), React.createElement("input", {
          type: "text",
          className: "url-input",
          value: url,
          onChange: this.urlChange.bind(this)
        }), React.createElement("p", null, React.createElement("input", {
          type: "submit",
          className: "button button-primary",
          value: translation.sendRequest
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
      fieldMap = _ref.fieldMap,
      translation = _ref.translation;
  return React.createElement("div", null, React.createElement("p", null, React.createElement("strong", null, "API URL"), React.createElement("br", null), React.createElement("a", {
    href: url,
    target: "_blank"
  }, url)), React.createElement("p", null, React.createElement("strong", null, translation.title), React.createElement("br", null), fieldMap.title.replace('.', ' –> ')), React.createElement("p", null, React.createElement("strong", null, translation.content), React.createElement("br", null), fieldMap.content.replace('.', ' –> ')));
};

var _default = Summary;
exports.default = _default;

},{}],10:[function(require,module,exports){
"use strict";

var _Settings = _interopRequireDefault(require("./Components/Settings"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var modJsonRenderElement = 'modularity-json-render';
var domElement = document.getElementById(modJsonRenderElement);
var _modJsonRender = modJsonRender,
    translation = _modJsonRender.translation;
ReactDOM.render(React.createElement(_Settings.default, {
  translation: translation
}), domElement);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7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QUEsS0FBSyxFQUFMO0FBQUQsS0FBWjtBQUFBLEdBSkQsQ0FBUDtBQU1IOztlQUVjLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3Rvcnkpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dDpjYW50IHRlc3QqL1xuICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsc1xuICAgIHJvb3Qub2JqZWN0UGF0aCA9IGZhY3RvcnkoKTtcbiAgfVxufSkodGhpcywgZnVuY3Rpb24oKXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIGZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgIGlmKG9iaiA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgLy90byBoYW5kbGUgb2JqZWN0cyB3aXRoIG51bGwgcHJvdG90eXBlcyAodG9vIGVkZ2UgY2FzZT8pXG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApXG4gIH1cblxuICBmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKXtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gdG9TdHJpbmcodHlwZSl7XG4gICAgcmV0dXJuIHRvU3RyLmNhbGwodHlwZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc09iamVjdChvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZyhvYmopID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xuICB9XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKG9iail7XG4gICAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dDpjYW50IHRlc3QqL1xuICAgIHJldHVybiB0b1N0ci5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH1cblxuICBmdW5jdGlvbiBpc0Jvb2xlYW4ob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nIHx8IHRvU3RyaW5nKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEtleShrZXkpe1xuICAgIHZhciBpbnRLZXkgPSBwYXJzZUludChrZXkpO1xuICAgIGlmIChpbnRLZXkudG9TdHJpbmcoKSA9PT0ga2V5KSB7XG4gICAgICByZXR1cm4gaW50S2V5O1xuICAgIH1cbiAgICByZXR1cm4ga2V5O1xuICB9XG5cbiAgZnVuY3Rpb24gZmFjdG9yeShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuICAgIHZhciBvYmplY3RQYXRoID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0UGF0aCkucmVkdWNlKGZ1bmN0aW9uKHByb3h5LCBwcm9wKSB7XG4gICAgICAgIGlmKHByb3AgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgICB9XG5cbiAgICAgICAgLyppc3RhbmJ1bCBpZ25vcmUgZWxzZSovXG4gICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0UGF0aFtwcm9wXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHByb3h5W3Byb3BdID0gb2JqZWN0UGF0aFtwcm9wXS5iaW5kKG9iamVjdFBhdGgsIG9iaik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICB9LCB7fSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIHJldHVybiAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgfHwgKHR5cGVvZiBwcm9wID09PSAnbnVtYmVyJyAmJiBBcnJheS5pc0FycmF5KG9iaikpIHx8IGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgaWYgKGhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApKSB7XG4gICAgICAgIHJldHVybiBvYmpbcHJvcF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHNldChvYmosIHBhdGguc3BsaXQoJy4nKS5tYXAoZ2V0S2V5KSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgICB9XG4gICAgICB2YXIgY3VycmVudFBhdGggPSBwYXRoWzBdO1xuICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKTtcbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlID09PSB2b2lkIDAgfHwgIWRvTm90UmVwbGFjZSkge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY3VycmVudFZhbHVlID09PSB2b2lkIDApIHtcbiAgICAgICAgLy9jaGVjayBpZiB3ZSBhc3N1bWUgYW4gYXJyYXlcbiAgICAgICAgaWYodHlwZW9mIHBhdGhbMV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgIH1cblxuICAgIG9iamVjdFBhdGguaGFzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAhIW9iajtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBqID0gZ2V0S2V5KHBhdGhbaV0pO1xuXG4gICAgICAgIGlmKCh0eXBlb2YgaiA9PT0gJ251bWJlcicgJiYgaXNBcnJheShvYmopICYmIGogPCBvYmoubGVuZ3RoKSB8fFxuICAgICAgICAgIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyA/IChqIGluIE9iamVjdChvYmopKSA6IGhhc093blByb3BlcnR5KG9iaiwgaikpKSB7XG4gICAgICAgICAgb2JqID0gb2JqW2pdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbnN1cmVFeGlzdHMgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIHRydWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLnNldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmluc2VydCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBhdCl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGF0ID0gfn5hdDtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG4gICAgICBhcnIuc3BsaWNlKGF0LCAwLCB2YWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW1wdHkgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlLCBpO1xuICAgICAgaWYgKCEodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAnJyk7XG4gICAgICB9IGVsc2UgaWYgKGlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgZmFsc2UpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIDApO1xuICAgICAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB2YWx1ZS5sZW5ndGggPSAwO1xuICAgICAgfSBlbHNlIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgZm9yIChpIGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKGhhc1NoYWxsb3dQcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2YWx1ZVtpXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIG51bGwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLnB1c2ggPSBmdW5jdGlvbiAob2JqLCBwYXRoIC8qLCB2YWx1ZXMgKi8pe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuXG4gICAgICBhcnIucHVzaC5hcHBseShhcnIsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmNvYWxlc2NlID0gZnVuY3Rpb24gKG9iaiwgcGF0aHMsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgdmFyIHZhbHVlO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGF0aHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKCh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aHNbaV0pKSAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZ2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgZGVmYXVsdFZhbHVlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmosIHBhdGguc3BsaXQoJy4nKSwgZGVmYXVsdFZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgdmFyIG5leHRPYmogPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aClcbiAgICAgIGlmIChuZXh0T2JqID09PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBuZXh0T2JqO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgZGVmYXVsdFZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5kZWwgPSBmdW5jdGlvbiBkZWwob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG5cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmosIHBhdGguc3BsaXQoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIGlmICghaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgICBvYmouc3BsaWNlKGN1cnJlbnRQYXRoLCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgb2JqW2N1cnJlbnRQYXRoXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIHJldHVybiBvYmplY3RQYXRoO1xuICB9XG5cbiAgdmFyIG1vZCA9IGZhY3RvcnkoKTtcbiAgbW9kLmNyZWF0ZSA9IGZhY3Rvcnk7XG4gIG1vZC53aXRoSW5oZXJpdGVkUHJvcHMgPSBmYWN0b3J5KHtpbmNsdWRlSW5oZXJpdGVkUHJvcHM6IHRydWV9KVxuICByZXR1cm4gbW9kO1xufSk7XG4iLCIndXNlIHN0cmljdCdcblxuY29uc3Qge2lzT2JqZWN0LCBnZXRLZXlzfSA9IHJlcXVpcmUoJy4vbGFuZycpXG5cbi8vIFBSSVZBVEUgUFJPUEVSVElFU1xuY29uc3QgQllQQVNTX01PREUgPSAnX19ieXBhc3NNb2RlJ1xuY29uc3QgSUdOT1JFX0NJUkNVTEFSID0gJ19faWdub3JlQ2lyY3VsYXInXG5jb25zdCBNQVhfREVFUCA9ICdfX21heERlZXAnXG5jb25zdCBDQUNIRSA9ICdfX2NhY2hlJ1xuY29uc3QgUVVFVUUgPSAnX19xdWV1ZSdcbmNvbnN0IFNUQVRFID0gJ19fc3RhdGUnXG5cbmNvbnN0IEVNUFRZX1NUQVRFID0ge31cblxuY2xhc3MgUmVjdXJzaXZlSXRlcmF0b3Ige1xuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IHJvb3RcbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtieXBhc3NNb2RlPTBdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2lnbm9yZUNpcmN1bGFyPWZhbHNlXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW21heERlZXA9MTAwXVxuICAgKi9cbiAgY29uc3RydWN0b3IgKHJvb3QsIGJ5cGFzc01vZGUgPSAwLCBpZ25vcmVDaXJjdWxhciA9IGZhbHNlLCBtYXhEZWVwID0gMTAwKSB7XG4gICAgdGhpc1tCWVBBU1NfTU9ERV0gPSBieXBhc3NNb2RlXG4gICAgdGhpc1tJR05PUkVfQ0lSQ1VMQVJdID0gaWdub3JlQ2lyY3VsYXJcbiAgICB0aGlzW01BWF9ERUVQXSA9IG1heERlZXBcbiAgICB0aGlzW0NBQ0hFXSA9IFtdXG4gICAgdGhpc1tRVUVVRV0gPSBbXVxuICAgIHRoaXNbU1RBVEVdID0gdGhpcy5nZXRTdGF0ZSh1bmRlZmluZWQsIHJvb3QpXG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBuZXh0ICgpIHtcbiAgICBjb25zdCB7bm9kZSwgcGF0aCwgZGVlcH0gPSB0aGlzW1NUQVRFXSB8fCBFTVBUWV9TVEFURVxuXG4gICAgaWYgKHRoaXNbTUFYX0RFRVBdID4gZGVlcCkge1xuICAgICAgaWYgKHRoaXMuaXNOb2RlKG5vZGUpKSB7XG4gICAgICAgIGlmICh0aGlzLmlzQ2lyY3VsYXIobm9kZSkpIHtcbiAgICAgICAgICBpZiAodGhpc1tJR05PUkVfQ0lSQ1VMQVJdKSB7XG4gICAgICAgICAgICAvLyBza2lwXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2lyY3VsYXIgcmVmZXJlbmNlJylcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRoaXMub25TdGVwSW50byh0aGlzW1NUQVRFXSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0b3JzID0gdGhpcy5nZXRTdGF0ZXNPZkNoaWxkTm9kZXMobm9kZSwgcGF0aCwgZGVlcClcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IHRoaXNbQllQQVNTX01PREVdID8gJ3B1c2gnIDogJ3Vuc2hpZnQnXG4gICAgICAgICAgICB0aGlzW1FVRVVFXVttZXRob2RdKC4uLmRlc2NyaXB0b3JzKVxuICAgICAgICAgICAgdGhpc1tDQUNIRV0ucHVzaChub2RlKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gdGhpc1tRVUVVRV0uc2hpZnQoKVxuICAgIGNvbnN0IGRvbmUgPSAhdmFsdWVcblxuICAgIHRoaXNbU1RBVEVdID0gdmFsdWVcblxuICAgIGlmIChkb25lKSB0aGlzLmRlc3Ryb3koKVxuXG4gICAgcmV0dXJuIHt2YWx1ZSwgZG9uZX1cbiAgfVxuICAvKipcbiAgICpcbiAgICovXG4gIGRlc3Ryb3kgKCkge1xuICAgIHRoaXNbUVVFVUVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW0NBQ0hFXS5sZW5ndGggPSAwXG4gICAgdGhpc1tTVEFURV0gPSBudWxsXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNOb2RlIChhbnkpIHtcbiAgICByZXR1cm4gaXNPYmplY3QoYW55KVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzTGVhZiAoYW55KSB7XG4gICAgcmV0dXJuICF0aGlzLmlzTm9kZShhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNDaXJjdWxhciAoYW55KSB7XG4gICAgcmV0dXJuIHRoaXNbQ0FDSEVdLmluZGV4T2YoYW55KSAhPT0gLTFcbiAgfVxuICAvKipcbiAgICogUmV0dXJucyBzdGF0ZXMgb2YgY2hpbGQgbm9kZXNcbiAgICogQHBhcmFtIHtPYmplY3R9IG5vZGVcbiAgICogQHBhcmFtIHtBcnJheX0gcGF0aFxuICAgKiBAcGFyYW0ge051bWJlcn0gZGVlcFxuICAgKiBAcmV0dXJucyB7QXJyYXk8T2JqZWN0Pn1cbiAgICovXG4gIGdldFN0YXRlc09mQ2hpbGROb2RlcyAobm9kZSwgcGF0aCwgZGVlcCkge1xuICAgIHJldHVybiBnZXRLZXlzKG5vZGUpLm1hcChrZXkgPT5cbiAgICAgIHRoaXMuZ2V0U3RhdGUobm9kZSwgbm9kZVtrZXldLCBrZXksIHBhdGguY29uY2F0KGtleSksIGRlZXAgKyAxKVxuICAgIClcbiAgfVxuICAvKipcbiAgICogUmV0dXJucyBzdGF0ZSBvZiBub2RlLiBDYWxscyBmb3IgZWFjaCBub2RlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyZW50XVxuICAgKiBAcGFyYW0geyp9IFtub2RlXVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2tleV1cbiAgICogQHBhcmFtIHtBcnJheX0gW3BhdGhdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbZGVlcF1cbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIGdldFN0YXRlIChwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCA9IFtdLCBkZWVwID0gMCkge1xuICAgIHJldHVybiB7cGFyZW50LCBub2RlLCBrZXksIHBhdGgsIGRlZXB9XG4gIH1cbiAgLyoqXG4gICAqIENhbGxiYWNrXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9uU3RlcEludG8gKHN0YXRlKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge1JlY3Vyc2l2ZUl0ZXJhdG9yfVxuICAgKi9cbiAgW1N5bWJvbC5pdGVyYXRvcl0gKCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWN1cnNpdmVJdGVyYXRvclxuIiwiJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuIiwiaW1wb3J0IExpc3RJdGVtIGZyb20gJy4vTGlzdEl0ZW0nO1xuaW1wb3J0IHJlY3Vyc2l2ZUl0ZXJhdG9yIGZyb20gJ3JlY3Vyc2l2ZS1pdGVyYXRvcic7XG5pbXBvcnQgb2JqZWN0UGF0aCBmcm9tICdvYmplY3QtcGF0aCc7XG5cbmNsYXNzIERhdGFMaXN0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBzZXRGaWVsZE1hcChwYXRoLCBldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHtbZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGRdOiBwYXRofSk7XG4gICAgfVxuXG4gICAgcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGNoaWxkID0gPExpc3RJdGVtIGtleT17aXRlbS50b1N0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtpdGVtfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdD17ZGF0YVtpdGVtXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGFpbmVyPXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrVGl0bGU9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGVudD17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uPXt0aGlzLnByb3BzLnRyYW5zbGF0aW9ufS8+O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbaXRlbV0gPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiB0aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCB7dHJhbnNsYXRpb24sIGRhdGF9ID0gdGhpcy5wcm9wcztcbiAgICAgICAgY29uc3QgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3IoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+e3RyYW5zbGF0aW9uLnNlbGVjdEl0ZW1zQ29udGFpbmVyfTwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJqc29uLXRyZWVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHt0aGlzLnJlbmRlck5vZGVzKGRhdGEpfVxuICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBvYmplY3REYXRhID0gb2JqZWN0UGF0aC5nZXQoZGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0RGF0YSA9IG9iamVjdERhdGFbMF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aH0gb2YgbmV3IHJlY3Vyc2l2ZUl0ZXJhdG9yKG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RQYXRoLnNldChvYmplY3REYXRhLCBwYXRoU3RyaW5nLCBwYXRoU3RyaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGgzPnt0cmFuc2xhdGlvbi5zZWxlY3RUaXRsZUNvbnRlbnR9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cImpzb24tdHJlZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge3RoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSl9XG4gICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBEYXRhTGlzdDsiLCJpbXBvcnQgRGF0YUxpc3QgZnJvbSAnLi9EYXRhTGlzdCc7XG5pbXBvcnQgZ2V0QXBpRGF0YSBmcm9tICcuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YSc7XG5cbmNsYXNzIEZpZWxkU2VsZWN0aW9uIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuXG4gICAgZ2V0RGF0YSgpIHtcbiAgICAgICAgY29uc3Qge3VybCwgdHJhbnNsYXRpb259ID0gdGhpcy5wcm9wcztcbiAgICAgICAgZ2V0QXBpRGF0YSh1cmwpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICAoe3Jlc3VsdH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvcHMuc2V0RXJyb3IoRXJyb3IodHJhbnNsYXRpb24uY291bGROb3RGZXRjaCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wcy5zZXRMb2FkZWQodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wcy5zZXRJdGVtcyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb3BzLnNldExvYWRlZCh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCAoe2Vycm9yfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb3BzLnNldExvYWRlZCh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wcy5zZXRFcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHt1cmwsIGVycm9yLCBmaWVsZE1hcCwgdHJhbnNsYXRpb24sIGlzTG9hZGVkLCBpdGVtc30gPSB0aGlzLnByb3BzO1xuXG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwibm90aWNlIG5vdGljZS1lcnJvciBpbmxpbmVcIj48cD57ZXJyb3IubWVzc2FnZX08L3A+PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIj48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxEYXRhTGlzdFxuICAgICAgICAgICAgICAgICAgICBkYXRhPXtpdGVtc31cbiAgICAgICAgICAgICAgICAgICAgdXJsPXt1cmx9XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXtmaWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb249e3RyYW5zbGF0aW9ufVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGaWVsZFNlbGVjdGlvbjsiLCJjb25zdCBJbnB1dEZpZWxkcyA9ICh7ZmllbGRNYXAsIHVybH0pID0+XG4gICAgPGRpdj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX3VybFwiIHZhbHVlPXt1cmx9Lz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX2ZpZWxkbWFwXCIgdmFsdWU9e0pTT04uc3RyaW5naWZ5KGZpZWxkTWFwKX0vPlxuICAgIDwvZGl2PjtcblxuZXhwb3J0IGRlZmF1bHQgSW5wdXRGaWVsZHM7IiwiY29uc3QgTGlzdEl0ZW0gPSAoe3ZhbHVlLCBjaGlsZHJlbiwgZmllbGRNYXAsIG9iamVjdCwgb25DbGlja1RpdGxlLCBvbkNsaWNrQ29udGVudCwgb25DbGlja0NvbnRhaW5lciwgdHJhbnNsYXRpb259KSA9PiB7XG4gICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgIHJldHVybiAoPGxpPlxuICAgICAgICAgICAge0FycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsID9cbiAgICAgICAgICAgICAgICA8c3Bhbj48c3BhbiBjbGFzc05hbWU9XCJkYXNoaWNvbnMgZGFzaGljb25zLXBvcnRmb2xpb1wiPjwvc3Bhbj4ge3ZhbHVlfSA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cIml0ZW1Db250YWluZXJcIiBvbkNsaWNrPXtvbkNsaWNrQ29udGFpbmVyfT57dHJhbnNsYXRpb24uc2VsZWN0fTwvYT48L3NwYW4+IDogIDxzcGFuPnt2YWx1ZX08L3NwYW4+fVxuICAgICAgICAgICAgPHVsPntjaGlsZHJlbn08L3VsPlxuICAgICAgICA8L2xpPik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICg8bGk+XG4gICAgICAgICAgICB7ZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCAmJiBmaWVsZE1hcC50aXRsZSA/IDxzdHJvbmc+e3RyYW5zbGF0aW9uLnRpdGxlfTogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgICAgICB7ZmllbGRNYXAuY29udGVudCA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLmNvbnRlbnQgPyA8c3Ryb25nPnt0cmFuc2xhdGlvbi5jb250ZW50fTogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgICAgICA8c3Bhbj57dmFsdWV9PC9zcGFuPlxuICAgICAgICAgICAgeyFmaWVsZE1hcC50aXRsZSAmJiAoZmllbGRNYXAuY29udGVudCAhPT0gb2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cInRpdGxlXCIgb25DbGljaz17b25DbGlja1RpdGxlfT57dHJhbnNsYXRpb24udGl0bGV9PC9hPiA6ICcnfVxuICAgICAgICAgICAgeyFmaWVsZE1hcC5jb250ZW50ICYmIChmaWVsZE1hcC50aXRsZSAhPT0gb2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cImNvbnRlbnRcIiBvbkNsaWNrPXtvbkNsaWNrQ29udGVudH0+e3RyYW5zbGF0aW9uLmNvbnRlbnR9PC9hPiA6ICcnfVxuICAgICAgICA8L2xpPik7XG4gICAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgTGlzdEl0ZW07IiwiaW1wb3J0IEZpZWxkU2VsZWN0aW9uIGZyb20gJy4vRmllbGRTZWxlY3Rpb24nO1xuaW1wb3J0IElucHV0RmllbGRzIGZyb20gJy4vSW5wdXRGaWVsZHMnO1xuaW1wb3J0IFN1bW1hcnkgZnJvbSAnLi9TdW1tYXJ5JztcblxuY2xhc3MgU2V0dGluZ3MgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICB1cmw6ICcnLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgICAgICBmaWVsZE1hcDoge1xuICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuaW5pdE9wdGlvbnMoKTtcbiAgICB9XG5cbiAgICBpbml0T3B0aW9ucygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2RKc29uUmVuZGVyLm9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gbW9kSnNvblJlbmRlci5vcHRpb25zO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXJsQ2hhbmdlKGV2ZW50KSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3VybDogZXZlbnQudGFyZ2V0LnZhbHVlfSk7XG4gICAgfVxuXG4gICAgaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogdHJ1ZX0pO1xuICAgIH1cblxuICAgIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLCB1cmw6ICcnLCBmaWVsZE1hcDoge2l0ZW1Db250YWluZXI6IG51bGwsIHRpdGxlOiAnJywgY29udGVudDogJyd9fSk7XG4gICAgfVxuXG4gICAgdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgICAgY29uc3QgbmV3VmFsID0gT2JqZWN0LmFzc2lnbih0aGlzLnN0YXRlLmZpZWxkTWFwLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpZWxkTWFwOiBuZXdWYWx9KTtcbiAgICB9XG5cbiAgICBzZXRFcnJvcihlcnJvcikge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtlcnJvcn0pO1xuICAgIH1cblxuICAgIHNldExvYWRlZCh2YWx1ZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdmFsdWV9KTtcbiAgICB9XG5cbiAgICBzZXRJdGVtcyhpdGVtcykge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtpdGVtczogaXRlbXN9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHt0cmFuc2xhdGlvbn0gPSB0aGlzLnByb3BzO1xuICAgICAgICBjb25zdCB7c2hvd0ZpZWxkU2VsZWN0aW9uLCB1cmwsIGVycm9yLCBpc0xvYWRlZCwgaXRlbXN9ID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3Qge2l0ZW1Db250YWluZXIsIHRpdGxlLCBjb250ZW50fSA9IHRoaXMuc3RhdGUuZmllbGRNYXA7XG5cbiAgICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPFN1bW1hcnkgey4uLnRoaXMuc3RhdGV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8cD48YSBocmVmPVwiI1wiIG9uQ2xpY2s9e3RoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJ1dHRvblwiPnt0cmFuc2xhdGlvbi5yZXNldFNldHRpbmdzfTwvYT48L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHNob3dGaWVsZFNlbGVjdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8RmllbGRTZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHVybD17dXJsfVxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I9e2Vycm9yfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0RXJyb3I9e3RoaXMuc2V0RXJyb3IuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlzTG9hZGVkPXtpc0xvYWRlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldExvYWRlZD17dGhpcy5zZXRMb2FkZWQuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zPXtpdGVtc31cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEl0ZW1zPXt0aGlzLnNldEl0ZW1zLmJpbmQodGhpcyl9XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5zdGF0ZS5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwPXt0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyl9XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGlvbj17dHJhbnNsYXRpb259XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICAgICAgPHA+PGEgaHJlZj1cIiNcIiBvbkNsaWNrPXt0aGlzLnJlc2V0T3B0aW9ucy5iaW5kKHRoaXMpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJidXR0b25cIj57dHJhbnNsYXRpb24ucmVzZXRTZXR0aW5nc308L2E+PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3cmFwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxmb3JtIG9uU3VibWl0PXt0aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKHRoaXMpfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz5BUEkgVVJMPC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpPnt0cmFuc2xhdGlvbi52YWxpZEpzb25Vcmx9PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3NOYW1lPVwidXJsLWlucHV0XCIgdmFsdWU9e3VybH0gb25DaGFuZ2U9e3RoaXMudXJsQ2hhbmdlLmJpbmQodGhpcyl9Lz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPjxpbnB1dCB0eXBlPVwic3VibWl0XCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIgdmFsdWU9e3RyYW5zbGF0aW9uLnNlbmRSZXF1ZXN0fS8+PC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAgICAgICAgICAgICAgIDxJbnB1dEZpZWxkcyB7Li4udGhpcy5zdGF0ZX0gLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNldHRpbmdzOyIsImNvbnN0IFN1bW1hcnkgPSAoe3VybCwgZmllbGRNYXAsIHRyYW5zbGF0aW9ufSkgPT5cbiAgICA8ZGl2PlxuICAgICAgICA8cD5cbiAgICAgICAgICAgIDxzdHJvbmc+QVBJIFVSTDwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICA8YSBocmVmPXt1cmx9IHRhcmdldD1cIl9ibGFua1wiPnt1cmx9PC9hPlxuICAgICAgICA8L3A+XG4gICAgICAgIDxwPlxuICAgICAgICAgICAgPHN0cm9uZz57dHJhbnNsYXRpb24udGl0bGV9PC9zdHJvbmc+PGJyLz5cbiAgICAgICAgICAgIHtmaWVsZE1hcC50aXRsZS5yZXBsYWNlKCcuJywgJyDigJM+ICcpfVxuICAgICAgICA8L3A+XG4gICAgICAgIDxwPlxuICAgICAgICAgICAgPHN0cm9uZz57dHJhbnNsYXRpb24uY29udGVudH08L3N0cm9uZz48YnIvPlxuICAgICAgICAgICAge2ZpZWxkTWFwLmNvbnRlbnQucmVwbGFjZSgnLicsICcg4oCTPiAnKX1cbiAgICAgICAgPC9wPlxuICAgIDwvZGl2PjtcblxuZXhwb3J0IGRlZmF1bHQgU3VtbWFyeTsiLCJpbXBvcnQgU2V0dGluZ3MgZnJvbSAnLi9Db21wb25lbnRzL1NldHRpbmdzJztcblxuY29uc3QgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG5jb25zdCBkb21FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kSnNvblJlbmRlckVsZW1lbnQpO1xuY29uc3Qge3RyYW5zbGF0aW9ufSA9IG1vZEpzb25SZW5kZXI7XG5cblJlYWN0RE9NLnJlbmRlcihcbiAgICA8U2V0dGluZ3MgdHJhbnNsYXRpb249e3RyYW5zbGF0aW9ufSAvPixcbiAgICBkb21FbGVtZW50XG4pOyIsImZ1bmN0aW9uIGdldEFwaURhdGEodXJsKSB7XG4gICAgcmV0dXJuIGZldGNoKHVybClcbiAgICAgICAgLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXG4gICAgICAgIC50aGVuKFxuICAgICAgICAgICAgKHJlc3VsdCkgPT4gKHtyZXN1bHR9KSxcbiAgICAgICAgICAgIChlcnJvcikgPT4gKHtlcnJvcn0pXG4gICAgICAgICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGdldEFwaURhdGE7XG4iXX0=

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9yZWFkT25seUVycm9yKG5hbWUpIHsgdGhyb3cgbmV3IEVycm9yKFwiXFxcIlwiICsgbmFtZSArIFwiXFxcIiBpcyByZWFkLW9ubHlcIik7IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkgeyBpZiAoa2V5IGluIG9iaikgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHsgdmFsdWU6IHZhbHVlLCBlbnVtZXJhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHdyaXRhYmxlOiB0cnVlIH0pOyB9IGVsc2UgeyBvYmpba2V5XSA9IHZhbHVlOyB9IHJldHVybiBvYmo7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbnZhciBEYXRhTGlzdCA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoRGF0YUxpc3QsIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIERhdGFMaXN0KCkge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICByZXR1cm4gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKERhdGFMaXN0KS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhEYXRhTGlzdCwgW3tcbiAgICBrZXk6IFwic2V0RmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0RmllbGRNYXAocGF0aCwgZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKF9kZWZpbmVQcm9wZXJ0eSh7fSwgZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGQsIHBhdGgpKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyTm9kZXNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRhdGEpLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpZiAoaXRlbSA9PT0gJ29iamVjdFBhdGgnKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoaWxkID0gUmVhY3QuY3JlYXRlRWxlbWVudChfTGlzdEl0ZW0uZGVmYXVsdCwge1xuICAgICAgICAgIGtleTogaXRlbS50b1N0cmluZygpLFxuICAgICAgICAgIHZhbHVlOiBpdGVtLFxuICAgICAgICAgIG9iamVjdDogZGF0YVtpdGVtXSxcbiAgICAgICAgICBmaWVsZE1hcDogX3RoaXMucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgb25DbGlja0NvbnRhaW5lcjogZnVuY3Rpb24gb25DbGlja0NvbnRhaW5lcihlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uQ2xpY2tUaXRsZTogZnVuY3Rpb24gb25DbGlja1RpdGxlKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uQ2xpY2tDb250ZW50OiBmdW5jdGlvbiBvbkNsaWNrQ29udGVudChlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB0cmFuc2xhdGlvbjogX3RoaXMucHJvcHMudHJhbnNsYXRpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKF90eXBlb2YoZGF0YVtpdGVtXSkgPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgY2hpbGRyZW46IEFycmF5LmlzQXJyYXkoZGF0YVtpdGVtXSkgPyBfdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBfdGhpcyRwcm9wcyA9IHRoaXMucHJvcHMsXG4gICAgICAgICAgdHJhbnNsYXRpb24gPSBfdGhpcyRwcm9wcy50cmFuc2xhdGlvbixcbiAgICAgICAgICBkYXRhID0gX3RoaXMkcHJvcHMuZGF0YTtcbiAgICAgIHZhciBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICBkYXRhID0gKF9yZWFkT25seUVycm9yKFwiZGF0YVwiKSwgZGF0YVswXSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWU7XG4gICAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvciA9IGZhbHNlO1xuICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IgPSBuZXcgX3JlY3Vyc2l2ZUl0ZXJhdG9yLmRlZmF1bHQoZGF0YSlbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gKF9zdGVwID0gX2l0ZXJhdG9yLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlKSB7XG4gICAgICAgICAgICB2YXIgX3N0ZXAkdmFsdWUgPSBfc3RlcC52YWx1ZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBfc3RlcCR2YWx1ZS5wYXJlbnQsXG4gICAgICAgICAgICAgICAgbm9kZSA9IF9zdGVwJHZhbHVlLm5vZGUsXG4gICAgICAgICAgICAgICAga2V5ID0gX3N0ZXAkdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgIHBhdGggPSBfc3RlcCR2YWx1ZS5wYXRoO1xuXG4gICAgICAgICAgICBpZiAoX3R5cGVvZihub2RlKSA9PT0gJ29iamVjdCcgJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICB2YXIgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuXG4gICAgICAgICAgICAgIF9vYmplY3RQYXRoLmRlZmF1bHQuc2V0KGRhdGEsIHBhdGhTdHJpbmcgKyAnLm9iamVjdFBhdGgnLCBwYXRoU3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIF9kaWRJdGVyYXRvckVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBfaXRlcmF0b3JFcnJvciA9IGVycjtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uICYmIF9pdGVyYXRvci5yZXR1cm4gIT0gbnVsbCkge1xuICAgICAgICAgICAgICBfaXRlcmF0b3IucmV0dXJuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcikge1xuICAgICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaDNcIiwgbnVsbCwgdHJhbnNsYXRpb24uc2VsZWN0SXRlbXNDb250YWluZXIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJqc29uLXRyZWVcIlxuICAgICAgICB9LCB0aGlzLnJlbmRlck5vZGVzKGRhdGEpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2JqZWN0RGF0YSA9IF9vYmplY3RQYXRoLmRlZmF1bHQuZ2V0KGRhdGEsIGZpZWxkTWFwLml0ZW1Db250YWluZXIpO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgb2JqZWN0RGF0YSA9IG9iamVjdERhdGFbMF07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlO1xuICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IyID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvcjIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IyID0gbmV3IF9yZWN1cnNpdmVJdGVyYXRvci5kZWZhdWx0KG9iamVjdERhdGEpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXAyOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gKF9zdGVwMiA9IF9pdGVyYXRvcjIubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlKSB7XG4gICAgICAgICAgICB2YXIgX3N0ZXAyJHZhbHVlID0gX3N0ZXAyLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwMiR2YWx1ZS5wYXJlbnQsXG4gICAgICAgICAgICAgICAgbm9kZSA9IF9zdGVwMiR2YWx1ZS5ub2RlLFxuICAgICAgICAgICAgICAgIGtleSA9IF9zdGVwMiR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwMiR2YWx1ZS5wYXRoO1xuXG4gICAgICAgICAgICBpZiAoX3R5cGVvZihub2RlKSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgdmFyIF9wYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQob2JqZWN0RGF0YSwgX3BhdGhTdHJpbmcsIF9wYXRoU3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIF9kaWRJdGVyYXRvckVycm9yMiA9IHRydWU7XG4gICAgICAgICAgX2l0ZXJhdG9yRXJyb3IyID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yICYmIF9pdGVyYXRvcjIucmV0dXJuICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgX2l0ZXJhdG9yMi5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yMikge1xuICAgICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImgzXCIsIG51bGwsIHRyYW5zbGF0aW9uLnNlbGVjdFRpdGxlQ29udGVudCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcImpzb24tdHJlZVwiXG4gICAgICAgIH0sIHRoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRGF0YUxpc3Q7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IERhdGFMaXN0O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9MaXN0SXRlbVwiOjcsXCJvYmplY3QtcGF0aFwiOjEsXCJyZWN1cnNpdmUtaXRlcmF0b3JcIjoyfV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9EYXRhTGlzdCA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRGF0YUxpc3RcIikpO1xuXG52YXIgX2dldEFwaURhdGEgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgRmllbGRTZWxlY3Rpb24gPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKEZpZWxkU2VsZWN0aW9uLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBGaWVsZFNlbGVjdGlvbigpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRmllbGRTZWxlY3Rpb24pO1xuXG4gICAgcmV0dXJuIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihGaWVsZFNlbGVjdGlvbikuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRmllbGRTZWxlY3Rpb24sIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImdldERhdGFcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0RGF0YSgpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHZhciBfdGhpcyRwcm9wcyA9IHRoaXMucHJvcHMsXG4gICAgICAgICAgdXJsID0gX3RoaXMkcHJvcHMudXJsLFxuICAgICAgICAgIHRyYW5zbGF0aW9uID0gX3RoaXMkcHJvcHMudHJhbnNsYXRpb247XG4gICAgICAoMCwgX2dldEFwaURhdGEuZGVmYXVsdCkodXJsKS50aGVuKGZ1bmN0aW9uIChfcmVmKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBfcmVmLnJlc3VsdDtcblxuICAgICAgICBpZiAoIXJlc3VsdCB8fCBPYmplY3Qua2V5cyhyZXN1bHQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIF90aGlzLnByb3BzLnNldEVycm9yKEVycm9yKHRyYW5zbGF0aW9uLmNvdWxkTm90RmV0Y2gpKTtcblxuICAgICAgICAgIF90aGlzLnByb3BzLnNldExvYWRlZCh0cnVlKTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzLnByb3BzLnNldEl0ZW1zKHJlc3VsdCk7XG5cbiAgICAgICAgX3RoaXMucHJvcHMuc2V0TG9hZGVkKHRydWUpO1xuICAgICAgfSwgZnVuY3Rpb24gKF9yZWYyKSB7XG4gICAgICAgIHZhciBlcnJvciA9IF9yZWYyLmVycm9yO1xuXG4gICAgICAgIF90aGlzLnByb3BzLnNldExvYWRlZCh0cnVlKTtcblxuICAgICAgICBfdGhpcy5wcm9wcy5zZXRFcnJvcihlcnJvcik7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwidXBkYXRlRmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAodmFsdWUpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHByb3BzMiA9IHRoaXMucHJvcHMsXG4gICAgICAgICAgdXJsID0gX3RoaXMkcHJvcHMyLnVybCxcbiAgICAgICAgICBlcnJvciA9IF90aGlzJHByb3BzMi5lcnJvcixcbiAgICAgICAgICBmaWVsZE1hcCA9IF90aGlzJHByb3BzMi5maWVsZE1hcCxcbiAgICAgICAgICB0cmFuc2xhdGlvbiA9IF90aGlzJHByb3BzMi50cmFuc2xhdGlvbixcbiAgICAgICAgICBpc0xvYWRlZCA9IF90aGlzJHByb3BzMi5pc0xvYWRlZCxcbiAgICAgICAgICBpdGVtcyA9IF90aGlzJHByb3BzMi5pdGVtcztcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwibm90aWNlIG5vdGljZS1lcnJvciBpbmxpbmVcIlxuICAgICAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBlcnJvci5tZXNzYWdlKSk7XG4gICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcInNwaW5uZXIgaXMtYWN0aXZlXCJcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChfRGF0YUxpc3QuZGVmYXVsdCwge1xuICAgICAgICAgIGRhdGE6IGl0ZW1zLFxuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIGZpZWxkTWFwOiBmaWVsZE1hcCxcbiAgICAgICAgICB1cGRhdGVGaWVsZE1hcDogdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpLFxuICAgICAgICAgIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvblxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRmllbGRTZWxlY3Rpb247XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IEZpZWxkU2VsZWN0aW9uO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi4vLi4vVXRpbGl0aWVzL2dldEFwaURhdGFcIjoxMSxcIi4vRGF0YUxpc3RcIjo0fV0sNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIElucHV0RmllbGRzID0gZnVuY3Rpb24gSW5wdXRGaWVsZHMoX3JlZikge1xuICB2YXIgZmllbGRNYXAgPSBfcmVmLmZpZWxkTWFwLFxuICAgICAgdXJsID0gX3JlZi51cmw7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl91cmxcIixcbiAgICB2YWx1ZTogdXJsXG4gIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgIHR5cGU6IFwiaGlkZGVuXCIsXG4gICAgbmFtZTogXCJtb2RfanNvbl9yZW5kZXJfZmllbGRtYXBcIixcbiAgICB2YWx1ZTogSlNPTi5zdHJpbmdpZnkoZmllbGRNYXApXG4gIH0pKTtcbn07XG5cbnZhciBfZGVmYXVsdCA9IElucHV0RmllbGRzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbnZhciBMaXN0SXRlbSA9IGZ1bmN0aW9uIExpc3RJdGVtKF9yZWYpIHtcbiAgdmFyIHZhbHVlID0gX3JlZi52YWx1ZSxcbiAgICAgIGNoaWxkcmVuID0gX3JlZi5jaGlsZHJlbixcbiAgICAgIGZpZWxkTWFwID0gX3JlZi5maWVsZE1hcCxcbiAgICAgIG9iamVjdCA9IF9yZWYub2JqZWN0LFxuICAgICAgb25DbGlja1RpdGxlID0gX3JlZi5vbkNsaWNrVGl0bGUsXG4gICAgICBvbkNsaWNrQ29udGVudCA9IF9yZWYub25DbGlja0NvbnRlbnQsXG4gICAgICBvbkNsaWNrQ29udGFpbmVyID0gX3JlZi5vbkNsaWNrQ29udGFpbmVyLFxuICAgICAgdHJhbnNsYXRpb24gPSBfcmVmLnRyYW5zbGF0aW9uO1xuXG4gIGlmIChjaGlsZHJlbikge1xuICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgQXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCB7XG4gICAgICBjbGFzc05hbWU6IFwiZGFzaGljb25zIGRhc2hpY29ucy1wb3J0Zm9saW9cIlxuICAgIH0pLCBcIiBcIiwgdmFsdWUsIFwiIFwiLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICBocmVmOiBcIiNcIixcbiAgICAgIGNsYXNzTmFtZTogXCJ0cmVlLXNlbGVjdFwiLFxuICAgICAgXCJkYXRhLWZpZWxkXCI6IFwiaXRlbUNvbnRhaW5lclwiLFxuICAgICAgb25DbGljazogb25DbGlja0NvbnRhaW5lclxuICAgIH0sIHRyYW5zbGF0aW9uLnNlbGVjdCkpIDogUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgY2hpbGRyZW4pKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIG51bGwsIGZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgJiYgZmllbGRNYXAudGl0bGUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHRyYW5zbGF0aW9uLnRpdGxlLCBcIjogXCIpIDogJycsIGZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCAmJiBmaWVsZE1hcC5jb250ZW50ID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCB0cmFuc2xhdGlvbi5jb250ZW50LCBcIjogXCIpIDogJycsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgIWZpZWxkTWFwLnRpdGxlICYmIGZpZWxkTWFwLmNvbnRlbnQgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcInRpdGxlXCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrVGl0bGVcbiAgICB9LCB0cmFuc2xhdGlvbi50aXRsZSkgOiAnJywgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcImNvbnRlbnRcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tDb250ZW50XG4gICAgfSwgdHJhbnNsYXRpb24uY29udGVudCkgOiAnJyk7XG4gIH1cbn07XG5cbnZhciBfZGVmYXVsdCA9IExpc3RJdGVtO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDg6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbnZhciBfRmllbGRTZWxlY3Rpb24gPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0ZpZWxkU2VsZWN0aW9uXCIpKTtcblxudmFyIF9JbnB1dEZpZWxkcyA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vSW5wdXRGaWVsZHNcIikpO1xuXG52YXIgX1N1bW1hcnkgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL1N1bW1hcnlcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5mdW5jdGlvbiBfZXh0ZW5kcygpIHsgX2V4dGVuZHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQpIHsgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHsgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTsgZm9yICh2YXIga2V5IGluIHNvdXJjZSkgeyBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkgeyB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldOyB9IH0gfSByZXR1cm4gdGFyZ2V0OyB9OyByZXR1cm4gX2V4dGVuZHMuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9XG5cbmZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKGNhbGwgJiYgKF90eXBlb2YoY2FsbCkgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikpIHsgcmV0dXJuIGNhbGw7IH0gcmV0dXJuIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZik7IH1cblxuZnVuY3Rpb24gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKSB7IGlmIChzZWxmID09PSB2b2lkIDApIHsgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpOyB9IHJldHVybiBzZWxmOyB9XG5cbmZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IF9nZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiA/IE9iamVjdC5nZXRQcm90b3R5cGVPZiA6IGZ1bmN0aW9uIF9nZXRQcm90b3R5cGVPZihvKSB7IHJldHVybiBvLl9fcHJvdG9fXyB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2Yobyk7IH07IHJldHVybiBfZ2V0UHJvdG90eXBlT2Yobyk7IH1cblxuZnVuY3Rpb24gX2luaGVyaXRzKHN1YkNsYXNzLCBzdXBlckNsYXNzKSB7IGlmICh0eXBlb2Ygc3VwZXJDbGFzcyAhPT0gXCJmdW5jdGlvblwiICYmIHN1cGVyQ2xhc3MgIT09IG51bGwpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uXCIpOyB9IHN1YkNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcyAmJiBzdXBlckNsYXNzLnByb3RvdHlwZSwgeyBjb25zdHJ1Y3RvcjogeyB2YWx1ZTogc3ViQ2xhc3MsIHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUgfSB9KTsgaWYgKHN1cGVyQ2xhc3MpIF9zZXRQcm90b3R5cGVPZihzdWJDbGFzcywgc3VwZXJDbGFzcyk7IH1cblxuZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8IGZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IG8uX19wcm90b19fID0gcDsgcmV0dXJuIG87IH07IHJldHVybiBfc2V0UHJvdG90eXBlT2YobywgcCk7IH1cblxudmFyIFNldHRpbmdzID1cbi8qI19fUFVSRV9fKi9cbmZ1bmN0aW9uIChfUmVhY3QkQ29tcG9uZW50KSB7XG4gIF9pbmhlcml0cyhTZXR0aW5ncywgX1JlYWN0JENvbXBvbmVudCk7XG5cbiAgZnVuY3Rpb24gU2V0dGluZ3MocHJvcHMpIHtcbiAgICB2YXIgX3RoaXM7XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgU2V0dGluZ3MpO1xuXG4gICAgX3RoaXMgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCBfZ2V0UHJvdG90eXBlT2YoU2V0dGluZ3MpLmNhbGwodGhpcywgcHJvcHMpKTtcbiAgICBfdGhpcy5zdGF0ZSA9IHtcbiAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gICAgICB1cmw6ICcnLFxuICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBpdGVtczogW10sXG4gICAgICBmaWVsZE1hcDoge1xuICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoU2V0dGluZ3MsIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbml0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0T3B0aW9ucygpIHtcbiAgICAgIGlmICh0eXBlb2YgbW9kSnNvblJlbmRlci5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IG1vZEpzb25SZW5kZXIub3B0aW9ucztcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVybENoYW5nZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB1cmw6IGV2ZW50LnRhcmdldC52YWx1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImhhbmRsZVN1Ym1pdFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVzZXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICB1cmw6ICcnLFxuICAgICAgICBmaWVsZE1hcDoge1xuICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdmFyIG5ld1ZhbCA9IE9iamVjdC5hc3NpZ24odGhpcy5zdGF0ZS5maWVsZE1hcCwgdmFsdWUpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGZpZWxkTWFwOiBuZXdWYWxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJzZXRFcnJvclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBzZXRFcnJvcihlcnJvcikge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGVycm9yOiBlcnJvclxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInNldExvYWRlZFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBzZXRMb2FkZWQodmFsdWUpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBpc0xvYWRlZDogdmFsdWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJzZXRJdGVtc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBzZXRJdGVtcyhpdGVtcykge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGl0ZW1zOiBpdGVtc1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLnByb3BzLnRyYW5zbGF0aW9uO1xuICAgICAgdmFyIF90aGlzJHN0YXRlID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb24gPSBfdGhpcyRzdGF0ZS5zaG93RmllbGRTZWxlY3Rpb24sXG4gICAgICAgICAgdXJsID0gX3RoaXMkc3RhdGUudXJsLFxuICAgICAgICAgIGVycm9yID0gX3RoaXMkc3RhdGUuZXJyb3IsXG4gICAgICAgICAgaXNMb2FkZWQgPSBfdGhpcyRzdGF0ZS5pc0xvYWRlZCxcbiAgICAgICAgICBpdGVtcyA9IF90aGlzJHN0YXRlLml0ZW1zO1xuICAgICAgdmFyIF90aGlzJHN0YXRlJGZpZWxkTWFwID0gdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICBpdGVtQ29udGFpbmVyID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuaXRlbUNvbnRhaW5lcixcbiAgICAgICAgICB0aXRsZSA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLnRpdGxlLFxuICAgICAgICAgIGNvbnRlbnQgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC5jb250ZW50O1xuXG4gICAgICBpZiAodXJsICYmIGl0ZW1Db250YWluZXIgIT09IG51bGwgJiYgdGl0bGUgJiYgY29udGVudCkge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9TdW1tYXJ5LmRlZmF1bHQsIF9leHRlbmRzKHt9LCB0aGlzLnN0YXRlLCB7XG4gICAgICAgICAgdHJhbnNsYXRpb246IHRyYW5zbGF0aW9uXG4gICAgICAgIH0pKSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucy5iaW5kKHRoaXMpLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCB0cmFuc2xhdGlvbi5yZXNldFNldHRpbmdzKSkpO1xuICAgICAgfSBlbHNlIGlmIChzaG93RmllbGRTZWxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChfRmllbGRTZWxlY3Rpb24uZGVmYXVsdCwge1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIGVycm9yOiBlcnJvcixcbiAgICAgICAgICBzZXRFcnJvcjogdGhpcy5zZXRFcnJvci5iaW5kKHRoaXMpLFxuICAgICAgICAgIGlzTG9hZGVkOiBpc0xvYWRlZCxcbiAgICAgICAgICBzZXRMb2FkZWQ6IHRoaXMuc2V0TG9hZGVkLmJpbmQodGhpcyksXG4gICAgICAgICAgaXRlbXM6IGl0ZW1zLFxuICAgICAgICAgIHNldEl0ZW1zOiB0aGlzLnNldEl0ZW1zLmJpbmQodGhpcyksXG4gICAgICAgICAgZmllbGRNYXA6IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKSxcbiAgICAgICAgICB0cmFuc2xhdGlvbjogdHJhbnNsYXRpb25cbiAgICAgICAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgaHJlZjogXCIjXCIsXG4gICAgICAgICAgb25DbGljazogdGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKSxcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uXCJcbiAgICAgICAgfSwgdHJhbnNsYXRpb24ucmVzZXRTZXR0aW5ncykpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwid3JhcFwiXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIsIHtcbiAgICAgICAgICBvblN1Ym1pdDogdGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKVxuICAgICAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIkFQSSBVUkxcIikpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnJcIiwgbnVsbCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIG51bGwsIHRyYW5zbGF0aW9uLnZhbGlkSnNvblVybCkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJ1cmwtaW5wdXRcIixcbiAgICAgICAgICB2YWx1ZTogdXJsLFxuICAgICAgICAgIG9uQ2hhbmdlOiB0aGlzLnVybENoYW5nZS5iaW5kKHRoaXMpXG4gICAgICAgIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwic3VibWl0XCIsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvbiBidXR0b24tcHJpbWFyeVwiLFxuICAgICAgICAgIHZhbHVlOiB0cmFuc2xhdGlvbi5zZW5kUmVxdWVzdFxuICAgICAgICB9KSkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIFNldHRpbmdzO1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBTZXR0aW5ncztcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4vRmllbGRTZWxlY3Rpb25cIjo1LFwiLi9JbnB1dEZpZWxkc1wiOjYsXCIuL1N1bW1hcnlcIjo5fV0sOTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIFN1bW1hcnkgPSBmdW5jdGlvbiBTdW1tYXJ5KF9yZWYpIHtcbiAgdmFyIHVybCA9IF9yZWYudXJsLFxuICAgICAgZmllbGRNYXAgPSBfcmVmLmZpZWxkTWFwLFxuICAgICAgdHJhbnNsYXRpb24gPSBfcmVmLnRyYW5zbGF0aW9uO1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiQVBJIFVSTFwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgaHJlZjogdXJsLFxuICAgIHRhcmdldDogXCJfYmxhbmtcIlxuICB9LCB1cmwpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCB0cmFuc2xhdGlvbi50aXRsZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgZmllbGRNYXAudGl0bGUucmVwbGFjZSgnLicsICcg4oCTPiAnKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgdHJhbnNsYXRpb24uY29udGVudCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSk7XG59O1xuXG52YXIgX2RlZmF1bHQgPSBTdW1tYXJ5O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDEwOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG52YXIgX1NldHRpbmdzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9Db21wb25lbnRzL1NldHRpbmdzXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxudmFyIG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xudmFyIGRvbUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChtb2RKc29uUmVuZGVyRWxlbWVudCk7XG52YXIgX21vZEpzb25SZW5kZXIgPSBtb2RKc29uUmVuZGVyLFxuICAgIHRyYW5zbGF0aW9uID0gX21vZEpzb25SZW5kZXIudHJhbnNsYXRpb247XG5SZWFjdERPTS5yZW5kZXIoUmVhY3QuY3JlYXRlRWxlbWVudChfU2V0dGluZ3MuZGVmYXVsdCwge1xuICB0cmFuc2xhdGlvbjogdHJhbnNsYXRpb25cbn0pLCBkb21FbGVtZW50KTtcblxufSx7XCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIjo4fV0sMTE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbmZ1bmN0aW9uIGdldEFwaURhdGEodXJsKSB7XG4gIHJldHVybiBmZXRjaCh1cmwpLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuICAgIHJldHVybiByZXMuanNvbigpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICB9O1xuICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3I6IGVycm9yXG4gICAgfTtcbiAgfSk7XG59XG5cbnZhciBfZGVmYXVsdCA9IGdldEFwaURhdGE7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV19LHt9LFsxMF0pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZiMkpxWldOMExYQmhkR2d2YVc1a1pYZ3Vhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjbVZqZFhKemFYWmxMV2wwWlhKaGRHOXlMM055WXk5U1pXTjFjbk5wZG1WSmRHVnlZWFJ2Y2k1cWN5SXNJbTV2WkdWZmJXOWtkV3hsY3k5eVpXTjFjbk5wZG1VdGFYUmxjbUYwYjNJdmMzSmpMMnhoYm1jdWFuTWlMQ0p6YjNWeVkyVXZhbk12UVdSdGFXNHZRMjl0Y0c5dVpXNTBjeTlFWVhSaFRHbHpkQzVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5RGIyMXdiMjVsYm5SekwwWnBaV3hrVTJWc1pXTjBhVzl1TG1weklpd2ljMjkxY21ObEwycHpMMEZrYldsdUwwTnZiWEJ2Ym1WdWRITXZTVzV3ZFhSR2FXVnNaSE11YW5NaUxDSnpiM1Z5WTJVdmFuTXZRV1J0YVc0dlEyOXRjRzl1Wlc1MGN5OU1hWE4wU1hSbGJTNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlEYjIxd2IyNWxiblJ6TDFObGRIUnBibWR6TG1weklpd2ljMjkxY21ObEwycHpMMEZrYldsdUwwTnZiWEJ2Ym1WdWRITXZVM1Z0YldGeWVTNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlKYm1SbGVFRmtiV2x1TG1weklpd2ljMjkxY21ObEwycHpMMVYwYVd4cGRHbGxjeTluWlhSQmNHbEVZWFJoTG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lKQlFVRkJPMEZEUVVFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU53VTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVTnlTVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3T3pzN096czdPenRCUXk5RVFUczdRVUZEUVRzN1FVRkRRVHM3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN096czdTVUZGVFN4Uk96czdPenM3T3pzN096czdPMmREUVVOVkxFa3NSVUZCVFN4TExFVkJRVTg3UVVGRGNrSXNUVUZCUVN4TFFVRkxMRU5CUVVNc1kwRkJUanRCUVVOQkxGZEJRVXNzUzBGQlRDeERRVUZYTEdOQlFWZ3NjVUpCUVRSQ0xFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRXNUMEZCWWl4RFFVRnhRaXhMUVVGcVJDeEZRVUY1UkN4SlFVRjZSRHRCUVVOSU96czdaME5CUlZjc1NTeEZRVUZOTzBGQlFVRTdPMEZCUTJRc1lVRkJUeXhOUVVGTkxFTkJRVU1zU1VGQlVDeERRVUZaTEVsQlFWb3NSVUZCYTBJc1IwRkJiRUlzUTBGQmMwSXNWVUZCUVN4SlFVRkpMRVZCUVVrN1FVRkRha01zV1VGQlNTeEpRVUZKTEV0QlFVc3NXVUZCWWl4RlFVRXlRanRCUVVOMlFqdEJRVU5JT3p0QlFVVkVMRmxCUVVrc1MwRkJTeXhIUVVGSExHOUNRVUZETEdsQ1FVRkVPMEZCUVZVc1ZVRkJRU3hIUVVGSExFVkJRVVVzU1VGQlNTeERRVUZETEZGQlFVd3NSVUZCWmp0QlFVTlZMRlZCUVVFc1MwRkJTeXhGUVVGRkxFbEJSR3BDTzBGQlJWVXNWVUZCUVN4TlFVRk5MRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVVFzUTBGR2RFSTdRVUZIVlN4VlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGSkxFTkJRVU1zUzBGQlRDeERRVUZYTEZGQlNDOUNPMEZCU1ZVc1ZVRkJRU3huUWtGQlowSXNSVUZCUlN3d1FrRkJRU3hEUVVGRE8wRkJRVUVzYlVKQlFVa3NTMEZCU1N4RFFVRkRMRmRCUVV3c1EwRkJhVUlzU1VGQlNTeERRVUZETEVsQlFVUXNRMEZCU2l4RFFVRlhMRlZCUVRWQ0xFVkJRWGRETEVOQlFYaERMRU5CUVVvN1FVRkJRU3hYUVVvM1FqdEJRVXRWTEZWQlFVRXNXVUZCV1N4RlFVRkZMSE5DUVVGQkxFTkJRVU03UVVGQlFTeHRRa0ZCU1N4TFFVRkpMRU5CUVVNc1YwRkJUQ3hEUVVGcFFpeEpRVUZKTEVOQlFVTXNTVUZCUkN4RFFVRnlRaXhGUVVFMlFpeERRVUUzUWl4RFFVRktPMEZCUVVFc1YwRk1la0k3UVVGTlZTeFZRVUZCTEdOQlFXTXNSVUZCUlN4M1FrRkJRU3hEUVVGRE8wRkJRVUVzYlVKQlFVa3NTMEZCU1N4RFFVRkRMRmRCUVV3c1EwRkJhVUlzU1VGQlNTeERRVUZETEVsQlFVUXNRMEZCY2tJc1JVRkJOa0lzUTBGQk4wSXNRMEZCU2p0QlFVRkJMRmRCVGpOQ08wRkJUMVVzVlVGQlFTeFhRVUZYTEVWQlFVVXNTMEZCU1N4RFFVRkRMRXRCUVV3c1EwRkJWenRCUVZCc1F5eFZRVUZhT3p0QlFWTkJMRmxCUVVrc1VVRkJUeXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZZTEUxQlFYTkNMRkZCUVhSQ0xFbEJRV3RETEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1MwRkJaU3hKUVVGeVJDeEZRVUV5UkR0QlFVTjJSQ3hWUVVGQkxFdEJRVXNzUjBGQlJ5eExRVUZMTEVOQlFVTXNXVUZCVGl4RFFVRnRRaXhMUVVGdVFpeEZRVUV3UWp0QlFVTTVRaXhaUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRV3hDTEVsQlFUUkNMRXRCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1EwRkJWeXhEUVVGWUxFTkJRV3BDTEVOQlFUVkNMRWRCUVRoRUxFdEJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRWEpDTzBGQlJERkRMRmRCUVRGQ0xFTkJRVkk3UVVGSFNEczdRVUZGUkN4bFFVRlBMRXRCUVZBN1FVRkRTQ3hQUVhKQ1RTeERRVUZRTzBGQmMwSklPenM3TmtKQlJWRTdRVUZCUVN4M1FrRkRkVUlzUzBGQlN5eExRVVExUWp0QlFVRkJMRlZCUTBVc1YwRkVSaXhsUVVORkxGZEJSRVk3UVVGQlFTeFZRVU5sTEVsQlJHWXNaVUZEWlN4SlFVUm1PMEZCUlV3c1ZVRkJUU3hSUVVGUkxFZEJRVWNzUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZCTlVJN08wRkJSVUVzVlVGQlNTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVdRc1EwRkJTaXhGUVVGNVFqdEJRVU55UWl4UlFVRkJMRkZCUVZFc1EwRkJReXhoUVVGVUxFZEJRWGxDTEVWQlFYcENPMEZCUTBnN08wRkJSVVFzVlVGQlNTeFJRVUZSTEVOQlFVTXNZVUZCVkN4TFFVRXlRaXhKUVVFdlFpeEZRVUZ4UXp0QlFVTnFReXhaUVVGSkxFdEJRVXNzUTBGQlF5eFBRVUZPTEVOQlFXTXNTVUZCWkN4RFFVRktMRVZCUVhsQ08wRkJRM0pDTEZWQlFVRXNTVUZCU1N3MFFrRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlJDeERRVUZRTEVOQlFVbzdRVUZEU0RzN1FVRklaME03UVVGQlFUdEJRVUZCT3p0QlFVRkJPMEZCUzJwRExDdENRVUZ6UXl4SlFVRkpMREJDUVVGS0xFTkJRWE5DTEVsQlFYUkNMRU5CUVhSRExEaElRVUZ0UlR0QlFVRkJPMEZCUVVFc1owSkJRWHBFTEUxQlFYbEVMR1ZCUVhwRUxFMUJRWGxFTzBGQlFVRXNaMEpCUVdwRUxFbEJRV2xFTEdWQlFXcEVMRWxCUVdsRU8wRkJRVUVzWjBKQlFUTkRMRWRCUVRKRExHVkJRVE5ETEVkQlFUSkRPMEZCUVVFc1owSkJRWFJETEVsQlFYTkRMR1ZCUVhSRExFbEJRWE5ET3p0QlFVTXZSQ3huUWtGQlNTeFJRVUZQTEVsQlFWQXNUVUZCWjBJc1VVRkJhRUlzU1VGQk5FSXNTVUZCU1N4TFFVRkxMRWxCUVhwRExFVkJRU3RETzBGQlF6TkRMR3RDUVVGSkxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCVEN4RFFVRlZMRWRCUVZZc1EwRkJha0k3TzBGQlEwRXNhME5CUVZjc1IwRkJXQ3hEUVVGbExFbEJRV1lzUlVGQmNVSXNWVUZCVlN4SFFVRkhMR0ZCUVd4RExFVkJRV2xFTEZWQlFXcEVPMEZCUTBnN1FVRkRTanRCUVZablF6dEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPenRCUVZscVF5eGxRVU5KTEdsRFFVTkpMR2REUVVGTExGZEJRVmNzUTBGQlF5eHZRa0ZCYWtJc1EwRkVTaXhGUVVWSk8wRkJRVWtzVlVGQlFTeFRRVUZUTEVWQlFVTTdRVUZCWkN4WFFVTkxMRXRCUVVzc1YwRkJUQ3hEUVVGcFFpeEpRVUZxUWl4RFFVUk1MRU5CUmtvc1EwRkVTanRCUVZGSUxFOUJjRUpFTEUxQmIwSlBPMEZCUTBnc1dVRkJTU3hWUVVGVkxFZEJRVWNzYjBKQlFWY3NSMEZCV0N4RFFVRmxMRWxCUVdZc1JVRkJjVUlzVVVGQlVTeERRVUZETEdGQlFUbENMRU5CUVdwQ096dEJRVVZCTEZsQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU0c1EwRkJZeXhWUVVGa0xFTkJRVW9zUlVGQkswSTdRVUZETTBJc1ZVRkJRU3hWUVVGVkxFZEJRVWNzVlVGQlZTeERRVUZETEVOQlFVUXNRMEZCZGtJN1FVRkRTRHM3UVVGTVJUdEJRVUZCTzBGQlFVRTdPMEZCUVVFN1FVRlBTQ3huUTBGQmMwTXNTVUZCU1N3d1FrRkJTaXhEUVVGelFpeFZRVUYwUWl4RFFVRjBReXh0U1VGQmVVVTdRVUZCUVR0QlFVRkJMR2RDUVVFdlJDeE5RVUVyUkN4blFrRkJMMFFzVFVGQkswUTdRVUZCUVN4blFrRkJka1FzU1VGQmRVUXNaMEpCUVhaRUxFbEJRWFZFTzBGQlFVRXNaMEpCUVdwRUxFZEJRV2xFTEdkQ1FVRnFSQ3hIUVVGcFJEdEJRVUZCTEdkQ1FVRTFReXhKUVVFMFF5eG5Ra0ZCTlVNc1NVRkJORU03TzBGQlEzSkZMR2RDUVVGSkxGRkJRVThzU1VGQlVDeE5RVUZuUWl4UlFVRndRaXhGUVVFNFFqdEJRVU14UWl4clFrRkJTU3hYUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVd3NRMEZCVlN4SFFVRldMRU5CUVdwQ096dEJRVU5CTEd0RFFVRlhMRWRCUVZnc1EwRkJaU3hWUVVGbUxFVkJRVEpDTEZkQlFUTkNMRVZCUVhWRExGZEJRWFpETzBGQlEwZzdRVUZEU2p0QlFWcEZPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3TzBGQlkwZ3NaVUZEU1N4cFEwRkRTU3huUTBGQlN5eFhRVUZYTEVOQlFVTXNhMEpCUVdwQ0xFTkJSRW9zUlVGRlNUdEJRVUZKTEZWQlFVRXNVMEZCVXl4RlFVRkRPMEZCUVdRc1YwRkRTeXhMUVVGTExGZEJRVXdzUTBGQmFVSXNWVUZCYWtJc1EwRkVUQ3hEUVVaS0xFTkJSRW83UVVGUlNEdEJRVU5LT3pzN08wVkJiRVpyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUZ4Um1Rc1VUczdPenM3T3pzN096czdRVU42Um1ZN08wRkJRMEU3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN1NVRkZUU3hqT3pzN096czdPenM3T3pzN08zZERRVU5yUWp0QlFVTm9RaXhYUVVGTExFOUJRVXc3UVVGRFNEczdPemhDUVVWVE8wRkJRVUU3TzBGQlFVRXNkMEpCUTNGQ0xFdEJRVXNzUzBGRU1VSTdRVUZCUVN4VlFVTkRMRWRCUkVRc1pVRkRReXhIUVVSRU8wRkJRVUVzVlVGRFRTeFhRVVJPTEdWQlEwMHNWMEZFVGp0QlFVVk9MQ3RDUVVGWExFZEJRVmdzUlVGRFN5eEpRVVJNTEVOQlJWRXNaMEpCUVdNN1FVRkJRU3haUVVGYUxFMUJRVmtzVVVGQldpeE5RVUZaT3p0QlFVTldMRmxCUVVrc1EwRkJReXhOUVVGRUxFbEJRVmNzVFVGQlRTeERRVUZETEVsQlFWQXNRMEZCV1N4TlFVRmFMRVZCUVc5Q0xFMUJRWEJDTEV0QlFTdENMRU5CUVRsRExFVkJRV2xFTzBGQlF6ZERMRlZCUVVFc1MwRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFJRVUZZTEVOQlFXOUNMRXRCUVVzc1EwRkJReXhYUVVGWExFTkJRVU1zWVVGQllpeERRVUY2UWpzN1FVRkRRU3hWUVVGQkxFdEJRVWtzUTBGQlF5eExRVUZNTEVOQlFWY3NVMEZCV0N4RFFVRnhRaXhKUVVGeVFqczdRVUZEUVR0QlFVTklPenRCUVVORUxGRkJRVUVzUzBGQlNTeERRVUZETEV0QlFVd3NRMEZCVnl4UlFVRllMRU5CUVc5Q0xFMUJRWEJDT3p0QlFVTkJMRkZCUVVFc1MwRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFRRVUZZTEVOQlFYRkNMRWxCUVhKQ08wRkJRMGdzVDBGV1ZDeEZRVlZYTEdsQ1FVRmhPMEZCUVVFc1dVRkJXQ3hMUVVGWExGTkJRVmdzUzBGQlZ6czdRVUZEV2l4UlFVRkJMRXRCUVVrc1EwRkJReXhMUVVGTUxFTkJRVmNzVTBGQldDeERRVUZ4UWl4SlFVRnlRanM3UVVGRFFTeFJRVUZCTEV0QlFVa3NRMEZCUXl4TFFVRk1MRU5CUVZjc1VVRkJXQ3hEUVVGdlFpeExRVUZ3UWp0QlFVTklMRTlCWWxRN1FVRmxTRHM3TzIxRFFVVmpMRXNzUlVGQlR6dEJRVU5zUWl4WFFVRkxMRXRCUVV3c1EwRkJWeXhqUVVGWUxFTkJRVEJDTEV0QlFURkNPMEZCUTBnN096czJRa0ZGVVR0QlFVRkJMSGxDUVVOM1JDeExRVUZMTEV0QlJEZEVPMEZCUVVFc1ZVRkRSU3hIUVVSR0xHZENRVU5GTEVkQlJFWTdRVUZCUVN4VlFVTlBMRXRCUkZBc1owSkJRMDhzUzBGRVVEdEJRVUZCTEZWQlEyTXNVVUZFWkN4blFrRkRZeXhSUVVSa08wRkJRVUVzVlVGRGQwSXNWMEZFZUVJc1owSkJRM2RDTEZkQlJIaENPMEZCUVVFc1ZVRkRjVU1zVVVGRWNrTXNaMEpCUTNGRExGRkJSSEpETzBGQlFVRXNWVUZESzBNc1MwRkVMME1zWjBKQlF5dERMRXRCUkM5RE96dEJRVWRNTEZWQlFVa3NTMEZCU2l4RlFVRlhPMEZCUTFBc1pVRkJUenRCUVVGTExGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFXWXNWMEZCTkVNc0swSkJRVWtzUzBGQlN5eERRVUZETEU5QlFWWXNRMEZCTlVNc1EwRkJVRHRCUVVOSUxFOUJSa1FzVFVGRlR5eEpRVUZKTEVOQlFVTXNVVUZCVEN4RlFVRmxPMEZCUTJ4Q0xHVkJRVTg3UVVGQlN5eFZRVUZCTEZOQlFWTXNSVUZCUXp0QlFVRm1MRlZCUVZBN1FVRkRTQ3hQUVVaTkxFMUJSVUU3UVVGRFNDeGxRVU5KTEc5Q1FVRkRMR2xDUVVGRU8wRkJRMGtzVlVGQlFTeEpRVUZKTEVWQlFVVXNTMEZFVmp0QlFVVkpMRlZCUVVFc1IwRkJSeXhGUVVGRkxFZEJSbFE3UVVGSFNTeFZRVUZCTEZGQlFWRXNSVUZCUlN4UlFVaGtPMEZCU1Vrc1ZVRkJRU3hqUVVGakxFVkJRVVVzUzBGQlN5eGpRVUZNTEVOQlFXOUNMRWxCUVhCQ0xFTkJRWGxDTEVsQlFYcENMRU5CU25CQ08wRkJTMGtzVlVGQlFTeFhRVUZYTEVWQlFVVTdRVUZNYWtJc1ZVRkVTanRCUVZOSU8wRkJRMG83T3pzN1JVRTVRM2RDTEV0QlFVc3NRMEZCUXl4VE96dGxRV2xFY0VJc1l6czdPenM3T3pzN096czdRVU53UkdZc1NVRkJUU3hYUVVGWExFZEJRVWNzVTBGQlpDeFhRVUZqTzBGQlFVRXNUVUZCUlN4UlFVRkdMRkZCUVVVc1VVRkJSanRCUVVGQkxFMUJRVmtzUjBGQldpeFJRVUZaTEVkQlFWbzdRVUZCUVN4VFFVTm9RaXhwUTBGRFNUdEJRVUZQTEVsQlFVRXNTVUZCU1N4RlFVRkRMRkZCUVZvN1FVRkJjVUlzU1VGQlFTeEpRVUZKTEVWQlFVTXNjVUpCUVRGQ08wRkJRV2RFTEVsQlFVRXNTMEZCU3l4RlFVRkZPMEZCUVhaRUxFbEJSRW9zUlVGRlNUdEJRVUZQTEVsQlFVRXNTVUZCU1N4RlFVRkRMRkZCUVZvN1FVRkJjVUlzU1VGQlFTeEpRVUZKTEVWQlFVTXNNRUpCUVRGQ08wRkJRWEZFTEVsQlFVRXNTMEZCU3l4RlFVRkZMRWxCUVVrc1EwRkJReXhUUVVGTUxFTkJRV1VzVVVGQlpqdEJRVUUxUkN4SlFVWktMRU5CUkdkQ08wRkJRVUVzUTBGQmNFSTdPMlZCVFdVc1Z6czdPenM3T3pzN096czdRVU5PWml4SlFVRk5MRkZCUVZFc1IwRkJSeXhUUVVGWUxGRkJRVmNzVDBGQmMwYzdRVUZCUVN4TlFVRndSeXhMUVVGdlJ5eFJRVUZ3Unl4TFFVRnZSenRCUVVGQkxFMUJRVGRHTEZGQlFUWkdMRkZCUVRkR0xGRkJRVFpHTzBGQlFVRXNUVUZCYmtZc1VVRkJiVVlzVVVGQmJrWXNVVUZCYlVZN1FVRkJRU3hOUVVGNlJTeE5RVUY1UlN4UlFVRjZSU3hOUVVGNVJUdEJRVUZCTEUxQlFXcEZMRmxCUVdsRkxGRkJRV3BGTEZsQlFXbEZPMEZCUVVFc1RVRkJia1FzWTBGQmJVUXNVVUZCYmtRc1kwRkJiVVE3UVVGQlFTeE5RVUZ1UXl4blFrRkJiVU1zVVVGQmJrTXNaMEpCUVcxRE8wRkJRVUVzVFVGQmFrSXNWMEZCYVVJc1VVRkJha0lzVjBGQmFVSTdPMEZCUTI1SUxFMUJRVWtzVVVGQlNpeEZRVUZqTzBGQlExWXNWMEZCVVN4blEwRkRTQ3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEUxQlFXUXNTMEZCZVVJc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCY0VRc1IwRkRSeXhyUTBGQlRUdEJRVUZOTEUxQlFVRXNVMEZCVXl4RlFVRkRPMEZCUVdoQ0xFMUJRVTRzVDBGQkswUXNTMEZCTDBRc1QwRkJjMFU3UVVGQlJ5eE5RVUZCTEVsQlFVa3NSVUZCUXl4SFFVRlNPMEZCUVZrc1RVRkJRU3hUUVVGVExFVkJRVU1zWVVGQmRFSTdRVUZCYjBNc2IwSkJRVmNzWlVGQkwwTTdRVUZCSzBRc1RVRkJRU3hQUVVGUExFVkJRVVU3UVVGQmVFVXNUMEZCTWtZc1YwRkJWeXhEUVVGRExFMUJRWFpITEVOQlFYUkZMRU5CUkVnc1IwRkRjMDBzYTBOQlFVOHNTMEZCVUN4RFFVWnVUU3hGUVVkS0xHZERRVUZMTEZGQlFVd3NRMEZJU1N4RFFVRlNPMEZCUzBnc1IwRk9SQ3hOUVUxUE8wRkJRMGdzVjBGQlVTeG5RMEZEU0N4UlFVRlJMRU5CUVVNc1MwRkJWQ3hMUVVGdFFpeE5RVUZ1UWl4SlFVRTJRaXhSUVVGUkxFTkJRVU1zUzBGQmRFTXNSMEZCT0VNc2IwTkJRVk1zVjBGQlZ5eERRVUZETEV0QlFYSkNMRTlCUVRsRExFZEJRWFZHTEVWQlJIQkdMRVZCUlVnc1VVRkJVU3hEUVVGRExFOUJRVlFzUzBGQmNVSXNUVUZCY2tJc1NVRkJLMElzVVVGQlVTeERRVUZETEU5QlFYaERMRWRCUVd0RUxHOURRVUZUTEZkQlFWY3NRMEZCUXl4UFFVRnlRaXhQUVVGc1JDeEhRVUUyUml4RlFVWXhSaXhGUVVkS0xHdERRVUZQTEV0QlFWQXNRMEZJU1N4RlFVbElMRU5CUVVNc1VVRkJVU3hEUVVGRExFdEJRVllzU1VGQmIwSXNVVUZCVVN4RFFVRkRMRTlCUVZRc1MwRkJjVUlzVFVGQmVrTXNTVUZCYjBRc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCTDBVc1IwRkRSenRCUVVGSExFMUJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4TlFVRkJMRk5CUVZNc1JVRkJReXhoUVVGMFFqdEJRVUZ2UXl4dlFrRkJWeXhQUVVFdlF6dEJRVUYxUkN4TlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVGb1JTeFBRVUVyUlN4WFFVRlhMRU5CUVVNc1MwRkJNMFlzUTBGRVNDeEhRVU15Unl4RlFVeDRSeXhGUVUxSUxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFWWXNTVUZCYzBJc1VVRkJVU3hEUVVGRExFdEJRVlFzUzBGQmJVSXNUVUZCZWtNc1NVRkJiMFFzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJMMFVzUjBGRFJ6dEJRVUZITEUxQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hOUVVGQkxGTkJRVk1zUlVGQlF5eGhRVUYwUWp0QlFVRnZReXh2UWtGQlZ5eFRRVUV2UXp0QlFVRjVSQ3hOUVVGQkxFOUJRVThzUlVGQlJUdEJRVUZzUlN4UFFVRnRSaXhYUVVGWExFTkJRVU1zVDBGQkwwWXNRMEZFU0N4SFFVTnBTQ3hGUVZBNVJ5eERRVUZTTzBGQlUwZzdRVUZEU2l4RFFXeENSRHM3WlVGdlFtVXNVVHM3T3pzN096czdPenM3UVVOd1FtWTdPMEZCUTBFN08wRkJRMEU3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN096dEpRVVZOTEZFN096czdPMEZCUTBZc2IwSkJRVmtzUzBGQldpeEZRVUZ0UWp0QlFVRkJPenRCUVVGQk96dEJRVU5tTEd0R1FVRk5MRXRCUVU0N1FVRkRRU3hWUVVGTExFdEJRVXdzUjBGQllUdEJRVU5VTEUxQlFVRXNhMEpCUVd0Q0xFVkJRVVVzUzBGRVdEdEJRVVZVTEUxQlFVRXNSMEZCUnl4RlFVRkZMRVZCUmtrN1FVRkhWQ3hOUVVGQkxGRkJRVkVzUlVGQlJTeExRVWhFTzBGQlNWUXNUVUZCUVN4TFFVRkxMRVZCUVVVc1NVRktSVHRCUVV0VUxFMUJRVUVzUzBGQlN5eEZRVUZGTEVWQlRFVTdRVUZOVkN4TlFVRkJMRkZCUVZFc1JVRkJSVHRCUVVOT0xGRkJRVUVzWVVGQllTeEZRVUZGTEVsQlJGUTdRVUZGVGl4UlFVRkJMRXRCUVVzc1JVRkJSU3hGUVVaRU8wRkJSMDRzVVVGQlFTeFBRVUZQTEVWQlFVVTdRVUZJU0R0QlFVNUVMRXRCUVdJN1FVRkdaVHRCUVdOc1FqczdPenQzUTBGRmJVSTdRVUZEYUVJc1YwRkJTeXhYUVVGTU8wRkJRMGc3T3p0clEwRkZZVHRCUVVOV0xGVkJRVWtzVDBGQlR5eGhRVUZoTEVOQlFVTXNUMEZCY2tJc1MwRkJhVU1zVjBGQmNrTXNSVUZCYTBRN1FVRkRPVU1zV1VGQlRTeFBRVUZQTEVkQlFVY3NZVUZCWVN4RFFVRkRMRTlCUVRsQ08wRkJRMEVzWVVGQlN5eFJRVUZNTEVOQlFXTTdRVUZEVml4VlFVRkJMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUjBGQlVpeEhRVUZqTEU5QlFVOHNRMEZCUXl4SFFVRjBRaXhIUVVFMFFpeEZRVVIyUWp0QlFVVldMRlZCUVVFc1VVRkJVU3hGUVVGRkxFOUJRVThzUTBGQlF5eFJRVUZTTEVkQlFXMUNMRWxCUVVrc1EwRkJReXhMUVVGTUxFTkJRVmNzVDBGQlR5eERRVUZETEZGQlFXNUNMRU5CUVc1Q0xFZEJRV3RFTzBGQlEzaEVMRmxCUVVFc1lVRkJZU3hGUVVGRkxFbEJSSGxETzBGQlJYaEVMRmxCUVVFc1MwRkJTeXhGUVVGRkxFVkJSbWxFTzBGQlIzaEVMRmxCUVVFc1QwRkJUeXhGUVVGRk8wRkJTQ3RETEZkQlJteEVPMEZCVDFZc1ZVRkJRU3hyUWtGQmEwSXNSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRE8wRkJVSEJDTEZOQlFXUTdRVUZUU0R0QlFVTktPenM3T0VKQlJWTXNTeXhGUVVGUE8wRkJRMklzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMRWRCUVVjc1JVRkJSU3hMUVVGTExFTkJRVU1zVFVGQlRpeERRVUZoTzBGQlFXNUNMRTlCUVdRN1FVRkRTRHM3TzJsRFFVVlpMRXNzUlVGQlR6dEJRVU5vUWl4TlFVRkJMRXRCUVVzc1EwRkJReXhqUVVGT08wRkJRMEVzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMR3RDUVVGclFpeEZRVUZGTzBGQlFYSkNMRTlCUVdRN1FVRkRTRHM3TzJsRFFVVlpMRXNzUlVGQlR6dEJRVU5vUWl4TlFVRkJMRXRCUVVzc1EwRkJReXhqUVVGT08wRkJRMEVzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMR3RDUVVGclFpeEZRVUZGTEV0QlFYSkNPMEZCUVRSQ0xGRkJRVUVzUjBGQlJ5eEZRVUZGTEVWQlFXcERPMEZCUVhGRExGRkJRVUVzVVVGQlVTeEZRVUZGTzBGQlFVTXNWVUZCUVN4aFFVRmhMRVZCUVVVc1NVRkJhRUk3UVVGQmMwSXNWVUZCUVN4TFFVRkxMRVZCUVVVc1JVRkJOMEk3UVVGQmFVTXNWVUZCUVN4UFFVRlBMRVZCUVVVN1FVRkJNVU03UVVGQkwwTXNUMEZCWkR0QlFVTklPenM3YlVOQlJXTXNTeXhGUVVGUE8wRkJRMnhDTEZWQlFVMHNUVUZCVFN4SFFVRkhMRTFCUVUwc1EwRkJReXhOUVVGUUxFTkJRV01zUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZCZWtJc1JVRkJiVU1zUzBGQmJrTXNRMEZCWmp0QlFVTkJMRmRCUVVzc1VVRkJUQ3hEUVVGak8wRkJRVU1zVVVGQlFTeFJRVUZSTEVWQlFVVTdRVUZCV0N4UFFVRmtPMEZCUTBnN096czJRa0ZGVVN4TExFVkJRVTg3UVVGRFdpeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc1MwRkJTeXhGUVVGTU8wRkJRVVFzVDBGQlpEdEJRVU5JT3pzN09FSkJSVk1zU3l4RlFVRlBPMEZCUTJJc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEZGQlFWRXNSVUZCUlR0QlFVRllMRTlCUVdRN1FVRkRTRHM3T3paQ1FVVlJMRXNzUlVGQlR6dEJRVU5hTEZkQlFVc3NVVUZCVEN4RFFVRmpPMEZCUVVNc1VVRkJRU3hMUVVGTExFVkJRVVU3UVVGQlVpeFBRVUZrTzBGQlEwZzdPenMyUWtGRlVUdEJRVUZCTEZWQlEwVXNWMEZFUml4SFFVTnBRaXhMUVVGTExFdEJSSFJDTEVOQlEwVXNWMEZFUmp0QlFVRkJMSGRDUVVWeFJDeExRVUZMTEV0QlJqRkVPMEZCUVVFc1ZVRkZSU3hyUWtGR1JpeGxRVVZGTEd0Q1FVWkdPMEZCUVVFc1ZVRkZjMElzUjBGR2RFSXNaVUZGYzBJc1IwRkdkRUk3UVVGQlFTeFZRVVV5UWl4TFFVWXpRaXhsUVVVeVFpeExRVVl6UWp0QlFVRkJMRlZCUld0RExGRkJSbXhETEdWQlJXdERMRkZCUm14RE8wRkJRVUVzVlVGRk5FTXNTMEZHTlVNc1pVRkZORU1zUzBGR05VTTdRVUZCUVN4cFEwRkhiVU1zUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZJT1VNN1FVRkJRU3hWUVVkRkxHRkJTRVlzZDBKQlIwVXNZVUZJUmp0QlFVRkJMRlZCUjJsQ0xFdEJTR3BDTEhkQ1FVZHBRaXhMUVVocVFqdEJRVUZCTEZWQlIzZENMRTlCU0hoQ0xIZENRVWQzUWl4UFFVaDRRanM3UVVGTFRDeFZRVUZKTEVkQlFVY3NTVUZCU1N4aFFVRmhMRXRCUVVzc1NVRkJla0lzU1VGQmFVTXNTMEZCYWtNc1NVRkJNRU1zVDBGQk9VTXNSVUZCZFVRN1FVRkRia1FzWlVGRFNTeHBRMEZEU1N4dlFrRkJReXhuUWtGQlJDeGxRVUZoTEV0QlFVc3NTMEZCYkVJN1FVRkRVeXhWUVVGQkxGZEJRVmNzUlVGQlJUdEJRVVIwUWl4WFFVUktMRVZCU1Vrc2IwSkJRVU1zYjBKQlFVUXNSVUZCYVVJc1MwRkJTeXhMUVVGMFFpeERRVXBLTEVWQlMwa3NLMEpCUVVjN1FVRkJSeXhWUVVGQkxFbEJRVWtzUlVGQlF5eEhRVUZTTzBGQlFWa3NWVUZCUVN4UFFVRlBMRVZCUVVVc1MwRkJTeXhaUVVGTUxFTkJRV3RDTEVsQlFXeENMRU5CUVhWQ0xFbEJRWFpDTEVOQlFYSkNPMEZCUTBjc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGRVlpeFhRVU4xUWl4WFFVRlhMRU5CUVVNc1lVRkVia01zUTBGQlNDeERRVXhLTEVOQlJFbzdRVUZWU0N4UFFWaEVMRTFCVjA4c1NVRkJTU3hyUWtGQlNpeEZRVUYzUWp0QlFVTXpRaXhsUVVOSkxHbERRVU5KTEc5Q1FVRkRMSFZDUVVGRU8wRkJRMGtzVlVGQlFTeEhRVUZITEVWQlFVVXNSMEZFVkR0QlFVVkpMRlZCUVVFc1MwRkJTeXhGUVVGRkxFdEJSbGc3UVVGSFNTeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRkZCUVV3c1EwRkJZeXhKUVVGa0xFTkJRVzFDTEVsQlFXNUNMRU5CU0dRN1FVRkpTU3hWUVVGQkxGRkJRVkVzUlVGQlJTeFJRVXBrTzBGQlMwa3NWVUZCUVN4VFFVRlRMRVZCUVVVc1MwRkJTeXhUUVVGTUxFTkJRV1VzU1VGQlppeERRVUZ2UWl4SlFVRndRaXhEUVV4bU8wRkJUVWtzVlVGQlFTeExRVUZMTEVWQlFVVXNTMEZPV0R0QlFVOUpMRlZCUVVFc1VVRkJVU3hGUVVGRkxFdEJRVXNzVVVGQlRDeERRVUZqTEVsQlFXUXNRMEZCYlVJc1NVRkJia0lzUTBGUVpEdEJRVkZKTEZWQlFVRXNVVUZCVVN4RlFVRkZMRXRCUVVzc1MwRkJUQ3hEUVVGWExGRkJVbnBDTzBGQlUwa3NWVUZCUVN4alFVRmpMRVZCUVVVc1MwRkJTeXhqUVVGTUxFTkJRVzlDTEVsQlFYQkNMRU5CUVhsQ0xFbEJRWHBDTEVOQlZIQkNPMEZCVlVrc1ZVRkJRU3hYUVVGWExFVkJRVVU3UVVGV2FrSXNWVUZFU2l4RlFXRkpMRzlDUVVGRExHOUNRVUZFTEVWQlFXbENMRXRCUVVzc1MwRkJkRUlzUTBGaVNpeEZRV05KTEN0Q1FVRkhPMEZCUVVjc1ZVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEZWQlFVRXNUMEZCVHl4RlFVRkZMRXRCUVVzc1dVRkJUQ3hEUVVGclFpeEpRVUZzUWl4RFFVRjFRaXhKUVVGMlFpeERRVUZ5UWp0QlFVTkhMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJSR0lzVjBGRGRVSXNWMEZCVnl4RFFVRkRMR0ZCUkc1RExFTkJRVWdzUTBGa1NpeERRVVJLTzBGQmJVSklMRTlCY0VKTkxFMUJiMEpCTzBGQlEwZ3NaVUZEU1R0QlFVRkxMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV1lzVjBGRFNUdEJRVUZOTEZWQlFVRXNVVUZCVVN4RlFVRkZMRXRCUVVzc1dVRkJUQ3hEUVVGclFpeEpRVUZzUWl4RFFVRjFRaXhKUVVGMlFqdEJRVUZvUWl4WFFVTkpMQ3RDUVVOSkxHMURRVU5KTERoRFFVUktMRU5CUkVvc1JVRkpTU3dyUWtGS1NpeEZRVXRKTEN0Q1FVRkpMRmRCUVZjc1EwRkJReXhaUVVGb1FpeERRVXhLTEVOQlJFb3NSVUZSU1R0QlFVRlBMRlZCUVVFc1NVRkJTU3hGUVVGRExFMUJRVm83UVVGQmJVSXNWVUZCUVN4VFFVRlRMRVZCUVVNc1YwRkJOMEk3UVVGQmVVTXNWVUZCUVN4TFFVRkxMRVZCUVVVc1IwRkJhRVE3UVVGQmNVUXNWVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkJTeXhUUVVGTUxFTkJRV1VzU1VGQlppeERRVUZ2UWl4SlFVRndRanRCUVVFdlJDeFZRVkpLTEVWQlUwa3NLMEpCUVVjN1FVRkJUeXhWUVVGQkxFbEJRVWtzUlVGQlF5eFJRVUZhTzBGQlFYRkNMRlZCUVVFc1UwRkJVeXhGUVVGRExIVkNRVUV2UWp0QlFVRjFSQ3hWUVVGQkxFdEJRVXNzUlVGQlJTeFhRVUZYTEVOQlFVTTdRVUZCTVVVc1ZVRkJTQ3hEUVZSS0xFTkJSRW9zUlVGWlNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CV2tvc1EwRkVTanRCUVdkQ1NEdEJRVU5LT3pzN08wVkJla2hyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUUwU0dRc1VUczdPenM3T3pzN096czdRVU5vU1dZc1NVRkJUU3hQUVVGUExFZEJRVWNzVTBGQlZpeFBRVUZWTzBGQlFVRXNUVUZCUlN4SFFVRkdMRkZCUVVVc1IwRkJSanRCUVVGQkxFMUJRVThzVVVGQlVDeFJRVUZQTEZGQlFWQTdRVUZCUVN4TlFVRnBRaXhYUVVGcVFpeFJRVUZwUWl4WFFVRnFRanRCUVVGQkxGTkJRMW9zYVVOQlEwa3NLMEpCUTBrc09FTkJSRW9zUlVGRE5FSXNLMEpCUkRWQ0xFVkJSVWs3UVVGQlJ5eEpRVUZCTEVsQlFVa3NSVUZCUlN4SFFVRlVPMEZCUVdNc1NVRkJRU3hOUVVGTkxFVkJRVU03UVVGQmNrSXNTMEZCSzBJc1IwRkJMMElzUTBGR1NpeERRVVJLTEVWQlMwa3NLMEpCUTBrc2IwTkJRVk1zVjBGQlZ5eERRVUZETEV0QlFYSkNMRU5CUkVvc1JVRkRkME1zSzBKQlJIaERMRVZCUlVzc1VVRkJVU3hEUVVGRExFdEJRVlFzUTBGQlpTeFBRVUZtTEVOQlFYVkNMRWRCUVhaQ0xFVkJRVFJDTEUxQlFUVkNMRU5CUmt3c1EwRk1TaXhGUVZOSkxDdENRVU5KTEc5RFFVRlRMRmRCUVZjc1EwRkJReXhQUVVGeVFpeERRVVJLTEVWQlF6QkRMQ3RDUVVReFF5eEZRVVZMTEZGQlFWRXNRMEZCUXl4UFFVRlVMRU5CUVdsQ0xFOUJRV3BDTEVOQlFYbENMRWRCUVhwQ0xFVkJRVGhDTEUxQlFUbENMRU5CUmt3c1EwRlVTaXhEUVVSWk8wRkJRVUVzUTBGQmFFSTdPMlZCWjBKbExFODdPenM3T3p0QlEyaENaanM3T3p0QlFVVkJMRWxCUVUwc2IwSkJRVzlDTEVkQlFVY3NkMEpCUVRkQ08wRkJRMEVzU1VGQlRTeFZRVUZWTEVkQlFVY3NVVUZCVVN4RFFVRkRMR05CUVZRc1EwRkJkMElzYjBKQlFYaENMRU5CUVc1Q08zRkNRVU56UWl4aE8wbEJRV1lzVnl4clFrRkJRU3hYTzBGQlJWQXNVVUZCVVN4RFFVRkRMRTFCUVZRc1EwRkRTU3h2UWtGQlF5eHBRa0ZCUkR0QlFVRlZMRVZCUVVFc1YwRkJWeXhGUVVGRk8wRkJRWFpDTEVWQlJFb3NSVUZGU1N4VlFVWktPenM3T3pzN096czdPMEZEVGtFc1UwRkJVeXhWUVVGVUxFTkJRVzlDTEVkQlFYQkNMRVZCUVhsQ08wRkJRM0pDTEZOQlFVOHNTMEZCU3l4RFFVRkRMRWRCUVVRc1EwRkJUQ3hEUVVOR0xFbEJSRVVzUTBGRFJ5eFZRVUZCTEVkQlFVYzdRVUZCUVN4WFFVRkpMRWRCUVVjc1EwRkJReXhKUVVGS0xFVkJRVW83UVVGQlFTeEhRVVJPTEVWQlJVWXNTVUZHUlN4RFFVZERMRlZCUVVNc1RVRkJSRHRCUVVGQkxGZEJRV0U3UVVGQlF5eE5RVUZCTEUxQlFVMHNSVUZCVGp0QlFVRkVMRXRCUVdJN1FVRkJRU3hIUVVoRUxFVkJTVU1zVlVGQlF5eExRVUZFTzBGQlFVRXNWMEZCV1R0QlFVRkRMRTFCUVVFc1MwRkJTeXhGUVVGTU8wRkJRVVFzUzBGQldqdEJRVUZCTEVkQlNrUXNRMEZCVUR0QlFVMUlPenRsUVVWakxGVWlMQ0ptYVd4bElqb2laMlZ1WlhKaGRHVmtMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSWlobWRXNWpkR2x2YmlncGUyWjFibU4wYVc5dUlISW9aU3h1TEhRcGUyWjFibU4wYVc5dUlHOG9hU3htS1h0cFppZ2hibHRwWFNsN2FXWW9JV1ZiYVYwcGUzWmhjaUJqUFZ3aVpuVnVZM1JwYjI1Y0lqMDlkSGx3Wlc5bUlISmxjWFZwY21VbUpuSmxjWFZwY21VN2FXWW9JV1ltSm1NcGNtVjBkWEp1SUdNb2FTd2hNQ2s3YVdZb2RTbHlaWFIxY200Z2RTaHBMQ0V3S1R0MllYSWdZVDF1WlhjZ1JYSnliM0lvWENKRFlXNXViM1FnWm1sdVpDQnRiMlIxYkdVZ0oxd2lLMmtyWENJblhDSXBPM1JvY205M0lHRXVZMjlrWlQxY0lrMVBSRlZNUlY5T1QxUmZSazlWVGtSY0lpeGhmWFpoY2lCd1BXNWJhVjA5ZTJWNGNHOXlkSE02ZTMxOU8yVmJhVjFiTUYwdVkyRnNiQ2h3TG1WNGNHOXlkSE1zWm5WdVkzUnBiMjRvY2lsN2RtRnlJRzQ5WlZ0cFhWc3hYVnR5WFR0eVpYUjFjbTRnYnlodWZIeHlLWDBzY0N4d0xtVjRjRzl5ZEhNc2NpeGxMRzRzZENsOWNtVjBkWEp1SUc1YmFWMHVaWGh3YjNKMGMzMW1iM0lvZG1GeUlIVTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaU3hwUFRBN2FUeDBMbXhsYm1kMGFEdHBLeXNwYnloMFcybGRLVHR5WlhSMWNtNGdiMzF5WlhSMWNtNGdjbjBwS0NraUxDSW9ablZ1WTNScGIyNGdLSEp2YjNRc0lHWmhZM1J2Y25rcGUxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNWNiaUFnTHlwcGMzUmhibUoxYkNCcFoyNXZjbVVnYm1WNGREcGpZVzUwSUhSbGMzUXFMMXh1SUNCcFppQW9kSGx3Wlc5bUlHMXZaSFZzWlNBOVBUMGdKMjlpYW1WamRDY2dKaVlnZEhsd1pXOW1JRzF2WkhWc1pTNWxlSEJ2Y25SeklEMDlQU0FuYjJKcVpXTjBKeWtnZTF4dUlDQWdJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdabUZqZEc5eWVTZ3BPMXh1SUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCa1pXWnBibVVnUFQwOUlDZG1kVzVqZEdsdmJpY2dKaVlnWkdWbWFXNWxMbUZ0WkNrZ2UxeHVJQ0FnSUM4dklFRk5SQzRnVW1WbmFYTjBaWElnWVhNZ1lXNGdZVzV2Ym5sdGIzVnpJRzF2WkhWc1pTNWNiaUFnSUNCa1pXWnBibVVvVzEwc0lHWmhZM1J2Y25rcE8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDOHZJRUp5YjNkelpYSWdaMnh2WW1Gc2MxeHVJQ0FnSUhKdmIzUXViMkpxWldOMFVHRjBhQ0E5SUdaaFkzUnZjbmtvS1R0Y2JpQWdmVnh1ZlNrb2RHaHBjeXdnWm5WdVkzUnBiMjRvS1h0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dVhHNGdJSFpoY2lCMGIxTjBjaUE5SUU5aWFtVmpkQzV3Y205MGIzUjVjR1V1ZEc5VGRISnBibWM3WEc0Z0lHWjFibU4wYVc5dUlHaGhjMDkzYmxCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUdsbUtHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJWY2JpQWdJQ0I5WEc0Z0lDQWdMeTkwYnlCb1lXNWtiR1VnYjJKcVpXTjBjeUIzYVhSb0lHNTFiR3dnY0hKdmRHOTBlWEJsY3lBb2RHOXZJR1ZrWjJVZ1kyRnpaVDhwWEc0Z0lDQWdjbVYwZFhKdUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWFHRnpUM2R1VUhKdmNHVnlkSGt1WTJGc2JDaHZZbW9zSUhCeWIzQXBYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJwYzBWdGNIUjVLSFpoYkhWbEtYdGNiaUFnSUNCcFppQW9JWFpoYkhWbEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLR2x6UVhKeVlYa29kbUZzZFdVcElDWW1JSFpoYkhWbExteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpUdGNiaUFnSUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCMllXeDFaU0FoUFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0JwYmlCMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0doaGMwOTNibEJ5YjNCbGNuUjVLSFpoYkhWbExDQnBLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnZEc5VGRISnBibWNvZEhsd1pTbDdYRzRnSUNBZ2NtVjBkWEp1SUhSdlUzUnlMbU5oYkd3b2RIbHdaU2s3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCcGMwOWlhbVZqZENodlltb3BlMXh1SUNBZ0lISmxkSFZ5YmlCMGVYQmxiMllnYjJKcUlEMDlQU0FuYjJKcVpXTjBKeUFtSmlCMGIxTjBjbWx1Wnlodlltb3BJRDA5UFNCY0lsdHZZbXBsWTNRZ1QySnFaV04wWFZ3aU8xeHVJQ0I5WEc1Y2JpQWdkbUZ5SUdselFYSnlZWGtnUFNCQmNuSmhlUzVwYzBGeWNtRjVJSHg4SUdaMWJtTjBhVzl1S0c5aWFpbDdYRzRnSUNBZ0x5cHBjM1JoYm1KMWJDQnBaMjV2Y21VZ2JtVjRkRHBqWVc1MElIUmxjM1FxTDF4dUlDQWdJSEpsZEhWeWJpQjBiMU4wY2k1allXeHNLRzlpYWlrZ1BUMDlJQ2RiYjJKcVpXTjBJRUZ5Y21GNVhTYzdYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJwYzBKdmIyeGxZVzRvYjJKcUtYdGNiaUFnSUNCeVpYUjFjbTRnZEhsd1pXOW1JRzlpYWlBOVBUMGdKMkp2YjJ4bFlXNG5JSHg4SUhSdlUzUnlhVzVuS0c5aWFpa2dQVDA5SUNkYmIySnFaV04wSUVKdmIyeGxZVzVkSnp0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHZGxkRXRsZVNoclpYa3BlMXh1SUNBZ0lIWmhjaUJwYm5STFpYa2dQU0J3WVhKelpVbHVkQ2hyWlhrcE8xeHVJQ0FnSUdsbUlDaHBiblJMWlhrdWRHOVRkSEpwYm1jb0tTQTlQVDBnYTJWNUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2FXNTBTMlY1TzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2EyVjVPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWm1GamRHOXllU2h2Y0hScGIyNXpLU0I3WEc0Z0lDQWdiM0IwYVc5dWN5QTlJRzl3ZEdsdmJuTWdmSHdnZTMxY2JseHVJQ0FnSUhaaGNpQnZZbXBsWTNSUVlYUm9JRDBnWm5WdVkzUnBiMjRvYjJKcUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1QySnFaV04wTG10bGVYTW9iMkpxWldOMFVHRjBhQ2t1Y21Wa2RXTmxLR1oxYm1OMGFXOXVLSEJ5YjNoNUxDQndjbTl3S1NCN1hHNGdJQ0FnSUNBZ0lHbG1LSEJ5YjNBZ1BUMDlJQ2RqY21WaGRHVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhCeWIzaDVPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0x5cHBjM1JoYm1KMWJDQnBaMjV2Y21VZ1pXeHpaU292WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2IySnFaV04wVUdGMGFGdHdjbTl3WFNBOVBUMGdKMloxYm1OMGFXOXVKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lIQnliM2g1VzNCeWIzQmRJRDBnYjJKcVpXTjBVR0YwYUZ0d2NtOXdYUzVpYVc1a0tHOWlhbVZqZEZCaGRHZ3NJRzlpYWlrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2ZUhrN1hHNGdJQ0FnSUNCOUxDQjdmU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJR1oxYm1OMGFXOXVJR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUFvYjNCMGFXOXVjeTVwYm1Oc2RXUmxTVzVvWlhKcGRHVmtVSEp2Y0hNZ2ZId2dLSFI1Y0dWdlppQndjbTl3SUQwOVBTQW5iblZ0WW1WeUp5QW1KaUJCY25KaGVTNXBjMEZ5Y21GNUtHOWlhaWtwSUh4OElHaGhjMDkzYmxCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrcFhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnWjJWMFUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltcGJjSEp2Y0YwN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJWMEtHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2w3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhCaGRHZ2dQVDA5SUNkdWRXMWlaWEluS1NCN1hHNGdJQ0FnSUNBZ0lIQmhkR2dnUFNCYmNHRjBhRjA3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmlBb0lYQmhkR2dnZkh3Z2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhanRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhObGRDaHZZbW9zSUhCaGRHZ3VjM0JzYVhRb0p5NG5LUzV0WVhBb1oyVjBTMlY1S1N3Z2RtRnNkV1VzSUdSdlRtOTBVbVZ3YkdGalpTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRkJoZEdnZ1BTQndZWFJvV3pCZE8xeHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUldZV3gxWlNBOUlHZGxkRk5vWVd4c2IzZFFjbTl3WlhKMGVTaHZZbW9zSUdOMWNuSmxiblJRWVhSb0tUdGNiaUFnSUNBZ0lHbG1JQ2h3WVhSb0xteGxibWQwYUNBOVBUMGdNU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9ZM1Z5Y21WdWRGWmhiSFZsSUQwOVBTQjJiMmxrSURBZ2ZId2dJV1J2VG05MFVtVndiR0ZqWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWx0amRYSnlaVzUwVUdGMGFGMGdQU0IyWVd4MVpUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZM1Z5Y21WdWRGWmhiSFZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9ZM1Z5Y21WdWRGWmhiSFZsSUQwOVBTQjJiMmxrSURBcElIdGNiaUFnSUNBZ0lDQWdMeTlqYUdWamF5QnBaaUIzWlNCaGMzTjFiV1VnWVc0Z1lYSnlZWGxjYmlBZ0lDQWdJQ0FnYVdZb2RIbHdaVzltSUhCaGRHaGJNVjBnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcVcyTjFjbkpsYm5SUVlYUm9YU0E5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWx0amRYSnlaVzUwVUdGMGFGMGdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWx0amRYSnlaVzUwVUdGMGFGMHNJSEJoZEdndWMyeHBZMlVvTVNrc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VhR0Z6SUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDa2dlMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYm5WdFltVnlKeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnVzNCaGRHaGRPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJSEJoZEdndWMzQnNhWFFvSnk0bktUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0NGd1lYUm9JSHg4SUhCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBaElXOWlhanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCd1lYUm9MbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJxSUQwZ1oyVjBTMlY1S0hCaGRHaGJhVjBwTzF4dVhHNGdJQ0FnSUNBZ0lHbG1LQ2gwZVhCbGIyWWdhaUE5UFQwZ0oyNTFiV0psY2ljZ0ppWWdhWE5CY25KaGVTaHZZbW9wSUNZbUlHb2dQQ0J2WW1vdWJHVnVaM1JvS1NCOGZGeHVJQ0FnSUNBZ0lDQWdJQ2h2Y0hScGIyNXpMbWx1WTJ4MVpHVkpibWhsY21sMFpXUlFjbTl3Y3lBL0lDaHFJR2x1SUU5aWFtVmpkQ2h2WW1vcEtTQTZJR2hoYzA5M2JsQnliM0JsY25SNUtHOWlhaXdnYWlrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcUlEMGdiMkpxVzJwZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVsYm5OMWNtVkZlR2x6ZEhNZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTbDdYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJSFJ5ZFdVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ0E5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBlMXh1SUNBZ0lDQWdjbVYwZFhKdUlITmxkQ2h2WW1vc0lIQmhkR2dzSUhaaGJIVmxMQ0JrYjA1dmRGSmxjR3hoWTJVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtbHVjMlZ5ZENBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ3NJSFpoYkhWbExDQmhkQ2w3WEc0Z0lDQWdJQ0IyWVhJZ1lYSnlJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9LVHRjYmlBZ0lDQWdJR0YwSUQwZ2ZuNWhkRHRjYmlBZ0lDQWdJR2xtSUNnaGFYTkJjbkpoZVNoaGNuSXBLU0I3WEc0Z0lDQWdJQ0FnSUdGeWNpQTlJRnRkTzF4dUlDQWdJQ0FnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ2h2WW1vc0lIQmhkR2dzSUdGeWNpazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQmhjbkl1YzNCc2FXTmxLR0YwTENBd0xDQjJZV3gxWlNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndVpXMXdkSGtnUFNCbWRXNWpkR2x2Ymlodlltb3NJSEJoZEdncElIdGNiaUFnSUNBZ0lHbG1JQ2hwYzBWdGNIUjVLSEJoZEdncEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjJiMmxrSURBN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhadmFXUWdNRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsTENCcE8xeHVJQ0FnSUNBZ2FXWWdLQ0VvZG1Gc2RXVWdQU0J2WW1wbFkzUlFZWFJvTG1kbGRDaHZZbW9zSUhCaGRHZ3BLU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZG05cFpDQXdPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhaaGJIVmxJRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENBbkp5azdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2x6UW05dmJHVmhiaWgyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBlWEJsYjJZZ2RtRnNkV1VnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lEQXBPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzBGeWNtRjVLSFpoYkhWbEtTa2dlMXh1SUNBZ0lDQWdJQ0IyWVd4MVpTNXNaVzVuZEdnZ1BTQXdPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzA5aWFtVmpkQ2gyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnWm05eUlDaHBJR2x1SUhaaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2gyWVd4MVpTd2dhU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsYkdWMFpTQjJZV3gxWlZ0cFhUdGNiaUFnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJRzUxYkd3cE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xuQjFjMmdnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb0lDOHFMQ0IyWVd4MVpYTWdLaThwZTF4dUlDQWdJQ0FnZG1GeUlHRnljaUE5SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQ2s3WEc0Z0lDQWdJQ0JwWmlBb0lXbHpRWEp5WVhrb1lYSnlLU2tnZTF4dUlDQWdJQ0FnSUNCaGNuSWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENCaGNuSXBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JoY25JdWNIVnphQzVoY0hCc2VTaGhjbklzSUVGeWNtRjVMbkJ5YjNSdmRIbHdaUzV6YkdsalpTNWpZV3hzS0dGeVozVnRaVzUwY3l3Z01pa3BPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQnZZbXBsWTNSUVlYUm9MbU52WVd4bGMyTmxJRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUhNc0lHUmxabUYxYkhSV1lXeDFaU2tnZTF4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsTzF4dVhHNGdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNQ3dnYkdWdUlEMGdjR0YwYUhNdWJHVnVaM1JvT3lCcElEd2diR1Z1T3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tDaDJZV3gxWlNBOUlHOWlhbVZqZEZCaGRHZ3VaMlYwS0c5aWFpd2djR0YwYUhOYmFWMHBLU0FoUFQwZ2RtOXBaQ0F3S1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCa1pXWmhkV3gwVm1Gc2RXVTdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VaMlYwSUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDd2daR1ZtWVhWc2RGWmhiSFZsS1h0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdjR0YwYUNBOUlGdHdZWFJvWFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDZ2hjR0YwYUNCOGZDQndZWFJvTG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJrWldaaGRXeDBWbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbWRsZENodlltb3NJSEJoZEdndWMzQnNhWFFvSnk0bktTd2daR1ZtWVhWc2RGWmhiSFZsS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlFZWFJvSUQwZ1oyVjBTMlY1S0hCaGRHaGJNRjBwTzF4dUlDQWdJQ0FnZG1GeUlHNWxlSFJQWW1vZ1BTQm5aWFJUYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCamRYSnlaVzUwVUdGMGFDbGNiaUFnSUNBZ0lHbG1JQ2h1WlhoMFQySnFJRDA5UFNCMmIybGtJREFwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptRjFiSFJXWVd4MVpUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdVpYaDBUMkpxTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxVzJOMWNuSmxiblJRWVhSb1hTd2djR0YwYUM1emJHbGpaU2d4S1N3Z1pHVm1ZWFZzZEZaaGJIVmxLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVrWld3Z1BTQm1kVzVqZEdsdmJpQmtaV3dvYjJKcUxDQndZWFJvS1NCN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQmJjR0YwYUYwN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2h2WW1vZ1BUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2FYTkZiWEIwZVNod1lYUm9LU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbVJsYkNodlltb3NJSEJoZEdndWMzQnNhWFFvSnk0bktTazdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwVUdGMGFDQTlJR2RsZEV0bGVTaHdZWFJvV3pCZEtUdGNiaUFnSUNBZ0lHbG1JQ2doYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2dZM1Z5Y21WdWRGQmhkR2dwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hwYzBGeWNtRjVLRzlpYWlrcElIdGNiaUFnSUNBZ0lDQWdJQ0J2WW1vdWMzQnNhV05sS0dOMWNuSmxiblJRWVhSb0xDQXhLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCa1pXeGxkR1VnYjJKcVcyTjFjbkpsYm5SUVlYUm9YVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WkdWc0tHOWlhbHRqZFhKeVpXNTBVR0YwYUYwc0lIQmhkR2d1YzJ4cFkyVW9NU2twTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTzF4dUlDQjlYRzVjYmlBZ2RtRnlJRzF2WkNBOUlHWmhZM1J2Y25rb0tUdGNiaUFnYlc5a0xtTnlaV0YwWlNBOUlHWmhZM1J2Y25rN1hHNGdJRzF2WkM1M2FYUm9TVzVvWlhKcGRHVmtVSEp2Y0hNZ1BTQm1ZV04wYjNKNUtIdHBibU5zZFdSbFNXNW9aWEpwZEdWa1VISnZjSE02SUhSeWRXVjlLVnh1SUNCeVpYUjFjbTRnYlc5a08xeHVmU2s3WEc0aUxDSW5kWE5sSUhOMGNtbGpkQ2RjYmx4dVkyOXVjM1FnZTJselQySnFaV04wTENCblpYUkxaWGx6ZlNBOUlISmxjWFZwY21Vb0p5NHZiR0Z1WnljcFhHNWNiaTh2SUZCU1NWWkJWRVVnVUZKUFVFVlNWRWxGVTF4dVkyOXVjM1FnUWxsUVFWTlRYMDFQUkVVZ1BTQW5YMTlpZVhCaGMzTk5iMlJsSjF4dVkyOXVjM1FnU1VkT1QxSkZYME5KVWtOVlRFRlNJRDBnSjE5ZmFXZHViM0psUTJseVkzVnNZWEluWEc1amIyNXpkQ0JOUVZoZlJFVkZVQ0E5SUNkZlgyMWhlRVJsWlhBblhHNWpiMjV6ZENCRFFVTklSU0E5SUNkZlgyTmhZMmhsSjF4dVkyOXVjM1FnVVZWRlZVVWdQU0FuWDE5eGRXVjFaU2RjYm1OdmJuTjBJRk5VUVZSRklEMGdKMTlmYzNSaGRHVW5YRzVjYm1OdmJuTjBJRVZOVUZSWlgxTlVRVlJGSUQwZ2UzMWNibHh1WTJ4aGMzTWdVbVZqZFhKemFYWmxTWFJsY21GMGIzSWdlMXh1SUNBdktpcGNiaUFnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I4UVhKeVlYbDlJSEp2YjNSY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJRnRpZVhCaGMzTk5iMlJsUFRCZFhHNGdJQ0FxSUVCd1lYSmhiU0I3UW05dmJHVmhibjBnVzJsbmJtOXlaVU5wY21OMWJHRnlQV1poYkhObFhWeHVJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnVzIxaGVFUmxaWEE5TVRBd1hWeHVJQ0FnS2k5Y2JpQWdZMjl1YzNSeWRXTjBiM0lnS0hKdmIzUXNJR0o1Y0dGemMwMXZaR1VnUFNBd0xDQnBaMjV2Y21WRGFYSmpkV3hoY2lBOUlHWmhiSE5sTENCdFlYaEVaV1Z3SUQwZ01UQXdLU0I3WEc0Z0lDQWdkR2hwYzF0Q1dWQkJVMU5mVFU5RVJWMGdQU0JpZVhCaGMzTk5iMlJsWEc0Z0lDQWdkR2hwYzF0SlIwNVBVa1ZmUTBsU1ExVk1RVkpkSUQwZ2FXZHViM0psUTJseVkzVnNZWEpjYmlBZ0lDQjBhR2x6VzAxQldGOUVSVVZRWFNBOUlHMWhlRVJsWlhCY2JpQWdJQ0IwYUdselcwTkJRMGhGWFNBOUlGdGRYRzRnSUNBZ2RHaHBjMXRSVlVWVlJWMGdQU0JiWFZ4dUlDQWdJSFJvYVhOYlUxUkJWRVZkSUQwZ2RHaHBjeTVuWlhSVGRHRjBaU2gxYm1SbFptbHVaV1FzSUhKdmIzUXBYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRQWW1wbFkzUjlYRzRnSUNBcUwxeHVJQ0J1WlhoMElDZ3BJSHRjYmlBZ0lDQmpiMjV6ZENCN2JtOWtaU3dnY0dGMGFDd2daR1ZsY0gwZ1BTQjBhR2x6VzFOVVFWUkZYU0I4ZkNCRlRWQlVXVjlUVkVGVVJWeHVYRzRnSUNBZ2FXWWdLSFJvYVhOYlRVRllYMFJGUlZCZElENGdaR1ZsY0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdWFYTk9iMlJsS0c1dlpHVXBLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDBhR2x6TG1selEybHlZM1ZzWVhJb2JtOWtaU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvZEdocGMxdEpSMDVQVWtWZlEwbFNRMVZNUVZKZEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QnphMmx3WEc0Z0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25RMmx5WTNWc1lYSWdjbVZtWlhKbGJtTmxKeWxjYmlBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0hSb2FYTXViMjVUZEdWd1NXNTBieWgwYUdselcxTlVRVlJGWFNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdOdmJuTjBJR1JsYzJOeWFYQjBiM0p6SUQwZ2RHaHBjeTVuWlhSVGRHRjBaWE5QWmtOb2FXeGtUbTlrWlhNb2JtOWtaU3dnY0dGMGFDd2daR1ZsY0NsY2JpQWdJQ0FnSUNBZ0lDQWdJR052Ym5OMElHMWxkR2h2WkNBOUlIUm9hWE5iUWxsUVFWTlRYMDFQUkVWZElEOGdKM0IxYzJnbklEb2dKM1Z1YzJocFpuUW5YRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpXMUZWUlZWRlhWdHRaWFJvYjJSZEtDNHVMbVJsYzJOeWFYQjBiM0p6S1Z4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwYzF0RFFVTklSVjB1Y0hWemFDaHViMlJsS1Z4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lHTnZibk4wSUhaaGJIVmxJRDBnZEdocGMxdFJWVVZWUlYwdWMyaHBablFvS1Z4dUlDQWdJR052Ym5OMElHUnZibVVnUFNBaGRtRnNkV1ZjYmx4dUlDQWdJSFJvYVhOYlUxUkJWRVZkSUQwZ2RtRnNkV1ZjYmx4dUlDQWdJR2xtSUNoa2IyNWxLU0IwYUdsekxtUmxjM1J5YjNrb0tWeHVYRzRnSUNBZ2NtVjBkWEp1SUh0MllXeDFaU3dnWkc5dVpYMWNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDcGNiaUFnSUNvdlhHNGdJR1JsYzNSeWIza2dLQ2tnZTF4dUlDQWdJSFJvYVhOYlVWVkZWVVZkTG14bGJtZDBhQ0E5SURCY2JpQWdJQ0IwYUdselcwTkJRMGhGWFM1c1pXNW5kR2dnUFNBd1hHNGdJQ0FnZEdocGMxdFRWRUZVUlYwZ1BTQnVkV3hzWEc0Z0lIMWNiaUFnTHlvcVhHNGdJQ0FxSUVCd1lYSmhiU0I3S24wZ1lXNTVYRzRnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnS2k5Y2JpQWdhWE5PYjJSbElDaGhibmtwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdhWE5QWW1wbFkzUW9ZVzU1S1Z4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNvdlhHNGdJR2x6VEdWaFppQW9ZVzU1S1NCN1hHNGdJQ0FnY21WMGRYSnVJQ0YwYUdsekxtbHpUbTlrWlNoaGJua3BYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdLaTljYmlBZ2FYTkRhWEpqZFd4aGNpQW9ZVzU1S1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhOYlEwRkRTRVZkTG1sdVpHVjRUMllvWVc1NUtTQWhQVDBnTFRGY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1VtVjBkWEp1Y3lCemRHRjBaWE1nYjJZZ1kyaHBiR1FnYm05a1pYTmNiaUFnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I5SUc1dlpHVmNiaUFnSUNvZ1FIQmhjbUZ0SUh0QmNuSmhlWDBnY0dGMGFGeHVJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnWkdWbGNGeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FYSnlZWGs4VDJKcVpXTjBQbjFjYmlBZ0lDb3ZYRzRnSUdkbGRGTjBZWFJsYzA5bVEyaHBiR1JPYjJSbGN5QW9ibTlrWlN3Z2NHRjBhQ3dnWkdWbGNDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCblpYUkxaWGx6S0c1dlpHVXBMbTFoY0NoclpYa2dQVDVjYmlBZ0lDQWdJSFJvYVhNdVoyVjBVM1JoZEdVb2JtOWtaU3dnYm05a1pWdHJaWGxkTENCclpYa3NJSEJoZEdndVkyOXVZMkYwS0d0bGVTa3NJR1JsWlhBZ0t5QXhLVnh1SUNBZ0lDbGNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dVbVYwZFhKdWN5QnpkR0YwWlNCdlppQnViMlJsTGlCRFlXeHNjeUJtYjNJZ1pXRmphQ0J1YjJSbFhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0JiY0dGeVpXNTBYVnh1SUNBZ0tpQkFjR0Z5WVcwZ2V5cDlJRnR1YjJSbFhWeHVJQ0FnS2lCQWNHRnlZVzBnZTFOMGNtbHVaMzBnVzJ0bGVWMWNiaUFnSUNvZ1FIQmhjbUZ0SUh0QmNuSmhlWDBnVzNCaGRHaGRYRzRnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCYlpHVmxjRjFjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMDlpYW1WamRIMWNiaUFnSUNvdlhHNGdJR2RsZEZOMFlYUmxJQ2h3WVhKbGJuUXNJRzV2WkdVc0lHdGxlU3dnY0dGMGFDQTlJRnRkTENCa1pXVndJRDBnTUNrZ2UxeHVJQ0FnSUhKbGRIVnliaUI3Y0dGeVpXNTBMQ0J1YjJSbExDQnJaWGtzSUhCaGRHZ3NJR1JsWlhCOVhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlFTmhiR3hpWVdOclhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0J6ZEdGMFpWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ292WEc0Z0lHOXVVM1JsY0VsdWRHOGdLSE4wWVhSbEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUhSeWRXVmNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMUpsWTNWeWMybDJaVWwwWlhKaGRHOXlmVnh1SUNBZ0tpOWNiaUFnVzFONWJXSnZiQzVwZEdWeVlYUnZjbDBnS0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwYUdselhHNGdJSDFjYm4xY2JseHViVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQlNaV04xY25OcGRtVkpkR1Z5WVhSdmNseHVJaXdpSjNWelpTQnpkSEpwWTNRblhHNHZLaXBjYmlBcUlFQndZWEpoYlNCN0tuMGdZVzU1WEc0Z0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFxTDF4dVpuVnVZM1JwYjI0Z2FYTlBZbXBsWTNRZ0tHRnVlU2tnZTF4dUlDQnlaWFIxY200Z1lXNTVJQ0U5UFNCdWRXeHNJQ1ltSUhSNWNHVnZaaUJoYm5rZ1BUMDlJQ2R2WW1wbFkzUW5YRzU5WEc0dktpcGNiaUFxSUVCd1lYSmhiU0I3S24wZ1lXNTVYRzRnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQXFMMXh1WTI5dWMzUWdlMmx6UVhKeVlYbDlJRDBnUVhKeVlYbGNiaThxS2x4dUlDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNvdlhHNW1kVzVqZEdsdmJpQnBjMEZ5Y21GNVRHbHJaU0FvWVc1NUtTQjdYRzRnSUdsbUlDZ2hhWE5QWW1wbFkzUW9ZVzU1S1NrZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUdsbUlDZ2hLQ2RzWlc1bmRHZ25JR2x1SUdGdWVTa3BJSEpsZEhWeWJpQm1ZV3h6WlZ4dUlDQmpiMjV6ZENCc1pXNW5kR2dnUFNCaGJua3ViR1Z1WjNSb1hHNGdJR2xtSUNnaGFYTk9kVzFpWlhJb2JHVnVaM1JvS1NrZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUdsbUlDaHNaVzVuZEdnZ1BpQXdLU0I3WEc0Z0lDQWdjbVYwZFhKdUlDaHNaVzVuZEdnZ0xTQXhLU0JwYmlCaGJubGNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQm1iM0lnS0dOdmJuTjBJR3RsZVNCcGJpQmhibmtwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpWeHVJQ0FnSUgxY2JpQWdmVnh1ZlZ4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselRuVnRZbVZ5SUNoaGJua3BJSHRjYmlBZ2NtVjBkWEp1SUhSNWNHVnZaaUJoYm5rZ1BUMDlJQ2R1ZFcxaVpYSW5YRzU5WEc0dktpcGNiaUFxSUVCd1lYSmhiU0I3VDJKcVpXTjBmRUZ5Y21GNWZTQnZZbXBsWTNSY2JpQXFJRUJ5WlhSMWNtNXpJSHRCY25KaGVUeFRkSEpwYm1jK2ZWeHVJQ292WEc1bWRXNWpkR2x2YmlCblpYUkxaWGx6SUNodlltcGxZM1FwSUh0Y2JpQWdZMjl1YzNRZ2EyVjVjMThnUFNCUFltcGxZM1F1YTJWNWN5aHZZbXBsWTNRcFhHNGdJR2xtSUNocGMwRnljbUY1S0c5aWFtVmpkQ2twSUh0Y2JpQWdJQ0F2THlCemEybHdJSE52Y25SY2JpQWdmU0JsYkhObElHbG1JQ2hwYzBGeWNtRjVUR2xyWlNodlltcGxZM1FwS1NCN1hHNGdJQ0FnWTI5dWMzUWdhVzVrWlhnZ1BTQnJaWGx6WHk1cGJtUmxlRTltS0Nkc1pXNW5kR2duS1Z4dUlDQWdJR2xtSUNocGJtUmxlQ0ErSUMweEtTQjdYRzRnSUNBZ0lDQnJaWGx6WHk1emNHeHBZMlVvYVc1a1pYZ3NJREVwWEc0Z0lDQWdmVnh1SUNBZ0lDOHZJSE5yYVhBZ2MyOXlkRnh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJQzh2SUhOdmNuUmNiaUFnSUNCclpYbHpYeTV6YjNKMEtDbGNiaUFnZlZ4dUlDQnlaWFIxY200Z2EyVjVjMTljYm4xY2JseHVaWGh3YjNKMGN5NW5aWFJMWlhseklEMGdaMlYwUzJWNWMxeHVaWGh3YjNKMGN5NXBjMEZ5Y21GNUlEMGdhWE5CY25KaGVWeHVaWGh3YjNKMGN5NXBjMEZ5Y21GNVRHbHJaU0E5SUdselFYSnlZWGxNYVd0bFhHNWxlSEJ2Y25SekxtbHpUMkpxWldOMElEMGdhWE5QWW1wbFkzUmNibVY0Y0c5eWRITXVhWE5PZFcxaVpYSWdQU0JwYzA1MWJXSmxjbHh1SWl3aWFXMXdiM0owSUV4cGMzUkpkR1Z0SUdaeWIyMGdKeTR2VEdsemRFbDBaVzBuTzF4dWFXMXdiM0owSUhKbFkzVnljMmwyWlVsMFpYSmhkRzl5SUdaeWIyMGdKM0psWTNWeWMybDJaUzFwZEdWeVlYUnZjaWM3WEc1cGJYQnZjblFnYjJKcVpXTjBVR0YwYUNCbWNtOXRJQ2R2WW1wbFkzUXRjR0YwYUNjN1hHNWNibU5zWVhOeklFUmhkR0ZNYVhOMElHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0J6WlhSR2FXVnNaRTFoY0Nod1lYUm9MQ0JsZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0JsZG1WdWRDNXdjbVYyWlc1MFJHVm1ZWFZzZENncE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIdGJaWFpsYm5RdWRHRnlaMlYwTG1SaGRHRnpaWFF1Wm1sbGJHUmRPaUJ3WVhSb2ZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5VG05a1pYTW9aR0YwWVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1QySnFaV04wTG10bGVYTW9aR0YwWVNrdWJXRndLR2wwWlcwZ1BUNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR2wwWlcwZ1BUMDlJQ2R2WW1wbFkzUlFZWFJvSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdiR1YwSUdOb2FXeGtJRDBnUEV4cGMzUkpkR1Z0SUd0bGVUMTdhWFJsYlM1MGIxTjBjbWx1WnlncGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhiSFZsUFh0cGRHVnRmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamREMTdaR0YwWVZ0cGRHVnRYWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRDE3ZEdocGN5NXdjbTl3Y3k1bWFXVnNaRTFoY0gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHRnBibVZ5UFh0bElEMCtJSFJvYVhNdWMyVjBSbWxsYkdSTllYQW9aR0YwWVZ0cGRHVnRYUzV2WW1wbFkzUlFZWFJvTENCbEtYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZia05zYVdOclZHbDBiR1U5ZTJVZ1BUNGdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDaGtZWFJoVzJsMFpXMWRMQ0JsS1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHVnVkRDE3WlNBOVBpQjBhR2x6TG5ObGRFWnBaV3hrVFdGd0tHUmhkR0ZiYVhSbGJWMHNJR1VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSeVlXNXpiR0YwYVc5dVBYdDBhR2x6TG5CeWIzQnpMblJ5WVc1emJHRjBhVzl1ZlM4K08xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHUmhkR0ZiYVhSbGJWMGdQVDA5SUNkdlltcGxZM1FuSUNZbUlHUmhkR0ZiYVhSbGJWMGdJVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqYUdsc1pDQTlJRkpsWVdOMExtTnNiMjVsUld4bGJXVnVkQ2hqYUdsc1pDd2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamFHbHNaSEpsYmpvZ1FYSnlZWGt1YVhOQmNuSmhlU2hrWVhSaFcybDBaVzFkS1NBL0lIUm9hWE11Y21WdVpHVnlUbTlrWlhNb1pHRjBZVnRwZEdWdFhWc3dYU2tnT2lCMGFHbHpMbkpsYm1SbGNrNXZaR1Z6S0dSaGRHRmJhWFJsYlYwcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJqYUdsc1pEdGNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ1WkdWeUtDa2dlMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQjdkSEpoYm5Oc1lYUnBiMjRzSUdSaGRHRjlJRDBnZEdocGN5NXdjbTl3Y3p0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnWm1sbGJHUk5ZWEFnUFNCMGFHbHpMbkJ5YjNCekxtWnBaV3hrVFdGd08xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoQmNuSmhlUzVwYzBGeWNtRjVLR1JoZEdFcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJRDBnSnljN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0JwWmlBb1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUE5UFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29aR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmtZWFJoSUQwZ1pHRjBZVnN3WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoc1pYUWdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb2ZTQnZaaUJ1WlhjZ2NtVmpkWEp6YVhabFNYUmxjbUYwYjNJb1pHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHNXZaR1VnUFQwOUlDZHZZbXBsWTNRbklDWW1JRzV2WkdVZ0lUMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYkdWMElIQmhkR2hUZEhKcGJtY2dQU0J3WVhSb0xtcHZhVzRvSnk0bktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYjJKcVpXTjBVR0YwYUM1elpYUW9aR0YwWVN3Z2NHRjBhRk4wY21sdVp5QXJJQ2N1YjJKcVpXTjBVR0YwYUNjc0lIQmhkR2hUZEhKcGJtY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGFETStlM1J5WVc1emJHRjBhVzl1TG5ObGJHVmpkRWwwWlcxelEyOXVkR0ZwYm1WeWZUd3ZhRE0rWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeDFiQ0JqYkdGemMwNWhiV1U5WENKcWMyOXVMWFJ5WldWY0lqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIdDBhR2x6TG5KbGJtUmxjazV2WkdWektHUmhkR0VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMM1ZzUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUd4bGRDQnZZbXBsWTNSRVlYUmhJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9aR0YwWVN3Z1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoQmNuSmhlUzVwYzBGeWNtRjVLRzlpYW1WamRFUmhkR0VwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IySnFaV04wUkdGMFlTQTlJRzlpYW1WamRFUmhkR0ZiTUYwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2JHVjBJSHR3WVhKbGJuUXNJRzV2WkdVc0lHdGxlU3dnY0dGMGFIMGdiMllnYm1WM0lISmxZM1Z5YzJsMlpVbDBaWEpoZEc5eUtHOWlhbVZqZEVSaGRHRXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCdWIyUmxJQ0U5UFNBbmIySnFaV04wSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzWlhRZ2NHRjBhRk4wY21sdVp5QTlJSEJoZEdndWFtOXBiaWduTGljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbXBsWTNSRVlYUmhMQ0J3WVhSb1UzUnlhVzVuTENCd1lYUm9VM1J5YVc1bktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdnelBudDBjbUZ1YzJ4aGRHbHZiaTV6Wld4bFkzUlVhWFJzWlVOdmJuUmxiblI5UEM5b016NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhWc0lHTnNZWE56VG1GdFpUMWNJbXB6YjI0dGRISmxaVndpUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZTNSb2FYTXVjbVZ1WkdWeVRtOWtaWE1vYjJKcVpXTjBSR0YwWVNsOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2ZFd3K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCRVlYUmhUR2x6ZERzaUxDSnBiWEJ2Y25RZ1JHRjBZVXhwYzNRZ1puSnZiU0FuTGk5RVlYUmhUR2x6ZENjN1hHNXBiWEJ2Y25RZ1oyVjBRWEJwUkdGMFlTQm1jbTl0SUNjdUxpOHVMaTlWZEdsc2FYUnBaWE12WjJWMFFYQnBSR0YwWVNjN1hHNWNibU5zWVhOeklFWnBaV3hrVTJWc1pXTjBhVzl1SUdWNGRHVnVaSE1nVW1WaFkzUXVRMjl0Y0c5dVpXNTBJSHRjYmlBZ0lDQmpiMjF3YjI1bGJuUkVhV1JOYjNWdWRDZ3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NW5aWFJFWVhSaEtDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ1oyVjBSR0YwWVNncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzVnliQ3dnZEhKaGJuTnNZWFJwYjI1OUlEMGdkR2hwY3k1d2NtOXdjenRjYmlBZ0lDQWdJQ0FnWjJWMFFYQnBSR0YwWVNoMWNtd3BYRzRnSUNBZ0lDQWdJQ0FnSUNBdWRHaGxiaWhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FvZTNKbGMzVnNkSDBwSUQwK0lIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRnlaWE4xYkhRZ2ZId2dUMkpxWldOMExtdGxlWE1vY21WemRXeDBLUzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11Y0hKdmNITXVjMlYwUlhKeWIzSW9SWEp5YjNJb2RISmhibk5zWVhScGIyNHVZMjkxYkdST2IzUkdaWFJqYUNrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV3Y205d2N5NXpaWFJNYjJGa1pXUW9kSEoxWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXdjbTl3Y3k1elpYUkpkR1Z0Y3loeVpYTjFiSFFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMbk5sZEV4dllXUmxaQ2gwY25WbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0FvZTJWeWNtOXlmU2tnUFQ0Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuQnliM0J6TG5ObGRFeHZZV1JsWkNoMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV3Y205d2N5NXpaWFJGY25KdmNpaGxjbkp2Y2lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIWmhiSFZsS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5Wlc1a1pYSW9LU0I3WEc0Z0lDQWdJQ0FnSUdOdmJuTjBJSHQxY213c0lHVnljbTl5TENCbWFXVnNaRTFoY0N3Z2RISmhibk5zWVhScGIyNHNJR2x6VEc5aFpHVmtMQ0JwZEdWdGMzMGdQU0IwYUdsekxuQnliM0J6TzF4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2hsY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpYm05MGFXTmxJRzV2ZEdsalpTMWxjbkp2Y2lCcGJteHBibVZjSWo0OGNENTdaWEp5YjNJdWJXVnpjMkZuWlgwOEwzQStQQzlrYVhZK08xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLQ0ZwYzB4dllXUmxaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlEeGthWFlnWTJ4aGMzTk9ZVzFsUFZ3aWMzQnBibTVsY2lCcGN5MWhZM1JwZG1WY0lqNDhMMlJwZGo0N1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhFWVhSaFRHbHpkRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCa1lYUmhQWHRwZEdWdGMzMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhKc1BYdDFjbXg5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnBaV3hrVFdGd1BYdG1hV1ZzWkUxaGNIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhCa1lYUmxSbWxsYkdSTllYQTllM1JvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSEpoYm5Oc1lYUnBiMjQ5ZTNSeVlXNXpiR0YwYVc5dWZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVmVnh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JHYVdWc1pGTmxiR1ZqZEdsdmJqc2lMQ0pqYjI1emRDQkpibkIxZEVacFpXeGtjeUE5SUNoN1ptbGxiR1JOWVhBc0lIVnliSDBwSUQwK1hHNGdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdQR2x1Y0hWMElIUjVjR1U5WENKb2FXUmtaVzVjSWlCdVlXMWxQVndpYlc5a1gycHpiMjVmY21WdVpHVnlYM1Z5YkZ3aUlIWmhiSFZsUFh0MWNteDlMejVjYmlBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSm9hV1JrWlc1Y0lpQnVZVzFsUFZ3aWJXOWtYMnB6YjI1ZmNtVnVaR1Z5WDJacFpXeGtiV0Z3WENJZ2RtRnNkV1U5ZTBwVFQwNHVjM1J5YVc1bmFXWjVLR1pwWld4a1RXRndLWDB2UGx4dUlDQWdJRHd2WkdsMlBqdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdTVzV3ZFhSR2FXVnNaSE03SWl3aVkyOXVjM1FnVEdsemRFbDBaVzBnUFNBb2UzWmhiSFZsTENCamFHbHNaSEpsYml3Z1ptbGxiR1JOWVhBc0lHOWlhbVZqZEN3Z2IyNURiR2xqYTFScGRHeGxMQ0J2YmtOc2FXTnJRMjl1ZEdWdWRDd2diMjVEYkdsamEwTnZiblJoYVc1bGNpd2dkSEpoYm5Oc1lYUnBiMjU5S1NBOVBpQjdYRzRnSUNBZ2FXWWdLR05vYVd4a2NtVnVLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUFvUEd4cFBseHVJQ0FnSUNBZ0lDQWdJQ0FnZTBGeWNtRjVMbWx6UVhKeVlYa29iMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlEMDlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThjM0JoYmo0OGMzQmhiaUJqYkdGemMwNWhiV1U5WENKa1lYTm9hV052Ym5NZ1pHRnphR2xqYjI1ekxYQnZjblJtYjJ4cGIxd2lQand2YzNCaGJqNGdlM1poYkhWbGZTQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0luUnlaV1V0YzJWc1pXTjBYQ0lnWkdGMFlTMW1hV1ZzWkQxY0ltbDBaVzFEYjI1MFlXbHVaWEpjSWlCdmJrTnNhV05yUFh0dmJrTnNhV05yUTI5dWRHRnBibVZ5ZlQ1N2RISmhibk5zWVhScGIyNHVjMlZzWldOMGZUd3ZZVDQ4TDNOd1lXNCtJRG9nSUR4emNHRnVQbnQyWVd4MVpYMDhMM053WVc0K2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnUEhWc1BudGphR2xzWkhKbGJuMDhMM1ZzUGx4dUlDQWdJQ0FnSUNBOEwyeHBQaWs3WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlDZzhiR2srWEc0Z0lDQWdJQ0FnSUNBZ0lDQjdabWxsYkdSTllYQXVkR2wwYkdVZ1BUMDlJRzlpYW1WamRDQW1KaUJtYVdWc1pFMWhjQzUwYVhSc1pTQS9JRHh6ZEhKdmJtYytlM1J5WVc1emJHRjBhVzl1TG5ScGRHeGxmVG9nUEM5emRISnZibWMrSURvZ0p5ZDlYRzRnSUNBZ0lDQWdJQ0FnSUNCN1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZENBOVBUMGdiMkpxWldOMElDWW1JR1pwWld4a1RXRndMbU52Ym5SbGJuUWdQeUE4YzNSeWIyNW5QbnQwY21GdWMyeGhkR2x2Ymk1amIyNTBaVzUwZlRvZ1BDOXpkSEp2Ym1jK0lEb2dKeWQ5WEc0Z0lDQWdJQ0FnSUNBZ0lDQThjM0JoYmo1N2RtRnNkV1Y5UEM5emNHRnVQbHh1SUNBZ0lDQWdJQ0FnSUNBZ2V5Rm1hV1ZzWkUxaGNDNTBhWFJzWlNBbUppQW9abWxsYkdSTllYQXVZMjl1ZEdWdWRDQWhQVDBnYjJKcVpXTjBLU0FtSmlCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJQ0U5UFNCdWRXeHNJRDljYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WVNCb2NtVm1QVndpSTF3aUlHTnNZWE56VG1GdFpUMWNJblJ5WldVdGMyVnNaV04wWENJZ1pHRjBZUzFtYVdWc1pEMWNJblJwZEd4bFhDSWdiMjVEYkdsamF6MTdiMjVEYkdsamExUnBkR3hsZlQ1N2RISmhibk5zWVhScGIyNHVkR2wwYkdWOVBDOWhQaUE2SUNjbmZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZXlGbWFXVnNaRTFoY0M1amIyNTBaVzUwSUNZbUlDaG1hV1ZzWkUxaGNDNTBhWFJzWlNBaFBUMGdiMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlDRTlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0luUnlaV1V0YzJWc1pXTjBYQ0lnWkdGMFlTMW1hV1ZzWkQxY0ltTnZiblJsYm5SY0lpQnZia05zYVdOclBYdHZia05zYVdOclEyOXVkR1Z1ZEgwK2UzUnlZVzV6YkdGMGFXOXVMbU52Ym5SbGJuUjlQQzloUGlBNklDY25mVnh1SUNBZ0lDQWdJQ0E4TDJ4cFBpazdYRzRnSUNBZ2ZWeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnVEdsemRFbDBaVzA3SWl3aWFXMXdiM0owSUVacFpXeGtVMlZzWldOMGFXOXVJR1p5YjIwZ0p5NHZSbWxsYkdSVFpXeGxZM1JwYjI0bk8xeHVhVzF3YjNKMElFbHVjSFYwUm1sbGJHUnpJR1p5YjIwZ0p5NHZTVzV3ZFhSR2FXVnNaSE1uTzF4dWFXMXdiM0owSUZOMWJXMWhjbmtnWm5KdmJTQW5MaTlUZFcxdFlYSjVKenRjYmx4dVkyeGhjM01nVTJWMGRHbHVaM01nWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZibk4wY25WamRHOXlLSEJ5YjNCektTQjdYRzRnSUNBZ0lDQWdJSE4xY0dWeUtIQnliM0J6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6ZEdGMFpTQTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJqb2dabUZzYzJVc1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxY213NklDY25MRnh1SUNBZ0lDQWdJQ0FnSUNBZ2FYTk1iMkZrWldRNklHWmhiSE5sTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdaWEp5YjNJNklHNTFiR3dzWEc0Z0lDQWdJQ0FnSUNBZ0lDQnBkR1Z0Y3pvZ1cxMHNYRzRnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0RvZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzFEYjI1MFlXbHVaWEk2SUc1MWJHd3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2wwYkdVNklDY25MRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUTZJQ2NuWEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdZMjl0Y0c5dVpXNTBSR2xrVFc5MWJuUW9LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVhVzVwZEU5d2RHbHZibk1vS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JwYm1sMFQzQjBhVzl1Y3lncElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ0YjJSS2MyOXVVbVZ1WkdWeUxtOXdkR2x2Ym5NZ0lUMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emRDQnZjSFJwYjI1eklEMGdiVzlrU25OdmJsSmxibVJsY2k1dmNIUnBiMjV6TzF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUJ2Y0hScGIyNXpMblZ5YkNBL0lHOXdkR2x2Ym5NdWRYSnNJRG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptbGxiR1JOWVhBNklHOXdkR2x2Ym5NdVptbGxiR1JOWVhBZ1B5QktVMDlPTG5CaGNuTmxLRzl3ZEdsdmJuTXVabWxsYkdSTllYQXBJRG9nZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBkR1Z0UTI5dWRHRnBibVZ5T2lCdWRXeHNMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFYUnNaVG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUTZJQ2NuWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0NklDRWhiM0IwYVc5dWN5NTFjbXhjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkWEpzUTJoaGJtZGxLR1YyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMyVjBVM1JoZEdVb2UzVnliRG9nWlhabGJuUXVkR0Z5WjJWMExuWmhiSFZsZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYUdGdVpHeGxVM1ZpYldsMEtHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lM05vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nZEhKMVpYMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxjMlYwVDNCMGFXOXVjeWhsZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0JsZG1WdWRDNXdjbVYyWlc1MFJHVm1ZWFZzZENncE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0emFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0NklHWmhiSE5sTENCMWNtdzZJQ2NuTENCbWFXVnNaRTFoY0RvZ2UybDBaVzFEYjI1MFlXbHVaWEk2SUc1MWJHd3NJSFJwZEd4bE9pQW5KeXdnWTI5dWRHVnVkRG9nSnlkOWZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RYQmtZWFJsUm1sbGJHUk5ZWEFvZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdibVYzVm1Gc0lEMGdUMkpxWldOMExtRnpjMmxuYmloMGFHbHpMbk4wWVhSbExtWnBaV3hrVFdGd0xDQjJZV3gxWlNrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvZTJacFpXeGtUV0Z3T2lCdVpYZFdZV3g5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J6WlhSRmNuSnZjaWhsY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtIdGxjbkp2Y24wcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhObGRFeHZZV1JsWkNoMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRwYzB4dllXUmxaRG9nZG1Gc2RXVjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnpaWFJKZEdWdGN5aHBkR1Z0Y3lrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0cGRHVnRjem9nYVhSbGJYTjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaVzVrWlhJb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdDBjbUZ1YzJ4aGRHbHZibjBnUFNCMGFHbHpMbkJ5YjNCek8xeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dUxDQjFjbXdzSUdWeWNtOXlMQ0JwYzB4dllXUmxaQ3dnYVhSbGJYTjlJRDBnZEdocGN5NXpkR0YwWlR0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnZTJsMFpXMURiMjUwWVdsdVpYSXNJSFJwZEd4bExDQmpiMjUwWlc1MGZTQTlJSFJvYVhNdWMzUmhkR1V1Wm1sbGJHUk5ZWEE3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFZ5YkNBbUppQnBkR1Z0UTI5dWRHRnBibVZ5SUNFOVBTQnVkV3hzSUNZbUlIUnBkR3hsSUNZbUlHTnZiblJsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEZOMWJXMWhjbmtnZXk0dUxuUm9hWE11YzNSaGRHVjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSeVlXNXpiR0YwYVc5dVBYdDBjbUZ1YzJ4aGRHbHZibjFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0x6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEVsdWNIVjBSbWxsYkdSeklIc3VMaTUwYUdsekxuTjBZWFJsZlNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4Y0Q0OFlTQm9jbVZtUFZ3aUkxd2lJRzl1UTJ4cFkyczllM1JvYVhNdWNtVnpaWFJQY0hScGIyNXpMbUpwYm1Rb2RHaHBjeWw5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOc1lYTnpUbUZ0WlQxY0ltSjFkSFJ2Ymx3aVBudDBjbUZ1YzJ4aGRHbHZiaTV5WlhObGRGTmxkSFJwYm1kemZUd3ZZVDQ4TDNBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOb2IzZEdhV1ZzWkZObGJHVmpkR2x2YmlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4Um1sbGJHUlRaV3hsWTNScGIyNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIVnliRDE3ZFhKc2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pYSnliM0k5ZTJWeWNtOXlmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlYwUlhKeWIzSTllM1JvYVhNdWMyVjBSWEp5YjNJdVltbHVaQ2gwYUdsektYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbHpURzloWkdWa1BYdHBjMHh2WVdSbFpIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lITmxkRXh2WVdSbFpEMTdkR2hwY3k1elpYUk1iMkZrWldRdVltbHVaQ2gwYUdsektYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzF6UFh0cGRHVnRjMzFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5sZEVsMFpXMXpQWHQwYUdsekxuTmxkRWwwWlcxekxtSnBibVFvZEdocGN5bDlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQm1hV1ZzWkUxaGNEMTdkR2hwY3k1emRHRjBaUzVtYVdWc1pFMWhjSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFZ3WkdGMFpVWnBaV3hrVFdGd1BYdDBhR2x6TG5Wd1pHRjBaVVpwWld4a1RXRndMbUpwYm1Rb2RHaHBjeWw5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwY21GdWMyeGhkR2x2YmoxN2RISmhibk5zWVhScGIyNTlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhKYm5CMWRFWnBaV3hrY3lCN0xpNHVkR2hwY3k1emRHRjBaWDBnTHo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQSEErUEdFZ2FISmxaajFjSWlOY0lpQnZia05zYVdOclBYdDBhR2x6TG5KbGMyVjBUM0IwYVc5dWN5NWlhVzVrS0hSb2FYTXBmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqYkdGemMwNWhiV1U5WENKaWRYUjBiMjVjSWo1N2RISmhibk5zWVhScGIyNHVjbVZ6WlhSVFpYUjBhVzVuYzMwOEwyRStQQzl3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRpQmpiR0Z6YzA1aGJXVTlYQ0ozY21Gd1hDSStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4bWIzSnRJRzl1VTNWaWJXbDBQWHQwYUdsekxtaGhibVJzWlZOMVltMXBkQzVpYVc1a0tIUm9hWE1wZlQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4d1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhzWVdKbGJENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BITjBjbTl1Wno1QlVFa2dWVkpNUEM5emRISnZibWMrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOXNZV0psYkQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThZbkl2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHBQbnQwY21GdWMyeGhkR2x2Ymk1MllXeHBaRXB6YjI1VmNteDlQQzlwUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEM5d1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHbHVjSFYwSUhSNWNHVTlYQ0owWlhoMFhDSWdZMnhoYzNOT1lXMWxQVndpZFhKc0xXbHVjSFYwWENJZ2RtRnNkV1U5ZTNWeWJIMGdiMjVEYUdGdVoyVTllM1JvYVhNdWRYSnNRMmhoYm1kbExtSnBibVFvZEdocGN5bDlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh3UGp4cGJuQjFkQ0IwZVhCbFBWd2ljM1ZpYldsMFhDSWdZMnhoYzNOT1lXMWxQVndpWW5WMGRHOXVJR0oxZEhSdmJpMXdjbWx0WVhKNVhDSWdkbUZzZFdVOWUzUnlZVzV6YkdGMGFXOXVMbk5sYm1SU1pYRjFaWE4wZlM4K1BDOXdQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyWnZjbTArWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeEpibkIxZEVacFpXeGtjeUI3TGk0dWRHaHBjeTV6ZEdGMFpYMGdMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDJScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRk5sZEhScGJtZHpPeUlzSW1OdmJuTjBJRk4xYlcxaGNua2dQU0FvZTNWeWJDd2dabWxsYkdSTllYQXNJSFJ5WVc1emJHRjBhVzl1ZlNrZ1BUNWNiaUFnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0E4Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJRHh6ZEhKdmJtYytRVkJKSUZWU1REd3ZjM1J5YjI1blBqeGljaTgrWEc0Z0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBYdDFjbXg5SUhSaGNtZGxkRDFjSWw5aWJHRnVhMXdpUG50MWNteDlQQzloUGx4dUlDQWdJQ0FnSUNBOEwzQStYRzRnSUNBZ0lDQWdJRHh3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdQSE4wY205dVp6NTdkSEpoYm5Oc1lYUnBiMjR1ZEdsMGJHVjlQQzl6ZEhKdmJtYytQR0p5THo1Y2JpQWdJQ0FnSUNBZ0lDQWdJSHRtYVdWc1pFMWhjQzUwYVhSc1pTNXlaWEJzWVdObEtDY3VKeXdnSnlEaWdKTStJQ2NwZlZ4dUlDQWdJQ0FnSUNBOEwzQStYRzRnSUNBZ0lDQWdJRHh3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdQSE4wY205dVp6NTdkSEpoYm5Oc1lYUnBiMjR1WTI5dWRHVnVkSDA4TDNOMGNtOXVaejQ4WW5JdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnZTJacFpXeGtUV0Z3TG1OdmJuUmxiblF1Y21Wd2JHRmpaU2duTGljc0lDY2c0b0NUUGlBbktYMWNiaUFnSUNBZ0lDQWdQQzl3UGx4dUlDQWdJRHd2WkdsMlBqdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdVM1Z0YldGeWVUc2lMQ0pwYlhCdmNuUWdVMlYwZEdsdVozTWdabkp2YlNBbkxpOURiMjF3YjI1bGJuUnpMMU5sZEhScGJtZHpKenRjYmx4dVkyOXVjM1FnYlc5a1NuTnZibEpsYm1SbGNrVnNaVzFsYm5RZ1BTQW5iVzlrZFd4aGNtbDBlUzFxYzI5dUxYSmxibVJsY2ljN1hHNWpiMjV6ZENCa2IyMUZiR1Z0Wlc1MElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb2JXOWtTbk52YmxKbGJtUmxja1ZzWlcxbGJuUXBPMXh1WTI5dWMzUWdlM1J5WVc1emJHRjBhVzl1ZlNBOUlHMXZaRXB6YjI1U1pXNWtaWEk3WEc1Y2JsSmxZV04wUkU5TkxuSmxibVJsY2loY2JpQWdJQ0E4VTJWMGRHbHVaM01nZEhKaGJuTnNZWFJwYjI0OWUzUnlZVzV6YkdGMGFXOXVmU0F2UGl4Y2JpQWdJQ0JrYjIxRmJHVnRaVzUwWEc0cE95SXNJbVoxYm1OMGFXOXVJR2RsZEVGd2FVUmhkR0VvZFhKc0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUdabGRHTm9LSFZ5YkNsY2JpQWdJQ0FnSUNBZ0xuUm9aVzRvY21WeklEMCtJSEpsY3k1cWMyOXVLQ2twWEc0Z0lDQWdJQ0FnSUM1MGFHVnVLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0tISmxjM1ZzZENrZ1BUNGdLSHR5WlhOMWJIUjlLU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDaGxjbkp2Y2lrZ1BUNGdLSHRsY25KdmNuMHBYRzRnSUNBZ0lDQWdJQ2s3WEc1OVhHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHZGxkRUZ3YVVSaGRHRTdYRzRpWFgwPVxuIl0sImZpbGUiOiJBZG1pbi9JbmRleEFkbWluLmpzIn0=
