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

var _recursiveIterator = _interopRequireDefault(require("recursive-iterator"));

var _objectPath = _interopRequireDefault(require("object-path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

var _React = React,
    Component = _React.Component;
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
function (_Component) {
  _inherits(Settings, _Component);

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
        return React.createElement("div", null, React.createElement(Summary, this.state), React.createElement(InputFields, this.state), React.createElement("a", {
          href: "#",
          onClick: this.resetOptions,
          className: "button"
        }, "Reset settings"));
      } else if (showFieldSelection) {
        return React.createElement("div", null, React.createElement(FieldSelection, {
          url: url,
          fieldMap: this.state.fieldMap,
          updateFieldMap: this.updateFieldMap
        }), React.createElement(InputFields, this.state), React.createElement("a", {
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
        }))), React.createElement(InputFields, this.state));
      }
    }
  }]);

  return Settings;
}(Component); //========================================================


exports.default = Settings;

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
} //========================================================


function Summary(props) {
  return React.createElement("div", null, React.createElement("ul", null, React.createElement("li", {
    style: {
      wordBreak: 'break-all'
    }
  }, "Data source: ", props.url), React.createElement("li", null, "Title: ", props.fieldMap.title), React.createElement("li", null, "Content: ", props.fieldMap.content)));
} //========================================================


var FieldSelection =
/*#__PURE__*/
function (_Component2) {
  _inherits(FieldSelection, _Component2);

  function FieldSelection(props) {
    var _this2;

    _classCallCheck(this, FieldSelection);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(FieldSelection).call(this, props));
    _this2.state = {
      error: null,
      isLoaded: false,
      items: []
    };
    _this2.updateFieldMap = _this2.updateFieldMap.bind(_assertThisInitialized(_assertThisInitialized(_this2)));
    return _this2;
  }

  _createClass(FieldSelection, [{
    key: "updateFieldMap",
    value: function updateFieldMap(value) {
      this.props.updateFieldMap(value);
    } // TODO flytta till egen class

  }, {
    key: "getApiData",
    value: function getApiData() {
      var _this3 = this;

      fetch(this.props.url).then(function (res) {
        return res.json();
      }).then(function (result) {
        _this3.setState({
          isLoaded: true,
          items: result
        });
      }, function (error) {
        _this3.setState({
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
      var _this$state2 = this.state,
          error = _this$state2.error,
          isLoaded = _this$state2.isLoaded,
          items = _this$state2.items;

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
        return React.createElement(DataList, {
          data: items,
          url: this.props.url,
          fieldMap: this.props.fieldMap,
          updateFieldMap: this.updateFieldMap
        });
      }
    }
  }]);

  return FieldSelection;
}(Component); //========================================================


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
} //========================================================


var DataList =
/*#__PURE__*/
function (_Component3) {
  _inherits(DataList, _Component3);

  function DataList(props) {
    var _this4;

    _classCallCheck(this, DataList);

    _this4 = _possibleConstructorReturn(this, _getPrototypeOf(DataList).call(this, props));
    _this4.renderNodes = _this4.renderNodes.bind(_assertThisInitialized(_assertThisInitialized(_this4)));
    _this4.setFieldMap = _this4.setFieldMap.bind(_assertThisInitialized(_assertThisInitialized(_this4)));
    return _this4;
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
      var _this5 = this;

      return Object.keys(data).map(function (item) {
        if (item === 'objectPath') {
          return;
        }

        var child = React.createElement(ListItem, {
          key: item.toString(),
          value: item,
          object: data[item],
          fieldMap: _this5.props.fieldMap,
          onClickContainer: function onClickContainer(e) {
            return _this5.setFieldMap(data[item].objectPath, e);
          },
          onClickTitle: function onClickTitle(e) {
            return _this5.setFieldMap(data[item], e);
          },
          onClickContent: function onClickContent(e) {
            return _this5.setFieldMap(data[item], e);
          }
        });

        if (_typeof(data[item]) === 'object' && data[item] !== null) {
          child = React.cloneElement(child, {
            children: Array.isArray(data[item]) ? _this5.renderNodes(data[item][0]) : _this5.renderNodes(data[item])
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
}(Component); //========================================================

},{"object-path":1,"recursive-iterator":2}],5:[function(require,module,exports){
"use strict";

var _Settings = _interopRequireDefault(require("./Components/Settings"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var modJsonRenderElement = 'modularity-json-render';
var domElement = document.getElementById(modJsonRenderElement);
ReactDOM.render(React.createElement(_Settings.default, null), domElement);

},{"./Components/Settings":4}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmVjdXJzaXZlLWl0ZXJhdG9yL3NyYy9SZWN1cnNpdmVJdGVyYXRvci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL2xhbmcuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9TZXR0aW5ncy5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbmNvbnN0IHtpc09iamVjdCwgZ2V0S2V5c30gPSByZXF1aXJlKCcuL2xhbmcnKVxuXG4vLyBQUklWQVRFIFBST1BFUlRJRVNcbmNvbnN0IEJZUEFTU19NT0RFID0gJ19fYnlwYXNzTW9kZSdcbmNvbnN0IElHTk9SRV9DSVJDVUxBUiA9ICdfX2lnbm9yZUNpcmN1bGFyJ1xuY29uc3QgTUFYX0RFRVAgPSAnX19tYXhEZWVwJ1xuY29uc3QgQ0FDSEUgPSAnX19jYWNoZSdcbmNvbnN0IFFVRVVFID0gJ19fcXVldWUnXG5jb25zdCBTVEFURSA9ICdfX3N0YXRlJ1xuXG5jb25zdCBFTVBUWV9TVEFURSA9IHt9XG5cbmNsYXNzIFJlY3Vyc2l2ZUl0ZXJhdG9yIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSByb290XG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbYnlwYXNzTW9kZT0wXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtpZ25vcmVDaXJjdWxhcj1mYWxzZV1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFttYXhEZWVwPTEwMF1cbiAgICovXG4gIGNvbnN0cnVjdG9yIChyb290LCBieXBhc3NNb2RlID0gMCwgaWdub3JlQ2lyY3VsYXIgPSBmYWxzZSwgbWF4RGVlcCA9IDEwMCkge1xuICAgIHRoaXNbQllQQVNTX01PREVdID0gYnlwYXNzTW9kZVxuICAgIHRoaXNbSUdOT1JFX0NJUkNVTEFSXSA9IGlnbm9yZUNpcmN1bGFyXG4gICAgdGhpc1tNQVhfREVFUF0gPSBtYXhEZWVwXG4gICAgdGhpc1tDQUNIRV0gPSBbXVxuICAgIHRoaXNbUVVFVUVdID0gW11cbiAgICB0aGlzW1NUQVRFXSA9IHRoaXMuZ2V0U3RhdGUodW5kZWZpbmVkLCByb290KVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgbmV4dCAoKSB7XG4gICAgY29uc3Qge25vZGUsIHBhdGgsIGRlZXB9ID0gdGhpc1tTVEFURV0gfHwgRU1QVFlfU1RBVEVcblxuICAgIGlmICh0aGlzW01BWF9ERUVQXSA+IGRlZXApIHtcbiAgICAgIGlmICh0aGlzLmlzTm9kZShub2RlKSkge1xuICAgICAgICBpZiAodGhpcy5pc0NpcmN1bGFyKG5vZGUpKSB7XG4gICAgICAgICAgaWYgKHRoaXNbSUdOT1JFX0NJUkNVTEFSXSkge1xuICAgICAgICAgICAgLy8gc2tpcFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NpcmN1bGFyIHJlZmVyZW5jZScpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0aGlzLm9uU3RlcEludG8odGhpc1tTVEFURV0pKSB7XG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdG9ycyA9IHRoaXMuZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzKG5vZGUsIHBhdGgsIGRlZXApXG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSB0aGlzW0JZUEFTU19NT0RFXSA/ICdwdXNoJyA6ICd1bnNoaWZ0J1xuICAgICAgICAgICAgdGhpc1tRVUVVRV1bbWV0aG9kXSguLi5kZXNjcmlwdG9ycylcbiAgICAgICAgICAgIHRoaXNbQ0FDSEVdLnB1c2gobm9kZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IHRoaXNbUVVFVUVdLnNoaWZ0KClcbiAgICBjb25zdCBkb25lID0gIXZhbHVlXG5cbiAgICB0aGlzW1NUQVRFXSA9IHZhbHVlXG5cbiAgICBpZiAoZG9uZSkgdGhpcy5kZXN0cm95KClcblxuICAgIHJldHVybiB7dmFsdWUsIGRvbmV9XG4gIH1cbiAgLyoqXG4gICAqXG4gICAqL1xuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzW1FVRVVFXS5sZW5ndGggPSAwXG4gICAgdGhpc1tDQUNIRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbU1RBVEVdID0gbnVsbFxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzTm9kZSAoYW55KSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0xlYWYgKGFueSkge1xuICAgIHJldHVybiAhdGhpcy5pc05vZGUoYW55KVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzQ2lyY3VsYXIgKGFueSkge1xuICAgIHJldHVybiB0aGlzW0NBQ0hFXS5pbmRleE9mKGFueSkgIT09IC0xXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGVzIG9mIGNoaWxkIG5vZGVzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhdGhcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlZXBcbiAgICogQHJldHVybnMge0FycmF5PE9iamVjdD59XG4gICAqL1xuICBnZXRTdGF0ZXNPZkNoaWxkTm9kZXMgKG5vZGUsIHBhdGgsIGRlZXApIHtcbiAgICByZXR1cm4gZ2V0S2V5cyhub2RlKS5tYXAoa2V5ID0+XG4gICAgICB0aGlzLmdldFN0YXRlKG5vZGUsIG5vZGVba2V5XSwga2V5LCBwYXRoLmNvbmNhdChrZXkpLCBkZWVwICsgMSlcbiAgICApXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGUgb2Ygbm9kZS4gQ2FsbHMgZm9yIGVhY2ggbm9kZVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3BhcmVudF1cbiAgICogQHBhcmFtIHsqfSBbbm9kZV1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXldXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtwYXRoXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW2RlZXBdXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBnZXRTdGF0ZSAocGFyZW50LCBub2RlLCBrZXksIHBhdGggPSBbXSwgZGVlcCA9IDApIHtcbiAgICByZXR1cm4ge3BhcmVudCwgbm9kZSwga2V5LCBwYXRoLCBkZWVwfVxuICB9XG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvblN0ZXBJbnRvIChzdGF0ZSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtSZWN1cnNpdmVJdGVyYXRvcn1cbiAgICovXG4gIFtTeW1ib2wuaXRlcmF0b3JdICgpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjdXJzaXZlSXRlcmF0b3JcbiIsIid1c2Ugc3RyaWN0J1xuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0IChhbnkpIHtcbiAgcmV0dXJuIGFueSAhPT0gbnVsbCAmJiB0eXBlb2YgYW55ID09PSAnb2JqZWN0J1xufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmNvbnN0IHtpc0FycmF5fSA9IEFycmF5XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNBcnJheUxpa2UgKGFueSkge1xuICBpZiAoIWlzT2JqZWN0KGFueSkpIHJldHVybiBmYWxzZVxuICBpZiAoISgnbGVuZ3RoJyBpbiBhbnkpKSByZXR1cm4gZmFsc2VcbiAgY29uc3QgbGVuZ3RoID0gYW55Lmxlbmd0aFxuICBpZiAoIWlzTnVtYmVyKGxlbmd0aCkpIHJldHVybiBmYWxzZVxuICBpZiAobGVuZ3RoID4gMCkge1xuICAgIHJldHVybiAobGVuZ3RoIC0gMSkgaW4gYW55XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYW55KSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWJlciAoYW55KSB7XG4gIHJldHVybiB0eXBlb2YgYW55ID09PSAnbnVtYmVyJ1xufVxuLyoqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gb2JqZWN0XG4gKiBAcmV0dXJucyB7QXJyYXk8U3RyaW5nPn1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5cyAob2JqZWN0KSB7XG4gIGNvbnN0IGtleXNfID0gT2JqZWN0LmtleXMob2JqZWN0KVxuICBpZiAoaXNBcnJheShvYmplY3QpKSB7XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSBpZiAoaXNBcnJheUxpa2Uob2JqZWN0KSkge1xuICAgIGNvbnN0IGluZGV4ID0ga2V5c18uaW5kZXhPZignbGVuZ3RoJylcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAga2V5c18uc3BsaWNlKGluZGV4LCAxKVxuICAgIH1cbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIHtcbiAgICAvLyBzb3J0XG4gICAga2V5c18uc29ydCgpXG4gIH1cbiAgcmV0dXJuIGtleXNfXG59XG5cbmV4cG9ydHMuZ2V0S2V5cyA9IGdldEtleXNcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXlcbmV4cG9ydHMuaXNBcnJheUxpa2UgPSBpc0FycmF5TGlrZVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXJcbiIsImxldCB7Q29tcG9uZW50fSA9IFJlYWN0O1xuXG5jb25zdCBpbml0aWFsU3RhdGUgPSB7XG4gICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICB1cmw6ICcnLFxuICAgIGZpZWxkTWFwOiB7XG4gICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgY29udGVudDogJydcbiAgICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZXR0aW5ncyBleHRlbmRzIENvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0gaW5pdGlhbFN0YXRlO1xuXG4gICAgICAgIHRoaXMudXJsQ2hhbmdlID0gdGhpcy51cmxDaGFuZ2UuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5oYW5kbGVTdWJtaXQgPSB0aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlc2V0T3B0aW9ucyA9IHRoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMudXBkYXRlRmllbGRNYXAgPSB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuaW5pdE9wdGlvbnMoKTtcbiAgICB9XG5cbiAgICBpbml0T3B0aW9ucygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2RKc29uUmVuZGVyLm9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gbW9kSnNvblJlbmRlci5vcHRpb25zO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge2l0ZW1Db250YWluZXI6IG51bGwsIHRpdGxlOiAnJywgY29udGVudDogJyd9LFxuICAgICAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dXJsOiBldmVudC50YXJnZXQudmFsdWV9KTtcbiAgICB9XG5cbiAgICBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7c2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoaW5pdGlhbFN0YXRlKTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmllbGRNYXA6IG5ld1ZhbH0pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3Nob3dGaWVsZFNlbGVjdGlvbiwgdXJsfSA9IHRoaXMuc3RhdGU7XG4gICAgICAgIGNvbnN0IHtpdGVtQ29udGFpbmVyLCB0aXRsZSwgY29udGVudH0gPSB0aGlzLnN0YXRlLmZpZWxkTWFwO1xuXG4gICAgICAgIGlmICh1cmwgJiYgaXRlbUNvbnRhaW5lciAhPT0gbnVsbCAmJiB0aXRsZSAmJiBjb250ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxTdW1tYXJ5IHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnN9IGNsYXNzTmFtZT1cImJ1dHRvblwiPlJlc2V0IHNldHRpbmdzPC9hPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChzaG93RmllbGRTZWxlY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPEZpZWxkU2VsZWN0aW9uIHVybD17dXJsfSBmaWVsZE1hcD17dGhpcy5zdGF0ZS5maWVsZE1hcH0gdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXB9Lz5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIG9uQ2xpY2s9e3RoaXMucmVzZXRPcHRpb25zfSBjbGFzc05hbWU9XCJidXR0b25cIj5SZXNldCBzZXR0aW5nczwvYT5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwid3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICA8Zm9ybSBvblN1Ym1pdD17dGhpcy5oYW5kbGVTdWJtaXR9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPkRhdGEgc291cmNlPC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnIvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpPkVudGVyIGEgdmFsaWQgSlNPTiBhcGkgdXJsLjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHN0eWxlPXt7d2lkdGg6ICcxMDAlJ319IHZhbHVlPXt1cmx9IG9uQ2hhbmdlPXt0aGlzLnVybENoYW5nZX0vPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+PGlucHV0IHR5cGU9XCJzdWJtaXRcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXByaW1hcnlcIiB2YWx1ZT1cIlN1Ym1pdFwiLz48L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBJbnB1dEZpZWxkcyhwcm9wcykge1xuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJtb2RfanNvbl9yZW5kZXJfdXJsXCIgdmFsdWU9e3Byb3BzLnVybH0vPlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX2ZpZWxkbWFwXCIgdmFsdWU9e0pTT04uc3RyaW5naWZ5KHByb3BzLmZpZWxkTWFwKX0vPlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIFN1bW1hcnkocHJvcHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPHVsPlxuICAgICAgICAgICAgICAgIDxsaSBzdHlsZT17e3dvcmRCcmVhazogJ2JyZWFrLWFsbCd9fT5EYXRhIHNvdXJjZToge3Byb3BzLnVybH08L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5UaXRsZToge3Byb3BzLmZpZWxkTWFwLnRpdGxlfTwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkNvbnRlbnQ6IHtwcm9wcy5maWVsZE1hcC5jb250ZW50fTwvbGk+XG4gICAgICAgICAgICA8L3VsPlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufVxuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNsYXNzIEZpZWxkU2VsZWN0aW9uIGV4dGVuZHMgQ29tcG9uZW50IHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGl0ZW1zOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMudXBkYXRlRmllbGRNYXAgPSB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyk7XG4gICAgfVxuXG4gICAgdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyBmbHl0dGEgdGlsbCBlZ2VuIGNsYXNzXG4gICAgZ2V0QXBpRGF0YSgpIHtcbiAgICAgICAgZmV0Y2godGhpcy5wcm9wcy51cmwpXG4gICAgICAgICAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuZ2V0QXBpRGF0YSgpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge2Vycm9yLCBpc0xvYWRlZCwgaXRlbXN9ID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdj5FcnJvcjoge2Vycm9yLm1lc3NhZ2V9PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIiBzdHlsZT17e2Zsb2F0OiAnbm9uZScsIGRpc3BsYXk6ICdibG9jaycsIHdpZHRoOiAnYXV0bycsIGhlaWdodDogJ2F1dG8nLCBwYWRkaW5nOiAnMTBweCAxMHB4IDMwcHggMTBweCd9fT48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gPERhdGFMaXN0XG4gICAgICAgICAgICAgICAgZGF0YT17aXRlbXN9XG4gICAgICAgICAgICAgICAgdXJsPXt0aGlzLnByb3BzLnVybH1cbiAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICB1cGRhdGVGaWVsZE1hcD17dGhpcy51cGRhdGVGaWVsZE1hcH0vPjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBMaXN0SXRlbShwcm9wcykge1xuICAgIGNvbnN0IHt2YWx1ZSwgY2hpbGRyZW4sIGZpZWxkTWFwLCBvYmplY3QsIG9uQ2xpY2tUaXRsZSwgb25DbGlja0NvbnRlbnQsIG9uQ2xpY2tDb250YWluZXJ9ID0gcHJvcHM7XG4gICAgcmV0dXJuICg8bGk+XG4gICAgICAgIHtmaWVsZE1hcC50aXRsZSA9PT0gb2JqZWN0ID8gPHN0cm9uZz5UaXRsZTogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgIHtmaWVsZE1hcC5jb250ZW50ID09PSBvYmplY3QgPyA8c3Ryb25nPkNvbnRlbnQ6IDwvc3Ryb25nPiA6ICcnfVxuICAgICAgICB7Y2hpbGRyZW4gPyA8c3Ryb25nPnt2YWx1ZX08L3N0cm9uZz4gOiA8c3Bhbj57dmFsdWV9PC9zcGFuPn1cbiAgICAgICAgeyFjaGlsZHJlbiAmJiAhZmllbGRNYXAudGl0bGUgJiYgKGZpZWxkTWFwLmNvbnRlbnQgIT09IG9iamVjdCkgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/XG4gICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cImJ1dHRvbiBidXR0b24tc21hbGxcIiBkYXRhLWZpZWxkPVwidGl0bGVcIiBvbkNsaWNrPXtvbkNsaWNrVGl0bGV9PlRpdGxlPC9hPiA6ICcnfVxuICAgICAgICB7IWNoaWxkcmVuICYmIChmaWVsZE1hcC50aXRsZSAhPT0gb2JqZWN0KSAmJiAhZmllbGRNYXAuY29udGVudCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiIGRhdGEtZmllbGQ9XCJjb250ZW50XCJcbiAgICAgICAgICAgICAgIG9uQ2xpY2s9e29uQ2xpY2tDb250ZW50fT5Db250ZW50PC9hPiA6ICcnfVxuICAgICAgICB7Y2hpbGRyZW4gJiYgQXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgP1xuICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXNtYWxsXCIgZGF0YS1maWVsZD1cIml0ZW1Db250YWluZXJcIlxuICAgICAgICAgICAgICAgb25DbGljaz17b25DbGlja0NvbnRhaW5lcn0+U2VsZWN0PC9hPiA6ICcnfVxuICAgICAgICB7Y2hpbGRyZW4gPyA8c3BhbiBjbGFzc05hbWU9XCJkYXNoaWNvbnMgZGFzaGljb25zLWFycm93LWRvd25cIj48L3NwYW4+IDogJyd9XG4gICAgICAgIHtjaGlsZHJlbiA/IDx1bCBzdHlsZT17e3BhZGRpbmdMZWZ0OiAxNSwgYm9yZGVyTGVmdDogJzJweCBzb2xpZCAjY2NjJ319PntjaGlsZHJlbn08L3VsPiA6ICcnfVxuICAgIDwvbGk+KTtcbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pbXBvcnQgcmVjdXJzaXZlSXRlcmF0b3IgZnJvbSAncmVjdXJzaXZlLWl0ZXJhdG9yJztcbmltcG9ydCBvYmplY3RQYXRoIGZyb20gJ29iamVjdC1wYXRoJztcblxuY2xhc3MgRGF0YUxpc3QgZXh0ZW5kcyBDb21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5yZW5kZXJOb2RlcyA9IHRoaXMucmVuZGVyTm9kZXMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zZXRGaWVsZE1hcCA9IHRoaXMuc2V0RmllbGRNYXAuYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBzZXRGaWVsZE1hcChwYXRoLCBldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHtbZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGRdOiBwYXRofSk7XG4gICAgfVxuXG4gICAgcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGNoaWxkID0gPExpc3RJdGVtIGtleT17aXRlbS50b1N0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtpdGVtfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdD17ZGF0YVtpdGVtXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGFpbmVyPXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrVGl0bGU9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGVudD17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfS8+O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbaXRlbV0gPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiB0aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgICAgbGV0IGRhdGEgPSB0aGlzLnByb3BzLmRhdGE7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3IoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IGl0ZW1zIGNvbnRhaW5lcjwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bD57dGhpcy5yZW5kZXJOb2RlcyhkYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBvYmplY3REYXRhID0gb2JqZWN0UGF0aC5nZXQodGhpcy5wcm9wcy5kYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3Iob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFBhdGguc2V0KG9iamVjdERhdGEsIHBhdGhTdHJpbmcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+U2VsZWN0IHRpdGxlIGFuZCBjb250ZW50IGZpZWxkczwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bD57dGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKX08L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuIiwiaW1wb3J0IFNldHRpbmdzIGZyb20gJy4vQ29tcG9uZW50cy9TZXR0aW5ncyc7XG5cbmNvbnN0IG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xuY29uc3QgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcblxuUmVhY3RET00ucmVuZGVyKFxuICAgIDxTZXR0aW5ncyAvPixcbiAgICBkb21FbGVtZW50XG4pOyJdfQ==

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7aXNPYmplY3QsIGdldEtleXN9ID0gcmVxdWlyZSgnLi9sYW5nJylcblxuLy8gUFJJVkFURSBQUk9QRVJUSUVTXG5jb25zdCBCWVBBU1NfTU9ERSA9ICdfX2J5cGFzc01vZGUnXG5jb25zdCBJR05PUkVfQ0lSQ1VMQVIgPSAnX19pZ25vcmVDaXJjdWxhcidcbmNvbnN0IE1BWF9ERUVQID0gJ19fbWF4RGVlcCdcbmNvbnN0IENBQ0hFID0gJ19fY2FjaGUnXG5jb25zdCBRVUVVRSA9ICdfX3F1ZXVlJ1xuY29uc3QgU1RBVEUgPSAnX19zdGF0ZSdcblxuY29uc3QgRU1QVFlfU1RBVEUgPSB7fVxuXG5jbGFzcyBSZWN1cnNpdmVJdGVyYXRvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlQ2lyY3VsYXI9ZmFsc2VdXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocm9vdCwgYnlwYXNzTW9kZSA9IDAsIGlnbm9yZUNpcmN1bGFyID0gZmFsc2UsIG1heERlZXAgPSAxMDApIHtcbiAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGVcbiAgICB0aGlzW0lHTk9SRV9DSVJDVUxBUl0gPSBpZ25vcmVDaXJjdWxhclxuICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcFxuICAgIHRoaXNbQ0FDSEVdID0gW11cbiAgICB0aGlzW1FVRVVFXSA9IFtdXG4gICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdClcbiAgfVxuICAvKipcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIG5leHQgKCkge1xuICAgIGNvbnN0IHtub2RlLCBwYXRoLCBkZWVwfSA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFXG5cbiAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG4gICAgICBpZiAodGhpcy5pc05vZGUobm9kZSkpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNDaXJjdWxhcihub2RlKSkge1xuICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHtcbiAgICAgICAgICAgIC8vIHNraXBcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWxhciByZWZlcmVuY2UnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKVxuICAgICAgICAgICAgY29uc3QgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyAncHVzaCcgOiAndW5zaGlmdCdcbiAgICAgICAgICAgIHRoaXNbUVVFVUVdW21ldGhvZF0oLi4uZGVzY3JpcHRvcnMpXG4gICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSB0aGlzW1FVRVVFXS5zaGlmdCgpXG4gICAgY29uc3QgZG9uZSA9ICF2YWx1ZVxuXG4gICAgdGhpc1tTVEFURV0gPSB2YWx1ZVxuXG4gICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpXG5cbiAgICByZXR1cm4ge3ZhbHVlLCBkb25lfVxuICB9XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDBcbiAgICB0aGlzW1NUQVRFXSA9IG51bGxcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc05vZGUgKGFueSkge1xuICAgIHJldHVybiBpc09iamVjdChhbnkpXG4gIH1cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gYW55XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaXNMZWFmIChhbnkpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0NpcmN1bGFyIChhbnkpIHtcbiAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG4gICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuICAgKi9cbiAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzIChub2RlLCBwYXRoLCBkZWVwKSB7XG4gICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGtleSA9PlxuICAgICAgdGhpcy5nZXRTdGF0ZShub2RlLCBub2RlW2tleV0sIGtleSwgcGF0aC5jb25jYXQoa2V5KSwgZGVlcCArIDEpXG4gICAgKVxuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIHN0YXRlIG9mIG5vZGUuIENhbGxzIGZvciBlYWNoIG5vZGVcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwYXJlbnRdXG4gICAqIEBwYXJhbSB7Kn0gW25vZGVdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBba2V5XVxuICAgKiBAcGFyYW0ge0FycmF5fSBbcGF0aF1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtkZWVwXVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U3RhdGUgKHBhcmVudCwgbm9kZSwga2V5LCBwYXRoID0gW10sIGRlZXAgPSAwKSB7XG4gICAgcmV0dXJuIHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aCwgZGVlcH1cbiAgfVxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb25TdGVwSW50byAoc3RhdGUpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UmVjdXJzaXZlSXRlcmF0b3J9XG4gICAqL1xuICBbU3ltYm9sLml0ZXJhdG9yXSAoKSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yXG5cbn0se1wiLi9sYW5nXCI6M31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QgKGFueSkge1xuICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09ICdvYmplY3QnXG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuY29uc3Qge2lzQXJyYXl9ID0gQXJyYXlcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5TGlrZSAoYW55KSB7XG4gIGlmICghaXNPYmplY3QoYW55KSkgcmV0dXJuIGZhbHNlXG4gIGlmICghKCdsZW5ndGgnIGluIGFueSkpIHJldHVybiBmYWxzZVxuICBjb25zdCBsZW5ndGggPSBhbnkubGVuZ3RoXG4gIGlmICghaXNOdW1iZXIobGVuZ3RoKSkgcmV0dXJuIGZhbHNlXG4gIGlmIChsZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIChsZW5ndGggLSAxKSBpbiBhbnlcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBhbnkpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyIChhbnkpIHtcbiAgcmV0dXJuIHR5cGVvZiBhbnkgPT09ICdudW1iZXInXG59XG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheTxTdHJpbmc+fVxuICovXG5mdW5jdGlvbiBnZXRLZXlzIChvYmplY3QpIHtcbiAgY29uc3Qga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHtcbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG4gICAgY29uc3QgaW5kZXggPSBrZXlzXy5pbmRleE9mKCdsZW5ndGgnKVxuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgfVxuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2Uge1xuICAgIC8vIHNvcnRcbiAgICBrZXlzXy5zb3J0KClcbiAgfVxuICByZXR1cm4ga2V5c19cbn1cblxuZXhwb3J0cy5nZXRLZXlzID0gZ2V0S2V5c1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheVxuZXhwb3J0cy5pc0FycmF5TGlrZSA9IGlzQXJyYXlMaWtlXG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3RcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlclxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX3JlY3Vyc2l2ZUl0ZXJhdG9yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwicmVjdXJzaXZlLWl0ZXJhdG9yXCIpKTtcblxudmFyIF9vYmplY3RQYXRoID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwib2JqZWN0LXBhdGhcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHZhbHVlKSB7IGlmIChrZXkgaW4gb2JqKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgeyB2YWx1ZTogdmFsdWUsIGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUgfSk7IH0gZWxzZSB7IG9ialtrZXldID0gdmFsdWU7IH0gcmV0dXJuIG9iajsgfVxuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG5mdW5jdGlvbiBfZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgdmFyIGRlc2NyaXB0b3IgPSBwcm9wc1tpXTsgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZGVzY3JpcHRvci5lbnVtZXJhYmxlIHx8IGZhbHNlOyBkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSA9IHRydWU7IGlmIChcInZhbHVlXCIgaW4gZGVzY3JpcHRvcikgZGVzY3JpcHRvci53cml0YWJsZSA9IHRydWU7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGRlc2NyaXB0b3Iua2V5LCBkZXNjcmlwdG9yKTsgfSB9XG5cbmZ1bmN0aW9uIF9jcmVhdGVDbGFzcyhDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9XG5cbmZ1bmN0aW9uIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHNlbGYsIGNhbGwpIHsgaWYgKGNhbGwgJiYgKF90eXBlb2YoY2FsbCkgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIGNhbGwgPT09IFwiZnVuY3Rpb25cIikpIHsgcmV0dXJuIGNhbGw7IH0gcmV0dXJuIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZik7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxudmFyIF9SZWFjdCA9IFJlYWN0LFxuICAgIENvbXBvbmVudCA9IF9SZWFjdC5Db21wb25lbnQ7XG52YXIgaW5pdGlhbFN0YXRlID0ge1xuICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICB1cmw6ICcnLFxuICBmaWVsZE1hcDoge1xuICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgdGl0bGU6ICcnLFxuICAgIGNvbnRlbnQ6ICcnXG4gIH1cbn07XG5cbnZhciBTZXR0aW5ncyA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX0NvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoU2V0dGluZ3MsIF9Db21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIFNldHRpbmdzKHByb3BzKSB7XG4gICAgdmFyIF90aGlzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFNldHRpbmdzKTtcblxuICAgIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKFNldHRpbmdzKS5jYWxsKHRoaXMsIHByb3BzKSk7XG4gICAgX3RoaXMuc3RhdGUgPSBpbml0aWFsU3RhdGU7XG4gICAgX3RoaXMudXJsQ2hhbmdlID0gX3RoaXMudXJsQ2hhbmdlLmJpbmQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF90aGlzKSkpO1xuICAgIF90aGlzLmhhbmRsZVN1Ym1pdCA9IF90aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICBfdGhpcy5yZXNldE9wdGlvbnMgPSBfdGhpcy5yZXNldE9wdGlvbnMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMpKSk7XG4gICAgX3RoaXMudXBkYXRlRmllbGRNYXAgPSBfdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpcykpKTtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoU2V0dGluZ3MsIFt7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJpbml0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBpbml0T3B0aW9ucygpIHtcbiAgICAgIGlmICh0eXBlb2YgbW9kSnNvblJlbmRlci5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IG1vZEpzb25SZW5kZXIub3B0aW9ucztcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVybENoYW5nZVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB1cmw6IGV2ZW50LnRhcmdldC52YWx1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImhhbmRsZVN1Ym1pdFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVzZXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoaW5pdGlhbFN0YXRlKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwidXBkYXRlRmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgIHZhciBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBmaWVsZE1hcDogbmV3VmFsXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSA9IHRoaXMuc3RhdGUsXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uID0gX3RoaXMkc3RhdGUuc2hvd0ZpZWxkU2VsZWN0aW9uLFxuICAgICAgICAgIHVybCA9IF90aGlzJHN0YXRlLnVybDtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSRmaWVsZE1hcCA9IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgaXRlbUNvbnRhaW5lciA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLml0ZW1Db250YWluZXIsXG4gICAgICAgICAgdGl0bGUgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC50aXRsZSxcbiAgICAgICAgICBjb250ZW50ID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuY29udGVudDtcblxuICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChTdW1tYXJ5LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChJbnB1dEZpZWxkcywgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucyxcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uXCJcbiAgICAgICAgfSwgXCJSZXNldCBzZXR0aW5nc1wiKSk7XG4gICAgICB9IGVsc2UgaWYgKHNob3dGaWVsZFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KEZpZWxkU2VsZWN0aW9uLCB7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZmllbGRNYXA6IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgdXBkYXRlRmllbGRNYXA6IHRoaXMudXBkYXRlRmllbGRNYXBcbiAgICAgICAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoSW5wdXRGaWVsZHMsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgaHJlZjogXCIjXCIsXG4gICAgICAgICAgb25DbGljazogdGhpcy5yZXNldE9wdGlvbnMsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvblwiXG4gICAgICAgIH0sIFwiUmVzZXQgc2V0dGluZ3NcIikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJ3cmFwXCJcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImZvcm1cIiwge1xuICAgICAgICAgIG9uU3VibWl0OiB0aGlzLmhhbmRsZVN1Ym1pdFxuICAgICAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCBcIkRhdGEgc291cmNlXCIpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCBudWxsLCBcIkVudGVyIGEgdmFsaWQgSlNPTiBhcGkgdXJsLlwiKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgIHdpZHRoOiAnMTAwJSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHZhbHVlOiB1cmwsXG4gICAgICAgICAgb25DaGFuZ2U6IHRoaXMudXJsQ2hhbmdlXG4gICAgICAgIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIHR5cGU6IFwic3VibWl0XCIsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvbiBidXR0b24tcHJpbWFyeVwiLFxuICAgICAgICAgIHZhbHVlOiBcIlN1Ym1pdFwiXG4gICAgICAgIH0pKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoSW5wdXRGaWVsZHMsIHRoaXMuc3RhdGUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gU2V0dGluZ3M7XG59KENvbXBvbmVudCk7IC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG5leHBvcnRzLmRlZmF1bHQgPSBTZXR0aW5ncztcblxuZnVuY3Rpb24gSW5wdXRGaWVsZHMocHJvcHMpIHtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcImhpZGRlblwiLFxuICAgIG5hbWU6IFwibW9kX2pzb25fcmVuZGVyX3VybFwiLFxuICAgIHZhbHVlOiBwcm9wcy51cmxcbiAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiLFxuICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShwcm9wcy5maWVsZE1hcClcbiAgfSkpO1xufSAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblxuZnVuY3Rpb24gU3VtbWFyeShwcm9wcykge1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIHtcbiAgICBzdHlsZToge1xuICAgICAgd29yZEJyZWFrOiAnYnJlYWstYWxsJ1xuICAgIH1cbiAgfSwgXCJEYXRhIHNvdXJjZTogXCIsIHByb3BzLnVybCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBcIlRpdGxlOiBcIiwgcHJvcHMuZmllbGRNYXAudGl0bGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgXCJDb250ZW50OiBcIiwgcHJvcHMuZmllbGRNYXAuY29udGVudCkpKTtcbn0gLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cbnZhciBGaWVsZFNlbGVjdGlvbiA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX0NvbXBvbmVudDIpIHtcbiAgX2luaGVyaXRzKEZpZWxkU2VsZWN0aW9uLCBfQ29tcG9uZW50Mik7XG5cbiAgZnVuY3Rpb24gRmllbGRTZWxlY3Rpb24ocHJvcHMpIHtcbiAgICB2YXIgX3RoaXMyO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEZpZWxkU2VsZWN0aW9uKTtcblxuICAgIF90aGlzMiA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihGaWVsZFNlbGVjdGlvbikuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzMi5zdGF0ZSA9IHtcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgaXRlbXM6IFtdXG4gICAgfTtcbiAgICBfdGhpczIudXBkYXRlRmllbGRNYXAgPSBfdGhpczIudXBkYXRlRmllbGRNYXAuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXMyKSkpO1xuICAgIHJldHVybiBfdGhpczI7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRmllbGRTZWxlY3Rpb24sIFt7XG4gICAga2V5OiBcInVwZGF0ZUZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9IC8vIFRPRE8gZmx5dHRhIHRpbGwgZWdlbiBjbGFzc1xuXG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0QXBpRGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRBcGlEYXRhKCkge1xuICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgIGZldGNoKHRoaXMucHJvcHMudXJsKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgX3RoaXMzLnNldFN0YXRlKHtcbiAgICAgICAgICBpc0xvYWRlZDogdHJ1ZSxcbiAgICAgICAgICBpdGVtczogcmVzdWx0XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIF90aGlzMy5zZXRTdGF0ZSh7XG4gICAgICAgICAgaXNMb2FkZWQ6IHRydWUsXG4gICAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImNvbXBvbmVudERpZE1vdW50XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgdGhpcy5nZXRBcGlEYXRhKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUyID0gdGhpcy5zdGF0ZSxcbiAgICAgICAgICBlcnJvciA9IF90aGlzJHN0YXRlMi5lcnJvcixcbiAgICAgICAgICBpc0xvYWRlZCA9IF90aGlzJHN0YXRlMi5pc0xvYWRlZCxcbiAgICAgICAgICBpdGVtcyA9IF90aGlzJHN0YXRlMi5pdGVtcztcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFwiRXJyb3I6IFwiLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwic3Bpbm5lciBpcy1hY3RpdmVcIixcbiAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgZmxvYXQ6ICdub25lJyxcbiAgICAgICAgICAgIGRpc3BsYXk6ICdibG9jaycsXG4gICAgICAgICAgICB3aWR0aDogJ2F1dG8nLFxuICAgICAgICAgICAgaGVpZ2h0OiAnYXV0bycsXG4gICAgICAgICAgICBwYWRkaW5nOiAnMTBweCAxMHB4IDMwcHggMTBweCdcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoRGF0YUxpc3QsIHtcbiAgICAgICAgICBkYXRhOiBpdGVtcyxcbiAgICAgICAgICB1cmw6IHRoaXMucHJvcHMudXJsLFxuICAgICAgICAgIGZpZWxkTWFwOiB0aGlzLnByb3BzLmZpZWxkTWFwLFxuICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwOiB0aGlzLnVwZGF0ZUZpZWxkTWFwXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBGaWVsZFNlbGVjdGlvbjtcbn0oQ29tcG9uZW50KTsgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cbmZ1bmN0aW9uIExpc3RJdGVtKHByb3BzKSB7XG4gIHZhciB2YWx1ZSA9IHByb3BzLnZhbHVlLFxuICAgICAgY2hpbGRyZW4gPSBwcm9wcy5jaGlsZHJlbixcbiAgICAgIGZpZWxkTWFwID0gcHJvcHMuZmllbGRNYXAsXG4gICAgICBvYmplY3QgPSBwcm9wcy5vYmplY3QsXG4gICAgICBvbkNsaWNrVGl0bGUgPSBwcm9wcy5vbkNsaWNrVGl0bGUsXG4gICAgICBvbkNsaWNrQ29udGVudCA9IHByb3BzLm9uQ2xpY2tDb250ZW50LFxuICAgICAgb25DbGlja0NvbnRhaW5lciA9IHByb3BzLm9uQ2xpY2tDb250YWluZXI7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJUaXRsZTogXCIpIDogJycsIGZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJDb250ZW50OiBcIikgOiAnJywgY2hpbGRyZW4gPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHZhbHVlKSA6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgIWNoaWxkcmVuICYmICFmaWVsZE1hcC50aXRsZSAmJiBmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiBcIiNcIixcbiAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiLFxuICAgIFwiZGF0YS1maWVsZFwiOiBcInRpdGxlXCIsXG4gICAgb25DbGljazogb25DbGlja1RpdGxlXG4gIH0sIFwiVGl0bGVcIikgOiAnJywgIWNoaWxkcmVuICYmIGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QgJiYgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiBcIiNcIixcbiAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1zbWFsbFwiLFxuICAgIFwiZGF0YS1maWVsZFwiOiBcImNvbnRlbnRcIixcbiAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGVudFxuICB9LCBcIkNvbnRlbnRcIikgOiAnJywgY2hpbGRyZW4gJiYgQXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgaHJlZjogXCIjXCIsXG4gICAgY2xhc3NOYW1lOiBcImJ1dHRvbiBidXR0b24tc21hbGxcIixcbiAgICBcImRhdGEtZmllbGRcIjogXCJpdGVtQ29udGFpbmVyXCIsXG4gICAgb25DbGljazogb25DbGlja0NvbnRhaW5lclxuICB9LCBcIlNlbGVjdFwiKSA6ICcnLCBjaGlsZHJlbiA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIHtcbiAgICBjbGFzc05hbWU6IFwiZGFzaGljb25zIGRhc2hpY29ucy1hcnJvdy1kb3duXCJcbiAgfSkgOiAnJywgY2hpbGRyZW4gPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwge1xuICAgIHN0eWxlOiB7XG4gICAgICBwYWRkaW5nTGVmdDogMTUsXG4gICAgICBib3JkZXJMZWZ0OiAnMnB4IHNvbGlkICNjY2MnXG4gICAgfVxuICB9LCBjaGlsZHJlbikgOiAnJyk7XG59IC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9Db21wb25lbnQzKSB7XG4gIF9pbmhlcml0cyhEYXRhTGlzdCwgX0NvbXBvbmVudDMpO1xuXG4gIGZ1bmN0aW9uIERhdGFMaXN0KHByb3BzKSB7XG4gICAgdmFyIF90aGlzNDtcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBEYXRhTGlzdCk7XG5cbiAgICBfdGhpczQgPSBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybih0aGlzLCBfZ2V0UHJvdG90eXBlT2YoRGF0YUxpc3QpLmNhbGwodGhpcywgcHJvcHMpKTtcbiAgICBfdGhpczQucmVuZGVyTm9kZXMgPSBfdGhpczQucmVuZGVyTm9kZXMuYmluZChfYXNzZXJ0VGhpc0luaXRpYWxpemVkKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX3RoaXM0KSkpO1xuICAgIF90aGlzNC5zZXRGaWVsZE1hcCA9IF90aGlzNC5zZXRGaWVsZE1hcC5iaW5kKF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoX2Fzc2VydFRoaXNJbml0aWFsaXplZChfdGhpczQpKSk7XG4gICAgcmV0dXJuIF90aGlzNDtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhEYXRhTGlzdCwgW3tcbiAgICBrZXk6IFwic2V0RmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0RmllbGRNYXAocGF0aCwgZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKF9kZWZpbmVQcm9wZXJ0eSh7fSwgZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGQsIHBhdGgpKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyTm9kZXNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgdmFyIF90aGlzNSA9IHRoaXM7XG5cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQoTGlzdEl0ZW0sIHtcbiAgICAgICAgICBrZXk6IGl0ZW0udG9TdHJpbmcoKSxcbiAgICAgICAgICB2YWx1ZTogaXRlbSxcbiAgICAgICAgICBvYmplY3Q6IGRhdGFbaXRlbV0sXG4gICAgICAgICAgZmllbGRNYXA6IF90aGlzNS5wcm9wcy5maWVsZE1hcCxcbiAgICAgICAgICBvbkNsaWNrQ29udGFpbmVyOiBmdW5jdGlvbiBvbkNsaWNrQ29udGFpbmVyKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczUuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uQ2xpY2tUaXRsZTogZnVuY3Rpb24gb25DbGlja1RpdGxlKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczUuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrQ29udGVudDogZnVuY3Rpb24gb25DbGlja0NvbnRlbnQoZSkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzNS5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChfdHlwZW9mKGRhdGFbaXRlbV0pID09PSAnb2JqZWN0JyAmJiBkYXRhW2l0ZW1dICE9PSBudWxsKSB7XG4gICAgICAgICAgY2hpbGQgPSBSZWFjdC5jbG9uZUVsZW1lbnQoY2hpbGQsIHtcbiAgICAgICAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KGRhdGFbaXRlbV0pID8gX3RoaXM1LnJlbmRlck5vZGVzKGRhdGFbaXRlbV1bMF0pIDogX3RoaXM1LnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG4gICAgICB2YXIgZGF0YSA9IHRoaXMucHJvcHMuZGF0YTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9ICcnO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgIGRhdGEgPSBkYXRhWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlO1xuICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gbmV3IF9yZWN1cnNpdmVJdGVyYXRvci5kZWZhdWx0KGRhdGEpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IChfc3RlcCA9IF9pdGVyYXRvci5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwJHZhbHVlID0gX3N0ZXAudmFsdWUsXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gX3N0ZXAkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcCR2YWx1ZS5ub2RlLFxuICAgICAgICAgICAgICAgIGtleSA9IF9zdGVwJHZhbHVlLmtleSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3N0ZXAkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdmFyIHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcblxuICAgICAgICAgICAgICBfb2JqZWN0UGF0aC5kZWZhdWx0LnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvciA9IHRydWU7XG4gICAgICAgICAgX2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgX2l0ZXJhdG9yLnJldHVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImgzXCIsIG51bGwsIFwiU2VsZWN0IGl0ZW1zIGNvbnRhaW5lclwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIG51bGwsIHRoaXMucmVuZGVyTm9kZXMoZGF0YSkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBvYmplY3REYXRhID0gX29iamVjdFBhdGguZGVmYXVsdC5nZXQodGhpcy5wcm9wcy5kYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3REYXRhKSkge1xuICAgICAgICAgIG9iamVjdERhdGEgPSBvYmplY3REYXRhWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yMiA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChvYmplY3REYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwMiR2YWx1ZSA9IF9zdGVwMi52YWx1ZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBfc3RlcDIkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcDIkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcDIkdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgIHBhdGggPSBfc3RlcDIkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHZhciBfcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuXG4gICAgICAgICAgICAgIF9vYmplY3RQYXRoLmRlZmF1bHQuc2V0KG9iamVjdERhdGEsIF9wYXRoU3RyaW5nLCBfcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yMiA9IGVycjtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvcjIucmV0dXJuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCBcIlNlbGVjdCB0aXRsZSBhbmQgY29udGVudCBmaWVsZHNcIiksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiLCBudWxsLCB0aGlzLnJlbmRlck5vZGVzKG9iamVjdERhdGEpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIERhdGFMaXN0O1xufShDb21wb25lbnQpOyAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbn0se1wib2JqZWN0LXBhdGhcIjoxLFwicmVjdXJzaXZlLWl0ZXJhdG9yXCI6Mn1dLDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfU2V0dGluZ3MgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG52YXIgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG52YXIgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcblJlYWN0RE9NLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KF9TZXR0aW5ncy5kZWZhdWx0LCBudWxsKSwgZG9tRWxlbWVudCk7XG5cbn0se1wiLi9Db21wb25lbnRzL1NldHRpbmdzXCI6NH1dfSx7fSxbNV0pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZiMkpxWldOMExYQmhkR2d2YVc1a1pYZ3Vhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjbVZqZFhKemFYWmxMV2wwWlhKaGRHOXlMM055WXk5U1pXTjFjbk5wZG1WSmRHVnlZWFJ2Y2k1cWN5SXNJbTV2WkdWZmJXOWtkV3hsY3k5eVpXTjFjbk5wZG1VdGFYUmxjbUYwYjNJdmMzSmpMMnhoYm1jdWFuTWlMQ0p6YjNWeVkyVXZhbk12UVdSdGFXNHZRMjl0Y0c5dVpXNTBjeTlUWlhSMGFXNW5jeTVxY3lJc0luTnZkWEpqWlM5cWN5OUJaRzFwYmk5SmJtUmxlRUZrYldsdUxtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOd1UwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU55U1VFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN096czdPenM3T3p0QlF6WkpRVHM3UVVGRFFUczdPenM3T3pzN096czdPenM3T3pzN096czdPenM3TzJGQk4wMXJRaXhMTzBsQlFXSXNVeXhWUVVGQkxGTTdRVUZGVEN4SlFVRk5MRmxCUVZrc1IwRkJSenRCUVVOcVFpeEZRVUZCTEd0Q1FVRnJRaXhGUVVGRkxFdEJSRWc3UVVGRmFrSXNSVUZCUVN4SFFVRkhMRVZCUVVVc1JVRkdXVHRCUVVkcVFpeEZRVUZCTEZGQlFWRXNSVUZCUlR0QlFVTk9MRWxCUVVFc1lVRkJZU3hGUVVGRkxFbEJSRlE3UVVGRlRpeEpRVUZCTEV0QlFVc3NSVUZCUlN4RlFVWkVPMEZCUjA0c1NVRkJRU3hQUVVGUExFVkJRVVU3UVVGSVNEdEJRVWhQTEVOQlFYSkNPenRKUVZWeFFpeFJPenM3T3p0QlFVTnFRaXh2UWtGQldTeExRVUZhTEVWQlFXMUNPMEZCUVVFN08wRkJRVUU3TzBGQlEyWXNhMFpCUVUwc1MwRkJUanRCUVVOQkxGVkJRVXNzUzBGQlRDeEhRVUZoTEZsQlFXSTdRVUZGUVN4VlFVRkxMRk5CUVV3c1IwRkJhVUlzVFVGQlN5eFRRVUZNTEVOQlFXVXNTVUZCWml4MVJFRkJha0k3UVVGRFFTeFZRVUZMTEZsQlFVd3NSMEZCYjBJc1RVRkJTeXhaUVVGTUxFTkJRV3RDTEVsQlFXeENMSFZFUVVGd1FqdEJRVU5CTEZWQlFVc3NXVUZCVEN4SFFVRnZRaXhOUVVGTExGbEJRVXdzUTBGQmEwSXNTVUZCYkVJc2RVUkJRWEJDTzBGQlEwRXNWVUZCU3l4alFVRk1MRWRCUVhOQ0xFMUJRVXNzWTBGQlRDeERRVUZ2UWl4SlFVRndRaXgxUkVGQmRFSTdRVUZRWlR0QlFWRnNRanM3T3p0M1EwRkZiVUk3UVVGRGFFSXNWMEZCU3l4WFFVRk1PMEZCUTBnN096dHJRMEZGWVR0QlFVTldMRlZCUVVrc1QwRkJUeXhoUVVGaExFTkJRVU1zVDBGQmNrSXNTMEZCYVVNc1YwRkJja01zUlVGQmEwUTdRVUZET1VNc1dVRkJUU3hQUVVGUExFZEJRVWNzWVVGQllTeERRVUZETEU5QlFUbENPMEZCUTBFc1lVRkJTeXhSUVVGTUxFTkJRV003UVVGRFZpeFZRVUZCTEVkQlFVY3NSVUZCUlN4UFFVRlBMRU5CUVVNc1IwRkJVaXhIUVVGakxFOUJRVThzUTBGQlF5eEhRVUYwUWl4SFFVRTBRaXhGUVVSMlFqdEJRVVZXTEZWQlFVRXNVVUZCVVN4RlFVRkZMRTlCUVU4c1EwRkJReXhSUVVGU0xFZEJRVzFDTEVsQlFVa3NRMEZCUXl4TFFVRk1MRU5CUVZjc1QwRkJUeXhEUVVGRExGRkJRVzVDTEVOQlFXNUNMRWRCUVd0RU8wRkJRVU1zV1VGQlFTeGhRVUZoTEVWQlFVVXNTVUZCYUVJN1FVRkJjMElzV1VGQlFTeExRVUZMTEVWQlFVVXNSVUZCTjBJN1FVRkJhVU1zV1VGQlFTeFBRVUZQTEVWQlFVVTdRVUZCTVVNc1YwRkdiRVE3UVVGSFZpeFZRVUZCTEd0Q1FVRnJRaXhGUVVGRkxFTkJRVU1zUTBGQlF5eFBRVUZQTEVOQlFVTTdRVUZJY0VJc1UwRkJaRHRCUVV0SU8wRkJRMG83T3pzNFFrRkZVeXhMTEVWQlFVODdRVUZEWWl4WFFVRkxMRkZCUVV3c1EwRkJZenRCUVVGRExGRkJRVUVzUjBGQlJ5eEZRVUZGTEV0QlFVc3NRMEZCUXl4TlFVRk9MRU5CUVdFN1FVRkJia0lzVDBGQlpEdEJRVU5JT3pzN2FVTkJSVmtzU3l4RlFVRlBPMEZCUTJoQ0xFMUJRVUVzUzBGQlN5eERRVUZETEdOQlFVNDdRVUZEUVN4WFFVRkxMRkZCUVV3c1EwRkJZenRCUVVGRExGRkJRVUVzYTBKQlFXdENMRVZCUVVVN1FVRkJja0lzVDBGQlpEdEJRVU5JT3pzN2FVTkJSVmtzU3l4RlFVRlBPMEZCUTJoQ0xFMUJRVUVzUzBGQlN5eERRVUZETEdOQlFVNDdRVUZEUVN4WFFVRkxMRkZCUVV3c1EwRkJZeXhaUVVGa08wRkJRMGc3T3p0dFEwRkZZeXhMTEVWQlFVODdRVUZEYkVJc1ZVRkJUU3hOUVVGTkxFZEJRVWNzVFVGQlRTeERRVUZETEUxQlFWQXNRMEZCWXl4TFFVRkxMRXRCUVV3c1EwRkJWeXhSUVVGNlFpeEZRVUZ0UXl4TFFVRnVReXhEUVVGbU8wRkJRMEVzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMRkZCUVZFc1JVRkJSVHRCUVVGWUxFOUJRV1E3UVVGRFNEczdPelpDUVVWUk8wRkJRVUVzZDBKQlF6WkNMRXRCUVVzc1MwRkViRU03UVVGQlFTeFZRVU5GTEd0Q1FVUkdMR1ZCUTBVc2EwSkJSRVk3UVVGQlFTeFZRVU56UWl4SFFVUjBRaXhsUVVOelFpeEhRVVIwUWp0QlFVRkJMR2xEUVVWdFF5eExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVWTVRenRCUVVGQkxGVkJSVVVzWVVGR1JpeDNRa0ZGUlN4aFFVWkdPMEZCUVVFc1ZVRkZhVUlzUzBGR2FrSXNkMEpCUldsQ0xFdEJSbXBDTzBGQlFVRXNWVUZGZDBJc1QwRkdlRUlzZDBKQlJYZENMRTlCUm5oQ096dEJRVWxNTEZWQlFVa3NSMEZCUnl4SlFVRkpMR0ZCUVdFc1MwRkJTeXhKUVVGNlFpeEpRVUZwUXl4TFFVRnFReXhKUVVFd1F5eFBRVUU1UXl4RlFVRjFSRHRCUVVOdVJDeGxRVU5KTEdsRFFVTkpMRzlDUVVGRExFOUJRVVFzUlVGQllTeExRVUZMTEV0QlFXeENMRU5CUkVvc1JVRkZTU3h2UWtGQlF5eFhRVUZFTEVWQlFXbENMRXRCUVVzc1MwRkJkRUlzUTBGR1NpeEZRVWRKTzBGQlFVY3NWVUZCUVN4SlFVRkpMRVZCUVVNc1IwRkJVanRCUVVGWkxGVkJRVUVzVDBGQlR5eEZRVUZGTEV0QlFVc3NXVUZCTVVJN1FVRkJkME1zVlVGQlFTeFRRVUZUTEVWQlFVTTdRVUZCYkVRc05FSkJTRW9zUTBGRVNqdEJRVTlJTEU5QlVrUXNUVUZSVHl4SlFVRkpMR3RDUVVGS0xFVkJRWGRDTzBGQlF6TkNMR1ZCUTBrc2FVTkJRMGtzYjBKQlFVTXNZMEZCUkR0QlFVRm5RaXhWUVVGQkxFZEJRVWNzUlVGQlJTeEhRVUZ5UWp0QlFVRXdRaXhWUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEV0QlFVd3NRMEZCVnl4UlFVRXZRenRCUVVGNVJDeFZRVUZCTEdOQlFXTXNSVUZCUlN4TFFVRkxPMEZCUVRsRkxGVkJSRW9zUlVGRlNTeHZRa0ZCUXl4WFFVRkVMRVZCUVdsQ0xFdEJRVXNzUzBGQmRFSXNRMEZHU2l4RlFVZEpPMEZCUVVjc1ZVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEZWQlFVRXNUMEZCVHl4RlFVRkZMRXRCUVVzc1dVRkJNVUk3UVVGQmQwTXNWVUZCUVN4VFFVRlRMRVZCUVVNN1FVRkJiRVFzTkVKQlNFb3NRMEZFU2p0QlFVOUlMRTlCVWswc1RVRlJRVHRCUVVOSUxHVkJRMGs3UVVGQlN5eFZRVUZCTEZOQlFWTXNSVUZCUXp0QlFVRm1MRmRCUTBrN1FVRkJUU3hWUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTzBGQlFYSkNMRmRCUTBrc0swSkJRMGtzYlVOQlEwa3NhMFJCUkVvc1EwRkVTaXhGUVVsSkxDdENRVXBLTEVWQlMwa3NOa1JCVEVvc1EwRkVTaXhGUVZGSk8wRkJRVThzVlVGQlFTeEpRVUZKTEVWQlFVTXNUVUZCV2p0QlFVRnRRaXhWUVVGQkxFdEJRVXNzUlVGQlJUdEJRVUZETEZsQlFVRXNTMEZCU3l4RlFVRkZPMEZCUVZJc1YwRkJNVUk3UVVGQk1rTXNWVUZCUVN4TFFVRkxMRVZCUVVVc1IwRkJiRVE3UVVGQmRVUXNWVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkJTenRCUVVGMFJTeFZRVkpLTEVWQlUwa3NLMEpCUVVjN1FVRkJUeXhWUVVGQkxFbEJRVWtzUlVGQlF5eFJRVUZhTzBGQlFYRkNMRlZCUVVFc1UwRkJVeXhGUVVGRExIVkNRVUV2UWp0QlFVRjFSQ3hWUVVGQkxFdEJRVXNzUlVGQlF6dEJRVUUzUkN4VlFVRklMRU5CVkVvc1EwRkVTaXhGUVZsSkxHOUNRVUZETEZkQlFVUXNSVUZCYVVJc1MwRkJTeXhMUVVGMFFpeERRVnBLTEVOQlJFbzdRVUZuUWtnN1FVRkRTanM3T3p0RlFXNUdhVU1zVXl4SFFYTkdkRU03T3pzN08wRkJSVUVzVTBGQlV5eFhRVUZVTEVOQlFYRkNMRXRCUVhKQ0xFVkJRVFJDTzBGQlEzaENMRk5CUTBrc2FVTkJRMGs3UVVGQlR5eEpRVUZCTEVsQlFVa3NSVUZCUXl4UlFVRmFPMEZCUVhGQ0xFbEJRVUVzU1VGQlNTeEZRVUZETEhGQ1FVRXhRanRCUVVGblJDeEpRVUZCTEV0QlFVc3NSVUZCUlN4TFFVRkxMRU5CUVVNN1FVRkJOMFFzU1VGRVNpeEZRVVZKTzBGQlFVOHNTVUZCUVN4SlFVRkpMRVZCUVVNc1VVRkJXanRCUVVGeFFpeEpRVUZCTEVsQlFVa3NSVUZCUXl3d1FrRkJNVUk3UVVGQmNVUXNTVUZCUVN4TFFVRkxMRVZCUVVVc1NVRkJTU3hEUVVGRExGTkJRVXdzUTBGQlpTeExRVUZMTEVOQlFVTXNVVUZCY2tJN1FVRkJOVVFzU1VGR1NpeERRVVJLTzBGQlRVZ3NReXhEUVVWRU96czdRVUZGUVN4VFFVRlRMRTlCUVZRc1EwRkJhVUlzUzBGQmFrSXNSVUZCZDBJN1FVRkRjRUlzVTBGRFNTeHBRMEZEU1N4blEwRkRTVHRCUVVGSkxFbEJRVUVzUzBGQlN5eEZRVUZGTzBGQlFVTXNUVUZCUVN4VFFVRlRMRVZCUVVVN1FVRkJXanRCUVVGWUxITkNRVUZ0UkN4TFFVRkxMRU5CUVVNc1IwRkJla1FzUTBGRVNpeEZRVVZKTERKRFFVRlpMRXRCUVVzc1EwRkJReXhSUVVGT0xFTkJRV1VzUzBGQk0wSXNRMEZHU2l4RlFVZEpMRFpEUVVGakxFdEJRVXNzUTBGQlF5eFJRVUZPTEVOQlFXVXNUMEZCTjBJc1EwRklTaXhEUVVSS0xFTkJSRW83UVVGVFNDeERMRU5CUlVRN096dEpRVVZOTEdNN096czdPMEZCUTBZc01FSkJRVmtzUzBGQldpeEZRVUZ0UWp0QlFVRkJPenRCUVVGQk96dEJRVU5tTEhsR1FVRk5MRXRCUVU0N1FVRkRRU3hYUVVGTExFdEJRVXdzUjBGQllUdEJRVU5VTEUxQlFVRXNTMEZCU3l4RlFVRkZMRWxCUkVVN1FVRkZWQ3hOUVVGQkxGRkJRVkVzUlVGQlJTeExRVVpFTzBGQlIxUXNUVUZCUVN4TFFVRkxMRVZCUVVVN1FVRklSU3hMUVVGaU8wRkJUVUVzVjBGQlN5eGpRVUZNTEVkQlFYTkNMRTlCUVVzc1kwRkJUQ3hEUVVGdlFpeEpRVUZ3UWl4M1JFRkJkRUk3UVVGU1pUdEJRVk5zUWpzN096dHRRMEZGWXl4TExFVkJRVTg3UVVGRGJFSXNWMEZCU3l4TFFVRk1MRU5CUVZjc1kwRkJXQ3hEUVVFd1FpeExRVUV4UWp0QlFVTklMRXNzUTBGRlJEczdPenRwUTBGRFlUdEJRVUZCT3p0QlFVTlVMRTFCUVVFc1MwRkJTeXhEUVVGRExFdEJRVXNzUzBGQlRDeERRVUZYTEVkQlFWb3NRMEZCVEN4RFFVTkxMRWxCUkV3c1EwRkRWU3hWUVVGQkxFZEJRVWM3UVVGQlFTeGxRVUZKTEVkQlFVY3NRMEZCUXl4SlFVRktMRVZCUVVvN1FVRkJRU3hQUVVSaUxFVkJSVXNzU1VGR1RDeERRVWRSTEZWQlFVTXNUVUZCUkN4RlFVRlpPMEZCUTFJc1VVRkJRU3hOUVVGSkxFTkJRVU1zVVVGQlRDeERRVUZqTzBGQlExWXNWVUZCUVN4UlFVRlJMRVZCUVVVc1NVRkVRVHRCUVVWV0xGVkJRVUVzUzBGQlN5eEZRVUZGTzBGQlJrY3NVMEZCWkR0QlFVbElMRTlCVWxRc1JVRlRVU3hWUVVGRExFdEJRVVFzUlVGQlZ6dEJRVU5RTEZGQlFVRXNUVUZCU1N4RFFVRkRMRkZCUVV3c1EwRkJZenRCUVVOV0xGVkJRVUVzVVVGQlVTeEZRVUZGTEVsQlJFRTdRVUZGVml4VlFVRkJMRXRCUVVzc1JVRkJURHRCUVVaVkxGTkJRV1E3UVVGSlNDeFBRV1JVTzBGQlowSklPenM3ZDBOQlJXMUNPMEZCUTJoQ0xGZEJRVXNzVlVGQlREdEJRVU5JT3pzN05rSkJSVkU3UVVGQlFTeDVRa0ZETkVJc1MwRkJTeXhMUVVScVF6dEJRVUZCTEZWQlEwVXNTMEZFUml4blFrRkRSU3hMUVVSR08wRkJRVUVzVlVGRFV5eFJRVVJVTEdkQ1FVTlRMRkZCUkZRN1FVRkJRU3hWUVVOdFFpeExRVVJ1UWl4blFrRkRiVUlzUzBGRWJrSTdPMEZCUlV3c1ZVRkJTU3hMUVVGS0xFVkJRVmM3UVVGRFVDeGxRVUZQTERSRFFVRmhMRXRCUVVzc1EwRkJReXhQUVVGdVFpeERRVUZRTzBGQlEwZ3NUMEZHUkN4TlFVVlBMRWxCUVVrc1EwRkJReXhSUVVGTUxFVkJRV1U3UVVGRGJFSXNaVUZCVHp0QlFVRkxMRlZCUVVFc1UwRkJVeXhGUVVGRExHMUNRVUZtTzBGQlFXMURMRlZCUVVFc1MwRkJTeXhGUVVGRk8wRkJRVU1zV1VGQlFTeExRVUZMTEVWQlFVVXNUVUZCVWp0QlFVRm5RaXhaUVVGQkxFOUJRVThzUlVGQlJTeFBRVUY2UWp0QlFVRnJReXhaUVVGQkxFdEJRVXNzUlVGQlJTeE5RVUY2UXp0QlFVRnBSQ3haUVVGQkxFMUJRVTBzUlVGQlJTeE5RVUY2UkR0QlFVRnBSU3haUVVGQkxFOUJRVThzUlVGQlJUdEJRVUV4UlR0QlFVRXhReXhWUVVGUU8wRkJRMGdzVDBGR1RTeE5RVVZCTzBGQlEwZ3NaVUZCVHl4dlFrRkJReXhSUVVGRU8wRkJRMGdzVlVGQlFTeEpRVUZKTEVWQlFVVXNTMEZFU0R0QlFVVklMRlZCUVVFc1IwRkJSeXhGUVVGRkxFdEJRVXNzUzBGQlRDeERRVUZYTEVkQlJtSTdRVUZIU0N4VlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGTExFdEJRVXdzUTBGQlZ5eFJRVWhzUWp0QlFVbElMRlZCUVVFc1kwRkJZeXhGUVVGRkxFdEJRVXM3UVVGS2JFSXNWVUZCVUR0QlFVdElPMEZCUTBvN096czdSVUZ5UkhkQ0xGTXNSMEYzUkRkQ096czdRVUZGUVN4VFFVRlRMRkZCUVZRc1EwRkJhMElzUzBGQmJFSXNSVUZCZVVJN1FVRkJRU3hOUVVOa0xFdEJSR01zUjBGRGRVVXNTMEZFZGtVc1EwRkRaQ3hMUVVSak8wRkJRVUVzVFVGRFVDeFJRVVJQTEVkQlEzVkZMRXRCUkhaRkxFTkJRMUFzVVVGRVR6dEJRVUZCTEUxQlEwY3NVVUZFU0N4SFFVTjFSU3hMUVVSMlJTeERRVU5ITEZGQlJFZzdRVUZCUVN4TlFVTmhMRTFCUkdJc1IwRkRkVVVzUzBGRWRrVXNRMEZEWVN4TlFVUmlPMEZCUVVFc1RVRkRjVUlzV1VGRWNrSXNSMEZEZFVVc1MwRkVka1VzUTBGRGNVSXNXVUZFY2tJN1FVRkJRU3hOUVVOdFF5eGpRVVJ1UXl4SFFVTjFSU3hMUVVSMlJTeERRVU50UXl4alFVUnVRenRCUVVGQkxFMUJRMjFFTEdkQ1FVUnVSQ3hIUVVOMVJTeExRVVIyUlN4RFFVTnRSQ3huUWtGRWJrUTdRVUZGY2tJc1UwRkJVU3huUTBGRFNDeFJRVUZSTEVOQlFVTXNTMEZCVkN4TFFVRnRRaXhOUVVGdVFpeEhRVUUwUWl3NFEwRkJOVUlzUjBGQmRVUXNSVUZFY0VRc1JVRkZTQ3hSUVVGUkxFTkJRVU1zVDBGQlZDeExRVUZ4UWl4TlFVRnlRaXhIUVVFNFFpeG5SRUZCT1VJc1IwRkJNa1FzUlVGR2VFUXNSVUZIU0N4UlFVRlJMRWRCUVVjc2IwTkJRVk1zUzBGQlZDeERRVUZJTEVkQlFUaENMR3REUVVGUExFdEJRVkFzUTBGSWJrTXNSVUZKU0N4RFFVRkRMRkZCUVVRc1NVRkJZU3hEUVVGRExGRkJRVkVzUTBGQlF5eExRVUYyUWl4SlFVRnBReXhSUVVGUkxFTkJRVU1zVDBGQlZDeExRVUZ4UWl4TlFVRjBSQ3hKUVVGcFJTeFJRVUZSTEVOQlFVTXNZVUZCVkN4TFFVRXlRaXhKUVVFMVJpeEhRVU5ITzBGQlFVY3NTVUZCUVN4SlFVRkpMRVZCUVVNc1IwRkJVanRCUVVGWkxFbEJRVUVzVTBGQlV5eEZRVUZETEhGQ1FVRjBRanRCUVVFMFF5eHJRa0ZCVnl4UFFVRjJSRHRCUVVFclJDeEpRVUZCTEU5QlFVOHNSVUZCUlR0QlFVRjRSU3hoUVVSSUxFZEJRM0ZITEVWQlRHeEhMRVZCVFVnc1EwRkJReXhSUVVGRUxFbEJRV01zVVVGQlVTeERRVUZETEV0QlFWUXNTMEZCYlVJc1RVRkJha01zU1VGQk5FTXNRMEZCUXl4UlFVRlJMRU5CUVVNc1QwRkJkRVFzU1VGQmFVVXNVVUZCVVN4RFFVRkRMR0ZCUVZRc1MwRkJNa0lzU1VGQk5VWXNSMEZEUnp0QlFVRkhMRWxCUVVFc1NVRkJTU3hGUVVGRExFZEJRVkk3UVVGQldTeEpRVUZCTEZOQlFWTXNSVUZCUXl4eFFrRkJkRUk3UVVGQk5FTXNhMEpCUVZjc1UwRkJka1E3UVVGRFJ5eEpRVUZCTEU5QlFVOHNSVUZCUlR0QlFVUmFMR1ZCUkVnc1IwRkZOa01zUlVGU01VTXNSVUZUU0N4UlFVRlJMRWxCUVVrc1MwRkJTeXhEUVVGRExFOUJRVTRzUTBGQll5eE5RVUZrTEVOQlFWb3NTVUZCY1VNc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCYUVVc1IwRkRSenRCUVVGSExFbEJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4SlFVRkJMRk5CUVZNc1JVRkJReXh4UWtGQmRFSTdRVUZCTkVNc2EwSkJRVmNzWlVGQmRrUTdRVUZEUnl4SlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVSYUxHTkJSRWdzUjBGRk9FTXNSVUZZTTBNc1JVRlpTQ3hSUVVGUkxFZEJRVWM3UVVGQlRTeEpRVUZCTEZOQlFWTXNSVUZCUXp0QlFVRm9RaXhKUVVGSUxFZEJRVGhFTEVWQldtNUZMRVZCWVVnc1VVRkJVU3hIUVVGSE8wRkJRVWtzU1VGQlFTeExRVUZMTEVWQlFVVTdRVUZCUXl4TlFVRkJMRmRCUVZjc1JVRkJSU3hGUVVGa08wRkJRV3RDTEUxQlFVRXNWVUZCVlN4RlFVRkZPMEZCUVRsQ08wRkJRVmdzUzBGQk5rUXNVVUZCTjBRc1EwRkJTQ3hIUVVGcFJpeEZRV0owUml4RFFVRlNPMEZCWlVnc1F5eERRVVZFT3pzN1NVRkxUU3hST3pzN096dEJRVU5HTEc5Q1FVRlpMRXRCUVZvc1JVRkJiVUk3UVVGQlFUczdRVUZCUVRzN1FVRkRaaXh0UmtGQlRTeExRVUZPTzBGQlEwRXNWMEZCU3l4WFFVRk1MRWRCUVcxQ0xFOUJRVXNzVjBGQlRDeERRVUZwUWl4SlFVRnFRaXgzUkVGQmJrSTdRVUZEUVN4WFFVRkxMRmRCUVV3c1IwRkJiVUlzVDBGQlN5eFhRVUZNTEVOQlFXbENMRWxCUVdwQ0xIZEVRVUZ1UWp0QlFVaGxPMEZCU1d4Q096czdPMmREUVVWWExFa3NSVUZCVFN4TExFVkJRVTg3UVVGRGNrSXNUVUZCUVN4TFFVRkxMRU5CUVVNc1kwRkJUanRCUVVOQkxGZEJRVXNzUzBGQlRDeERRVUZYTEdOQlFWZ3NjVUpCUVRSQ0xFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRXNUMEZCWWl4RFFVRnhRaXhMUVVGcVJDeEZRVUY1UkN4SlFVRjZSRHRCUVVOSU96czdaME5CUlZjc1NTeEZRVUZOTzBGQlFVRTdPMEZCUTJRc1lVRkJUeXhOUVVGTkxFTkJRVU1zU1VGQlVDeERRVUZaTEVsQlFWb3NSVUZCYTBJc1IwRkJiRUlzUTBGQmMwSXNWVUZCUVN4SlFVRkpMRVZCUVVrN1FVRkRha01zV1VGQlNTeEpRVUZKTEV0QlFVc3NXVUZCWWl4RlFVRXlRanRCUVVOMlFqdEJRVU5JT3p0QlFVVkVMRmxCUVVrc1MwRkJTeXhIUVVGSExHOUNRVUZETEZGQlFVUTdRVUZCVlN4VlFVRkJMRWRCUVVjc1JVRkJSU3hKUVVGSkxFTkJRVU1zVVVGQlRDeEZRVUZtTzBGQlExVXNWVUZCUVN4TFFVRkxMRVZCUVVVc1NVRkVha0k3UVVGRlZTeFZRVUZCTEUxQlFVMHNSVUZCUlN4SlFVRkpMRU5CUVVNc1NVRkJSQ3hEUVVaMFFqdEJRVWRWTEZWQlFVRXNVVUZCVVN4RlFVRkZMRTFCUVVrc1EwRkJReXhMUVVGTUxFTkJRVmNzVVVGSUwwSTdRVUZKVlN4VlFVRkJMR2RDUVVGblFpeEZRVUZGTERCQ1FVRkJMRU5CUVVNN1FVRkJRU3h0UWtGQlNTeE5RVUZKTEVOQlFVTXNWMEZCVEN4RFFVRnBRaXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZLTEVOQlFWY3NWVUZCTlVJc1JVRkJkME1zUTBGQmVFTXNRMEZCU2p0QlFVRkJMRmRCU2pkQ08wRkJTMVVzVlVGQlFTeFpRVUZaTEVWQlFVVXNjMEpCUVVFc1EwRkJRenRCUVVGQkxHMUNRVUZKTEUxQlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFYSkNMRVZCUVRaQ0xFTkJRVGRDTEVOQlFVbzdRVUZCUVN4WFFVeDZRanRCUVUxVkxGVkJRVUVzWTBGQll5eEZRVUZGTEhkQ1FVRkJMRU5CUVVNN1FVRkJRU3h0UWtGQlNTeE5RVUZKTEVOQlFVTXNWMEZCVEN4RFFVRnBRaXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZ5UWl4RlFVRTJRaXhEUVVFM1FpeERRVUZLTzBGQlFVRTdRVUZPTTBJc1ZVRkJXanM3UVVGUlFTeFpRVUZKTEZGQlFVOHNTVUZCU1N4RFFVRkRMRWxCUVVRc1EwRkJXQ3hOUVVGelFpeFJRVUYwUWl4SlFVRnJReXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZLTEV0QlFXVXNTVUZCY2tRc1JVRkJNa1E3UVVGRGRrUXNWVUZCUVN4TFFVRkxMRWRCUVVjc1MwRkJTeXhEUVVGRExGbEJRVTRzUTBGQmJVSXNTMEZCYmtJc1JVRkJNRUk3UVVGRE9VSXNXVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkJTeXhEUVVGRExFOUJRVTRzUTBGQll5eEpRVUZKTEVOQlFVTXNTVUZCUkN4RFFVRnNRaXhKUVVFMFFpeE5RVUZKTEVOQlFVTXNWMEZCVEN4RFFVRnBRaXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZLTEVOQlFWY3NRMEZCV0N4RFFVRnFRaXhEUVVFMVFpeEhRVUU0UkN4TlFVRkpMRU5CUVVNc1YwRkJUQ3hEUVVGcFFpeEpRVUZKTEVOQlFVTXNTVUZCUkN4RFFVRnlRanRCUVVReFF5eFhRVUV4UWl4RFFVRlNPMEZCUjBnN08wRkJSVVFzWlVGQlR5eExRVUZRTzBGQlEwZ3NUMEZ3UWswc1EwRkJVRHRCUVhGQ1NEczdPelpDUVVWUk8wRkJRMHdzVlVGQlRTeFJRVUZSTEVkQlFVY3NTMEZCU3l4TFFVRk1MRU5CUVZjc1VVRkJOVUk3UVVGRlFTeFZRVUZKTEVsQlFVa3NSMEZCUnl4TFFVRkxMRXRCUVV3c1EwRkJWeXhKUVVGMFFqczdRVUZEUVN4VlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGT0xFTkJRV01zU1VGQlpDeERRVUZLTEVWQlFYbENPMEZCUTNKQ0xGRkJRVUVzVVVGQlVTeERRVUZETEdGQlFWUXNSMEZCZVVJc1JVRkJla0k3UVVGRFNEczdRVUZGUkN4VlFVRkpMRkZCUVZFc1EwRkJReXhoUVVGVUxFdEJRVEpDTEVsQlFTOUNMRVZCUVhGRE8wRkJRMnBETEZsQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU0c1EwRkJZeXhKUVVGa0xFTkJRVW9zUlVGQmVVSTdRVUZEY2tJc1ZVRkJRU3hKUVVGSkxFZEJRVWNzU1VGQlNTeERRVUZETEVOQlFVUXNRMEZCV0R0QlFVTklPenRCUVVoblF6dEJRVUZCTzBGQlFVRTdPMEZCUVVFN1FVRkxha01zSzBKQlFYTkRMRWxCUVVrc01FSkJRVW9zUTBGQmMwSXNTVUZCZEVJc1EwRkJkRU1zT0VoQlFXMUZPMEZCUVVFN1FVRkJRU3huUWtGQmVrUXNUVUZCZVVRc1pVRkJla1FzVFVGQmVVUTdRVUZCUVN4blFrRkJha1FzU1VGQmFVUXNaVUZCYWtRc1NVRkJhVVE3UVVGQlFTeG5Ra0ZCTTBNc1IwRkJNa01zWlVGQk0wTXNSMEZCTWtNN1FVRkJRU3huUWtGQmRFTXNTVUZCYzBNc1pVRkJkRU1zU1VGQmMwTTdPMEZCUXk5RUxHZENRVUZKTEZGQlFVOHNTVUZCVUN4TlFVRm5RaXhSUVVGb1FpeEpRVUUwUWl4SlFVRkpMRXRCUVVzc1NVRkJla01zUlVGQkswTTdRVUZETTBNc2EwSkJRVWtzVlVGQlZTeEhRVUZITEVsQlFVa3NRMEZCUXl4SlFVRk1MRU5CUVZVc1IwRkJWaXhEUVVGcVFqczdRVUZEUVN4clEwRkJWeXhIUVVGWUxFTkJRV1VzU1VGQlppeEZRVUZ4UWl4VlFVRlZMRWRCUVVjc1lVRkJiRU1zUlVGQmFVUXNWVUZCYWtRN1FVRkRTRHRCUVVOS08wRkJWbWRETzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN08wRkJXV3BETEdWQlEwa3NhVU5CUTBrc2VVUkJSRW9zUlVGRlNTeG5RMEZCU3l4TFFVRkxMRmRCUVV3c1EwRkJhVUlzU1VGQmFrSXNRMEZCVEN4RFFVWktMRU5CUkVvN1FVRk5TQ3hQUVd4Q1JDeE5RV3RDVHp0QlFVTklMRmxCUVVrc1ZVRkJWU3hIUVVGSExHOUNRVUZYTEVkQlFWZ3NRMEZCWlN4TFFVRkxMRXRCUVV3c1EwRkJWeXhKUVVFeFFpeEZRVUZuUXl4UlFVRlJMRU5CUVVNc1lVRkJla01zUTBGQmFrSTdPMEZCUlVFc1dVRkJTU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEZWQlFXUXNRMEZCU2l4RlFVRXJRanRCUVVNelFpeFZRVUZCTEZWQlFWVXNSMEZCUnl4VlFVRlZMRU5CUVVNc1EwRkJSQ3hEUVVGMlFqdEJRVU5JT3p0QlFVeEZPMEZCUVVFN1FVRkJRVHM3UVVGQlFUdEJRVTlJTEdkRFFVRnpReXhKUVVGSkxEQkNRVUZLTEVOQlFYTkNMRlZCUVhSQ0xFTkJRWFJETEcxSlFVRjVSVHRCUVVGQk8wRkJRVUVzWjBKQlFTOUVMRTFCUVN0RUxHZENRVUV2UkN4TlFVRXJSRHRCUVVGQkxHZENRVUYyUkN4SlFVRjFSQ3huUWtGQmRrUXNTVUZCZFVRN1FVRkJRU3huUWtGQmFrUXNSMEZCYVVRc1owSkJRV3BFTEVkQlFXbEVPMEZCUVVFc1owSkJRVFZETEVsQlFUUkRMR2RDUVVFMVF5eEpRVUUwUXpzN1FVRkRja1VzWjBKQlFVa3NVVUZCVHl4SlFVRlFMRTFCUVdkQ0xGRkJRWEJDTEVWQlFUaENPMEZCUXpGQ0xHdENRVUZKTEZkQlFWVXNSMEZCUnl4SlFVRkpMRU5CUVVNc1NVRkJUQ3hEUVVGVkxFZEJRVllzUTBGQmFrSTdPMEZCUTBFc2EwTkJRVmNzUjBGQldDeERRVUZsTEZWQlFXWXNSVUZCTWtJc1YwRkJNMElzUlVGQmRVTXNWMEZCZGtNN1FVRkRTRHRCUVVOS08wRkJXa1U3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVRzN1FVRmpTQ3hsUVVOSkxHbERRVU5KTEd0RlFVUktMRVZCUlVrc1owTkJRVXNzUzBGQlN5eFhRVUZNTEVOQlFXbENMRlZCUVdwQ0xFTkJRVXdzUTBGR1NpeERRVVJLTzBGQlRVZzdRVUZEU2pzN096dEZRVzVHYTBJc1V5eEhRWE5HZGtJN096czdPMEZEY2xOQk96czdPMEZCUlVFc1NVRkJUU3h2UWtGQmIwSXNSMEZCUnl4M1FrRkJOMEk3UVVGRFFTeEpRVUZOTEZWQlFWVXNSMEZCUnl4UlFVRlJMRU5CUVVNc1kwRkJWQ3hEUVVGM1FpeHZRa0ZCZUVJc1EwRkJia0k3UVVGRlFTeFJRVUZSTEVOQlFVTXNUVUZCVkN4RFFVTkpMRzlDUVVGRExHbENRVUZFTEU5QlJFb3NSVUZGU1N4VlFVWktJaXdpWm1sc1pTSTZJbWRsYm1WeVlYUmxaQzVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lJb1puVnVZM1JwYjI0b0tYdG1kVzVqZEdsdmJpQnlLR1VzYml4MEtYdG1kVzVqZEdsdmJpQnZLR2tzWmlsN2FXWW9JVzViYVYwcGUybG1LQ0ZsVzJsZEtYdDJZWElnWXoxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbE8ybG1LQ0ZtSmlaaktYSmxkSFZ5YmlCaktHa3NJVEFwTzJsbUtIVXBjbVYwZFhKdUlIVW9hU3doTUNrN2RtRnlJR0U5Ym1WM0lFVnljbTl5S0Z3aVEyRnVibTkwSUdacGJtUWdiVzlrZFd4bElDZGNJaXRwSzF3aUoxd2lLVHQwYUhKdmR5QmhMbU52WkdVOVhDSk5UMFJWVEVWZlRrOVVYMFpQVlU1RVhDSXNZWDEyWVhJZ2NEMXVXMmxkUFh0bGVIQnZjblJ6T250OWZUdGxXMmxkV3pCZExtTmhiR3dvY0M1bGVIQnZjblJ6TEdaMWJtTjBhVzl1S0hJcGUzWmhjaUJ1UFdWYmFWMWJNVjFiY2wwN2NtVjBkWEp1SUc4b2JueDhjaWw5TEhBc2NDNWxlSEJ2Y25SekxISXNaU3h1TEhRcGZYSmxkSFZ5YmlCdVcybGRMbVY0Y0c5eWRITjlabTl5S0haaGNpQjFQVndpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUhKbGNYVnBjbVVtSm5KbGNYVnBjbVVzYVQwd08yazhkQzVzWlc1bmRHZzdhU3NyS1c4b2RGdHBYU2s3Y21WMGRYSnVJRzk5Y21WMGRYSnVJSEo5S1NncElpd2lLR1oxYm1OMGFXOXVJQ2h5YjI5MExDQm1ZV04wYjNKNUtYdGNiaUFnSjNWelpTQnpkSEpwWTNRbk8xeHVYRzRnSUM4cWFYTjBZVzVpZFd3Z2FXZHViM0psSUc1bGVIUTZZMkZ1ZENCMFpYTjBLaTljYmlBZ2FXWWdLSFI1Y0dWdlppQnRiMlIxYkdVZ1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUhSNWNHVnZaaUJ0YjJSMWJHVXVaWGh3YjNKMGN5QTlQVDBnSjI5aWFtVmpkQ2NwSUh0Y2JpQWdJQ0J0YjJSMWJHVXVaWGh3YjNKMGN5QTlJR1poWTNSdmNua29LVHRjYmlBZ2ZTQmxiSE5sSUdsbUlDaDBlWEJsYjJZZ1pHVm1hVzVsSUQwOVBTQW5ablZ1WTNScGIyNG5JQ1ltSUdSbFptbHVaUzVoYldRcElIdGNiaUFnSUNBdkx5QkJUVVF1SUZKbFoybHpkR1Z5SUdGeklHRnVJR0Z1YjI1NWJXOTFjeUJ0YjJSMWJHVXVYRzRnSUNBZ1pHVm1hVzVsS0Z0ZExDQm1ZV04wYjNKNUtUdGNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQXZMeUJDY205M2MyVnlJR2RzYjJKaGJITmNiaUFnSUNCeWIyOTBMbTlpYW1WamRGQmhkR2dnUFNCbVlXTjBiM0o1S0NrN1hHNGdJSDFjYm4wcEtIUm9hWE1zSUdaMWJtTjBhVzl1S0NsN1hHNGdJQ2QxYzJVZ2MzUnlhV04wSnp0Y2JseHVJQ0IyWVhJZ2RHOVRkSElnUFNCUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG5SdlUzUnlhVzVuTzF4dUlDQm1kVzVqZEdsdmJpQm9ZWE5QZDI1UWNtOXdaWEowZVNodlltb3NJSEJ5YjNBcElIdGNiaUFnSUNCcFppaHZZbW9nUFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1poYkhObFhHNGdJQ0FnZlZ4dUlDQWdJQzh2ZEc4Z2FHRnVaR3hsSUc5aWFtVmpkSE1nZDJsMGFDQnVkV3hzSUhCeWIzUnZkSGx3WlhNZ0tIUnZieUJsWkdkbElHTmhjMlUvS1Z4dUlDQWdJSEpsZEhWeWJpQlBZbXBsWTNRdWNISnZkRzkwZVhCbExtaGhjMDkzYmxCeWIzQmxjblI1TG1OaGJHd29iMkpxTENCd2NtOXdLVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnYVhORmJYQjBlU2gyWVd4MVpTbDdYRzRnSUNBZ2FXWWdLQ0YyWVd4MVpTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2hwYzBGeWNtRjVLSFpoYkhWbEtTQW1KaUIyWVd4MVpTNXNaVzVuZEdnZ1BUMDlJREFwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBlWEJsYjJZZ2RtRnNkV1VnSVQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnYVc0Z2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNob1lYTlBkMjVRY205d1pYSjBlU2gyWVd4MVpTd2dhU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCbVlXeHpaVHRjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUhSdlUzUnlhVzVuS0hSNWNHVXBlMXh1SUNBZ0lISmxkSFZ5YmlCMGIxTjBjaTVqWVd4c0tIUjVjR1VwTzF4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z2FYTlBZbXBsWTNRb2IySnFLWHRjYmlBZ0lDQnlaWFIxY200Z2RIbHdaVzltSUc5aWFpQTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2RHOVRkSEpwYm1jb2IySnFLU0E5UFQwZ1hDSmJiMkpxWldOMElFOWlhbVZqZEYxY0lqdGNiaUFnZlZ4dVhHNGdJSFpoY2lCcGMwRnljbUY1SUQwZ1FYSnlZWGt1YVhOQmNuSmhlU0I4ZkNCbWRXNWpkR2x2Ymlodlltb3BlMXh1SUNBZ0lDOHFhWE4wWVc1aWRXd2dhV2R1YjNKbElHNWxlSFE2WTJGdWRDQjBaWE4wS2k5Y2JpQWdJQ0J5WlhSMWNtNGdkRzlUZEhJdVkyRnNiQ2h2WW1vcElEMDlQU0FuVzI5aWFtVmpkQ0JCY25KaGVWMG5PMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnYVhOQ2IyOXNaV0Z1S0c5aWFpbDdYRzRnSUNBZ2NtVjBkWEp1SUhSNWNHVnZaaUJ2WW1vZ1BUMDlJQ2RpYjI5c1pXRnVKeUI4ZkNCMGIxTjBjbWx1Wnlodlltb3BJRDA5UFNBblcyOWlhbVZqZENCQ2IyOXNaV0Z1WFNjN1hHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQm5aWFJMWlhrb2EyVjVLWHRjYmlBZ0lDQjJZWElnYVc1MFMyVjVJRDBnY0dGeWMyVkpiblFvYTJWNUtUdGNiaUFnSUNCcFppQW9hVzUwUzJWNUxuUnZVM1J5YVc1bktDa2dQVDA5SUd0bGVTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHbHVkRXRsZVR0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHdGxlVHRjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdaaFkzUnZjbmtvYjNCMGFXOXVjeWtnZTF4dUlDQWdJRzl3ZEdsdmJuTWdQU0J2Y0hScGIyNXpJSHg4SUh0OVhHNWNiaUFnSUNCMllYSWdiMkpxWldOMFVHRjBhQ0E5SUdaMWJtTjBhVzl1S0c5aWFpa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlFOWlhbVZqZEM1clpYbHpLRzlpYW1WamRGQmhkR2dwTG5KbFpIVmpaU2htZFc1amRHbHZiaWh3Y205NGVTd2djSEp2Y0NrZ2UxeHVJQ0FnSUNBZ0lDQnBaaWh3Y205d0lEMDlQU0FuWTNKbFlYUmxKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCd2NtOTRlVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lDOHFhWE4wWVc1aWRXd2dhV2R1YjNKbElHVnNjMlVxTDF4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHOWlhbVZqZEZCaGRHaGJjSEp2Y0YwZ1BUMDlJQ2RtZFc1amRHbHZiaWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQndjbTk0ZVZ0d2NtOXdYU0E5SUc5aWFtVmpkRkJoZEdoYmNISnZjRjB1WW1sdVpDaHZZbXBsWTNSUVlYUm9MQ0J2WW1vcE8xeHVJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSEJ5YjNoNU8xeHVJQ0FnSUNBZ2ZTd2dlMzBwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0JtZFc1amRHbHZiaUJvWVhOVGFHRnNiRzkzVUhKdmNHVnlkSGtvYjJKcUxDQndjbTl3S1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnS0c5d2RHbHZibk11YVc1amJIVmtaVWx1YUdWeWFYUmxaRkJ5YjNCeklIeDhJQ2gwZVhCbGIyWWdjSEp2Y0NBOVBUMGdKMjUxYldKbGNpY2dKaVlnUVhKeVlYa3VhWE5CY25KaGVTaHZZbW9wS1NCOGZDQm9ZWE5QZDI1UWNtOXdaWEowZVNodlltb3NJSEJ5YjNBcEtWeHVJQ0FnSUgxY2JseHVJQ0FnSUdaMWJtTjBhVzl1SUdkbGRGTm9ZV3hzYjNkUWNtOXdaWEowZVNodlltb3NJSEJ5YjNBcElIdGNiaUFnSUNBZ0lHbG1JQ2hvWVhOVGFHRnNiRzkzVUhKdmNHVnlkSGtvYjJKcUxDQndjbTl3S1NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFXM0J5YjNCZE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUdaMWJtTjBhVzl1SUhObGRDaHZZbW9zSUhCaGRHZ3NJSFpoYkhWbExDQmtiMDV2ZEZKbGNHeGhZMlVwZTF4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmJuVnRZbVZ5SnlrZ2UxeHVJQ0FnSUNBZ0lDQndZWFJvSUQwZ1czQmhkR2hkTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tDRndZWFJvSUh4OElIQmhkR2d1YkdWdVozUm9JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhCaGRHZ2dQVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCelpYUW9iMkpxTENCd1lYUm9Mbk53YkdsMEtDY3VKeWt1YldGd0tHZGxkRXRsZVNrc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJRWVhSb0lEMGdjR0YwYUZzd1hUdGNiaUFnSUNBZ0lIWmhjaUJqZFhKeVpXNTBWbUZzZFdVZ1BTQm5aWFJUYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCamRYSnlaVzUwVUdGMGFDazdYRzRnSUNBZ0lDQnBaaUFvY0dGMGFDNXNaVzVuZEdnZ1BUMDlJREVwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLR04xY25KbGJuUldZV3gxWlNBOVBUMGdkbTlwWkNBd0lIeDhJQ0ZrYjA1dmRGSmxjR3hoWTJVcElIdGNiaUFnSUNBZ0lDQWdJQ0J2WW1wYlkzVnljbVZ1ZEZCaGRHaGRJRDBnZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR04xY25KbGJuUldZV3gxWlR0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLR04xY25KbGJuUldZV3gxWlNBOVBUMGdkbTlwWkNBd0tTQjdYRzRnSUNBZ0lDQWdJQzh2WTJobFkyc2dhV1lnZDJVZ1lYTnpkVzFsSUdGdUlHRnljbUY1WEc0Z0lDQWdJQ0FnSUdsbUtIUjVjR1Z2WmlCd1lYUm9XekZkSUQwOVBTQW5iblZ0WW1WeUp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUc5aWFsdGpkWEp5Wlc1MFVHRjBhRjBnUFNCYlhUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0J2WW1wYlkzVnljbVZ1ZEZCaGRHaGRJRDBnZTMwN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdjbVYwZFhKdUlITmxkQ2h2WW1wYlkzVnljbVZ1ZEZCaGRHaGRMQ0J3WVhSb0xuTnNhV05sS0RFcExDQjJZV3gxWlN3Z1pHOU9iM1JTWlhCc1lXTmxLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnZZbXBsWTNSUVlYUm9MbWhoY3lBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ3BJSHRjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjI1MWJXSmxjaWNwSUh0Y2JpQWdJQ0FnSUNBZ2NHRjBhQ0E5SUZ0d1lYUm9YVHRjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSEJoZEdnZ1BUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0FnSUhCaGRHZ2dQU0J3WVhSb0xuTndiR2wwS0NjdUp5azdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNnaGNHRjBhQ0I4ZkNCd1lYUm9MbXhsYm1kMGFDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z0lTRnZZbW83WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2NHRjBhQzVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYWlBOUlHZGxkRXRsZVNod1lYUm9XMmxkS1R0Y2JseHVJQ0FnSUNBZ0lDQnBaaWdvZEhsd1pXOW1JR29nUFQwOUlDZHVkVzFpWlhJbklDWW1JR2x6UVhKeVlYa29iMkpxS1NBbUppQnFJRHdnYjJKcUxteGxibWQwYUNrZ2ZIeGNiaUFnSUNBZ0lDQWdJQ0FvYjNCMGFXOXVjeTVwYm1Oc2RXUmxTVzVvWlhKcGRHVmtVSEp2Y0hNZ1B5QW9haUJwYmlCUFltcGxZM1FvYjJKcUtTa2dPaUJvWVhOUGQyNVFjbTl3WlhKMGVTaHZZbW9zSUdvcEtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUc5aWFpQTlJRzlpYWx0cVhUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1Wlc1emRYSmxSWGhwYzNSeklEMGdablZ1WTNScGIyNGdLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXBlMXh1SUNBZ0lDQWdjbVYwZFhKdUlITmxkQ2h2WW1vc0lIQmhkR2dzSUhaaGJIVmxMQ0IwY25WbEtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNXpaWFFnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb0xDQjJZV3gxWlN3Z1pHOU9iM1JTWlhCc1lXTmxLWHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnpaWFFvYjJKcUxDQndZWFJvTENCMllXeDFaU3dnWkc5T2IzUlNaWEJzWVdObEtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNXBibk5sY25RZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTd2dZWFFwZTF4dUlDQWdJQ0FnZG1GeUlHRnljaUE5SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQ2s3WEc0Z0lDQWdJQ0JoZENBOUlINStZWFE3WEc0Z0lDQWdJQ0JwWmlBb0lXbHpRWEp5WVhrb1lYSnlLU2tnZTF4dUlDQWdJQ0FnSUNCaGNuSWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENCaGNuSXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdZWEp5TG5Od2JHbGpaU2hoZEN3Z01Dd2dkbUZzZFdVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtVnRjSFI1SUQwZ1puVnVZM1JwYjI0b2IySnFMQ0J3WVhSb0tTQjdYRzRnSUNBZ0lDQnBaaUFvYVhORmJYQjBlU2h3WVhSb0tTa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbTlwWkNBd08xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLRzlpYWlBOVBTQnVkV3hzS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMmIybGtJREE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhaaGNpQjJZV3gxWlN3Z2FUdGNiaUFnSUNBZ0lHbG1JQ2doS0haaGJIVmxJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9LU2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhadmFXUWdNRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCMllXeDFaU0E5UFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z0p5Y3BPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzBKdmIyeGxZVzRvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJR1poYkhObEtUdGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlIWmhiSFZsSUQwOVBTQW5iblZ0WW1WeUp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxWldOMFVHRjBhQzV6WlhRb2IySnFMQ0J3WVhSb0xDQXdLVHRjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvYVhOQmNuSmhlU2gyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnZG1Gc2RXVXViR1Z1WjNSb0lEMGdNRHRjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvYVhOUFltcGxZM1FvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdJQ0FnSUdadmNpQW9hU0JwYmlCMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2hvWVhOVGFHRnNiRzkzVUhKdmNHVnlkSGtvZG1Gc2RXVXNJR2twS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JrWld4bGRHVWdkbUZzZFdWYmFWMDdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1elpYUW9iMkpxTENCd1lYUm9MQ0J1ZFd4c0tUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOU8xeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNXdkWE5vSUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDQXZLaXdnZG1Gc2RXVnpJQ292S1h0Y2JpQWdJQ0FnSUhaaGNpQmhjbklnUFNCdlltcGxZM1JRWVhSb0xtZGxkQ2h2WW1vc0lIQmhkR2dwTzF4dUlDQWdJQ0FnYVdZZ0tDRnBjMEZ5Y21GNUtHRnljaWtwSUh0Y2JpQWdJQ0FnSUNBZ1lYSnlJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z1lYSnlLVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnWVhKeUxuQjFjMmd1WVhCd2JIa29ZWEp5TENCQmNuSmhlUzV3Y205MGIzUjVjR1V1YzJ4cFkyVXVZMkZzYkNoaGNtZDFiV1Z1ZEhNc0lESXBLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVqYjJGc1pYTmpaU0E5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdoekxDQmtaV1poZFd4MFZtRnNkV1VwSUh0Y2JpQWdJQ0FnSUhaaGNpQjJZV3gxWlR0Y2JseHVJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREFzSUd4bGJpQTlJSEJoZEdoekxteGxibWQwYURzZ2FTQThJR3hsYmpzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDZ29kbUZzZFdVZ1BTQnZZbXBsWTNSUVlYUm9MbWRsZENodlltb3NJSEJoZEdoelcybGRLU2tnSVQwOUlIWnZhV1FnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjJZV3gxWlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnlaWFIxY200Z1pHVm1ZWFZzZEZaaGJIVmxPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQnZZbXBsWTNSUVlYUm9MbWRsZENBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ3NJR1JsWm1GMWJIUldZV3gxWlNsN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQmJjR0YwYUYwN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9JWEJoZEdnZ2ZId2djR0YwYUM1c1pXNW5kR2dnUFQwOUlEQXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYWp0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDaHZZbW9nUFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWkdWbVlYVnNkRlpoYkhWbE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxWldOMFVHRjBhQzVuWlhRb2IySnFMQ0J3WVhSb0xuTndiR2wwS0NjdUp5a3NJR1JsWm1GMWJIUldZV3gxWlNrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lIWmhjaUJqZFhKeVpXNTBVR0YwYUNBOUlHZGxkRXRsZVNod1lYUm9XekJkS1R0Y2JpQWdJQ0FnSUhaaGNpQnVaWGgwVDJKcUlEMGdaMlYwVTJoaGJHeHZkMUJ5YjNCbGNuUjVLRzlpYWl3Z1kzVnljbVZ1ZEZCaGRHZ3BYRzRnSUNBZ0lDQnBaaUFvYm1WNGRFOWlhaUE5UFQwZ2RtOXBaQ0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCa1pXWmhkV3gwVm1Gc2RXVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNod1lYUm9MbXhsYm1kMGFDQTlQVDBnTVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2JtVjRkRTlpYWp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWx0amRYSnlaVzUwVUdGMGFGMHNJSEJoZEdndWMyeHBZMlVvTVNrc0lHUmxabUYxYkhSV1lXeDFaU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1WkdWc0lEMGdablZ1WTNScGIyNGdaR1ZzS0c5aWFpd2djR0YwYUNrZ2UxeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5iblZ0WW1WeUp5a2dlMXh1SUNBZ0lDQWdJQ0J3WVhSb0lEMGdXM0JoZEdoZE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaUFvYjJKcUlEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tHbHpSVzF3ZEhrb2NHRjBhQ2twSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFqdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1LSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxWldOMFVHRjBhQzVrWld3b2IySnFMQ0J3WVhSb0xuTndiR2wwS0NjdUp5a3BPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ1kzVnljbVZ1ZEZCaGRHZ2dQU0JuWlhSTFpYa29jR0YwYUZzd1hTazdYRzRnSUNBZ0lDQnBaaUFvSVdoaGMxTm9ZV3hzYjNkUWNtOXdaWEowZVNodlltb3NJR04xY25KbGJuUlFZWFJvS1NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlod1lYUm9MbXhsYm1kMGFDQTlQVDBnTVNrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYVhOQmNuSmhlU2h2WW1vcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcUxuTndiR2xqWlNoamRYSnlaVzUwVUdGMGFDd2dNU2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ1pHVnNaWFJsSUc5aWFsdGpkWEp5Wlc1MFVHRjBhRjA3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG1SbGJDaHZZbXBiWTNWeWNtVnVkRkJoZEdoZExDQndZWFJvTG5Oc2FXTmxLREVwS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFqdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUR0Y2JpQWdmVnh1WEc0Z0lIWmhjaUJ0YjJRZ1BTQm1ZV04wYjNKNUtDazdYRzRnSUcxdlpDNWpjbVZoZEdVZ1BTQm1ZV04wYjNKNU8xeHVJQ0J0YjJRdWQybDBhRWx1YUdWeWFYUmxaRkJ5YjNCeklEMGdabUZqZEc5eWVTaDdhVzVqYkhWa1pVbHVhR1Z5YVhSbFpGQnliM0J6T2lCMGNuVmxmU2xjYmlBZ2NtVjBkWEp1SUcxdlpEdGNibjBwTzF4dUlpd2lKM1Z6WlNCemRISnBZM1FuWEc1Y2JtTnZibk4wSUh0cGMwOWlhbVZqZEN3Z1oyVjBTMlY1YzMwZ1BTQnlaWEYxYVhKbEtDY3VMMnhoYm1jbktWeHVYRzR2THlCUVVrbFdRVlJGSUZCU1QxQkZVbFJKUlZOY2JtTnZibk4wSUVKWlVFRlRVMTlOVDBSRklEMGdKMTlmWW5sd1lYTnpUVzlrWlNkY2JtTnZibk4wSUVsSFRrOVNSVjlEU1ZKRFZVeEJVaUE5SUNkZlgybG5ibTl5WlVOcGNtTjFiR0Z5SjF4dVkyOXVjM1FnVFVGWVgwUkZSVkFnUFNBblgxOXRZWGhFWldWd0oxeHVZMjl1YzNRZ1EwRkRTRVVnUFNBblgxOWpZV05vWlNkY2JtTnZibk4wSUZGVlJWVkZJRDBnSjE5ZmNYVmxkV1VuWEc1amIyNXpkQ0JUVkVGVVJTQTlJQ2RmWDNOMFlYUmxKMXh1WEc1amIyNXpkQ0JGVFZCVVdWOVRWRUZVUlNBOUlIdDlYRzVjYm1Oc1lYTnpJRkpsWTNWeWMybDJaVWwwWlhKaGRHOXlJSHRjYmlBZ0x5b3FYRzRnSUNBcUlFQndZWEpoYlNCN1QySnFaV04wZkVGeWNtRjVmU0J5YjI5MFhHNGdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0JiWW5sd1lYTnpUVzlrWlQwd1hWeHVJQ0FnS2lCQWNHRnlZVzBnZTBKdmIyeGxZVzU5SUZ0cFoyNXZjbVZEYVhKamRXeGhjajFtWVd4elpWMWNiaUFnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUZ0dFlYaEVaV1Z3UFRFd01GMWNiaUFnSUNvdlhHNGdJR052Ym5OMGNuVmpkRzl5SUNoeWIyOTBMQ0JpZVhCaGMzTk5iMlJsSUQwZ01Dd2dhV2R1YjNKbFEybHlZM1ZzWVhJZ1BTQm1ZV3h6WlN3Z2JXRjRSR1ZsY0NBOUlERXdNQ2tnZTF4dUlDQWdJSFJvYVhOYlFsbFFRVk5UWDAxUFJFVmRJRDBnWW5sd1lYTnpUVzlrWlZ4dUlDQWdJSFJvYVhOYlNVZE9UMUpGWDBOSlVrTlZURUZTWFNBOUlHbG5ibTl5WlVOcGNtTjFiR0Z5WEc0Z0lDQWdkR2hwYzF0TlFWaGZSRVZGVUYwZ1BTQnRZWGhFWldWd1hHNGdJQ0FnZEdocGMxdERRVU5JUlYwZ1BTQmJYVnh1SUNBZ0lIUm9hWE5iVVZWRlZVVmRJRDBnVzExY2JpQWdJQ0IwYUdselcxTlVRVlJGWFNBOUlIUm9hWE11WjJWMFUzUmhkR1VvZFc1a1pXWnBibVZrTENCeWIyOTBLVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJBY21WMGRYSnVjeUI3VDJKcVpXTjBmVnh1SUNBZ0tpOWNiaUFnYm1WNGRDQW9LU0I3WEc0Z0lDQWdZMjl1YzNRZ2UyNXZaR1VzSUhCaGRHZ3NJR1JsWlhCOUlEMGdkR2hwYzF0VFZFRlVSVjBnZkh3Z1JVMVFWRmxmVTFSQlZFVmNibHh1SUNBZ0lHbG1JQ2gwYUdselcwMUJXRjlFUlVWUVhTQStJR1JsWlhBcElIdGNiaUFnSUNBZ0lHbG1JQ2gwYUdsekxtbHpUbTlrWlNodWIyUmxLU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9kR2hwY3k1cGMwTnBjbU4xYkdGeUtHNXZaR1VwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0hSb2FYTmJTVWRPVDFKRlgwTkpVa05WVEVGU1hTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdjMnRwY0Z4dUlDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KME5wY21OMWJHRnlJSEpsWm1WeVpXNWpaU2NwWEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJR2xtSUNoMGFHbHpMbTl1VTNSbGNFbHVkRzhvZEdocGMxdFRWRUZVUlYwcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCamIyNXpkQ0JrWlhOamNtbHdkRzl5Y3lBOUlIUm9hWE11WjJWMFUzUmhkR1Z6VDJaRGFHbHNaRTV2WkdWektHNXZaR1VzSUhCaGRHZ3NJR1JsWlhBcFhHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emRDQnRaWFJvYjJRZ1BTQjBhR2x6VzBKWlVFRlRVMTlOVDBSRlhTQS9JQ2R3ZFhOb0p5QTZJQ2QxYm5Ob2FXWjBKMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjMXRSVlVWVlJWMWJiV1YwYUc5a1hTZ3VMaTVrWlhOamNtbHdkRzl5Y3lsY2JpQWdJQ0FnSUNBZ0lDQWdJSFJvYVhOYlEwRkRTRVZkTG5CMWMyZ29ibTlrWlNsY2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQmpiMjV6ZENCMllXeDFaU0E5SUhSb2FYTmJVVlZGVlVWZExuTm9hV1owS0NsY2JpQWdJQ0JqYjI1emRDQmtiMjVsSUQwZ0lYWmhiSFZsWEc1Y2JpQWdJQ0IwYUdselcxTlVRVlJGWFNBOUlIWmhiSFZsWEc1Y2JpQWdJQ0JwWmlBb1pHOXVaU2tnZEdocGN5NWtaWE4wY205NUtDbGNibHh1SUNBZ0lISmxkSFZ5YmlCN2RtRnNkV1VzSUdSdmJtVjlYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFYRzRnSUNBcUwxeHVJQ0JrWlhOMGNtOTVJQ2dwSUh0Y2JpQWdJQ0IwYUdselcxRlZSVlZGWFM1c1pXNW5kR2dnUFNBd1hHNGdJQ0FnZEdocGMxdERRVU5JUlYwdWJHVnVaM1JvSUQwZ01GeHVJQ0FnSUhSb2FYTmJVMVJCVkVWZElEMGdiblZzYkZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNvdlhHNGdJR2x6VG05a1pTQW9ZVzU1S1NCN1hHNGdJQ0FnY21WMGRYSnVJR2x6VDJKcVpXTjBLR0Z1ZVNsY2JpQWdmVnh1SUNBdktpcGNiaUFnSUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBcUwxeHVJQ0JwYzB4bFlXWWdLR0Z1ZVNrZ2UxeHVJQ0FnSUhKbGRIVnliaUFoZEdocGN5NXBjMDV2WkdVb1lXNTVLVnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJBY0dGeVlXMGdleXA5SUdGdWVWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ292WEc0Z0lHbHpRMmx5WTNWc1lYSWdLR0Z1ZVNrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwYUdselcwTkJRMGhGWFM1cGJtUmxlRTltS0dGdWVTa2dJVDA5SUMweFhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlGSmxkSFZ5Ym5NZ2MzUmhkR1Z6SUc5bUlHTm9hV3hrSUc1dlpHVnpYRzRnSUNBcUlFQndZWEpoYlNCN1QySnFaV04wZlNCdWIyUmxYRzRnSUNBcUlFQndZWEpoYlNCN1FYSnlZWGw5SUhCaGRHaGNiaUFnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUdSbFpYQmNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwRnljbUY1UEU5aWFtVmpkRDU5WEc0Z0lDQXFMMXh1SUNCblpYUlRkR0YwWlhOUFprTm9hV3hrVG05a1pYTWdLRzV2WkdVc0lIQmhkR2dzSUdSbFpYQXBJSHRjYmlBZ0lDQnlaWFIxY200Z1oyVjBTMlY1Y3lodWIyUmxLUzV0WVhBb2EyVjVJRDArWEc0Z0lDQWdJQ0IwYUdsekxtZGxkRk4wWVhSbEtHNXZaR1VzSUc1dlpHVmJhMlY1WFN3Z2EyVjVMQ0J3WVhSb0xtTnZibU5oZENoclpYa3BMQ0JrWldWd0lDc2dNU2xjYmlBZ0lDQXBYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRkpsZEhWeWJuTWdjM1JoZEdVZ2IyWWdibTlrWlM0Z1EyRnNiSE1nWm05eUlHVmhZMmdnYm05a1pWeHVJQ0FnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSDBnVzNCaGNtVnVkRjFjYmlBZ0lDb2dRSEJoY21GdElIc3FmU0JiYm05a1pWMWNiaUFnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUZ0clpYbGRYRzRnSUNBcUlFQndZWEpoYlNCN1FYSnlZWGw5SUZ0d1lYUm9YVnh1SUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ1cyUmxaWEJkWEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRQWW1wbFkzUjlYRzRnSUNBcUwxeHVJQ0JuWlhSVGRHRjBaU0FvY0dGeVpXNTBMQ0J1YjJSbExDQnJaWGtzSUhCaGRHZ2dQU0JiWFN3Z1pHVmxjQ0E5SURBcElIdGNiaUFnSUNCeVpYUjFjbTRnZTNCaGNtVnVkQ3dnYm05a1pTd2dhMlY1TENCd1lYUm9MQ0JrWldWd2ZWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQkRZV3hzWW1GamExeHVJQ0FnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSDBnYzNSaGRHVmNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FxTDF4dUlDQnZibE4wWlhCSmJuUnZJQ2h6ZEdGMFpTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMGNuVmxYRzRnSUgxY2JpQWdMeW9xWEc0Z0lDQXFJRUJ5WlhSMWNtNXpJSHRTWldOMWNuTnBkbVZKZEdWeVlYUnZjbjFjYmlBZ0lDb3ZYRzRnSUZ0VGVXMWliMnd1YVhSbGNtRjBiM0pkSUNncElIdGNiaUFnSUNCeVpYUjFjbTRnZEdocGMxeHVJQ0I5WEc1OVhHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdVbVZqZFhKemFYWmxTWFJsY21GMGIzSmNiaUlzSWlkMWMyVWdjM1J5YVdOMEoxeHVMeW9xWEc0Z0tpQkFjR0Z5WVcwZ2V5cDlJR0Z1ZVZ4dUlDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnS2k5Y2JtWjFibU4wYVc5dUlHbHpUMkpxWldOMElDaGhibmtwSUh0Y2JpQWdjbVYwZFhKdUlHRnVlU0FoUFQwZ2JuVnNiQ0FtSmlCMGVYQmxiMllnWVc1NUlEMDlQU0FuYjJKcVpXTjBKMXh1ZlZ4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1OdmJuTjBJSHRwYzBGeWNtRjVmU0E5SUVGeWNtRjVYRzR2S2lwY2JpQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNGdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBcUwxeHVablZ1WTNScGIyNGdhWE5CY25KaGVVeHBhMlVnS0dGdWVTa2dlMXh1SUNCcFppQW9JV2x6VDJKcVpXTjBLR0Z1ZVNrcElISmxkSFZ5YmlCbVlXeHpaVnh1SUNCcFppQW9JU2duYkdWdVozUm9KeUJwYmlCaGJua3BLU0J5WlhSMWNtNGdabUZzYzJWY2JpQWdZMjl1YzNRZ2JHVnVaM1JvSUQwZ1lXNTVMbXhsYm1kMGFGeHVJQ0JwWmlBb0lXbHpUblZ0WW1WeUtHeGxibWQwYUNrcElISmxkSFZ5YmlCbVlXeHpaVnh1SUNCcFppQW9iR1Z1WjNSb0lENGdNQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQW9iR1Z1WjNSb0lDMGdNU2tnYVc0Z1lXNTVYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdabTl5SUNoamIyNXpkQ0JyWlhrZ2FXNGdZVzU1S1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWm1Gc2MyVmNiaUFnSUNCOVhHNGdJSDFjYm4xY2JpOHFLbHh1SUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmlBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ292WEc1bWRXNWpkR2x2YmlCcGMwNTFiV0psY2lBb1lXNTVLU0I3WEc0Z0lISmxkSFZ5YmlCMGVYQmxiMllnWVc1NUlEMDlQU0FuYm5WdFltVnlKMXh1ZlZ4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSHhCY25KaGVYMGdiMkpxWldOMFhHNGdLaUJBY21WMGRYSnVjeUI3UVhKeVlYazhVM1J5YVc1blBuMWNiaUFxTDF4dVpuVnVZM1JwYjI0Z1oyVjBTMlY1Y3lBb2IySnFaV04wS1NCN1hHNGdJR052Ym5OMElHdGxlWE5mSUQwZ1QySnFaV04wTG10bGVYTW9iMkpxWldOMEtWeHVJQ0JwWmlBb2FYTkJjbkpoZVNodlltcGxZM1FwS1NCN1hHNGdJQ0FnTHk4Z2MydHBjQ0J6YjNKMFhHNGdJSDBnWld4elpTQnBaaUFvYVhOQmNuSmhlVXhwYTJVb2IySnFaV04wS1NrZ2UxeHVJQ0FnSUdOdmJuTjBJR2x1WkdWNElEMGdhMlY1YzE4dWFXNWtaWGhQWmlnbmJHVnVaM1JvSnlsY2JpQWdJQ0JwWmlBb2FXNWtaWGdnUGlBdE1Ta2dlMXh1SUNBZ0lDQWdhMlY1YzE4dWMzQnNhV05sS0dsdVpHVjRMQ0F4S1Z4dUlDQWdJSDFjYmlBZ0lDQXZMeUJ6YTJsd0lITnZjblJjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0F2THlCemIzSjBYRzRnSUNBZ2EyVjVjMTh1YzI5eWRDZ3BYRzRnSUgxY2JpQWdjbVYwZFhKdUlHdGxlWE5mWEc1OVhHNWNibVY0Y0c5eWRITXVaMlYwUzJWNWN5QTlJR2RsZEV0bGVYTmNibVY0Y0c5eWRITXVhWE5CY25KaGVTQTlJR2x6UVhKeVlYbGNibVY0Y0c5eWRITXVhWE5CY25KaGVVeHBhMlVnUFNCcGMwRnljbUY1VEdsclpWeHVaWGh3YjNKMGN5NXBjMDlpYW1WamRDQTlJR2x6VDJKcVpXTjBYRzVsZUhCdmNuUnpMbWx6VG5WdFltVnlJRDBnYVhOT2RXMWlaWEpjYmlJc0lteGxkQ0I3UTI5dGNHOXVaVzUwZlNBOUlGSmxZV04wTzF4dVhHNWpiMjV6ZENCcGJtbDBhV0ZzVTNSaGRHVWdQU0I3WEc0Z0lDQWdjMmh2ZDBacFpXeGtVMlZzWldOMGFXOXVPaUJtWVd4elpTeGNiaUFnSUNCMWNtdzZJQ2NuTEZ4dUlDQWdJR1pwWld4a1RXRndPaUI3WEc0Z0lDQWdJQ0FnSUdsMFpXMURiMjUwWVdsdVpYSTZJRzUxYkd3c1hHNGdJQ0FnSUNBZ0lIUnBkR3hsT2lBbkp5eGNiaUFnSUNBZ0lDQWdZMjl1ZEdWdWREb2dKeWRjYmlBZ0lDQjlYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCamJHRnpjeUJUWlhSMGFXNW5jeUJsZUhSbGJtUnpJRU52YlhCdmJtVnVkQ0I3WEc0Z0lDQWdZMjl1YzNSeWRXTjBiM0lvY0hKdmNITXBJSHRjYmlBZ0lDQWdJQ0FnYzNWd1pYSW9jSEp2Y0hNcE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5OMFlYUmxJRDBnYVc1cGRHbGhiRk4wWVhSbE8xeHVYRzRnSUNBZ0lDQWdJSFJvYVhNdWRYSnNRMmhoYm1kbElEMGdkR2hwY3k1MWNteERhR0Z1WjJVdVltbHVaQ2gwYUdsektUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1b1lXNWtiR1ZUZFdKdGFYUWdQU0IwYUdsekxtaGhibVJzWlZOMVltMXBkQzVpYVc1a0tIUm9hWE1wTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbkpsYzJWMFQzQjBhVzl1Y3lBOUlIUm9hWE11Y21WelpYUlBjSFJwYjI1ekxtSnBibVFvZEdocGN5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEFnUFNCMGFHbHpMblZ3WkdGMFpVWnBaV3hrVFdGd0xtSnBibVFvZEdocGN5azdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ1kyOXRjRzl1Wlc1MFJHbGtUVzkxYm5Rb0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWFXNXBkRTl3ZEdsdmJuTW9LVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnBibWwwVDNCMGFXOXVjeWdwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnRiMlJLYzI5dVVtVnVaR1Z5TG05d2RHbHZibk1nSVQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpiMjV6ZENCdmNIUnBiMjV6SUQwZ2JXOWtTbk52YmxKbGJtUmxjaTV2Y0hScGIyNXpPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhKc09pQnZjSFJwYjI1ekxuVnliQ0EvSUc5d2RHbHZibk11ZFhKc0lEb2dKeWNzWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWm1sbGJHUk5ZWEE2SUc5d2RHbHZibk11Wm1sbGJHUk5ZWEFnUHlCS1UwOU9MbkJoY25ObEtHOXdkR2x2Ym5NdVptbGxiR1JOWVhBcElEb2dlMmwwWlcxRGIyNTBZV2x1WlhJNklHNTFiR3dzSUhScGRHeGxPaUFuSnl3Z1kyOXVkR1Z1ZERvZ0p5ZDlMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSE5vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nSVNGdmNIUnBiMjV6TG5WeWJGeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCMWNteERhR0Z1WjJVb1pYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3ZFhKc09pQmxkbVZ1ZEM1MFlYSm5aWFF1ZG1Gc2RXVjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQm9ZVzVrYkdWVGRXSnRhWFFvWlhabGJuUXBJSHRjYmlBZ0lDQWdJQ0FnWlhabGJuUXVjSEpsZG1WdWRFUmxabUYxYkhRb0tUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dU9pQjBjblZsZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WelpYUlBjSFJwYjI1ektHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9hVzVwZEdsaGJGTjBZWFJsS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCdVpYZFdZV3dnUFNCUFltcGxZM1F1WVhOemFXZHVLSFJvYVhNdWMzUmhkR1V1Wm1sbGJHUk5ZWEFzSUhaaGJIVmxLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdabWxsYkdSTllYQTZJRzVsZDFaaGJIMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2lncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzTm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJpd2dkWEpzZlNBOUlIUm9hWE11YzNSaGRHVTdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdHBkR1Z0UTI5dWRHRnBibVZ5TENCMGFYUnNaU3dnWTI5dWRHVnVkSDBnUFNCMGFHbHpMbk4wWVhSbExtWnBaV3hrVFdGd08xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoMWNtd2dKaVlnYVhSbGJVTnZiblJoYVc1bGNpQWhQVDBnYm5Wc2JDQW1KaUIwYVhSc1pTQW1KaUJqYjI1MFpXNTBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeFRkVzF0WVhKNUlIc3VMaTUwYUdsekxuTjBZWFJsZlNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4U1c1d2RYUkdhV1ZzWkhNZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhoSUdoeVpXWTlYQ0lqWENJZ2IyNURiR2xqYXoxN2RHaHBjeTV5WlhObGRFOXdkR2x2Ym5OOUlHTnNZWE56VG1GdFpUMWNJbUoxZEhSdmJsd2lQbEpsYzJWMElITmxkSFJwYm1kelBDOWhQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHphRzkzUm1sbGJHUlRaV3hsWTNScGIyNHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BFWnBaV3hrVTJWc1pXTjBhVzl1SUhWeWJEMTdkWEpzZlNCbWFXVnNaRTFoY0QxN2RHaHBjeTV6ZEdGMFpTNW1hV1ZzWkUxaGNIMGdkWEJrWVhSbFJtbGxiR1JOWVhBOWUzUm9hWE11ZFhCa1lYUmxSbWxsYkdSTllYQjlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BFbHVjSFYwUm1sbGJHUnpJSHN1TGk1MGFHbHpMbk4wWVhSbGZTQXZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFlTQm9jbVZtUFZ3aUkxd2lJRzl1UTJ4cFkyczllM1JvYVhNdWNtVnpaWFJQY0hScGIyNXpmU0JqYkdGemMwNWhiV1U5WENKaWRYUjBiMjVjSWo1U1pYTmxkQ0J6WlhSMGFXNW5jend2WVQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpZDNKaGNGd2lQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFptOXliU0J2YmxOMVltMXBkRDE3ZEdocGN5NW9ZVzVrYkdWVGRXSnRhWFI5UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR3hoWW1Wc1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGMzUnliMjVuUGtSaGRHRWdjMjkxY21ObFBDOXpkSEp2Ym1jK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzlzWVdKbGJENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WW5JdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhwUGtWdWRHVnlJR0VnZG1Gc2FXUWdTbE5QVGlCaGNHa2dkWEpzTGp3dmFUNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZjRDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhwYm5CMWRDQjBlWEJsUFZ3aWRHVjRkRndpSUhOMGVXeGxQWHQ3ZDJsa2RHZzZJQ2N4TURBbEozMTlJSFpoYkhWbFBYdDFjbXg5SUc5dVEyaGhibWRsUFh0MGFHbHpMblZ5YkVOb1lXNW5aWDB2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhBK1BHbHVjSFYwSUhSNWNHVTlYQ0p6ZFdKdGFYUmNJaUJqYkdGemMwNWhiV1U5WENKaWRYUjBiMjRnWW5WMGRHOXVMWEJ5YVcxaGNubGNJaUIyWVd4MVpUMWNJbE4xWW0xcGRGd2lMejQ4TDNBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2Wm05eWJUNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEVsdWNIVjBSbWxsYkdSeklIc3VMaTUwYUdsekxuTjBZWFJsZlNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4xY2JseHVMeTg5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFZ4dVhHNW1kVzVqZEdsdmJpQkpibkIxZEVacFpXeGtjeWh3Y205d2N5a2dlMXh1SUNBZ0lISmxkSFZ5YmlBb1hHNGdJQ0FnSUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQThhVzV3ZFhRZ2RIbHdaVDFjSW1ocFpHUmxibHdpSUc1aGJXVTlYQ0p0YjJSZmFuTnZibDl5Wlc1a1pYSmZkWEpzWENJZ2RtRnNkV1U5ZTNCeWIzQnpMblZ5YkgwdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSm9hV1JrWlc1Y0lpQnVZVzFsUFZ3aWJXOWtYMnB6YjI1ZmNtVnVaR1Z5WDJacFpXeGtiV0Z3WENJZ2RtRnNkV1U5ZTBwVFQwNHVjM1J5YVc1bmFXWjVLSEJ5YjNCekxtWnBaV3hrVFdGd0tYMHZQbHh1SUNBZ0lDQWdJQ0E4TDJScGRqNWNiaUFnSUNBcE8xeHVmVnh1WEc0dkx6MDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlYRzVjYm1aMWJtTjBhVzl1SUZOMWJXMWhjbmtvY0hKdmNITXBJSHRjYmlBZ0lDQnlaWFIxY200Z0tGeHVJQ0FnSUNBZ0lDQThaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdQSFZzUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4c2FTQnpkSGxzWlQxN2UzZHZjbVJDY21WaGF6b2dKMkp5WldGckxXRnNiQ2Q5ZlQ1RVlYUmhJSE52ZFhKalpUb2dlM0J5YjNCekxuVnliSDA4TDJ4cFBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHNhVDVVYVhSc1pUb2dlM0J5YjNCekxtWnBaV3hrVFdGd0xuUnBkR3hsZlR3dmJHaytYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR3hwUGtOdmJuUmxiblE2SUh0d2NtOXdjeTVtYVdWc1pFMWhjQzVqYjI1MFpXNTBmVHd2YkdrK1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4TDNWc1BseHVJQ0FnSUNBZ0lDQThMMlJwZGo1Y2JpQWdJQ0FwTzF4dWZWeHVYRzR2THowOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVhHNWNibU5zWVhOeklFWnBaV3hrVTJWc1pXTjBhVzl1SUdWNGRHVnVaSE1nUTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2lod2NtOXdjeWtnZTF4dUlDQWdJQ0FnSUNCemRYQmxjaWh3Y205d2N5azdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMzUmhkR1VnUFNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsY25KdmNqb2diblZzYkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR2x6VEc5aFpHVmtPaUJtWVd4elpTeGNiaUFnSUNBZ0lDQWdJQ0FnSUdsMFpXMXpPaUJiWFZ4dUlDQWdJQ0FnSUNCOU8xeHVYRzRnSUNBZ0lDQWdJSFJvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEFnUFNCMGFHbHpMblZ3WkdGMFpVWnBaV3hrVFdGd0xtSnBibVFvZEdocGN5azdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RYQmtZWFJsUm1sbGJHUk5ZWEFvZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXdjbTl3Y3k1MWNHUmhkR1ZHYVdWc1pFMWhjQ2gyWVd4MVpTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5OGdWRTlFVHlCbWJIbDBkR0VnZEdsc2JDQmxaMlZ1SUdOc1lYTnpYRzRnSUNBZ1oyVjBRWEJwUkdGMFlTZ3BJSHRjYmlBZ0lDQWdJQ0FnWm1WMFkyZ29kR2hwY3k1d2NtOXdjeTUxY213cFhHNGdJQ0FnSUNBZ0lDQWdJQ0F1ZEdobGJpaHlaWE1nUFQ0Z2NtVnpMbXB6YjI0b0tTbGNiaUFnSUNBZ0lDQWdJQ0FnSUM1MGFHVnVLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ2h5WlhOMWJIUXBJRDArSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcGMweHZZV1JsWkRvZ2RISjFaU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2wwWlcxek9pQnlaWE4xYkhSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBb1pYSnliM0lwSUQwK0lIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBjMHh2WVdSbFpEb2dkSEoxWlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdWeWNtOXlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnWTI5dGNHOXVaVzUwUkdsa1RXOTFiblFvS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WjJWMFFYQnBSR0YwWVNncE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGJtUmxjaWdwSUh0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnZTJWeWNtOXlMQ0JwYzB4dllXUmxaQ3dnYVhSbGJYTjlJRDBnZEdocGN5NXpkR0YwWlR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR1Z5Y205eUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnUEdScGRqNUZjbkp2Y2pvZ2UyVnljbTl5TG0xbGMzTmhaMlY5UEM5a2FYWStPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0NGcGMweHZZV1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRHhrYVhZZ1kyeGhjM05PWVcxbFBWd2ljM0JwYm01bGNpQnBjeTFoWTNScGRtVmNJaUJ6ZEhsc1pUMTdlMlpzYjJGME9pQW5ibTl1WlNjc0lHUnBjM0JzWVhrNklDZGliRzlqYXljc0lIZHBaSFJvT2lBbllYVjBieWNzSUdobGFXZG9kRG9nSjJGMWRHOG5MQ0J3WVdSa2FXNW5PaUFuTVRCd2VDQXhNSEI0SURNd2NIZ2dNVEJ3ZUNkOWZUNDhMMlJwZGo0N1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdQRVJoZEdGTWFYTjBYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdaR0YwWVQxN2FYUmxiWE45WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhKc1BYdDBhR2x6TG5CeWIzQnpMblZ5YkgxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0QxN2RHaHBjeTV3Y205d2N5NW1hV1ZzWkUxaGNIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjFjR1JoZEdWR2FXVnNaRTFoY0QxN2RHaHBjeTUxY0dSaGRHVkdhV1ZzWkUxaGNIMHZQanRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYm4xY2JseHVMeTg5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFZ4dVhHNW1kVzVqZEdsdmJpQk1hWE4wU1hSbGJTaHdjbTl3Y3lrZ2UxeHVJQ0FnSUdOdmJuTjBJSHQyWVd4MVpTd2dZMmhwYkdSeVpXNHNJR1pwWld4a1RXRndMQ0J2WW1wbFkzUXNJRzl1UTJ4cFkydFVhWFJzWlN3Z2IyNURiR2xqYTBOdmJuUmxiblFzSUc5dVEyeHBZMnREYjI1MFlXbHVaWEo5SUQwZ2NISnZjSE03WEc0Z0lDQWdjbVYwZFhKdUlDZzhiR2srWEc0Z0lDQWdJQ0FnSUh0bWFXVnNaRTFoY0M1MGFYUnNaU0E5UFQwZ2IySnFaV04wSUQ4Z1BITjBjbTl1Wno1VWFYUnNaVG9nUEM5emRISnZibWMrSURvZ0p5ZDlYRzRnSUNBZ0lDQWdJSHRtYVdWc1pFMWhjQzVqYjI1MFpXNTBJRDA5UFNCdlltcGxZM1FnUHlBOGMzUnliMjVuUGtOdmJuUmxiblE2SUR3dmMzUnliMjVuUGlBNklDY25mVnh1SUNBZ0lDQWdJQ0I3WTJocGJHUnlaVzRnUHlBOGMzUnliMjVuUG50MllXeDFaWDA4TDNOMGNtOXVaejRnT2lBOGMzQmhiajU3ZG1Gc2RXVjlQQzl6Y0dGdVBuMWNiaUFnSUNBZ0lDQWdleUZqYUdsc1pISmxiaUFtSmlBaFptbGxiR1JOWVhBdWRHbDBiR1VnSmlZZ0tHWnBaV3hrVFdGd0xtTnZiblJsYm5RZ0lUMDlJRzlpYW1WamRDa2dKaVlnWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQWhQVDBnYm5Wc2JDQS9YRzRnSUNBZ0lDQWdJQ0FnSUNBOFlTQm9jbVZtUFZ3aUkxd2lJR05zWVhOelRtRnRaVDFjSW1KMWRIUnZiaUJpZFhSMGIyNHRjMjFoYkd4Y0lpQmtZWFJoTFdacFpXeGtQVndpZEdsMGJHVmNJaUJ2YmtOc2FXTnJQWHR2YmtOc2FXTnJWR2wwYkdWOVBsUnBkR3hsUEM5aFBpQTZJQ2NuZlZ4dUlDQWdJQ0FnSUNCN0lXTm9hV3hrY21WdUlDWW1JQ2htYVdWc1pFMWhjQzUwYVhSc1pTQWhQVDBnYjJKcVpXTjBLU0FtSmlBaFptbGxiR1JOWVhBdVkyOXVkR1Z1ZENBbUppQm1hV1ZzWkUxaGNDNXBkR1Z0UTI5dWRHRnBibVZ5SUNFOVBTQnVkV3hzSUQ5Y2JpQWdJQ0FnSUNBZ0lDQWdJRHhoSUdoeVpXWTlYQ0lqWENJZ1kyeGhjM05PWVcxbFBWd2lZblYwZEc5dUlHSjFkSFJ2YmkxemJXRnNiRndpSUdSaGRHRXRabWxsYkdROVhDSmpiMjUwWlc1MFhDSmNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lHOXVRMnhwWTJzOWUyOXVRMnhwWTJ0RGIyNTBaVzUwZlQ1RGIyNTBaVzUwUEM5aFBpQTZJQ2NuZlZ4dUlDQWdJQ0FnSUNCN1kyaHBiR1J5Wlc0Z0ppWWdRWEp5WVhrdWFYTkJjbkpoZVNodlltcGxZM1FwSUNZbUlHWnBaV3hrVFdGd0xtbDBaVzFEYjI1MFlXbHVaWElnUFQwOUlHNTFiR3dnUDF4dUlDQWdJQ0FnSUNBZ0lDQWdQR0VnYUhKbFpqMWNJaU5jSWlCamJHRnpjMDVoYldVOVhDSmlkWFIwYjI0Z1luVjBkRzl1TFhOdFlXeHNYQ0lnWkdGMFlTMW1hV1ZzWkQxY0ltbDBaVzFEYjI1MFlXbHVaWEpjSWx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnYjI1RGJHbGphejE3YjI1RGJHbGphME52Ym5SaGFXNWxjbjArVTJWc1pXTjBQQzloUGlBNklDY25mVnh1SUNBZ0lDQWdJQ0I3WTJocGJHUnlaVzRnUHlBOGMzQmhiaUJqYkdGemMwNWhiV1U5WENKa1lYTm9hV052Ym5NZ1pHRnphR2xqYjI1ekxXRnljbTkzTFdSdmQyNWNJajQ4TDNOd1lXNCtJRG9nSnlkOVhHNGdJQ0FnSUNBZ0lIdGphR2xzWkhKbGJpQS9JRHgxYkNCemRIbHNaVDE3ZTNCaFpHUnBibWRNWldaME9pQXhOU3dnWW05eVpHVnlUR1ZtZERvZ0p6SndlQ0J6YjJ4cFpDQWpZMk5qSjMxOVBudGphR2xzWkhKbGJuMDhMM1ZzUGlBNklDY25mVnh1SUNBZ0lEd3ZiR2srS1R0Y2JuMWNibHh1THk4OVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBWeHVYRzVwYlhCdmNuUWdjbVZqZFhKemFYWmxTWFJsY21GMGIzSWdabkp2YlNBbmNtVmpkWEp6YVhabExXbDBaWEpoZEc5eUp6dGNibWx0Y0c5eWRDQnZZbXBsWTNSUVlYUm9JR1p5YjIwZ0oyOWlhbVZqZEMxd1lYUm9KenRjYmx4dVkyeGhjM01nUkdGMFlVeHBjM1FnWlhoMFpXNWtjeUJEYjIxd2IyNWxiblFnZTF4dUlDQWdJR052Ym5OMGNuVmpkRzl5S0hCeWIzQnpLU0I3WEc0Z0lDQWdJQ0FnSUhOMWNHVnlLSEJ5YjNCektUdGNiaUFnSUNBZ0lDQWdkR2hwY3k1eVpXNWtaWEpPYjJSbGN5QTlJSFJvYVhNdWNtVnVaR1Z5VG05a1pYTXVZbWx1WkNoMGFHbHpLVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJHYVdWc1pFMWhjQ0E5SUhSb2FYTXVjMlYwUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J6WlhSR2FXVnNaRTFoY0Nod1lYUm9MQ0JsZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0JsZG1WdWRDNXdjbVYyWlc1MFJHVm1ZWFZzZENncE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIdGJaWFpsYm5RdWRHRnlaMlYwTG1SaGRHRnpaWFF1Wm1sbGJHUmRPaUJ3WVhSb2ZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5VG05a1pYTW9aR0YwWVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1QySnFaV04wTG10bGVYTW9aR0YwWVNrdWJXRndLR2wwWlcwZ1BUNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR2wwWlcwZ1BUMDlJQ2R2WW1wbFkzUlFZWFJvSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdiR1YwSUdOb2FXeGtJRDBnUEV4cGMzUkpkR1Z0SUd0bGVUMTdhWFJsYlM1MGIxTjBjbWx1WnlncGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhiSFZsUFh0cGRHVnRmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamREMTdaR0YwWVZ0cGRHVnRYWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRDE3ZEdocGN5NXdjbTl3Y3k1bWFXVnNaRTFoY0gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHRnBibVZ5UFh0bElEMCtJSFJvYVhNdWMyVjBSbWxsYkdSTllYQW9aR0YwWVZ0cGRHVnRYUzV2WW1wbFkzUlFZWFJvTENCbEtYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZia05zYVdOclZHbDBiR1U5ZTJVZ1BUNGdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDaGtZWFJoVzJsMFpXMWRMQ0JsS1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHVnVkRDE3WlNBOVBpQjBhR2x6TG5ObGRFWnBaV3hrVFdGd0tHUmhkR0ZiYVhSbGJWMHNJR1VwZlM4K08xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHUmhkR0ZiYVhSbGJWMGdQVDA5SUNkdlltcGxZM1FuSUNZbUlHUmhkR0ZiYVhSbGJWMGdJVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqYUdsc1pDQTlJRkpsWVdOMExtTnNiMjVsUld4bGJXVnVkQ2hqYUdsc1pDd2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamFHbHNaSEpsYmpvZ1FYSnlZWGt1YVhOQmNuSmhlU2hrWVhSaFcybDBaVzFkS1NBL0lIUm9hWE11Y21WdVpHVnlUbTlrWlhNb1pHRjBZVnRwZEdWdFhWc3dYU2tnT2lCMGFHbHpMbkpsYm1SbGNrNXZaR1Z6S0dSaGRHRmJhWFJsYlYwcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJqYUdsc1pEdGNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ1WkdWeUtDa2dlMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQm1hV1ZzWkUxaGNDQTlJSFJvYVhNdWNISnZjSE11Wm1sbGJHUk5ZWEE3WEc1Y2JpQWdJQ0FnSUNBZ2JHVjBJR1JoZEdFZ1BTQjBhR2x6TG5CeWIzQnpMbVJoZEdFN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hCY25KaGVTNXBjMEZ5Y21GNUtHUmhkR0VwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlEMGdKeWM3WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnBaaUFvWm1sbGJHUk5ZWEF1YVhSbGJVTnZiblJoYVc1bGNpQTlQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLRUZ5Y21GNUxtbHpRWEp5WVhrb1pHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCa1lYUmhJRDBnWkdGMFlWc3dYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2hzWlhRZ2UzQmhjbVZ1ZEN3Z2JtOWtaU3dnYTJWNUxDQndZWFJvZlNCdlppQnVaWGNnY21WamRYSnphWFpsU1hSbGNtRjBiM0lvWkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc1dlpHVWdQVDA5SUNkdlltcGxZM1FuSUNZbUlHNXZaR1VnSVQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiR1YwSUhCaGRHaFRkSEpwYm1jZ1BTQndZWFJvTG1wdmFXNG9KeTRuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxWldOMFVHRjBhQzV6WlhRb1pHRjBZU3dnY0dGMGFGTjBjbWx1WnlBcklDY3ViMkpxWldOMFVHRjBhQ2NzSUhCaGRHaFRkSEpwYm1jcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YURNK1UyVnNaV04wSUdsMFpXMXpJR052Ym5SaGFXNWxjand2YURNK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHgxYkQ1N2RHaHBjeTV5Wlc1a1pYSk9iMlJsY3loa1lYUmhLWDA4TDNWc1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHeGxkQ0J2WW1wbFkzUkVZWFJoSUQwZ2IySnFaV04wVUdGMGFDNW5aWFFvZEdocGN5NXdjbTl3Y3k1a1lYUmhMQ0JtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUtUdGNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLRUZ5Y21GNUxtbHpRWEp5WVhrb2IySnFaV04wUkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2WW1wbFkzUkVZWFJoSUQwZ2IySnFaV04wUkdGMFlWc3dYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ1ptOXlJQ2hzWlhRZ2UzQmhjbVZ1ZEN3Z2JtOWtaU3dnYTJWNUxDQndZWFJvZlNCdlppQnVaWGNnY21WamRYSnphWFpsU1hSbGNtRjBiM0lvYjJKcVpXTjBSR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JRzV2WkdVZ0lUMDlJQ2R2WW1wbFkzUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHeGxkQ0J3WVhSb1UzUnlhVzVuSUQwZ2NHRjBhQzVxYjJsdUtDY3VKeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFtVmpkRVJoZEdFc0lIQmhkR2hUZEhKcGJtY3NJSEJoZEdoVGRISnBibWNwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlDaGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThaR2wyUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThhRE0rVTJWc1pXTjBJSFJwZEd4bElHRnVaQ0JqYjI1MFpXNTBJR1pwWld4a2N6d3ZhRE0rWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeDFiRDU3ZEdocGN5NXlaVzVrWlhKT2IyUmxjeWh2WW1wbFkzUkVZWFJoS1gwOEwzVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMWNibHh1THk4OVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBUMDlQVDA5UFQwOVBWeHVJaXdpYVcxd2IzSjBJRk5sZEhScGJtZHpJR1p5YjIwZ0p5NHZRMjl0Y0c5dVpXNTBjeTlUWlhSMGFXNW5jeWM3WEc1Y2JtTnZibk4wSUcxdlpFcHpiMjVTWlc1a1pYSkZiR1Z0Wlc1MElEMGdKMjF2WkhWc1lYSnBkSGt0YW5OdmJpMXlaVzVrWlhJbk8xeHVZMjl1YzNRZ1pHOXRSV3hsYldWdWRDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tHMXZaRXB6YjI1U1pXNWtaWEpGYkdWdFpXNTBLVHRjYmx4dVVtVmhZM1JFVDAwdWNtVnVaR1Z5S0Z4dUlDQWdJRHhUWlhSMGFXNW5jeUF2UGl4Y2JpQWdJQ0JrYjIxRmJHVnRaVzUwWEc0cE95SmRmUT09XG4iXSwiZmlsZSI6IkFkbWluL0luZGV4QWRtaW4uanMifQ==
