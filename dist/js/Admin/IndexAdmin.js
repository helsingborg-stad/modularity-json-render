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

      var _this$props = this.props,
          url = _this$props.url,
          translation = _this$props.translation;
      (0, _getApiData.default)(url).then(function (_ref) {
        var result = _ref.result;

        if (!result || Object.keys(result).length === 0) {
          _this2.setState({
            error: Error(translation.couldNotFetch),
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
      var _this$props2 = this.props,
          url = _this$props2.url,
          fieldMap = _this$props2.fieldMap,
          translation = _this$props2.translation;
      var _this$state = this.state,
          error = _this$state.error,
          isLoaded = _this$state.isLoaded,
          items = _this$state.items;

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
          updateFieldMap: this.updateFieldMap,
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
      var translation = this.props.translation;
      var _this$state = this.state,
          showFieldSelection = _this$state.showFieldSelection,
          url = _this$state.url;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7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QUFoQjs7ZUFnQmUsTzs7Ozs7O0FDaEJmOzs7O0FBRUEsSUFBTSxvQkFBb0IsR0FBRyx3QkFBN0I7QUFDQSxJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBVCxDQUF3QixvQkFBeEIsQ0FBbkI7cUJBQ3NCLGE7SUFBZixXLGtCQUFBLFc7QUFFUCxRQUFRLENBQUMsTUFBVCxDQUNJLG9CQUFDLGlCQUFEO0FBQVUsRUFBQSxXQUFXLEVBQUU7QUFBdkIsRUFESixFQUVJLFVBRko7Ozs7Ozs7Ozs7QUNOQSxTQUFTLFVBQVQsQ0FBb0IsR0FBcEIsRUFBeUI7QUFDckIsU0FBTyxLQUFLLENBQUMsR0FBRCxDQUFMLENBQ0YsSUFERSxDQUNHLFVBQUEsR0FBRztBQUFBLFdBQUksR0FBRyxDQUFDLElBQUosRUFBSjtBQUFBLEdBRE4sRUFFRixJQUZFLENBR0MsVUFBQyxNQUFEO0FBQUEsV0FBYTtBQUFDLE1BQUEsTUFBTSxFQUFOO0FBQUQsS0FBYjtBQUFBLEdBSEQsRUFJQyxVQUFDLEtBQUQ7QUFBQSxXQUFZO0FBQUMsTUFBQSxLQUFLLEVBQUw7QUFBRCxLQUFaO0FBQUEsR0FKRCxDQUFQO0FBTUg7O2VBRWMsVSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5vYmplY3RQYXRoID0gZmFjdG9yeSgpO1xuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgaWYob2JqID09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvL3RvIGhhbmRsZSBvYmplY3RzIHdpdGggbnVsbCBwcm90b3R5cGVzICh0b28gZWRnZSBjYXNlPylcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcClcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpe1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKXtcbiAgICByZXR1cm4gdG9TdHIuY2FsbCh0eXBlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XG4gIH1cblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKXtcbiAgICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gICAgcmV0dXJuIHRvU3RyLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQm9vbGVhbihvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0S2V5KGtleSl7XG4gICAgdmFyIGludEtleSA9IHBhcnNlSW50KGtleSk7XG4gICAgaWYgKGludEtleS50b1N0cmluZygpID09PSBrZXkpIHtcbiAgICAgIHJldHVybiBpbnRLZXk7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBmYWN0b3J5KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gICAgdmFyIG9iamVjdFBhdGggPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3RQYXRoKS5yZWR1Y2UoZnVuY3Rpb24ocHJveHksIHByb3ApIHtcbiAgICAgICAgaWYocHJvcCA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICAgIH1cblxuICAgICAgICAvKmlzdGFuYnVsIGlnbm9yZSBlbHNlKi9cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RQYXRoW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcHJveHlbcHJvcF0gPSBvYmplY3RQYXRoW3Byb3BdLmJpbmQob2JqZWN0UGF0aCwgb2JqKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgIH0sIHt9KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgcmV0dXJuIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyB8fCAodHlwZW9mIHByb3AgPT09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkob2JqKSkgfHwgaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLm1hcChnZXRLZXkpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IHBhdGhbMF07XG4gICAgICB2YXIgY3VycmVudFZhbHVlID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCB8fCAhZG9Ob3RSZXBsYWNlKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCkge1xuICAgICAgICAvL2NoZWNrIGlmIHdlIGFzc3VtZSBhbiBhcnJheVxuICAgICAgICBpZih0eXBlb2YgcGF0aFsxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfVxuXG4gICAgb2JqZWN0UGF0aC5oYXMgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICEhb2JqO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGogPSBnZXRLZXkocGF0aFtpXSk7XG5cbiAgICAgICAgaWYoKHR5cGVvZiBqID09PSAnbnVtYmVyJyAmJiBpc0FycmF5KG9iaikgJiYgaiA8IG9iai5sZW5ndGgpIHx8XG4gICAgICAgICAgKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzID8gKGogaW4gT2JqZWN0KG9iaikpIDogaGFzT3duUHJvcGVydHkob2JqLCBqKSkpIHtcbiAgICAgICAgICBvYmogPSBvYmpbal07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVuc3VyZUV4aXN0cyA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguaW5zZXJ0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGF0KXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgYXQgPSB+fmF0O1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cbiAgICAgIGFyci5zcGxpY2UoYXQsIDAsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbXB0eSA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUsIGk7XG4gICAgICBpZiAoISh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCkpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsICcnKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHZhbHVlLmxlbmd0aCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICBmb3IgKGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgbnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGgucHVzaCA9IGZ1bmN0aW9uIChvYmosIHBhdGggLyosIHZhbHVlcyAqLyl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG5cbiAgICAgIGFyci5wdXNoLmFwcGx5KGFyciwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguY29hbGVzY2UgPSBmdW5jdGlvbiAob2JqLCBwYXRocywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoc1tpXSkpICE9PSB2b2lkIDApIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBkZWZhdWx0VmFsdWUpe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLCBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICB2YXIgbmV4dE9iaiA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKVxuICAgICAgaWYgKG5leHRPYmogPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG5leHRPYmo7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCBkZWZhdWx0VmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmRlbCA9IGZ1bmN0aW9uIGRlbChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZih0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9iaiwgcGF0aC5zcGxpdCgnLicpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgaWYgKCFoYXNTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgIG9iai5zcGxpY2UoY3VycmVudFBhdGgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvYmpbY3VycmVudFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iamVjdFBhdGg7XG4gIH1cblxuICB2YXIgbW9kID0gZmFjdG9yeSgpO1xuICBtb2QuY3JlYXRlID0gZmFjdG9yeTtcbiAgbW9kLndpdGhJbmhlcml0ZWRQcm9wcyA9IGZhY3Rvcnkoe2luY2x1ZGVJbmhlcml0ZWRQcm9wczogdHJ1ZX0pXG4gIHJldHVybiBtb2Q7XG59KTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG4iLCIndXNlIHN0cmljdCdcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCAoYW55KSB7XG4gIHJldHVybiBhbnkgIT09IG51bGwgJiYgdHlwZW9mIGFueSA9PT0gJ29iamVjdCdcbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5jb25zdCB7aXNBcnJheX0gPSBBcnJheVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlIChhbnkpIHtcbiAgaWYgKCFpc09iamVjdChhbnkpKSByZXR1cm4gZmFsc2VcbiAgaWYgKCEoJ2xlbmd0aCcgaW4gYW55KSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGxlbmd0aCA9IGFueS5sZW5ndGhcbiAgaWYgKCFpc051bWJlcihsZW5ndGgpKSByZXR1cm4gZmFsc2VcbiAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gKGxlbmd0aCAtIDEpIGluIGFueVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFueSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIgKGFueSkge1xuICByZXR1cm4gdHlwZW9mIGFueSA9PT0gJ251bWJlcidcbn1cbi8qKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5PFN0cmluZz59XG4gKi9cbmZ1bmN0aW9uIGdldEtleXMgKG9iamVjdCkge1xuICBjb25zdCBrZXlzXyA9IE9iamVjdC5rZXlzKG9iamVjdClcbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkge1xuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2UgaWYgKGlzQXJyYXlMaWtlKG9iamVjdCkpIHtcbiAgICBjb25zdCBpbmRleCA9IGtleXNfLmluZGV4T2YoJ2xlbmd0aCcpXG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIGtleXNfLnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSB7XG4gICAgLy8gc29ydFxuICAgIGtleXNfLnNvcnQoKVxuICB9XG4gIHJldHVybiBrZXlzX1xufVxuXG5leHBvcnRzLmdldEtleXMgPSBnZXRLZXlzXG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5XG5leHBvcnRzLmlzQXJyYXlMaWtlID0gaXNBcnJheUxpa2VcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdFxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyXG4iLCJpbXBvcnQgTGlzdEl0ZW0gZnJvbSAnLi9MaXN0SXRlbSc7XG5pbXBvcnQgcmVjdXJzaXZlSXRlcmF0b3IgZnJvbSAncmVjdXJzaXZlLWl0ZXJhdG9yJztcbmltcG9ydCBvYmplY3RQYXRoIGZyb20gJ29iamVjdC1wYXRoJztcblxuY2xhc3MgRGF0YUxpc3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAoe1tldmVudC50YXJnZXQuZGF0YXNldC5maWVsZF06IHBhdGh9KTtcbiAgICB9XG5cbiAgICByZW5kZXJOb2RlcyhkYXRhKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ29iamVjdFBhdGgnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgY2hpbGQgPSA8TGlzdEl0ZW0ga2V5PXtpdGVtLnRvU3RyaW5nKCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2l0ZW19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0PXtkYXRhW2l0ZW1dfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnByb3BzLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250YWluZXI9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLm9iamVjdFBhdGgsIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tUaXRsZT17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250ZW50PXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb249e3RoaXMucHJvcHMudHJhbnNsYXRpb259Lz47XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtpdGVtXSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KGRhdGFbaXRlbV0pID8gdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHt0cmFuc2xhdGlvbiwgZGF0YX0gPSB0aGlzLnByb3BzO1xuICAgICAgICBjb25zdCBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhWzBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCB7cGFyZW50LCBub2RlLCBrZXksIHBhdGh9IG9mIG5ldyByZWN1cnNpdmVJdGVyYXRvcihkYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ29iamVjdCcgJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RQYXRoLnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMz57dHJhbnNsYXRpb24uc2VsZWN0SXRlbXNDb250YWluZXJ9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cImpzb24tdHJlZVwiPnt0aGlzLnJlbmRlck5vZGVzKGRhdGEpfTwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG9iamVjdERhdGEgPSBvYmplY3RQYXRoLmdldChkYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3Iob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFBhdGguc2V0KG9iamVjdERhdGEsIHBhdGhTdHJpbmcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+e3RyYW5zbGF0aW9uLnNlbGVjdFRpdGxlQ29udGVudH08L2gzPlxuICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3NOYW1lPVwianNvbi10cmVlXCI+e3RoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSl9PC91bD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IERhdGFMaXN0OyIsImltcG9ydCBEYXRhTGlzdCBmcm9tICcuL0RhdGFMaXN0JztcbmltcG9ydCBnZXRBcGlEYXRhIGZyb20gJy4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhJztcblxuY2xhc3MgRmllbGRTZWxlY3Rpb24gZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGVycm9yOiBudWxsLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgaXRlbXM6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy51cGRhdGVGaWVsZE1hcCA9IHRoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9XG5cbiAgICBnZXREYXRhKCkge1xuICAgICAgICBjb25zdCB7dXJsLCB0cmFuc2xhdGlvbn0gPSB0aGlzLnByb3BzO1xuICAgICAgICBnZXRBcGlEYXRhKHVybClcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgICh7cmVzdWx0fSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCBPYmplY3Qua2V5cyhyZXN1bHQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IEVycm9yKHRyYW5zbGF0aW9uLmNvdWxkTm90RmV0Y2gpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTG9hZGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdHJ1ZSwgaXRlbXM6IHJlc3VsdH0pO1xuICAgICAgICAgICAgICAgIH0sICh7ZXJyb3J9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoe2lzTG9hZGVkOiB0cnVlLCBlcnJvcn0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuZ2V0RGF0YSgpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3VybCwgZmllbGRNYXAsIHRyYW5zbGF0aW9ufSA9IHRoaXMucHJvcHM7XG4gICAgICAgIGNvbnN0IHtlcnJvciwgaXNMb2FkZWQsIGl0ZW1zfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwibm90aWNlIG5vdGljZS1lcnJvciBpbmxpbmVcIj48cD57ZXJyb3IubWVzc2FnZX08L3A+PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIj48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gPERhdGFMaXN0XG4gICAgICAgICAgICAgICAgZGF0YT17aXRlbXN9XG4gICAgICAgICAgICAgICAgdXJsPXt1cmx9XG4gICAgICAgICAgICAgICAgZmllbGRNYXA9e2ZpZWxkTWFwfVxuICAgICAgICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwPXt0aGlzLnVwZGF0ZUZpZWxkTWFwfVxuICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn0vPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRmllbGRTZWxlY3Rpb247IiwiY29uc3QgSW5wdXRGaWVsZHMgPSAoe2ZpZWxkTWFwLCB1cmx9KSA9PlxuICAgIDxkaXY+XG4gICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm1vZF9qc29uX3JlbmRlcl91cmxcIiB2YWx1ZT17dXJsfS8+XG4gICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiIHZhbHVlPXtKU09OLnN0cmluZ2lmeShmaWVsZE1hcCl9Lz5cbiAgICA8L2Rpdj47XG5cbmV4cG9ydCBkZWZhdWx0IElucHV0RmllbGRzOyIsImNvbnN0IExpc3RJdGVtID0gKHt2YWx1ZSwgY2hpbGRyZW4sIGZpZWxkTWFwLCBvYmplY3QsIG9uQ2xpY2tUaXRsZSwgb25DbGlja0NvbnRlbnQsIG9uQ2xpY2tDb250YWluZXIsIHRyYW5zbGF0aW9ufSkgPT4ge1xuICAgIGlmIChjaGlsZHJlbikge1xuICAgICAgICByZXR1cm4gKDxsaT5cbiAgICAgICAgICAgIHtBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgPHNwYW4+PHNwYW4gY2xhc3NOYW1lPVwiZGFzaGljb25zIGRhc2hpY29ucy1wb3J0Zm9saW9cIj48L3NwYW4+IHt2YWx1ZX0gPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJ0cmVlLXNlbGVjdFwiIGRhdGEtZmllbGQ9XCJpdGVtQ29udGFpbmVyXCIgb25DbGljaz17b25DbGlja0NvbnRhaW5lcn0+e3RyYW5zbGF0aW9uLnNlbGVjdH08L2E+PC9zcGFuPiA6ICA8c3Bhbj57dmFsdWV9PC9zcGFuPn1cbiAgICAgICAgICAgIDx1bD57Y2hpbGRyZW59PC91bD5cbiAgICAgICAgPC9saT4pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAoPGxpPlxuICAgICAgICAgICAge2ZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgJiYgZmllbGRNYXAudGl0bGUgPyA8c3Ryb25nPnt0cmFuc2xhdGlvbi50aXRsZX06IDwvc3Ryb25nPiA6ICcnfVxuICAgICAgICAgICAge2ZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCAmJiBmaWVsZE1hcC5jb250ZW50ID8gPHN0cm9uZz57dHJhbnNsYXRpb24uY29udGVudH06IDwvc3Ryb25nPiA6ICcnfVxuICAgICAgICAgICAgPHNwYW4+e3ZhbHVlfTwvc3Bhbj5cbiAgICAgICAgICAgIHshZmllbGRNYXAudGl0bGUgJiYgKGZpZWxkTWFwLmNvbnRlbnQgIT09IG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJ0cmVlLXNlbGVjdFwiIGRhdGEtZmllbGQ9XCJ0aXRsZVwiIG9uQ2xpY2s9e29uQ2xpY2tUaXRsZX0+e3RyYW5zbGF0aW9uLnRpdGxlfTwvYT4gOiAnJ31cbiAgICAgICAgICAgIHshZmllbGRNYXAuY29udGVudCAmJiAoZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJ0cmVlLXNlbGVjdFwiIGRhdGEtZmllbGQ9XCJjb250ZW50XCIgb25DbGljaz17b25DbGlja0NvbnRlbnR9Pnt0cmFuc2xhdGlvbi5jb250ZW50fTwvYT4gOiAnJ31cbiAgICAgICAgPC9saT4pO1xuICAgIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IExpc3RJdGVtOyIsImltcG9ydCBGaWVsZFNlbGVjdGlvbiBmcm9tICcuL0ZpZWxkU2VsZWN0aW9uJztcbmltcG9ydCBJbnB1dEZpZWxkcyBmcm9tICcuL0lucHV0RmllbGRzJztcbmltcG9ydCBTdW1tYXJ5IGZyb20gJy4vU3VtbWFyeSc7XG5cbmNsYXNzIFNldHRpbmdzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgICAgIGZpZWxkTWFwOiB7XG4gICAgICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cblxuICAgIGluaXRPcHRpb25zKCkge1xuICAgICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dXJsOiBldmVudC50YXJnZXQudmFsdWV9KTtcbiAgICB9XG5cbiAgICBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7c2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsIHVybDogJycsIGZpZWxkTWFwOiB7aXRlbUNvbnRhaW5lcjogbnVsbCwgdGl0bGU6ICcnLCBjb250ZW50OiAnJ319KTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmllbGRNYXA6IG5ld1ZhbH0pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3RyYW5zbGF0aW9ufSA9IHRoaXMucHJvcHM7XG4gICAgICAgIGNvbnN0IHtzaG93RmllbGRTZWxlY3Rpb24sIHVybH0gPSB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCB7aXRlbUNvbnRhaW5lciwgdGl0bGUsIGNvbnRlbnR9ID0gdGhpcy5zdGF0ZS5maWVsZE1hcDtcblxuICAgICAgICBpZiAodXJsICYmIGl0ZW1Db250YWluZXIgIT09IG51bGwgJiYgdGl0bGUgJiYgY29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8U3VtbWFyeSB7Li4udGhpcy5zdGF0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb249e3RyYW5zbGF0aW9ufSAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKX0gY2xhc3NOYW1lPVwiYnV0dG9uXCI+e3RyYW5zbGF0aW9uLnJlc2V0U2V0dGluZ3N9PC9hPjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxGaWVsZFNlbGVjdGlvbiB1cmw9e3VybH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnN0YXRlLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn0vPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKX0gY2xhc3NOYW1lPVwiYnV0dG9uXCI+e3RyYW5zbGF0aW9uLnJlc2V0U2V0dGluZ3N9PC9hPjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwid3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17dGhpcy5oYW5kbGVTdWJtaXQuYmluZCh0aGlzKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+QVBJIFVSTDwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJyLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aT57dHJhbnNsYXRpb24udmFsaWRKc29uVXJsfTwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzTmFtZT1cInVybC1pbnB1dFwiIHZhbHVlPXt1cmx9IG9uQ2hhbmdlPXt0aGlzLnVybENoYW5nZS5iaW5kKHRoaXMpfS8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD48aW5wdXQgdHlwZT1cInN1Ym1pdFwiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tcHJpbWFyeVwiIHZhbHVlPXt0cmFuc2xhdGlvbi5zZW5kUmVxdWVzdH0vPjwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9mb3JtPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBTZXR0aW5nczsiLCJjb25zdCBTdW1tYXJ5ID0gKHt1cmwsIGZpZWxkTWFwLCB0cmFuc2xhdGlvbn0pID0+XG4gICAgPGRpdj5cbiAgICAgICAgPHA+XG4gICAgICAgICAgICA8c3Ryb25nPkFQSSBVUkw8L3N0cm9uZz48YnIvPlxuICAgICAgICAgICAgPGEgaHJlZj17dXJsfSB0YXJnZXQ9XCJfYmxhbmtcIj57dXJsfTwvYT5cbiAgICAgICAgPC9wPlxuICAgICAgICA8cD5cbiAgICAgICAgICAgIDxzdHJvbmc+e3RyYW5zbGF0aW9uLnRpdGxlfTwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICB7ZmllbGRNYXAudGl0bGUucmVwbGFjZSgnLicsICcg4oCTPiAnKX1cbiAgICAgICAgPC9wPlxuICAgICAgICA8cD5cbiAgICAgICAgICAgIDxzdHJvbmc+e3RyYW5zbGF0aW9uLmNvbnRlbnR9PC9zdHJvbmc+PGJyLz5cbiAgICAgICAgICAgIHtmaWVsZE1hcC5jb250ZW50LnJlcGxhY2UoJy4nLCAnIOKAkz4gJyl9XG4gICAgICAgIDwvcD5cbiAgICA8L2Rpdj47XG5cbmV4cG9ydCBkZWZhdWx0IFN1bW1hcnk7IiwiaW1wb3J0IFNldHRpbmdzIGZyb20gJy4vQ29tcG9uZW50cy9TZXR0aW5ncyc7XG5cbmNvbnN0IG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xuY29uc3QgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcbmNvbnN0IHt0cmFuc2xhdGlvbn0gPSBtb2RKc29uUmVuZGVyO1xuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPFNldHRpbmdzIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn0gLz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0xpc3RJdGVtID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9MaXN0SXRlbVwiKSk7XG5cbnZhciBfcmVjdXJzaXZlSXRlcmF0b3IgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJyZWN1cnNpdmUtaXRlcmF0b3JcIikpO1xuXG52YXIgX29iamVjdFBhdGggPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCJvYmplY3QtcGF0aFwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9yZWFkT25seUVycm9yKG5hbWUpIHsgdGhyb3cgbmV3IEVycm9yKFwiXFxcIlwiICsgbmFtZSArIFwiXFxcIiBpcyByZWFkLW9ubHlcIik7IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnR5KG9iaiwga2V5LCB2YWx1ZSkgeyBpZiAoa2V5IGluIG9iaikgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHsgdmFsdWU6IHZhbHVlLCBlbnVtZXJhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHdyaXRhYmxlOiB0cnVlIH0pOyB9IGVsc2UgeyBvYmpba2V5XSA9IHZhbHVlOyB9IHJldHVybiBvYmo7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbnZhciBEYXRhTGlzdCA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoRGF0YUxpc3QsIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIERhdGFMaXN0KCkge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICByZXR1cm4gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKERhdGFMaXN0KS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhEYXRhTGlzdCwgW3tcbiAgICBrZXk6IFwic2V0RmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0RmllbGRNYXAocGF0aCwgZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKF9kZWZpbmVQcm9wZXJ0eSh7fSwgZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGQsIHBhdGgpKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyTm9kZXNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRhdGEpLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpZiAoaXRlbSA9PT0gJ29iamVjdFBhdGgnKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoaWxkID0gUmVhY3QuY3JlYXRlRWxlbWVudChfTGlzdEl0ZW0uZGVmYXVsdCwge1xuICAgICAgICAgIGtleTogaXRlbS50b1N0cmluZygpLFxuICAgICAgICAgIHZhbHVlOiBpdGVtLFxuICAgICAgICAgIG9iamVjdDogZGF0YVtpdGVtXSxcbiAgICAgICAgICBmaWVsZE1hcDogX3RoaXMucHJvcHMuZmllbGRNYXAsXG4gICAgICAgICAgb25DbGlja0NvbnRhaW5lcjogZnVuY3Rpb24gb25DbGlja0NvbnRhaW5lcihlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uQ2xpY2tUaXRsZTogZnVuY3Rpb24gb25DbGlja1RpdGxlKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uQ2xpY2tDb250ZW50OiBmdW5jdGlvbiBvbkNsaWNrQ29udGVudChlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB0cmFuc2xhdGlvbjogX3RoaXMucHJvcHMudHJhbnNsYXRpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKF90eXBlb2YoZGF0YVtpdGVtXSkgPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgY2hpbGRyZW46IEFycmF5LmlzQXJyYXkoZGF0YVtpdGVtXSkgPyBfdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IF90aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBfdGhpcyRwcm9wcyA9IHRoaXMucHJvcHMsXG4gICAgICAgICAgdHJhbnNsYXRpb24gPSBfdGhpcyRwcm9wcy50cmFuc2xhdGlvbixcbiAgICAgICAgICBkYXRhID0gX3RoaXMkcHJvcHMuZGF0YTtcbiAgICAgIHZhciBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICBkYXRhID0gKF9yZWFkT25seUVycm9yKFwiZGF0YVwiKSwgZGF0YVswXSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IHRydWU7XG4gICAgICAgIHZhciBfZGlkSXRlcmF0b3JFcnJvciA9IGZhbHNlO1xuICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IgPSBuZXcgX3JlY3Vyc2l2ZUl0ZXJhdG9yLmRlZmF1bHQoZGF0YSlbU3ltYm9sLml0ZXJhdG9yXSgpLCBfc3RlcDsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gKF9zdGVwID0gX2l0ZXJhdG9yLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlKSB7XG4gICAgICAgICAgICB2YXIgX3N0ZXAkdmFsdWUgPSBfc3RlcC52YWx1ZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBfc3RlcCR2YWx1ZS5wYXJlbnQsXG4gICAgICAgICAgICAgICAgbm9kZSA9IF9zdGVwJHZhbHVlLm5vZGUsXG4gICAgICAgICAgICAgICAga2V5ID0gX3N0ZXAkdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgIHBhdGggPSBfc3RlcCR2YWx1ZS5wYXRoO1xuXG4gICAgICAgICAgICBpZiAoX3R5cGVvZihub2RlKSA9PT0gJ29iamVjdCcgJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICB2YXIgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuXG4gICAgICAgICAgICAgIF9vYmplY3RQYXRoLmRlZmF1bHQuc2V0KGRhdGEsIHBhdGhTdHJpbmcgKyAnLm9iamVjdFBhdGgnLCBwYXRoU3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIF9kaWRJdGVyYXRvckVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBfaXRlcmF0b3JFcnJvciA9IGVycjtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uICYmIF9pdGVyYXRvci5yZXR1cm4gIT0gbnVsbCkge1xuICAgICAgICAgICAgICBfaXRlcmF0b3IucmV0dXJuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcikge1xuICAgICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaDNcIiwgbnVsbCwgdHJhbnNsYXRpb24uc2VsZWN0SXRlbXNDb250YWluZXIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJqc29uLXRyZWVcIlxuICAgICAgICB9LCB0aGlzLnJlbmRlck5vZGVzKGRhdGEpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgb2JqZWN0RGF0YSA9IF9vYmplY3RQYXRoLmRlZmF1bHQuZ2V0KGRhdGEsIGZpZWxkTWFwLml0ZW1Db250YWluZXIpO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgb2JqZWN0RGF0YSA9IG9iamVjdERhdGFbMF07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlO1xuICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IyID0gZmFsc2U7XG4gICAgICAgIHZhciBfaXRlcmF0b3JFcnJvcjIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBmb3IgKHZhciBfaXRlcmF0b3IyID0gbmV3IF9yZWN1cnNpdmVJdGVyYXRvci5kZWZhdWx0KG9iamVjdERhdGEpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXAyOyAhKF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gKF9zdGVwMiA9IF9pdGVyYXRvcjIubmV4dCgpKS5kb25lKTsgX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbjIgPSB0cnVlKSB7XG4gICAgICAgICAgICB2YXIgX3N0ZXAyJHZhbHVlID0gX3N0ZXAyLnZhbHVlLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IF9zdGVwMiR2YWx1ZS5wYXJlbnQsXG4gICAgICAgICAgICAgICAgbm9kZSA9IF9zdGVwMiR2YWx1ZS5ub2RlLFxuICAgICAgICAgICAgICAgIGtleSA9IF9zdGVwMiR2YWx1ZS5rZXksXG4gICAgICAgICAgICAgICAgcGF0aCA9IF9zdGVwMiR2YWx1ZS5wYXRoO1xuXG4gICAgICAgICAgICBpZiAoX3R5cGVvZihub2RlKSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgdmFyIF9wYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG5cbiAgICAgICAgICAgICAgX29iamVjdFBhdGguZGVmYXVsdC5zZXQob2JqZWN0RGF0YSwgX3BhdGhTdHJpbmcsIF9wYXRoU3RyaW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIF9kaWRJdGVyYXRvckVycm9yMiA9IHRydWU7XG4gICAgICAgICAgX2l0ZXJhdG9yRXJyb3IyID0gZXJyO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIV9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yICYmIF9pdGVyYXRvcjIucmV0dXJuICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgX2l0ZXJhdG9yMi5yZXR1cm4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKF9kaWRJdGVyYXRvckVycm9yMikge1xuICAgICAgICAgICAgICB0aHJvdyBfaXRlcmF0b3JFcnJvcjI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImgzXCIsIG51bGwsIHRyYW5zbGF0aW9uLnNlbGVjdFRpdGxlQ29udGVudCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcImpzb24tdHJlZVwiXG4gICAgICAgIH0sIHRoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gRGF0YUxpc3Q7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IERhdGFMaXN0O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9MaXN0SXRlbVwiOjcsXCJvYmplY3QtcGF0aFwiOjEsXCJyZWN1cnNpdmUtaXRlcmF0b3JcIjoyfV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9EYXRhTGlzdCA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRGF0YUxpc3RcIikpO1xuXG52YXIgX2dldEFwaURhdGEgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG52YXIgRmllbGRTZWxlY3Rpb24gPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKEZpZWxkU2VsZWN0aW9uLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBGaWVsZFNlbGVjdGlvbihwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBGaWVsZFNlbGVjdGlvbik7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihGaWVsZFNlbGVjdGlvbikuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgZXJyb3I6IG51bGwsXG4gICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICBpdGVtczogW11cbiAgICB9O1xuICAgIF90aGlzLnVwZGF0ZUZpZWxkTWFwID0gX3RoaXMudXBkYXRlRmllbGRNYXAuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKEZpZWxkU2VsZWN0aW9uLCBbe1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImdldERhdGFcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0RGF0YSgpIHtcbiAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICB2YXIgX3RoaXMkcHJvcHMgPSB0aGlzLnByb3BzLFxuICAgICAgICAgIHVybCA9IF90aGlzJHByb3BzLnVybCxcbiAgICAgICAgICB0cmFuc2xhdGlvbiA9IF90aGlzJHByb3BzLnRyYW5zbGF0aW9uO1xuICAgICAgKDAsIF9nZXRBcGlEYXRhLmRlZmF1bHQpKHVybCkudGhlbihmdW5jdGlvbiAoX3JlZikge1xuICAgICAgICB2YXIgcmVzdWx0ID0gX3JlZi5yZXN1bHQ7XG5cbiAgICAgICAgaWYgKCFyZXN1bHQgfHwgT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgICAgZXJyb3I6IEVycm9yKHRyYW5zbGF0aW9uLmNvdWxkTm90RmV0Y2gpLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IHRydWVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMi5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgaXRlbXM6IHJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgIH0sIGZ1bmN0aW9uIChfcmVmMikge1xuICAgICAgICB2YXIgZXJyb3IgPSBfcmVmMi5lcnJvcjtcblxuICAgICAgICBfdGhpczIuc2V0U3RhdGUoe1xuICAgICAgICAgIGlzTG9hZGVkOiB0cnVlLFxuICAgICAgICAgIGVycm9yOiBlcnJvclxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuZ2V0RGF0YSgpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIF90aGlzJHByb3BzMiA9IHRoaXMucHJvcHMsXG4gICAgICAgICAgdXJsID0gX3RoaXMkcHJvcHMyLnVybCxcbiAgICAgICAgICBmaWVsZE1hcCA9IF90aGlzJHByb3BzMi5maWVsZE1hcCxcbiAgICAgICAgICB0cmFuc2xhdGlvbiA9IF90aGlzJHByb3BzMi50cmFuc2xhdGlvbjtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSA9IHRoaXMuc3RhdGUsXG4gICAgICAgICAgZXJyb3IgPSBfdGhpcyRzdGF0ZS5lcnJvcixcbiAgICAgICAgICBpc0xvYWRlZCA9IF90aGlzJHN0YXRlLmlzTG9hZGVkLFxuICAgICAgICAgIGl0ZW1zID0gX3RoaXMkc3RhdGUuaXRlbXM7XG5cbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcIm5vdGljZSBub3RpY2UtZXJyb3IgaW5saW5lXCJcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgZXJyb3IubWVzc2FnZSkpO1xuICAgICAgfSBlbHNlIGlmICghaXNMb2FkZWQpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJzcGlubmVyIGlzLWFjdGl2ZVwiXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0RhdGFMaXN0LmRlZmF1bHQsIHtcbiAgICAgICAgICBkYXRhOiBpdGVtcyxcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBmaWVsZE1hcDogZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXAsXG4gICAgICAgICAgdHJhbnNsYXRpb246IHRyYW5zbGF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBGaWVsZFNlbGVjdGlvbjtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRmllbGRTZWxlY3Rpb247XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiOjExLFwiLi9EYXRhTGlzdFwiOjR9XSw2OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgSW5wdXRGaWVsZHMgPSBmdW5jdGlvbiBJbnB1dEZpZWxkcyhfcmVmKSB7XG4gIHZhciBmaWVsZE1hcCA9IF9yZWYuZmllbGRNYXAsXG4gICAgICB1cmwgPSBfcmVmLnVybDtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcImhpZGRlblwiLFxuICAgIG5hbWU6IFwibW9kX2pzb25fcmVuZGVyX3VybFwiLFxuICAgIHZhbHVlOiB1cmxcbiAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiLFxuICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShmaWVsZE1hcClcbiAgfSkpO1xufTtcblxudmFyIF9kZWZhdWx0ID0gSW5wdXRGaWVsZHM7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIExpc3RJdGVtID0gZnVuY3Rpb24gTGlzdEl0ZW0oX3JlZikge1xuICB2YXIgdmFsdWUgPSBfcmVmLnZhbHVlLFxuICAgICAgY2hpbGRyZW4gPSBfcmVmLmNoaWxkcmVuLFxuICAgICAgZmllbGRNYXAgPSBfcmVmLmZpZWxkTWFwLFxuICAgICAgb2JqZWN0ID0gX3JlZi5vYmplY3QsXG4gICAgICBvbkNsaWNrVGl0bGUgPSBfcmVmLm9uQ2xpY2tUaXRsZSxcbiAgICAgIG9uQ2xpY2tDb250ZW50ID0gX3JlZi5vbkNsaWNrQ29udGVudCxcbiAgICAgIG9uQ2xpY2tDb250YWluZXIgPSBfcmVmLm9uQ2xpY2tDb250YWluZXIsXG4gICAgICB0cmFuc2xhdGlvbiA9IF9yZWYudHJhbnNsYXRpb247XG5cbiAgaWYgKGNoaWxkcmVuKSB7XG4gICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICAgIGNsYXNzTmFtZTogXCJkYXNoaWNvbnMgZGFzaGljb25zLXBvcnRmb2xpb1wiXG4gICAgfSksIFwiIFwiLCB2YWx1ZSwgXCIgXCIsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgY2xhc3NOYW1lOiBcInRyZWUtc2VsZWN0XCIsXG4gICAgICBcImRhdGEtZmllbGRcIjogXCJpdGVtQ29udGFpbmVyXCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGFpbmVyXG4gICAgfSwgdHJhbnNsYXRpb24uc2VsZWN0KSkgOiBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCB2YWx1ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCBudWxsLCBjaGlsZHJlbikpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCAmJiBmaWVsZE1hcC50aXRsZSA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgdHJhbnNsYXRpb24udGl0bGUsIFwiOiBcIikgOiAnJywgZmllbGRNYXAuY29udGVudCA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLmNvbnRlbnQgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHRyYW5zbGF0aW9uLmNvbnRlbnQsIFwiOiBcIikgOiAnJywgUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCAhZmllbGRNYXAudGl0bGUgJiYgZmllbGRNYXAuY29udGVudCAhPT0gb2JqZWN0ICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICBocmVmOiBcIiNcIixcbiAgICAgIGNsYXNzTmFtZTogXCJ0cmVlLXNlbGVjdFwiLFxuICAgICAgXCJkYXRhLWZpZWxkXCI6IFwidGl0bGVcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tUaXRsZVxuICAgIH0sIHRyYW5zbGF0aW9uLnRpdGxlKSA6ICcnLCAhZmllbGRNYXAuY29udGVudCAmJiBmaWVsZE1hcC50aXRsZSAhPT0gb2JqZWN0ICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICBocmVmOiBcIiNcIixcbiAgICAgIGNsYXNzTmFtZTogXCJ0cmVlLXNlbGVjdFwiLFxuICAgICAgXCJkYXRhLWZpZWxkXCI6IFwiY29udGVudFwiLFxuICAgICAgb25DbGljazogb25DbGlja0NvbnRlbnRcbiAgICB9LCB0cmFuc2xhdGlvbi5jb250ZW50KSA6ICcnKTtcbiAgfVxufTtcblxudmFyIF9kZWZhdWx0ID0gTGlzdEl0ZW07XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9GaWVsZFNlbGVjdGlvbiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRmllbGRTZWxlY3Rpb25cIikpO1xuXG52YXIgX0lucHV0RmllbGRzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9JbnB1dEZpZWxkc1wiKSk7XG5cbnZhciBfU3VtbWFyeSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vU3VtbWFyeVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9leHRlbmRzKCkgeyBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07IHJldHVybiBfZXh0ZW5kcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgU2V0dGluZ3MgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKFNldHRpbmdzLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBTZXR0aW5ncyhwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBTZXR0aW5ncyk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihTZXR0aW5ncykuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgIHVybDogJycsXG4gICAgICBmaWVsZE1hcDoge1xuICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICB0aXRsZTogJycsXG4gICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoU2V0dGluZ3MsIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbml0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0T3B0aW9ucygpIHtcbiAgICAgIGlmICh0eXBlb2YgbW9kSnNvblJlbmRlci5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IG1vZEpzb25SZW5kZXIub3B0aW9ucztcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVybENoYW5nZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB1cmw6IGV2ZW50LnRhcmdldC52YWx1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImhhbmRsZVN1Ym1pdFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVzZXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICB1cmw6ICcnLFxuICAgICAgICBmaWVsZE1hcDoge1xuICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdmFyIG5ld1ZhbCA9IE9iamVjdC5hc3NpZ24odGhpcy5zdGF0ZS5maWVsZE1hcCwgdmFsdWUpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGZpZWxkTWFwOiBuZXdWYWxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy5wcm9wcy50cmFuc2xhdGlvbjtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSA9IHRoaXMuc3RhdGUsXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uID0gX3RoaXMkc3RhdGUuc2hvd0ZpZWxkU2VsZWN0aW9uLFxuICAgICAgICAgIHVybCA9IF90aGlzJHN0YXRlLnVybDtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSRmaWVsZE1hcCA9IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgaXRlbUNvbnRhaW5lciA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLml0ZW1Db250YWluZXIsXG4gICAgICAgICAgdGl0bGUgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC50aXRsZSxcbiAgICAgICAgICBjb250ZW50ID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuY29udGVudDtcblxuICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChfU3VtbWFyeS5kZWZhdWx0LCBfZXh0ZW5kcyh7fSwgdGhpcy5zdGF0ZSwge1xuICAgICAgICAgIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvblxuICAgICAgICB9KSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgaHJlZjogXCIjXCIsXG4gICAgICAgICAgb25DbGljazogdGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKSxcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uXCJcbiAgICAgICAgfSwgdHJhbnNsYXRpb24ucmVzZXRTZXR0aW5ncykpKTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0ZpZWxkU2VsZWN0aW9uLmRlZmF1bHQsIHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBmaWVsZE1hcDogdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICB1cGRhdGVGaWVsZE1hcDogdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpLFxuICAgICAgICAgIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvblxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucy5iaW5kKHRoaXMpLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCB0cmFuc2xhdGlvbi5yZXNldFNldHRpbmdzKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJ3cmFwXCJcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImZvcm1cIiwge1xuICAgICAgICAgIG9uU3VibWl0OiB0aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKHRoaXMpXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiQVBJIFVSTFwiKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwgbnVsbCwgdHJhbnNsYXRpb24udmFsaWRKc29uVXJsKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcInVybC1pbnB1dFwiLFxuICAgICAgICAgIHZhbHVlOiB1cmwsXG4gICAgICAgICAgb25DaGFuZ2U6IHRoaXMudXJsQ2hhbmdlLmJpbmQodGhpcylcbiAgICAgICAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgICAgICAgdHlwZTogXCJzdWJtaXRcIixcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIsXG4gICAgICAgICAgdmFsdWU6IHRyYW5zbGF0aW9uLnNlbmRSZXF1ZXN0XG4gICAgICAgIH0pKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gU2V0dGluZ3M7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IFNldHRpbmdzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9GaWVsZFNlbGVjdGlvblwiOjUsXCIuL0lucHV0RmllbGRzXCI6NixcIi4vU3VtbWFyeVwiOjl9XSw5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgU3VtbWFyeSA9IGZ1bmN0aW9uIFN1bW1hcnkoX3JlZikge1xuICB2YXIgdXJsID0gX3JlZi51cmwsXG4gICAgICBmaWVsZE1hcCA9IF9yZWYuZmllbGRNYXAsXG4gICAgICB0cmFuc2xhdGlvbiA9IF9yZWYudHJhbnNsYXRpb247XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJBUEkgVVJMXCIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnJcIiwgbnVsbCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiB1cmwsXG4gICAgdGFyZ2V0OiBcIl9ibGFua1wiXG4gIH0sIHVybCkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHRyYW5zbGF0aW9uLnRpdGxlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBmaWVsZE1hcC50aXRsZS5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCB0cmFuc2xhdGlvbi5jb250ZW50KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBmaWVsZE1hcC5jb250ZW50LnJlcGxhY2UoJy4nLCAnIOKAkz4gJykpKTtcbn07XG5cbnZhciBfZGVmYXVsdCA9IFN1bW1hcnk7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sMTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfU2V0dGluZ3MgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG52YXIgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcbnZhciBfbW9kSnNvblJlbmRlciA9IG1vZEpzb25SZW5kZXIsXG4gICAgdHJhbnNsYXRpb24gPSBfbW9kSnNvblJlbmRlci50cmFuc2xhdGlvbjtcblJlYWN0RE9NLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KF9TZXR0aW5ncy5kZWZhdWx0LCB7XG4gIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvblxufSksIGRvbUVsZW1lbnQpO1xuXG59LHtcIi4vQ29tcG9uZW50cy9TZXR0aW5nc1wiOjh9XSwxMTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gZ2V0QXBpRGF0YSh1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybCkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN1bHQ6IHJlc3VsdFxuICAgIH07XG4gIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjogZXJyb3JcbiAgICB9O1xuICB9KTtcbn1cblxudmFyIF9kZWZhdWx0ID0gZ2V0QXBpRGF0YTtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XX0se30sWzEwXSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmIySnFaV04wTFhCaGRHZ3ZhVzVrWlhndWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmNtVmpkWEp6YVhabExXbDBaWEpoZEc5eUwzTnlZeTlTWldOMWNuTnBkbVZKZEdWeVlYUnZjaTVxY3lJc0ltNXZaR1ZmYlc5a2RXeGxjeTl5WldOMWNuTnBkbVV0YVhSbGNtRjBiM0l2YzNKakwyeGhibWN1YW5NaUxDSnpiM1Z5WTJVdmFuTXZRV1J0YVc0dlEyOXRjRzl1Wlc1MGN5OUVZWFJoVEdsemRDNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlEYjIxd2IyNWxiblJ6TDBacFpXeGtVMlZzWldOMGFXOXVMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlNXNXdkWFJHYVdWc1pITXVhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5TWFYTjBTWFJsYlM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMU5sZEhScGJtZHpMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlUzVnRiV0Z5ZVM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOUpibVJsZUVGa2JXbHVMbXB6SWl3aWMyOTFjbU5sTDJwekwxVjBhV3hwZEdsbGN5OW5aWFJCY0dsRVlYUmhMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVTndVMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOeVNVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPenM3T3pzN096dEJReTlFUVRzN1FVRkRRVHM3UVVGRFFUczdPenM3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN1NVRkZUU3hST3pzN096czdPenM3T3pzN08yZERRVU5WTEVrc1JVRkJUU3hMTEVWQlFVODdRVUZEY2tJc1RVRkJRU3hMUVVGTExFTkJRVU1zWTBGQlRqdEJRVU5CTEZkQlFVc3NTMEZCVEN4RFFVRlhMR05CUVZnc2NVSkJRVFJDTEV0QlFVc3NRMEZCUXl4TlFVRk9MRU5CUVdFc1QwRkJZaXhEUVVGeFFpeExRVUZxUkN4RlFVRjVSQ3hKUVVGNlJEdEJRVU5JT3pzN1owTkJSVmNzU1N4RlFVRk5PMEZCUVVFN08wRkJRMlFzWVVGQlR5eE5RVUZOTEVOQlFVTXNTVUZCVUN4RFFVRlpMRWxCUVZvc1JVRkJhMElzUjBGQmJFSXNRMEZCYzBJc1ZVRkJRU3hKUVVGSkxFVkJRVWs3UVVGRGFrTXNXVUZCU1N4SlFVRkpMRXRCUVVzc1dVRkJZaXhGUVVFeVFqdEJRVU4yUWp0QlFVTklPenRCUVVWRUxGbEJRVWtzUzBGQlN5eEhRVUZITEc5Q1FVRkRMR2xDUVVGRU8wRkJRVlVzVlVGQlFTeEhRVUZITEVWQlFVVXNTVUZCU1N4RFFVRkRMRkZCUVV3c1JVRkJaanRCUVVOVkxGVkJRVUVzUzBGQlN5eEZRVUZGTEVsQlJHcENPMEZCUlZVc1ZVRkJRU3hOUVVGTkxFVkJRVVVzU1VGQlNTeERRVUZETEVsQlFVUXNRMEZHZEVJN1FVRkhWU3hWUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZKTEVOQlFVTXNTMEZCVEN4RFFVRlhMRkZCU0M5Q08wRkJTVlVzVlVGQlFTeG5Ra0ZCWjBJc1JVRkJSU3d3UWtGQlFTeERRVUZETzBGQlFVRXNiVUpCUVVrc1MwRkJTU3hEUVVGRExGZEJRVXdzUTBGQmFVSXNTVUZCU1N4RFFVRkRMRWxCUVVRc1EwRkJTaXhEUVVGWExGVkJRVFZDTEVWQlFYZERMRU5CUVhoRExFTkJRVW83UVVGQlFTeFhRVW8zUWp0QlFVdFZMRlZCUVVFc1dVRkJXU3hGUVVGRkxITkNRVUZCTEVOQlFVTTdRVUZCUVN4dFFrRkJTU3hMUVVGSkxFTkJRVU1zVjBGQlRDeERRVUZwUWl4SlFVRkpMRU5CUVVNc1NVRkJSQ3hEUVVGeVFpeEZRVUUyUWl4RFFVRTNRaXhEUVVGS08wRkJRVUVzVjBGTWVrSTdRVUZOVlN4VlFVRkJMR05CUVdNc1JVRkJSU3gzUWtGQlFTeERRVUZETzBGQlFVRXNiVUpCUVVrc1MwRkJTU3hEUVVGRExGZEJRVXdzUTBGQmFVSXNTVUZCU1N4RFFVRkRMRWxCUVVRc1EwRkJja0lzUlVGQk5rSXNRMEZCTjBJc1EwRkJTanRCUVVGQkxGZEJUak5DTzBGQlQxVXNWVUZCUVN4WFFVRlhMRVZCUVVVc1MwRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ6dEJRVkJzUXl4VlFVRmFPenRCUVZOQkxGbEJRVWtzVVVGQlR5eEpRVUZKTEVOQlFVTXNTVUZCUkN4RFFVRllMRTFCUVhOQ0xGRkJRWFJDTEVsQlFXdERMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUzBGQlpTeEpRVUZ5UkN4RlFVRXlSRHRCUVVOMlJDeFZRVUZCTEV0QlFVc3NSMEZCUnl4TFFVRkxMRU5CUVVNc1dVRkJUaXhEUVVGdFFpeExRVUZ1UWl4RlFVRXdRanRCUVVNNVFpeFpRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRU5CUVVNc1QwRkJUaXhEUVVGakxFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFXeENMRWxCUVRSQ0xFdEJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRVW9zUTBGQlZ5eERRVUZZTEVOQlFXcENMRU5CUVRWQ0xFZEJRVGhFTEV0QlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFYSkNPMEZCUkRGRExGZEJRVEZDTEVOQlFWSTdRVUZIU0RzN1FVRkZSQ3hsUVVGUExFdEJRVkE3UVVGRFNDeFBRWEpDVFN4RFFVRlFPMEZCYzBKSU96czdOa0pCUlZFN1FVRkJRU3gzUWtGRGRVSXNTMEZCU3l4TFFVUTFRanRCUVVGQkxGVkJRMFVzVjBGRVJpeGxRVU5GTEZkQlJFWTdRVUZCUVN4VlFVTmxMRWxCUkdZc1pVRkRaU3hKUVVSbU8wRkJSVXdzVlVGQlRTeFJRVUZSTEVkQlFVY3NTMEZCU3l4TFFVRk1MRU5CUVZjc1VVRkJOVUk3TzBGQlJVRXNWVUZCU1N4TFFVRkxMRU5CUVVNc1QwRkJUaXhEUVVGakxFbEJRV1FzUTBGQlNpeEZRVUY1UWp0QlFVTnlRaXhSUVVGQkxGRkJRVkVzUTBGQlF5eGhRVUZVTEVkQlFYbENMRVZCUVhwQ08wRkJRMGc3TzBGQlJVUXNWVUZCU1N4UlFVRlJMRU5CUVVNc1lVRkJWQ3hMUVVFeVFpeEpRVUV2UWl4RlFVRnhRenRCUVVOcVF5eFpRVUZKTEV0QlFVc3NRMEZCUXl4UFFVRk9MRU5CUVdNc1NVRkJaQ3hEUVVGS0xFVkJRWGxDTzBGQlEzSkNMRlZCUVVFc1NVRkJTU3cwUWtGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUkN4RFFVRlFMRU5CUVVvN1FVRkRTRHM3UVVGSVowTTdRVUZCUVR0QlFVRkJPenRCUVVGQk8wRkJTMnBETEN0Q1FVRnpReXhKUVVGSkxEQkNRVUZLTEVOQlFYTkNMRWxCUVhSQ0xFTkJRWFJETERoSVFVRnRSVHRCUVVGQk8wRkJRVUVzWjBKQlFYcEVMRTFCUVhsRUxHVkJRWHBFTEUxQlFYbEVPMEZCUVVFc1owSkJRV3BFTEVsQlFXbEVMR1ZCUVdwRUxFbEJRV2xFTzBGQlFVRXNaMEpCUVRORExFZEJRVEpETEdWQlFUTkRMRWRCUVRKRE8wRkJRVUVzWjBKQlFYUkRMRWxCUVhORExHVkJRWFJETEVsQlFYTkRPenRCUVVNdlJDeG5Ra0ZCU1N4UlFVRlBMRWxCUVZBc1RVRkJaMElzVVVGQmFFSXNTVUZCTkVJc1NVRkJTU3hMUVVGTExFbEJRWHBETEVWQlFTdERPMEZCUXpORExHdENRVUZKTEZWQlFWVXNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJUQ3hEUVVGVkxFZEJRVllzUTBGQmFrSTdPMEZCUTBFc2EwTkJRVmNzUjBGQldDeERRVUZsTEVsQlFXWXNSVUZCY1VJc1ZVRkJWU3hIUVVGSExHRkJRV3hETEVWQlFXbEVMRlZCUVdwRU8wRkJRMGc3UVVGRFNqdEJRVlpuUXp0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk96dEJRVmxxUXl4bFFVTkpMR2xEUVVOSkxHZERRVUZMTEZkQlFWY3NRMEZCUXl4dlFrRkJha0lzUTBGRVNpeEZRVVZKTzBGQlFVa3NWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJaQ3hYUVVFeVFpeExRVUZMTEZkQlFVd3NRMEZCYVVJc1NVRkJha0lzUTBGQk0wSXNRMEZHU2l4RFFVUktPMEZCVFVnc1QwRnNRa1FzVFVGclFrODdRVUZEU0N4WlFVRkpMRlZCUVZVc1IwRkJSeXh2UWtGQlZ5eEhRVUZZTEVOQlFXVXNTVUZCWml4RlFVRnhRaXhSUVVGUkxFTkJRVU1zWVVGQk9VSXNRMEZCYWtJN08wRkJSVUVzV1VGQlNTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRlZCUVdRc1EwRkJTaXhGUVVFclFqdEJRVU16UWl4VlFVRkJMRlZCUVZVc1IwRkJSeXhWUVVGVkxFTkJRVU1zUTBGQlJDeERRVUYyUWp0QlFVTklPenRCUVV4Rk8wRkJRVUU3UVVGQlFUczdRVUZCUVR0QlFVOUlMR2REUVVGelF5eEpRVUZKTERCQ1FVRktMRU5CUVhOQ0xGVkJRWFJDTEVOQlFYUkRMRzFKUVVGNVJUdEJRVUZCTzBGQlFVRXNaMEpCUVM5RUxFMUJRU3RFTEdkQ1FVRXZSQ3hOUVVFclJEdEJRVUZCTEdkQ1FVRjJSQ3hKUVVGMVJDeG5Ra0ZCZGtRc1NVRkJkVVE3UVVGQlFTeG5Ra0ZCYWtRc1IwRkJhVVFzWjBKQlFXcEVMRWRCUVdsRU8wRkJRVUVzWjBKQlFUVkRMRWxCUVRSRExHZENRVUUxUXl4SlFVRTBRenM3UVVGRGNrVXNaMEpCUVVrc1VVRkJUeXhKUVVGUUxFMUJRV2RDTEZGQlFYQkNMRVZCUVRoQ08wRkJRekZDTEd0Q1FVRkpMRmRCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlRDeERRVUZWTEVkQlFWWXNRMEZCYWtJN08wRkJRMEVzYTBOQlFWY3NSMEZCV0N4RFFVRmxMRlZCUVdZc1JVRkJNa0lzVjBGQk0wSXNSVUZCZFVNc1YwRkJka003UVVGRFNEdEJRVU5LTzBGQldrVTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHM3UVVGalNDeGxRVU5KTEdsRFFVTkpMR2REUVVGTExGZEJRVmNzUTBGQlF5eHJRa0ZCYWtJc1EwRkVTaXhGUVVWSk8wRkJRVWtzVlVGQlFTeFRRVUZUTEVWQlFVTTdRVUZCWkN4WFFVRXlRaXhMUVVGTExGZEJRVXdzUTBGQmFVSXNWVUZCYWtJc1EwRkJNMElzUTBGR1NpeERRVVJLTzBGQlRVZzdRVUZEU2pzN096dEZRVGxGYTBJc1MwRkJTeXhEUVVGRExGTTdPMlZCYVVaa0xGRTdPenM3T3pzN096czdPMEZEY2tabU96dEJRVU5CT3pzN096czdPenM3T3pzN096czdPenM3T3pzN08wbEJSVTBzWXpzN096czdRVUZEUml3d1FrRkJXU3hMUVVGYUxFVkJRVzFDTzBGQlFVRTdPMEZCUVVFN08wRkJRMllzZDBaQlFVMHNTMEZCVGp0QlFVTkJMRlZCUVVzc1MwRkJUQ3hIUVVGaE8wRkJRMVFzVFVGQlFTeExRVUZMTEVWQlFVVXNTVUZFUlR0QlFVVlVMRTFCUVVFc1VVRkJVU3hGUVVGRkxFdEJSa1E3UVVGSFZDeE5RVUZCTEV0QlFVc3NSVUZCUlR0QlFVaEZMRXRCUVdJN1FVRk5RU3hWUVVGTExHTkJRVXdzUjBGQmMwSXNUVUZCU3l4alFVRk1MRU5CUVc5Q0xFbEJRWEJDTEhWRVFVRjBRanRCUVZKbE8wRkJVMnhDT3pzN08yMURRVVZqTEVzc1JVRkJUenRCUVVOc1FpeFhRVUZMTEV0QlFVd3NRMEZCVnl4alFVRllMRU5CUVRCQ0xFdEJRVEZDTzBGQlEwZzdPenM0UWtGRlV6dEJRVUZCT3p0QlFVRkJMSGRDUVVOeFFpeExRVUZMTEV0QlJERkNPMEZCUVVFc1ZVRkRReXhIUVVSRUxHVkJRME1zUjBGRVJEdEJRVUZCTEZWQlEwMHNWMEZFVGl4bFFVTk5MRmRCUkU0N1FVRkZUaXdyUWtGQlZ5eEhRVUZZTEVWQlEwc3NTVUZFVEN4RFFVVlJMR2RDUVVGak8wRkJRVUVzV1VGQldpeE5RVUZaTEZGQlFWb3NUVUZCV1RzN1FVRkRWaXhaUVVGSkxFTkJRVU1zVFVGQlJDeEpRVUZYTEUxQlFVMHNRMEZCUXl4SlFVRlFMRU5CUVZrc1RVRkJXaXhGUVVGdlFpeE5RVUZ3UWl4TFFVRXJRaXhEUVVFNVF5eEZRVUZwUkR0QlFVTTNReXhWUVVGQkxFMUJRVWtzUTBGQlF5eFJRVUZNTEVOQlFXTTdRVUZEVml4WlFVRkJMRXRCUVVzc1JVRkJSU3hMUVVGTExFTkJRVU1zVjBGQlZ5eERRVUZETEdGQlFXSXNRMEZFUmp0QlFVVldMRmxCUVVFc1VVRkJVU3hGUVVGRk8wRkJSa0VzVjBGQlpEczdRVUZKUVR0QlFVTklPenRCUVVORUxGRkJRVUVzVFVGQlNTeERRVUZETEZGQlFVd3NRMEZCWXp0QlFVRkRMRlZCUVVFc1VVRkJVU3hGUVVGRkxFbEJRVmc3UVVGQmFVSXNWVUZCUVN4TFFVRkxMRVZCUVVVN1FVRkJlRUlzVTBGQlpEdEJRVU5JTEU5QldGUXNSVUZYVnl4cFFrRkJZVHRCUVVGQkxGbEJRVmdzUzBGQlZ5eFRRVUZZTEV0QlFWYzdPMEZCUTFvc1VVRkJRU3hOUVVGSkxFTkJRVU1zVVVGQlRDeERRVUZqTzBGQlFVTXNWVUZCUVN4UlFVRlJMRVZCUVVVc1NVRkJXRHRCUVVGcFFpeFZRVUZCTEV0QlFVc3NSVUZCVER0QlFVRnFRaXhUUVVGa08wRkJRMGdzVDBGaVZEdEJRV1ZJT3pzN2QwTkJSVzFDTzBGQlEyaENMRmRCUVVzc1QwRkJURHRCUVVOSU96czdOa0pCUlZFN1FVRkJRU3g1UWtGRFowTXNTMEZCU3l4TFFVUnlRenRCUVVGQkxGVkJRMFVzUjBGRVJpeG5Ra0ZEUlN4SFFVUkdPMEZCUVVFc1ZVRkRUeXhSUVVSUUxHZENRVU5QTEZGQlJGQTdRVUZCUVN4VlFVTnBRaXhYUVVScVFpeG5Ra0ZEYVVJc1YwRkVha0k3UVVGQlFTeDNRa0ZGTkVJc1MwRkJTeXhMUVVacVF6dEJRVUZCTEZWQlJVVXNTMEZHUml4bFFVVkZMRXRCUmtZN1FVRkJRU3hWUVVWVExGRkJSbFFzWlVGRlV5eFJRVVpVTzBGQlFVRXNWVUZGYlVJc1MwRkdia0lzWlVGRmJVSXNTMEZHYmtJN08wRkJSMHdzVlVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVUN4bFFVRlBPMEZCUVVzc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlppeFhRVUUwUXl3clFrRkJTU3hMUVVGTExFTkJRVU1zVDBGQlZpeERRVUUxUXl4RFFVRlFPMEZCUTBnc1QwRkdSQ3hOUVVWUExFbEJRVWtzUTBGQlF5eFJRVUZNTEVWQlFXVTdRVUZEYkVJc1pVRkJUenRCUVVGTExGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFXWXNWVUZCVUR0QlFVTklMRTlCUmswc1RVRkZRVHRCUVVOSUxHVkJRVThzYjBKQlFVTXNhVUpCUVVRN1FVRkRTQ3hWUVVGQkxFbEJRVWtzUlVGQlJTeExRVVJJTzBGQlJVZ3NWVUZCUVN4SFFVRkhMRVZCUVVVc1IwRkdSanRCUVVkSUxGVkJRVUVzVVVGQlVTeEZRVUZGTEZGQlNGQTdRVUZKU0N4VlFVRkJMR05CUVdNc1JVRkJSU3hMUVVGTExHTkJTbXhDTzBGQlMwZ3NWVUZCUVN4WFFVRlhMRVZCUVVVN1FVRk1WaXhWUVVGUU8wRkJUVWc3UVVGRFNqczdPenRGUVhSRWQwSXNTMEZCU3l4RFFVRkRMRk03TzJWQmVVUndRaXhqT3pzN096czdPenM3T3p0QlF6VkVaaXhKUVVGTkxGZEJRVmNzUjBGQlJ5eFRRVUZrTEZkQlFXTTdRVUZCUVN4TlFVRkZMRkZCUVVZc1VVRkJSU3hSUVVGR08wRkJRVUVzVFVGQldTeEhRVUZhTEZGQlFWa3NSMEZCV2p0QlFVRkJMRk5CUTJoQ0xHbERRVU5KTzBGQlFVOHNTVUZCUVN4SlFVRkpMRVZCUVVNc1VVRkJXanRCUVVGeFFpeEpRVUZCTEVsQlFVa3NSVUZCUXl4eFFrRkJNVUk3UVVGQlowUXNTVUZCUVN4TFFVRkxMRVZCUVVVN1FVRkJka1FzU1VGRVNpeEZRVVZKTzBGQlFVOHNTVUZCUVN4SlFVRkpMRVZCUVVNc1VVRkJXanRCUVVGeFFpeEpRVUZCTEVsQlFVa3NSVUZCUXl3d1FrRkJNVUk3UVVGQmNVUXNTVUZCUVN4TFFVRkxMRVZCUVVVc1NVRkJTU3hEUVVGRExGTkJRVXdzUTBGQlpTeFJRVUZtTzBGQlFUVkVMRWxCUmtvc1EwRkVaMEk3UVVGQlFTeERRVUZ3UWpzN1pVRk5aU3hYT3pzN096czdPenM3T3p0QlEwNW1MRWxCUVUwc1VVRkJVU3hIUVVGSExGTkJRVmdzVVVGQlZ5eFBRVUZ6Unp0QlFVRkJMRTFCUVhCSExFdEJRVzlITEZGQlFYQkhMRXRCUVc5SE8wRkJRVUVzVFVGQk4wWXNVVUZCTmtZc1VVRkJOMFlzVVVGQk5rWTdRVUZCUVN4TlFVRnVSaXhSUVVGdFJpeFJRVUZ1Uml4UlFVRnRSanRCUVVGQkxFMUJRWHBGTEUxQlFYbEZMRkZCUVhwRkxFMUJRWGxGTzBGQlFVRXNUVUZCYWtVc1dVRkJhVVVzVVVGQmFrVXNXVUZCYVVVN1FVRkJRU3hOUVVGdVJDeGpRVUZ0UkN4UlFVRnVSQ3hqUVVGdFJEdEJRVUZCTEUxQlFXNURMR2RDUVVGdFF5eFJRVUZ1UXl4blFrRkJiVU03UVVGQlFTeE5RVUZxUWl4WFFVRnBRaXhSUVVGcVFpeFhRVUZwUWpzN1FVRkRia2dzVFVGQlNTeFJRVUZLTEVWQlFXTTdRVUZEVml4WFFVRlJMR2REUVVOSUxFdEJRVXNzUTBGQlF5eFBRVUZPTEVOQlFXTXNUVUZCWkN4TFFVRjVRaXhSUVVGUkxFTkJRVU1zWVVGQlZDeExRVUV5UWl4SlFVRndSQ3hIUVVOSExHdERRVUZOTzBGQlFVMHNUVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJhRUlzVFVGQlRpeFBRVUVyUkN4TFFVRXZSQ3hQUVVGelJUdEJRVUZITEUxQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hOUVVGQkxGTkJRVk1zUlVGQlF5eGhRVUYwUWp0QlFVRnZReXh2UWtGQlZ5eGxRVUV2UXp0QlFVRXJSQ3hOUVVGQkxFOUJRVThzUlVGQlJUdEJRVUY0UlN4UFFVRXlSaXhYUVVGWExFTkJRVU1zVFVGQmRrY3NRMEZCZEVVc1EwRkVTQ3hIUVVOelRTeHJRMEZCVHl4TFFVRlFMRU5CUm01TkxFVkJSMG9zWjBOQlFVc3NVVUZCVEN4RFFVaEpMRU5CUVZJN1FVRkxTQ3hIUVU1RUxFMUJUVTg3UVVGRFNDeFhRVUZSTEdkRFFVTklMRkZCUVZFc1EwRkJReXhMUVVGVUxFdEJRVzFDTEUxQlFXNUNMRWxCUVRaQ0xGRkJRVkVzUTBGQlF5eExRVUYwUXl4SFFVRTRReXh2UTBGQlV5eFhRVUZYTEVOQlFVTXNTMEZCY2tJc1QwRkJPVU1zUjBGQmRVWXNSVUZFY0VZc1JVRkZTQ3hSUVVGUkxFTkJRVU1zVDBGQlZDeExRVUZ4UWl4TlFVRnlRaXhKUVVFclFpeFJRVUZSTEVOQlFVTXNUMEZCZUVNc1IwRkJhMFFzYjBOQlFWTXNWMEZCVnl4RFFVRkRMRTlCUVhKQ0xFOUJRV3hFTEVkQlFUWkdMRVZCUmpGR0xFVkJSMG9zYTBOQlFVOHNTMEZCVUN4RFFVaEpMRVZCU1Vnc1EwRkJReXhSUVVGUkxFTkJRVU1zUzBGQlZpeEpRVUZ2UWl4UlFVRlJMRU5CUVVNc1QwRkJWQ3hMUVVGeFFpeE5RVUY2UXl4SlFVRnZSQ3hSUVVGUkxFTkJRVU1zWVVGQlZDeExRVUV5UWl4SlFVRXZSU3hIUVVOSE8wRkJRVWNzVFVGQlFTeEpRVUZKTEVWQlFVTXNSMEZCVWp0QlFVRlpMRTFCUVVFc1UwRkJVeXhGUVVGRExHRkJRWFJDTzBGQlFXOURMRzlDUVVGWExFOUJRUzlETzBGQlFYVkVMRTFCUVVFc1QwRkJUeXhGUVVGRk8wRkJRV2hGTEU5QlFTdEZMRmRCUVZjc1EwRkJReXhMUVVFelJpeERRVVJJTEVkQlF6SkhMRVZCVEhoSExFVkJUVWdzUTBGQlF5eFJRVUZSTEVOQlFVTXNUMEZCVml4SlFVRnpRaXhSUVVGUkxFTkJRVU1zUzBGQlZDeExRVUZ0UWl4TlFVRjZReXhKUVVGdlJDeFJRVUZSTEVOQlFVTXNZVUZCVkN4TFFVRXlRaXhKUVVFdlJTeEhRVU5ITzBGQlFVY3NUVUZCUVN4SlFVRkpMRVZCUVVNc1IwRkJVanRCUVVGWkxFMUJRVUVzVTBGQlV5eEZRVUZETEdGQlFYUkNPMEZCUVc5RExHOUNRVUZYTEZOQlFTOURPMEZCUVhsRUxFMUJRVUVzVDBGQlR5eEZRVUZGTzBGQlFXeEZMRTlCUVcxR0xGZEJRVmNzUTBGQlF5eFBRVUV2Uml4RFFVUklMRWRCUTJsSUxFVkJVRGxITEVOQlFWSTdRVUZUU0R0QlFVTktMRU5CYkVKRU96dGxRVzlDWlN4Uk96czdPenM3T3pzN096dEJRM0JDWmpzN1FVRkRRVHM3UVVGRFFUczdPenM3T3pzN096czdPenM3T3pzN096czdPenM3TzBsQlJVMHNVVHM3T3pzN1FVRkRSaXh2UWtGQldTeExRVUZhTEVWQlFXMUNPMEZCUVVFN08wRkJRVUU3TzBGQlEyWXNhMFpCUVUwc1MwRkJUanRCUVVOQkxGVkJRVXNzUzBGQlRDeEhRVUZoTzBGQlExUXNUVUZCUVN4clFrRkJhMElzUlVGQlJTeExRVVJZTzBGQlJWUXNUVUZCUVN4SFFVRkhMRVZCUVVVc1JVRkdTVHRCUVVkVUxFMUJRVUVzVVVGQlVTeEZRVUZGTzBGQlEwNHNVVUZCUVN4aFFVRmhMRVZCUVVVc1NVRkVWRHRCUVVWT0xGRkJRVUVzUzBGQlN5eEZRVUZGTEVWQlJrUTdRVUZIVGl4UlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVoSU8wRkJTRVFzUzBGQllqdEJRVVpsTzBGQlYyeENPenM3TzNkRFFVVnRRanRCUVVOb1FpeFhRVUZMTEZkQlFVdzdRVUZEU0RzN08ydERRVVZoTzBGQlExWXNWVUZCU1N4UFFVRlBMR0ZCUVdFc1EwRkJReXhQUVVGeVFpeExRVUZwUXl4WFFVRnlReXhGUVVGclJEdEJRVU01UXl4WlFVRk5MRTlCUVU4c1IwRkJSeXhoUVVGaExFTkJRVU1zVDBGQk9VSTdRVUZEUVN4aFFVRkxMRkZCUVV3c1EwRkJZenRCUVVOV0xGVkJRVUVzUjBGQlJ5eEZRVUZGTEU5QlFVOHNRMEZCUXl4SFFVRlNMRWRCUVdNc1QwRkJUeXhEUVVGRExFZEJRWFJDTEVkQlFUUkNMRVZCUkhaQ08wRkJSVllzVlVGQlFTeFJRVUZSTEVWQlFVVXNUMEZCVHl4RFFVRkRMRkZCUVZJc1IwRkJiVUlzU1VGQlNTeERRVUZETEV0QlFVd3NRMEZCVnl4UFFVRlBMRU5CUVVNc1VVRkJia0lzUTBGQmJrSXNSMEZCYTBRN1FVRkRlRVFzV1VGQlFTeGhRVUZoTEVWQlFVVXNTVUZFZVVNN1FVRkZlRVFzV1VGQlFTeExRVUZMTEVWQlFVVXNSVUZHYVVRN1FVRkhlRVFzV1VGQlFTeFBRVUZQTEVWQlFVVTdRVUZJSzBNc1YwRkdiRVE3UVVGUFZpeFZRVUZCTEd0Q1FVRnJRaXhGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTTdRVUZRY0VJc1UwRkJaRHRCUVZOSU8wRkJRMG83T3pzNFFrRkZVeXhMTEVWQlFVODdRVUZEWWl4WFFVRkxMRkZCUVV3c1EwRkJZenRCUVVGRExGRkJRVUVzUjBGQlJ5eEZRVUZGTEV0QlFVc3NRMEZCUXl4TlFVRk9MRU5CUVdFN1FVRkJia0lzVDBGQlpEdEJRVU5JT3pzN2FVTkJSVmtzU3l4RlFVRlBPMEZCUTJoQ0xFMUJRVUVzUzBGQlN5eERRVUZETEdOQlFVNDdRVUZEUVN4WFFVRkxMRkZCUVV3c1EwRkJZenRCUVVGRExGRkJRVUVzYTBKQlFXdENMRVZCUVVVN1FVRkJja0lzVDBGQlpEdEJRVU5JT3pzN2FVTkJSVmtzU3l4RlFVRlBPMEZCUTJoQ0xFMUJRVUVzUzBGQlN5eERRVUZETEdOQlFVNDdRVUZEUVN4WFFVRkxMRkZCUVV3c1EwRkJZenRCUVVGRExGRkJRVUVzYTBKQlFXdENMRVZCUVVVc1MwRkJja0k3UVVGQk5FSXNVVUZCUVN4SFFVRkhMRVZCUVVVc1JVRkJha003UVVGQmNVTXNVVUZCUVN4UlFVRlJMRVZCUVVVN1FVRkJReXhWUVVGQkxHRkJRV0VzUlVGQlJTeEpRVUZvUWp0QlFVRnpRaXhWUVVGQkxFdEJRVXNzUlVGQlJTeEZRVUUzUWp0QlFVRnBReXhWUVVGQkxFOUJRVThzUlVGQlJUdEJRVUV4UXp0QlFVRXZReXhQUVVGa08wRkJRMGc3T3p0dFEwRkZZeXhMTEVWQlFVODdRVUZEYkVJc1ZVRkJUU3hOUVVGTkxFZEJRVWNzVFVGQlRTeERRVUZETEUxQlFWQXNRMEZCWXl4TFFVRkxMRXRCUVV3c1EwRkJWeXhSUVVGNlFpeEZRVUZ0UXl4TFFVRnVReXhEUVVGbU8wRkJRMEVzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMRkZCUVZFc1JVRkJSVHRCUVVGWUxFOUJRV1E3UVVGRFNEczdPelpDUVVWUk8wRkJRVUVzVlVGRFJTeFhRVVJHTEVkQlEybENMRXRCUVVzc1MwRkVkRUlzUTBGRFJTeFhRVVJHTzBGQlFVRXNkMEpCUlRaQ0xFdEJRVXNzUzBGR2JFTTdRVUZCUVN4VlFVVkZMR3RDUVVaR0xHVkJSVVVzYTBKQlJrWTdRVUZCUVN4VlFVVnpRaXhIUVVaMFFpeGxRVVZ6UWl4SFFVWjBRanRCUVVGQkxHbERRVWR0UXl4TFFVRkxMRXRCUVV3c1EwRkJWeXhSUVVnNVF6dEJRVUZCTEZWQlIwVXNZVUZJUml4M1FrRkhSU3hoUVVoR08wRkJRVUVzVlVGSGFVSXNTMEZJYWtJc2QwSkJSMmxDTEV0QlNHcENPMEZCUVVFc1ZVRkhkMElzVDBGSWVFSXNkMEpCUjNkQ0xFOUJTSGhDT3p0QlFVdE1MRlZCUVVrc1IwRkJSeXhKUVVGSkxHRkJRV0VzUzBGQlN5eEpRVUY2UWl4SlFVRnBReXhMUVVGcVF5eEpRVUV3UXl4UFFVRTVReXhGUVVGMVJEdEJRVU51UkN4bFFVTkpMR2xEUVVOSkxHOUNRVUZETEdkQ1FVRkVMR1ZCUVdFc1MwRkJTeXhMUVVGc1FqdEJRVU5UTEZWQlFVRXNWMEZCVnl4RlFVRkZPMEZCUkhSQ0xGZEJSRW9zUlVGSFNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CU0Vvc1JVRkpTU3dyUWtGQlJ6dEJRVUZITEZWQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hWUVVGQkxFOUJRVThzUlVGQlJTeExRVUZMTEZsQlFVd3NRMEZCYTBJc1NVRkJiRUlzUTBGQmRVSXNTVUZCZGtJc1EwRkJja0k3UVVGQmJVUXNWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJOMFFzVjBGQmRVVXNWMEZCVnl4RFFVRkRMR0ZCUVc1R0xFTkJRVWdzUTBGS1NpeERRVVJLTzBGQlVVZ3NUMEZVUkN4TlFWTlBMRWxCUVVrc2EwSkJRVW9zUlVGQmQwSTdRVUZETTBJc1pVRkRTU3hwUTBGRFNTeHZRa0ZCUXl4MVFrRkJSRHRCUVVGblFpeFZRVUZCTEVkQlFVY3NSVUZCUlN4SFFVRnlRanRCUVVOblFpeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRXRCUVV3c1EwRkJWeXhSUVVSeVF6dEJRVVZuUWl4VlFVRkJMR05CUVdNc1JVRkJSU3hMUVVGTExHTkJRVXdzUTBGQmIwSXNTVUZCY0VJc1EwRkJlVUlzU1VGQmVrSXNRMEZHYUVNN1FVRkhaMElzVlVGQlFTeFhRVUZYTEVWQlFVVTdRVUZJTjBJc1ZVRkVTaXhGUVV0SkxHOUNRVUZETEc5Q1FVRkVMRVZCUVdsQ0xFdEJRVXNzUzBGQmRFSXNRMEZNU2l4RlFVMUpMQ3RDUVVGSE8wRkJRVWNzVlVGQlFTeEpRVUZKTEVWQlFVTXNSMEZCVWp0QlFVRlpMRlZCUVVFc1QwRkJUeXhGUVVGRkxFdEJRVXNzV1VGQlRDeERRVUZyUWl4SlFVRnNRaXhEUVVGMVFpeEpRVUYyUWl4RFFVRnlRanRCUVVGdFJDeFZRVUZCTEZOQlFWTXNSVUZCUXp0QlFVRTNSQ3hYUVVGMVJTeFhRVUZYTEVOQlFVTXNZVUZCYmtZc1EwRkJTQ3hEUVU1S0xFTkJSRW83UVVGVlNDeFBRVmhOTEUxQlYwRTdRVUZEU0N4bFFVTkpPMEZCUVVzc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlppeFhRVU5KTzBGQlFVMHNWVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkJTeXhaUVVGTUxFTkJRV3RDTEVsQlFXeENMRU5CUVhWQ0xFbEJRWFpDTzBGQlFXaENMRmRCUTBrc0swSkJRMGtzYlVOQlEwa3NPRU5CUkVvc1EwRkVTaXhGUVVsSkxDdENRVXBLTEVWQlMwa3NLMEpCUVVrc1YwRkJWeXhEUVVGRExGbEJRV2hDTEVOQlRFb3NRMEZFU2l4RlFWRkpPMEZCUVU4c1ZVRkJRU3hKUVVGSkxFVkJRVU1zVFVGQldqdEJRVUZ0UWl4VlFVRkJMRk5CUVZNc1JVRkJReXhYUVVFM1FqdEJRVUY1UXl4VlFVRkJMRXRCUVVzc1JVRkJSU3hIUVVGb1JEdEJRVUZ4UkN4VlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGTExGTkJRVXdzUTBGQlpTeEpRVUZtTEVOQlFXOUNMRWxCUVhCQ08wRkJRUzlFTEZWQlVrb3NSVUZUU1N3clFrRkJSenRCUVVGUExGVkJRVUVzU1VGQlNTeEZRVUZETEZGQlFWbzdRVUZCY1VJc1ZVRkJRU3hUUVVGVExFVkJRVU1zZFVKQlFTOUNPMEZCUVhWRUxGVkJRVUVzUzBGQlN5eEZRVUZGTEZkQlFWY3NRMEZCUXp0QlFVRXhSU3hWUVVGSUxFTkJWRW9zUTBGRVNpeEZRVmxKTEc5Q1FVRkRMRzlDUVVGRUxFVkJRV2xDTEV0QlFVc3NTMEZCZEVJc1EwRmFTaXhEUVVSS08wRkJaMEpJTzBGQlEwbzdPenM3UlVFdlJtdENMRXRCUVVzc1EwRkJReXhUT3p0bFFXdEhaQ3hST3pzN096czdPenM3T3p0QlEzUkhaaXhKUVVGTkxFOUJRVThzUjBGQlJ5eFRRVUZXTEU5QlFWVTdRVUZCUVN4TlFVRkZMRWRCUVVZc1VVRkJSU3hIUVVGR08wRkJRVUVzVFVGQlR5eFJRVUZRTEZGQlFVOHNVVUZCVUR0QlFVRkJMRTFCUVdsQ0xGZEJRV3BDTEZGQlFXbENMRmRCUVdwQ08wRkJRVUVzVTBGRFdpeHBRMEZEU1N3clFrRkRTU3c0UTBGRVNpeEZRVU0wUWl3clFrRkVOVUlzUlVGRlNUdEJRVUZITEVsQlFVRXNTVUZCU1N4RlFVRkZMRWRCUVZRN1FVRkJZeXhKUVVGQkxFMUJRVTBzUlVGQlF6dEJRVUZ5UWl4TFFVRXJRaXhIUVVFdlFpeERRVVpLTEVOQlJFb3NSVUZMU1N3clFrRkRTU3h2UTBGQlV5eFhRVUZYTEVOQlFVTXNTMEZCY2tJc1EwRkVTaXhGUVVOM1F5d3JRa0ZFZUVNc1JVRkZTeXhSUVVGUkxFTkJRVU1zUzBGQlZDeERRVUZsTEU5QlFXWXNRMEZCZFVJc1IwRkJka0lzUlVGQk5FSXNUVUZCTlVJc1EwRkdUQ3hEUVV4S0xFVkJVMGtzSzBKQlEwa3NiME5CUVZNc1YwRkJWeXhEUVVGRExFOUJRWEpDTEVOQlJFb3NSVUZETUVNc0swSkJSREZETEVWQlJVc3NVVUZCVVN4RFFVRkRMRTlCUVZRc1EwRkJhVUlzVDBGQmFrSXNRMEZCZVVJc1IwRkJla0lzUlVGQk9FSXNUVUZCT1VJc1EwRkdUQ3hEUVZSS0xFTkJSRms3UVVGQlFTeERRVUZvUWpzN1pVRm5RbVVzVHpzN096czdPMEZEYUVKbU96czdPMEZCUlVFc1NVRkJUU3h2UWtGQmIwSXNSMEZCUnl4M1FrRkJOMEk3UVVGRFFTeEpRVUZOTEZWQlFWVXNSMEZCUnl4UlFVRlJMRU5CUVVNc1kwRkJWQ3hEUVVGM1FpeHZRa0ZCZUVJc1EwRkJia0k3Y1VKQlEzTkNMR0U3U1VGQlppeFhMR3RDUVVGQkxGYzdRVUZGVUN4UlFVRlJMRU5CUVVNc1RVRkJWQ3hEUVVOSkxHOUNRVUZETEdsQ1FVRkVPMEZCUVZVc1JVRkJRU3hYUVVGWExFVkJRVVU3UVVGQmRrSXNSVUZFU2l4RlFVVkpMRlZCUmtvN096czdPenM3T3pzN1FVTk9RU3hUUVVGVExGVkJRVlFzUTBGQmIwSXNSMEZCY0VJc1JVRkJlVUk3UVVGRGNrSXNVMEZCVHl4TFFVRkxMRU5CUVVNc1IwRkJSQ3hEUVVGTUxFTkJRMFlzU1VGRVJTeERRVU5ITEZWQlFVRXNSMEZCUnp0QlFVRkJMRmRCUVVrc1IwRkJSeXhEUVVGRExFbEJRVW9zUlVGQlNqdEJRVUZCTEVkQlJFNHNSVUZGUml4SlFVWkZMRU5CUjBNc1ZVRkJReXhOUVVGRU8wRkJRVUVzVjBGQllUdEJRVUZETEUxQlFVRXNUVUZCVFN4RlFVRk9PMEZCUVVRc1MwRkJZanRCUVVGQkxFZEJTRVFzUlVGSlF5eFZRVUZETEV0QlFVUTdRVUZCUVN4WFFVRlpPMEZCUVVNc1RVRkJRU3hMUVVGTExFVkJRVXc3UVVGQlJDeExRVUZhTzBGQlFVRXNSMEZLUkN4RFFVRlFPMEZCVFVnN08yVkJSV01zVlNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWlobWRXNWpkR2x2YmlBb2NtOXZkQ3dnWm1GamRHOXllU2w3WEc0Z0lDZDFjMlVnYzNSeWFXTjBKenRjYmx4dUlDQXZLbWx6ZEdGdVluVnNJR2xuYm05eVpTQnVaWGgwT21OaGJuUWdkR1Z6ZENvdlhHNGdJR2xtSUNoMGVYQmxiMllnYlc5a2RXeGxJRDA5UFNBbmIySnFaV04wSnlBbUppQjBlWEJsYjJZZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFQwOUlDZHZZbXBsWTNRbktTQjdYRzRnSUNBZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFNCbVlXTjBiM0o1S0NrN1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JR1JsWm1sdVpTQTlQVDBnSjJaMWJtTjBhVzl1SnlBbUppQmtaV1pwYm1VdVlXMWtLU0I3WEc0Z0lDQWdMeThnUVUxRUxpQlNaV2RwYzNSbGNpQmhjeUJoYmlCaGJtOXVlVzF2ZFhNZ2JXOWtkV3hsTGx4dUlDQWdJR1JsWm1sdVpTaGJYU3dnWm1GamRHOXllU2s3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1FuSnZkM05sY2lCbmJHOWlZV3h6WEc0Z0lDQWdjbTl2ZEM1dlltcGxZM1JRWVhSb0lEMGdabUZqZEc5eWVTZ3BPMXh1SUNCOVhHNTlLU2gwYUdsekxDQm1kVzVqZEdsdmJpZ3BlMXh1SUNBbmRYTmxJSE4wY21samRDYzdYRzVjYmlBZ2RtRnlJSFJ2VTNSeUlEMGdUMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp6dGNiaUFnWm5WdVkzUnBiMjRnYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU0I3WEc0Z0lDQWdhV1lvYjJKcUlEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbVlXeHpaVnh1SUNBZ0lIMWNiaUFnSUNBdkwzUnZJR2hoYm1Sc1pTQnZZbXBsWTNSeklIZHBkR2dnYm5Wc2JDQndjbTkwYjNSNWNHVnpJQ2gwYjI4Z1pXUm5aU0JqWVhObFB5bGNiaUFnSUNCeVpYUjFjbTRnVDJKcVpXTjBMbkJ5YjNSdmRIbHdaUzVvWVhOUGQyNVFjbTl3WlhKMGVTNWpZV3hzS0c5aWFpd2djSEp2Y0NsY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpSVzF3ZEhrb2RtRnNkV1VwZTF4dUlDQWdJR2xtSUNnaGRtRnNkV1VwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb2FYTkJjbkpoZVNoMllXeDFaU2tnSmlZZ2RtRnNkV1V1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSFpoYkhWbElDRTlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElHbHVJSFpoYkhWbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hR0Z6VDNkdVVISnZjR1Z5ZEhrb2RtRnNkV1VzSUdrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQjBiMU4wY21sdVp5aDBlWEJsS1h0Y2JpQWdJQ0J5WlhSMWNtNGdkRzlUZEhJdVkyRnNiQ2gwZVhCbEtUdGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR2x6VDJKcVpXTjBLRzlpYWlsN1hHNGdJQ0FnY21WMGRYSnVJSFI1Y0dWdlppQnZZbW9nUFQwOUlDZHZZbXBsWTNRbklDWW1JSFJ2VTNSeWFXNW5LRzlpYWlrZ1BUMDlJRndpVzI5aWFtVmpkQ0JQWW1wbFkzUmRYQ0k3WEc0Z0lIMWNibHh1SUNCMllYSWdhWE5CY25KaGVTQTlJRUZ5Y21GNUxtbHpRWEp5WVhrZ2ZId2dablZ1WTNScGIyNG9iMkpxS1h0Y2JpQWdJQ0F2S21semRHRnVZblZzSUdsbmJtOXlaU0J1WlhoME9tTmhiblFnZEdWemRDb3ZYRzRnSUNBZ2NtVjBkWEp1SUhSdlUzUnlMbU5oYkd3b2IySnFLU0E5UFQwZ0oxdHZZbXBsWTNRZ1FYSnlZWGxkSnp0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpRbTl2YkdWaGJpaHZZbW9wZTF4dUlDQWdJSEpsZEhWeWJpQjBlWEJsYjJZZ2IySnFJRDA5UFNBblltOXZiR1ZoYmljZ2ZId2dkRzlUZEhKcGJtY29iMkpxS1NBOVBUMGdKMXR2WW1wbFkzUWdRbTl2YkdWaGJsMG5PMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWjJWMFMyVjVLR3RsZVNsN1hHNGdJQ0FnZG1GeUlHbHVkRXRsZVNBOUlIQmhjbk5sU1c1MEtHdGxlU2s3WEc0Z0lDQWdhV1lnS0dsdWRFdGxlUzUwYjFOMGNtbHVaeWdwSUQwOVBTQnJaWGtwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYm5STFpYazdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJyWlhrN1hHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQm1ZV04wYjNKNUtHOXdkR2x2Ym5NcElIdGNiaUFnSUNCdmNIUnBiMjV6SUQwZ2IzQjBhVzl1Y3lCOGZDQjdmVnh1WEc0Z0lDQWdkbUZ5SUc5aWFtVmpkRkJoZEdnZ1BTQm1kVzVqZEdsdmJpaHZZbW9wSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJQWW1wbFkzUXVhMlY1Y3lodlltcGxZM1JRWVhSb0tTNXlaV1IxWTJVb1puVnVZM1JwYjI0b2NISnZlSGtzSUhCeWIzQXBJSHRjYmlBZ0lDQWdJQ0FnYVdZb2NISnZjQ0E5UFQwZ0oyTnlaV0YwWlNjcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2ZUhrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0F2S21semRHRnVZblZzSUdsbmJtOXlaU0JsYkhObEtpOWNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ2WW1wbFkzUlFZWFJvVzNCeWIzQmRJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzRnSUNBZ0lDQWdJQ0FnY0hKdmVIbGJjSEp2Y0YwZ1BTQnZZbXBsWTNSUVlYUm9XM0J5YjNCZExtSnBibVFvYjJKcVpXTjBVR0YwYUN3Z2IySnFLVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCd2NtOTRlVHRjYmlBZ0lDQWdJSDBzSUh0OUtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ1puVnVZM1JwYjI0Z2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnY0hKdmNDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlDaHZjSFJwYjI1ekxtbHVZMngxWkdWSmJtaGxjbWwwWldSUWNtOXdjeUI4ZkNBb2RIbHdaVzltSUhCeWIzQWdQVDA5SUNkdWRXMWlaWEluSUNZbUlFRnljbUY1TG1selFYSnlZWGtvYjJKcUtTa2dmSHdnYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU2xjYmlBZ0lDQjlYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQm5aWFJUYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCd2NtOXdLU0I3WEc0Z0lDQWdJQ0JwWmlBb2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtHOWlhaXdnY0hKdmNDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWx0d2NtOXdYVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQm1kVzVqZEdsdmJpQnpaWFFvYjJKcUxDQndZWFJvTENCMllXeDFaU3dnWkc5T2IzUlNaWEJzWVdObEtYdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJRnR3WVhSb1hUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2doY0dGMGFDQjhmQ0J3WVhSb0xteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjMlYwS0c5aWFpd2djR0YwYUM1emNHeHBkQ2duTGljcExtMWhjQ2huWlhSTFpYa3BMQ0IyWVd4MVpTd2daRzlPYjNSU1pYQnNZV05sS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFVHRjBhQ0E5SUhCaGRHaGJNRjA3WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZaaGJIVmxJRDBnWjJWMFUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2dZM1Z5Y21WdWRGQmhkR2dwTzF4dUlDQWdJQ0FnYVdZZ0tIQmhkR2d1YkdWdVozUm9JRDA5UFNBeEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoamRYSnlaVzUwVm1Gc2RXVWdQVDA5SUhadmFXUWdNQ0I4ZkNBaFpHOU9iM1JTWlhCc1lXTmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2IySnFXMk4xY25KbGJuUlFZWFJvWFNBOUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCamRYSnlaVzUwVm1Gc2RXVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNoamRYSnlaVzUwVm1Gc2RXVWdQVDA5SUhadmFXUWdNQ2tnZTF4dUlDQWdJQ0FnSUNBdkwyTm9aV05ySUdsbUlIZGxJR0Z6YzNWdFpTQmhiaUJoY25KaGVWeHVJQ0FnSUNBZ0lDQnBaaWgwZVhCbGIyWWdjR0YwYUZzeFhTQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbXBiWTNWeWNtVnVkRkJoZEdoZElEMGdXMTA3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2IySnFXMk4xY25KbGJuUlFZWFJvWFNBOUlIdDlPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6WlhRb2IySnFXMk4xY25KbGJuUlFZWFJvWFN3Z2NHRjBhQzV6YkdsalpTZ3hLU3dnZG1Gc2RXVXNJR1J2VG05MFVtVndiR0ZqWlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1b1lYTWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvS1NCN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQmJjR0YwYUYwN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQndZWFJvSUQwZ2NHRjBhQzV6Y0d4cGRDZ25MaWNwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9JWEJoZEdnZ2ZId2djR0YwYUM1c1pXNW5kR2dnUFQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJQ0VoYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSEJoZEdndWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHb2dQU0JuWlhSTFpYa29jR0YwYUZ0cFhTazdYRzVjYmlBZ0lDQWdJQ0FnYVdZb0tIUjVjR1Z2WmlCcUlEMDlQU0FuYm5WdFltVnlKeUFtSmlCcGMwRnljbUY1S0c5aWFpa2dKaVlnYWlBOElHOWlhaTVzWlc1bmRHZ3BJSHg4WEc0Z0lDQWdJQ0FnSUNBZ0tHOXdkR2x2Ym5NdWFXNWpiSFZrWlVsdWFHVnlhWFJsWkZCeWIzQnpJRDhnS0dvZ2FXNGdUMkpxWldOMEtHOWlhaWtwSURvZ2FHRnpUM2R1VUhKdmNHVnlkSGtvYjJKcUxDQnFLU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQnZZbW9nUFNCdlltcGJhbDA3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtVnVjM1Z5WlVWNGFYTjBjeUE5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnc0lIWmhiSFZsS1h0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6WlhRb2IySnFMQ0J3WVhSb0xDQjJZV3gxWlN3Z2RISjFaU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1YzJWMElEMGdablZ1WTNScGIyNGdLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJR1J2VG05MFVtVndiR0ZqWlNsN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYzJWMEtHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1YVc1elpYSjBJRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUN3Z2RtRnNkV1VzSUdGMEtYdGNiaUFnSUNBZ0lIWmhjaUJoY25JZ1BTQnZZbXBsWTNSUVlYUm9MbWRsZENodlltb3NJSEJoZEdncE8xeHVJQ0FnSUNBZ1lYUWdQU0IrZm1GME8xeHVJQ0FnSUNBZ2FXWWdLQ0ZwYzBGeWNtRjVLR0Z5Y2lrcElIdGNiaUFnSUNBZ0lDQWdZWEp5SUQwZ1cxMDdYRzRnSUNBZ0lDQWdJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dZWEp5S1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdGeWNpNXpjR3hwWTJVb1lYUXNJREFzSUhaaGJIVmxLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVsYlhCMGVTQTlJR1oxYm1OMGFXOXVLRzlpYWl3Z2NHRjBhQ2tnZTF4dUlDQWdJQ0FnYVdZZ0tHbHpSVzF3ZEhrb2NHRjBhQ2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhadmFXUWdNRHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNodlltb2dQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbTlwWkNBd08xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVXNJR2s3WEc0Z0lDQWdJQ0JwWmlBb0lTaDJZV3gxWlNBOUlHOWlhbVZqZEZCaGRHZ3VaMlYwS0c5aWFpd2djR0YwYUNrcEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjJiMmxrSURBN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdkbUZzZFdVZ1BUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJQ2NuS1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2FYTkNiMjlzWldGdUtIWmhiSFZsS1NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENCbVlXeHpaU2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUIyWVd4MVpTQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnTUNrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpRWEp5WVhrb2RtRnNkV1VwS1NCN1hHNGdJQ0FnSUNBZ0lIWmhiSFZsTG14bGJtZDBhQ0E5SURBN1hHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tHbHpUMkpxWldOMEtIWmhiSFZsS1NrZ2UxeHVJQ0FnSUNBZ0lDQm1iM0lnS0drZ2FXNGdkbUZzZFdVcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2FHRnpVMmhoYkd4dmQxQnliM0JsY25SNUtIWmhiSFZsTENCcEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pHVnNaWFJsSUhaaGJIVmxXMmxkTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z2JuVnNiQ2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1Y0hWemFDQTlJR1oxYm1OMGFXOXVJQ2h2WW1vc0lIQmhkR2dnTHlvc0lIWmhiSFZsY3lBcUx5bDdYRzRnSUNBZ0lDQjJZWElnWVhKeUlEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2IySnFMQ0J3WVhSb0tUdGNiaUFnSUNBZ0lHbG1JQ2doYVhOQmNuSmhlU2hoY25JcEtTQjdYRzRnSUNBZ0lDQWdJR0Z5Y2lBOUlGdGRPMXh1SUNBZ0lDQWdJQ0J2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJR0Z5Y2lrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHRnljaTV3ZFhOb0xtRndjR3g1S0dGeWNpd2dRWEp5WVhrdWNISnZkRzkwZVhCbExuTnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpMQ0F5S1NrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndVkyOWhiR1Z6WTJVZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9jeXdnWkdWbVlYVnNkRlpoYkhWbEtTQjdYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVTdYRzVjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd0xDQnNaVzRnUFNCd1lYUm9jeTVzWlc1bmRHZzdJR2tnUENCc1pXNDdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvS0haaGJIVmxJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9jMXRwWFNrcElDRTlQU0IyYjJsa0lEQXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnY21WMGRYSnVJR1JsWm1GMWJIUldZV3gxWlR0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnYjJKcVpXTjBVR0YwYUM1blpYUWdQU0JtZFc1amRHbHZiaUFvYjJKcUxDQndZWFJvTENCa1pXWmhkV3gwVm1Gc2RXVXBlMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYm5WdFltVnlKeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnVzNCaGRHaGRPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0NGd1lYUm9JSHg4SUhCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnBaaUFvYjJKcUlEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHUmxabUYxYkhSV1lXeDFaVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwTENCa1pXWmhkV3gwVm1Gc2RXVXBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZCaGRHZ2dQU0JuWlhSTFpYa29jR0YwYUZzd1hTazdYRzRnSUNBZ0lDQjJZWElnYm1WNGRFOWlhaUE5SUdkbGRGTm9ZV3hzYjNkUWNtOXdaWEowZVNodlltb3NJR04xY25KbGJuUlFZWFJvS1Z4dUlDQWdJQ0FnYVdZZ0tHNWxlSFJQWW1vZ1BUMDlJSFp2YVdRZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaR1ZtWVhWc2RGWmhiSFZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9jR0YwYUM1c1pXNW5kR2dnUFQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzVsZUhSUFltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbWRsZENodlltcGJZM1Z5Y21WdWRGQmhkR2hkTENCd1lYUm9Mbk5zYVdObEtERXBMQ0JrWldaaGRXeDBWbUZzZFdVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtUmxiQ0E5SUdaMWJtTjBhVzl1SUdSbGJDaHZZbW9zSUhCaGRHZ3BJSHRjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NHRjBhQ0E5SUZ0d1lYUm9YVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1vN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2hwYzBWdGNIUjVLSEJoZEdncEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmloMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndVpHVnNLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlFZWFJvSUQwZ1oyVjBTMlY1S0hCaGRHaGJNRjBwTzF4dUlDQWdJQ0FnYVdZZ0tDRm9ZWE5UYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCamRYSnlaVzUwVUdGMGFDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWW9jR0YwYUM1c1pXNW5kR2dnUFQwOUlERXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHpRWEp5WVhrb2IySnFLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHOWlhaTV6Y0d4cFkyVW9ZM1Z5Y21WdWRGQmhkR2dzSURFcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJR1JsYkdWMFpTQnZZbXBiWTNWeWNtVnVkRkJoZEdoZE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNWtaV3dvYjJKcVcyTjFjbkpsYm5SUVlYUm9YU3dnY0dGMGFDNXpiR2xqWlNneEtTazdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZzdYRzRnSUgxY2JseHVJQ0IyWVhJZ2JXOWtJRDBnWm1GamRHOXllU2dwTzF4dUlDQnRiMlF1WTNKbFlYUmxJRDBnWm1GamRHOXllVHRjYmlBZ2JXOWtMbmRwZEdoSmJtaGxjbWwwWldSUWNtOXdjeUE5SUdaaFkzUnZjbmtvZTJsdVkyeDFaR1ZKYm1obGNtbDBaV1JRY205d2N6b2dkSEoxWlgwcFhHNGdJSEpsZEhWeWJpQnRiMlE3WEc1OUtUdGNiaUlzSWlkMWMyVWdjM1J5YVdOMEoxeHVYRzVqYjI1emRDQjdhWE5QWW1wbFkzUXNJR2RsZEV0bGVYTjlJRDBnY21WeGRXbHlaU2duTGk5c1lXNW5KeWxjYmx4dUx5OGdVRkpKVmtGVVJTQlFVazlRUlZKVVNVVlRYRzVqYjI1emRDQkNXVkJCVTFOZlRVOUVSU0E5SUNkZlgySjVjR0Z6YzAxdlpHVW5YRzVqYjI1emRDQkpSMDVQVWtWZlEwbFNRMVZNUVZJZ1BTQW5YMTlwWjI1dmNtVkRhWEpqZFd4aGNpZGNibU52Ym5OMElFMUJXRjlFUlVWUUlEMGdKMTlmYldGNFJHVmxjQ2RjYm1OdmJuTjBJRU5CUTBoRklEMGdKMTlmWTJGamFHVW5YRzVqYjI1emRDQlJWVVZWUlNBOUlDZGZYM0YxWlhWbEoxeHVZMjl1YzNRZ1UxUkJWRVVnUFNBblgxOXpkR0YwWlNkY2JseHVZMjl1YzNRZ1JVMVFWRmxmVTFSQlZFVWdQU0I3ZlZ4dVhHNWpiR0Z6Y3lCU1pXTjFjbk5wZG1WSmRHVnlZWFJ2Y2lCN1hHNGdJQzhxS2x4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeEJjbkpoZVgwZ2NtOXZkRnh1SUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ1cySjVjR0Z6YzAxdlpHVTlNRjFjYmlBZ0lDb2dRSEJoY21GdElIdENiMjlzWldGdWZTQmJhV2R1YjNKbFEybHlZM1ZzWVhJOVptRnNjMlZkWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmJiV0Y0UkdWbGNEMHhNREJkWEc0Z0lDQXFMMXh1SUNCamIyNXpkSEoxWTNSdmNpQW9jbTl2ZEN3Z1lubHdZWE56VFc5a1pTQTlJREFzSUdsbmJtOXlaVU5wY21OMWJHRnlJRDBnWm1Gc2MyVXNJRzFoZUVSbFpYQWdQU0F4TURBcElIdGNiaUFnSUNCMGFHbHpXMEpaVUVGVFUxOU5UMFJGWFNBOUlHSjVjR0Z6YzAxdlpHVmNiaUFnSUNCMGFHbHpXMGxIVGs5U1JWOURTVkpEVlV4QlVsMGdQU0JwWjI1dmNtVkRhWEpqZFd4aGNseHVJQ0FnSUhSb2FYTmJUVUZZWDBSRlJWQmRJRDBnYldGNFJHVmxjRnh1SUNBZ0lIUm9hWE5iUTBGRFNFVmRJRDBnVzExY2JpQWdJQ0IwYUdselcxRlZSVlZGWFNBOUlGdGRYRzRnSUNBZ2RHaHBjMXRUVkVGVVJWMGdQU0IwYUdsekxtZGxkRk4wWVhSbEtIVnVaR1ZtYVc1bFpDd2djbTl2ZENsY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwOWlhbVZqZEgxY2JpQWdJQ292WEc0Z0lHNWxlSFFnS0NrZ2UxeHVJQ0FnSUdOdmJuTjBJSHR1YjJSbExDQndZWFJvTENCa1pXVndmU0E5SUhSb2FYTmJVMVJCVkVWZElIeDhJRVZOVUZSWlgxTlVRVlJGWEc1Y2JpQWdJQ0JwWmlBb2RHaHBjMXROUVZoZlJFVkZVRjBnUGlCa1pXVndLU0I3WEc0Z0lDQWdJQ0JwWmlBb2RHaHBjeTVwYzA1dlpHVW9ibTlrWlNrcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSb2FYTXVhWE5EYVhKamRXeGhjaWh1YjJSbEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaDBhR2x6VzBsSFRrOVNSVjlEU1ZKRFZVeEJVbDBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUhOcmFYQmNiaUFnSUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkRGFYSmpkV3hoY2lCeVpXWmxjbVZ1WTJVbktWeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCcFppQW9kR2hwY3k1dmJsTjBaWEJKYm5SdktIUm9hWE5iVTFSQlZFVmRLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMjl1YzNRZ1pHVnpZM0pwY0hSdmNuTWdQU0IwYUdsekxtZGxkRk4wWVhSbGMwOW1RMmhwYkdST2IyUmxjeWh1YjJSbExDQndZWFJvTENCa1pXVndLVnh1SUNBZ0lDQWdJQ0FnSUNBZ1kyOXVjM1FnYldWMGFHOWtJRDBnZEdocGMxdENXVkJCVTFOZlRVOUVSVjBnUHlBbmNIVnphQ2NnT2lBbmRXNXphR2xtZENkY2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhOYlVWVkZWVVZkVzIxbGRHaHZaRjBvTGk0dVpHVnpZM0pwY0hSdmNuTXBYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpXME5CUTBoRlhTNXdkWE5vS0c1dlpHVXBYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWTI5dWMzUWdkbUZzZFdVZ1BTQjBhR2x6VzFGVlJWVkZYUzV6YUdsbWRDZ3BYRzRnSUNBZ1kyOXVjM1FnWkc5dVpTQTlJQ0YyWVd4MVpWeHVYRzRnSUNBZ2RHaHBjMXRUVkVGVVJWMGdQU0IyWVd4MVpWeHVYRzRnSUNBZ2FXWWdLR1J2Ym1VcElIUm9hWE11WkdWemRISnZlU2dwWEc1Y2JpQWdJQ0J5WlhSMWNtNGdlM1poYkhWbExDQmtiMjVsZlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2x4dUlDQWdLaTljYmlBZ1pHVnpkSEp2ZVNBb0tTQjdYRzRnSUNBZ2RHaHBjMXRSVlVWVlJWMHViR1Z1WjNSb0lEMGdNRnh1SUNBZ0lIUm9hWE5iUTBGRFNFVmRMbXhsYm1kMGFDQTlJREJjYmlBZ0lDQjBhR2x6VzFOVVFWUkZYU0E5SUc1MWJHeGNiaUFnZlZ4dUlDQXZLaXBjYmlBZ0lDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQXFMMXh1SUNCcGMwNXZaR1VnS0dGdWVTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCcGMwOWlhbVZqZENoaGJua3BYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdLaTljYmlBZ2FYTk1aV0ZtSUNoaGJua3BJSHRjYmlBZ0lDQnlaWFIxY200Z0lYUm9hWE11YVhOT2IyUmxLR0Z1ZVNsY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBcUwxeHVJQ0JwYzBOcGNtTjFiR0Z5SUNoaGJua3BJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjMXREUVVOSVJWMHVhVzVrWlhoUFppaGhibmtwSUNFOVBTQXRNVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJTWlhSMWNtNXpJSE4wWVhSbGN5QnZaaUJqYUdsc1pDQnViMlJsYzF4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdibTlrWlZ4dUlDQWdLaUJBY0dGeVlXMGdlMEZ5Y21GNWZTQndZWFJvWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmtaV1Z3WEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRCY25KaGVUeFBZbXBsWTNRK2ZWeHVJQ0FnS2k5Y2JpQWdaMlYwVTNSaGRHVnpUMlpEYUdsc1pFNXZaR1Z6SUNodWIyUmxMQ0J3WVhSb0xDQmtaV1Z3S1NCN1hHNGdJQ0FnY21WMGRYSnVJR2RsZEV0bGVYTW9ibTlrWlNrdWJXRndLR3RsZVNBOVBseHVJQ0FnSUNBZ2RHaHBjeTVuWlhSVGRHRjBaU2h1YjJSbExDQnViMlJsVzJ0bGVWMHNJR3RsZVN3Z2NHRjBhQzVqYjI1allYUW9hMlY1S1N3Z1pHVmxjQ0FySURFcFhHNGdJQ0FnS1Z4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCU1pYUjFjbTV6SUhOMFlYUmxJRzltSUc1dlpHVXVJRU5oYkd4eklHWnZjaUJsWVdOb0lHNXZaR1ZjYmlBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlGdHdZWEpsYm5SZFhHNGdJQ0FxSUVCd1lYSmhiU0I3S24wZ1cyNXZaR1ZkWEc0Z0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmJhMlY1WFZ4dUlDQWdLaUJBY0dGeVlXMGdlMEZ5Y21GNWZTQmJjR0YwYUYxY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJRnRrWldWd1hWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1QySnFaV04wZlZ4dUlDQWdLaTljYmlBZ1oyVjBVM1JoZEdVZ0tIQmhjbVZ1ZEN3Z2JtOWtaU3dnYTJWNUxDQndZWFJvSUQwZ1cxMHNJR1JsWlhBZ1BTQXdLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIdHdZWEpsYm5Rc0lHNXZaR1VzSUd0bGVTd2djR0YwYUN3Z1pHVmxjSDFjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUTJGc2JHSmhZMnRjYmlBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlITjBZWFJsWEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0tpOWNiaUFnYjI1VGRHVndTVzUwYnlBb2MzUmhkR1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkSEoxWlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1VtVmpkWEp6YVhabFNYUmxjbUYwYjNKOVhHNGdJQ0FxTDF4dUlDQmJVM2x0WW05c0xtbDBaWEpoZEc5eVhTQW9LU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE5jYmlBZ2ZWeHVmVnh1WEc1dGIyUjFiR1V1Wlhod2IzSjBjeUE5SUZKbFkzVnljMmwyWlVsMFpYSmhkRzl5WEc0aUxDSW5kWE5sSUhOMGNtbGpkQ2RjYmk4cUtseHVJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDb3ZYRzVtZFc1amRHbHZiaUJwYzA5aWFtVmpkQ0FvWVc1NUtTQjdYRzRnSUhKbGRIVnliaUJoYm5rZ0lUMDlJRzUxYkd3Z0ppWWdkSGx3Wlc5bUlHRnVlU0E5UFQwZ0oyOWlhbVZqZENkY2JuMWNiaThxS2x4dUlDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JpQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNvdlhHNWpiMjV6ZENCN2FYTkJjbkpoZVgwZ1BTQkJjbkpoZVZ4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselFYSnlZWGxNYVd0bElDaGhibmtwSUh0Y2JpQWdhV1lnS0NGcGMwOWlhbVZqZENoaGJua3BLU0J5WlhSMWNtNGdabUZzYzJWY2JpQWdhV1lnS0NFb0oyeGxibWQwYUNjZ2FXNGdZVzU1S1NrZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUdOdmJuTjBJR3hsYm1kMGFDQTlJR0Z1ZVM1c1pXNW5kR2hjYmlBZ2FXWWdLQ0ZwYzA1MWJXSmxjaWhzWlc1bmRHZ3BLU0J5WlhSMWNtNGdabUZzYzJWY2JpQWdhV1lnS0d4bGJtZDBhQ0ErSURBcElIdGNiaUFnSUNCeVpYUjFjbTRnS0d4bGJtZDBhQ0F0SURFcElHbHVJR0Z1ZVZ4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUdadmNpQW9ZMjl1YzNRZ2EyVjVJR2x1SUdGdWVTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sWEc0Z0lDQWdmVnh1SUNCOVhHNTlYRzR2S2lwY2JpQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBcUwxeHVablZ1WTNScGIyNGdhWE5PZFcxaVpYSWdLR0Z1ZVNrZ2UxeHVJQ0J5WlhSMWNtNGdkSGx3Wlc5bUlHRnVlU0E5UFQwZ0oyNTFiV0psY2lkY2JuMWNiaThxS2x4dUlDb2dRSEJoY21GdElIdFBZbXBsWTNSOFFYSnlZWGw5SUc5aWFtVmpkRnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwRnljbUY1UEZOMGNtbHVaejU5WEc0Z0tpOWNibVoxYm1OMGFXOXVJR2RsZEV0bGVYTWdLRzlpYW1WamRDa2dlMXh1SUNCamIyNXpkQ0JyWlhselh5QTlJRTlpYW1WamRDNXJaWGx6S0c5aWFtVmpkQ2xjYmlBZ2FXWWdLR2x6UVhKeVlYa29iMkpxWldOMEtTa2dlMXh1SUNBZ0lDOHZJSE5yYVhBZ2MyOXlkRnh1SUNCOUlHVnNjMlVnYVdZZ0tHbHpRWEp5WVhsTWFXdGxLRzlpYW1WamRDa3BJSHRjYmlBZ0lDQmpiMjV6ZENCcGJtUmxlQ0E5SUd0bGVYTmZMbWx1WkdWNFQyWW9KMnhsYm1kMGFDY3BYRzRnSUNBZ2FXWWdLR2x1WkdWNElENGdMVEVwSUh0Y2JpQWdJQ0FnSUd0bGVYTmZMbk53YkdsalpTaHBibVJsZUN3Z01TbGNiaUFnSUNCOVhHNGdJQ0FnTHk4Z2MydHBjQ0J6YjNKMFhHNGdJSDBnWld4elpTQjdYRzRnSUNBZ0x5OGdjMjl5ZEZ4dUlDQWdJR3RsZVhOZkxuTnZjblFvS1Z4dUlDQjlYRzRnSUhKbGRIVnliaUJyWlhselgxeHVmVnh1WEc1bGVIQnZjblJ6TG1kbGRFdGxlWE1nUFNCblpYUkxaWGx6WEc1bGVIQnZjblJ6TG1selFYSnlZWGtnUFNCcGMwRnljbUY1WEc1bGVIQnZjblJ6TG1selFYSnlZWGxNYVd0bElEMGdhWE5CY25KaGVVeHBhMlZjYm1WNGNHOXlkSE11YVhOUFltcGxZM1FnUFNCcGMwOWlhbVZqZEZ4dVpYaHdiM0owY3k1cGMwNTFiV0psY2lBOUlHbHpUblZ0WW1WeVhHNGlMQ0pwYlhCdmNuUWdUR2x6ZEVsMFpXMGdabkp2YlNBbkxpOU1hWE4wU1hSbGJTYzdYRzVwYlhCdmNuUWdjbVZqZFhKemFYWmxTWFJsY21GMGIzSWdabkp2YlNBbmNtVmpkWEp6YVhabExXbDBaWEpoZEc5eUp6dGNibWx0Y0c5eWRDQnZZbXBsWTNSUVlYUm9JR1p5YjIwZ0oyOWlhbVZqZEMxd1lYUm9KenRjYmx4dVkyeGhjM01nUkdGMFlVeHBjM1FnWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lITmxkRVpwWld4a1RXRndLSEJoZEdnc0lHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjSEp2Y0hNdWRYQmtZWFJsUm1sbGJHUk5ZWEFvZTF0bGRtVnVkQzUwWVhKblpYUXVaR0YwWVhObGRDNW1hV1ZzWkYwNklIQmhkR2g5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5Wlc1a1pYSk9iMlJsY3loa1lYUmhLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJQWW1wbFkzUXVhMlY1Y3loa1lYUmhLUzV0WVhBb2FYUmxiU0E5UGlCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2FYUmxiU0E5UFQwZ0oyOWlhbVZqZEZCaGRHZ25LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCc1pYUWdZMmhwYkdRZ1BTQThUR2x6ZEVsMFpXMGdhMlY1UFh0cGRHVnRMblJ2VTNSeWFXNW5LQ2w5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc2RXVTllMmwwWlcxOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IySnFaV04wUFh0a1lYUmhXMmwwWlcxZGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnBaV3hrVFdGd1BYdDBhR2x6TG5CeWIzQnpMbVpwWld4a1RXRndmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzl1UTJ4cFkydERiMjUwWVdsdVpYSTllMlVnUFQ0Z2RHaHBjeTV6WlhSR2FXVnNaRTFoY0Noa1lYUmhXMmwwWlcxZExtOWlhbVZqZEZCaGRHZ3NJR1VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5dVEyeHBZMnRVYVhSc1pUMTdaU0E5UGlCMGFHbHpMbk5sZEVacFpXeGtUV0Z3S0dSaGRHRmJhWFJsYlYwc0lHVXBmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzl1UTJ4cFkydERiMjUwWlc1MFBYdGxJRDArSUhSb2FYTXVjMlYwUm1sbGJHUk5ZWEFvWkdGMFlWdHBkR1Z0WFN3Z1pTbDlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSEpoYm5Oc1lYUnBiMjQ5ZTNSb2FYTXVjSEp2Y0hNdWRISmhibk5zWVhScGIyNTlMejQ3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnWkdGMFlWdHBkR1Z0WFNBOVBUMGdKMjlpYW1WamRDY2dKaVlnWkdGMFlWdHBkR1Z0WFNBaFBUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTm9hV3hrSUQwZ1VtVmhZM1F1WTJ4dmJtVkZiR1Z0Wlc1MEtHTm9hV3hrTENCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05vYVd4a2NtVnVPaUJCY25KaGVTNXBjMEZ5Y21GNUtHUmhkR0ZiYVhSbGJWMHBJRDhnZEdocGN5NXlaVzVrWlhKT2IyUmxjeWhrWVhSaFcybDBaVzFkV3pCZEtTQTZJSFJvYVhNdWNtVnVaR1Z5VG05a1pYTW9aR0YwWVZ0cGRHVnRYU2xjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHTm9hV3hrTzF4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpXNWtaWElvS1NCN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUh0MGNtRnVjMnhoZEdsdmJpd2daR0YwWVgwZ1BTQjBhR2x6TG5CeWIzQnpPMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQm1hV1ZzWkUxaGNDQTlJSFJvYVhNdWNISnZjSE11Wm1sbGJHUk5ZWEE3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLRUZ5Y21GNUxtbHpRWEp5WVhrb1pHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJZ1BTQW5KenRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2htYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlEMDlQU0J1ZFd4c0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9RWEp5WVhrdWFYTkJjbkpoZVNoa1lYUmhLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdSaGRHRWdQU0JrWVhSaFd6QmRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCbWIzSWdLR3hsZENCN2NHRnlaVzUwTENCdWIyUmxMQ0JyWlhrc0lIQmhkR2g5SUc5bUlHNWxkeUJ5WldOMWNuTnBkbVZKZEdWeVlYUnZjaWhrWVhSaEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYm05a1pTQTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2JtOWtaU0FoUFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnNaWFFnY0dGMGFGTjBjbWx1WnlBOUlIQmhkR2d1YW05cGJpZ25MaWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZZbXBsWTNSUVlYUm9Mbk5sZENoa1lYUmhMQ0J3WVhSb1UzUnlhVzVuSUNzZ0p5NXZZbXBsWTNSUVlYUm9KeXdnY0dGMGFGTjBjbWx1WnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhvTXo1N2RISmhibk5zWVhScGIyNHVjMlZzWldOMFNYUmxiWE5EYjI1MFlXbHVaWEo5UEM5b016NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhWc0lHTnNZWE56VG1GdFpUMWNJbXB6YjI0dGRISmxaVndpUG50MGFHbHpMbkpsYm1SbGNrNXZaR1Z6S0dSaGRHRXBmVHd2ZFd3K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JHVjBJRzlpYW1WamRFUmhkR0VnUFNCdlltcGxZM1JRWVhSb0xtZGxkQ2hrWVhSaExDQm1hV1ZzWkUxaGNDNXBkR1Z0UTI5dWRHRnBibVZ5S1R0Y2JseHVJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tFRnljbUY1TG1selFYSnlZWGtvYjJKcVpXTjBSR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZZbXBsWTNSRVlYUmhJRDBnYjJKcVpXTjBSR0YwWVZzd1hUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnWm05eUlDaHNaWFFnZTNCaGNtVnVkQ3dnYm05a1pTd2dhMlY1TENCd1lYUm9mU0J2WmlCdVpYY2djbVZqZFhKemFYWmxTWFJsY21GMGIzSW9iMkpxWldOMFJHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHNXZaR1VnSVQwOUlDZHZZbXBsWTNRbktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUd4bGRDQndZWFJvVTNSeWFXNW5JRDBnY0dGMGFDNXFiMmx1S0NjdUp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYW1WamRFUmhkR0VzSUhCaGRHaFRkSEpwYm1jc0lIQmhkR2hUZEhKcGJtY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGFETStlM1J5WVc1emJHRjBhVzl1TG5ObGJHVmpkRlJwZEd4bFEyOXVkR1Z1ZEgwOEwyZ3pQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGRXd2dZMnhoYzNOT1lXMWxQVndpYW5OdmJpMTBjbVZsWENJK2UzUm9hWE11Y21WdVpHVnlUbTlrWlhNb2IySnFaV04wUkdGMFlTbDlQQzkxYkQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVSaGRHRk1hWE4wT3lJc0ltbHRjRzl5ZENCRVlYUmhUR2x6ZENCbWNtOXRJQ2N1TDBSaGRHRk1hWE4wSnp0Y2JtbHRjRzl5ZENCblpYUkJjR2xFWVhSaElHWnliMjBnSnk0dUx5NHVMMVYwYVd4cGRHbGxjeTluWlhSQmNHbEVZWFJoSnp0Y2JseHVZMnhoYzNNZ1JtbGxiR1JUWld4bFkzUnBiMjRnWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZibk4wY25WamRHOXlLSEJ5YjNCektTQjdYRzRnSUNBZ0lDQWdJSE4xY0dWeUtIQnliM0J6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6ZEdGMFpTQTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHVnljbTl5T2lCdWRXeHNMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2FYTk1iMkZrWldRNklHWmhiSE5sTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdhWFJsYlhNNklGdGRYRzRnSUNBZ0lDQWdJSDA3WEc1Y2JpQWdJQ0FnSUNBZ2RHaHBjeTUxY0dSaGRHVkdhV1ZzWkUxaGNDQTlJSFJvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIWmhiSFZsS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JuWlhSRVlYUmhLQ2tnZTF4dUlDQWdJQ0FnSUNCamIyNXpkQ0I3ZFhKc0xDQjBjbUZ1YzJ4aGRHbHZibjBnUFNCMGFHbHpMbkJ5YjNCek8xeHVJQ0FnSUNBZ0lDQm5aWFJCY0dsRVlYUmhLSFZ5YkNsY2JpQWdJQ0FnSUNBZ0lDQWdJQzUwYUdWdUtGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDaDdjbVZ6ZFd4MGZTa2dQVDRnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvSVhKbGMzVnNkQ0I4ZkNCUFltcGxZM1F1YTJWNWN5aHlaWE4xYkhRcExteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhKeWIzSTZJRVZ5Y205eUtIUnlZVzV6YkdGMGFXOXVMbU52ZFd4a1RtOTBSbVYwWTJncExGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2x6VEc5aFpHVmtPaUIwY25WbFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRwYzB4dllXUmxaRG9nZEhKMVpTd2dhWFJsYlhNNklISmxjM1ZzZEgwcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHNJQ2g3WlhKeWIzSjlLU0E5UGlCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdWMyVjBVM1JoZEdVb2UybHpURzloWkdWa09pQjBjblZsTENCbGNuSnZjbjBwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdZMjl0Y0c5dVpXNTBSR2xrVFc5MWJuUW9LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVaMlYwUkdGMFlTZ3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2lncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzVnliQ3dnWm1sbGJHUk5ZWEFzSUhSeVlXNXpiR0YwYVc5dWZTQTlJSFJvYVhNdWNISnZjSE03WEc0Z0lDQWdJQ0FnSUdOdmJuTjBJSHRsY25KdmNpd2dhWE5NYjJGa1pXUXNJR2wwWlcxemZTQTlJSFJvYVhNdWMzUmhkR1U3WEc0Z0lDQWdJQ0FnSUdsbUlDaGxjbkp2Y2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRHhrYVhZZ1kyeGhjM05PWVcxbFBWd2libTkwYVdObElHNXZkR2xqWlMxbGNuSnZjaUJwYm14cGJtVmNJajQ4Y0Q1N1pYSnliM0l1YldWemMyRm5aWDA4TDNBK1BDOWthWFkrTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tDRnBjMHh2WVdSbFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpYzNCcGJtNWxjaUJwY3kxaFkzUnBkbVZjSWo0OEwyUnBkajQ3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1BFUmhkR0ZNYVhOMFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1pHRjBZVDE3YVhSbGJYTjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEpzUFh0MWNteDlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdabWxsYkdSTllYQTllMlpwWld4a1RXRndmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFZ3WkdGMFpVWnBaV3hrVFdGd1BYdDBhR2x6TG5Wd1pHRjBaVVpwWld4a1RXRndmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ5WVc1emJHRjBhVzl1UFh0MGNtRnVjMnhoZEdsdmJuMHZQanRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4xY2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1JtbGxiR1JUWld4bFkzUnBiMjQ3SWl3aVkyOXVjM1FnU1c1d2RYUkdhV1ZzWkhNZ1BTQW9lMlpwWld4a1RXRndMQ0IxY214OUtTQTlQbHh1SUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUR4cGJuQjFkQ0IwZVhCbFBWd2lhR2xrWkdWdVhDSWdibUZ0WlQxY0ltMXZaRjlxYzI5dVgzSmxibVJsY2w5MWNteGNJaUIyWVd4MVpUMTdkWEpzZlM4K1hHNGdJQ0FnSUNBZ0lEeHBibkIxZENCMGVYQmxQVndpYUdsa1pHVnVYQ0lnYm1GdFpUMWNJbTF2WkY5cWMyOXVYM0psYm1SbGNsOW1hV1ZzWkcxaGNGd2lJSFpoYkhWbFBYdEtVMDlPTG5OMGNtbHVaMmxtZVNobWFXVnNaRTFoY0NsOUx6NWNiaUFnSUNBOEwyUnBkajQ3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVsdWNIVjBSbWxsYkdSek95SXNJbU52Ym5OMElFeHBjM1JKZEdWdElEMGdLSHQyWVd4MVpTd2dZMmhwYkdSeVpXNHNJR1pwWld4a1RXRndMQ0J2WW1wbFkzUXNJRzl1UTJ4cFkydFVhWFJzWlN3Z2IyNURiR2xqYTBOdmJuUmxiblFzSUc5dVEyeHBZMnREYjI1MFlXbHVaWElzSUhSeVlXNXpiR0YwYVc5dWZTa2dQVDRnZTF4dUlDQWdJR2xtSUNoamFHbHNaSEpsYmlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z0tEeHNhVDVjYmlBZ0lDQWdJQ0FnSUNBZ0lIdEJjbkpoZVM1cGMwRnljbUY1S0c5aWFtVmpkQ2tnSmlZZ1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUE5UFQwZ2JuVnNiQ0EvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhOd1lXNCtQSE53WVc0Z1kyeGhjM05PWVcxbFBWd2laR0Z6YUdsamIyNXpJR1JoYzJocFkyOXVjeTF3YjNKMFptOXNhVzljSWo0OEwzTndZVzQrSUh0MllXeDFaWDBnUEdFZ2FISmxaajFjSWlOY0lpQmpiR0Z6YzA1aGJXVTlYQ0owY21WbExYTmxiR1ZqZEZ3aUlHUmhkR0V0Wm1sbGJHUTlYQ0pwZEdWdFEyOXVkR0ZwYm1WeVhDSWdiMjVEYkdsamF6MTdiMjVEYkdsamEwTnZiblJoYVc1bGNuMCtlM1J5WVc1emJHRjBhVzl1TG5ObGJHVmpkSDA4TDJFK1BDOXpjR0Z1UGlBNklDQThjM0JoYmo1N2RtRnNkV1Y5UEM5emNHRnVQbjFjYmlBZ0lDQWdJQ0FnSUNBZ0lEeDFiRDU3WTJocGJHUnlaVzU5UEM5MWJENWNiaUFnSUNBZ0lDQWdQQzlzYVQ0cE8xeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUFvUEd4cFBseHVJQ0FnSUNBZ0lDQWdJQ0FnZTJacFpXeGtUV0Z3TG5ScGRHeGxJRDA5UFNCdlltcGxZM1FnSmlZZ1ptbGxiR1JOWVhBdWRHbDBiR1VnUHlBOGMzUnliMjVuUG50MGNtRnVjMnhoZEdsdmJpNTBhWFJzWlgwNklEd3ZjM1J5YjI1blBpQTZJQ2NuZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdlMlpwWld4a1RXRndMbU52Ym5SbGJuUWdQVDA5SUc5aWFtVmpkQ0FtSmlCbWFXVnNaRTFoY0M1amIyNTBaVzUwSUQ4Z1BITjBjbTl1Wno1N2RISmhibk5zWVhScGIyNHVZMjl1ZEdWdWRIMDZJRHd2YzNSeWIyNW5QaUE2SUNjbmZWeHVJQ0FnSUNBZ0lDQWdJQ0FnUEhOd1lXNCtlM1poYkhWbGZUd3ZjM0JoYmo1Y2JpQWdJQ0FnSUNBZ0lDQWdJSHNoWm1sbGJHUk5ZWEF1ZEdsMGJHVWdKaVlnS0dacFpXeGtUV0Z3TG1OdmJuUmxiblFnSVQwOUlHOWlhbVZqZENrZ0ppWWdabWxsYkdSTllYQXVhWFJsYlVOdmJuUmhhVzVsY2lBaFBUMGdiblZzYkNBL1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHRWdhSEpsWmoxY0lpTmNJaUJqYkdGemMwNWhiV1U5WENKMGNtVmxMWE5sYkdWamRGd2lJR1JoZEdFdFptbGxiR1E5WENKMGFYUnNaVndpSUc5dVEyeHBZMnM5ZTI5dVEyeHBZMnRVYVhSc1pYMCtlM1J5WVc1emJHRjBhVzl1TG5ScGRHeGxmVHd2WVQ0Z09pQW5KMzFjYmlBZ0lDQWdJQ0FnSUNBZ0lIc2habWxsYkdSTllYQXVZMjl1ZEdWdWRDQW1KaUFvWm1sbGJHUk5ZWEF1ZEdsMGJHVWdJVDA5SUc5aWFtVmpkQ2tnSmlZZ1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUFoUFQwZ2JuVnNiQ0EvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdFZ2FISmxaajFjSWlOY0lpQmpiR0Z6YzA1aGJXVTlYQ0owY21WbExYTmxiR1ZqZEZ3aUlHUmhkR0V0Wm1sbGJHUTlYQ0pqYjI1MFpXNTBYQ0lnYjI1RGJHbGphejE3YjI1RGJHbGphME52Ym5SbGJuUjlQbnQwY21GdWMyeGhkR2x2Ymk1amIyNTBaVzUwZlR3dllUNGdPaUFuSjMxY2JpQWdJQ0FnSUNBZ1BDOXNhVDRwTzF4dUlDQWdJSDFjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElFeHBjM1JKZEdWdE95SXNJbWx0Y0c5eWRDQkdhV1ZzWkZObGJHVmpkR2x2YmlCbWNtOXRJQ2N1TDBacFpXeGtVMlZzWldOMGFXOXVKenRjYm1sdGNHOXlkQ0JKYm5CMWRFWnBaV3hrY3lCbWNtOXRJQ2N1TDBsdWNIVjBSbWxsYkdSekp6dGNibWx0Y0c5eWRDQlRkVzF0WVhKNUlHWnliMjBnSnk0dlUzVnRiV0Z5ZVNjN1hHNWNibU5zWVhOeklGTmxkSFJwYm1keklHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lod2NtOXdjeWtnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWh3Y205d2N5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J6YUc5M1JtbGxiR1JUWld4bFkzUnBiMjQ2SUdaaGJITmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUFuSnl4Y2JpQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndPaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVhSbGJVTnZiblJoYVc1bGNqb2diblZzYkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFYUnNaVG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZERvZ0p5ZGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZUdGNiaUFnSUNCOVhHNWNiaUFnSUNCamIyMXdiMjVsYm5SRWFXUk5iM1Z1ZENncElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1cGJtbDBUM0IwYVc5dWN5Z3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHbHVhWFJQY0hScGIyNXpLQ2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHMXZaRXB6YjI1U1pXNWtaWEl1YjNCMGFXOXVjeUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTnZibk4wSUc5d2RHbHZibk1nUFNCdGIyUktjMjl1VW1WdVpHVnlMbTl3ZEdsdmJuTTdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213NklHOXdkR2x2Ym5NdWRYSnNJRDhnYjNCMGFXOXVjeTUxY213Z09pQW5KeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRG9nYjNCMGFXOXVjeTVtYVdWc1pFMWhjQ0EvSUVwVFQwNHVjR0Z5YzJVb2IzQjBhVzl1Y3k1bWFXVnNaRTFoY0NrZ09pQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsMFpXMURiMjUwWVdsdVpYSTZJRzUxYkd3c1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJwZEd4bE9pQW5KeXhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVkR1Z1ZERvZ0p5ZGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nSVNGdmNIUnBiMjV6TG5WeWJGeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCMWNteERhR0Z1WjJVb1pYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3ZFhKc09pQmxkbVZ1ZEM1MFlYSm5aWFF1ZG1Gc2RXVjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQm9ZVzVrYkdWVGRXSnRhWFFvWlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnWlhabGJuUXVjSEpsZG1WdWRFUmxabUYxYkhRb0tUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dU9pQjBjblZsZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WelpYUlBjSFJwYjI1ektHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lM05vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nWm1Gc2MyVXNJSFZ5YkRvZ0p5Y3NJR1pwWld4a1RXRndPaUI3YVhSbGJVTnZiblJoYVc1bGNqb2diblZzYkN3Z2RHbDBiR1U2SUNjbkxDQmpiMjUwWlc1ME9pQW5KMzE5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCdVpYZFdZV3dnUFNCUFltcGxZM1F1WVhOemFXZHVLSFJvYVhNdWMzUmhkR1V1Wm1sbGJHUk5ZWEFzSUhaaGJIVmxLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdabWxsYkdSTllYQTZJRzVsZDFaaGJIMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2lncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzUnlZVzV6YkdGMGFXOXVmU0E5SUhSb2FYTXVjSEp2Y0hNN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUh0emFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0c0lIVnliSDBnUFNCMGFHbHpMbk4wWVhSbE8xeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN2FYUmxiVU52Ym5SaGFXNWxjaXdnZEdsMGJHVXNJR052Ym5SbGJuUjlJRDBnZEdocGN5NXpkR0YwWlM1bWFXVnNaRTFoY0R0Y2JseHVJQ0FnSUNBZ0lDQnBaaUFvZFhKc0lDWW1JR2wwWlcxRGIyNTBZV2x1WlhJZ0lUMDlJRzUxYkd3Z0ppWWdkR2wwYkdVZ0ppWWdZMjl1ZEdWdWRDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFUzVnRiV0Z5ZVNCN0xpNHVkR2hwY3k1emRHRjBaWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RISmhibk5zWVhScGIyNDllM1J5WVc1emJHRjBhVzl1ZlNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4U1c1d2RYUkdhV1ZzWkhNZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh3UGp4aElHaHlaV1k5WENJalhDSWdiMjVEYkdsamF6MTdkR2hwY3k1eVpYTmxkRTl3ZEdsdmJuTXVZbWx1WkNoMGFHbHpLWDBnWTJ4aGMzTk9ZVzFsUFZ3aVluVjBkRzl1WENJK2UzUnlZVzV6YkdGMGFXOXVMbkpsYzJWMFUyVjBkR2x1WjNOOVBDOWhQand2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzJodmQwWnBaV3hrVTJWc1pXTjBhVzl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhHYVdWc1pGTmxiR1ZqZEdsdmJpQjFjbXc5ZTNWeWJIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndQWHQwYUdsekxuTjBZWFJsTG1acFpXeGtUV0Z3ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYQmtZWFJsUm1sbGJHUk5ZWEE5ZTNSb2FYTXVkWEJrWVhSbFJtbGxiR1JOWVhBdVltbHVaQ2gwYUdsektYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ5WVc1emJHRjBhVzl1UFh0MGNtRnVjMnhoZEdsdmJuMHZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFNXNXdkWFJHYVdWc1pITWdleTR1TG5Sb2FYTXVjM1JoZEdWOUlDOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4d1BqeGhJR2h5WldZOVhDSWpYQ0lnYjI1RGJHbGphejE3ZEdocGN5NXlaWE5sZEU5d2RHbHZibk11WW1sdVpDaDBhR2x6S1gwZ1kyeGhjM05PWVcxbFBWd2lZblYwZEc5dVhDSStlM1J5WVc1emJHRjBhVzl1TG5KbGMyVjBVMlYwZEdsdVozTjlQQzloUGp3dmNENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMMlJwZGo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFlnWTJ4aGMzTk9ZVzFsUFZ3aWQzSmhjRndpUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThabTl5YlNCdmJsTjFZbTFwZEQxN2RHaHBjeTVvWVc1a2JHVlRkV0p0YVhRdVltbHVaQ2gwYUdsektYMCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThjRDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGJHRmlaV3crWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh6ZEhKdmJtYytRVkJKSUZWU1REd3ZjM1J5YjI1blBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2YkdGaVpXdytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdKeUx6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YVQ1N2RISmhibk5zWVhScGIyNHVkbUZzYVdSS2MyOXVWWEpzZlR3dmFUNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZjRDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhwYm5CMWRDQjBlWEJsUFZ3aWRHVjRkRndpSUdOc1lYTnpUbUZ0WlQxY0luVnliQzFwYm5CMWRGd2lJSFpoYkhWbFBYdDFjbXg5SUc5dVEyaGhibWRsUFh0MGFHbHpMblZ5YkVOb1lXNW5aUzVpYVc1a0tIUm9hWE1wZlM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGNENDhhVzV3ZFhRZ2RIbHdaVDFjSW5OMVltMXBkRndpSUdOc1lYTnpUbUZ0WlQxY0ltSjFkSFJ2YmlCaWRYUjBiMjR0Y0hKcGJXRnllVndpSUhaaGJIVmxQWHQwY21GdWMyeGhkR2x2Ymk1elpXNWtVbVZ4ZFdWemRIMHZQand2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzltYjNKdFBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4U1c1d2RYUkdhV1ZzWkhNZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCVFpYUjBhVzVuY3pzaUxDSmpiMjV6ZENCVGRXMXRZWEo1SUQwZ0tIdDFjbXdzSUdacFpXeGtUV0Z3TENCMGNtRnVjMnhoZEdsdmJuMHBJRDArWEc0Z0lDQWdQR1JwZGo1Y2JpQWdJQ0FnSUNBZ1BIQStYRzRnSUNBZ0lDQWdJQ0FnSUNBOGMzUnliMjVuUGtGUVNTQlZVa3c4TDNOMGNtOXVaejQ4WW5JdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnUEdFZ2FISmxaajE3ZFhKc2ZTQjBZWEpuWlhROVhDSmZZbXhoYm10Y0lqNTdkWEpzZlR3dllUNWNiaUFnSUNBZ0lDQWdQQzl3UGx4dUlDQWdJQ0FnSUNBOGNENWNiaUFnSUNBZ0lDQWdJQ0FnSUR4emRISnZibWMrZTNSeVlXNXpiR0YwYVc5dUxuUnBkR3hsZlR3dmMzUnliMjVuUGp4aWNpOCtYRzRnSUNBZ0lDQWdJQ0FnSUNCN1ptbGxiR1JOWVhBdWRHbDBiR1V1Y21Wd2JHRmpaU2duTGljc0lDY2c0b0NUUGlBbktYMWNiaUFnSUNBZ0lDQWdQQzl3UGx4dUlDQWdJQ0FnSUNBOGNENWNiaUFnSUNBZ0lDQWdJQ0FnSUR4emRISnZibWMrZTNSeVlXNXpiR0YwYVc5dUxtTnZiblJsYm5SOVBDOXpkSEp2Ym1jK1BHSnlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lIdG1hV1ZzWkUxaGNDNWpiMjUwWlc1MExuSmxjR3hoWTJVb0p5NG5MQ0FuSU9LQWt6NGdKeWw5WEc0Z0lDQWdJQ0FnSUR3dmNENWNiaUFnSUNBOEwyUnBkajQ3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUZOMWJXMWhjbms3SWl3aWFXMXdiM0owSUZObGRIUnBibWR6SUdaeWIyMGdKeTR2UTI5dGNHOXVaVzUwY3k5VFpYUjBhVzVuY3ljN1hHNWNibU52Ym5OMElHMXZaRXB6YjI1U1pXNWtaWEpGYkdWdFpXNTBJRDBnSjIxdlpIVnNZWEpwZEhrdGFuTnZiaTF5Wlc1a1pYSW5PMXh1WTI5dWMzUWdaRzl0Uld4bGJXVnVkQ0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLRzF2WkVwemIyNVNaVzVrWlhKRmJHVnRaVzUwS1R0Y2JtTnZibk4wSUh0MGNtRnVjMnhoZEdsdmJuMGdQU0J0YjJSS2MyOXVVbVZ1WkdWeU8xeHVYRzVTWldGamRFUlBUUzV5Wlc1a1pYSW9YRzRnSUNBZ1BGTmxkSFJwYm1keklIUnlZVzV6YkdGMGFXOXVQWHQwY21GdWMyeGhkR2x2Ym4wZ0x6NHNYRzRnSUNBZ1pHOXRSV3hsYldWdWRGeHVLVHNpTENKbWRXNWpkR2x2YmlCblpYUkJjR2xFWVhSaEtIVnliQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQm1aWFJqYUNoMWNtd3BYRzRnSUNBZ0lDQWdJQzUwYUdWdUtISmxjeUE5UGlCeVpYTXVhbk52YmlncEtWeHVJQ0FnSUNBZ0lDQXVkR2hsYmloY2JpQWdJQ0FnSUNBZ0lDQWdJQ2h5WlhOMWJIUXBJRDArSUNoN2NtVnpkV3gwZlNrc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FvWlhKeWIzSXBJRDArSUNoN1pYSnliM0o5S1Z4dUlDQWdJQ0FnSUNBcE8xeHVmVnh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JuWlhSQmNHbEVZWFJoTzF4dUlsMTlcbiJdLCJmaWxlIjoiQWRtaW4vSW5kZXhBZG1pbi5qcyJ9
