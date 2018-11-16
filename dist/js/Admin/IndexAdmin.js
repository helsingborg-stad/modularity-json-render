(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.5+7f2b526d
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var TRY_CATCH_ERROR = { error: null };

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = void 0,
      failed = void 0;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = getThen(entry);

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        handleMaybeThenable(promise, entry, _then);
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    if (isFunction(callback)) {
      return promise.then(function (value) {
        return constructor.resolve(callback()).then(function () {
          return value;
        });
      }, function (reason) {
        return constructor.resolve(callback()).then(function () {
          throw reason;
        });
      });
    }

    return promise.then(callback, callback);
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));





}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":4}],2:[function(require,module,exports){
// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
require('whatwg-fetch');
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":7}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
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

},{"./lang":6}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = 'status' in options ? options.status : 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],8:[function(require,module,exports){
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

},{"./ListItem":11,"object-path":3,"recursive-iterator":5}],9:[function(require,module,exports){
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

},{"../../Utilities/getApiData":15,"./DataList":8}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{"./FieldSelection":9,"./InputFields":10,"./Summary":13}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
"use strict";

require("es6-promise");

require("isomorphic-fetch");

var _Settings = _interopRequireDefault(require("./Components/Settings"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Polyfills
// Components
var modJsonRenderElement = 'modularity-json-render';
var domElement = document.getElementById(modJsonRenderElement);
var _modJsonRender = modJsonRender,
    translation = _modJsonRender.translation;
ReactDOM.render(React.createElement(_Settings.default, {
  translation: translation
}), domElement);

},{"./Components/Settings":12,"es6-promise":1,"isomorphic-fetch":2}],15:[function(require,module,exports){
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

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9pc29tb3JwaGljLWZldGNoL2ZldGNoLW5wbS1icm93c2VyaWZ5LmpzIiwibm9kZV9tb2R1bGVzL29iamVjdC1wYXRoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3Ivc3JjL1JlY3Vyc2l2ZUl0ZXJhdG9yLmpzIiwibm9kZV9tb2R1bGVzL3JlY3Vyc2l2ZS1pdGVyYXRvci9zcmMvbGFuZy5qcyIsIm5vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9EYXRhTGlzdC5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0ZpZWxkU2VsZWN0aW9uLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvSW5wdXRGaWVsZHMuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9MaXN0SXRlbS5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1NldHRpbmdzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvU3VtbWFyeS5qcyIsInNvdXJjZS9qcy9BZG1pbi9JbmRleEFkbWluLmpzIiwic291cmNlL2pzL1V0aWxpdGllcy9nZXRBcGlEYXRhLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztBQzdjQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFFTSxROzs7Ozs7Ozs7Ozs7O2dDQUNVLEksRUFBTSxLLEVBQU87QUFDckIsTUFBQSxLQUFLLENBQUMsY0FBTjtBQUNBLFdBQUssS0FBTCxDQUFXLGNBQVgscUJBQTRCLEtBQUssQ0FBQyxNQUFOLENBQWEsT0FBYixDQUFxQixLQUFqRCxFQUF5RCxJQUF6RDtBQUNIOzs7Z0NBRVcsSSxFQUFNO0FBQUE7O0FBQ2QsYUFBTyxNQUFNLENBQUMsSUFBUCxDQUFZLElBQVosRUFBa0IsR0FBbEIsQ0FBc0IsVUFBQSxJQUFJLEVBQUk7QUFDakMsWUFBSSxJQUFJLEtBQUssWUFBYixFQUEyQjtBQUN2QjtBQUNIOztBQUVELFlBQUksS0FBSyxHQUFHLG9CQUFDLGlCQUFEO0FBQVUsVUFBQSxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQUwsRUFBZjtBQUNVLFVBQUEsS0FBSyxFQUFFLElBRGpCO0FBRVUsVUFBQSxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUQsQ0FGdEI7QUFHVSxVQUFBLFFBQVEsRUFBRSxLQUFJLENBQUMsS0FBTCxDQUFXLFFBSC9CO0FBSVUsVUFBQSxnQkFBZ0IsRUFBRSwwQkFBQSxDQUFDO0FBQUEsbUJBQUksS0FBSSxDQUFDLFdBQUwsQ0FBaUIsSUFBSSxDQUFDLElBQUQsQ0FBSixDQUFXLFVBQTVCLEVBQXdDLENBQXhDLENBQUo7QUFBQSxXQUo3QjtBQUtVLFVBQUEsWUFBWSxFQUFFLHNCQUFBLENBQUM7QUFBQSxtQkFBSSxLQUFJLENBQUMsV0FBTCxDQUFpQixJQUFJLENBQUMsSUFBRCxDQUFyQixFQUE2QixDQUE3QixDQUFKO0FBQUEsV0FMekI7QUFNVSxVQUFBLGNBQWMsRUFBRSx3QkFBQSxDQUFDO0FBQUEsbUJBQUksS0FBSSxDQUFDLFdBQUwsQ0FBaUIsSUFBSSxDQUFDLElBQUQsQ0FBckIsRUFBNkIsQ0FBN0IsQ0FBSjtBQUFBLFdBTjNCO0FBT1UsVUFBQSxXQUFXLEVBQUUsS0FBSSxDQUFDLEtBQUwsQ0FBVztBQVBsQyxVQUFaOztBQVNBLFlBQUksUUFBTyxJQUFJLENBQUMsSUFBRCxDQUFYLE1BQXNCLFFBQXRCLElBQWtDLElBQUksQ0FBQyxJQUFELENBQUosS0FBZSxJQUFyRCxFQUEyRDtBQUN2RCxVQUFBLEtBQUssR0FBRyxLQUFLLENBQUMsWUFBTixDQUFtQixLQUFuQixFQUEwQjtBQUM5QixZQUFBLFFBQVEsRUFBRSxLQUFLLENBQUMsT0FBTixDQUFjLElBQUksQ0FBQyxJQUFELENBQWxCLElBQTRCLEtBQUksQ0FBQyxXQUFMLENBQWlCLElBQUksQ0FBQyxJQUFELENBQUosQ0FBVyxDQUFYLENBQWpCLENBQTVCLEdBQThELEtBQUksQ0FBQyxXQUFMLENBQWlCLElBQUksQ0FBQyxJQUFELENBQXJCO0FBRDFDLFdBQTFCLENBQVI7QUFHSDs7QUFFRCxlQUFPLEtBQVA7QUFDSCxPQXJCTSxDQUFQO0FBc0JIOzs7NkJBRVE7QUFBQSx3QkFDdUIsS0FBSyxLQUQ1QjtBQUFBLFVBQ0UsV0FERixlQUNFLFdBREY7QUFBQSxVQUNlLElBRGYsZUFDZSxJQURmO0FBRUwsVUFBTSxRQUFRLEdBQUcsS0FBSyxLQUFMLENBQVcsUUFBNUI7O0FBRUEsVUFBSSxLQUFLLENBQUMsT0FBTixDQUFjLElBQWQsQ0FBSixFQUF5QjtBQUNyQixRQUFBLFFBQVEsQ0FBQyxhQUFULEdBQXlCLEVBQXpCO0FBQ0g7O0FBRUQsVUFBSSxRQUFRLENBQUMsYUFBVCxLQUEyQixJQUEvQixFQUFxQztBQUNqQyxZQUFJLEtBQUssQ0FBQyxPQUFOLENBQWMsSUFBZCxDQUFKLEVBQXlCO0FBQ3JCLFVBQUEsSUFBSSw0QkFBRyxJQUFJLENBQUMsQ0FBRCxDQUFQLENBQUo7QUFDSDs7QUFIZ0M7QUFBQTtBQUFBOztBQUFBO0FBS2pDLCtCQUFzQyxJQUFJLDBCQUFKLENBQXNCLElBQXRCLENBQXRDLDhIQUFtRTtBQUFBO0FBQUEsZ0JBQXpELE1BQXlELGVBQXpELE1BQXlEO0FBQUEsZ0JBQWpELElBQWlELGVBQWpELElBQWlEO0FBQUEsZ0JBQTNDLEdBQTJDLGVBQTNDLEdBQTJDO0FBQUEsZ0JBQXRDLElBQXNDLGVBQXRDLElBQXNDOztBQUMvRCxnQkFBSSxRQUFPLElBQVAsTUFBZ0IsUUFBaEIsSUFBNEIsSUFBSSxLQUFLLElBQXpDLEVBQStDO0FBQzNDLGtCQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBTCxDQUFVLEdBQVYsQ0FBakI7O0FBQ0Esa0NBQVcsR0FBWCxDQUFlLElBQWYsRUFBcUIsVUFBVSxHQUFHLGFBQWxDLEVBQWlELFVBQWpEO0FBQ0g7QUFDSjtBQVZnQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQVlqQyxlQUNJLGlDQUNJLGdDQUFLLFdBQVcsQ0FBQyxvQkFBakIsQ0FESixFQUVJO0FBQUksVUFBQSxTQUFTLEVBQUM7QUFBZCxXQUNLLEtBQUssV0FBTCxDQUFpQixJQUFqQixDQURMLENBRkosQ0FESjtBQVFILE9BcEJELE1Bb0JPO0FBQ0gsWUFBSSxVQUFVLEdBQUcsb0JBQVcsR0FBWCxDQUFlLElBQWYsRUFBcUIsUUFBUSxDQUFDLGFBQTlCLENBQWpCOztBQUVBLFlBQUksS0FBSyxDQUFDLE9BQU4sQ0FBYyxVQUFkLENBQUosRUFBK0I7QUFDM0IsVUFBQSxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUQsQ0FBdkI7QUFDSDs7QUFMRTtBQUFBO0FBQUE7O0FBQUE7QUFPSCxnQ0FBc0MsSUFBSSwwQkFBSixDQUFzQixVQUF0QixDQUF0QyxtSUFBeUU7QUFBQTtBQUFBLGdCQUEvRCxNQUErRCxnQkFBL0QsTUFBK0Q7QUFBQSxnQkFBdkQsSUFBdUQsZ0JBQXZELElBQXVEO0FBQUEsZ0JBQWpELEdBQWlELGdCQUFqRCxHQUFpRDtBQUFBLGdCQUE1QyxJQUE0QyxnQkFBNUMsSUFBNEM7O0FBQ3JFLGdCQUFJLFFBQU8sSUFBUCxNQUFnQixRQUFwQixFQUE4QjtBQUMxQixrQkFBSSxXQUFVLEdBQUcsSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFWLENBQWpCOztBQUNBLGtDQUFXLEdBQVgsQ0FBZSxVQUFmLEVBQTJCLFdBQTNCLEVBQXVDLFdBQXZDO0FBQ0g7QUFDSjtBQVpFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBY0gsZUFDSSxpQ0FDSSxnQ0FBSyxXQUFXLENBQUMsa0JBQWpCLENBREosRUFFSTtBQUFJLFVBQUEsU0FBUyxFQUFDO0FBQWQsV0FDSyxLQUFLLFdBQUwsQ0FBaUIsVUFBakIsQ0FETCxDQUZKLENBREo7QUFRSDtBQUNKOzs7O0VBbEZrQixLQUFLLENBQUMsUzs7ZUFxRmQsUTs7Ozs7Ozs7Ozs7QUN6RmY7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFFTSxjOzs7Ozs7Ozs7Ozs7O3dDQUNrQjtBQUNoQixXQUFLLE9BQUw7QUFDSDs7OzhCQUVTO0FBQUE7O0FBQUEsd0JBQ3FCLEtBQUssS0FEMUI7QUFBQSxVQUNDLEdBREQsZUFDQyxHQUREO0FBQUEsVUFDTSxXQUROLGVBQ00sV0FETjtBQUVOLCtCQUFXLEdBQVgsRUFDSyxJQURMLENBRVEsZ0JBQWM7QUFBQSxZQUFaLE1BQVksUUFBWixNQUFZOztBQUNWLFlBQUksQ0FBQyxNQUFELElBQVcsTUFBTSxDQUFDLElBQVAsQ0FBWSxNQUFaLEVBQW9CLE1BQXBCLEtBQStCLENBQTlDLEVBQWlEO0FBQzdDLFVBQUEsS0FBSSxDQUFDLEtBQUwsQ0FBVyxRQUFYLENBQW9CLEtBQUssQ0FBQyxXQUFXLENBQUMsYUFBYixDQUF6Qjs7QUFDQSxVQUFBLEtBQUksQ0FBQyxLQUFMLENBQVcsU0FBWCxDQUFxQixJQUFyQjs7QUFDQTtBQUNIOztBQUNELFFBQUEsS0FBSSxDQUFDLEtBQUwsQ0FBVyxRQUFYLENBQW9CLE1BQXBCOztBQUNBLFFBQUEsS0FBSSxDQUFDLEtBQUwsQ0FBVyxTQUFYLENBQXFCLElBQXJCO0FBQ0gsT0FWVCxFQVVXLGlCQUFhO0FBQUEsWUFBWCxLQUFXLFNBQVgsS0FBVzs7QUFDWixRQUFBLEtBQUksQ0FBQyxLQUFMLENBQVcsU0FBWCxDQUFxQixJQUFyQjs7QUFDQSxRQUFBLEtBQUksQ0FBQyxLQUFMLENBQVcsUUFBWCxDQUFvQixLQUFwQjtBQUNILE9BYlQ7QUFlSDs7O21DQUVjLEssRUFBTztBQUNsQixXQUFLLEtBQUwsQ0FBVyxjQUFYLENBQTBCLEtBQTFCO0FBQ0g7Ozs2QkFFUTtBQUFBLHlCQUN3RCxLQUFLLEtBRDdEO0FBQUEsVUFDRSxHQURGLGdCQUNFLEdBREY7QUFBQSxVQUNPLEtBRFAsZ0JBQ08sS0FEUDtBQUFBLFVBQ2MsUUFEZCxnQkFDYyxRQURkO0FBQUEsVUFDd0IsV0FEeEIsZ0JBQ3dCLFdBRHhCO0FBQUEsVUFDcUMsUUFEckMsZ0JBQ3FDLFFBRHJDO0FBQUEsVUFDK0MsS0FEL0MsZ0JBQytDLEtBRC9DOztBQUdMLFVBQUksS0FBSixFQUFXO0FBQ1AsZUFBTztBQUFLLFVBQUEsU0FBUyxFQUFDO0FBQWYsV0FBNEMsK0JBQUksS0FBSyxDQUFDLE9BQVYsQ0FBNUMsQ0FBUDtBQUNILE9BRkQsTUFFTyxJQUFJLENBQUMsUUFBTCxFQUFlO0FBQ2xCLGVBQU87QUFBSyxVQUFBLFNBQVMsRUFBQztBQUFmLFVBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUNJLG9CQUFDLGlCQUFEO0FBQ0ksVUFBQSxJQUFJLEVBQUUsS0FEVjtBQUVJLFVBQUEsR0FBRyxFQUFFLEdBRlQ7QUFHSSxVQUFBLFFBQVEsRUFBRSxRQUhkO0FBSUksVUFBQSxjQUFjLEVBQUUsS0FBSyxjQUFMLENBQW9CLElBQXBCLENBQXlCLElBQXpCLENBSnBCO0FBS0ksVUFBQSxXQUFXLEVBQUU7QUFMakIsVUFESjtBQVNIO0FBQ0o7Ozs7RUE5Q3dCLEtBQUssQ0FBQyxTOztlQWlEcEIsYzs7Ozs7Ozs7Ozs7QUNwRGYsSUFBTSxXQUFXLEdBQUcsU0FBZCxXQUFjO0FBQUEsTUFBRSxRQUFGLFFBQUUsUUFBRjtBQUFBLE1BQVksR0FBWixRQUFZLEdBQVo7QUFBQSxTQUNoQixpQ0FDSTtBQUFPLElBQUEsSUFBSSxFQUFDLFFBQVo7QUFBcUIsSUFBQSxJQUFJLEVBQUMscUJBQTFCO0FBQWdELElBQUEsS0FBSyxFQUFFO0FBQXZELElBREosRUFFSTtBQUFPLElBQUEsSUFBSSxFQUFDLFFBQVo7QUFBcUIsSUFBQSxJQUFJLEVBQUMsMEJBQTFCO0FBQXFELElBQUEsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFMLENBQWUsUUFBZjtBQUE1RCxJQUZKLENBRGdCO0FBQUEsQ0FBcEI7O2VBTWUsVzs7Ozs7Ozs7Ozs7QUNOZixJQUFNLFFBQVEsR0FBRyxTQUFYLFFBQVcsT0FBc0c7QUFBQSxNQUFwRyxLQUFvRyxRQUFwRyxLQUFvRztBQUFBLE1BQTdGLFFBQTZGLFFBQTdGLFFBQTZGO0FBQUEsTUFBbkYsUUFBbUYsUUFBbkYsUUFBbUY7QUFBQSxNQUF6RSxNQUF5RSxRQUF6RSxNQUF5RTtBQUFBLE1BQWpFLFlBQWlFLFFBQWpFLFlBQWlFO0FBQUEsTUFBbkQsY0FBbUQsUUFBbkQsY0FBbUQ7QUFBQSxNQUFuQyxnQkFBbUMsUUFBbkMsZ0JBQW1DO0FBQUEsTUFBakIsV0FBaUIsUUFBakIsV0FBaUI7O0FBQ25ILE1BQUksUUFBSixFQUFjO0FBQ1YsV0FBUSxnQ0FDSCxLQUFLLENBQUMsT0FBTixDQUFjLE1BQWQsS0FBeUIsUUFBUSxDQUFDLGFBQVQsS0FBMkIsSUFBcEQsR0FDRyxrQ0FBTTtBQUFNLE1BQUEsU0FBUyxFQUFDO0FBQWhCLE1BQU4sT0FBK0QsS0FBL0QsT0FBc0U7QUFBRyxNQUFBLElBQUksRUFBQyxHQUFSO0FBQVksTUFBQSxTQUFTLEVBQUMsYUFBdEI7QUFBb0Msb0JBQVcsZUFBL0M7QUFBK0QsTUFBQSxPQUFPLEVBQUU7QUFBeEUsT0FBMkYsV0FBVyxDQUFDLE1BQXZHLENBQXRFLENBREgsR0FDc00sa0NBQU8sS0FBUCxDQUZuTSxFQUdKLGdDQUFLLFFBQUwsQ0FISSxDQUFSO0FBS0gsR0FORCxNQU1PO0FBQ0gsV0FBUSxnQ0FDSCxRQUFRLENBQUMsS0FBVCxLQUFtQixNQUFuQixJQUE2QixRQUFRLENBQUMsS0FBdEMsR0FBOEMsb0NBQVMsV0FBVyxDQUFDLEtBQXJCLE9BQTlDLEdBQXVGLEVBRHBGLEVBRUgsUUFBUSxDQUFDLE9BQVQsS0FBcUIsTUFBckIsSUFBK0IsUUFBUSxDQUFDLE9BQXhDLEdBQWtELG9DQUFTLFdBQVcsQ0FBQyxPQUFyQixPQUFsRCxHQUE2RixFQUYxRixFQUdKLGtDQUFPLEtBQVAsQ0FISSxFQUlILENBQUMsUUFBUSxDQUFDLEtBQVYsSUFBb0IsUUFBUSxDQUFDLE9BQVQsS0FBcUIsTUFBekMsSUFBb0QsUUFBUSxDQUFDLGFBQVQsS0FBMkIsSUFBL0UsR0FDRztBQUFHLE1BQUEsSUFBSSxFQUFDLEdBQVI7QUFBWSxNQUFBLFNBQVMsRUFBQyxhQUF0QjtBQUFvQyxvQkFBVyxPQUEvQztBQUF1RCxNQUFBLE9BQU8sRUFBRTtBQUFoRSxPQUErRSxXQUFXLENBQUMsS0FBM0YsQ0FESCxHQUMyRyxFQUx4RyxFQU1ILENBQUMsUUFBUSxDQUFDLE9BQVYsSUFBc0IsUUFBUSxDQUFDLEtBQVQsS0FBbUIsTUFBekMsSUFBb0QsUUFBUSxDQUFDLGFBQVQsS0FBMkIsSUFBL0UsR0FDRztBQUFHLE1BQUEsSUFBSSxFQUFDLEdBQVI7QUFBWSxNQUFBLFNBQVMsRUFBQyxhQUF0QjtBQUFvQyxvQkFBVyxTQUEvQztBQUF5RCxNQUFBLE9BQU8sRUFBRTtBQUFsRSxPQUFtRixXQUFXLENBQUMsT0FBL0YsQ0FESCxHQUNpSCxFQVA5RyxDQUFSO0FBU0g7QUFDSixDQWxCRDs7ZUFvQmUsUTs7Ozs7Ozs7Ozs7QUNwQmY7O0FBQ0E7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVNLFE7Ozs7O0FBQ0Ysb0JBQVksS0FBWixFQUFtQjtBQUFBOztBQUFBOztBQUNmLGtGQUFNLEtBQU47QUFDQSxVQUFLLEtBQUwsR0FBYTtBQUNULE1BQUEsa0JBQWtCLEVBQUUsS0FEWDtBQUVULE1BQUEsR0FBRyxFQUFFLEVBRkk7QUFHVCxNQUFBLFFBQVEsRUFBRSxLQUhEO0FBSVQsTUFBQSxLQUFLLEVBQUUsSUFKRTtBQUtULE1BQUEsS0FBSyxFQUFFLEVBTEU7QUFNVCxNQUFBLFFBQVEsRUFBRTtBQUNOLFFBQUEsYUFBYSxFQUFFLElBRFQ7QUFFTixRQUFBLEtBQUssRUFBRSxFQUZEO0FBR04sUUFBQSxPQUFPLEVBQUU7QUFISDtBQU5ELEtBQWI7QUFGZTtBQWNsQjs7Ozt3Q0FFbUI7QUFDaEIsV0FBSyxXQUFMO0FBQ0g7OztrQ0FFYTtBQUNWLFVBQUksT0FBTyxhQUFhLENBQUMsT0FBckIsS0FBaUMsV0FBckMsRUFBa0Q7QUFDOUMsWUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQTlCO0FBQ0EsYUFBSyxRQUFMLENBQWM7QUFDVixVQUFBLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBUixHQUFjLE9BQU8sQ0FBQyxHQUF0QixHQUE0QixFQUR2QjtBQUVWLFVBQUEsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFSLEdBQW1CLElBQUksQ0FBQyxLQUFMLENBQVcsT0FBTyxDQUFDLFFBQW5CLENBQW5CLEdBQWtEO0FBQ3hELFlBQUEsYUFBYSxFQUFFLElBRHlDO0FBRXhELFlBQUEsS0FBSyxFQUFFLEVBRmlEO0FBR3hELFlBQUEsT0FBTyxFQUFFO0FBSCtDLFdBRmxEO0FBT1YsVUFBQSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBUHBCLFNBQWQ7QUFTSDtBQUNKOzs7OEJBRVMsSyxFQUFPO0FBQ2IsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTixDQUFhO0FBQW5CLE9BQWQ7QUFDSDs7O2lDQUVZLEssRUFBTztBQUNoQixNQUFBLEtBQUssQ0FBQyxjQUFOO0FBQ0EsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLGtCQUFrQixFQUFFO0FBQXJCLE9BQWQ7QUFDSDs7O2lDQUVZLEssRUFBTztBQUNoQixNQUFBLEtBQUssQ0FBQyxjQUFOO0FBQ0EsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLGtCQUFrQixFQUFFLEtBQXJCO0FBQTRCLFFBQUEsR0FBRyxFQUFFLEVBQWpDO0FBQXFDLFFBQUEsUUFBUSxFQUFFO0FBQUMsVUFBQSxhQUFhLEVBQUUsSUFBaEI7QUFBc0IsVUFBQSxLQUFLLEVBQUUsRUFBN0I7QUFBaUMsVUFBQSxPQUFPLEVBQUU7QUFBMUM7QUFBL0MsT0FBZDtBQUNIOzs7bUNBRWMsSyxFQUFPO0FBQ2xCLFVBQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFQLENBQWMsS0FBSyxLQUFMLENBQVcsUUFBekIsRUFBbUMsS0FBbkMsQ0FBZjtBQUNBLFdBQUssUUFBTCxDQUFjO0FBQUMsUUFBQSxRQUFRLEVBQUU7QUFBWCxPQUFkO0FBQ0g7Ozs2QkFFUSxLLEVBQU87QUFDWixXQUFLLFFBQUwsQ0FBYztBQUFDLFFBQUEsS0FBSyxFQUFMO0FBQUQsT0FBZDtBQUNIOzs7OEJBRVMsSyxFQUFPO0FBQ2IsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLFFBQVEsRUFBRTtBQUFYLE9BQWQ7QUFDSDs7OzZCQUVRLEssRUFBTztBQUNaLFdBQUssUUFBTCxDQUFjO0FBQUMsUUFBQSxLQUFLLEVBQUU7QUFBUixPQUFkO0FBQ0g7Ozs2QkFFUTtBQUFBLFVBQ0UsV0FERixHQUNpQixLQUFLLEtBRHRCLENBQ0UsV0FERjtBQUFBLHdCQUVxRCxLQUFLLEtBRjFEO0FBQUEsVUFFRSxrQkFGRixlQUVFLGtCQUZGO0FBQUEsVUFFc0IsR0FGdEIsZUFFc0IsR0FGdEI7QUFBQSxVQUUyQixLQUYzQixlQUUyQixLQUYzQjtBQUFBLFVBRWtDLFFBRmxDLGVBRWtDLFFBRmxDO0FBQUEsVUFFNEMsS0FGNUMsZUFFNEMsS0FGNUM7QUFBQSxpQ0FHbUMsS0FBSyxLQUFMLENBQVcsUUFIOUM7QUFBQSxVQUdFLGFBSEYsd0JBR0UsYUFIRjtBQUFBLFVBR2lCLEtBSGpCLHdCQUdpQixLQUhqQjtBQUFBLFVBR3dCLE9BSHhCLHdCQUd3QixPQUh4Qjs7QUFLTCxVQUFJLEdBQUcsSUFBSSxhQUFhLEtBQUssSUFBekIsSUFBaUMsS0FBakMsSUFBMEMsT0FBOUMsRUFBdUQ7QUFDbkQsZUFDSSxpQ0FDSSxvQkFBQyxnQkFBRCxlQUFhLEtBQUssS0FBbEI7QUFDUyxVQUFBLFdBQVcsRUFBRTtBQUR0QixXQURKLEVBSUksb0JBQUMsb0JBQUQsRUFBaUIsS0FBSyxLQUF0QixDQUpKLEVBS0ksK0JBQUc7QUFBRyxVQUFBLElBQUksRUFBQyxHQUFSO0FBQVksVUFBQSxPQUFPLEVBQUUsS0FBSyxZQUFMLENBQWtCLElBQWxCLENBQXVCLElBQXZCLENBQXJCO0FBQ0csVUFBQSxTQUFTLEVBQUM7QUFEYixXQUN1QixXQUFXLENBQUMsYUFEbkMsQ0FBSCxDQUxKLENBREo7QUFVSCxPQVhELE1BV08sSUFBSSxrQkFBSixFQUF3QjtBQUMzQixlQUNJLGlDQUNJLG9CQUFDLHVCQUFEO0FBQ0ksVUFBQSxHQUFHLEVBQUUsR0FEVDtBQUVJLFVBQUEsS0FBSyxFQUFFLEtBRlg7QUFHSSxVQUFBLFFBQVEsRUFBRSxLQUFLLFFBQUwsQ0FBYyxJQUFkLENBQW1CLElBQW5CLENBSGQ7QUFJSSxVQUFBLFFBQVEsRUFBRSxRQUpkO0FBS0ksVUFBQSxTQUFTLEVBQUUsS0FBSyxTQUFMLENBQWUsSUFBZixDQUFvQixJQUFwQixDQUxmO0FBTUksVUFBQSxLQUFLLEVBQUUsS0FOWDtBQU9JLFVBQUEsUUFBUSxFQUFFLEtBQUssUUFBTCxDQUFjLElBQWQsQ0FBbUIsSUFBbkIsQ0FQZDtBQVFJLFVBQUEsUUFBUSxFQUFFLEtBQUssS0FBTCxDQUFXLFFBUnpCO0FBU0ksVUFBQSxjQUFjLEVBQUUsS0FBSyxjQUFMLENBQW9CLElBQXBCLENBQXlCLElBQXpCLENBVHBCO0FBVUksVUFBQSxXQUFXLEVBQUU7QUFWakIsVUFESixFQWFJLG9CQUFDLG9CQUFELEVBQWlCLEtBQUssS0FBdEIsQ0FiSixFQWNJLCtCQUFHO0FBQUcsVUFBQSxJQUFJLEVBQUMsR0FBUjtBQUFZLFVBQUEsT0FBTyxFQUFFLEtBQUssWUFBTCxDQUFrQixJQUFsQixDQUF1QixJQUF2QixDQUFyQjtBQUNHLFVBQUEsU0FBUyxFQUFDO0FBRGIsV0FDdUIsV0FBVyxDQUFDLGFBRG5DLENBQUgsQ0FkSixDQURKO0FBbUJILE9BcEJNLE1Bb0JBO0FBQ0gsZUFDSTtBQUFLLFVBQUEsU0FBUyxFQUFDO0FBQWYsV0FDSTtBQUFNLFVBQUEsUUFBUSxFQUFFLEtBQUssWUFBTCxDQUFrQixJQUFsQixDQUF1QixJQUF2QjtBQUFoQixXQUNJLCtCQUNJLG1DQUNJLDhDQURKLENBREosRUFJSSwrQkFKSixFQUtJLCtCQUFJLFdBQVcsQ0FBQyxZQUFoQixDQUxKLENBREosRUFRSTtBQUFPLFVBQUEsSUFBSSxFQUFDLE1BQVo7QUFBbUIsVUFBQSxTQUFTLEVBQUMsV0FBN0I7QUFBeUMsVUFBQSxLQUFLLEVBQUUsR0FBaEQ7QUFBcUQsVUFBQSxRQUFRLEVBQUUsS0FBSyxTQUFMLENBQWUsSUFBZixDQUFvQixJQUFwQjtBQUEvRCxVQVJKLEVBU0ksK0JBQUc7QUFBTyxVQUFBLElBQUksRUFBQyxRQUFaO0FBQXFCLFVBQUEsU0FBUyxFQUFDLHVCQUEvQjtBQUF1RCxVQUFBLEtBQUssRUFBRSxXQUFXLENBQUM7QUFBMUUsVUFBSCxDQVRKLENBREosRUFZSSxvQkFBQyxvQkFBRCxFQUFpQixLQUFLLEtBQXRCLENBWkosQ0FESjtBQWdCSDtBQUNKOzs7O0VBekhrQixLQUFLLENBQUMsUzs7ZUE0SGQsUTs7Ozs7Ozs7Ozs7QUNoSWYsSUFBTSxPQUFPLEdBQUcsU0FBVixPQUFVO0FBQUEsTUFBRSxHQUFGLFFBQUUsR0FBRjtBQUFBLE1BQU8sUUFBUCxRQUFPLFFBQVA7QUFBQSxNQUFpQixXQUFqQixRQUFpQixXQUFqQjtBQUFBLFNBQ1osaUNBQ0ksK0JBQ0ksOENBREosRUFDNEIsK0JBRDVCLEVBRUk7QUFBRyxJQUFBLElBQUksRUFBRSxHQUFUO0FBQWMsSUFBQSxNQUFNLEVBQUM7QUFBckIsS0FBK0IsR0FBL0IsQ0FGSixDQURKLEVBS0ksK0JBQ0ksb0NBQVMsV0FBVyxDQUFDLEtBQXJCLENBREosRUFDd0MsK0JBRHhDLEVBRUssUUFBUSxDQUFDLEtBQVQsQ0FBZSxPQUFmLENBQXVCLEdBQXZCLEVBQTRCLE1BQTVCLENBRkwsQ0FMSixFQVNJLCtCQUNJLG9DQUFTLFdBQVcsQ0FBQyxPQUFyQixDQURKLEVBQzBDLCtCQUQxQyxFQUVLLFFBQVEsQ0FBQyxPQUFULENBQWlCLE9BQWpCLENBQXlCLEdBQXpCLEVBQThCLE1BQTlCLENBRkwsQ0FUSixDQURZO0FBQUEsQ0FBaEI7O2VBZ0JlLE87Ozs7OztBQ2ZmOztBQUNBOztBQUVBOzs7O0FBSkE7QUFHQTtBQUdBLElBQU0sb0JBQW9CLEdBQUcsd0JBQTdCO0FBQ0EsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQVQsQ0FBd0Isb0JBQXhCLENBQW5CO3FCQUNzQixhO0lBQWYsVyxrQkFBQSxXO0FBRVAsUUFBUSxDQUFDLE1BQVQsQ0FDSSxvQkFBQyxpQkFBRDtBQUFVLEVBQUEsV0FBVyxFQUFFO0FBQXZCLEVBREosRUFFSSxVQUZKOzs7Ozs7Ozs7O0FDVkEsU0FBUyxVQUFULENBQW9CLEdBQXBCLEVBQXlCO0FBQ3JCLFNBQU8sS0FBSyxDQUFDLEdBQUQsQ0FBTCxDQUNGLElBREUsQ0FDRyxVQUFBLEdBQUc7QUFBQSxXQUFJLEdBQUcsQ0FBQyxJQUFKLEVBQUo7QUFBQSxHQUROLEVBRUYsSUFGRSxDQUdDLFVBQUMsTUFBRDtBQUFBLFdBQWE7QUFBQyxNQUFBLE1BQU0sRUFBTjtBQUFELEtBQWI7QUFBQSxHQUhELEVBSUMsVUFBQyxLQUFEO0FBQUEsV0FBWTtBQUFDLE1BQUEsS0FBSyxFQUFMO0FBQUQsS0FBWjtBQUFBLEdBSkQsQ0FBUDtBQU1IOztlQUVjLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vc3RlZmFucGVubmVyL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIHY0LjIuNSs3ZjJiNTI2ZFxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcblx0KGdsb2JhbC5FUzZQcm9taXNlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgeDtcbiAgcmV0dXJuIHggIT09IG51bGwgJiYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuXG5cblxudmFyIF9pc0FycmF5ID0gdm9pZCAwO1xuaWYgKEFycmF5LmlzQXJyYXkpIHtcbiAgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufSBlbHNlIHtcbiAgX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59XG5cbnZhciBpc0FycmF5ID0gX2lzQXJyYXk7XG5cbnZhciBsZW4gPSAwO1xudmFyIHZlcnR4TmV4dCA9IHZvaWQgMDtcbnZhciBjdXN0b21TY2hlZHVsZXJGbiA9IHZvaWQgMDtcblxudmFyIGFzYXAgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgbGVuICs9IDI7XG4gIGlmIChsZW4gPT09IDIpIHtcbiAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgaWYgKGN1c3RvbVNjaGVkdWxlckZuKSB7XG4gICAgICBjdXN0b21TY2hlZHVsZXJGbihmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gIGN1c3RvbVNjaGVkdWxlckZuID0gc2NoZWR1bGVGbjtcbn1cblxuZnVuY3Rpb24gc2V0QXNhcChhc2FwRm4pIHtcbiAgYXNhcCA9IGFzYXBGbjtcbn1cblxudmFyIGJyb3dzZXJXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbnZhciBicm93c2VyR2xvYmFsID0gYnJvd3NlcldpbmRvdyB8fCB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgaXNOb2RlID0gdHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbi8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG52YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuLy8gdmVydHhcbmZ1bmN0aW9uIHVzZVZlcnR4VGltZXIoKSB7XG4gIGlmICh0eXBlb2YgdmVydHhOZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2ZXJ0eE5leHQoZmx1c2gpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIG5vZGUuZGF0YSA9IGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyO1xuICB9O1xufVxuXG4vLyB3ZWIgd29ya2VyXG5mdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gZXM2LXByb21pc2Ugd2lsbCBiZSB1bmFmZmVjdGVkIGJ5XG4gIC8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxuICB2YXIgZ2xvYmFsU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG5cbiAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gYXR0ZW1wdFZlcnR4KCkge1xuICB0cnkge1xuICAgIHZhciB2ZXJ0eCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCkucmVxdWlyZSgndmVydHgnKTtcbiAgICB2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgIHJldHVybiB1c2VWZXJ0eFRpbWVyKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xuICB9XG59XG5cbnZhciBzY2hlZHVsZUZsdXNoID0gdm9pZCAwO1xuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmIChpc05vZGUpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG59IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG59IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xufSBlbHNlIGlmIChicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IGF0dGVtcHRWZXJ0eCgpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gdGhlbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgcGFyZW50ID0gdGhpcztcblxuICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihub29wKTtcblxuICBpZiAoY2hpbGRbUFJPTUlTRV9JRF0gPT09IHVuZGVmaW5lZCkge1xuICAgIG1ha2VQcm9taXNlKGNoaWxkKTtcbiAgfVxuXG4gIHZhciBfc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG5cbiAgaWYgKF9zdGF0ZSkge1xuICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tfc3RhdGUgLSAxXTtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBpbnZva2VDYWxsYmFjayhfc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcGFyZW50Ll9yZXN1bHQpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yZXNvbHZlYCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlc29sdmVkIHdpdGggdGhlXG4gIHBhc3NlZCBgdmFsdWVgLiBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVzb2x2ZSgxKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoMSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZXNvbHZlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBbnl9IHZhbHVlIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgZnVsZmlsbGVkIHdpdGggdGhlIGdpdmVuXG4gIGB2YWx1ZWBcbiovXG5mdW5jdGlvbiByZXNvbHZlJDEob2JqZWN0KSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICByZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG52YXIgUFJPTUlTRV9JRCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnZhciBQRU5ESU5HID0gdm9pZCAwO1xudmFyIEZVTEZJTExFRCA9IDE7XG52YXIgUkVKRUNURUQgPSAyO1xuXG52YXIgVFJZX0NBVENIX0VSUk9SID0geyBlcnJvcjogbnVsbCB9O1xuXG5mdW5jdGlvbiBzZWxmRnVsZmlsbG1lbnQoKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbn1cblxuZnVuY3Rpb24gY2Fubm90UmV0dXJuT3duKCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKHByb21pc2UpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5VGhlbih0aGVuJCQxLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gIHRyeSB7XG4gICAgdGhlbiQkMS5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuJCQxKSB7XG4gIGFzYXAoZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgdmFyIGVycm9yID0gdHJ5VGhlbih0aGVuJCQxLCB0aGVuYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIH1cbiAgfSwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IEZVTEZJTExFRCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSBpZiAodGhlbmFibGUuX3N0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkMSkge1xuICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3RvciAmJiB0aGVuJCQxID09PSB0aGVuICYmIG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IucmVzb2x2ZSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoZW4kJDEgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgcmVqZWN0KHByb21pc2UsIFRSWV9DQVRDSF9FUlJPUi5lcnJvcik7XG4gICAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhlbiQkMSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih0aGVuJCQxKSkge1xuICAgICAgaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBzZWxmRnVsZmlsbG1lbnQoKSk7XG4gIH0gZWxzZSBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlLCBnZXRUaGVuKHZhbHVlKSk7XG4gIH0gZWxzZSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICB9XG5cbiAgcHVibGlzaChwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQ7XG5cbiAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCAhPT0gMCkge1xuICAgIGFzYXAocHVibGlzaCwgcHJvbWlzZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBSRUpFQ1RFRDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gIGFzYXAocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgX3N1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgdmFyIGxlbmd0aCA9IF9zdWJzY3JpYmVycy5sZW5ndGg7XG5cblxuICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gIF9zdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSA9IG9uUmVqZWN0aW9uO1xuXG4gIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgIGFzYXAocHVibGlzaCwgcGFyZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoKHByb21pc2UpIHtcbiAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBjaGlsZCA9IHZvaWQgMCxcbiAgICAgIGNhbGxiYWNrID0gdm9pZCAwLFxuICAgICAgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgaWYgKGNoaWxkKSB7XG4gICAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgfVxuICB9XG5cbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbn1cblxuZnVuY3Rpb24gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICB0cnkge1xuICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICByZXR1cm4gVFJZX0NBVENIX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdmFyIGhhc0NhbGxiYWNrID0gaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICB2YWx1ZSA9IHZvaWQgMCxcbiAgICAgIGVycm9yID0gdm9pZCAwLFxuICAgICAgc3VjY2VlZGVkID0gdm9pZCAwLFxuICAgICAgZmFpbGVkID0gdm9pZCAwO1xuXG4gIGlmIChoYXNDYWxsYmFjaykge1xuICAgIHZhbHVlID0gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICBpZiAodmFsdWUgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICB2YWx1ZS5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgLy8gbm9vcFxuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBlKTtcbiAgfVxufVxuXG52YXIgaWQgPSAwO1xuZnVuY3Rpb24gbmV4dElkKCkge1xuICByZXR1cm4gaWQrKztcbn1cblxuZnVuY3Rpb24gbWFrZVByb21pc2UocHJvbWlzZSkge1xuICBwcm9taXNlW1BST01JU0VfSURdID0gaWQrKztcbiAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKCkge1xuICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbn1cblxudmFyIEVudW1lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcblxuICAgIGlmICghdGhpcy5wcm9taXNlW1BST01JU0VfSURdKSB7XG4gICAgICBtYWtlUHJvbWlzZSh0aGlzLnByb21pc2UpO1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG5cbiAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgdGhpcy5fZW51bWVyYXRlKGlucHV0KTtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCh0aGlzLnByb21pc2UsIHZhbGlkYXRpb25FcnJvcigpKTtcbiAgICB9XG4gIH1cblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24gX2VudW1lcmF0ZShpbnB1dCkge1xuICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLl9zdGF0ZSA9PT0gUEVORElORyAmJiBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbiBfZWFjaEVudHJ5KGVudHJ5LCBpKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgIHZhciByZXNvbHZlJCQxID0gYy5yZXNvbHZlO1xuXG5cbiAgICBpZiAocmVzb2x2ZSQkMSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgICB2YXIgX3RoZW4gPSBnZXRUaGVuKGVudHJ5KTtcblxuICAgICAgaWYgKF90aGVuID09PSB0aGVuICYmIGVudHJ5Ll9zdGF0ZSAhPT0gUEVORElORykge1xuICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIF90aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gUHJvbWlzZSQxKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobm9vcCk7XG4gICAgICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgZW50cnksIF90aGVuKTtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHByb21pc2UsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KG5ldyBjKGZ1bmN0aW9uIChyZXNvbHZlJCQxKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUkJDEoZW50cnkpO1xuICAgICAgICB9KSwgaSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlJCQxKGVudHJ5KSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbiBfc2V0dGxlZEF0KHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG5cbiAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbiBfd2lsbFNldHRsZUF0KHByb21pc2UsIGkpIHtcbiAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICBzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gRW51bWVyYXRvcjtcbn0oKTtcblxuLyoqXG4gIGBQcm9taXNlLmFsbGAgYWNjZXB0cyBhbiBhcnJheSBvZiBwcm9taXNlcywgYW5kIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaFxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSBvZiBmdWxmaWxsbWVudCB2YWx1ZXMgZm9yIHRoZSBwYXNzZWQgcHJvbWlzZXMsIG9yXG4gIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiBvZiB0aGUgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQuIEl0IGNhc3RzIGFsbFxuICBlbGVtZW50cyBvZiB0aGUgcGFzc2VkIGl0ZXJhYmxlIHRvIHByb21pc2VzIGFzIGl0IHJ1bnMgdGhpcyBhbGdvcml0aG0uXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlc29sdmUoMik7XG4gIGxldCBwcm9taXNlMyA9IHJlc29sdmUoMyk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgbGV0IHByb21pc2UzID0gcmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gZW50cmllcyBhcnJheSBvZiBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBsYWJlbGluZyB0aGUgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuICBAc3RhdGljXG4qL1xuZnVuY3Rpb24gYWxsKGVudHJpZXMpIHtcbiAgcmV0dXJuIG5ldyBFbnVtZXJhdG9yKHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yYWNlYCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2ggaXMgc2V0dGxlZCBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlXG4gIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIHNldHRsZS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMicpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFByb21pc2UucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdFxuICBzZXR0bGVkIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlXG4gIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IHNldHRsZWQgcHJvbWlzZSBoYXNcbiAgYmVjb21lIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gIHByb21pc2Ugd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcigncHJvbWlzZSAyJykpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQW4gZXhhbXBsZSByZWFsLXdvcmxkIHVzZSBjYXNlIGlzIGltcGxlbWVudGluZyB0aW1lb3V0czpcblxuICBgYGBqYXZhc2NyaXB0XG4gIFByb21pc2UucmFjZShbYWpheCgnZm9vLmpzb24nKSwgdGltZW91dCg1MDAwKV0pXG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2Ugd2hpY2ggc2V0dGxlcyBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlIGZpcnN0IHBhc3NlZFxuICBwcm9taXNlIHRvIHNldHRsZS5cbiovXG5mdW5jdGlvbiByYWNlKGVudHJpZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkoZW50cmllcykpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkIGByZWFzb25gLlxuICBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlbiBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QkMShyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbmVlZHNSZXNvbHZlcigpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xufVxuXG5mdW5jdGlvbiBuZWVkc05ldygpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbn1cblxuLyoqXG4gIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gIFRlcm1pbm9sb2d5XG4gIC0tLS0tLS0tLS0tXG5cbiAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgQmFzaWMgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLVxuXG4gIGBgYGpzXG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgLy8gb24gc3VjY2Vzc1xuICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgLy8gb24gZmFpbHVyZVxuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIEFkdmFuY2VkIFVzYWdlOlxuICAtLS0tLS0tLS0tLS0tLS1cblxuICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICBgYGBqc1xuICBQcm9taXNlLmFsbChbXG4gICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9KTtcbiAgYGBgXG5cbiAgQGNsYXNzIFByb21pc2VcbiAgQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZXJcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAY29uc3RydWN0b3JcbiovXG5cbnZhciBQcm9taXNlJDEgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICB0aGlzW1BST01JU0VfSURdID0gbmV4dElkKCk7XG4gICAgdGhpcy5fcmVzdWx0ID0gdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgIGlmIChub29wICE9PSByZXNvbHZlcikge1xuICAgICAgdHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nICYmIG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgIHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlID8gaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpIDogbmVlZHNOZXcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gIH0pO1xuICBgYGBcbiAgIENoYWluaW5nXG4gIC0tLS0tLS0tXG4gICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gIH0pO1xuICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgfSk7XG4gIGBgYFxuICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgQXNzaW1pbGF0aW9uXG4gIC0tLS0tLS0tLS0tLVxuICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gIH0pO1xuICBgYGBcbiAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgU2ltcGxlIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IHJlc3VsdDtcbiAgIHRyeSB7XG4gICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgIGlmIChlcnIpIHtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3VjY2Vzc1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuICAgUHJvbWlzZSBFeGFtcGxlO1xuICAgYGBgamF2YXNjcmlwdFxuICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBmYWlsdXJlXG4gIH0pO1xuICBgYGBcbiAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IGF1dGhvciwgYm9va3M7XG4gICB0cnkge1xuICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG4gICB9XG4gICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuICAgfVxuICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICB9XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRBdXRob3IoKS5cbiAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgIC8vIGZvdW5kIGJvb2tzXG4gIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICAgQG1ldGhvZCB0aGVuXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG4gIC8qKlxuICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gIH1cbiAgLy8gc3luY2hyb25vdXNcbiAgdHJ5IHtcbiAgZmluZEF1dGhvcigpO1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9XG4gIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH0pO1xuICBgYGBcbiAgQG1ldGhvZCBjYXRjaFxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cblxuICBQcm9taXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIF9jYXRjaChvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgIGBmaW5hbGx5YCB3aWxsIGJlIGludm9rZWQgcmVnYXJkbGVzcyBvZiB0aGUgcHJvbWlzZSdzIGZhdGUganVzdCBhcyBuYXRpdmVcbiAgICB0cnkvY2F0Y2gvZmluYWxseSBiZWhhdmVzXG4gIFxuICAgIFN5bmNocm9ub3VzIGV4YW1wbGU6XG4gIFxuICAgIGBgYGpzXG4gICAgZmluZEF1dGhvcigpIHtcbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBdXRob3IoKTtcbiAgICB9XG4gIFxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZmluZEF1dGhvcigpOyAvLyBzdWNjZWVkIG9yIGZhaWxcbiAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmluZE90aGVyQXV0aGVyKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIGFsd2F5cyBydW5zXG4gICAgICAvLyBkb2Vzbid0IGFmZmVjdCB0aGUgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAgIGBgYFxuICBcbiAgICBBc3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9KS5maW5hbGx5KGZ1bmN0aW9uKCl7XG4gICAgICAvLyBhdXRob3Igd2FzIGVpdGhlciBmb3VuZCwgb3Igbm90XG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEBtZXRob2QgZmluYWxseVxuICAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmZpbmFsbHkgPSBmdW5jdGlvbiBfZmluYWxseShjYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm9taXNlLmNvbnN0cnVjdG9yO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aHJvdyByZWFzb247XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2UudGhlbihjYWxsYmFjaywgY2FsbGJhY2spO1xuICB9O1xuXG4gIHJldHVybiBQcm9taXNlO1xufSgpO1xuXG5Qcm9taXNlJDEucHJvdG90eXBlLnRoZW4gPSB0aGVuO1xuUHJvbWlzZSQxLmFsbCA9IGFsbDtcblByb21pc2UkMS5yYWNlID0gcmFjZTtcblByb21pc2UkMS5yZXNvbHZlID0gcmVzb2x2ZSQxO1xuUHJvbWlzZSQxLnJlamVjdCA9IHJlamVjdCQxO1xuUHJvbWlzZSQxLl9zZXRTY2hlZHVsZXIgPSBzZXRTY2hlZHVsZXI7XG5Qcm9taXNlJDEuX3NldEFzYXAgPSBzZXRBc2FwO1xuUHJvbWlzZSQxLl9hc2FwID0gYXNhcDtcblxuLypnbG9iYWwgc2VsZiovXG5mdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgdmFyIGxvY2FsID0gdm9pZCAwO1xuXG4gIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gZ2xvYmFsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gc2VsZjtcbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncG9seWZpbGwgZmFpbGVkIGJlY2F1c2UgZ2xvYmFsIG9iamVjdCBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gIGlmIChQKSB7XG4gICAgdmFyIHByb21pc2VUb1N0cmluZyA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHByb21pc2VUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChQLnJlc29sdmUoKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gc2lsZW50bHkgaWdub3JlZFxuICAgIH1cblxuICAgIGlmIChwcm9taXNlVG9TdHJpbmcgPT09ICdbb2JqZWN0IFByb21pc2VdJyAmJiAhUC5jYXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgbG9jYWwuUHJvbWlzZSA9IFByb21pc2UkMTtcbn1cblxuLy8gU3RyYW5nZSBjb21wYXQuLlxuUHJvbWlzZSQxLnBvbHlmaWxsID0gcG9seWZpbGw7XG5Qcm9taXNlJDEuUHJvbWlzZSA9IFByb21pc2UkMTtcblxucmV0dXJuIFByb21pc2UkMTtcblxufSkpKTtcblxuXG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVzNi1wcm9taXNlLm1hcFxuIiwiLy8gdGhlIHdoYXR3Zy1mZXRjaCBwb2x5ZmlsbCBpbnN0YWxscyB0aGUgZmV0Y2goKSBmdW5jdGlvblxuLy8gb24gdGhlIGdsb2JhbCBvYmplY3QgKHdpbmRvdyBvciBzZWxmKVxuLy9cbi8vIFJldHVybiB0aGF0IGFzIHRoZSBleHBvcnQgZm9yIHVzZSBpbiBXZWJwYWNrLCBCcm93c2VyaWZ5IGV0Yy5cbnJlcXVpcmUoJ3doYXR3Zy1mZXRjaCcpO1xubW9kdWxlLmV4cG9ydHMgPSBzZWxmLmZldGNoLmJpbmQoc2VsZik7XG4iLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3Rvcnkpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dDpjYW50IHRlc3QqL1xuICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsc1xuICAgIHJvb3Qub2JqZWN0UGF0aCA9IGZhY3RvcnkoKTtcbiAgfVxufSkodGhpcywgZnVuY3Rpb24oKXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIGZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgIGlmKG9iaiA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgLy90byBoYW5kbGUgb2JqZWN0cyB3aXRoIG51bGwgcHJvdG90eXBlcyAodG9vIGVkZ2UgY2FzZT8pXG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApXG4gIH1cblxuICBmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKXtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gdG9TdHJpbmcodHlwZSl7XG4gICAgcmV0dXJuIHRvU3RyLmNhbGwodHlwZSk7XG4gIH1cblxuICBmdW5jdGlvbiBpc09iamVjdChvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZyhvYmopID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xuICB9XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKG9iail7XG4gICAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dDpjYW50IHRlc3QqL1xuICAgIHJldHVybiB0b1N0ci5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH1cblxuICBmdW5jdGlvbiBpc0Jvb2xlYW4ob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nIHx8IHRvU3RyaW5nKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEtleShrZXkpe1xuICAgIHZhciBpbnRLZXkgPSBwYXJzZUludChrZXkpO1xuICAgIGlmIChpbnRLZXkudG9TdHJpbmcoKSA9PT0ga2V5KSB7XG4gICAgICByZXR1cm4gaW50S2V5O1xuICAgIH1cbiAgICByZXR1cm4ga2V5O1xuICB9XG5cbiAgZnVuY3Rpb24gZmFjdG9yeShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cblxuICAgIHZhciBvYmplY3RQYXRoID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0UGF0aCkucmVkdWNlKGZ1bmN0aW9uKHByb3h5LCBwcm9wKSB7XG4gICAgICAgIGlmKHByb3AgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgICB9XG5cbiAgICAgICAgLyppc3RhbmJ1bCBpZ25vcmUgZWxzZSovXG4gICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0UGF0aFtwcm9wXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHByb3h5W3Byb3BdID0gb2JqZWN0UGF0aFtwcm9wXS5iaW5kKG9iamVjdFBhdGgsIG9iaik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICB9LCB7fSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIHJldHVybiAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgfHwgKHR5cGVvZiBwcm9wID09PSAnbnVtYmVyJyAmJiBBcnJheS5pc0FycmF5KG9iaikpIHx8IGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgaWYgKGhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApKSB7XG4gICAgICAgIHJldHVybiBvYmpbcHJvcF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHNldChvYmosIHBhdGguc3BsaXQoJy4nKS5tYXAoZ2V0S2V5KSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgICB9XG4gICAgICB2YXIgY3VycmVudFBhdGggPSBwYXRoWzBdO1xuICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKTtcbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlID09PSB2b2lkIDAgfHwgIWRvTm90UmVwbGFjZSkge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY3VycmVudFZhbHVlID09PSB2b2lkIDApIHtcbiAgICAgICAgLy9jaGVjayBpZiB3ZSBhc3N1bWUgYW4gYXJyYXlcbiAgICAgICAgaWYodHlwZW9mIHBhdGhbMV0gPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgIH1cblxuICAgIG9iamVjdFBhdGguaGFzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAhIW9iajtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBqID0gZ2V0S2V5KHBhdGhbaV0pO1xuXG4gICAgICAgIGlmKCh0eXBlb2YgaiA9PT0gJ251bWJlcicgJiYgaXNBcnJheShvYmopICYmIGogPCBvYmoubGVuZ3RoKSB8fFxuICAgICAgICAgIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyA/IChqIGluIE9iamVjdChvYmopKSA6IGhhc093blByb3BlcnR5KG9iaiwgaikpKSB7XG4gICAgICAgICAgb2JqID0gb2JqW2pdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbnN1cmVFeGlzdHMgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIHRydWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLnNldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmluc2VydCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBhdCl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGF0ID0gfn5hdDtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG4gICAgICBhcnIuc3BsaWNlKGF0LCAwLCB2YWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW1wdHkgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlLCBpO1xuICAgICAgaWYgKCEodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAnJyk7XG4gICAgICB9IGVsc2UgaWYgKGlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgZmFsc2UpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIDApO1xuICAgICAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB2YWx1ZS5sZW5ndGggPSAwO1xuICAgICAgfSBlbHNlIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgZm9yIChpIGluIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKGhhc1NoYWxsb3dQcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB2YWx1ZVtpXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIG51bGwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLnB1c2ggPSBmdW5jdGlvbiAob2JqLCBwYXRoIC8qLCB2YWx1ZXMgKi8pe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuXG4gICAgICBhcnIucHVzaC5hcHBseShhcnIsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmNvYWxlc2NlID0gZnVuY3Rpb24gKG9iaiwgcGF0aHMsIGRlZmF1bHRWYWx1ZSkge1xuICAgICAgdmFyIHZhbHVlO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGF0aHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKCh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aHNbaV0pKSAhPT0gdm9pZCAwKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZ2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgZGVmYXVsdFZhbHVlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmosIHBhdGguc3BsaXQoJy4nKSwgZGVmYXVsdFZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgdmFyIG5leHRPYmogPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aClcbiAgICAgIGlmIChuZXh0T2JqID09PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiBuZXh0T2JqO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgZGVmYXVsdFZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5kZWwgPSBmdW5jdGlvbiBkZWwob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG5cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmosIHBhdGguc3BsaXQoJy4nKSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIGlmICghaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgICBvYmouc3BsaWNlKGN1cnJlbnRQYXRoLCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgb2JqW2N1cnJlbnRQYXRoXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIHJldHVybiBvYmplY3RQYXRoO1xuICB9XG5cbiAgdmFyIG1vZCA9IGZhY3RvcnkoKTtcbiAgbW9kLmNyZWF0ZSA9IGZhY3Rvcnk7XG4gIG1vZC53aXRoSW5oZXJpdGVkUHJvcHMgPSBmYWN0b3J5KHtpbmNsdWRlSW5oZXJpdGVkUHJvcHM6IHRydWV9KVxuICByZXR1cm4gbW9kO1xufSk7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiJ3VzZSBzdHJpY3QnXG5cbmNvbnN0IHtpc09iamVjdCwgZ2V0S2V5c30gPSByZXF1aXJlKCcuL2xhbmcnKVxuXG4vLyBQUklWQVRFIFBST1BFUlRJRVNcbmNvbnN0IEJZUEFTU19NT0RFID0gJ19fYnlwYXNzTW9kZSdcbmNvbnN0IElHTk9SRV9DSVJDVUxBUiA9ICdfX2lnbm9yZUNpcmN1bGFyJ1xuY29uc3QgTUFYX0RFRVAgPSAnX19tYXhEZWVwJ1xuY29uc3QgQ0FDSEUgPSAnX19jYWNoZSdcbmNvbnN0IFFVRVVFID0gJ19fcXVldWUnXG5jb25zdCBTVEFURSA9ICdfX3N0YXRlJ1xuXG5jb25zdCBFTVBUWV9TVEFURSA9IHt9XG5cbmNsYXNzIFJlY3Vyc2l2ZUl0ZXJhdG9yIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSByb290XG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbYnlwYXNzTW9kZT0wXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtpZ25vcmVDaXJjdWxhcj1mYWxzZV1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFttYXhEZWVwPTEwMF1cbiAgICovXG4gIGNvbnN0cnVjdG9yIChyb290LCBieXBhc3NNb2RlID0gMCwgaWdub3JlQ2lyY3VsYXIgPSBmYWxzZSwgbWF4RGVlcCA9IDEwMCkge1xuICAgIHRoaXNbQllQQVNTX01PREVdID0gYnlwYXNzTW9kZVxuICAgIHRoaXNbSUdOT1JFX0NJUkNVTEFSXSA9IGlnbm9yZUNpcmN1bGFyXG4gICAgdGhpc1tNQVhfREVFUF0gPSBtYXhEZWVwXG4gICAgdGhpc1tDQUNIRV0gPSBbXVxuICAgIHRoaXNbUVVFVUVdID0gW11cbiAgICB0aGlzW1NUQVRFXSA9IHRoaXMuZ2V0U3RhdGUodW5kZWZpbmVkLCByb290KVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgbmV4dCAoKSB7XG4gICAgY29uc3Qge25vZGUsIHBhdGgsIGRlZXB9ID0gdGhpc1tTVEFURV0gfHwgRU1QVFlfU1RBVEVcblxuICAgIGlmICh0aGlzW01BWF9ERUVQXSA+IGRlZXApIHtcbiAgICAgIGlmICh0aGlzLmlzTm9kZShub2RlKSkge1xuICAgICAgICBpZiAodGhpcy5pc0NpcmN1bGFyKG5vZGUpKSB7XG4gICAgICAgICAgaWYgKHRoaXNbSUdOT1JFX0NJUkNVTEFSXSkge1xuICAgICAgICAgICAgLy8gc2tpcFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NpcmN1bGFyIHJlZmVyZW5jZScpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0aGlzLm9uU3RlcEludG8odGhpc1tTVEFURV0pKSB7XG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdG9ycyA9IHRoaXMuZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzKG5vZGUsIHBhdGgsIGRlZXApXG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSB0aGlzW0JZUEFTU19NT0RFXSA/ICdwdXNoJyA6ICd1bnNoaWZ0J1xuICAgICAgICAgICAgdGhpc1tRVUVVRV1bbWV0aG9kXSguLi5kZXNjcmlwdG9ycylcbiAgICAgICAgICAgIHRoaXNbQ0FDSEVdLnB1c2gobm9kZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IHRoaXNbUVVFVUVdLnNoaWZ0KClcbiAgICBjb25zdCBkb25lID0gIXZhbHVlXG5cbiAgICB0aGlzW1NUQVRFXSA9IHZhbHVlXG5cbiAgICBpZiAoZG9uZSkgdGhpcy5kZXN0cm95KClcblxuICAgIHJldHVybiB7dmFsdWUsIGRvbmV9XG4gIH1cbiAgLyoqXG4gICAqXG4gICAqL1xuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzW1FVRVVFXS5sZW5ndGggPSAwXG4gICAgdGhpc1tDQUNIRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbU1RBVEVdID0gbnVsbFxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzTm9kZSAoYW55KSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0xlYWYgKGFueSkge1xuICAgIHJldHVybiAhdGhpcy5pc05vZGUoYW55KVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzQ2lyY3VsYXIgKGFueSkge1xuICAgIHJldHVybiB0aGlzW0NBQ0hFXS5pbmRleE9mKGFueSkgIT09IC0xXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGVzIG9mIGNoaWxkIG5vZGVzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhdGhcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlZXBcbiAgICogQHJldHVybnMge0FycmF5PE9iamVjdD59XG4gICAqL1xuICBnZXRTdGF0ZXNPZkNoaWxkTm9kZXMgKG5vZGUsIHBhdGgsIGRlZXApIHtcbiAgICByZXR1cm4gZ2V0S2V5cyhub2RlKS5tYXAoa2V5ID0+XG4gICAgICB0aGlzLmdldFN0YXRlKG5vZGUsIG5vZGVba2V5XSwga2V5LCBwYXRoLmNvbmNhdChrZXkpLCBkZWVwICsgMSlcbiAgICApXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGUgb2Ygbm9kZS4gQ2FsbHMgZm9yIGVhY2ggbm9kZVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3BhcmVudF1cbiAgICogQHBhcmFtIHsqfSBbbm9kZV1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXldXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtwYXRoXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW2RlZXBdXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBnZXRTdGF0ZSAocGFyZW50LCBub2RlLCBrZXksIHBhdGggPSBbXSwgZGVlcCA9IDApIHtcbiAgICByZXR1cm4ge3BhcmVudCwgbm9kZSwga2V5LCBwYXRoLCBkZWVwfVxuICB9XG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvblN0ZXBJbnRvIChzdGF0ZSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtSZWN1cnNpdmVJdGVyYXRvcn1cbiAgICovXG4gIFtTeW1ib2wuaXRlcmF0b3JdICgpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjdXJzaXZlSXRlcmF0b3JcbiIsIid1c2Ugc3RyaWN0J1xuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0IChhbnkpIHtcbiAgcmV0dXJuIGFueSAhPT0gbnVsbCAmJiB0eXBlb2YgYW55ID09PSAnb2JqZWN0J1xufVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmNvbnN0IHtpc0FycmF5fSA9IEFycmF5XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNBcnJheUxpa2UgKGFueSkge1xuICBpZiAoIWlzT2JqZWN0KGFueSkpIHJldHVybiBmYWxzZVxuICBpZiAoISgnbGVuZ3RoJyBpbiBhbnkpKSByZXR1cm4gZmFsc2VcbiAgY29uc3QgbGVuZ3RoID0gYW55Lmxlbmd0aFxuICBpZiAoIWlzTnVtYmVyKGxlbmd0aCkpIHJldHVybiBmYWxzZVxuICBpZiAobGVuZ3RoID4gMCkge1xuICAgIHJldHVybiAobGVuZ3RoIC0gMSkgaW4gYW55XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYW55KSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWJlciAoYW55KSB7XG4gIHJldHVybiB0eXBlb2YgYW55ID09PSAnbnVtYmVyJ1xufVxuLyoqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gb2JqZWN0XG4gKiBAcmV0dXJucyB7QXJyYXk8U3RyaW5nPn1cbiAqL1xuZnVuY3Rpb24gZ2V0S2V5cyAob2JqZWN0KSB7XG4gIGNvbnN0IGtleXNfID0gT2JqZWN0LmtleXMob2JqZWN0KVxuICBpZiAoaXNBcnJheShvYmplY3QpKSB7XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSBpZiAoaXNBcnJheUxpa2Uob2JqZWN0KSkge1xuICAgIGNvbnN0IGluZGV4ID0ga2V5c18uaW5kZXhPZignbGVuZ3RoJylcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAga2V5c18uc3BsaWNlKGluZGV4LCAxKVxuICAgIH1cbiAgICAvLyBza2lwIHNvcnRcbiAgfSBlbHNlIHtcbiAgICAvLyBzb3J0XG4gICAga2V5c18uc29ydCgpXG4gIH1cbiAgcmV0dXJuIGtleXNfXG59XG5cbmV4cG9ydHMuZ2V0S2V5cyA9IGdldEtleXNcbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXlcbmV4cG9ydHMuaXNBcnJheUxpa2UgPSBpc0FycmF5TGlrZVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXJcbiIsIihmdW5jdGlvbihzZWxmKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAoc2VsZi5mZXRjaCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgc2VhcmNoUGFyYW1zOiAnVVJMU2VhcmNoUGFyYW1zJyBpbiBzZWxmLFxuICAgIGl0ZXJhYmxlOiAnU3ltYm9sJyBpbiBzZWxmICYmICdpdGVyYXRvcicgaW4gU3ltYm9sLFxuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKClcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGYsXG4gICAgYXJyYXlCdWZmZXI6ICdBcnJheUJ1ZmZlcicgaW4gc2VsZlxuICB9XG5cbiAgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIpIHtcbiAgICB2YXIgdmlld0NsYXNzZXMgPSBbXG4gICAgICAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQ2NEFycmF5XSdcbiAgICBdXG5cbiAgICB2YXIgaXNEYXRhVmlldyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiBEYXRhVmlldy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmopXG4gICAgfVxuXG4gICAgdmFyIGlzQXJyYXlCdWZmZXJWaWV3ID0gQXJyYXlCdWZmZXIuaXNWaWV3IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiB2aWV3Q2xhc3Nlcy5pbmRleE9mKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopKSA+IC0xXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IFN0cmluZyhuYW1lKVxuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpXG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLy8gQnVpbGQgYSBkZXN0cnVjdGl2ZSBpdGVyYXRvciBmb3IgdGhlIHZhbHVlIGxpc3RcbiAgZnVuY3Rpb24gaXRlcmF0b3JGb3IoaXRlbXMpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbXMuc2hpZnQoKVxuICAgICAgICByZXR1cm4ge2RvbmU6IHZhbHVlID09PSB1bmRlZmluZWQsIHZhbHVlOiB2YWx1ZX1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgICAgaXRlcmF0b3JbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3JcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaGVhZGVycykpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoaGVhZGVyWzBdLCBoZWFkZXJbMV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMubWFwW25hbWVdXG4gICAgdGhpcy5tYXBbbmFtZV0gPSBvbGRWYWx1ZSA/IG9sZFZhbHVlKycsJyt2YWx1ZSA6IHZhbHVlXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICByZXR1cm4gdGhpcy5oYXMobmFtZSkgPyB0aGlzLm1hcFtuYW1lXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5tYXApIHtcbiAgICAgIGlmICh0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMubWFwW25hbWVdLCBuYW1lLCB0aGlzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgIHJldHVybiBidWYuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aClcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpXG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBzdXBwb3J0LmJsb2IgJiYgaXNEYXRhVmlldyhib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5LmJ1ZmZlcilcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcblxuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIFJlcXVlc3QpIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSBTdHJpbmcoaW5wdXQpXG4gICAgfVxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICBpZiAob3B0aW9ucy5oZWFkZXJzIHx8ICF0aGlzLmhlYWRlcnMpIHtcbiAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB9XG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgdGhpcy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIGJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkoYm9keSlcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHRoaXMsIHsgYm9keTogdGhpcy5fYm9keUluaXQgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhd0hlYWRlcnMpIHtcbiAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKClcbiAgICByYXdIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9ICdzdGF0dXMnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1cyA6IDIwMFxuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3QuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHJlcXVlc3QuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiByZXF1ZXN0Ll9ib2R5SW5pdClcbiAgICB9KVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4iLCJpbXBvcnQgTGlzdEl0ZW0gZnJvbSAnLi9MaXN0SXRlbSc7XG5pbXBvcnQgcmVjdXJzaXZlSXRlcmF0b3IgZnJvbSAncmVjdXJzaXZlLWl0ZXJhdG9yJztcbmltcG9ydCBvYmplY3RQYXRoIGZyb20gJ29iamVjdC1wYXRoJztcblxuY2xhc3MgRGF0YUxpc3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAoe1tldmVudC50YXJnZXQuZGF0YXNldC5maWVsZF06IHBhdGh9KTtcbiAgICB9XG5cbiAgICByZW5kZXJOb2RlcyhkYXRhKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ29iamVjdFBhdGgnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgY2hpbGQgPSA8TGlzdEl0ZW0ga2V5PXtpdGVtLnRvU3RyaW5nKCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU9e2l0ZW19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0PXtkYXRhW2l0ZW1dfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnByb3BzLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250YWluZXI9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLm9iamVjdFBhdGgsIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tUaXRsZT17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2tDb250ZW50PXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb249e3RoaXMucHJvcHMudHJhbnNsYXRpb259Lz47XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YVtpdGVtXSA9PT0gJ29iamVjdCcgJiYgZGF0YVtpdGVtXSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNoaWxkID0gUmVhY3QuY2xvbmVFbGVtZW50KGNoaWxkLCB7XG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KGRhdGFbaXRlbV0pID8gdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dWzBdKSA6IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXSlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHt0cmFuc2xhdGlvbiwgZGF0YX0gPSB0aGlzLnByb3BzO1xuICAgICAgICBjb25zdCBmaWVsZE1hcCA9IHRoaXMucHJvcHMuZmllbGRNYXA7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhWzBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGxldCB7cGFyZW50LCBub2RlLCBrZXksIHBhdGh9IG9mIG5ldyByZWN1cnNpdmVJdGVyYXRvcihkYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ29iamVjdCcgJiYgbm9kZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RQYXRoLnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoMz57dHJhbnNsYXRpb24uc2VsZWN0SXRlbXNDb250YWluZXJ9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cImpzb24tdHJlZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge3RoaXMucmVuZGVyTm9kZXMoZGF0YSl9XG4gICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG9iamVjdERhdGEgPSBvYmplY3RQYXRoLmdldChkYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBvYmplY3REYXRhID0gb2JqZWN0RGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3Iob2JqZWN0RGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXRoU3RyaW5nID0gcGF0aC5qb2luKCcuJyk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFBhdGguc2V0KG9iamVjdERhdGEsIHBhdGhTdHJpbmcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+e3RyYW5zbGF0aW9uLnNlbGVjdFRpdGxlQ29udGVudH08L2gzPlxuICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3NOYW1lPVwianNvbi10cmVlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7dGhpcy5yZW5kZXJOb2RlcyhvYmplY3REYXRhKX1cbiAgICAgICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IERhdGFMaXN0OyIsImltcG9ydCBEYXRhTGlzdCBmcm9tICcuL0RhdGFMaXN0JztcbmltcG9ydCBnZXRBcGlEYXRhIGZyb20gJy4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhJztcblxuY2xhc3MgRmllbGRTZWxlY3Rpb24gZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgICAgICB0aGlzLmdldERhdGEoKTtcbiAgICB9XG5cbiAgICBnZXREYXRhKCkge1xuICAgICAgICBjb25zdCB7dXJsLCB0cmFuc2xhdGlvbn0gPSB0aGlzLnByb3BzO1xuICAgICAgICBnZXRBcGlEYXRhKHVybClcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAgICh7cmVzdWx0fSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCBPYmplY3Qua2V5cyhyZXN1bHQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wcy5zZXRFcnJvcihFcnJvcih0cmFuc2xhdGlvbi5jb3VsZE5vdEZldGNoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb3BzLnNldExvYWRlZCh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb3BzLnNldEl0ZW1zKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvcHMuc2V0TG9hZGVkKHRydWUpO1xuICAgICAgICAgICAgICAgIH0sICh7ZXJyb3J9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvcHMuc2V0TG9hZGVkKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb3BzLnNldEVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICAgIHRoaXMucHJvcHMudXBkYXRlRmllbGRNYXAodmFsdWUpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3VybCwgZXJyb3IsIGZpZWxkTWFwLCB0cmFuc2xhdGlvbiwgaXNMb2FkZWQsIGl0ZW1zfSA9IHRoaXMucHJvcHM7XG5cbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJub3RpY2Ugbm90aWNlLWVycm9yIGlubGluZVwiPjxwPntlcnJvci5tZXNzYWdlfTwvcD48L2Rpdj47XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJzcGlubmVyIGlzLWFjdGl2ZVwiPjwvZGl2PjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPERhdGFMaXN0XG4gICAgICAgICAgICAgICAgICAgIGRhdGE9e2l0ZW1zfVxuICAgICAgICAgICAgICAgICAgICB1cmw9e3VybH1cbiAgICAgICAgICAgICAgICAgICAgZmllbGRNYXA9e2ZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVGaWVsZE1hcD17dGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpfVxuICAgICAgICAgICAgICAgICAgICB0cmFuc2xhdGlvbj17dHJhbnNsYXRpb259XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZpZWxkU2VsZWN0aW9uOyIsImNvbnN0IElucHV0RmllbGRzID0gKHtmaWVsZE1hcCwgdXJsfSkgPT5cbiAgICA8ZGl2PlxuICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJtb2RfanNvbl9yZW5kZXJfdXJsXCIgdmFsdWU9e3VybH0vPlxuICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJtb2RfanNvbl9yZW5kZXJfZmllbGRtYXBcIiB2YWx1ZT17SlNPTi5zdHJpbmdpZnkoZmllbGRNYXApfS8+XG4gICAgPC9kaXY+O1xuXG5leHBvcnQgZGVmYXVsdCBJbnB1dEZpZWxkczsiLCJjb25zdCBMaXN0SXRlbSA9ICh7dmFsdWUsIGNoaWxkcmVuLCBmaWVsZE1hcCwgb2JqZWN0LCBvbkNsaWNrVGl0bGUsIG9uQ2xpY2tDb250ZW50LCBvbkNsaWNrQ29udGFpbmVyLCB0cmFuc2xhdGlvbn0pID0+IHtcbiAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgICAgcmV0dXJuICg8bGk+XG4gICAgICAgICAgICB7QXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgP1xuICAgICAgICAgICAgICAgIDxzcGFuPjxzcGFuIGNsYXNzTmFtZT1cImRhc2hpY29ucyBkYXNoaWNvbnMtcG9ydGZvbGlvXCI+PC9zcGFuPiB7dmFsdWV9IDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwidHJlZS1zZWxlY3RcIiBkYXRhLWZpZWxkPVwiaXRlbUNvbnRhaW5lclwiIG9uQ2xpY2s9e29uQ2xpY2tDb250YWluZXJ9Pnt0cmFuc2xhdGlvbi5zZWxlY3R9PC9hPjwvc3Bhbj4gOiAgPHNwYW4+e3ZhbHVlfTwvc3Bhbj59XG4gICAgICAgICAgICA8dWw+e2NoaWxkcmVufTwvdWw+XG4gICAgICAgIDwvbGk+KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKDxsaT5cbiAgICAgICAgICAgIHtmaWVsZE1hcC50aXRsZSA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLnRpdGxlID8gPHN0cm9uZz57dHJhbnNsYXRpb24udGl0bGV9OiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAgICAgIHtmaWVsZE1hcC5jb250ZW50ID09PSBvYmplY3QgJiYgZmllbGRNYXAuY29udGVudCA/IDxzdHJvbmc+e3RyYW5zbGF0aW9uLmNvbnRlbnR9OiA8L3N0cm9uZz4gOiAnJ31cbiAgICAgICAgICAgIDxzcGFuPnt2YWx1ZX08L3NwYW4+XG4gICAgICAgICAgICB7IWZpZWxkTWFwLnRpdGxlICYmIChmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgP1xuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwidHJlZS1zZWxlY3RcIiBkYXRhLWZpZWxkPVwidGl0bGVcIiBvbkNsaWNrPXtvbkNsaWNrVGl0bGV9Pnt0cmFuc2xhdGlvbi50aXRsZX08L2E+IDogJyd9XG4gICAgICAgICAgICB7IWZpZWxkTWFwLmNvbnRlbnQgJiYgKGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgIT09IG51bGwgP1xuICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3NOYW1lPVwidHJlZS1zZWxlY3RcIiBkYXRhLWZpZWxkPVwiY29udGVudFwiIG9uQ2xpY2s9e29uQ2xpY2tDb250ZW50fT57dHJhbnNsYXRpb24uY29udGVudH08L2E+IDogJyd9XG4gICAgICAgIDwvbGk+KTtcbiAgICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBMaXN0SXRlbTsiLCJpbXBvcnQgRmllbGRTZWxlY3Rpb24gZnJvbSAnLi9GaWVsZFNlbGVjdGlvbic7XG5pbXBvcnQgSW5wdXRGaWVsZHMgZnJvbSAnLi9JbnB1dEZpZWxkcyc7XG5pbXBvcnQgU3VtbWFyeSBmcm9tICcuL1N1bW1hcnknO1xuXG5jbGFzcyBTZXR0aW5ncyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHVybDogJycsXG4gICAgICAgICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICAgICAgICBlcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICAgIGZpZWxkTWFwOiB7XG4gICAgICAgICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5pbml0T3B0aW9ucygpO1xuICAgIH1cblxuICAgIGluaXRPcHRpb25zKCkge1xuICAgICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB1cmxDaGFuZ2UoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7dXJsOiBldmVudC50YXJnZXQudmFsdWV9KTtcbiAgICB9XG5cbiAgICBoYW5kbGVTdWJtaXQoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7c2hvd0ZpZWxkU2VsZWN0aW9uOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsIHVybDogJycsIGZpZWxkTWFwOiB7aXRlbUNvbnRhaW5lcjogbnVsbCwgdGl0bGU6ICcnLCBjb250ZW50OiAnJ319KTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmllbGRNYXA6IG5ld1ZhbH0pO1xuICAgIH1cblxuICAgIHNldEVycm9yKGVycm9yKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2Vycm9yfSk7XG4gICAgfVxuXG4gICAgc2V0TG9hZGVkKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2lzTG9hZGVkOiB2YWx1ZX0pO1xuICAgIH1cblxuICAgIHNldEl0ZW1zKGl0ZW1zKSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2l0ZW1zOiBpdGVtc30pO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc3Qge3RyYW5zbGF0aW9ufSA9IHRoaXMucHJvcHM7XG4gICAgICAgIGNvbnN0IHtzaG93RmllbGRTZWxlY3Rpb24sIHVybCwgZXJyb3IsIGlzTG9hZGVkLCBpdGVtc30gPSB0aGlzLnN0YXRlO1xuICAgICAgICBjb25zdCB7aXRlbUNvbnRhaW5lciwgdGl0bGUsIGNvbnRlbnR9ID0gdGhpcy5zdGF0ZS5maWVsZE1hcDtcblxuICAgICAgICBpZiAodXJsICYmIGl0ZW1Db250YWluZXIgIT09IG51bGwgJiYgdGl0bGUgJiYgY29udGVudCkge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8U3VtbWFyeSB7Li4udGhpcy5zdGF0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb249e3RyYW5zbGF0aW9ufVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYnV0dG9uXCI+e3RyYW5zbGF0aW9uLnJlc2V0U2V0dGluZ3N9PC9hPjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxGaWVsZFNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsPXt1cmx9XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcj17ZXJyb3J9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRFcnJvcj17dGhpcy5zZXRFcnJvci5iaW5kKHRoaXMpfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXNMb2FkZWQ9e2lzTG9hZGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0TG9hZGVkPXt0aGlzLnNldExvYWRlZC5iaW5kKHRoaXMpfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM9e2l0ZW1zfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SXRlbXM9e3RoaXMuc2V0SXRlbXMuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnN0YXRlLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8cD48YSBocmVmPVwiI1wiIG9uQ2xpY2s9e3RoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJ1dHRvblwiPnt0cmFuc2xhdGlvbi5yZXNldFNldHRpbmdzfTwvYT48L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIndyYXBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e3RoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyl9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPkFQSSBVUkw8L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGk+e3RyYW5zbGF0aW9uLnZhbGlkSnNvblVybH08L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzc05hbWU9XCJ1cmwtaW5wdXRcIiB2YWx1ZT17dXJsfSBvbkNoYW5nZT17dGhpcy51cmxDaGFuZ2UuYmluZCh0aGlzKX0vPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+PGlucHV0IHR5cGU9XCJzdWJtaXRcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXByaW1hcnlcIiB2YWx1ZT17dHJhbnNsYXRpb24uc2VuZFJlcXVlc3R9Lz48L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU2V0dGluZ3M7IiwiY29uc3QgU3VtbWFyeSA9ICh7dXJsLCBmaWVsZE1hcCwgdHJhbnNsYXRpb259KSA9PlxuICAgIDxkaXY+XG4gICAgICAgIDxwPlxuICAgICAgICAgICAgPHN0cm9uZz5BUEkgVVJMPC9zdHJvbmc+PGJyLz5cbiAgICAgICAgICAgIDxhIGhyZWY9e3VybH0gdGFyZ2V0PVwiX2JsYW5rXCI+e3VybH08L2E+XG4gICAgICAgIDwvcD5cbiAgICAgICAgPHA+XG4gICAgICAgICAgICA8c3Ryb25nPnt0cmFuc2xhdGlvbi50aXRsZX08L3N0cm9uZz48YnIvPlxuICAgICAgICAgICAge2ZpZWxkTWFwLnRpdGxlLnJlcGxhY2UoJy4nLCAnIOKAkz4gJyl9XG4gICAgICAgIDwvcD5cbiAgICAgICAgPHA+XG4gICAgICAgICAgICA8c3Ryb25nPnt0cmFuc2xhdGlvbi5jb250ZW50fTwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICB7ZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpfVxuICAgICAgICA8L3A+XG4gICAgPC9kaXY+O1xuXG5leHBvcnQgZGVmYXVsdCBTdW1tYXJ5OyIsIi8vIFBvbHlmaWxsc1xuaW1wb3J0ICdlczYtcHJvbWlzZSc7XG5pbXBvcnQgJ2lzb21vcnBoaWMtZmV0Y2gnO1xuLy8gQ29tcG9uZW50c1xuaW1wb3J0IFNldHRpbmdzIGZyb20gJy4vQ29tcG9uZW50cy9TZXR0aW5ncyc7XG5cbmNvbnN0IG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xuY29uc3QgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcbmNvbnN0IHt0cmFuc2xhdGlvbn0gPSBtb2RKc29uUmVuZGVyO1xuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPFNldHRpbmdzIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn0gLz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vc3RlZmFucGVubmVyL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIHY0LjIuNSs3ZjJiNTI2ZFxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcblx0KGdsb2JhbC5FUzZQcm9taXNlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgeDtcbiAgcmV0dXJuIHggIT09IG51bGwgJiYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuXG5cblxudmFyIF9pc0FycmF5ID0gdm9pZCAwO1xuaWYgKEFycmF5LmlzQXJyYXkpIHtcbiAgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufSBlbHNlIHtcbiAgX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59XG5cbnZhciBpc0FycmF5ID0gX2lzQXJyYXk7XG5cbnZhciBsZW4gPSAwO1xudmFyIHZlcnR4TmV4dCA9IHZvaWQgMDtcbnZhciBjdXN0b21TY2hlZHVsZXJGbiA9IHZvaWQgMDtcblxudmFyIGFzYXAgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgbGVuICs9IDI7XG4gIGlmIChsZW4gPT09IDIpIHtcbiAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgaWYgKGN1c3RvbVNjaGVkdWxlckZuKSB7XG4gICAgICBjdXN0b21TY2hlZHVsZXJGbihmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gIGN1c3RvbVNjaGVkdWxlckZuID0gc2NoZWR1bGVGbjtcbn1cblxuZnVuY3Rpb24gc2V0QXNhcChhc2FwRm4pIHtcbiAgYXNhcCA9IGFzYXBGbjtcbn1cblxudmFyIGJyb3dzZXJXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbnZhciBicm93c2VyR2xvYmFsID0gYnJvd3NlcldpbmRvdyB8fCB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgaXNOb2RlID0gdHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbi8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG52YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuLy8gdmVydHhcbmZ1bmN0aW9uIHVzZVZlcnR4VGltZXIoKSB7XG4gIGlmICh0eXBlb2YgdmVydHhOZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2ZXJ0eE5leHQoZmx1c2gpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIG5vZGUuZGF0YSA9IGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyO1xuICB9O1xufVxuXG4vLyB3ZWIgd29ya2VyXG5mdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gZXM2LXByb21pc2Ugd2lsbCBiZSB1bmFmZmVjdGVkIGJ5XG4gIC8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxuICB2YXIgZ2xvYmFsU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG5cbiAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gYXR0ZW1wdFZlcnR4KCkge1xuICB0cnkge1xuICAgIHZhciB2ZXJ0eCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCkucmVxdWlyZSgndmVydHgnKTtcbiAgICB2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgIHJldHVybiB1c2VWZXJ0eFRpbWVyKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xuICB9XG59XG5cbnZhciBzY2hlZHVsZUZsdXNoID0gdm9pZCAwO1xuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmIChpc05vZGUpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG59IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG59IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xufSBlbHNlIGlmIChicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IGF0dGVtcHRWZXJ0eCgpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gdGhlbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgcGFyZW50ID0gdGhpcztcblxuICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihub29wKTtcblxuICBpZiAoY2hpbGRbUFJPTUlTRV9JRF0gPT09IHVuZGVmaW5lZCkge1xuICAgIG1ha2VQcm9taXNlKGNoaWxkKTtcbiAgfVxuXG4gIHZhciBfc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG5cbiAgaWYgKF9zdGF0ZSkge1xuICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tfc3RhdGUgLSAxXTtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBpbnZva2VDYWxsYmFjayhfc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcGFyZW50Ll9yZXN1bHQpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yZXNvbHZlYCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlc29sdmVkIHdpdGggdGhlXG4gIHBhc3NlZCBgdmFsdWVgLiBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVzb2x2ZSgxKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoMSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZXNvbHZlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBbnl9IHZhbHVlIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgZnVsZmlsbGVkIHdpdGggdGhlIGdpdmVuXG4gIGB2YWx1ZWBcbiovXG5mdW5jdGlvbiByZXNvbHZlJDEob2JqZWN0KSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICByZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG52YXIgUFJPTUlTRV9JRCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnZhciBQRU5ESU5HID0gdm9pZCAwO1xudmFyIEZVTEZJTExFRCA9IDE7XG52YXIgUkVKRUNURUQgPSAyO1xuXG52YXIgVFJZX0NBVENIX0VSUk9SID0geyBlcnJvcjogbnVsbCB9O1xuXG5mdW5jdGlvbiBzZWxmRnVsZmlsbG1lbnQoKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbn1cblxuZnVuY3Rpb24gY2Fubm90UmV0dXJuT3duKCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKHByb21pc2UpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5VGhlbih0aGVuJCQxLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gIHRyeSB7XG4gICAgdGhlbiQkMS5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuJCQxKSB7XG4gIGFzYXAoZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgdmFyIGVycm9yID0gdHJ5VGhlbih0aGVuJCQxLCB0aGVuYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIH1cbiAgfSwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IEZVTEZJTExFRCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSBpZiAodGhlbmFibGUuX3N0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkMSkge1xuICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3RvciAmJiB0aGVuJCQxID09PSB0aGVuICYmIG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IucmVzb2x2ZSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoZW4kJDEgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgcmVqZWN0KHByb21pc2UsIFRSWV9DQVRDSF9FUlJPUi5lcnJvcik7XG4gICAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhlbiQkMSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih0aGVuJCQxKSkge1xuICAgICAgaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBzZWxmRnVsZmlsbG1lbnQoKSk7XG4gIH0gZWxzZSBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlLCBnZXRUaGVuKHZhbHVlKSk7XG4gIH0gZWxzZSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICB9XG5cbiAgcHVibGlzaChwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQ7XG5cbiAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCAhPT0gMCkge1xuICAgIGFzYXAocHVibGlzaCwgcHJvbWlzZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBSRUpFQ1RFRDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gIGFzYXAocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgX3N1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgdmFyIGxlbmd0aCA9IF9zdWJzY3JpYmVycy5sZW5ndGg7XG5cblxuICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gIF9zdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSA9IG9uUmVqZWN0aW9uO1xuXG4gIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgIGFzYXAocHVibGlzaCwgcGFyZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoKHByb21pc2UpIHtcbiAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBjaGlsZCA9IHZvaWQgMCxcbiAgICAgIGNhbGxiYWNrID0gdm9pZCAwLFxuICAgICAgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgaWYgKGNoaWxkKSB7XG4gICAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgfVxuICB9XG5cbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbn1cblxuZnVuY3Rpb24gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICB0cnkge1xuICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICByZXR1cm4gVFJZX0NBVENIX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdmFyIGhhc0NhbGxiYWNrID0gaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICB2YWx1ZSA9IHZvaWQgMCxcbiAgICAgIGVycm9yID0gdm9pZCAwLFxuICAgICAgc3VjY2VlZGVkID0gdm9pZCAwLFxuICAgICAgZmFpbGVkID0gdm9pZCAwO1xuXG4gIGlmIChoYXNDYWxsYmFjaykge1xuICAgIHZhbHVlID0gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICBpZiAodmFsdWUgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICB2YWx1ZS5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgLy8gbm9vcFxuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBlKTtcbiAgfVxufVxuXG52YXIgaWQgPSAwO1xuZnVuY3Rpb24gbmV4dElkKCkge1xuICByZXR1cm4gaWQrKztcbn1cblxuZnVuY3Rpb24gbWFrZVByb21pc2UocHJvbWlzZSkge1xuICBwcm9taXNlW1BST01JU0VfSURdID0gaWQrKztcbiAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKCkge1xuICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbn1cblxudmFyIEVudW1lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcblxuICAgIGlmICghdGhpcy5wcm9taXNlW1BST01JU0VfSURdKSB7XG4gICAgICBtYWtlUHJvbWlzZSh0aGlzLnByb21pc2UpO1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG5cbiAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgdGhpcy5fZW51bWVyYXRlKGlucHV0KTtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCh0aGlzLnByb21pc2UsIHZhbGlkYXRpb25FcnJvcigpKTtcbiAgICB9XG4gIH1cblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24gX2VudW1lcmF0ZShpbnB1dCkge1xuICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLl9zdGF0ZSA9PT0gUEVORElORyAmJiBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbiBfZWFjaEVudHJ5KGVudHJ5LCBpKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgIHZhciByZXNvbHZlJCQxID0gYy5yZXNvbHZlO1xuXG5cbiAgICBpZiAocmVzb2x2ZSQkMSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgICB2YXIgX3RoZW4gPSBnZXRUaGVuKGVudHJ5KTtcblxuICAgICAgaWYgKF90aGVuID09PSB0aGVuICYmIGVudHJ5Ll9zdGF0ZSAhPT0gUEVORElORykge1xuICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIF90aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gUHJvbWlzZSQxKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobm9vcCk7XG4gICAgICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgZW50cnksIF90aGVuKTtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHByb21pc2UsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KG5ldyBjKGZ1bmN0aW9uIChyZXNvbHZlJCQxKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUkJDEoZW50cnkpO1xuICAgICAgICB9KSwgaSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlJCQxKGVudHJ5KSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbiBfc2V0dGxlZEF0KHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG5cbiAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbiBfd2lsbFNldHRsZUF0KHByb21pc2UsIGkpIHtcbiAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICBzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gRW51bWVyYXRvcjtcbn0oKTtcblxuLyoqXG4gIGBQcm9taXNlLmFsbGAgYWNjZXB0cyBhbiBhcnJheSBvZiBwcm9taXNlcywgYW5kIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaFxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSBvZiBmdWxmaWxsbWVudCB2YWx1ZXMgZm9yIHRoZSBwYXNzZWQgcHJvbWlzZXMsIG9yXG4gIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiBvZiB0aGUgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQuIEl0IGNhc3RzIGFsbFxuICBlbGVtZW50cyBvZiB0aGUgcGFzc2VkIGl0ZXJhYmxlIHRvIHByb21pc2VzIGFzIGl0IHJ1bnMgdGhpcyBhbGdvcml0aG0uXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlc29sdmUoMik7XG4gIGxldCBwcm9taXNlMyA9IHJlc29sdmUoMyk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgbGV0IHByb21pc2UzID0gcmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gZW50cmllcyBhcnJheSBvZiBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBsYWJlbGluZyB0aGUgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuICBAc3RhdGljXG4qL1xuZnVuY3Rpb24gYWxsKGVudHJpZXMpIHtcbiAgcmV0dXJuIG5ldyBFbnVtZXJhdG9yKHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yYWNlYCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2ggaXMgc2V0dGxlZCBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlXG4gIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIHNldHRsZS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMicpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFByb21pc2UucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdFxuICBzZXR0bGVkIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlXG4gIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IHNldHRsZWQgcHJvbWlzZSBoYXNcbiAgYmVjb21lIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gIHByb21pc2Ugd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcigncHJvbWlzZSAyJykpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQW4gZXhhbXBsZSByZWFsLXdvcmxkIHVzZSBjYXNlIGlzIGltcGxlbWVudGluZyB0aW1lb3V0czpcblxuICBgYGBqYXZhc2NyaXB0XG4gIFByb21pc2UucmFjZShbYWpheCgnZm9vLmpzb24nKSwgdGltZW91dCg1MDAwKV0pXG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2Ugd2hpY2ggc2V0dGxlcyBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlIGZpcnN0IHBhc3NlZFxuICBwcm9taXNlIHRvIHNldHRsZS5cbiovXG5mdW5jdGlvbiByYWNlKGVudHJpZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkoZW50cmllcykpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkIGByZWFzb25gLlxuICBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlbiBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QkMShyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbmVlZHNSZXNvbHZlcigpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xufVxuXG5mdW5jdGlvbiBuZWVkc05ldygpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbn1cblxuLyoqXG4gIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gIFRlcm1pbm9sb2d5XG4gIC0tLS0tLS0tLS0tXG5cbiAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgQmFzaWMgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLVxuXG4gIGBgYGpzXG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgLy8gb24gc3VjY2Vzc1xuICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgLy8gb24gZmFpbHVyZVxuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIEFkdmFuY2VkIFVzYWdlOlxuICAtLS0tLS0tLS0tLS0tLS1cblxuICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICBgYGBqc1xuICBQcm9taXNlLmFsbChbXG4gICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9KTtcbiAgYGBgXG5cbiAgQGNsYXNzIFByb21pc2VcbiAgQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZXJcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAY29uc3RydWN0b3JcbiovXG5cbnZhciBQcm9taXNlJDEgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICB0aGlzW1BST01JU0VfSURdID0gbmV4dElkKCk7XG4gICAgdGhpcy5fcmVzdWx0ID0gdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgIGlmIChub29wICE9PSByZXNvbHZlcikge1xuICAgICAgdHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nICYmIG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgIHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlID8gaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpIDogbmVlZHNOZXcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gIH0pO1xuICBgYGBcbiAgIENoYWluaW5nXG4gIC0tLS0tLS0tXG4gICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gIH0pO1xuICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgfSk7XG4gIGBgYFxuICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgQXNzaW1pbGF0aW9uXG4gIC0tLS0tLS0tLS0tLVxuICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gIH0pO1xuICBgYGBcbiAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgU2ltcGxlIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IHJlc3VsdDtcbiAgIHRyeSB7XG4gICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgIGlmIChlcnIpIHtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3VjY2Vzc1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuICAgUHJvbWlzZSBFeGFtcGxlO1xuICAgYGBgamF2YXNjcmlwdFxuICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBmYWlsdXJlXG4gIH0pO1xuICBgYGBcbiAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IGF1dGhvciwgYm9va3M7XG4gICB0cnkge1xuICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG4gICB9XG4gICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuICAgfVxuICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICB9XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRBdXRob3IoKS5cbiAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgIC8vIGZvdW5kIGJvb2tzXG4gIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICAgQG1ldGhvZCB0aGVuXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG4gIC8qKlxuICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gIH1cbiAgLy8gc3luY2hyb25vdXNcbiAgdHJ5IHtcbiAgZmluZEF1dGhvcigpO1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9XG4gIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH0pO1xuICBgYGBcbiAgQG1ldGhvZCBjYXRjaFxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cblxuICBQcm9taXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIF9jYXRjaChvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgIGBmaW5hbGx5YCB3aWxsIGJlIGludm9rZWQgcmVnYXJkbGVzcyBvZiB0aGUgcHJvbWlzZSdzIGZhdGUganVzdCBhcyBuYXRpdmVcbiAgICB0cnkvY2F0Y2gvZmluYWxseSBiZWhhdmVzXG4gIFxuICAgIFN5bmNocm9ub3VzIGV4YW1wbGU6XG4gIFxuICAgIGBgYGpzXG4gICAgZmluZEF1dGhvcigpIHtcbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBdXRob3IoKTtcbiAgICB9XG4gIFxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZmluZEF1dGhvcigpOyAvLyBzdWNjZWVkIG9yIGZhaWxcbiAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmluZE90aGVyQXV0aGVyKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIGFsd2F5cyBydW5zXG4gICAgICAvLyBkb2Vzbid0IGFmZmVjdCB0aGUgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAgIGBgYFxuICBcbiAgICBBc3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9KS5maW5hbGx5KGZ1bmN0aW9uKCl7XG4gICAgICAvLyBhdXRob3Igd2FzIGVpdGhlciBmb3VuZCwgb3Igbm90XG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEBtZXRob2QgZmluYWxseVxuICAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmZpbmFsbHkgPSBmdW5jdGlvbiBfZmluYWxseShjYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm9taXNlLmNvbnN0cnVjdG9yO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aHJvdyByZWFzb247XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2UudGhlbihjYWxsYmFjaywgY2FsbGJhY2spO1xuICB9O1xuXG4gIHJldHVybiBQcm9taXNlO1xufSgpO1xuXG5Qcm9taXNlJDEucHJvdG90eXBlLnRoZW4gPSB0aGVuO1xuUHJvbWlzZSQxLmFsbCA9IGFsbDtcblByb21pc2UkMS5yYWNlID0gcmFjZTtcblByb21pc2UkMS5yZXNvbHZlID0gcmVzb2x2ZSQxO1xuUHJvbWlzZSQxLnJlamVjdCA9IHJlamVjdCQxO1xuUHJvbWlzZSQxLl9zZXRTY2hlZHVsZXIgPSBzZXRTY2hlZHVsZXI7XG5Qcm9taXNlJDEuX3NldEFzYXAgPSBzZXRBc2FwO1xuUHJvbWlzZSQxLl9hc2FwID0gYXNhcDtcblxuLypnbG9iYWwgc2VsZiovXG5mdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgdmFyIGxvY2FsID0gdm9pZCAwO1xuXG4gIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gZ2xvYmFsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gc2VsZjtcbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncG9seWZpbGwgZmFpbGVkIGJlY2F1c2UgZ2xvYmFsIG9iamVjdCBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gIGlmIChQKSB7XG4gICAgdmFyIHByb21pc2VUb1N0cmluZyA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHByb21pc2VUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChQLnJlc29sdmUoKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gc2lsZW50bHkgaWdub3JlZFxuICAgIH1cblxuICAgIGlmIChwcm9taXNlVG9TdHJpbmcgPT09ICdbb2JqZWN0IFByb21pc2VdJyAmJiAhUC5jYXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgbG9jYWwuUHJvbWlzZSA9IFByb21pc2UkMTtcbn1cblxuLy8gU3RyYW5nZSBjb21wYXQuLlxuUHJvbWlzZSQxLnBvbHlmaWxsID0gcG9seWZpbGw7XG5Qcm9taXNlJDEuUHJvbWlzZSA9IFByb21pc2UkMTtcblxucmV0dXJuIFByb21pc2UkMTtcblxufSkpKTtcblxuXG5cblxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuXG59LHtcIl9wcm9jZXNzXCI6NH1dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLy8gdGhlIHdoYXR3Zy1mZXRjaCBwb2x5ZmlsbCBpbnN0YWxscyB0aGUgZmV0Y2goKSBmdW5jdGlvblxuLy8gb24gdGhlIGdsb2JhbCBvYmplY3QgKHdpbmRvdyBvciBzZWxmKVxuLy9cbi8vIFJldHVybiB0aGF0IGFzIHRoZSBleHBvcnQgZm9yIHVzZSBpbiBXZWJwYWNrLCBCcm93c2VyaWZ5IGV0Yy5cbnJlcXVpcmUoJ3doYXR3Zy1mZXRjaCcpO1xubW9kdWxlLmV4cG9ydHMgPSBzZWxmLmZldGNoLmJpbmQoc2VsZik7XG5cbn0se1wid2hhdHdnLWZldGNoXCI6N31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG5cbn0se31dLDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnXG5cbmNvbnN0IHtpc09iamVjdCwgZ2V0S2V5c30gPSByZXF1aXJlKCcuL2xhbmcnKVxuXG4vLyBQUklWQVRFIFBST1BFUlRJRVNcbmNvbnN0IEJZUEFTU19NT0RFID0gJ19fYnlwYXNzTW9kZSdcbmNvbnN0IElHTk9SRV9DSVJDVUxBUiA9ICdfX2lnbm9yZUNpcmN1bGFyJ1xuY29uc3QgTUFYX0RFRVAgPSAnX19tYXhEZWVwJ1xuY29uc3QgQ0FDSEUgPSAnX19jYWNoZSdcbmNvbnN0IFFVRVVFID0gJ19fcXVldWUnXG5jb25zdCBTVEFURSA9ICdfX3N0YXRlJ1xuXG5jb25zdCBFTVBUWV9TVEFURSA9IHt9XG5cbmNsYXNzIFJlY3Vyc2l2ZUl0ZXJhdG9yIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSByb290XG4gICAqIEBwYXJhbSB7TnVtYmVyfSBbYnlwYXNzTW9kZT0wXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtpZ25vcmVDaXJjdWxhcj1mYWxzZV1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFttYXhEZWVwPTEwMF1cbiAgICovXG4gIGNvbnN0cnVjdG9yIChyb290LCBieXBhc3NNb2RlID0gMCwgaWdub3JlQ2lyY3VsYXIgPSBmYWxzZSwgbWF4RGVlcCA9IDEwMCkge1xuICAgIHRoaXNbQllQQVNTX01PREVdID0gYnlwYXNzTW9kZVxuICAgIHRoaXNbSUdOT1JFX0NJUkNVTEFSXSA9IGlnbm9yZUNpcmN1bGFyXG4gICAgdGhpc1tNQVhfREVFUF0gPSBtYXhEZWVwXG4gICAgdGhpc1tDQUNIRV0gPSBbXVxuICAgIHRoaXNbUVVFVUVdID0gW11cbiAgICB0aGlzW1NUQVRFXSA9IHRoaXMuZ2V0U3RhdGUodW5kZWZpbmVkLCByb290KVxuICB9XG4gIC8qKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgbmV4dCAoKSB7XG4gICAgY29uc3Qge25vZGUsIHBhdGgsIGRlZXB9ID0gdGhpc1tTVEFURV0gfHwgRU1QVFlfU1RBVEVcblxuICAgIGlmICh0aGlzW01BWF9ERUVQXSA+IGRlZXApIHtcbiAgICAgIGlmICh0aGlzLmlzTm9kZShub2RlKSkge1xuICAgICAgICBpZiAodGhpcy5pc0NpcmN1bGFyKG5vZGUpKSB7XG4gICAgICAgICAgaWYgKHRoaXNbSUdOT1JFX0NJUkNVTEFSXSkge1xuICAgICAgICAgICAgLy8gc2tpcFxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NpcmN1bGFyIHJlZmVyZW5jZScpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0aGlzLm9uU3RlcEludG8odGhpc1tTVEFURV0pKSB7XG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdG9ycyA9IHRoaXMuZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzKG5vZGUsIHBhdGgsIGRlZXApXG4gICAgICAgICAgICBjb25zdCBtZXRob2QgPSB0aGlzW0JZUEFTU19NT0RFXSA/ICdwdXNoJyA6ICd1bnNoaWZ0J1xuICAgICAgICAgICAgdGhpc1tRVUVVRV1bbWV0aG9kXSguLi5kZXNjcmlwdG9ycylcbiAgICAgICAgICAgIHRoaXNbQ0FDSEVdLnB1c2gobm9kZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IHRoaXNbUVVFVUVdLnNoaWZ0KClcbiAgICBjb25zdCBkb25lID0gIXZhbHVlXG5cbiAgICB0aGlzW1NUQVRFXSA9IHZhbHVlXG5cbiAgICBpZiAoZG9uZSkgdGhpcy5kZXN0cm95KClcblxuICAgIHJldHVybiB7dmFsdWUsIGRvbmV9XG4gIH1cbiAgLyoqXG4gICAqXG4gICAqL1xuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzW1FVRVVFXS5sZW5ndGggPSAwXG4gICAgdGhpc1tDQUNIRV0ubGVuZ3RoID0gMFxuICAgIHRoaXNbU1RBVEVdID0gbnVsbFxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzTm9kZSAoYW55KSB7XG4gICAgcmV0dXJuIGlzT2JqZWN0KGFueSlcbiAgfVxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhbnlcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBpc0xlYWYgKGFueSkge1xuICAgIHJldHVybiAhdGhpcy5pc05vZGUoYW55KVxuICB9XG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFueVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGlzQ2lyY3VsYXIgKGFueSkge1xuICAgIHJldHVybiB0aGlzW0NBQ0hFXS5pbmRleE9mKGFueSkgIT09IC0xXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGVzIG9mIGNoaWxkIG5vZGVzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhdGhcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlZXBcbiAgICogQHJldHVybnMge0FycmF5PE9iamVjdD59XG4gICAqL1xuICBnZXRTdGF0ZXNPZkNoaWxkTm9kZXMgKG5vZGUsIHBhdGgsIGRlZXApIHtcbiAgICByZXR1cm4gZ2V0S2V5cyhub2RlKS5tYXAoa2V5ID0+XG4gICAgICB0aGlzLmdldFN0YXRlKG5vZGUsIG5vZGVba2V5XSwga2V5LCBwYXRoLmNvbmNhdChrZXkpLCBkZWVwICsgMSlcbiAgICApXG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgc3RhdGUgb2Ygbm9kZS4gQ2FsbHMgZm9yIGVhY2ggbm9kZVxuICAgKiBAcGFyYW0ge09iamVjdH0gW3BhcmVudF1cbiAgICogQHBhcmFtIHsqfSBbbm9kZV1cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXldXG4gICAqIEBwYXJhbSB7QXJyYXl9IFtwYXRoXVxuICAgKiBAcGFyYW0ge051bWJlcn0gW2RlZXBdXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBnZXRTdGF0ZSAocGFyZW50LCBub2RlLCBrZXksIHBhdGggPSBbXSwgZGVlcCA9IDApIHtcbiAgICByZXR1cm4ge3BhcmVudCwgbm9kZSwga2V5LCBwYXRoLCBkZWVwfVxuICB9XG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvblN0ZXBJbnRvIChzdGF0ZSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtSZWN1cnNpdmVJdGVyYXRvcn1cbiAgICovXG4gIFtTeW1ib2wuaXRlcmF0b3JdICgpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjdXJzaXZlSXRlcmF0b3JcblxufSx7XCIuL2xhbmdcIjo2fV0sNjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCdcbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCAoYW55KSB7XG4gIHJldHVybiBhbnkgIT09IG51bGwgJiYgdHlwZW9mIGFueSA9PT0gJ29iamVjdCdcbn1cbi8qKlxuICogQHBhcmFtIHsqfSBhbnlcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5jb25zdCB7aXNBcnJheX0gPSBBcnJheVxuLyoqXG4gKiBAcGFyYW0geyp9IGFueVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlIChhbnkpIHtcbiAgaWYgKCFpc09iamVjdChhbnkpKSByZXR1cm4gZmFsc2VcbiAgaWYgKCEoJ2xlbmd0aCcgaW4gYW55KSkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGxlbmd0aCA9IGFueS5sZW5ndGhcbiAgaWYgKCFpc051bWJlcihsZW5ndGgpKSByZXR1cm4gZmFsc2VcbiAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gKGxlbmd0aCAtIDEpIGluIGFueVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGFueSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG59XG4vKipcbiAqIEBwYXJhbSB7Kn0gYW55XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIgKGFueSkge1xuICByZXR1cm4gdHlwZW9mIGFueSA9PT0gJ251bWJlcidcbn1cbi8qKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iamVjdFxuICogQHJldHVybnMge0FycmF5PFN0cmluZz59XG4gKi9cbmZ1bmN0aW9uIGdldEtleXMgKG9iamVjdCkge1xuICBjb25zdCBrZXlzXyA9IE9iamVjdC5rZXlzKG9iamVjdClcbiAgaWYgKGlzQXJyYXkob2JqZWN0KSkge1xuICAgIC8vIHNraXAgc29ydFxuICB9IGVsc2UgaWYgKGlzQXJyYXlMaWtlKG9iamVjdCkpIHtcbiAgICBjb25zdCBpbmRleCA9IGtleXNfLmluZGV4T2YoJ2xlbmd0aCcpXG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIGtleXNfLnNwbGljZShpbmRleCwgMSlcbiAgICB9XG4gICAgLy8gc2tpcCBzb3J0XG4gIH0gZWxzZSB7XG4gICAgLy8gc29ydFxuICAgIGtleXNfLnNvcnQoKVxuICB9XG4gIHJldHVybiBrZXlzX1xufVxuXG5leHBvcnRzLmdldEtleXMgPSBnZXRLZXlzXG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5XG5leHBvcnRzLmlzQXJyYXlMaWtlID0gaXNBcnJheUxpa2VcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdFxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyXG5cbn0se31dLDc6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF1cblxuICAgIHZhciBpc0RhdGFWaWV3ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShoZWFkZXJzKSkge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgICB0aGlzLmFwcGVuZChoZWFkZXJbMF0sIGhlYWRlclsxXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5tYXBbbmFtZV1cbiAgICB0aGlzLm1hcFtuYW1lXSA9IG9sZFZhbHVlID8gb2xkVmFsdWUrJywnK3ZhbHVlIDogdmFsdWVcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHJldHVybiB0aGlzLmhhcyhuYW1lKSA/IHRoaXMubWFwW25hbWVdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1hcCkge1xuICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5tYXBbbmFtZV0sIG5hbWUsIHRoaXMpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pXG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKVxuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSlcbiAgICAgIHJldHVybiB2aWV3LmJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKVxuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIChBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSB8fCBpc0FycmF5QnVmZmVyVmlldyhib2R5KSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBjb25zdW1lZCh0aGlzKSB8fCBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUFycmF5QnVmZmVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keVxuXG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybFxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzXG4gICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbnB1dC5oZWFkZXJzKVxuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2RcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGVcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0XG4gICAgICAgIGlucHV0LmJvZHlVc2VkID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVybCA9IFN0cmluZyhpbnB1dClcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gJ3N0YXR1cycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzIDogMjAwXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcblxufSx7fV0sODpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9MaXN0SXRlbSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vTGlzdEl0ZW1cIikpO1xuXG52YXIgX3JlY3Vyc2l2ZUl0ZXJhdG9yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwicmVjdXJzaXZlLWl0ZXJhdG9yXCIpKTtcblxudmFyIF9vYmplY3RQYXRoID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwib2JqZWN0LXBhdGhcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfcmVhZE9ubHlFcnJvcihuYW1lKSB7IHRocm93IG5ldyBFcnJvcihcIlxcXCJcIiArIG5hbWUgKyBcIlxcXCIgaXMgcmVhZC1vbmx5XCIpOyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdCgpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRGF0YUxpc3QpO1xuXG4gICAgcmV0dXJuIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0xpc3RJdGVtLmRlZmF1bHQsIHtcbiAgICAgICAgICBrZXk6IGl0ZW0udG9TdHJpbmcoKSxcbiAgICAgICAgICB2YWx1ZTogaXRlbSxcbiAgICAgICAgICBvYmplY3Q6IGRhdGFbaXRlbV0sXG4gICAgICAgICAgZmllbGRNYXA6IF90aGlzLnByb3BzLmZpZWxkTWFwLFxuICAgICAgICAgIG9uQ2xpY2tDb250YWluZXI6IGZ1bmN0aW9uIG9uQ2xpY2tDb250YWluZXIoZSkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrQ29udGVudDogZnVuY3Rpb24gb25DbGlja0NvbnRlbnQoZSkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdHJhbnNsYXRpb246IF90aGlzLnByb3BzLnRyYW5zbGF0aW9uXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChfdHlwZW9mKGRhdGFbaXRlbV0pID09PSAnb2JqZWN0JyAmJiBkYXRhW2l0ZW1dICE9PSBudWxsKSB7XG4gICAgICAgICAgY2hpbGQgPSBSZWFjdC5jbG9uZUVsZW1lbnQoY2hpbGQsIHtcbiAgICAgICAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KGRhdGFbaXRlbV0pID8gX3RoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiBfdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkcHJvcHMgPSB0aGlzLnByb3BzLFxuICAgICAgICAgIHRyYW5zbGF0aW9uID0gX3RoaXMkcHJvcHMudHJhbnNsYXRpb24sXG4gICAgICAgICAgZGF0YSA9IF90aGlzJHByb3BzLmRhdGE7XG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICB9XG5cbiAgICAgIGlmIChmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgZGF0YSA9IChfcmVhZE9ubHlFcnJvcihcImRhdGFcIiksIGRhdGFbMF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlO1xuICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gbmV3IF9yZWN1cnNpdmVJdGVyYXRvci5kZWZhdWx0KGRhdGEpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IChfc3RlcCA9IF9pdGVyYXRvci5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwJHZhbHVlID0gX3N0ZXAudmFsdWUsXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gX3N0ZXAkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcCR2YWx1ZS5ub2RlLFxuICAgICAgICAgICAgICAgIGtleSA9IF9zdGVwJHZhbHVlLmtleSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3N0ZXAkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdmFyIHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcblxuICAgICAgICAgICAgICBfb2JqZWN0UGF0aC5kZWZhdWx0LnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvciA9IHRydWU7XG4gICAgICAgICAgX2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgX2l0ZXJhdG9yLnJldHVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImgzXCIsIG51bGwsIHRyYW5zbGF0aW9uLnNlbGVjdEl0ZW1zQ29udGFpbmVyKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwianNvbi10cmVlXCJcbiAgICAgICAgfSwgdGhpcy5yZW5kZXJOb2RlcyhkYXRhKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG9iamVjdERhdGEgPSBfb2JqZWN0UGF0aC5kZWZhdWx0LmdldChkYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3REYXRhKSkge1xuICAgICAgICAgIG9iamVjdERhdGEgPSBvYmplY3REYXRhWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yMiA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChvYmplY3REYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwMiR2YWx1ZSA9IF9zdGVwMi52YWx1ZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBfc3RlcDIkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcDIkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcDIkdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgIHBhdGggPSBfc3RlcDIkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHZhciBfcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuXG4gICAgICAgICAgICAgIF9vYmplY3RQYXRoLmRlZmF1bHQuc2V0KG9iamVjdERhdGEsIF9wYXRoU3RyaW5nLCBfcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yMiA9IGVycjtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvcjIucmV0dXJuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCB0cmFuc2xhdGlvbi5zZWxlY3RUaXRsZUNvbnRlbnQpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJqc29uLXRyZWVcIlxuICAgICAgICB9LCB0aGlzLnJlbmRlck5vZGVzKG9iamVjdERhdGEpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIERhdGFMaXN0O1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBEYXRhTGlzdDtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4vTGlzdEl0ZW1cIjoxMSxcIm9iamVjdC1wYXRoXCI6MyxcInJlY3Vyc2l2ZS1pdGVyYXRvclwiOjV9XSw5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0RhdGFMaXN0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9EYXRhTGlzdFwiKSk7XG5cbnZhciBfZ2V0QXBpRGF0YSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbnZhciBGaWVsZFNlbGVjdGlvbiA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoRmllbGRTZWxlY3Rpb24sIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIEZpZWxkU2VsZWN0aW9uKCkge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBGaWVsZFNlbGVjdGlvbik7XG5cbiAgICByZXR1cm4gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKEZpZWxkU2VsZWN0aW9uKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhGaWVsZFNlbGVjdGlvbiwgW3tcbiAgICBrZXk6IFwiY29tcG9uZW50RGlkTW91bnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICB0aGlzLmdldERhdGEoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0RGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXREYXRhKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdmFyIF90aGlzJHByb3BzID0gdGhpcy5wcm9wcyxcbiAgICAgICAgICB1cmwgPSBfdGhpcyRwcm9wcy51cmwsXG4gICAgICAgICAgdHJhbnNsYXRpb24gPSBfdGhpcyRwcm9wcy50cmFuc2xhdGlvbjtcbiAgICAgICgwLCBfZ2V0QXBpRGF0YS5kZWZhdWx0KSh1cmwpLnRoZW4oZnVuY3Rpb24gKF9yZWYpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IF9yZWYucmVzdWx0O1xuXG4gICAgICAgIGlmICghcmVzdWx0IHx8IE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXMucHJvcHMuc2V0RXJyb3IoRXJyb3IodHJhbnNsYXRpb24uY291bGROb3RGZXRjaCkpO1xuXG4gICAgICAgICAgX3RoaXMucHJvcHMuc2V0TG9hZGVkKHRydWUpO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMucHJvcHMuc2V0SXRlbXMocmVzdWx0KTtcblxuICAgICAgICBfdGhpcy5wcm9wcy5zZXRMb2FkZWQodHJ1ZSk7XG4gICAgICB9LCBmdW5jdGlvbiAoX3JlZjIpIHtcbiAgICAgICAgdmFyIGVycm9yID0gX3JlZjIuZXJyb3I7XG5cbiAgICAgICAgX3RoaXMucHJvcHMuc2V0TG9hZGVkKHRydWUpO1xuXG4gICAgICAgIF90aGlzLnByb3BzLnNldEVycm9yKGVycm9yKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkcHJvcHMyID0gdGhpcy5wcm9wcyxcbiAgICAgICAgICB1cmwgPSBfdGhpcyRwcm9wczIudXJsLFxuICAgICAgICAgIGVycm9yID0gX3RoaXMkcHJvcHMyLmVycm9yLFxuICAgICAgICAgIGZpZWxkTWFwID0gX3RoaXMkcHJvcHMyLmZpZWxkTWFwLFxuICAgICAgICAgIHRyYW5zbGF0aW9uID0gX3RoaXMkcHJvcHMyLnRyYW5zbGF0aW9uLFxuICAgICAgICAgIGlzTG9hZGVkID0gX3RoaXMkcHJvcHMyLmlzTG9hZGVkLFxuICAgICAgICAgIGl0ZW1zID0gX3RoaXMkcHJvcHMyLml0ZW1zO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJub3RpY2Ugbm90aWNlLWVycm9yIGlubGluZVwiXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIGVycm9yLm1lc3NhZ2UpKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwic3Bpbm5lciBpcy1hY3RpdmVcIlxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KF9EYXRhTGlzdC5kZWZhdWx0LCB7XG4gICAgICAgICAgZGF0YTogaXRlbXMsXG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZmllbGRNYXA6IGZpZWxkTWFwLFxuICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwOiB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyksXG4gICAgICAgICAgdHJhbnNsYXRpb246IHRyYW5zbGF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBGaWVsZFNlbGVjdGlvbjtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRmllbGRTZWxlY3Rpb247XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiOjE1LFwiLi9EYXRhTGlzdFwiOjh9XSwxMDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIElucHV0RmllbGRzID0gZnVuY3Rpb24gSW5wdXRGaWVsZHMoX3JlZikge1xuICB2YXIgZmllbGRNYXAgPSBfcmVmLmZpZWxkTWFwLFxuICAgICAgdXJsID0gX3JlZi51cmw7XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl91cmxcIixcbiAgICB2YWx1ZTogdXJsXG4gIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge1xuICAgIHR5cGU6IFwiaGlkZGVuXCIsXG4gICAgbmFtZTogXCJtb2RfanNvbl9yZW5kZXJfZmllbGRtYXBcIixcbiAgICB2YWx1ZTogSlNPTi5zdHJpbmdpZnkoZmllbGRNYXApXG4gIH0pKTtcbn07XG5cbnZhciBfZGVmYXVsdCA9IElucHV0RmllbGRzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDExOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgTGlzdEl0ZW0gPSBmdW5jdGlvbiBMaXN0SXRlbShfcmVmKSB7XG4gIHZhciB2YWx1ZSA9IF9yZWYudmFsdWUsXG4gICAgICBjaGlsZHJlbiA9IF9yZWYuY2hpbGRyZW4sXG4gICAgICBmaWVsZE1hcCA9IF9yZWYuZmllbGRNYXAsXG4gICAgICBvYmplY3QgPSBfcmVmLm9iamVjdCxcbiAgICAgIG9uQ2xpY2tUaXRsZSA9IF9yZWYub25DbGlja1RpdGxlLFxuICAgICAgb25DbGlja0NvbnRlbnQgPSBfcmVmLm9uQ2xpY2tDb250ZW50LFxuICAgICAgb25DbGlja0NvbnRhaW5lciA9IF9yZWYub25DbGlja0NvbnRhaW5lcixcbiAgICAgIHRyYW5zbGF0aW9uID0gX3JlZi50cmFuc2xhdGlvbjtcblxuICBpZiAoY2hpbGRyZW4pIHtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIG51bGwsIEFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwge1xuICAgICAgY2xhc3NOYW1lOiBcImRhc2hpY29ucyBkYXNoaWNvbnMtcG9ydGZvbGlvXCJcbiAgICB9KSwgXCIgXCIsIHZhbHVlLCBcIiBcIiwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcIml0ZW1Db250YWluZXJcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tDb250YWluZXJcbiAgICB9LCB0cmFuc2xhdGlvbi5zZWxlY3QpKSA6IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIG51bGwsIGNoaWxkcmVuKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsaVwiLCBudWxsLCBmaWVsZE1hcC50aXRsZSA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLnRpdGxlID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCB0cmFuc2xhdGlvbi50aXRsZSwgXCI6IFwiKSA6ICcnLCBmaWVsZE1hcC5jb250ZW50ID09PSBvYmplY3QgJiYgZmllbGRNYXAuY29udGVudCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgdHJhbnNsYXRpb24uY29udGVudCwgXCI6IFwiKSA6ICcnLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCB2YWx1ZSksICFmaWVsZE1hcC50aXRsZSAmJiBmaWVsZE1hcC5jb250ZW50ICE9PSBvYmplY3QgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgY2xhc3NOYW1lOiBcInRyZWUtc2VsZWN0XCIsXG4gICAgICBcImRhdGEtZmllbGRcIjogXCJ0aXRsZVwiLFxuICAgICAgb25DbGljazogb25DbGlja1RpdGxlXG4gICAgfSwgdHJhbnNsYXRpb24udGl0bGUpIDogJycsICFmaWVsZE1hcC5jb250ZW50ICYmIGZpZWxkTWFwLnRpdGxlICE9PSBvYmplY3QgJiYgZmllbGRNYXAuaXRlbUNvbnRhaW5lciAhPT0gbnVsbCA/IFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgY2xhc3NOYW1lOiBcInRyZWUtc2VsZWN0XCIsXG4gICAgICBcImRhdGEtZmllbGRcIjogXCJjb250ZW50XCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrQ29udGVudFxuICAgIH0sIHRyYW5zbGF0aW9uLmNvbnRlbnQpIDogJycpO1xuICB9XG59O1xuXG52YXIgX2RlZmF1bHQgPSBMaXN0SXRlbTtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XSwxMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9GaWVsZFNlbGVjdGlvbiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vRmllbGRTZWxlY3Rpb25cIikpO1xuXG52YXIgX0lucHV0RmllbGRzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9JbnB1dEZpZWxkc1wiKSk7XG5cbnZhciBfU3VtbWFyeSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vU3VtbWFyeVwiKSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9leHRlbmRzKCkgeyBfZXh0ZW5kcyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCkgeyBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykgeyB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldOyBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7IHRhcmdldFtrZXldID0gc291cmNlW2tleV07IH0gfSB9IHJldHVybiB0YXJnZXQ7IH07IHJldHVybiBfZXh0ZW5kcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgU2V0dGluZ3MgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKFNldHRpbmdzLCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBTZXR0aW5ncyhwcm9wcykge1xuICAgIHZhciBfdGhpcztcblxuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBTZXR0aW5ncyk7XG5cbiAgICBfdGhpcyA9IF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihTZXR0aW5ncykuY2FsbCh0aGlzLCBwcm9wcykpO1xuICAgIF90aGlzLnN0YXRlID0ge1xuICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgIHVybDogJycsXG4gICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICBlcnJvcjogbnVsbCxcbiAgICAgIGl0ZW1zOiBbXSxcbiAgICAgIGZpZWxkTWFwOiB7XG4gICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgY29udGVudDogJydcbiAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBfdGhpcztcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhTZXR0aW5ncywgW3tcbiAgICBrZXk6IFwiY29tcG9uZW50RGlkTW91bnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICB0aGlzLmluaXRPcHRpb25zKCk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcImluaXRPcHRpb25zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGluaXRPcHRpb25zKCkge1xuICAgICAgaWYgKHR5cGVvZiBtb2RKc29uUmVuZGVyLm9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gbW9kSnNvblJlbmRlci5vcHRpb25zO1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgICB1cmw6IG9wdGlvbnMudXJsID8gb3B0aW9ucy51cmwgOiAnJyxcbiAgICAgICAgICBmaWVsZE1hcDogb3B0aW9ucy5maWVsZE1hcCA/IEpTT04ucGFyc2Uob3B0aW9ucy5maWVsZE1hcCkgOiB7XG4gICAgICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgICB9LFxuICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogISFvcHRpb25zLnVybFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwidXJsQ2hhbmdlXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVybENoYW5nZShldmVudCkge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIHVybDogZXZlbnQudGFyZ2V0LnZhbHVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiaGFuZGxlU3VibWl0XCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIGhhbmRsZVN1Ym1pdChldmVudCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZXNldE9wdGlvbnNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVzZXRPcHRpb25zKGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgIHVybDogJycsXG4gICAgICAgIGZpZWxkTWFwOiB7XG4gICAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgY29udGVudDogJydcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInVwZGF0ZUZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHVwZGF0ZUZpZWxkTWFwKHZhbHVlKSB7XG4gICAgICB2YXIgbmV3VmFsID0gT2JqZWN0LmFzc2lnbih0aGlzLnN0YXRlLmZpZWxkTWFwLCB2YWx1ZSk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgZmllbGRNYXA6IG5ld1ZhbFxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInNldEVycm9yXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEVycm9yKGVycm9yKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwic2V0TG9hZGVkXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldExvYWRlZCh2YWx1ZSkge1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIGlzTG9hZGVkOiB2YWx1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInNldEl0ZW1zXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEl0ZW1zKGl0ZW1zKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgaXRlbXM6IGl0ZW1zXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwicmVuZGVyXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMucHJvcHMudHJhbnNsYXRpb247XG4gICAgICB2YXIgX3RoaXMkc3RhdGUgPSB0aGlzLnN0YXRlLFxuICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbiA9IF90aGlzJHN0YXRlLnNob3dGaWVsZFNlbGVjdGlvbixcbiAgICAgICAgICB1cmwgPSBfdGhpcyRzdGF0ZS51cmwsXG4gICAgICAgICAgZXJyb3IgPSBfdGhpcyRzdGF0ZS5lcnJvcixcbiAgICAgICAgICBpc0xvYWRlZCA9IF90aGlzJHN0YXRlLmlzTG9hZGVkLFxuICAgICAgICAgIGl0ZW1zID0gX3RoaXMkc3RhdGUuaXRlbXM7XG4gICAgICB2YXIgX3RoaXMkc3RhdGUkZmllbGRNYXAgPSB0aGlzLnN0YXRlLmZpZWxkTWFwLFxuICAgICAgICAgIGl0ZW1Db250YWluZXIgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC5pdGVtQ29udGFpbmVyLFxuICAgICAgICAgIHRpdGxlID0gX3RoaXMkc3RhdGUkZmllbGRNYXAudGl0bGUsXG4gICAgICAgICAgY29udGVudCA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLmNvbnRlbnQ7XG5cbiAgICAgIGlmICh1cmwgJiYgaXRlbUNvbnRhaW5lciAhPT0gbnVsbCAmJiB0aXRsZSAmJiBjb250ZW50KSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX1N1bW1hcnkuZGVmYXVsdCwgX2V4dGVuZHMoe30sIHRoaXMuc3RhdGUsIHtcbiAgICAgICAgICB0cmFuc2xhdGlvbjogdHJhbnNsYXRpb25cbiAgICAgICAgfSkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgICAgIG9uQ2xpY2s6IHRoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyksXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvblwiXG4gICAgICAgIH0sIHRyYW5zbGF0aW9uLnJlc2V0U2V0dGluZ3MpKSk7XG4gICAgICB9IGVsc2UgaWYgKHNob3dGaWVsZFNlbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9GaWVsZFNlbGVjdGlvbi5kZWZhdWx0LCB7XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZXJyb3I6IGVycm9yLFxuICAgICAgICAgIHNldEVycm9yOiB0aGlzLnNldEVycm9yLmJpbmQodGhpcyksXG4gICAgICAgICAgaXNMb2FkZWQ6IGlzTG9hZGVkLFxuICAgICAgICAgIHNldExvYWRlZDogdGhpcy5zZXRMb2FkZWQuYmluZCh0aGlzKSxcbiAgICAgICAgICBpdGVtczogaXRlbXMsXG4gICAgICAgICAgc2V0SXRlbXM6IHRoaXMuc2V0SXRlbXMuYmluZCh0aGlzKSxcbiAgICAgICAgICBmaWVsZE1hcDogdGhpcy5zdGF0ZS5maWVsZE1hcCxcbiAgICAgICAgICB1cGRhdGVGaWVsZE1hcDogdGhpcy51cGRhdGVGaWVsZE1hcC5iaW5kKHRoaXMpLFxuICAgICAgICAgIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvblxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICAgICAgICBocmVmOiBcIiNcIixcbiAgICAgICAgICBvbkNsaWNrOiB0aGlzLnJlc2V0T3B0aW9ucy5iaW5kKHRoaXMpLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b25cIlxuICAgICAgICB9LCB0cmFuc2xhdGlvbi5yZXNldFNldHRpbmdzKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJ3cmFwXCJcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImZvcm1cIiwge1xuICAgICAgICAgIG9uU3VibWl0OiB0aGlzLmhhbmRsZVN1Ym1pdC5iaW5kKHRoaXMpXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiQVBJIFVSTFwiKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwgbnVsbCwgdHJhbnNsYXRpb24udmFsaWRKc29uVXJsKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgY2xhc3NOYW1lOiBcInVybC1pbnB1dFwiLFxuICAgICAgICAgIHZhbHVlOiB1cmwsXG4gICAgICAgICAgb25DaGFuZ2U6IHRoaXMudXJsQ2hhbmdlLmJpbmQodGhpcylcbiAgICAgICAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgICAgICAgdHlwZTogXCJzdWJtaXRcIixcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uIGJ1dHRvbi1wcmltYXJ5XCIsXG4gICAgICAgICAgdmFsdWU6IHRyYW5zbGF0aW9uLnNlbmRSZXF1ZXN0XG4gICAgICAgIH0pKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1dKTtcblxuICByZXR1cm4gU2V0dGluZ3M7XG59KFJlYWN0LkNvbXBvbmVudCk7XG5cbnZhciBfZGVmYXVsdCA9IFNldHRpbmdzO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se1wiLi9GaWVsZFNlbGVjdGlvblwiOjksXCIuL0lucHV0RmllbGRzXCI6MTAsXCIuL1N1bW1hcnlcIjoxM31dLDEzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgU3VtbWFyeSA9IGZ1bmN0aW9uIFN1bW1hcnkoX3JlZikge1xuICB2YXIgdXJsID0gX3JlZi51cmwsXG4gICAgICBmaWVsZE1hcCA9IF9yZWYuZmllbGRNYXAsXG4gICAgICB0cmFuc2xhdGlvbiA9IF9yZWYudHJhbnNsYXRpb247XG4gIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJBUEkgVVJMXCIpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnJcIiwgbnVsbCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJhXCIsIHtcbiAgICBocmVmOiB1cmwsXG4gICAgdGFyZ2V0OiBcIl9ibGFua1wiXG4gIH0sIHVybCkpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHRyYW5zbGF0aW9uLnRpdGxlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBmaWVsZE1hcC50aXRsZS5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCB0cmFuc2xhdGlvbi5jb250ZW50KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBmaWVsZE1hcC5jb250ZW50LnJlcGxhY2UoJy4nLCAnIOKAkz4gJykpKTtcbn07XG5cbnZhciBfZGVmYXVsdCA9IFN1bW1hcnk7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sMTQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnJlcXVpcmUoXCJlczYtcHJvbWlzZVwiKTtcblxucmVxdWlyZShcImlzb21vcnBoaWMtZmV0Y2hcIik7XG5cbnZhciBfU2V0dGluZ3MgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0NvbXBvbmVudHMvU2V0dGluZ3NcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG4vLyBQb2x5ZmlsbHNcbi8vIENvbXBvbmVudHNcbnZhciBtb2RKc29uUmVuZGVyRWxlbWVudCA9ICdtb2R1bGFyaXR5LWpzb24tcmVuZGVyJztcbnZhciBkb21FbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobW9kSnNvblJlbmRlckVsZW1lbnQpO1xudmFyIF9tb2RKc29uUmVuZGVyID0gbW9kSnNvblJlbmRlcixcbiAgICB0cmFuc2xhdGlvbiA9IF9tb2RKc29uUmVuZGVyLnRyYW5zbGF0aW9uO1xuUmVhY3RET00ucmVuZGVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoX1NldHRpbmdzLmRlZmF1bHQsIHtcbiAgdHJhbnNsYXRpb246IHRyYW5zbGF0aW9uXG59KSwgZG9tRWxlbWVudCk7XG5cbn0se1wiLi9Db21wb25lbnRzL1NldHRpbmdzXCI6MTIsXCJlczYtcHJvbWlzZVwiOjEsXCJpc29tb3JwaGljLWZldGNoXCI6Mn1dLDE1OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG5mdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICByZXR1cm4gZmV0Y2godXJsKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICByZXR1cm4gcmVzLmpzb24oKTtcbiAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgfTtcbiAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yOiBlcnJvclxuICAgIH07XG4gIH0pO1xufVxuXG52YXIgX2RlZmF1bHQgPSBnZXRBcGlEYXRhO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dfSx7fSxbMTRdKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12WlhNMkxYQnliMjFwYzJVdlpHbHpkQzlsY3pZdGNISnZiV2x6WlM1cWN5SXNJbTV2WkdWZmJXOWtkV3hsY3k5cGMyOXRiM0p3YUdsakxXWmxkR05vTDJabGRHTm9MVzV3YlMxaWNtOTNjMlZ5YVdaNUxtcHpJaXdpYm05a1pWOXRiMlIxYkdWekwyOWlhbVZqZEMxd1lYUm9MMmx1WkdWNExtcHpJaXdpYm05a1pWOXRiMlIxYkdWekwzQnliMk5sYzNNdlluSnZkM05sY2k1cWN5SXNJbTV2WkdWZmJXOWtkV3hsY3k5eVpXTjFjbk5wZG1VdGFYUmxjbUYwYjNJdmMzSmpMMUpsWTNWeWMybDJaVWwwWlhKaGRHOXlMbXB6SWl3aWJtOWtaVjl0YjJSMWJHVnpMM0psWTNWeWMybDJaUzFwZEdWeVlYUnZjaTl6Y21NdmJHRnVaeTVxY3lJc0ltNXZaR1ZmYlc5a2RXeGxjeTkzYUdGMGQyY3RabVYwWTJndlptVjBZMmd1YW5NaUxDSnpiM1Z5WTJVdmFuTXZRV1J0YVc0dlEyOXRjRzl1Wlc1MGN5OUVZWFJoVEdsemRDNXFjeUlzSW5OdmRYSmpaUzlxY3k5QlpHMXBiaTlEYjIxd2IyNWxiblJ6TDBacFpXeGtVMlZzWldOMGFXOXVMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlNXNXdkWFJHYVdWc1pITXVhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5TWFYTjBTWFJsYlM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMU5sZEhScGJtZHpMbXB6SWl3aWMyOTFjbU5sTDJwekwwRmtiV2x1TDBOdmJYQnZibVZ1ZEhNdlUzVnRiV0Z5ZVM1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOUpibVJsZUVGa2JXbHVMbXB6SWl3aWMyOTFjbU5sTDJwekwxVjBhV3hwZEdsbGN5OW5aWFJCY0dsRVlYUmhMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk96dEJRMEZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN096czdRVU12Y0VOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenRCUTA1Qk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMEZEY0ZOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPMEZEZUV4Qk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN08wRkRja2xCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3p0QlF5OUVRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3T3pzN096czdPenRCUXpkalFUczdRVUZEUVRzN1FVRkRRVHM3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN096czdTVUZGVFN4Uk96czdPenM3T3pzN096czdPMmREUVVOVkxFa3NSVUZCVFN4TExFVkJRVTg3UVVGRGNrSXNUVUZCUVN4TFFVRkxMRU5CUVVNc1kwRkJUanRCUVVOQkxGZEJRVXNzUzBGQlRDeERRVUZYTEdOQlFWZ3NjVUpCUVRSQ0xFdEJRVXNzUTBGQlF5eE5RVUZPTEVOQlFXRXNUMEZCWWl4RFFVRnhRaXhMUVVGcVJDeEZRVUY1UkN4SlFVRjZSRHRCUVVOSU96czdaME5CUlZjc1NTeEZRVUZOTzBGQlFVRTdPMEZCUTJRc1lVRkJUeXhOUVVGTkxFTkJRVU1zU1VGQlVDeERRVUZaTEVsQlFWb3NSVUZCYTBJc1IwRkJiRUlzUTBGQmMwSXNWVUZCUVN4SlFVRkpMRVZCUVVrN1FVRkRha01zV1VGQlNTeEpRVUZKTEV0QlFVc3NXVUZCWWl4RlFVRXlRanRCUVVOMlFqdEJRVU5JT3p0QlFVVkVMRmxCUVVrc1MwRkJTeXhIUVVGSExHOUNRVUZETEdsQ1FVRkVPMEZCUVZVc1ZVRkJRU3hIUVVGSExFVkJRVVVzU1VGQlNTeERRVUZETEZGQlFVd3NSVUZCWmp0QlFVTlZMRlZCUVVFc1MwRkJTeXhGUVVGRkxFbEJSR3BDTzBGQlJWVXNWVUZCUVN4TlFVRk5MRVZCUVVVc1NVRkJTU3hEUVVGRExFbEJRVVFzUTBGR2RFSTdRVUZIVlN4VlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGSkxFTkJRVU1zUzBGQlRDeERRVUZYTEZGQlNDOUNPMEZCU1ZVc1ZVRkJRU3huUWtGQlowSXNSVUZCUlN3d1FrRkJRU3hEUVVGRE8wRkJRVUVzYlVKQlFVa3NTMEZCU1N4RFFVRkRMRmRCUVV3c1EwRkJhVUlzU1VGQlNTeERRVUZETEVsQlFVUXNRMEZCU2l4RFFVRlhMRlZCUVRWQ0xFVkJRWGRETEVOQlFYaERMRU5CUVVvN1FVRkJRU3hYUVVvM1FqdEJRVXRWTEZWQlFVRXNXVUZCV1N4RlFVRkZMSE5DUVVGQkxFTkJRVU03UVVGQlFTeHRRa0ZCU1N4TFFVRkpMRU5CUVVNc1YwRkJUQ3hEUVVGcFFpeEpRVUZKTEVOQlFVTXNTVUZCUkN4RFFVRnlRaXhGUVVFMlFpeERRVUUzUWl4RFFVRktPMEZCUVVFc1YwRk1la0k3UVVGTlZTeFZRVUZCTEdOQlFXTXNSVUZCUlN4M1FrRkJRU3hEUVVGRE8wRkJRVUVzYlVKQlFVa3NTMEZCU1N4RFFVRkRMRmRCUVV3c1EwRkJhVUlzU1VGQlNTeERRVUZETEVsQlFVUXNRMEZCY2tJc1JVRkJOa0lzUTBGQk4wSXNRMEZCU2p0QlFVRkJMRmRCVGpOQ08wRkJUMVVzVlVGQlFTeFhRVUZYTEVWQlFVVXNTMEZCU1N4RFFVRkRMRXRCUVV3c1EwRkJWenRCUVZCc1F5eFZRVUZhT3p0QlFWTkJMRmxCUVVrc1VVRkJUeXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZZTEUxQlFYTkNMRkZCUVhSQ0xFbEJRV3RETEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1MwRkJaU3hKUVVGeVJDeEZRVUV5UkR0QlFVTjJSQ3hWUVVGQkxFdEJRVXNzUjBGQlJ5eExRVUZMTEVOQlFVTXNXVUZCVGl4RFFVRnRRaXhMUVVGdVFpeEZRVUV3UWp0QlFVTTVRaXhaUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRV3hDTEVsQlFUUkNMRXRCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVVvc1EwRkJWeXhEUVVGWUxFTkJRV3BDTEVOQlFUVkNMRWRCUVRoRUxFdEJRVWtzUTBGQlF5eFhRVUZNTEVOQlFXbENMRWxCUVVrc1EwRkJReXhKUVVGRUxFTkJRWEpDTzBGQlJERkRMRmRCUVRGQ0xFTkJRVkk3UVVGSFNEczdRVUZGUkN4bFFVRlBMRXRCUVZBN1FVRkRTQ3hQUVhKQ1RTeERRVUZRTzBGQmMwSklPenM3TmtKQlJWRTdRVUZCUVN4M1FrRkRkVUlzUzBGQlN5eExRVVExUWp0QlFVRkJMRlZCUTBVc1YwRkVSaXhsUVVORkxGZEJSRVk3UVVGQlFTeFZRVU5sTEVsQlJHWXNaVUZEWlN4SlFVUm1PMEZCUlV3c1ZVRkJUU3hSUVVGUkxFZEJRVWNzUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZCTlVJN08wRkJSVUVzVlVGQlNTeExRVUZMTEVOQlFVTXNUMEZCVGl4RFFVRmpMRWxCUVdRc1EwRkJTaXhGUVVGNVFqdEJRVU55UWl4UlFVRkJMRkZCUVZFc1EwRkJReXhoUVVGVUxFZEJRWGxDTEVWQlFYcENPMEZCUTBnN08wRkJSVVFzVlVGQlNTeFJRVUZSTEVOQlFVTXNZVUZCVkN4TFFVRXlRaXhKUVVFdlFpeEZRVUZ4UXp0QlFVTnFReXhaUVVGSkxFdEJRVXNzUTBGQlF5eFBRVUZPTEVOQlFXTXNTVUZCWkN4RFFVRktMRVZCUVhsQ08wRkJRM0pDTEZWQlFVRXNTVUZCU1N3MFFrRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlJDeERRVUZRTEVOQlFVbzdRVUZEU0RzN1FVRklaME03UVVGQlFUdEJRVUZCT3p0QlFVRkJPMEZCUzJwRExDdENRVUZ6UXl4SlFVRkpMREJDUVVGS0xFTkJRWE5DTEVsQlFYUkNMRU5CUVhSRExEaElRVUZ0UlR0QlFVRkJPMEZCUVVFc1owSkJRWHBFTEUxQlFYbEVMR1ZCUVhwRUxFMUJRWGxFTzBGQlFVRXNaMEpCUVdwRUxFbEJRV2xFTEdWQlFXcEVMRWxCUVdsRU8wRkJRVUVzWjBKQlFUTkRMRWRCUVRKRExHVkJRVE5ETEVkQlFUSkRPMEZCUVVFc1owSkJRWFJETEVsQlFYTkRMR1ZCUVhSRExFbEJRWE5ET3p0QlFVTXZSQ3huUWtGQlNTeFJRVUZQTEVsQlFWQXNUVUZCWjBJc1VVRkJhRUlzU1VGQk5FSXNTVUZCU1N4TFFVRkxMRWxCUVhwRExFVkJRU3RETzBGQlF6TkRMR3RDUVVGSkxGVkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTVUZCVEN4RFFVRlZMRWRCUVZZc1EwRkJha0k3TzBGQlEwRXNhME5CUVZjc1IwRkJXQ3hEUVVGbExFbEJRV1lzUlVGQmNVSXNWVUZCVlN4SFFVRkhMR0ZCUVd4RExFVkJRV2xFTEZWQlFXcEVPMEZCUTBnN1FVRkRTanRCUVZablF6dEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPenRCUVZscVF5eGxRVU5KTEdsRFFVTkpMR2REUVVGTExGZEJRVmNzUTBGQlF5eHZRa0ZCYWtJc1EwRkVTaXhGUVVWSk8wRkJRVWtzVlVGQlFTeFRRVUZUTEVWQlFVTTdRVUZCWkN4WFFVTkxMRXRCUVVzc1YwRkJUQ3hEUVVGcFFpeEpRVUZxUWl4RFFVUk1MRU5CUmtvc1EwRkVTanRCUVZGSUxFOUJjRUpFTEUxQmIwSlBPMEZCUTBnc1dVRkJTU3hWUVVGVkxFZEJRVWNzYjBKQlFWY3NSMEZCV0N4RFFVRmxMRWxCUVdZc1JVRkJjVUlzVVVGQlVTeERRVUZETEdGQlFUbENMRU5CUVdwQ096dEJRVVZCTEZsQlFVa3NTMEZCU3l4RFFVRkRMRTlCUVU0c1EwRkJZeXhWUVVGa0xFTkJRVW9zUlVGQkswSTdRVUZETTBJc1ZVRkJRU3hWUVVGVkxFZEJRVWNzVlVGQlZTeERRVUZETEVOQlFVUXNRMEZCZGtJN1FVRkRTRHM3UVVGTVJUdEJRVUZCTzBGQlFVRTdPMEZCUVVFN1FVRlBTQ3huUTBGQmMwTXNTVUZCU1N3d1FrRkJTaXhEUVVGelFpeFZRVUYwUWl4RFFVRjBReXh0U1VGQmVVVTdRVUZCUVR0QlFVRkJMR2RDUVVFdlJDeE5RVUVyUkN4blFrRkJMMFFzVFVGQkswUTdRVUZCUVN4blFrRkJka1FzU1VGQmRVUXNaMEpCUVhaRUxFbEJRWFZFTzBGQlFVRXNaMEpCUVdwRUxFZEJRV2xFTEdkQ1FVRnFSQ3hIUVVGcFJEdEJRVUZCTEdkQ1FVRTFReXhKUVVFMFF5eG5Ra0ZCTlVNc1NVRkJORU03TzBGQlEzSkZMR2RDUVVGSkxGRkJRVThzU1VGQlVDeE5RVUZuUWl4UlFVRndRaXhGUVVFNFFqdEJRVU14UWl4clFrRkJTU3hYUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZETEVsQlFVd3NRMEZCVlN4SFFVRldMRU5CUVdwQ096dEJRVU5CTEd0RFFVRlhMRWRCUVZnc1EwRkJaU3hWUVVGbUxFVkJRVEpDTEZkQlFUTkNMRVZCUVhWRExGZEJRWFpETzBGQlEwZzdRVUZEU2p0QlFWcEZPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3TzBGQlkwZ3NaVUZEU1N4cFEwRkRTU3huUTBGQlN5eFhRVUZYTEVOQlFVTXNhMEpCUVdwQ0xFTkJSRW9zUlVGRlNUdEJRVUZKTEZWQlFVRXNVMEZCVXl4RlFVRkRPMEZCUVdRc1YwRkRTeXhMUVVGTExGZEJRVXdzUTBGQmFVSXNWVUZCYWtJc1EwRkVUQ3hEUVVaS0xFTkJSRW83UVVGUlNEdEJRVU5LT3pzN08wVkJiRVpyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUZ4Um1Rc1VUczdPenM3T3pzN096czdRVU42Um1ZN08wRkJRMEU3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN1NVRkZUU3hqT3pzN096czdPenM3T3pzN08zZERRVU5yUWp0QlFVTm9RaXhYUVVGTExFOUJRVXc3UVVGRFNEczdPemhDUVVWVE8wRkJRVUU3TzBGQlFVRXNkMEpCUTNGQ0xFdEJRVXNzUzBGRU1VSTdRVUZCUVN4VlFVTkRMRWRCUkVRc1pVRkRReXhIUVVSRU8wRkJRVUVzVlVGRFRTeFhRVVJPTEdWQlEwMHNWMEZFVGp0QlFVVk9MQ3RDUVVGWExFZEJRVmdzUlVGRFN5eEpRVVJNTEVOQlJWRXNaMEpCUVdNN1FVRkJRU3haUVVGYUxFMUJRVmtzVVVGQldpeE5RVUZaT3p0QlFVTldMRmxCUVVrc1EwRkJReXhOUVVGRUxFbEJRVmNzVFVGQlRTeERRVUZETEVsQlFWQXNRMEZCV1N4TlFVRmFMRVZCUVc5Q0xFMUJRWEJDTEV0QlFTdENMRU5CUVRsRExFVkJRV2xFTzBGQlF6ZERMRlZCUVVFc1MwRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFJRVUZZTEVOQlFXOUNMRXRCUVVzc1EwRkJReXhYUVVGWExFTkJRVU1zWVVGQllpeERRVUY2UWpzN1FVRkRRU3hWUVVGQkxFdEJRVWtzUTBGQlF5eExRVUZNTEVOQlFWY3NVMEZCV0N4RFFVRnhRaXhKUVVGeVFqczdRVUZEUVR0QlFVTklPenRCUVVORUxGRkJRVUVzUzBGQlNTeERRVUZETEV0QlFVd3NRMEZCVnl4UlFVRllMRU5CUVc5Q0xFMUJRWEJDT3p0QlFVTkJMRkZCUVVFc1MwRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFRRVUZZTEVOQlFYRkNMRWxCUVhKQ08wRkJRMGdzVDBGV1ZDeEZRVlZYTEdsQ1FVRmhPMEZCUVVFc1dVRkJXQ3hMUVVGWExGTkJRVmdzUzBGQlZ6czdRVUZEV2l4UlFVRkJMRXRCUVVrc1EwRkJReXhMUVVGTUxFTkJRVmNzVTBGQldDeERRVUZ4UWl4SlFVRnlRanM3UVVGRFFTeFJRVUZCTEV0QlFVa3NRMEZCUXl4TFFVRk1MRU5CUVZjc1VVRkJXQ3hEUVVGdlFpeExRVUZ3UWp0QlFVTklMRTlCWWxRN1FVRmxTRHM3TzIxRFFVVmpMRXNzUlVGQlR6dEJRVU5zUWl4WFFVRkxMRXRCUVV3c1EwRkJWeXhqUVVGWUxFTkJRVEJDTEV0QlFURkNPMEZCUTBnN096czJRa0ZGVVR0QlFVRkJMSGxDUVVOM1JDeExRVUZMTEV0QlJEZEVPMEZCUVVFc1ZVRkRSU3hIUVVSR0xHZENRVU5GTEVkQlJFWTdRVUZCUVN4VlFVTlBMRXRCUkZBc1owSkJRMDhzUzBGRVVEdEJRVUZCTEZWQlEyTXNVVUZFWkN4blFrRkRZeXhSUVVSa08wRkJRVUVzVlVGRGQwSXNWMEZFZUVJc1owSkJRM2RDTEZkQlJIaENPMEZCUVVFc1ZVRkRjVU1zVVVGRWNrTXNaMEpCUTNGRExGRkJSSEpETzBGQlFVRXNWVUZESzBNc1MwRkVMME1zWjBKQlF5dERMRXRCUkM5RE96dEJRVWRNTEZWQlFVa3NTMEZCU2l4RlFVRlhPMEZCUTFBc1pVRkJUenRCUVVGTExGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFXWXNWMEZCTkVNc0swSkJRVWtzUzBGQlN5eERRVUZETEU5QlFWWXNRMEZCTlVNc1EwRkJVRHRCUVVOSUxFOUJSa1FzVFVGRlR5eEpRVUZKTEVOQlFVTXNVVUZCVEN4RlFVRmxPMEZCUTJ4Q0xHVkJRVTg3UVVGQlN5eFZRVUZCTEZOQlFWTXNSVUZCUXp0QlFVRm1MRlZCUVZBN1FVRkRTQ3hQUVVaTkxFMUJSVUU3UVVGRFNDeGxRVU5KTEc5Q1FVRkRMR2xDUVVGRU8wRkJRMGtzVlVGQlFTeEpRVUZKTEVWQlFVVXNTMEZFVmp0QlFVVkpMRlZCUVVFc1IwRkJSeXhGUVVGRkxFZEJSbFE3UVVGSFNTeFZRVUZCTEZGQlFWRXNSVUZCUlN4UlFVaGtPMEZCU1Vrc1ZVRkJRU3hqUVVGakxFVkJRVVVzUzBGQlN5eGpRVUZNTEVOQlFXOUNMRWxCUVhCQ0xFTkJRWGxDTEVsQlFYcENMRU5CU25CQ08wRkJTMGtzVlVGQlFTeFhRVUZYTEVWQlFVVTdRVUZNYWtJc1ZVRkVTanRCUVZOSU8wRkJRMG83T3pzN1JVRTVRM2RDTEV0QlFVc3NRMEZCUXl4VE96dGxRV2xFY0VJc1l6czdPenM3T3pzN096czdRVU53UkdZc1NVRkJUU3hYUVVGWExFZEJRVWNzVTBGQlpDeFhRVUZqTzBGQlFVRXNUVUZCUlN4UlFVRkdMRkZCUVVVc1VVRkJSanRCUVVGQkxFMUJRVmtzUjBGQldpeFJRVUZaTEVkQlFWbzdRVUZCUVN4VFFVTm9RaXhwUTBGRFNUdEJRVUZQTEVsQlFVRXNTVUZCU1N4RlFVRkRMRkZCUVZvN1FVRkJjVUlzU1VGQlFTeEpRVUZKTEVWQlFVTXNjVUpCUVRGQ08wRkJRV2RFTEVsQlFVRXNTMEZCU3l4RlFVRkZPMEZCUVhaRUxFbEJSRW9zUlVGRlNUdEJRVUZQTEVsQlFVRXNTVUZCU1N4RlFVRkRMRkZCUVZvN1FVRkJjVUlzU1VGQlFTeEpRVUZKTEVWQlFVTXNNRUpCUVRGQ08wRkJRWEZFTEVsQlFVRXNTMEZCU3l4RlFVRkZMRWxCUVVrc1EwRkJReXhUUVVGTUxFTkJRV1VzVVVGQlpqdEJRVUUxUkN4SlFVWktMRU5CUkdkQ08wRkJRVUVzUTBGQmNFSTdPMlZCVFdVc1Z6czdPenM3T3pzN096czdRVU5PWml4SlFVRk5MRkZCUVZFc1IwRkJSeXhUUVVGWUxGRkJRVmNzVDBGQmMwYzdRVUZCUVN4TlFVRndSeXhMUVVGdlJ5eFJRVUZ3Unl4TFFVRnZSenRCUVVGQkxFMUJRVGRHTEZGQlFUWkdMRkZCUVRkR0xGRkJRVFpHTzBGQlFVRXNUVUZCYmtZc1VVRkJiVVlzVVVGQmJrWXNVVUZCYlVZN1FVRkJRU3hOUVVGNlJTeE5RVUY1UlN4UlFVRjZSU3hOUVVGNVJUdEJRVUZCTEUxQlFXcEZMRmxCUVdsRkxGRkJRV3BGTEZsQlFXbEZPMEZCUVVFc1RVRkJia1FzWTBGQmJVUXNVVUZCYmtRc1kwRkJiVVE3UVVGQlFTeE5RVUZ1UXl4blFrRkJiVU1zVVVGQmJrTXNaMEpCUVcxRE8wRkJRVUVzVFVGQmFrSXNWMEZCYVVJc1VVRkJha0lzVjBGQmFVSTdPMEZCUTI1SUxFMUJRVWtzVVVGQlNpeEZRVUZqTzBGQlExWXNWMEZCVVN4blEwRkRTQ3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEUxQlFXUXNTMEZCZVVJc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCY0VRc1IwRkRSeXhyUTBGQlRUdEJRVUZOTEUxQlFVRXNVMEZCVXl4RlFVRkRPMEZCUVdoQ0xFMUJRVTRzVDBGQkswUXNTMEZCTDBRc1QwRkJjMFU3UVVGQlJ5eE5RVUZCTEVsQlFVa3NSVUZCUXl4SFFVRlNPMEZCUVZrc1RVRkJRU3hUUVVGVExFVkJRVU1zWVVGQmRFSTdRVUZCYjBNc2IwSkJRVmNzWlVGQkwwTTdRVUZCSzBRc1RVRkJRU3hQUVVGUExFVkJRVVU3UVVGQmVFVXNUMEZCTWtZc1YwRkJWeXhEUVVGRExFMUJRWFpITEVOQlFYUkZMRU5CUkVnc1IwRkRjMDBzYTBOQlFVOHNTMEZCVUN4RFFVWnVUU3hGUVVkS0xHZERRVUZMTEZGQlFVd3NRMEZJU1N4RFFVRlNPMEZCUzBnc1IwRk9SQ3hOUVUxUE8wRkJRMGdzVjBGQlVTeG5RMEZEU0N4UlFVRlJMRU5CUVVNc1MwRkJWQ3hMUVVGdFFpeE5RVUZ1UWl4SlFVRTJRaXhSUVVGUkxFTkJRVU1zUzBGQmRFTXNSMEZCT0VNc2IwTkJRVk1zVjBGQlZ5eERRVUZETEV0QlFYSkNMRTlCUVRsRExFZEJRWFZHTEVWQlJIQkdMRVZCUlVnc1VVRkJVU3hEUVVGRExFOUJRVlFzUzBGQmNVSXNUVUZCY2tJc1NVRkJLMElzVVVGQlVTeERRVUZETEU5QlFYaERMRWRCUVd0RUxHOURRVUZUTEZkQlFWY3NRMEZCUXl4UFFVRnlRaXhQUVVGc1JDeEhRVUUyUml4RlFVWXhSaXhGUVVkS0xHdERRVUZQTEV0QlFWQXNRMEZJU1N4RlFVbElMRU5CUVVNc1VVRkJVU3hEUVVGRExFdEJRVllzU1VGQmIwSXNVVUZCVVN4RFFVRkRMRTlCUVZRc1MwRkJjVUlzVFVGQmVrTXNTVUZCYjBRc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCTDBVc1IwRkRSenRCUVVGSExFMUJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4TlFVRkJMRk5CUVZNc1JVRkJReXhoUVVGMFFqdEJRVUZ2UXl4dlFrRkJWeXhQUVVFdlF6dEJRVUYxUkN4TlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVGb1JTeFBRVUVyUlN4WFFVRlhMRU5CUVVNc1MwRkJNMFlzUTBGRVNDeEhRVU15Unl4RlFVeDRSeXhGUVUxSUxFTkJRVU1zVVVGQlVTeERRVUZETEU5QlFWWXNTVUZCYzBJc1VVRkJVU3hEUVVGRExFdEJRVlFzUzBGQmJVSXNUVUZCZWtNc1NVRkJiMFFzVVVGQlVTeERRVUZETEdGQlFWUXNTMEZCTWtJc1NVRkJMMFVzUjBGRFJ6dEJRVUZITEUxQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hOUVVGQkxGTkJRVk1zUlVGQlF5eGhRVUYwUWp0QlFVRnZReXh2UWtGQlZ5eFRRVUV2UXp0QlFVRjVSQ3hOUVVGQkxFOUJRVThzUlVGQlJUdEJRVUZzUlN4UFFVRnRSaXhYUVVGWExFTkJRVU1zVDBGQkwwWXNRMEZFU0N4SFFVTnBTQ3hGUVZBNVJ5eERRVUZTTzBGQlUwZzdRVUZEU2l4RFFXeENSRHM3WlVGdlFtVXNVVHM3T3pzN096czdPenM3UVVOd1FtWTdPMEZCUTBFN08wRkJRMEU3T3pzN096czdPenM3T3pzN096czdPenM3T3pzN096dEpRVVZOTEZFN096czdPMEZCUTBZc2IwSkJRVmtzUzBGQldpeEZRVUZ0UWp0QlFVRkJPenRCUVVGQk96dEJRVU5tTEd0R1FVRk5MRXRCUVU0N1FVRkRRU3hWUVVGTExFdEJRVXdzUjBGQllUdEJRVU5VTEUxQlFVRXNhMEpCUVd0Q0xFVkJRVVVzUzBGRVdEdEJRVVZVTEUxQlFVRXNSMEZCUnl4RlFVRkZMRVZCUmtrN1FVRkhWQ3hOUVVGQkxGRkJRVkVzUlVGQlJTeExRVWhFTzBGQlNWUXNUVUZCUVN4TFFVRkxMRVZCUVVVc1NVRktSVHRCUVV0VUxFMUJRVUVzUzBGQlN5eEZRVUZGTEVWQlRFVTdRVUZOVkN4TlFVRkJMRkZCUVZFc1JVRkJSVHRCUVVOT0xGRkJRVUVzWVVGQllTeEZRVUZGTEVsQlJGUTdRVUZGVGl4UlFVRkJMRXRCUVVzc1JVRkJSU3hGUVVaRU8wRkJSMDRzVVVGQlFTeFBRVUZQTEVWQlFVVTdRVUZJU0R0QlFVNUVMRXRCUVdJN1FVRkdaVHRCUVdOc1FqczdPenQzUTBGRmJVSTdRVUZEYUVJc1YwRkJTeXhYUVVGTU8wRkJRMGc3T3p0clEwRkZZVHRCUVVOV0xGVkJRVWtzVDBGQlR5eGhRVUZoTEVOQlFVTXNUMEZCY2tJc1MwRkJhVU1zVjBGQmNrTXNSVUZCYTBRN1FVRkRPVU1zV1VGQlRTeFBRVUZQTEVkQlFVY3NZVUZCWVN4RFFVRkRMRTlCUVRsQ08wRkJRMEVzWVVGQlN5eFJRVUZNTEVOQlFXTTdRVUZEVml4VlFVRkJMRWRCUVVjc1JVRkJSU3hQUVVGUExFTkJRVU1zUjBGQlVpeEhRVUZqTEU5QlFVOHNRMEZCUXl4SFFVRjBRaXhIUVVFMFFpeEZRVVIyUWp0QlFVVldMRlZCUVVFc1VVRkJVU3hGUVVGRkxFOUJRVThzUTBGQlF5eFJRVUZTTEVkQlFXMUNMRWxCUVVrc1EwRkJReXhMUVVGTUxFTkJRVmNzVDBGQlR5eERRVUZETEZGQlFXNUNMRU5CUVc1Q0xFZEJRV3RFTzBGQlEzaEVMRmxCUVVFc1lVRkJZU3hGUVVGRkxFbEJSSGxETzBGQlJYaEVMRmxCUVVFc1MwRkJTeXhGUVVGRkxFVkJSbWxFTzBGQlIzaEVMRmxCUVVFc1QwRkJUeXhGUVVGRk8wRkJTQ3RETEZkQlJteEVPMEZCVDFZc1ZVRkJRU3hyUWtGQmEwSXNSVUZCUlN4RFFVRkRMRU5CUVVNc1QwRkJUeXhEUVVGRE8wRkJVSEJDTEZOQlFXUTdRVUZUU0R0QlFVTktPenM3T0VKQlJWTXNTeXhGUVVGUE8wRkJRMklzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMRWRCUVVjc1JVRkJSU3hMUVVGTExFTkJRVU1zVFVGQlRpeERRVUZoTzBGQlFXNUNMRTlCUVdRN1FVRkRTRHM3TzJsRFFVVlpMRXNzUlVGQlR6dEJRVU5vUWl4TlFVRkJMRXRCUVVzc1EwRkJReXhqUVVGT08wRkJRMEVzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMR3RDUVVGclFpeEZRVUZGTzBGQlFYSkNMRTlCUVdRN1FVRkRTRHM3TzJsRFFVVlpMRXNzUlVGQlR6dEJRVU5vUWl4TlFVRkJMRXRCUVVzc1EwRkJReXhqUVVGT08wRkJRMEVzVjBGQlN5eFJRVUZNTEVOQlFXTTdRVUZCUXl4UlFVRkJMR3RDUVVGclFpeEZRVUZGTEV0QlFYSkNPMEZCUVRSQ0xGRkJRVUVzUjBGQlJ5eEZRVUZGTEVWQlFXcERPMEZCUVhGRExGRkJRVUVzVVVGQlVTeEZRVUZGTzBGQlFVTXNWVUZCUVN4aFFVRmhMRVZCUVVVc1NVRkJhRUk3UVVGQmMwSXNWVUZCUVN4TFFVRkxMRVZCUVVVc1JVRkJOMEk3UVVGQmFVTXNWVUZCUVN4UFFVRlBMRVZCUVVVN1FVRkJNVU03UVVGQkwwTXNUMEZCWkR0QlFVTklPenM3YlVOQlJXTXNTeXhGUVVGUE8wRkJRMnhDTEZWQlFVMHNUVUZCVFN4SFFVRkhMRTFCUVUwc1EwRkJReXhOUVVGUUxFTkJRV01zUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZCZWtJc1JVRkJiVU1zUzBGQmJrTXNRMEZCWmp0QlFVTkJMRmRCUVVzc1VVRkJUQ3hEUVVGak8wRkJRVU1zVVVGQlFTeFJRVUZSTEVWQlFVVTdRVUZCV0N4UFFVRmtPMEZCUTBnN096czJRa0ZGVVN4TExFVkJRVTg3UVVGRFdpeFhRVUZMTEZGQlFVd3NRMEZCWXp0QlFVRkRMRkZCUVVFc1MwRkJTeXhGUVVGTU8wRkJRVVFzVDBGQlpEdEJRVU5JT3pzN09FSkJSVk1zU3l4RlFVRlBPMEZCUTJJc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEZGQlFWRXNSVUZCUlR0QlFVRllMRTlCUVdRN1FVRkRTRHM3T3paQ1FVVlJMRXNzUlVGQlR6dEJRVU5hTEZkQlFVc3NVVUZCVEN4RFFVRmpPMEZCUVVNc1VVRkJRU3hMUVVGTExFVkJRVVU3UVVGQlVpeFBRVUZrTzBGQlEwZzdPenMyUWtGRlVUdEJRVUZCTEZWQlEwVXNWMEZFUml4SFFVTnBRaXhMUVVGTExFdEJSSFJDTEVOQlEwVXNWMEZFUmp0QlFVRkJMSGRDUVVWeFJDeExRVUZMTEV0QlJqRkVPMEZCUVVFc1ZVRkZSU3hyUWtGR1JpeGxRVVZGTEd0Q1FVWkdPMEZCUVVFc1ZVRkZjMElzUjBGR2RFSXNaVUZGYzBJc1IwRkdkRUk3UVVGQlFTeFZRVVV5UWl4TFFVWXpRaXhsUVVVeVFpeExRVVl6UWp0QlFVRkJMRlZCUld0RExGRkJSbXhETEdWQlJXdERMRkZCUm14RE8wRkJRVUVzVlVGRk5FTXNTMEZHTlVNc1pVRkZORU1zUzBGR05VTTdRVUZCUVN4cFEwRkhiVU1zUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZJT1VNN1FVRkJRU3hWUVVkRkxHRkJTRVlzZDBKQlIwVXNZVUZJUmp0QlFVRkJMRlZCUjJsQ0xFdEJTR3BDTEhkQ1FVZHBRaXhMUVVocVFqdEJRVUZCTEZWQlIzZENMRTlCU0hoQ0xIZENRVWQzUWl4UFFVaDRRanM3UVVGTFRDeFZRVUZKTEVkQlFVY3NTVUZCU1N4aFFVRmhMRXRCUVVzc1NVRkJla0lzU1VGQmFVTXNTMEZCYWtNc1NVRkJNRU1zVDBGQk9VTXNSVUZCZFVRN1FVRkRia1FzWlVGRFNTeHBRMEZEU1N4dlFrRkJReXhuUWtGQlJDeGxRVUZoTEV0QlFVc3NTMEZCYkVJN1FVRkRVeXhWUVVGQkxGZEJRVmNzUlVGQlJUdEJRVVIwUWl4WFFVUktMRVZCU1Vrc2IwSkJRVU1zYjBKQlFVUXNSVUZCYVVJc1MwRkJTeXhMUVVGMFFpeERRVXBLTEVWQlMwa3NLMEpCUVVjN1FVRkJSeXhWUVVGQkxFbEJRVWtzUlVGQlF5eEhRVUZTTzBGQlFWa3NWVUZCUVN4UFFVRlBMRVZCUVVVc1MwRkJTeXhaUVVGTUxFTkJRV3RDTEVsQlFXeENMRU5CUVhWQ0xFbEJRWFpDTEVOQlFYSkNPMEZCUTBjc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGRVlpeFhRVU4xUWl4WFFVRlhMRU5CUVVNc1lVRkVia01zUTBGQlNDeERRVXhLTEVOQlJFbzdRVUZWU0N4UFFWaEVMRTFCVjA4c1NVRkJTU3hyUWtGQlNpeEZRVUYzUWp0QlFVTXpRaXhsUVVOSkxHbERRVU5KTEc5Q1FVRkRMSFZDUVVGRU8wRkJRMGtzVlVGQlFTeEhRVUZITEVWQlFVVXNSMEZFVkR0QlFVVkpMRlZCUVVFc1MwRkJTeXhGUVVGRkxFdEJSbGc3UVVGSFNTeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkxMRkZCUVV3c1EwRkJZeXhKUVVGa0xFTkJRVzFDTEVsQlFXNUNMRU5CU0dRN1FVRkpTU3hWUVVGQkxGRkJRVkVzUlVGQlJTeFJRVXBrTzBGQlMwa3NWVUZCUVN4VFFVRlRMRVZCUVVVc1MwRkJTeXhUUVVGTUxFTkJRV1VzU1VGQlppeERRVUZ2UWl4SlFVRndRaXhEUVV4bU8wRkJUVWtzVlVGQlFTeExRVUZMTEVWQlFVVXNTMEZPV0R0QlFVOUpMRlZCUVVFc1VVRkJVU3hGUVVGRkxFdEJRVXNzVVVGQlRDeERRVUZqTEVsQlFXUXNRMEZCYlVJc1NVRkJia0lzUTBGUVpEdEJRVkZKTEZWQlFVRXNVVUZCVVN4RlFVRkZMRXRCUVVzc1MwRkJUQ3hEUVVGWExGRkJVbnBDTzBGQlUwa3NWVUZCUVN4alFVRmpMRVZCUVVVc1MwRkJTeXhqUVVGTUxFTkJRVzlDTEVsQlFYQkNMRU5CUVhsQ0xFbEJRWHBDTEVOQlZIQkNPMEZCVlVrc1ZVRkJRU3hYUVVGWExFVkJRVVU3UVVGV2FrSXNWVUZFU2l4RlFXRkpMRzlDUVVGRExHOUNRVUZFTEVWQlFXbENMRXRCUVVzc1MwRkJkRUlzUTBGaVNpeEZRV05KTEN0Q1FVRkhPMEZCUVVjc1ZVRkJRU3hKUVVGSkxFVkJRVU1zUjBGQlVqdEJRVUZaTEZWQlFVRXNUMEZCVHl4RlFVRkZMRXRCUVVzc1dVRkJUQ3hEUVVGclFpeEpRVUZzUWl4RFFVRjFRaXhKUVVGMlFpeERRVUZ5UWp0QlFVTkhMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJSR0lzVjBGRGRVSXNWMEZCVnl4RFFVRkRMR0ZCUkc1RExFTkJRVWdzUTBGa1NpeERRVVJLTzBGQmJVSklMRTlCY0VKTkxFMUJiMEpCTzBGQlEwZ3NaVUZEU1R0QlFVRkxMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV1lzVjBGRFNUdEJRVUZOTEZWQlFVRXNVVUZCVVN4RlFVRkZMRXRCUVVzc1dVRkJUQ3hEUVVGclFpeEpRVUZzUWl4RFFVRjFRaXhKUVVGMlFqdEJRVUZvUWl4WFFVTkpMQ3RDUVVOSkxHMURRVU5KTERoRFFVUktMRU5CUkVvc1JVRkpTU3dyUWtGS1NpeEZRVXRKTEN0Q1FVRkpMRmRCUVZjc1EwRkJReXhaUVVGb1FpeERRVXhLTEVOQlJFb3NSVUZSU1R0QlFVRlBMRlZCUVVFc1NVRkJTU3hGUVVGRExFMUJRVm83UVVGQmJVSXNWVUZCUVN4VFFVRlRMRVZCUVVNc1YwRkJOMEk3UVVGQmVVTXNWVUZCUVN4TFFVRkxMRVZCUVVVc1IwRkJhRVE3UVVGQmNVUXNWVUZCUVN4UlFVRlJMRVZCUVVVc1MwRkJTeXhUUVVGTUxFTkJRV1VzU1VGQlppeERRVUZ2UWl4SlFVRndRanRCUVVFdlJDeFZRVkpLTEVWQlUwa3NLMEpCUVVjN1FVRkJUeXhWUVVGQkxFbEJRVWtzUlVGQlF5eFJRVUZhTzBGQlFYRkNMRlZCUVVFc1UwRkJVeXhGUVVGRExIVkNRVUV2UWp0QlFVRjFSQ3hWUVVGQkxFdEJRVXNzUlVGQlJTeFhRVUZYTEVOQlFVTTdRVUZCTVVVc1ZVRkJTQ3hEUVZSS0xFTkJSRW9zUlVGWlNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CV2tvc1EwRkVTanRCUVdkQ1NEdEJRVU5LT3pzN08wVkJla2hyUWl4TFFVRkxMRU5CUVVNc1V6czdaVUUwU0dRc1VUczdPenM3T3pzN096czdRVU5vU1dZc1NVRkJUU3hQUVVGUExFZEJRVWNzVTBGQlZpeFBRVUZWTzBGQlFVRXNUVUZCUlN4SFFVRkdMRkZCUVVVc1IwRkJSanRCUVVGQkxFMUJRVThzVVVGQlVDeFJRVUZQTEZGQlFWQTdRVUZCUVN4TlFVRnBRaXhYUVVGcVFpeFJRVUZwUWl4WFFVRnFRanRCUVVGQkxGTkJRMW9zYVVOQlEwa3NLMEpCUTBrc09FTkJSRW9zUlVGRE5FSXNLMEpCUkRWQ0xFVkJSVWs3UVVGQlJ5eEpRVUZCTEVsQlFVa3NSVUZCUlN4SFFVRlVPMEZCUVdNc1NVRkJRU3hOUVVGTkxFVkJRVU03UVVGQmNrSXNTMEZCSzBJc1IwRkJMMElzUTBGR1NpeERRVVJLTEVWQlMwa3NLMEpCUTBrc2IwTkJRVk1zVjBGQlZ5eERRVUZETEV0QlFYSkNMRU5CUkVvc1JVRkRkME1zSzBKQlJIaERMRVZCUlVzc1VVRkJVU3hEUVVGRExFdEJRVlFzUTBGQlpTeFBRVUZtTEVOQlFYVkNMRWRCUVhaQ0xFVkJRVFJDTEUxQlFUVkNMRU5CUmt3c1EwRk1TaXhGUVZOSkxDdENRVU5KTEc5RFFVRlRMRmRCUVZjc1EwRkJReXhQUVVGeVFpeERRVVJLTEVWQlF6QkRMQ3RDUVVReFF5eEZRVVZMTEZGQlFWRXNRMEZCUXl4UFFVRlVMRU5CUVdsQ0xFOUJRV3BDTEVOQlFYbENMRWRCUVhwQ0xFVkJRVGhDTEUxQlFUbENMRU5CUmt3c1EwRlVTaXhEUVVSWk8wRkJRVUVzUTBGQmFFSTdPMlZCWjBKbExFODdPenM3T3p0QlEyWm1PenRCUVVOQk96dEJRVVZCT3pzN08wRkJTa0U3UVVGSFFUdEJRVWRCTEVsQlFVMHNiMEpCUVc5Q0xFZEJRVWNzZDBKQlFUZENPMEZCUTBFc1NVRkJUU3hWUVVGVkxFZEJRVWNzVVVGQlVTeERRVUZETEdOQlFWUXNRMEZCZDBJc2IwSkJRWGhDTEVOQlFXNUNPM0ZDUVVOelFpeGhPMGxCUVdZc1Z5eHJRa0ZCUVN4WE8wRkJSVkFzVVVGQlVTeERRVUZETEUxQlFWUXNRMEZEU1N4dlFrRkJReXhwUWtGQlJEdEJRVUZWTEVWQlFVRXNWMEZCVnl4RlFVRkZPMEZCUVhaQ0xFVkJSRW9zUlVGRlNTeFZRVVpLT3pzN096czdPenM3TzBGRFZrRXNVMEZCVXl4VlFVRlVMRU5CUVc5Q0xFZEJRWEJDTEVWQlFYbENPMEZCUTNKQ0xGTkJRVThzUzBGQlN5eERRVUZETEVkQlFVUXNRMEZCVEN4RFFVTkdMRWxCUkVVc1EwRkRSeXhWUVVGQkxFZEJRVWM3UVVGQlFTeFhRVUZKTEVkQlFVY3NRMEZCUXl4SlFVRktMRVZCUVVvN1FVRkJRU3hIUVVST0xFVkJSVVlzU1VGR1JTeERRVWRETEZWQlFVTXNUVUZCUkR0QlFVRkJMRmRCUVdFN1FVRkJReXhOUVVGQkxFMUJRVTBzUlVGQlRqdEJRVUZFTEV0QlFXSTdRVUZCUVN4SFFVaEVMRVZCU1VNc1ZVRkJReXhMUVVGRU8wRkJRVUVzVjBGQldUdEJRVUZETEUxQlFVRXNTMEZCU3l4RlFVRk1PMEZCUVVRc1MwRkJXanRCUVVGQkxFZEJTa1FzUTBGQlVEdEJRVTFJT3p0bFFVVmpMRlVpTENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYklpaG1kVzVqZEdsdmJpZ3BlMloxYm1OMGFXOXVJSElvWlN4dUxIUXBlMloxYm1OMGFXOXVJRzhvYVN4bUtYdHBaaWdoYmx0cFhTbDdhV1lvSVdWYmFWMHBlM1poY2lCalBWd2lablZ1WTNScGIyNWNJajA5ZEhsd1pXOW1JSEpsY1hWcGNtVW1KbkpsY1hWcGNtVTdhV1lvSVdZbUptTXBjbVYwZFhKdUlHTW9hU3doTUNrN2FXWW9kU2x5WlhSMWNtNGdkU2hwTENFd0tUdDJZWElnWVQxdVpYY2dSWEp5YjNJb1hDSkRZVzV1YjNRZ1ptbHVaQ0J0YjJSMWJHVWdKMXdpSzJrclhDSW5YQ0lwTzNSb2NtOTNJR0V1WTI5a1pUMWNJazFQUkZWTVJWOU9UMVJmUms5VlRrUmNJaXhoZlhaaGNpQndQVzViYVYwOWUyVjRjRzl5ZEhNNmUzMTlPMlZiYVYxYk1GMHVZMkZzYkNod0xtVjRjRzl5ZEhNc1puVnVZM1JwYjI0b2NpbDdkbUZ5SUc0OVpWdHBYVnN4WFZ0eVhUdHlaWFIxY200Z2J5aHVmSHh5S1gwc2NDeHdMbVY0Y0c5eWRITXNjaXhsTEc0c2RDbDljbVYwZFhKdUlHNWJhVjB1Wlhod2IzSjBjMzFtYjNJb2RtRnlJSFU5WENKbWRXNWpkR2x2Ymx3aVBUMTBlWEJsYjJZZ2NtVnhkV2x5WlNZbWNtVnhkV2x5WlN4cFBUQTdhVHgwTG14bGJtZDBhRHRwS3lzcGJ5aDBXMmxkS1R0eVpYUjFjbTRnYjMxeVpYUjFjbTRnY24wcEtDa2lMQ0l2S2lGY2JpQXFJRUJ2ZG1WeWRtbGxkeUJsY3pZdGNISnZiV2x6WlNBdElHRWdkR2x1ZVNCcGJYQnNaVzFsYm5SaGRHbHZiaUJ2WmlCUWNtOXRhWE5sY3k5Qkt5NWNiaUFxSUVCamIzQjVjbWxuYUhRZ1EyOXdlWEpwWjJoMElDaGpLU0F5TURFMElGbGxhSFZrWVNCTFlYUjZMQ0JVYjIwZ1JHRnNaU3dnVTNSbFptRnVJRkJsYm01bGNpQmhibVFnWTI5dWRISnBZblYwYjNKeklDaERiMjUyWlhKemFXOXVJSFJ2SUVWVE5pQkJVRWtnWW5rZ1NtRnJaU0JCY21Ob2FXSmhiR1FwWEc0Z0tpQkFiR2xqWlc1elpTQWdJRXhwWTJWdWMyVmtJSFZ1WkdWeUlFMUpWQ0JzYVdObGJuTmxYRzRnS2lBZ0lDQWdJQ0FnSUNBZ0lGTmxaU0JvZEhSd2N6b3ZMM0poZHk1bmFYUm9kV0oxYzJWeVkyOXVkR1Z1ZEM1amIyMHZjM1JsWm1GdWNHVnVibVZ5TDJWek5pMXdjbTl0YVhObEwyMWhjM1JsY2k5TVNVTkZUbE5GWEc0Z0tpQkFkbVZ5YzJsdmJpQWdJSFkwTGpJdU5TczNaakppTlRJMlpGeHVJQ292WEc1Y2JpaG1kVzVqZEdsdmJpQW9aMnh2WW1Gc0xDQm1ZV04wYjNKNUtTQjdYRzVjZEhSNWNHVnZaaUJsZUhCdmNuUnpJRDA5UFNBbmIySnFaV04wSnlBbUppQjBlWEJsYjJZZ2JXOWtkV3hsSUNFOVBTQW5kVzVrWldacGJtVmtKeUEvSUcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnWm1GamRHOXllU2dwSURwY2JseDBkSGx3Wlc5bUlHUmxabWx1WlNBOVBUMGdKMloxYm1OMGFXOXVKeUFtSmlCa1pXWnBibVV1WVcxa0lEOGdaR1ZtYVc1bEtHWmhZM1J2Y25rcElEcGNibHgwS0dkc2IySmhiQzVGVXpaUWNtOXRhWE5sSUQwZ1ptRmpkRzl5ZVNncEtUdGNibjBvZEdocGN5d2dLR1oxYm1OMGFXOXVJQ2dwSUhzZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1WEc1bWRXNWpkR2x2YmlCdlltcGxZM1JQY2taMWJtTjBhVzl1S0hncElIdGNiaUFnZG1GeUlIUjVjR1VnUFNCMGVYQmxiMllnZUR0Y2JpQWdjbVYwZFhKdUlIZ2dJVDA5SUc1MWJHd2dKaVlnS0hSNWNHVWdQVDA5SUNkdlltcGxZM1FuSUh4OElIUjVjR1VnUFQwOUlDZG1kVzVqZEdsdmJpY3BPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnBjMFoxYm1OMGFXOXVLSGdwSUh0Y2JpQWdjbVYwZFhKdUlIUjVjR1Z2WmlCNElEMDlQU0FuWm5WdVkzUnBiMjRuTzF4dWZWeHVYRzVjYmx4dWRtRnlJRjlwYzBGeWNtRjVJRDBnZG05cFpDQXdPMXh1YVdZZ0tFRnljbUY1TG1selFYSnlZWGtwSUh0Y2JpQWdYMmx6UVhKeVlYa2dQU0JCY25KaGVTNXBjMEZ5Y21GNU8xeHVmU0JsYkhObElIdGNiaUFnWDJselFYSnlZWGtnUFNCbWRXNWpkR2x2YmlBb2VDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG5SdlUzUnlhVzVuTG1OaGJHd29lQ2tnUFQwOUlDZGJiMkpxWldOMElFRnljbUY1WFNjN1hHNGdJSDA3WEc1OVhHNWNiblpoY2lCcGMwRnljbUY1SUQwZ1gybHpRWEp5WVhrN1hHNWNiblpoY2lCc1pXNGdQU0F3TzF4dWRtRnlJSFpsY25SNFRtVjRkQ0E5SUhadmFXUWdNRHRjYm5aaGNpQmpkWE4wYjIxVFkyaGxaSFZzWlhKR2JpQTlJSFp2YVdRZ01EdGNibHh1ZG1GeUlHRnpZWEFnUFNCbWRXNWpkR2x2YmlCaGMyRndLR05oYkd4aVlXTnJMQ0JoY21jcElIdGNiaUFnY1hWbGRXVmJiR1Z1WFNBOUlHTmhiR3hpWVdOck8xeHVJQ0J4ZFdWMVpWdHNaVzRnS3lBeFhTQTlJR0Z5Wnp0Y2JpQWdiR1Z1SUNzOUlESTdYRzRnSUdsbUlDaHNaVzRnUFQwOUlESXBJSHRjYmlBZ0lDQXZMeUJKWmlCc1pXNGdhWE1nTWl3Z2RHaGhkQ0J0WldGdWN5QjBhR0YwSUhkbElHNWxaV1FnZEc4Z2MyTm9aV1IxYkdVZ1lXNGdZWE41Ym1NZ1pteDFjMmd1WEc0Z0lDQWdMeThnU1dZZ1lXUmthWFJwYjI1aGJDQmpZV3hzWW1GamEzTWdZWEpsSUhGMVpYVmxaQ0JpWldadmNtVWdkR2hsSUhGMVpYVmxJR2x6SUdac2RYTm9aV1FzSUhSb1pYbGNiaUFnSUNBdkx5QjNhV3hzSUdKbElIQnliMk5sYzNObFpDQmllU0IwYUdseklHWnNkWE5vSUhSb1lYUWdkMlVnWVhKbElITmphR1ZrZFd4cGJtY3VYRzRnSUNBZ2FXWWdLR04xYzNSdmJWTmphR1ZrZFd4bGNrWnVLU0I3WEc0Z0lDQWdJQ0JqZFhOMGIyMVRZMmhsWkhWc1pYSkdiaWhtYkhWemFDazdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUhOamFHVmtkV3hsUm14MWMyZ29LVHRjYmlBZ0lDQjlYRzRnSUgxY2JuMDdYRzVjYm1aMWJtTjBhVzl1SUhObGRGTmphR1ZrZFd4bGNpaHpZMmhsWkhWc1pVWnVLU0I3WEc0Z0lHTjFjM1J2YlZOamFHVmtkV3hsY2tadUlEMGdjMk5vWldSMWJHVkdianRjYm4xY2JseHVablZ1WTNScGIyNGdjMlYwUVhOaGNDaGhjMkZ3Um00cElIdGNiaUFnWVhOaGNDQTlJR0Z6WVhCR2JqdGNibjFjYmx4dWRtRnlJR0p5YjNkelpYSlhhVzVrYjNjZ1BTQjBlWEJsYjJZZ2QybHVaRzkzSUNFOVBTQW5kVzVrWldacGJtVmtKeUEvSUhkcGJtUnZkeUE2SUhWdVpHVm1hVzVsWkR0Y2JuWmhjaUJpY205M2MyVnlSMnh2WW1Gc0lEMGdZbkp2ZDNObGNsZHBibVJ2ZHlCOGZDQjdmVHRjYm5aaGNpQkNjbTkzYzJWeVRYVjBZWFJwYjI1UFluTmxjblpsY2lBOUlHSnliM2R6WlhKSGJHOWlZV3d1VFhWMFlYUnBiMjVQWW5ObGNuWmxjaUI4ZkNCaWNtOTNjMlZ5UjJ4dlltRnNMbGRsWWt0cGRFMTFkR0YwYVc5dVQySnpaWEoyWlhJN1hHNTJZWElnYVhOT2IyUmxJRDBnZEhsd1pXOW1JSE5sYkdZZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUNZbUlIUjVjR1Z2WmlCd2NtOWpaWE56SUNFOVBTQW5kVzVrWldacGJtVmtKeUFtSmlCN2ZTNTBiMU4wY21sdVp5NWpZV3hzS0hCeWIyTmxjM01wSUQwOVBTQW5XMjlpYW1WamRDQndjbTlqWlhOelhTYzdYRzVjYmk4dklIUmxjM1FnWm05eUlIZGxZaUIzYjNKclpYSWdZblYwSUc1dmRDQnBiaUJKUlRFd1hHNTJZWElnYVhOWGIzSnJaWElnUFNCMGVYQmxiMllnVldsdWREaERiR0Z0Y0dWa1FYSnlZWGtnSVQwOUlDZDFibVJsWm1sdVpXUW5JQ1ltSUhSNWNHVnZaaUJwYlhCdmNuUlRZM0pwY0hSeklDRTlQU0FuZFc1a1pXWnBibVZrSnlBbUppQjBlWEJsYjJZZ1RXVnpjMkZuWlVOb1lXNXVaV3dnSVQwOUlDZDFibVJsWm1sdVpXUW5PMXh1WEc0dkx5QnViMlJsWEc1bWRXNWpkR2x2YmlCMWMyVk9aWGgwVkdsamF5Z3BJSHRjYmlBZ0x5OGdibTlrWlNCMlpYSnphVzl1SURBdU1UQXVlQ0JrYVhOd2JHRjVjeUJoSUdSbGNISmxZMkYwYVc5dUlIZGhjbTVwYm1jZ2QyaGxiaUJ1WlhoMFZHbGpheUJwY3lCMWMyVmtJSEpsWTNWeWMybDJaV3g1WEc0Z0lDOHZJSE5sWlNCb2RIUndjem92TDJkcGRHaDFZaTVqYjIwdlkzVnFiMnB6TDNkb1pXNHZhWE56ZFdWekx6UXhNQ0JtYjNJZ1pHVjBZV2xzYzF4dUlDQnlaWFIxY200Z1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCd2NtOWpaWE56TG01bGVIUlVhV05yS0dac2RYTm9LVHRjYmlBZ2ZUdGNibjFjYmx4dUx5OGdkbVZ5ZEhoY2JtWjFibU4wYVc5dUlIVnpaVlpsY25SNFZHbHRaWElvS1NCN1hHNGdJR2xtSUNoMGVYQmxiMllnZG1WeWRIaE9aWGgwSUNFOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJSEpsZEhWeWJpQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdJQ0IyWlhKMGVFNWxlSFFvWm14MWMyZ3BPMXh1SUNBZ0lIMDdYRzRnSUgxY2JseHVJQ0J5WlhSMWNtNGdkWE5sVTJWMFZHbHRaVzkxZENncE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCMWMyVk5kWFJoZEdsdmJrOWljMlZ5ZG1WeUtDa2dlMXh1SUNCMllYSWdhWFJsY21GMGFXOXVjeUE5SURBN1hHNGdJSFpoY2lCdlluTmxjblpsY2lBOUlHNWxkeUJDY205M2MyVnlUWFYwWVhScGIyNVBZbk5sY25abGNpaG1iSFZ6YUNrN1hHNGdJSFpoY2lCdWIyUmxJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxWR1Y0ZEU1dlpHVW9KeWNwTzF4dUlDQnZZbk5sY25abGNpNXZZbk5sY25abEtHNXZaR1VzSUhzZ1kyaGhjbUZqZEdWeVJHRjBZVG9nZEhKMVpTQjlLVHRjYmx4dUlDQnlaWFIxY200Z1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lHNXZaR1V1WkdGMFlTQTlJR2wwWlhKaGRHbHZibk1nUFNBcksybDBaWEpoZEdsdmJuTWdKU0F5TzF4dUlDQjlPMXh1ZlZ4dVhHNHZMeUIzWldJZ2QyOXlhMlZ5WEc1bWRXNWpkR2x2YmlCMWMyVk5aWE56WVdkbFEyaGhibTVsYkNncElIdGNiaUFnZG1GeUlHTm9ZVzV1Wld3Z1BTQnVaWGNnVFdWemMyRm5aVU5vWVc1dVpXd29LVHRjYmlBZ1kyaGhibTVsYkM1d2IzSjBNUzV2Ym0xbGMzTmhaMlVnUFNCbWJIVnphRHRjYmlBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1SUNncElIdGNiaUFnSUNCeVpYUjFjbTRnWTJoaGJtNWxiQzV3YjNKME1pNXdiM04wVFdWemMyRm5aU2d3S1R0Y2JpQWdmVHRjYm4xY2JseHVablZ1WTNScGIyNGdkWE5sVTJWMFZHbHRaVzkxZENncElIdGNiaUFnTHk4Z1UzUnZjbVVnYzJWMFZHbHRaVzkxZENCeVpXWmxjbVZ1WTJVZ2MyOGdaWE0yTFhCeWIyMXBjMlVnZDJsc2JDQmlaU0IxYm1GbVptVmpkR1ZrSUdKNVhHNGdJQzh2SUc5MGFHVnlJR052WkdVZ2JXOWthV1o1YVc1bklITmxkRlJwYldWdmRYUWdLR3hwYTJVZ2MybHViMjR1ZFhObFJtRnJaVlJwYldWeWN5Z3BLVnh1SUNCMllYSWdaMnh2WW1Gc1UyVjBWR2x0Wlc5MWRDQTlJSE5sZEZScGJXVnZkWFE3WEc0Z0lISmxkSFZ5YmlCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUdkc2IySmhiRk5sZEZScGJXVnZkWFFvWm14MWMyZ3NJREVwTzF4dUlDQjlPMXh1ZlZ4dVhHNTJZWElnY1hWbGRXVWdQU0J1WlhjZ1FYSnlZWGtvTVRBd01DazdYRzVtZFc1amRHbHZiaUJtYkhWemFDZ3BJSHRjYmlBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnNaVzQ3SUdrZ0t6MGdNaWtnZTF4dUlDQWdJSFpoY2lCallXeHNZbUZqYXlBOUlIRjFaWFZsVzJsZE8xeHVJQ0FnSUhaaGNpQmhjbWNnUFNCeGRXVjFaVnRwSUNzZ01WMDdYRzVjYmlBZ0lDQmpZV3hzWW1GamF5aGhjbWNwTzF4dVhHNGdJQ0FnY1hWbGRXVmJhVjBnUFNCMWJtUmxabWx1WldRN1hHNGdJQ0FnY1hWbGRXVmJhU0FySURGZElEMGdkVzVrWldacGJtVmtPMXh1SUNCOVhHNWNiaUFnYkdWdUlEMGdNRHRjYm4xY2JseHVablZ1WTNScGIyNGdZWFIwWlcxd2RGWmxjblI0S0NrZ2UxeHVJQ0IwY25rZ2UxeHVJQ0FnSUhaaGNpQjJaWEowZUNBOUlFWjFibU4wYVc5dUtDZHlaWFIxY200Z2RHaHBjeWNwS0NrdWNtVnhkV2x5WlNnbmRtVnlkSGduS1R0Y2JpQWdJQ0IyWlhKMGVFNWxlSFFnUFNCMlpYSjBlQzV5ZFc1UGJreHZiM0FnZkh3Z2RtVnlkSGd1Y25WdVQyNURiMjUwWlhoME8xeHVJQ0FnSUhKbGRIVnliaUIxYzJWV1pYSjBlRlJwYldWeUtDazdYRzRnSUgwZ1kyRjBZMmdnS0dVcElIdGNiaUFnSUNCeVpYUjFjbTRnZFhObFUyVjBWR2x0Wlc5MWRDZ3BPMXh1SUNCOVhHNTlYRzVjYm5aaGNpQnpZMmhsWkhWc1pVWnNkWE5vSUQwZ2RtOXBaQ0F3TzF4dUx5OGdSR1ZqYVdSbElIZG9ZWFFnWVhONWJtTWdiV1YwYUc5a0lIUnZJSFZ6WlNCMGJ5QjBjbWxuWjJWeWFXNW5JSEJ5YjJObGMzTnBibWNnYjJZZ2NYVmxkV1ZrSUdOaGJHeGlZV05yY3pwY2JtbG1JQ2hwYzA1dlpHVXBJSHRjYmlBZ2MyTm9aV1IxYkdWR2JIVnphQ0E5SUhWelpVNWxlSFJVYVdOcktDazdYRzU5SUdWc2MyVWdhV1lnS0VKeWIzZHpaWEpOZFhSaGRHbHZiazlpYzJWeWRtVnlLU0I3WEc0Z0lITmphR1ZrZFd4bFJteDFjMmdnUFNCMWMyVk5kWFJoZEdsdmJrOWljMlZ5ZG1WeUtDazdYRzU5SUdWc2MyVWdhV1lnS0dselYyOXlhMlZ5S1NCN1hHNGdJSE5qYUdWa2RXeGxSbXgxYzJnZ1BTQjFjMlZOWlhOellXZGxRMmhoYm01bGJDZ3BPMXh1ZlNCbGJITmxJR2xtSUNoaWNtOTNjMlZ5VjJsdVpHOTNJRDA5UFNCMWJtUmxabWx1WldRZ0ppWWdkSGx3Wlc5bUlISmxjWFZwY21VZ1BUMDlJQ2RtZFc1amRHbHZiaWNwSUh0Y2JpQWdjMk5vWldSMWJHVkdiSFZ6YUNBOUlHRjBkR1Z0Y0hSV1pYSjBlQ2dwTzF4dWZTQmxiSE5sSUh0Y2JpQWdjMk5vWldSMWJHVkdiSFZ6YUNBOUlIVnpaVk5sZEZScGJXVnZkWFFvS1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnZEdobGJpaHZia1oxYkdacGJHeHRaVzUwTENCdmJsSmxhbVZqZEdsdmJpa2dlMXh1SUNCMllYSWdjR0Z5Wlc1MElEMGdkR2hwY3p0Y2JseHVJQ0IyWVhJZ1kyaHBiR1FnUFNCdVpYY2dkR2hwY3k1amIyNXpkSEoxWTNSdmNpaHViMjl3S1R0Y2JseHVJQ0JwWmlBb1kyaHBiR1JiVUZKUFRVbFRSVjlKUkYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJRzFoYTJWUWNtOXRhWE5sS0dOb2FXeGtLVHRjYmlBZ2ZWeHVYRzRnSUhaaGNpQmZjM1JoZEdVZ1BTQndZWEpsYm5RdVgzTjBZWFJsTzF4dVhHNWNiaUFnYVdZZ0tGOXpkR0YwWlNrZ2UxeHVJQ0FnSUhaaGNpQmpZV3hzWW1GamF5QTlJR0Z5WjNWdFpXNTBjMXRmYzNSaGRHVWdMU0F4WFR0Y2JpQWdJQ0JoYzJGd0tHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnBiblp2YTJWRFlXeHNZbUZqYXloZmMzUmhkR1VzSUdOb2FXeGtMQ0JqWVd4c1ltRmpheXdnY0dGeVpXNTBMbDl5WlhOMWJIUXBPMXh1SUNBZ0lIMHBPMXh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJSE4xWW5OamNtbGlaU2h3WVhKbGJuUXNJR05vYVd4a0xDQnZia1oxYkdacGJHeHRaVzUwTENCdmJsSmxhbVZqZEdsdmJpazdYRzRnSUgxY2JseHVJQ0J5WlhSMWNtNGdZMmhwYkdRN1hHNTlYRzVjYmk4cUtseHVJQ0JnVUhKdmJXbHpaUzV5WlhOdmJIWmxZQ0J5WlhSMWNtNXpJR0VnY0hKdmJXbHpaU0IwYUdGMElIZHBiR3dnWW1WamIyMWxJSEpsYzI5c2RtVmtJSGRwZEdnZ2RHaGxYRzRnSUhCaGMzTmxaQ0JnZG1Gc2RXVmdMaUJKZENCcGN5QnphRzl5ZEdoaGJtUWdabTl5SUhSb1pTQm1iMnhzYjNkcGJtYzZYRzVjYmlBZ1lHQmdhbUYyWVhOamNtbHdkRnh1SUNCc1pYUWdjSEp2YldselpTQTlJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1S0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2w3WEc0Z0lDQWdjbVZ6YjJ4MlpTZ3hLVHRjYmlBZ2ZTazdYRzVjYmlBZ2NISnZiV2x6WlM1MGFHVnVLR1oxYm1OMGFXOXVLSFpoYkhWbEtYdGNiaUFnSUNBdkx5QjJZV3gxWlNBOVBUMGdNVnh1SUNCOUtUdGNiaUFnWUdCZ1hHNWNiaUFnU1c1emRHVmhaQ0J2WmlCM2NtbDBhVzVuSUhSb1pTQmhZbTkyWlN3Z2VXOTFjaUJqYjJSbElHNXZkeUJ6YVcxd2JIa2dZbVZqYjIxbGN5QjBhR1VnWm05c2JHOTNhVzVuT2x4dVhHNGdJR0JnWUdwaGRtRnpZM0pwY0hSY2JpQWdiR1YwSUhCeWIyMXBjMlVnUFNCUWNtOXRhWE5sTG5KbGMyOXNkbVVvTVNrN1hHNWNiaUFnY0hKdmJXbHpaUzUwYUdWdUtHWjFibU4wYVc5dUtIWmhiSFZsS1h0Y2JpQWdJQ0F2THlCMllXeDFaU0E5UFQwZ01WeHVJQ0I5S1R0Y2JpQWdZR0JnWEc1Y2JpQWdRRzFsZEdodlpDQnlaWE52YkhabFhHNGdJRUJ6ZEdGMGFXTmNiaUFnUUhCaGNtRnRJSHRCYm5sOUlIWmhiSFZsSUhaaGJIVmxJSFJvWVhRZ2RHaGxJSEpsZEhWeWJtVmtJSEJ5YjIxcGMyVWdkMmxzYkNCaVpTQnlaWE52YkhabFpDQjNhWFJvWEc0Z0lGVnpaV1oxYkNCbWIzSWdkRzl2YkdsdVp5NWNiaUFnUUhKbGRIVnliaUI3VUhKdmJXbHpaWDBnWVNCd2NtOXRhWE5sSUhSb1lYUWdkMmxzYkNCaVpXTnZiV1VnWm5Wc1ptbHNiR1ZrSUhkcGRHZ2dkR2hsSUdkcGRtVnVYRzRnSUdCMllXeDFaV0JjYmlvdlhHNW1kVzVqZEdsdmJpQnlaWE52YkhabEpERW9iMkpxWldOMEtTQjdYRzRnSUM4cWFuTm9hVzUwSUhaaGJHbGtkR2hwY3pwMGNuVmxJQ292WEc0Z0lIWmhjaUJEYjI1emRISjFZM1J2Y2lBOUlIUm9hWE03WEc1Y2JpQWdhV1lnS0c5aWFtVmpkQ0FtSmlCMGVYQmxiMllnYjJKcVpXTjBJRDA5UFNBbmIySnFaV04wSnlBbUppQnZZbXBsWTNRdVkyOXVjM1J5ZFdOMGIzSWdQVDA5SUVOdmJuTjBjblZqZEc5eUtTQjdYRzRnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRHRjYmlBZ2ZWeHVYRzRnSUhaaGNpQndjbTl0YVhObElEMGdibVYzSUVOdmJuTjBjblZqZEc5eUtHNXZiM0FwTzF4dUlDQnlaWE52YkhabEtIQnliMjFwYzJVc0lHOWlhbVZqZENrN1hHNGdJSEpsZEhWeWJpQndjbTl0YVhObE8xeHVmVnh1WEc1MllYSWdVRkpQVFVsVFJWOUpSQ0E5SUUxaGRHZ3VjbUZ1Wkc5dEtDa3VkRzlUZEhKcGJtY29NellwTG5OMVluTjBjbWx1WnlneUtUdGNibHh1Wm5WdVkzUnBiMjRnYm05dmNDZ3BJSHQ5WEc1Y2JuWmhjaUJRUlU1RVNVNUhJRDBnZG05cFpDQXdPMXh1ZG1GeUlFWlZURVpKVEV4RlJDQTlJREU3WEc1MllYSWdVa1ZLUlVOVVJVUWdQU0F5TzF4dVhHNTJZWElnVkZKWlgwTkJWRU5JWDBWU1VrOVNJRDBnZXlCbGNuSnZjam9nYm5Wc2JDQjlPMXh1WEc1bWRXNWpkR2x2YmlCelpXeG1SblZzWm1sc2JHMWxiblFvS1NCN1hHNGdJSEpsZEhWeWJpQnVaWGNnVkhsd1pVVnljbTl5S0Z3aVdXOTFJR05oYm01dmRDQnlaWE52YkhabElHRWdjSEp2YldselpTQjNhWFJvSUdsMGMyVnNabHdpS1R0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWTJGdWJtOTBVbVYwZFhKdVQzZHVLQ2tnZTF4dUlDQnlaWFIxY200Z2JtVjNJRlI1Y0dWRmNuSnZjaWduUVNCd2NtOXRhWE5sY3lCallXeHNZbUZqYXlCallXNXViM1FnY21WMGRYSnVJSFJvWVhRZ2MyRnRaU0J3Y205dGFYTmxMaWNwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJuWlhSVWFHVnVLSEJ5YjIxcGMyVXBJSHRjYmlBZ2RISjVJSHRjYmlBZ0lDQnlaWFIxY200Z2NISnZiV2x6WlM1MGFHVnVPMXh1SUNCOUlHTmhkR05vSUNobGNuSnZjaWtnZTF4dUlDQWdJRlJTV1Y5RFFWUkRTRjlGVWxKUFVpNWxjbkp2Y2lBOUlHVnljbTl5TzF4dUlDQWdJSEpsZEhWeWJpQlVVbGxmUTBGVVEwaGZSVkpTVDFJN1hHNGdJSDFjYm4xY2JseHVablZ1WTNScGIyNGdkSEo1VkdobGJpaDBhR1Z1SkNReExDQjJZV3gxWlN3Z1puVnNabWxzYkcxbGJuUklZVzVrYkdWeUxDQnlaV3BsWTNScGIyNUlZVzVrYkdWeUtTQjdYRzRnSUhSeWVTQjdYRzRnSUNBZ2RHaGxiaVFrTVM1allXeHNLSFpoYkhWbExDQm1kV3htYVd4c2JXVnVkRWhoYm1Sc1pYSXNJSEpsYW1WamRHbHZia2hoYm1Sc1pYSXBPMXh1SUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUdVN1hHNGdJSDFjYm4xY2JseHVablZ1WTNScGIyNGdhR0Z1Wkd4bFJtOXlaV2xuYmxSb1pXNWhZbXhsS0hCeWIyMXBjMlVzSUhSb1pXNWhZbXhsTENCMGFHVnVKQ1F4S1NCN1hHNGdJR0Z6WVhBb1puVnVZM1JwYjI0Z0tIQnliMjFwYzJVcElIdGNiaUFnSUNCMllYSWdjMlZoYkdWa0lEMGdabUZzYzJVN1hHNGdJQ0FnZG1GeUlHVnljbTl5SUQwZ2RISjVWR2hsYmloMGFHVnVKQ1F4TENCMGFHVnVZV0pzWlN3Z1puVnVZM1JwYjI0Z0tIWmhiSFZsS1NCN1hHNGdJQ0FnSUNCcFppQW9jMlZoYkdWa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lITmxZV3hsWkNBOUlIUnlkV1U3WEc0Z0lDQWdJQ0JwWmlBb2RHaGxibUZpYkdVZ0lUMDlJSFpoYkhWbEtTQjdYRzRnSUNBZ0lDQWdJSEpsYzI5c2RtVW9jSEp2YldselpTd2dkbUZzZFdVcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ1puVnNabWxzYkNod2NtOXRhWE5sTENCMllXeDFaU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU3dnWm5WdVkzUnBiMjRnS0hKbFlYTnZiaWtnZTF4dUlDQWdJQ0FnYVdZZ0tITmxZV3hsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCelpXRnNaV1FnUFNCMGNuVmxPMXh1WEc0Z0lDQWdJQ0J5WldwbFkzUW9jSEp2YldselpTd2djbVZoYzI5dUtUdGNiaUFnSUNCOUxDQW5VMlYwZEd4bE9pQW5JQ3NnS0hCeWIyMXBjMlV1WDJ4aFltVnNJSHg4SUNjZ2RXNXJibTkzYmlCd2NtOXRhWE5sSnlrcE8xeHVYRzRnSUNBZ2FXWWdLQ0Z6WldGc1pXUWdKaVlnWlhKeWIzSXBJSHRjYmlBZ0lDQWdJSE5sWVd4bFpDQTlJSFJ5ZFdVN1hHNGdJQ0FnSUNCeVpXcGxZM1FvY0hKdmJXbHpaU3dnWlhKeWIzSXBPMXh1SUNBZ0lIMWNiaUFnZlN3Z2NISnZiV2x6WlNrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdoaGJtUnNaVTkzYmxSb1pXNWhZbXhsS0hCeWIyMXBjMlVzSUhSb1pXNWhZbXhsS1NCN1hHNGdJR2xtSUNoMGFHVnVZV0pzWlM1ZmMzUmhkR1VnUFQwOUlFWlZURVpKVEV4RlJDa2dlMXh1SUNBZ0lHWjFiR1pwYkd3b2NISnZiV2x6WlN3Z2RHaGxibUZpYkdVdVgzSmxjM1ZzZENrN1hHNGdJSDBnWld4elpTQnBaaUFvZEdobGJtRmliR1V1WDNOMFlYUmxJRDA5UFNCU1JVcEZRMVJGUkNrZ2UxeHVJQ0FnSUhKbGFtVmpkQ2h3Y205dGFYTmxMQ0IwYUdWdVlXSnNaUzVmY21WemRXeDBLVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0J6ZFdKelkzSnBZbVVvZEdobGJtRmliR1VzSUhWdVpHVm1hVzVsWkN3Z1puVnVZM1JwYjI0Z0tIWmhiSFZsS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY21WemIyeDJaU2h3Y205dGFYTmxMQ0IyWVd4MVpTazdYRzRnSUNBZ2ZTd2dablZ1WTNScGIyNGdLSEpsWVhOdmJpa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlISmxhbVZqZENod2NtOXRhWE5sTENCeVpXRnpiMjRwTzF4dUlDQWdJSDBwTzF4dUlDQjlYRzU5WEc1Y2JtWjFibU4wYVc5dUlHaGhibVJzWlUxaGVXSmxWR2hsYm1GaWJHVW9jSEp2YldselpTd2diV0Y1WW1WVWFHVnVZV0pzWlN3Z2RHaGxiaVFrTVNrZ2UxeHVJQ0JwWmlBb2JXRjVZbVZVYUdWdVlXSnNaUzVqYjI1emRISjFZM1J2Y2lBOVBUMGdjSEp2YldselpTNWpiMjV6ZEhKMVkzUnZjaUFtSmlCMGFHVnVKQ1F4SUQwOVBTQjBhR1Z1SUNZbUlHMWhlV0psVkdobGJtRmliR1V1WTI5dWMzUnlkV04wYjNJdWNtVnpiMngyWlNBOVBUMGdjbVZ6YjJ4MlpTUXhLU0I3WEc0Z0lDQWdhR0Z1Wkd4bFQzZHVWR2hsYm1GaWJHVW9jSEp2YldselpTd2diV0Y1WW1WVWFHVnVZV0pzWlNrN1hHNGdJSDBnWld4elpTQjdYRzRnSUNBZ2FXWWdLSFJvWlc0a0pERWdQVDA5SUZSU1dWOURRVlJEU0Y5RlVsSlBVaWtnZTF4dUlDQWdJQ0FnY21WcVpXTjBLSEJ5YjIxcGMyVXNJRlJTV1Y5RFFWUkRTRjlGVWxKUFVpNWxjbkp2Y2lrN1hHNGdJQ0FnSUNCVVVsbGZRMEZVUTBoZlJWSlNUMUl1WlhKeWIzSWdQU0J1ZFd4c08xeHVJQ0FnSUgwZ1pXeHpaU0JwWmlBb2RHaGxiaVFrTVNBOVBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0JtZFd4bWFXeHNLSEJ5YjIxcGMyVXNJRzFoZVdKbFZHaGxibUZpYkdVcE8xeHVJQ0FnSUgwZ1pXeHpaU0JwWmlBb2FYTkdkVzVqZEdsdmJpaDBhR1Z1SkNReEtTa2dlMXh1SUNBZ0lDQWdhR0Z1Wkd4bFJtOXlaV2xuYmxSb1pXNWhZbXhsS0hCeWIyMXBjMlVzSUcxaGVXSmxWR2hsYm1GaWJHVXNJSFJvWlc0a0pERXBPMXh1SUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNCbWRXeG1hV3hzS0hCeWIyMXBjMlVzSUcxaGVXSmxWR2hsYm1GaWJHVXBPMXh1SUNBZ0lIMWNiaUFnZlZ4dWZWeHVYRzVtZFc1amRHbHZiaUJ5WlhOdmJIWmxLSEJ5YjIxcGMyVXNJSFpoYkhWbEtTQjdYRzRnSUdsbUlDaHdjbTl0YVhObElEMDlQU0IyWVd4MVpTa2dlMXh1SUNBZ0lISmxhbVZqZENod2NtOXRhWE5sTENCelpXeG1SblZzWm1sc2JHMWxiblFvS1NrN1hHNGdJSDBnWld4elpTQnBaaUFvYjJKcVpXTjBUM0pHZFc1amRHbHZiaWgyWVd4MVpTa3BJSHRjYmlBZ0lDQm9ZVzVrYkdWTllYbGlaVlJvWlc1aFlteGxLSEJ5YjIxcGMyVXNJSFpoYkhWbExDQm5aWFJVYUdWdUtIWmhiSFZsS1NrN1hHNGdJSDBnWld4elpTQjdYRzRnSUNBZ1puVnNabWxzYkNod2NtOXRhWE5sTENCMllXeDFaU2s3WEc0Z0lIMWNibjFjYmx4dVpuVnVZM1JwYjI0Z2NIVmliR2x6YUZKbGFtVmpkR2x2Ymlod2NtOXRhWE5sS1NCN1hHNGdJR2xtSUNod2NtOXRhWE5sTGw5dmJtVnljbTl5S1NCN1hHNGdJQ0FnY0hKdmJXbHpaUzVmYjI1bGNuSnZjaWh3Y205dGFYTmxMbDl5WlhOMWJIUXBPMXh1SUNCOVhHNWNiaUFnY0hWaWJHbHphQ2h3Y205dGFYTmxLVHRjYm4xY2JseHVablZ1WTNScGIyNGdablZzWm1sc2JDaHdjbTl0YVhObExDQjJZV3gxWlNrZ2UxeHVJQ0JwWmlBb2NISnZiV2x6WlM1ZmMzUmhkR1VnSVQwOUlGQkZUa1JKVGtjcElIdGNiaUFnSUNCeVpYUjFjbTQ3WEc0Z0lIMWNibHh1SUNCd2NtOXRhWE5sTGw5eVpYTjFiSFFnUFNCMllXeDFaVHRjYmlBZ2NISnZiV2x6WlM1ZmMzUmhkR1VnUFNCR1ZVeEdTVXhNUlVRN1hHNWNiaUFnYVdZZ0tIQnliMjFwYzJVdVgzTjFZbk5qY21saVpYSnpMbXhsYm1kMGFDQWhQVDBnTUNrZ2UxeHVJQ0FnSUdGellYQW9jSFZpYkdsemFDd2djSEp2YldselpTazdYRzRnSUgxY2JuMWNibHh1Wm5WdVkzUnBiMjRnY21WcVpXTjBLSEJ5YjIxcGMyVXNJSEpsWVhOdmJpa2dlMXh1SUNCcFppQW9jSEp2YldselpTNWZjM1JoZEdVZ0lUMDlJRkJGVGtSSlRrY3BJSHRjYmlBZ0lDQnlaWFIxY200N1hHNGdJSDFjYmlBZ2NISnZiV2x6WlM1ZmMzUmhkR1VnUFNCU1JVcEZRMVJGUkR0Y2JpQWdjSEp2YldselpTNWZjbVZ6ZFd4MElEMGdjbVZoYzI5dU8xeHVYRzRnSUdGellYQW9jSFZpYkdsemFGSmxhbVZqZEdsdmJpd2djSEp2YldselpTazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlITjFZbk5qY21saVpTaHdZWEpsYm5Rc0lHTm9hV3hrTENCdmJrWjFiR1pwYkd4dFpXNTBMQ0J2YmxKbGFtVmpkR2x2YmlrZ2UxeHVJQ0IyWVhJZ1gzTjFZbk5qY21saVpYSnpJRDBnY0dGeVpXNTBMbDl6ZFdKelkzSnBZbVZ5Y3p0Y2JpQWdkbUZ5SUd4bGJtZDBhQ0E5SUY5emRXSnpZM0pwWW1WeWN5NXNaVzVuZEdnN1hHNWNibHh1SUNCd1lYSmxiblF1WDI5dVpYSnliM0lnUFNCdWRXeHNPMXh1WEc0Z0lGOXpkV0p6WTNKcFltVnljMXRzWlc1bmRHaGRJRDBnWTJocGJHUTdYRzRnSUY5emRXSnpZM0pwWW1WeWMxdHNaVzVuZEdnZ0t5QkdWVXhHU1V4TVJVUmRJRDBnYjI1R2RXeG1hV3hzYldWdWREdGNiaUFnWDNOMVluTmpjbWxpWlhKelcyeGxibWQwYUNBcklGSkZTa1ZEVkVWRVhTQTlJRzl1VW1WcVpXTjBhVzl1TzF4dVhHNGdJR2xtSUNoc1pXNW5kR2dnUFQwOUlEQWdKaVlnY0dGeVpXNTBMbDl6ZEdGMFpTa2dlMXh1SUNBZ0lHRnpZWEFvY0hWaWJHbHphQ3dnY0dGeVpXNTBLVHRjYmlBZ2ZWeHVmVnh1WEc1bWRXNWpkR2x2YmlCd2RXSnNhWE5vS0hCeWIyMXBjMlVwSUh0Y2JpQWdkbUZ5SUhOMVluTmpjbWxpWlhKeklEMGdjSEp2YldselpTNWZjM1ZpYzJOeWFXSmxjbk03WEc0Z0lIWmhjaUJ6WlhSMGJHVmtJRDBnY0hKdmJXbHpaUzVmYzNSaGRHVTdYRzVjYmlBZ2FXWWdLSE4xWW5OamNtbGlaWEp6TG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lISmxkSFZ5Ymp0Y2JpQWdmVnh1WEc0Z0lIWmhjaUJqYUdsc1pDQTlJSFp2YVdRZ01DeGNiaUFnSUNBZ0lHTmhiR3hpWVdOcklEMGdkbTlwWkNBd0xGeHVJQ0FnSUNBZ1pHVjBZV2xzSUQwZ2NISnZiV2x6WlM1ZmNtVnpkV3gwTzF4dVhHNGdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYzNWaWMyTnlhV0psY25NdWJHVnVaM1JvT3lCcElDczlJRE1wSUh0Y2JpQWdJQ0JqYUdsc1pDQTlJSE4xWW5OamNtbGlaWEp6VzJsZE8xeHVJQ0FnSUdOaGJHeGlZV05ySUQwZ2MzVmljMk55YVdKbGNuTmJhU0FySUhObGRIUnNaV1JkTzF4dVhHNGdJQ0FnYVdZZ0tHTm9hV3hrS1NCN1hHNGdJQ0FnSUNCcGJuWnZhMlZEWVd4c1ltRmpheWh6WlhSMGJHVmtMQ0JqYUdsc1pDd2dZMkZzYkdKaFkyc3NJR1JsZEdGcGJDazdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUdOaGJHeGlZV05yS0dSbGRHRnBiQ2s3WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnY0hKdmJXbHpaUzVmYzNWaWMyTnlhV0psY25NdWJHVnVaM1JvSUQwZ01EdGNibjFjYmx4dVpuVnVZM1JwYjI0Z2RISjVRMkYwWTJnb1kyRnNiR0poWTJzc0lHUmxkR0ZwYkNrZ2UxeHVJQ0IwY25rZ2UxeHVJQ0FnSUhKbGRIVnliaUJqWVd4c1ltRmpheWhrWlhSaGFXd3BPMXh1SUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ1ZGSlpYME5CVkVOSVgwVlNVazlTTG1WeWNtOXlJRDBnWlR0Y2JpQWdJQ0J5WlhSMWNtNGdWRkpaWDBOQlZFTklYMFZTVWs5U08xeHVJQ0I5WEc1OVhHNWNibVoxYm1OMGFXOXVJR2x1ZG05clpVTmhiR3hpWVdOcktITmxkSFJzWldRc0lIQnliMjFwYzJVc0lHTmhiR3hpWVdOckxDQmtaWFJoYVd3cElIdGNiaUFnZG1GeUlHaGhjME5oYkd4aVlXTnJJRDBnYVhOR2RXNWpkR2x2YmloallXeHNZbUZqYXlrc1hHNGdJQ0FnSUNCMllXeDFaU0E5SUhadmFXUWdNQ3hjYmlBZ0lDQWdJR1Z5Y205eUlEMGdkbTlwWkNBd0xGeHVJQ0FnSUNBZ2MzVmpZMlZsWkdWa0lEMGdkbTlwWkNBd0xGeHVJQ0FnSUNBZ1ptRnBiR1ZrSUQwZ2RtOXBaQ0F3TzF4dVhHNGdJR2xtSUNob1lYTkRZV3hzWW1GamF5a2dlMXh1SUNBZ0lIWmhiSFZsSUQwZ2RISjVRMkYwWTJnb1kyRnNiR0poWTJzc0lHUmxkR0ZwYkNrN1hHNWNiaUFnSUNCcFppQW9kbUZzZFdVZ1BUMDlJRlJTV1Y5RFFWUkRTRjlGVWxKUFVpa2dlMXh1SUNBZ0lDQWdabUZwYkdWa0lEMGdkSEoxWlR0Y2JpQWdJQ0FnSUdWeWNtOXlJRDBnZG1Gc2RXVXVaWEp5YjNJN1hHNGdJQ0FnSUNCMllXeDFaUzVsY25KdmNpQTlJRzUxYkd3N1hHNGdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJSE4xWTJObFpXUmxaQ0E5SUhSeWRXVTdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXWWdLSEJ5YjIxcGMyVWdQVDA5SUhaaGJIVmxLU0I3WEc0Z0lDQWdJQ0J5WldwbFkzUW9jSEp2YldselpTd2dZMkZ1Ym05MFVtVjBkWEp1VDNkdUtDa3BPMXh1SUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUgxY2JpQWdmU0JsYkhObElIdGNiaUFnSUNCMllXeDFaU0E5SUdSbGRHRnBiRHRjYmlBZ0lDQnpkV05qWldWa1pXUWdQU0IwY25WbE8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0hCeWIyMXBjMlV1WDNOMFlYUmxJQ0U5UFNCUVJVNUVTVTVIS1NCN1hHNGdJQ0FnTHk4Z2JtOXZjRnh1SUNCOUlHVnNjMlVnYVdZZ0tHaGhjME5oYkd4aVlXTnJJQ1ltSUhOMVkyTmxaV1JsWkNrZ2UxeHVJQ0FnSUhKbGMyOXNkbVVvY0hKdmJXbHpaU3dnZG1Gc2RXVXBPMXh1SUNCOUlHVnNjMlVnYVdZZ0tHWmhhV3hsWkNrZ2UxeHVJQ0FnSUhKbGFtVmpkQ2h3Y205dGFYTmxMQ0JsY25KdmNpazdYRzRnSUgwZ1pXeHpaU0JwWmlBb2MyVjBkR3hsWkNBOVBUMGdSbFZNUmtsTVRFVkVLU0I3WEc0Z0lDQWdablZzWm1sc2JDaHdjbTl0YVhObExDQjJZV3gxWlNrN1hHNGdJSDBnWld4elpTQnBaaUFvYzJWMGRHeGxaQ0E5UFQwZ1VrVktSVU5VUlVRcElIdGNiaUFnSUNCeVpXcGxZM1FvY0hKdmJXbHpaU3dnZG1Gc2RXVXBPMXh1SUNCOVhHNTlYRzVjYm1aMWJtTjBhVzl1SUdsdWFYUnBZV3hwZW1WUWNtOXRhWE5sS0hCeWIyMXBjMlVzSUhKbGMyOXNkbVZ5S1NCN1hHNGdJSFJ5ZVNCN1hHNGdJQ0FnY21WemIyeDJaWElvWm5WdVkzUnBiMjRnY21WemIyeDJaVkJ5YjIxcGMyVW9kbUZzZFdVcElIdGNiaUFnSUNBZ0lISmxjMjlzZG1Vb2NISnZiV2x6WlN3Z2RtRnNkV1VwTzF4dUlDQWdJSDBzSUdaMWJtTjBhVzl1SUhKbGFtVmpkRkJ5YjIxcGMyVW9jbVZoYzI5dUtTQjdYRzRnSUNBZ0lDQnlaV3BsWTNRb2NISnZiV2x6WlN3Z2NtVmhjMjl1S1R0Y2JpQWdJQ0I5S1R0Y2JpQWdmU0JqWVhSamFDQW9aU2tnZTF4dUlDQWdJSEpsYW1WamRDaHdjbTl0YVhObExDQmxLVHRjYmlBZ2ZWeHVmVnh1WEc1MllYSWdhV1FnUFNBd08xeHVablZ1WTNScGIyNGdibVY0ZEVsa0tDa2dlMXh1SUNCeVpYUjFjbTRnYVdRckt6dGNibjFjYmx4dVpuVnVZM1JwYjI0Z2JXRnJaVkJ5YjIxcGMyVW9jSEp2YldselpTa2dlMXh1SUNCd2NtOXRhWE5sVzFCU1QwMUpVMFZmU1VSZElEMGdhV1FyS3p0Y2JpQWdjSEp2YldselpTNWZjM1JoZEdVZ1BTQjFibVJsWm1sdVpXUTdYRzRnSUhCeWIyMXBjMlV1WDNKbGMzVnNkQ0E5SUhWdVpHVm1hVzVsWkR0Y2JpQWdjSEp2YldselpTNWZjM1ZpYzJOeWFXSmxjbk1nUFNCYlhUdGNibjFjYmx4dVpuVnVZM1JwYjI0Z2RtRnNhV1JoZEdsdmJrVnljbTl5S0NrZ2UxeHVJQ0J5WlhSMWNtNGdibVYzSUVWeWNtOXlLQ2RCY25KaGVTQk5aWFJvYjJSeklHMTFjM1FnWW1VZ2NISnZkbWxrWldRZ1lXNGdRWEp5WVhrbktUdGNibjFjYmx4dWRtRnlJRVZ1ZFcxbGNtRjBiM0lnUFNCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUdaMWJtTjBhVzl1SUVWdWRXMWxjbUYwYjNJb1EyOXVjM1J5ZFdOMGIzSXNJR2x1Y0hWMEtTQjdYRzRnSUNBZ2RHaHBjeTVmYVc1emRHRnVZMlZEYjI1emRISjFZM1J2Y2lBOUlFTnZibk4wY25WamRHOXlPMXh1SUNBZ0lIUm9hWE11Y0hKdmJXbHpaU0E5SUc1bGR5QkRiMjV6ZEhKMVkzUnZjaWh1YjI5d0tUdGNibHh1SUNBZ0lHbG1JQ2doZEdocGN5NXdjbTl0YVhObFcxQlNUMDFKVTBWZlNVUmRLU0I3WEc0Z0lDQWdJQ0J0WVd0bFVISnZiV2x6WlNoMGFHbHpMbkJ5YjIxcGMyVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHbG1JQ2hwYzBGeWNtRjVLR2x1Y0hWMEtTa2dlMXh1SUNBZ0lDQWdkR2hwY3k1c1pXNW5kR2dnUFNCcGJuQjFkQzVzWlc1bmRHZzdYRzRnSUNBZ0lDQjBhR2x6TGw5eVpXMWhhVzVwYm1jZ1BTQnBibkIxZEM1c1pXNW5kR2c3WEc1Y2JpQWdJQ0FnSUhSb2FYTXVYM0psYzNWc2RDQTlJRzVsZHlCQmNuSmhlU2gwYUdsekxteGxibWQwYUNrN1hHNWNiaUFnSUNBZ0lHbG1JQ2gwYUdsekxteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCbWRXeG1hV3hzS0hSb2FYTXVjSEp2YldselpTd2dkR2hwY3k1ZmNtVnpkV3gwS1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXViR1Z1WjNSb0lEMGdkR2hwY3k1c1pXNW5kR2dnZkh3Z01EdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ZlpXNTFiV1Z5WVhSbEtHbHVjSFYwS1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgzSmxiV0ZwYm1sdVp5QTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJR1oxYkdacGJHd29kR2hwY3k1d2NtOXRhWE5sTENCMGFHbHpMbDl5WlhOMWJIUXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lISmxhbVZqZENoMGFHbHpMbkJ5YjIxcGMyVXNJSFpoYkdsa1lYUnBiMjVGY25KdmNpZ3BLVHRjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0JGYm5WdFpYSmhkRzl5TG5CeWIzUnZkSGx3WlM1ZlpXNTFiV1Z5WVhSbElEMGdablZ1WTNScGIyNGdYMlZ1ZFcxbGNtRjBaU2hwYm5CMWRDa2dlMXh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCMGFHbHpMbDl6ZEdGMFpTQTlQVDBnVUVWT1JFbE9SeUFtSmlCcElEd2dhVzV3ZFhRdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJSFJvYVhNdVgyVmhZMmhGYm5SeWVTaHBibkIxZEZ0cFhTd2dhU2s3WEc0Z0lDQWdmVnh1SUNCOU8xeHVYRzRnSUVWdWRXMWxjbUYwYjNJdWNISnZkRzkwZVhCbExsOWxZV05vUlc1MGNua2dQU0JtZFc1amRHbHZiaUJmWldGamFFVnVkSEo1S0dWdWRISjVMQ0JwS1NCN1hHNGdJQ0FnZG1GeUlHTWdQU0IwYUdsekxsOXBibk4wWVc1alpVTnZibk4wY25WamRHOXlPMXh1SUNBZ0lIWmhjaUJ5WlhOdmJIWmxKQ1F4SUQwZ1l5NXlaWE52YkhabE8xeHVYRzVjYmlBZ0lDQnBaaUFvY21WemIyeDJaU1FrTVNBOVBUMGdjbVZ6YjJ4MlpTUXhLU0I3WEc0Z0lDQWdJQ0IyWVhJZ1gzUm9aVzRnUFNCblpYUlVhR1Z1S0dWdWRISjVLVHRjYmx4dUlDQWdJQ0FnYVdZZ0tGOTBhR1Z1SUQwOVBTQjBhR1Z1SUNZbUlHVnVkSEo1TGw5emRHRjBaU0FoUFQwZ1VFVk9SRWxPUnlrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5elpYUjBiR1ZrUVhRb1pXNTBjbmt1WDNOMFlYUmxMQ0JwTENCbGJuUnllUzVmY21WemRXeDBLVHRjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JRjkwYUdWdUlDRTlQU0FuWm5WdVkzUnBiMjRuS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDNKbGJXRnBibWx1WnkwdE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5eVpYTjFiSFJiYVYwZ1BTQmxiblJ5ZVR0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb1l5QTlQVDBnVUhKdmJXbHpaU1F4S1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ3Y205dGFYTmxJRDBnYm1WM0lHTW9ibTl2Y0NrN1hHNGdJQ0FnSUNBZ0lHaGhibVJzWlUxaGVXSmxWR2hsYm1GaWJHVW9jSEp2YldselpTd2daVzUwY25rc0lGOTBhR1Z1S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmZDJsc2JGTmxkSFJzWlVGMEtIQnliMjFwYzJVc0lHa3BPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ZmQybHNiRk5sZEhSc1pVRjBLRzVsZHlCaktHWjFibU4wYVc5dUlDaHlaWE52YkhabEpDUXhLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbGMyOXNkbVVrSkRFb1pXNTBjbmtwTzF4dUlDQWdJQ0FnSUNCOUtTd2dhU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lIUm9hWE11WDNkcGJHeFRaWFIwYkdWQmRDaHlaWE52YkhabEpDUXhLR1Z1ZEhKNUtTd2dhU2s3WEc0Z0lDQWdmVnh1SUNCOU8xeHVYRzRnSUVWdWRXMWxjbUYwYjNJdWNISnZkRzkwZVhCbExsOXpaWFIwYkdWa1FYUWdQU0JtZFc1amRHbHZiaUJmYzJWMGRHeGxaRUYwS0hOMFlYUmxMQ0JwTENCMllXeDFaU2tnZTF4dUlDQWdJSFpoY2lCd2NtOXRhWE5sSUQwZ2RHaHBjeTV3Y205dGFYTmxPMXh1WEc1Y2JpQWdJQ0JwWmlBb2NISnZiV2x6WlM1ZmMzUmhkR1VnUFQwOUlGQkZUa1JKVGtjcElIdGNiaUFnSUNBZ0lIUm9hWE11WDNKbGJXRnBibWx1WnkwdE8xeHVYRzRnSUNBZ0lDQnBaaUFvYzNSaGRHVWdQVDA5SUZKRlNrVkRWRVZFS1NCN1hHNGdJQ0FnSUNBZ0lISmxhbVZqZENod2NtOXRhWE5sTENCMllXeDFaU2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOXlaWE4xYkhSYmFWMGdQU0IyWVd4MVpUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCcFppQW9kR2hwY3k1ZmNtVnRZV2x1YVc1bklEMDlQU0F3S1NCN1hHNGdJQ0FnSUNCbWRXeG1hV3hzS0hCeWIyMXBjMlVzSUhSb2FYTXVYM0psYzNWc2RDazdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dVhHNGdJRVZ1ZFcxbGNtRjBiM0l1Y0hKdmRHOTBlWEJsTGw5M2FXeHNVMlYwZEd4bFFYUWdQU0JtZFc1amRHbHZiaUJmZDJsc2JGTmxkSFJzWlVGMEtIQnliMjFwYzJVc0lHa3BJSHRjYmlBZ0lDQjJZWElnWlc1MWJXVnlZWFJ2Y2lBOUlIUm9hWE03WEc1Y2JpQWdJQ0J6ZFdKelkzSnBZbVVvY0hKdmJXbHpaU3dnZFc1a1pXWnBibVZrTENCbWRXNWpkR2x2YmlBb2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJsYm5WdFpYSmhkRzl5TGw5elpYUjBiR1ZrUVhRb1JsVk1Sa2xNVEVWRUxDQnBMQ0IyWVd4MVpTazdYRzRnSUNBZ2ZTd2dablZ1WTNScGIyNGdLSEpsWVhOdmJpa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHVnVkVzFsY21GMGIzSXVYM05sZEhSc1pXUkJkQ2hTUlVwRlExUkZSQ3dnYVN3Z2NtVmhjMjl1S1R0Y2JpQWdJQ0I5S1R0Y2JpQWdmVHRjYmx4dUlDQnlaWFIxY200Z1JXNTFiV1Z5WVhSdmNqdGNibjBvS1R0Y2JseHVMeW9xWEc0Z0lHQlFjbTl0YVhObExtRnNiR0FnWVdOalpYQjBjeUJoYmlCaGNuSmhlU0J2WmlCd2NtOXRhWE5sY3l3Z1lXNWtJSEpsZEhWeWJuTWdZU0J1WlhjZ2NISnZiV2x6WlNCM2FHbGphRnh1SUNCcGN5Qm1kV3htYVd4c1pXUWdkMmwwYUNCaGJpQmhjbkpoZVNCdlppQm1kV3htYVd4c2JXVnVkQ0IyWVd4MVpYTWdabTl5SUhSb1pTQndZWE56WldRZ2NISnZiV2x6WlhNc0lHOXlYRzRnSUhKbGFtVmpkR1ZrSUhkcGRHZ2dkR2hsSUhKbFlYTnZiaUJ2WmlCMGFHVWdabWx5YzNRZ2NHRnpjMlZrSUhCeWIyMXBjMlVnZEc4Z1ltVWdjbVZxWldOMFpXUXVJRWwwSUdOaGMzUnpJR0ZzYkZ4dUlDQmxiR1Z0Wlc1MGN5QnZaaUIwYUdVZ2NHRnpjMlZrSUdsMFpYSmhZbXhsSUhSdklIQnliMjFwYzJWeklHRnpJR2wwSUhKMWJuTWdkR2hwY3lCaGJHZHZjbWwwYUcwdVhHNWNiaUFnUlhoaGJYQnNaVHBjYmx4dUlDQmdZR0JxWVhaaGMyTnlhWEIwWEc0Z0lHeGxkQ0J3Y205dGFYTmxNU0E5SUhKbGMyOXNkbVVvTVNrN1hHNGdJR3hsZENCd2NtOXRhWE5sTWlBOUlISmxjMjlzZG1Vb01pazdYRzRnSUd4bGRDQndjbTl0YVhObE15QTlJSEpsYzI5c2RtVW9NeWs3WEc0Z0lHeGxkQ0J3Y205dGFYTmxjeUE5SUZzZ2NISnZiV2x6WlRFc0lIQnliMjFwYzJVeUxDQndjbTl0YVhObE15QmRPMXh1WEc0Z0lGQnliMjFwYzJVdVlXeHNLSEJ5YjIxcGMyVnpLUzUwYUdWdUtHWjFibU4wYVc5dUtHRnljbUY1S1h0Y2JpQWdJQ0F2THlCVWFHVWdZWEp5WVhrZ2FHVnlaU0IzYjNWc1pDQmlaU0JiSURFc0lESXNJRE1nWFR0Y2JpQWdmU2s3WEc0Z0lHQmdZRnh1WEc0Z0lFbG1JR0Z1ZVNCdlppQjBhR1VnWUhCeWIyMXBjMlZ6WUNCbmFYWmxiaUIwYnlCZ1lXeHNZQ0JoY21VZ2NtVnFaV04wWldRc0lIUm9aU0JtYVhKemRDQndjbTl0YVhObFhHNGdJSFJvWVhRZ2FYTWdjbVZxWldOMFpXUWdkMmxzYkNCaVpTQm5hWFpsYmlCaGN5QmhiaUJoY21kMWJXVnVkQ0IwYnlCMGFHVWdjbVYwZFhKdVpXUWdjSEp2YldselpYTW5jMXh1SUNCeVpXcGxZM1JwYjI0Z2FHRnVaR3hsY2k0Z1JtOXlJR1Y0WVcxd2JHVTZYRzVjYmlBZ1JYaGhiWEJzWlRwY2JseHVJQ0JnWUdCcVlYWmhjMk55YVhCMFhHNGdJR3hsZENCd2NtOXRhWE5sTVNBOUlISmxjMjlzZG1Vb01TazdYRzRnSUd4bGRDQndjbTl0YVhObE1pQTlJSEpsYW1WamRDaHVaWGNnUlhKeWIzSW9YQ0l5WENJcEtUdGNiaUFnYkdWMElIQnliMjFwYzJVeklEMGdjbVZxWldOMEtHNWxkeUJGY25KdmNpaGNJak5jSWlrcE8xeHVJQ0JzWlhRZ2NISnZiV2x6WlhNZ1BTQmJJSEJ5YjIxcGMyVXhMQ0J3Y205dGFYTmxNaXdnY0hKdmJXbHpaVE1nWFR0Y2JseHVJQ0JRY205dGFYTmxMbUZzYkNod2NtOXRhWE5sY3lrdWRHaGxiaWhtZFc1amRHbHZiaWhoY25KaGVTbDdYRzRnSUNBZ0x5OGdRMjlrWlNCb1pYSmxJRzVsZG1WeUlISjFibk1nWW1WallYVnpaU0IwYUdWeVpTQmhjbVVnY21WcVpXTjBaV1FnY0hKdmJXbHpaWE1oWEc0Z0lIMHNJR1oxYm1OMGFXOXVLR1Z5Y205eUtTQjdYRzRnSUNBZ0x5OGdaWEp5YjNJdWJXVnpjMkZuWlNBOVBUMGdYQ0l5WENKY2JpQWdmU2s3WEc0Z0lHQmdZRnh1WEc0Z0lFQnRaWFJvYjJRZ1lXeHNYRzRnSUVCemRHRjBhV05jYmlBZ1FIQmhjbUZ0SUh0QmNuSmhlWDBnWlc1MGNtbGxjeUJoY25KaGVTQnZaaUJ3Y205dGFYTmxjMXh1SUNCQWNHRnlZVzBnZTFOMGNtbHVaMzBnYkdGaVpXd2diM0IwYVc5dVlXd2djM1J5YVc1bklHWnZjaUJzWVdKbGJHbHVaeUIwYUdVZ2NISnZiV2x6WlM1Y2JpQWdWWE5sWm5Wc0lHWnZjaUIwYjI5c2FXNW5MbHh1SUNCQWNtVjBkWEp1SUh0UWNtOXRhWE5sZlNCd2NtOXRhWE5sSUhSb1lYUWdhWE1nWm5Wc1ptbHNiR1ZrSUhkb1pXNGdZV3hzSUdCd2NtOXRhWE5sYzJBZ2FHRjJaU0JpWldWdVhHNGdJR1oxYkdacGJHeGxaQ3dnYjNJZ2NtVnFaV04wWldRZ2FXWWdZVzU1SUc5bUlIUm9aVzBnWW1WamIyMWxJSEpsYW1WamRHVmtMbHh1SUNCQWMzUmhkR2xqWEc0cUwxeHVablZ1WTNScGIyNGdZV3hzS0dWdWRISnBaWE1wSUh0Y2JpQWdjbVYwZFhKdUlHNWxkeUJGYm5WdFpYSmhkRzl5S0hSb2FYTXNJR1Z1ZEhKcFpYTXBMbkJ5YjIxcGMyVTdYRzU5WEc1Y2JpOHFLbHh1SUNCZ1VISnZiV2x6WlM1eVlXTmxZQ0J5WlhSMWNtNXpJR0VnYm1WM0lIQnliMjFwYzJVZ2QyaHBZMmdnYVhNZ2MyVjBkR3hsWkNCcGJpQjBhR1VnYzJGdFpTQjNZWGtnWVhNZ2RHaGxYRzRnSUdacGNuTjBJSEJoYzNObFpDQndjbTl0YVhObElIUnZJSE5sZEhSc1pTNWNibHh1SUNCRmVHRnRjR3hsT2x4dVhHNGdJR0JnWUdwaGRtRnpZM0pwY0hSY2JpQWdiR1YwSUhCeWIyMXBjMlV4SUQwZ2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtYdGNiaUFnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUtDbDdYRzRnSUNBZ0lDQnlaWE52YkhabEtDZHdjbTl0YVhObElERW5LVHRjYmlBZ0lDQjlMQ0F5TURBcE8xeHVJQ0I5S1R0Y2JseHVJQ0JzWlhRZ2NISnZiV2x6WlRJZ1BTQnVaWGNnVUhKdmJXbHpaU2htZFc1amRHbHZiaWh5WlhOdmJIWmxMQ0J5WldwbFkzUXBlMXh1SUNBZ0lITmxkRlJwYldWdmRYUW9ablZ1WTNScGIyNG9LWHRjYmlBZ0lDQWdJSEpsYzI5c2RtVW9KM0J5YjIxcGMyVWdNaWNwTzF4dUlDQWdJSDBzSURFd01DazdYRzRnSUgwcE8xeHVYRzRnSUZCeWIyMXBjMlV1Y21GalpTaGJjSEp2YldselpURXNJSEJ5YjIxcGMyVXlYU2t1ZEdobGJpaG1kVzVqZEdsdmJpaHlaWE4xYkhRcGUxeHVJQ0FnSUM4dklISmxjM1ZzZENBOVBUMGdKM0J5YjIxcGMyVWdNaWNnWW1WallYVnpaU0JwZENCM1lYTWdjbVZ6YjJ4MlpXUWdZbVZtYjNKbElIQnliMjFwYzJVeFhHNGdJQ0FnTHk4Z2QyRnpJSEpsYzI5c2RtVmtMbHh1SUNCOUtUdGNiaUFnWUdCZ1hHNWNiaUFnWUZCeWIyMXBjMlV1Y21GalpXQWdhWE1nWkdWMFpYSnRhVzVwYzNScFl5QnBiaUIwYUdGMElHOXViSGtnZEdobElITjBZWFJsSUc5bUlIUm9aU0JtYVhKemRGeHVJQ0J6WlhSMGJHVmtJSEJ5YjIxcGMyVWdiV0YwZEdWeWN5NGdSbTl5SUdWNFlXMXdiR1VzSUdWMlpXNGdhV1lnYjNSb1pYSWdjSEp2YldselpYTWdaMmwyWlc0Z2RHOGdkR2hsWEc0Z0lHQndjbTl0YVhObGMyQWdZWEp5WVhrZ1lYSm5kVzFsYm5RZ1lYSmxJSEpsYzI5c2RtVmtMQ0JpZFhRZ2RHaGxJR1pwY25OMElITmxkSFJzWldRZ2NISnZiV2x6WlNCb1lYTmNiaUFnWW1WamIyMWxJSEpsYW1WamRHVmtJR0psWm05eVpTQjBhR1VnYjNSb1pYSWdjSEp2YldselpYTWdZbVZqWVcxbElHWjFiR1pwYkd4bFpDd2dkR2hsSUhKbGRIVnlibVZrWEc0Z0lIQnliMjFwYzJVZ2QybHNiQ0JpWldOdmJXVWdjbVZxWldOMFpXUTZYRzVjYmlBZ1lHQmdhbUYyWVhOamNtbHdkRnh1SUNCc1pYUWdjSEp2YldselpURWdQU0J1WlhjZ1VISnZiV2x6WlNobWRXNWpkR2x2YmloeVpYTnZiSFpsTENCeVpXcGxZM1FwZTF4dUlDQWdJSE5sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjRvS1h0Y2JpQWdJQ0FnSUhKbGMyOXNkbVVvSjNCeWIyMXBjMlVnTVNjcE8xeHVJQ0FnSUgwc0lESXdNQ2s3WEc0Z0lIMHBPMXh1WEc0Z0lHeGxkQ0J3Y205dGFYTmxNaUE5SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUtISmxjMjlzZG1Vc0lISmxhbVZqZENsN1hHNGdJQ0FnYzJWMFZHbHRaVzkxZENobWRXNWpkR2x2YmlncGUxeHVJQ0FnSUNBZ2NtVnFaV04wS0c1bGR5QkZjbkp2Y2lnbmNISnZiV2x6WlNBeUp5a3BPMXh1SUNBZ0lIMHNJREV3TUNrN1hHNGdJSDBwTzF4dVhHNGdJRkJ5YjIxcGMyVXVjbUZqWlNoYmNISnZiV2x6WlRFc0lIQnliMjFwYzJVeVhTa3VkR2hsYmlobWRXNWpkR2x2YmloeVpYTjFiSFFwZTF4dUlDQWdJQzh2SUVOdlpHVWdhR1Z5WlNCdVpYWmxjaUJ5ZFc1elhHNGdJSDBzSUdaMWJtTjBhVzl1S0hKbFlYTnZiaWw3WEc0Z0lDQWdMeThnY21WaGMyOXVMbTFsYzNOaFoyVWdQVDA5SUNkd2NtOXRhWE5sSURJbklHSmxZMkYxYzJVZ2NISnZiV2x6WlNBeUlHSmxZMkZ0WlNCeVpXcGxZM1JsWkNCaVpXWnZjbVZjYmlBZ0lDQXZMeUJ3Y205dGFYTmxJREVnWW1WallXMWxJR1oxYkdacGJHeGxaRnh1SUNCOUtUdGNiaUFnWUdCZ1hHNWNiaUFnUVc0Z1pYaGhiWEJzWlNCeVpXRnNMWGR2Y214a0lIVnpaU0JqWVhObElHbHpJR2x0Y0d4bGJXVnVkR2x1WnlCMGFXMWxiM1YwY3pwY2JseHVJQ0JnWUdCcVlYWmhjMk55YVhCMFhHNGdJRkJ5YjIxcGMyVXVjbUZqWlNoYllXcGhlQ2duWm05dkxtcHpiMjRuS1N3Z2RHbHRaVzkxZENnMU1EQXdLVjBwWEc0Z0lHQmdZRnh1WEc0Z0lFQnRaWFJvYjJRZ2NtRmpaVnh1SUNCQWMzUmhkR2xqWEc0Z0lFQndZWEpoYlNCN1FYSnlZWGw5SUhCeWIyMXBjMlZ6SUdGeWNtRjVJRzltSUhCeWIyMXBjMlZ6SUhSdklHOWljMlZ5ZG1WY2JpQWdWWE5sWm5Wc0lHWnZjaUIwYjI5c2FXNW5MbHh1SUNCQWNtVjBkWEp1SUh0UWNtOXRhWE5sZlNCaElIQnliMjFwYzJVZ2QyaHBZMmdnYzJWMGRHeGxjeUJwYmlCMGFHVWdjMkZ0WlNCM1lYa2dZWE1nZEdobElHWnBjbk4wSUhCaGMzTmxaRnh1SUNCd2NtOXRhWE5sSUhSdklITmxkSFJzWlM1Y2Jpb3ZYRzVtZFc1amRHbHZiaUJ5WVdObEtHVnVkSEpwWlhNcElIdGNiaUFnTHlwcWMyaHBiblFnZG1Gc2FXUjBhR2x6T25SeWRXVWdLaTljYmlBZ2RtRnlJRU52Ym5OMGNuVmpkRzl5SUQwZ2RHaHBjenRjYmx4dUlDQnBaaUFvSVdselFYSnlZWGtvWlc1MGNtbGxjeWtwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUVOdmJuTjBjblZqZEc5eUtHWjFibU4wYVc5dUlDaGZMQ0J5WldwbFkzUXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnlaV3BsWTNRb2JtVjNJRlI1Y0dWRmNuSnZjaWduV1c5MUlHMTFjM1FnY0dGemN5QmhiaUJoY25KaGVTQjBieUJ5WVdObExpY3BLVHRjYmlBZ0lDQjlLVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUVOdmJuTjBjblZqZEc5eUtHWjFibU4wYVc5dUlDaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lIWmhjaUJzWlc1bmRHZ2dQU0JsYm5SeWFXVnpMbXhsYm1kMGFEdGNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2diR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUNBZ1EyOXVjM1J5ZFdOMGIzSXVjbVZ6YjJ4MlpTaGxiblJ5YVdWelcybGRLUzUwYUdWdUtISmxjMjlzZG1Vc0lISmxhbVZqZENrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlNrN1hHNGdJSDFjYm4xY2JseHVMeW9xWEc0Z0lHQlFjbTl0YVhObExuSmxhbVZqZEdBZ2NtVjBkWEp1Y3lCaElIQnliMjFwYzJVZ2NtVnFaV04wWldRZ2QybDBhQ0IwYUdVZ2NHRnpjMlZrSUdCeVpXRnpiMjVnTGx4dUlDQkpkQ0JwY3lCemFHOXlkR2hoYm1RZ1ptOXlJSFJvWlNCbWIyeHNiM2RwYm1jNlhHNWNiaUFnWUdCZ2FtRjJZWE5qY21sd2RGeHVJQ0JzWlhRZ2NISnZiV2x6WlNBOUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVLSEpsYzI5c2RtVXNJSEpsYW1WamRDbDdYRzRnSUNBZ2NtVnFaV04wS0c1bGR5QkZjbkp2Y2lnblYwaFBUMUJUSnlrcE8xeHVJQ0I5S1R0Y2JseHVJQ0J3Y205dGFYTmxMblJvWlc0b1puVnVZM1JwYjI0b2RtRnNkV1VwZTF4dUlDQWdJQzh2SUVOdlpHVWdhR1Z5WlNCa2IyVnpiaWQwSUhKMWJpQmlaV05oZFhObElIUm9aU0J3Y205dGFYTmxJR2x6SUhKbGFtVmpkR1ZrSVZ4dUlDQjlMQ0JtZFc1amRHbHZiaWh5WldGemIyNHBlMXh1SUNBZ0lDOHZJSEpsWVhOdmJpNXRaWE56WVdkbElEMDlQU0FuVjBoUFQxQlRKMXh1SUNCOUtUdGNiaUFnWUdCZ1hHNWNiaUFnU1c1emRHVmhaQ0J2WmlCM2NtbDBhVzVuSUhSb1pTQmhZbTkyWlN3Z2VXOTFjaUJqYjJSbElHNXZkeUJ6YVcxd2JIa2dZbVZqYjIxbGN5QjBhR1VnWm05c2JHOTNhVzVuT2x4dVhHNGdJR0JnWUdwaGRtRnpZM0pwY0hSY2JpQWdiR1YwSUhCeWIyMXBjMlVnUFNCUWNtOXRhWE5sTG5KbGFtVmpkQ2h1WlhjZ1JYSnliM0lvSjFkSVQwOVFVeWNwS1R0Y2JseHVJQ0J3Y205dGFYTmxMblJvWlc0b1puVnVZM1JwYjI0b2RtRnNkV1VwZTF4dUlDQWdJQzh2SUVOdlpHVWdhR1Z5WlNCa2IyVnpiaWQwSUhKMWJpQmlaV05oZFhObElIUm9aU0J3Y205dGFYTmxJR2x6SUhKbGFtVmpkR1ZrSVZ4dUlDQjlMQ0JtZFc1amRHbHZiaWh5WldGemIyNHBlMXh1SUNBZ0lDOHZJSEpsWVhOdmJpNXRaWE56WVdkbElEMDlQU0FuVjBoUFQxQlRKMXh1SUNCOUtUdGNiaUFnWUdCZ1hHNWNiaUFnUUcxbGRHaHZaQ0J5WldwbFkzUmNiaUFnUUhOMFlYUnBZMXh1SUNCQWNHRnlZVzBnZTBGdWVYMGdjbVZoYzI5dUlIWmhiSFZsSUhSb1lYUWdkR2hsSUhKbGRIVnlibVZrSUhCeWIyMXBjMlVnZDJsc2JDQmlaU0J5WldwbFkzUmxaQ0IzYVhSb0xseHVJQ0JWYzJWbWRXd2dabTl5SUhSdmIyeHBibWN1WEc0Z0lFQnlaWFIxY200Z2UxQnliMjFwYzJWOUlHRWdjSEp2YldselpTQnlaV3BsWTNSbFpDQjNhWFJvSUhSb1pTQm5hWFpsYmlCZ2NtVmhjMjl1WUM1Y2Jpb3ZYRzVtZFc1amRHbHZiaUJ5WldwbFkzUWtNU2h5WldGemIyNHBJSHRjYmlBZ0x5cHFjMmhwYm5RZ2RtRnNhV1IwYUdsek9uUnlkV1VnS2k5Y2JpQWdkbUZ5SUVOdmJuTjBjblZqZEc5eUlEMGdkR2hwY3p0Y2JpQWdkbUZ5SUhCeWIyMXBjMlVnUFNCdVpYY2dRMjl1YzNSeWRXTjBiM0lvYm05dmNDazdYRzRnSUhKbGFtVmpkQ2h3Y205dGFYTmxMQ0J5WldGemIyNHBPMXh1SUNCeVpYUjFjbTRnY0hKdmJXbHpaVHRjYm4xY2JseHVablZ1WTNScGIyNGdibVZsWkhOU1pYTnZiSFpsY2lncElIdGNiaUFnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnbldXOTFJRzExYzNRZ2NHRnpjeUJoSUhKbGMyOXNkbVZ5SUdaMWJtTjBhVzl1SUdGeklIUm9aU0JtYVhKemRDQmhjbWQxYldWdWRDQjBieUIwYUdVZ2NISnZiV2x6WlNCamIyNXpkSEoxWTNSdmNpY3BPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnVaV1ZrYzA1bGR5Z3BJSHRjYmlBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpaGNJa1poYVd4bFpDQjBieUJqYjI1emRISjFZM1FnSjFCeWIyMXBjMlVuT2lCUWJHVmhjMlVnZFhObElIUm9aU0FuYm1WM0p5QnZjR1Z5WVhSdmNpd2dkR2hwY3lCdlltcGxZM1FnWTI5dWMzUnlkV04wYjNJZ1kyRnVibTkwSUdKbElHTmhiR3hsWkNCaGN5QmhJR1oxYm1OMGFXOXVMbHdpS1R0Y2JuMWNibHh1THlvcVhHNGdJRkJ5YjIxcGMyVWdiMkpxWldOMGN5QnlaWEJ5WlhObGJuUWdkR2hsSUdWMlpXNTBkV0ZzSUhKbGMzVnNkQ0J2WmlCaGJpQmhjM2x1WTJoeWIyNXZkWE1nYjNCbGNtRjBhVzl1TGlCVWFHVmNiaUFnY0hKcGJXRnllU0IzWVhrZ2IyWWdhVzUwWlhKaFkzUnBibWNnZDJsMGFDQmhJSEJ5YjIxcGMyVWdhWE1nZEdoeWIzVm5hQ0JwZEhNZ1lIUm9aVzVnSUcxbGRHaHZaQ3dnZDJocFkyaGNiaUFnY21WbmFYTjBaWEp6SUdOaGJHeGlZV05yY3lCMGJ5QnlaV05sYVhabElHVnBkR2hsY2lCaElIQnliMjFwYzJVbmN5QmxkbVZ1ZEhWaGJDQjJZV3gxWlNCdmNpQjBhR1VnY21WaGMyOXVYRzRnSUhkb2VTQjBhR1VnY0hKdmJXbHpaU0JqWVc1dWIzUWdZbVVnWm5Wc1ptbHNiR1ZrTGx4dVhHNGdJRlJsY20xcGJtOXNiMmQ1WEc0Z0lDMHRMUzB0TFMwdExTMHRYRzVjYmlBZ0xTQmdjSEp2YldselpXQWdhWE1nWVc0Z2IySnFaV04wSUc5eUlHWjFibU4wYVc5dUlIZHBkR2dnWVNCZ2RHaGxibUFnYldWMGFHOWtJSGRvYjNObElHSmxhR0YyYVc5eUlHTnZibVp2Y20xeklIUnZJSFJvYVhNZ2MzQmxZMmxtYVdOaGRHbHZiaTVjYmlBZ0xTQmdkR2hsYm1GaWJHVmdJR2x6SUdGdUlHOWlhbVZqZENCdmNpQm1kVzVqZEdsdmJpQjBhR0YwSUdSbFptbHVaWE1nWVNCZ2RHaGxibUFnYldWMGFHOWtMbHh1SUNBdElHQjJZV3gxWldBZ2FYTWdZVzU1SUd4bFoyRnNJRXBoZG1GVFkzSnBjSFFnZG1Gc2RXVWdLR2x1WTJ4MVpHbHVaeUIxYm1SbFptbHVaV1FzSUdFZ2RHaGxibUZpYkdVc0lHOXlJR0VnY0hKdmJXbHpaU2t1WEc0Z0lDMGdZR1Y0WTJWd2RHbHZibUFnYVhNZ1lTQjJZV3gxWlNCMGFHRjBJR2x6SUhSb2NtOTNiaUIxYzJsdVp5QjBhR1VnZEdoeWIzY2djM1JoZEdWdFpXNTBMbHh1SUNBdElHQnlaV0Z6YjI1Z0lHbHpJR0VnZG1Gc2RXVWdkR2hoZENCcGJtUnBZMkYwWlhNZ2QyaDVJR0VnY0hKdmJXbHpaU0IzWVhNZ2NtVnFaV04wWldRdVhHNGdJQzBnWUhObGRIUnNaV1JnSUhSb1pTQm1hVzVoYkNCeVpYTjBhVzVuSUhOMFlYUmxJRzltSUdFZ2NISnZiV2x6WlN3Z1puVnNabWxzYkdWa0lHOXlJSEpsYW1WamRHVmtMbHh1WEc0Z0lFRWdjSEp2YldselpTQmpZVzRnWW1VZ2FXNGdiMjVsSUc5bUlIUm9jbVZsSUhOMFlYUmxjem9nY0dWdVpHbHVaeXdnWm5Wc1ptbHNiR1ZrTENCdmNpQnlaV3BsWTNSbFpDNWNibHh1SUNCUWNtOXRhWE5sY3lCMGFHRjBJR0Z5WlNCbWRXeG1hV3hzWldRZ2FHRjJaU0JoSUdaMWJHWnBiR3h0Wlc1MElIWmhiSFZsSUdGdVpDQmhjbVVnYVc0Z2RHaGxJR1oxYkdacGJHeGxaRnh1SUNCemRHRjBaUzRnSUZCeWIyMXBjMlZ6SUhSb1lYUWdZWEpsSUhKbGFtVmpkR1ZrSUdoaGRtVWdZU0J5WldwbFkzUnBiMjRnY21WaGMyOXVJR0Z1WkNCaGNtVWdhVzRnZEdobFhHNGdJSEpsYW1WamRHVmtJSE4wWVhSbExpQWdRU0JtZFd4bWFXeHNiV1Z1ZENCMllXeDFaU0JwY3lCdVpYWmxjaUJoSUhSb1pXNWhZbXhsTGx4dVhHNGdJRkJ5YjIxcGMyVnpJR05oYmlCaGJITnZJR0psSUhOaGFXUWdkRzhnS25KbGMyOXNkbVVxSUdFZ2RtRnNkV1V1SUNCSlppQjBhR2x6SUhaaGJIVmxJR2x6SUdGc2MyOGdZVnh1SUNCd2NtOXRhWE5sTENCMGFHVnVJSFJvWlNCdmNtbG5hVzVoYkNCd2NtOXRhWE5sSjNNZ2MyVjBkR3hsWkNCemRHRjBaU0IzYVd4c0lHMWhkR05vSUhSb1pTQjJZV3gxWlNkelhHNGdJSE5sZEhSc1pXUWdjM1JoZEdVdUlDQlRieUJoSUhCeWIyMXBjMlVnZEdoaGRDQXFjbVZ6YjJ4MlpYTXFJR0VnY0hKdmJXbHpaU0IwYUdGMElISmxhbVZqZEhNZ2QybHNiRnh1SUNCcGRITmxiR1lnY21WcVpXTjBMQ0JoYm1RZ1lTQndjbTl0YVhObElIUm9ZWFFnS25KbGMyOXNkbVZ6S2lCaElIQnliMjFwYzJVZ2RHaGhkQ0JtZFd4bWFXeHNjeUIzYVd4c1hHNGdJR2wwYzJWc1ppQm1kV3htYVd4c0xseHVYRzVjYmlBZ1FtRnphV01nVlhOaFoyVTZYRzRnSUMwdExTMHRMUzB0TFMwdExWeHVYRzRnSUdCZ1lHcHpYRzRnSUd4bGRDQndjbTl0YVhObElEMGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdMeThnYjI0Z2MzVmpZMlZ6YzF4dUlDQWdJSEpsYzI5c2RtVW9kbUZzZFdVcE8xeHVYRzRnSUNBZ0x5OGdiMjRnWm1GcGJIVnlaVnh1SUNBZ0lISmxhbVZqZENoeVpXRnpiMjRwTzF4dUlDQjlLVHRjYmx4dUlDQndjbTl0YVhObExuUm9aVzRvWm5WdVkzUnBiMjRvZG1Gc2RXVXBJSHRjYmlBZ0lDQXZMeUJ2YmlCbWRXeG1hV3hzYldWdWRGeHVJQ0I5TENCbWRXNWpkR2x2YmloeVpXRnpiMjRwSUh0Y2JpQWdJQ0F2THlCdmJpQnlaV3BsWTNScGIyNWNiaUFnZlNrN1hHNGdJR0JnWUZ4dVhHNGdJRUZrZG1GdVkyVmtJRlZ6WVdkbE9seHVJQ0F0TFMwdExTMHRMUzB0TFMwdExTMWNibHh1SUNCUWNtOXRhWE5sY3lCemFHbHVaU0IzYUdWdUlHRmljM1J5WVdOMGFXNW5JR0YzWVhrZ1lYTjVibU5vY205dWIzVnpJR2x1ZEdWeVlXTjBhVzl1Y3lCemRXTm9JR0Z6WEc0Z0lHQllUVXhJZEhSd1VtVnhkV1Z6ZEdCekxseHVYRzRnSUdCZ1lHcHpYRzRnSUdaMWJtTjBhVzl1SUdkbGRFcFRUMDRvZFhKc0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUtISmxjMjlzZG1Vc0lISmxhbVZqZENsN1hHNGdJQ0FnSUNCc1pYUWdlR2h5SUQwZ2JtVjNJRmhOVEVoMGRIQlNaWEYxWlhOMEtDazdYRzVjYmlBZ0lDQWdJSGhvY2k1dmNHVnVLQ2RIUlZRbkxDQjFjbXdwTzF4dUlDQWdJQ0FnZUdoeUxtOXVjbVZoWkhsemRHRjBaV05vWVc1blpTQTlJR2hoYm1Sc1pYSTdYRzRnSUNBZ0lDQjRhSEl1Y21WemNHOXVjMlZVZVhCbElEMGdKMnB6YjI0bk8xeHVJQ0FnSUNBZ2VHaHlMbk5sZEZKbGNYVmxjM1JJWldGa1pYSW9KMEZqWTJWd2RDY3NJQ2RoY0hCc2FXTmhkR2x2Ymk5cWMyOXVKeWs3WEc0Z0lDQWdJQ0I0YUhJdWMyVnVaQ2dwTzF4dVhHNGdJQ0FnSUNCbWRXNWpkR2x2YmlCb1lXNWtiR1Z5S0NrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvZEdocGN5NXlaV0ZrZVZOMFlYUmxJRDA5UFNCMGFHbHpMa1JQVGtVcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTV6ZEdGMGRYTWdQVDA5SURJd01Da2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNoMGFHbHpMbkpsYzNCdmJuTmxLVHRjYmlBZ0lDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVZxWldOMEtHNWxkeUJGY25KdmNpZ25aMlYwU2xOUFRqb2dZQ2NnS3lCMWNtd2dLeUFuWUNCbVlXbHNaV1FnZDJsMGFDQnpkR0YwZFhNNklGc25JQ3NnZEdocGN5NXpkR0YwZFhNZ0t5QW5YU2NwS1R0Y2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDA3WEc0Z0lDQWdmU2s3WEc0Z0lIMWNibHh1SUNCblpYUktVMDlPS0NjdmNHOXpkSE11YW5OdmJpY3BMblJvWlc0b1puVnVZM1JwYjI0b2FuTnZiaWtnZTF4dUlDQWdJQzh2SUc5dUlHWjFiR1pwYkd4dFpXNTBYRzRnSUgwc0lHWjFibU4wYVc5dUtISmxZWE52YmlrZ2UxeHVJQ0FnSUM4dklHOXVJSEpsYW1WamRHbHZibHh1SUNCOUtUdGNiaUFnWUdCZ1hHNWNiaUFnVlc1c2FXdGxJR05oYkd4aVlXTnJjeXdnY0hKdmJXbHpaWE1nWVhKbElHZHlaV0YwSUdOdmJYQnZjMkZpYkdVZ2NISnBiV2wwYVhabGN5NWNibHh1SUNCZ1lHQnFjMXh1SUNCUWNtOXRhWE5sTG1Gc2JDaGJYRzRnSUNBZ1oyVjBTbE5QVGlnbkwzQnZjM1J6Snlrc1hHNGdJQ0FnWjJWMFNsTlBUaWduTDJOdmJXMWxiblJ6SnlsY2JpQWdYU2t1ZEdobGJpaG1kVzVqZEdsdmJpaDJZV3gxWlhNcGUxeHVJQ0FnSUhaaGJIVmxjMXN3WFNBdkx5QTlQaUJ3YjNOMGMwcFRUMDVjYmlBZ0lDQjJZV3gxWlhOYk1WMGdMeThnUFQ0Z1kyOXRiV1Z1ZEhOS1UwOU9YRzVjYmlBZ0lDQnlaWFIxY200Z2RtRnNkV1Z6TzF4dUlDQjlLVHRjYmlBZ1lHQmdYRzVjYmlBZ1FHTnNZWE56SUZCeWIyMXBjMlZjYmlBZ1FIQmhjbUZ0SUh0R2RXNWpkR2x2Ym4wZ2NtVnpiMngyWlhKY2JpQWdWWE5sWm5Wc0lHWnZjaUIwYjI5c2FXNW5MbHh1SUNCQVkyOXVjM1J5ZFdOMGIzSmNiaW92WEc1Y2JuWmhjaUJRY205dGFYTmxKREVnUFNCbWRXNWpkR2x2YmlBb0tTQjdYRzRnSUdaMWJtTjBhVzl1SUZCeWIyMXBjMlVvY21WemIyeDJaWElwSUh0Y2JpQWdJQ0IwYUdselcxQlNUMDFKVTBWZlNVUmRJRDBnYm1WNGRFbGtLQ2s3WEc0Z0lDQWdkR2hwY3k1ZmNtVnpkV3gwSUQwZ2RHaHBjeTVmYzNSaGRHVWdQU0IxYm1SbFptbHVaV1E3WEc0Z0lDQWdkR2hwY3k1ZmMzVmljMk55YVdKbGNuTWdQU0JiWFR0Y2JseHVJQ0FnSUdsbUlDaHViMjl3SUNFOVBTQnlaWE52YkhabGNpa2dlMXh1SUNBZ0lDQWdkSGx3Wlc5bUlISmxjMjlzZG1WeUlDRTlQU0FuWm5WdVkzUnBiMjRuSUNZbUlHNWxaV1J6VW1WemIyeDJaWElvS1R0Y2JpQWdJQ0FnSUhSb2FYTWdhVzV6ZEdGdVkyVnZaaUJRY205dGFYTmxJRDhnYVc1cGRHbGhiR2w2WlZCeWIyMXBjMlVvZEdocGN5d2djbVZ6YjJ4MlpYSXBJRG9nYm1WbFpITk9aWGNvS1R0Y2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNBdktpcGNiaUFnVkdobElIQnlhVzFoY25rZ2QyRjVJRzltSUdsdWRHVnlZV04wYVc1bklIZHBkR2dnWVNCd2NtOXRhWE5sSUdseklIUm9jbTkxWjJnZ2FYUnpJR0IwYUdWdVlDQnRaWFJvYjJRc1hHNGdJSGRvYVdOb0lISmxaMmx6ZEdWeWN5QmpZV3hzWW1GamEzTWdkRzhnY21WalpXbDJaU0JsYVhSb1pYSWdZU0J3Y205dGFYTmxKM01nWlhabGJuUjFZV3dnZG1Gc2RXVWdiM0lnZEdobFhHNGdJSEpsWVhOdmJpQjNhSGtnZEdobElIQnliMjFwYzJVZ1kyRnVibTkwSUdKbElHWjFiR1pwYkd4bFpDNWNiaUFnSUdCZ1lHcHpYRzRnSUdacGJtUlZjMlZ5S0NrdWRHaGxiaWhtZFc1amRHbHZiaWgxYzJWeUtYdGNiaUFnSUNBdkx5QjFjMlZ5SUdseklHRjJZV2xzWVdKc1pWeHVJQ0I5TENCbWRXNWpkR2x2YmloeVpXRnpiMjRwZTF4dUlDQWdJQzh2SUhWelpYSWdhWE1nZFc1aGRtRnBiR0ZpYkdVc0lHRnVaQ0I1YjNVZ1lYSmxJR2RwZG1WdUlIUm9aU0J5WldGemIyNGdkMmg1WEc0Z0lIMHBPMXh1SUNCZ1lHQmNiaUFnSUVOb1lXbHVhVzVuWEc0Z0lDMHRMUzB0TFMwdFhHNGdJQ0JVYUdVZ2NtVjBkWEp1SUhaaGJIVmxJRzltSUdCMGFHVnVZQ0JwY3lCcGRITmxiR1lnWVNCd2NtOXRhWE5sTGlBZ1ZHaHBjeUJ6WldOdmJtUXNJQ2RrYjNkdWMzUnlaV0Z0SjF4dUlDQndjbTl0YVhObElHbHpJSEpsYzI5c2RtVmtJSGRwZEdnZ2RHaGxJSEpsZEhWeWJpQjJZV3gxWlNCdlppQjBhR1VnWm1seWMzUWdjSEp2YldselpTZHpJR1oxYkdacGJHeHRaVzUwWEc0Z0lHOXlJSEpsYW1WamRHbHZiaUJvWVc1a2JHVnlMQ0J2Y2lCeVpXcGxZM1JsWkNCcFppQjBhR1VnYUdGdVpHeGxjaUIwYUhKdmQzTWdZVzRnWlhoalpYQjBhVzl1TGx4dUlDQWdZR0JnYW5OY2JpQWdabWx1WkZWelpYSW9LUzUwYUdWdUtHWjFibU4wYVc5dUlDaDFjMlZ5S1NCN1hHNGdJQ0FnY21WMGRYSnVJSFZ6WlhJdWJtRnRaVHRjYmlBZ2ZTd2dablZ1WTNScGIyNGdLSEpsWVhOdmJpa2dlMXh1SUNBZ0lISmxkSFZ5YmlBblpHVm1ZWFZzZENCdVlXMWxKenRjYmlBZ2ZTa3VkR2hsYmlobWRXNWpkR2x2YmlBb2RYTmxjazVoYldVcElIdGNiaUFnSUNBdkx5QkpaaUJnWm1sdVpGVnpaWEpnSUdaMWJHWnBiR3hsWkN3Z1lIVnpaWEpPWVcxbFlDQjNhV3hzSUdKbElIUm9aU0IxYzJWeUozTWdibUZ0WlN3Z2IzUm9aWEozYVhObElHbDBYRzRnSUNBZ0x5OGdkMmxzYkNCaVpTQmdKMlJsWm1GMWJIUWdibUZ0WlNkZ1hHNGdJSDBwTzF4dUlDQWdabWx1WkZWelpYSW9LUzUwYUdWdUtHWjFibU4wYVc5dUlDaDFjMlZ5S1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RHYjNWdVpDQjFjMlZ5TENCaWRYUWdjM1JwYkd3Z2RXNW9ZWEJ3ZVNjcE8xeHVJQ0I5TENCbWRXNWpkR2x2YmlBb2NtVmhjMjl1S1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RnWm1sdVpGVnpaWEpnSUhKbGFtVmpkR1ZrSUdGdVpDQjNaU2R5WlNCMWJtaGhjSEI1SnlrN1hHNGdJSDBwTG5Sb1pXNG9ablZ1WTNScGIyNGdLSFpoYkhWbEtTQjdYRzRnSUNBZ0x5OGdibVYyWlhJZ2NtVmhZMmhsWkZ4dUlDQjlMQ0JtZFc1amRHbHZiaUFvY21WaGMyOXVLU0I3WEc0Z0lDQWdMeThnYVdZZ1lHWnBibVJWYzJWeVlDQm1kV3htYVd4c1pXUXNJR0J5WldGemIyNWdJSGRwYkd3Z1ltVWdKMFp2ZFc1a0lIVnpaWElzSUdKMWRDQnpkR2xzYkNCMWJtaGhjSEI1Snk1Y2JpQWdJQ0F2THlCSlppQmdabWx1WkZWelpYSmdJSEpsYW1WamRHVmtMQ0JnY21WaGMyOXVZQ0IzYVd4c0lHSmxJQ2RnWm1sdVpGVnpaWEpnSUhKbGFtVmpkR1ZrSUdGdVpDQjNaU2R5WlNCMWJtaGhjSEI1Snk1Y2JpQWdmU2s3WEc0Z0lHQmdZRnh1SUNCSlppQjBhR1VnWkc5M2JuTjBjbVZoYlNCd2NtOXRhWE5sSUdSdlpYTWdibTkwSUhOd1pXTnBabmtnWVNCeVpXcGxZM1JwYjI0Z2FHRnVaR3hsY2l3Z2NtVnFaV04wYVc5dUlISmxZWE52Ym5NZ2QybHNiQ0JpWlNCd2NtOXdZV2RoZEdWa0lHWjFjblJvWlhJZ1pHOTNibk4wY21WaGJTNWNiaUFnSUdCZ1lHcHpYRzRnSUdacGJtUlZjMlZ5S0NrdWRHaGxiaWhtZFc1amRHbHZiaUFvZFhObGNpa2dlMXh1SUNBZ0lIUm9jbTkzSUc1bGR5QlFaV1JoWjI5bmFXTmhiRVY0WTJWd2RHbHZiaWduVlhCemRISmxZVzBnWlhKeWIzSW5LVHRjYmlBZ2ZTa3VkR2hsYmlobWRXNWpkR2x2YmlBb2RtRnNkV1VwSUh0Y2JpQWdJQ0F2THlCdVpYWmxjaUJ5WldGamFHVmtYRzRnSUgwcExuUm9aVzRvWm5WdVkzUnBiMjRnS0haaGJIVmxLU0I3WEc0Z0lDQWdMeThnYm1WMlpYSWdjbVZoWTJobFpGeHVJQ0I5TENCbWRXNWpkR2x2YmlBb2NtVmhjMjl1S1NCN1hHNGdJQ0FnTHk4Z1ZHaGxJR0JRWldSbllXZHZZMmxoYkVWNFkyVndkR2x2Ym1BZ2FYTWdjSEp2Y0dGbllYUmxaQ0JoYkd3Z2RHaGxJSGRoZVNCa2IzZHVJSFJ2SUdobGNtVmNiaUFnZlNrN1hHNGdJR0JnWUZ4dUlDQWdRWE56YVcxcGJHRjBhVzl1WEc0Z0lDMHRMUzB0TFMwdExTMHRMVnh1SUNBZ1UyOXRaWFJwYldWeklIUm9aU0IyWVd4MVpTQjViM1VnZDJGdWRDQjBieUJ3Y205d1lXZGhkR1VnZEc4Z1lTQmtiM2R1YzNSeVpXRnRJSEJ5YjIxcGMyVWdZMkZ1SUc5dWJIa2dZbVZjYmlBZ2NtVjBjbWxsZG1Wa0lHRnplVzVqYUhKdmJtOTFjMng1TGlCVWFHbHpJR05oYmlCaVpTQmhZMmhwWlhabFpDQmllU0J5WlhSMWNtNXBibWNnWVNCd2NtOXRhWE5sSUdsdUlIUm9aVnh1SUNCbWRXeG1hV3hzYldWdWRDQnZjaUJ5WldwbFkzUnBiMjRnYUdGdVpHeGxjaTRnVkdobElHUnZkMjV6ZEhKbFlXMGdjSEp2YldselpTQjNhV3hzSUhSb1pXNGdZbVVnY0dWdVpHbHVaMXh1SUNCMWJuUnBiQ0IwYUdVZ2NtVjBkWEp1WldRZ2NISnZiV2x6WlNCcGN5QnpaWFIwYkdWa0xpQlVhR2x6SUdseklHTmhiR3hsWkNBcVlYTnphVzFwYkdGMGFXOXVLaTVjYmlBZ0lHQmdZR3B6WEc0Z0lHWnBibVJWYzJWeUtDa3VkR2hsYmlobWRXNWpkR2x2YmlBb2RYTmxjaWtnZTF4dUlDQWdJSEpsZEhWeWJpQm1hVzVrUTI5dGJXVnVkSE5DZVVGMWRHaHZjaWgxYzJWeUtUdGNiaUFnZlNrdWRHaGxiaWhtZFc1amRHbHZiaUFvWTI5dGJXVnVkSE1wSUh0Y2JpQWdJQ0F2THlCVWFHVWdkWE5sY2lkeklHTnZiVzFsYm5SeklHRnlaU0J1YjNjZ1lYWmhhV3hoWW14bFhHNGdJSDBwTzF4dUlDQmdZR0JjYmlBZ0lFbG1JSFJvWlNCaGMzTnBiV3hwWVhSbFpDQndjbTl0YVhObElISmxhbVZqZEhNc0lIUm9aVzRnZEdobElHUnZkMjV6ZEhKbFlXMGdjSEp2YldselpTQjNhV3hzSUdGc2MyOGdjbVZxWldOMExseHVJQ0FnWUdCZ2FuTmNiaUFnWm1sdVpGVnpaWElvS1M1MGFHVnVLR1oxYm1OMGFXOXVJQ2gxYzJWeUtTQjdYRzRnSUNBZ2NtVjBkWEp1SUdacGJtUkRiMjF0Wlc1MGMwSjVRWFYwYUc5eUtIVnpaWElwTzF4dUlDQjlLUzUwYUdWdUtHWjFibU4wYVc5dUlDaGpiMjF0Wlc1MGN5a2dlMXh1SUNBZ0lDOHZJRWxtSUdCbWFXNWtRMjl0YldWdWRITkNlVUYxZEdodmNtQWdablZzWm1sc2JITXNJSGRsSjJ4c0lHaGhkbVVnZEdobElIWmhiSFZsSUdobGNtVmNiaUFnZlN3Z1puVnVZM1JwYjI0Z0tISmxZWE52YmlrZ2UxeHVJQ0FnSUM4dklFbG1JR0JtYVc1a1EyOXRiV1Z1ZEhOQ2VVRjFkR2h2Y21BZ2NtVnFaV04wY3l3Z2QyVW5iR3dnYUdGMlpTQjBhR1VnY21WaGMyOXVJR2hsY21WY2JpQWdmU2s3WEc0Z0lHQmdZRnh1SUNBZ1UybHRjR3hsSUVWNFlXMXdiR1ZjYmlBZ0xTMHRMUzB0TFMwdExTMHRMUzFjYmlBZ0lGTjVibU5vY205dWIzVnpJRVY0WVcxd2JHVmNiaUFnSUdCZ1lHcGhkbUZ6WTNKcGNIUmNiaUFnYkdWMElISmxjM1ZzZER0Y2JpQWdJSFJ5ZVNCN1hHNGdJQ0FnY21WemRXeDBJRDBnWm1sdVpGSmxjM1ZzZENncE8xeHVJQ0FnSUM4dklITjFZMk5sYzNOY2JpQWdmU0JqWVhSamFDaHlaV0Z6YjI0cElIdGNiaUFnSUNBdkx5Qm1ZV2xzZFhKbFhHNGdJSDFjYmlBZ1lHQmdYRzRnSUNCRmNuSmlZV05ySUVWNFlXMXdiR1ZjYmlBZ0lHQmdZR3B6WEc0Z0lHWnBibVJTWlhOMWJIUW9ablZ1WTNScGIyNG9jbVZ6ZFd4MExDQmxjbklwZTF4dUlDQWdJR2xtSUNobGNuSXBJSHRjYmlBZ0lDQWdJQzh2SUdaaGFXeDFjbVZjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0x5OGdjM1ZqWTJWemMxeHVJQ0FnSUgxY2JpQWdmU2s3WEc0Z0lHQmdZRnh1SUNBZ1VISnZiV2x6WlNCRmVHRnRjR3hsTzF4dUlDQWdZR0JnYW1GMllYTmpjbWx3ZEZ4dUlDQm1hVzVrVW1WemRXeDBLQ2t1ZEdobGJpaG1kVzVqZEdsdmJpaHlaWE4xYkhRcGUxeHVJQ0FnSUM4dklITjFZMk5sYzNOY2JpQWdmU3dnWm5WdVkzUnBiMjRvY21WaGMyOXVLWHRjYmlBZ0lDQXZMeUJtWVdsc2RYSmxYRzRnSUgwcE8xeHVJQ0JnWUdCY2JpQWdJRUZrZG1GdVkyVmtJRVY0WVcxd2JHVmNiaUFnTFMwdExTMHRMUzB0TFMwdExTMWNiaUFnSUZONWJtTm9jbTl1YjNWeklFVjRZVzF3YkdWY2JpQWdJR0JnWUdwaGRtRnpZM0pwY0hSY2JpQWdiR1YwSUdGMWRHaHZjaXdnWW05dmEzTTdYRzRnSUNCMGNua2dlMXh1SUNBZ0lHRjFkR2h2Y2lBOUlHWnBibVJCZFhSb2IzSW9LVHRjYmlBZ0lDQmliMjlyY3lBZ1BTQm1hVzVrUW05dmEzTkNlVUYxZEdodmNpaGhkWFJvYjNJcE8xeHVJQ0FnSUM4dklITjFZMk5sYzNOY2JpQWdmU0JqWVhSamFDaHlaV0Z6YjI0cElIdGNiaUFnSUNBdkx5Qm1ZV2xzZFhKbFhHNGdJSDFjYmlBZ1lHQmdYRzRnSUNCRmNuSmlZV05ySUVWNFlXMXdiR1ZjYmlBZ0lHQmdZR3B6WEc0Z0lDQm1kVzVqZEdsdmJpQm1iM1Z1WkVKdmIydHpLR0p2YjJ0ektTQjdYRzRnSUNCOVhHNGdJQ0JtZFc1amRHbHZiaUJtWVdsc2RYSmxLSEpsWVhOdmJpa2dlMXh1SUNBZ2ZWeHVJQ0FnWm1sdVpFRjFkR2h2Y2lobWRXNWpkR2x2YmloaGRYUm9iM0lzSUdWeWNpbDdYRzRnSUNBZ2FXWWdLR1Z5Y2lrZ2UxeHVJQ0FnSUNBZ1ptRnBiSFZ5WlNobGNuSXBPMXh1SUNBZ0lDQWdMeThnWm1GcGJIVnlaVnh1SUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0JtYVc1a1FtOXZiMnR6UW5sQmRYUm9iM0lvWVhWMGFHOXlMQ0JtZFc1amRHbHZiaWhpYjI5cmN5d2daWEp5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0dWeWNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1ptRnBiSFZ5WlNobGNuSXBPMXh1SUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JtYjNWdVpFSnZiMnR6S0dKdmIydHpLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMGdZMkYwWTJnb2NtVmhjMjl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdaaGFXeDFjbVVvY21WaGMyOXVLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ2ZTQmpZWFJqYUNobGNuSnZjaWtnZTF4dUlDQWdJQ0FnSUNCbVlXbHNkWEpsS0dWeWNpazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQXZMeUJ6ZFdOalpYTnpYRzRnSUNBZ2ZWeHVJQ0I5S1R0Y2JpQWdZR0JnWEc0Z0lDQlFjbTl0YVhObElFVjRZVzF3YkdVN1hHNGdJQ0JnWUdCcVlYWmhjMk55YVhCMFhHNGdJR1pwYm1SQmRYUm9iM0lvS1M1Y2JpQWdJQ0IwYUdWdUtHWnBibVJDYjI5cmMwSjVRWFYwYUc5eUtTNWNiaUFnSUNCMGFHVnVLR1oxYm1OMGFXOXVLR0p2YjJ0ektYdGNiaUFnSUNBZ0lDOHZJR1p2ZFc1a0lHSnZiMnR6WEc0Z0lIMHBMbU5oZEdOb0tHWjFibU4wYVc5dUtISmxZWE52YmlsN1hHNGdJQ0FnTHk4Z2MyOXRaWFJvYVc1bklIZGxiblFnZDNKdmJtZGNiaUFnZlNrN1hHNGdJR0JnWUZ4dUlDQWdRRzFsZEdodlpDQjBhR1Z1WEc0Z0lFQndZWEpoYlNCN1JuVnVZM1JwYjI1OUlHOXVSblZzWm1sc2JHVmtYRzRnSUVCd1lYSmhiU0I3Um5WdVkzUnBiMjU5SUc5dVVtVnFaV04wWldSY2JpQWdWWE5sWm5Wc0lHWnZjaUIwYjI5c2FXNW5MbHh1SUNCQWNtVjBkWEp1SUh0UWNtOXRhWE5sZlZ4dUlDQXFMMXh1WEc0Z0lDOHFLbHh1SUNCZ1kyRjBZMmhnSUdseklITnBiWEJzZVNCemRXZGhjaUJtYjNJZ1lIUm9aVzRvZFc1a1pXWnBibVZrTENCdmJsSmxhbVZqZEdsdmJpbGdJSGRvYVdOb0lHMWhhMlZ6SUdsMElIUm9aU0J6WVcxbFhHNGdJR0Z6SUhSb1pTQmpZWFJqYUNCaWJHOWpheUJ2WmlCaElIUnllUzlqWVhSamFDQnpkR0YwWlcxbGJuUXVYRzRnSUdCZ1lHcHpYRzRnSUdaMWJtTjBhVzl1SUdacGJtUkJkWFJvYjNJb0tYdGNiaUFnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RqYjNWc1pHNG5kQ0JtYVc1a0lIUm9ZWFFnWVhWMGFHOXlKeWs3WEc0Z0lIMWNiaUFnTHk4Z2MzbHVZMmh5YjI1dmRYTmNiaUFnZEhKNUlIdGNiaUFnWm1sdVpFRjFkR2h2Y2lncE8xeHVJQ0I5SUdOaGRHTm9LSEpsWVhOdmJpa2dlMXh1SUNBdkx5QnpiMjFsZEdocGJtY2dkMlZ1ZENCM2NtOXVaMXh1SUNCOVhHNGdJQzh2SUdGemVXNWpJSGRwZEdnZ2NISnZiV2x6WlhOY2JpQWdabWx1WkVGMWRHaHZjaWdwTG1OaGRHTm9LR1oxYm1OMGFXOXVLSEpsWVhOdmJpbDdYRzRnSUM4dklITnZiV1YwYUdsdVp5QjNaVzUwSUhkeWIyNW5YRzRnSUgwcE8xeHVJQ0JnWUdCY2JpQWdRRzFsZEdodlpDQmpZWFJqYUZ4dUlDQkFjR0Z5WVcwZ2UwWjFibU4wYVc5dWZTQnZibEpsYW1WamRHbHZibHh1SUNCVmMyVm1kV3dnWm05eUlIUnZiMnhwYm1jdVhHNGdJRUJ5WlhSMWNtNGdlMUJ5YjIxcGMyVjlYRzRnSUNvdlhHNWNibHh1SUNCUWNtOXRhWE5sTG5CeWIzUnZkSGx3WlM1allYUmphQ0E5SUdaMWJtTjBhVzl1SUY5allYUmphQ2h2YmxKbGFtVmpkR2x2YmlrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwYUdsekxuUm9aVzRvYm5Wc2JDd2diMjVTWldwbFkzUnBiMjRwTzF4dUlDQjlPMXh1WEc0Z0lDOHFLbHh1SUNBZ0lHQm1hVzVoYkd4NVlDQjNhV3hzSUdKbElHbHVkbTlyWldRZ2NtVm5ZWEprYkdWemN5QnZaaUIwYUdVZ2NISnZiV2x6WlNkeklHWmhkR1VnYW5WemRDQmhjeUJ1WVhScGRtVmNiaUFnSUNCMGNua3ZZMkYwWTJndlptbHVZV3hzZVNCaVpXaGhkbVZ6WEc0Z0lGeHVJQ0FnSUZONWJtTm9jbTl1YjNWeklHVjRZVzF3YkdVNlhHNGdJRnh1SUNBZ0lHQmdZR3B6WEc0Z0lDQWdabWx1WkVGMWRHaHZjaWdwSUh0Y2JpQWdJQ0FnSUdsbUlDaE5ZWFJvTG5KaGJtUnZiU2dwSUQ0Z01DNDFLU0I3WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWdwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnY21WMGRYSnVJRzVsZHlCQmRYUm9iM0lvS1R0Y2JpQWdJQ0I5WEc0Z0lGeHVJQ0FnSUhSeWVTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1ptbHVaRUYxZEdodmNpZ3BPeUF2THlCemRXTmpaV1ZrSUc5eUlHWmhhV3hjYmlBZ0lDQjlJR05oZEdOb0tHVnljbTl5S1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWm1sdVpFOTBhR1Z5UVhWMGFHVnlLQ2s3WEc0Z0lDQWdmU0JtYVc1aGJHeDVJSHRjYmlBZ0lDQWdJQzh2SUdGc2QyRjVjeUJ5ZFc1elhHNGdJQ0FnSUNBdkx5QmtiMlZ6YmlkMElHRm1abVZqZENCMGFHVWdjbVYwZFhKdUlIWmhiSFZsWEc0Z0lDQWdmVnh1SUNBZ0lHQmdZRnh1SUNCY2JpQWdJQ0JCYzNsdVkyaHliMjV2ZFhNZ1pYaGhiWEJzWlRwY2JpQWdYRzRnSUNBZ1lHQmdhbk5jYmlBZ0lDQm1hVzVrUVhWMGFHOXlLQ2t1WTJGMFkyZ29ablZ1WTNScGIyNG9jbVZoYzI5dUtYdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbWFXNWtUM1JvWlhKQmRYUm9aWElvS1R0Y2JpQWdJQ0I5S1M1bWFXNWhiR3g1S0daMWJtTjBhVzl1S0NsN1hHNGdJQ0FnSUNBdkx5QmhkWFJvYjNJZ2QyRnpJR1ZwZEdobGNpQm1iM1Z1WkN3Z2IzSWdibTkwWEc0Z0lDQWdmU2s3WEc0Z0lDQWdZR0JnWEc0Z0lGeHVJQ0FnSUVCdFpYUm9iMlFnWm1sdVlXeHNlVnh1SUNBZ0lFQndZWEpoYlNCN1JuVnVZM1JwYjI1OUlHTmhiR3hpWVdOclhHNGdJQ0FnUUhKbGRIVnliaUI3VUhKdmJXbHpaWDFjYmlBZ0tpOWNibHh1WEc0Z0lGQnliMjFwYzJVdWNISnZkRzkwZVhCbExtWnBibUZzYkhrZ1BTQm1kVzVqZEdsdmJpQmZabWx1WVd4c2VTaGpZV3hzWW1GamF5a2dlMXh1SUNBZ0lIWmhjaUJ3Y205dGFYTmxJRDBnZEdocGN6dGNiaUFnSUNCMllYSWdZMjl1YzNSeWRXTjBiM0lnUFNCd2NtOXRhWE5sTG1OdmJuTjBjblZqZEc5eU8xeHVYRzRnSUNBZ2FXWWdLR2x6Um5WdVkzUnBiMjRvWTJGc2JHSmhZMnNwS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY0hKdmJXbHpaUzUwYUdWdUtHWjFibU4wYVc5dUlDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1kyOXVjM1J5ZFdOMGIzSXVjbVZ6YjJ4MlpTaGpZV3hzWW1GamF5Z3BLUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnZlN3Z1puVnVZM1JwYjI0Z0tISmxZWE52YmlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1kyOXVjM1J5ZFdOMGIzSXVjbVZ6YjJ4MlpTaGpZV3hzWW1GamF5Z3BLUzUwYUdWdUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNCMGFISnZkeUJ5WldGemIyNDdYRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WMGRYSnVJSEJ5YjIxcGMyVXVkR2hsYmloallXeHNZbUZqYXl3Z1kyRnNiR0poWTJzcE8xeHVJQ0I5TzF4dVhHNGdJSEpsZEhWeWJpQlFjbTl0YVhObE8xeHVmU2dwTzF4dVhHNVFjbTl0YVhObEpERXVjSEp2ZEc5MGVYQmxMblJvWlc0Z1BTQjBhR1Z1TzF4dVVISnZiV2x6WlNReExtRnNiQ0E5SUdGc2JEdGNibEJ5YjIxcGMyVWtNUzV5WVdObElEMGdjbUZqWlR0Y2JsQnliMjFwYzJVa01TNXlaWE52YkhabElEMGdjbVZ6YjJ4MlpTUXhPMXh1VUhKdmJXbHpaU1F4TG5KbGFtVmpkQ0E5SUhKbGFtVmpkQ1F4TzF4dVVISnZiV2x6WlNReExsOXpaWFJUWTJobFpIVnNaWElnUFNCelpYUlRZMmhsWkhWc1pYSTdYRzVRY205dGFYTmxKREV1WDNObGRFRnpZWEFnUFNCelpYUkJjMkZ3TzF4dVVISnZiV2x6WlNReExsOWhjMkZ3SUQwZ1lYTmhjRHRjYmx4dUx5cG5iRzlpWVd3Z2MyVnNaaW92WEc1bWRXNWpkR2x2YmlCd2IyeDVabWxzYkNncElIdGNiaUFnZG1GeUlHeHZZMkZzSUQwZ2RtOXBaQ0F3TzF4dVhHNGdJR2xtSUNoMGVYQmxiMllnWjJ4dlltRnNJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lHeHZZMkZzSUQwZ1oyeHZZbUZzTzF4dUlDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQnpaV3htSUNFOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4dUlDQWdJR3h2WTJGc0lEMGdjMlZzWmp0Y2JpQWdmU0JsYkhObElIdGNiaUFnSUNCMGNua2dlMXh1SUNBZ0lDQWdiRzlqWVd3Z1BTQkdkVzVqZEdsdmJpZ25jbVYwZFhKdUlIUm9hWE1uS1NncE8xeHVJQ0FnSUgwZ1kyRjBZMmdnS0dVcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnbmNHOXNlV1pwYkd3Z1ptRnBiR1ZrSUdKbFkyRjFjMlVnWjJ4dlltRnNJRzlpYW1WamRDQnBjeUIxYm1GMllXbHNZV0pzWlNCcGJpQjBhR2x6SUdWdWRtbHliMjV0Wlc1MEp5azdYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdkbUZ5SUZBZ1BTQnNiMk5oYkM1UWNtOXRhWE5sTzF4dVhHNGdJR2xtSUNoUUtTQjdYRzRnSUNBZ2RtRnlJSEJ5YjIxcGMyVlViMU4wY21sdVp5QTlJRzUxYkd3N1hHNGdJQ0FnZEhKNUlIdGNiaUFnSUNBZ0lIQnliMjFwYzJWVWIxTjBjbWx1WnlBOUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWRHOVRkSEpwYm1jdVkyRnNiQ2hRTG5KbGMyOXNkbVVvS1NrN1hHNGdJQ0FnZlNCallYUmphQ0FvWlNrZ2UxeHVJQ0FnSUNBZ0x5OGdjMmxzWlc1MGJIa2dhV2R1YjNKbFpGeHVJQ0FnSUgxY2JseHVJQ0FnSUdsbUlDaHdjbTl0YVhObFZHOVRkSEpwYm1jZ1BUMDlJQ2RiYjJKcVpXTjBJRkJ5YjIxcGMyVmRKeUFtSmlBaFVDNWpZWE4wS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnYkc5allXd3VVSEp2YldselpTQTlJRkJ5YjIxcGMyVWtNVHRjYm4xY2JseHVMeThnVTNSeVlXNW5aU0JqYjIxd1lYUXVMbHh1VUhKdmJXbHpaU1F4TG5CdmJIbG1hV3hzSUQwZ2NHOXNlV1pwYkd3N1hHNVFjbTl0YVhObEpERXVVSEp2YldselpTQTlJRkJ5YjIxcGMyVWtNVHRjYmx4dWNtVjBkWEp1SUZCeWIyMXBjMlVrTVR0Y2JseHVmU2twS1R0Y2JseHVYRzVjYmk4dkl5QnpiM1Z5WTJWTllYQndhVzVuVlZKTVBXVnpOaTF3Y205dGFYTmxMbTFoY0Z4dUlpd2lMeThnZEdobElIZG9ZWFIzWnkxbVpYUmphQ0J3YjJ4NVptbHNiQ0JwYm5OMFlXeHNjeUIwYUdVZ1ptVjBZMmdvS1NCbWRXNWpkR2x2Ymx4dUx5OGdiMjRnZEdobElHZHNiMkpoYkNCdlltcGxZM1FnS0hkcGJtUnZkeUJ2Y2lCelpXeG1LVnh1THk5Y2JpOHZJRkpsZEhWeWJpQjBhR0YwSUdGeklIUm9aU0JsZUhCdmNuUWdabTl5SUhWelpTQnBiaUJYWldKd1lXTnJMQ0JDY205M2MyVnlhV1o1SUdWMFl5NWNibkpsY1hWcGNtVW9KM2RvWVhSM1p5MW1aWFJqYUNjcE8xeHViVzlrZFd4bExtVjRjRzl5ZEhNZ1BTQnpaV3htTG1abGRHTm9MbUpwYm1Rb2MyVnNaaWs3WEc0aUxDSW9ablZ1WTNScGIyNGdLSEp2YjNRc0lHWmhZM1J2Y25rcGUxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNWNiaUFnTHlwcGMzUmhibUoxYkNCcFoyNXZjbVVnYm1WNGREcGpZVzUwSUhSbGMzUXFMMXh1SUNCcFppQW9kSGx3Wlc5bUlHMXZaSFZzWlNBOVBUMGdKMjlpYW1WamRDY2dKaVlnZEhsd1pXOW1JRzF2WkhWc1pTNWxlSEJ2Y25SeklEMDlQU0FuYjJKcVpXTjBKeWtnZTF4dUlDQWdJRzF2WkhWc1pTNWxlSEJ2Y25SeklEMGdabUZqZEc5eWVTZ3BPMXh1SUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCa1pXWnBibVVnUFQwOUlDZG1kVzVqZEdsdmJpY2dKaVlnWkdWbWFXNWxMbUZ0WkNrZ2UxeHVJQ0FnSUM4dklFRk5SQzRnVW1WbmFYTjBaWElnWVhNZ1lXNGdZVzV2Ym5sdGIzVnpJRzF2WkhWc1pTNWNiaUFnSUNCa1pXWnBibVVvVzEwc0lHWmhZM1J2Y25rcE8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDOHZJRUp5YjNkelpYSWdaMnh2WW1Gc2MxeHVJQ0FnSUhKdmIzUXViMkpxWldOMFVHRjBhQ0E5SUdaaFkzUnZjbmtvS1R0Y2JpQWdmVnh1ZlNrb2RHaHBjeXdnWm5WdVkzUnBiMjRvS1h0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dVhHNGdJSFpoY2lCMGIxTjBjaUE5SUU5aWFtVmpkQzV3Y205MGIzUjVjR1V1ZEc5VGRISnBibWM3WEc0Z0lHWjFibU4wYVc5dUlHaGhjMDkzYmxCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUdsbUtHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJWY2JpQWdJQ0I5WEc0Z0lDQWdMeTkwYnlCb1lXNWtiR1VnYjJKcVpXTjBjeUIzYVhSb0lHNTFiR3dnY0hKdmRHOTBlWEJsY3lBb2RHOXZJR1ZrWjJVZ1kyRnpaVDhwWEc0Z0lDQWdjbVYwZFhKdUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWFHRnpUM2R1VUhKdmNHVnlkSGt1WTJGc2JDaHZZbW9zSUhCeWIzQXBYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJwYzBWdGNIUjVLSFpoYkhWbEtYdGNiaUFnSUNCcFppQW9JWFpoYkhWbEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLR2x6UVhKeVlYa29kbUZzZFdVcElDWW1JSFpoYkhWbExteGxibWQwYUNBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpUdGNiaUFnSUNCOUlHVnNjMlVnYVdZZ0tIUjVjR1Z2WmlCMllXeDFaU0FoUFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lDQWdabTl5SUNoMllYSWdhU0JwYmlCMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0doaGMwOTNibEJ5YjNCbGNuUjVLSFpoYkhWbExDQnBLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnZEc5VGRISnBibWNvZEhsd1pTbDdYRzRnSUNBZ2NtVjBkWEp1SUhSdlUzUnlMbU5oYkd3b2RIbHdaU2s3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCcGMwOWlhbVZqZENodlltb3BlMXh1SUNBZ0lISmxkSFZ5YmlCMGVYQmxiMllnYjJKcUlEMDlQU0FuYjJKcVpXTjBKeUFtSmlCMGIxTjBjbWx1Wnlodlltb3BJRDA5UFNCY0lsdHZZbXBsWTNRZ1QySnFaV04wWFZ3aU8xeHVJQ0I5WEc1Y2JpQWdkbUZ5SUdselFYSnlZWGtnUFNCQmNuSmhlUzVwYzBGeWNtRjVJSHg4SUdaMWJtTjBhVzl1S0c5aWFpbDdYRzRnSUNBZ0x5cHBjM1JoYm1KMWJDQnBaMjV2Y21VZ2JtVjRkRHBqWVc1MElIUmxjM1FxTDF4dUlDQWdJSEpsZEhWeWJpQjBiMU4wY2k1allXeHNLRzlpYWlrZ1BUMDlJQ2RiYjJKcVpXTjBJRUZ5Y21GNVhTYzdYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJwYzBKdmIyeGxZVzRvYjJKcUtYdGNiaUFnSUNCeVpYUjFjbTRnZEhsd1pXOW1JRzlpYWlBOVBUMGdKMkp2YjJ4bFlXNG5JSHg4SUhSdlUzUnlhVzVuS0c5aWFpa2dQVDA5SUNkYmIySnFaV04wSUVKdmIyeGxZVzVkSnp0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHZGxkRXRsZVNoclpYa3BlMXh1SUNBZ0lIWmhjaUJwYm5STFpYa2dQU0J3WVhKelpVbHVkQ2hyWlhrcE8xeHVJQ0FnSUdsbUlDaHBiblJMWlhrdWRHOVRkSEpwYm1jb0tTQTlQVDBnYTJWNUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2FXNTBTMlY1TzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2EyVjVPMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWm1GamRHOXllU2h2Y0hScGIyNXpLU0I3WEc0Z0lDQWdiM0IwYVc5dWN5QTlJRzl3ZEdsdmJuTWdmSHdnZTMxY2JseHVJQ0FnSUhaaGNpQnZZbXBsWTNSUVlYUm9JRDBnWm5WdVkzUnBiMjRvYjJKcUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1QySnFaV04wTG10bGVYTW9iMkpxWldOMFVHRjBhQ2t1Y21Wa2RXTmxLR1oxYm1OMGFXOXVLSEJ5YjNoNUxDQndjbTl3S1NCN1hHNGdJQ0FnSUNBZ0lHbG1LSEJ5YjNBZ1BUMDlJQ2RqY21WaGRHVW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhCeWIzaDVPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0x5cHBjM1JoYm1KMWJDQnBaMjV2Y21VZ1pXeHpaU292WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2IySnFaV04wVUdGMGFGdHdjbTl3WFNBOVBUMGdKMloxYm1OMGFXOXVKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lIQnliM2g1VzNCeWIzQmRJRDBnYjJKcVpXTjBVR0YwYUZ0d2NtOXdYUzVpYVc1a0tHOWlhbVZqZEZCaGRHZ3NJRzlpYWlrN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2ZUhrN1hHNGdJQ0FnSUNCOUxDQjdmU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJR1oxYm1OMGFXOXVJR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUFvYjNCMGFXOXVjeTVwYm1Oc2RXUmxTVzVvWlhKcGRHVmtVSEp2Y0hNZ2ZId2dLSFI1Y0dWdlppQndjbTl3SUQwOVBTQW5iblZ0WW1WeUp5QW1KaUJCY25KaGVTNXBjMEZ5Y21GNUtHOWlhaWtwSUh4OElHaGhjMDkzYmxCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrcFhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnWjJWMFUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lIQnliM0FwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltcGJjSEp2Y0YwN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJWMEtHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2w3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhCaGRHZ2dQVDA5SUNkdWRXMWlaWEluS1NCN1hHNGdJQ0FnSUNBZ0lIQmhkR2dnUFNCYmNHRjBhRjA3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwWmlBb0lYQmhkR2dnZkh3Z2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhanRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhObGRDaHZZbW9zSUhCaGRHZ3VjM0JzYVhRb0p5NG5LUzV0WVhBb1oyVjBTMlY1S1N3Z2RtRnNkV1VzSUdSdlRtOTBVbVZ3YkdGalpTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRkJoZEdnZ1BTQndZWFJvV3pCZE8xeHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUldZV3gxWlNBOUlHZGxkRk5vWVd4c2IzZFFjbTl3WlhKMGVTaHZZbW9zSUdOMWNuSmxiblJRWVhSb0tUdGNiaUFnSUNBZ0lHbG1JQ2h3WVhSb0xteGxibWQwYUNBOVBUMGdNU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9ZM1Z5Y21WdWRGWmhiSFZsSUQwOVBTQjJiMmxrSURBZ2ZId2dJV1J2VG05MFVtVndiR0ZqWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWx0amRYSnlaVzUwVUdGMGFGMGdQU0IyWVd4MVpUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZM1Z5Y21WdWRGWmhiSFZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9ZM1Z5Y21WdWRGWmhiSFZsSUQwOVBTQjJiMmxrSURBcElIdGNiaUFnSUNBZ0lDQWdMeTlqYUdWamF5QnBaaUIzWlNCaGMzTjFiV1VnWVc0Z1lYSnlZWGxjYmlBZ0lDQWdJQ0FnYVdZb2RIbHdaVzltSUhCaGRHaGJNVjBnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcVcyTjFjbkpsYm5SUVlYUm9YU0E5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJRzlpYWx0amRYSnlaVzUwVUdGMGFGMGdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWx0amRYSnlaVzUwVUdGMGFGMHNJSEJoZEdndWMyeHBZMlVvTVNrc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VhR0Z6SUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDa2dlMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYm5WdFltVnlKeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnVzNCaGRHaGRPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJSEJoZEdndWMzQnNhWFFvSnk0bktUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0NGd1lYUm9JSHg4SUhCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBaElXOWlhanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCd1lYUm9MbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJxSUQwZ1oyVjBTMlY1S0hCaGRHaGJhVjBwTzF4dVhHNGdJQ0FnSUNBZ0lHbG1LQ2gwZVhCbGIyWWdhaUE5UFQwZ0oyNTFiV0psY2ljZ0ppWWdhWE5CY25KaGVTaHZZbW9wSUNZbUlHb2dQQ0J2WW1vdWJHVnVaM1JvS1NCOGZGeHVJQ0FnSUNBZ0lDQWdJQ2h2Y0hScGIyNXpMbWx1WTJ4MVpHVkpibWhsY21sMFpXUlFjbTl3Y3lBL0lDaHFJR2x1SUU5aWFtVmpkQ2h2WW1vcEtTQTZJR2hoYzA5M2JsQnliM0JsY25SNUtHOWlhaXdnYWlrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcUlEMGdiMkpxVzJwZE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVsYm5OMWNtVkZlR2x6ZEhNZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTbDdYRzRnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJSFJ5ZFdVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ0E5SUdaMWJtTjBhVzl1SUNodlltb3NJSEJoZEdnc0lIWmhiSFZsTENCa2IwNXZkRkpsY0d4aFkyVXBlMXh1SUNBZ0lDQWdjbVYwZFhKdUlITmxkQ2h2WW1vc0lIQmhkR2dzSUhaaGJIVmxMQ0JrYjA1dmRGSmxjR3hoWTJVcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xtbHVjMlZ5ZENBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ3NJSFpoYkhWbExDQmhkQ2w3WEc0Z0lDQWdJQ0IyWVhJZ1lYSnlJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxTENCd1lYUm9LVHRjYmlBZ0lDQWdJR0YwSUQwZ2ZuNWhkRHRjYmlBZ0lDQWdJR2xtSUNnaGFYTkJjbkpoZVNoaGNuSXBLU0I3WEc0Z0lDQWdJQ0FnSUdGeWNpQTlJRnRkTzF4dUlDQWdJQ0FnSUNCdlltcGxZM1JRWVhSb0xuTmxkQ2h2WW1vc0lIQmhkR2dzSUdGeWNpazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQmhjbkl1YzNCc2FXTmxLR0YwTENBd0xDQjJZV3gxWlNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUc5aWFtVmpkRkJoZEdndVpXMXdkSGtnUFNCbWRXNWpkR2x2Ymlodlltb3NJSEJoZEdncElIdGNiaUFnSUNBZ0lHbG1JQ2hwYzBWdGNIUjVLSEJoZEdncEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjJiMmxrSURBN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhadmFXUWdNRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsTENCcE8xeHVJQ0FnSUNBZ2FXWWdLQ0VvZG1Gc2RXVWdQU0J2WW1wbFkzUlFZWFJvTG1kbGRDaHZZbW9zSUhCaGRHZ3BLU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZG05cFpDQXdPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhaaGJIVmxJRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENBbkp5azdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2x6UW05dmJHVmhiaWgyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBlWEJsYjJZZ2RtRnNkV1VnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lEQXBPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzBGeWNtRjVLSFpoYkhWbEtTa2dlMXh1SUNBZ0lDQWdJQ0IyWVd4MVpTNXNaVzVuZEdnZ1BTQXdPMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2hwYzA5aWFtVmpkQ2gyWVd4MVpTa3BJSHRjYmlBZ0lDQWdJQ0FnWm05eUlDaHBJR2x1SUhaaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLR2hoYzFOb1lXeHNiM2RRY205d1pYSjBlU2gyWVd4MVpTd2dhU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsYkdWMFpTQjJZV3gxWlZ0cFhUdGNiaUFnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbW9zSUhCaGRHZ3NJRzUxYkd3cE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNWNiaUFnSUNCdlltcGxZM1JRWVhSb0xuQjFjMmdnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb0lDOHFMQ0IyWVd4MVpYTWdLaThwZTF4dUlDQWdJQ0FnZG1GeUlHRnljaUE5SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQ2s3WEc0Z0lDQWdJQ0JwWmlBb0lXbHpRWEp5WVhrb1lYSnlLU2tnZTF4dUlDQWdJQ0FnSUNCaGNuSWdQU0JiWFR0Y2JpQWdJQ0FnSUNBZ2IySnFaV04wVUdGMGFDNXpaWFFvYjJKcUxDQndZWFJvTENCaGNuSXBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JoY25JdWNIVnphQzVoY0hCc2VTaGhjbklzSUVGeWNtRjVMbkJ5YjNSdmRIbHdaUzV6YkdsalpTNWpZV3hzS0dGeVozVnRaVzUwY3l3Z01pa3BPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQnZZbXBsWTNSUVlYUm9MbU52WVd4bGMyTmxJRDBnWm5WdVkzUnBiMjRnS0c5aWFpd2djR0YwYUhNc0lHUmxabUYxYkhSV1lXeDFaU2tnZTF4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsTzF4dVhHNGdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNQ3dnYkdWdUlEMGdjR0YwYUhNdWJHVnVaM1JvT3lCcElEd2diR1Z1T3lCcEt5c3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tDaDJZV3gxWlNBOUlHOWlhbVZqZEZCaGRHZ3VaMlYwS0c5aWFpd2djR0YwYUhOYmFWMHBLU0FoUFQwZ2RtOXBaQ0F3S1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCa1pXWmhkV3gwVm1Gc2RXVTdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VaMlYwSUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDd2daR1ZtWVhWc2RGWmhiSFZsS1h0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdjR0YwYUNBOUlGdHdZWFJvWFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDZ2hjR0YwYUNCOGZDQndZWFJvTG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tHOWlhaUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJrWldaaGRXeDBWbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbWRsZENodlltb3NJSEJoZEdndWMzQnNhWFFvSnk0bktTd2daR1ZtWVhWc2RGWmhiSFZsS1R0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUlFZWFJvSUQwZ1oyVjBTMlY1S0hCaGRHaGJNRjBwTzF4dUlDQWdJQ0FnZG1GeUlHNWxlSFJQWW1vZ1BTQm5aWFJUYUdGc2JHOTNVSEp2Y0dWeWRIa29iMkpxTENCamRYSnlaVzUwVUdGMGFDbGNiaUFnSUNBZ0lHbG1JQ2h1WlhoMFQySnFJRDA5UFNCMmIybGtJREFwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptRjFiSFJXWVd4MVpUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdVpYaDBUMkpxTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1blpYUW9iMkpxVzJOMWNuSmxiblJRWVhSb1hTd2djR0YwYUM1emJHbGpaU2d4S1N3Z1pHVm1ZWFZzZEZaaGJIVmxLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVrWld3Z1BTQm1kVzVqZEdsdmJpQmtaV3dvYjJKcUxDQndZWFJvS1NCN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHVkVzFpWlhJbktTQjdYRzRnSUNBZ0lDQWdJSEJoZEdnZ1BTQmJjR0YwYUYwN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2h2WW1vZ1BUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2IySnFPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2FYTkZiWEIwZVNod1lYUm9LU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWW9kSGx3Wlc5bUlIQmhkR2dnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9MbVJsYkNodlltb3NJSEJoZEdndWMzQnNhWFFvSnk0bktTazdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwVUdGMGFDQTlJR2RsZEV0bGVTaHdZWFJvV3pCZEtUdGNiaUFnSUNBZ0lHbG1JQ2doYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2dZM1Z5Y21WdWRGQmhkR2dwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hwYzBGeWNtRjVLRzlpYWlrcElIdGNiaUFnSUNBZ0lDQWdJQ0J2WW1vdWMzQnNhV05sS0dOMWNuSmxiblJRWVhSb0xDQXhLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCa1pXeGxkR1VnYjJKcVcyTjFjbkpsYm5SUVlYUm9YVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WkdWc0tHOWlhbHRqZFhKeVpXNTBVR0YwYUYwc0lIQmhkR2d1YzJ4cFkyVW9NU2twTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYjJKcU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUlFZWFJvTzF4dUlDQjlYRzVjYmlBZ2RtRnlJRzF2WkNBOUlHWmhZM1J2Y25rb0tUdGNiaUFnYlc5a0xtTnlaV0YwWlNBOUlHWmhZM1J2Y25rN1hHNGdJRzF2WkM1M2FYUm9TVzVvWlhKcGRHVmtVSEp2Y0hNZ1BTQm1ZV04wYjNKNUtIdHBibU5zZFdSbFNXNW9aWEpwZEdWa1VISnZjSE02SUhSeWRXVjlLVnh1SUNCeVpYUjFjbTRnYlc5a08xeHVmU2s3WEc0aUxDSXZMeUJ6YUdsdElHWnZjaUIxYzJsdVp5QndjbTlqWlhOeklHbHVJR0p5YjNkelpYSmNiblpoY2lCd2NtOWpaWE56SUQwZ2JXOWtkV3hsTG1WNGNHOXlkSE1nUFNCN2ZUdGNibHh1THk4Z1kyRmphR1ZrSUdaeWIyMGdkMmhoZEdWMlpYSWdaMnh2WW1Gc0lHbHpJSEJ5WlhObGJuUWdjMjhnZEdoaGRDQjBaWE4wSUhKMWJtNWxjbk1nZEdoaGRDQnpkSFZpSUdsMFhHNHZMeUJrYjI0bmRDQmljbVZoYXlCMGFHbHVaM011SUNCQ2RYUWdkMlVnYm1WbFpDQjBieUIzY21Gd0lHbDBJR2x1SUdFZ2RISjVJR05oZEdOb0lHbHVJR05oYzJVZ2FYUWdhWE5jYmk4dklIZHlZWEJ3WldRZ2FXNGdjM1J5YVdOMElHMXZaR1VnWTI5a1pTQjNhR2xqYUNCa2IyVnpiaWQwSUdSbFptbHVaU0JoYm5rZ1oyeHZZbUZzY3k0Z0lFbDBKM01nYVc1emFXUmxJR0ZjYmk4dklHWjFibU4wYVc5dUlHSmxZMkYxYzJVZ2RISjVMMk5oZEdOb1pYTWdaR1Z2Y0hScGJXbDZaU0JwYmlCalpYSjBZV2x1SUdWdVoybHVaWE11WEc1Y2JuWmhjaUJqWVdOb1pXUlRaWFJVYVcxbGIzVjBPMXh1ZG1GeUlHTmhZMmhsWkVOc1pXRnlWR2x0Wlc5MWREdGNibHh1Wm5WdVkzUnBiMjRnWkdWbVlYVnNkRk5sZEZScGJXOTFkQ2dwSUh0Y2JpQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KM05sZEZScGJXVnZkWFFnYUdGeklHNXZkQ0JpWldWdUlHUmxabWx1WldRbktUdGNibjFjYm1aMWJtTjBhVzl1SUdSbFptRjFiSFJEYkdWaGNsUnBiV1Z2ZFhRZ0tDa2dlMXh1SUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnblkyeGxZWEpVYVcxbGIzVjBJR2hoY3lCdWIzUWdZbVZsYmlCa1pXWnBibVZrSnlrN1hHNTlYRzRvWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUhSeWVTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYzJWMFZHbHRaVzkxZENBOVBUMGdKMloxYm1OMGFXOXVKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZqYUdWa1UyVjBWR2x0Wlc5MWRDQTlJSE5sZEZScGJXVnZkWFE3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZV05vWldSVFpYUlVhVzFsYjNWMElEMGdaR1ZtWVhWc2RGTmxkRlJwYlc5MWREdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMGdZMkYwWTJnZ0tHVXBJSHRjYmlBZ0lDQWdJQ0FnWTJGamFHVmtVMlYwVkdsdFpXOTFkQ0E5SUdSbFptRjFiSFJUWlhSVWFXMXZkWFE3WEc0Z0lDQWdmVnh1SUNBZ0lIUnllU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1kyeGxZWEpVYVcxbGIzVjBJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCallXTm9aV1JEYkdWaGNsUnBiV1Z2ZFhRZ1BTQmpiR1ZoY2xScGJXVnZkWFE3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZV05vWldSRGJHVmhjbFJwYldWdmRYUWdQU0JrWldaaGRXeDBRMnhsWVhKVWFXMWxiM1YwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnZlNCallYUmphQ0FvWlNrZ2UxeHVJQ0FnSUNBZ0lDQmpZV05vWldSRGJHVmhjbFJwYldWdmRYUWdQU0JrWldaaGRXeDBRMnhsWVhKVWFXMWxiM1YwTzF4dUlDQWdJSDFjYm4wZ0tDa3BYRzVtZFc1amRHbHZiaUJ5ZFc1VWFXMWxiM1YwS0daMWJpa2dlMXh1SUNBZ0lHbG1JQ2hqWVdOb1pXUlRaWFJVYVcxbGIzVjBJRDA5UFNCelpYUlVhVzFsYjNWMEtTQjdYRzRnSUNBZ0lDQWdJQzh2Ym05eWJXRnNJR1Z1ZG1seWIyMWxiblJ6SUdsdUlITmhibVVnYzJsMGRXRjBhVzl1YzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWMFZHbHRaVzkxZENobWRXNHNJREFwTzF4dUlDQWdJSDFjYmlBZ0lDQXZMeUJwWmlCelpYUlVhVzFsYjNWMElIZGhjMjRuZENCaGRtRnBiR0ZpYkdVZ1luVjBJSGRoY3lCc1lYUjBaWElnWkdWbWFXNWxaRnh1SUNBZ0lHbG1JQ2dvWTJGamFHVmtVMlYwVkdsdFpXOTFkQ0E5UFQwZ1pHVm1ZWFZzZEZObGRGUnBiVzkxZENCOGZDQWhZMkZqYUdWa1UyVjBWR2x0Wlc5MWRDa2dKaVlnYzJWMFZHbHRaVzkxZENrZ2UxeHVJQ0FnSUNBZ0lDQmpZV05vWldSVFpYUlVhVzFsYjNWMElEMGdjMlYwVkdsdFpXOTFkRHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSE5sZEZScGJXVnZkWFFvWm5WdUxDQXdLVHRjYmlBZ0lDQjlYRzRnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2QyaGxiaUIzYUdWdUlITnZiV1ZpYjJSNUlHaGhjeUJ6WTNKbGQyVmtJSGRwZEdnZ2MyVjBWR2x0Wlc5MWRDQmlkWFFnYm04Z1NTNUZMaUJ0WVdSa2JtVnpjMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZMkZqYUdWa1UyVjBWR2x0Wlc5MWRDaG1kVzRzSURBcE8xeHVJQ0FnSUgwZ1kyRjBZMmdvWlNsN1hHNGdJQ0FnSUNBZ0lIUnllU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQXZMeUJYYUdWdUlIZGxJR0Z5WlNCcGJpQkpMa1V1SUdKMWRDQjBhR1VnYzJOeWFYQjBJR2hoY3lCaVpXVnVJR1YyWVd4bFpDQnpieUJKTGtVdUlHUnZaWE51SjNRZ2RISjFjM1FnZEdobElHZHNiMkpoYkNCdlltcGxZM1FnZDJobGJpQmpZV3hzWldRZ2JtOXliV0ZzYkhsY2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQmpZV05vWldSVFpYUlVhVzFsYjNWMExtTmhiR3dvYm5Wc2JDd2dablZ1TENBd0tUdGNiaUFnSUNBZ0lDQWdmU0JqWVhSamFDaGxLWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJSE5oYldVZ1lYTWdZV0p2ZG1VZ1luVjBJSGRvWlc0Z2FYUW5jeUJoSUhabGNuTnBiMjRnYjJZZ1NTNUZMaUIwYUdGMElHMTFjM1FnYUdGMlpTQjBhR1VnWjJ4dlltRnNJRzlpYW1WamRDQm1iM0lnSjNSb2FYTW5MQ0JvYjNCbWRXeHNlU0J2ZFhJZ1kyOXVkR1Y0ZENCamIzSnlaV04wSUc5MGFHVnlkMmx6WlNCcGRDQjNhV3hzSUhSb2NtOTNJR0VnWjJ4dlltRnNJR1Z5Y205eVhHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdZMkZqYUdWa1UyVjBWR2x0Wlc5MWRDNWpZV3hzS0hSb2FYTXNJR1oxYml3Z01DazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmx4dWZWeHVablZ1WTNScGIyNGdjblZ1UTJ4bFlYSlVhVzFsYjNWMEtHMWhjbXRsY2lrZ2UxeHVJQ0FnSUdsbUlDaGpZV05vWldSRGJHVmhjbFJwYldWdmRYUWdQVDA5SUdOc1pXRnlWR2x0Wlc5MWRDa2dlMXh1SUNBZ0lDQWdJQ0F2TDI1dmNtMWhiQ0JsYm5acGNtOXRaVzUwY3lCcGJpQnpZVzVsSUhOcGRIVmhkR2x2Ym5OY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOc1pXRnlWR2x0Wlc5MWRDaHRZWEpyWlhJcE8xeHVJQ0FnSUgxY2JpQWdJQ0F2THlCcFppQmpiR1ZoY2xScGJXVnZkWFFnZDJGemJpZDBJR0YyWVdsc1lXSnNaU0JpZFhRZ2QyRnpJR3hoZEhSbGNpQmtaV1pwYm1Wa1hHNGdJQ0FnYVdZZ0tDaGpZV05vWldSRGJHVmhjbFJwYldWdmRYUWdQVDA5SUdSbFptRjFiSFJEYkdWaGNsUnBiV1Z2ZFhRZ2ZId2dJV05oWTJobFpFTnNaV0Z5VkdsdFpXOTFkQ2tnSmlZZ1kyeGxZWEpVYVcxbGIzVjBLU0I3WEc0Z0lDQWdJQ0FnSUdOaFkyaGxaRU5zWldGeVZHbHRaVzkxZENBOUlHTnNaV0Z5VkdsdFpXOTFkRHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR05zWldGeVZHbHRaVzkxZENodFlYSnJaWElwTzF4dUlDQWdJSDFjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBdkx5QjNhR1Z1SUhkb1pXNGdjMjl0WldKdlpIa2dhR0Z6SUhOamNtVjNaV1FnZDJsMGFDQnpaWFJVYVcxbGIzVjBJR0oxZENCdWJ5QkpMa1V1SUcxaFpHUnVaWE56WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJqWVdOb1pXUkRiR1ZoY2xScGJXVnZkWFFvYldGeWEyVnlLVHRjYmlBZ0lDQjlJR05oZEdOb0lDaGxLWHRjYmlBZ0lDQWdJQ0FnZEhKNUlIdGNiaUFnSUNBZ0lDQWdJQ0FnSUM4dklGZG9aVzRnZDJVZ1lYSmxJR2x1SUVrdVJTNGdZblYwSUhSb1pTQnpZM0pwY0hRZ2FHRnpJR0psWlc0Z1pYWmhiR1ZrSUhOdklFa3VSUzRnWkc5bGMyNG5kQ0FnZEhKMWMzUWdkR2hsSUdkc2IySmhiQ0J2WW1wbFkzUWdkMmhsYmlCallXeHNaV1FnYm05eWJXRnNiSGxjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCallXTm9aV1JEYkdWaGNsUnBiV1Z2ZFhRdVkyRnNiQ2h1ZFd4c0xDQnRZWEpyWlhJcE8xeHVJQ0FnSUNBZ0lDQjlJR05oZEdOb0lDaGxLWHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDOHZJSE5oYldVZ1lYTWdZV0p2ZG1VZ1luVjBJSGRvWlc0Z2FYUW5jeUJoSUhabGNuTnBiMjRnYjJZZ1NTNUZMaUIwYUdGMElHMTFjM1FnYUdGMlpTQjBhR1VnWjJ4dlltRnNJRzlpYW1WamRDQm1iM0lnSjNSb2FYTW5MQ0JvYjNCbWRXeHNlU0J2ZFhJZ1kyOXVkR1Y0ZENCamIzSnlaV04wSUc5MGFHVnlkMmx6WlNCcGRDQjNhV3hzSUhSb2NtOTNJR0VnWjJ4dlltRnNJR1Z5Y205eUxseHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z1UyOXRaU0IyWlhKemFXOXVjeUJ2WmlCSkxrVXVJR2hoZG1VZ1pHbG1abVZ5Wlc1MElISjFiR1Z6SUdadmNpQmpiR1ZoY2xScGJXVnZkWFFnZG5NZ2MyVjBWR2x0Wlc5MWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR05oWTJobFpFTnNaV0Z5VkdsdFpXOTFkQzVqWVd4c0tIUm9hWE1zSUcxaGNtdGxjaWs3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JseHVYRzU5WEc1MllYSWdjWFZsZFdVZ1BTQmJYVHRjYm5aaGNpQmtjbUZwYm1sdVp5QTlJR1poYkhObE8xeHVkbUZ5SUdOMWNuSmxiblJSZFdWMVpUdGNiblpoY2lCeGRXVjFaVWx1WkdWNElEMGdMVEU3WEc1Y2JtWjFibU4wYVc5dUlHTnNaV0Z1VlhCT1pYaDBWR2xqYXlncElIdGNiaUFnSUNCcFppQW9JV1J5WVdsdWFXNW5JSHg4SUNGamRYSnlaVzUwVVhWbGRXVXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lIMWNiaUFnSUNCa2NtRnBibWx1WnlBOUlHWmhiSE5sTzF4dUlDQWdJR2xtSUNoamRYSnlaVzUwVVhWbGRXVXViR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQWdJSEYxWlhWbElEMGdZM1Z5Y21WdWRGRjFaWFZsTG1OdmJtTmhkQ2h4ZFdWMVpTazdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NYVmxkV1ZKYm1SbGVDQTlJQzB4TzF4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvY1hWbGRXVXViR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQWdJR1J5WVdsdVVYVmxkV1VvS1R0Y2JpQWdJQ0I5WEc1OVhHNWNibVoxYm1OMGFXOXVJR1J5WVdsdVVYVmxkV1VvS1NCN1hHNGdJQ0FnYVdZZ0tHUnlZV2x1YVc1bktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNCOVhHNGdJQ0FnZG1GeUlIUnBiV1Z2ZFhRZ1BTQnlkVzVVYVcxbGIzVjBLR05zWldGdVZYQk9aWGgwVkdsamF5azdYRzRnSUNBZ1pISmhhVzVwYm1jZ1BTQjBjblZsTzF4dVhHNGdJQ0FnZG1GeUlHeGxiaUE5SUhGMVpYVmxMbXhsYm1kMGFEdGNiaUFnSUNCM2FHbHNaU2hzWlc0cElIdGNiaUFnSUNBZ0lDQWdZM1Z5Y21WdWRGRjFaWFZsSUQwZ2NYVmxkV1U3WEc0Z0lDQWdJQ0FnSUhGMVpYVmxJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNnckszRjFaWFZsU1c1a1pYZ2dQQ0JzWlc0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaGpkWEp5Wlc1MFVYVmxkV1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamRYSnlaVzUwVVhWbGRXVmJjWFZsZFdWSmJtUmxlRjB1Y25WdUtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjWFZsZFdWSmJtUmxlQ0E5SUMweE8xeHVJQ0FnSUNBZ0lDQnNaVzRnUFNCeGRXVjFaUzVzWlc1bmRHZzdYRzRnSUNBZ2ZWeHVJQ0FnSUdOMWNuSmxiblJSZFdWMVpTQTlJRzUxYkd3N1hHNGdJQ0FnWkhKaGFXNXBibWNnUFNCbVlXeHpaVHRjYmlBZ0lDQnlkVzVEYkdWaGNsUnBiV1Z2ZFhRb2RHbHRaVzkxZENrN1hHNTlYRzVjYm5CeWIyTmxjM011Ym1WNGRGUnBZMnNnUFNCbWRXNWpkR2x2YmlBb1puVnVLU0I3WEc0Z0lDQWdkbUZ5SUdGeVozTWdQU0J1WlhjZ1FYSnlZWGtvWVhKbmRXMWxiblJ6TG14bGJtZDBhQ0F0SURFcE8xeHVJQ0FnSUdsbUlDaGhjbWQxYldWdWRITXViR1Z1WjNSb0lENGdNU2tnZTF4dUlDQWdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNVHNnYVNBOElHRnlaM1Z0Wlc1MGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZWEpuYzF0cElDMGdNVjBnUFNCaGNtZDFiV1Z1ZEhOYmFWMDdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzRnSUNBZ2NYVmxkV1V1Y0hWemFDaHVaWGNnU1hSbGJTaG1kVzRzSUdGeVozTXBLVHRjYmlBZ0lDQnBaaUFvY1hWbGRXVXViR1Z1WjNSb0lEMDlQU0F4SUNZbUlDRmtjbUZwYm1sdVp5a2dlMXh1SUNBZ0lDQWdJQ0J5ZFc1VWFXMWxiM1YwS0dSeVlXbHVVWFZsZFdVcE8xeHVJQ0FnSUgxY2JuMDdYRzVjYmk4dklIWTRJR3hwYTJWeklIQnlaV1JwWTNScFlteGxJRzlpYW1WamRITmNibVoxYm1OMGFXOXVJRWwwWlcwb1puVnVMQ0JoY25KaGVTa2dlMXh1SUNBZ0lIUm9hWE11Wm5WdUlEMGdablZ1TzF4dUlDQWdJSFJvYVhNdVlYSnlZWGtnUFNCaGNuSmhlVHRjYm4xY2JrbDBaVzB1Y0hKdmRHOTBlWEJsTG5KMWJpQTlJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0IwYUdsekxtWjFiaTVoY0hCc2VTaHVkV3hzTENCMGFHbHpMbUZ5Y21GNUtUdGNibjA3WEc1d2NtOWpaWE56TG5ScGRHeGxJRDBnSjJKeWIzZHpaWEluTzF4dWNISnZZMlZ6Y3k1aWNtOTNjMlZ5SUQwZ2RISjFaVHRjYm5CeWIyTmxjM011Wlc1MklEMGdlMzA3WEc1d2NtOWpaWE56TG1GeVozWWdQU0JiWFR0Y2JuQnliMk5sYzNNdWRtVnljMmx2YmlBOUlDY25PeUF2THlCbGJYQjBlU0J6ZEhKcGJtY2dkRzhnWVhadmFXUWdjbVZuWlhod0lHbHpjM1ZsYzF4dWNISnZZMlZ6Y3k1MlpYSnphVzl1Y3lBOUlIdDlPMXh1WEc1bWRXNWpkR2x2YmlCdWIyOXdLQ2tnZTMxY2JseHVjSEp2WTJWemN5NXZiaUE5SUc1dmIzQTdYRzV3Y205alpYTnpMbUZrWkV4cGMzUmxibVZ5SUQwZ2JtOXZjRHRjYm5CeWIyTmxjM011YjI1alpTQTlJRzV2YjNBN1hHNXdjbTlqWlhOekxtOW1aaUE5SUc1dmIzQTdYRzV3Y205alpYTnpMbkpsYlc5MlpVeHBjM1JsYm1WeUlEMGdibTl2Y0R0Y2JuQnliMk5sYzNNdWNtVnRiM1psUVd4c1RHbHpkR1Z1WlhKeklEMGdibTl2Y0R0Y2JuQnliMk5sYzNNdVpXMXBkQ0E5SUc1dmIzQTdYRzV3Y205alpYTnpMbkJ5WlhCbGJtUk1hWE4wWlc1bGNpQTlJRzV2YjNBN1hHNXdjbTlqWlhOekxuQnlaWEJsYm1SUGJtTmxUR2x6ZEdWdVpYSWdQU0J1YjI5d08xeHVYRzV3Y205alpYTnpMbXhwYzNSbGJtVnljeUE5SUdaMWJtTjBhVzl1SUNodVlXMWxLU0I3SUhKbGRIVnliaUJiWFNCOVhHNWNibkJ5YjJObGMzTXVZbWx1WkdsdVp5QTlJR1oxYm1OMGFXOXVJQ2h1WVcxbEtTQjdYRzRnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0Nkd2NtOWpaWE56TG1KcGJtUnBibWNnYVhNZ2JtOTBJSE4xY0hCdmNuUmxaQ2NwTzF4dWZUdGNibHh1Y0hKdlkyVnpjeTVqZDJRZ1BTQm1kVzVqZEdsdmJpQW9LU0I3SUhKbGRIVnliaUFuTHljZ2ZUdGNibkJ5YjJObGMzTXVZMmhrYVhJZ1BTQm1kVzVqZEdsdmJpQW9aR2x5S1NCN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2R3Y205alpYTnpMbU5vWkdseUlHbHpJRzV2ZENCemRYQndiM0owWldRbktUdGNibjA3WEc1d2NtOWpaWE56TG5WdFlYTnJJRDBnWm5WdVkzUnBiMjRvS1NCN0lISmxkSFZ5YmlBd095QjlPMXh1SWl3aUozVnpaU0J6ZEhKcFkzUW5YRzVjYm1OdmJuTjBJSHRwYzA5aWFtVmpkQ3dnWjJWMFMyVjVjMzBnUFNCeVpYRjFhWEpsS0NjdUwyeGhibWNuS1Z4dVhHNHZMeUJRVWtsV1FWUkZJRkJTVDFCRlVsUkpSVk5jYm1OdmJuTjBJRUpaVUVGVFUxOU5UMFJGSUQwZ0oxOWZZbmx3WVhOelRXOWtaU2RjYm1OdmJuTjBJRWxIVGs5U1JWOURTVkpEVlV4QlVpQTlJQ2RmWDJsbmJtOXlaVU5wY21OMWJHRnlKMXh1WTI5dWMzUWdUVUZZWDBSRlJWQWdQU0FuWDE5dFlYaEVaV1Z3SjF4dVkyOXVjM1FnUTBGRFNFVWdQU0FuWDE5allXTm9aU2RjYm1OdmJuTjBJRkZWUlZWRklEMGdKMTlmY1hWbGRXVW5YRzVqYjI1emRDQlRWRUZVUlNBOUlDZGZYM04wWVhSbEoxeHVYRzVqYjI1emRDQkZUVkJVV1Y5VFZFRlVSU0E5SUh0OVhHNWNibU5zWVhOeklGSmxZM1Z5YzJsMlpVbDBaWEpoZEc5eUlIdGNiaUFnTHlvcVhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmRUZ5Y21GNWZTQnliMjkwWEc0Z0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmJZbmx3WVhOelRXOWtaVDB3WFZ4dUlDQWdLaUJBY0dGeVlXMGdlMEp2YjJ4bFlXNTlJRnRwWjI1dmNtVkRhWEpqZFd4aGNqMW1ZV3h6WlYxY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJRnR0WVhoRVpXVndQVEV3TUYxY2JpQWdJQ292WEc0Z0lHTnZibk4wY25WamRHOXlJQ2h5YjI5MExDQmllWEJoYzNOTmIyUmxJRDBnTUN3Z2FXZHViM0psUTJseVkzVnNZWElnUFNCbVlXeHpaU3dnYldGNFJHVmxjQ0E5SURFd01Da2dlMXh1SUNBZ0lIUm9hWE5iUWxsUVFWTlRYMDFQUkVWZElEMGdZbmx3WVhOelRXOWtaVnh1SUNBZ0lIUm9hWE5iU1VkT1QxSkZYME5KVWtOVlRFRlNYU0E5SUdsbmJtOXlaVU5wY21OMWJHRnlYRzRnSUNBZ2RHaHBjMXROUVZoZlJFVkZVRjBnUFNCdFlYaEVaV1Z3WEc0Z0lDQWdkR2hwYzF0RFFVTklSVjBnUFNCYlhWeHVJQ0FnSUhSb2FYTmJVVlZGVlVWZElEMGdXMTFjYmlBZ0lDQjBhR2x6VzFOVVFWUkZYU0E5SUhSb2FYTXVaMlYwVTNSaGRHVW9kVzVrWldacGJtVmtMQ0J5YjI5MEtWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQkFjbVYwZFhKdWN5QjdUMkpxWldOMGZWeHVJQ0FnS2k5Y2JpQWdibVY0ZENBb0tTQjdYRzRnSUNBZ1kyOXVjM1FnZTI1dlpHVXNJSEJoZEdnc0lHUmxaWEI5SUQwZ2RHaHBjMXRUVkVGVVJWMGdmSHdnUlUxUVZGbGZVMVJCVkVWY2JseHVJQ0FnSUdsbUlDaDBhR2x6VzAxQldGOUVSVVZRWFNBK0lHUmxaWEFwSUh0Y2JpQWdJQ0FnSUdsbUlDaDBhR2x6TG1selRtOWtaU2h1YjJSbEtTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTVwYzBOcGNtTjFiR0Z5S0c1dlpHVXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLSFJvYVhOYlNVZE9UMUpGWDBOSlVrTlZURUZTWFNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnTHk4Z2MydHBjRnh1SUNBZ0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0owTnBjbU4xYkdGeUlISmxabVZ5Wlc1alpTY3BYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2gwYUdsekxtOXVVM1JsY0VsdWRHOG9kR2hwYzF0VFZFRlVSVjBwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emRDQmtaWE5qY21sd2RHOXljeUE5SUhSb2FYTXVaMlYwVTNSaGRHVnpUMlpEYUdsc1pFNXZaR1Z6S0c1dlpHVXNJSEJoZEdnc0lHUmxaWEFwWEc0Z0lDQWdJQ0FnSUNBZ0lDQmpiMjV6ZENCdFpYUm9iMlFnUFNCMGFHbHpXMEpaVUVGVFUxOU5UMFJGWFNBL0lDZHdkWE5vSnlBNklDZDFibk5vYVdaMEoxeHVJQ0FnSUNBZ0lDQWdJQ0FnZEdocGMxdFJWVVZWUlYxYmJXVjBhRzlrWFNndUxpNWtaWE5qY21sd2RHOXljeWxjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE5iUTBGRFNFVmRMbkIxYzJnb2JtOWtaU2xjYmlBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCamIyNXpkQ0IyWVd4MVpTQTlJSFJvYVhOYlVWVkZWVVZkTG5Ob2FXWjBLQ2xjYmlBZ0lDQmpiMjV6ZENCa2IyNWxJRDBnSVhaaGJIVmxYRzVjYmlBZ0lDQjBhR2x6VzFOVVFWUkZYU0E5SUhaaGJIVmxYRzVjYmlBZ0lDQnBaaUFvWkc5dVpTa2dkR2hwY3k1a1pYTjBjbTk1S0NsY2JseHVJQ0FnSUhKbGRIVnliaUI3ZG1Gc2RXVXNJR1J2Ym1WOVhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcVhHNGdJQ0FxTDF4dUlDQmtaWE4wY205NUlDZ3BJSHRjYmlBZ0lDQjBhR2x6VzFGVlJWVkZYUzVzWlc1bmRHZ2dQU0F3WEc0Z0lDQWdkR2hwYzF0RFFVTklSVjB1YkdWdVozUm9JRDBnTUZ4dUlDQWdJSFJvYVhOYlUxUkJWRVZkSUQwZ2JuVnNiRnh1SUNCOVhHNGdJQzhxS2x4dUlDQWdLaUJBY0dGeVlXMGdleXA5SUdGdWVWeHVJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ292WEc0Z0lHbHpUbTlrWlNBb1lXNTVLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHbHpUMkpxWldOMEtHRnVlU2xjYmlBZ2ZWeHVJQ0F2S2lwY2JpQWdJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FxTDF4dUlDQnBjMHhsWVdZZ0tHRnVlU2tnZTF4dUlDQWdJSEpsZEhWeWJpQWhkR2hwY3k1cGMwNXZaR1VvWVc1NUtWeHVJQ0I5WEc0Z0lDOHFLbHh1SUNBZ0tpQkFjR0Z5WVcwZ2V5cDlJR0Z1ZVZ4dUlDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDb3ZYRzRnSUdselEybHlZM1ZzWVhJZ0tHRnVlU2tnZTF4dUlDQWdJSEpsZEhWeWJpQjBhR2x6VzBOQlEwaEZYUzVwYm1SbGVFOW1LR0Z1ZVNrZ0lUMDlJQzB4WEc0Z0lIMWNiaUFnTHlvcVhHNGdJQ0FxSUZKbGRIVnlibk1nYzNSaGRHVnpJRzltSUdOb2FXeGtJRzV2WkdWelhHNGdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0J1YjJSbFhHNGdJQ0FxSUVCd1lYSmhiU0I3UVhKeVlYbDlJSEJoZEdoY2JpQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJR1JsWlhCY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBGeWNtRjVQRTlpYW1WamRENTlYRzRnSUNBcUwxeHVJQ0JuWlhSVGRHRjBaWE5QWmtOb2FXeGtUbTlrWlhNZ0tHNXZaR1VzSUhCaGRHZ3NJR1JsWlhBcElIdGNiaUFnSUNCeVpYUjFjbTRnWjJWMFMyVjVjeWh1YjJSbEtTNXRZWEFvYTJWNUlEMCtYRzRnSUNBZ0lDQjBhR2x6TG1kbGRGTjBZWFJsS0c1dlpHVXNJRzV2WkdWYmEyVjVYU3dnYTJWNUxDQndZWFJvTG1OdmJtTmhkQ2hyWlhrcExDQmtaV1Z3SUNzZ01TbGNiaUFnSUNBcFhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlGSmxkSFZ5Ym5NZ2MzUmhkR1VnYjJZZ2JtOWtaUzRnUTJGc2JITWdabTl5SUdWaFkyZ2dibTlrWlZ4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdXM0JoY21WdWRGMWNiaUFnSUNvZ1FIQmhjbUZ0SUhzcWZTQmJibTlrWlYxY2JpQWdJQ29nUUhCaGNtRnRJSHRUZEhKcGJtZDlJRnRyWlhsZFhHNGdJQ0FxSUVCd1lYSmhiU0I3UVhKeVlYbDlJRnR3WVhSb1hWeHVJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnVzJSbFpYQmRYRzRnSUNBcUlFQnlaWFIxY201eklIdFBZbXBsWTNSOVhHNGdJQ0FxTDF4dUlDQm5aWFJUZEdGMFpTQW9jR0Z5Wlc1MExDQnViMlJsTENCclpYa3NJSEJoZEdnZ1BTQmJYU3dnWkdWbGNDQTlJREFwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb0xDQmtaV1Z3ZlZ4dUlDQjlYRzRnSUM4cUtseHVJQ0FnS2lCRFlXeHNZbUZqYTF4dUlDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdjM1JoZEdWY2JpQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQXFMMXh1SUNCdmJsTjBaWEJKYm5SdklDaHpkR0YwWlNrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwY25WbFhHNGdJSDFjYmlBZ0x5b3FYRzRnSUNBcUlFQnlaWFIxY201eklIdFNaV04xY25OcGRtVkpkR1Z5WVhSdmNuMWNiaUFnSUNvdlhHNGdJRnRUZVcxaWIyd3VhWFJsY21GMGIzSmRJQ2dwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwYzF4dUlDQjlYRzU5WEc1Y2JtMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1VtVmpkWEp6YVhabFNYUmxjbUYwYjNKY2JpSXNJaWQxYzJVZ2MzUnlhV04wSjF4dUx5b3FYRzRnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1SUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdLaTljYm1aMWJtTjBhVzl1SUdselQySnFaV04wSUNoaGJua3BJSHRjYmlBZ2NtVjBkWEp1SUdGdWVTQWhQVDBnYm5Wc2JDQW1KaUIwZVhCbGIyWWdZVzU1SUQwOVBTQW5iMkpxWldOMEoxeHVmVnh1THlvcVhHNGdLaUJBY0dGeVlXMGdleXA5SUdGdWVWeHVJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0tpOWNibU52Ym5OMElIdHBjMEZ5Y21GNWZTQTlJRUZ5Y21GNVhHNHZLaXBjYmlBcUlFQndZWEpoYlNCN0tuMGdZVzU1WEc0Z0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFxTDF4dVpuVnVZM1JwYjI0Z2FYTkJjbkpoZVV4cGEyVWdLR0Z1ZVNrZ2UxeHVJQ0JwWmlBb0lXbHpUMkpxWldOMEtHRnVlU2twSUhKbGRIVnliaUJtWVd4elpWeHVJQ0JwWmlBb0lTZ25iR1Z1WjNSb0p5QnBiaUJoYm5rcEtTQnlaWFIxY200Z1ptRnNjMlZjYmlBZ1kyOXVjM1FnYkdWdVozUm9JRDBnWVc1NUxteGxibWQwYUZ4dUlDQnBaaUFvSVdselRuVnRZbVZ5S0d4bGJtZDBhQ2twSUhKbGRIVnliaUJtWVd4elpWeHVJQ0JwWmlBb2JHVnVaM1JvSUQ0Z01Da2dlMXh1SUNBZ0lISmxkSFZ5YmlBb2JHVnVaM1JvSUMwZ01Ta2dhVzRnWVc1NVhHNGdJSDBnWld4elpTQjdYRzRnSUNBZ1ptOXlJQ2hqYjI1emRDQnJaWGtnYVc0Z1lXNTVLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJWY2JpQWdJQ0I5WEc0Z0lIMWNibjFjYmk4cUtseHVJQ29nUUhCaGNtRnRJSHNxZlNCaGJubGNiaUFxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDb3ZYRzVtZFc1amRHbHZiaUJwYzA1MWJXSmxjaUFvWVc1NUtTQjdYRzRnSUhKbGRIVnliaUIwZVhCbGIyWWdZVzU1SUQwOVBTQW5iblZ0WW1WeUoxeHVmVnh1THlvcVhHNGdLaUJBY0dGeVlXMGdlMDlpYW1WamRIeEJjbkpoZVgwZ2IySnFaV04wWEc0Z0tpQkFjbVYwZFhKdWN5QjdRWEp5WVhrOFUzUnlhVzVuUG4xY2JpQXFMMXh1Wm5WdVkzUnBiMjRnWjJWMFMyVjVjeUFvYjJKcVpXTjBLU0I3WEc0Z0lHTnZibk4wSUd0bGVYTmZJRDBnVDJKcVpXTjBMbXRsZVhNb2IySnFaV04wS1Z4dUlDQnBaaUFvYVhOQmNuSmhlU2h2WW1wbFkzUXBLU0I3WEc0Z0lDQWdMeThnYzJ0cGNDQnpiM0owWEc0Z0lIMGdaV3h6WlNCcFppQW9hWE5CY25KaGVVeHBhMlVvYjJKcVpXTjBLU2tnZTF4dUlDQWdJR052Ym5OMElHbHVaR1Y0SUQwZ2EyVjVjMTh1YVc1a1pYaFBaaWduYkdWdVozUm9KeWxjYmlBZ0lDQnBaaUFvYVc1a1pYZ2dQaUF0TVNrZ2UxeHVJQ0FnSUNBZ2EyVjVjMTh1YzNCc2FXTmxLR2x1WkdWNExDQXhLVnh1SUNBZ0lIMWNiaUFnSUNBdkx5QnphMmx3SUhOdmNuUmNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQXZMeUJ6YjNKMFhHNGdJQ0FnYTJWNWMxOHVjMjl5ZENncFhHNGdJSDFjYmlBZ2NtVjBkWEp1SUd0bGVYTmZYRzU5WEc1Y2JtVjRjRzl5ZEhNdVoyVjBTMlY1Y3lBOUlHZGxkRXRsZVhOY2JtVjRjRzl5ZEhNdWFYTkJjbkpoZVNBOUlHbHpRWEp5WVhsY2JtVjRjRzl5ZEhNdWFYTkJjbkpoZVV4cGEyVWdQU0JwYzBGeWNtRjVUR2xyWlZ4dVpYaHdiM0owY3k1cGMwOWlhbVZqZENBOUlHbHpUMkpxWldOMFhHNWxlSEJ2Y25SekxtbHpUblZ0WW1WeUlEMGdhWE5PZFcxaVpYSmNiaUlzSWlobWRXNWpkR2x2YmloelpXeG1LU0I3WEc0Z0lDZDFjMlVnYzNSeWFXTjBKenRjYmx4dUlDQnBaaUFvYzJWc1ppNW1aWFJqYUNrZ2UxeHVJQ0FnSUhKbGRIVnlibHh1SUNCOVhHNWNiaUFnZG1GeUlITjFjSEJ2Y25RZ1BTQjdYRzRnSUNBZ2MyVmhjbU5vVUdGeVlXMXpPaUFuVlZKTVUyVmhjbU5vVUdGeVlXMXpKeUJwYmlCelpXeG1MRnh1SUNBZ0lHbDBaWEpoWW14bE9pQW5VM2x0WW05c0p5QnBiaUJ6Wld4bUlDWW1JQ2RwZEdWeVlYUnZjaWNnYVc0Z1UzbHRZbTlzTEZ4dUlDQWdJR0pzYjJJNklDZEdhV3hsVW1WaFpHVnlKeUJwYmlCelpXeG1JQ1ltSUNkQ2JHOWlKeUJwYmlCelpXeG1JQ1ltSUNobWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lIUnllU0I3WEc0Z0lDQWdJQ0FnSUc1bGR5QkNiRzlpS0NsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVmNiaUFnSUNBZ0lIMGdZMkYwWTJnb1pTa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJWY2JpQWdJQ0FnSUgxY2JpQWdJQ0I5S1NncExGeHVJQ0FnSUdadmNtMUVZWFJoT2lBblJtOXliVVJoZEdFbklHbHVJSE5sYkdZc1hHNGdJQ0FnWVhKeVlYbENkV1ptWlhJNklDZEJjbkpoZVVKMVptWmxjaWNnYVc0Z2MyVnNabHh1SUNCOVhHNWNiaUFnYVdZZ0tITjFjSEJ2Y25RdVlYSnlZWGxDZFdabVpYSXBJSHRjYmlBZ0lDQjJZWElnZG1sbGQwTnNZWE56WlhNZ1BTQmJYRzRnSUNBZ0lDQW5XMjlpYW1WamRDQkpiblE0UVhKeVlYbGRKeXhjYmlBZ0lDQWdJQ2RiYjJKcVpXTjBJRlZwYm5RNFFYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUZWcGJuUTRRMnhoYlhCbFpFRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCSmJuUXhOa0Z5Y21GNVhTY3NYRzRnSUNBZ0lDQW5XMjlpYW1WamRDQlZhVzUwTVRaQmNuSmhlVjBuTEZ4dUlDQWdJQ0FnSjF0dlltcGxZM1FnU1c1ME16SkJjbkpoZVYwbkxGeHVJQ0FnSUNBZ0oxdHZZbXBsWTNRZ1ZXbHVkRE15UVhKeVlYbGRKeXhjYmlBZ0lDQWdJQ2RiYjJKcVpXTjBJRVpzYjJGME16SkJjbkpoZVYwbkxGeHVJQ0FnSUNBZ0oxdHZZbXBsWTNRZ1JteHZZWFEyTkVGeWNtRjVYU2RjYmlBZ0lDQmRYRzVjYmlBZ0lDQjJZWElnYVhORVlYUmhWbWxsZHlBOUlHWjFibU4wYVc5dUtHOWlhaWtnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRzlpYWlBbUppQkVZWFJoVm1sbGR5NXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmlodlltb3BYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RtRnlJR2x6UVhKeVlYbENkV1ptWlhKV2FXVjNJRDBnUVhKeVlYbENkV1ptWlhJdWFYTldhV1YzSUh4OElHWjFibU4wYVc5dUtHOWlhaWtnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRzlpYWlBbUppQjJhV1YzUTJ4aGMzTmxjeTVwYm1SbGVFOW1LRTlpYW1WamRDNXdjbTkwYjNSNWNHVXVkRzlUZEhKcGJtY3VZMkZzYkNodlltb3BLU0ErSUMweFhHNGdJQ0FnZlZ4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z2JtOXliV0ZzYVhwbFRtRnRaU2h1WVcxbEtTQjdYRzRnSUNBZ2FXWWdLSFI1Y0dWdlppQnVZVzFsSUNFOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdibUZ0WlNBOUlGTjBjbWx1WnlodVlXMWxLVnh1SUNBZ0lIMWNiaUFnSUNCcFppQW9MMXRlWVMxNk1DMDVYRnd0SXlRbEppY3FLeTVjWEY1ZllIeCtYUzlwTG5SbGMzUW9ibUZ0WlNrcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9KMGx1ZG1Gc2FXUWdZMmhoY21GamRHVnlJR2x1SUdobFlXUmxjaUJtYVdWc1pDQnVZVzFsSnlsY2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHNWhiV1V1ZEc5TWIzZGxja05oYzJVb0tWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdibTl5YldGc2FYcGxWbUZzZFdVb2RtRnNkV1VwSUh0Y2JpQWdJQ0JwWmlBb2RIbHdaVzltSUhaaGJIVmxJQ0U5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ2RtRnNkV1VnUFNCVGRISnBibWNvZG1Gc2RXVXBYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUIyWVd4MVpWeHVJQ0I5WEc1Y2JpQWdMeThnUW5WcGJHUWdZU0JrWlhOMGNuVmpkR2wyWlNCcGRHVnlZWFJ2Y2lCbWIzSWdkR2hsSUhaaGJIVmxJR3hwYzNSY2JpQWdablZ1WTNScGIyNGdhWFJsY21GMGIzSkdiM0lvYVhSbGJYTXBJSHRjYmlBZ0lDQjJZWElnYVhSbGNtRjBiM0lnUFNCN1hHNGdJQ0FnSUNCdVpYaDBPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdhWFJsYlhNdWMyaHBablFvS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZTJSdmJtVTZJSFpoYkhWbElEMDlQU0IxYm1SbFptbHVaV1FzSUhaaGJIVmxPaUIyWVd4MVpYMWNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCcFppQW9jM1Z3Y0c5eWRDNXBkR1Z5WVdKc1pTa2dlMXh1SUNBZ0lDQWdhWFJsY21GMGIzSmJVM2x0WW05c0xtbDBaWEpoZEc5eVhTQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYVhSbGNtRjBiM0pjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaWFIxY200Z2FYUmxjbUYwYjNKY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlFaGxZV1JsY25Nb2FHVmhaR1Z5Y3lrZ2UxeHVJQ0FnSUhSb2FYTXViV0Z3SUQwZ2UzMWNibHh1SUNBZ0lHbG1JQ2hvWldGa1pYSnpJR2x1YzNSaGJtTmxiMllnU0dWaFpHVnljeWtnZTF4dUlDQWdJQ0FnYUdWaFpHVnljeTVtYjNKRllXTm9LR1oxYm1OMGFXOXVLSFpoYkhWbExDQnVZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WVhCd1pXNWtLRzVoYldVc0lIWmhiSFZsS1Z4dUlDQWdJQ0FnZlN3Z2RHaHBjeWxjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLRUZ5Y21GNUxtbHpRWEp5WVhrb2FHVmhaR1Z5Y3lrcElIdGNiaUFnSUNBZ0lHaGxZV1JsY25NdVptOXlSV0ZqYUNobWRXNWpkR2x2Ymlob1pXRmtaWElwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVoY0hCbGJtUW9hR1ZoWkdWeVd6QmRMQ0JvWldGa1pYSmJNVjBwWEc0Z0lDQWdJQ0I5TENCMGFHbHpLVnh1SUNBZ0lIMGdaV3h6WlNCcFppQW9hR1ZoWkdWeWN5a2dlMXh1SUNBZ0lDQWdUMkpxWldOMExtZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTW9hR1ZoWkdWeWN5a3VabTl5UldGamFDaG1kVzVqZEdsdmJpaHVZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WVhCd1pXNWtLRzVoYldVc0lHaGxZV1JsY25OYmJtRnRaVjBwWEc0Z0lDQWdJQ0I5TENCMGFHbHpLVnh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJRWhsWVdSbGNuTXVjSEp2ZEc5MGVYQmxMbUZ3Y0dWdVpDQTlJR1oxYm1OMGFXOXVLRzVoYldVc0lIWmhiSFZsS1NCN1hHNGdJQ0FnYm1GdFpTQTlJRzV2Y20xaGJHbDZaVTVoYldVb2JtRnRaU2xjYmlBZ0lDQjJZV3gxWlNBOUlHNXZjbTFoYkdsNlpWWmhiSFZsS0haaGJIVmxLVnh1SUNBZ0lIWmhjaUJ2YkdSV1lXeDFaU0E5SUhSb2FYTXViV0Z3VzI1aGJXVmRYRzRnSUNBZ2RHaHBjeTV0WVhCYmJtRnRaVjBnUFNCdmJHUldZV3gxWlNBL0lHOXNaRlpoYkhWbEt5Y3NKeXQyWVd4MVpTQTZJSFpoYkhWbFhHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pWc25aR1ZzWlhSbEoxMGdQU0JtZFc1amRHbHZiaWh1WVcxbEtTQjdYRzRnSUNBZ1pHVnNaWFJsSUhSb2FYTXViV0Z3VzI1dmNtMWhiR2w2WlU1aGJXVW9ibUZ0WlNsZFhHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNW5aWFFnUFNCbWRXNWpkR2x2YmlodVlXMWxLU0I3WEc0Z0lDQWdibUZ0WlNBOUlHNXZjbTFoYkdsNlpVNWhiV1VvYm1GdFpTbGNiaUFnSUNCeVpYUjFjbTRnZEdocGN5NW9ZWE1vYm1GdFpTa2dQeUIwYUdsekxtMWhjRnR1WVcxbFhTQTZJRzUxYkd4Y2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtaGhjeUE5SUdaMWJtTjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z2RHaHBjeTV0WVhBdWFHRnpUM2R1VUhKdmNHVnlkSGtvYm05eWJXRnNhWHBsVG1GdFpTaHVZVzFsS1NsY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExuTmxkQ0E5SUdaMWJtTjBhVzl1S0c1aGJXVXNJSFpoYkhWbEtTQjdYRzRnSUNBZ2RHaHBjeTV0WVhCYmJtOXliV0ZzYVhwbFRtRnRaU2h1WVcxbEtWMGdQU0J1YjNKdFlXeHBlbVZXWVd4MVpTaDJZV3gxWlNsY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtWnZja1ZoWTJnZ1BTQm1kVzVqZEdsdmJpaGpZV3hzWW1GamF5d2dkR2hwYzBGeVp5a2dlMXh1SUNBZ0lHWnZjaUFvZG1GeUlHNWhiV1VnYVc0Z2RHaHBjeTV0WVhBcElIdGNiaUFnSUNBZ0lHbG1JQ2gwYUdsekxtMWhjQzVvWVhOUGQyNVFjbTl3WlhKMGVTaHVZVzFsS1NrZ2UxeHVJQ0FnSUNBZ0lDQmpZV3hzWW1GamF5NWpZV3hzS0hSb2FYTkJjbWNzSUhSb2FYTXViV0Z3VzI1aGJXVmRMQ0J1WVcxbExDQjBhR2x6S1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsTG10bGVYTWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxiWE1nUFNCYlhWeHVJQ0FnSUhSb2FYTXVabTl5UldGamFDaG1kVzVqZEdsdmJpaDJZV3gxWlN3Z2JtRnRaU2tnZXlCcGRHVnRjeTV3ZFhOb0tHNWhiV1VwSUgwcFhHNGdJQ0FnY21WMGRYSnVJR2wwWlhKaGRHOXlSbTl5S0dsMFpXMXpLVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1ZG1Gc2RXVnpJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnZG1GeUlHbDBaVzF6SUQwZ1cxMWNiaUFnSUNCMGFHbHpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9kbUZzZFdVcElIc2dhWFJsYlhNdWNIVnphQ2gyWVd4MVpTa2dmU2xjYmlBZ0lDQnlaWFIxY200Z2FYUmxjbUYwYjNKR2IzSW9hWFJsYlhNcFhHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNWxiblJ5YVdWeklEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdkbUZ5SUdsMFpXMXpJRDBnVzExY2JpQWdJQ0IwYUdsekxtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2RtRnNkV1VzSUc1aGJXVXBJSHNnYVhSbGJYTXVjSFZ6YUNoYmJtRnRaU3dnZG1Gc2RXVmRLU0I5S1Z4dUlDQWdJSEpsZEhWeWJpQnBkR1Z5WVhSdmNrWnZjaWhwZEdWdGN5bGNiaUFnZlZ4dVhHNGdJR2xtSUNoemRYQndiM0owTG1sMFpYSmhZbXhsS1NCN1hHNGdJQ0FnU0dWaFpHVnljeTV3Y205MGIzUjVjR1ZiVTNsdFltOXNMbWwwWlhKaGRHOXlYU0E5SUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsTG1WdWRISnBaWE5jYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdOdmJuTjFiV1ZrS0dKdlpIa3BJSHRjYmlBZ0lDQnBaaUFvWW05a2VTNWliMlI1VlhObFpDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdWNtVnFaV04wS0c1bGR5QlVlWEJsUlhKeWIzSW9KMEZzY21WaFpIa2djbVZoWkNjcEtWeHVJQ0FnSUgxY2JpQWdJQ0JpYjJSNUxtSnZaSGxWYzJWa0lEMGdkSEoxWlZ4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1ptbHNaVkpsWVdSbGNsSmxZV1I1S0hKbFlXUmxjaWtnZTF4dUlDQWdJSEpsZEhWeWJpQnVaWGNnVUhKdmJXbHpaU2htZFc1amRHbHZiaWh5WlhOdmJIWmxMQ0J5WldwbFkzUXBJSHRjYmlBZ0lDQWdJSEpsWVdSbGNpNXZibXh2WVdRZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WemIyeDJaU2h5WldGa1pYSXVjbVZ6ZFd4MEtWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2NtVmhaR1Z5TG05dVpYSnliM0lnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVZxWldOMEtISmxZV1JsY2k1bGNuSnZjaWxjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlLVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnY21WaFpFSnNiMkpCYzBGeWNtRjVRblZtWm1WeUtHSnNiMklwSUh0Y2JpQWdJQ0IyWVhJZ2NtVmhaR1Z5SUQwZ2JtVjNJRVpwYkdWU1pXRmtaWElvS1Z4dUlDQWdJSFpoY2lCd2NtOXRhWE5sSUQwZ1ptbHNaVkpsWVdSbGNsSmxZV1I1S0hKbFlXUmxjaWxjYmlBZ0lDQnlaV0ZrWlhJdWNtVmhaRUZ6UVhKeVlYbENkV1ptWlhJb1lteHZZaWxjYmlBZ0lDQnlaWFIxY200Z2NISnZiV2x6WlZ4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z2NtVmhaRUpzYjJKQmMxUmxlSFFvWW14dllpa2dlMXh1SUNBZ0lIWmhjaUJ5WldGa1pYSWdQU0J1WlhjZ1JtbHNaVkpsWVdSbGNpZ3BYRzRnSUNBZ2RtRnlJSEJ5YjIxcGMyVWdQU0JtYVd4bFVtVmhaR1Z5VW1WaFpIa29jbVZoWkdWeUtWeHVJQ0FnSUhKbFlXUmxjaTV5WldGa1FYTlVaWGgwS0dKc2IySXBYRzRnSUNBZ2NtVjBkWEp1SUhCeWIyMXBjMlZjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUhKbFlXUkJjbkpoZVVKMVptWmxja0Z6VkdWNGRDaGlkV1lwSUh0Y2JpQWdJQ0IyWVhJZ2RtbGxkeUE5SUc1bGR5QlZhVzUwT0VGeWNtRjVLR0oxWmlsY2JpQWdJQ0IyWVhJZ1kyaGhjbk1nUFNCdVpYY2dRWEp5WVhrb2RtbGxkeTVzWlc1bmRHZ3BYRzVjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJSFpwWlhjdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJR05vWVhKelcybGRJRDBnVTNSeWFXNW5MbVp5YjIxRGFHRnlRMjlrWlNoMmFXVjNXMmxkS1Z4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1kyaGhjbk11YW05cGJpZ25KeWxjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdKMVptWmxja05zYjI1bEtHSjFaaWtnZTF4dUlDQWdJR2xtSUNoaWRXWXVjMnhwWTJVcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCaWRXWXVjMnhwWTJVb01DbGNiaUFnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnZG1GeUlIWnBaWGNnUFNCdVpYY2dWV2x1ZERoQmNuSmhlU2hpZFdZdVlubDBaVXhsYm1kMGFDbGNiaUFnSUNBZ0lIWnBaWGN1YzJWMEtHNWxkeUJWYVc1ME9FRnljbUY1S0dKMVppa3BYRzRnSUNBZ0lDQnlaWFIxY200Z2RtbGxkeTVpZFdabVpYSmNiaUFnSUNCOVhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQkNiMlI1S0NrZ2UxeHVJQ0FnSUhSb2FYTXVZbTlrZVZWelpXUWdQU0JtWVd4elpWeHVYRzRnSUNBZ2RHaHBjeTVmYVc1cGRFSnZaSGtnUFNCbWRXNWpkR2x2YmloaWIyUjVLU0I3WEc0Z0lDQWdJQ0IwYUdsekxsOWliMlI1U1c1cGRDQTlJR0p2WkhsY2JpQWdJQ0FnSUdsbUlDZ2hZbTlrZVNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVWR1Y0ZENBOUlDY25YRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQmliMlI1SUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1VkdWNGRDQTlJR0p2WkhsY2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzVndjRzl5ZEM1aWJHOWlJQ1ltSUVKc2IySXVjSEp2ZEc5MGVYQmxMbWx6VUhKdmRHOTBlWEJsVDJZb1ltOWtlU2twSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWW05a2VVSnNiMklnUFNCaWIyUjVYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE4xY0hCdmNuUXVabTl5YlVSaGRHRWdKaVlnUm05eWJVUmhkR0V1Y0hKdmRHOTBlWEJsTG1selVISnZkRzkwZVhCbFQyWW9ZbTlrZVNrcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ZlltOWtlVVp2Y20xRVlYUmhJRDBnWW05a2VWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHpkWEJ3YjNKMExuTmxZWEpqYUZCaGNtRnRjeUFtSmlCVlVreFRaV0Z5WTJoUVlYSmhiWE11Y0hKdmRHOTBlWEJsTG1selVISnZkRzkwZVhCbFQyWW9ZbTlrZVNrcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ZlltOWtlVlJsZUhRZ1BTQmliMlI1TG5SdlUzUnlhVzVuS0NsY2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzVndjRzl5ZEM1aGNuSmhlVUoxWm1abGNpQW1KaUJ6ZFhCd2IzSjBMbUpzYjJJZ0ppWWdhWE5FWVhSaFZtbGxkeWhpYjJSNUtTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhJZ1BTQmlkV1ptWlhKRGJHOXVaU2hpYjJSNUxtSjFabVpsY2lsY2JpQWdJQ0FnSUNBZ0x5OGdTVVVnTVRBdE1URWdZMkZ1SjNRZ2FHRnVaR3hsSUdFZ1JHRjBZVlpwWlhjZ1ltOWtlUzVjYmlBZ0lDQWdJQ0FnZEdocGN5NWZZbTlrZVVsdWFYUWdQU0J1WlhjZ1FteHZZaWhiZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeVhTbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNWhjbkpoZVVKMVptWmxjaUFtSmlBb1FYSnlZWGxDZFdabVpYSXVjSEp2ZEc5MGVYQmxMbWx6VUhKdmRHOTBlWEJsVDJZb1ltOWtlU2tnZkh3Z2FYTkJjbkpoZVVKMVptWmxjbFpwWlhjb1ltOWtlU2twS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjaUE5SUdKMVptWmxja05zYjI1bEtHSnZaSGtwWEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KM1Z1YzNWd2NHOXlkR1ZrSUVKdlpIbEpibWwwSUhSNWNHVW5LVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb0lYUm9hWE11YUdWaFpHVnljeTVuWlhRb0oyTnZiblJsYm5RdGRIbHdaU2NwS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdZbTlrZVNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMbWhsWVdSbGNuTXVjMlYwS0NkamIyNTBaVzUwTFhSNWNHVW5MQ0FuZEdWNGRDOXdiR0ZwYmp0amFHRnljMlYwUFZWVVJpMDRKeWxjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMGFHbHpMbDlpYjJSNVFteHZZaUFtSmlCMGFHbHpMbDlpYjJSNVFteHZZaTUwZVhCbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnZEdocGN5NW9aV0ZrWlhKekxuTmxkQ2duWTI5dWRHVnVkQzEwZVhCbEp5d2dkR2hwY3k1ZlltOWtlVUpzYjJJdWRIbHdaU2xjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG5ObFlYSmphRkJoY21GdGN5QW1KaUJWVWt4VFpXRnlZMmhRWVhKaGJYTXVjSEp2ZEc5MGVYQmxMbWx6VUhKdmRHOTBlWEJsVDJZb1ltOWtlU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQjBhR2x6TG1obFlXUmxjbk11YzJWMEtDZGpiMjUwWlc1MExYUjVjR1VuTENBbllYQndiR2xqWVhScGIyNHZlQzEzZDNjdFptOXliUzExY214bGJtTnZaR1ZrTzJOb1lYSnpaWFE5VlZSR0xUZ25LVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdhV1lnS0hOMWNIQnZjblF1WW14dllpa2dlMXh1SUNBZ0lDQWdkR2hwY3k1aWJHOWlJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ5WldwbFkzUmxaQ0E5SUdOdmJuTjFiV1ZrS0hSb2FYTXBYRzRnSUNBZ0lDQWdJR2xtSUNoeVpXcGxZM1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV3BsWTNSbFpGeHVJQ0FnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQ0FnYVdZZ0tIUm9hWE11WDJKdlpIbENiRzlpS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdWNtVnpiMngyWlNoMGFHbHpMbDlpYjJSNVFteHZZaWxjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMGFHbHpMbDlpYjJSNVFYSnlZWGxDZFdabVpYSXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzV5WlhOdmJIWmxLRzVsZHlCQ2JHOWlLRnQwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhKZEtTbGNiaUFnSUNBZ0lDQWdmU0JsYkhObElHbG1JQ2gwYUdsekxsOWliMlI1Um05eWJVUmhkR0VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0oyTnZkV3hrSUc1dmRDQnlaV0ZrSUVadmNtMUVZWFJoSUdKdlpIa2dZWE1nWW14dllpY3BYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTaHVaWGNnUW14dllpaGJkR2hwY3k1ZlltOWtlVlJsZUhSZEtTbGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IwYUdsekxtRnljbUY1UW5WbVptVnlJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2gwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhJcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdZMjl1YzNWdFpXUW9kR2hwY3lrZ2ZId2dVSEp2YldselpTNXlaWE52YkhabEtIUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjaWxjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NWliRzlpS0NrdWRHaGxiaWh5WldGa1FteHZZa0Z6UVhKeVlYbENkV1ptWlhJcFhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCMGFHbHpMblJsZUhRZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSFpoY2lCeVpXcGxZM1JsWkNBOUlHTnZibk4xYldWa0tIUm9hWE1wWEc0Z0lDQWdJQ0JwWmlBb2NtVnFaV04wWldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlISmxhbVZqZEdWa1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2gwYUdsekxsOWliMlI1UW14dllpa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjbVZoWkVKc2IySkJjMVJsZUhRb2RHaHBjeTVmWW05a2VVSnNiMklwWEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsQmNuSmhlVUoxWm1abGNpa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdVSEp2YldselpTNXlaWE52YkhabEtISmxZV1JCY25KaGVVSjFabVpsY2tGelZHVjRkQ2gwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhJcEtWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBhR2x6TGw5aWIyUjVSbTl5YlVSaGRHRXBJSHRjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RqYjNWc1pDQnViM1FnY21WaFpDQkdiM0p0UkdGMFlTQmliMlI1SUdGeklIUmxlSFFuS1Z4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTaDBhR2x6TGw5aWIyUjVWR1Y0ZENsY2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0JwWmlBb2MzVndjRzl5ZEM1bWIzSnRSR0YwWVNrZ2UxeHVJQ0FnSUNBZ2RHaHBjeTVtYjNKdFJHRjBZU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTUwWlhoMEtDa3VkR2hsYmloa1pXTnZaR1VwWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkR2hwY3k1cWMyOXVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NTBaWGgwS0NrdWRHaGxiaWhLVTA5T0xuQmhjbk5sS1Z4dUlDQWdJSDFjYmx4dUlDQWdJSEpsZEhWeWJpQjBhR2x6WEc0Z0lIMWNibHh1SUNBdkx5QklWRlJRSUcxbGRHaHZaSE1nZDJodmMyVWdZMkZ3YVhSaGJHbDZZWFJwYjI0Z2MyaHZkV3hrSUdKbElHNXZjbTFoYkdsNlpXUmNiaUFnZG1GeUlHMWxkR2h2WkhNZ1BTQmJKMFJGVEVWVVJTY3NJQ2RIUlZRbkxDQW5TRVZCUkNjc0lDZFBVRlJKVDA1VEp5d2dKMUJQVTFRbkxDQW5VRlZVSjExY2JseHVJQ0JtZFc1amRHbHZiaUJ1YjNKdFlXeHBlbVZOWlhSb2IyUW9iV1YwYUc5a0tTQjdYRzRnSUNBZ2RtRnlJSFZ3WTJGelpXUWdQU0J0WlhSb2IyUXVkRzlWY0hCbGNrTmhjMlVvS1Z4dUlDQWdJSEpsZEhWeWJpQW9iV1YwYUc5a2N5NXBibVJsZUU5bUtIVndZMkZ6WldRcElENGdMVEVwSUQ4Z2RYQmpZWE5sWkNBNklHMWxkR2h2WkZ4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1VtVnhkV1Z6ZENocGJuQjFkQ3dnYjNCMGFXOXVjeWtnZTF4dUlDQWdJRzl3ZEdsdmJuTWdQU0J2Y0hScGIyNXpJSHg4SUh0OVhHNGdJQ0FnZG1GeUlHSnZaSGtnUFNCdmNIUnBiMjV6TG1KdlpIbGNibHh1SUNBZ0lHbG1JQ2hwYm5CMWRDQnBibk4wWVc1alpXOW1JRkpsY1hWbGMzUXBJSHRjYmlBZ0lDQWdJR2xtSUNocGJuQjFkQzVpYjJSNVZYTmxaQ2tnZTF4dUlDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1ZIbHdaVVZ5Y205eUtDZEJiSEpsWVdSNUlISmxZV1FuS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnZEdocGN5NTFjbXdnUFNCcGJuQjFkQzUxY214Y2JpQWdJQ0FnSUhSb2FYTXVZM0psWkdWdWRHbGhiSE1nUFNCcGJuQjFkQzVqY21Wa1pXNTBhV0ZzYzF4dUlDQWdJQ0FnYVdZZ0tDRnZjSFJwYjI1ekxtaGxZV1JsY25NcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1b1pXRmtaWEp6SUQwZ2JtVjNJRWhsWVdSbGNuTW9hVzV3ZFhRdWFHVmhaR1Z5Y3lsY2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhSb2FYTXViV1YwYUc5a0lEMGdhVzV3ZFhRdWJXVjBhRzlrWEc0Z0lDQWdJQ0IwYUdsekxtMXZaR1VnUFNCcGJuQjFkQzV0YjJSbFhHNGdJQ0FnSUNCcFppQW9JV0p2WkhrZ0ppWWdhVzV3ZFhRdVgySnZaSGxKYm1sMElDRTlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdZbTlrZVNBOUlHbHVjSFYwTGw5aWIyUjVTVzVwZEZ4dUlDQWdJQ0FnSUNCcGJuQjFkQzVpYjJSNVZYTmxaQ0E5SUhSeWRXVmNiaUFnSUNBZ0lIMWNiaUFnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnZEdocGN5NTFjbXdnUFNCVGRISnBibWNvYVc1d2RYUXBYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RHaHBjeTVqY21Wa1pXNTBhV0ZzY3lBOUlHOXdkR2x2Ym5NdVkzSmxaR1Z1ZEdsaGJITWdmSHdnZEdocGN5NWpjbVZrWlc1MGFXRnNjeUI4ZkNBbmIyMXBkQ2RjYmlBZ0lDQnBaaUFvYjNCMGFXOXVjeTVvWldGa1pYSnpJSHg4SUNGMGFHbHpMbWhsWVdSbGNuTXBJSHRjYmlBZ0lDQWdJSFJvYVhNdWFHVmhaR1Z5Y3lBOUlHNWxkeUJJWldGa1pYSnpLRzl3ZEdsdmJuTXVhR1ZoWkdWeWN5bGNiaUFnSUNCOVhHNGdJQ0FnZEdocGN5NXRaWFJvYjJRZ1BTQnViM0p0WVd4cGVtVk5aWFJvYjJRb2IzQjBhVzl1Y3k1dFpYUm9iMlFnZkh3Z2RHaHBjeTV0WlhSb2IyUWdmSHdnSjBkRlZDY3BYRzRnSUNBZ2RHaHBjeTV0YjJSbElEMGdiM0IwYVc5dWN5NXRiMlJsSUh4OElIUm9hWE11Ylc5a1pTQjhmQ0J1ZFd4c1hHNGdJQ0FnZEdocGN5NXlaV1psY25KbGNpQTlJRzUxYkd4Y2JseHVJQ0FnSUdsbUlDZ29kR2hwY3k1dFpYUm9iMlFnUFQwOUlDZEhSVlFuSUh4OElIUm9hWE11YldWMGFHOWtJRDA5UFNBblNFVkJSQ2NwSUNZbUlHSnZaSGtwSUh0Y2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owSnZaSGtnYm05MElHRnNiRzkzWldRZ1ptOXlJRWRGVkNCdmNpQklSVUZFSUhKbGNYVmxjM1J6SnlsY2JpQWdJQ0I5WEc0Z0lDQWdkR2hwY3k1ZmFXNXBkRUp2Wkhrb1ltOWtlU2xjYmlBZ2ZWeHVYRzRnSUZKbGNYVmxjM1F1Y0hKdmRHOTBlWEJsTG1Oc2IyNWxJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCU1pYRjFaWE4wS0hSb2FYTXNJSHNnWW05a2VUb2dkR2hwY3k1ZlltOWtlVWx1YVhRZ2ZTbGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR1JsWTI5a1pTaGliMlI1S1NCN1hHNGdJQ0FnZG1GeUlHWnZjbTBnUFNCdVpYY2dSbTl5YlVSaGRHRW9LVnh1SUNBZ0lHSnZaSGt1ZEhKcGJTZ3BMbk53YkdsMEtDY21KeWt1Wm05eVJXRmphQ2htZFc1amRHbHZiaWhpZVhSbGN5a2dlMXh1SUNBZ0lDQWdhV1lnS0dKNWRHVnpLU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpjR3hwZENBOUlHSjVkR1Z6TG5Od2JHbDBLQ2M5SnlsY2JpQWdJQ0FnSUNBZ2RtRnlJRzVoYldVZ1BTQnpjR3hwZEM1emFHbG1kQ2dwTG5KbGNHeGhZMlVvTDF4Y0t5OW5MQ0FuSUNjcFhHNGdJQ0FnSUNBZ0lIWmhjaUIyWVd4MVpTQTlJSE53YkdsMExtcHZhVzRvSnowbktTNXlaWEJzWVdObEtDOWNYQ3N2Wnl3Z0p5QW5LVnh1SUNBZ0lDQWdJQ0JtYjNKdExtRndjR1Z1WkNoa1pXTnZaR1ZWVWtsRGIyMXdiMjVsYm5Rb2JtRnRaU2tzSUdSbFkyOWtaVlZTU1VOdmJYQnZibVZ1ZENoMllXeDFaU2twWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU2xjYmlBZ0lDQnlaWFIxY200Z1ptOXliVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnY0dGeWMyVklaV0ZrWlhKektISmhkMGhsWVdSbGNuTXBJSHRjYmlBZ0lDQjJZWElnYUdWaFpHVnljeUE5SUc1bGR5QklaV0ZrWlhKektDbGNiaUFnSUNCeVlYZElaV0ZrWlhKekxuTndiR2wwS0M5Y1hISS9YRnh1THlrdVptOXlSV0ZqYUNobWRXNWpkR2x2Ymloc2FXNWxLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2NHRnlkSE1nUFNCc2FXNWxMbk53YkdsMEtDYzZKeWxjYmlBZ0lDQWdJSFpoY2lCclpYa2dQU0J3WVhKMGN5NXphR2xtZENncExuUnlhVzBvS1Z4dUlDQWdJQ0FnYVdZZ0tHdGxlU2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkbUZzZFdVZ1BTQndZWEowY3k1cWIybHVLQ2M2SnlrdWRISnBiU2dwWEc0Z0lDQWdJQ0FnSUdobFlXUmxjbk11WVhCd1pXNWtLR3RsZVN3Z2RtRnNkV1VwWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU2xjYmlBZ0lDQnlaWFIxY200Z2FHVmhaR1Z5YzF4dUlDQjlYRzVjYmlBZ1FtOWtlUzVqWVd4c0tGSmxjWFZsYzNRdWNISnZkRzkwZVhCbEtWeHVYRzRnSUdaMWJtTjBhVzl1SUZKbGMzQnZibk5sS0dKdlpIbEpibWwwTENCdmNIUnBiMjV6S1NCN1hHNGdJQ0FnYVdZZ0tDRnZjSFJwYjI1ektTQjdYRzRnSUNBZ0lDQnZjSFJwYjI1eklEMGdlMzFjYmlBZ0lDQjlYRzVjYmlBZ0lDQjBhR2x6TG5SNWNHVWdQU0FuWkdWbVlYVnNkQ2RjYmlBZ0lDQjBhR2x6TG5OMFlYUjFjeUE5SUNkemRHRjBkWE1uSUdsdUlHOXdkR2x2Ym5NZ1B5QnZjSFJwYjI1ekxuTjBZWFIxY3lBNklESXdNRnh1SUNBZ0lIUm9hWE11YjJzZ1BTQjBhR2x6TG5OMFlYUjFjeUErUFNBeU1EQWdKaVlnZEdocGN5NXpkR0YwZFhNZ1BDQXpNREJjYmlBZ0lDQjBhR2x6TG5OMFlYUjFjMVJsZUhRZ1BTQW5jM1JoZEhWelZHVjRkQ2NnYVc0Z2IzQjBhVzl1Y3lBL0lHOXdkR2x2Ym5NdWMzUmhkSFZ6VkdWNGRDQTZJQ2RQU3lkY2JpQWdJQ0IwYUdsekxtaGxZV1JsY25NZ1BTQnVaWGNnU0dWaFpHVnljeWh2Y0hScGIyNXpMbWhsWVdSbGNuTXBYRzRnSUNBZ2RHaHBjeTUxY213Z1BTQnZjSFJwYjI1ekxuVnliQ0I4ZkNBbkoxeHVJQ0FnSUhSb2FYTXVYMmx1YVhSQ2IyUjVLR0p2WkhsSmJtbDBLVnh1SUNCOVhHNWNiaUFnUW05a2VTNWpZV3hzS0ZKbGMzQnZibk5sTG5CeWIzUnZkSGx3WlNsY2JseHVJQ0JTWlhOd2IyNXpaUzV3Y205MGIzUjVjR1V1WTJ4dmJtVWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGMzQnZibk5sS0hSb2FYTXVYMkp2WkhsSmJtbDBMQ0I3WEc0Z0lDQWdJQ0J6ZEdGMGRYTTZJSFJvYVhNdWMzUmhkSFZ6TEZ4dUlDQWdJQ0FnYzNSaGRIVnpWR1Y0ZERvZ2RHaHBjeTV6ZEdGMGRYTlVaWGgwTEZ4dUlDQWdJQ0FnYUdWaFpHVnljem9nYm1WM0lFaGxZV1JsY25Nb2RHaHBjeTVvWldGa1pYSnpLU3hjYmlBZ0lDQWdJSFZ5YkRvZ2RHaHBjeTUxY214Y2JpQWdJQ0I5S1Z4dUlDQjlYRzVjYmlBZ1VtVnpjRzl1YzJVdVpYSnliM0lnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCMllYSWdjbVZ6Y0c5dWMyVWdQU0J1WlhjZ1VtVnpjRzl1YzJVb2JuVnNiQ3dnZTNOMFlYUjFjem9nTUN3Z2MzUmhkSFZ6VkdWNGREb2dKeWQ5S1Z4dUlDQWdJSEpsYzNCdmJuTmxMblI1Y0dVZ1BTQW5aWEp5YjNJblhHNGdJQ0FnY21WMGRYSnVJSEpsYzNCdmJuTmxYRzRnSUgxY2JseHVJQ0IyWVhJZ2NtVmthWEpsWTNSVGRHRjBkWE5sY3lBOUlGc3pNREVzSURNd01pd2dNekF6TENBek1EY3NJRE13T0YxY2JseHVJQ0JTWlhOd2IyNXpaUzV5WldScGNtVmpkQ0E5SUdaMWJtTjBhVzl1S0hWeWJDd2djM1JoZEhWektTQjdYRzRnSUNBZ2FXWWdLSEpsWkdseVpXTjBVM1JoZEhWelpYTXVhVzVrWlhoUFppaHpkR0YwZFhNcElEMDlQU0F0TVNrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGSmhibWRsUlhKeWIzSW9KMGx1ZG1Gc2FXUWdjM1JoZEhWeklHTnZaR1VuS1Z4dUlDQWdJSDFjYmx4dUlDQWdJSEpsZEhWeWJpQnVaWGNnVW1WemNHOXVjMlVvYm5Wc2JDd2dlM04wWVhSMWN6b2djM1JoZEhWekxDQm9aV0ZrWlhKek9pQjdiRzlqWVhScGIyNDZJSFZ5YkgxOUtWeHVJQ0I5WEc1Y2JpQWdjMlZzWmk1SVpXRmtaWEp6SUQwZ1NHVmhaR1Z5YzF4dUlDQnpaV3htTGxKbGNYVmxjM1FnUFNCU1pYRjFaWE4wWEc0Z0lITmxiR1l1VW1WemNHOXVjMlVnUFNCU1pYTndiMjV6WlZ4dVhHNGdJSE5sYkdZdVptVjBZMmdnUFNCbWRXNWpkR2x2YmlocGJuQjFkQ3dnYVc1cGRDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCdVpYY2dVSEp2YldselpTaG1kVzVqZEdsdmJpaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lIWmhjaUJ5WlhGMVpYTjBJRDBnYm1WM0lGSmxjWFZsYzNRb2FXNXdkWFFzSUdsdWFYUXBYRzRnSUNBZ0lDQjJZWElnZUdoeUlEMGdibVYzSUZoTlRFaDBkSEJTWlhGMVpYTjBLQ2xjYmx4dUlDQWdJQ0FnZUdoeUxtOXViRzloWkNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2IzQjBhVzl1Y3lBOUlIdGNiaUFnSUNBZ0lDQWdJQ0J6ZEdGMGRYTTZJSGhvY2k1emRHRjBkWE1zWEc0Z0lDQWdJQ0FnSUNBZ2MzUmhkSFZ6VkdWNGREb2dlR2h5TG5OMFlYUjFjMVJsZUhRc1hHNGdJQ0FnSUNBZ0lDQWdhR1ZoWkdWeWN6b2djR0Z5YzJWSVpXRmtaWEp6S0hob2NpNW5aWFJCYkd4U1pYTndiMjV6WlVobFlXUmxjbk1vS1NCOGZDQW5KeWxjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCdmNIUnBiMjV6TG5WeWJDQTlJQ2R5WlhOd2IyNXpaVlZTVENjZ2FXNGdlR2h5SUQ4Z2VHaHlMbkpsYzNCdmJuTmxWVkpNSURvZ2IzQjBhVzl1Y3k1b1pXRmtaWEp6TG1kbGRDZ25XQzFTWlhGMVpYTjBMVlZTVENjcFhHNGdJQ0FnSUNBZ0lIWmhjaUJpYjJSNUlEMGdKM0psYzNCdmJuTmxKeUJwYmlCNGFISWdQeUI0YUhJdWNtVnpjRzl1YzJVZ09pQjRhSEl1Y21WemNHOXVjMlZVWlhoMFhHNGdJQ0FnSUNBZ0lISmxjMjlzZG1Vb2JtVjNJRkpsYzNCdmJuTmxLR0p2Wkhrc0lHOXdkR2x2Ym5NcEtWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjRhSEl1YjI1bGNuSnZjaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaV3BsWTNRb2JtVjNJRlI1Y0dWRmNuSnZjaWduVG1WMGQyOXlheUJ5WlhGMVpYTjBJR1poYVd4bFpDY3BLVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0I0YUhJdWIyNTBhVzFsYjNWMElEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGFtVmpkQ2h1WlhjZ1ZIbHdaVVZ5Y205eUtDZE9aWFIzYjNKcklISmxjWFZsYzNRZ1ptRnBiR1ZrSnlrcFhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lIaG9jaTV2Y0dWdUtISmxjWFZsYzNRdWJXVjBhRzlrTENCeVpYRjFaWE4wTG5WeWJDd2dkSEoxWlNsY2JseHVJQ0FnSUNBZ2FXWWdLSEpsY1hWbGMzUXVZM0psWkdWdWRHbGhiSE1nUFQwOUlDZHBibU5zZFdSbEp5a2dlMXh1SUNBZ0lDQWdJQ0I0YUhJdWQybDBhRU55WldSbGJuUnBZV3h6SUQwZ2RISjFaVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb0ozSmxjM0J2Ym5ObFZIbHdaU2NnYVc0Z2VHaHlJQ1ltSUhOMWNIQnZjblF1WW14dllpa2dlMXh1SUNBZ0lDQWdJQ0I0YUhJdWNtVnpjRzl1YzJWVWVYQmxJRDBnSjJKc2IySW5YRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsY1hWbGMzUXVhR1ZoWkdWeWN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUhob2NpNXpaWFJTWlhGMVpYTjBTR1ZoWkdWeUtHNWhiV1VzSUhaaGJIVmxLVnh1SUNBZ0lDQWdmU2xjYmx4dUlDQWdJQ0FnZUdoeUxuTmxibVFvZEhsd1pXOW1JSEpsY1hWbGMzUXVYMkp2WkhsSmJtbDBJRDA5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JRzUxYkd3Z09pQnlaWEYxWlhOMExsOWliMlI1U1c1cGRDbGNiaUFnSUNCOUtWeHVJQ0I5WEc0Z0lITmxiR1l1Wm1WMFkyZ3VjRzlzZVdacGJHd2dQU0IwY25WbFhHNTlLU2gwZVhCbGIyWWdjMlZzWmlBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCelpXeG1JRG9nZEdocGN5azdYRzRpTENKcGJYQnZjblFnVEdsemRFbDBaVzBnWm5KdmJTQW5MaTlNYVhOMFNYUmxiU2M3WEc1cGJYQnZjblFnY21WamRYSnphWFpsU1hSbGNtRjBiM0lnWm5KdmJTQW5jbVZqZFhKemFYWmxMV2wwWlhKaGRHOXlKenRjYm1sdGNHOXlkQ0J2WW1wbFkzUlFZWFJvSUdaeWIyMGdKMjlpYW1WamRDMXdZWFJvSnp0Y2JseHVZMnhoYzNNZ1JHRjBZVXhwYzNRZ1pYaDBaVzVrY3lCU1pXRmpkQzVEYjIxd2IyNWxiblFnZTF4dUlDQWdJSE5sZEVacFpXeGtUV0Z3S0hCaGRHZ3NJR1YyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJR1YyWlc1MExuQnlaWFpsYm5SRVpXWmhkV3gwS0NrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0hKdmNITXVkWEJrWVhSbFJtbGxiR1JOWVhBb2UxdGxkbVZ1ZEM1MFlYSm5aWFF1WkdGMFlYTmxkQzVtYVdWc1pGMDZJSEJoZEdoOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpXNWtaWEpPYjJSbGN5aGtZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCUFltcGxZM1F1YTJWNWN5aGtZWFJoS1M1dFlYQW9hWFJsYlNBOVBpQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9hWFJsYlNBOVBUMGdKMjlpYW1WamRGQmhkR2duS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNaWFFnWTJocGJHUWdQU0E4VEdsemRFbDBaVzBnYTJWNVBYdHBkR1Z0TG5SdlUzUnlhVzVuS0NsOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1U5ZTJsMFpXMTlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdiMkpxWldOMFBYdGtZWFJoVzJsMFpXMWRmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndQWHQwYUdsekxuQnliM0J6TG1acFpXeGtUV0Z3ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5dVEyeHBZMnREYjI1MFlXbHVaWEk5ZTJVZ1BUNGdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDaGtZWFJoVzJsMFpXMWRMbTlpYW1WamRGQmhkR2dzSUdVcGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHOXVRMnhwWTJ0VWFYUnNaVDE3WlNBOVBpQjBhR2x6TG5ObGRFWnBaV3hrVFdGd0tHUmhkR0ZiYVhSbGJWMHNJR1VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUc5dVEyeHBZMnREYjI1MFpXNTBQWHRsSUQwK0lIUm9hWE11YzJWMFJtbGxiR1JOWVhBb1pHRjBZVnRwZEdWdFhTd2daU2w5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEhKaGJuTnNZWFJwYjI0OWUzUm9hWE11Y0hKdmNITXVkSEpoYm5Oc1lYUnBiMjU5THo0N1hHNWNiaUFnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1pHRjBZVnRwZEdWdFhTQTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ1pHRjBZVnRwZEdWdFhTQWhQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05vYVd4a0lEMGdVbVZoWTNRdVkyeHZibVZGYkdWdFpXNTBLR05vYVd4a0xDQjdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOb2FXeGtjbVZ1T2lCQmNuSmhlUzVwYzBGeWNtRjVLR1JoZEdGYmFYUmxiVjBwSUQ4Z2RHaHBjeTV5Wlc1a1pYSk9iMlJsY3loa1lYUmhXMmwwWlcxZFd6QmRLU0E2SUhSb2FYTXVjbVZ1WkdWeVRtOWtaWE1vWkdGMFlWdHBkR1Z0WFNsY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR05vYVd4a08xeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaVzVrWlhJb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdDBjbUZ1YzJ4aGRHbHZiaXdnWkdGMFlYMGdQU0IwYUdsekxuQnliM0J6TzF4dUlDQWdJQ0FnSUNCamIyNXpkQ0JtYVdWc1pFMWhjQ0E5SUhSb2FYTXVjSEp2Y0hNdVptbGxiR1JOWVhBN1hHNWNiaUFnSUNBZ0lDQWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29aR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdacFpXeGtUV0Z3TG1sMFpXMURiMjUwWVdsdVpYSWdQU0FuSnp0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJR2xtSUNobWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJRDA5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvUVhKeVlYa3VhWE5CY25KaGVTaGtZWFJoS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHUmhkR0VnUFNCa1lYUmhXekJkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1iM0lnS0d4bGRDQjdjR0Z5Wlc1MExDQnViMlJsTENCclpYa3NJSEJoZEdoOUlHOW1JRzVsZHlCeVpXTjFjbk5wZG1WSmRHVnlZWFJ2Y2loa1lYUmhLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2JtOWtaU0E5UFQwZ0oyOWlhbVZqZENjZ0ppWWdibTlrWlNBaFBUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzWlhRZ2NHRjBhRk4wY21sdVp5QTlJSEJoZEdndWFtOXBiaWduTGljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2WW1wbFkzUlFZWFJvTG5ObGRDaGtZWFJoTENCd1lYUm9VM1J5YVc1bklDc2dKeTV2WW1wbFkzUlFZWFJvSnl3Z2NHRjBhRk4wY21sdVp5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4b016NTdkSEpoYm5Oc1lYUnBiMjR1YzJWc1pXTjBTWFJsYlhORGIyNTBZV2x1WlhKOVBDOW9NejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BIVnNJR05zWVhOelRtRnRaVDFjSW1wemIyNHRkSEpsWlZ3aVBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2UzUm9hWE11Y21WdVpHVnlUbTlrWlhNb1pHRjBZU2w5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZkV3crWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEM5a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnYkdWMElHOWlhbVZqZEVSaGRHRWdQU0J2WW1wbFkzUlFZWFJvTG1kbGRDaGtZWFJoTENCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlLVHRjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29iMkpxWldOMFJHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdlltcGxZM1JFWVhSaElEMGdiMkpxWldOMFJHRjBZVnN3WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoc1pYUWdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb2ZTQnZaaUJ1WlhjZ2NtVmpkWEp6YVhabFNYUmxjbUYwYjNJb2IySnFaV04wUkdGMFlTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc1dlpHVWdJVDA5SUNkdlltcGxZM1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR3hsZENCd1lYUm9VM1J5YVc1bklEMGdjR0YwYUM1cWIybHVLQ2N1SnlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhbVZqZEVSaGRHRXNJSEJoZEdoVGRISnBibWNzSUhCaGRHaFRkSEpwYm1jcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4YURNK2UzUnlZVzV6YkdGMGFXOXVMbk5sYkdWamRGUnBkR3hsUTI5dWRHVnVkSDA4TDJnelBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4ZFd3Z1kyeGhjM05PWVcxbFBWd2lhbk52YmkxMGNtVmxYQ0krWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I3ZEdocGN5NXlaVzVrWlhKT2IyUmxjeWh2WW1wbFkzUkVZWFJoS1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQQzkxYkQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzU5WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUVSaGRHRk1hWE4wT3lJc0ltbHRjRzl5ZENCRVlYUmhUR2x6ZENCbWNtOXRJQ2N1TDBSaGRHRk1hWE4wSnp0Y2JtbHRjRzl5ZENCblpYUkJjR2xFWVhSaElHWnliMjBnSnk0dUx5NHVMMVYwYVd4cGRHbGxjeTluWlhSQmNHbEVZWFJoSnp0Y2JseHVZMnhoYzNNZ1JtbGxiR1JUWld4bFkzUnBiMjRnWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZiWEJ2Ym1WdWRFUnBaRTF2ZFc1MEtDa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxtZGxkRVJoZEdFb0tUdGNiaUFnSUNCOVhHNWNiaUFnSUNCblpYUkVZWFJoS0NrZ2UxeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN2RYSnNMQ0IwY21GdWMyeGhkR2x2Ym4wZ1BTQjBhR2x6TG5CeWIzQnpPMXh1SUNBZ0lDQWdJQ0JuWlhSQmNHbEVZWFJoS0hWeWJDbGNiaUFnSUNBZ0lDQWdJQ0FnSUM1MGFHVnVLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ2g3Y21WemRXeDBmU2tnUFQ0Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0lYSmxjM1ZzZENCOGZDQlBZbXBsWTNRdWEyVjVjeWh5WlhOMWJIUXBMbXhsYm1kMGFDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV3Y205d2N5NXpaWFJGY25KdmNpaEZjbkp2Y2loMGNtRnVjMnhoZEdsdmJpNWpiM1ZzWkU1dmRFWmxkR05vS1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbkJ5YjNCekxuTmxkRXh2WVdSbFpDaDBjblZsS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuQnliM0J6TG5ObGRFbDBaVzF6S0hKbGMzVnNkQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11Y0hKdmNITXVjMlYwVEc5aFpHVmtLSFJ5ZFdVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHNJQ2g3WlhKeWIzSjlLU0E5UGlCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJvYVhNdWNISnZjSE11YzJWMFRHOWhaR1ZrS0hSeWRXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbkJ5YjNCekxuTmxkRVZ5Y205eUtHVnljbTl5S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSFZ3WkdGMFpVWnBaV3hrVFdGd0tIWmhiSFZsS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y0hKdmNITXVkWEJrWVhSbFJtbGxiR1JOWVhBb2RtRnNkV1VwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSEpsYm1SbGNpZ3BJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdlM1Z5YkN3Z1pYSnliM0lzSUdacFpXeGtUV0Z3TENCMGNtRnVjMnhoZEdsdmJpd2dhWE5NYjJGa1pXUXNJR2wwWlcxemZTQTlJSFJvYVhNdWNISnZjSE03WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLR1Z5Y205eUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnUEdScGRpQmpiR0Z6YzA1aGJXVTlYQ0p1YjNScFkyVWdibTkwYVdObExXVnljbTl5SUdsdWJHbHVaVndpUGp4d1BudGxjbkp2Y2k1dFpYTnpZV2RsZlR3dmNENDhMMlJwZGo0N1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9JV2x6VEc5aFpHVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1BHUnBkaUJqYkdGemMwNWhiV1U5WENKemNHbHVibVZ5SUdsekxXRmpkR2wyWlZ3aVBqd3ZaR2wyUGp0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQW9YRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQRVJoZEdGTWFYTjBYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdSaGRHRTllMmwwWlcxemZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY213OWUzVnliSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptbGxiR1JOWVhBOWUyWnBaV3hrVFdGd2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNEMTdkR2hwY3k1MWNHUmhkR1ZHYVdWc1pFMWhjQzVpYVc1a0tIUm9hWE1wZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBjbUZ1YzJ4aGRHbHZiajE3ZEhKaGJuTnNZWFJwYjI1OVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0x6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOVhHNTlYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRVpwWld4a1UyVnNaV04wYVc5dU95SXNJbU52Ym5OMElFbHVjSFYwUm1sbGJHUnpJRDBnS0h0bWFXVnNaRTFoY0N3Z2RYSnNmU2tnUFQ1Y2JpQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQThhVzV3ZFhRZ2RIbHdaVDFjSW1ocFpHUmxibHdpSUc1aGJXVTlYQ0p0YjJSZmFuTnZibDl5Wlc1a1pYSmZkWEpzWENJZ2RtRnNkV1U5ZTNWeWJIMHZQbHh1SUNBZ0lDQWdJQ0E4YVc1d2RYUWdkSGx3WlQxY0ltaHBaR1JsYmx3aUlHNWhiV1U5WENKdGIyUmZhbk52Ymw5eVpXNWtaWEpmWm1sbGJHUnRZWEJjSWlCMllXeDFaVDE3U2xOUFRpNXpkSEpwYm1kcFpua29abWxsYkdSTllYQXBmUzgrWEc0Z0lDQWdQQzlrYVhZK08xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQkpibkIxZEVacFpXeGtjenNpTENKamIyNXpkQ0JNYVhOMFNYUmxiU0E5SUNoN2RtRnNkV1VzSUdOb2FXeGtjbVZ1TENCbWFXVnNaRTFoY0N3Z2IySnFaV04wTENCdmJrTnNhV05yVkdsMGJHVXNJRzl1UTJ4cFkydERiMjUwWlc1MExDQnZia05zYVdOclEyOXVkR0ZwYm1WeUxDQjBjbUZ1YzJ4aGRHbHZibjBwSUQwK0lIdGNiaUFnSUNCcFppQW9ZMmhwYkdSeVpXNHBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJQ2c4YkdrK1hHNGdJQ0FnSUNBZ0lDQWdJQ0I3UVhKeVlYa3VhWE5CY25KaGVTaHZZbXBsWTNRcElDWW1JR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJZ1BUMDlJRzUxYkd3Z1AxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeHpjR0Z1UGp4emNHRnVJR05zWVhOelRtRnRaVDFjSW1SaGMyaHBZMjl1Y3lCa1lYTm9hV052Ym5NdGNHOXlkR1p2YkdsdlhDSStQQzl6Y0dGdVBpQjdkbUZzZFdWOUlEeGhJR2h5WldZOVhDSWpYQ0lnWTJ4aGMzTk9ZVzFsUFZ3aWRISmxaUzF6Wld4bFkzUmNJaUJrWVhSaExXWnBaV3hrUFZ3aWFYUmxiVU52Ym5SaGFXNWxjbHdpSUc5dVEyeHBZMnM5ZTI5dVEyeHBZMnREYjI1MFlXbHVaWEo5UG50MGNtRnVjMnhoZEdsdmJpNXpaV3hsWTNSOVBDOWhQand2YzNCaGJqNGdPaUFnUEhOd1lXNCtlM1poYkhWbGZUd3ZjM0JoYmo1OVhHNGdJQ0FnSUNBZ0lDQWdJQ0E4ZFd3K2UyTm9hV3hrY21WdWZUd3ZkV3crWEc0Z0lDQWdJQ0FnSUR3dmJHaytLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z0tEeHNhVDVjYmlBZ0lDQWdJQ0FnSUNBZ0lIdG1hV1ZzWkUxaGNDNTBhWFJzWlNBOVBUMGdiMkpxWldOMElDWW1JR1pwWld4a1RXRndMblJwZEd4bElEOGdQSE4wY205dVp6NTdkSEpoYm5Oc1lYUnBiMjR1ZEdsMGJHVjlPaUE4TDNOMGNtOXVaejRnT2lBbkozMWNiaUFnSUNBZ0lDQWdJQ0FnSUh0bWFXVnNaRTFoY0M1amIyNTBaVzUwSUQwOVBTQnZZbXBsWTNRZ0ppWWdabWxsYkdSTllYQXVZMjl1ZEdWdWRDQS9JRHh6ZEhKdmJtYytlM1J5WVc1emJHRjBhVzl1TG1OdmJuUmxiblI5T2lBOEwzTjBjbTl1Wno0Z09pQW5KMzFjYmlBZ0lDQWdJQ0FnSUNBZ0lEeHpjR0Z1UG50MllXeDFaWDA4TDNOd1lXNCtYRzRnSUNBZ0lDQWdJQ0FnSUNCN0lXWnBaV3hrVFdGd0xuUnBkR3hsSUNZbUlDaG1hV1ZzWkUxaGNDNWpiMjUwWlc1MElDRTlQU0J2WW1wbFkzUXBJQ1ltSUdacFpXeGtUV0Z3TG1sMFpXMURiMjUwWVdsdVpYSWdJVDA5SUc1MWJHd2dQMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhoSUdoeVpXWTlYQ0lqWENJZ1kyeGhjM05PWVcxbFBWd2lkSEpsWlMxelpXeGxZM1JjSWlCa1lYUmhMV1pwWld4a1BWd2lkR2wwYkdWY0lpQnZia05zYVdOclBYdHZia05zYVdOclZHbDBiR1Y5UG50MGNtRnVjMnhoZEdsdmJpNTBhWFJzWlgwOEwyRStJRG9nSnlkOVhHNGdJQ0FnSUNBZ0lDQWdJQ0I3SVdacFpXeGtUV0Z3TG1OdmJuUmxiblFnSmlZZ0tHWnBaV3hrVFdGd0xuUnBkR3hsSUNFOVBTQnZZbXBsWTNRcElDWW1JR1pwWld4a1RXRndMbWwwWlcxRGIyNTBZV2x1WlhJZ0lUMDlJRzUxYkd3Z1AxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGhJR2h5WldZOVhDSWpYQ0lnWTJ4aGMzTk9ZVzFsUFZ3aWRISmxaUzF6Wld4bFkzUmNJaUJrWVhSaExXWnBaV3hrUFZ3aVkyOXVkR1Z1ZEZ3aUlHOXVRMnhwWTJzOWUyOXVRMnhwWTJ0RGIyNTBaVzUwZlQ1N2RISmhibk5zWVhScGIyNHVZMjl1ZEdWdWRIMDhMMkUrSURvZ0p5ZDlYRzRnSUNBZ0lDQWdJRHd2YkdrK0tUdGNiaUFnSUNCOVhHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JNYVhOMFNYUmxiVHNpTENKcGJYQnZjblFnUm1sbGJHUlRaV3hsWTNScGIyNGdabkp2YlNBbkxpOUdhV1ZzWkZObGJHVmpkR2x2YmljN1hHNXBiWEJ2Y25RZ1NXNXdkWFJHYVdWc1pITWdabkp2YlNBbkxpOUpibkIxZEVacFpXeGtjeWM3WEc1cGJYQnZjblFnVTNWdGJXRnllU0JtY205dElDY3VMMU4xYlcxaGNua25PMXh1WEc1amJHRnpjeUJUWlhSMGFXNW5jeUJsZUhSbGJtUnpJRkpsWVdOMExrTnZiWEJ2Ym1WdWRDQjdYRzRnSUNBZ1kyOXVjM1J5ZFdOMGIzSW9jSEp2Y0hNcElIdGNiaUFnSUNBZ0lDQWdjM1Z3WlhJb2NISnZjSE1wTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbk4wWVhSbElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dU9pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFZ5YkRvZ0p5Y3NYRzRnSUNBZ0lDQWdJQ0FnSUNCcGMweHZZV1JsWkRvZ1ptRnNjMlVzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxjbkp2Y2pvZ2JuVnNiQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzF6T2lCYlhTeGNiaUFnSUNBZ0lDQWdJQ0FnSUdacFpXeGtUV0Z3T2lCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FYUmxiVU52Ym5SaGFXNWxjam9nYm5Wc2JDeGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhWFJzWlRvZ0p5Y3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZMjl1ZEdWdWREb2dKeWRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQmpiMjF3YjI1bGJuUkVhV1JOYjNWdWRDZ3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXBibWwwVDNCMGFXOXVjeWdwTzF4dUlDQWdJSDFjYmx4dUlDQWdJR2x1YVhSUGNIUnBiMjV6S0NrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JRzF2WkVwemIyNVNaVzVrWlhJdWIzQjBhVzl1Y3lBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR052Ym5OMElHOXdkR2x2Ym5NZ1BTQnRiMlJLYzI5dVVtVnVaR1Z5TG05d2RHbHZibk03WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMWNtdzZJRzl3ZEdsdmJuTXVkWEpzSUQ4Z2IzQjBhVzl1Y3k1MWNtd2dPaUFuSnl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0RvZ2IzQjBhVzl1Y3k1bWFXVnNaRTFoY0NBL0lFcFRUMDR1Y0dGeWMyVW9iM0IwYVc5dWN5NW1hV1ZzWkUxaGNDa2dPaUI3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzFEYjI1MFlXbHVaWEk2SUc1MWJHd3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhScGRHeGxPaUFuSnl4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdZMjl1ZEdWdWREb2dKeWRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0I5TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhOb2IzZEdhV1ZzWkZObGJHVmpkR2x2YmpvZ0lTRnZjSFJwYjI1ekxuVnliRnh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQjFjbXhEYUdGdVoyVW9aWFpsYm5RcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN2RYSnNPaUJsZG1WdWRDNTBZWEpuWlhRdWRtRnNkV1Y5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JvWVc1a2JHVlRkV0p0YVhRb1pYWmxiblFwSUh0Y2JpQWdJQ0FnSUNBZ1pYWmxiblF1Y0hKbGRtVnVkRVJsWm1GMWJIUW9LVHRjYmlBZ0lDQWdJQ0FnZEdocGN5NXpaWFJUZEdGMFpTaDdjMmh2ZDBacFpXeGtVMlZzWldOMGFXOXVPaUIwY25WbGZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnpaWFJQY0hScGIyNXpLR1YyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJR1YyWlc1MExuQnlaWFpsYm5SRVpXWmhkV3gwS0NrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvZTNOb2IzZEdhV1ZzWkZObGJHVmpkR2x2YmpvZ1ptRnNjMlVzSUhWeWJEb2dKeWNzSUdacFpXeGtUV0Z3T2lCN2FYUmxiVU52Ym5SaGFXNWxjam9nYm5Wc2JDd2dkR2wwYkdVNklDY25MQ0JqYjI1MFpXNTBPaUFuSjMxOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCMWNHUmhkR1ZHYVdWc1pFMWhjQ2gyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQnVaWGRXWVd3Z1BTQlBZbXBsWTNRdVlYTnphV2R1S0hSb2FYTXVjM1JoZEdVdVptbGxiR1JOWVhBc0lIWmhiSFZsS1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6WlhSVGRHRjBaU2g3Wm1sbGJHUk5ZWEE2SUc1bGQxWmhiSDBwTzF4dUlDQWdJSDFjYmx4dUlDQWdJSE5sZEVWeWNtOXlLR1Z5Y205eUtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMyVjBVM1JoZEdVb2UyVnljbTl5ZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYzJWMFRHOWhaR1ZrS0haaGJIVmxLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lMmx6VEc5aFpHVmtPaUIyWVd4MVpYMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lITmxkRWwwWlcxektHbDBaVzF6S1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvZTJsMFpXMXpPaUJwZEdWdGMzMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxibVJsY2lncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzUnlZVzV6YkdGMGFXOXVmU0E5SUhSb2FYTXVjSEp2Y0hNN1hHNGdJQ0FnSUNBZ0lHTnZibk4wSUh0emFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0c0lIVnliQ3dnWlhKeWIzSXNJR2x6VEc5aFpHVmtMQ0JwZEdWdGMzMGdQU0IwYUdsekxuTjBZWFJsTzF4dUlDQWdJQ0FnSUNCamIyNXpkQ0I3YVhSbGJVTnZiblJoYVc1bGNpd2dkR2wwYkdVc0lHTnZiblJsYm5SOUlEMGdkR2hwY3k1emRHRjBaUzVtYVdWc1pFMWhjRHRjYmx4dUlDQWdJQ0FnSUNCcFppQW9kWEpzSUNZbUlHbDBaVzFEYjI1MFlXbHVaWElnSVQwOUlHNTFiR3dnSmlZZ2RHbDBiR1VnSmlZZ1kyOXVkR1Z1ZENrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4VTNWdGJXRnllU0I3TGk0dWRHaHBjeTV6ZEdGMFpYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEhKaGJuTnNZWFJwYjI0OWUzUnlZVzV6YkdGMGFXOXVmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4U1c1d2RYUkdhV1ZzWkhNZ2V5NHVMblJvYVhNdWMzUmhkR1Y5SUM4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHh3UGp4aElHaHlaV1k5WENJalhDSWdiMjVEYkdsamF6MTdkR2hwY3k1eVpYTmxkRTl3ZEdsdmJuTXVZbWx1WkNoMGFHbHpLWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnWTJ4aGMzTk9ZVzFsUFZ3aVluVjBkRzl1WENJK2UzUnlZVzV6YkdGMGFXOXVMbkpsYzJWMFUyVjBkR2x1WjNOOVBDOWhQand2Y0Q1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyUnBkajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDazdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzJodmQwWnBaV3hrVTJWc1pXTjBhVzl1S1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhrYVhZK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhHYVdWc1pGTmxiR1ZqZEdsdmJseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNQWHQxY214OVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGNuSnZjajE3WlhKeWIzSjlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnpaWFJGY25KdmNqMTdkR2hwY3k1elpYUkZjbkp2Y2k1aWFXNWtLSFJvYVhNcGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FYTk1iMkZrWldROWUybHpURzloWkdWa2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2MyVjBURzloWkdWa1BYdDBhR2x6TG5ObGRFeHZZV1JsWkM1aWFXNWtLSFJvYVhNcGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2FYUmxiWE05ZTJsMFpXMXpmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlYwU1hSbGJYTTllM1JvYVhNdWMyVjBTWFJsYlhNdVltbHVaQ2gwYUdsektYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnBaV3hrVFdGd1BYdDBhR2x6TG5OMFlYUmxMbVpwWld4a1RXRndmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEJrWVhSbFJtbGxiR1JOWVhBOWUzUm9hWE11ZFhCa1lYUmxSbWxsYkdSTllYQXVZbWx1WkNoMGFHbHpLWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJ5WVc1emJHRjBhVzl1UFh0MGNtRnVjMnhoZEdsdmJuMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnTHo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQRWx1Y0hWMFJtbGxiR1J6SUhzdUxpNTBhR2x6TG5OMFlYUmxmU0F2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThjRDQ4WVNCb2NtVm1QVndpSTF3aUlHOXVRMnhwWTJzOWUzUm9hWE11Y21WelpYUlBjSFJwYjI1ekxtSnBibVFvZEdocGN5bDlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR05zWVhOelRtRnRaVDFjSW1KMWRIUnZibHdpUG50MGNtRnVjMnhoZEdsdmJpNXlaWE5sZEZObGRIUnBibWR6ZlR3dllUNDhMM0ErWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEM5a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ2hjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WkdsMklHTnNZWE56VG1GdFpUMWNJbmR5WVhCY0lqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdadmNtMGdiMjVUZFdKdGFYUTllM1JvYVhNdWFHRnVaR3hsVTNWaWJXbDBMbUpwYm1Rb2RHaHBjeWw5UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR3hoWW1Wc1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGMzUnliMjVuUGtGUVNTQlZVa3c4TDNOMGNtOXVaejVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwyeGhZbVZzUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeGljaTgrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHaytlM1J5WVc1emJHRjBhVzl1TG5aaGJHbGtTbk52YmxWeWJIMDhMMmsrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4TDNBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGFXNXdkWFFnZEhsd1pUMWNJblJsZUhSY0lpQmpiR0Z6YzA1aGJXVTlYQ0oxY213dGFXNXdkWFJjSWlCMllXeDFaVDE3ZFhKc2ZTQnZia05vWVc1blpUMTdkR2hwY3k1MWNteERhR0Z1WjJVdVltbHVaQ2gwYUdsektYMHZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQSEErUEdsdWNIVjBJSFI1Y0dVOVhDSnpkV0p0YVhSY0lpQmpiR0Z6YzA1aGJXVTlYQ0ppZFhSMGIyNGdZblYwZEc5dUxYQnlhVzFoY25sY0lpQjJZV3gxWlQxN2RISmhibk5zWVhScGIyNHVjMlZ1WkZKbGNYVmxjM1I5THo0OEwzQStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlptOXliVDVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BFbHVjSFYwUm1sbGJHUnpJSHN1TGk1MGFHbHpMbk4wWVhSbGZTQXZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2WkdsMlBseHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JuMWNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdVMlYwZEdsdVozTTdJaXdpWTI5dWMzUWdVM1Z0YldGeWVTQTlJQ2g3ZFhKc0xDQm1hV1ZzWkUxaGNDd2dkSEpoYm5Oc1lYUnBiMjU5S1NBOVBseHVJQ0FnSUR4a2FYWStYRzRnSUNBZ0lDQWdJRHh3UGx4dUlDQWdJQ0FnSUNBZ0lDQWdQSE4wY205dVp6NUJVRWtnVlZKTVBDOXpkSEp2Ym1jK1BHSnlMejVjYmlBZ0lDQWdJQ0FnSUNBZ0lEeGhJR2h5WldZOWUzVnliSDBnZEdGeVoyVjBQVndpWDJKc1lXNXJYQ0krZTNWeWJIMDhMMkUrWEc0Z0lDQWdJQ0FnSUR3dmNENWNiaUFnSUNBZ0lDQWdQSEErWEc0Z0lDQWdJQ0FnSUNBZ0lDQThjM1J5YjI1blBudDBjbUZ1YzJ4aGRHbHZiaTUwYVhSc1pYMDhMM04wY205dVp6NDhZbkl2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdlMlpwWld4a1RXRndMblJwZEd4bExuSmxjR3hoWTJVb0p5NG5MQ0FuSU9LQWt6NGdKeWw5WEc0Z0lDQWdJQ0FnSUR3dmNENWNiaUFnSUNBZ0lDQWdQSEErWEc0Z0lDQWdJQ0FnSUNBZ0lDQThjM1J5YjI1blBudDBjbUZ1YzJ4aGRHbHZiaTVqYjI1MFpXNTBmVHd2YzNSeWIyNW5QanhpY2k4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0I3Wm1sbGJHUk5ZWEF1WTI5dWRHVnVkQzV5WlhCc1lXTmxLQ2N1Snl3Z0p5RGlnSk0rSUNjcGZWeHVJQ0FnSUNBZ0lDQThMM0ErWEc0Z0lDQWdQQzlrYVhZK08xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQlRkVzF0WVhKNU95SXNJaTh2SUZCdmJIbG1hV3hzYzF4dWFXMXdiM0owSUNkbGN6WXRjSEp2YldselpTYzdYRzVwYlhCdmNuUWdKMmx6YjIxdmNuQm9hV010Wm1WMFkyZ25PMXh1THk4Z1EyOXRjRzl1Wlc1MGMxeHVhVzF3YjNKMElGTmxkSFJwYm1keklHWnliMjBnSnk0dlEyOXRjRzl1Wlc1MGN5OVRaWFIwYVc1bmN5YzdYRzVjYm1OdmJuTjBJRzF2WkVwemIyNVNaVzVrWlhKRmJHVnRaVzUwSUQwZ0oyMXZaSFZzWVhKcGRIa3Rhbk52YmkxeVpXNWtaWEluTzF4dVkyOXVjM1FnWkc5dFJXeGxiV1Z1ZENBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0cxdlpFcHpiMjVTWlc1a1pYSkZiR1Z0Wlc1MEtUdGNibU52Ym5OMElIdDBjbUZ1YzJ4aGRHbHZibjBnUFNCdGIyUktjMjl1VW1WdVpHVnlPMXh1WEc1U1pXRmpkRVJQVFM1eVpXNWtaWElvWEc0Z0lDQWdQRk5sZEhScGJtZHpJSFJ5WVc1emJHRjBhVzl1UFh0MGNtRnVjMnhoZEdsdmJuMGdMejRzWEc0Z0lDQWdaRzl0Uld4bGJXVnVkRnh1S1RzaUxDSm1kVzVqZEdsdmJpQm5aWFJCY0dsRVlYUmhLSFZ5YkNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJtWlhSamFDaDFjbXdwWEc0Z0lDQWdJQ0FnSUM1MGFHVnVLSEpsY3lBOVBpQnlaWE11YW5OdmJpZ3BLVnh1SUNBZ0lDQWdJQ0F1ZEdobGJpaGNiaUFnSUNBZ0lDQWdJQ0FnSUNoeVpYTjFiSFFwSUQwK0lDaDdjbVZ6ZFd4MGZTa3NYRzRnSUNBZ0lDQWdJQ0FnSUNBb1pYSnliM0lwSUQwK0lDaDdaWEp5YjNKOUtWeHVJQ0FnSUNBZ0lDQXBPMXh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCblpYUkJjR2xFWVhSaE8xeHVJbDE5XG4iXSwiZmlsZSI6IkFkbWluL0luZGV4QWRtaW4uanMifQ==
