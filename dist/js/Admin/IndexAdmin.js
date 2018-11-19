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

},{"whatwg-fetch":6}],3:[function(require,module,exports){
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
/*
 recursive-iterator v2.0.1
 https://github.com/nervgh/recursive-iterator
*/

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["RecursiveIterator"] = factory();
	else
		root["RecursiveIterator"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	
	
	var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };
	
	var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };
	
	var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };
	
	var _lang = __webpack_require__(1);
	
	var isObject = _lang.isObject;
	var getKeys = _lang.getKeys;
	
	
	
	// PRIVATE PROPERTIES
	var BYPASS_MODE = "__bypassMode";
	var IGNORE_CIRCULAR = "__ignoreCircular";
	var MAX_DEEP = "__maxDeep";
	var CACHE = "__cache";
	var QUEUE = "__queue";
	var STATE = "__state";
	
	
	var EMPTY_STATE = {};
	
	
	var RecursiveIterator = (function () {
	    /**
	     * @param {Object|Array} root
	     * @param {Number} [bypassMode=0]
	     * @param {Boolean} [ignoreCircular=false]
	     * @param {Number} [maxDeep=100]
	     */
	    function RecursiveIterator(root) {
	        var bypassMode = arguments[1] === undefined ? 0 : arguments[1];
	        var ignoreCircular = arguments[2] === undefined ? false : arguments[2];
	        var maxDeep = arguments[3] === undefined ? 100 : arguments[3];
	        _classCallCheck(this, RecursiveIterator);
	
	        this[BYPASS_MODE] = bypassMode;
	        this[IGNORE_CIRCULAR] = ignoreCircular;
	        this[MAX_DEEP] = maxDeep;
	        this[CACHE] = [];
	        this[QUEUE] = [];
	        this[STATE] = this.getState(undefined, root);
	        this.__makeIterable();
	    }
	
	    _prototypeProperties(RecursiveIterator, null, {
	        next: {
	            /**
	             * @returns {Object}
	             */
	            value: function next() {
	                var _ref = this[STATE] || EMPTY_STATE;
	                var node = _ref.node;
	                var path = _ref.path;
	                var deep = _ref.deep;
	
	
	                if (this[MAX_DEEP] > deep) {
	                    if (this.isNode(node)) {
	                        if (this.isCircular(node)) {
	                            if (this[IGNORE_CIRCULAR]) {} else {
	                                throw new Error("Circular reference");
	                            }
	                        } else {
	                            if (this.onStepInto(this[STATE])) {
	                                var _QUEUE;
	                                var descriptors = this.getStatesOfChildNodes(node, path, deep);
	                                var method = this[BYPASS_MODE] ? "push" : "unshift";
	                                (_QUEUE = this[QUEUE])[method].apply(_QUEUE, _toConsumableArray(descriptors));
	                                this[CACHE].push(node);
	                            }
	                        }
	                    }
	                }
	
	                var value = this[QUEUE].shift();
	                var done = !value;
	
	                this[STATE] = value;
	
	                if (done) this.destroy();
	
	                return { value: value, done: done };
	            },
	            writable: true,
	            configurable: true
	        },
	        destroy: {
	            /**
	             *
	             */
	            value: function destroy() {
	                this[QUEUE].length = 0;
	                this[CACHE].length = 0;
	                this[STATE] = null;
	            },
	            writable: true,
	            configurable: true
	        },
	        isNode: {
	            /**
	             * @param {*} any
	             * @returns {Boolean}
	             */
	            value: function isNode(any) {
	                return isObject(any);
	            },
	            writable: true,
	            configurable: true
	        },
	        isLeaf: {
	            /**
	             * @param {*} any
	             * @returns {Boolean}
	             */
	            value: function isLeaf(any) {
	                return !this.isNode(any);
	            },
	            writable: true,
	            configurable: true
	        },
	        isCircular: {
	            /**
	             * @param {*} any
	             * @returns {Boolean}
	             */
	            value: function isCircular(any) {
	                return this[CACHE].indexOf(any) !== -1;
	            },
	            writable: true,
	            configurable: true
	        },
	        getStatesOfChildNodes: {
	            /**
	             * Returns states of child nodes
	             * @param {Object} node
	             * @param {Array} path
	             * @param {Number} deep
	             * @returns {Array<Object>}
	             */
	            value: function getStatesOfChildNodes(node, path, deep) {
	                var _this = this;
	                return getKeys(node).map(function (key) {
	                    return _this.getState(node, node[key], key, path.concat(key), deep + 1);
	                });
	            },
	            writable: true,
	            configurable: true
	        },
	        getState: {
	            /**
	             * Returns state of node. Calls for each node
	             * @param {Object} [parent]
	             * @param {*} [node]
	             * @param {String} [key]
	             * @param {Array} [path]
	             * @param {Number} [deep]
	             * @returns {Object}
	             */
	            value: function getState(parent, node, key) {
	                var path = arguments[3] === undefined ? [] : arguments[3];
	                var deep = arguments[4] === undefined ? 0 : arguments[4];
	                return { parent: parent, node: node, key: key, path: path, deep: deep };
	            },
	            writable: true,
	            configurable: true
	        },
	        onStepInto: {
	            /**
	             * Callback
	             * @param {Object} state
	             * @returns {Boolean}
	             */
	            value: function onStepInto(state) {
	                return true;
	            },
	            writable: true,
	            configurable: true
	        },
	        __makeIterable: {
	            /**
	             * Only for es6
	             * @private
	             */
	            value: function __makeIterable() {
	                var _this = this;
	                try {
	                    this[Symbol.iterator] = function () {
	                        return _this;
	                    };
	                } catch (e) {}
	            },
	            writable: true,
	            configurable: true
	        }
	    });
	
	    return RecursiveIterator;
	})();
	
	module.exports = RecursiveIterator;
	// skip

/***/ },
/* 1 */
/***/ function(module, exports) {

	"use strict";
	/**
	 * @param {*} any
	 * @returns {Boolean}
	 */
	exports.isObject = isObject;
	/**
	 * @param {*} any
	 * @returns {Boolean}
	 */
	exports.isArrayLike = isArrayLike;
	/**
	 * @param {*} any
	 * @returns {Boolean}
	 */
	exports.isNumber = isNumber;
	/**
	 * @param {Object|Array} object
	 * @returns {Array<String>}
	 */
	exports.getKeys = getKeys;
	function isObject(any) {
	  return any !== null && typeof any === "object";
	}
	/**
	 * @param {*} any
	 * @returns {Boolean}
	 */
	var isArray = exports.isArray = Array.isArray;
	function isArrayLike(any) {
	  if (!isObject(any)) {
	    return false;
	  }if (!("length" in any)) {
	    return false;
	  }var length = any.length;
	  if (!isNumber(length)) {
	    return false;
	  }if (length > 0) {
	    return length - 1 in any;
	  } else {
	    for (var key in any) {
	      return false;
	    }
	  }
	}function isNumber(any) {
	  return typeof any === "number";
	}function getKeys(object) {
	  var keys_ = Object.keys(object);
	  if (isArray(object)) {} else if (isArrayLike(object)) {
	    var index = keys_.indexOf("length");
	    if (index > -1) {
	      keys_.splice(index, 1);
	    }
	    // skip sort
	  } else {
	    // sort
	    keys_ = keys_.sort();
	  }
	  return keys_;
	}
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	// skip sort

/***/ }
/******/ ])
});
;

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"./ListItem":10,"object-path":3,"recursive-iterator":5}],8:[function(require,module,exports){
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

},{"../../Utilities/getApiData":14,"./DataList":7}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"./FieldSelection":8,"./InputFields":9,"./Summary":12}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{"./Components/Settings":11,"es6-promise":1,"isomorphic-fetch":2}],14:[function(require,module,exports){
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

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9lczYtcHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9pc29tb3JwaGljLWZldGNoL2ZldGNoLW5wbS1icm93c2VyaWZ5LmpzIiwibm9kZV9tb2R1bGVzL29iamVjdC1wYXRoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9yZWN1cnNpdmUtaXRlcmF0b3IvZGlzdC9yZWN1cnNpdmUtaXRlcmF0b3IuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvRGF0YUxpc3QuanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9GaWVsZFNlbGVjdGlvbi5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL0lucHV0RmllbGRzLmpzIiwic291cmNlL2pzL0FkbWluL0NvbXBvbmVudHMvTGlzdEl0ZW0uanMiLCJzb3VyY2UvanMvQWRtaW4vQ29tcG9uZW50cy9TZXR0aW5ncy5qcyIsInNvdXJjZS9qcy9BZG1pbi9Db21wb25lbnRzL1N1bW1hcnkuanMiLCJzb3VyY2UvanMvQWRtaW4vSW5kZXhBZG1pbi5qcyIsInNvdXJjZS9qcy9VdGlsaXRpZXMvZ2V0QXBpRGF0YS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztBQzdjQTs7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFFTSxROzs7Ozs7Ozs7Ozs7O2dDQUNVLEksRUFBTSxLLEVBQU87QUFDckIsTUFBQSxLQUFLLENBQUMsY0FBTjtBQUNBLFdBQUssS0FBTCxDQUFXLGNBQVgscUJBQTRCLEtBQUssQ0FBQyxNQUFOLENBQWEsT0FBYixDQUFxQixLQUFqRCxFQUF5RCxJQUF6RDtBQUNIOzs7Z0NBRVcsSSxFQUFNO0FBQUE7O0FBQ2QsYUFBTyxNQUFNLENBQUMsSUFBUCxDQUFZLElBQVosRUFBa0IsR0FBbEIsQ0FBc0IsVUFBQSxJQUFJLEVBQUk7QUFDakMsWUFBSSxJQUFJLEtBQUssWUFBYixFQUEyQjtBQUN2QjtBQUNIOztBQUVELFlBQUksS0FBSyxHQUFHLG9CQUFDLGlCQUFEO0FBQVUsVUFBQSxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQUwsRUFBZjtBQUNVLFVBQUEsS0FBSyxFQUFFLElBRGpCO0FBRVUsVUFBQSxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUQsQ0FGdEI7QUFHVSxVQUFBLFFBQVEsRUFBRSxLQUFJLENBQUMsS0FBTCxDQUFXLFFBSC9CO0FBSVUsVUFBQSxnQkFBZ0IsRUFBRSwwQkFBQSxDQUFDO0FBQUEsbUJBQUksS0FBSSxDQUFDLFdBQUwsQ0FBaUIsSUFBSSxDQUFDLElBQUQsQ0FBSixDQUFXLFVBQTVCLEVBQXdDLENBQXhDLENBQUo7QUFBQSxXQUo3QjtBQUtVLFVBQUEsWUFBWSxFQUFFLHNCQUFBLENBQUM7QUFBQSxtQkFBSSxLQUFJLENBQUMsV0FBTCxDQUFpQixJQUFJLENBQUMsSUFBRCxDQUFyQixFQUE2QixDQUE3QixDQUFKO0FBQUEsV0FMekI7QUFNVSxVQUFBLGNBQWMsRUFBRSx3QkFBQSxDQUFDO0FBQUEsbUJBQUksS0FBSSxDQUFDLFdBQUwsQ0FBaUIsSUFBSSxDQUFDLElBQUQsQ0FBckIsRUFBNkIsQ0FBN0IsQ0FBSjtBQUFBLFdBTjNCO0FBT1UsVUFBQSxXQUFXLEVBQUUsS0FBSSxDQUFDLEtBQUwsQ0FBVztBQVBsQyxVQUFaOztBQVNBLFlBQUksUUFBTyxJQUFJLENBQUMsSUFBRCxDQUFYLE1BQXNCLFFBQXRCLElBQWtDLElBQUksQ0FBQyxJQUFELENBQUosS0FBZSxJQUFyRCxFQUEyRDtBQUN2RCxVQUFBLEtBQUssR0FBRyxLQUFLLENBQUMsWUFBTixDQUFtQixLQUFuQixFQUEwQjtBQUM5QixZQUFBLFFBQVEsRUFBRSxLQUFLLENBQUMsT0FBTixDQUFjLElBQUksQ0FBQyxJQUFELENBQWxCLElBQTRCLEtBQUksQ0FBQyxXQUFMLENBQWlCLElBQUksQ0FBQyxJQUFELENBQUosQ0FBVyxDQUFYLENBQWpCLENBQTVCLEdBQThELEtBQUksQ0FBQyxXQUFMLENBQWlCLElBQUksQ0FBQyxJQUFELENBQXJCO0FBRDFDLFdBQTFCLENBQVI7QUFHSDs7QUFFRCxlQUFPLEtBQVA7QUFDSCxPQXJCTSxDQUFQO0FBc0JIOzs7NkJBRVE7QUFBQSx3QkFDdUIsS0FBSyxLQUQ1QjtBQUFBLFVBQ0UsV0FERixlQUNFLFdBREY7QUFBQSxVQUNlLElBRGYsZUFDZSxJQURmO0FBRUwsVUFBTSxRQUFRLEdBQUcsS0FBSyxLQUFMLENBQVcsUUFBNUI7O0FBRUEsVUFBSSxLQUFLLENBQUMsT0FBTixDQUFjLElBQWQsQ0FBSixFQUF5QjtBQUNyQixRQUFBLFFBQVEsQ0FBQyxhQUFULEdBQXlCLEVBQXpCO0FBQ0g7O0FBRUQsVUFBSSxRQUFRLENBQUMsYUFBVCxLQUEyQixJQUEvQixFQUFxQztBQUNqQyxZQUFJLEtBQUssQ0FBQyxPQUFOLENBQWMsSUFBZCxDQUFKLEVBQXlCO0FBQ3JCLFVBQUEsSUFBSSw0QkFBRyxJQUFJLENBQUMsQ0FBRCxDQUFQLENBQUo7QUFDSDs7QUFIZ0M7QUFBQTtBQUFBOztBQUFBO0FBS2pDLCtCQUFzQyxJQUFJLDBCQUFKLENBQXNCLElBQXRCLENBQXRDLDhIQUFtRTtBQUFBO0FBQUEsZ0JBQXpELE1BQXlELGVBQXpELE1BQXlEO0FBQUEsZ0JBQWpELElBQWlELGVBQWpELElBQWlEO0FBQUEsZ0JBQTNDLEdBQTJDLGVBQTNDLEdBQTJDO0FBQUEsZ0JBQXRDLElBQXNDLGVBQXRDLElBQXNDOztBQUMvRCxnQkFBSSxRQUFPLElBQVAsTUFBZ0IsUUFBaEIsSUFBNEIsSUFBSSxLQUFLLElBQXpDLEVBQStDO0FBQzNDLGtCQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBTCxDQUFVLEdBQVYsQ0FBakI7O0FBQ0Esa0NBQVcsR0FBWCxDQUFlLElBQWYsRUFBcUIsVUFBVSxHQUFHLGFBQWxDLEVBQWlELFVBQWpEO0FBQ0g7QUFDSjtBQVZnQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQVlqQyxlQUNJLGlDQUNJLGdDQUFLLFdBQVcsQ0FBQyxvQkFBakIsQ0FESixFQUVJO0FBQUksVUFBQSxTQUFTLEVBQUM7QUFBZCxXQUNLLEtBQUssV0FBTCxDQUFpQixJQUFqQixDQURMLENBRkosQ0FESjtBQVFILE9BcEJELE1Bb0JPO0FBQ0gsWUFBSSxVQUFVLEdBQUcsb0JBQVcsR0FBWCxDQUFlLElBQWYsRUFBcUIsUUFBUSxDQUFDLGFBQTlCLENBQWpCOztBQUVBLFlBQUksS0FBSyxDQUFDLE9BQU4sQ0FBYyxVQUFkLENBQUosRUFBK0I7QUFDM0IsVUFBQSxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUQsQ0FBdkI7QUFDSDs7QUFMRTtBQUFBO0FBQUE7O0FBQUE7QUFPSCxnQ0FBc0MsSUFBSSwwQkFBSixDQUFzQixVQUF0QixDQUF0QyxtSUFBeUU7QUFBQTtBQUFBLGdCQUEvRCxNQUErRCxnQkFBL0QsTUFBK0Q7QUFBQSxnQkFBdkQsSUFBdUQsZ0JBQXZELElBQXVEO0FBQUEsZ0JBQWpELEdBQWlELGdCQUFqRCxHQUFpRDtBQUFBLGdCQUE1QyxJQUE0QyxnQkFBNUMsSUFBNEM7O0FBQ3JFLGdCQUFJLFFBQU8sSUFBUCxNQUFnQixRQUFwQixFQUE4QjtBQUMxQixrQkFBSSxXQUFVLEdBQUcsSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFWLENBQWpCOztBQUNBLGtDQUFXLEdBQVgsQ0FBZSxVQUFmLEVBQTJCLFdBQTNCLEVBQXVDLFdBQXZDO0FBQ0g7QUFDSjtBQVpFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBY0gsZUFDSSxpQ0FDSSxnQ0FBSyxXQUFXLENBQUMsa0JBQWpCLENBREosRUFFSTtBQUFJLFVBQUEsU0FBUyxFQUFDO0FBQWQsV0FDSyxLQUFLLFdBQUwsQ0FBaUIsVUFBakIsQ0FETCxDQUZKLENBREo7QUFRSDtBQUNKOzs7O0VBbEZrQixLQUFLLENBQUMsUzs7ZUFxRmQsUTs7Ozs7Ozs7Ozs7QUN6RmY7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFFTSxjOzs7Ozs7Ozs7Ozs7O3dDQUNrQjtBQUNoQixXQUFLLE9BQUw7QUFDSDs7OzhCQUVTO0FBQUE7O0FBQUEsd0JBQ3FCLEtBQUssS0FEMUI7QUFBQSxVQUNDLEdBREQsZUFDQyxHQUREO0FBQUEsVUFDTSxXQUROLGVBQ00sV0FETjtBQUVOLCtCQUFXLEdBQVgsRUFDSyxJQURMLENBRVEsZ0JBQWM7QUFBQSxZQUFaLE1BQVksUUFBWixNQUFZOztBQUNWLFlBQUksQ0FBQyxNQUFELElBQVcsTUFBTSxDQUFDLElBQVAsQ0FBWSxNQUFaLEVBQW9CLE1BQXBCLEtBQStCLENBQTlDLEVBQWlEO0FBQzdDLFVBQUEsS0FBSSxDQUFDLEtBQUwsQ0FBVyxRQUFYLENBQW9CLEtBQUssQ0FBQyxXQUFXLENBQUMsYUFBYixDQUF6Qjs7QUFDQSxVQUFBLEtBQUksQ0FBQyxLQUFMLENBQVcsU0FBWCxDQUFxQixJQUFyQjs7QUFDQTtBQUNIOztBQUNELFFBQUEsS0FBSSxDQUFDLEtBQUwsQ0FBVyxRQUFYLENBQW9CLE1BQXBCOztBQUNBLFFBQUEsS0FBSSxDQUFDLEtBQUwsQ0FBVyxTQUFYLENBQXFCLElBQXJCO0FBQ0gsT0FWVCxFQVVXLGlCQUFhO0FBQUEsWUFBWCxLQUFXLFNBQVgsS0FBVzs7QUFDWixRQUFBLEtBQUksQ0FBQyxLQUFMLENBQVcsU0FBWCxDQUFxQixJQUFyQjs7QUFDQSxRQUFBLEtBQUksQ0FBQyxLQUFMLENBQVcsUUFBWCxDQUFvQixLQUFwQjtBQUNILE9BYlQ7QUFlSDs7O21DQUVjLEssRUFBTztBQUNsQixXQUFLLEtBQUwsQ0FBVyxjQUFYLENBQTBCLEtBQTFCO0FBQ0g7Ozs2QkFFUTtBQUFBLHlCQUN3RCxLQUFLLEtBRDdEO0FBQUEsVUFDRSxHQURGLGdCQUNFLEdBREY7QUFBQSxVQUNPLEtBRFAsZ0JBQ08sS0FEUDtBQUFBLFVBQ2MsUUFEZCxnQkFDYyxRQURkO0FBQUEsVUFDd0IsV0FEeEIsZ0JBQ3dCLFdBRHhCO0FBQUEsVUFDcUMsUUFEckMsZ0JBQ3FDLFFBRHJDO0FBQUEsVUFDK0MsS0FEL0MsZ0JBQytDLEtBRC9DOztBQUdMLFVBQUksS0FBSixFQUFXO0FBQ1AsZUFBTztBQUFLLFVBQUEsU0FBUyxFQUFDO0FBQWYsV0FBNEMsK0JBQUksS0FBSyxDQUFDLE9BQVYsQ0FBNUMsQ0FBUDtBQUNILE9BRkQsTUFFTyxJQUFJLENBQUMsUUFBTCxFQUFlO0FBQ2xCLGVBQU87QUFBSyxVQUFBLFNBQVMsRUFBQztBQUFmLFVBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUNJLG9CQUFDLGlCQUFEO0FBQ0ksVUFBQSxJQUFJLEVBQUUsS0FEVjtBQUVJLFVBQUEsR0FBRyxFQUFFLEdBRlQ7QUFHSSxVQUFBLFFBQVEsRUFBRSxRQUhkO0FBSUksVUFBQSxjQUFjLEVBQUUsS0FBSyxjQUFMLENBQW9CLElBQXBCLENBQXlCLElBQXpCLENBSnBCO0FBS0ksVUFBQSxXQUFXLEVBQUU7QUFMakIsVUFESjtBQVNIO0FBQ0o7Ozs7RUE5Q3dCLEtBQUssQ0FBQyxTOztlQWlEcEIsYzs7Ozs7Ozs7Ozs7QUNwRGYsSUFBTSxXQUFXLEdBQUcsU0FBZCxXQUFjO0FBQUEsTUFBRSxRQUFGLFFBQUUsUUFBRjtBQUFBLE1BQVksR0FBWixRQUFZLEdBQVo7QUFBQSxTQUNoQixpQ0FDSTtBQUFPLElBQUEsSUFBSSxFQUFDLFFBQVo7QUFBcUIsSUFBQSxJQUFJLEVBQUMscUJBQTFCO0FBQWdELElBQUEsS0FBSyxFQUFFO0FBQXZELElBREosRUFFSTtBQUFPLElBQUEsSUFBSSxFQUFDLFFBQVo7QUFBcUIsSUFBQSxJQUFJLEVBQUMsMEJBQTFCO0FBQXFELElBQUEsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFMLENBQWUsUUFBZjtBQUE1RCxJQUZKLENBRGdCO0FBQUEsQ0FBcEI7O2VBTWUsVzs7Ozs7Ozs7Ozs7QUNOZixJQUFNLFFBQVEsR0FBRyxTQUFYLFFBQVcsT0FBc0c7QUFBQSxNQUFwRyxLQUFvRyxRQUFwRyxLQUFvRztBQUFBLE1BQTdGLFFBQTZGLFFBQTdGLFFBQTZGO0FBQUEsTUFBbkYsUUFBbUYsUUFBbkYsUUFBbUY7QUFBQSxNQUF6RSxNQUF5RSxRQUF6RSxNQUF5RTtBQUFBLE1BQWpFLFlBQWlFLFFBQWpFLFlBQWlFO0FBQUEsTUFBbkQsY0FBbUQsUUFBbkQsY0FBbUQ7QUFBQSxNQUFuQyxnQkFBbUMsUUFBbkMsZ0JBQW1DO0FBQUEsTUFBakIsV0FBaUIsUUFBakIsV0FBaUI7O0FBQ25ILE1BQUksUUFBSixFQUFjO0FBQ1YsV0FBUSxnQ0FDSCxLQUFLLENBQUMsT0FBTixDQUFjLE1BQWQsS0FBeUIsUUFBUSxDQUFDLGFBQVQsS0FBMkIsSUFBcEQsR0FDRyxrQ0FBTTtBQUFNLE1BQUEsU0FBUyxFQUFDO0FBQWhCLE1BQU4sT0FBK0QsS0FBL0QsT0FBc0U7QUFBRyxNQUFBLElBQUksRUFBQyxHQUFSO0FBQVksTUFBQSxTQUFTLEVBQUMsYUFBdEI7QUFBb0Msb0JBQVcsZUFBL0M7QUFBK0QsTUFBQSxPQUFPLEVBQUU7QUFBeEUsT0FBMkYsV0FBVyxDQUFDLE1BQXZHLENBQXRFLENBREgsR0FDc00sa0NBQU8sS0FBUCxDQUZuTSxFQUdKLGdDQUFLLFFBQUwsQ0FISSxDQUFSO0FBS0gsR0FORCxNQU1PO0FBQ0gsV0FBUSxnQ0FDSCxRQUFRLENBQUMsS0FBVCxLQUFtQixNQUFuQixJQUE2QixRQUFRLENBQUMsS0FBdEMsR0FBOEMsb0NBQVMsV0FBVyxDQUFDLEtBQXJCLE9BQTlDLEdBQXVGLEVBRHBGLEVBRUgsUUFBUSxDQUFDLE9BQVQsS0FBcUIsTUFBckIsSUFBK0IsUUFBUSxDQUFDLE9BQXhDLEdBQWtELG9DQUFTLFdBQVcsQ0FBQyxPQUFyQixPQUFsRCxHQUE2RixFQUYxRixFQUdKLGtDQUFPLEtBQVAsQ0FISSxFQUlILENBQUMsUUFBUSxDQUFDLEtBQVYsSUFBb0IsUUFBUSxDQUFDLE9BQVQsS0FBcUIsTUFBekMsSUFBb0QsUUFBUSxDQUFDLGFBQVQsS0FBMkIsSUFBL0UsR0FDRztBQUFHLE1BQUEsSUFBSSxFQUFDLEdBQVI7QUFBWSxNQUFBLFNBQVMsRUFBQyxhQUF0QjtBQUFvQyxvQkFBVyxPQUEvQztBQUF1RCxNQUFBLE9BQU8sRUFBRTtBQUFoRSxPQUErRSxXQUFXLENBQUMsS0FBM0YsQ0FESCxHQUMyRyxFQUx4RyxFQU1ILENBQUMsUUFBUSxDQUFDLE9BQVYsSUFBc0IsUUFBUSxDQUFDLEtBQVQsS0FBbUIsTUFBekMsSUFBb0QsUUFBUSxDQUFDLGFBQVQsS0FBMkIsSUFBL0UsR0FDRztBQUFHLE1BQUEsSUFBSSxFQUFDLEdBQVI7QUFBWSxNQUFBLFNBQVMsRUFBQyxhQUF0QjtBQUFvQyxvQkFBVyxTQUEvQztBQUF5RCxNQUFBLE9BQU8sRUFBRTtBQUFsRSxPQUFtRixXQUFXLENBQUMsT0FBL0YsQ0FESCxHQUNpSCxFQVA5RyxDQUFSO0FBU0g7QUFDSixDQWxCRDs7ZUFvQmUsUTs7Ozs7Ozs7Ozs7QUNwQmY7O0FBQ0E7O0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVNLFE7Ozs7O0FBQ0Ysb0JBQVksS0FBWixFQUFtQjtBQUFBOztBQUFBOztBQUNmLGtGQUFNLEtBQU47QUFDQSxVQUFLLEtBQUwsR0FBYTtBQUNULE1BQUEsa0JBQWtCLEVBQUUsS0FEWDtBQUVULE1BQUEsR0FBRyxFQUFFLEVBRkk7QUFHVCxNQUFBLFFBQVEsRUFBRSxLQUhEO0FBSVQsTUFBQSxLQUFLLEVBQUUsSUFKRTtBQUtULE1BQUEsS0FBSyxFQUFFLEVBTEU7QUFNVCxNQUFBLFFBQVEsRUFBRTtBQUNOLFFBQUEsYUFBYSxFQUFFLElBRFQ7QUFFTixRQUFBLEtBQUssRUFBRSxFQUZEO0FBR04sUUFBQSxPQUFPLEVBQUU7QUFISDtBQU5ELEtBQWI7QUFGZTtBQWNsQjs7Ozt3Q0FFbUI7QUFDaEIsV0FBSyxXQUFMO0FBQ0g7OztrQ0FFYTtBQUNWLFVBQUksT0FBTyxhQUFhLENBQUMsT0FBckIsS0FBaUMsV0FBckMsRUFBa0Q7QUFDOUMsWUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQTlCO0FBQ0EsYUFBSyxRQUFMLENBQWM7QUFDVixVQUFBLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBUixHQUFjLE9BQU8sQ0FBQyxHQUF0QixHQUE0QixFQUR2QjtBQUVWLFVBQUEsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFSLEdBQW1CLElBQUksQ0FBQyxLQUFMLENBQVcsT0FBTyxDQUFDLFFBQW5CLENBQW5CLEdBQWtEO0FBQ3hELFlBQUEsYUFBYSxFQUFFLElBRHlDO0FBRXhELFlBQUEsS0FBSyxFQUFFLEVBRmlEO0FBR3hELFlBQUEsT0FBTyxFQUFFO0FBSCtDLFdBRmxEO0FBT1YsVUFBQSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBUHBCLFNBQWQ7QUFTSDtBQUNKOzs7OEJBRVMsSyxFQUFPO0FBQ2IsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTixDQUFhO0FBQW5CLE9BQWQ7QUFDSDs7O2lDQUVZLEssRUFBTztBQUNoQixNQUFBLEtBQUssQ0FBQyxjQUFOO0FBQ0EsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLGtCQUFrQixFQUFFO0FBQXJCLE9BQWQ7QUFDSDs7O2lDQUVZLEssRUFBTztBQUNoQixNQUFBLEtBQUssQ0FBQyxjQUFOO0FBQ0EsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLGtCQUFrQixFQUFFLEtBQXJCO0FBQTRCLFFBQUEsR0FBRyxFQUFFLEVBQWpDO0FBQXFDLFFBQUEsUUFBUSxFQUFFO0FBQUMsVUFBQSxhQUFhLEVBQUUsSUFBaEI7QUFBc0IsVUFBQSxLQUFLLEVBQUUsRUFBN0I7QUFBaUMsVUFBQSxPQUFPLEVBQUU7QUFBMUM7QUFBL0MsT0FBZDtBQUNIOzs7bUNBRWMsSyxFQUFPO0FBQ2xCLFVBQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFQLENBQWMsS0FBSyxLQUFMLENBQVcsUUFBekIsRUFBbUMsS0FBbkMsQ0FBZjtBQUNBLFdBQUssUUFBTCxDQUFjO0FBQUMsUUFBQSxRQUFRLEVBQUU7QUFBWCxPQUFkO0FBQ0g7Ozs2QkFFUSxLLEVBQU87QUFDWixXQUFLLFFBQUwsQ0FBYztBQUFDLFFBQUEsS0FBSyxFQUFMO0FBQUQsT0FBZDtBQUNIOzs7OEJBRVMsSyxFQUFPO0FBQ2IsV0FBSyxRQUFMLENBQWM7QUFBQyxRQUFBLFFBQVEsRUFBRTtBQUFYLE9BQWQ7QUFDSDs7OzZCQUVRLEssRUFBTztBQUNaLFdBQUssUUFBTCxDQUFjO0FBQUMsUUFBQSxLQUFLLEVBQUU7QUFBUixPQUFkO0FBQ0g7Ozs2QkFFUTtBQUFBLFVBQ0UsV0FERixHQUNpQixLQUFLLEtBRHRCLENBQ0UsV0FERjtBQUFBLHdCQUVxRCxLQUFLLEtBRjFEO0FBQUEsVUFFRSxrQkFGRixlQUVFLGtCQUZGO0FBQUEsVUFFc0IsR0FGdEIsZUFFc0IsR0FGdEI7QUFBQSxVQUUyQixLQUYzQixlQUUyQixLQUYzQjtBQUFBLFVBRWtDLFFBRmxDLGVBRWtDLFFBRmxDO0FBQUEsVUFFNEMsS0FGNUMsZUFFNEMsS0FGNUM7QUFBQSxpQ0FHbUMsS0FBSyxLQUFMLENBQVcsUUFIOUM7QUFBQSxVQUdFLGFBSEYsd0JBR0UsYUFIRjtBQUFBLFVBR2lCLEtBSGpCLHdCQUdpQixLQUhqQjtBQUFBLFVBR3dCLE9BSHhCLHdCQUd3QixPQUh4Qjs7QUFLTCxVQUFJLEdBQUcsSUFBSSxhQUFhLEtBQUssSUFBekIsSUFBaUMsS0FBakMsSUFBMEMsT0FBOUMsRUFBdUQ7QUFDbkQsZUFDSSxpQ0FDSSxvQkFBQyxnQkFBRCxlQUNRLEtBQUssS0FEYjtBQUVJLFVBQUEsV0FBVyxFQUFFO0FBRmpCLFdBREosRUFLSSxvQkFBQyxvQkFBRCxFQUFpQixLQUFLLEtBQXRCLENBTEosRUFNSSwrQkFBRztBQUFHLFVBQUEsSUFBSSxFQUFDLEdBQVI7QUFBWSxVQUFBLE9BQU8sRUFBRSxLQUFLLFlBQUwsQ0FBa0IsSUFBbEIsQ0FBdUIsSUFBdkIsQ0FBckI7QUFDRyxVQUFBLFNBQVMsRUFBQztBQURiLFdBQ3VCLFdBQVcsQ0FBQyxhQURuQyxDQUFILENBTkosQ0FESjtBQVdILE9BWkQsTUFZTyxJQUFJLGtCQUFKLEVBQXdCO0FBQzNCLGVBQ0ksaUNBQ0ksb0JBQUMsdUJBQUQ7QUFDSSxVQUFBLEdBQUcsRUFBRSxHQURUO0FBRUksVUFBQSxLQUFLLEVBQUUsS0FGWDtBQUdJLFVBQUEsUUFBUSxFQUFFLEtBQUssUUFBTCxDQUFjLElBQWQsQ0FBbUIsSUFBbkIsQ0FIZDtBQUlJLFVBQUEsUUFBUSxFQUFFLFFBSmQ7QUFLSSxVQUFBLFNBQVMsRUFBRSxLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQW9CLElBQXBCLENBTGY7QUFNSSxVQUFBLEtBQUssRUFBRSxLQU5YO0FBT0ksVUFBQSxRQUFRLEVBQUUsS0FBSyxRQUFMLENBQWMsSUFBZCxDQUFtQixJQUFuQixDQVBkO0FBUUksVUFBQSxRQUFRLEVBQUUsS0FBSyxLQUFMLENBQVcsUUFSekI7QUFTSSxVQUFBLGNBQWMsRUFBRSxLQUFLLGNBQUwsQ0FBb0IsSUFBcEIsQ0FBeUIsSUFBekIsQ0FUcEI7QUFVSSxVQUFBLFdBQVcsRUFBRTtBQVZqQixVQURKLEVBYUksb0JBQUMsb0JBQUQsRUFBaUIsS0FBSyxLQUF0QixDQWJKLEVBY0ksK0JBQUc7QUFBRyxVQUFBLElBQUksRUFBQyxHQUFSO0FBQVksVUFBQSxPQUFPLEVBQUUsS0FBSyxZQUFMLENBQWtCLElBQWxCLENBQXVCLElBQXZCLENBQXJCO0FBQ0csVUFBQSxTQUFTLEVBQUM7QUFEYixXQUN1QixXQUFXLENBQUMsYUFEbkMsQ0FBSCxDQWRKLENBREo7QUFtQkgsT0FwQk0sTUFvQkE7QUFDSCxlQUNJO0FBQUssVUFBQSxTQUFTLEVBQUM7QUFBZixXQUNJO0FBQU0sVUFBQSxRQUFRLEVBQUUsS0FBSyxZQUFMLENBQWtCLElBQWxCLENBQXVCLElBQXZCO0FBQWhCLFdBQ0ksK0JBQ0ksbUNBQ0ksOENBREosQ0FESixFQUlJLCtCQUpKLEVBS0ksK0JBQUksV0FBVyxDQUFDLFlBQWhCLENBTEosQ0FESixFQVFJO0FBQU8sVUFBQSxJQUFJLEVBQUMsTUFBWjtBQUFtQixVQUFBLFNBQVMsRUFBQyxXQUE3QjtBQUF5QyxVQUFBLEtBQUssRUFBRSxHQUFoRDtBQUFxRCxVQUFBLFFBQVEsRUFBRSxLQUFLLFNBQUwsQ0FBZSxJQUFmLENBQW9CLElBQXBCO0FBQS9ELFVBUkosRUFTSSwrQkFBRztBQUFPLFVBQUEsSUFBSSxFQUFDLFFBQVo7QUFBcUIsVUFBQSxTQUFTLEVBQUMsdUJBQS9CO0FBQXVELFVBQUEsS0FBSyxFQUFFLFdBQVcsQ0FBQztBQUExRSxVQUFILENBVEosQ0FESixFQVlJLG9CQUFDLG9CQUFELEVBQWlCLEtBQUssS0FBdEIsQ0FaSixDQURKO0FBZ0JIO0FBQ0o7Ozs7RUExSGtCLEtBQUssQ0FBQyxTOztlQTZIZCxROzs7Ozs7Ozs7OztBQ2pJZixJQUFNLE9BQU8sR0FBRyxTQUFWLE9BQVU7QUFBQSxNQUFFLEdBQUYsUUFBRSxHQUFGO0FBQUEsTUFBTyxRQUFQLFFBQU8sUUFBUDtBQUFBLE1BQWlCLFdBQWpCLFFBQWlCLFdBQWpCO0FBQUEsU0FDWixpQ0FDSSwrQkFDSSw4Q0FESixFQUM0QiwrQkFENUIsRUFFSTtBQUFHLElBQUEsSUFBSSxFQUFFLEdBQVQ7QUFBYyxJQUFBLE1BQU0sRUFBQztBQUFyQixLQUErQixHQUEvQixDQUZKLENBREosRUFLSSwrQkFDSSxvQ0FBUyxXQUFXLENBQUMsS0FBckIsQ0FESixFQUN3QywrQkFEeEMsRUFFSyxRQUFRLENBQUMsS0FBVCxDQUFlLE9BQWYsQ0FBdUIsR0FBdkIsRUFBNEIsTUFBNUIsQ0FGTCxDQUxKLEVBU0ksK0JBQ0ksb0NBQVMsV0FBVyxDQUFDLE9BQXJCLENBREosRUFDMEMsK0JBRDFDLEVBRUssUUFBUSxDQUFDLE9BQVQsQ0FBaUIsT0FBakIsQ0FBeUIsR0FBekIsRUFBOEIsTUFBOUIsQ0FGTCxDQVRKLENBRFk7QUFBQSxDQUFoQjs7ZUFnQmUsTzs7Ozs7O0FDZmY7O0FBQ0E7O0FBRUE7Ozs7QUFKQTtBQUdBO0FBR0EsSUFBTSxvQkFBb0IsR0FBRyx3QkFBN0I7QUFDQSxJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBVCxDQUF3QixvQkFBeEIsQ0FBbkI7cUJBQ3NCLGE7SUFBZixXLGtCQUFBLFc7QUFFUCxRQUFRLENBQUMsTUFBVCxDQUNJLG9CQUFDLGlCQUFEO0FBQVUsRUFBQSxXQUFXLEVBQUU7QUFBdkIsRUFESixFQUVJLFVBRko7Ozs7Ozs7Ozs7QUNWQSxTQUFTLFVBQVQsQ0FBb0IsR0FBcEIsRUFBeUI7QUFDckIsU0FBTyxLQUFLLENBQUMsR0FBRCxDQUFMLENBQ0YsSUFERSxDQUNHLFVBQUEsR0FBRztBQUFBLFdBQUksR0FBRyxDQUFDLElBQUosRUFBSjtBQUFBLEdBRE4sRUFFRixJQUZFLENBR0MsVUFBQyxNQUFEO0FBQUEsV0FBYTtBQUFDLE1BQUEsTUFBTSxFQUFOO0FBQUQsS0FBYjtBQUFBLEdBSEQsRUFJQyxVQUFDLEtBQUQ7QUFBQSxXQUFZO0FBQUMsTUFBQSxLQUFLLEVBQUw7QUFBRCxLQUFaO0FBQUEsR0FKRCxDQUFQO0FBTUg7O2VBRWMsVSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9zdGVmYW5wZW5uZXIvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgdjQuMi41KzdmMmI1MjZkXG4gKi9cblxuKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcblx0dHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCkgOlxuXHR0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuXHQoZ2xvYmFsLkVTNlByb21pc2UgPSBmYWN0b3J5KCkpO1xufSh0aGlzLCAoZnVuY3Rpb24gKCkgeyAndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB4O1xuICByZXR1cm4geCAhPT0gbnVsbCAmJiAodHlwZSA9PT0gJ29iamVjdCcgfHwgdHlwZSA9PT0gJ2Z1bmN0aW9uJyk7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oeCkge1xuICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG5cblxuXG52YXIgX2lzQXJyYXkgPSB2b2lkIDA7XG5pZiAoQXJyYXkuaXNBcnJheSkge1xuICBfaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG59IGVsc2Uge1xuICBfaXNBcnJheSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcbn1cblxudmFyIGlzQXJyYXkgPSBfaXNBcnJheTtcblxudmFyIGxlbiA9IDA7XG52YXIgdmVydHhOZXh0ID0gdm9pZCAwO1xudmFyIGN1c3RvbVNjaGVkdWxlckZuID0gdm9pZCAwO1xuXG52YXIgYXNhcCA9IGZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICBxdWV1ZVtsZW5dID0gY2FsbGJhY2s7XG4gIHF1ZXVlW2xlbiArIDFdID0gYXJnO1xuICBsZW4gKz0gMjtcbiAgaWYgKGxlbiA9PT0gMikge1xuICAgIC8vIElmIGxlbiBpcyAyLCB0aGF0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byBzY2hlZHVsZSBhbiBhc3luYyBmbHVzaC5cbiAgICAvLyBJZiBhZGRpdGlvbmFsIGNhbGxiYWNrcyBhcmUgcXVldWVkIGJlZm9yZSB0aGUgcXVldWUgaXMgZmx1c2hlZCwgdGhleVxuICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICBpZiAoY3VzdG9tU2NoZWR1bGVyRm4pIHtcbiAgICAgIGN1c3RvbVNjaGVkdWxlckZuKGZsdXNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgIH1cbiAgfVxufTtcblxuZnVuY3Rpb24gc2V0U2NoZWR1bGVyKHNjaGVkdWxlRm4pIHtcbiAgY3VzdG9tU2NoZWR1bGVyRm4gPSBzY2hlZHVsZUZuO1xufVxuXG5mdW5jdGlvbiBzZXRBc2FwKGFzYXBGbikge1xuICBhc2FwID0gYXNhcEZuO1xufVxuXG52YXIgYnJvd3NlcldpbmRvdyA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdW5kZWZpbmVkO1xudmFyIGJyb3dzZXJHbG9iYWwgPSBicm93c2VyV2luZG93IHx8IHt9O1xudmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbnZhciBpc05vZGUgPSB0eXBlb2Ygc2VsZiA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJztcblxuLy8gdGVzdCBmb3Igd2ViIHdvcmtlciBidXQgbm90IGluIElFMTBcbnZhciBpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG5cbi8vIG5vZGVcbmZ1bmN0aW9uIHVzZU5leHRUaWNrKCkge1xuICAvLyBub2RlIHZlcnNpb24gMC4xMC54IGRpc3BsYXlzIGEgZGVwcmVjYXRpb24gd2FybmluZyB3aGVuIG5leHRUaWNrIGlzIHVzZWQgcmVjdXJzaXZlbHlcbiAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9jdWpvanMvd2hlbi9pc3N1ZXMvNDEwIGZvciBkZXRhaWxzXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICB9O1xufVxuXG4vLyB2ZXJ0eFxuZnVuY3Rpb24gdXNlVmVydHhUaW1lcigpIHtcbiAgaWYgKHR5cGVvZiB2ZXJ0eE5leHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZlcnR4TmV4dChmbHVzaCk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB1c2VTZXRUaW1lb3V0KCk7XG59XG5cbmZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gIHZhciBpdGVyYXRpb25zID0gMDtcbiAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgbm9kZS5kYXRhID0gaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDI7XG4gIH07XG59XG5cbi8vIHdlYiB3b3JrZXJcbmZ1bmN0aW9uIHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZsdXNoO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICAvLyBTdG9yZSBzZXRUaW1lb3V0IHJlZmVyZW5jZSBzbyBlczYtcHJvbWlzZSB3aWxsIGJlIHVuYWZmZWN0ZWQgYnlcbiAgLy8gb3RoZXIgY29kZSBtb2RpZnlpbmcgc2V0VGltZW91dCAobGlrZSBzaW5vbi51c2VGYWtlVGltZXJzKCkpXG4gIHZhciBnbG9iYWxTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZ2xvYmFsU2V0VGltZW91dChmbHVzaCwgMSk7XG4gIH07XG59XG5cbnZhciBxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcbmZ1bmN0aW9uIGZsdXNoKCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gcXVldWVbaV07XG4gICAgdmFyIGFyZyA9IHF1ZXVlW2kgKyAxXTtcblxuICAgIGNhbGxiYWNrKGFyZyk7XG5cbiAgICBxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICBxdWV1ZVtpICsgMV0gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBsZW4gPSAwO1xufVxuXG5mdW5jdGlvbiBhdHRlbXB0VmVydHgoKSB7XG4gIHRyeSB7XG4gICAgdmFyIHZlcnR4ID0gRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKS5yZXF1aXJlKCd2ZXJ0eCcpO1xuICAgIHZlcnR4TmV4dCA9IHZlcnR4LnJ1bk9uTG9vcCB8fCB2ZXJ0eC5ydW5PbkNvbnRleHQ7XG4gICAgcmV0dXJuIHVzZVZlcnR4VGltZXIoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiB1c2VTZXRUaW1lb3V0KCk7XG4gIH1cbn1cblxudmFyIHNjaGVkdWxlRmx1c2ggPSB2b2lkIDA7XG4vLyBEZWNpZGUgd2hhdCBhc3luYyBtZXRob2QgdG8gdXNlIHRvIHRyaWdnZXJpbmcgcHJvY2Vzc2luZyBvZiBxdWV1ZWQgY2FsbGJhY2tzOlxuaWYgKGlzTm9kZSkge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTmV4dFRpY2soKTtcbn0gZWxzZSBpZiAoQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbn0gZWxzZSBpZiAoaXNXb3JrZXIpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU1lc3NhZ2VDaGFubmVsKCk7XG59IGVsc2UgaWYgKGJyb3dzZXJXaW5kb3cgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJykge1xuICBzY2hlZHVsZUZsdXNoID0gYXR0ZW1wdFZlcnR4KCk7XG59IGVsc2Uge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB0aGVuKG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzO1xuXG4gIHZhciBjaGlsZCA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKG5vb3ApO1xuXG4gIGlmIChjaGlsZFtQUk9NSVNFX0lEXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbWFrZVByb21pc2UoY2hpbGQpO1xuICB9XG5cbiAgdmFyIF9zdGF0ZSA9IHBhcmVudC5fc3RhdGU7XG5cblxuICBpZiAoX3N0YXRlKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW19zdGF0ZSAtIDFdO1xuICAgIGFzYXAoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGludm9rZUNhbGxiYWNrKF9zdGF0ZSwgY2hpbGQsIGNhbGxiYWNrLCBwYXJlbnQuX3Jlc3VsdCk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBjaGlsZDtcbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlc29sdmVgIHJldHVybnMgYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgcmVzb2x2ZWQgd2l0aCB0aGVcbiAgcGFzc2VkIGB2YWx1ZWAuIEl0IGlzIHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICByZXNvbHZlKDEpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIHZhbHVlID09PSAxXG4gIH0pO1xuICBgYGBcblxuICBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlIGFib3ZlLCB5b3VyIGNvZGUgbm93IHNpbXBseSBiZWNvbWVzIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgxKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIHZhbHVlID09PSAxXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJlc29sdmVcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gdmFsdWUgdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHdpdGhcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSBmdWxmaWxsZWQgd2l0aCB0aGUgZ2l2ZW5cbiAgYHZhbHVlYFxuKi9cbmZ1bmN0aW9uIHJlc29sdmUkMShvYmplY3QpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG5cbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlc29sdmUocHJvbWlzZSwgb2JqZWN0KTtcbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbnZhciBQUk9NSVNFX0lEID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIpO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxudmFyIFBFTkRJTkcgPSB2b2lkIDA7XG52YXIgRlVMRklMTEVEID0gMTtcbnZhciBSRUpFQ1RFRCA9IDI7XG5cbnZhciBUUllfQ0FUQ0hfRVJST1IgPSB7IGVycm9yOiBudWxsIH07XG5cbmZ1bmN0aW9uIHNlbGZGdWxmaWxsbWVudCgpIHtcbiAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpO1xufVxuXG5mdW5jdGlvbiBjYW5ub3RSZXR1cm5Pd24oKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJyk7XG59XG5cbmZ1bmN0aW9uIGdldFRoZW4ocHJvbWlzZSkge1xuICB0cnkge1xuICAgIHJldHVybiBwcm9taXNlLnRoZW47XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZXJyb3I7XG4gICAgcmV0dXJuIFRSWV9DQVRDSF9FUlJPUjtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cnlUaGVuKHRoZW4kJDEsIHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpIHtcbiAgdHJ5IHtcbiAgICB0aGVuJCQxLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUsIHRoZW4kJDEpIHtcbiAgYXNhcChmdW5jdGlvbiAocHJvbWlzZSkge1xuICAgIHZhciBzZWFsZWQgPSBmYWxzZTtcbiAgICB2YXIgZXJyb3IgPSB0cnlUaGVuKHRoZW4kJDEsIHRoZW5hYmxlLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGlmIChzZWFsZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG5cbiAgICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0sICdTZXR0bGU6ICcgKyAocHJvbWlzZS5fbGFiZWwgfHwgJyB1bmtub3duIHByb21pc2UnKSk7XG5cbiAgICBpZiAoIXNlYWxlZCAmJiBlcnJvcikge1xuICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgfVxuICB9LCBwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgdGhlbmFibGUpIHtcbiAgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgfSBlbHNlIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZSh0aGVuYWJsZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuJCQxKSB7XG4gIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yICYmIHRoZW4kJDEgPT09IHRoZW4gJiYgbWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3Rvci5yZXNvbHZlID09PSByZXNvbHZlJDEpIHtcbiAgICBoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodGhlbiQkMSA9PT0gVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgVFJZX0NBVENIX0VSUk9SLmVycm9yKTtcbiAgICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIGlmICh0aGVuJCQxID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoZW4kJDEpKSB7XG4gICAgICBoYW5kbGVGb3JlaWduVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIHNlbGZGdWxmaWxsbWVudCgpKTtcbiAgfSBlbHNlIGlmIChvYmplY3RPckZ1bmN0aW9uKHZhbHVlKSkge1xuICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUsIGdldFRoZW4odmFsdWUpKTtcbiAgfSBlbHNlIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoUmVqZWN0aW9uKHByb21pc2UpIHtcbiAgaWYgKHByb21pc2UuX29uZXJyb3IpIHtcbiAgICBwcm9taXNlLl9vbmVycm9yKHByb21pc2UuX3Jlc3VsdCk7XG4gIH1cblxuICBwdWJsaXNoKHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBmdWxmaWxsKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHByb21pc2UuX3Jlc3VsdCA9IHZhbHVlO1xuICBwcm9taXNlLl9zdGF0ZSA9IEZVTEZJTExFRDtcblxuICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoICE9PSAwKSB7XG4gICAgYXNhcChwdWJsaXNoLCBwcm9taXNlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWplY3QocHJvbWlzZSwgcmVhc29uKSB7XG4gIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gUEVORElORykge1xuICAgIHJldHVybjtcbiAgfVxuICBwcm9taXNlLl9zdGF0ZSA9IFJFSkVDVEVEO1xuICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgYXNhcChwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gIHZhciBfc3Vic2NyaWJlcnMgPSBwYXJlbnQuX3N1YnNjcmliZXJzO1xuICB2YXIgbGVuZ3RoID0gX3N1YnNjcmliZXJzLmxlbmd0aDtcblxuXG4gIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgX3N1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICBfc3Vic2NyaWJlcnNbbGVuZ3RoICsgUkVKRUNURURdID0gb25SZWplY3Rpb247XG5cbiAgaWYgKGxlbmd0aCA9PT0gMCAmJiBwYXJlbnQuX3N0YXRlKSB7XG4gICAgYXNhcChwdWJsaXNoLCBwYXJlbnQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2gocHJvbWlzZSkge1xuICB2YXIgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycztcbiAgdmFyIHNldHRsZWQgPSBwcm9taXNlLl9zdGF0ZTtcblxuICBpZiAoc3Vic2NyaWJlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGNoaWxkID0gdm9pZCAwLFxuICAgICAgY2FsbGJhY2sgPSB2b2lkIDAsXG4gICAgICBkZXRhaWwgPSBwcm9taXNlLl9yZXN1bHQ7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJzY3JpYmVycy5sZW5ndGg7IGkgKz0gMykge1xuICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgY2FsbGJhY2sgPSBzdWJzY3JpYmVyc1tpICsgc2V0dGxlZF07XG5cbiAgICBpZiAoY2hpbGQpIHtcbiAgICAgIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2soZGV0YWlsKTtcbiAgICB9XG4gIH1cblxuICBwcm9taXNlLl9zdWJzY3JpYmVycy5sZW5ndGggPSAwO1xufVxuXG5mdW5jdGlvbiB0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKGRldGFpbCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgcHJvbWlzZSwgY2FsbGJhY2ssIGRldGFpbCkge1xuICB2YXIgaGFzQ2FsbGJhY2sgPSBpc0Z1bmN0aW9uKGNhbGxiYWNrKSxcbiAgICAgIHZhbHVlID0gdm9pZCAwLFxuICAgICAgZXJyb3IgPSB2b2lkIDAsXG4gICAgICBzdWNjZWVkZWQgPSB2b2lkIDAsXG4gICAgICBmYWlsZWQgPSB2b2lkIDA7XG5cbiAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgdmFsdWUgPSB0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKTtcblxuICAgIGlmICh2YWx1ZSA9PT0gVFJZX0NBVENIX0VSUk9SKSB7XG4gICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgZXJyb3IgPSB2YWx1ZS5lcnJvcjtcbiAgICAgIHZhbHVlLmVycm9yID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgIHJlamVjdChwcm9taXNlLCBjYW5ub3RSZXR1cm5Pd24oKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhbHVlID0gZGV0YWlsO1xuICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gIH1cblxuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICAvLyBub29wXG4gIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBGVUxGSUxMRUQpIHtcbiAgICBmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVByb21pc2UocHJvbWlzZSwgcmVzb2x2ZXIpIHtcbiAgdHJ5IHtcbiAgICByZXNvbHZlcihmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSkge1xuICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICAgIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIGUpO1xuICB9XG59XG5cbnZhciBpZCA9IDA7XG5mdW5jdGlvbiBuZXh0SWQoKSB7XG4gIHJldHVybiBpZCsrO1xufVxuXG5mdW5jdGlvbiBtYWtlUHJvbWlzZShwcm9taXNlKSB7XG4gIHByb21pc2VbUFJPTUlTRV9JRF0gPSBpZCsrO1xuICBwcm9taXNlLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gdW5kZWZpbmVkO1xuICBwcm9taXNlLl9zdWJzY3JpYmVycyA9IFtdO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0aW9uRXJyb3IoKSB7XG4gIHJldHVybiBuZXcgRXJyb3IoJ0FycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheScpO1xufVxuXG52YXIgRW51bWVyYXRvciA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQpIHtcbiAgICB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG4gICAgdGhpcy5wcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuXG4gICAgaWYgKCF0aGlzLnByb21pc2VbUFJPTUlTRV9JRF0pIHtcbiAgICAgIG1ha2VQcm9taXNlKHRoaXMucHJvbWlzZSk7XG4gICAgfVxuXG4gICAgaWYgKGlzQXJyYXkoaW5wdXQpKSB7XG4gICAgICB0aGlzLmxlbmd0aCA9IGlucHV0Lmxlbmd0aDtcbiAgICAgIHRoaXMuX3JlbWFpbmluZyA9IGlucHV0Lmxlbmd0aDtcblxuICAgICAgdGhpcy5fcmVzdWx0ID0gbmV3IEFycmF5KHRoaXMubGVuZ3RoKTtcblxuICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgICB0aGlzLl9lbnVtZXJhdGUoaW5wdXQpO1xuICAgICAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICAgICAgZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KHRoaXMucHJvbWlzZSwgdmFsaWRhdGlvbkVycm9yKCkpO1xuICAgIH1cbiAgfVxuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbiBfZW51bWVyYXRlKGlucHV0KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IHRoaXMuX3N0YXRlID09PSBQRU5ESU5HICYmIGkgPCBpbnB1dC5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5fZWFjaEVudHJ5KGlucHV0W2ldLCBpKTtcbiAgICB9XG4gIH07XG5cbiAgRW51bWVyYXRvci5wcm90b3R5cGUuX2VhY2hFbnRyeSA9IGZ1bmN0aW9uIF9lYWNoRW50cnkoZW50cnksIGkpIHtcbiAgICB2YXIgYyA9IHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3I7XG4gICAgdmFyIHJlc29sdmUkJDEgPSBjLnJlc29sdmU7XG5cblxuICAgIGlmIChyZXNvbHZlJCQxID09PSByZXNvbHZlJDEpIHtcbiAgICAgIHZhciBfdGhlbiA9IGdldFRoZW4oZW50cnkpO1xuXG4gICAgICBpZiAoX3RoZW4gPT09IHRoZW4gJiYgZW50cnkuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgICAgIHRoaXMuX3NldHRsZWRBdChlbnRyeS5fc3RhdGUsIGksIGVudHJ5Ll9yZXN1bHQpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgX3RoZW4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IGVudHJ5O1xuICAgICAgfSBlbHNlIGlmIChjID09PSBQcm9taXNlJDEpIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgYyhub29wKTtcbiAgICAgICAgaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBlbnRyeSwgX3RoZW4pO1xuICAgICAgICB0aGlzLl93aWxsU2V0dGxlQXQocHJvbWlzZSwgaSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl93aWxsU2V0dGxlQXQobmV3IGMoZnVuY3Rpb24gKHJlc29sdmUkJDEpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZSQkMShlbnRyeSk7XG4gICAgICAgIH0pLCBpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHJlc29sdmUkJDEoZW50cnkpLCBpKTtcbiAgICB9XG4gIH07XG5cbiAgRW51bWVyYXRvci5wcm90b3R5cGUuX3NldHRsZWRBdCA9IGZ1bmN0aW9uIF9zZXR0bGVkQXQoc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzLnByb21pc2U7XG5cblxuICAgIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gUEVORElORykge1xuICAgICAgdGhpcy5fcmVtYWluaW5nLS07XG5cbiAgICAgIGlmIChzdGF0ZSA9PT0gUkVKRUNURUQpIHtcbiAgICAgICAgcmVqZWN0KHByb21pc2UsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICB9XG4gIH07XG5cbiAgRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uIF93aWxsU2V0dGxlQXQocHJvbWlzZSwgaSkge1xuICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgIHN1YnNjcmliZShwcm9taXNlLCB1bmRlZmluZWQsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChGVUxGSUxMRUQsIGksIHZhbHVlKTtcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICByZXR1cm4gZW51bWVyYXRvci5fc2V0dGxlZEF0KFJFSkVDVEVELCBpLCByZWFzb24pO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBFbnVtZXJhdG9yO1xufSgpO1xuXG4vKipcbiAgYFByb21pc2UuYWxsYCBhY2NlcHRzIGFuIGFycmF5IG9mIHByb21pc2VzLCBhbmQgcmV0dXJucyBhIG5ldyBwcm9taXNlIHdoaWNoXG4gIGlzIGZ1bGZpbGxlZCB3aXRoIGFuIGFycmF5IG9mIGZ1bGZpbGxtZW50IHZhbHVlcyBmb3IgdGhlIHBhc3NlZCBwcm9taXNlcywgb3JcbiAgcmVqZWN0ZWQgd2l0aCB0aGUgcmVhc29uIG9mIHRoZSBmaXJzdCBwYXNzZWQgcHJvbWlzZSB0byBiZSByZWplY3RlZC4gSXQgY2FzdHMgYWxsXG4gIGVsZW1lbnRzIG9mIHRoZSBwYXNzZWQgaXRlcmFibGUgdG8gcHJvbWlzZXMgYXMgaXQgcnVucyB0aGlzIGFsZ29yaXRobS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gcmVzb2x2ZSgxKTtcbiAgbGV0IHByb21pc2UyID0gcmVzb2x2ZSgyKTtcbiAgbGV0IHByb21pc2UzID0gcmVzb2x2ZSgzKTtcbiAgbGV0IHByb21pc2VzID0gWyBwcm9taXNlMSwgcHJvbWlzZTIsIHByb21pc2UzIF07XG5cbiAgUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oYXJyYXkpe1xuICAgIC8vIFRoZSBhcnJheSBoZXJlIHdvdWxkIGJlIFsgMSwgMiwgMyBdO1xuICB9KTtcbiAgYGBgXG5cbiAgSWYgYW55IG9mIHRoZSBgcHJvbWlzZXNgIGdpdmVuIHRvIGBhbGxgIGFyZSByZWplY3RlZCwgdGhlIGZpcnN0IHByb21pc2VcbiAgdGhhdCBpcyByZWplY3RlZCB3aWxsIGJlIGdpdmVuIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSByZXR1cm5lZCBwcm9taXNlcydzXG4gIHJlamVjdGlvbiBoYW5kbGVyLiBGb3IgZXhhbXBsZTpcblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gcmVzb2x2ZSgxKTtcbiAgbGV0IHByb21pc2UyID0gcmVqZWN0KG5ldyBFcnJvcihcIjJcIikpO1xuICBsZXQgcHJvbWlzZTMgPSByZWplY3QobmV3IEVycm9yKFwiM1wiKSk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBDb2RlIGhlcmUgbmV2ZXIgcnVucyBiZWNhdXNlIHRoZXJlIGFyZSByZWplY3RlZCBwcm9taXNlcyFcbiAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAvLyBlcnJvci5tZXNzYWdlID09PSBcIjJcIlxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCBhbGxcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FycmF5fSBlbnRyaWVzIGFycmF5IG9mIHByb21pc2VzXG4gIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGxhYmVsaW5nIHRoZSBwcm9taXNlLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiBhbGwgYHByb21pc2VzYCBoYXZlIGJlZW5cbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuXG4gIEBzdGF0aWNcbiovXG5mdW5jdGlvbiBhbGwoZW50cmllcykge1xuICByZXR1cm4gbmV3IEVudW1lcmF0b3IodGhpcywgZW50cmllcykucHJvbWlzZTtcbn1cblxuLyoqXG4gIGBQcm9taXNlLnJhY2VgIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaCBpcyBzZXR0bGVkIGluIHRoZSBzYW1lIHdheSBhcyB0aGVcbiAgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gc2V0dGxlLlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZSgncHJvbWlzZSAyJyk7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUHJvbWlzZS5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gcmVzdWx0ID09PSAncHJvbWlzZSAyJyBiZWNhdXNlIGl0IHdhcyByZXNvbHZlZCBiZWZvcmUgcHJvbWlzZTFcbiAgICAvLyB3YXMgcmVzb2x2ZWQuXG4gIH0pO1xuICBgYGBcblxuICBgUHJvbWlzZS5yYWNlYCBpcyBkZXRlcm1pbmlzdGljIGluIHRoYXQgb25seSB0aGUgc3RhdGUgb2YgdGhlIGZpcnN0XG4gIHNldHRsZWQgcHJvbWlzZSBtYXR0ZXJzLiBGb3IgZXhhbXBsZSwgZXZlbiBpZiBvdGhlciBwcm9taXNlcyBnaXZlbiB0byB0aGVcbiAgYHByb21pc2VzYCBhcnJheSBhcmd1bWVudCBhcmUgcmVzb2x2ZWQsIGJ1dCB0aGUgZmlyc3Qgc2V0dGxlZCBwcm9taXNlIGhhc1xuICBiZWNvbWUgcmVqZWN0ZWQgYmVmb3JlIHRoZSBvdGhlciBwcm9taXNlcyBiZWNhbWUgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWRcbiAgcHJvbWlzZSB3aWxsIGJlY29tZSByZWplY3RlZDpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZSgncHJvbWlzZSAxJyk7XG4gICAgfSwgMjAwKTtcbiAgfSk7XG5cbiAgbGV0IHByb21pc2UyID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdwcm9taXNlIDInKSk7XG4gICAgfSwgMTAwKTtcbiAgfSk7XG5cbiAgUHJvbWlzZS5yYWNlKFtwcm9taXNlMSwgcHJvbWlzZTJdKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnNcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyByZWFzb24ubWVzc2FnZSA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBwcm9taXNlIDIgYmVjYW1lIHJlamVjdGVkIGJlZm9yZVxuICAgIC8vIHByb21pc2UgMSBiZWNhbWUgZnVsZmlsbGVkXG4gIH0pO1xuICBgYGBcblxuICBBbiBleGFtcGxlIHJlYWwtd29ybGQgdXNlIGNhc2UgaXMgaW1wbGVtZW50aW5nIHRpbWVvdXRzOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgUHJvbWlzZS5yYWNlKFthamF4KCdmb28uanNvbicpLCB0aW1lb3V0KDUwMDApXSlcbiAgYGBgXG5cbiAgQG1ldGhvZCByYWNlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gcHJvbWlzZXMgYXJyYXkgb2YgcHJvbWlzZXMgdG8gb2JzZXJ2ZVxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB3aGljaCBzZXR0bGVzIGluIHRoZSBzYW1lIHdheSBhcyB0aGUgZmlyc3QgcGFzc2VkXG4gIHByb21pc2UgdG8gc2V0dGxlLlxuKi9cbmZ1bmN0aW9uIHJhY2UoZW50cmllcykge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gIGlmICghaXNBcnJheShlbnRyaWVzKSkge1xuICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gKF8sIHJlamVjdCkge1xuICAgICAgcmV0dXJuIHJlamVjdChuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuJykpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIGxlbmd0aCA9IGVudHJpZXMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBDb25zdHJ1Y3Rvci5yZXNvbHZlKGVudHJpZXNbaV0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAgYFByb21pc2UucmVqZWN0YCByZXR1cm5zIGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBwYXNzZWQgYHJlYXNvbmAuXG4gIEl0IGlzIHNob3J0aGFuZCBmb3IgdGhlIGZvbGxvd2luZzpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICByZWplY3QobmV3IEVycm9yKCdXSE9PUFMnKSk7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlIGFib3ZlLCB5b3VyIGNvZGUgbm93IHNpbXBseSBiZWNvbWVzIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSl7XG4gICAgLy8gQ29kZSBoZXJlIGRvZXNuJ3QgcnVuIGJlY2F1c2UgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQhXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdXSE9PUFMnXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJlamVjdFxuICBAc3RhdGljXG4gIEBwYXJhbSB7QW55fSByZWFzb24gdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGguXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHJlamVjdGVkIHdpdGggdGhlIGdpdmVuIGByZWFzb25gLlxuKi9cbmZ1bmN0aW9uIHJlamVjdCQxKHJlYXNvbikge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcbiAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG5mdW5jdGlvbiBuZWVkc1Jlc29sdmVyKCkge1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG59XG5cbmZ1bmN0aW9uIG5lZWRzTmV3KCkge1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO1xufVxuXG4vKipcbiAgUHJvbWlzZSBvYmplY3RzIHJlcHJlc2VudCB0aGUgZXZlbnR1YWwgcmVzdWx0IG9mIGFuIGFzeW5jaHJvbm91cyBvcGVyYXRpb24uIFRoZVxuICBwcmltYXJ5IHdheSBvZiBpbnRlcmFjdGluZyB3aXRoIGEgcHJvbWlzZSBpcyB0aHJvdWdoIGl0cyBgdGhlbmAgbWV0aG9kLCB3aGljaFxuICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgd2h5IHRoZSBwcm9taXNlIGNhbm5vdCBiZSBmdWxmaWxsZWQuXG5cbiAgVGVybWlub2xvZ3lcbiAgLS0tLS0tLS0tLS1cblxuICAtIGBwcm9taXNlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gd2l0aCBhIGB0aGVuYCBtZXRob2Qgd2hvc2UgYmVoYXZpb3IgY29uZm9ybXMgdG8gdGhpcyBzcGVjaWZpY2F0aW9uLlxuICAtIGB0aGVuYWJsZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHRoYXQgZGVmaW5lcyBhIGB0aGVuYCBtZXRob2QuXG4gIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgLSBgZXhjZXB0aW9uYCBpcyBhIHZhbHVlIHRoYXQgaXMgdGhyb3duIHVzaW5nIHRoZSB0aHJvdyBzdGF0ZW1lbnQuXG4gIC0gYHJlYXNvbmAgaXMgYSB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aHkgYSBwcm9taXNlIHdhcyByZWplY3RlZC5cbiAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgQSBwcm9taXNlIGNhbiBiZSBpbiBvbmUgb2YgdGhyZWUgc3RhdGVzOiBwZW5kaW5nLCBmdWxmaWxsZWQsIG9yIHJlamVjdGVkLlxuXG4gIFByb21pc2VzIHRoYXQgYXJlIGZ1bGZpbGxlZCBoYXZlIGEgZnVsZmlsbG1lbnQgdmFsdWUgYW5kIGFyZSBpbiB0aGUgZnVsZmlsbGVkXG4gIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgcmVqZWN0ZWQgc3RhdGUuICBBIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5ldmVyIGEgdGhlbmFibGUuXG5cbiAgUHJvbWlzZXMgY2FuIGFsc28gYmUgc2FpZCB0byAqcmVzb2x2ZSogYSB2YWx1ZS4gIElmIHRoaXMgdmFsdWUgaXMgYWxzbyBhXG4gIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgc2V0dGxlZCBzdGF0ZS4gIFNvIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgcmVqZWN0cyB3aWxsXG4gIGl0c2VsZiByZWplY3QsIGFuZCBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IGZ1bGZpbGxzIHdpbGxcbiAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICBCYXNpYyBVc2FnZTpcbiAgLS0tLS0tLS0tLS0tXG5cbiAgYGBganNcbiAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAvLyBvbiBzdWNjZXNzXG4gICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAvLyBvbiBmYWlsdXJlXG4gICAgcmVqZWN0KHJlYXNvbik7XG4gIH0pO1xuXG4gIHByb21pc2UudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgQWR2YW5jZWQgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLS0tLVxuXG4gIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgYFhNTEh0dHBSZXF1ZXN0YHMuXG5cbiAgYGBganNcbiAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICAgIGxldCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlcjtcbiAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnanNvbic7XG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgIHhoci5zZW5kKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgIGlmICh0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICByZXNvbHZlKHRoaXMucmVzcG9uc2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdnZXRKU09OOiBgJyArIHVybCArICdgIGZhaWxlZCB3aXRoIHN0YXR1czogWycgKyB0aGlzLnN0YXR1cyArICddJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEpTT04oJy9wb3N0cy5qc29uJykudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgLy8gb24gcmVqZWN0aW9uXG4gIH0pO1xuICBgYGBcblxuICBVbmxpa2UgY2FsbGJhY2tzLCBwcm9taXNlcyBhcmUgZ3JlYXQgY29tcG9zYWJsZSBwcmltaXRpdmVzLlxuXG4gIGBgYGpzXG4gIFByb21pc2UuYWxsKFtcbiAgICBnZXRKU09OKCcvcG9zdHMnKSxcbiAgICBnZXRKU09OKCcvY29tbWVudHMnKVxuICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgdmFsdWVzWzBdIC8vID0+IHBvc3RzSlNPTlxuICAgIHZhbHVlc1sxXSAvLyA9PiBjb21tZW50c0pTT05cblxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH0pO1xuICBgYGBcblxuICBAY2xhc3MgUHJvbWlzZVxuICBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlclxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEBjb25zdHJ1Y3RvclxuKi9cblxudmFyIFByb21pc2UkMSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gUHJvbWlzZShyZXNvbHZlcikge1xuICAgIHRoaXNbUFJPTUlTRV9JRF0gPSBuZXh0SWQoKTtcbiAgICB0aGlzLl9yZXN1bHQgPSB0aGlzLl9zdGF0ZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9zdWJzY3JpYmVycyA9IFtdO1xuXG4gICAgaWYgKG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICB0eXBlb2YgcmVzb2x2ZXIgIT09ICdmdW5jdGlvbicgJiYgbmVlZHNSZXNvbHZlcigpO1xuICAgICAgdGhpcyBpbnN0YW5jZW9mIFByb21pc2UgPyBpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcikgOiBuZWVkc05ldygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICBUaGUgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCxcbiAgd2hpY2ggcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGVcbiAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgIC8vIHVzZXIgaXMgYXZhaWxhYmxlXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgfSk7XG4gIGBgYFxuICAgQ2hhaW5pbmdcbiAgLS0tLS0tLS1cbiAgIFRoZSByZXR1cm4gdmFsdWUgb2YgYHRoZW5gIGlzIGl0c2VsZiBhIHByb21pc2UuICBUaGlzIHNlY29uZCwgJ2Rvd25zdHJlYW0nXG4gIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmaXJzdCBwcm9taXNlJ3MgZnVsZmlsbG1lbnRcbiAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG4gICBgYGBqc1xuICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICByZXR1cm4gdXNlci5uYW1lO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICB9KS50aGVuKGZ1bmN0aW9uICh1c2VyTmFtZSkge1xuICAgIC8vIElmIGBmaW5kVXNlcmAgZnVsZmlsbGVkLCBgdXNlck5hbWVgIHdpbGwgYmUgdGhlIHVzZXIncyBuYW1lLCBvdGhlcndpc2UgaXRcbiAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgfSk7XG4gICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jyk7XG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAvLyBpZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHJlYXNvbmAgd2lsbCBiZSAnRm91bmQgdXNlciwgYnV0IHN0aWxsIHVuaGFwcHknLlxuICAgIC8vIElmIGBmaW5kVXNlcmAgcmVqZWN0ZWQsIGByZWFzb25gIHdpbGwgYmUgJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknLlxuICB9KTtcbiAgYGBgXG4gIElmIHRoZSBkb3duc3RyZWFtIHByb21pc2UgZG9lcyBub3Qgc3BlY2lmeSBhIHJlamVjdGlvbiBoYW5kbGVyLCByZWplY3Rpb24gcmVhc29ucyB3aWxsIGJlIHByb3BhZ2F0ZWQgZnVydGhlciBkb3duc3RyZWFtLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICB9KS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICB9KTtcbiAgYGBgXG4gICBBc3NpbWlsYXRpb25cbiAgLS0tLS0tLS0tLS0tXG4gICBTb21ldGltZXMgdGhlIHZhbHVlIHlvdSB3YW50IHRvIHByb3BhZ2F0ZSB0byBhIGRvd25zdHJlYW0gcHJvbWlzZSBjYW4gb25seSBiZVxuICByZXRyaWV2ZWQgYXN5bmNocm9ub3VzbHkuIFRoaXMgY2FuIGJlIGFjaGlldmVkIGJ5IHJldHVybmluZyBhIHByb21pc2UgaW4gdGhlXG4gIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gIHVudGlsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIHNldHRsZWQuIFRoaXMgaXMgY2FsbGVkICphc3NpbWlsYXRpb24qLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIFRoZSB1c2VyJ3MgY29tbWVudHMgYXJlIG5vdyBhdmFpbGFibGVcbiAgfSk7XG4gIGBgYFxuICAgSWYgdGhlIGFzc2ltbGlhdGVkIHByb21pc2UgcmVqZWN0cywgdGhlbiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgYWxzbyByZWplY3QuXG4gICBgYGBqc1xuICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKGNvbW1lbnRzKSB7XG4gICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCBmdWxmaWxscywgd2UnbGwgaGF2ZSB0aGUgdmFsdWUgaGVyZVxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gSWYgYGZpbmRDb21tZW50c0J5QXV0aG9yYCByZWplY3RzLCB3ZSdsbCBoYXZlIHRoZSByZWFzb24gaGVyZVxuICB9KTtcbiAgYGBgXG4gICBTaW1wbGUgRXhhbXBsZVxuICAtLS0tLS0tLS0tLS0tLVxuICAgU3luY2hyb25vdXMgRXhhbXBsZVxuICAgYGBgamF2YXNjcmlwdFxuICBsZXQgcmVzdWx0O1xuICAgdHJ5IHtcbiAgICByZXN1bHQgPSBmaW5kUmVzdWx0KCk7XG4gICAgLy8gc3VjY2Vzc1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAgIC8vIGZhaWx1cmVcbiAgfVxuICBgYGBcbiAgIEVycmJhY2sgRXhhbXBsZVxuICAgYGBganNcbiAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgLy8gc3VjY2Vzc1xuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIGZhaWx1cmVcbiAgfSk7XG4gIGBgYFxuICAgQWR2YW5jZWQgRXhhbXBsZVxuICAtLS0tLS0tLS0tLS0tLVxuICAgU3luY2hyb25vdXMgRXhhbXBsZVxuICAgYGBgamF2YXNjcmlwdFxuICBsZXQgYXV0aG9yLCBib29rcztcbiAgIHRyeSB7XG4gICAgYXV0aG9yID0gZmluZEF1dGhvcigpO1xuICAgIGJvb2tzICA9IGZpbmRCb29rc0J5QXV0aG9yKGF1dGhvcik7XG4gICAgLy8gc3VjY2Vzc1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAgIC8vIGZhaWx1cmVcbiAgfVxuICBgYGBcbiAgIEVycmJhY2sgRXhhbXBsZVxuICAgYGBganNcbiAgIGZ1bmN0aW9uIGZvdW5kQm9va3MoYm9va3MpIHtcbiAgIH1cbiAgIGZ1bmN0aW9uIGZhaWx1cmUocmVhc29uKSB7XG4gICB9XG4gICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBmYWlsdXJlKGVycik7XG4gICAgICAvLyBmYWlsdXJlXG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGZvdW5kQm9va3MoYm9va3MpO1xuICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgZmFpbHVyZShyZWFzb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgIH1cbiAgICAgIC8vIHN1Y2Nlc3NcbiAgICB9XG4gIH0pO1xuICBgYGBcbiAgIFByb21pc2UgRXhhbXBsZTtcbiAgIGBgYGphdmFzY3JpcHRcbiAgZmluZEF1dGhvcigpLlxuICAgIHRoZW4oZmluZEJvb2tzQnlBdXRob3IpLlxuICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgLy8gZm91bmQgYm9va3NcbiAgfSkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9KTtcbiAgYGBgXG4gICBAbWV0aG9kIHRoZW5cbiAgQHBhcmFtIHtGdW5jdGlvbn0gb25GdWxmaWxsZWRcbiAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cbiAgLyoqXG4gIGBjYXRjaGAgaXMgc2ltcGx5IHN1Z2FyIGZvciBgdGhlbih1bmRlZmluZWQsIG9uUmVqZWN0aW9uKWAgd2hpY2ggbWFrZXMgaXQgdGhlIHNhbWVcbiAgYXMgdGhlIGNhdGNoIGJsb2NrIG9mIGEgdHJ5L2NhdGNoIHN0YXRlbWVudC5cbiAgYGBganNcbiAgZnVuY3Rpb24gZmluZEF1dGhvcigpe1xuICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkbid0IGZpbmQgdGhhdCBhdXRob3InKTtcbiAgfVxuICAvLyBzeW5jaHJvbm91c1xuICB0cnkge1xuICBmaW5kQXV0aG9yKCk7XG4gIH0gY2F0Y2gocmVhc29uKSB7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH1cbiAgLy8gYXN5bmMgd2l0aCBwcm9taXNlc1xuICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICBAbWV0aG9kIGNhdGNoXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0aW9uXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmNhdGNoID0gZnVuY3Rpb24gX2NhdGNoKG9uUmVqZWN0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gIH07XG5cbiAgLyoqXG4gICAgYGZpbmFsbHlgIHdpbGwgYmUgaW52b2tlZCByZWdhcmRsZXNzIG9mIHRoZSBwcm9taXNlJ3MgZmF0ZSBqdXN0IGFzIG5hdGl2ZVxuICAgIHRyeS9jYXRjaC9maW5hbGx5IGJlaGF2ZXNcbiAgXG4gICAgU3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkge1xuICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPiAwLjUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEF1dGhvcigpO1xuICAgIH1cbiAgXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmaW5kQXV0aG9yKCk7IC8vIHN1Y2NlZWQgb3IgZmFpbFxuICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gYWx3YXlzIHJ1bnNcbiAgICAgIC8vIGRvZXNuJ3QgYWZmZWN0IHRoZSByZXR1cm4gdmFsdWVcbiAgICB9XG4gICAgYGBgXG4gIFxuICAgIEFzeW5jaHJvbm91cyBleGFtcGxlOlxuICBcbiAgICBgYGBqc1xuICAgIGZpbmRBdXRob3IoKS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgcmV0dXJuIGZpbmRPdGhlckF1dGhlcigpO1xuICAgIH0pLmZpbmFsbHkoZnVuY3Rpb24oKXtcbiAgICAgIC8vIGF1dGhvciB3YXMgZWl0aGVyIGZvdW5kLCBvciBub3RcbiAgICB9KTtcbiAgICBgYGBcbiAgXG4gICAgQG1ldGhvZCBmaW5hbGx5XG4gICAgQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG5cbiAgUHJvbWlzZS5wcm90b3R5cGUuZmluYWxseSA9IGZ1bmN0aW9uIF9maW5hbGx5KGNhbGxiYWNrKSB7XG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xuICAgIHZhciBjb25zdHJ1Y3RvciA9IHByb21pc2UuY29uc3RydWN0b3I7XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZXNvbHZlKGNhbGxiYWNrKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIHJldHVybiBjb25zdHJ1Y3Rvci5yZXNvbHZlKGNhbGxiYWNrKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRocm93IHJlYXNvbjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKGNhbGxiYWNrLCBjYWxsYmFjayk7XG4gIH07XG5cbiAgcmV0dXJuIFByb21pc2U7XG59KCk7XG5cblByb21pc2UkMS5wcm90b3R5cGUudGhlbiA9IHRoZW47XG5Qcm9taXNlJDEuYWxsID0gYWxsO1xuUHJvbWlzZSQxLnJhY2UgPSByYWNlO1xuUHJvbWlzZSQxLnJlc29sdmUgPSByZXNvbHZlJDE7XG5Qcm9taXNlJDEucmVqZWN0ID0gcmVqZWN0JDE7XG5Qcm9taXNlJDEuX3NldFNjaGVkdWxlciA9IHNldFNjaGVkdWxlcjtcblByb21pc2UkMS5fc2V0QXNhcCA9IHNldEFzYXA7XG5Qcm9taXNlJDEuX2FzYXAgPSBhc2FwO1xuXG4vKmdsb2JhbCBzZWxmKi9cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICB2YXIgbG9jYWwgPSB2b2lkIDA7XG5cbiAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBnbG9iYWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBzZWxmO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBsb2NhbCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb2x5ZmlsbCBmYWlsZWQgYmVjYXVzZSBnbG9iYWwgb2JqZWN0IGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnQnKTtcbiAgICB9XG4gIH1cblxuICB2YXIgUCA9IGxvY2FsLlByb21pc2U7XG5cbiAgaWYgKFApIHtcbiAgICB2YXIgcHJvbWlzZVRvU3RyaW5nID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgcHJvbWlzZVRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFAucmVzb2x2ZSgpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBzaWxlbnRseSBpZ25vcmVkXG4gICAgfVxuXG4gICAgaWYgKHByb21pc2VUb1N0cmluZyA9PT0gJ1tvYmplY3QgUHJvbWlzZV0nICYmICFQLmNhc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBsb2NhbC5Qcm9taXNlID0gUHJvbWlzZSQxO1xufVxuXG4vLyBTdHJhbmdlIGNvbXBhdC4uXG5Qcm9taXNlJDEucG9seWZpbGwgPSBwb2x5ZmlsbDtcblByb21pc2UkMS5Qcm9taXNlID0gUHJvbWlzZSQxO1xuXG5yZXR1cm4gUHJvbWlzZSQxO1xuXG59KSkpO1xuXG5cblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXM2LXByb21pc2UubWFwXG4iLCIvLyB0aGUgd2hhdHdnLWZldGNoIHBvbHlmaWxsIGluc3RhbGxzIHRoZSBmZXRjaCgpIGZ1bmN0aW9uXG4vLyBvbiB0aGUgZ2xvYmFsIG9iamVjdCAod2luZG93IG9yIHNlbGYpXG4vL1xuLy8gUmV0dXJuIHRoYXQgYXMgdGhlIGV4cG9ydCBmb3IgdXNlIGluIFdlYnBhY2ssIEJyb3dzZXJpZnkgZXRjLlxucmVxdWlyZSgnd2hhdHdnLWZldGNoJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHNlbGYuZmV0Y2guYmluZChzZWxmKTtcbiIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5vYmplY3RQYXRoID0gZmFjdG9yeSgpO1xuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgaWYob2JqID09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvL3RvIGhhbmRsZSBvYmplY3RzIHdpdGggbnVsbCBwcm90b3R5cGVzICh0b28gZWRnZSBjYXNlPylcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcClcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpe1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKXtcbiAgICByZXR1cm4gdG9TdHIuY2FsbCh0eXBlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHRvU3RyaW5nKG9iaikgPT09IFwiW29iamVjdCBPYmplY3RdXCI7XG4gIH1cblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKXtcbiAgICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gICAgcmV0dXJuIHRvU3RyLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQm9vbGVhbihvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0S2V5KGtleSl7XG4gICAgdmFyIGludEtleSA9IHBhcnNlSW50KGtleSk7XG4gICAgaWYgKGludEtleS50b1N0cmluZygpID09PSBrZXkpIHtcbiAgICAgIHJldHVybiBpbnRLZXk7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBmYWN0b3J5KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuXG4gICAgdmFyIG9iamVjdFBhdGggPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3RQYXRoKS5yZWR1Y2UoZnVuY3Rpb24ocHJveHksIHByb3ApIHtcbiAgICAgICAgaWYocHJvcCA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICByZXR1cm4gcHJveHk7XG4gICAgICAgIH1cblxuICAgICAgICAvKmlzdGFuYnVsIGlnbm9yZSBlbHNlKi9cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3RQYXRoW3Byb3BdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgcHJveHlbcHJvcF0gPSBvYmplY3RQYXRoW3Byb3BdLmJpbmQob2JqZWN0UGF0aCwgb2JqKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgIH0sIHt9KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkge1xuICAgICAgcmV0dXJuIChvcHRpb25zLmluY2x1ZGVJbmhlcml0ZWRQcm9wcyB8fCAodHlwZW9mIHByb3AgPT09ICdudW1iZXInICYmIEFycmF5LmlzQXJyYXkob2JqKSkgfHwgaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KG9iaiwgcHJvcCkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLm1hcChnZXRLZXkpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IHBhdGhbMF07XG4gICAgICB2YXIgY3VycmVudFZhbHVlID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCB8fCAhZG9Ob3RSZXBsYWNlKSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjdXJyZW50VmFsdWUgPT09IHZvaWQgMCkge1xuICAgICAgICAvL2NoZWNrIGlmIHdlIGFzc3VtZSBhbiBhcnJheVxuICAgICAgICBpZih0eXBlb2YgcGF0aFsxXSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JqW2N1cnJlbnRQYXRoXSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZXQob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfVxuXG4gICAgb2JqZWN0UGF0aC5oYXMgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICBwYXRoID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuICEhb2JqO1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGogPSBnZXRLZXkocGF0aFtpXSk7XG5cbiAgICAgICAgaWYoKHR5cGVvZiBqID09PSAnbnVtYmVyJyAmJiBpc0FycmF5KG9iaikgJiYgaiA8IG9iai5sZW5ndGgpIHx8XG4gICAgICAgICAgKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzID8gKGogaW4gT2JqZWN0KG9iaikpIDogaGFzT3duUHJvcGVydHkob2JqLCBqKSkpIHtcbiAgICAgICAgICBvYmogPSBvYmpbal07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVuc3VyZUV4aXN0cyA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguaW5zZXJ0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUsIGF0KXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgYXQgPSB+fmF0O1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cbiAgICAgIGFyci5zcGxpY2UoYXQsIDAsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5lbXB0eSA9IGZ1bmN0aW9uKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuXG4gICAgICB2YXIgdmFsdWUsIGk7XG4gICAgICBpZiAoISh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCkpKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsICcnKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgMCk7XG4gICAgICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHZhbHVlLmxlbmd0aCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgICAgICBmb3IgKGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICBpZiAoaGFzU2hhbGxvd1Byb3BlcnR5KHZhbHVlLCBpKSkge1xuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgbnVsbCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGgucHVzaCA9IGZ1bmN0aW9uIChvYmosIHBhdGggLyosIHZhbHVlcyAqLyl7XG4gICAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICAgIGFyciA9IFtdO1xuICAgICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgICB9XG5cbiAgICAgIGFyci5wdXNoLmFwcGx5KGFyciwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguY29hbGVzY2UgPSBmdW5jdGlvbiAob2JqLCBwYXRocywgZGVmYXVsdFZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoc1tpXSkpICE9PSB2b2lkIDApIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBkZWZhdWx0VmFsdWUpe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLCBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICB2YXIgbmV4dE9iaiA9IGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKVxuICAgICAgaWYgKG5leHRPYmogPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIG5leHRPYmo7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCBkZWZhdWx0VmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmRlbCA9IGZ1bmN0aW9uIGRlbChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZih0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguZGVsKG9iaiwgcGF0aC5zcGxpdCgnLicpKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgICAgaWYgKCFoYXNTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgIG9iai5zcGxpY2UoY3VycmVudFBhdGgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvYmpbY3VycmVudFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqW2N1cnJlbnRQYXRoXSwgcGF0aC5zbGljZSgxKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iamVjdFBhdGg7XG4gIH1cblxuICB2YXIgbW9kID0gZmFjdG9yeSgpO1xuICBtb2QuY3JlYXRlID0gZmFjdG9yeTtcbiAgbW9kLndpdGhJbmhlcml0ZWRQcm9wcyA9IGZhY3Rvcnkoe2luY2x1ZGVJbmhlcml0ZWRQcm9wczogdHJ1ZX0pXG4gIHJldHVybiBtb2Q7XG59KTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKlxuIHJlY3Vyc2l2ZS1pdGVyYXRvciB2Mi4wLjFcbiBodHRwczovL2dpdGh1Yi5jb20vbmVydmdoL3JlY3Vyc2l2ZS1pdGVyYXRvclxuKi9cblxuKGZ1bmN0aW9uIHdlYnBhY2tVbml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHRlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jylcblx0XHRleHBvcnRzW1wiUmVjdXJzaXZlSXRlcmF0b3JcIl0gPSBmYWN0b3J5KCk7XG5cdGVsc2Vcblx0XHRyb290W1wiUmVjdXJzaXZlSXRlcmF0b3JcIl0gPSBmYWN0b3J5KCk7XG59KSh0aGlzLCBmdW5jdGlvbigpIHtcbnJldHVybiAvKioqKioqLyAoZnVuY3Rpb24obW9kdWxlcykgeyAvLyB3ZWJwYWNrQm9vdHN0cmFwXG4vKioqKioqLyBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbi8qKioqKiovIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcbi8qKioqKiovXG4vKioqKioqLyBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4vKioqKioqLyBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcbi8qKioqKiovXG4vKioqKioqLyBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4vKioqKioqLyBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pXG4vKioqKioqLyBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbi8qKioqKiovXG4vKioqKioqLyBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbi8qKioqKiovIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4vKioqKioqLyBcdFx0XHRleHBvcnRzOiB7fSxcbi8qKioqKiovIFx0XHRcdGlkOiBtb2R1bGVJZCxcbi8qKioqKiovIFx0XHRcdGxvYWRlZDogZmFsc2Vcbi8qKioqKiovIFx0XHR9O1xuLyoqKioqKi9cbi8qKioqKiovIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbi8qKioqKiovIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcbi8qKioqKiovXG4vKioqKioqLyBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuLyoqKioqKi8gXHRcdG1vZHVsZS5sb2FkZWQgPSB0cnVlO1xuLyoqKioqKi9cbi8qKioqKiovIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuLyoqKioqKi8gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbi8qKioqKiovIFx0fVxuLyoqKioqKi9cbi8qKioqKiovXG4vKioqKioqLyBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG4vKioqKioqL1xuLyoqKioqKi8gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuLyoqKioqKi9cbi8qKioqKiovIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcbi8qKioqKiovXG4vKioqKioqLyBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuLyoqKioqKi8gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXygwKTtcbi8qKioqKiovIH0pXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKioqKi8gKFtcbi8qIDAgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXykge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXHRcblx0XG5cdHZhciBfdG9Db25zdW1hYmxlQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBBcnJheShhcnIubGVuZ3RoKTsgaSA8IGFyci5sZW5ndGg7IGkrKykgYXJyMltpXSA9IGFycltpXTsgcmV0dXJuIGFycjI7IH0gZWxzZSB7IHJldHVybiBBcnJheS5mcm9tKGFycik7IH0gfTtcblx0XG5cdHZhciBfcHJvdG90eXBlUHJvcGVydGllcyA9IGZ1bmN0aW9uIChjaGlsZCwgc3RhdGljUHJvcHMsIGluc3RhbmNlUHJvcHMpIHsgaWYgKHN0YXRpY1Byb3BzKSBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhjaGlsZCwgc3RhdGljUHJvcHMpOyBpZiAoaW5zdGFuY2VQcm9wcykgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoY2hpbGQucHJvdG90eXBlLCBpbnN0YW5jZVByb3BzKTsgfTtcblx0XG5cdHZhciBfY2xhc3NDYWxsQ2hlY2sgPSBmdW5jdGlvbiAoaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfTtcblx0XG5cdHZhciBfbGFuZyA9IF9fd2VicGFja19yZXF1aXJlX18oMSk7XG5cdFxuXHR2YXIgaXNPYmplY3QgPSBfbGFuZy5pc09iamVjdDtcblx0dmFyIGdldEtleXMgPSBfbGFuZy5nZXRLZXlzO1xuXHRcblx0XG5cdFxuXHQvLyBQUklWQVRFIFBST1BFUlRJRVNcblx0dmFyIEJZUEFTU19NT0RFID0gXCJfX2J5cGFzc01vZGVcIjtcblx0dmFyIElHTk9SRV9DSVJDVUxBUiA9IFwiX19pZ25vcmVDaXJjdWxhclwiO1xuXHR2YXIgTUFYX0RFRVAgPSBcIl9fbWF4RGVlcFwiO1xuXHR2YXIgQ0FDSEUgPSBcIl9fY2FjaGVcIjtcblx0dmFyIFFVRVVFID0gXCJfX3F1ZXVlXCI7XG5cdHZhciBTVEFURSA9IFwiX19zdGF0ZVwiO1xuXHRcblx0XG5cdHZhciBFTVBUWV9TVEFURSA9IHt9O1xuXHRcblx0XG5cdHZhciBSZWN1cnNpdmVJdGVyYXRvciA9IChmdW5jdGlvbiAoKSB7XG5cdCAgICAvKipcblx0ICAgICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSByb290XG5cdCAgICAgKiBAcGFyYW0ge051bWJlcn0gW2J5cGFzc01vZGU9MF1cblx0ICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2lnbm9yZUNpcmN1bGFyPWZhbHNlXVxuXHQgICAgICogQHBhcmFtIHtOdW1iZXJ9IFttYXhEZWVwPTEwMF1cblx0ICAgICAqL1xuXHQgICAgZnVuY3Rpb24gUmVjdXJzaXZlSXRlcmF0b3Iocm9vdCkge1xuXHQgICAgICAgIHZhciBieXBhc3NNb2RlID0gYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyAwIDogYXJndW1lbnRzWzFdO1xuXHQgICAgICAgIHZhciBpZ25vcmVDaXJjdWxhciA9IGFyZ3VtZW50c1syXSA9PT0gdW5kZWZpbmVkID8gZmFsc2UgOiBhcmd1bWVudHNbMl07XG5cdCAgICAgICAgdmFyIG1heERlZXAgPSBhcmd1bWVudHNbM10gPT09IHVuZGVmaW5lZCA/IDEwMCA6IGFyZ3VtZW50c1szXTtcblx0ICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgUmVjdXJzaXZlSXRlcmF0b3IpO1xuXHRcblx0ICAgICAgICB0aGlzW0JZUEFTU19NT0RFXSA9IGJ5cGFzc01vZGU7XG5cdCAgICAgICAgdGhpc1tJR05PUkVfQ0lSQ1VMQVJdID0gaWdub3JlQ2lyY3VsYXI7XG5cdCAgICAgICAgdGhpc1tNQVhfREVFUF0gPSBtYXhEZWVwO1xuXHQgICAgICAgIHRoaXNbQ0FDSEVdID0gW107XG5cdCAgICAgICAgdGhpc1tRVUVVRV0gPSBbXTtcblx0ICAgICAgICB0aGlzW1NUQVRFXSA9IHRoaXMuZ2V0U3RhdGUodW5kZWZpbmVkLCByb290KTtcblx0ICAgICAgICB0aGlzLl9fbWFrZUl0ZXJhYmxlKCk7XG5cdCAgICB9XG5cdFxuXHQgICAgX3Byb3RvdHlwZVByb3BlcnRpZXMoUmVjdXJzaXZlSXRlcmF0b3IsIG51bGwsIHtcblx0ICAgICAgICBuZXh0OiB7XG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIG5leHQoKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgX3JlZiA9IHRoaXNbU1RBVEVdIHx8IEVNUFRZX1NUQVRFO1xuXHQgICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBfcmVmLm5vZGU7XG5cdCAgICAgICAgICAgICAgICB2YXIgcGF0aCA9IF9yZWYucGF0aDtcblx0ICAgICAgICAgICAgICAgIHZhciBkZWVwID0gX3JlZi5kZWVwO1xuXHRcblx0XG5cdCAgICAgICAgICAgICAgICBpZiAodGhpc1tNQVhfREVFUF0gPiBkZWVwKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNOb2RlKG5vZGUpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzQ2lyY3VsYXIobm9kZSkpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzW0lHTk9SRV9DSVJDVUxBUl0pIHt9IGVsc2Uge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNpcmN1bGFyIHJlZmVyZW5jZVwiKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uU3RlcEludG8odGhpc1tTVEFURV0pKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIF9RVUVVRTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGVzY3JpcHRvcnMgPSB0aGlzLmdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWV0aG9kID0gdGhpc1tCWVBBU1NfTU9ERV0gPyBcInB1c2hcIiA6IFwidW5zaGlmdFwiO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChfUVVFVUUgPSB0aGlzW1FVRVVFXSlbbWV0aG9kXS5hcHBseShfUVVFVUUsIF90b0NvbnN1bWFibGVBcnJheShkZXNjcmlwdG9ycykpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbQ0FDSEVdLnB1c2gobm9kZSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICB9XG5cdFxuXHQgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpc1tRVUVVRV0uc2hpZnQoKTtcblx0ICAgICAgICAgICAgICAgIHZhciBkb25lID0gIXZhbHVlO1xuXHRcblx0ICAgICAgICAgICAgICAgIHRoaXNbU1RBVEVdID0gdmFsdWU7XG5cdFxuXHQgICAgICAgICAgICAgICAgaWYgKGRvbmUpIHRoaXMuZGVzdHJveSgpO1xuXHRcblx0ICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB2YWx1ZSwgZG9uZTogZG9uZSB9O1xuXHQgICAgICAgICAgICB9LFxuXHQgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcblx0ICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG5cdCAgICAgICAgfSxcblx0ICAgICAgICBkZXN0cm95OiB7XG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGRlc3Ryb3koKSB7XG5cdCAgICAgICAgICAgICAgICB0aGlzW1FVRVVFXS5sZW5ndGggPSAwO1xuXHQgICAgICAgICAgICAgICAgdGhpc1tDQUNIRV0ubGVuZ3RoID0gMDtcblx0ICAgICAgICAgICAgICAgIHRoaXNbU1RBVEVdID0gbnVsbDtcblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH0sXG5cdCAgICAgICAgaXNOb2RlOiB7XG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKiBAcGFyYW0geyp9IGFueVxuXHQgICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBpc05vZGUoYW55KSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gaXNPYmplY3QoYW55KTtcblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH0sXG5cdCAgICAgICAgaXNMZWFmOiB7XG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKiBAcGFyYW0geyp9IGFueVxuXHQgICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBpc0xlYWYoYW55KSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gIXRoaXMuaXNOb2RlKGFueSk7XG5cdCAgICAgICAgICAgIH0sXG5cdCAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXHQgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcblx0ICAgICAgICB9LFxuXHQgICAgICAgIGlzQ2lyY3VsYXI6IHtcblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gYW55XG5cdCAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGlzQ2lyY3VsYXIoYW55KSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tDQUNIRV0uaW5kZXhPZihhbnkpICE9PSAtMTtcblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH0sXG5cdCAgICAgICAgZ2V0U3RhdGVzT2ZDaGlsZE5vZGVzOiB7XG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKiBSZXR1cm5zIHN0YXRlcyBvZiBjaGlsZCBub2Rlc1xuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXRoXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBkZWVwXG5cdCAgICAgICAgICAgICAqIEByZXR1cm5zIHtBcnJheTxPYmplY3Q+fVxuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGdldFN0YXRlc09mQ2hpbGROb2Rlcyhub2RlLCBwYXRoLCBkZWVwKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGdldEtleXMobm9kZSkubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3RoaXMuZ2V0U3RhdGUobm9kZSwgbm9kZVtrZXldLCBrZXksIHBhdGguY29uY2F0KGtleSksIGRlZXAgKyAxKTtcblx0ICAgICAgICAgICAgICAgIH0pO1xuXHQgICAgICAgICAgICB9LFxuXHQgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcblx0ICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG5cdCAgICAgICAgfSxcblx0ICAgICAgICBnZXRTdGF0ZToge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogUmV0dXJucyBzdGF0ZSBvZiBub2RlLiBDYWxscyBmb3IgZWFjaCBub2RlXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbcGFyZW50XVxuXHQgICAgICAgICAgICAgKiBAcGFyYW0geyp9IFtub2RlXVxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2tleV1cblx0ICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gW3BhdGhdXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbZGVlcF1cblx0ICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdH1cblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRTdGF0ZShwYXJlbnQsIG5vZGUsIGtleSkge1xuXHQgICAgICAgICAgICAgICAgdmFyIHBhdGggPSBhcmd1bWVudHNbM10gPT09IHVuZGVmaW5lZCA/IFtdIDogYXJndW1lbnRzWzNdO1xuXHQgICAgICAgICAgICAgICAgdmFyIGRlZXAgPSBhcmd1bWVudHNbNF0gPT09IHVuZGVmaW5lZCA/IDAgOiBhcmd1bWVudHNbNF07XG5cdCAgICAgICAgICAgICAgICByZXR1cm4geyBwYXJlbnQ6IHBhcmVudCwgbm9kZTogbm9kZSwga2V5OiBrZXksIHBhdGg6IHBhdGgsIGRlZXA6IGRlZXAgfTtcblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH0sXG5cdCAgICAgICAgb25TdGVwSW50bzoge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogQ2FsbGJhY2tcblx0ICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG5cdCAgICAgICAgICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIG9uU3RlcEludG8oc3RhdGUpIHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuXHQgICAgICAgICAgICB9LFxuXHQgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcblx0ICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG5cdCAgICAgICAgfSxcblx0ICAgICAgICBfX21ha2VJdGVyYWJsZToge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogT25seSBmb3IgZXM2XG5cdCAgICAgICAgICAgICAqIEBwcml2YXRlXG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gX19tYWtlSXRlcmFibGUoKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXHQgICAgICAgICAgICAgICAgdHJ5IHtcblx0ICAgICAgICAgICAgICAgICAgICB0aGlzW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcztcblx0ICAgICAgICAgICAgICAgICAgICB9O1xuXHQgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH1cblx0ICAgIH0pO1xuXHRcblx0ICAgIHJldHVybiBSZWN1cnNpdmVJdGVyYXRvcjtcblx0fSkoKTtcblx0XG5cdG1vZHVsZS5leHBvcnRzID0gUmVjdXJzaXZlSXRlcmF0b3I7XG5cdC8vIHNraXBcblxuLyoqKi8gfSxcbi8qIDEgKi9cbi8qKiovIGZ1bmN0aW9uKG1vZHVsZSwgZXhwb3J0cykge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXHQvKipcblx0ICogQHBhcmFtIHsqfSBhbnlcblx0ICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAqL1xuXHRleHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cdC8qKlxuXHQgKiBAcGFyYW0geyp9IGFueVxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICovXG5cdGV4cG9ydHMuaXNBcnJheUxpa2UgPSBpc0FycmF5TGlrZTtcblx0LyoqXG5cdCAqIEBwYXJhbSB7Kn0gYW55XG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cblx0ZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXHQvKipcblx0ICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IG9iamVjdFxuXHQgKiBAcmV0dXJucyB7QXJyYXk8U3RyaW5nPn1cblx0ICovXG5cdGV4cG9ydHMuZ2V0S2V5cyA9IGdldEtleXM7XG5cdGZ1bmN0aW9uIGlzT2JqZWN0KGFueSkge1xuXHQgIHJldHVybiBhbnkgIT09IG51bGwgJiYgdHlwZW9mIGFueSA9PT0gXCJvYmplY3RcIjtcblx0fVxuXHQvKipcblx0ICogQHBhcmFtIHsqfSBhbnlcblx0ICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAqL1xuXHR2YXIgaXNBcnJheSA9IGV4cG9ydHMuaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cdGZ1bmN0aW9uIGlzQXJyYXlMaWtlKGFueSkge1xuXHQgIGlmICghaXNPYmplY3QoYW55KSkge1xuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHQgIH1pZiAoIShcImxlbmd0aFwiIGluIGFueSkpIHtcblx0ICAgIHJldHVybiBmYWxzZTtcblx0ICB9dmFyIGxlbmd0aCA9IGFueS5sZW5ndGg7XG5cdCAgaWYgKCFpc051bWJlcihsZW5ndGgpKSB7XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdCAgfWlmIChsZW5ndGggPiAwKSB7XG5cdCAgICByZXR1cm4gbGVuZ3RoIC0gMSBpbiBhbnk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIGZvciAodmFyIGtleSBpbiBhbnkpIHtcblx0ICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgfVxuXHQgIH1cblx0fWZ1bmN0aW9uIGlzTnVtYmVyKGFueSkge1xuXHQgIHJldHVybiB0eXBlb2YgYW55ID09PSBcIm51bWJlclwiO1xuXHR9ZnVuY3Rpb24gZ2V0S2V5cyhvYmplY3QpIHtcblx0ICB2YXIga2V5c18gPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuXHQgIGlmIChpc0FycmF5KG9iamVjdCkpIHt9IGVsc2UgaWYgKGlzQXJyYXlMaWtlKG9iamVjdCkpIHtcblx0ICAgIHZhciBpbmRleCA9IGtleXNfLmluZGV4T2YoXCJsZW5ndGhcIik7XG5cdCAgICBpZiAoaW5kZXggPiAtMSkge1xuXHQgICAgICBrZXlzXy5zcGxpY2UoaW5kZXgsIDEpO1xuXHQgICAgfVxuXHQgICAgLy8gc2tpcCBzb3J0XG5cdCAgfSBlbHNlIHtcblx0ICAgIC8vIHNvcnRcblx0ICAgIGtleXNfID0ga2V5c18uc29ydCgpO1xuXHQgIH1cblx0ICByZXR1cm4ga2V5c187XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG5cdCAgdmFsdWU6IHRydWVcblx0fSk7XG5cblx0Ly8gc2tpcCBzb3J0XG5cbi8qKiovIH1cbi8qKioqKiovIF0pXG59KTtcbjtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXJlY3Vyc2l2ZS1pdGVyYXRvci5qcy5tYXAiLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgcmF3SGVhZGVycy5zcGxpdCgvXFxyP1xcbi8pLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKS50cmltKClcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKVxuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSAnc3RhdHVzJyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXMgOiAyMDBcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gJ3N0YXR1c1RleHQnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1c1RleHQgOiAnT0snXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy51cmwgPSAncmVzcG9uc2VVUkwnIGluIHhociA/IHhoci5yZXNwb25zZVVSTCA6IG9wdGlvbnMuaGVhZGVycy5nZXQoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiaW1wb3J0IExpc3RJdGVtIGZyb20gJy4vTGlzdEl0ZW0nO1xuaW1wb3J0IHJlY3Vyc2l2ZUl0ZXJhdG9yIGZyb20gJ3JlY3Vyc2l2ZS1pdGVyYXRvcic7XG5pbXBvcnQgb2JqZWN0UGF0aCBmcm9tICdvYmplY3QtcGF0aCc7XG5cbmNsYXNzIERhdGFMaXN0IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBzZXRGaWVsZE1hcChwYXRoLCBldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHtbZXZlbnQudGFyZ2V0LmRhdGFzZXQuZmllbGRdOiBwYXRofSk7XG4gICAgfVxuXG4gICAgcmVuZGVyTm9kZXMoZGF0YSkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZGF0YSkubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGNoaWxkID0gPExpc3RJdGVtIGtleT17aXRlbS50b1N0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlPXtpdGVtfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdD17ZGF0YVtpdGVtXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE1hcD17dGhpcy5wcm9wcy5maWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGFpbmVyPXtlID0+IHRoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXS5vYmplY3RQYXRoLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrVGl0bGU9e2UgPT4gdGhpcy5zZXRGaWVsZE1hcChkYXRhW2l0ZW1dLCBlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrQ29udGVudD17ZSA9PiB0aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uPXt0aGlzLnByb3BzLnRyYW5zbGF0aW9ufS8+O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRhdGFbaXRlbV0gPT09ICdvYmplY3QnICYmIGRhdGFbaXRlbV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IFJlYWN0LmNsb25lRWxlbWVudChjaGlsZCwge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogQXJyYXkuaXNBcnJheShkYXRhW2l0ZW1dKSA/IHRoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiB0aGlzLnJlbmRlck5vZGVzKGRhdGFbaXRlbV0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zdCB7dHJhbnNsYXRpb24sIGRhdGF9ID0gdGhpcy5wcm9wcztcbiAgICAgICAgY29uc3QgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmllbGRNYXAuaXRlbUNvbnRhaW5lciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gZGF0YVswXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yIChsZXQge3BhcmVudCwgbm9kZSwga2V5LCBwYXRofSBvZiBuZXcgcmVjdXJzaXZlSXRlcmF0b3IoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0UGF0aC5zZXQoZGF0YSwgcGF0aFN0cmluZyArICcub2JqZWN0UGF0aCcsIHBhdGhTdHJpbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICA8aDM+e3RyYW5zbGF0aW9uLnNlbGVjdEl0ZW1zQ29udGFpbmVyfTwvaDM+XG4gICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJqc29uLXRyZWVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHt0aGlzLnJlbmRlck5vZGVzKGRhdGEpfVxuICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBvYmplY3REYXRhID0gb2JqZWN0UGF0aC5nZXQoZGF0YSwgZmllbGRNYXAuaXRlbUNvbnRhaW5lcik7XG5cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0RGF0YSA9IG9iamVjdERhdGFbMF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAobGV0IHtwYXJlbnQsIG5vZGUsIGtleSwgcGF0aH0gb2YgbmV3IHJlY3Vyc2l2ZUl0ZXJhdG9yKG9iamVjdERhdGEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBub2RlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RQYXRoLnNldChvYmplY3REYXRhLCBwYXRoU3RyaW5nLCBwYXRoU3RyaW5nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPGgzPnt0cmFuc2xhdGlvbi5zZWxlY3RUaXRsZUNvbnRlbnR9PC9oMz5cbiAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzTmFtZT1cImpzb24tdHJlZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAge3RoaXMucmVuZGVyTm9kZXMob2JqZWN0RGF0YSl9XG4gICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBEYXRhTGlzdDsiLCJpbXBvcnQgRGF0YUxpc3QgZnJvbSAnLi9EYXRhTGlzdCc7XG5pbXBvcnQgZ2V0QXBpRGF0YSBmcm9tICcuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YSc7XG5cbmNsYXNzIEZpZWxkU2VsZWN0aW9uIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcbiAgICBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgICAgdGhpcy5nZXREYXRhKCk7XG4gICAgfVxuXG4gICAgZ2V0RGF0YSgpIHtcbiAgICAgICAgY29uc3Qge3VybCwgdHJhbnNsYXRpb259ID0gdGhpcy5wcm9wcztcbiAgICAgICAgZ2V0QXBpRGF0YSh1cmwpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgICAoe3Jlc3VsdH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgT2JqZWN0LmtleXMocmVzdWx0KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvcHMuc2V0RXJyb3IoRXJyb3IodHJhbnNsYXRpb24uY291bGROb3RGZXRjaCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wcy5zZXRMb2FkZWQodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wcy5zZXRJdGVtcyhyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb3BzLnNldExvYWRlZCh0cnVlKTtcbiAgICAgICAgICAgICAgICB9LCAoe2Vycm9yfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb3BzLnNldExvYWRlZCh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wcy5zZXRFcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgICB0aGlzLnByb3BzLnVwZGF0ZUZpZWxkTWFwKHZhbHVlKTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHt1cmwsIGVycm9yLCBmaWVsZE1hcCwgdHJhbnNsYXRpb24sIGlzTG9hZGVkLCBpdGVtc30gPSB0aGlzLnByb3BzO1xuXG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwibm90aWNlIG5vdGljZS1lcnJvciBpbmxpbmVcIj48cD57ZXJyb3IubWVzc2FnZX08L3A+PC9kaXY+O1xuICAgICAgICB9IGVsc2UgaWYgKCFpc0xvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwic3Bpbm5lciBpcy1hY3RpdmVcIj48L2Rpdj47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxEYXRhTGlzdFxuICAgICAgICAgICAgICAgICAgICBkYXRhPXtpdGVtc31cbiAgICAgICAgICAgICAgICAgICAgdXJsPXt1cmx9XG4gICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXtmaWVsZE1hcH1cbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb249e3RyYW5zbGF0aW9ufVxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGaWVsZFNlbGVjdGlvbjsiLCJjb25zdCBJbnB1dEZpZWxkcyA9ICh7ZmllbGRNYXAsIHVybH0pID0+XG4gICAgPGRpdj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX3VybFwiIHZhbHVlPXt1cmx9Lz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibW9kX2pzb25fcmVuZGVyX2ZpZWxkbWFwXCIgdmFsdWU9e0pTT04uc3RyaW5naWZ5KGZpZWxkTWFwKX0vPlxuICAgIDwvZGl2PjtcblxuZXhwb3J0IGRlZmF1bHQgSW5wdXRGaWVsZHM7IiwiY29uc3QgTGlzdEl0ZW0gPSAoe3ZhbHVlLCBjaGlsZHJlbiwgZmllbGRNYXAsIG9iamVjdCwgb25DbGlja1RpdGxlLCBvbkNsaWNrQ29udGVudCwgb25DbGlja0NvbnRhaW5lciwgdHJhbnNsYXRpb259KSA9PiB7XG4gICAgaWYgKGNoaWxkcmVuKSB7XG4gICAgICAgIHJldHVybiAoPGxpPlxuICAgICAgICAgICAge0FycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsID9cbiAgICAgICAgICAgICAgICA8c3Bhbj48c3BhbiBjbGFzc05hbWU9XCJkYXNoaWNvbnMgZGFzaGljb25zLXBvcnRmb2xpb1wiPjwvc3Bhbj4ge3ZhbHVlfSA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cIml0ZW1Db250YWluZXJcIiBvbkNsaWNrPXtvbkNsaWNrQ29udGFpbmVyfT57dHJhbnNsYXRpb24uc2VsZWN0fTwvYT48L3NwYW4+IDogIDxzcGFuPnt2YWx1ZX08L3NwYW4+fVxuICAgICAgICAgICAgPHVsPntjaGlsZHJlbn08L3VsPlxuICAgICAgICA8L2xpPik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICg8bGk+XG4gICAgICAgICAgICB7ZmllbGRNYXAudGl0bGUgPT09IG9iamVjdCAmJiBmaWVsZE1hcC50aXRsZSA/IDxzdHJvbmc+e3RyYW5zbGF0aW9uLnRpdGxlfTogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgICAgICB7ZmllbGRNYXAuY29udGVudCA9PT0gb2JqZWN0ICYmIGZpZWxkTWFwLmNvbnRlbnQgPyA8c3Ryb25nPnt0cmFuc2xhdGlvbi5jb250ZW50fTogPC9zdHJvbmc+IDogJyd9XG4gICAgICAgICAgICA8c3Bhbj57dmFsdWV9PC9zcGFuPlxuICAgICAgICAgICAgeyFmaWVsZE1hcC50aXRsZSAmJiAoZmllbGRNYXAuY29udGVudCAhPT0gb2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cInRpdGxlXCIgb25DbGljaz17b25DbGlja1RpdGxlfT57dHJhbnNsYXRpb24udGl0bGV9PC9hPiA6ICcnfVxuICAgICAgICAgICAgeyFmaWVsZE1hcC5jb250ZW50ICYmIChmaWVsZE1hcC50aXRsZSAhPT0gb2JqZWN0KSAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID9cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzTmFtZT1cInRyZWUtc2VsZWN0XCIgZGF0YS1maWVsZD1cImNvbnRlbnRcIiBvbkNsaWNrPXtvbkNsaWNrQ29udGVudH0+e3RyYW5zbGF0aW9uLmNvbnRlbnR9PC9hPiA6ICcnfVxuICAgICAgICA8L2xpPik7XG4gICAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgTGlzdEl0ZW07IiwiaW1wb3J0IEZpZWxkU2VsZWN0aW9uIGZyb20gJy4vRmllbGRTZWxlY3Rpb24nO1xuaW1wb3J0IElucHV0RmllbGRzIGZyb20gJy4vSW5wdXRGaWVsZHMnO1xuaW1wb3J0IFN1bW1hcnkgZnJvbSAnLi9TdW1tYXJ5JztcblxuY2xhc3MgU2V0dGluZ3MgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICB1cmw6ICcnLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6IG51bGwsXG4gICAgICAgICAgICBpdGVtczogW10sXG4gICAgICAgICAgICBmaWVsZE1hcDoge1xuICAgICAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICAgIHRoaXMuaW5pdE9wdGlvbnMoKTtcbiAgICB9XG5cbiAgICBpbml0T3B0aW9ucygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2RKc29uUmVuZGVyLm9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gbW9kSnNvblJlbmRlci5vcHRpb25zO1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgICAgICAgICAgdXJsOiBvcHRpb25zLnVybCA/IG9wdGlvbnMudXJsIDogJycsXG4gICAgICAgICAgICAgICAgZmllbGRNYXA6IG9wdGlvbnMuZmllbGRNYXAgPyBKU09OLnBhcnNlKG9wdGlvbnMuZmllbGRNYXApIDoge1xuICAgICAgICAgICAgICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6ICcnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93RmllbGRTZWxlY3Rpb246ICEhb3B0aW9ucy51cmxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdXJsQ2hhbmdlKGV2ZW50KSB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3VybDogZXZlbnQudGFyZ2V0LnZhbHVlfSk7XG4gICAgfVxuXG4gICAgaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe3Nob3dGaWVsZFNlbGVjdGlvbjogdHJ1ZX0pO1xuICAgIH1cblxuICAgIHJlc2V0T3B0aW9ucyhldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLCB1cmw6ICcnLCBmaWVsZE1hcDoge2l0ZW1Db250YWluZXI6IG51bGwsIHRpdGxlOiAnJywgY29udGVudDogJyd9fSk7XG4gICAgfVxuXG4gICAgdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgICAgY29uc3QgbmV3VmFsID0gT2JqZWN0LmFzc2lnbih0aGlzLnN0YXRlLmZpZWxkTWFwLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpZWxkTWFwOiBuZXdWYWx9KTtcbiAgICB9XG5cbiAgICBzZXRFcnJvcihlcnJvcikge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtlcnJvcn0pO1xuICAgIH1cblxuICAgIHNldExvYWRlZCh2YWx1ZSkge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtpc0xvYWRlZDogdmFsdWV9KTtcbiAgICB9XG5cbiAgICBzZXRJdGVtcyhpdGVtcykge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtpdGVtczogaXRlbXN9KTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnN0IHt0cmFuc2xhdGlvbn0gPSB0aGlzLnByb3BzO1xuICAgICAgICBjb25zdCB7c2hvd0ZpZWxkU2VsZWN0aW9uLCB1cmwsIGVycm9yLCBpc0xvYWRlZCwgaXRlbXN9ID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgY29uc3Qge2l0ZW1Db250YWluZXIsIHRpdGxlLCBjb250ZW50fSA9IHRoaXMuc3RhdGUuZmllbGRNYXA7XG5cbiAgICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgPFN1bW1hcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIHsuLi50aGlzLnN0YXRlfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRpb249e3RyYW5zbGF0aW9ufVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICA8SW5wdXRGaWVsZHMgey4uLnRoaXMuc3RhdGV9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxwPjxhIGhyZWY9XCIjXCIgb25DbGljaz17dGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYnV0dG9uXCI+e3RyYW5zbGF0aW9uLnJlc2V0U2V0dGluZ3N9PC9hPjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxGaWVsZFNlbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsPXt1cmx9XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcj17ZXJyb3J9XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRFcnJvcj17dGhpcy5zZXRFcnJvci5iaW5kKHRoaXMpfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXNMb2FkZWQ9e2lzTG9hZGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0TG9hZGVkPXt0aGlzLnNldExvYWRlZC5iaW5kKHRoaXMpfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM9e2l0ZW1zfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SXRlbXM9e3RoaXMuc2V0SXRlbXMuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkTWFwPXt0aGlzLnN0YXRlLmZpZWxkTWFwfVxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlRmllbGRNYXA9e3RoaXMudXBkYXRlRmllbGRNYXAuYmluZCh0aGlzKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgICAgICA8cD48YSBocmVmPVwiI1wiIG9uQ2xpY2s9e3RoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImJ1dHRvblwiPnt0cmFuc2xhdGlvbi5yZXNldFNldHRpbmdzfTwvYT48L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIndyYXBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGZvcm0gb25TdWJtaXQ9e3RoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcyl9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPkFQSSBVUkw8L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxici8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGk+e3RyYW5zbGF0aW9uLnZhbGlkSnNvblVybH08L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzc05hbWU9XCJ1cmwtaW5wdXRcIiB2YWx1ZT17dXJsfSBvbkNoYW5nZT17dGhpcy51cmxDaGFuZ2UuYmluZCh0aGlzKX0vPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+PGlucHV0IHR5cGU9XCJzdWJtaXRcIiBjbGFzc05hbWU9XCJidXR0b24gYnV0dG9uLXByaW1hcnlcIiB2YWx1ZT17dHJhbnNsYXRpb24uc2VuZFJlcXVlc3R9Lz48L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICAgICAgICAgICAgICAgPElucHV0RmllbGRzIHsuLi50aGlzLnN0YXRlfSAvPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU2V0dGluZ3M7IiwiY29uc3QgU3VtbWFyeSA9ICh7dXJsLCBmaWVsZE1hcCwgdHJhbnNsYXRpb259KSA9PlxuICAgIDxkaXY+XG4gICAgICAgIDxwPlxuICAgICAgICAgICAgPHN0cm9uZz5BUEkgVVJMPC9zdHJvbmc+PGJyLz5cbiAgICAgICAgICAgIDxhIGhyZWY9e3VybH0gdGFyZ2V0PVwiX2JsYW5rXCI+e3VybH08L2E+XG4gICAgICAgIDwvcD5cbiAgICAgICAgPHA+XG4gICAgICAgICAgICA8c3Ryb25nPnt0cmFuc2xhdGlvbi50aXRsZX08L3N0cm9uZz48YnIvPlxuICAgICAgICAgICAge2ZpZWxkTWFwLnRpdGxlLnJlcGxhY2UoJy4nLCAnIOKAkz4gJyl9XG4gICAgICAgIDwvcD5cbiAgICAgICAgPHA+XG4gICAgICAgICAgICA8c3Ryb25nPnt0cmFuc2xhdGlvbi5jb250ZW50fTwvc3Ryb25nPjxici8+XG4gICAgICAgICAgICB7ZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpfVxuICAgICAgICA8L3A+XG4gICAgPC9kaXY+O1xuXG5leHBvcnQgZGVmYXVsdCBTdW1tYXJ5OyIsIi8vIFBvbHlmaWxsc1xuaW1wb3J0ICdlczYtcHJvbWlzZSc7XG5pbXBvcnQgJ2lzb21vcnBoaWMtZmV0Y2gnO1xuLy8gQ29tcG9uZW50c1xuaW1wb3J0IFNldHRpbmdzIGZyb20gJy4vQ29tcG9uZW50cy9TZXR0aW5ncyc7XG5cbmNvbnN0IG1vZEpzb25SZW5kZXJFbGVtZW50ID0gJ21vZHVsYXJpdHktanNvbi1yZW5kZXInO1xuY29uc3QgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcbmNvbnN0IHt0cmFuc2xhdGlvbn0gPSBtb2RKc29uUmVuZGVyO1xuXG5SZWFjdERPTS5yZW5kZXIoXG4gICAgPFNldHRpbmdzIHRyYW5zbGF0aW9uPXt0cmFuc2xhdGlvbn0gLz4sXG4gICAgZG9tRWxlbWVudFxuKTsiLCJmdW5jdGlvbiBnZXRBcGlEYXRhKHVybCkge1xuICAgIHJldHVybiBmZXRjaCh1cmwpXG4gICAgICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAgIChyZXN1bHQpID0+ICh7cmVzdWx0fSksXG4gICAgICAgICAgICAoZXJyb3IpID0+ICh7ZXJyb3J9KVxuICAgICAgICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBnZXRBcGlEYXRhO1xuIl19

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJBZG1pbi9JbmRleEFkbWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vc3RlZmFucGVubmVyL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIHY0LjIuNSs3ZjJiNTI2ZFxuICovXG5cbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG5cdHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcblx0dHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kID8gZGVmaW5lKGZhY3RvcnkpIDpcblx0KGdsb2JhbC5FUzZQcm9taXNlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgeDtcbiAgcmV0dXJuIHggIT09IG51bGwgJiYgKHR5cGUgPT09ICdvYmplY3QnIHx8IHR5cGUgPT09ICdmdW5jdGlvbicpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xufVxuXG5cblxudmFyIF9pc0FycmF5ID0gdm9pZCAwO1xuaWYgKEFycmF5LmlzQXJyYXkpIHtcbiAgX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufSBlbHNlIHtcbiAgX2lzQXJyYXkgPSBmdW5jdGlvbiAoeCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeCkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59XG5cbnZhciBpc0FycmF5ID0gX2lzQXJyYXk7XG5cbnZhciBsZW4gPSAwO1xudmFyIHZlcnR4TmV4dCA9IHZvaWQgMDtcbnZhciBjdXN0b21TY2hlZHVsZXJGbiA9IHZvaWQgMDtcblxudmFyIGFzYXAgPSBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgbGVuICs9IDI7XG4gIGlmIChsZW4gPT09IDIpIHtcbiAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgaWYgKGN1c3RvbVNjaGVkdWxlckZuKSB7XG4gICAgICBjdXN0b21TY2hlZHVsZXJGbihmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHNldFNjaGVkdWxlcihzY2hlZHVsZUZuKSB7XG4gIGN1c3RvbVNjaGVkdWxlckZuID0gc2NoZWR1bGVGbjtcbn1cblxuZnVuY3Rpb24gc2V0QXNhcChhc2FwRm4pIHtcbiAgYXNhcCA9IGFzYXBGbjtcbn1cblxudmFyIGJyb3dzZXJXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcbnZhciBicm93c2VyR2xvYmFsID0gYnJvd3NlcldpbmRvdyB8fCB7fTtcbnZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG52YXIgaXNOb2RlID0gdHlwZW9mIHNlbGYgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXSc7XG5cbi8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG52YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuXG4vLyBub2RlXG5mdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgLy8gbm9kZSB2ZXJzaW9uIDAuMTAueCBkaXNwbGF5cyBhIGRlcHJlY2F0aW9uIHdhcm5pbmcgd2hlbiBuZXh0VGljayBpcyB1c2VkIHJlY3Vyc2l2ZWx5XG4gIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgfTtcbn1cblxuLy8gdmVydHhcbmZ1bmN0aW9uIHVzZVZlcnR4VGltZXIoKSB7XG4gIGlmICh0eXBlb2YgdmVydHhOZXh0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2ZXJ0eE5leHQoZmx1c2gpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xufVxuXG5mdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHsgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIG5vZGUuZGF0YSA9IGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyO1xuICB9O1xufVxuXG4vLyB3ZWIgd29ya2VyXG5mdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgLy8gU3RvcmUgc2V0VGltZW91dCByZWZlcmVuY2Ugc28gZXM2LXByb21pc2Ugd2lsbCBiZSB1bmFmZmVjdGVkIGJ5XG4gIC8vIG90aGVyIGNvZGUgbW9kaWZ5aW5nIHNldFRpbWVvdXQgKGxpa2Ugc2lub24udXNlRmFrZVRpbWVycygpKVxuICB2YXIgZ2xvYmFsU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGdsb2JhbFNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICB9O1xufVxuXG52YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG5cbiAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gYXR0ZW1wdFZlcnR4KCkge1xuICB0cnkge1xuICAgIHZhciB2ZXJ0eCA9IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCkucmVxdWlyZSgndmVydHgnKTtcbiAgICB2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgIHJldHVybiB1c2VWZXJ0eFRpbWVyKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdXNlU2V0VGltZW91dCgpO1xuICB9XG59XG5cbnZhciBzY2hlZHVsZUZsdXNoID0gdm9pZCAwO1xuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmIChpc05vZGUpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG59IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG59IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xufSBlbHNlIGlmIChicm93c2VyV2luZG93ID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgc2NoZWR1bGVGbHVzaCA9IGF0dGVtcHRWZXJ0eCgpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gdGhlbihvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgcGFyZW50ID0gdGhpcztcblxuICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcihub29wKTtcblxuICBpZiAoY2hpbGRbUFJPTUlTRV9JRF0gPT09IHVuZGVmaW5lZCkge1xuICAgIG1ha2VQcm9taXNlKGNoaWxkKTtcbiAgfVxuXG4gIHZhciBfc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG5cbiAgaWYgKF9zdGF0ZSkge1xuICAgIHZhciBjYWxsYmFjayA9IGFyZ3VtZW50c1tfc3RhdGUgLSAxXTtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBpbnZva2VDYWxsYmFjayhfc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcGFyZW50Ll9yZXN1bHQpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gIH1cblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yZXNvbHZlYCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlc29sdmVkIHdpdGggdGhlXG4gIHBhc3NlZCBgdmFsdWVgLiBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVzb2x2ZSgxKTtcbiAgfSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoMSk7XG5cbiAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHZhbHVlKXtcbiAgICAvLyB2YWx1ZSA9PT0gMVxuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZXNvbHZlXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBbnl9IHZhbHVlIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB3aXRoXG4gIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZWNvbWUgZnVsZmlsbGVkIHdpdGggdGhlIGdpdmVuXG4gIGB2YWx1ZWBcbiovXG5mdW5jdGlvbiByZXNvbHZlJDEob2JqZWN0KSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgaWYgKG9iamVjdCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JyAmJiBvYmplY3QuY29uc3RydWN0b3IgPT09IENvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHZhciBwcm9taXNlID0gbmV3IENvbnN0cnVjdG9yKG5vb3ApO1xuICByZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG52YXIgUFJPTUlTRV9JRCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnZhciBQRU5ESU5HID0gdm9pZCAwO1xudmFyIEZVTEZJTExFRCA9IDE7XG52YXIgUkVKRUNURUQgPSAyO1xuXG52YXIgVFJZX0NBVENIX0VSUk9SID0geyBlcnJvcjogbnVsbCB9O1xuXG5mdW5jdGlvbiBzZWxmRnVsZmlsbG1lbnQoKSB7XG4gIHJldHVybiBuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKTtcbn1cblxuZnVuY3Rpb24gY2Fubm90UmV0dXJuT3duKCkge1xuICByZXR1cm4gbmV3IFR5cGVFcnJvcignQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLicpO1xufVxuXG5mdW5jdGlvbiBnZXRUaGVuKHByb21pc2UpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIFRSWV9DQVRDSF9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgIHJldHVybiBUUllfQ0FUQ0hfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5VGhlbih0aGVuJCQxLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gIHRyeSB7XG4gICAgdGhlbiQkMS5jYWxsKHZhbHVlLCBmdWxmaWxsbWVudEhhbmRsZXIsIHJlamVjdGlvbkhhbmRsZXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuJCQxKSB7XG4gIGFzYXAoZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgdmFyIGVycm9yID0gdHJ5VGhlbih0aGVuJCQxLCB0aGVuYWJsZSwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoc2VhbGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICBpZiAodGhlbmFibGUgIT09IHZhbHVlKSB7XG4gICAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgaWYgKHNlYWxlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZWFsZWQgPSB0cnVlO1xuXG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgaWYgKCFzZWFsZWQgJiYgZXJyb3IpIHtcbiAgICAgIHNlYWxlZCA9IHRydWU7XG4gICAgICByZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgIH1cbiAgfSwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlKSB7XG4gIGlmICh0aGVuYWJsZS5fc3RhdGUgPT09IEZVTEZJTExFRCkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gIH0gZWxzZSBpZiAodGhlbmFibGUuX3N0YXRlID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB0aGVuYWJsZS5fcmVzdWx0KTtcbiAgfSBlbHNlIHtcbiAgICBzdWJzY3JpYmUodGhlbmFibGUsIHVuZGVmaW5lZCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSwgdGhlbiQkMSkge1xuICBpZiAobWF5YmVUaGVuYWJsZS5jb25zdHJ1Y3RvciA9PT0gcHJvbWlzZS5jb25zdHJ1Y3RvciAmJiB0aGVuJCQxID09PSB0aGVuICYmIG1heWJlVGhlbmFibGUuY29uc3RydWN0b3IucmVzb2x2ZSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgaGFuZGxlT3duVGhlbmFibGUocHJvbWlzZSwgbWF5YmVUaGVuYWJsZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRoZW4kJDEgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgcmVqZWN0KHByb21pc2UsIFRSWV9DQVRDSF9FUlJPUi5lcnJvcik7XG4gICAgICBUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhlbiQkMSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbih0aGVuJCQxKSkge1xuICAgICAgaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4kJDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlKHByb21pc2UsIHZhbHVlKSB7XG4gIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBzZWxmRnVsZmlsbG1lbnQoKSk7XG4gIH0gZWxzZSBpZiAob2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlLCBnZXRUaGVuKHZhbHVlKSk7XG4gIH0gZWxzZSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gIGlmIChwcm9taXNlLl9vbmVycm9yKSB7XG4gICAgcHJvbWlzZS5fb25lcnJvcihwcm9taXNlLl9yZXN1bHQpO1xuICB9XG5cbiAgcHVibGlzaChwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgcHJvbWlzZS5fc3RhdGUgPSBGVUxGSUxMRUQ7XG5cbiAgaWYgKHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCAhPT0gMCkge1xuICAgIGFzYXAocHVibGlzaCwgcHJvbWlzZSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVqZWN0KHByb21pc2UsIHJlYXNvbikge1xuICBpZiAocHJvbWlzZS5fc3RhdGUgIT09IFBFTkRJTkcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcHJvbWlzZS5fc3RhdGUgPSBSRUpFQ1RFRDtcbiAgcHJvbWlzZS5fcmVzdWx0ID0gcmVhc29uO1xuXG4gIGFzYXAocHVibGlzaFJlamVjdGlvbiwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICB2YXIgX3N1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgdmFyIGxlbmd0aCA9IF9zdWJzY3JpYmVycy5sZW5ndGg7XG5cblxuICBwYXJlbnQuX29uZXJyb3IgPSBudWxsO1xuXG4gIF9zdWJzY3JpYmVyc1tsZW5ndGhdID0gY2hpbGQ7XG4gIF9zdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgX3N1YnNjcmliZXJzW2xlbmd0aCArIFJFSkVDVEVEXSA9IG9uUmVqZWN0aW9uO1xuXG4gIGlmIChsZW5ndGggPT09IDAgJiYgcGFyZW50Ll9zdGF0ZSkge1xuICAgIGFzYXAocHVibGlzaCwgcGFyZW50KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwdWJsaXNoKHByb21pc2UpIHtcbiAgdmFyIHN1YnNjcmliZXJzID0gcHJvbWlzZS5fc3Vic2NyaWJlcnM7XG4gIHZhciBzZXR0bGVkID0gcHJvbWlzZS5fc3RhdGU7XG5cbiAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBjaGlsZCA9IHZvaWQgMCxcbiAgICAgIGNhbGxiYWNrID0gdm9pZCAwLFxuICAgICAgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgaWYgKGNoaWxkKSB7XG4gICAgICBpbnZva2VDYWxsYmFjayhzZXR0bGVkLCBjaGlsZCwgY2FsbGJhY2ssIGRldGFpbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGRldGFpbCk7XG4gICAgfVxuICB9XG5cbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoID0gMDtcbn1cblxuZnVuY3Rpb24gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCkge1xuICB0cnkge1xuICAgIHJldHVybiBjYWxsYmFjayhkZXRhaWwpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgVFJZX0NBVENIX0VSUk9SLmVycm9yID0gZTtcbiAgICByZXR1cm4gVFJZX0NBVENIX0VSUk9SO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdmFyIGhhc0NhbGxiYWNrID0gaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICB2YWx1ZSA9IHZvaWQgMCxcbiAgICAgIGVycm9yID0gdm9pZCAwLFxuICAgICAgc3VjY2VlZGVkID0gdm9pZCAwLFxuICAgICAgZmFpbGVkID0gdm9pZCAwO1xuXG4gIGlmIChoYXNDYWxsYmFjaykge1xuICAgIHZhbHVlID0gdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICBpZiAodmFsdWUgPT09IFRSWV9DQVRDSF9FUlJPUikge1xuICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICB2YWx1ZS5lcnJvciA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICB9XG5cbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7XG4gICAgLy8gbm9vcFxuICB9IGVsc2UgaWYgKGhhc0NhbGxiYWNrICYmIHN1Y2NlZWRlZCkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGZhaWxlZCkge1xuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gRlVMRklMTEVEKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gUkVKRUNURUQpIHtcbiAgICByZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIoZnVuY3Rpb24gcmVzb2x2ZVByb21pc2UodmFsdWUpIHtcbiAgICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJlamVjdChwcm9taXNlLCBlKTtcbiAgfVxufVxuXG52YXIgaWQgPSAwO1xuZnVuY3Rpb24gbmV4dElkKCkge1xuICByZXR1cm4gaWQrKztcbn1cblxuZnVuY3Rpb24gbWFrZVByb21pc2UocHJvbWlzZSkge1xuICBwcm9taXNlW1BST01JU0VfSURdID0gaWQrKztcbiAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gIHByb21pc2UuX3Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBbXTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKCkge1xuICByZXR1cm4gbmV3IEVycm9yKCdBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXknKTtcbn1cblxudmFyIEVudW1lcmF0b3IgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIEVudW1lcmF0b3IoQ29uc3RydWN0b3IsIGlucHV0KSB7XG4gICAgdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvciA9IENvbnN0cnVjdG9yO1xuICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3Rvcihub29wKTtcblxuICAgIGlmICghdGhpcy5wcm9taXNlW1BST01JU0VfSURdKSB7XG4gICAgICBtYWtlUHJvbWlzZSh0aGlzLnByb21pc2UpO1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGlucHV0KSkge1xuICAgICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gICAgICB0aGlzLl9yZW1haW5pbmcgPSBpbnB1dC5sZW5ndGg7XG5cbiAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG5cbiAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKHRoaXMucHJvbWlzZSwgdGhpcy5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5sZW5ndGggfHwgMDtcbiAgICAgICAgdGhpcy5fZW51bWVyYXRlKGlucHV0KTtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICAgIGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlamVjdCh0aGlzLnByb21pc2UsIHZhbGlkYXRpb25FcnJvcigpKTtcbiAgICB9XG4gIH1cblxuICBFbnVtZXJhdG9yLnByb3RvdHlwZS5fZW51bWVyYXRlID0gZnVuY3Rpb24gX2VudW1lcmF0ZShpbnB1dCkge1xuICAgIGZvciAodmFyIGkgPSAwOyB0aGlzLl9zdGF0ZSA9PT0gUEVORElORyAmJiBpIDwgaW5wdXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9lYWNoRW50cnkgPSBmdW5jdGlvbiBfZWFjaEVudHJ5KGVudHJ5LCBpKSB7XG4gICAgdmFyIGMgPSB0aGlzLl9pbnN0YW5jZUNvbnN0cnVjdG9yO1xuICAgIHZhciByZXNvbHZlJCQxID0gYy5yZXNvbHZlO1xuXG5cbiAgICBpZiAocmVzb2x2ZSQkMSA9PT0gcmVzb2x2ZSQxKSB7XG4gICAgICB2YXIgX3RoZW4gPSBnZXRUaGVuKGVudHJ5KTtcblxuICAgICAgaWYgKF90aGVuID09PSB0aGVuICYmIGVudHJ5Ll9zdGF0ZSAhPT0gUEVORElORykge1xuICAgICAgICB0aGlzLl9zZXR0bGVkQXQoZW50cnkuX3N0YXRlLCBpLCBlbnRyeS5fcmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIF90aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gUHJvbWlzZSQxKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobm9vcCk7XG4gICAgICAgIGhhbmRsZU1heWJlVGhlbmFibGUocHJvbWlzZSwgZW50cnksIF90aGVuKTtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHByb21pc2UsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KG5ldyBjKGZ1bmN0aW9uIChyZXNvbHZlJCQxKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUkJDEoZW50cnkpO1xuICAgICAgICB9KSwgaSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlJCQxKGVudHJ5KSwgaSk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl9zZXR0bGVkQXQgPSBmdW5jdGlvbiBfc2V0dGxlZEF0KHN0YXRlLCBpLCB2YWx1ZSkge1xuICAgIHZhciBwcm9taXNlID0gdGhpcy5wcm9taXNlO1xuXG5cbiAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IFBFTkRJTkcpIHtcbiAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICBpZiAoc3RhdGUgPT09IFJFSkVDVEVEKSB7XG4gICAgICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVtYWluaW5nID09PSAwKSB7XG4gICAgICBmdWxmaWxsKHByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgfVxuICB9O1xuXG4gIEVudW1lcmF0b3IucHJvdG90eXBlLl93aWxsU2V0dGxlQXQgPSBmdW5jdGlvbiBfd2lsbFNldHRsZUF0KHByb21pc2UsIGkpIHtcbiAgICB2YXIgZW51bWVyYXRvciA9IHRoaXM7XG5cbiAgICBzdWJzY3JpYmUocHJvbWlzZSwgdW5kZWZpbmVkLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIHJldHVybiBlbnVtZXJhdG9yLl9zZXR0bGVkQXQoRlVMRklMTEVELCBpLCB2YWx1ZSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgcmV0dXJuIGVudW1lcmF0b3IuX3NldHRsZWRBdChSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gRW51bWVyYXRvcjtcbn0oKTtcblxuLyoqXG4gIGBQcm9taXNlLmFsbGAgYWNjZXB0cyBhbiBhcnJheSBvZiBwcm9taXNlcywgYW5kIHJldHVybnMgYSBuZXcgcHJvbWlzZSB3aGljaFxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSBvZiBmdWxmaWxsbWVudCB2YWx1ZXMgZm9yIHRoZSBwYXNzZWQgcHJvbWlzZXMsIG9yXG4gIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiBvZiB0aGUgZmlyc3QgcGFzc2VkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQuIEl0IGNhc3RzIGFsbFxuICBlbGVtZW50cyBvZiB0aGUgcGFzc2VkIGl0ZXJhYmxlIHRvIHByb21pc2VzIGFzIGl0IHJ1bnMgdGhpcyBhbGdvcml0aG0uXG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlc29sdmUoMik7XG4gIGxldCBwcm9taXNlMyA9IHJlc29sdmUoMyk7XG4gIGxldCBwcm9taXNlcyA9IFsgcHJvbWlzZTEsIHByb21pc2UyLCBwcm9taXNlMyBdO1xuXG4gIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKGFycmF5KXtcbiAgICAvLyBUaGUgYXJyYXkgaGVyZSB3b3VsZCBiZSBbIDEsIDIsIDMgXTtcbiAgfSk7XG4gIGBgYFxuXG4gIElmIGFueSBvZiB0aGUgYHByb21pc2VzYCBnaXZlbiB0byBgYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIGxldCBwcm9taXNlMSA9IHJlc29sdmUoMSk7XG4gIGxldCBwcm9taXNlMiA9IHJlamVjdChuZXcgRXJyb3IoXCIyXCIpKTtcbiAgbGV0IHByb21pc2UzID0gcmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICBsZXQgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBzdGF0aWNcbiAgQHBhcmFtIHtBcnJheX0gZW50cmllcyBhcnJheSBvZiBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWwgb3B0aW9uYWwgc3RyaW5nIGZvciBsYWJlbGluZyB0aGUgcHJvbWlzZS5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIGBwcm9taXNlc2AgaGF2ZSBiZWVuXG4gIGZ1bGZpbGxlZCwgb3IgcmVqZWN0ZWQgaWYgYW55IG9mIHRoZW0gYmVjb21lIHJlamVjdGVkLlxuICBAc3RhdGljXG4qL1xuZnVuY3Rpb24gYWxsKGVudHJpZXMpIHtcbiAgcmV0dXJuIG5ldyBFbnVtZXJhdG9yKHRoaXMsIGVudHJpZXMpLnByb21pc2U7XG59XG5cbi8qKlxuICBgUHJvbWlzZS5yYWNlYCByZXR1cm5zIGEgbmV3IHByb21pc2Ugd2hpY2ggaXMgc2V0dGxlZCBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlXG4gIGZpcnN0IHBhc3NlZCBwcm9taXNlIHRvIHNldHRsZS5cblxuICBFeGFtcGxlOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UxID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXNvbHZlKCdwcm9taXNlIDEnKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICBsZXQgcHJvbWlzZTIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMicpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHJlc3VsdCA9PT0gJ3Byb21pc2UgMicgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFByb21pc2UucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdFxuICBzZXR0bGVkIHByb21pc2UgbWF0dGVycy4gRm9yIGV4YW1wbGUsIGV2ZW4gaWYgb3RoZXIgcHJvbWlzZXMgZ2l2ZW4gdG8gdGhlXG4gIGBwcm9taXNlc2AgYXJyYXkgYXJndW1lbnQgYXJlIHJlc29sdmVkLCBidXQgdGhlIGZpcnN0IHNldHRsZWQgcHJvbWlzZSBoYXNcbiAgYmVjb21lIHJlamVjdGVkIGJlZm9yZSB0aGUgb3RoZXIgcHJvbWlzZXMgYmVjYW1lIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXG4gIHByb21pc2Ugd2lsbCBiZWNvbWUgcmVqZWN0ZWQ6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZTEgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoJ3Byb21pc2UgMScpO1xuICAgIH0sIDIwMCk7XG4gIH0pO1xuXG4gIGxldCBwcm9taXNlMiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcigncHJvbWlzZSAyJykpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFByb21pc2UucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zXG4gIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gcmVhc29uLm1lc3NhZ2UgPT09ICdwcm9taXNlIDInIGJlY2F1c2UgcHJvbWlzZSAyIGJlY2FtZSByZWplY3RlZCBiZWZvcmVcbiAgICAvLyBwcm9taXNlIDEgYmVjYW1lIGZ1bGZpbGxlZFxuICB9KTtcbiAgYGBgXG5cbiAgQW4gZXhhbXBsZSByZWFsLXdvcmxkIHVzZSBjYXNlIGlzIGltcGxlbWVudGluZyB0aW1lb3V0czpcblxuICBgYGBqYXZhc2NyaXB0XG4gIFByb21pc2UucmFjZShbYWpheCgnZm9vLmpzb24nKSwgdGltZW91dCg1MDAwKV0pXG4gIGBgYFxuXG4gIEBtZXRob2QgcmFjZVxuICBAc3RhdGljXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2Ugd2hpY2ggc2V0dGxlcyBpbiB0aGUgc2FtZSB3YXkgYXMgdGhlIGZpcnN0IHBhc3NlZFxuICBwcm9taXNlIHRvIHNldHRsZS5cbiovXG5mdW5jdGlvbiByYWNlKGVudHJpZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkoZW50cmllcykpIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IENvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBsZW5ndGggPSBlbnRyaWVzLmxlbmd0aDtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gIGBQcm9taXNlLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgcmVqZWN0ZWQgd2l0aCB0aGUgcGFzc2VkIGByZWFzb25gLlxuICBJdCBpcyBzaG9ydGhhbmQgZm9yIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBgamF2YXNjcmlwdFxuICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQHN0YXRpY1xuICBAcGFyYW0ge0FueX0gcmVhc29uIHZhbHVlIHRoYXQgdGhlIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZWplY3RlZCB3aXRoLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSByZWplY3RlZCB3aXRoIHRoZSBnaXZlbiBgcmVhc29uYC5cbiovXG5mdW5jdGlvbiByZWplY3QkMShyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIENvbnN0cnVjdG9yID0gdGhpcztcbiAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3Iobm9vcCk7XG4gIHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbmVlZHNSZXNvbHZlcigpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xufVxuXG5mdW5jdGlvbiBuZWVkc05ldygpIHtcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbn1cblxuLyoqXG4gIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgcHJpbWFyeSB3YXkgb2YgaW50ZXJhY3Rpbmcgd2l0aCBhIHByb21pc2UgaXMgdGhyb3VnaCBpdHMgYHRoZW5gIG1ldGhvZCwgd2hpY2hcbiAgcmVnaXN0ZXJzIGNhbGxiYWNrcyB0byByZWNlaXZlIGVpdGhlciBhIHByb21pc2UncyBldmVudHVhbCB2YWx1ZSBvciB0aGUgcmVhc29uXG4gIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gIFRlcm1pbm9sb2d5XG4gIC0tLS0tLS0tLS0tXG5cbiAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgLSBgdGhlbmFibGVgIGlzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB0aGF0IGRlZmluZXMgYSBgdGhlbmAgbWV0aG9kLlxuICAtIGB2YWx1ZWAgaXMgYW55IGxlZ2FsIEphdmFTY3JpcHQgdmFsdWUgKGluY2x1ZGluZyB1bmRlZmluZWQsIGEgdGhlbmFibGUsIG9yIGEgcHJvbWlzZSkuXG4gIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAtIGByZWFzb25gIGlzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2h5IGEgcHJvbWlzZSB3YXMgcmVqZWN0ZWQuXG4gIC0gYHNldHRsZWRgIHRoZSBmaW5hbCByZXN0aW5nIHN0YXRlIG9mIGEgcHJvbWlzZSwgZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxuXG4gIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICBQcm9taXNlcyB0aGF0IGFyZSBmdWxmaWxsZWQgaGF2ZSBhIGZ1bGZpbGxtZW50IHZhbHVlIGFuZCBhcmUgaW4gdGhlIGZ1bGZpbGxlZFxuICBzdGF0ZS4gIFByb21pc2VzIHRoYXQgYXJlIHJlamVjdGVkIGhhdmUgYSByZWplY3Rpb24gcmVhc29uIGFuZCBhcmUgaW4gdGhlXG4gIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gIFByb21pc2VzIGNhbiBhbHNvIGJlIHNhaWQgdG8gKnJlc29sdmUqIGEgdmFsdWUuICBJZiB0aGlzIHZhbHVlIGlzIGFsc28gYVxuICBwcm9taXNlLCB0aGVuIHRoZSBvcmlnaW5hbCBwcm9taXNlJ3Mgc2V0dGxlZCBzdGF0ZSB3aWxsIG1hdGNoIHRoZSB2YWx1ZSdzXG4gIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICBpdHNlbGYgcmVqZWN0LCBhbmQgYSBwcm9taXNlIHRoYXQgKnJlc29sdmVzKiBhIHByb21pc2UgdGhhdCBmdWxmaWxscyB3aWxsXG4gIGl0c2VsZiBmdWxmaWxsLlxuXG5cbiAgQmFzaWMgVXNhZ2U6XG4gIC0tLS0tLS0tLS0tLVxuXG4gIGBgYGpzXG4gIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgLy8gb24gc3VjY2Vzc1xuICAgIHJlc29sdmUodmFsdWUpO1xuXG4gICAgLy8gb24gZmFpbHVyZVxuICAgIHJlamVjdChyZWFzb24pO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAvLyBvbiBmdWxmaWxsbWVudFxuICB9LCBmdW5jdGlvbihyZWFzb24pIHtcbiAgICAvLyBvbiByZWplY3Rpb25cbiAgfSk7XG4gIGBgYFxuXG4gIEFkdmFuY2VkIFVzYWdlOlxuICAtLS0tLS0tLS0tLS0tLS1cblxuICBQcm9taXNlcyBzaGluZSB3aGVuIGFic3RyYWN0aW5nIGF3YXkgYXN5bmNocm9ub3VzIGludGVyYWN0aW9ucyBzdWNoIGFzXG4gIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGdldEpTT04odXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICBsZXQgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgIHhoci5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2pzb24nO1xuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVyKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSB0aGlzLkRPTkUpIHtcbiAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgcmVzb2x2ZSh0aGlzLnJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgIC8vIG9uIGZ1bGZpbGxtZW50XG4gIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgIC8vIG9uIHJlamVjdGlvblxuICB9KTtcbiAgYGBgXG5cbiAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICBgYGBqc1xuICBQcm9taXNlLmFsbChbXG4gICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgZ2V0SlNPTignL2NvbW1lbnRzJylcbiAgXSkudGhlbihmdW5jdGlvbih2YWx1ZXMpe1xuICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICB2YWx1ZXNbMV0gLy8gPT4gY29tbWVudHNKU09OXG5cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9KTtcbiAgYGBgXG5cbiAgQGNsYXNzIFByb21pc2VcbiAgQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZXJcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAY29uc3RydWN0b3JcbiovXG5cbnZhciBQcm9taXNlJDEgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICB0aGlzW1BST01JU0VfSURdID0gbmV4dElkKCk7XG4gICAgdGhpcy5fcmVzdWx0ID0gdGhpcy5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgIGlmIChub29wICE9PSByZXNvbHZlcikge1xuICAgICAgdHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nICYmIG5lZWRzUmVzb2x2ZXIoKTtcbiAgICAgIHRoaXMgaW5zdGFuY2VvZiBQcm9taXNlID8gaW5pdGlhbGl6ZVByb21pc2UodGhpcywgcmVzb2x2ZXIpIDogbmVlZHNOZXcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gIHdoaWNoIHJlZ2lzdGVycyBjYWxsYmFja3MgdG8gcmVjZWl2ZSBlaXRoZXIgYSBwcm9taXNlJ3MgZXZlbnR1YWwgdmFsdWUgb3IgdGhlXG4gIHJlYXNvbiB3aHkgdGhlIHByb21pc2UgY2Fubm90IGJlIGZ1bGZpbGxlZC5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHVzZXIgaXMgdW5hdmFpbGFibGUsIGFuZCB5b3UgYXJlIGdpdmVuIHRoZSByZWFzb24gd2h5XG4gIH0pO1xuICBgYGBcbiAgIENoYWluaW5nXG4gIC0tLS0tLS0tXG4gICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZmlyc3QgcHJvbWlzZSdzIGZ1bGZpbGxtZW50XG4gIG9yIHJlamVjdGlvbiBoYW5kbGVyLCBvciByZWplY3RlZCBpZiB0aGUgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAnZGVmYXVsdCBuYW1lJztcbiAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAvLyBJZiBgZmluZFVzZXJgIGZ1bGZpbGxlZCwgYHVzZXJOYW1lYCB3aWxsIGJlIHRoZSB1c2VyJ3MgbmFtZSwgb3RoZXJ3aXNlIGl0XG4gICAgLy8gd2lsbCBiZSBgJ2RlZmF1bHQgbmFtZSdgXG4gIH0pO1xuICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jyk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAvLyBJZiBgZmluZFVzZXJgIHJlamVjdGVkLCBgcmVhc29uYCB3aWxsIGJlICdgZmluZFVzZXJgIHJlamVjdGVkIGFuZCB3ZSdyZSB1bmhhcHB5Jy5cbiAgfSk7XG4gIGBgYFxuICBJZiB0aGUgZG93bnN0cmVhbSBwcm9taXNlIGRvZXMgbm90IHNwZWNpZnkgYSByZWplY3Rpb24gaGFuZGxlciwgcmVqZWN0aW9uIHJlYXNvbnMgd2lsbCBiZSBwcm9wYWdhdGVkIGZ1cnRoZXIgZG93bnN0cmVhbS5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHRocm93IG5ldyBQZWRhZ29naWNhbEV4Y2VwdGlvbignVXBzdHJlYW0gZXJyb3InKTtcbiAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBuZXZlciByZWFjaGVkXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgLy8gbmV2ZXIgcmVhY2hlZFxuICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgLy8gVGhlIGBQZWRnYWdvY2lhbEV4Y2VwdGlvbmAgaXMgcHJvcGFnYXRlZCBhbGwgdGhlIHdheSBkb3duIHRvIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgQXNzaW1pbGF0aW9uXG4gIC0tLS0tLS0tLS0tLVxuICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgcmV0cmlldmVkIGFzeW5jaHJvbm91c2x5LiBUaGlzIGNhbiBiZSBhY2hpZXZlZCBieSByZXR1cm5pbmcgYSBwcm9taXNlIGluIHRoZVxuICBmdWxmaWxsbWVudCBvciByZWplY3Rpb24gaGFuZGxlci4gVGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIHRoZW4gYmUgcGVuZGluZ1xuICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cbiAgIGBgYGpzXG4gIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgIHJldHVybiBmaW5kQ29tbWVudHNCeUF1dGhvcih1c2VyKTtcbiAgfSkudGhlbihmdW5jdGlvbiAoY29tbWVudHMpIHtcbiAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gIH0pO1xuICBgYGBcbiAgIElmIHRoZSBhc3NpbWxpYXRlZCBwcm9taXNlIHJlamVjdHMsIHRoZW4gdGhlIGRvd25zdHJlYW0gcHJvbWlzZSB3aWxsIGFsc28gcmVqZWN0LlxuICAgYGBganNcbiAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgcmV0dXJuIGZpbmRDb21tZW50c0J5QXV0aG9yKHVzZXIpO1xuICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgZnVsZmlsbHMsIHdlJ2xsIGhhdmUgdGhlIHZhbHVlIGhlcmVcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgfSk7XG4gIGBgYFxuICAgU2ltcGxlIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IHJlc3VsdDtcbiAgIHRyeSB7XG4gICAgcmVzdWx0ID0gZmluZFJlc3VsdCgpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gIGZpbmRSZXN1bHQoZnVuY3Rpb24ocmVzdWx0LCBlcnIpe1xuICAgIGlmIChlcnIpIHtcbiAgICAgIC8vIGZhaWx1cmVcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3VjY2Vzc1xuICAgIH1cbiAgfSk7XG4gIGBgYFxuICAgUHJvbWlzZSBFeGFtcGxlO1xuICAgYGBgamF2YXNjcmlwdFxuICBmaW5kUmVzdWx0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAvLyBmYWlsdXJlXG4gIH0pO1xuICBgYGBcbiAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgLS0tLS0tLS0tLS0tLS1cbiAgIFN5bmNocm9ub3VzIEV4YW1wbGVcbiAgIGBgYGphdmFzY3JpcHRcbiAgbGV0IGF1dGhvciwgYm9va3M7XG4gICB0cnkge1xuICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICBib29rcyAgPSBmaW5kQm9va3NCeUF1dGhvcihhdXRob3IpO1xuICAgIC8vIHN1Y2Nlc3NcbiAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAvLyBmYWlsdXJlXG4gIH1cbiAgYGBgXG4gICBFcnJiYWNrIEV4YW1wbGVcbiAgIGBgYGpzXG4gICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG4gICB9XG4gICBmdW5jdGlvbiBmYWlsdXJlKHJlYXNvbikge1xuICAgfVxuICAgZmluZEF1dGhvcihmdW5jdGlvbihhdXRob3IsIGVycil7XG4gICAgaWYgKGVycikge1xuICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgLy8gZmFpbHVyZVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBmaW5kQm9vb2tzQnlBdXRob3IoYXV0aG9yLCBmdW5jdGlvbihib29rcywgZXJyKSB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgZmFpbHVyZShlcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmb3VuZEJvb2tzKGJvb2tzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gocmVhc29uKSB7XG4gICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBmYWlsdXJlKGVycik7XG4gICAgICB9XG4gICAgICAvLyBzdWNjZXNzXG4gICAgfVxuICB9KTtcbiAgYGBgXG4gICBQcm9taXNlIEV4YW1wbGU7XG4gICBgYGBqYXZhc2NyaXB0XG4gIGZpbmRBdXRob3IoKS5cbiAgICB0aGVuKGZpbmRCb29rc0J5QXV0aG9yKS5cbiAgICB0aGVuKGZ1bmN0aW9uKGJvb2tzKXtcbiAgICAgIC8vIGZvdW5kIGJvb2tzXG4gIH0pLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgfSk7XG4gIGBgYFxuICAgQG1ldGhvZCB0aGVuXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uRnVsZmlsbGVkXG4gIEBwYXJhbSB7RnVuY3Rpb259IG9uUmVqZWN0ZWRcbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfVxuICAqL1xuXG4gIC8qKlxuICBgY2F0Y2hgIGlzIHNpbXBseSBzdWdhciBmb3IgYHRoZW4odW5kZWZpbmVkLCBvblJlamVjdGlvbilgIHdoaWNoIG1ha2VzIGl0IHRoZSBzYW1lXG4gIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGZpbmRBdXRob3IoKXtcbiAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZG4ndCBmaW5kIHRoYXQgYXV0aG9yJyk7XG4gIH1cbiAgLy8gc3luY2hyb25vdXNcbiAgdHJ5IHtcbiAgZmluZEF1dGhvcigpO1xuICB9IGNhdGNoKHJlYXNvbikge1xuICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICB9XG4gIC8vIGFzeW5jIHdpdGggcHJvbWlzZXNcbiAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gIH0pO1xuICBgYGBcbiAgQG1ldGhvZCBjYXRjaFxuICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9XG4gICovXG5cblxuICBQcm9taXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIF9jYXRjaChvblJlamVjdGlvbikge1xuICAgIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3Rpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgIGBmaW5hbGx5YCB3aWxsIGJlIGludm9rZWQgcmVnYXJkbGVzcyBvZiB0aGUgcHJvbWlzZSdzIGZhdGUganVzdCBhcyBuYXRpdmVcbiAgICB0cnkvY2F0Y2gvZmluYWxseSBiZWhhdmVzXG4gIFxuICAgIFN5bmNocm9ub3VzIGV4YW1wbGU6XG4gIFxuICAgIGBgYGpzXG4gICAgZmluZEF1dGhvcigpIHtcbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBBdXRob3IoKTtcbiAgICB9XG4gIFxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZmluZEF1dGhvcigpOyAvLyBzdWNjZWVkIG9yIGZhaWxcbiAgICB9IGNhdGNoKGVycm9yKSB7XG4gICAgICByZXR1cm4gZmluZE90aGVyQXV0aGVyKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIC8vIGFsd2F5cyBydW5zXG4gICAgICAvLyBkb2Vzbid0IGFmZmVjdCB0aGUgcmV0dXJuIHZhbHVlXG4gICAgfVxuICAgIGBgYFxuICBcbiAgICBBc3luY2hyb25vdXMgZXhhbXBsZTpcbiAgXG4gICAgYGBganNcbiAgICBmaW5kQXV0aG9yKCkuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgIHJldHVybiBmaW5kT3RoZXJBdXRoZXIoKTtcbiAgICB9KS5maW5hbGx5KGZ1bmN0aW9uKCl7XG4gICAgICAvLyBhdXRob3Igd2FzIGVpdGhlciBmb3VuZCwgb3Igbm90XG4gICAgfSk7XG4gICAgYGBgXG4gIFxuICAgIEBtZXRob2QgZmluYWxseVxuICAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgQHJldHVybiB7UHJvbWlzZX1cbiAgKi9cblxuXG4gIFByb21pc2UucHJvdG90eXBlLmZpbmFsbHkgPSBmdW5jdGlvbiBfZmluYWxseShjYWxsYmFjaykge1xuICAgIHZhciBwcm9taXNlID0gdGhpcztcbiAgICB2YXIgY29uc3RydWN0b3IgPSBwcm9taXNlLmNvbnN0cnVjdG9yO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gY29uc3RydWN0b3IucmVzb2x2ZShjYWxsYmFjaygpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aHJvdyByZWFzb247XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2UudGhlbihjYWxsYmFjaywgY2FsbGJhY2spO1xuICB9O1xuXG4gIHJldHVybiBQcm9taXNlO1xufSgpO1xuXG5Qcm9taXNlJDEucHJvdG90eXBlLnRoZW4gPSB0aGVuO1xuUHJvbWlzZSQxLmFsbCA9IGFsbDtcblByb21pc2UkMS5yYWNlID0gcmFjZTtcblByb21pc2UkMS5yZXNvbHZlID0gcmVzb2x2ZSQxO1xuUHJvbWlzZSQxLnJlamVjdCA9IHJlamVjdCQxO1xuUHJvbWlzZSQxLl9zZXRTY2hlZHVsZXIgPSBzZXRTY2hlZHVsZXI7XG5Qcm9taXNlJDEuX3NldEFzYXAgPSBzZXRBc2FwO1xuUHJvbWlzZSQxLl9hc2FwID0gYXNhcDtcblxuLypnbG9iYWwgc2VsZiovXG5mdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgdmFyIGxvY2FsID0gdm9pZCAwO1xuXG4gIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gZ2xvYmFsO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxvY2FsID0gc2VsZjtcbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncG9seWZpbGwgZmFpbGVkIGJlY2F1c2UgZ2xvYmFsIG9iamVjdCBpcyB1bmF2YWlsYWJsZSBpbiB0aGlzIGVudmlyb25tZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgdmFyIFAgPSBsb2NhbC5Qcm9taXNlO1xuXG4gIGlmIChQKSB7XG4gICAgdmFyIHByb21pc2VUb1N0cmluZyA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHByb21pc2VUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChQLnJlc29sdmUoKSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gc2lsZW50bHkgaWdub3JlZFxuICAgIH1cblxuICAgIGlmIChwcm9taXNlVG9TdHJpbmcgPT09ICdbb2JqZWN0IFByb21pc2VdJyAmJiAhUC5jYXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgbG9jYWwuUHJvbWlzZSA9IFByb21pc2UkMTtcbn1cblxuLy8gU3RyYW5nZSBjb21wYXQuLlxuUHJvbWlzZSQxLnBvbHlmaWxsID0gcG9seWZpbGw7XG5Qcm9taXNlJDEuUHJvbWlzZSA9IFByb21pc2UkMTtcblxucmV0dXJuIFByb21pc2UkMTtcblxufSkpKTtcblxuXG5cblxuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuXG59LHtcIl9wcm9jZXNzXCI6NH1dLDI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLy8gdGhlIHdoYXR3Zy1mZXRjaCBwb2x5ZmlsbCBpbnN0YWxscyB0aGUgZmV0Y2goKSBmdW5jdGlvblxuLy8gb24gdGhlIGdsb2JhbCBvYmplY3QgKHdpbmRvdyBvciBzZWxmKVxuLy9cbi8vIFJldHVybiB0aGF0IGFzIHRoZSBleHBvcnQgZm9yIHVzZSBpbiBXZWJwYWNrLCBCcm93c2VyaWZ5IGV0Yy5cbnJlcXVpcmUoJ3doYXR3Zy1mZXRjaCcpO1xubW9kdWxlLmV4cG9ydHMgPSBzZWxmLmZldGNoLmJpbmQoc2VsZik7XG5cbn0se1wid2hhdHdnLWZldGNoXCI6Nn1dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICByb290Lm9iamVjdFBhdGggPSBmYWN0b3J5KCk7XG4gIH1cbn0pKHRoaXMsIGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICBpZihvYmogPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vdG8gaGFuZGxlIG9iamVjdHMgd2l0aCBudWxsIHByb3RvdHlwZXMgKHRvbyBlZGdlIGNhc2U/KVxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKVxuICB9XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmope1xuICAgIC8qaXN0YW5idWwgaWdub3JlIG5leHQ6Y2FudCB0ZXN0Ki9cbiAgICByZXR1cm4gdG9TdHIuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNCb29sZWFuKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdib29sZWFuJyB8fCB0b1N0cmluZyhvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRLZXkoa2V5KXtcbiAgICB2YXIgaW50S2V5ID0gcGFyc2VJbnQoa2V5KTtcbiAgICBpZiAoaW50S2V5LnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgcmV0dXJuIGludEtleTtcbiAgICB9XG4gICAgcmV0dXJuIGtleTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZhY3Rvcnkob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG5cbiAgICB2YXIgb2JqZWN0UGF0aCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdFBhdGgpLnJlZHVjZShmdW5jdGlvbihwcm94eSwgcHJvcCkge1xuICAgICAgICBpZihwcm9wID09PSAnY3JlYXRlJykge1xuICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qaXN0YW5idWwgaWdub3JlIGVsc2UqL1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdFBhdGhbcHJvcF0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBwcm94eVtwcm9wXSA9IG9iamVjdFBhdGhbcHJvcF0uYmluZChvYmplY3RQYXRoLCBvYmopO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb3h5O1xuICAgICAgfSwge30pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSB7XG4gICAgICByZXR1cm4gKG9wdGlvbnMuaW5jbHVkZUluaGVyaXRlZFByb3BzIHx8ICh0eXBlb2YgcHJvcCA9PT0gJ251bWJlcicgJiYgQXJyYXkuaXNBcnJheShvYmopKSB8fCBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNoYWxsb3dQcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkob2JqLCBwcm9wKSkge1xuICAgICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuICAgICAgaWYgKCFwYXRoIHx8IHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgICAgfVxuICAgICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcbiAgICAgIHZhciBjdXJyZW50VmFsdWUgPSBnZXRTaGFsbG93UHJvcGVydHkob2JqLCBjdXJyZW50UGF0aCk7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwIHx8ICFkb05vdFJlcGxhY2UpIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRWYWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICAgIGlmKHR5cGVvZiBwYXRoWzFdID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG5cbiAgICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICAgIGlmICh0eXBlb2YgcGF0aCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcGF0aCB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gISFvYmo7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaiA9IGdldEtleShwYXRoW2ldKTtcblxuICAgICAgICBpZigodHlwZW9mIGogPT09ICdudW1iZXInICYmIGlzQXJyYXkob2JqKSAmJiBqIDwgb2JqLmxlbmd0aCkgfHxcbiAgICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW5oZXJpdGVkUHJvcHMgPyAoaiBpbiBPYmplY3Qob2JqKSkgOiBoYXNPd25Qcm9wZXJ0eShvYmosIGopKSkge1xuICAgICAgICAgIG9iaiA9IG9ialtqXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgICBhdCA9IH5+YXQ7XG4gICAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgICBhcnIgPSBbXTtcbiAgICAgICAgb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBhcnIpO1xuICAgICAgfVxuICAgICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgfVxuICAgICAgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSwgaTtcbiAgICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGZhbHNlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUubGVuZ3RoID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICAgIGlmIChoYXNTaGFsbG93UHJvcGVydHkodmFsdWUsIGkpKSB7XG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbaV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgICAgaWYgKCFpc0FycmF5KGFycikpIHtcbiAgICAgICAgYXJyID0gW107XG4gICAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICAgIH1cblxuICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICB9O1xuXG4gICAgb2JqZWN0UGF0aC5jb2FsZXNjZSA9IGZ1bmN0aW9uIChvYmosIHBhdGhzLCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICgodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGhzW2ldKSkgIT09IHZvaWQgMCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH07XG5cbiAgICBvYmplY3RQYXRoLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIGRlZmF1bHRWYWx1ZSl7XG4gICAgICBpZiAodHlwZW9mIHBhdGggPT09ICdudW1iZXInKSB7XG4gICAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgICB9XG4gICAgICBpZiAoIXBhdGggfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoLnNwbGl0KCcuJyksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICAgIHZhciBuZXh0T2JqID0gZ2V0U2hhbGxvd1Byb3BlcnR5KG9iaiwgY3VycmVudFBhdGgpXG4gICAgICBpZiAobmV4dE9iaiA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gbmV4dE9iajtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gICAgfTtcblxuICAgIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgICAgaWYgKHR5cGVvZiBwYXRoID09PSAnbnVtYmVyJykge1xuICAgICAgICBwYXRoID0gW3BhdGhdO1xuICAgICAgfVxuXG4gICAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cbiAgICAgIGlmKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gb2JqZWN0UGF0aC5kZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG4gICAgICBpZiAoIWhhc1NoYWxsb3dQcm9wZXJ0eShvYmosIGN1cnJlbnRQYXRoKSkge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvYmplY3RQYXRoLmRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqZWN0UGF0aDtcbiAgfVxuXG4gIHZhciBtb2QgPSBmYWN0b3J5KCk7XG4gIG1vZC5jcmVhdGUgPSBmYWN0b3J5O1xuICBtb2Qud2l0aEluaGVyaXRlZFByb3BzID0gZmFjdG9yeSh7aW5jbHVkZUluaGVyaXRlZFByb3BzOiB0cnVlfSlcbiAgcmV0dXJuIG1vZDtcbn0pO1xuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG5cbn0se31dLDU6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLypcbiByZWN1cnNpdmUtaXRlcmF0b3IgdjIuMC4xXG4gaHR0cHM6Ly9naXRodWIuY29tL25lcnZnaC9yZWN1cnNpdmUtaXRlcmF0b3JcbiovXG5cbihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcIlJlY3Vyc2l2ZUl0ZXJhdG9yXCJdID0gZmFjdG9yeSgpO1xuXHRlbHNlXG5cdFx0cm9vdFtcIlJlY3Vyc2l2ZUl0ZXJhdG9yXCJdID0gZmFjdG9yeSgpO1xufSkodGhpcywgZnVuY3Rpb24oKSB7XG5yZXR1cm4gLyoqKioqKi8gKGZ1bmN0aW9uKG1vZHVsZXMpIHsgLy8gd2VicGFja0Jvb3RzdHJhcFxuLyoqKioqKi8gXHQvLyBUaGUgbW9kdWxlIGNhY2hlXG4vKioqKioqLyBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG4vKioqKioqL1xuLyoqKioqKi8gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuLyoqKioqKi8gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG4vKioqKioqL1xuLyoqKioqKi8gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuLyoqKioqKi8gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuLyoqKioqKi8gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4vKioqKioqL1xuLyoqKioqKi8gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4vKioqKioqLyBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuLyoqKioqKi8gXHRcdFx0ZXhwb3J0czoge30sXG4vKioqKioqLyBcdFx0XHRpZDogbW9kdWxlSWQsXG4vKioqKioqLyBcdFx0XHRsb2FkZWQ6IGZhbHNlXG4vKioqKioqLyBcdFx0fTtcbi8qKioqKiovXG4vKioqKioqLyBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4vKioqKioqLyBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG4vKioqKioqL1xuLyoqKioqKi8gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbi8qKioqKiovIFx0XHRtb2R1bGUubG9hZGVkID0gdHJ1ZTtcbi8qKioqKiovXG4vKioqKioqLyBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbi8qKioqKiovIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4vKioqKioqLyBcdH1cbi8qKioqKiovXG4vKioqKioqL1xuLyoqKioqKi8gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuLyoqKioqKi9cbi8qKioqKiovIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcbi8qKioqKiovXG4vKioqKioqLyBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4vKioqKioqLyBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG4vKioqKioqL1xuLyoqKioqKi8gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8qKioqKiovIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oMCk7XG4vKioqKioqLyB9KVxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKioqKiovIChbXG4vKiAwICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pIHtcblxuXHRcInVzZSBzdHJpY3RcIjtcblx0XG5cdFxuXHR2YXIgX3RvQ29uc3VtYWJsZUFycmF5ID0gZnVuY3Rpb24gKGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSB7IGZvciAodmFyIGkgPSAwLCBhcnIyID0gQXJyYXkoYXJyLmxlbmd0aCk7IGkgPCBhcnIubGVuZ3RoOyBpKyspIGFycjJbaV0gPSBhcnJbaV07IHJldHVybiBhcnIyOyB9IGVsc2UgeyByZXR1cm4gQXJyYXkuZnJvbShhcnIpOyB9IH07XG5cdFxuXHR2YXIgX3Byb3RvdHlwZVByb3BlcnRpZXMgPSBmdW5jdGlvbiAoY2hpbGQsIHN0YXRpY1Byb3BzLCBpbnN0YW5jZVByb3BzKSB7IGlmIChzdGF0aWNQcm9wcykgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoY2hpbGQsIHN0YXRpY1Byb3BzKTsgaWYgKGluc3RhbmNlUHJvcHMpIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGNoaWxkLnByb3RvdHlwZSwgaW5zdGFuY2VQcm9wcyk7IH07XG5cdFxuXHR2YXIgX2NsYXNzQ2FsbENoZWNrID0gZnVuY3Rpb24gKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH07XG5cdFxuXHR2YXIgX2xhbmcgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKDEpO1xuXHRcblx0dmFyIGlzT2JqZWN0ID0gX2xhbmcuaXNPYmplY3Q7XG5cdHZhciBnZXRLZXlzID0gX2xhbmcuZ2V0S2V5cztcblx0XG5cdFxuXHRcblx0Ly8gUFJJVkFURSBQUk9QRVJUSUVTXG5cdHZhciBCWVBBU1NfTU9ERSA9IFwiX19ieXBhc3NNb2RlXCI7XG5cdHZhciBJR05PUkVfQ0lSQ1VMQVIgPSBcIl9faWdub3JlQ2lyY3VsYXJcIjtcblx0dmFyIE1BWF9ERUVQID0gXCJfX21heERlZXBcIjtcblx0dmFyIENBQ0hFID0gXCJfX2NhY2hlXCI7XG5cdHZhciBRVUVVRSA9IFwiX19xdWV1ZVwiO1xuXHR2YXIgU1RBVEUgPSBcIl9fc3RhdGVcIjtcblx0XG5cdFxuXHR2YXIgRU1QVFlfU1RBVEUgPSB7fTtcblx0XG5cdFxuXHR2YXIgUmVjdXJzaXZlSXRlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuXHQgICAgLyoqXG5cdCAgICAgKiBAcGFyYW0ge09iamVjdHxBcnJheX0gcm9vdFxuXHQgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtieXBhc3NNb2RlPTBdXG5cdCAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtpZ25vcmVDaXJjdWxhcj1mYWxzZV1cblx0ICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbbWF4RGVlcD0xMDBdXG5cdCAgICAgKi9cblx0ICAgIGZ1bmN0aW9uIFJlY3Vyc2l2ZUl0ZXJhdG9yKHJvb3QpIHtcblx0ICAgICAgICB2YXIgYnlwYXNzTW9kZSA9IGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkID8gMCA6IGFyZ3VtZW50c1sxXTtcblx0ICAgICAgICB2YXIgaWdub3JlQ2lyY3VsYXIgPSBhcmd1bWVudHNbMl0gPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogYXJndW1lbnRzWzJdO1xuXHQgICAgICAgIHZhciBtYXhEZWVwID0gYXJndW1lbnRzWzNdID09PSB1bmRlZmluZWQgPyAxMDAgOiBhcmd1bWVudHNbM107XG5cdCAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFJlY3Vyc2l2ZUl0ZXJhdG9yKTtcblx0XG5cdCAgICAgICAgdGhpc1tCWVBBU1NfTU9ERV0gPSBieXBhc3NNb2RlO1xuXHQgICAgICAgIHRoaXNbSUdOT1JFX0NJUkNVTEFSXSA9IGlnbm9yZUNpcmN1bGFyO1xuXHQgICAgICAgIHRoaXNbTUFYX0RFRVBdID0gbWF4RGVlcDtcblx0ICAgICAgICB0aGlzW0NBQ0hFXSA9IFtdO1xuXHQgICAgICAgIHRoaXNbUVVFVUVdID0gW107XG5cdCAgICAgICAgdGhpc1tTVEFURV0gPSB0aGlzLmdldFN0YXRlKHVuZGVmaW5lZCwgcm9vdCk7XG5cdCAgICAgICAgdGhpcy5fX21ha2VJdGVyYWJsZSgpO1xuXHQgICAgfVxuXHRcblx0ICAgIF9wcm90b3R5cGVQcm9wZXJ0aWVzKFJlY3Vyc2l2ZUl0ZXJhdG9yLCBudWxsLCB7XG5cdCAgICAgICAgbmV4dDoge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogQHJldHVybnMge09iamVjdH1cblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBuZXh0KCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIF9yZWYgPSB0aGlzW1NUQVRFXSB8fCBFTVBUWV9TVEFURTtcblx0ICAgICAgICAgICAgICAgIHZhciBub2RlID0gX3JlZi5ub2RlO1xuXHQgICAgICAgICAgICAgICAgdmFyIHBhdGggPSBfcmVmLnBhdGg7XG5cdCAgICAgICAgICAgICAgICB2YXIgZGVlcCA9IF9yZWYuZGVlcDtcblx0XG5cdFxuXHQgICAgICAgICAgICAgICAgaWYgKHRoaXNbTUFYX0RFRVBdID4gZGVlcCkge1xuXHQgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzTm9kZShub2RlKSkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0NpcmN1bGFyKG5vZGUpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpc1tJR05PUkVfQ0lSQ1VMQVJdKSB7fSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDaXJjdWxhciByZWZlcmVuY2VcIik7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vblN0ZXBJbnRvKHRoaXNbU1RBVEVdKSkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBfUVVFVUU7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlc2NyaXB0b3JzID0gdGhpcy5nZXRTdGF0ZXNPZkNoaWxkTm9kZXMobm9kZSwgcGF0aCwgZGVlcCk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IHRoaXNbQllQQVNTX01PREVdID8gXCJwdXNoXCIgOiBcInVuc2hpZnRcIjtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoX1FVRVVFID0gdGhpc1tRVUVVRV0pW21ldGhvZF0uYXBwbHkoX1FVRVVFLCBfdG9Db25zdW1hYmxlQXJyYXkoZGVzY3JpcHRvcnMpKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW0NBQ0hFXS5wdXNoKG5vZGUpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgfVxuXHRcblx0ICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXNbUVVFVUVdLnNoaWZ0KCk7XG5cdCAgICAgICAgICAgICAgICB2YXIgZG9uZSA9ICF2YWx1ZTtcblx0XG5cdCAgICAgICAgICAgICAgICB0aGlzW1NUQVRFXSA9IHZhbHVlO1xuXHRcblx0ICAgICAgICAgICAgICAgIGlmIChkb25lKSB0aGlzLmRlc3Ryb3koKTtcblx0XG5cdCAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogdmFsdWUsIGRvbmU6IGRvbmUgfTtcblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH0sXG5cdCAgICAgICAgZGVzdHJveToge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBkZXN0cm95KCkge1xuXHQgICAgICAgICAgICAgICAgdGhpc1tRVUVVRV0ubGVuZ3RoID0gMDtcblx0ICAgICAgICAgICAgICAgIHRoaXNbQ0FDSEVdLmxlbmd0aCA9IDA7XG5cdCAgICAgICAgICAgICAgICB0aGlzW1NUQVRFXSA9IG51bGw7XG5cdCAgICAgICAgICAgIH0sXG5cdCAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXHQgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcblx0ICAgICAgICB9LFxuXHQgICAgICAgIGlzTm9kZToge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogQHBhcmFtIHsqfSBhbnlcblx0ICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gaXNOb2RlKGFueSkge1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGlzT2JqZWN0KGFueSk7XG5cdCAgICAgICAgICAgIH0sXG5cdCAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXHQgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcblx0ICAgICAgICB9LFxuXHQgICAgICAgIGlzTGVhZjoge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogQHBhcmFtIHsqfSBhbnlcblx0ICAgICAgICAgICAgICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gaXNMZWFmKGFueSkge1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuICF0aGlzLmlzTm9kZShhbnkpO1xuXHQgICAgICAgICAgICB9LFxuXHQgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcblx0ICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG5cdCAgICAgICAgfSxcblx0ICAgICAgICBpc0NpcmN1bGFyOiB7XG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKiBAcGFyYW0geyp9IGFueVxuXHQgICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBpc0NpcmN1bGFyKGFueSkge1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbQ0FDSEVdLmluZGV4T2YoYW55KSAhPT0gLTE7XG5cdCAgICAgICAgICAgIH0sXG5cdCAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXHQgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcblx0ICAgICAgICB9LFxuXHQgICAgICAgIGdldFN0YXRlc09mQ2hpbGROb2Rlczoge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogUmV0dXJucyBzdGF0ZXMgb2YgY2hpbGQgbm9kZXNcblx0ICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG5vZGVcblx0ICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheX0gcGF0aFxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gZGVlcFxuXHQgICAgICAgICAgICAgKiBAcmV0dXJucyB7QXJyYXk8T2JqZWN0Pn1cblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBnZXRTdGF0ZXNPZkNoaWxkTm9kZXMobm9kZSwgcGF0aCwgZGVlcCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblx0ICAgICAgICAgICAgICAgIHJldHVybiBnZXRLZXlzKG5vZGUpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLmdldFN0YXRlKG5vZGUsIG5vZGVba2V5XSwga2V5LCBwYXRoLmNvbmNhdChrZXkpLCBkZWVwICsgMSk7XG5cdCAgICAgICAgICAgICAgICB9KTtcblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH0sXG5cdCAgICAgICAgZ2V0U3RhdGU6IHtcblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIFJldHVybnMgc3RhdGUgb2Ygbm9kZS4gQ2FsbHMgZm9yIGVhY2ggbm9kZVxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW3BhcmVudF1cblx0ICAgICAgICAgICAgICogQHBhcmFtIHsqfSBbbm9kZV1cblx0ICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXldXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IFtwYXRoXVxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW2RlZXBdXG5cdCAgICAgICAgICAgICAqIEByZXR1cm5zIHtPYmplY3R9XG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24gZ2V0U3RhdGUocGFyZW50LCBub2RlLCBrZXkpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBwYXRoID0gYXJndW1lbnRzWzNdID09PSB1bmRlZmluZWQgPyBbXSA6IGFyZ3VtZW50c1szXTtcblx0ICAgICAgICAgICAgICAgIHZhciBkZWVwID0gYXJndW1lbnRzWzRdID09PSB1bmRlZmluZWQgPyAwIDogYXJndW1lbnRzWzRdO1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHsgcGFyZW50OiBwYXJlbnQsIG5vZGU6IG5vZGUsIGtleToga2V5LCBwYXRoOiBwYXRoLCBkZWVwOiBkZWVwIH07XG5cdCAgICAgICAgICAgIH0sXG5cdCAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXHQgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcblx0ICAgICAgICB9LFxuXHQgICAgICAgIG9uU3RlcEludG86IHtcblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIENhbGxiYWNrXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZVxuXHQgICAgICAgICAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbiBvblN0ZXBJbnRvKHN0YXRlKSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblx0ICAgICAgICAgICAgfSxcblx0ICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXG5cdCAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuXHQgICAgICAgIH0sXG5cdCAgICAgICAgX19tYWtlSXRlcmFibGU6IHtcblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIE9ubHkgZm9yIGVzNlxuXHQgICAgICAgICAgICAgKiBAcHJpdmF0ZVxuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9fbWFrZUl0ZXJhYmxlKCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblx0ICAgICAgICAgICAgICAgIHRyeSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdGhpc1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3RoaXM7XG5cdCAgICAgICAgICAgICAgICAgICAgfTtcblx0ICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG5cdCAgICAgICAgICAgIH0sXG5cdCAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXHQgICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcblx0ICAgICAgICB9XG5cdCAgICB9KTtcblx0XG5cdCAgICByZXR1cm4gUmVjdXJzaXZlSXRlcmF0b3I7XG5cdH0pKCk7XG5cdFxuXHRtb2R1bGUuZXhwb3J0cyA9IFJlY3Vyc2l2ZUl0ZXJhdG9yO1xuXHQvLyBza2lwXG5cbi8qKiovIH0sXG4vKiAxICovXG4vKioqLyBmdW5jdGlvbihtb2R1bGUsIGV4cG9ydHMpIHtcblxuXHRcInVzZSBzdHJpY3RcIjtcblx0LyoqXG5cdCAqIEBwYXJhbSB7Kn0gYW55XG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cblx0ZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXHQvKipcblx0ICogQHBhcmFtIHsqfSBhbnlcblx0ICogQHJldHVybnMge0Jvb2xlYW59XG5cdCAqL1xuXHRleHBvcnRzLmlzQXJyYXlMaWtlID0gaXNBcnJheUxpa2U7XG5cdC8qKlxuXHQgKiBAcGFyYW0geyp9IGFueVxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn1cblx0ICovXG5cdGV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblx0LyoqXG5cdCAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmplY3Rcblx0ICogQHJldHVybnMge0FycmF5PFN0cmluZz59XG5cdCAqL1xuXHRleHBvcnRzLmdldEtleXMgPSBnZXRLZXlzO1xuXHRmdW5jdGlvbiBpc09iamVjdChhbnkpIHtcblx0ICByZXR1cm4gYW55ICE9PSBudWxsICYmIHR5cGVvZiBhbnkgPT09IFwib2JqZWN0XCI7XG5cdH1cblx0LyoqXG5cdCAqIEBwYXJhbSB7Kn0gYW55XG5cdCAqIEByZXR1cm5zIHtCb29sZWFufVxuXHQgKi9cblx0dmFyIGlzQXJyYXkgPSBleHBvcnRzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXHRmdW5jdGlvbiBpc0FycmF5TGlrZShhbnkpIHtcblx0ICBpZiAoIWlzT2JqZWN0KGFueSkpIHtcblx0ICAgIHJldHVybiBmYWxzZTtcblx0ICB9aWYgKCEoXCJsZW5ndGhcIiBpbiBhbnkpKSB7XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdCAgfXZhciBsZW5ndGggPSBhbnkubGVuZ3RoO1xuXHQgIGlmICghaXNOdW1iZXIobGVuZ3RoKSkge1xuXHQgICAgcmV0dXJuIGZhbHNlO1xuXHQgIH1pZiAobGVuZ3RoID4gMCkge1xuXHQgICAgcmV0dXJuIGxlbmd0aCAtIDEgaW4gYW55O1xuXHQgIH0gZWxzZSB7XG5cdCAgICBmb3IgKHZhciBrZXkgaW4gYW55KSB7XG5cdCAgICAgIHJldHVybiBmYWxzZTtcblx0ICAgIH1cblx0ICB9XG5cdH1mdW5jdGlvbiBpc051bWJlcihhbnkpIHtcblx0ICByZXR1cm4gdHlwZW9mIGFueSA9PT0gXCJudW1iZXJcIjtcblx0fWZ1bmN0aW9uIGdldEtleXMob2JqZWN0KSB7XG5cdCAgdmFyIGtleXNfID0gT2JqZWN0LmtleXMob2JqZWN0KTtcblx0ICBpZiAoaXNBcnJheShvYmplY3QpKSB7fSBlbHNlIGlmIChpc0FycmF5TGlrZShvYmplY3QpKSB7XG5cdCAgICB2YXIgaW5kZXggPSBrZXlzXy5pbmRleE9mKFwibGVuZ3RoXCIpO1xuXHQgICAgaWYgKGluZGV4ID4gLTEpIHtcblx0ICAgICAga2V5c18uc3BsaWNlKGluZGV4LCAxKTtcblx0ICAgIH1cblx0ICAgIC8vIHNraXAgc29ydFxuXHQgIH0gZWxzZSB7XG5cdCAgICAvLyBzb3J0XG5cdCAgICBrZXlzXyA9IGtleXNfLnNvcnQoKTtcblx0ICB9XG5cdCAgcmV0dXJuIGtleXNfO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuXHQgIHZhbHVlOiB0cnVlXG5cdH0pO1xuXG5cdC8vIHNraXAgc29ydFxuXG4vKioqLyB9XG4vKioqKioqLyBdKVxufSk7XG47XG5cbn0se31dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF1cblxuICAgIHZhciBpc0RhdGFWaWV3ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShoZWFkZXJzKSkge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgICB0aGlzLmFwcGVuZChoZWFkZXJbMF0sIGhlYWRlclsxXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5tYXBbbmFtZV1cbiAgICB0aGlzLm1hcFtuYW1lXSA9IG9sZFZhbHVlID8gb2xkVmFsdWUrJywnK3ZhbHVlIDogdmFsdWVcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHJldHVybiB0aGlzLmhhcyhuYW1lKSA/IHRoaXMubWFwW25hbWVdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1hcCkge1xuICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5tYXBbbmFtZV0sIG5hbWUsIHRoaXMpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pXG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKVxuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSlcbiAgICAgIHJldHVybiB2aWV3LmJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKVxuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIChBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSB8fCBpc0FycmF5QnVmZmVyVmlldyhib2R5KSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBjb25zdW1lZCh0aGlzKSB8fCBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUFycmF5QnVmZmVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keVxuXG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybFxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzXG4gICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbnB1dC5oZWFkZXJzKVxuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2RcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGVcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0XG4gICAgICAgIGlucHV0LmJvZHlVc2VkID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVybCA9IFN0cmluZyhpbnB1dClcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIHJhd0hlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gJ3N0YXR1cycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzIDogMjAwXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcblxufSx7fV0sNzpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIF9MaXN0SXRlbSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4vTGlzdEl0ZW1cIikpO1xuXG52YXIgX3JlY3Vyc2l2ZUl0ZXJhdG9yID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwicmVjdXJzaXZlLWl0ZXJhdG9yXCIpKTtcblxudmFyIF9vYmplY3RQYXRoID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwib2JqZWN0LXBhdGhcIikpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfcmVhZE9ubHlFcnJvcihuYW1lKSB7IHRocm93IG5ldyBFcnJvcihcIlxcXCJcIiArIG5hbWUgKyBcIlxcXCIgaXMgcmVhZC1vbmx5XCIpOyB9XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHsgaWYgKGtleSBpbiBvYmopIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTsgfSBlbHNlIHsgb2JqW2tleV0gPSB2YWx1ZTsgfSByZXR1cm4gb2JqOyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbmZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH1cblxuZnVuY3Rpb24gX2NyZWF0ZUNsYXNzKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgX2RlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH1cblxuZnVuY3Rpb24gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4oc2VsZiwgY2FsbCkgeyBpZiAoY2FsbCAmJiAoX3R5cGVvZihjYWxsKSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgY2FsbCA9PT0gXCJmdW5jdGlvblwiKSkgeyByZXR1cm4gY2FsbDsgfSByZXR1cm4gX2Fzc2VydFRoaXNJbml0aWFsaXplZChzZWxmKTsgfVxuXG5mdW5jdGlvbiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpIHsgaWYgKHNlbGYgPT09IHZvaWQgMCkgeyB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJ0aGlzIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIC0gc3VwZXIoKSBoYXNuJ3QgYmVlbiBjYWxsZWRcIik7IH0gcmV0dXJuIHNlbGY7IH1cblxuZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgX2dldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mID8gT2JqZWN0LmdldFByb3RvdHlwZU9mIDogZnVuY3Rpb24gX2dldFByb3RvdHlwZU9mKG8pIHsgcmV0dXJuIG8uX19wcm90b19fIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihvKTsgfTsgcmV0dXJuIF9nZXRQcm90b3R5cGVPZihvKTsgfVxuXG5mdW5jdGlvbiBfaW5oZXJpdHMoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpIHsgaWYgKHR5cGVvZiBzdXBlckNsYXNzICE9PSBcImZ1bmN0aW9uXCIgJiYgc3VwZXJDbGFzcyAhPT0gbnVsbCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb25cIik7IH0gc3ViQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckNsYXNzICYmIHN1cGVyQ2xhc3MucHJvdG90eXBlLCB7IGNvbnN0cnVjdG9yOiB7IHZhbHVlOiBzdWJDbGFzcywgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IH0pOyBpZiAoc3VwZXJDbGFzcykgX3NldFByb3RvdHlwZU9mKHN1YkNsYXNzLCBzdXBlckNsYXNzKTsgfVxuXG5mdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBfc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHwgZnVuY3Rpb24gX3NldFByb3RvdHlwZU9mKG8sIHApIHsgby5fX3Byb3RvX18gPSBwOyByZXR1cm4gbzsgfTsgcmV0dXJuIF9zZXRQcm90b3R5cGVPZihvLCBwKTsgfVxuXG52YXIgRGF0YUxpc3QgPVxuLyojX19QVVJFX18qL1xuZnVuY3Rpb24gKF9SZWFjdCRDb21wb25lbnQpIHtcbiAgX2luaGVyaXRzKERhdGFMaXN0LCBfUmVhY3QkQ29tcG9uZW50KTtcblxuICBmdW5jdGlvbiBEYXRhTGlzdCgpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRGF0YUxpc3QpO1xuXG4gICAgcmV0dXJuIF9wb3NzaWJsZUNvbnN0cnVjdG9yUmV0dXJuKHRoaXMsIF9nZXRQcm90b3R5cGVPZihEYXRhTGlzdCkuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH1cblxuICBfY3JlYXRlQ2xhc3MoRGF0YUxpc3QsIFt7XG4gICAga2V5OiBcInNldEZpZWxkTWFwXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHNldEZpZWxkTWFwKHBhdGgsIGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcChfZGVmaW5lUHJvcGVydHkoe30sIGV2ZW50LnRhcmdldC5kYXRhc2V0LmZpZWxkLCBwYXRoKSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlck5vZGVzXCIsXG4gICAgdmFsdWU6IGZ1bmN0aW9uIHJlbmRlck5vZGVzKGRhdGEpIHtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICdvYmplY3RQYXRoJykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjaGlsZCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0xpc3RJdGVtLmRlZmF1bHQsIHtcbiAgICAgICAgICBrZXk6IGl0ZW0udG9TdHJpbmcoKSxcbiAgICAgICAgICB2YWx1ZTogaXRlbSxcbiAgICAgICAgICBvYmplY3Q6IGRhdGFbaXRlbV0sXG4gICAgICAgICAgZmllbGRNYXA6IF90aGlzLnByb3BzLmZpZWxkTWFwLFxuICAgICAgICAgIG9uQ2xpY2tDb250YWluZXI6IGZ1bmN0aW9uIG9uQ2xpY2tDb250YWluZXIoZSkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0ub2JqZWN0UGF0aCwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrVGl0bGU6IGZ1bmN0aW9uIG9uQ2xpY2tUaXRsZShlKSB7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuc2V0RmllbGRNYXAoZGF0YVtpdGVtXSwgZSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvbkNsaWNrQ29udGVudDogZnVuY3Rpb24gb25DbGlja0NvbnRlbnQoZSkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLnNldEZpZWxkTWFwKGRhdGFbaXRlbV0sIGUpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdHJhbnNsYXRpb246IF90aGlzLnByb3BzLnRyYW5zbGF0aW9uXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChfdHlwZW9mKGRhdGFbaXRlbV0pID09PSAnb2JqZWN0JyAmJiBkYXRhW2l0ZW1dICE9PSBudWxsKSB7XG4gICAgICAgICAgY2hpbGQgPSBSZWFjdC5jbG9uZUVsZW1lbnQoY2hpbGQsIHtcbiAgICAgICAgICAgIGNoaWxkcmVuOiBBcnJheS5pc0FycmF5KGRhdGFbaXRlbV0pID8gX3RoaXMucmVuZGVyTm9kZXMoZGF0YVtpdGVtXVswXSkgOiBfdGhpcy5yZW5kZXJOb2RlcyhkYXRhW2l0ZW1dKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkcHJvcHMgPSB0aGlzLnByb3BzLFxuICAgICAgICAgIHRyYW5zbGF0aW9uID0gX3RoaXMkcHJvcHMudHJhbnNsYXRpb24sXG4gICAgICAgICAgZGF0YSA9IF90aGlzJHByb3BzLmRhdGE7XG4gICAgICB2YXIgZmllbGRNYXAgPSB0aGlzLnByb3BzLmZpZWxkTWFwO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICBmaWVsZE1hcC5pdGVtQ29udGFpbmVyID0gJyc7XG4gICAgICB9XG5cbiAgICAgIGlmIChmaWVsZE1hcC5pdGVtQ29udGFpbmVyID09PSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgZGF0YSA9IChfcmVhZE9ubHlFcnJvcihcImRhdGFcIiksIGRhdGFbMF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24gPSB0cnVlO1xuICAgICAgICB2YXIgX2RpZEl0ZXJhdG9yRXJyb3IgPSBmYWxzZTtcbiAgICAgICAgdmFyIF9pdGVyYXRvckVycm9yID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yID0gbmV3IF9yZWN1cnNpdmVJdGVyYXRvci5kZWZhdWx0KGRhdGEpW1N5bWJvbC5pdGVyYXRvcl0oKSwgX3N0ZXA7ICEoX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiA9IChfc3RlcCA9IF9pdGVyYXRvci5uZXh0KCkpLmRvbmUpOyBfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwJHZhbHVlID0gX3N0ZXAudmFsdWUsXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gX3N0ZXAkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcCR2YWx1ZS5ub2RlLFxuICAgICAgICAgICAgICAgIGtleSA9IF9zdGVwJHZhbHVlLmtleSxcbiAgICAgICAgICAgICAgICBwYXRoID0gX3N0ZXAkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgPT09ICdvYmplY3QnICYmIG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdmFyIHBhdGhTdHJpbmcgPSBwYXRoLmpvaW4oJy4nKTtcblxuICAgICAgICAgICAgICBfb2JqZWN0UGF0aC5kZWZhdWx0LnNldChkYXRhLCBwYXRoU3RyaW5nICsgJy5vYmplY3RQYXRoJywgcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvciA9IHRydWU7XG4gICAgICAgICAgX2l0ZXJhdG9yRXJyb3IgPSBlcnI7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghX2l0ZXJhdG9yTm9ybWFsQ29tcGxldGlvbiAmJiBfaXRlcmF0b3IucmV0dXJuICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgX2l0ZXJhdG9yLnJldHVybigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBpZiAoX2RpZEl0ZXJhdG9yRXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImgzXCIsIG51bGwsIHRyYW5zbGF0aW9uLnNlbGVjdEl0ZW1zQ29udGFpbmVyKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInVsXCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwianNvbi10cmVlXCJcbiAgICAgICAgfSwgdGhpcy5yZW5kZXJOb2RlcyhkYXRhKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG9iamVjdERhdGEgPSBfb2JqZWN0UGF0aC5kZWZhdWx0LmdldChkYXRhLCBmaWVsZE1hcC5pdGVtQ29udGFpbmVyKTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShvYmplY3REYXRhKSkge1xuICAgICAgICAgIG9iamVjdERhdGEgPSBvYmplY3REYXRhWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZTtcbiAgICAgICAgdmFyIF9kaWRJdGVyYXRvckVycm9yMiA9IGZhbHNlO1xuICAgICAgICB2YXIgX2l0ZXJhdG9yRXJyb3IyID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZm9yICh2YXIgX2l0ZXJhdG9yMiA9IG5ldyBfcmVjdXJzaXZlSXRlcmF0b3IuZGVmYXVsdChvYmplY3REYXRhKVtTeW1ib2wuaXRlcmF0b3JdKCksIF9zdGVwMjsgIShfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiA9IChfc3RlcDIgPSBfaXRlcmF0b3IyLm5leHQoKSkuZG9uZSk7IF9pdGVyYXRvck5vcm1hbENvbXBsZXRpb24yID0gdHJ1ZSkge1xuICAgICAgICAgICAgdmFyIF9zdGVwMiR2YWx1ZSA9IF9zdGVwMi52YWx1ZSxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBfc3RlcDIkdmFsdWUucGFyZW50LFxuICAgICAgICAgICAgICAgIG5vZGUgPSBfc3RlcDIkdmFsdWUubm9kZSxcbiAgICAgICAgICAgICAgICBrZXkgPSBfc3RlcDIkdmFsdWUua2V5LFxuICAgICAgICAgICAgICAgIHBhdGggPSBfc3RlcDIkdmFsdWUucGF0aDtcblxuICAgICAgICAgICAgaWYgKF90eXBlb2Yobm9kZSkgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIHZhciBfcGF0aFN0cmluZyA9IHBhdGguam9pbignLicpO1xuXG4gICAgICAgICAgICAgIF9vYmplY3RQYXRoLmRlZmF1bHQuc2V0KG9iamVjdERhdGEsIF9wYXRoU3RyaW5nLCBfcGF0aFN0cmluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBfZGlkSXRlcmF0b3JFcnJvcjIgPSB0cnVlO1xuICAgICAgICAgIF9pdGVyYXRvckVycm9yMiA9IGVycjtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCFfaXRlcmF0b3JOb3JtYWxDb21wbGV0aW9uMiAmJiBfaXRlcmF0b3IyLnJldHVybiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgIF9pdGVyYXRvcjIucmV0dXJuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChfZGlkSXRlcmF0b3JFcnJvcjIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgX2l0ZXJhdG9yRXJyb3IyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJoM1wiLCBudWxsLCB0cmFuc2xhdGlvbi5zZWxlY3RUaXRsZUNvbnRlbnQpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJqc29uLXRyZWVcIlxuICAgICAgICB9LCB0aGlzLnJlbmRlck5vZGVzKG9iamVjdERhdGEpKSk7XG4gICAgICB9XG4gICAgfVxuICB9XSk7XG5cbiAgcmV0dXJuIERhdGFMaXN0O1xufShSZWFjdC5Db21wb25lbnQpO1xuXG52YXIgX2RlZmF1bHQgPSBEYXRhTGlzdDtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHtcIi4vTGlzdEl0ZW1cIjoxMCxcIm9iamVjdC1wYXRoXCI6MyxcInJlY3Vyc2l2ZS1pdGVyYXRvclwiOjV9XSw4OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0RhdGFMaXN0ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9EYXRhTGlzdFwiKSk7XG5cbnZhciBfZ2V0QXBpRGF0YSA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQocmVxdWlyZShcIi4uLy4uL1V0aWxpdGllcy9nZXRBcGlEYXRhXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbnZhciBGaWVsZFNlbGVjdGlvbiA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoRmllbGRTZWxlY3Rpb24sIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIEZpZWxkU2VsZWN0aW9uKCkge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBGaWVsZFNlbGVjdGlvbik7XG5cbiAgICByZXR1cm4gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKEZpZWxkU2VsZWN0aW9uKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhGaWVsZFNlbGVjdGlvbiwgW3tcbiAgICBrZXk6IFwiY29tcG9uZW50RGlkTW91bnRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gY29tcG9uZW50RGlkTW91bnQoKSB7XG4gICAgICB0aGlzLmdldERhdGEoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiZ2V0RGF0YVwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBnZXREYXRhKCkge1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdmFyIF90aGlzJHByb3BzID0gdGhpcy5wcm9wcyxcbiAgICAgICAgICB1cmwgPSBfdGhpcyRwcm9wcy51cmwsXG4gICAgICAgICAgdHJhbnNsYXRpb24gPSBfdGhpcyRwcm9wcy50cmFuc2xhdGlvbjtcbiAgICAgICgwLCBfZ2V0QXBpRGF0YS5kZWZhdWx0KSh1cmwpLnRoZW4oZnVuY3Rpb24gKF9yZWYpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IF9yZWYucmVzdWx0O1xuXG4gICAgICAgIGlmICghcmVzdWx0IHx8IE9iamVjdC5rZXlzKHJlc3VsdCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgX3RoaXMucHJvcHMuc2V0RXJyb3IoRXJyb3IodHJhbnNsYXRpb24uY291bGROb3RGZXRjaCkpO1xuXG4gICAgICAgICAgX3RoaXMucHJvcHMuc2V0TG9hZGVkKHRydWUpO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMucHJvcHMuc2V0SXRlbXMocmVzdWx0KTtcblxuICAgICAgICBfdGhpcy5wcm9wcy5zZXRMb2FkZWQodHJ1ZSk7XG4gICAgICB9LCBmdW5jdGlvbiAoX3JlZjIpIHtcbiAgICAgICAgdmFyIGVycm9yID0gX3JlZjIuZXJyb3I7XG5cbiAgICAgICAgX3RoaXMucHJvcHMuc2V0TG9hZGVkKHRydWUpO1xuXG4gICAgICAgIF90aGlzLnByb3BzLnNldEVycm9yKGVycm9yKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cGRhdGVGaWVsZE1hcFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiB1cGRhdGVGaWVsZE1hcCh2YWx1ZSkge1xuICAgICAgdGhpcy5wcm9wcy51cGRhdGVGaWVsZE1hcCh2YWx1ZSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlbmRlclwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgICB2YXIgX3RoaXMkcHJvcHMyID0gdGhpcy5wcm9wcyxcbiAgICAgICAgICB1cmwgPSBfdGhpcyRwcm9wczIudXJsLFxuICAgICAgICAgIGVycm9yID0gX3RoaXMkcHJvcHMyLmVycm9yLFxuICAgICAgICAgIGZpZWxkTWFwID0gX3RoaXMkcHJvcHMyLmZpZWxkTWFwLFxuICAgICAgICAgIHRyYW5zbGF0aW9uID0gX3RoaXMkcHJvcHMyLnRyYW5zbGF0aW9uLFxuICAgICAgICAgIGlzTG9hZGVkID0gX3RoaXMkcHJvcHMyLmlzTG9hZGVkLFxuICAgICAgICAgIGl0ZW1zID0gX3RoaXMkcHJvcHMyLml0ZW1zO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge1xuICAgICAgICAgIGNsYXNzTmFtZTogXCJub3RpY2Ugbm90aWNlLWVycm9yIGlubGluZVwiXG4gICAgICAgIH0sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIGVycm9yLm1lc3NhZ2UpKTtcbiAgICAgIH0gZWxzZSBpZiAoIWlzTG9hZGVkKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtcbiAgICAgICAgICBjbGFzc05hbWU6IFwic3Bpbm5lciBpcy1hY3RpdmVcIlxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KF9EYXRhTGlzdC5kZWZhdWx0LCB7XG4gICAgICAgICAgZGF0YTogaXRlbXMsXG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgZmllbGRNYXA6IGZpZWxkTWFwLFxuICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwOiB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyksXG4gICAgICAgICAgdHJhbnNsYXRpb246IHRyYW5zbGF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBGaWVsZFNlbGVjdGlvbjtcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gRmllbGRTZWxlY3Rpb247XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuLi8uLi9VdGlsaXRpZXMvZ2V0QXBpRGF0YVwiOjE0LFwiLi9EYXRhTGlzdFwiOjd9XSw5OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgSW5wdXRGaWVsZHMgPSBmdW5jdGlvbiBJbnB1dEZpZWxkcyhfcmVmKSB7XG4gIHZhciBmaWVsZE1hcCA9IF9yZWYuZmllbGRNYXAsXG4gICAgICB1cmwgPSBfcmVmLnVybDtcbiAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICB0eXBlOiBcImhpZGRlblwiLFxuICAgIG5hbWU6IFwibW9kX2pzb25fcmVuZGVyX3VybFwiLFxuICAgIHZhbHVlOiB1cmxcbiAgfSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiLCB7XG4gICAgdHlwZTogXCJoaWRkZW5cIixcbiAgICBuYW1lOiBcIm1vZF9qc29uX3JlbmRlcl9maWVsZG1hcFwiLFxuICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShmaWVsZE1hcClcbiAgfSkpO1xufTtcblxudmFyIF9kZWZhdWx0ID0gSW5wdXRGaWVsZHM7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7fV0sMTA6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmRlZmF1bHQgPSB2b2lkIDA7XG5cbnZhciBMaXN0SXRlbSA9IGZ1bmN0aW9uIExpc3RJdGVtKF9yZWYpIHtcbiAgdmFyIHZhbHVlID0gX3JlZi52YWx1ZSxcbiAgICAgIGNoaWxkcmVuID0gX3JlZi5jaGlsZHJlbixcbiAgICAgIGZpZWxkTWFwID0gX3JlZi5maWVsZE1hcCxcbiAgICAgIG9iamVjdCA9IF9yZWYub2JqZWN0LFxuICAgICAgb25DbGlja1RpdGxlID0gX3JlZi5vbkNsaWNrVGl0bGUsXG4gICAgICBvbkNsaWNrQ29udGVudCA9IF9yZWYub25DbGlja0NvbnRlbnQsXG4gICAgICBvbkNsaWNrQ29udGFpbmVyID0gX3JlZi5vbkNsaWNrQ29udGFpbmVyLFxuICAgICAgdHJhbnNsYXRpb24gPSBfcmVmLnRyYW5zbGF0aW9uO1xuXG4gIGlmIChjaGlsZHJlbikge1xuICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwibGlcIiwgbnVsbCwgQXJyYXkuaXNBcnJheShvYmplY3QpICYmIGZpZWxkTWFwLml0ZW1Db250YWluZXIgPT09IG51bGwgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCB7XG4gICAgICBjbGFzc05hbWU6IFwiZGFzaGljb25zIGRhc2hpY29ucy1wb3J0Zm9saW9cIlxuICAgIH0pLCBcIiBcIiwgdmFsdWUsIFwiIFwiLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICBocmVmOiBcIiNcIixcbiAgICAgIGNsYXNzTmFtZTogXCJ0cmVlLXNlbGVjdFwiLFxuICAgICAgXCJkYXRhLWZpZWxkXCI6IFwiaXRlbUNvbnRhaW5lclwiLFxuICAgICAgb25DbGljazogb25DbGlja0NvbnRhaW5lclxuICAgIH0sIHRyYW5zbGF0aW9uLnNlbGVjdCkpIDogUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgdmFsdWUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwidWxcIiwgbnVsbCwgY2hpbGRyZW4pKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImxpXCIsIG51bGwsIGZpZWxkTWFwLnRpdGxlID09PSBvYmplY3QgJiYgZmllbGRNYXAudGl0bGUgPyBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIHRyYW5zbGF0aW9uLnRpdGxlLCBcIjogXCIpIDogJycsIGZpZWxkTWFwLmNvbnRlbnQgPT09IG9iamVjdCAmJiBmaWVsZE1hcC5jb250ZW50ID8gUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCB0cmFuc2xhdGlvbi5jb250ZW50LCBcIjogXCIpIDogJycsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIHZhbHVlKSwgIWZpZWxkTWFwLnRpdGxlICYmIGZpZWxkTWFwLmNvbnRlbnQgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcInRpdGxlXCIsXG4gICAgICBvbkNsaWNrOiBvbkNsaWNrVGl0bGVcbiAgICB9LCB0cmFuc2xhdGlvbi50aXRsZSkgOiAnJywgIWZpZWxkTWFwLmNvbnRlbnQgJiYgZmllbGRNYXAudGl0bGUgIT09IG9iamVjdCAmJiBmaWVsZE1hcC5pdGVtQ29udGFpbmVyICE9PSBudWxsID8gUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgaHJlZjogXCIjXCIsXG4gICAgICBjbGFzc05hbWU6IFwidHJlZS1zZWxlY3RcIixcbiAgICAgIFwiZGF0YS1maWVsZFwiOiBcImNvbnRlbnRcIixcbiAgICAgIG9uQ2xpY2s6IG9uQ2xpY2tDb250ZW50XG4gICAgfSwgdHJhbnNsYXRpb24uY29udGVudCkgOiAnJyk7XG4gIH1cbn07XG5cbnZhciBfZGVmYXVsdCA9IExpc3RJdGVtO1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDExOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5kZWZhdWx0ID0gdm9pZCAwO1xuXG52YXIgX0ZpZWxkU2VsZWN0aW9uID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9GaWVsZFNlbGVjdGlvblwiKSk7XG5cbnZhciBfSW5wdXRGaWVsZHMgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KHJlcXVpcmUoXCIuL0lucHV0RmllbGRzXCIpKTtcblxudmFyIF9TdW1tYXJ5ID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9TdW1tYXJ5XCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuZnVuY3Rpb24gX2V4dGVuZHMoKSB7IF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTsgcmV0dXJuIF9leHRlbmRzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH1cblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxuZnVuY3Rpb24gX2RlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfVxuXG5mdW5jdGlvbiBfY3JlYXRlQ2xhc3MoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBfZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIF9kZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfVxuXG5mdW5jdGlvbiBfcG9zc2libGVDb25zdHJ1Y3RvclJldHVybihzZWxmLCBjYWxsKSB7IGlmIChjYWxsICYmIChfdHlwZW9mKGNhbGwpID09PSBcIm9iamVjdFwiIHx8IHR5cGVvZiBjYWxsID09PSBcImZ1bmN0aW9uXCIpKSB7IHJldHVybiBjYWxsOyB9IHJldHVybiBfYXNzZXJ0VGhpc0luaXRpYWxpemVkKHNlbGYpOyB9XG5cbmZ1bmN0aW9uIF9hc3NlcnRUaGlzSW5pdGlhbGl6ZWQoc2VsZikgeyBpZiAoc2VsZiA9PT0gdm9pZCAwKSB7IHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcInRoaXMgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgLSBzdXBlcigpIGhhc24ndCBiZWVuIGNhbGxlZFwiKTsgfSByZXR1cm4gc2VsZjsgfVxuXG5mdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyBfZ2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgPyBPYmplY3QuZ2V0UHJvdG90eXBlT2YgOiBmdW5jdGlvbiBfZ2V0UHJvdG90eXBlT2YobykgeyByZXR1cm4gby5fX3Byb3RvX18gfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKG8pOyB9OyByZXR1cm4gX2dldFByb3RvdHlwZU9mKG8pOyB9XG5cbmZ1bmN0aW9uIF9pbmhlcml0cyhzdWJDbGFzcywgc3VwZXJDbGFzcykgeyBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgIT09IFwiZnVuY3Rpb25cIiAmJiBzdXBlckNsYXNzICE9PSBudWxsKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTsgfSBzdWJDbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MgJiYgc3VwZXJDbGFzcy5wcm90b3R5cGUsIHsgY29uc3RydWN0b3I6IHsgdmFsdWU6IHN1YkNsYXNzLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0gfSk7IGlmIChzdXBlckNsYXNzKSBfc2V0UHJvdG90eXBlT2Yoc3ViQ2xhc3MsIHN1cGVyQ2xhc3MpOyB9XG5cbmZ1bmN0aW9uIF9zZXRQcm90b3R5cGVPZihvLCBwKSB7IF9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbiBfc2V0UHJvdG90eXBlT2YobywgcCkgeyBvLl9fcHJvdG9fXyA9IHA7IHJldHVybiBvOyB9OyByZXR1cm4gX3NldFByb3RvdHlwZU9mKG8sIHApOyB9XG5cbnZhciBTZXR0aW5ncyA9XG4vKiNfX1BVUkVfXyovXG5mdW5jdGlvbiAoX1JlYWN0JENvbXBvbmVudCkge1xuICBfaW5oZXJpdHMoU2V0dGluZ3MsIF9SZWFjdCRDb21wb25lbnQpO1xuXG4gIGZ1bmN0aW9uIFNldHRpbmdzKHByb3BzKSB7XG4gICAgdmFyIF90aGlzO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFNldHRpbmdzKTtcblxuICAgIF90aGlzID0gX3Bvc3NpYmxlQ29uc3RydWN0b3JSZXR1cm4odGhpcywgX2dldFByb3RvdHlwZU9mKFNldHRpbmdzKS5jYWxsKHRoaXMsIHByb3BzKSk7XG4gICAgX3RoaXMuc3RhdGUgPSB7XG4gICAgICBzaG93RmllbGRTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgdXJsOiAnJyxcbiAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgIGVycm9yOiBudWxsLFxuICAgICAgaXRlbXM6IFtdLFxuICAgICAgZmllbGRNYXA6IHtcbiAgICAgICAgaXRlbUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgdGl0bGU6ICcnLFxuICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuIF90aGlzO1xuICB9XG5cbiAgX2NyZWF0ZUNsYXNzKFNldHRpbmdzLCBbe1xuICAgIGtleTogXCJjb21wb25lbnREaWRNb3VudFwiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiBjb21wb25lbnREaWRNb3VudCgpIHtcbiAgICAgIHRoaXMuaW5pdE9wdGlvbnMoKTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwiaW5pdE9wdGlvbnNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gaW5pdE9wdGlvbnMoKSB7XG4gICAgICBpZiAodHlwZW9mIG1vZEpzb25SZW5kZXIub3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBtb2RKc29uUmVuZGVyLm9wdGlvbnM7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgIHVybDogb3B0aW9ucy51cmwgPyBvcHRpb25zLnVybCA6ICcnLFxuICAgICAgICAgIGZpZWxkTWFwOiBvcHRpb25zLmZpZWxkTWFwID8gSlNPTi5wYXJzZShvcHRpb25zLmZpZWxkTWFwKSA6IHtcbiAgICAgICAgICAgIGl0ZW1Db250YWluZXI6IG51bGwsXG4gICAgICAgICAgICB0aXRsZTogJycsXG4gICAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiAhIW9wdGlvbnMudXJsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJ1cmxDaGFuZ2VcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXJsQ2hhbmdlKGV2ZW50KSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgdXJsOiBldmVudC50YXJnZXQudmFsdWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJoYW5kbGVTdWJtaXRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgICAgIHNob3dGaWVsZFNlbGVjdGlvbjogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCB7XG4gICAga2V5OiBcInJlc2V0T3B0aW9uc1wiLFxuICAgIHZhbHVlOiBmdW5jdGlvbiByZXNldE9wdGlvbnMoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgZmllbGRNYXA6IHtcbiAgICAgICAgICBpdGVtQ29udGFpbmVyOiBudWxsLFxuICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwidXBkYXRlRmllbGRNYXBcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gdXBkYXRlRmllbGRNYXAodmFsdWUpIHtcbiAgICAgIHZhciBuZXdWYWwgPSBPYmplY3QuYXNzaWduKHRoaXMuc3RhdGUuZmllbGRNYXAsIHZhbHVlKTtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBmaWVsZE1hcDogbmV3VmFsXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwic2V0RXJyb3JcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0RXJyb3IoZXJyb3IpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBlcnJvcjogZXJyb3JcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJzZXRMb2FkZWRcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0TG9hZGVkKHZhbHVlKSB7XG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgaXNMb2FkZWQ6IHZhbHVlXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIHtcbiAgICBrZXk6IFwic2V0SXRlbXNcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gc2V0SXRlbXMoaXRlbXMpIHtcbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICBpdGVtczogaXRlbXNcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwge1xuICAgIGtleTogXCJyZW5kZXJcIixcbiAgICB2YWx1ZTogZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy5wcm9wcy50cmFuc2xhdGlvbjtcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSA9IHRoaXMuc3RhdGUsXG4gICAgICAgICAgc2hvd0ZpZWxkU2VsZWN0aW9uID0gX3RoaXMkc3RhdGUuc2hvd0ZpZWxkU2VsZWN0aW9uLFxuICAgICAgICAgIHVybCA9IF90aGlzJHN0YXRlLnVybCxcbiAgICAgICAgICBlcnJvciA9IF90aGlzJHN0YXRlLmVycm9yLFxuICAgICAgICAgIGlzTG9hZGVkID0gX3RoaXMkc3RhdGUuaXNMb2FkZWQsXG4gICAgICAgICAgaXRlbXMgPSBfdGhpcyRzdGF0ZS5pdGVtcztcbiAgICAgIHZhciBfdGhpcyRzdGF0ZSRmaWVsZE1hcCA9IHRoaXMuc3RhdGUuZmllbGRNYXAsXG4gICAgICAgICAgaXRlbUNvbnRhaW5lciA9IF90aGlzJHN0YXRlJGZpZWxkTWFwLml0ZW1Db250YWluZXIsXG4gICAgICAgICAgdGl0bGUgPSBfdGhpcyRzdGF0ZSRmaWVsZE1hcC50aXRsZSxcbiAgICAgICAgICBjb250ZW50ID0gX3RoaXMkc3RhdGUkZmllbGRNYXAuY29udGVudDtcblxuICAgICAgaWYgKHVybCAmJiBpdGVtQ29udGFpbmVyICE9PSBudWxsICYmIHRpdGxlICYmIGNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChfU3VtbWFyeS5kZWZhdWx0LCBfZXh0ZW5kcyh7fSwgdGhpcy5zdGF0ZSwge1xuICAgICAgICAgIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvblxuICAgICAgICB9KSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0lucHV0RmllbGRzLmRlZmF1bHQsIHRoaXMuc3RhdGUpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgICAgICAgaHJlZjogXCIjXCIsXG4gICAgICAgICAgb25DbGljazogdGhpcy5yZXNldE9wdGlvbnMuYmluZCh0aGlzKSxcbiAgICAgICAgICBjbGFzc05hbWU6IFwiYnV0dG9uXCJcbiAgICAgICAgfSwgdHJhbnNsYXRpb24ucmVzZXRTZXR0aW5ncykpKTtcbiAgICAgIH0gZWxzZSBpZiAoc2hvd0ZpZWxkU2VsZWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoX0ZpZWxkU2VsZWN0aW9uLmRlZmF1bHQsIHtcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBlcnJvcjogZXJyb3IsXG4gICAgICAgICAgc2V0RXJyb3I6IHRoaXMuc2V0RXJyb3IuYmluZCh0aGlzKSxcbiAgICAgICAgICBpc0xvYWRlZDogaXNMb2FkZWQsXG4gICAgICAgICAgc2V0TG9hZGVkOiB0aGlzLnNldExvYWRlZC5iaW5kKHRoaXMpLFxuICAgICAgICAgIGl0ZW1zOiBpdGVtcyxcbiAgICAgICAgICBzZXRJdGVtczogdGhpcy5zZXRJdGVtcy5iaW5kKHRoaXMpLFxuICAgICAgICAgIGZpZWxkTWFwOiB0aGlzLnN0YXRlLmZpZWxkTWFwLFxuICAgICAgICAgIHVwZGF0ZUZpZWxkTWFwOiB0aGlzLnVwZGF0ZUZpZWxkTWFwLmJpbmQodGhpcyksXG4gICAgICAgICAgdHJhbnNsYXRpb246IHRyYW5zbGF0aW9uXG4gICAgICAgIH0pLCBSZWFjdC5jcmVhdGVFbGVtZW50KF9JbnB1dEZpZWxkcy5kZWZhdWx0LCB0aGlzLnN0YXRlKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge1xuICAgICAgICAgIGhyZWY6IFwiI1wiLFxuICAgICAgICAgIG9uQ2xpY2s6IHRoaXMucmVzZXRPcHRpb25zLmJpbmQodGhpcyksXG4gICAgICAgICAgY2xhc3NOYW1lOiBcImJ1dHRvblwiXG4gICAgICAgIH0sIHRyYW5zbGF0aW9uLnJlc2V0U2V0dGluZ3MpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcIndyYXBcIlxuICAgICAgICB9LCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiLCB7XG4gICAgICAgICAgb25TdWJtaXQ6IHRoaXMuaGFuZGxlU3VibWl0LmJpbmQodGhpcylcbiAgICAgICAgfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImxhYmVsXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgXCJBUEkgVVJMXCIpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCBudWxsLCB0cmFuc2xhdGlvbi52YWxpZEpzb25VcmwpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICBjbGFzc05hbWU6IFwidXJsLWlucHV0XCIsXG4gICAgICAgICAgdmFsdWU6IHVybCxcbiAgICAgICAgICBvbkNoYW5nZTogdGhpcy51cmxDaGFuZ2UuYmluZCh0aGlzKVxuICAgICAgICB9KSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlucHV0XCIsIHtcbiAgICAgICAgICB0eXBlOiBcInN1Ym1pdFwiLFxuICAgICAgICAgIGNsYXNzTmFtZTogXCJidXR0b24gYnV0dG9uLXByaW1hcnlcIixcbiAgICAgICAgICB2YWx1ZTogdHJhbnNsYXRpb24uc2VuZFJlcXVlc3RcbiAgICAgICAgfSkpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChfSW5wdXRGaWVsZHMuZGVmYXVsdCwgdGhpcy5zdGF0ZSkpO1xuICAgICAgfVxuICAgIH1cbiAgfV0pO1xuXG4gIHJldHVybiBTZXR0aW5ncztcbn0oUmVhY3QuQ29tcG9uZW50KTtcblxudmFyIF9kZWZhdWx0ID0gU2V0dGluZ3M7XG5leHBvcnRzLmRlZmF1bHQgPSBfZGVmYXVsdDtcblxufSx7XCIuL0ZpZWxkU2VsZWN0aW9uXCI6OCxcIi4vSW5wdXRGaWVsZHNcIjo5LFwiLi9TdW1tYXJ5XCI6MTJ9XSwxMjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxudmFyIFN1bW1hcnkgPSBmdW5jdGlvbiBTdW1tYXJ5KF9yZWYpIHtcbiAgdmFyIHVybCA9IF9yZWYudXJsLFxuICAgICAgZmllbGRNYXAgPSBfcmVmLmZpZWxkTWFwLFxuICAgICAgdHJhbnNsYXRpb24gPSBfcmVmLnRyYW5zbGF0aW9uO1xuICByZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwicFwiLCBudWxsLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwic3Ryb25nXCIsIG51bGwsIFwiQVBJIFVSTFwiKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImJyXCIsIG51bGwpLCBSZWFjdC5jcmVhdGVFbGVtZW50KFwiYVwiLCB7XG4gICAgaHJlZjogdXJsLFxuICAgIHRhcmdldDogXCJfYmxhbmtcIlxuICB9LCB1cmwpKSwgUmVhY3QuY3JlYXRlRWxlbWVudChcInBcIiwgbnVsbCwgUmVhY3QuY3JlYXRlRWxlbWVudChcInN0cm9uZ1wiLCBudWxsLCB0cmFuc2xhdGlvbi50aXRsZSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgZmllbGRNYXAudGl0bGUucmVwbGFjZSgnLicsICcg4oCTPiAnKSksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJwXCIsIG51bGwsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzdHJvbmdcIiwgbnVsbCwgdHJhbnNsYXRpb24uY29udGVudCksIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJiclwiLCBudWxsKSwgZmllbGRNYXAuY29udGVudC5yZXBsYWNlKCcuJywgJyDigJM+ICcpKSk7XG59O1xuXG52YXIgX2RlZmF1bHQgPSBTdW1tYXJ5O1xuZXhwb3J0cy5kZWZhdWx0ID0gX2RlZmF1bHQ7XG5cbn0se31dLDEzOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblwidXNlIHN0cmljdFwiO1xuXG5yZXF1aXJlKFwiZXM2LXByb21pc2VcIik7XG5cbnJlcXVpcmUoXCJpc29tb3JwaGljLWZldGNoXCIpO1xuXG52YXIgX1NldHRpbmdzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChyZXF1aXJlKFwiLi9Db21wb25lbnRzL1NldHRpbmdzXCIpKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuLy8gUG9seWZpbGxzXG4vLyBDb21wb25lbnRzXG52YXIgbW9kSnNvblJlbmRlckVsZW1lbnQgPSAnbW9kdWxhcml0eS1qc29uLXJlbmRlcic7XG52YXIgZG9tRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1vZEpzb25SZW5kZXJFbGVtZW50KTtcbnZhciBfbW9kSnNvblJlbmRlciA9IG1vZEpzb25SZW5kZXIsXG4gICAgdHJhbnNsYXRpb24gPSBfbW9kSnNvblJlbmRlci50cmFuc2xhdGlvbjtcblJlYWN0RE9NLnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KF9TZXR0aW5ncy5kZWZhdWx0LCB7XG4gIHRyYW5zbGF0aW9uOiB0cmFuc2xhdGlvblxufSksIGRvbUVsZW1lbnQpO1xuXG59LHtcIi4vQ29tcG9uZW50cy9TZXR0aW5nc1wiOjExLFwiZXM2LXByb21pc2VcIjoxLFwiaXNvbW9ycGhpYy1mZXRjaFwiOjJ9XSwxNDpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHZvaWQgMDtcblxuZnVuY3Rpb24gZ2V0QXBpRGF0YSh1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybCkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgcmV0dXJuIHJlcy5qc29uKCk7XG4gIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN1bHQ6IHJlc3VsdFxuICAgIH07XG4gIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjogZXJyb3JcbiAgICB9O1xuICB9KTtcbn1cblxudmFyIF9kZWZhdWx0ID0gZ2V0QXBpRGF0YTtcbmV4cG9ydHMuZGVmYXVsdCA9IF9kZWZhdWx0O1xuXG59LHt9XX0se30sWzEzXSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdlpYTTJMWEJ5YjIxcGMyVXZaR2x6ZEM5bGN6WXRjSEp2YldselpTNXFjeUlzSW01dlpHVmZiVzlrZFd4bGN5OXBjMjl0YjNKd2FHbGpMV1psZEdOb0wyWmxkR05vTFc1d2JTMWljbTkzYzJWeWFXWjVMbXB6SWl3aWJtOWtaVjl0YjJSMWJHVnpMMjlpYW1WamRDMXdZWFJvTDJsdVpHVjRMbXB6SWl3aWJtOWtaVjl0YjJSMWJHVnpMM0J5YjJObGMzTXZZbkp2ZDNObGNpNXFjeUlzSW01dlpHVmZiVzlrZFd4bGN5OXlaV04xY25OcGRtVXRhWFJsY21GMGIzSXZaR2x6ZEM5eVpXTjFjbk5wZG1VdGFYUmxjbUYwYjNJdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmQyaGhkSGRuTFdabGRHTm9MMlpsZEdOb0xtcHpJaXdpYzI5MWNtTmxMMnB6TDBGa2JXbHVMME52YlhCdmJtVnVkSE12UkdGMFlVeHBjM1F1YW5NaUxDSnpiM1Z5WTJVdmFuTXZRV1J0YVc0dlEyOXRjRzl1Wlc1MGN5OUdhV1ZzWkZObGJHVmpkR2x2Ymk1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMGx1Y0hWMFJtbGxiR1J6TG1weklpd2ljMjkxY21ObEwycHpMMEZrYldsdUwwTnZiWEJ2Ym1WdWRITXZUR2x6ZEVsMFpXMHVhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2UTI5dGNHOXVaVzUwY3k5VFpYUjBhVzVuY3k1cWN5SXNJbk52ZFhKalpTOXFjeTlCWkcxcGJpOURiMjF3YjI1bGJuUnpMMU4xYlcxaGNua3Vhbk1pTENKemIzVnlZMlV2YW5NdlFXUnRhVzR2U1c1a1pYaEJaRzFwYmk1cWN5SXNJbk52ZFhKalpTOXFjeTlWZEdsc2FYUnBaWE12WjJWMFFYQnBSR0YwWVM1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaVFVRkJRVHM3UVVOQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPenM3TzBGREwzQkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN1FVTk9RVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3p0QlEzQlRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3p0QlEzaE1RVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96dEJRM1pXUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN096czdPenM3T3p0QlF6ZGpRVHM3UVVGRFFUczdRVUZEUVRzN096czdPenM3T3pzN096czdPenM3T3pzN096czdPenM3U1VGRlRTeFJPenM3T3pzN096czdPenM3TzJkRFFVTlZMRWtzUlVGQlRTeExMRVZCUVU4N1FVRkRja0lzVFVGQlFTeExRVUZMTEVOQlFVTXNZMEZCVGp0QlFVTkJMRmRCUVVzc1MwRkJUQ3hEUVVGWExHTkJRVmdzY1VKQlFUUkNMRXRCUVVzc1EwRkJReXhOUVVGT0xFTkJRV0VzVDBGQllpeERRVUZ4UWl4TFFVRnFSQ3hGUVVGNVJDeEpRVUY2UkR0QlFVTklPenM3WjBOQlJWY3NTU3hGUVVGTk8wRkJRVUU3TzBGQlEyUXNZVUZCVHl4TlFVRk5MRU5CUVVNc1NVRkJVQ3hEUVVGWkxFbEJRVm9zUlVGQmEwSXNSMEZCYkVJc1EwRkJjMElzVlVGQlFTeEpRVUZKTEVWQlFVazdRVUZEYWtNc1dVRkJTU3hKUVVGSkxFdEJRVXNzV1VGQllpeEZRVUV5UWp0QlFVTjJRanRCUVVOSU96dEJRVVZFTEZsQlFVa3NTMEZCU3l4SFFVRkhMRzlDUVVGRExHbENRVUZFTzBGQlFWVXNWVUZCUVN4SFFVRkhMRVZCUVVVc1NVRkJTU3hEUVVGRExGRkJRVXdzUlVGQlpqdEJRVU5WTEZWQlFVRXNTMEZCU3l4RlFVRkZMRWxCUkdwQ08wRkJSVlVzVlVGQlFTeE5RVUZOTEVWQlFVVXNTVUZCU1N4RFFVRkRMRWxCUVVRc1EwRkdkRUk3UVVGSFZTeFZRVUZCTEZGQlFWRXNSVUZCUlN4TFFVRkpMRU5CUVVNc1MwRkJUQ3hEUVVGWExGRkJTQzlDTzBGQlNWVXNWVUZCUVN4blFrRkJaMElzUlVGQlJTd3dRa0ZCUVN4RFFVRkRPMEZCUVVFc2JVSkJRVWtzUzBGQlNTeERRVUZETEZkQlFVd3NRMEZCYVVJc1NVRkJTU3hEUVVGRExFbEJRVVFzUTBGQlNpeERRVUZYTEZWQlFUVkNMRVZCUVhkRExFTkJRWGhETEVOQlFVbzdRVUZCUVN4WFFVbzNRanRCUVV0VkxGVkJRVUVzV1VGQldTeEZRVUZGTEhOQ1FVRkJMRU5CUVVNN1FVRkJRU3h0UWtGQlNTeExRVUZKTEVOQlFVTXNWMEZCVEN4RFFVRnBRaXhKUVVGSkxFTkJRVU1zU1VGQlJDeERRVUZ5UWl4RlFVRTJRaXhEUVVFM1FpeERRVUZLTzBGQlFVRXNWMEZNZWtJN1FVRk5WU3hWUVVGQkxHTkJRV01zUlVGQlJTeDNRa0ZCUVN4RFFVRkRPMEZCUVVFc2JVSkJRVWtzUzBGQlNTeERRVUZETEZkQlFVd3NRMEZCYVVJc1NVRkJTU3hEUVVGRExFbEJRVVFzUTBGQmNrSXNSVUZCTmtJc1EwRkJOMElzUTBGQlNqdEJRVUZCTEZkQlRqTkNPMEZCVDFVc1ZVRkJRU3hYUVVGWExFVkJRVVVzUzBGQlNTeERRVUZETEV0QlFVd3NRMEZCVnp0QlFWQnNReXhWUVVGYU96dEJRVk5CTEZsQlFVa3NVVUZCVHl4SlFVRkpMRU5CUVVNc1NVRkJSQ3hEUVVGWUxFMUJRWE5DTEZGQlFYUkNMRWxCUVd0RExFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NTMEZCWlN4SlFVRnlSQ3hGUVVFeVJEdEJRVU4yUkN4VlFVRkJMRXRCUVVzc1IwRkJSeXhMUVVGTExFTkJRVU1zV1VGQlRpeERRVUZ0UWl4TFFVRnVRaXhGUVVFd1FqdEJRVU01UWl4WlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVd4Q0xFbEJRVFJDTEV0QlFVa3NRMEZCUXl4WFFVRk1MRU5CUVdsQ0xFbEJRVWtzUTBGQlF5eEpRVUZFTEVOQlFVb3NRMEZCVnl4RFFVRllMRU5CUVdwQ0xFTkJRVFZDTEVkQlFUaEVMRXRCUVVrc1EwRkJReXhYUVVGTUxFTkJRV2xDTEVsQlFVa3NRMEZCUXl4SlFVRkVMRU5CUVhKQ08wRkJSREZETEZkQlFURkNMRU5CUVZJN1FVRkhTRHM3UVVGRlJDeGxRVUZQTEV0QlFWQTdRVUZEU0N4UFFYSkNUU3hEUVVGUU8wRkJjMEpJT3pzN05rSkJSVkU3UVVGQlFTeDNRa0ZEZFVJc1MwRkJTeXhMUVVRMVFqdEJRVUZCTEZWQlEwVXNWMEZFUml4bFFVTkZMRmRCUkVZN1FVRkJRU3hWUVVObExFbEJSR1lzWlVGRFpTeEpRVVJtTzBGQlJVd3NWVUZCVFN4UlFVRlJMRWRCUVVjc1MwRkJTeXhMUVVGTUxFTkJRVmNzVVVGQk5VSTdPMEZCUlVFc1ZVRkJTU3hMUVVGTExFTkJRVU1zVDBGQlRpeERRVUZqTEVsQlFXUXNRMEZCU2l4RlFVRjVRanRCUVVOeVFpeFJRVUZCTEZGQlFWRXNRMEZCUXl4aFFVRlVMRWRCUVhsQ0xFVkJRWHBDTzBGQlEwZzdPMEZCUlVRc1ZVRkJTU3hSUVVGUkxFTkJRVU1zWVVGQlZDeExRVUV5UWl4SlFVRXZRaXhGUVVGeFF6dEJRVU5xUXl4WlFVRkpMRXRCUVVzc1EwRkJReXhQUVVGT0xFTkJRV01zU1VGQlpDeERRVUZLTEVWQlFYbENPMEZCUTNKQ0xGVkJRVUVzU1VGQlNTdzBRa0ZCUnl4SlFVRkpMRU5CUVVNc1EwRkJSQ3hEUVVGUUxFTkJRVW83UVVGRFNEczdRVUZJWjBNN1FVRkJRVHRCUVVGQk96dEJRVUZCTzBGQlMycERMQ3RDUVVGelF5eEpRVUZKTERCQ1FVRktMRU5CUVhOQ0xFbEJRWFJDTEVOQlFYUkRMRGhJUVVGdFJUdEJRVUZCTzBGQlFVRXNaMEpCUVhwRUxFMUJRWGxFTEdWQlFYcEVMRTFCUVhsRU8wRkJRVUVzWjBKQlFXcEVMRWxCUVdsRUxHVkJRV3BFTEVsQlFXbEVPMEZCUVVFc1owSkJRVE5ETEVkQlFUSkRMR1ZCUVRORExFZEJRVEpETzBGQlFVRXNaMEpCUVhSRExFbEJRWE5ETEdWQlFYUkRMRWxCUVhORE96dEJRVU12UkN4blFrRkJTU3hSUVVGUExFbEJRVkFzVFVGQlowSXNVVUZCYUVJc1NVRkJORUlzU1VGQlNTeExRVUZMTEVsQlFYcERMRVZCUVN0RE8wRkJRek5ETEd0Q1FVRkpMRlZCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU1zU1VGQlRDeERRVUZWTEVkQlFWWXNRMEZCYWtJN08wRkJRMEVzYTBOQlFWY3NSMEZCV0N4RFFVRmxMRWxCUVdZc1JVRkJjVUlzVlVGQlZTeEhRVUZITEdGQlFXeERMRVZCUVdsRUxGVkJRV3BFTzBGQlEwZzdRVUZEU2p0QlFWWm5RenRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCT3p0QlFWbHFReXhsUVVOSkxHbERRVU5KTEdkRFFVRkxMRmRCUVZjc1EwRkJReXh2UWtGQmFrSXNRMEZFU2l4RlFVVkpPMEZCUVVrc1ZVRkJRU3hUUVVGVExFVkJRVU03UVVGQlpDeFhRVU5MTEV0QlFVc3NWMEZCVEN4RFFVRnBRaXhKUVVGcVFpeERRVVJNTEVOQlJrb3NRMEZFU2p0QlFWRklMRTlCY0VKRUxFMUJiMEpQTzBGQlEwZ3NXVUZCU1N4VlFVRlZMRWRCUVVjc2IwSkJRVmNzUjBGQldDeERRVUZsTEVsQlFXWXNSVUZCY1VJc1VVRkJVU3hEUVVGRExHRkJRVGxDTEVOQlFXcENPenRCUVVWQkxGbEJRVWtzUzBGQlN5eERRVUZETEU5QlFVNHNRMEZCWXl4VlFVRmtMRU5CUVVvc1JVRkJLMEk3UVVGRE0wSXNWVUZCUVN4VlFVRlZMRWRCUVVjc1ZVRkJWU3hEUVVGRExFTkJRVVFzUTBGQmRrSTdRVUZEU0RzN1FVRk1SVHRCUVVGQk8wRkJRVUU3TzBGQlFVRTdRVUZQU0N4blEwRkJjME1zU1VGQlNTd3dRa0ZCU2l4RFFVRnpRaXhWUVVGMFFpeERRVUYwUXl4dFNVRkJlVVU3UVVGQlFUdEJRVUZCTEdkQ1FVRXZSQ3hOUVVFclJDeG5Ra0ZCTDBRc1RVRkJLMFE3UVVGQlFTeG5Ra0ZCZGtRc1NVRkJkVVFzWjBKQlFYWkVMRWxCUVhWRU8wRkJRVUVzWjBKQlFXcEVMRWRCUVdsRUxHZENRVUZxUkN4SFFVRnBSRHRCUVVGQkxHZENRVUUxUXl4SlFVRTBReXhuUWtGQk5VTXNTVUZCTkVNN08wRkJRM0pGTEdkQ1FVRkpMRkZCUVU4c1NVRkJVQ3hOUVVGblFpeFJRVUZ3UWl4RlFVRTRRanRCUVVNeFFpeHJRa0ZCU1N4WFFVRlZMRWRCUVVjc1NVRkJTU3hEUVVGRExFbEJRVXdzUTBGQlZTeEhRVUZXTEVOQlFXcENPenRCUVVOQkxHdERRVUZYTEVkQlFWZ3NRMEZCWlN4VlFVRm1MRVZCUVRKQ0xGZEJRVE5DTEVWQlFYVkRMRmRCUVhaRE8wRkJRMGc3UVVGRFNqdEJRVnBGTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN1FVRkJRVHRCUVVGQk8wRkJRVUU3UVVGQlFUdEJRVUZCTzBGQlFVRTdRVUZCUVR0QlFVRkJPMEZCUVVFN08wRkJZMGdzWlVGRFNTeHBRMEZEU1N4blEwRkJTeXhYUVVGWExFTkJRVU1zYTBKQlFXcENMRU5CUkVvc1JVRkZTVHRCUVVGSkxGVkJRVUVzVTBGQlV5eEZRVUZETzBGQlFXUXNWMEZEU3l4TFFVRkxMRmRCUVV3c1EwRkJhVUlzVlVGQmFrSXNRMEZFVEN4RFFVWktMRU5CUkVvN1FVRlJTRHRCUVVOS096czdPMFZCYkVaclFpeExRVUZMTEVOQlFVTXNVenM3WlVGeFJtUXNVVHM3T3pzN096czdPenM3UVVONlJtWTdPMEZCUTBFN096czdPenM3T3pzN096czdPenM3T3pzN096czdTVUZGVFN4ak96czdPenM3T3pzN096czdPM2REUVVOclFqdEJRVU5vUWl4WFFVRkxMRTlCUVV3N1FVRkRTRHM3T3poQ1FVVlRPMEZCUVVFN08wRkJRVUVzZDBKQlEzRkNMRXRCUVVzc1MwRkVNVUk3UVVGQlFTeFZRVU5ETEVkQlJFUXNaVUZEUXl4SFFVUkVPMEZCUVVFc1ZVRkRUU3hYUVVST0xHVkJRMDBzVjBGRVRqdEJRVVZPTEN0Q1FVRlhMRWRCUVZnc1JVRkRTeXhKUVVSTUxFTkJSVkVzWjBKQlFXTTdRVUZCUVN4WlFVRmFMRTFCUVZrc1VVRkJXaXhOUVVGWk96dEJRVU5XTEZsQlFVa3NRMEZCUXl4TlFVRkVMRWxCUVZjc1RVRkJUU3hEUVVGRExFbEJRVkFzUTBGQldTeE5RVUZhTEVWQlFXOUNMRTFCUVhCQ0xFdEJRU3RDTEVOQlFUbERMRVZCUVdsRU8wRkJRemRETEZWQlFVRXNTMEZCU1N4RFFVRkRMRXRCUVV3c1EwRkJWeXhSUVVGWUxFTkJRVzlDTEV0QlFVc3NRMEZCUXl4WFFVRlhMRU5CUVVNc1lVRkJZaXhEUVVGNlFqczdRVUZEUVN4VlFVRkJMRXRCUVVrc1EwRkJReXhMUVVGTUxFTkJRVmNzVTBGQldDeERRVUZ4UWl4SlFVRnlRanM3UVVGRFFUdEJRVU5JT3p0QlFVTkVMRkZCUVVFc1MwRkJTU3hEUVVGRExFdEJRVXdzUTBGQlZ5eFJRVUZZTEVOQlFXOUNMRTFCUVhCQ096dEJRVU5CTEZGQlFVRXNTMEZCU1N4RFFVRkRMRXRCUVV3c1EwRkJWeXhUUVVGWUxFTkJRWEZDTEVsQlFYSkNPMEZCUTBnc1QwRldWQ3hGUVZWWExHbENRVUZoTzBGQlFVRXNXVUZCV0N4TFFVRlhMRk5CUVZnc1MwRkJWenM3UVVGRFdpeFJRVUZCTEV0QlFVa3NRMEZCUXl4TFFVRk1MRU5CUVZjc1UwRkJXQ3hEUVVGeFFpeEpRVUZ5UWpzN1FVRkRRU3hSUVVGQkxFdEJRVWtzUTBGQlF5eExRVUZNTEVOQlFWY3NVVUZCV0N4RFFVRnZRaXhMUVVGd1FqdEJRVU5JTEU5QllsUTdRVUZsU0RzN08yMURRVVZqTEVzc1JVRkJUenRCUVVOc1FpeFhRVUZMTEV0QlFVd3NRMEZCVnl4alFVRllMRU5CUVRCQ0xFdEJRVEZDTzBGQlEwZzdPenMyUWtGRlVUdEJRVUZCTEhsQ1FVTjNSQ3hMUVVGTExFdEJSRGRFTzBGQlFVRXNWVUZEUlN4SFFVUkdMR2RDUVVORkxFZEJSRVk3UVVGQlFTeFZRVU5QTEV0QlJGQXNaMEpCUTA4c1MwRkVVRHRCUVVGQkxGVkJRMk1zVVVGRVpDeG5Ra0ZEWXl4UlFVUmtPMEZCUVVFc1ZVRkRkMElzVjBGRWVFSXNaMEpCUTNkQ0xGZEJSSGhDTzBGQlFVRXNWVUZEY1VNc1VVRkVja01zWjBKQlEzRkRMRkZCUkhKRE8wRkJRVUVzVlVGREswTXNTMEZFTDBNc1owSkJReXRETEV0QlJDOURPenRCUVVkTUxGVkJRVWtzUzBGQlNpeEZRVUZYTzBGQlExQXNaVUZCVHp0QlFVRkxMRlZCUVVFc1UwRkJVeXhGUVVGRE8wRkJRV1lzVjBGQk5FTXNLMEpCUVVrc1MwRkJTeXhEUVVGRExFOUJRVllzUTBGQk5VTXNRMEZCVUR0QlFVTklMRTlCUmtRc1RVRkZUeXhKUVVGSkxFTkJRVU1zVVVGQlRDeEZRVUZsTzBGQlEyeENMR1ZCUVU4N1FVRkJTeXhWUVVGQkxGTkJRVk1zUlVGQlF6dEJRVUZtTEZWQlFWQTdRVUZEU0N4UFFVWk5MRTFCUlVFN1FVRkRTQ3hsUVVOSkxHOUNRVUZETEdsQ1FVRkVPMEZCUTBrc1ZVRkJRU3hKUVVGSkxFVkJRVVVzUzBGRVZqdEJRVVZKTEZWQlFVRXNSMEZCUnl4RlFVRkZMRWRCUmxRN1FVRkhTU3hWUVVGQkxGRkJRVkVzUlVGQlJTeFJRVWhrTzBGQlNVa3NWVUZCUVN4alFVRmpMRVZCUVVVc1MwRkJTeXhqUVVGTUxFTkJRVzlDTEVsQlFYQkNMRU5CUVhsQ0xFbEJRWHBDTEVOQlNuQkNPMEZCUzBrc1ZVRkJRU3hYUVVGWExFVkJRVVU3UVVGTWFrSXNWVUZFU2p0QlFWTklPMEZCUTBvN096czdSVUU1UTNkQ0xFdEJRVXNzUTBGQlF5eFRPenRsUVdsRWNFSXNZenM3T3pzN096czdPenM3UVVOd1JHWXNTVUZCVFN4WFFVRlhMRWRCUVVjc1UwRkJaQ3hYUVVGak8wRkJRVUVzVFVGQlJTeFJRVUZHTEZGQlFVVXNVVUZCUmp0QlFVRkJMRTFCUVZrc1IwRkJXaXhSUVVGWkxFZEJRVm83UVVGQlFTeFRRVU5vUWl4cFEwRkRTVHRCUVVGUExFbEJRVUVzU1VGQlNTeEZRVUZETEZGQlFWbzdRVUZCY1VJc1NVRkJRU3hKUVVGSkxFVkJRVU1zY1VKQlFURkNPMEZCUVdkRUxFbEJRVUVzUzBGQlN5eEZRVUZGTzBGQlFYWkVMRWxCUkVvc1JVRkZTVHRCUVVGUExFbEJRVUVzU1VGQlNTeEZRVUZETEZGQlFWbzdRVUZCY1VJc1NVRkJRU3hKUVVGSkxFVkJRVU1zTUVKQlFURkNPMEZCUVhGRUxFbEJRVUVzUzBGQlN5eEZRVUZGTEVsQlFVa3NRMEZCUXl4VFFVRk1MRU5CUVdVc1VVRkJaanRCUVVFMVJDeEpRVVpLTEVOQlJHZENPMEZCUVVFc1EwRkJjRUk3TzJWQlRXVXNWenM3T3pzN096czdPenM3UVVOT1ppeEpRVUZOTEZGQlFWRXNSMEZCUnl4VFFVRllMRkZCUVZjc1QwRkJjMGM3UVVGQlFTeE5RVUZ3Unl4TFFVRnZSeXhSUVVGd1J5eExRVUZ2Unp0QlFVRkJMRTFCUVRkR0xGRkJRVFpHTEZGQlFUZEdMRkZCUVRaR08wRkJRVUVzVFVGQmJrWXNVVUZCYlVZc1VVRkJia1lzVVVGQmJVWTdRVUZCUVN4TlFVRjZSU3hOUVVGNVJTeFJRVUY2UlN4TlFVRjVSVHRCUVVGQkxFMUJRV3BGTEZsQlFXbEZMRkZCUVdwRkxGbEJRV2xGTzBGQlFVRXNUVUZCYmtRc1kwRkJiVVFzVVVGQmJrUXNZMEZCYlVRN1FVRkJRU3hOUVVGdVF5eG5Ra0ZCYlVNc1VVRkJia01zWjBKQlFXMURPMEZCUVVFc1RVRkJha0lzVjBGQmFVSXNVVUZCYWtJc1YwRkJhVUk3TzBGQlEyNUlMRTFCUVVrc1VVRkJTaXhGUVVGak8wRkJRMVlzVjBGQlVTeG5RMEZEU0N4TFFVRkxMRU5CUVVNc1QwRkJUaXhEUVVGakxFMUJRV1FzUzBGQmVVSXNVVUZCVVN4RFFVRkRMR0ZCUVZRc1MwRkJNa0lzU1VGQmNFUXNSMEZEUnl4clEwRkJUVHRCUVVGTkxFMUJRVUVzVTBGQlV5eEZRVUZETzBGQlFXaENMRTFCUVU0c1QwRkJLMFFzUzBGQkwwUXNUMEZCYzBVN1FVRkJSeXhOUVVGQkxFbEJRVWtzUlVGQlF5eEhRVUZTTzBGQlFWa3NUVUZCUVN4VFFVRlRMRVZCUVVNc1lVRkJkRUk3UVVGQmIwTXNiMEpCUVZjc1pVRkJMME03UVVGQkswUXNUVUZCUVN4UFFVRlBMRVZCUVVVN1FVRkJlRVVzVDBGQk1rWXNWMEZCVnl4RFFVRkRMRTFCUVhaSExFTkJRWFJGTEVOQlJFZ3NSMEZEYzAwc2EwTkJRVThzUzBGQlVDeERRVVp1VFN4RlFVZEtMR2REUVVGTExGRkJRVXdzUTBGSVNTeERRVUZTTzBGQlMwZ3NSMEZPUkN4TlFVMVBPMEZCUTBnc1YwRkJVU3huUTBGRFNDeFJRVUZSTEVOQlFVTXNTMEZCVkN4TFFVRnRRaXhOUVVGdVFpeEpRVUUyUWl4UlFVRlJMRU5CUVVNc1MwRkJkRU1zUjBGQk9FTXNiME5CUVZNc1YwRkJWeXhEUVVGRExFdEJRWEpDTEU5QlFUbERMRWRCUVhWR0xFVkJSSEJHTEVWQlJVZ3NVVUZCVVN4RFFVRkRMRTlCUVZRc1MwRkJjVUlzVFVGQmNrSXNTVUZCSzBJc1VVRkJVU3hEUVVGRExFOUJRWGhETEVkQlFXdEVMRzlEUVVGVExGZEJRVmNzUTBGQlF5eFBRVUZ5UWl4UFFVRnNSQ3hIUVVFMlJpeEZRVVl4Uml4RlFVZEtMR3REUVVGUExFdEJRVkFzUTBGSVNTeEZRVWxJTEVOQlFVTXNVVUZCVVN4RFFVRkRMRXRCUVZZc1NVRkJiMElzVVVGQlVTeERRVUZETEU5QlFWUXNTMEZCY1VJc1RVRkJla01zU1VGQmIwUXNVVUZCVVN4RFFVRkRMR0ZCUVZRc1MwRkJNa0lzU1VGQkwwVXNSMEZEUnp0QlFVRkhMRTFCUVVFc1NVRkJTU3hGUVVGRExFZEJRVkk3UVVGQldTeE5RVUZCTEZOQlFWTXNSVUZCUXl4aFFVRjBRanRCUVVGdlF5eHZRa0ZCVnl4UFFVRXZRenRCUVVGMVJDeE5RVUZCTEU5QlFVOHNSVUZCUlR0QlFVRm9SU3hQUVVFclJTeFhRVUZYTEVOQlFVTXNTMEZCTTBZc1EwRkVTQ3hIUVVNeVJ5eEZRVXg0Unl4RlFVMUlMRU5CUVVNc1VVRkJVU3hEUVVGRExFOUJRVllzU1VGQmMwSXNVVUZCVVN4RFFVRkRMRXRCUVZRc1MwRkJiVUlzVFVGQmVrTXNTVUZCYjBRc1VVRkJVU3hEUVVGRExHRkJRVlFzUzBGQk1rSXNTVUZCTDBVc1IwRkRSenRCUVVGSExFMUJRVUVzU1VGQlNTeEZRVUZETEVkQlFWSTdRVUZCV1N4TlFVRkJMRk5CUVZNc1JVRkJReXhoUVVGMFFqdEJRVUZ2UXl4dlFrRkJWeXhUUVVFdlF6dEJRVUY1UkN4TlFVRkJMRTlCUVU4c1JVRkJSVHRCUVVGc1JTeFBRVUZ0Uml4WFFVRlhMRU5CUVVNc1QwRkJMMFlzUTBGRVNDeEhRVU5wU0N4RlFWQTVSeXhEUVVGU08wRkJVMGc3UVVGRFNpeERRV3hDUkRzN1pVRnZRbVVzVVRzN096czdPenM3T3pzN1FVTndRbVk3TzBGQlEwRTdPMEZCUTBFN096czdPenM3T3pzN096czdPenM3T3pzN096czdPenRKUVVWTkxGRTdPenM3TzBGQlEwWXNiMEpCUVZrc1MwRkJXaXhGUVVGdFFqdEJRVUZCT3p0QlFVRkJPenRCUVVObUxHdEdRVUZOTEV0QlFVNDdRVUZEUVN4VlFVRkxMRXRCUVV3c1IwRkJZVHRCUVVOVUxFMUJRVUVzYTBKQlFXdENMRVZCUVVVc1MwRkVXRHRCUVVWVUxFMUJRVUVzUjBGQlJ5eEZRVUZGTEVWQlJrazdRVUZIVkN4TlFVRkJMRkZCUVZFc1JVRkJSU3hMUVVoRU8wRkJTVlFzVFVGQlFTeExRVUZMTEVWQlFVVXNTVUZLUlR0QlFVdFVMRTFCUVVFc1MwRkJTeXhGUVVGRkxFVkJURVU3UVVGTlZDeE5RVUZCTEZGQlFWRXNSVUZCUlR0QlFVTk9MRkZCUVVFc1lVRkJZU3hGUVVGRkxFbEJSRlE3UVVGRlRpeFJRVUZCTEV0QlFVc3NSVUZCUlN4RlFVWkVPMEZCUjA0c1VVRkJRU3hQUVVGUExFVkJRVVU3UVVGSVNEdEJRVTVFTEV0QlFXSTdRVUZHWlR0QlFXTnNRanM3T3p0M1EwRkZiVUk3UVVGRGFFSXNWMEZCU3l4WFFVRk1PMEZCUTBnN096dHJRMEZGWVR0QlFVTldMRlZCUVVrc1QwRkJUeXhoUVVGaExFTkJRVU1zVDBGQmNrSXNTMEZCYVVNc1YwRkJja01zUlVGQmEwUTdRVUZET1VNc1dVRkJUU3hQUVVGUExFZEJRVWNzWVVGQllTeERRVUZETEU5QlFUbENPMEZCUTBFc1lVRkJTeXhSUVVGTUxFTkJRV003UVVGRFZpeFZRVUZCTEVkQlFVY3NSVUZCUlN4UFFVRlBMRU5CUVVNc1IwRkJVaXhIUVVGakxFOUJRVThzUTBGQlF5eEhRVUYwUWl4SFFVRTBRaXhGUVVSMlFqdEJRVVZXTEZWQlFVRXNVVUZCVVN4RlFVRkZMRTlCUVU4c1EwRkJReXhSUVVGU0xFZEJRVzFDTEVsQlFVa3NRMEZCUXl4TFFVRk1MRU5CUVZjc1QwRkJUeXhEUVVGRExGRkJRVzVDTEVOQlFXNUNMRWRCUVd0RU8wRkJRM2hFTEZsQlFVRXNZVUZCWVN4RlFVRkZMRWxCUkhsRE8wRkJSWGhFTEZsQlFVRXNTMEZCU3l4RlFVRkZMRVZCUm1sRU8wRkJSM2hFTEZsQlFVRXNUMEZCVHl4RlFVRkZPMEZCU0N0RExGZEJSbXhFTzBGQlQxWXNWVUZCUVN4clFrRkJhMElzUlVGQlJTeERRVUZETEVOQlFVTXNUMEZCVHl4RFFVRkRPMEZCVUhCQ0xGTkJRV1E3UVVGVFNEdEJRVU5LT3pzN09FSkJSVk1zU3l4RlFVRlBPMEZCUTJJc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEVkQlFVY3NSVUZCUlN4TFFVRkxMRU5CUVVNc1RVRkJUaXhEUVVGaE8wRkJRVzVDTEU5QlFXUTdRVUZEU0RzN08ybERRVVZaTEVzc1JVRkJUenRCUVVOb1FpeE5RVUZCTEV0QlFVc3NRMEZCUXl4alFVRk9PMEZCUTBFc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEd0Q1FVRnJRaXhGUVVGRk8wRkJRWEpDTEU5QlFXUTdRVUZEU0RzN08ybERRVVZaTEVzc1JVRkJUenRCUVVOb1FpeE5RVUZCTEV0QlFVc3NRMEZCUXl4alFVRk9PMEZCUTBFc1YwRkJTeXhSUVVGTUxFTkJRV003UVVGQlF5eFJRVUZCTEd0Q1FVRnJRaXhGUVVGRkxFdEJRWEpDTzBGQlFUUkNMRkZCUVVFc1IwRkJSeXhGUVVGRkxFVkJRV3BETzBGQlFYRkRMRkZCUVVFc1VVRkJVU3hGUVVGRk8wRkJRVU1zVlVGQlFTeGhRVUZoTEVWQlFVVXNTVUZCYUVJN1FVRkJjMElzVlVGQlFTeExRVUZMTEVWQlFVVXNSVUZCTjBJN1FVRkJhVU1zVlVGQlFTeFBRVUZQTEVWQlFVVTdRVUZCTVVNN1FVRkJMME1zVDBGQlpEdEJRVU5JT3pzN2JVTkJSV01zU3l4RlFVRlBPMEZCUTJ4Q0xGVkJRVTBzVFVGQlRTeEhRVUZITEUxQlFVMHNRMEZCUXl4TlFVRlFMRU5CUVdNc1MwRkJTeXhMUVVGTUxFTkJRVmNzVVVGQmVrSXNSVUZCYlVNc1MwRkJia01zUTBGQlpqdEJRVU5CTEZkQlFVc3NVVUZCVEN4RFFVRmpPMEZCUVVNc1VVRkJRU3hSUVVGUkxFVkJRVVU3UVVGQldDeFBRVUZrTzBGQlEwZzdPenMyUWtGRlVTeExMRVZCUVU4N1FVRkRXaXhYUVVGTExGRkJRVXdzUTBGQll6dEJRVUZETEZGQlFVRXNTMEZCU3l4RlFVRk1PMEZCUVVRc1QwRkJaRHRCUVVOSU96czdPRUpCUlZNc1N5eEZRVUZQTzBGQlEySXNWMEZCU3l4UlFVRk1MRU5CUVdNN1FVRkJReXhSUVVGQkxGRkJRVkVzUlVGQlJUdEJRVUZZTEU5QlFXUTdRVUZEU0RzN096WkNRVVZSTEVzc1JVRkJUenRCUVVOYUxGZEJRVXNzVVVGQlRDeERRVUZqTzBGQlFVTXNVVUZCUVN4TFFVRkxMRVZCUVVVN1FVRkJVaXhQUVVGa08wRkJRMGc3T3pzMlFrRkZVVHRCUVVGQkxGVkJRMFVzVjBGRVJpeEhRVU5wUWl4TFFVRkxMRXRCUkhSQ0xFTkJRMFVzVjBGRVJqdEJRVUZCTEhkQ1FVVnhSQ3hMUVVGTExFdEJSakZFTzBGQlFVRXNWVUZGUlN4clFrRkdSaXhsUVVWRkxHdENRVVpHTzBGQlFVRXNWVUZGYzBJc1IwRkdkRUlzWlVGRmMwSXNSMEZHZEVJN1FVRkJRU3hWUVVVeVFpeExRVVl6UWl4bFFVVXlRaXhMUVVZelFqdEJRVUZCTEZWQlJXdERMRkZCUm14RExHVkJSV3RETEZGQlJteERPMEZCUVVFc1ZVRkZORU1zUzBGR05VTXNaVUZGTkVNc1MwRkdOVU03UVVGQlFTeHBRMEZIYlVNc1MwRkJTeXhMUVVGTUxFTkJRVmNzVVVGSU9VTTdRVUZCUVN4VlFVZEZMR0ZCU0VZc2QwSkJSMFVzWVVGSVJqdEJRVUZCTEZWQlIybENMRXRCU0dwQ0xIZENRVWRwUWl4TFFVaHFRanRCUVVGQkxGVkJSM2RDTEU5QlNIaENMSGRDUVVkM1FpeFBRVWg0UWpzN1FVRkxUQ3hWUVVGSkxFZEJRVWNzU1VGQlNTeGhRVUZoTEV0QlFVc3NTVUZCZWtJc1NVRkJhVU1zUzBGQmFrTXNTVUZCTUVNc1QwRkJPVU1zUlVGQmRVUTdRVUZEYmtRc1pVRkRTU3hwUTBGRFNTeHZRa0ZCUXl4blFrRkJSQ3hsUVVOUkxFdEJRVXNzUzBGRVlqdEJRVVZKTEZWQlFVRXNWMEZCVnl4RlFVRkZPMEZCUm1wQ0xGZEJSRW9zUlVGTFNTeHZRa0ZCUXl4dlFrRkJSQ3hGUVVGcFFpeExRVUZMTEV0QlFYUkNMRU5CVEVvc1JVRk5TU3dyUWtGQlJ6dEJRVUZITEZWQlFVRXNTVUZCU1N4RlFVRkRMRWRCUVZJN1FVRkJXU3hWUVVGQkxFOUJRVThzUlVGQlJTeExRVUZMTEZsQlFVd3NRMEZCYTBJc1NVRkJiRUlzUTBGQmRVSXNTVUZCZGtJc1EwRkJja0k3UVVGRFJ5eFZRVUZCTEZOQlFWTXNSVUZCUXp0QlFVUmlMRmRCUTNWQ0xGZEJRVmNzUTBGQlF5eGhRVVJ1UXl4RFFVRklMRU5CVGtvc1EwRkVTanRCUVZkSUxFOUJXa1FzVFVGWlR5eEpRVUZKTEd0Q1FVRktMRVZCUVhkQ08wRkJRek5DTEdWQlEwa3NhVU5CUTBrc2IwSkJRVU1zZFVKQlFVUTdRVUZEU1N4VlFVRkJMRWRCUVVjc1JVRkJSU3hIUVVSVU8wRkJSVWtzVlVGQlFTeExRVUZMTEVWQlFVVXNTMEZHV0R0QlFVZEpMRlZCUVVFc1VVRkJVU3hGUVVGRkxFdEJRVXNzVVVGQlRDeERRVUZqTEVsQlFXUXNRMEZCYlVJc1NVRkJia0lzUTBGSVpEdEJRVWxKTEZWQlFVRXNVVUZCVVN4RlFVRkZMRkZCU21RN1FVRkxTU3hWUVVGQkxGTkJRVk1zUlVGQlJTeExRVUZMTEZOQlFVd3NRMEZCWlN4SlFVRm1MRU5CUVc5Q0xFbEJRWEJDTEVOQlRHWTdRVUZOU1N4VlFVRkJMRXRCUVVzc1JVRkJSU3hMUVU1WU8wRkJUMGtzVlVGQlFTeFJRVUZSTEVWQlFVVXNTMEZCU3l4UlFVRk1MRU5CUVdNc1NVRkJaQ3hEUVVGdFFpeEpRVUZ1UWl4RFFWQmtPMEZCVVVrc1ZVRkJRU3hSUVVGUkxFVkJRVVVzUzBGQlN5eExRVUZNTEVOQlFWY3NVVUZTZWtJN1FVRlRTU3hWUVVGQkxHTkJRV01zUlVGQlJTeExRVUZMTEdOQlFVd3NRMEZCYjBJc1NVRkJjRUlzUTBGQmVVSXNTVUZCZWtJc1EwRlVjRUk3UVVGVlNTeFZRVUZCTEZkQlFWY3NSVUZCUlR0QlFWWnFRaXhWUVVSS0xFVkJZVWtzYjBKQlFVTXNiMEpCUVVRc1JVRkJhVUlzUzBGQlN5eExRVUYwUWl4RFFXSktMRVZCWTBrc0swSkJRVWM3UVVGQlJ5eFZRVUZCTEVsQlFVa3NSVUZCUXl4SFFVRlNPMEZCUVZrc1ZVRkJRU3hQUVVGUExFVkJRVVVzUzBGQlN5eFpRVUZNTEVOQlFXdENMRWxCUVd4Q0xFTkJRWFZDTEVsQlFYWkNMRU5CUVhKQ08wRkJRMGNzVlVGQlFTeFRRVUZUTEVWQlFVTTdRVUZFWWl4WFFVTjFRaXhYUVVGWExFTkJRVU1zWVVGRWJrTXNRMEZCU0N4RFFXUktMRU5CUkVvN1FVRnRRa2dzVDBGd1FrMHNUVUZ2UWtFN1FVRkRTQ3hsUVVOSk8wRkJRVXNzVlVGQlFTeFRRVUZUTEVWQlFVTTdRVUZCWml4WFFVTkpPMEZCUVUwc1ZVRkJRU3hSUVVGUkxFVkJRVVVzUzBGQlN5eFpRVUZNTEVOQlFXdENMRWxCUVd4Q0xFTkJRWFZDTEVsQlFYWkNPMEZCUVdoQ0xGZEJRMGtzSzBKQlEwa3NiVU5CUTBrc09FTkJSRW9zUTBGRVNpeEZRVWxKTEN0Q1FVcEtMRVZCUzBrc0swSkJRVWtzVjBGQlZ5eERRVUZETEZsQlFXaENMRU5CVEVvc1EwRkVTaXhGUVZGSk8wRkJRVThzVlVGQlFTeEpRVUZKTEVWQlFVTXNUVUZCV2p0QlFVRnRRaXhWUVVGQkxGTkJRVk1zUlVGQlF5eFhRVUUzUWp0QlFVRjVReXhWUVVGQkxFdEJRVXNzUlVGQlJTeEhRVUZvUkR0QlFVRnhSQ3hWUVVGQkxGRkJRVkVzUlVGQlJTeExRVUZMTEZOQlFVd3NRMEZCWlN4SlFVRm1MRU5CUVc5Q0xFbEJRWEJDTzBGQlFTOUVMRlZCVWtvc1JVRlRTU3dyUWtGQlJ6dEJRVUZQTEZWQlFVRXNTVUZCU1N4RlFVRkRMRkZCUVZvN1FVRkJjVUlzVlVGQlFTeFRRVUZUTEVWQlFVTXNkVUpCUVM5Q08wRkJRWFZFTEZWQlFVRXNTMEZCU3l4RlFVRkZMRmRCUVZjc1EwRkJRenRCUVVFeFJTeFZRVUZJTEVOQlZFb3NRMEZFU2l4RlFWbEpMRzlDUVVGRExHOUNRVUZFTEVWQlFXbENMRXRCUVVzc1MwRkJkRUlzUTBGYVNpeERRVVJLTzBGQlowSklPMEZCUTBvN096czdSVUV4U0d0Q0xFdEJRVXNzUTBGQlF5eFRPenRsUVRaSVpDeFJPenM3T3pzN096czdPenRCUTJwSlppeEpRVUZOTEU5QlFVOHNSMEZCUnl4VFFVRldMRTlCUVZVN1FVRkJRU3hOUVVGRkxFZEJRVVlzVVVGQlJTeEhRVUZHTzBGQlFVRXNUVUZCVHl4UlFVRlFMRkZCUVU4c1VVRkJVRHRCUVVGQkxFMUJRV2xDTEZkQlFXcENMRkZCUVdsQ0xGZEJRV3BDTzBGQlFVRXNVMEZEV2l4cFEwRkRTU3dyUWtGRFNTdzRRMEZFU2l4RlFVTTBRaXdyUWtGRU5VSXNSVUZGU1R0QlFVRkhMRWxCUVVFc1NVRkJTU3hGUVVGRkxFZEJRVlE3UVVGQll5eEpRVUZCTEUxQlFVMHNSVUZCUXp0QlFVRnlRaXhMUVVFclFpeEhRVUV2UWl4RFFVWktMRU5CUkVvc1JVRkxTU3dyUWtGRFNTeHZRMEZCVXl4WFFVRlhMRU5CUVVNc1MwRkJja0lzUTBGRVNpeEZRVU4zUXl3clFrRkVlRU1zUlVGRlN5eFJRVUZSTEVOQlFVTXNTMEZCVkN4RFFVRmxMRTlCUVdZc1EwRkJkVUlzUjBGQmRrSXNSVUZCTkVJc1RVRkJOVUlzUTBGR1RDeERRVXhLTEVWQlUwa3NLMEpCUTBrc2IwTkJRVk1zVjBGQlZ5eERRVUZETEU5QlFYSkNMRU5CUkVvc1JVRkRNRU1zSzBKQlJERkRMRVZCUlVzc1VVRkJVU3hEUVVGRExFOUJRVlFzUTBGQmFVSXNUMEZCYWtJc1EwRkJlVUlzUjBGQmVrSXNSVUZCT0VJc1RVRkJPVUlzUTBGR1RDeERRVlJLTEVOQlJGazdRVUZCUVN4RFFVRm9RanM3WlVGblFtVXNUenM3T3pzN08wRkRabVk3TzBGQlEwRTdPMEZCUlVFN096czdRVUZLUVR0QlFVZEJPMEZCUjBFc1NVRkJUU3h2UWtGQmIwSXNSMEZCUnl4M1FrRkJOMEk3UVVGRFFTeEpRVUZOTEZWQlFWVXNSMEZCUnl4UlFVRlJMRU5CUVVNc1kwRkJWQ3hEUVVGM1FpeHZRa0ZCZUVJc1EwRkJia0k3Y1VKQlEzTkNMR0U3U1VGQlppeFhMR3RDUVVGQkxGYzdRVUZGVUN4UlFVRlJMRU5CUVVNc1RVRkJWQ3hEUVVOSkxHOUNRVUZETEdsQ1FVRkVPMEZCUVZVc1JVRkJRU3hYUVVGWExFVkJRVVU3UVVGQmRrSXNSVUZFU2l4RlFVVkpMRlZCUmtvN096czdPenM3T3pzN1FVTldRU3hUUVVGVExGVkJRVlFzUTBGQmIwSXNSMEZCY0VJc1JVRkJlVUk3UVVGRGNrSXNVMEZCVHl4TFFVRkxMRU5CUVVNc1IwRkJSQ3hEUVVGTUxFTkJRMFlzU1VGRVJTeERRVU5ITEZWQlFVRXNSMEZCUnp0QlFVRkJMRmRCUVVrc1IwRkJSeXhEUVVGRExFbEJRVW9zUlVGQlNqdEJRVUZCTEVkQlJFNHNSVUZGUml4SlFVWkZMRU5CUjBNc1ZVRkJReXhOUVVGRU8wRkJRVUVzVjBGQllUdEJRVUZETEUxQlFVRXNUVUZCVFN4RlFVRk9PMEZCUVVRc1MwRkJZanRCUVVGQkxFZEJTRVFzUlVGSlF5eFZRVUZETEV0QlFVUTdRVUZCUVN4WFFVRlpPMEZCUVVNc1RVRkJRU3hMUVVGTExFVkJRVXc3UVVGQlJDeExRVUZhTzBGQlFVRXNSMEZLUkN4RFFVRlFPMEZCVFVnN08yVkJSV01zVlNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWk4cUlWeHVJQ29nUUc5MlpYSjJhV1YzSUdWek5pMXdjbTl0YVhObElDMGdZU0IwYVc1NUlHbHRjR3hsYldWdWRHRjBhVzl1SUc5bUlGQnliMjFwYzJWekwwRXJMbHh1SUNvZ1FHTnZjSGx5YVdkb2RDQkRiM0I1Y21sbmFIUWdLR01wSURJd01UUWdXV1ZvZFdSaElFdGhkSG9zSUZSdmJTQkVZV3hsTENCVGRHVm1ZVzRnVUdWdWJtVnlJR0Z1WkNCamIyNTBjbWxpZFhSdmNuTWdLRU52Ym5abGNuTnBiMjRnZEc4Z1JWTTJJRUZRU1NCaWVTQktZV3RsSUVGeVkyaHBZbUZzWkNsY2JpQXFJRUJzYVdObGJuTmxJQ0FnVEdsalpXNXpaV1FnZFc1a1pYSWdUVWxVSUd4cFkyVnVjMlZjYmlBcUlDQWdJQ0FnSUNBZ0lDQWdVMlZsSUdoMGRIQnpPaTh2Y21GM0xtZHBkR2gxWW5WelpYSmpiMjUwWlc1MExtTnZiUzl6ZEdWbVlXNXdaVzV1WlhJdlpYTTJMWEJ5YjIxcGMyVXZiV0Z6ZEdWeUwweEpRMFZPVTBWY2JpQXFJRUIyWlhKemFXOXVJQ0FnZGpRdU1pNDFLemRtTW1JMU1qWmtYRzRnS2k5Y2JseHVLR1oxYm1OMGFXOXVJQ2huYkc5aVlXd3NJR1poWTNSdmNua3BJSHRjYmx4MGRIbHdaVzltSUdWNGNHOXlkSE1nUFQwOUlDZHZZbXBsWTNRbklDWW1JSFI1Y0dWdlppQnRiMlIxYkdVZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2JXOWtkV3hsTG1WNGNHOXlkSE1nUFNCbVlXTjBiM0o1S0NrZ09seHVYSFIwZVhCbGIyWWdaR1ZtYVc1bElEMDlQU0FuWm5WdVkzUnBiMjRuSUNZbUlHUmxabWx1WlM1aGJXUWdQeUJrWldacGJtVW9abUZqZEc5eWVTa2dPbHh1WEhRb1oyeHZZbUZzTGtWVE5sQnliMjFwYzJVZ1BTQm1ZV04wYjNKNUtDa3BPMXh1ZlNoMGFHbHpMQ0FvWm5WdVkzUnBiMjRnS0NrZ2V5QW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JtWjFibU4wYVc5dUlHOWlhbVZqZEU5eVJuVnVZM1JwYjI0b2VDa2dlMXh1SUNCMllYSWdkSGx3WlNBOUlIUjVjR1Z2WmlCNE8xeHVJQ0J5WlhSMWNtNGdlQ0FoUFQwZ2JuVnNiQ0FtSmlBb2RIbHdaU0E5UFQwZ0oyOWlhbVZqZENjZ2ZId2dkSGx3WlNBOVBUMGdKMloxYm1OMGFXOXVKeWs3WEc1OVhHNWNibVoxYm1OMGFXOXVJR2x6Um5WdVkzUnBiMjRvZUNrZ2UxeHVJQ0J5WlhSMWNtNGdkSGx3Wlc5bUlIZ2dQVDA5SUNkbWRXNWpkR2x2YmljN1hHNTlYRzVjYmx4dVhHNTJZWElnWDJselFYSnlZWGtnUFNCMmIybGtJREE3WEc1cFppQW9RWEp5WVhrdWFYTkJjbkpoZVNrZ2UxeHVJQ0JmYVhOQmNuSmhlU0E5SUVGeWNtRjVMbWx6UVhKeVlYazdYRzU5SUdWc2MyVWdlMXh1SUNCZmFYTkJjbkpoZVNBOUlHWjFibU4wYVc5dUlDaDRLU0I3WEc0Z0lDQWdjbVYwZFhKdUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWRHOVRkSEpwYm1jdVkyRnNiQ2g0S1NBOVBUMGdKMXR2WW1wbFkzUWdRWEp5WVhsZEp6dGNiaUFnZlR0Y2JuMWNibHh1ZG1GeUlHbHpRWEp5WVhrZ1BTQmZhWE5CY25KaGVUdGNibHh1ZG1GeUlHeGxiaUE5SURBN1hHNTJZWElnZG1WeWRIaE9aWGgwSUQwZ2RtOXBaQ0F3TzF4dWRtRnlJR04xYzNSdmJWTmphR1ZrZFd4bGNrWnVJRDBnZG05cFpDQXdPMXh1WEc1MllYSWdZWE5oY0NBOUlHWjFibU4wYVc5dUlHRnpZWEFvWTJGc2JHSmhZMnNzSUdGeVp5a2dlMXh1SUNCeGRXVjFaVnRzWlc1ZElEMGdZMkZzYkdKaFkyczdYRzRnSUhGMVpYVmxXMnhsYmlBcklERmRJRDBnWVhKbk8xeHVJQ0JzWlc0Z0t6MGdNanRjYmlBZ2FXWWdLR3hsYmlBOVBUMGdNaWtnZTF4dUlDQWdJQzh2SUVsbUlHeGxiaUJwY3lBeUxDQjBhR0YwSUcxbFlXNXpJSFJvWVhRZ2QyVWdibVZsWkNCMGJ5QnpZMmhsWkhWc1pTQmhiaUJoYzNsdVl5Qm1iSFZ6YUM1Y2JpQWdJQ0F2THlCSlppQmhaR1JwZEdsdmJtRnNJR05oYkd4aVlXTnJjeUJoY21VZ2NYVmxkV1ZrSUdKbFptOXlaU0IwYUdVZ2NYVmxkV1VnYVhNZ1pteDFjMmhsWkN3Z2RHaGxlVnh1SUNBZ0lDOHZJSGRwYkd3Z1ltVWdjSEp2WTJWemMyVmtJR0o1SUhSb2FYTWdabXgxYzJnZ2RHaGhkQ0IzWlNCaGNtVWdjMk5vWldSMWJHbHVaeTVjYmlBZ0lDQnBaaUFvWTNWemRHOXRVMk5vWldSMWJHVnlSbTRwSUh0Y2JpQWdJQ0FnSUdOMWMzUnZiVk5qYUdWa2RXeGxja1p1S0dac2RYTm9LVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ2MyTm9aV1IxYkdWR2JIVnphQ2dwTzF4dUlDQWdJSDFjYmlBZ2ZWeHVmVHRjYmx4dVpuVnVZM1JwYjI0Z2MyVjBVMk5vWldSMWJHVnlLSE5qYUdWa2RXeGxSbTRwSUh0Y2JpQWdZM1Z6ZEc5dFUyTm9aV1IxYkdWeVJtNGdQU0J6WTJobFpIVnNaVVp1TzF4dWZWeHVYRzVtZFc1amRHbHZiaUJ6WlhSQmMyRndLR0Z6WVhCR2Jpa2dlMXh1SUNCaGMyRndJRDBnWVhOaGNFWnVPMXh1ZlZ4dVhHNTJZWElnWW5KdmQzTmxjbGRwYm1SdmR5QTlJSFI1Y0dWdlppQjNhVzVrYjNjZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2QybHVaRzkzSURvZ2RXNWtaV1pwYm1Wa08xeHVkbUZ5SUdKeWIzZHpaWEpIYkc5aVlXd2dQU0JpY205M2MyVnlWMmx1Wkc5M0lIeDhJSHQ5TzF4dWRtRnlJRUp5YjNkelpYSk5kWFJoZEdsdmJrOWljMlZ5ZG1WeUlEMGdZbkp2ZDNObGNrZHNiMkpoYkM1TmRYUmhkR2x2Yms5aWMyVnlkbVZ5SUh4OElHSnliM2R6WlhKSGJHOWlZV3d1VjJWaVMybDBUWFYwWVhScGIyNVBZbk5sY25abGNqdGNiblpoY2lCcGMwNXZaR1VnUFNCMGVYQmxiMllnYzJWc1ppQTlQVDBnSjNWdVpHVm1hVzVsWkNjZ0ppWWdkSGx3Wlc5bUlIQnliMk5sYzNNZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUNZbUlIdDlMblJ2VTNSeWFXNW5MbU5oYkd3b2NISnZZMlZ6Y3lrZ1BUMDlJQ2RiYjJKcVpXTjBJSEJ5YjJObGMzTmRKenRjYmx4dUx5OGdkR1Z6ZENCbWIzSWdkMlZpSUhkdmNtdGxjaUJpZFhRZ2JtOTBJR2x1SUVsRk1UQmNiblpoY2lCcGMxZHZjbXRsY2lBOUlIUjVjR1Z2WmlCVmFXNTBPRU5zWVcxd1pXUkJjbkpoZVNBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NnSmlZZ2RIbHdaVzltSUdsdGNHOXlkRk5qY21sd2RITWdJVDA5SUNkMWJtUmxabWx1WldRbklDWW1JSFI1Y0dWdlppQk5aWE56WVdkbFEyaGhibTVsYkNBaFBUMGdKM1Z1WkdWbWFXNWxaQ2M3WEc1Y2JpOHZJRzV2WkdWY2JtWjFibU4wYVc5dUlIVnpaVTVsZUhSVWFXTnJLQ2tnZTF4dUlDQXZMeUJ1YjJSbElIWmxjbk5wYjI0Z01DNHhNQzU0SUdScGMzQnNZWGx6SUdFZ1pHVndjbVZqWVhScGIyNGdkMkZ5Ym1sdVp5QjNhR1Z1SUc1bGVIUlVhV05ySUdseklIVnpaV1FnY21WamRYSnphWFpsYkhsY2JpQWdMeThnYzJWbElHaDBkSEJ6T2k4dloybDBhSFZpTG1OdmJTOWpkV3B2YW5NdmQyaGxiaTlwYzNOMVpYTXZOREV3SUdadmNpQmtaWFJoYVd4elhHNGdJSEpsZEhWeWJpQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdjbVYwZFhKdUlIQnliMk5sYzNNdWJtVjRkRlJwWTJzb1pteDFjMmdwTzF4dUlDQjlPMXh1ZlZ4dVhHNHZMeUIyWlhKMGVGeHVablZ1WTNScGIyNGdkWE5sVm1WeWRIaFVhVzFsY2lncElIdGNiaUFnYVdZZ0tIUjVjR1Z2WmlCMlpYSjBlRTVsZUhRZ0lUMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnY21WMGRYSnVJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUhabGNuUjRUbVY0ZENobWJIVnphQ2s3WEc0Z0lDQWdmVHRjYmlBZ2ZWeHVYRzRnSUhKbGRIVnliaUIxYzJWVFpYUlVhVzFsYjNWMEtDazdYRzU5WEc1Y2JtWjFibU4wYVc5dUlIVnpaVTExZEdGMGFXOXVUMkp6WlhKMlpYSW9LU0I3WEc0Z0lIWmhjaUJwZEdWeVlYUnBiMjV6SUQwZ01EdGNiaUFnZG1GeUlHOWljMlZ5ZG1WeUlEMGdibVYzSUVKeWIzZHpaWEpOZFhSaGRHbHZiazlpYzJWeWRtVnlLR1pzZFhOb0tUdGNiaUFnZG1GeUlHNXZaR1VnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZVWlhoMFRtOWtaU2duSnlrN1hHNGdJRzlpYzJWeWRtVnlMbTlpYzJWeWRtVW9ibTlrWlN3Z2V5QmphR0Z5WVdOMFpYSkVZWFJoT2lCMGNuVmxJSDBwTzF4dVhHNGdJSEpsZEhWeWJpQm1kVzVqZEdsdmJpQW9LU0I3WEc0Z0lDQWdibTlrWlM1a1lYUmhJRDBnYVhSbGNtRjBhVzl1Y3lBOUlDc3JhWFJsY21GMGFXOXVjeUFsSURJN1hHNGdJSDA3WEc1OVhHNWNiaTh2SUhkbFlpQjNiM0pyWlhKY2JtWjFibU4wYVc5dUlIVnpaVTFsYzNOaFoyVkRhR0Z1Ym1Wc0tDa2dlMXh1SUNCMllYSWdZMmhoYm01bGJDQTlJRzVsZHlCTlpYTnpZV2RsUTJoaGJtNWxiQ2dwTzF4dUlDQmphR0Z1Ym1Wc0xuQnZjblF4TG05dWJXVnpjMkZuWlNBOUlHWnNkWE5vTzF4dUlDQnlaWFIxY200Z1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCamFHRnVibVZzTG5CdmNuUXlMbkJ2YzNSTlpYTnpZV2RsS0RBcE8xeHVJQ0I5TzF4dWZWeHVYRzVtZFc1amRHbHZiaUIxYzJWVFpYUlVhVzFsYjNWMEtDa2dlMXh1SUNBdkx5QlRkRzl5WlNCelpYUlVhVzFsYjNWMElISmxabVZ5Wlc1alpTQnpieUJsY3pZdGNISnZiV2x6WlNCM2FXeHNJR0psSUhWdVlXWm1aV04wWldRZ1lubGNiaUFnTHk4Z2IzUm9aWElnWTI5a1pTQnRiMlJwWm5scGJtY2djMlYwVkdsdFpXOTFkQ0FvYkdsclpTQnphVzV2Ymk1MWMyVkdZV3RsVkdsdFpYSnpLQ2twWEc0Z0lIWmhjaUJuYkc5aVlXeFRaWFJVYVcxbGIzVjBJRDBnYzJWMFZHbHRaVzkxZER0Y2JpQWdjbVYwZFhKdUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z1oyeHZZbUZzVTJWMFZHbHRaVzkxZENobWJIVnphQ3dnTVNrN1hHNGdJSDA3WEc1OVhHNWNiblpoY2lCeGRXVjFaU0E5SUc1bGR5QkJjbkpoZVNneE1EQXdLVHRjYm1aMWJtTjBhVzl1SUdac2RYTm9LQ2tnZTF4dUlDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR3hsYmpzZ2FTQXJQU0F5S1NCN1hHNGdJQ0FnZG1GeUlHTmhiR3hpWVdOcklEMGdjWFZsZFdWYmFWMDdYRzRnSUNBZ2RtRnlJR0Z5WnlBOUlIRjFaWFZsVzJrZ0t5QXhYVHRjYmx4dUlDQWdJR05oYkd4aVlXTnJLR0Z5WnlrN1hHNWNiaUFnSUNCeGRXVjFaVnRwWFNBOUlIVnVaR1ZtYVc1bFpEdGNiaUFnSUNCeGRXVjFaVnRwSUNzZ01WMGdQU0IxYm1SbFptbHVaV1E3WEc0Z0lIMWNibHh1SUNCc1pXNGdQU0F3TzF4dWZWeHVYRzVtZFc1amRHbHZiaUJoZEhSbGJYQjBWbVZ5ZEhnb0tTQjdYRzRnSUhSeWVTQjdYRzRnSUNBZ2RtRnlJSFpsY25SNElEMGdSblZ1WTNScGIyNG9KM0psZEhWeWJpQjBhR2x6Snlrb0tTNXlaWEYxYVhKbEtDZDJaWEowZUNjcE8xeHVJQ0FnSUhabGNuUjRUbVY0ZENBOUlIWmxjblI0TG5KMWJrOXVURzl2Y0NCOGZDQjJaWEowZUM1eWRXNVBia052Ym5SbGVIUTdYRzRnSUNBZ2NtVjBkWEp1SUhWelpWWmxjblI0VkdsdFpYSW9LVHRjYmlBZ2ZTQmpZWFJqYUNBb1pTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMWMyVlRaWFJVYVcxbGIzVjBLQ2s3WEc0Z0lIMWNibjFjYmx4dWRtRnlJSE5qYUdWa2RXeGxSbXgxYzJnZ1BTQjJiMmxrSURBN1hHNHZMeUJFWldOcFpHVWdkMmhoZENCaGMzbHVZeUJ0WlhSb2IyUWdkRzhnZFhObElIUnZJSFJ5YVdkblpYSnBibWNnY0hKdlkyVnpjMmx1WnlCdlppQnhkV1YxWldRZ1kyRnNiR0poWTJ0ek9seHVhV1lnS0dselRtOWtaU2tnZTF4dUlDQnpZMmhsWkhWc1pVWnNkWE5vSUQwZ2RYTmxUbVY0ZEZScFkyc29LVHRjYm4wZ1pXeHpaU0JwWmlBb1FuSnZkM05sY2sxMWRHRjBhVzl1VDJKelpYSjJaWElwSUh0Y2JpQWdjMk5vWldSMWJHVkdiSFZ6YUNBOUlIVnpaVTExZEdGMGFXOXVUMkp6WlhKMlpYSW9LVHRjYm4wZ1pXeHpaU0JwWmlBb2FYTlhiM0pyWlhJcElIdGNiaUFnYzJOb1pXUjFiR1ZHYkhWemFDQTlJSFZ6WlUxbGMzTmhaMlZEYUdGdWJtVnNLQ2s3WEc1OUlHVnNjMlVnYVdZZ0tHSnliM2R6WlhKWGFXNWtiM2NnUFQwOUlIVnVaR1ZtYVc1bFpDQW1KaUIwZVhCbGIyWWdjbVZ4ZFdseVpTQTlQVDBnSjJaMWJtTjBhVzl1SnlrZ2UxeHVJQ0J6WTJobFpIVnNaVVpzZFhOb0lEMGdZWFIwWlcxd2RGWmxjblI0S0NrN1hHNTlJR1ZzYzJVZ2UxeHVJQ0J6WTJobFpIVnNaVVpzZFhOb0lEMGdkWE5sVTJWMFZHbHRaVzkxZENncE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCMGFHVnVLRzl1Um5Wc1ptbHNiRzFsYm5Rc0lHOXVVbVZxWldOMGFXOXVLU0I3WEc0Z0lIWmhjaUJ3WVhKbGJuUWdQU0IwYUdsek8xeHVYRzRnSUhaaGNpQmphR2xzWkNBOUlHNWxkeUIwYUdsekxtTnZibk4wY25WamRHOXlLRzV2YjNBcE8xeHVYRzRnSUdsbUlDaGphR2xzWkZ0UVVrOU5TVk5GWDBsRVhTQTlQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnYldGclpWQnliMjFwYzJVb1kyaHBiR1FwTzF4dUlDQjlYRzVjYmlBZ2RtRnlJRjl6ZEdGMFpTQTlJSEJoY21WdWRDNWZjM1JoZEdVN1hHNWNibHh1SUNCcFppQW9YM04wWVhSbEtTQjdYRzRnSUNBZ2RtRnlJR05oYkd4aVlXTnJJRDBnWVhKbmRXMWxiblJ6VzE5emRHRjBaU0F0SURGZE8xeHVJQ0FnSUdGellYQW9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR2x1ZG05clpVTmhiR3hpWVdOcktGOXpkR0YwWlN3Z1kyaHBiR1FzSUdOaGJHeGlZV05yTENCd1lYSmxiblF1WDNKbGMzVnNkQ2s3WEc0Z0lDQWdmU2s3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnYzNWaWMyTnlhV0psS0hCaGNtVnVkQ3dnWTJocGJHUXNJRzl1Um5Wc1ptbHNiRzFsYm5Rc0lHOXVVbVZxWldOMGFXOXVLVHRjYmlBZ2ZWeHVYRzRnSUhKbGRIVnliaUJqYUdsc1pEdGNibjFjYmx4dUx5b3FYRzRnSUdCUWNtOXRhWE5sTG5KbGMyOXNkbVZnSUhKbGRIVnlibk1nWVNCd2NtOXRhWE5sSUhSb1lYUWdkMmxzYkNCaVpXTnZiV1VnY21WemIyeDJaV1FnZDJsMGFDQjBhR1ZjYmlBZ2NHRnpjMlZrSUdCMllXeDFaV0F1SUVsMElHbHpJSE5vYjNKMGFHRnVaQ0JtYjNJZ2RHaGxJR1p2Ykd4dmQybHVaenBjYmx4dUlDQmdZR0JxWVhaaGMyTnlhWEIwWEc0Z0lHeGxkQ0J3Y205dGFYTmxJRDBnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0b2NtVnpiMngyWlN3Z2NtVnFaV04wS1h0Y2JpQWdJQ0J5WlhOdmJIWmxLREVwTzF4dUlDQjlLVHRjYmx4dUlDQndjbTl0YVhObExuUm9aVzRvWm5WdVkzUnBiMjRvZG1Gc2RXVXBlMXh1SUNBZ0lDOHZJSFpoYkhWbElEMDlQU0F4WEc0Z0lIMHBPMXh1SUNCZ1lHQmNibHh1SUNCSmJuTjBaV0ZrSUc5bUlIZHlhWFJwYm1jZ2RHaGxJR0ZpYjNabExDQjViM1Z5SUdOdlpHVWdibTkzSUhOcGJYQnNlU0JpWldOdmJXVnpJSFJvWlNCbWIyeHNiM2RwYm1jNlhHNWNiaUFnWUdCZ2FtRjJZWE5qY21sd2RGeHVJQ0JzWlhRZ2NISnZiV2x6WlNBOUlGQnliMjFwYzJVdWNtVnpiMngyWlNneEtUdGNibHh1SUNCd2NtOXRhWE5sTG5Sb1pXNG9ablZ1WTNScGIyNG9kbUZzZFdVcGUxeHVJQ0FnSUM4dklIWmhiSFZsSUQwOVBTQXhYRzRnSUgwcE8xeHVJQ0JnWUdCY2JseHVJQ0JBYldWMGFHOWtJSEpsYzI5c2RtVmNiaUFnUUhOMFlYUnBZMXh1SUNCQWNHRnlZVzBnZTBGdWVYMGdkbUZzZFdVZ2RtRnNkV1VnZEdoaGRDQjBhR1VnY21WMGRYSnVaV1FnY0hKdmJXbHpaU0IzYVd4c0lHSmxJSEpsYzI5c2RtVmtJSGRwZEdoY2JpQWdWWE5sWm5Wc0lHWnZjaUIwYjI5c2FXNW5MbHh1SUNCQWNtVjBkWEp1SUh0UWNtOXRhWE5sZlNCaElIQnliMjFwYzJVZ2RHaGhkQ0IzYVd4c0lHSmxZMjl0WlNCbWRXeG1hV3hzWldRZ2QybDBhQ0IwYUdVZ1oybDJaVzVjYmlBZ1lIWmhiSFZsWUZ4dUtpOWNibVoxYm1OMGFXOXVJSEpsYzI5c2RtVWtNU2h2WW1wbFkzUXBJSHRjYmlBZ0x5cHFjMmhwYm5RZ2RtRnNhV1IwYUdsek9uUnlkV1VnS2k5Y2JpQWdkbUZ5SUVOdmJuTjBjblZqZEc5eUlEMGdkR2hwY3p0Y2JseHVJQ0JwWmlBb2IySnFaV04wSUNZbUlIUjVjR1Z2WmlCdlltcGxZM1FnUFQwOUlDZHZZbXBsWTNRbklDWW1JRzlpYW1WamRDNWpiMjV6ZEhKMVkzUnZjaUE5UFQwZ1EyOXVjM1J5ZFdOMGIzSXBJSHRjYmlBZ0lDQnlaWFIxY200Z2IySnFaV04wTzF4dUlDQjlYRzVjYmlBZ2RtRnlJSEJ5YjIxcGMyVWdQU0J1WlhjZ1EyOXVjM1J5ZFdOMGIzSW9ibTl2Y0NrN1hHNGdJSEpsYzI5c2RtVW9jSEp2YldselpTd2diMkpxWldOMEtUdGNiaUFnY21WMGRYSnVJSEJ5YjIxcGMyVTdYRzU5WEc1Y2JuWmhjaUJRVWs5TlNWTkZYMGxFSUQwZ1RXRjBhQzV5WVc1a2IyMG9LUzUwYjFOMGNtbHVaeWd6TmlrdWMzVmljM1J5YVc1bktESXBPMXh1WEc1bWRXNWpkR2x2YmlCdWIyOXdLQ2tnZTMxY2JseHVkbUZ5SUZCRlRrUkpUa2NnUFNCMmIybGtJREE3WEc1MllYSWdSbFZNUmtsTVRFVkVJRDBnTVR0Y2JuWmhjaUJTUlVwRlExUkZSQ0E5SURJN1hHNWNiblpoY2lCVVVsbGZRMEZVUTBoZlJWSlNUMUlnUFNCN0lHVnljbTl5T2lCdWRXeHNJSDA3WEc1Y2JtWjFibU4wYVc5dUlITmxiR1pHZFd4bWFXeHNiV1Z1ZENncElIdGNiaUFnY21WMGRYSnVJRzVsZHlCVWVYQmxSWEp5YjNJb1hDSlpiM1VnWTJGdWJtOTBJSEpsYzI5c2RtVWdZU0J3Y205dGFYTmxJSGRwZEdnZ2FYUnpaV3htWENJcE8xeHVmVnh1WEc1bWRXNWpkR2x2YmlCallXNXViM1JTWlhSMWNtNVBkMjRvS1NCN1hHNGdJSEpsZEhWeWJpQnVaWGNnVkhsd1pVVnljbTl5S0NkQklIQnliMjFwYzJWeklHTmhiR3hpWVdOcklHTmhibTV2ZENCeVpYUjFjbTRnZEdoaGRDQnpZVzFsSUhCeWIyMXBjMlV1SnlrN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRGUm9aVzRvY0hKdmJXbHpaU2tnZTF4dUlDQjBjbmtnZTF4dUlDQWdJSEpsZEhWeWJpQndjbTl0YVhObExuUm9aVzQ3WEc0Z0lIMGdZMkYwWTJnZ0tHVnljbTl5S1NCN1hHNGdJQ0FnVkZKWlgwTkJWRU5JWDBWU1VrOVNMbVZ5Y205eUlEMGdaWEp5YjNJN1hHNGdJQ0FnY21WMGRYSnVJRlJTV1Y5RFFWUkRTRjlGVWxKUFVqdGNiaUFnZlZ4dWZWeHVYRzVtZFc1amRHbHZiaUIwY25sVWFHVnVLSFJvWlc0a0pERXNJSFpoYkhWbExDQm1kV3htYVd4c2JXVnVkRWhoYm1Sc1pYSXNJSEpsYW1WamRHbHZia2hoYm1Sc1pYSXBJSHRjYmlBZ2RISjVJSHRjYmlBZ0lDQjBhR1Z1SkNReExtTmhiR3dvZG1Gc2RXVXNJR1oxYkdacGJHeHRaVzUwU0dGdVpHeGxjaXdnY21WcVpXTjBhVzl1U0dGdVpHeGxjaWs3WEc0Z0lIMGdZMkYwWTJnZ0tHVXBJSHRjYmlBZ0lDQnlaWFIxY200Z1pUdGNiaUFnZlZ4dWZWeHVYRzVtZFc1amRHbHZiaUJvWVc1a2JHVkdiM0psYVdkdVZHaGxibUZpYkdVb2NISnZiV2x6WlN3Z2RHaGxibUZpYkdVc0lIUm9aVzRrSkRFcElIdGNiaUFnWVhOaGNDaG1kVzVqZEdsdmJpQW9jSEp2YldselpTa2dlMXh1SUNBZ0lIWmhjaUJ6WldGc1pXUWdQU0JtWVd4elpUdGNiaUFnSUNCMllYSWdaWEp5YjNJZ1BTQjBjbmxVYUdWdUtIUm9aVzRrSkRFc0lIUm9aVzVoWW14bExDQm1kVzVqZEdsdmJpQW9kbUZzZFdVcElIdGNiaUFnSUNBZ0lHbG1JQ2h6WldGc1pXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdjMlZoYkdWa0lEMGdkSEoxWlR0Y2JpQWdJQ0FnSUdsbUlDaDBhR1Z1WVdKc1pTQWhQVDBnZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnY21WemIyeDJaU2h3Y205dGFYTmxMQ0IyWVd4MVpTazdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQm1kV3htYVd4c0tIQnliMjFwYzJVc0lIWmhiSFZsS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5TENCbWRXNWpkR2x2YmlBb2NtVmhjMjl1S1NCN1hHNGdJQ0FnSUNCcFppQW9jMlZoYkdWa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lITmxZV3hsWkNBOUlIUnlkV1U3WEc1Y2JpQWdJQ0FnSUhKbGFtVmpkQ2h3Y205dGFYTmxMQ0J5WldGemIyNHBPMXh1SUNBZ0lIMHNJQ2RUWlhSMGJHVTZJQ2NnS3lBb2NISnZiV2x6WlM1ZmJHRmlaV3dnZkh3Z0p5QjFibXR1YjNkdUlIQnliMjFwYzJVbktTazdYRzVjYmlBZ0lDQnBaaUFvSVhObFlXeGxaQ0FtSmlCbGNuSnZjaWtnZTF4dUlDQWdJQ0FnYzJWaGJHVmtJRDBnZEhKMVpUdGNiaUFnSUNBZ0lISmxhbVZqZENod2NtOXRhWE5sTENCbGNuSnZjaWs3WEc0Z0lDQWdmVnh1SUNCOUxDQndjbTl0YVhObEtUdGNibjFjYmx4dVpuVnVZM1JwYjI0Z2FHRnVaR3hsVDNkdVZHaGxibUZpYkdVb2NISnZiV2x6WlN3Z2RHaGxibUZpYkdVcElIdGNiaUFnYVdZZ0tIUm9aVzVoWW14bExsOXpkR0YwWlNBOVBUMGdSbFZNUmtsTVRFVkVLU0I3WEc0Z0lDQWdablZzWm1sc2JDaHdjbTl0YVhObExDQjBhR1Z1WVdKc1pTNWZjbVZ6ZFd4MEtUdGNiaUFnZlNCbGJITmxJR2xtSUNoMGFHVnVZV0pzWlM1ZmMzUmhkR1VnUFQwOUlGSkZTa1ZEVkVWRUtTQjdYRzRnSUNBZ2NtVnFaV04wS0hCeWIyMXBjMlVzSUhSb1pXNWhZbXhsTGw5eVpYTjFiSFFwTzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUhOMVluTmpjbWxpWlNoMGFHVnVZV0pzWlN3Z2RXNWtaV1pwYm1Wa0xDQm1kVzVqZEdsdmJpQW9kbUZzZFdVcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCeVpYTnZiSFpsS0hCeWIyMXBjMlVzSUhaaGJIVmxLVHRjYmlBZ0lDQjlMQ0JtZFc1amRHbHZiaUFvY21WaGMyOXVLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjbVZxWldOMEtIQnliMjFwYzJVc0lISmxZWE52YmlrN1hHNGdJQ0FnZlNrN1hHNGdJSDFjYm4xY2JseHVablZ1WTNScGIyNGdhR0Z1Wkd4bFRXRjVZbVZVYUdWdVlXSnNaU2h3Y205dGFYTmxMQ0J0WVhsaVpWUm9aVzVoWW14bExDQjBhR1Z1SkNReEtTQjdYRzRnSUdsbUlDaHRZWGxpWlZSb1pXNWhZbXhsTG1OdmJuTjBjblZqZEc5eUlEMDlQU0J3Y205dGFYTmxMbU52Ym5OMGNuVmpkRzl5SUNZbUlIUm9aVzRrSkRFZ1BUMDlJSFJvWlc0Z0ppWWdiV0Y1WW1WVWFHVnVZV0pzWlM1amIyNXpkSEoxWTNSdmNpNXlaWE52YkhabElEMDlQU0J5WlhOdmJIWmxKREVwSUh0Y2JpQWdJQ0JvWVc1a2JHVlBkMjVVYUdWdVlXSnNaU2h3Y205dGFYTmxMQ0J0WVhsaVpWUm9aVzVoWW14bEtUdGNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQnBaaUFvZEdobGJpUWtNU0E5UFQwZ1ZGSlpYME5CVkVOSVgwVlNVazlTS1NCN1hHNGdJQ0FnSUNCeVpXcGxZM1FvY0hKdmJXbHpaU3dnVkZKWlgwTkJWRU5JWDBWU1VrOVNMbVZ5Y205eUtUdGNiaUFnSUNBZ0lGUlNXVjlEUVZSRFNGOUZVbEpQVWk1bGNuSnZjaUE5SUc1MWJHdzdYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBhR1Z1SkNReElEMDlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUdaMWJHWnBiR3dvY0hKdmJXbHpaU3dnYldGNVltVlVhR1Z1WVdKc1pTazdYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaHBjMFoxYm1OMGFXOXVLSFJvWlc0a0pERXBLU0I3WEc0Z0lDQWdJQ0JvWVc1a2JHVkdiM0psYVdkdVZHaGxibUZpYkdVb2NISnZiV2x6WlN3Z2JXRjVZbVZVYUdWdVlXSnNaU3dnZEdobGJpUWtNU2s3WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lHWjFiR1pwYkd3b2NISnZiV2x6WlN3Z2JXRjVZbVZVYUdWdVlXSnNaU2s3WEc0Z0lDQWdmVnh1SUNCOVhHNTlYRzVjYm1aMWJtTjBhVzl1SUhKbGMyOXNkbVVvY0hKdmJXbHpaU3dnZG1Gc2RXVXBJSHRjYmlBZ2FXWWdLSEJ5YjIxcGMyVWdQVDA5SUhaaGJIVmxLU0I3WEc0Z0lDQWdjbVZxWldOMEtIQnliMjFwYzJVc0lITmxiR1pHZFd4bWFXeHNiV1Z1ZENncEtUdGNiaUFnZlNCbGJITmxJR2xtSUNodlltcGxZM1JQY2taMWJtTjBhVzl1S0haaGJIVmxLU2tnZTF4dUlDQWdJR2hoYm1Sc1pVMWhlV0psVkdobGJtRmliR1VvY0hKdmJXbHpaU3dnZG1Gc2RXVXNJR2RsZEZSb1pXNG9kbUZzZFdVcEtUdGNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQm1kV3htYVd4c0tIQnliMjFwYzJVc0lIWmhiSFZsS1R0Y2JpQWdmVnh1ZlZ4dVhHNW1kVzVqZEdsdmJpQndkV0pzYVhOb1VtVnFaV04wYVc5dUtIQnliMjFwYzJVcElIdGNiaUFnYVdZZ0tIQnliMjFwYzJVdVgyOXVaWEp5YjNJcElIdGNiaUFnSUNCd2NtOXRhWE5sTGw5dmJtVnljbTl5S0hCeWIyMXBjMlV1WDNKbGMzVnNkQ2s3WEc0Z0lIMWNibHh1SUNCd2RXSnNhWE5vS0hCeWIyMXBjMlVwTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJtZFd4bWFXeHNLSEJ5YjIxcGMyVXNJSFpoYkhWbEtTQjdYRzRnSUdsbUlDaHdjbTl0YVhObExsOXpkR0YwWlNBaFBUMGdVRVZPUkVsT1J5a2dlMXh1SUNBZ0lISmxkSFZ5Ymp0Y2JpQWdmVnh1WEc0Z0lIQnliMjFwYzJVdVgzSmxjM1ZzZENBOUlIWmhiSFZsTzF4dUlDQndjbTl0YVhObExsOXpkR0YwWlNBOUlFWlZURVpKVEV4RlJEdGNibHh1SUNCcFppQW9jSEp2YldselpTNWZjM1ZpYzJOeWFXSmxjbk11YkdWdVozUm9JQ0U5UFNBd0tTQjdYRzRnSUNBZ1lYTmhjQ2h3ZFdKc2FYTm9MQ0J3Y205dGFYTmxLVHRjYmlBZ2ZWeHVmVnh1WEc1bWRXNWpkR2x2YmlCeVpXcGxZM1FvY0hKdmJXbHpaU3dnY21WaGMyOXVLU0I3WEc0Z0lHbG1JQ2h3Y205dGFYTmxMbDl6ZEdGMFpTQWhQVDBnVUVWT1JFbE9SeWtnZTF4dUlDQWdJSEpsZEhWeWJqdGNiaUFnZlZ4dUlDQndjbTl0YVhObExsOXpkR0YwWlNBOUlGSkZTa1ZEVkVWRU8xeHVJQ0J3Y205dGFYTmxMbDl5WlhOMWJIUWdQU0J5WldGemIyNDdYRzVjYmlBZ1lYTmhjQ2h3ZFdKc2FYTm9VbVZxWldOMGFXOXVMQ0J3Y205dGFYTmxLVHRjYm4xY2JseHVablZ1WTNScGIyNGdjM1ZpYzJOeWFXSmxLSEJoY21WdWRDd2dZMmhwYkdRc0lHOXVSblZzWm1sc2JHMWxiblFzSUc5dVVtVnFaV04wYVc5dUtTQjdYRzRnSUhaaGNpQmZjM1ZpYzJOeWFXSmxjbk1nUFNCd1lYSmxiblF1WDNOMVluTmpjbWxpWlhKek8xeHVJQ0IyWVhJZ2JHVnVaM1JvSUQwZ1gzTjFZbk5qY21saVpYSnpMbXhsYm1kMGFEdGNibHh1WEc0Z0lIQmhjbVZ1ZEM1ZmIyNWxjbkp2Y2lBOUlHNTFiR3c3WEc1Y2JpQWdYM04xWW5OamNtbGlaWEp6VzJ4bGJtZDBhRjBnUFNCamFHbHNaRHRjYmlBZ1gzTjFZbk5qY21saVpYSnpXMnhsYm1kMGFDQXJJRVpWVEVaSlRFeEZSRjBnUFNCdmJrWjFiR1pwYkd4dFpXNTBPMXh1SUNCZmMzVmljMk55YVdKbGNuTmJiR1Z1WjNSb0lDc2dVa1ZLUlVOVVJVUmRJRDBnYjI1U1pXcGxZM1JwYjI0N1hHNWNiaUFnYVdZZ0tHeGxibWQwYUNBOVBUMGdNQ0FtSmlCd1lYSmxiblF1WDNOMFlYUmxLU0I3WEc0Z0lDQWdZWE5oY0Nod2RXSnNhWE5vTENCd1lYSmxiblFwTzF4dUlDQjlYRzU5WEc1Y2JtWjFibU4wYVc5dUlIQjFZbXhwYzJnb2NISnZiV2x6WlNrZ2UxeHVJQ0IyWVhJZ2MzVmljMk55YVdKbGNuTWdQU0J3Y205dGFYTmxMbDl6ZFdKelkzSnBZbVZ5Y3p0Y2JpQWdkbUZ5SUhObGRIUnNaV1FnUFNCd2NtOXRhWE5sTGw5emRHRjBaVHRjYmx4dUlDQnBaaUFvYzNWaWMyTnlhV0psY25NdWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdjbVYwZFhKdU8xeHVJQ0I5WEc1Y2JpQWdkbUZ5SUdOb2FXeGtJRDBnZG05cFpDQXdMRnh1SUNBZ0lDQWdZMkZzYkdKaFkyc2dQU0IyYjJsa0lEQXNYRzRnSUNBZ0lDQmtaWFJoYVd3Z1BTQndjbTl0YVhObExsOXlaWE4xYkhRN1hHNWNiaUFnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCemRXSnpZM0pwWW1WeWN5NXNaVzVuZEdnN0lHa2dLejBnTXlrZ2UxeHVJQ0FnSUdOb2FXeGtJRDBnYzNWaWMyTnlhV0psY25OYmFWMDdYRzRnSUNBZ1kyRnNiR0poWTJzZ1BTQnpkV0p6WTNKcFltVnljMXRwSUNzZ2MyVjBkR3hsWkYwN1hHNWNiaUFnSUNCcFppQW9ZMmhwYkdRcElIdGNiaUFnSUNBZ0lHbHVkbTlyWlVOaGJHeGlZV05yS0hObGRIUnNaV1FzSUdOb2FXeGtMQ0JqWVd4c1ltRmpheXdnWkdWMFlXbHNLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ1kyRnNiR0poWTJzb1pHVjBZV2xzS1R0Y2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNCd2NtOXRhWE5sTGw5emRXSnpZM0pwWW1WeWN5NXNaVzVuZEdnZ1BTQXdPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQjBjbmxEWVhSamFDaGpZV3hzWW1GamF5d2daR1YwWVdsc0tTQjdYRzRnSUhSeWVTQjdYRzRnSUNBZ2NtVjBkWEp1SUdOaGJHeGlZV05yS0dSbGRHRnBiQ2s3WEc0Z0lIMGdZMkYwWTJnZ0tHVXBJSHRjYmlBZ0lDQlVVbGxmUTBGVVEwaGZSVkpTVDFJdVpYSnliM0lnUFNCbE8xeHVJQ0FnSUhKbGRIVnliaUJVVWxsZlEwRlVRMGhmUlZKU1QxSTdYRzRnSUgxY2JuMWNibHh1Wm5WdVkzUnBiMjRnYVc1MmIydGxRMkZzYkdKaFkyc29jMlYwZEd4bFpDd2djSEp2YldselpTd2dZMkZzYkdKaFkyc3NJR1JsZEdGcGJDa2dlMXh1SUNCMllYSWdhR0Z6UTJGc2JHSmhZMnNnUFNCcGMwWjFibU4wYVc5dUtHTmhiR3hpWVdOcktTeGNiaUFnSUNBZ0lIWmhiSFZsSUQwZ2RtOXBaQ0F3TEZ4dUlDQWdJQ0FnWlhKeWIzSWdQU0IyYjJsa0lEQXNYRzRnSUNBZ0lDQnpkV05qWldWa1pXUWdQU0IyYjJsa0lEQXNYRzRnSUNBZ0lDQm1ZV2xzWldRZ1BTQjJiMmxrSURBN1hHNWNiaUFnYVdZZ0tHaGhjME5oYkd4aVlXTnJLU0I3WEc0Z0lDQWdkbUZzZFdVZ1BTQjBjbmxEWVhSamFDaGpZV3hzWW1GamF5d2daR1YwWVdsc0tUdGNibHh1SUNBZ0lHbG1JQ2gyWVd4MVpTQTlQVDBnVkZKWlgwTkJWRU5JWDBWU1VrOVNLU0I3WEc0Z0lDQWdJQ0JtWVdsc1pXUWdQU0IwY25WbE8xeHVJQ0FnSUNBZ1pYSnliM0lnUFNCMllXeDFaUzVsY25KdmNqdGNiaUFnSUNBZ0lIWmhiSFZsTG1WeWNtOXlJRDBnYm5Wc2JEdGNiaUFnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnYzNWalkyVmxaR1ZrSUQwZ2RISjFaVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnBaaUFvY0hKdmJXbHpaU0E5UFQwZ2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUhKbGFtVmpkQ2h3Y205dGFYTmxMQ0JqWVc1dWIzUlNaWFIxY201UGQyNG9LU2s3WEc0Z0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ2ZWeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lIWmhiSFZsSUQwZ1pHVjBZV2xzTzF4dUlDQWdJSE4xWTJObFpXUmxaQ0E5SUhSeWRXVTdYRzRnSUgxY2JseHVJQ0JwWmlBb2NISnZiV2x6WlM1ZmMzUmhkR1VnSVQwOUlGQkZUa1JKVGtjcElIdGNiaUFnSUNBdkx5QnViMjl3WEc0Z0lIMGdaV3h6WlNCcFppQW9hR0Z6UTJGc2JHSmhZMnNnSmlZZ2MzVmpZMlZsWkdWa0tTQjdYRzRnSUNBZ2NtVnpiMngyWlNod2NtOXRhWE5sTENCMllXeDFaU2s3WEc0Z0lIMGdaV3h6WlNCcFppQW9abUZwYkdWa0tTQjdYRzRnSUNBZ2NtVnFaV04wS0hCeWIyMXBjMlVzSUdWeWNtOXlLVHRjYmlBZ2ZTQmxiSE5sSUdsbUlDaHpaWFIwYkdWa0lEMDlQU0JHVlV4R1NVeE1SVVFwSUh0Y2JpQWdJQ0JtZFd4bWFXeHNLSEJ5YjIxcGMyVXNJSFpoYkhWbEtUdGNiaUFnZlNCbGJITmxJR2xtSUNoelpYUjBiR1ZrSUQwOVBTQlNSVXBGUTFSRlJDa2dlMXh1SUNBZ0lISmxhbVZqZENod2NtOXRhWE5sTENCMllXeDFaU2s3WEc0Z0lIMWNibjFjYmx4dVpuVnVZM1JwYjI0Z2FXNXBkR2xoYkdsNlpWQnliMjFwYzJVb2NISnZiV2x6WlN3Z2NtVnpiMngyWlhJcElIdGNiaUFnZEhKNUlIdGNiaUFnSUNCeVpYTnZiSFpsY2lobWRXNWpkR2x2YmlCeVpYTnZiSFpsVUhKdmJXbHpaU2gyWVd4MVpTa2dlMXh1SUNBZ0lDQWdjbVZ6YjJ4MlpTaHdjbTl0YVhObExDQjJZV3gxWlNrN1hHNGdJQ0FnZlN3Z1puVnVZM1JwYjI0Z2NtVnFaV04wVUhKdmJXbHpaU2h5WldGemIyNHBJSHRjYmlBZ0lDQWdJSEpsYW1WamRDaHdjbTl0YVhObExDQnlaV0Z6YjI0cE8xeHVJQ0FnSUgwcE8xeHVJQ0I5SUdOaGRHTm9JQ2hsS1NCN1hHNGdJQ0FnY21WcVpXTjBLSEJ5YjIxcGMyVXNJR1VwTzF4dUlDQjlYRzU5WEc1Y2JuWmhjaUJwWkNBOUlEQTdYRzVtZFc1amRHbHZiaUJ1WlhoMFNXUW9LU0I3WEc0Z0lISmxkSFZ5YmlCcFpDc3JPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQnRZV3RsVUhKdmJXbHpaU2h3Y205dGFYTmxLU0I3WEc0Z0lIQnliMjFwYzJWYlVGSlBUVWxUUlY5SlJGMGdQU0JwWkNzck8xeHVJQ0J3Y205dGFYTmxMbDl6ZEdGMFpTQTlJSFZ1WkdWbWFXNWxaRHRjYmlBZ2NISnZiV2x6WlM1ZmNtVnpkV3gwSUQwZ2RXNWtaV1pwYm1Wa08xeHVJQ0J3Y205dGFYTmxMbDl6ZFdKelkzSnBZbVZ5Y3lBOUlGdGRPMXh1ZlZ4dVhHNW1kVzVqZEdsdmJpQjJZV3hwWkdGMGFXOXVSWEp5YjNJb0tTQjdYRzRnSUhKbGRIVnliaUJ1WlhjZ1JYSnliM0lvSjBGeWNtRjVJRTFsZEdodlpITWdiWFZ6ZENCaVpTQndjbTkyYVdSbFpDQmhiaUJCY25KaGVTY3BPMXh1ZlZ4dVhHNTJZWElnUlc1MWJXVnlZWFJ2Y2lBOUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ1puVnVZM1JwYjI0Z1JXNTFiV1Z5WVhSdmNpaERiMjV6ZEhKMVkzUnZjaXdnYVc1d2RYUXBJSHRjYmlBZ0lDQjBhR2x6TGw5cGJuTjBZVzVqWlVOdmJuTjBjblZqZEc5eUlEMGdRMjl1YzNSeWRXTjBiM0k3WEc0Z0lDQWdkR2hwY3k1d2NtOXRhWE5sSUQwZ2JtVjNJRU52Ym5OMGNuVmpkRzl5S0c1dmIzQXBPMXh1WEc0Z0lDQWdhV1lnS0NGMGFHbHpMbkJ5YjIxcGMyVmJVRkpQVFVsVFJWOUpSRjBwSUh0Y2JpQWdJQ0FnSUcxaGEyVlFjbTl0YVhObEtIUm9hWE11Y0hKdmJXbHpaU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdhV1lnS0dselFYSnlZWGtvYVc1d2RYUXBLU0I3WEc0Z0lDQWdJQ0IwYUdsekxteGxibWQwYUNBOUlHbHVjSFYwTG14bGJtZDBhRHRjYmlBZ0lDQWdJSFJvYVhNdVgzSmxiV0ZwYm1sdVp5QTlJR2x1Y0hWMExteGxibWQwYUR0Y2JseHVJQ0FnSUNBZ2RHaHBjeTVmY21WemRXeDBJRDBnYm1WM0lFRnljbUY1S0hSb2FYTXViR1Z1WjNSb0tUdGNibHh1SUNBZ0lDQWdhV1lnS0hSb2FYTXViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lHWjFiR1pwYkd3b2RHaHBjeTV3Y205dGFYTmxMQ0IwYUdsekxsOXlaWE4xYkhRcE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVzWlc1bmRHZ2dQU0IwYUdsekxteGxibWQwYUNCOGZDQXdPMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOWxiblZ0WlhKaGRHVW9hVzV3ZFhRcE8xeHVJQ0FnSUNBZ0lDQnBaaUFvZEdocGN5NWZjbVZ0WVdsdWFXNW5JRDA5UFNBd0tTQjdYRzRnSUNBZ0lDQWdJQ0FnWm5Wc1ptbHNiQ2gwYUdsekxuQnliMjFwYzJVc0lIUm9hWE11WDNKbGMzVnNkQ2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JpQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdjbVZxWldOMEtIUm9hWE11Y0hKdmJXbHpaU3dnZG1Gc2FXUmhkR2x2YmtWeWNtOXlLQ2twTzF4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUVWdWRXMWxjbUYwYjNJdWNISnZkRzkwZVhCbExsOWxiblZ0WlhKaGRHVWdQU0JtZFc1amRHbHZiaUJmWlc1MWJXVnlZWFJsS0dsdWNIVjBLU0I3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lIUm9hWE11WDNOMFlYUmxJRDA5UFNCUVJVNUVTVTVISUNZbUlHa2dQQ0JwYm5CMWRDNXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnZEdocGN5NWZaV0ZqYUVWdWRISjVLR2x1Y0hWMFcybGRMQ0JwS1R0Y2JpQWdJQ0I5WEc0Z0lIMDdYRzVjYmlBZ1JXNTFiV1Z5WVhSdmNpNXdjbTkwYjNSNWNHVXVYMlZoWTJoRmJuUnllU0E5SUdaMWJtTjBhVzl1SUY5bFlXTm9SVzUwY25rb1pXNTBjbmtzSUdrcElIdGNiaUFnSUNCMllYSWdZeUE5SUhSb2FYTXVYMmx1YzNSaGJtTmxRMjl1YzNSeWRXTjBiM0k3WEc0Z0lDQWdkbUZ5SUhKbGMyOXNkbVVrSkRFZ1BTQmpMbkpsYzI5c2RtVTdYRzVjYmx4dUlDQWdJR2xtSUNoeVpYTnZiSFpsSkNReElEMDlQU0J5WlhOdmJIWmxKREVwSUh0Y2JpQWdJQ0FnSUhaaGNpQmZkR2hsYmlBOUlHZGxkRlJvWlc0b1pXNTBjbmtwTzF4dVhHNGdJQ0FnSUNCcFppQW9YM1JvWlc0Z1BUMDlJSFJvWlc0Z0ppWWdaVzUwY25rdVgzTjBZWFJsSUNFOVBTQlFSVTVFU1U1SEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgzTmxkSFJzWldSQmRDaGxiblJ5ZVM1ZmMzUmhkR1VzSUdrc0lHVnVkSEo1TGw5eVpYTjFiSFFwTzF4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMGVYQmxiMllnWDNSb1pXNGdJVDA5SUNkbWRXNWpkR2x2YmljcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ZmNtVnRZV2x1YVc1bkxTMDdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgzSmxjM1ZzZEZ0cFhTQTlJR1Z1ZEhKNU8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaGpJRDA5UFNCUWNtOXRhWE5sSkRFcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNCdVpYY2dZeWh1YjI5d0tUdGNiaUFnSUNBZ0lDQWdhR0Z1Wkd4bFRXRjVZbVZVYUdWdVlXSnNaU2h3Y205dGFYTmxMQ0JsYm5SeWVTd2dYM1JvWlc0cE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5M2FXeHNVMlYwZEd4bFFYUW9jSEp2YldselpTd2dhU2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOTNhV3hzVTJWMGRHeGxRWFFvYm1WM0lHTW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVWtKREVwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2NtVnpiMngyWlNRa01TaGxiblJ5ZVNrN1hHNGdJQ0FnSUNBZ0lIMHBMQ0JwS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdkR2hwY3k1ZmQybHNiRk5sZEhSc1pVRjBLSEpsYzI5c2RtVWtKREVvWlc1MGNua3BMQ0JwS1R0Y2JpQWdJQ0I5WEc0Z0lIMDdYRzVjYmlBZ1JXNTFiV1Z5WVhSdmNpNXdjbTkwYjNSNWNHVXVYM05sZEhSc1pXUkJkQ0E5SUdaMWJtTjBhVzl1SUY5elpYUjBiR1ZrUVhRb2MzUmhkR1VzSUdrc0lIWmhiSFZsS1NCN1hHNGdJQ0FnZG1GeUlIQnliMjFwYzJVZ1BTQjBhR2x6TG5CeWIyMXBjMlU3WEc1Y2JseHVJQ0FnSUdsbUlDaHdjbTl0YVhObExsOXpkR0YwWlNBOVBUMGdVRVZPUkVsT1J5a2dlMXh1SUNBZ0lDQWdkR2hwY3k1ZmNtVnRZV2x1YVc1bkxTMDdYRzVjYmlBZ0lDQWdJR2xtSUNoemRHRjBaU0E5UFQwZ1VrVktSVU5VUlVRcElIdGNiaUFnSUNBZ0lDQWdjbVZxWldOMEtIQnliMjFwYzJVc0lIWmhiSFZsS1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVYM0psYzNWc2RGdHBYU0E5SUhaaGJIVmxPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lHbG1JQ2gwYUdsekxsOXlaVzFoYVc1cGJtY2dQVDA5SURBcElIdGNiaUFnSUNBZ0lHWjFiR1pwYkd3b2NISnZiV2x6WlN3Z2RHaHBjeTVmY21WemRXeDBLVHRjYmlBZ0lDQjlYRzRnSUgwN1hHNWNiaUFnUlc1MWJXVnlZWFJ2Y2k1d2NtOTBiM1I1Y0dVdVgzZHBiR3hUWlhSMGJHVkJkQ0E5SUdaMWJtTjBhVzl1SUY5M2FXeHNVMlYwZEd4bFFYUW9jSEp2YldselpTd2dhU2tnZTF4dUlDQWdJSFpoY2lCbGJuVnRaWEpoZEc5eUlEMGdkR2hwY3p0Y2JseHVJQ0FnSUhOMVluTmpjbWxpWlNod2NtOXRhWE5sTENCMWJtUmxabWx1WldRc0lHWjFibU4wYVc5dUlDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdWdWRXMWxjbUYwYjNJdVgzTmxkSFJzWldSQmRDaEdWVXhHU1V4TVJVUXNJR2tzSUhaaGJIVmxLVHRjYmlBZ0lDQjlMQ0JtZFc1amRHbHZiaUFvY21WaGMyOXVLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaVzUxYldWeVlYUnZjaTVmYzJWMGRHeGxaRUYwS0ZKRlNrVkRWRVZFTENCcExDQnlaV0Z6YjI0cE8xeHVJQ0FnSUgwcE8xeHVJQ0I5TzF4dVhHNGdJSEpsZEhWeWJpQkZiblZ0WlhKaGRHOXlPMXh1ZlNncE8xeHVYRzR2S2lwY2JpQWdZRkJ5YjIxcGMyVXVZV3hzWUNCaFkyTmxjSFJ6SUdGdUlHRnljbUY1SUc5bUlIQnliMjFwYzJWekxDQmhibVFnY21WMGRYSnVjeUJoSUc1bGR5QndjbTl0YVhObElIZG9hV05vWEc0Z0lHbHpJR1oxYkdacGJHeGxaQ0IzYVhSb0lHRnVJR0Z5Y21GNUlHOW1JR1oxYkdacGJHeHRaVzUwSUhaaGJIVmxjeUJtYjNJZ2RHaGxJSEJoYzNObFpDQndjbTl0YVhObGN5d2diM0pjYmlBZ2NtVnFaV04wWldRZ2QybDBhQ0IwYUdVZ2NtVmhjMjl1SUc5bUlIUm9aU0JtYVhKemRDQndZWE56WldRZ2NISnZiV2x6WlNCMGJ5QmlaU0J5WldwbFkzUmxaQzRnU1hRZ1kyRnpkSE1nWVd4c1hHNGdJR1ZzWlcxbGJuUnpJRzltSUhSb1pTQndZWE56WldRZ2FYUmxjbUZpYkdVZ2RHOGdjSEp2YldselpYTWdZWE1nYVhRZ2NuVnVjeUIwYUdseklHRnNaMjl5YVhSb2JTNWNibHh1SUNCRmVHRnRjR3hsT2x4dVhHNGdJR0JnWUdwaGRtRnpZM0pwY0hSY2JpQWdiR1YwSUhCeWIyMXBjMlV4SUQwZ2NtVnpiMngyWlNneEtUdGNiaUFnYkdWMElIQnliMjFwYzJVeUlEMGdjbVZ6YjJ4MlpTZ3lLVHRjYmlBZ2JHVjBJSEJ5YjIxcGMyVXpJRDBnY21WemIyeDJaU2d6S1R0Y2JpQWdiR1YwSUhCeWIyMXBjMlZ6SUQwZ1d5QndjbTl0YVhObE1Td2djSEp2YldselpUSXNJSEJ5YjIxcGMyVXpJRjA3WEc1Y2JpQWdVSEp2YldselpTNWhiR3dvY0hKdmJXbHpaWE1wTG5Sb1pXNG9ablZ1WTNScGIyNG9ZWEp5WVhrcGUxeHVJQ0FnSUM4dklGUm9aU0JoY25KaGVTQm9aWEpsSUhkdmRXeGtJR0psSUZzZ01Td2dNaXdnTXlCZE8xeHVJQ0I5S1R0Y2JpQWdZR0JnWEc1Y2JpQWdTV1lnWVc1NUlHOW1JSFJvWlNCZ2NISnZiV2x6WlhOZ0lHZHBkbVZ1SUhSdklHQmhiR3hnSUdGeVpTQnlaV3BsWTNSbFpDd2dkR2hsSUdacGNuTjBJSEJ5YjIxcGMyVmNiaUFnZEdoaGRDQnBjeUJ5WldwbFkzUmxaQ0IzYVd4c0lHSmxJR2RwZG1WdUlHRnpJR0Z1SUdGeVozVnRaVzUwSUhSdklIUm9aU0J5WlhSMWNtNWxaQ0J3Y205dGFYTmxjeWR6WEc0Z0lISmxhbVZqZEdsdmJpQm9ZVzVrYkdWeUxpQkdiM0lnWlhoaGJYQnNaVHBjYmx4dUlDQkZlR0Z0Y0d4bE9seHVYRzRnSUdCZ1lHcGhkbUZ6WTNKcGNIUmNiaUFnYkdWMElIQnliMjFwYzJVeElEMGdjbVZ6YjJ4MlpTZ3hLVHRjYmlBZ2JHVjBJSEJ5YjIxcGMyVXlJRDBnY21WcVpXTjBLRzVsZHlCRmNuSnZjaWhjSWpKY0lpa3BPMXh1SUNCc1pYUWdjSEp2YldselpUTWdQU0J5WldwbFkzUW9ibVYzSUVWeWNtOXlLRndpTTF3aUtTazdYRzRnSUd4bGRDQndjbTl0YVhObGN5QTlJRnNnY0hKdmJXbHpaVEVzSUhCeWIyMXBjMlV5TENCd2NtOXRhWE5sTXlCZE8xeHVYRzRnSUZCeWIyMXBjMlV1WVd4c0tIQnliMjFwYzJWektTNTBhR1Z1S0daMWJtTjBhVzl1S0dGeWNtRjVLWHRjYmlBZ0lDQXZMeUJEYjJSbElHaGxjbVVnYm1WMlpYSWdjblZ1Y3lCaVpXTmhkWE5sSUhSb1pYSmxJR0Z5WlNCeVpXcGxZM1JsWkNCd2NtOXRhWE5sY3lGY2JpQWdmU3dnWm5WdVkzUnBiMjRvWlhKeWIzSXBJSHRjYmlBZ0lDQXZMeUJsY25KdmNpNXRaWE56WVdkbElEMDlQU0JjSWpKY0lseHVJQ0I5S1R0Y2JpQWdZR0JnWEc1Y2JpQWdRRzFsZEdodlpDQmhiR3hjYmlBZ1FITjBZWFJwWTF4dUlDQkFjR0Z5WVcwZ2UwRnljbUY1ZlNCbGJuUnlhV1Z6SUdGeWNtRjVJRzltSUhCeWIyMXBjMlZ6WEc0Z0lFQndZWEpoYlNCN1UzUnlhVzVuZlNCc1lXSmxiQ0J2Y0hScGIyNWhiQ0J6ZEhKcGJtY2dabTl5SUd4aFltVnNhVzVuSUhSb1pTQndjbTl0YVhObExseHVJQ0JWYzJWbWRXd2dabTl5SUhSdmIyeHBibWN1WEc0Z0lFQnlaWFIxY200Z2UxQnliMjFwYzJWOUlIQnliMjFwYzJVZ2RHaGhkQ0JwY3lCbWRXeG1hV3hzWldRZ2QyaGxiaUJoYkd3Z1lIQnliMjFwYzJWellDQm9ZWFpsSUdKbFpXNWNiaUFnWm5Wc1ptbHNiR1ZrTENCdmNpQnlaV3BsWTNSbFpDQnBaaUJoYm5rZ2IyWWdkR2hsYlNCaVpXTnZiV1VnY21WcVpXTjBaV1F1WEc0Z0lFQnpkR0YwYVdOY2Jpb3ZYRzVtZFc1amRHbHZiaUJoYkd3b1pXNTBjbWxsY3lrZ2UxeHVJQ0J5WlhSMWNtNGdibVYzSUVWdWRXMWxjbUYwYjNJb2RHaHBjeXdnWlc1MGNtbGxjeWt1Y0hKdmJXbHpaVHRjYm4xY2JseHVMeW9xWEc0Z0lHQlFjbTl0YVhObExuSmhZMlZnSUhKbGRIVnlibk1nWVNCdVpYY2djSEp2YldselpTQjNhR2xqYUNCcGN5QnpaWFIwYkdWa0lHbHVJSFJvWlNCellXMWxJSGRoZVNCaGN5QjBhR1ZjYmlBZ1ptbHljM1FnY0dGemMyVmtJSEJ5YjIxcGMyVWdkRzhnYzJWMGRHeGxMbHh1WEc0Z0lFVjRZVzF3YkdVNlhHNWNiaUFnWUdCZ2FtRjJZWE5qY21sd2RGeHVJQ0JzWlhRZ2NISnZiV2x6WlRFZ1BTQnVaWGNnVUhKdmJXbHpaU2htZFc1amRHbHZiaWh5WlhOdmJIWmxMQ0J5WldwbFkzUXBlMXh1SUNBZ0lITmxkRlJwYldWdmRYUW9ablZ1WTNScGIyNG9LWHRjYmlBZ0lDQWdJSEpsYzI5c2RtVW9KM0J5YjIxcGMyVWdNU2NwTzF4dUlDQWdJSDBzSURJd01DazdYRzRnSUgwcE8xeHVYRzRnSUd4bGRDQndjbTl0YVhObE1pQTlJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1S0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2w3WEc0Z0lDQWdjMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZiaWdwZTF4dUlDQWdJQ0FnY21WemIyeDJaU2duY0hKdmJXbHpaU0F5SnlrN1hHNGdJQ0FnZlN3Z01UQXdLVHRjYmlBZ2ZTazdYRzVjYmlBZ1VISnZiV2x6WlM1eVlXTmxLRnR3Y205dGFYTmxNU3dnY0hKdmJXbHpaVEpkS1M1MGFHVnVLR1oxYm1OMGFXOXVLSEpsYzNWc2RDbDdYRzRnSUNBZ0x5OGdjbVZ6ZFd4MElEMDlQU0FuY0hKdmJXbHpaU0F5SnlCaVpXTmhkWE5sSUdsMElIZGhjeUJ5WlhOdmJIWmxaQ0JpWldadmNtVWdjSEp2YldselpURmNiaUFnSUNBdkx5QjNZWE1nY21WemIyeDJaV1F1WEc0Z0lIMHBPMXh1SUNCZ1lHQmNibHh1SUNCZ1VISnZiV2x6WlM1eVlXTmxZQ0JwY3lCa1pYUmxjbTFwYm1semRHbGpJR2x1SUhSb1lYUWdiMjVzZVNCMGFHVWdjM1JoZEdVZ2IyWWdkR2hsSUdacGNuTjBYRzRnSUhObGRIUnNaV1FnY0hKdmJXbHpaU0J0WVhSMFpYSnpMaUJHYjNJZ1pYaGhiWEJzWlN3Z1pYWmxiaUJwWmlCdmRHaGxjaUJ3Y205dGFYTmxjeUJuYVhabGJpQjBieUIwYUdWY2JpQWdZSEJ5YjIxcGMyVnpZQ0JoY25KaGVTQmhjbWQxYldWdWRDQmhjbVVnY21WemIyeDJaV1FzSUdKMWRDQjBhR1VnWm1seWMzUWdjMlYwZEd4bFpDQndjbTl0YVhObElHaGhjMXh1SUNCaVpXTnZiV1VnY21WcVpXTjBaV1FnWW1WbWIzSmxJSFJvWlNCdmRHaGxjaUJ3Y205dGFYTmxjeUJpWldOaGJXVWdablZzWm1sc2JHVmtMQ0IwYUdVZ2NtVjBkWEp1WldSY2JpQWdjSEp2YldselpTQjNhV3hzSUdKbFkyOXRaU0J5WldwbFkzUmxaRHBjYmx4dUlDQmdZR0JxWVhaaGMyTnlhWEIwWEc0Z0lHeGxkQ0J3Y205dGFYTmxNU0E5SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUtISmxjMjlzZG1Vc0lISmxhbVZqZENsN1hHNGdJQ0FnYzJWMFZHbHRaVzkxZENobWRXNWpkR2x2YmlncGUxeHVJQ0FnSUNBZ2NtVnpiMngyWlNnbmNISnZiV2x6WlNBeEp5azdYRzRnSUNBZ2ZTd2dNakF3S1R0Y2JpQWdmU2s3WEc1Y2JpQWdiR1YwSUhCeWIyMXBjMlV5SUQwZ2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtYdGNiaUFnSUNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dUtDbDdYRzRnSUNBZ0lDQnlaV3BsWTNRb2JtVjNJRVZ5Y205eUtDZHdjbTl0YVhObElESW5LU2s3WEc0Z0lDQWdmU3dnTVRBd0tUdGNiaUFnZlNrN1hHNWNiaUFnVUhKdmJXbHpaUzV5WVdObEtGdHdjbTl0YVhObE1Td2djSEp2YldselpUSmRLUzUwYUdWdUtHWjFibU4wYVc5dUtISmxjM1ZzZENsN1hHNGdJQ0FnTHk4Z1EyOWtaU0JvWlhKbElHNWxkbVZ5SUhKMWJuTmNiaUFnZlN3Z1puVnVZM1JwYjI0b2NtVmhjMjl1S1h0Y2JpQWdJQ0F2THlCeVpXRnpiMjR1YldWemMyRm5aU0E5UFQwZ0ozQnliMjFwYzJVZ01pY2dZbVZqWVhWelpTQndjbTl0YVhObElESWdZbVZqWVcxbElISmxhbVZqZEdWa0lHSmxabTl5WlZ4dUlDQWdJQzh2SUhCeWIyMXBjMlVnTVNCaVpXTmhiV1VnWm5Wc1ptbHNiR1ZrWEc0Z0lIMHBPMXh1SUNCZ1lHQmNibHh1SUNCQmJpQmxlR0Z0Y0d4bElISmxZV3d0ZDI5eWJHUWdkWE5sSUdOaGMyVWdhWE1nYVcxd2JHVnRaVzUwYVc1bklIUnBiV1Z2ZFhSek9seHVYRzRnSUdCZ1lHcGhkbUZ6WTNKcGNIUmNiaUFnVUhKdmJXbHpaUzV5WVdObEtGdGhhbUY0S0NkbWIyOHVhbk52YmljcExDQjBhVzFsYjNWMEtEVXdNREFwWFNsY2JpQWdZR0JnWEc1Y2JpQWdRRzFsZEdodlpDQnlZV05sWEc0Z0lFQnpkR0YwYVdOY2JpQWdRSEJoY21GdElIdEJjbkpoZVgwZ2NISnZiV2x6WlhNZ1lYSnlZWGtnYjJZZ2NISnZiV2x6WlhNZ2RHOGdiMkp6WlhKMlpWeHVJQ0JWYzJWbWRXd2dabTl5SUhSdmIyeHBibWN1WEc0Z0lFQnlaWFIxY200Z2UxQnliMjFwYzJWOUlHRWdjSEp2YldselpTQjNhR2xqYUNCelpYUjBiR1Z6SUdsdUlIUm9aU0J6WVcxbElIZGhlU0JoY3lCMGFHVWdabWx5YzNRZ2NHRnpjMlZrWEc0Z0lIQnliMjFwYzJVZ2RHOGdjMlYwZEd4bExseHVLaTljYm1aMWJtTjBhVzl1SUhKaFkyVW9aVzUwY21sbGN5a2dlMXh1SUNBdkttcHphR2x1ZENCMllXeHBaSFJvYVhNNmRISjFaU0FxTDF4dUlDQjJZWElnUTI5dWMzUnlkV04wYjNJZ1BTQjBhR2x6TzF4dVhHNGdJR2xtSUNnaGFYTkJjbkpoZVNobGJuUnlhV1Z6S1NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ1WlhjZ1EyOXVjM1J5ZFdOMGIzSW9ablZ1WTNScGIyNGdLRjhzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEpsYW1WamRDaHVaWGNnVkhsd1pVVnljbTl5S0NkWmIzVWdiWFZ6ZENCd1lYTnpJR0Z1SUdGeWNtRjVJSFJ2SUhKaFkyVXVKeWtwTzF4dUlDQWdJSDBwTzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUhKbGRIVnliaUJ1WlhjZ1EyOXVjM1J5ZFdOMGIzSW9ablZ1WTNScGIyNGdLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdkbUZ5SUd4bGJtZDBhQ0E5SUdWdWRISnBaWE11YkdWdVozUm9PMXh1SUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQkRiMjV6ZEhKMVkzUnZjaTV5WlhOdmJIWmxLR1Z1ZEhKcFpYTmJhVjBwTG5Sb1pXNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOUtUdGNiaUFnZlZ4dWZWeHVYRzR2S2lwY2JpQWdZRkJ5YjIxcGMyVXVjbVZxWldOMFlDQnlaWFIxY201eklHRWdjSEp2YldselpTQnlaV3BsWTNSbFpDQjNhWFJvSUhSb1pTQndZWE56WldRZ1lISmxZWE52Ym1BdVhHNGdJRWwwSUdseklITm9iM0owYUdGdVpDQm1iM0lnZEdobElHWnZiR3h2ZDJsdVp6cGNibHh1SUNCZ1lHQnFZWFpoYzJOeWFYQjBYRzRnSUd4bGRDQndjbTl0YVhObElEMGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRvY21WemIyeDJaU3dnY21WcVpXTjBLWHRjYmlBZ0lDQnlaV3BsWTNRb2JtVjNJRVZ5Y205eUtDZFhTRTlQVUZNbktTazdYRzRnSUgwcE8xeHVYRzRnSUhCeWIyMXBjMlV1ZEdobGJpaG1kVzVqZEdsdmJpaDJZV3gxWlNsN1hHNGdJQ0FnTHk4Z1EyOWtaU0JvWlhKbElHUnZaWE51SjNRZ2NuVnVJR0psWTJGMWMyVWdkR2hsSUhCeWIyMXBjMlVnYVhNZ2NtVnFaV04wWldRaFhHNGdJSDBzSUdaMWJtTjBhVzl1S0hKbFlYTnZiaWw3WEc0Z0lDQWdMeThnY21WaGMyOXVMbTFsYzNOaFoyVWdQVDA5SUNkWFNFOVBVRk1uWEc0Z0lIMHBPMXh1SUNCZ1lHQmNibHh1SUNCSmJuTjBaV0ZrSUc5bUlIZHlhWFJwYm1jZ2RHaGxJR0ZpYjNabExDQjViM1Z5SUdOdlpHVWdibTkzSUhOcGJYQnNlU0JpWldOdmJXVnpJSFJvWlNCbWIyeHNiM2RwYm1jNlhHNWNiaUFnWUdCZ2FtRjJZWE5qY21sd2RGeHVJQ0JzWlhRZ2NISnZiV2x6WlNBOUlGQnliMjFwYzJVdWNtVnFaV04wS0c1bGR5QkZjbkp2Y2lnblYwaFBUMUJUSnlrcE8xeHVYRzRnSUhCeWIyMXBjMlV1ZEdobGJpaG1kVzVqZEdsdmJpaDJZV3gxWlNsN1hHNGdJQ0FnTHk4Z1EyOWtaU0JvWlhKbElHUnZaWE51SjNRZ2NuVnVJR0psWTJGMWMyVWdkR2hsSUhCeWIyMXBjMlVnYVhNZ2NtVnFaV04wWldRaFhHNGdJSDBzSUdaMWJtTjBhVzl1S0hKbFlYTnZiaWw3WEc0Z0lDQWdMeThnY21WaGMyOXVMbTFsYzNOaFoyVWdQVDA5SUNkWFNFOVBVRk1uWEc0Z0lIMHBPMXh1SUNCZ1lHQmNibHh1SUNCQWJXVjBhRzlrSUhKbGFtVmpkRnh1SUNCQWMzUmhkR2xqWEc0Z0lFQndZWEpoYlNCN1FXNTVmU0J5WldGemIyNGdkbUZzZFdVZ2RHaGhkQ0IwYUdVZ2NtVjBkWEp1WldRZ2NISnZiV2x6WlNCM2FXeHNJR0psSUhKbGFtVmpkR1ZrSUhkcGRHZ3VYRzRnSUZWelpXWjFiQ0JtYjNJZ2RHOXZiR2x1Wnk1Y2JpQWdRSEpsZEhWeWJpQjdVSEp2YldselpYMGdZU0J3Y205dGFYTmxJSEpsYW1WamRHVmtJSGRwZEdnZ2RHaGxJR2RwZG1WdUlHQnlaV0Z6YjI1Z0xseHVLaTljYm1aMWJtTjBhVzl1SUhKbGFtVmpkQ1F4S0hKbFlYTnZiaWtnZTF4dUlDQXZLbXB6YUdsdWRDQjJZV3hwWkhSb2FYTTZkSEoxWlNBcUwxeHVJQ0IyWVhJZ1EyOXVjM1J5ZFdOMGIzSWdQU0IwYUdsek8xeHVJQ0IyWVhJZ2NISnZiV2x6WlNBOUlHNWxkeUJEYjI1emRISjFZM1J2Y2lodWIyOXdLVHRjYmlBZ2NtVnFaV04wS0hCeWIyMXBjMlVzSUhKbFlYTnZiaWs3WEc0Z0lISmxkSFZ5YmlCd2NtOXRhWE5sTzF4dWZWeHVYRzVtZFc1amRHbHZiaUJ1WldWa2MxSmxjMjlzZG1WeUtDa2dlMXh1SUNCMGFISnZkeUJ1WlhjZ1ZIbHdaVVZ5Y205eUtDZFpiM1VnYlhWemRDQndZWE56SUdFZ2NtVnpiMngyWlhJZ1puVnVZM1JwYjI0Z1lYTWdkR2hsSUdacGNuTjBJR0Z5WjNWdFpXNTBJSFJ2SUhSb1pTQndjbTl0YVhObElHTnZibk4wY25WamRHOXlKeWs3WEc1OVhHNWNibVoxYm1OMGFXOXVJRzVsWldSelRtVjNLQ2tnZTF4dUlDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLRndpUm1GcGJHVmtJSFJ2SUdOdmJuTjBjblZqZENBblVISnZiV2x6WlNjNklGQnNaV0Z6WlNCMWMyVWdkR2hsSUNkdVpYY25JRzl3WlhKaGRHOXlMQ0IwYUdseklHOWlhbVZqZENCamIyNXpkSEoxWTNSdmNpQmpZVzV1YjNRZ1ltVWdZMkZzYkdWa0lHRnpJR0VnWm5WdVkzUnBiMjR1WENJcE8xeHVmVnh1WEc0dktpcGNiaUFnVUhKdmJXbHpaU0J2WW1wbFkzUnpJSEpsY0hKbGMyVnVkQ0IwYUdVZ1pYWmxiblIxWVd3Z2NtVnpkV3gwSUc5bUlHRnVJR0Z6ZVc1amFISnZibTkxY3lCdmNHVnlZWFJwYjI0dUlGUm9aVnh1SUNCd2NtbHRZWEo1SUhkaGVTQnZaaUJwYm5SbGNtRmpkR2x1WnlCM2FYUm9JR0VnY0hKdmJXbHpaU0JwY3lCMGFISnZkV2RvSUdsMGN5QmdkR2hsYm1BZ2JXVjBhRzlrTENCM2FHbGphRnh1SUNCeVpXZHBjM1JsY25NZ1kyRnNiR0poWTJ0eklIUnZJSEpsWTJWcGRtVWdaV2wwYUdWeUlHRWdjSEp2YldselpTZHpJR1YyWlc1MGRXRnNJSFpoYkhWbElHOXlJSFJvWlNCeVpXRnpiMjVjYmlBZ2QyaDVJSFJvWlNCd2NtOXRhWE5sSUdOaGJtNXZkQ0JpWlNCbWRXeG1hV3hzWldRdVhHNWNiaUFnVkdWeWJXbHViMnh2WjNsY2JpQWdMUzB0TFMwdExTMHRMUzFjYmx4dUlDQXRJR0J3Y205dGFYTmxZQ0JwY3lCaGJpQnZZbXBsWTNRZ2IzSWdablZ1WTNScGIyNGdkMmwwYUNCaElHQjBhR1Z1WUNCdFpYUm9iMlFnZDJodmMyVWdZbVZvWVhacGIzSWdZMjl1Wm05eWJYTWdkRzhnZEdocGN5QnpjR1ZqYVdacFkyRjBhVzl1TGx4dUlDQXRJR0IwYUdWdVlXSnNaV0FnYVhNZ1lXNGdiMkpxWldOMElHOXlJR1oxYm1OMGFXOXVJSFJvWVhRZ1pHVm1hVzVsY3lCaElHQjBhR1Z1WUNCdFpYUm9iMlF1WEc0Z0lDMGdZSFpoYkhWbFlDQnBjeUJoYm5rZ2JHVm5ZV3dnU21GMllWTmpjbWx3ZENCMllXeDFaU0FvYVc1amJIVmthVzVuSUhWdVpHVm1hVzVsWkN3Z1lTQjBhR1Z1WVdKc1pTd2diM0lnWVNCd2NtOXRhWE5sS1M1Y2JpQWdMU0JnWlhoalpYQjBhVzl1WUNCcGN5QmhJSFpoYkhWbElIUm9ZWFFnYVhNZ2RHaHliM2R1SUhWemFXNW5JSFJvWlNCMGFISnZkeUJ6ZEdGMFpXMWxiblF1WEc0Z0lDMGdZSEpsWVhOdmJtQWdhWE1nWVNCMllXeDFaU0IwYUdGMElHbHVaR2xqWVhSbGN5QjNhSGtnWVNCd2NtOXRhWE5sSUhkaGN5QnlaV3BsWTNSbFpDNWNiaUFnTFNCZ2MyVjBkR3hsWkdBZ2RHaGxJR1pwYm1Gc0lISmxjM1JwYm1jZ2MzUmhkR1VnYjJZZ1lTQndjbTl0YVhObExDQm1kV3htYVd4c1pXUWdiM0lnY21WcVpXTjBaV1F1WEc1Y2JpQWdRU0J3Y205dGFYTmxJR05oYmlCaVpTQnBiaUJ2Ym1VZ2IyWWdkR2h5WldVZ2MzUmhkR1Z6T2lCd1pXNWthVzVuTENCbWRXeG1hV3hzWldRc0lHOXlJSEpsYW1WamRHVmtMbHh1WEc0Z0lGQnliMjFwYzJWeklIUm9ZWFFnWVhKbElHWjFiR1pwYkd4bFpDQm9ZWFpsSUdFZ1puVnNabWxzYkcxbGJuUWdkbUZzZFdVZ1lXNWtJR0Z5WlNCcGJpQjBhR1VnWm5Wc1ptbHNiR1ZrWEc0Z0lITjBZWFJsTGlBZ1VISnZiV2x6WlhNZ2RHaGhkQ0JoY21VZ2NtVnFaV04wWldRZ2FHRjJaU0JoSUhKbGFtVmpkR2x2YmlCeVpXRnpiMjRnWVc1a0lHRnlaU0JwYmlCMGFHVmNiaUFnY21WcVpXTjBaV1FnYzNSaGRHVXVJQ0JCSUdaMWJHWnBiR3h0Wlc1MElIWmhiSFZsSUdseklHNWxkbVZ5SUdFZ2RHaGxibUZpYkdVdVhHNWNiaUFnVUhKdmJXbHpaWE1nWTJGdUlHRnNjMjhnWW1VZ2MyRnBaQ0IwYnlBcWNtVnpiMngyWlNvZ1lTQjJZV3gxWlM0Z0lFbG1JSFJvYVhNZ2RtRnNkV1VnYVhNZ1lXeHpieUJoWEc0Z0lIQnliMjFwYzJVc0lIUm9aVzRnZEdobElHOXlhV2RwYm1Gc0lIQnliMjFwYzJVbmN5QnpaWFIwYkdWa0lITjBZWFJsSUhkcGJHd2diV0YwWTJnZ2RHaGxJSFpoYkhWbEozTmNiaUFnYzJWMGRHeGxaQ0J6ZEdGMFpTNGdJRk52SUdFZ2NISnZiV2x6WlNCMGFHRjBJQ3B5WlhOdmJIWmxjeW9nWVNCd2NtOXRhWE5sSUhSb1lYUWdjbVZxWldOMGN5QjNhV3hzWEc0Z0lHbDBjMlZzWmlCeVpXcGxZM1FzSUdGdVpDQmhJSEJ5YjIxcGMyVWdkR2hoZENBcWNtVnpiMngyWlhNcUlHRWdjSEp2YldselpTQjBhR0YwSUdaMWJHWnBiR3h6SUhkcGJHeGNiaUFnYVhSelpXeG1JR1oxYkdacGJHd3VYRzVjYmx4dUlDQkNZWE5wWXlCVmMyRm5aVHBjYmlBZ0xTMHRMUzB0TFMwdExTMHRYRzVjYmlBZ1lHQmdhbk5jYmlBZ2JHVjBJSEJ5YjIxcGMyVWdQU0J1WlhjZ1VISnZiV2x6WlNobWRXNWpkR2x2YmloeVpYTnZiSFpsTENCeVpXcGxZM1FwSUh0Y2JpQWdJQ0F2THlCdmJpQnpkV05qWlhOelhHNGdJQ0FnY21WemIyeDJaU2gyWVd4MVpTazdYRzVjYmlBZ0lDQXZMeUJ2YmlCbVlXbHNkWEpsWEc0Z0lDQWdjbVZxWldOMEtISmxZWE52YmlrN1hHNGdJSDBwTzF4dVhHNGdJSEJ5YjIxcGMyVXVkR2hsYmlobWRXNWpkR2x2YmloMllXeDFaU2tnZTF4dUlDQWdJQzh2SUc5dUlHWjFiR1pwYkd4dFpXNTBYRzRnSUgwc0lHWjFibU4wYVc5dUtISmxZWE52YmlrZ2UxeHVJQ0FnSUM4dklHOXVJSEpsYW1WamRHbHZibHh1SUNCOUtUdGNiaUFnWUdCZ1hHNWNiaUFnUVdSMllXNWpaV1FnVlhOaFoyVTZYRzRnSUMwdExTMHRMUzB0TFMwdExTMHRMVnh1WEc0Z0lGQnliMjFwYzJWeklITm9hVzVsSUhkb1pXNGdZV0p6ZEhKaFkzUnBibWNnWVhkaGVTQmhjM2x1WTJoeWIyNXZkWE1nYVc1MFpYSmhZM1JwYjI1eklITjFZMmdnWVhOY2JpQWdZRmhOVEVoMGRIQlNaWEYxWlhOMFlITXVYRzVjYmlBZ1lHQmdhbk5jYmlBZ1puVnVZM1JwYjI0Z1oyVjBTbE5QVGloMWNtd3BJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtYdGNiaUFnSUNBZ0lHeGxkQ0I0YUhJZ1BTQnVaWGNnV0UxTVNIUjBjRkpsY1hWbGMzUW9LVHRjYmx4dUlDQWdJQ0FnZUdoeUxtOXdaVzRvSjBkRlZDY3NJSFZ5YkNrN1hHNGdJQ0FnSUNCNGFISXViMjV5WldGa2VYTjBZWFJsWTJoaGJtZGxJRDBnYUdGdVpHeGxjanRjYmlBZ0lDQWdJSGhvY2k1eVpYTndiMjV6WlZSNWNHVWdQU0FuYW5OdmJpYzdYRzRnSUNBZ0lDQjRhSEl1YzJWMFVtVnhkV1Z6ZEVobFlXUmxjaWduUVdOalpYQjBKeXdnSjJGd2NHeHBZMkYwYVc5dUwycHpiMjRuS1R0Y2JpQWdJQ0FnSUhob2NpNXpaVzVrS0NrN1hHNWNiaUFnSUNBZ0lHWjFibU4wYVc5dUlHaGhibVJzWlhJb0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoMGFHbHpMbkpsWVdSNVUzUmhkR1VnUFQwOUlIUm9hWE11UkU5T1JTa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaDBhR2x6TG5OMFlYUjFjeUE5UFQwZ01qQXdLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaWE52YkhabEtIUm9hWE11Y21WemNHOXVjMlVwTzF4dUlDQWdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WldwbFkzUW9ibVYzSUVWeWNtOXlLQ2RuWlhSS1UwOU9PaUJnSnlBcklIVnliQ0FySUNkZ0lHWmhhV3hsWkNCM2FYUm9JSE4wWVhSMWN6b2dXeWNnS3lCMGFHbHpMbk4wWVhSMWN5QXJJQ2RkSnlrcE8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlR0Y2JpQWdJQ0I5S1R0Y2JpQWdmVnh1WEc0Z0lHZGxkRXBUVDA0b0p5OXdiM04wY3k1cWMyOXVKeWt1ZEdobGJpaG1kVzVqZEdsdmJpaHFjMjl1S1NCN1hHNGdJQ0FnTHk4Z2IyNGdablZzWm1sc2JHMWxiblJjYmlBZ2ZTd2dablZ1WTNScGIyNG9jbVZoYzI5dUtTQjdYRzRnSUNBZ0x5OGdiMjRnY21WcVpXTjBhVzl1WEc0Z0lIMHBPMXh1SUNCZ1lHQmNibHh1SUNCVmJteHBhMlVnWTJGc2JHSmhZMnR6TENCd2NtOXRhWE5sY3lCaGNtVWdaM0psWVhRZ1kyOXRjRzl6WVdKc1pTQndjbWx0YVhScGRtVnpMbHh1WEc0Z0lHQmdZR3B6WEc0Z0lGQnliMjFwYzJVdVlXeHNLRnRjYmlBZ0lDQm5aWFJLVTA5T0tDY3ZjRzl6ZEhNbktTeGNiaUFnSUNCblpYUktVMDlPS0NjdlkyOXRiV1Z1ZEhNbktWeHVJQ0JkS1M1MGFHVnVLR1oxYm1OMGFXOXVLSFpoYkhWbGN5bDdYRzRnSUNBZ2RtRnNkV1Z6V3pCZElDOHZJRDArSUhCdmMzUnpTbE5QVGx4dUlDQWdJSFpoYkhWbGMxc3hYU0F2THlBOVBpQmpiMjF0Wlc1MGMwcFRUMDVjYmx4dUlDQWdJSEpsZEhWeWJpQjJZV3gxWlhNN1hHNGdJSDBwTzF4dUlDQmdZR0JjYmx4dUlDQkFZMnhoYzNNZ1VISnZiV2x6WlZ4dUlDQkFjR0Z5WVcwZ2UwWjFibU4wYVc5dWZTQnlaWE52YkhabGNseHVJQ0JWYzJWbWRXd2dabTl5SUhSdmIyeHBibWN1WEc0Z0lFQmpiMjV6ZEhKMVkzUnZjbHh1S2k5Y2JseHVkbUZ5SUZCeWIyMXBjMlVrTVNBOUlHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ1puVnVZM1JwYjI0Z1VISnZiV2x6WlNoeVpYTnZiSFpsY2lrZ2UxeHVJQ0FnSUhSb2FYTmJVRkpQVFVsVFJWOUpSRjBnUFNCdVpYaDBTV1FvS1R0Y2JpQWdJQ0IwYUdsekxsOXlaWE4xYkhRZ1BTQjBhR2x6TGw5emRHRjBaU0E5SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0IwYUdsekxsOXpkV0p6WTNKcFltVnljeUE5SUZ0ZE8xeHVYRzRnSUNBZ2FXWWdLRzV2YjNBZ0lUMDlJSEpsYzI5c2RtVnlLU0I3WEc0Z0lDQWdJQ0IwZVhCbGIyWWdjbVZ6YjJ4MlpYSWdJVDA5SUNkbWRXNWpkR2x2YmljZ0ppWWdibVZsWkhOU1pYTnZiSFpsY2lncE8xeHVJQ0FnSUNBZ2RHaHBjeUJwYm5OMFlXNWpaVzltSUZCeWIyMXBjMlVnUHlCcGJtbDBhV0ZzYVhwbFVISnZiV2x6WlNoMGFHbHpMQ0J5WlhOdmJIWmxjaWtnT2lCdVpXVmtjMDVsZHlncE8xeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lDOHFLbHh1SUNCVWFHVWdjSEpwYldGeWVTQjNZWGtnYjJZZ2FXNTBaWEpoWTNScGJtY2dkMmwwYUNCaElIQnliMjFwYzJVZ2FYTWdkR2h5YjNWbmFDQnBkSE1nWUhSb1pXNWdJRzFsZEdodlpDeGNiaUFnZDJocFkyZ2djbVZuYVhOMFpYSnpJR05oYkd4aVlXTnJjeUIwYnlCeVpXTmxhWFpsSUdWcGRHaGxjaUJoSUhCeWIyMXBjMlVuY3lCbGRtVnVkSFZoYkNCMllXeDFaU0J2Y2lCMGFHVmNiaUFnY21WaGMyOXVJSGRvZVNCMGFHVWdjSEp2YldselpTQmpZVzV1YjNRZ1ltVWdablZzWm1sc2JHVmtMbHh1SUNBZ1lHQmdhbk5jYmlBZ1ptbHVaRlZ6WlhJb0tTNTBhR1Z1S0daMWJtTjBhVzl1S0hWelpYSXBlMXh1SUNBZ0lDOHZJSFZ6WlhJZ2FYTWdZWFpoYVd4aFlteGxYRzRnSUgwc0lHWjFibU4wYVc5dUtISmxZWE52YmlsN1hHNGdJQ0FnTHk4Z2RYTmxjaUJwY3lCMWJtRjJZV2xzWVdKc1pTd2dZVzVrSUhsdmRTQmhjbVVnWjJsMlpXNGdkR2hsSUhKbFlYTnZiaUIzYUhsY2JpQWdmU2s3WEc0Z0lHQmdZRnh1SUNBZ1EyaGhhVzVwYm1kY2JpQWdMUzB0TFMwdExTMWNiaUFnSUZSb1pTQnlaWFIxY200Z2RtRnNkV1VnYjJZZ1lIUm9aVzVnSUdseklHbDBjMlZzWmlCaElIQnliMjFwYzJVdUlDQlVhR2x6SUhObFkyOXVaQ3dnSjJSdmQyNXpkSEpsWVcwblhHNGdJSEJ5YjIxcGMyVWdhWE1nY21WemIyeDJaV1FnZDJsMGFDQjBhR1VnY21WMGRYSnVJSFpoYkhWbElHOW1JSFJvWlNCbWFYSnpkQ0J3Y205dGFYTmxKM01nWm5Wc1ptbHNiRzFsYm5SY2JpQWdiM0lnY21WcVpXTjBhVzl1SUdoaGJtUnNaWElzSUc5eUlISmxhbVZqZEdWa0lHbG1JSFJvWlNCb1lXNWtiR1Z5SUhSb2NtOTNjeUJoYmlCbGVHTmxjSFJwYjI0dVhHNGdJQ0JnWUdCcWMxeHVJQ0JtYVc1a1ZYTmxjaWdwTG5Sb1pXNG9ablZ1WTNScGIyNGdLSFZ6WlhJcElIdGNiaUFnSUNCeVpYUjFjbTRnZFhObGNpNXVZVzFsTzF4dUlDQjlMQ0JtZFc1amRHbHZiaUFvY21WaGMyOXVLU0I3WEc0Z0lDQWdjbVYwZFhKdUlDZGtaV1poZFd4MElHNWhiV1VuTzF4dUlDQjlLUzUwYUdWdUtHWjFibU4wYVc5dUlDaDFjMlZ5VG1GdFpTa2dlMXh1SUNBZ0lDOHZJRWxtSUdCbWFXNWtWWE5sY21BZ1puVnNabWxzYkdWa0xDQmdkWE5sY2s1aGJXVmdJSGRwYkd3Z1ltVWdkR2hsSUhWelpYSW5jeUJ1WVcxbExDQnZkR2hsY25kcGMyVWdhWFJjYmlBZ0lDQXZMeUIzYVd4c0lHSmxJR0FuWkdWbVlYVnNkQ0J1WVcxbEoyQmNiaUFnZlNrN1hHNGdJQ0JtYVc1a1ZYTmxjaWdwTG5Sb1pXNG9ablZ1WTNScGIyNGdLSFZ6WlhJcElIdGNiaUFnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjBadmRXNWtJSFZ6WlhJc0lHSjFkQ0J6ZEdsc2JDQjFibWhoY0hCNUp5azdYRzRnSUgwc0lHWjFibU4wYVc5dUlDaHlaV0Z6YjI0cElIdGNiaUFnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjJCbWFXNWtWWE5sY21BZ2NtVnFaV04wWldRZ1lXNWtJSGRsSjNKbElIVnVhR0Z3Y0hrbktUdGNiaUFnZlNrdWRHaGxiaWhtZFc1amRHbHZiaUFvZG1Gc2RXVXBJSHRjYmlBZ0lDQXZMeUJ1WlhabGNpQnlaV0ZqYUdWa1hHNGdJSDBzSUdaMWJtTjBhVzl1SUNoeVpXRnpiMjRwSUh0Y2JpQWdJQ0F2THlCcFppQmdabWx1WkZWelpYSmdJR1oxYkdacGJHeGxaQ3dnWUhKbFlYTnZibUFnZDJsc2JDQmlaU0FuUm05MWJtUWdkWE5sY2l3Z1luVjBJSE4wYVd4c0lIVnVhR0Z3Y0hrbkxseHVJQ0FnSUM4dklFbG1JR0JtYVc1a1ZYTmxjbUFnY21WcVpXTjBaV1FzSUdCeVpXRnpiMjVnSUhkcGJHd2dZbVVnSjJCbWFXNWtWWE5sY21BZ2NtVnFaV04wWldRZ1lXNWtJSGRsSjNKbElIVnVhR0Z3Y0hrbkxseHVJQ0I5S1R0Y2JpQWdZR0JnWEc0Z0lFbG1JSFJvWlNCa2IzZHVjM1J5WldGdElIQnliMjFwYzJVZ1pHOWxjeUJ1YjNRZ2MzQmxZMmxtZVNCaElISmxhbVZqZEdsdmJpQm9ZVzVrYkdWeUxDQnlaV3BsWTNScGIyNGdjbVZoYzI5dWN5QjNhV3hzSUdKbElIQnliM0JoWjJGMFpXUWdablZ5ZEdobGNpQmtiM2R1YzNSeVpXRnRMbHh1SUNBZ1lHQmdhbk5jYmlBZ1ptbHVaRlZ6WlhJb0tTNTBhR1Z1S0daMWJtTjBhVzl1SUNoMWMyVnlLU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRkJsWkdGbmIyZHBZMkZzUlhoalpYQjBhVzl1S0NkVmNITjBjbVZoYlNCbGNuSnZjaWNwTzF4dUlDQjlLUzUwYUdWdUtHWjFibU4wYVc5dUlDaDJZV3gxWlNrZ2UxeHVJQ0FnSUM4dklHNWxkbVZ5SUhKbFlXTm9aV1JjYmlBZ2ZTa3VkR2hsYmlobWRXNWpkR2x2YmlBb2RtRnNkV1VwSUh0Y2JpQWdJQ0F2THlCdVpYWmxjaUJ5WldGamFHVmtYRzRnSUgwc0lHWjFibU4wYVc5dUlDaHlaV0Z6YjI0cElIdGNiaUFnSUNBdkx5QlVhR1VnWUZCbFpHZGhaMjlqYVdGc1JYaGpaWEIwYVc5dVlDQnBjeUJ3Y205d1lXZGhkR1ZrSUdGc2JDQjBhR1VnZDJGNUlHUnZkMjRnZEc4Z2FHVnlaVnh1SUNCOUtUdGNiaUFnWUdCZ1hHNGdJQ0JCYzNOcGJXbHNZWFJwYjI1Y2JpQWdMUzB0TFMwdExTMHRMUzB0WEc0Z0lDQlRiMjFsZEdsdFpYTWdkR2hsSUhaaGJIVmxJSGx2ZFNCM1lXNTBJSFJ2SUhCeWIzQmhaMkYwWlNCMGJ5QmhJR1J2ZDI1emRISmxZVzBnY0hKdmJXbHpaU0JqWVc0Z2IyNXNlU0JpWlZ4dUlDQnlaWFJ5YVdWMlpXUWdZWE41Ym1Ob2NtOXViM1Z6YkhrdUlGUm9hWE1nWTJGdUlHSmxJR0ZqYUdsbGRtVmtJR0o1SUhKbGRIVnlibWx1WnlCaElIQnliMjFwYzJVZ2FXNGdkR2hsWEc0Z0lHWjFiR1pwYkd4dFpXNTBJRzl5SUhKbGFtVmpkR2x2YmlCb1lXNWtiR1Z5TGlCVWFHVWdaRzkzYm5OMGNtVmhiU0J3Y205dGFYTmxJSGRwYkd3Z2RHaGxiaUJpWlNCd1pXNWthVzVuWEc0Z0lIVnVkR2xzSUhSb1pTQnlaWFIxY201bFpDQndjbTl0YVhObElHbHpJSE5sZEhSc1pXUXVJRlJvYVhNZ2FYTWdZMkZzYkdWa0lDcGhjM05wYldsc1lYUnBiMjRxTGx4dUlDQWdZR0JnYW5OY2JpQWdabWx1WkZWelpYSW9LUzUwYUdWdUtHWjFibU4wYVc5dUlDaDFjMlZ5S1NCN1hHNGdJQ0FnY21WMGRYSnVJR1pwYm1SRGIyMXRaVzUwYzBKNVFYVjBhRzl5S0hWelpYSXBPMXh1SUNCOUtTNTBhR1Z1S0daMWJtTjBhVzl1SUNoamIyMXRaVzUwY3lrZ2UxeHVJQ0FnSUM4dklGUm9aU0IxYzJWeUozTWdZMjl0YldWdWRITWdZWEpsSUc1dmR5QmhkbUZwYkdGaWJHVmNiaUFnZlNrN1hHNGdJR0JnWUZ4dUlDQWdTV1lnZEdobElHRnpjMmx0YkdsaGRHVmtJSEJ5YjIxcGMyVWdjbVZxWldOMGN5d2dkR2hsYmlCMGFHVWdaRzkzYm5OMGNtVmhiU0J3Y205dGFYTmxJSGRwYkd3Z1lXeHpieUJ5WldwbFkzUXVYRzRnSUNCZ1lHQnFjMXh1SUNCbWFXNWtWWE5sY2lncExuUm9aVzRvWm5WdVkzUnBiMjRnS0hWelpYSXBJSHRjYmlBZ0lDQnlaWFIxY200Z1ptbHVaRU52YlcxbGJuUnpRbmxCZFhSb2IzSW9kWE5sY2lrN1hHNGdJSDBwTG5Sb1pXNG9ablZ1WTNScGIyNGdLR052YlcxbGJuUnpLU0I3WEc0Z0lDQWdMeThnU1dZZ1lHWnBibVJEYjIxdFpXNTBjMEo1UVhWMGFHOXlZQ0JtZFd4bWFXeHNjeXdnZDJVbmJHd2dhR0YyWlNCMGFHVWdkbUZzZFdVZ2FHVnlaVnh1SUNCOUxDQm1kVzVqZEdsdmJpQW9jbVZoYzI5dUtTQjdYRzRnSUNBZ0x5OGdTV1lnWUdacGJtUkRiMjF0Wlc1MGMwSjVRWFYwYUc5eVlDQnlaV3BsWTNSekxDQjNaU2RzYkNCb1lYWmxJSFJvWlNCeVpXRnpiMjRnYUdWeVpWeHVJQ0I5S1R0Y2JpQWdZR0JnWEc0Z0lDQlRhVzF3YkdVZ1JYaGhiWEJzWlZ4dUlDQXRMUzB0TFMwdExTMHRMUzB0TFZ4dUlDQWdVM2x1WTJoeWIyNXZkWE1nUlhoaGJYQnNaVnh1SUNBZ1lHQmdhbUYyWVhOamNtbHdkRnh1SUNCc1pYUWdjbVZ6ZFd4ME8xeHVJQ0FnZEhKNUlIdGNiaUFnSUNCeVpYTjFiSFFnUFNCbWFXNWtVbVZ6ZFd4MEtDazdYRzRnSUNBZ0x5OGdjM1ZqWTJWemMxeHVJQ0I5SUdOaGRHTm9LSEpsWVhOdmJpa2dlMXh1SUNBZ0lDOHZJR1poYVd4MWNtVmNiaUFnZlZ4dUlDQmdZR0JjYmlBZ0lFVnljbUpoWTJzZ1JYaGhiWEJzWlZ4dUlDQWdZR0JnYW5OY2JpQWdabWx1WkZKbGMzVnNkQ2htZFc1amRHbHZiaWh5WlhOMWJIUXNJR1Z5Y2lsN1hHNGdJQ0FnYVdZZ0tHVnljaWtnZTF4dUlDQWdJQ0FnTHk4Z1ptRnBiSFZ5WlZ4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQXZMeUJ6ZFdOalpYTnpYRzRnSUNBZ2ZWeHVJQ0I5S1R0Y2JpQWdZR0JnWEc0Z0lDQlFjbTl0YVhObElFVjRZVzF3YkdVN1hHNGdJQ0JnWUdCcVlYWmhjMk55YVhCMFhHNGdJR1pwYm1SU1pYTjFiSFFvS1M1MGFHVnVLR1oxYm1OMGFXOXVLSEpsYzNWc2RDbDdYRzRnSUNBZ0x5OGdjM1ZqWTJWemMxeHVJQ0I5TENCbWRXNWpkR2x2YmloeVpXRnpiMjRwZTF4dUlDQWdJQzh2SUdaaGFXeDFjbVZjYmlBZ2ZTazdYRzRnSUdCZ1lGeHVJQ0FnUVdSMllXNWpaV1FnUlhoaGJYQnNaVnh1SUNBdExTMHRMUzB0TFMwdExTMHRMVnh1SUNBZ1UzbHVZMmh5YjI1dmRYTWdSWGhoYlhCc1pWeHVJQ0FnWUdCZ2FtRjJZWE5qY21sd2RGeHVJQ0JzWlhRZ1lYVjBhRzl5TENCaWIyOXJjenRjYmlBZ0lIUnllU0I3WEc0Z0lDQWdZWFYwYUc5eUlEMGdabWx1WkVGMWRHaHZjaWdwTzF4dUlDQWdJR0p2YjJ0eklDQTlJR1pwYm1SQ2IyOXJjMEo1UVhWMGFHOXlLR0YxZEdodmNpazdYRzRnSUNBZ0x5OGdjM1ZqWTJWemMxeHVJQ0I5SUdOaGRHTm9LSEpsWVhOdmJpa2dlMXh1SUNBZ0lDOHZJR1poYVd4MWNtVmNiaUFnZlZ4dUlDQmdZR0JjYmlBZ0lFVnljbUpoWTJzZ1JYaGhiWEJzWlZ4dUlDQWdZR0JnYW5OY2JpQWdJR1oxYm1OMGFXOXVJR1p2ZFc1a1FtOXZhM01vWW05dmEzTXBJSHRjYmlBZ0lIMWNiaUFnSUdaMWJtTjBhVzl1SUdaaGFXeDFjbVVvY21WaGMyOXVLU0I3WEc0Z0lDQjlYRzRnSUNCbWFXNWtRWFYwYUc5eUtHWjFibU4wYVc5dUtHRjFkR2h2Y2l3Z1pYSnlLWHRjYmlBZ0lDQnBaaUFvWlhKeUtTQjdYRzRnSUNBZ0lDQm1ZV2xzZFhKbEtHVnljaWs3WEc0Z0lDQWdJQ0F2THlCbVlXbHNkWEpsWEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lIUnllU0I3WEc0Z0lDQWdJQ0FnSUdacGJtUkNiMjl2YTNOQ2VVRjFkR2h2Y2loaGRYUm9iM0lzSUdaMWJtTjBhVzl1S0dKdmIydHpMQ0JsY25JcElIdGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb1pYSnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1ZV2xzZFhKbEtHVnljaWs3WEc0Z0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdadmRXNWtRbTl2YTNNb1ltOXZhM01wTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JqWVhSamFDaHlaV0Z6YjI0cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1ptRnBiSFZ5WlNoeVpXRnpiMjRwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQjlJR05oZEdOb0tHVnljbTl5S1NCN1hHNGdJQ0FnSUNBZ0lHWmhhV3gxY21Vb1pYSnlLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJQzh2SUhOMVkyTmxjM05jYmlBZ0lDQjlYRzRnSUgwcE8xeHVJQ0JnWUdCY2JpQWdJRkJ5YjIxcGMyVWdSWGhoYlhCc1pUdGNiaUFnSUdCZ1lHcGhkbUZ6WTNKcGNIUmNiaUFnWm1sdVpFRjFkR2h2Y2lncExseHVJQ0FnSUhSb1pXNG9abWx1WkVKdmIydHpRbmxCZFhSb2IzSXBMbHh1SUNBZ0lIUm9aVzRvWm5WdVkzUnBiMjRvWW05dmEzTXBlMXh1SUNBZ0lDQWdMeThnWm05MWJtUWdZbTl2YTNOY2JpQWdmU2t1WTJGMFkyZ29ablZ1WTNScGIyNG9jbVZoYzI5dUtYdGNiaUFnSUNBdkx5QnpiMjFsZEdocGJtY2dkMlZ1ZENCM2NtOXVaMXh1SUNCOUtUdGNiaUFnWUdCZ1hHNGdJQ0JBYldWMGFHOWtJSFJvWlc1Y2JpQWdRSEJoY21GdElIdEdkVzVqZEdsdmJuMGdiMjVHZFd4bWFXeHNaV1JjYmlBZ1FIQmhjbUZ0SUh0R2RXNWpkR2x2Ym4wZ2IyNVNaV3BsWTNSbFpGeHVJQ0JWYzJWbWRXd2dabTl5SUhSdmIyeHBibWN1WEc0Z0lFQnlaWFIxY200Z2UxQnliMjFwYzJWOVhHNGdJQ292WEc1Y2JpQWdMeW9xWEc0Z0lHQmpZWFJqYUdBZ2FYTWdjMmx0Y0d4NUlITjFaMkZ5SUdadmNpQmdkR2hsYmloMWJtUmxabWx1WldRc0lHOXVVbVZxWldOMGFXOXVLV0FnZDJocFkyZ2diV0ZyWlhNZ2FYUWdkR2hsSUhOaGJXVmNiaUFnWVhNZ2RHaGxJR05oZEdOb0lHSnNiMk5ySUc5bUlHRWdkSEo1TDJOaGRHTm9JSE4wWVhSbGJXVnVkQzVjYmlBZ1lHQmdhbk5jYmlBZ1puVnVZM1JwYjI0Z1ptbHVaRUYxZEdodmNpZ3BlMXh1SUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjJOdmRXeGtiaWQwSUdacGJtUWdkR2hoZENCaGRYUm9iM0luS1R0Y2JpQWdmVnh1SUNBdkx5QnplVzVqYUhKdmJtOTFjMXh1SUNCMGNua2dlMXh1SUNCbWFXNWtRWFYwYUc5eUtDazdYRzRnSUgwZ1kyRjBZMmdvY21WaGMyOXVLU0I3WEc0Z0lDOHZJSE52YldWMGFHbHVaeUIzWlc1MElIZHliMjVuWEc0Z0lIMWNiaUFnTHk4Z1lYTjVibU1nZDJsMGFDQndjbTl0YVhObGMxeHVJQ0JtYVc1a1FYVjBhRzl5S0NrdVkyRjBZMmdvWm5WdVkzUnBiMjRvY21WaGMyOXVLWHRjYmlBZ0x5OGdjMjl0WlhSb2FXNW5JSGRsYm5RZ2QzSnZibWRjYmlBZ2ZTazdYRzRnSUdCZ1lGeHVJQ0JBYldWMGFHOWtJR05oZEdOb1hHNGdJRUJ3WVhKaGJTQjdSblZ1WTNScGIyNTlJRzl1VW1WcVpXTjBhVzl1WEc0Z0lGVnpaV1oxYkNCbWIzSWdkRzl2YkdsdVp5NWNiaUFnUUhKbGRIVnliaUI3VUhKdmJXbHpaWDFjYmlBZ0tpOWNibHh1WEc0Z0lGQnliMjFwYzJVdWNISnZkRzkwZVhCbExtTmhkR05vSUQwZ1puVnVZM1JwYjI0Z1gyTmhkR05vS0c5dVVtVnFaV04wYVc5dUtTQjdYRzRnSUNBZ2NtVjBkWEp1SUhSb2FYTXVkR2hsYmlodWRXeHNMQ0J2YmxKbGFtVmpkR2x2YmlrN1hHNGdJSDA3WEc1Y2JpQWdMeW9xWEc0Z0lDQWdZR1pwYm1Gc2JIbGdJSGRwYkd3Z1ltVWdhVzUyYjJ0bFpDQnlaV2RoY21Sc1pYTnpJRzltSUhSb1pTQndjbTl0YVhObEozTWdabUYwWlNCcWRYTjBJR0Z6SUc1aGRHbDJaVnh1SUNBZ0lIUnllUzlqWVhSamFDOW1hVzVoYkd4NUlHSmxhR0YyWlhOY2JpQWdYRzRnSUNBZ1UzbHVZMmh5YjI1dmRYTWdaWGhoYlhCc1pUcGNiaUFnWEc0Z0lDQWdZR0JnYW5OY2JpQWdJQ0JtYVc1a1FYVjBhRzl5S0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLRTFoZEdndWNtRnVaRzl0S0NrZ1BpQXdMalVwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCeVpYUjFjbTRnYm1WM0lFRjFkR2h2Y2lncE8xeHVJQ0FnSUgxY2JpQWdYRzRnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQm1hVzVrUVhWMGFHOXlLQ2s3SUM4dklITjFZMk5sWldRZ2IzSWdabUZwYkZ4dUlDQWdJSDBnWTJGMFkyZ29aWEp5YjNJcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbWFXNWtUM1JvWlhKQmRYUm9aWElvS1R0Y2JpQWdJQ0I5SUdacGJtRnNiSGtnZTF4dUlDQWdJQ0FnTHk4Z1lXeDNZWGx6SUhKMWJuTmNiaUFnSUNBZ0lDOHZJR1J2WlhOdUozUWdZV1ptWldOMElIUm9aU0J5WlhSMWNtNGdkbUZzZFdWY2JpQWdJQ0I5WEc0Z0lDQWdZR0JnWEc0Z0lGeHVJQ0FnSUVGemVXNWphSEp2Ym05MWN5QmxlR0Z0Y0d4bE9seHVJQ0JjYmlBZ0lDQmdZR0JxYzF4dUlDQWdJR1pwYm1SQmRYUm9iM0lvS1M1allYUmphQ2htZFc1amRHbHZiaWh5WldGemIyNHBlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWnBibVJQZEdobGNrRjFkR2hsY2lncE8xeHVJQ0FnSUgwcExtWnBibUZzYkhrb1puVnVZM1JwYjI0b0tYdGNiaUFnSUNBZ0lDOHZJR0YxZEdodmNpQjNZWE1nWldsMGFHVnlJR1p2ZFc1a0xDQnZjaUJ1YjNSY2JpQWdJQ0I5S1R0Y2JpQWdJQ0JnWUdCY2JpQWdYRzRnSUNBZ1FHMWxkR2h2WkNCbWFXNWhiR3g1WEc0Z0lDQWdRSEJoY21GdElIdEdkVzVqZEdsdmJuMGdZMkZzYkdKaFkydGNiaUFnSUNCQWNtVjBkWEp1SUh0UWNtOXRhWE5sZlZ4dUlDQXFMMXh1WEc1Y2JpQWdVSEp2YldselpTNXdjbTkwYjNSNWNHVXVabWx1WVd4c2VTQTlJR1oxYm1OMGFXOXVJRjltYVc1aGJHeDVLR05oYkd4aVlXTnJLU0I3WEc0Z0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNCMGFHbHpPMXh1SUNBZ0lIWmhjaUJqYjI1emRISjFZM1J2Y2lBOUlIQnliMjFwYzJVdVkyOXVjM1J5ZFdOMGIzSTdYRzVjYmlBZ0lDQnBaaUFvYVhOR2RXNWpkR2x2YmloallXeHNZbUZqYXlrcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCd2NtOXRhWE5sTG5Sb1pXNG9ablZ1WTNScGIyNGdLSFpoYkhWbEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmpiMjV6ZEhKMVkzUnZjaTV5WlhOdmJIWmxLR05oYkd4aVlXTnJLQ2twTG5Sb1pXNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCMllXeDFaVHRjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOUxDQm1kVzVqZEdsdmJpQW9jbVZoYzI5dUtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmpiMjV6ZEhKMVkzUnZjaTV5WlhOdmJIWmxLR05oYkd4aVlXTnJLQ2twTG5Sb1pXNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUhKbFlYTnZianRjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpYUjFjbTRnY0hKdmJXbHpaUzUwYUdWdUtHTmhiR3hpWVdOckxDQmpZV3hzWW1GamF5azdYRzRnSUgwN1hHNWNiaUFnY21WMGRYSnVJRkJ5YjIxcGMyVTdYRzU5S0NrN1hHNWNibEJ5YjIxcGMyVWtNUzV3Y205MGIzUjVjR1V1ZEdobGJpQTlJSFJvWlc0N1hHNVFjbTl0YVhObEpERXVZV3hzSUQwZ1lXeHNPMXh1VUhKdmJXbHpaU1F4TG5KaFkyVWdQU0J5WVdObE8xeHVVSEp2YldselpTUXhMbkpsYzI5c2RtVWdQU0J5WlhOdmJIWmxKREU3WEc1UWNtOXRhWE5sSkRFdWNtVnFaV04wSUQwZ2NtVnFaV04wSkRFN1hHNVFjbTl0YVhObEpERXVYM05sZEZOamFHVmtkV3hsY2lBOUlITmxkRk5qYUdWa2RXeGxjanRjYmxCeWIyMXBjMlVrTVM1ZmMyVjBRWE5oY0NBOUlITmxkRUZ6WVhBN1hHNVFjbTl0YVhObEpERXVYMkZ6WVhBZ1BTQmhjMkZ3TzF4dVhHNHZLbWRzYjJKaGJDQnpaV3htS2k5Y2JtWjFibU4wYVc5dUlIQnZiSGxtYVd4c0tDa2dlMXh1SUNCMllYSWdiRzlqWVd3Z1BTQjJiMmxrSURBN1hHNWNiaUFnYVdZZ0tIUjVjR1Z2WmlCbmJHOWlZV3dnSVQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdiRzlqWVd3Z1BTQm5iRzlpWVd3N1hHNGdJSDBnWld4elpTQnBaaUFvZEhsd1pXOW1JSE5sYkdZZ0lUMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnYkc5allXd2dQU0J6Wld4bU8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lIUnllU0I3WEc0Z0lDQWdJQ0JzYjJOaGJDQTlJRVoxYm1OMGFXOXVLQ2R5WlhSMWNtNGdkR2hwY3ljcEtDazdYRzRnSUNBZ2ZTQmpZWFJqYUNBb1pTa2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZHdiMng1Wm1sc2JDQm1ZV2xzWldRZ1ltVmpZWFZ6WlNCbmJHOWlZV3dnYjJKcVpXTjBJR2x6SUhWdVlYWmhhV3hoWW14bElHbHVJSFJvYVhNZ1pXNTJhWEp2Ym0xbGJuUW5LVHRjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0IyWVhJZ1VDQTlJR3h2WTJGc0xsQnliMjFwYzJVN1hHNWNiaUFnYVdZZ0tGQXBJSHRjYmlBZ0lDQjJZWElnY0hKdmJXbHpaVlJ2VTNSeWFXNW5JRDBnYm5Wc2JEdGNiaUFnSUNCMGNua2dlMXh1SUNBZ0lDQWdjSEp2YldselpWUnZVM1J5YVc1bklEMGdUMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp5NWpZV3hzS0ZBdWNtVnpiMngyWlNncEtUdGNiaUFnSUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ0lDQXZMeUJ6YVd4bGJuUnNlU0JwWjI1dmNtVmtYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXWWdLSEJ5YjIxcGMyVlViMU4wY21sdVp5QTlQVDBnSjF0dlltcGxZM1FnVUhKdmJXbHpaVjBuSUNZbUlDRlFMbU5oYzNRcElIdGNiaUFnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNCc2IyTmhiQzVRY205dGFYTmxJRDBnVUhKdmJXbHpaU1F4TzF4dWZWeHVYRzR2THlCVGRISmhibWRsSUdOdmJYQmhkQzR1WEc1UWNtOXRhWE5sSkRFdWNHOXNlV1pwYkd3Z1BTQndiMng1Wm1sc2JEdGNibEJ5YjIxcGMyVWtNUzVRY205dGFYTmxJRDBnVUhKdmJXbHpaU1F4TzF4dVhHNXlaWFIxY200Z1VISnZiV2x6WlNReE8xeHVYRzU5S1NrcE8xeHVYRzVjYmx4dUx5OGpJSE52ZFhKalpVMWhjSEJwYm1kVlVrdzlaWE0yTFhCeWIyMXBjMlV1YldGd1hHNGlMQ0l2THlCMGFHVWdkMmhoZEhkbkxXWmxkR05vSUhCdmJIbG1hV3hzSUdsdWMzUmhiR3h6SUhSb1pTQm1aWFJqYUNncElHWjFibU4wYVc5dVhHNHZMeUJ2YmlCMGFHVWdaMnh2WW1Gc0lHOWlhbVZqZENBb2QybHVaRzkzSUc5eUlITmxiR1lwWEc0dkwxeHVMeThnVW1WMGRYSnVJSFJvWVhRZ1lYTWdkR2hsSUdWNGNHOXlkQ0JtYjNJZ2RYTmxJR2x1SUZkbFluQmhZMnNzSUVKeWIzZHpaWEpwWm5rZ1pYUmpMbHh1Y21WeGRXbHlaU2duZDJoaGRIZG5MV1psZEdOb0p5azdYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJSE5sYkdZdVptVjBZMmd1WW1sdVpDaHpaV3htS1R0Y2JpSXNJaWhtZFc1amRHbHZiaUFvY205dmRDd2dabUZqZEc5eWVTbDdYRzRnSUNkMWMyVWdjM1J5YVdOMEp6dGNibHh1SUNBdkttbHpkR0Z1WW5Wc0lHbG5ibTl5WlNCdVpYaDBPbU5oYm5RZ2RHVnpkQ292WEc0Z0lHbG1JQ2gwZVhCbGIyWWdiVzlrZFd4bElEMDlQU0FuYjJKcVpXTjBKeUFtSmlCMGVYQmxiMllnYlc5a2RXeGxMbVY0Y0c5eWRITWdQVDA5SUNkdlltcGxZM1FuS1NCN1hHNGdJQ0FnYlc5a2RXeGxMbVY0Y0c5eWRITWdQU0JtWVdOMGIzSjVLQ2s3WEc0Z0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlHUmxabWx1WlNBOVBUMGdKMloxYm1OMGFXOXVKeUFtSmlCa1pXWnBibVV1WVcxa0tTQjdYRzRnSUNBZ0x5OGdRVTFFTGlCU1pXZHBjM1JsY2lCaGN5QmhiaUJoYm05dWVXMXZkWE1nYlc5a2RXeGxMbHh1SUNBZ0lHUmxabWx1WlNoYlhTd2dabUZqZEc5eWVTazdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdMeThnUW5KdmQzTmxjaUJuYkc5aVlXeHpYRzRnSUNBZ2NtOXZkQzV2WW1wbFkzUlFZWFJvSUQwZ1ptRmpkRzl5ZVNncE8xeHVJQ0I5WEc1OUtTaDBhR2x6TENCbWRXNWpkR2x2YmlncGUxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNWNiaUFnZG1GeUlIUnZVM1J5SUQwZ1QySnFaV04wTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1Wnp0Y2JpQWdablZ1WTNScGIyNGdhR0Z6VDNkdVVISnZjR1Z5ZEhrb2IySnFMQ0J3Y205d0tTQjdYRzRnSUNBZ2FXWW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpWeHVJQ0FnSUgxY2JpQWdJQ0F2TDNSdklHaGhibVJzWlNCdlltcGxZM1J6SUhkcGRHZ2diblZzYkNCd2NtOTBiM1I1Y0dWeklDaDBiMjhnWldSblpTQmpZWE5sUHlsY2JpQWdJQ0J5WlhSMWNtNGdUMkpxWldOMExuQnliM1J2ZEhsd1pTNW9ZWE5QZDI1UWNtOXdaWEowZVM1allXeHNLRzlpYWl3Z2NISnZjQ2xjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdselJXMXdkSGtvZG1Gc2RXVXBlMXh1SUNBZ0lHbG1JQ2doZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvYVhOQmNuSmhlU2gyWVd4MVpTa2dKaVlnZG1Gc2RXVXViR1Z1WjNSb0lEMDlQU0F3S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlIWmhiSFZsSUNFOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0JtYjNJZ0tIWmhjaUJwSUdsdUlIWmhiSFZsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2FHRnpUM2R1VUhKdmNHVnlkSGtvZG1Gc2RXVXNJR2twS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCMGIxTjBjbWx1WnloMGVYQmxLWHRjYmlBZ0lDQnlaWFIxY200Z2RHOVRkSEl1WTJGc2JDaDBlWEJsS1R0Y2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHbHpUMkpxWldOMEtHOWlhaWw3WEc0Z0lDQWdjbVYwZFhKdUlIUjVjR1Z2WmlCdlltb2dQVDA5SUNkdlltcGxZM1FuSUNZbUlIUnZVM1J5YVc1bktHOWlhaWtnUFQwOUlGd2lXMjlpYW1WamRDQlBZbXBsWTNSZFhDSTdYRzRnSUgxY2JseHVJQ0IyWVhJZ2FYTkJjbkpoZVNBOUlFRnljbUY1TG1selFYSnlZWGtnZkh3Z1puVnVZM1JwYjI0b2IySnFLWHRjYmlBZ0lDQXZLbWx6ZEdGdVluVnNJR2xuYm05eVpTQnVaWGgwT21OaGJuUWdkR1Z6ZENvdlhHNGdJQ0FnY21WMGRYSnVJSFJ2VTNSeUxtTmhiR3dvYjJKcUtTQTlQVDBnSjF0dlltcGxZM1FnUVhKeVlYbGRKenRjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdselFtOXZiR1ZoYmlodlltb3BlMXh1SUNBZ0lISmxkSFZ5YmlCMGVYQmxiMllnYjJKcUlEMDlQU0FuWW05dmJHVmhiaWNnZkh3Z2RHOVRkSEpwYm1jb2IySnFLU0E5UFQwZ0oxdHZZbXBsWTNRZ1FtOXZiR1ZoYmwwbk8xeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdaMlYwUzJWNUtHdGxlU2w3WEc0Z0lDQWdkbUZ5SUdsdWRFdGxlU0E5SUhCaGNuTmxTVzUwS0d0bGVTazdYRzRnSUNBZ2FXWWdLR2x1ZEV0bGVTNTBiMU4wY21sdVp5Z3BJRDA5UFNCclpYa3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnBiblJMWlhrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnJaWGs3WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCbVlXTjBiM0o1S0c5d2RHbHZibk1wSUh0Y2JpQWdJQ0J2Y0hScGIyNXpJRDBnYjNCMGFXOXVjeUI4ZkNCN2ZWeHVYRzRnSUNBZ2RtRnlJRzlpYW1WamRGQmhkR2dnUFNCbWRXNWpkR2x2Ymlodlltb3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQlBZbXBsWTNRdWEyVjVjeWh2WW1wbFkzUlFZWFJvS1M1eVpXUjFZMlVvWm5WdVkzUnBiMjRvY0hKdmVIa3NJSEJ5YjNBcElIdGNiaUFnSUNBZ0lDQWdhV1lvY0hKdmNDQTlQVDBnSjJOeVpXRjBaU2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2NISnZlSGs3WEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQXZLbWx6ZEdGdVluVnNJR2xuYm05eVpTQmxiSE5sS2k5Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnZZbXBsWTNSUVlYUm9XM0J5YjNCZElEMDlQU0FuWm5WdVkzUnBiMjRuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjSEp2ZUhsYmNISnZjRjBnUFNCdlltcGxZM1JRWVhSb1czQnliM0JkTG1KcGJtUW9iMkpxWldOMFVHRjBhQ3dnYjJKcUtUdGNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ3Y205NGVUdGNiaUFnSUNBZ0lIMHNJSHQ5S1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnWm5WdVkzUnBiMjRnYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUNodmNIUnBiMjV6TG1sdVkyeDFaR1ZKYm1obGNtbDBaV1JRY205d2N5QjhmQ0FvZEhsd1pXOW1JSEJ5YjNBZ1BUMDlJQ2R1ZFcxaVpYSW5JQ1ltSUVGeWNtRjVMbWx6UVhKeVlYa29iMkpxS1NrZ2ZId2dhR0Z6VDNkdVVISnZjR1Z5ZEhrb2IySnFMQ0J3Y205d0tTbGNiaUFnSUNCOVhHNWNiaUFnSUNCbWRXNWpkR2x2YmlCblpYUlRhR0ZzYkc5M1VISnZjR1Z5ZEhrb2IySnFMQ0J3Y205d0tTQjdYRzRnSUNBZ0lDQnBaaUFvYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0c5aWFpd2djSEp2Y0NrcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhbHR3Y205d1hUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCbWRXNWpkR2x2YmlCelpYUW9iMkpxTENCd1lYUm9MQ0IyWVd4MVpTd2daRzlPYjNSU1pYQnNZV05sS1h0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0E5UFQwZ0oyNTFiV0psY2ljcElIdGNiaUFnSUNBZ0lDQWdjR0YwYUNBOUlGdHdZWFJvWFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDZ2hjR0YwYUNCOGZDQndZWFJvTG14bGJtZDBhQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdiMkpxTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCd1lYUm9JRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MyVjBLRzlpYWl3Z2NHRjBhQzV6Y0d4cGRDZ25MaWNwTG0xaGNDaG5aWFJMWlhrcExDQjJZV3gxWlN3Z1pHOU9iM1JTWlhCc1lXTmxLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwVUdGMGFDQTlJSEJoZEdoYk1GMDdYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRlpoYkhWbElEMGdaMlYwVTJoaGJHeHZkMUJ5YjNCbGNuUjVLRzlpYWl3Z1kzVnljbVZ1ZEZCaGRHZ3BPMXh1SUNBZ0lDQWdhV1lnS0hCaGRHZ3ViR1Z1WjNSb0lEMDlQU0F4S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hqZFhKeVpXNTBWbUZzZFdVZ1BUMDlJSFp2YVdRZ01DQjhmQ0FoWkc5T2IzUlNaWEJzWVdObEtTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcVcyTjFjbkpsYm5SUVlYUm9YU0E5SUhaaGJIVmxPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJqZFhKeVpXNTBWbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2hqZFhKeVpXNTBWbUZzZFdVZ1BUMDlJSFp2YVdRZ01Da2dlMXh1SUNBZ0lDQWdJQ0F2TDJOb1pXTnJJR2xtSUhkbElHRnpjM1Z0WlNCaGJpQmhjbkpoZVZ4dUlDQWdJQ0FnSUNCcFppaDBlWEJsYjJZZ2NHRjBhRnN4WFNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnSUNCdlltcGJZM1Z5Y21WdWRGQmhkR2hkSUQwZ1cxMDdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnYjJKcVcyTjFjbkpsYm5SUVlYUm9YU0E5SUh0OU8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnpaWFFvYjJKcVcyTjFjbkpsYm5SUVlYUm9YU3dnY0dGMGFDNXpiR2xqWlNneEtTd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVvWVhNZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9LU0I3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhCaGRHZ2dQVDA5SUNkdWRXMWlaWEluS1NCN1hHNGdJQ0FnSUNBZ0lIQmhkR2dnUFNCYmNHRjBhRjA3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUJ3WVhSb0lEMDlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCd1lYUm9JRDBnY0dGMGFDNXpjR3hwZENnbkxpY3BPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb0lYQmhkR2dnZkh3Z2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlDRWhiMkpxTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElIQmhkR2d1YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdvZ1BTQm5aWFJMWlhrb2NHRjBhRnRwWFNrN1hHNWNiaUFnSUNBZ0lDQWdhV1lvS0hSNWNHVnZaaUJxSUQwOVBTQW5iblZ0WW1WeUp5QW1KaUJwYzBGeWNtRjVLRzlpYWlrZ0ppWWdhaUE4SUc5aWFpNXNaVzVuZEdncElIeDhYRzRnSUNBZ0lDQWdJQ0FnS0c5d2RHbHZibk11YVc1amJIVmtaVWx1YUdWeWFYUmxaRkJ5YjNCeklEOGdLR29nYVc0Z1QySnFaV04wS0c5aWFpa3BJRG9nYUdGelQzZHVVSEp2Y0dWeWRIa29iMkpxTENCcUtTa3BJSHRjYmlBZ0lDQWdJQ0FnSUNCdlltb2dQU0J2WW1wYmFsMDdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0J2WW1wbFkzUlFZWFJvTG1WdWMzVnlaVVY0YVhOMGN5QTlJR1oxYm1OMGFXOXVJQ2h2WW1vc0lIQmhkR2dzSUhaaGJIVmxLWHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnpaWFFvYjJKcUxDQndZWFJvTENCMllXeDFaU3dnZEhKMVpTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VjMlYwSUQwZ1puVnVZM1JwYjI0Z0tHOWlhaXdnY0dGMGFDd2dkbUZzZFdVc0lHUnZUbTkwVW1Wd2JHRmpaU2w3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjMlYwS0c5aWFpd2djR0YwYUN3Z2RtRnNkV1VzSUdSdlRtOTBVbVZ3YkdGalpTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VhVzV6WlhKMElEMGdablZ1WTNScGIyNGdLRzlpYWl3Z2NHRjBhQ3dnZG1Gc2RXVXNJR0YwS1h0Y2JpQWdJQ0FnSUhaaGNpQmhjbklnUFNCdlltcGxZM1JRWVhSb0xtZGxkQ2h2WW1vc0lIQmhkR2dwTzF4dUlDQWdJQ0FnWVhRZ1BTQitmbUYwTzF4dUlDQWdJQ0FnYVdZZ0tDRnBjMEZ5Y21GNUtHRnljaWtwSUh0Y2JpQWdJQ0FnSUNBZ1lYSnlJRDBnVzEwN1hHNGdJQ0FnSUNBZ0lHOWlhbVZqZEZCaGRHZ3VjMlYwS0c5aWFpd2djR0YwYUN3Z1lYSnlLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR0Z5Y2k1emNHeHBZMlVvWVhRc0lEQXNJSFpoYkhWbEtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ2IySnFaV04wVUdGMGFDNWxiWEIwZVNBOUlHWjFibU4wYVc5dUtHOWlhaXdnY0dGMGFDa2dlMXh1SUNBZ0lDQWdhV1lnS0dselJXMXdkSGtvY0dGMGFDa3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFp2YVdRZ01EdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2h2WW1vZ1BUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RtOXBaQ0F3TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCMllYSWdkbUZzZFdVc0lHazdYRzRnSUNBZ0lDQnBaaUFvSVNoMllXeDFaU0E5SUc5aWFtVmpkRkJoZEdndVoyVjBLRzlpYWl3Z2NHRjBhQ2twS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMmIybGtJREE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2RtRnNkV1VnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lDY25LVHRjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvYVhOQ2IyOXNaV0Z1S0haaGJIVmxLU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1elpYUW9iMkpxTENCd1lYUm9MQ0JtWVd4elpTazdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFI1Y0dWdlppQjJZV3gxWlNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1YzJWMEtHOWlhaXdnY0dGMGFDd2dNQ2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dselFYSnlZWGtvZG1Gc2RXVXBLU0I3WEc0Z0lDQWdJQ0FnSUhaaGJIVmxMbXhsYm1kMGFDQTlJREE3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0dselQySnFaV04wS0haaGJIVmxLU2tnZTF4dUlDQWdJQ0FnSUNCbWIzSWdLR2tnYVc0Z2RtRnNkV1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnBaaUFvYUdGelUyaGhiR3h2ZDFCeWIzQmxjblI1S0haaGJIVmxMQ0JwS1NrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWkdWc1pYUmxJSFpoYkhWbFcybGRPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdndWMyVjBLRzlpYWl3Z2NHRjBhQ3dnYm5Wc2JDazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lHOWlhbVZqZEZCaGRHZ3VjSFZ6YUNBOUlHWjFibU4wYVc5dUlDaHZZbW9zSUhCaGRHZ2dMeW9zSUhaaGJIVmxjeUFxTHlsN1hHNGdJQ0FnSUNCMllYSWdZWEp5SUQwZ2IySnFaV04wVUdGMGFDNW5aWFFvYjJKcUxDQndZWFJvS1R0Y2JpQWdJQ0FnSUdsbUlDZ2hhWE5CY25KaGVTaGhjbklwS1NCN1hHNGdJQ0FnSUNBZ0lHRnljaUE5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQnZZbXBsWTNSUVlYUm9Mbk5sZENodlltb3NJSEJoZEdnc0lHRnljaWs3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdGeWNpNXdkWE5vTG1Gd2NHeDVLR0Z5Y2l3Z1FYSnlZWGt1Y0hKdmRHOTBlWEJsTG5Oc2FXTmxMbU5oYkd3b1lYSm5kVzFsYm5SekxDQXlLU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJRzlpYW1WamRGQmhkR2d1WTI5aGJHVnpZMlVnUFNCbWRXNWpkR2x2YmlBb2IySnFMQ0J3WVhSb2N5d2daR1ZtWVhWc2RGWmhiSFZsS1NCN1hHNGdJQ0FnSUNCMllYSWdkbUZzZFdVN1hHNWNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3TENCc1pXNGdQU0J3WVhSb2N5NXNaVzVuZEdnN0lHa2dQQ0JzWlc0N0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNCcFppQW9LSFpoYkhWbElEMGdiMkpxWldOMFVHRjBhQzVuWlhRb2IySnFMQ0J3WVhSb2MxdHBYU2twSUNFOVBTQjJiMmxrSURBcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHUmxabUYxYkhSV1lXeDFaVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdiMkpxWldOMFVHRjBhQzVuWlhRZ1BTQm1kVzVqZEdsdmJpQW9iMkpxTENCd1lYUm9MQ0JrWldaaGRXeDBWbUZzZFdVcGUxeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQndZWFJvSUQwOVBTQW5iblZ0WW1WeUp5a2dlMXh1SUNBZ0lDQWdJQ0J3WVhSb0lEMGdXM0JoZEdoZE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLQ0Z3WVhSb0lIeDhJSEJoZEdndWJHVnVaM1JvSUQwOVBTQXdLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ2WW1vN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcFppQW9iMkpxSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptRjFiSFJXWVd4MVpUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WjJWMEtHOWlhaXdnY0dGMGFDNXpjR3hwZENnbkxpY3BMQ0JrWldaaGRXeDBWbUZzZFdVcE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRkJoZEdnZ1BTQm5aWFJMWlhrb2NHRjBhRnN3WFNrN1hHNGdJQ0FnSUNCMllYSWdibVY0ZEU5aWFpQTlJR2RsZEZOb1lXeHNiM2RRY205d1pYSjBlU2h2WW1vc0lHTjFjbkpsYm5SUVlYUm9LVnh1SUNBZ0lDQWdhV1lnS0c1bGVIUlBZbW9nUFQwOUlIWnZhV1FnTUNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1pHVm1ZWFZzZEZaaGJIVmxPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURFcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHNWxlSFJQWW1vN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCdlltcGxZM1JRWVhSb0xtZGxkQ2h2WW1wYlkzVnljbVZ1ZEZCaGRHaGRMQ0J3WVhSb0xuTnNhV05sS0RFcExDQmtaV1poZFd4MFZtRnNkV1VwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0J2WW1wbFkzUlFZWFJvTG1SbGJDQTlJR1oxYm1OMGFXOXVJR1JsYkNodlltb3NJSEJoZEdncElIdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBOVBUMGdKMjUxYldKbGNpY3BJSHRjYmlBZ0lDQWdJQ0FnY0dGMGFDQTlJRnR3WVhSb1hUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0c5aWFpQTlQU0J1ZFd4c0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnZZbW83WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaHBjMFZ0Y0hSNUtIQmhkR2dwS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnBaaWgwZVhCbGIyWWdjR0YwYUNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzlpYW1WamRGQmhkR2d1WkdWc0tHOWlhaXdnY0dGMGFDNXpjR3hwZENnbkxpY3BLVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SUVlYUm9JRDBnWjJWMFMyVjVLSEJoZEdoYk1GMHBPMXh1SUNBZ0lDQWdhV1lnS0NGb1lYTlRhR0ZzYkc5M1VISnZjR1Z5ZEhrb2IySnFMQ0JqZFhKeVpXNTBVR0YwYUNrcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHOWlhanRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZb2NHRjBhQzVzWlc1bmRHZ2dQVDA5SURFcElIdGNiaUFnSUNBZ0lDQWdhV1lnS0dselFYSnlZWGtvYjJKcUtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUc5aWFpNXpjR3hwWTJVb1kzVnljbVZ1ZEZCaGRHZ3NJREVwTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lHUmxiR1YwWlNCdlltcGJZM1Z5Y21WdWRGQmhkR2hkTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYjJKcVpXTjBVR0YwYUM1a1pXd29iMkpxVzJOMWNuSmxiblJRWVhSb1hTd2djR0YwYUM1emJHbGpaU2d4S1NrN1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCdlltbzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRkJoZEdnN1hHNGdJSDFjYmx4dUlDQjJZWElnYlc5a0lEMGdabUZqZEc5eWVTZ3BPMXh1SUNCdGIyUXVZM0psWVhSbElEMGdabUZqZEc5eWVUdGNiaUFnYlc5a0xuZHBkR2hKYm1obGNtbDBaV1JRY205d2N5QTlJR1poWTNSdmNua29lMmx1WTJ4MVpHVkpibWhsY21sMFpXUlFjbTl3Y3pvZ2RISjFaWDBwWEc0Z0lISmxkSFZ5YmlCdGIyUTdYRzU5S1R0Y2JpSXNJaTh2SUhOb2FXMGdabTl5SUhWemFXNW5JSEJ5YjJObGMzTWdhVzRnWW5KdmQzTmxjbHh1ZG1GeUlIQnliMk5sYzNNZ1BTQnRiMlIxYkdVdVpYaHdiM0owY3lBOUlIdDlPMXh1WEc0dkx5QmpZV05vWldRZ1puSnZiU0IzYUdGMFpYWmxjaUJuYkc5aVlXd2dhWE1nY0hKbGMyVnVkQ0J6YnlCMGFHRjBJSFJsYzNRZ2NuVnVibVZ5Y3lCMGFHRjBJSE4wZFdJZ2FYUmNiaTh2SUdSdmJpZDBJR0p5WldGcklIUm9hVzVuY3k0Z0lFSjFkQ0IzWlNCdVpXVmtJSFJ2SUhkeVlYQWdhWFFnYVc0Z1lTQjBjbmtnWTJGMFkyZ2dhVzRnWTJGelpTQnBkQ0JwYzF4dUx5OGdkM0poY0hCbFpDQnBiaUJ6ZEhKcFkzUWdiVzlrWlNCamIyUmxJSGRvYVdOb0lHUnZaWE51SjNRZ1pHVm1hVzVsSUdGdWVTQm5iRzlpWVd4ekxpQWdTWFFuY3lCcGJuTnBaR1VnWVZ4dUx5OGdablZ1WTNScGIyNGdZbVZqWVhWelpTQjBjbmt2WTJGMFkyaGxjeUJrWlc5d2RHbHRhWHBsSUdsdUlHTmxjblJoYVc0Z1pXNW5hVzVsY3k1Y2JseHVkbUZ5SUdOaFkyaGxaRk5sZEZScGJXVnZkWFE3WEc1MllYSWdZMkZqYUdWa1EyeGxZWEpVYVcxbGIzVjBPMXh1WEc1bWRXNWpkR2x2YmlCa1pXWmhkV3gwVTJWMFZHbHRiM1YwS0NrZ2UxeHVJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduYzJWMFZHbHRaVzkxZENCb1lYTWdibTkwSUdKbFpXNGdaR1ZtYVc1bFpDY3BPMXh1ZlZ4dVpuVnVZM1JwYjI0Z1pHVm1ZWFZzZEVOc1pXRnlWR2x0Wlc5MWRDQW9LU0I3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZGpiR1ZoY2xScGJXVnZkWFFnYUdGeklHNXZkQ0JpWldWdUlHUmxabWx1WldRbktUdGNibjFjYmlobWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCelpYUlVhVzFsYjNWMElEMDlQU0FuWm5WdVkzUnBiMjRuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVdOb1pXUlRaWFJVYVcxbGIzVjBJRDBnYzJWMFZHbHRaVzkxZER0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oWTJobFpGTmxkRlJwYldWdmRYUWdQU0JrWldaaGRXeDBVMlYwVkdsdGIzVjBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmU0JqWVhSamFDQW9aU2tnZTF4dUlDQWdJQ0FnSUNCallXTm9aV1JUWlhSVWFXMWxiM1YwSUQwZ1pHVm1ZWFZzZEZObGRGUnBiVzkxZER0Y2JpQWdJQ0I5WEc0Z0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQmpiR1ZoY2xScGJXVnZkWFFnUFQwOUlDZG1kVzVqZEdsdmJpY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhZMmhsWkVOc1pXRnlWR2x0Wlc5MWRDQTlJR05zWldGeVZHbHRaVzkxZER0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oWTJobFpFTnNaV0Z5VkdsdFpXOTFkQ0E5SUdSbFptRjFiSFJEYkdWaGNsUnBiV1Z2ZFhRN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ0lDQWdJR05oWTJobFpFTnNaV0Z5VkdsdFpXOTFkQ0E5SUdSbFptRjFiSFJEYkdWaGNsUnBiV1Z2ZFhRN1hHNGdJQ0FnZlZ4dWZTQW9LU2xjYm1aMWJtTjBhVzl1SUhKMWJsUnBiV1Z2ZFhRb1puVnVLU0I3WEc0Z0lDQWdhV1lnS0dOaFkyaGxaRk5sZEZScGJXVnZkWFFnUFQwOUlITmxkRlJwYldWdmRYUXBJSHRjYmlBZ0lDQWdJQ0FnTHk5dWIzSnRZV3dnWlc1MmFYSnZiV1Z1ZEhNZ2FXNGdjMkZ1WlNCemFYUjFZWFJwYjI1elhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCelpYUlVhVzFsYjNWMEtHWjFiaXdnTUNrN1hHNGdJQ0FnZlZ4dUlDQWdJQzh2SUdsbUlITmxkRlJwYldWdmRYUWdkMkZ6YmlkMElHRjJZV2xzWVdKc1pTQmlkWFFnZDJGeklHeGhkSFJsY2lCa1pXWnBibVZrWEc0Z0lDQWdhV1lnS0NoallXTm9aV1JUWlhSVWFXMWxiM1YwSUQwOVBTQmtaV1poZFd4MFUyVjBWR2x0YjNWMElIeDhJQ0ZqWVdOb1pXUlRaWFJVYVcxbGIzVjBLU0FtSmlCelpYUlVhVzFsYjNWMEtTQjdYRzRnSUNBZ0lDQWdJR05oWTJobFpGTmxkRlJwYldWdmRYUWdQU0J6WlhSVWFXMWxiM1YwTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzJWMFZHbHRaVzkxZENobWRXNHNJREFwTzF4dUlDQWdJSDFjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBdkx5QjNhR1Z1SUhkb1pXNGdjMjl0WldKdlpIa2dhR0Z6SUhOamNtVjNaV1FnZDJsMGFDQnpaWFJVYVcxbGIzVjBJR0oxZENCdWJ5QkpMa1V1SUcxaFpHUnVaWE56WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJqWVdOb1pXUlRaWFJVYVcxbGIzVjBLR1oxYml3Z01DazdYRzRnSUNBZ2ZTQmpZWFJqYUNobEtYdGNiaUFnSUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQzh2SUZkb1pXNGdkMlVnWVhKbElHbHVJRWt1UlM0Z1luVjBJSFJvWlNCelkzSnBjSFFnYUdGeklHSmxaVzRnWlhaaGJHVmtJSE52SUVrdVJTNGdaRzlsYzI0bmRDQjBjblZ6ZENCMGFHVWdaMnh2WW1Gc0lHOWlhbVZqZENCM2FHVnVJR05oYkd4bFpDQnViM0p0WVd4c2VWeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR05oWTJobFpGTmxkRlJwYldWdmRYUXVZMkZzYkNodWRXeHNMQ0JtZFc0c0lEQXBPMXh1SUNBZ0lDQWdJQ0I5SUdOaGRHTm9LR1VwZTF4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnYzJGdFpTQmhjeUJoWW05MlpTQmlkWFFnZDJobGJpQnBkQ2R6SUdFZ2RtVnljMmx2YmlCdlppQkpMa1V1SUhSb1lYUWdiWFZ6ZENCb1lYWmxJSFJvWlNCbmJHOWlZV3dnYjJKcVpXTjBJR1p2Y2lBbmRHaHBjeWNzSUdodmNHWjFiR3g1SUc5MWNpQmpiMjUwWlhoMElHTnZjbkpsWTNRZ2IzUm9aWEozYVhObElHbDBJSGRwYkd3Z2RHaHliM2NnWVNCbmJHOWlZV3dnWlhKeWIzSmNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJqWVdOb1pXUlRaWFJVYVcxbGIzVjBMbU5oYkd3b2RHaHBjeXdnWm5WdUxDQXdLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dVhHNTlYRzVtZFc1amRHbHZiaUJ5ZFc1RGJHVmhjbFJwYldWdmRYUW9iV0Z5YTJWeUtTQjdYRzRnSUNBZ2FXWWdLR05oWTJobFpFTnNaV0Z5VkdsdFpXOTFkQ0E5UFQwZ1kyeGxZWEpVYVcxbGIzVjBLU0I3WEc0Z0lDQWdJQ0FnSUM4dmJtOXliV0ZzSUdWdWRtbHliMjFsYm5SeklHbHVJSE5oYm1VZ2MybDBkV0YwYVc5dWMxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1kyeGxZWEpVYVcxbGIzVjBLRzFoY210bGNpazdYRzRnSUNBZ2ZWeHVJQ0FnSUM4dklHbG1JR05zWldGeVZHbHRaVzkxZENCM1lYTnVKM1FnWVhaaGFXeGhZbXhsSUdKMWRDQjNZWE1nYkdGMGRHVnlJR1JsWm1sdVpXUmNiaUFnSUNCcFppQW9LR05oWTJobFpFTnNaV0Z5VkdsdFpXOTFkQ0E5UFQwZ1pHVm1ZWFZzZEVOc1pXRnlWR2x0Wlc5MWRDQjhmQ0FoWTJGamFHVmtRMnhsWVhKVWFXMWxiM1YwS1NBbUppQmpiR1ZoY2xScGJXVnZkWFFwSUh0Y2JpQWdJQ0FnSUNBZ1kyRmphR1ZrUTJ4bFlYSlVhVzFsYjNWMElEMGdZMnhsWVhKVWFXMWxiM1YwTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWTJ4bFlYSlVhVzFsYjNWMEtHMWhjbXRsY2lrN1hHNGdJQ0FnZlZ4dUlDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNBZ0lDOHZJSGRvWlc0Z2QyaGxiaUJ6YjIxbFltOWtlU0JvWVhNZ2MyTnlaWGRsWkNCM2FYUm9JSE5sZEZScGJXVnZkWFFnWW5WMElHNXZJRWt1UlM0Z2JXRmtaRzVsYzNOY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOaFkyaGxaRU5zWldGeVZHbHRaVzkxZENodFlYSnJaWElwTzF4dUlDQWdJSDBnWTJGMFkyZ2dLR1VwZTF4dUlDQWdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0x5OGdWMmhsYmlCM1pTQmhjbVVnYVc0Z1NTNUZMaUJpZFhRZ2RHaGxJSE5qY21sd2RDQm9ZWE1nWW1WbGJpQmxkbUZzWldRZ2MyOGdTUzVGTGlCa2IyVnpiaWQwSUNCMGNuVnpkQ0IwYUdVZ1oyeHZZbUZzSUc5aWFtVmpkQ0IzYUdWdUlHTmhiR3hsWkNCdWIzSnRZV3hzZVZ4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHTmhZMmhsWkVOc1pXRnlWR2x0Wlc5MWRDNWpZV3hzS0c1MWJHd3NJRzFoY210bGNpazdYRzRnSUNBZ0lDQWdJSDBnWTJGMFkyZ2dLR1VwZTF4dUlDQWdJQ0FnSUNBZ0lDQWdMeThnYzJGdFpTQmhjeUJoWW05MlpTQmlkWFFnZDJobGJpQnBkQ2R6SUdFZ2RtVnljMmx2YmlCdlppQkpMa1V1SUhSb1lYUWdiWFZ6ZENCb1lYWmxJSFJvWlNCbmJHOWlZV3dnYjJKcVpXTjBJR1p2Y2lBbmRHaHBjeWNzSUdodmNHWjFiR3g1SUc5MWNpQmpiMjUwWlhoMElHTnZjbkpsWTNRZ2IzUm9aWEozYVhObElHbDBJSGRwYkd3Z2RHaHliM2NnWVNCbmJHOWlZV3dnWlhKeWIzSXVYRzRnSUNBZ0lDQWdJQ0FnSUNBdkx5QlRiMjFsSUhabGNuTnBiMjV6SUc5bUlFa3VSUzRnYUdGMlpTQmthV1ptWlhKbGJuUWdjblZzWlhNZ1ptOXlJR05zWldGeVZHbHRaVzkxZENCMmN5QnpaWFJVYVcxbGIzVjBYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnWTJGamFHVmtRMnhsWVhKVWFXMWxiM1YwTG1OaGJHd29kR2hwY3l3Z2JXRnlhMlZ5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVYRzVjYm4xY2JuWmhjaUJ4ZFdWMVpTQTlJRnRkTzF4dWRtRnlJR1J5WVdsdWFXNW5JRDBnWm1Gc2MyVTdYRzUyWVhJZ1kzVnljbVZ1ZEZGMVpYVmxPMXh1ZG1GeUlIRjFaWFZsU1c1a1pYZ2dQU0F0TVR0Y2JseHVablZ1WTNScGIyNGdZMnhsWVc1VmNFNWxlSFJVYVdOcktDa2dlMXh1SUNBZ0lHbG1JQ2doWkhKaGFXNXBibWNnZkh3Z0lXTjFjbkpsYm5SUmRXVjFaU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdmVnh1SUNBZ0lHUnlZV2x1YVc1bklEMGdabUZzYzJVN1hHNGdJQ0FnYVdZZ0tHTjFjbkpsYm5SUmRXVjFaUzVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnY1hWbGRXVWdQU0JqZFhKeVpXNTBVWFZsZFdVdVkyOXVZMkYwS0hGMVpYVmxLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnhkV1YxWlVsdVpHVjRJRDBnTFRFN1hHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNoeGRXVjFaUzVzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnWkhKaGFXNVJkV1YxWlNncE8xeHVJQ0FnSUgxY2JuMWNibHh1Wm5WdVkzUnBiMjRnWkhKaGFXNVJkV1YxWlNncElIdGNiaUFnSUNCcFppQW9aSEpoYVc1cGJtY3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lIMWNiaUFnSUNCMllYSWdkR2x0Wlc5MWRDQTlJSEoxYmxScGJXVnZkWFFvWTJ4bFlXNVZjRTVsZUhSVWFXTnJLVHRjYmlBZ0lDQmtjbUZwYm1sdVp5QTlJSFJ5ZFdVN1hHNWNiaUFnSUNCMllYSWdiR1Z1SUQwZ2NYVmxkV1V1YkdWdVozUm9PMXh1SUNBZ0lIZG9hV3hsS0d4bGJpa2dlMXh1SUNBZ0lDQWdJQ0JqZFhKeVpXNTBVWFZsZFdVZ1BTQnhkV1YxWlR0Y2JpQWdJQ0FnSUNBZ2NYVmxkV1VnUFNCYlhUdGNiaUFnSUNBZ0lDQWdkMmhwYkdVZ0tDc3JjWFZsZFdWSmJtUmxlQ0E4SUd4bGJpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR04xY25KbGJuUlJkV1YxWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHTjFjbkpsYm5SUmRXVjFaVnR4ZFdWMVpVbHVaR1Y0WFM1eWRXNG9LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J4ZFdWMVpVbHVaR1Y0SUQwZ0xURTdYRzRnSUNBZ0lDQWdJR3hsYmlBOUlIRjFaWFZsTG14bGJtZDBhRHRjYmlBZ0lDQjlYRzRnSUNBZ1kzVnljbVZ1ZEZGMVpYVmxJRDBnYm5Wc2JEdGNiaUFnSUNCa2NtRnBibWx1WnlBOUlHWmhiSE5sTzF4dUlDQWdJSEoxYmtOc1pXRnlWR2x0Wlc5MWRDaDBhVzFsYjNWMEtUdGNibjFjYmx4dWNISnZZMlZ6Y3k1dVpYaDBWR2xqYXlBOUlHWjFibU4wYVc5dUlDaG1kVzRwSUh0Y2JpQWdJQ0IyWVhJZ1lYSm5jeUE5SUc1bGR5QkJjbkpoZVNoaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvSUMwZ01TazdYRzRnSUNBZ2FXWWdLR0Z5WjNWdFpXNTBjeTVzWlc1bmRHZ2dQaUF4S1NCN1hHNGdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F4T3lCcElEd2dZWEpuZFcxbGJuUnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JoY21kelcya2dMU0F4WFNBOUlHRnlaM1Z0Wlc1MGMxdHBYVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ0lDQnhkV1YxWlM1d2RYTm9LRzVsZHlCSmRHVnRLR1oxYml3Z1lYSm5jeWtwTzF4dUlDQWdJR2xtSUNoeGRXVjFaUzVzWlc1bmRHZ2dQVDA5SURFZ0ppWWdJV1J5WVdsdWFXNW5LU0I3WEc0Z0lDQWdJQ0FnSUhKMWJsUnBiV1Z2ZFhRb1pISmhhVzVSZFdWMVpTazdYRzRnSUNBZ2ZWeHVmVHRjYmx4dUx5OGdkamdnYkdsclpYTWdjSEpsWkdsamRHbGliR1VnYjJKcVpXTjBjMXh1Wm5WdVkzUnBiMjRnU1hSbGJTaG1kVzRzSUdGeWNtRjVLU0I3WEc0Z0lDQWdkR2hwY3k1bWRXNGdQU0JtZFc0N1hHNGdJQ0FnZEdocGN5NWhjbkpoZVNBOUlHRnljbUY1TzF4dWZWeHVTWFJsYlM1d2NtOTBiM1I1Y0dVdWNuVnVJRDBnWm5WdVkzUnBiMjRnS0NrZ2UxeHVJQ0FnSUhSb2FYTXVablZ1TG1Gd2NHeDVLRzUxYkd3c0lIUm9hWE11WVhKeVlYa3BPMXh1ZlR0Y2JuQnliMk5sYzNNdWRHbDBiR1VnUFNBblluSnZkM05sY2ljN1hHNXdjbTlqWlhOekxtSnliM2R6WlhJZ1BTQjBjblZsTzF4dWNISnZZMlZ6Y3k1bGJuWWdQU0I3ZlR0Y2JuQnliMk5sYzNNdVlYSm5kaUE5SUZ0ZE8xeHVjSEp2WTJWemN5NTJaWEp6YVc5dUlEMGdKeWM3SUM4dklHVnRjSFI1SUhOMGNtbHVaeUIwYnlCaGRtOXBaQ0J5WldkbGVIQWdhWE56ZFdWelhHNXdjbTlqWlhOekxuWmxjbk5wYjI1eklEMGdlMzA3WEc1Y2JtWjFibU4wYVc5dUlHNXZiM0FvS1NCN2ZWeHVYRzV3Y205alpYTnpMbTl1SUQwZ2JtOXZjRHRjYm5CeWIyTmxjM011WVdSa1RHbHpkR1Z1WlhJZ1BTQnViMjl3TzF4dWNISnZZMlZ6Y3k1dmJtTmxJRDBnYm05dmNEdGNibkJ5YjJObGMzTXViMlptSUQwZ2JtOXZjRHRjYm5CeWIyTmxjM011Y21WdGIzWmxUR2x6ZEdWdVpYSWdQU0J1YjI5d08xeHVjSEp2WTJWemN5NXlaVzF2ZG1WQmJHeE1hWE4wWlc1bGNuTWdQU0J1YjI5d08xeHVjSEp2WTJWemN5NWxiV2wwSUQwZ2JtOXZjRHRjYm5CeWIyTmxjM011Y0hKbGNHVnVaRXhwYzNSbGJtVnlJRDBnYm05dmNEdGNibkJ5YjJObGMzTXVjSEpsY0dWdVpFOXVZMlZNYVhOMFpXNWxjaUE5SUc1dmIzQTdYRzVjYm5CeWIyTmxjM011YkdsemRHVnVaWEp6SUQwZ1puVnVZM1JwYjI0Z0tHNWhiV1VwSUhzZ2NtVjBkWEp1SUZ0ZElIMWNibHh1Y0hKdlkyVnpjeTVpYVc1a2FXNW5JRDBnWm5WdVkzUnBiMjRnS0c1aGJXVXBJSHRjYmlBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0ozQnliMk5sYzNNdVltbHVaR2x1WnlCcGN5QnViM1FnYzNWd2NHOXlkR1ZrSnlrN1hHNTlPMXh1WEc1d2NtOWpaWE56TG1OM1pDQTlJR1oxYm1OMGFXOXVJQ2dwSUhzZ2NtVjBkWEp1SUNjdkp5QjlPMXh1Y0hKdlkyVnpjeTVqYUdScGNpQTlJR1oxYm1OMGFXOXVJQ2hrYVhJcElIdGNiaUFnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjNCeWIyTmxjM011WTJoa2FYSWdhWE1nYm05MElITjFjSEJ2Y25SbFpDY3BPMXh1ZlR0Y2JuQnliMk5sYzNNdWRXMWhjMnNnUFNCbWRXNWpkR2x2YmlncElIc2djbVYwZFhKdUlEQTdJSDA3WEc0aUxDSXZLbHh1SUhKbFkzVnljMmwyWlMxcGRHVnlZWFJ2Y2lCMk1pNHdMakZjYmlCb2RIUndjem92TDJkcGRHaDFZaTVqYjIwdmJtVnlkbWRvTDNKbFkzVnljMmwyWlMxcGRHVnlZWFJ2Y2x4dUtpOWNibHh1S0daMWJtTjBhVzl1SUhkbFluQmhZMnRWYm1sMlpYSnpZV3hOYjJSMWJHVkVaV1pwYm1sMGFXOXVLSEp2YjNRc0lHWmhZM1J2Y25rcElIdGNibHgwYVdZb2RIbHdaVzltSUdWNGNHOXlkSE1nUFQwOUlDZHZZbXBsWTNRbklDWW1JSFI1Y0dWdlppQnRiMlIxYkdVZ1BUMDlJQ2R2WW1wbFkzUW5LVnh1WEhSY2RHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ1ptRmpkRzl5ZVNncE8xeHVYSFJsYkhObElHbG1LSFI1Y0dWdlppQmtaV1pwYm1VZ1BUMDlJQ2RtZFc1amRHbHZiaWNnSmlZZ1pHVm1hVzVsTG1GdFpDbGNibHgwWEhSa1pXWnBibVVvVzEwc0lHWmhZM1J2Y25rcE8xeHVYSFJsYkhObElHbG1LSFI1Y0dWdlppQmxlSEJ2Y25SeklEMDlQU0FuYjJKcVpXTjBKeWxjYmx4MFhIUmxlSEJ2Y25Selcxd2lVbVZqZFhKemFYWmxTWFJsY21GMGIzSmNJbDBnUFNCbVlXTjBiM0o1S0NrN1hHNWNkR1ZzYzJWY2JseDBYSFJ5YjI5MFcxd2lVbVZqZFhKemFYWmxTWFJsY21GMGIzSmNJbDBnUFNCbVlXTjBiM0o1S0NrN1hHNTlLU2gwYUdsekxDQm1kVzVqZEdsdmJpZ3BJSHRjYm5KbGRIVnliaUF2S2lvcUtpb3FMeUFvWm5WdVkzUnBiMjRvYlc5a2RXeGxjeWtnZXlBdkx5QjNaV0p3WVdOclFtOXZkSE4wY21Gd1hHNHZLaW9xS2lvcUx5QmNkQzh2SUZSb1pTQnRiMlIxYkdVZ1kyRmphR1ZjYmk4cUtpb3FLaW92SUZ4MGRtRnlJR2x1YzNSaGJHeGxaRTF2WkhWc1pYTWdQU0I3ZlR0Y2JpOHFLaW9xS2lvdlhHNHZLaW9xS2lvcUx5QmNkQzh2SUZSb1pTQnlaWEYxYVhKbElHWjFibU4wYVc5dVhHNHZLaW9xS2lvcUx5QmNkR1oxYm1OMGFXOXVJRjlmZDJWaWNHRmphMTl5WlhGMWFYSmxYMThvYlc5a2RXeGxTV1FwSUh0Y2JpOHFLaW9xS2lvdlhHNHZLaW9xS2lvcUx5QmNkRngwTHk4Z1EyaGxZMnNnYVdZZ2JXOWtkV3hsSUdseklHbHVJR05oWTJobFhHNHZLaW9xS2lvcUx5QmNkRngwYVdZb2FXNXpkR0ZzYkdWa1RXOWtkV3hsYzF0dGIyUjFiR1ZKWkYwcFhHNHZLaW9xS2lvcUx5QmNkRngwWEhSeVpYUjFjbTRnYVc1emRHRnNiR1ZrVFc5a2RXeGxjMXR0YjJSMWJHVkpaRjB1Wlhod2IzSjBjenRjYmk4cUtpb3FLaW92WEc0dktpb3FLaW9xTHlCY2RGeDBMeThnUTNKbFlYUmxJR0VnYm1WM0lHMXZaSFZzWlNBb1lXNWtJSEIxZENCcGRDQnBiblJ2SUhSb1pTQmpZV05vWlNsY2JpOHFLaW9xS2lvdklGeDBYSFIyWVhJZ2JXOWtkV3hsSUQwZ2FXNXpkR0ZzYkdWa1RXOWtkV3hsYzF0dGIyUjFiR1ZKWkYwZ1BTQjdYRzR2S2lvcUtpb3FMeUJjZEZ4MFhIUmxlSEJ2Y25Sek9pQjdmU3hjYmk4cUtpb3FLaW92SUZ4MFhIUmNkR2xrT2lCdGIyUjFiR1ZKWkN4Y2JpOHFLaW9xS2lvdklGeDBYSFJjZEd4dllXUmxaRG9nWm1Gc2MyVmNiaThxS2lvcUtpb3ZJRngwWEhSOU8xeHVMeW9xS2lvcUtpOWNiaThxS2lvcUtpb3ZJRngwWEhRdkx5QkZlR1ZqZFhSbElIUm9aU0J0YjJSMWJHVWdablZ1WTNScGIyNWNiaThxS2lvcUtpb3ZJRngwWEhSdGIyUjFiR1Z6VzIxdlpIVnNaVWxrWFM1allXeHNLRzF2WkhWc1pTNWxlSEJ2Y25SekxDQnRiMlIxYkdVc0lHMXZaSFZzWlM1bGVIQnZjblJ6TENCZlgzZGxZbkJoWTJ0ZmNtVnhkV2x5WlY5ZktUdGNiaThxS2lvcUtpb3ZYRzR2S2lvcUtpb3FMeUJjZEZ4MEx5OGdSbXhoWnlCMGFHVWdiVzlrZFd4bElHRnpJR3h2WVdSbFpGeHVMeW9xS2lvcUtpOGdYSFJjZEcxdlpIVnNaUzVzYjJGa1pXUWdQU0IwY25WbE8xeHVMeW9xS2lvcUtpOWNiaThxS2lvcUtpb3ZJRngwWEhRdkx5QlNaWFIxY200Z2RHaGxJR1Y0Y0c5eWRITWdiMllnZEdobElHMXZaSFZzWlZ4dUx5b3FLaW9xS2k4Z1hIUmNkSEpsZEhWeWJpQnRiMlIxYkdVdVpYaHdiM0owY3p0Y2JpOHFLaW9xS2lvdklGeDBmVnh1THlvcUtpb3FLaTljYmk4cUtpb3FLaW92WEc0dktpb3FLaW9xTHlCY2RDOHZJR1Y0Y0c5elpTQjBhR1VnYlc5a2RXeGxjeUJ2WW1wbFkzUWdLRjlmZDJWaWNHRmphMTl0YjJSMWJHVnpYMThwWEc0dktpb3FLaW9xTHlCY2RGOWZkMlZpY0dGamExOXlaWEYxYVhKbFgxOHViU0E5SUcxdlpIVnNaWE03WEc0dktpb3FLaW9xTDF4dUx5b3FLaW9xS2k4Z1hIUXZMeUJsZUhCdmMyVWdkR2hsSUcxdlpIVnNaU0JqWVdOb1pWeHVMeW9xS2lvcUtpOGdYSFJmWDNkbFluQmhZMnRmY21WeGRXbHlaVjlmTG1NZ1BTQnBibk4wWVd4c1pXUk5iMlIxYkdWek8xeHVMeW9xS2lvcUtpOWNiaThxS2lvcUtpb3ZJRngwTHk4Z1gxOTNaV0p3WVdOclgzQjFZbXhwWTE5d1lYUm9YMTljYmk4cUtpb3FLaW92SUZ4MFgxOTNaV0p3WVdOclgzSmxjWFZwY21WZlh5NXdJRDBnWENKY0lqdGNiaThxS2lvcUtpb3ZYRzR2S2lvcUtpb3FMeUJjZEM4dklFeHZZV1FnWlc1MGNua2diVzlrZFd4bElHRnVaQ0J5WlhSMWNtNGdaWGh3YjNKMGMxeHVMeW9xS2lvcUtpOGdYSFJ5WlhSMWNtNGdYMTkzWldKd1lXTnJYM0psY1hWcGNtVmZYeWd3S1R0Y2JpOHFLaW9xS2lvdklIMHBYRzR2S2lvcUtpb3FLaW9xS2lvcUtpb3FLaW9xS2lvcUtpb3FLaW9xS2lvcUtpb3FLaW9xS2lvcUtpb3FLaW9xS2lvcUtpb3FLaW9xS2lvcUtpb3FLaW9xS2lvcUtpb3FLaW9xTDF4dUx5b3FLaW9xS2k4Z0tGdGNiaThxSURBZ0tpOWNiaThxS2lvdklHWjFibU4wYVc5dUtHMXZaSFZzWlN3Z1pYaHdiM0owY3l3Z1gxOTNaV0p3WVdOclgzSmxjWFZwY21WZlh5a2dlMXh1WEc1Y2RGd2lkWE5sSUhOMGNtbGpkRndpTzF4dVhIUmNibHgwWEc1Y2RIWmhjaUJmZEc5RGIyNXpkVzFoWW14bFFYSnlZWGtnUFNCbWRXNWpkR2x2YmlBb1lYSnlLU0I3SUdsbUlDaEJjbkpoZVM1cGMwRnljbUY1S0dGeWNpa3BJSHNnWm05eUlDaDJZWElnYVNBOUlEQXNJR0Z5Y2pJZ1BTQkJjbkpoZVNoaGNuSXViR1Z1WjNSb0tUc2dhU0E4SUdGeWNpNXNaVzVuZEdnN0lHa3JLeWtnWVhKeU1sdHBYU0E5SUdGeWNsdHBYVHNnY21WMGRYSnVJR0Z5Y2pJN0lIMGdaV3h6WlNCN0lISmxkSFZ5YmlCQmNuSmhlUzVtY205dEtHRnljaWs3SUgwZ2ZUdGNibHgwWEc1Y2RIWmhjaUJmY0hKdmRHOTBlWEJsVUhKdmNHVnlkR2xsY3lBOUlHWjFibU4wYVc5dUlDaGphR2xzWkN3Z2MzUmhkR2xqVUhKdmNITXNJR2x1YzNSaGJtTmxVSEp2Y0hNcElIc2dhV1lnS0hOMFlYUnBZMUJ5YjNCektTQlBZbXBsWTNRdVpHVm1hVzVsVUhKdmNHVnlkR2xsY3loamFHbHNaQ3dnYzNSaGRHbGpVSEp2Y0hNcE95QnBaaUFvYVc1emRHRnVZMlZRY205d2N5a2dUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblJwWlhNb1kyaHBiR1F1Y0hKdmRHOTBlWEJsTENCcGJuTjBZVzVqWlZCeWIzQnpLVHNnZlR0Y2JseDBYRzVjZEhaaGNpQmZZMnhoYzNORFlXeHNRMmhsWTJzZ1BTQm1kVzVqZEdsdmJpQW9hVzV6ZEdGdVkyVXNJRU52Ym5OMGNuVmpkRzl5S1NCN0lHbG1JQ2doS0dsdWMzUmhibU5sSUdsdWMzUmhibU5sYjJZZ1EyOXVjM1J5ZFdOMGIzSXBLU0I3SUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb1hDSkRZVzV1YjNRZ1kyRnNiQ0JoSUdOc1lYTnpJR0Z6SUdFZ1puVnVZM1JwYjI1Y0lpazdJSDBnZlR0Y2JseDBYRzVjZEhaaGNpQmZiR0Z1WnlBOUlGOWZkMlZpY0dGamExOXlaWEYxYVhKbFgxOG9NU2s3WEc1Y2RGeHVYSFIyWVhJZ2FYTlBZbXBsWTNRZ1BTQmZiR0Z1Wnk1cGMwOWlhbVZqZER0Y2JseDBkbUZ5SUdkbGRFdGxlWE1nUFNCZmJHRnVaeTVuWlhSTFpYbHpPMXh1WEhSY2JseDBYRzVjZEZ4dVhIUXZMeUJRVWtsV1FWUkZJRkJTVDFCRlVsUkpSVk5jYmx4MGRtRnlJRUpaVUVGVFUxOU5UMFJGSUQwZ1hDSmZYMko1Y0dGemMwMXZaR1ZjSWp0Y2JseDBkbUZ5SUVsSFRrOVNSVjlEU1ZKRFZVeEJVaUE5SUZ3aVgxOXBaMjV2Y21WRGFYSmpkV3hoY2x3aU8xeHVYSFIyWVhJZ1RVRllYMFJGUlZBZ1BTQmNJbDlmYldGNFJHVmxjRndpTzF4dVhIUjJZWElnUTBGRFNFVWdQU0JjSWw5ZlkyRmphR1ZjSWp0Y2JseDBkbUZ5SUZGVlJWVkZJRDBnWENKZlgzRjFaWFZsWENJN1hHNWNkSFpoY2lCVFZFRlVSU0E5SUZ3aVgxOXpkR0YwWlZ3aU8xeHVYSFJjYmx4MFhHNWNkSFpoY2lCRlRWQlVXVjlUVkVGVVJTQTlJSHQ5TzF4dVhIUmNibHgwWEc1Y2RIWmhjaUJTWldOMWNuTnBkbVZKZEdWeVlYUnZjaUE5SUNobWRXNWpkR2x2YmlBb0tTQjdYRzVjZENBZ0lDQXZLaXBjYmx4MElDQWdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmRUZ5Y21GNWZTQnliMjkwWEc1Y2RDQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnVzJKNWNHRnpjMDF2WkdVOU1GMWNibHgwSUNBZ0lDQXFJRUJ3WVhKaGJTQjdRbTl2YkdWaGJuMGdXMmxuYm05eVpVTnBjbU4xYkdGeVBXWmhiSE5sWFZ4dVhIUWdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUZ0dFlYaEVaV1Z3UFRFd01GMWNibHgwSUNBZ0lDQXFMMXh1WEhRZ0lDQWdablZ1WTNScGIyNGdVbVZqZFhKemFYWmxTWFJsY21GMGIzSW9jbTl2ZENrZ2UxeHVYSFFnSUNBZ0lDQWdJSFpoY2lCaWVYQmhjM05OYjJSbElEMGdZWEpuZFcxbGJuUnpXekZkSUQwOVBTQjFibVJsWm1sdVpXUWdQeUF3SURvZ1lYSm5kVzFsYm5Seld6RmRPMXh1WEhRZ0lDQWdJQ0FnSUhaaGNpQnBaMjV2Y21WRGFYSmpkV3hoY2lBOUlHRnlaM1Z0Wlc1MGMxc3lYU0E5UFQwZ2RXNWtaV1pwYm1Wa0lEOGdabUZzYzJVZ09pQmhjbWQxYldWdWRITmJNbDA3WEc1Y2RDQWdJQ0FnSUNBZ2RtRnlJRzFoZUVSbFpYQWdQU0JoY21kMWJXVnVkSE5iTTEwZ1BUMDlJSFZ1WkdWbWFXNWxaQ0EvSURFd01DQTZJR0Z5WjNWdFpXNTBjMXN6WFR0Y2JseDBJQ0FnSUNBZ0lDQmZZMnhoYzNORFlXeHNRMmhsWTJzb2RHaHBjeXdnVW1WamRYSnphWFpsU1hSbGNtRjBiM0lwTzF4dVhIUmNibHgwSUNBZ0lDQWdJQ0IwYUdselcwSlpVRUZUVTE5TlQwUkZYU0E5SUdKNWNHRnpjMDF2WkdVN1hHNWNkQ0FnSUNBZ0lDQWdkR2hwYzF0SlIwNVBVa1ZmUTBsU1ExVk1RVkpkSUQwZ2FXZHViM0psUTJseVkzVnNZWEk3WEc1Y2RDQWdJQ0FnSUNBZ2RHaHBjMXROUVZoZlJFVkZVRjBnUFNCdFlYaEVaV1Z3TzF4dVhIUWdJQ0FnSUNBZ0lIUm9hWE5iUTBGRFNFVmRJRDBnVzEwN1hHNWNkQ0FnSUNBZ0lDQWdkR2hwYzF0UlZVVlZSVjBnUFNCYlhUdGNibHgwSUNBZ0lDQWdJQ0IwYUdselcxTlVRVlJGWFNBOUlIUm9hWE11WjJWMFUzUmhkR1VvZFc1a1pXWnBibVZrTENCeWIyOTBLVHRjYmx4MElDQWdJQ0FnSUNCMGFHbHpMbDlmYldGclpVbDBaWEpoWW14bEtDazdYRzVjZENBZ0lDQjlYRzVjZEZ4dVhIUWdJQ0FnWDNCeWIzUnZkSGx3WlZCeWIzQmxjblJwWlhNb1VtVmpkWEp6YVhabFNYUmxjbUYwYjNJc0lHNTFiR3dzSUh0Y2JseDBJQ0FnSUNBZ0lDQnVaWGgwT2lCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUM4cUtseHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tpQkFjbVYwZFhKdWN5QjdUMkpxWldOMGZWeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tpOWNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1U2SUdaMWJtTjBhVzl1SUc1bGVIUW9LU0I3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdYM0psWmlBOUlIUm9hWE5iVTFSQlZFVmRJSHg4SUVWTlVGUlpYMU5VUVZSRk8xeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUc1dlpHVWdQU0JmY21WbUxtNXZaR1U3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdjR0YwYUNBOUlGOXlaV1l1Y0dGMGFEdGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCa1pXVndJRDBnWDNKbFppNWtaV1Z3TzF4dVhIUmNibHgwWEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kR2hwYzF0TlFWaGZSRVZGVUYwZ1BpQmtaV1Z3S1NCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIUm9hWE11YVhOT2IyUmxLRzV2WkdVcEtTQjdYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoMGFHbHpMbWx6UTJseVkzVnNZWElvYm05a1pTa3BJSHRjYmx4MElDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbG1JQ2gwYUdselcwbEhUazlTUlY5RFNWSkRWVXhCVWwwcElIdDlJR1ZzYzJVZ2UxeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2loY0lrTnBjbU4xYkdGeUlISmxabVZ5Wlc1alpWd2lLVHRjYmx4MElDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdsbUlDaDBhR2x6TG05dVUzUmxjRWx1ZEc4b2RHaHBjMXRUVkVGVVJWMHBLU0I3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlGOVJWVVZWUlR0Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdaR1Z6WTNKcGNIUnZjbk1nUFNCMGFHbHpMbWRsZEZOMFlYUmxjMDltUTJocGJHUk9iMlJsY3lodWIyUmxMQ0J3WVhSb0xDQmtaV1Z3S1R0Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdiV1YwYUc5a0lEMGdkR2hwYzF0Q1dWQkJVMU5mVFU5RVJWMGdQeUJjSW5CMWMyaGNJaUE2SUZ3aWRXNXphR2xtZEZ3aU8xeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDaGZVVlZGVlVVZ1BTQjBhR2x6VzFGVlJWVkZYU2xiYldWMGFHOWtYUzVoY0hCc2VTaGZVVlZGVlVVc0lGOTBiME52Ym5OMWJXRmliR1ZCY25KaGVTaGtaWE5qY21sd2RHOXljeWtwTzF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTmJRMEZEU0VWZExuQjFjMmdvYm05a1pTazdYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzVjZEZ4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdkR2hwYzF0UlZVVlZSVjB1YzJocFpuUW9LVHRjYmx4MElDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhaaGNpQmtiMjVsSUQwZ0lYWmhiSFZsTzF4dVhIUmNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSFJvYVhOYlUxUkJWRVZkSUQwZ2RtRnNkV1U3WEc1Y2RGeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhV1lnS0dSdmJtVXBJSFJvYVhNdVpHVnpkSEp2ZVNncE8xeHVYSFJjYmx4MElDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUI3SUhaaGJIVmxPaUIyWVd4MVpTd2daRzl1WlRvZ1pHOXVaU0I5TzF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0I5TEZ4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpTeGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUIwY25WbFhHNWNkQ0FnSUNBZ0lDQWdmU3hjYmx4MElDQWdJQ0FnSUNCa1pYTjBjbTk1T2lCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUM4cUtseHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tseHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tpOWNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1U2SUdaMWJtTjBhVzl1SUdSbGMzUnliM2tvS1NCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhR2x6VzFGVlJWVkZYUzVzWlc1bmRHZ2dQU0F3TzF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjMXREUVVOSVJWMHViR1Z1WjNSb0lEMGdNRHRjYmx4MElDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSb2FYTmJVMVJCVkVWZElEMGdiblZzYkR0Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnZlN4Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnZDNKcGRHRmliR1U2SUhSeWRXVXNYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lHTnZibVpwWjNWeVlXSnNaVG9nZEhKMVpWeHVYSFFnSUNBZ0lDQWdJSDBzWEc1Y2RDQWdJQ0FnSUNBZ2FYTk9iMlJsT2lCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUM4cUtseHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tpQkFjR0Z5WVcwZ2V5cDlJR0Z1ZVZ4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvdlhHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUhaaGJIVmxPaUJtZFc1amRHbHZiaUJwYzA1dlpHVW9ZVzU1S1NCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2FYTlBZbXBsWTNRb1lXNTVLVHRjYmx4MElDQWdJQ0FnSUNBZ0lDQWdmU3hjYmx4MElDQWdJQ0FnSUNBZ0lDQWdkM0pwZEdGaWJHVTZJSFJ5ZFdVc1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUdOdmJtWnBaM1Z5WVdKc1pUb2dkSEoxWlZ4dVhIUWdJQ0FnSUNBZ0lIMHNYRzVjZENBZ0lDQWdJQ0FnYVhOTVpXRm1PaUI3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQzhxS2x4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0FnS2lCQWNHRnlZVzBnZXlwOUlHRnVlVnh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmx4MElDQWdJQ0FnSUNBZ0lDQWdJQ292WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJSFpoYkhWbE9pQm1kVzVqZEdsdmJpQnBjMHhsWVdZb1lXNTVLU0I3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnSVhSb2FYTXVhWE5PYjJSbEtHRnVlU2s3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJSDBzWEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJSGR5YVhSaFlteGxPaUIwY25WbExGeHVYSFFnSUNBZ0lDQWdJQ0FnSUNCamIyNW1hV2QxY21GaWJHVTZJSFJ5ZFdWY2JseDBJQ0FnSUNBZ0lDQjlMRnh1WEhRZ0lDQWdJQ0FnSUdselEybHlZM1ZzWVhJNklIdGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0x5b3FYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQXFJRUJ3WVhKaGJTQjdLbjBnWVc1NVhHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tpOWNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1U2SUdaMWJtTjBhVzl1SUdselEybHlZM1ZzWVhJb1lXNTVLU0I3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZEdocGMxdERRVU5JUlYwdWFXNWtaWGhQWmloaGJua3BJQ0U5UFNBdE1UdGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2ZTeGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2QzSnBkR0ZpYkdVNklIUnlkV1VzWEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJR052Ym1acFozVnlZV0pzWlRvZ2RISjFaVnh1WEhRZ0lDQWdJQ0FnSUgwc1hHNWNkQ0FnSUNBZ0lDQWdaMlYwVTNSaGRHVnpUMlpEYUdsc1pFNXZaR1Z6T2lCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUM4cUtseHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tpQlNaWFIxY201eklITjBZWFJsY3lCdlppQmphR2xzWkNCdWIyUmxjMXh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdibTlrWlZ4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0FnS2lCQWNHRnlZVzBnZTBGeWNtRjVmU0J3WVhSb1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCa1pXVndYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRCY25KaGVUeFBZbXBsWTNRK2ZWeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0tpOWNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1U2SUdaMWJtTjBhVzl1SUdkbGRGTjBZWFJsYzA5bVEyaHBiR1JPYjJSbGN5aHViMlJsTENCd1lYUm9MQ0JrWldWd0tTQjdYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ1gzUm9hWE1nUFNCMGFHbHpPMXh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR2RsZEV0bGVYTW9ibTlrWlNrdWJXRndLR1oxYm1OMGFXOXVJQ2hyWlhrcElIdGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnWDNSb2FYTXVaMlYwVTNSaGRHVW9ibTlrWlN3Z2JtOWtaVnRyWlhsZExDQnJaWGtzSUhCaGRHZ3VZMjl1WTJGMEtHdGxlU2tzSUdSbFpYQWdLeUF4S1R0Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQjlMRnh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlN4Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQjBjblZsWEc1Y2RDQWdJQ0FnSUNBZ2ZTeGNibHgwSUNBZ0lDQWdJQ0JuWlhSVGRHRjBaVG9nZTF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0F2S2lwY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvZ1VtVjBkWEp1Y3lCemRHRjBaU0J2WmlCdWIyUmxMaUJEWVd4c2N5Qm1iM0lnWldGamFDQnViMlJsWEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FxSUVCd1lYSmhiU0I3VDJKcVpXTjBmU0JiY0dGeVpXNTBYVnh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQWdLaUJBY0dGeVlXMGdleXA5SUZ0dWIyUmxYVnh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdXMnRsZVYxY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvZ1FIQmhjbUZ0SUh0QmNuSmhlWDBnVzNCaGRHaGRYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQmJaR1ZsY0YxY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwOWlhbVZqZEgxY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvdlhHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUhaaGJIVmxPaUJtZFc1amRHbHZiaUJuWlhSVGRHRjBaU2h3WVhKbGJuUXNJRzV2WkdVc0lHdGxlU2tnZTF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJSEJoZEdnZ1BTQmhjbWQxYldWdWRITmJNMTBnUFQwOUlIVnVaR1ZtYVc1bFpDQS9JRnRkSURvZ1lYSm5kVzFsYm5Seld6TmRPMXh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHUmxaWEFnUFNCaGNtZDFiV1Z1ZEhOYk5GMGdQVDA5SUhWdVpHVm1hVzVsWkNBL0lEQWdPaUJoY21kMWJXVnVkSE5iTkYwN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2V5QndZWEpsYm5RNklIQmhjbVZ1ZEN3Z2JtOWtaVG9nYm05a1pTd2dhMlY1T2lCclpYa3NJSEJoZEdnNklIQmhkR2dzSUdSbFpYQTZJR1JsWlhBZ2ZUdGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2ZTeGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ2QzSnBkR0ZpYkdVNklIUnlkV1VzWEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJR052Ym1acFozVnlZV0pzWlRvZ2RISjFaVnh1WEhRZ0lDQWdJQ0FnSUgwc1hHNWNkQ0FnSUNBZ0lDQWdiMjVUZEdWd1NXNTBiem9nZTF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0F2S2lwY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvZ1EyRnNiR0poWTJ0Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I5SUhOMFlYUmxYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQWdLaTljYmx4MElDQWdJQ0FnSUNBZ0lDQWdkbUZzZFdVNklHWjFibU4wYVc5dUlHOXVVM1JsY0VsdWRHOG9jM1JoZEdVcElIdGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0I5TEZ4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpTeGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUIwY25WbFhHNWNkQ0FnSUNBZ0lDQWdmU3hjYmx4MElDQWdJQ0FnSUNCZlgyMWhhMlZKZEdWeVlXSnNaVG9nZTF4dVhIUWdJQ0FnSUNBZ0lDQWdJQ0F2S2lwY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNvZ1QyNXNlU0JtYjNJZ1pYTTJYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQXFJRUJ3Y21sMllYUmxYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lDQXFMMXh1WEhRZ0lDQWdJQ0FnSUNBZ0lDQjJZV3gxWlRvZ1puVnVZM1JwYjI0Z1gxOXRZV3RsU1hSbGNtRmliR1VvS1NCN1hHNWNkQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnWDNSb2FYTWdQU0IwYUdsek8xeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSEo1SUh0Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUdselcxTjViV0p2YkM1cGRHVnlZWFJ2Y2wwZ1BTQm1kVzVqZEdsdmJpQW9LU0I3WEc1Y2RDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJmZEdocGN6dGNibHgwSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCOU8xeHVYSFFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdmU0JqWVhSamFDQW9aU2tnZTMxY2JseDBJQ0FnSUNBZ0lDQWdJQ0FnZlN4Y2JseDBJQ0FnSUNBZ0lDQWdJQ0FnZDNKcGRHRmliR1U2SUhSeWRXVXNYRzVjZENBZ0lDQWdJQ0FnSUNBZ0lHTnZibVpwWjNWeVlXSnNaVG9nZEhKMVpWeHVYSFFnSUNBZ0lDQWdJSDFjYmx4MElDQWdJSDBwTzF4dVhIUmNibHgwSUNBZ0lISmxkSFZ5YmlCU1pXTjFjbk5wZG1WSmRHVnlZWFJ2Y2p0Y2JseDBmU2tvS1R0Y2JseDBYRzVjZEcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnVW1WamRYSnphWFpsU1hSbGNtRjBiM0k3WEc1Y2RDOHZJSE5yYVhCY2JseHVMeW9xS2k4Z2ZTeGNiaThxSURFZ0tpOWNiaThxS2lvdklHWjFibU4wYVc5dUtHMXZaSFZzWlN3Z1pYaHdiM0owY3lrZ2UxeHVYRzVjZEZ3aWRYTmxJSE4wY21samRGd2lPMXh1WEhRdktpcGNibHgwSUNvZ1FIQmhjbUZ0SUhzcWZTQmhibmxjYmx4MElDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzVjZENBcUwxeHVYSFJsZUhCdmNuUnpMbWx6VDJKcVpXTjBJRDBnYVhOUFltcGxZM1E3WEc1Y2RDOHFLbHh1WEhRZ0tpQkFjR0Z5WVcwZ2V5cDlJR0Z1ZVZ4dVhIUWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmx4MElDb3ZYRzVjZEdWNGNHOXlkSE11YVhOQmNuSmhlVXhwYTJVZ1BTQnBjMEZ5Y21GNVRHbHJaVHRjYmx4MEx5b3FYRzVjZENBcUlFQndZWEpoYlNCN0tuMGdZVzU1WEc1Y2RDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1WEhRZ0tpOWNibHgwWlhod2IzSjBjeTVwYzA1MWJXSmxjaUE5SUdselRuVnRZbVZ5TzF4dVhIUXZLaXBjYmx4MElDb2dRSEJoY21GdElIdFBZbXBsWTNSOFFYSnlZWGw5SUc5aWFtVmpkRnh1WEhRZ0tpQkFjbVYwZFhKdWN5QjdRWEp5WVhrOFUzUnlhVzVuUG4xY2JseDBJQ292WEc1Y2RHVjRjRzl5ZEhNdVoyVjBTMlY1Y3lBOUlHZGxkRXRsZVhNN1hHNWNkR1oxYm1OMGFXOXVJR2x6VDJKcVpXTjBLR0Z1ZVNrZ2UxeHVYSFFnSUhKbGRIVnliaUJoYm5rZ0lUMDlJRzUxYkd3Z0ppWWdkSGx3Wlc5bUlHRnVlU0E5UFQwZ1hDSnZZbXBsWTNSY0lqdGNibHgwZlZ4dVhIUXZLaXBjYmx4MElDb2dRSEJoY21GdElIc3FmU0JoYm5sY2JseDBJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc1Y2RDQXFMMXh1WEhSMllYSWdhWE5CY25KaGVTQTlJR1Y0Y0c5eWRITXVhWE5CY25KaGVTQTlJRUZ5Y21GNUxtbHpRWEp5WVhrN1hHNWNkR1oxYm1OMGFXOXVJR2x6UVhKeVlYbE1hV3RsS0dGdWVTa2dlMXh1WEhRZ0lHbG1JQ2doYVhOUFltcGxZM1FvWVc1NUtTa2dlMXh1WEhRZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dVhIUWdJSDFwWmlBb0lTaGNJbXhsYm1kMGFGd2lJR2x1SUdGdWVTa3BJSHRjYmx4MElDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JseDBJQ0I5ZG1GeUlHeGxibWQwYUNBOUlHRnVlUzVzWlc1bmRHZzdYRzVjZENBZ2FXWWdLQ0ZwYzA1MWJXSmxjaWhzWlc1bmRHZ3BLU0I3WEc1Y2RDQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNWNkQ0FnZldsbUlDaHNaVzVuZEdnZ1BpQXdLU0I3WEc1Y2RDQWdJQ0J5WlhSMWNtNGdiR1Z1WjNSb0lDMGdNU0JwYmlCaGJuazdYRzVjZENBZ2ZTQmxiSE5sSUh0Y2JseDBJQ0FnSUdadmNpQW9kbUZ5SUd0bGVTQnBiaUJoYm5rcElIdGNibHgwSUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dVhIUWdJQ0FnZlZ4dVhIUWdJSDFjYmx4MGZXWjFibU4wYVc5dUlHbHpUblZ0WW1WeUtHRnVlU2tnZTF4dVhIUWdJSEpsZEhWeWJpQjBlWEJsYjJZZ1lXNTVJRDA5UFNCY0ltNTFiV0psY2x3aU8xeHVYSFI5Wm5WdVkzUnBiMjRnWjJWMFMyVjVjeWh2WW1wbFkzUXBJSHRjYmx4MElDQjJZWElnYTJWNWMxOGdQU0JQWW1wbFkzUXVhMlY1Y3lodlltcGxZM1FwTzF4dVhIUWdJR2xtSUNocGMwRnljbUY1S0c5aWFtVmpkQ2twSUh0OUlHVnNjMlVnYVdZZ0tHbHpRWEp5WVhsTWFXdGxLRzlpYW1WamRDa3BJSHRjYmx4MElDQWdJSFpoY2lCcGJtUmxlQ0E5SUd0bGVYTmZMbWx1WkdWNFQyWW9YQ0pzWlc1bmRHaGNJaWs3WEc1Y2RDQWdJQ0JwWmlBb2FXNWtaWGdnUGlBdE1Ta2dlMXh1WEhRZ0lDQWdJQ0JyWlhselh5NXpjR3hwWTJVb2FXNWtaWGdzSURFcE8xeHVYSFFnSUNBZ2ZWeHVYSFFnSUNBZ0x5OGdjMnRwY0NCemIzSjBYRzVjZENBZ2ZTQmxiSE5sSUh0Y2JseDBJQ0FnSUM4dklITnZjblJjYmx4MElDQWdJR3RsZVhOZklEMGdhMlY1YzE4dWMyOXlkQ2dwTzF4dVhIUWdJSDFjYmx4MElDQnlaWFIxY200Z2EyVjVjMTg3WEc1Y2RIMWNibHgwVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNUtHVjRjRzl5ZEhNc0lGd2lYMTlsYzAxdlpIVnNaVndpTENCN1hHNWNkQ0FnZG1Gc2RXVTZJSFJ5ZFdWY2JseDBmU2s3WEc1Y2JseDBMeThnYzJ0cGNDQnpiM0owWEc1Y2JpOHFLaW92SUgxY2JpOHFLaW9xS2lvdklGMHBYRzU5S1R0Y2JqdGNiaTh2SXlCemIzVnlZMlZOWVhCd2FXNW5WVkpNUFhKbFkzVnljMmwyWlMxcGRHVnlZWFJ2Y2k1cWN5NXRZWEFpTENJb1puVnVZM1JwYjI0b2MyVnNaaWtnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JpQWdhV1lnS0hObGJHWXVabVYwWTJncElIdGNiaUFnSUNCeVpYUjFjbTVjYmlBZ2ZWeHVYRzRnSUhaaGNpQnpkWEJ3YjNKMElEMGdlMXh1SUNBZ0lITmxZWEpqYUZCaGNtRnRjem9nSjFWU1RGTmxZWEpqYUZCaGNtRnRjeWNnYVc0Z2MyVnNaaXhjYmlBZ0lDQnBkR1Z5WVdKc1pUb2dKMU41YldKdmJDY2dhVzRnYzJWc1ppQW1KaUFuYVhSbGNtRjBiM0luSUdsdUlGTjViV0p2YkN4Y2JpQWdJQ0JpYkc5aU9pQW5SbWxzWlZKbFlXUmxjaWNnYVc0Z2MyVnNaaUFtSmlBblFteHZZaWNnYVc0Z2MyVnNaaUFtSmlBb1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNCdVpYY2dRbXh2WWlncFhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGNuVmxYRzRnSUNBZ0lDQjlJR05oZEdOb0tHVXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObFhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlNrb0tTeGNiaUFnSUNCbWIzSnRSR0YwWVRvZ0owWnZjbTFFWVhSaEp5QnBiaUJ6Wld4bUxGeHVJQ0FnSUdGeWNtRjVRblZtWm1WeU9pQW5RWEp5WVhsQ2RXWm1aWEluSUdsdUlITmxiR1pjYmlBZ2ZWeHVYRzRnSUdsbUlDaHpkWEJ3YjNKMExtRnljbUY1UW5WbVptVnlLU0I3WEc0Z0lDQWdkbUZ5SUhacFpYZERiR0Z6YzJWeklEMGdXMXh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdTVzUwT0VGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JWYVc1ME9FRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCVmFXNTBPRU5zWVcxd1pXUkJjbkpoZVYwbkxGeHVJQ0FnSUNBZ0oxdHZZbXBsWTNRZ1NXNTBNVFpCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdWV2x1ZERFMlFYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUVsdWRETXlRWEp5WVhsZEp5eGNiaUFnSUNBZ0lDZGJiMkpxWldOMElGVnBiblF6TWtGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JHYkc5aGRETXlRWEp5WVhsZEp5eGNiaUFnSUNBZ0lDZGJiMkpxWldOMElFWnNiMkYwTmpSQmNuSmhlVjBuWEc0Z0lDQWdYVnh1WEc0Z0lDQWdkbUZ5SUdselJHRjBZVlpwWlhjZ1BTQm1kVzVqZEdsdmJpaHZZbW9wSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ2WW1vZ0ppWWdSR0YwWVZacFpYY3VjSEp2ZEc5MGVYQmxMbWx6VUhKdmRHOTBlWEJsVDJZb2IySnFLVnh1SUNBZ0lIMWNibHh1SUNBZ0lIWmhjaUJwYzBGeWNtRjVRblZtWm1WeVZtbGxkeUE5SUVGeWNtRjVRblZtWm1WeUxtbHpWbWxsZHlCOGZDQm1kVzVqZEdsdmJpaHZZbW9wSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ2WW1vZ0ppWWdkbWxsZDBOc1lYTnpaWE11YVc1a1pYaFBaaWhQWW1wbFkzUXVjSEp2ZEc5MGVYQmxMblJ2VTNSeWFXNW5MbU5oYkd3b2IySnFLU2tnUGlBdE1WeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHNXZjbTFoYkdsNlpVNWhiV1VvYm1GdFpTa2dlMXh1SUNBZ0lHbG1JQ2gwZVhCbGIyWWdibUZ0WlNBaFBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJRzVoYldVZ1BTQlRkSEpwYm1jb2JtRnRaU2xjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLQzliWG1FdGVqQXRPVnhjTFNNa0pTWW5LaXN1WEZ4ZVgyQjhmbDB2YVM1MFpYTjBLRzVoYldVcEtTQjdYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2RKYm5aaGJHbGtJR05vWVhKaFkzUmxjaUJwYmlCb1pXRmtaWElnWm1sbGJHUWdibUZ0WlNjcFhHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnVZVzFsTG5SdlRHOTNaWEpEWVhObEtDbGNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJRzV2Y20xaGJHbDZaVlpoYkhWbEtIWmhiSFZsS1NCN1hHNGdJQ0FnYVdZZ0tIUjVjR1Z2WmlCMllXeDFaU0FoUFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lIWmhiSFZsSUQwZ1UzUnlhVzVuS0haaGJIVmxLVnh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnZG1Gc2RXVmNiaUFnZlZ4dVhHNGdJQzh2SUVKMWFXeGtJR0VnWkdWemRISjFZM1JwZG1VZ2FYUmxjbUYwYjNJZ1ptOXlJSFJvWlNCMllXeDFaU0JzYVhOMFhHNGdJR1oxYm1OMGFXOXVJR2wwWlhKaGRHOXlSbTl5S0dsMFpXMXpLU0I3WEc0Z0lDQWdkbUZ5SUdsMFpYSmhkRzl5SUQwZ2UxeHVJQ0FnSUNBZ2JtVjRkRG9nWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUIyWVd4MVpTQTlJR2wwWlcxekxuTm9hV1owS0NsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUh0a2IyNWxPaUIyWVd4MVpTQTlQVDBnZFc1a1pXWnBibVZrTENCMllXeDFaVG9nZG1Gc2RXVjlYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXWWdLSE4xY0hCdmNuUXVhWFJsY21GaWJHVXBJSHRjYmlBZ0lDQWdJR2wwWlhKaGRHOXlXMU41YldKdmJDNXBkR1Z5WVhSdmNsMGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdsMFpYSmhkRzl5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVYwZFhKdUlHbDBaWEpoZEc5eVhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQklaV0ZrWlhKektHaGxZV1JsY25NcElIdGNiaUFnSUNCMGFHbHpMbTFoY0NBOUlIdDlYRzVjYmlBZ0lDQnBaaUFvYUdWaFpHVnljeUJwYm5OMFlXNWpaVzltSUVobFlXUmxjbk1wSUh0Y2JpQWdJQ0FnSUdobFlXUmxjbk11Wm05eVJXRmphQ2htZFc1amRHbHZiaWgyWVd4MVpTd2dibUZ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1Gd2NHVnVaQ2h1WVcxbExDQjJZV3gxWlNsY2JpQWdJQ0FnSUgwc0lIUm9hWE1wWEc0Z0lDQWdmU0JsYkhObElHbG1JQ2hCY25KaGVTNXBjMEZ5Y21GNUtHaGxZV1JsY25NcEtTQjdYRzRnSUNBZ0lDQm9aV0ZrWlhKekxtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2FHVmhaR1Z5S1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WVhCd1pXNWtLR2hsWVdSbGNsc3dYU3dnYUdWaFpHVnlXekZkS1Z4dUlDQWdJQ0FnZlN3Z2RHaHBjeWxjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLR2hsWVdSbGNuTXBJSHRjYmlBZ0lDQWdJRTlpYW1WamRDNW5aWFJQZDI1UWNtOXdaWEowZVU1aGJXVnpLR2hsWVdSbGNuTXBMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9ibUZ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1Gd2NHVnVaQ2h1WVcxbExDQm9aV0ZrWlhKelcyNWhiV1ZkS1Z4dUlDQWdJQ0FnZlN3Z2RHaHBjeWxjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzVoY0hCbGJtUWdQU0JtZFc1amRHbHZiaWh1WVcxbExDQjJZV3gxWlNrZ2UxeHVJQ0FnSUc1aGJXVWdQU0J1YjNKdFlXeHBlbVZPWVcxbEtHNWhiV1VwWEc0Z0lDQWdkbUZzZFdVZ1BTQnViM0p0WVd4cGVtVldZV3gxWlNoMllXeDFaU2xjYmlBZ0lDQjJZWElnYjJ4a1ZtRnNkV1VnUFNCMGFHbHpMbTFoY0Z0dVlXMWxYVnh1SUNBZ0lIUm9hWE11YldGd1cyNWhiV1ZkSUQwZ2IyeGtWbUZzZFdVZ1B5QnZiR1JXWVd4MVpTc25MQ2NyZG1Gc2RXVWdPaUIyWVd4MVpWeHVJQ0I5WEc1Y2JpQWdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVmJKMlJsYkdWMFpTZGRJRDBnWm5WdVkzUnBiMjRvYm1GdFpTa2dlMXh1SUNBZ0lHUmxiR1YwWlNCMGFHbHpMbTFoY0Z0dWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcFhWeHVJQ0I5WEc1Y2JpQWdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVXVaMlYwSUQwZ1puVnVZM1JwYjI0b2JtRnRaU2tnZTF4dUlDQWdJRzVoYldVZ1BTQnViM0p0WVd4cGVtVk9ZVzFsS0c1aGJXVXBYRzRnSUNBZ2NtVjBkWEp1SUhSb2FYTXVhR0Z6S0c1aGJXVXBJRDhnZEdocGN5NXRZWEJiYm1GdFpWMGdPaUJ1ZFd4c1hHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNW9ZWE1nUFNCbWRXNWpkR2x2YmlodVlXMWxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11YldGd0xtaGhjMDkzYmxCeWIzQmxjblI1S0c1dmNtMWhiR2w2WlU1aGJXVW9ibUZ0WlNrcFhHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNXpaWFFnUFNCbWRXNWpkR2x2YmlodVlXMWxMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lIUm9hWE11YldGd1cyNXZjbTFoYkdsNlpVNWhiV1VvYm1GdFpTbGRJRDBnYm05eWJXRnNhWHBsVm1Gc2RXVW9kbUZzZFdVcFhHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNW1iM0pGWVdOb0lEMGdablZ1WTNScGIyNG9ZMkZzYkdKaFkyc3NJSFJvYVhOQmNtY3BJSHRjYmlBZ0lDQm1iM0lnS0haaGNpQnVZVzFsSUdsdUlIUm9hWE11YldGd0tTQjdYRzRnSUNBZ0lDQnBaaUFvZEdocGN5NXRZWEF1YUdGelQzZHVVSEp2Y0dWeWRIa29ibUZ0WlNrcElIdGNiaUFnSUNBZ0lDQWdZMkZzYkdKaFkyc3VZMkZzYkNoMGFHbHpRWEpuTENCMGFHbHpMbTFoY0Z0dVlXMWxYU3dnYm1GdFpTd2dkR2hwY3lsY2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNCSVpXRmtaWEp6TG5CeWIzUnZkSGx3WlM1clpYbHpJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnZG1GeUlHbDBaVzF6SUQwZ1cxMWNiaUFnSUNCMGFHbHpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9kbUZzZFdVc0lHNWhiV1VwSUhzZ2FYUmxiWE11Y0hWemFDaHVZVzFsS1NCOUtWeHVJQ0FnSUhKbGRIVnliaUJwZEdWeVlYUnZja1p2Y2locGRHVnRjeWxjYmlBZ2ZWeHVYRzRnSUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsTG5aaGJIVmxjeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUhaaGNpQnBkR1Z0Y3lBOUlGdGRYRzRnSUNBZ2RHaHBjeTVtYjNKRllXTm9LR1oxYm1OMGFXOXVLSFpoYkhWbEtTQjdJR2wwWlcxekxuQjFjMmdvZG1Gc2RXVXBJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHbDBaWEpoZEc5eVJtOXlLR2wwWlcxektWeHVJQ0I5WEc1Y2JpQWdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVXVaVzUwY21sbGN5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJSFpoY2lCcGRHVnRjeUE5SUZ0ZFhHNGdJQ0FnZEdocGN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3SUdsMFpXMXpMbkIxYzJnb1cyNWhiV1VzSUhaaGJIVmxYU2tnZlNsY2JpQWdJQ0J5WlhSMWNtNGdhWFJsY21GMGIzSkdiM0lvYVhSbGJYTXBYRzRnSUgxY2JseHVJQ0JwWmlBb2MzVndjRzl5ZEM1cGRHVnlZV0pzWlNrZ2UxeHVJQ0FnSUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsVzFONWJXSnZiQzVwZEdWeVlYUnZjbDBnUFNCSVpXRmtaWEp6TG5CeWIzUnZkSGx3WlM1bGJuUnlhV1Z6WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCamIyNXpkVzFsWkNoaWIyUjVLU0I3WEc0Z0lDQWdhV1lnS0dKdlpIa3VZbTlrZVZWelpXUXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxhbVZqZENodVpYY2dWSGx3WlVWeWNtOXlLQ2RCYkhKbFlXUjVJSEpsWVdRbktTbGNiaUFnSUNCOVhHNGdJQ0FnWW05a2VTNWliMlI1VlhObFpDQTlJSFJ5ZFdWY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHWnBiR1ZTWldGa1pYSlNaV0ZrZVNoeVpXRmtaWElwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZCeWIyMXBjMlVvWm5WdVkzUnBiMjRvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdJQ0J5WldGa1pYSXViMjVzYjJGa0lEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGMyOXNkbVVvY21WaFpHVnlMbkpsYzNWc2RDbGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lISmxZV1JsY2k1dmJtVnljbTl5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSEpsYW1WamRDaHlaV0ZrWlhJdVpYSnliM0lwWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU2xjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUhKbFlXUkNiRzlpUVhOQmNuSmhlVUoxWm1abGNpaGliRzlpS1NCN1hHNGdJQ0FnZG1GeUlISmxZV1JsY2lBOUlHNWxkeUJHYVd4bFVtVmhaR1Z5S0NsY2JpQWdJQ0IyWVhJZ2NISnZiV2x6WlNBOUlHWnBiR1ZTWldGa1pYSlNaV0ZrZVNoeVpXRmtaWElwWEc0Z0lDQWdjbVZoWkdWeUxuSmxZV1JCYzBGeWNtRjVRblZtWm1WeUtHSnNiMklwWEc0Z0lDQWdjbVYwZFhKdUlIQnliMjFwYzJWY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlISmxZV1JDYkc5aVFYTlVaWGgwS0dKc2IySXBJSHRjYmlBZ0lDQjJZWElnY21WaFpHVnlJRDBnYm1WM0lFWnBiR1ZTWldGa1pYSW9LVnh1SUNBZ0lIWmhjaUJ3Y205dGFYTmxJRDBnWm1sc1pWSmxZV1JsY2xKbFlXUjVLSEpsWVdSbGNpbGNiaUFnSUNCeVpXRmtaWEl1Y21WaFpFRnpWR1Y0ZENoaWJHOWlLVnh1SUNBZ0lISmxkSFZ5YmlCd2NtOXRhWE5sWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCeVpXRmtRWEp5WVhsQ2RXWm1aWEpCYzFSbGVIUW9ZblZtS1NCN1hHNGdJQ0FnZG1GeUlIWnBaWGNnUFNCdVpYY2dWV2x1ZERoQmNuSmhlU2hpZFdZcFhHNGdJQ0FnZG1GeUlHTm9ZWEp6SUQwZ2JtVjNJRUZ5Y21GNUtIWnBaWGN1YkdWdVozUm9LVnh1WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0IyYVdWM0xteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0JqYUdGeWMxdHBYU0E5SUZOMGNtbHVaeTVtY205dFEyaGhja052WkdVb2RtbGxkMXRwWFNsY2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHTm9ZWEp6TG1wdmFXNG9KeWNwWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCaWRXWm1aWEpEYkc5dVpTaGlkV1lwSUh0Y2JpQWdJQ0JwWmlBb1luVm1Mbk5zYVdObEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1luVm1Mbk5zYVdObEtEQXBYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUhaaGNpQjJhV1YzSUQwZ2JtVjNJRlZwYm5RNFFYSnlZWGtvWW5WbUxtSjVkR1ZNWlc1bmRHZ3BYRzRnSUNBZ0lDQjJhV1YzTG5ObGRDaHVaWGNnVldsdWREaEJjbkpoZVNoaWRXWXBLVnh1SUNBZ0lDQWdjbVYwZFhKdUlIWnBaWGN1WW5WbVptVnlYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdRbTlrZVNncElIdGNiaUFnSUNCMGFHbHpMbUp2WkhsVmMyVmtJRDBnWm1Gc2MyVmNibHh1SUNBZ0lIUm9hWE11WDJsdWFYUkNiMlI1SUQwZ1puVnVZM1JwYjI0b1ltOWtlU2tnZTF4dUlDQWdJQ0FnZEdocGN5NWZZbTlrZVVsdWFYUWdQU0JpYjJSNVhHNGdJQ0FnSUNCcFppQW9JV0p2WkhrcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ZlltOWtlVlJsZUhRZ1BTQW5KMXh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2gwZVhCbGIyWWdZbTlrZVNBOVBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWZZbTlrZVZSbGVIUWdQU0JpYjJSNVhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITjFjSEJ2Y25RdVlteHZZaUFtSmlCQ2JHOWlMbkJ5YjNSdmRIbHdaUzVwYzFCeWIzUnZkSGx3WlU5bUtHSnZaSGtwS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbENiRzlpSUQwZ1ltOWtlVnh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2h6ZFhCd2IzSjBMbVp2Y20xRVlYUmhJQ1ltSUVadmNtMUVZWFJoTG5CeWIzUnZkSGx3WlM1cGMxQnliM1J2ZEhsd1pVOW1LR0p2WkhrcEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxHYjNKdFJHRjBZU0E5SUdKdlpIbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNXpaV0Z5WTJoUVlYSmhiWE1nSmlZZ1ZWSk1VMlZoY21Ob1VHRnlZVzF6TG5CeWIzUnZkSGx3WlM1cGMxQnliM1J2ZEhsd1pVOW1LR0p2WkhrcEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxVWlhoMElEMGdZbTlrZVM1MGIxTjBjbWx1WnlncFhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITjFjSEJ2Y25RdVlYSnlZWGxDZFdabVpYSWdKaVlnYzNWd2NHOXlkQzVpYkc5aUlDWW1JR2x6UkdGMFlWWnBaWGNvWW05a2VTa3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUlEMGdZblZtWm1WeVEyeHZibVVvWW05a2VTNWlkV1ptWlhJcFhHNGdJQ0FnSUNBZ0lDOHZJRWxGSURFd0xURXhJR05oYmlkMElHaGhibVJzWlNCaElFUmhkR0ZXYVdWM0lHSnZaSGt1WEc0Z0lDQWdJQ0FnSUhSb2FYTXVYMkp2WkhsSmJtbDBJRDBnYm1WM0lFSnNiMklvVzNSb2FYTXVYMkp2WkhsQmNuSmhlVUoxWm1abGNsMHBYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE4xY0hCdmNuUXVZWEp5WVhsQ2RXWm1aWElnSmlZZ0tFRnljbUY1UW5WbVptVnlMbkJ5YjNSdmRIbHdaUzVwYzFCeWIzUnZkSGx3WlU5bUtHSnZaSGtwSUh4OElHbHpRWEp5WVhsQ2RXWm1aWEpXYVdWM0tHSnZaSGtwS1NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVRWEp5WVhsQ2RXWm1aWElnUFNCaWRXWm1aWEpEYkc5dVpTaGliMlI1S1Z4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2QxYm5OMWNIQnZjblJsWkNCQ2IyUjVTVzVwZENCMGVYQmxKeWxjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tDRjBhR2x6TG1obFlXUmxjbk11WjJWMEtDZGpiMjUwWlc1MExYUjVjR1VuS1NrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JR0p2WkhrZ1BUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeTVvWldGa1pYSnpMbk5sZENnblkyOXVkR1Z1ZEMxMGVYQmxKeXdnSjNSbGVIUXZjR3hoYVc0N1kyaGhjbk5sZEQxVlZFWXRPQ2NwWEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2RHaHBjeTVmWW05a2VVSnNiMklnSmlZZ2RHaHBjeTVmWW05a2VVSnNiMkl1ZEhsd1pTa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXVhR1ZoWkdWeWN5NXpaWFFvSjJOdmJuUmxiblF0ZEhsd1pTY3NJSFJvYVhNdVgySnZaSGxDYkc5aUxuUjVjR1VwWEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzVndjRzl5ZEM1elpXRnlZMmhRWVhKaGJYTWdKaVlnVlZKTVUyVmhjbU5vVUdGeVlXMXpMbkJ5YjNSdmRIbHdaUzVwYzFCeWIzUnZkSGx3WlU5bUtHSnZaSGtwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkR2hwY3k1b1pXRmtaWEp6TG5ObGRDZ25ZMjl1ZEdWdWRDMTBlWEJsSnl3Z0oyRndjR3hwWTJGMGFXOXVMM2d0ZDNkM0xXWnZjbTB0ZFhKc1pXNWpiMlJsWkR0amFHRnljMlYwUFZWVVJpMDRKeWxjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJR2xtSUNoemRYQndiM0owTG1Kc2IySXBJSHRjYmlBZ0lDQWdJSFJvYVhNdVlteHZZaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnY21WcVpXTjBaV1FnUFNCamIyNXpkVzFsWkNoMGFHbHpLVnh1SUNBZ0lDQWdJQ0JwWmlBb2NtVnFaV04wWldRcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdjbVZxWldOMFpXUmNiaUFnSUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0FnSUdsbUlDaDBhR2x6TGw5aWIyUjVRbXh2WWlrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxjMjlzZG1Vb2RHaHBjeTVmWW05a2VVSnNiMklwWEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2h1WlhjZ1FteHZZaWhiZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeVhTa3BYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvZEdocGN5NWZZbTlrZVVadmNtMUVZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZGpiM1ZzWkNCdWIzUWdjbVZoWkNCR2IzSnRSR0YwWVNCaWIyUjVJR0Z6SUdKc2IySW5LVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9ibVYzSUVKc2IySW9XM1JvYVhNdVgySnZaSGxVWlhoMFhTa3BYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZEdocGN5NWhjbkpoZVVKMVptWmxjaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUtTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR052Ym5OMWJXVmtLSFJvYVhNcElIeDhJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTaDBhR2x6TGw5aWIyUjVRWEp5WVhsQ2RXWm1aWElwWEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTXVZbXh2WWlncExuUm9aVzRvY21WaFpFSnNiMkpCYzBGeWNtRjVRblZtWm1WeUtWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RHaHBjeTUwWlhoMElEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0IyWVhJZ2NtVnFaV04wWldRZ1BTQmpiMjV6ZFcxbFpDaDBhR2x6S1Z4dUlDQWdJQ0FnYVdZZ0tISmxhbVZqZEdWa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV3BsWTNSbFpGeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaUFvZEdocGN5NWZZbTlrZVVKc2IySXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSEpsWVdSQ2JHOWlRWE5VWlhoMEtIUm9hWE11WDJKdlpIbENiRzlpS1Z4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMGFHbHpMbDlpYjJSNVFYSnlZWGxDZFdabVpYSXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTaHlaV0ZrUVhKeVlYbENkV1ptWlhKQmMxUmxlSFFvZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUtTbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9kR2hwY3k1ZlltOWtlVVp2Y20xRVlYUmhLU0I3WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduWTI5MWJHUWdibTkwSUhKbFlXUWdSbTl5YlVSaGRHRWdZbTlrZVNCaGN5QjBaWGgwSnlsY2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9kR2hwY3k1ZlltOWtlVlJsZUhRcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnYVdZZ0tITjFjSEJ2Y25RdVptOXliVVJoZEdFcElIdGNiaUFnSUNBZ0lIUm9hWE11Wm05eWJVUmhkR0VnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11ZEdWNGRDZ3BMblJvWlc0b1pHVmpiMlJsS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJSFJvYVhNdWFuTnZiaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTXVkR1Y0ZENncExuUm9aVzRvU2xOUFRpNXdZWEp6WlNsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwYzF4dUlDQjlYRzVjYmlBZ0x5OGdTRlJVVUNCdFpYUm9iMlJ6SUhkb2IzTmxJR05oY0dsMFlXeHBlbUYwYVc5dUlITm9iM1ZzWkNCaVpTQnViM0p0WVd4cGVtVmtYRzRnSUhaaGNpQnRaWFJvYjJSeklEMGdXeWRFUlV4RlZFVW5MQ0FuUjBWVUp5d2dKMGhGUVVRbkxDQW5UMUJVU1U5T1V5Y3NJQ2RRVDFOVUp5d2dKMUJWVkNkZFhHNWNiaUFnWm5WdVkzUnBiMjRnYm05eWJXRnNhWHBsVFdWMGFHOWtLRzFsZEdodlpDa2dlMXh1SUNBZ0lIWmhjaUIxY0dOaGMyVmtJRDBnYldWMGFHOWtMblJ2VlhCd1pYSkRZWE5sS0NsY2JpQWdJQ0J5WlhSMWNtNGdLRzFsZEdodlpITXVhVzVrWlhoUFppaDFjR05oYzJWa0tTQStJQzB4S1NBL0lIVndZMkZ6WldRZ09pQnRaWFJvYjJSY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlGSmxjWFZsYzNRb2FXNXdkWFFzSUc5d2RHbHZibk1wSUh0Y2JpQWdJQ0J2Y0hScGIyNXpJRDBnYjNCMGFXOXVjeUI4ZkNCN2ZWeHVJQ0FnSUhaaGNpQmliMlI1SUQwZ2IzQjBhVzl1Y3k1aWIyUjVYRzVjYmlBZ0lDQnBaaUFvYVc1d2RYUWdhVzV6ZEdGdVkyVnZaaUJTWlhGMVpYTjBLU0I3WEc0Z0lDQWdJQ0JwWmlBb2FXNXdkWFF1WW05a2VWVnpaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25RV3h5WldGa2VTQnlaV0ZrSnlsY2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhSb2FYTXVkWEpzSUQwZ2FXNXdkWFF1ZFhKc1hHNGdJQ0FnSUNCMGFHbHpMbU55WldSbGJuUnBZV3h6SUQwZ2FXNXdkWFF1WTNKbFpHVnVkR2xoYkhOY2JpQWdJQ0FnSUdsbUlDZ2hiM0IwYVc5dWN5NW9aV0ZrWlhKektTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWFHVmhaR1Z5Y3lBOUlHNWxkeUJJWldGa1pYSnpLR2x1Y0hWMExtaGxZV1JsY25NcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCMGFHbHpMbTFsZEdodlpDQTlJR2x1Y0hWMExtMWxkR2h2WkZ4dUlDQWdJQ0FnZEdocGN5NXRiMlJsSUQwZ2FXNXdkWFF1Ylc5a1pWeHVJQ0FnSUNBZ2FXWWdLQ0ZpYjJSNUlDWW1JR2x1Y0hWMExsOWliMlI1U1c1cGRDQWhQU0J1ZFd4c0tTQjdYRzRnSUNBZ0lDQWdJR0p2WkhrZ1BTQnBibkIxZEM1ZlltOWtlVWx1YVhSY2JpQWdJQ0FnSUNBZ2FXNXdkWFF1WW05a2VWVnpaV1FnUFNCMGNuVmxYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUhSb2FYTXVkWEpzSUQwZ1UzUnlhVzVuS0dsdWNIVjBLVnh1SUNBZ0lIMWNibHh1SUNBZ0lIUm9hWE11WTNKbFpHVnVkR2xoYkhNZ1BTQnZjSFJwYjI1ekxtTnlaV1JsYm5ScFlXeHpJSHg4SUhSb2FYTXVZM0psWkdWdWRHbGhiSE1nZkh3Z0oyOXRhWFFuWEc0Z0lDQWdhV1lnS0c5d2RHbHZibk11YUdWaFpHVnljeUI4ZkNBaGRHaHBjeTVvWldGa1pYSnpLU0I3WEc0Z0lDQWdJQ0IwYUdsekxtaGxZV1JsY25NZ1BTQnVaWGNnU0dWaFpHVnljeWh2Y0hScGIyNXpMbWhsWVdSbGNuTXBYRzRnSUNBZ2ZWeHVJQ0FnSUhSb2FYTXViV1YwYUc5a0lEMGdibTl5YldGc2FYcGxUV1YwYUc5a0tHOXdkR2x2Ym5NdWJXVjBhRzlrSUh4OElIUm9hWE11YldWMGFHOWtJSHg4SUNkSFJWUW5LVnh1SUNBZ0lIUm9hWE11Ylc5a1pTQTlJRzl3ZEdsdmJuTXViVzlrWlNCOGZDQjBhR2x6TG0xdlpHVWdmSHdnYm5Wc2JGeHVJQ0FnSUhSb2FYTXVjbVZtWlhKeVpYSWdQU0J1ZFd4c1hHNWNiaUFnSUNCcFppQW9LSFJvYVhNdWJXVjBhRzlrSUQwOVBTQW5SMFZVSnlCOGZDQjBhR2x6TG0xbGRHaHZaQ0E5UFQwZ0owaEZRVVFuS1NBbUppQmliMlI1S1NCN1hHNGdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1ZIbHdaVVZ5Y205eUtDZENiMlI1SUc1dmRDQmhiR3h2ZDJWa0lHWnZjaUJIUlZRZ2IzSWdTRVZCUkNCeVpYRjFaWE4wY3ljcFhHNGdJQ0FnZlZ4dUlDQWdJSFJvYVhNdVgybHVhWFJDYjJSNUtHSnZaSGtwWEc0Z0lIMWNibHh1SUNCU1pYRjFaWE4wTG5CeWIzUnZkSGx3WlM1amJHOXVaU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ1WlhjZ1VtVnhkV1Z6ZENoMGFHbHpMQ0I3SUdKdlpIazZJSFJvYVhNdVgySnZaSGxKYm1sMElIMHBYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJrWldOdlpHVW9ZbTlrZVNrZ2UxeHVJQ0FnSUhaaGNpQm1iM0p0SUQwZ2JtVjNJRVp2Y20xRVlYUmhLQ2xjYmlBZ0lDQmliMlI1TG5SeWFXMG9LUzV6Y0d4cGRDZ25KaWNwTG1admNrVmhZMmdvWm5WdVkzUnBiMjRvWW5sMFpYTXBJSHRjYmlBZ0lDQWdJR2xtSUNoaWVYUmxjeWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdjM0JzYVhRZ1BTQmllWFJsY3k1emNHeHBkQ2duUFNjcFhHNGdJQ0FnSUNBZ0lIWmhjaUJ1WVcxbElEMGdjM0JzYVhRdWMyaHBablFvS1M1eVpYQnNZV05sS0M5Y1hDc3ZaeXdnSnlBbktWeHVJQ0FnSUNBZ0lDQjJZWElnZG1Gc2RXVWdQU0J6Y0d4cGRDNXFiMmx1S0NjOUp5a3VjbVZ3YkdGalpTZ3ZYRndyTDJjc0lDY2dKeWxjYmlBZ0lDQWdJQ0FnWm05eWJTNWhjSEJsYm1Rb1pHVmpiMlJsVlZKSlEyOXRjRzl1Wlc1MEtHNWhiV1VwTENCa1pXTnZaR1ZWVWtsRGIyMXdiMjVsYm5Rb2RtRnNkV1VwS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHWnZjbTFjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUhCaGNuTmxTR1ZoWkdWeWN5aHlZWGRJWldGa1pYSnpLU0I3WEc0Z0lDQWdkbUZ5SUdobFlXUmxjbk1nUFNCdVpYY2dTR1ZoWkdWeWN5Z3BYRzRnSUNBZ2NtRjNTR1ZoWkdWeWN5NXpjR3hwZENndlhGeHlQMXhjYmk4cExtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2JHbHVaU2tnZTF4dUlDQWdJQ0FnZG1GeUlIQmhjblJ6SUQwZ2JHbHVaUzV6Y0d4cGRDZ25PaWNwWEc0Z0lDQWdJQ0IyWVhJZ2EyVjVJRDBnY0dGeWRITXVjMmhwWm5Rb0tTNTBjbWx0S0NsY2JpQWdJQ0FnSUdsbUlDaHJaWGtwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdjR0Z5ZEhNdWFtOXBiaWduT2ljcExuUnlhVzBvS1Z4dUlDQWdJQ0FnSUNCb1pXRmtaWEp6TG1Gd2NHVnVaQ2hyWlhrc0lIWmhiSFZsS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHaGxZV1JsY25OY2JpQWdmVnh1WEc0Z0lFSnZaSGt1WTJGc2JDaFNaWEYxWlhOMExuQnliM1J2ZEhsd1pTbGNibHh1SUNCbWRXNWpkR2x2YmlCU1pYTndiMjV6WlNoaWIyUjVTVzVwZEN3Z2IzQjBhVzl1Y3lrZ2UxeHVJQ0FnSUdsbUlDZ2hiM0IwYVc5dWN5a2dlMXh1SUNBZ0lDQWdiM0IwYVc5dWN5QTlJSHQ5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkR2hwY3k1MGVYQmxJRDBnSjJSbFptRjFiSFFuWEc0Z0lDQWdkR2hwY3k1emRHRjBkWE1nUFNBbmMzUmhkSFZ6SnlCcGJpQnZjSFJwYjI1eklEOGdiM0IwYVc5dWN5NXpkR0YwZFhNZ09pQXlNREJjYmlBZ0lDQjBhR2x6TG05cklEMGdkR2hwY3k1emRHRjBkWE1nUGowZ01qQXdJQ1ltSUhSb2FYTXVjM1JoZEhWeklEd2dNekF3WEc0Z0lDQWdkR2hwY3k1emRHRjBkWE5VWlhoMElEMGdKM04wWVhSMWMxUmxlSFFuSUdsdUlHOXdkR2x2Ym5NZ1B5QnZjSFJwYjI1ekxuTjBZWFIxYzFSbGVIUWdPaUFuVDBzblhHNGdJQ0FnZEdocGN5NW9aV0ZrWlhKeklEMGdibVYzSUVobFlXUmxjbk1vYjNCMGFXOXVjeTVvWldGa1pYSnpLVnh1SUNBZ0lIUm9hWE11ZFhKc0lEMGdiM0IwYVc5dWN5NTFjbXdnZkh3Z0p5ZGNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU2hpYjJSNVNXNXBkQ2xjYmlBZ2ZWeHVYRzRnSUVKdlpIa3VZMkZzYkNoU1pYTndiMjV6WlM1d2NtOTBiM1I1Y0dVcFhHNWNiaUFnVW1WemNHOXVjMlV1Y0hKdmRHOTBlWEJsTG1Oc2IyNWxJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCU1pYTndiMjV6WlNoMGFHbHpMbDlpYjJSNVNXNXBkQ3dnZTF4dUlDQWdJQ0FnYzNSaGRIVnpPaUIwYUdsekxuTjBZWFIxY3l4Y2JpQWdJQ0FnSUhOMFlYUjFjMVJsZUhRNklIUm9hWE11YzNSaGRIVnpWR1Y0ZEN4Y2JpQWdJQ0FnSUdobFlXUmxjbk02SUc1bGR5QklaV0ZrWlhKektIUm9hWE11YUdWaFpHVnljeWtzWEc0Z0lDQWdJQ0IxY213NklIUm9hWE11ZFhKc1hHNGdJQ0FnZlNsY2JpQWdmVnh1WEc0Z0lGSmxjM0J2Ym5ObExtVnljbTl5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2RtRnlJSEpsYzNCdmJuTmxJRDBnYm1WM0lGSmxjM0J2Ym5ObEtHNTFiR3dzSUh0emRHRjBkWE02SURBc0lITjBZWFIxYzFSbGVIUTZJQ2NuZlNsY2JpQWdJQ0J5WlhOd2IyNXpaUzUwZVhCbElEMGdKMlZ5Y205eUoxeHVJQ0FnSUhKbGRIVnliaUJ5WlhOd2IyNXpaVnh1SUNCOVhHNWNiaUFnZG1GeUlISmxaR2x5WldOMFUzUmhkSFZ6WlhNZ1BTQmJNekF4TENBek1ESXNJRE13TXl3Z016QTNMQ0F6TURoZFhHNWNiaUFnVW1WemNHOXVjMlV1Y21Wa2FYSmxZM1FnUFNCbWRXNWpkR2x2YmloMWNtd3NJSE4wWVhSMWN5a2dlMXh1SUNBZ0lHbG1JQ2h5WldScGNtVmpkRk4wWVhSMWMyVnpMbWx1WkdWNFQyWW9jM1JoZEhWektTQTlQVDBnTFRFcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlNZVzVuWlVWeWNtOXlLQ2RKYm5aaGJHbGtJSE4wWVhSMWN5QmpiMlJsSnlsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGMzQnZibk5sS0c1MWJHd3NJSHR6ZEdGMGRYTTZJSE4wWVhSMWN5d2dhR1ZoWkdWeWN6b2dlMnh2WTJGMGFXOXVPaUIxY214OWZTbGNiaUFnZlZ4dVhHNGdJSE5sYkdZdVNHVmhaR1Z5Y3lBOUlFaGxZV1JsY25OY2JpQWdjMlZzWmk1U1pYRjFaWE4wSUQwZ1VtVnhkV1Z6ZEZ4dUlDQnpaV3htTGxKbGMzQnZibk5sSUQwZ1VtVnpjRzl1YzJWY2JseHVJQ0J6Wld4bUxtWmxkR05vSUQwZ1puVnVZM1JwYjI0b2FXNXdkWFFzSUdsdWFYUXBJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQjJZWElnY21WeGRXVnpkQ0E5SUc1bGR5QlNaWEYxWlhOMEtHbHVjSFYwTENCcGJtbDBLVnh1SUNBZ0lDQWdkbUZ5SUhob2NpQTlJRzVsZHlCWVRVeElkSFJ3VW1WeGRXVnpkQ2dwWEc1Y2JpQWdJQ0FnSUhob2NpNXZibXh2WVdRZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHOXdkR2x2Ym5NZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnYzNSaGRIVnpPaUI0YUhJdWMzUmhkSFZ6TEZ4dUlDQWdJQ0FnSUNBZ0lITjBZWFIxYzFSbGVIUTZJSGhvY2k1emRHRjBkWE5VWlhoMExGeHVJQ0FnSUNBZ0lDQWdJR2hsWVdSbGNuTTZJSEJoY25ObFNHVmhaR1Z5Y3loNGFISXVaMlYwUVd4c1VtVnpjRzl1YzJWSVpXRmtaWEp6S0NrZ2ZId2dKeWNwWEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2IzQjBhVzl1Y3k1MWNtd2dQU0FuY21WemNHOXVjMlZWVWt3bklHbHVJSGhvY2lBL0lIaG9jaTV5WlhOd2IyNXpaVlZTVENBNklHOXdkR2x2Ym5NdWFHVmhaR1Z5Y3k1blpYUW9KMWd0VW1WeGRXVnpkQzFWVWt3bktWeHVJQ0FnSUNBZ0lDQjJZWElnWW05a2VTQTlJQ2R5WlhOd2IyNXpaU2NnYVc0Z2VHaHlJRDhnZUdoeUxuSmxjM0J2Ym5ObElEb2dlR2h5TG5KbGMzQnZibk5sVkdWNGRGeHVJQ0FnSUNBZ0lDQnlaWE52YkhabEtHNWxkeUJTWlhOd2IyNXpaU2hpYjJSNUxDQnZjSFJwYjI1ektTbGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdlR2h5TG05dVpYSnliM0lnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVZxWldOMEtHNWxkeUJVZVhCbFJYSnliM0lvSjA1bGRIZHZjbXNnY21WeGRXVnpkQ0JtWVdsc1pXUW5LU2xjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZUdoeUxtOXVkR2x0Wlc5MWRDQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25UbVYwZDI5eWF5QnlaWEYxWlhOMElHWmhhV3hsWkNjcEtWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjRhSEl1YjNCbGJpaHlaWEYxWlhOMExtMWxkR2h2WkN3Z2NtVnhkV1Z6ZEM1MWNtd3NJSFJ5ZFdVcFhHNWNiaUFnSUNBZ0lHbG1JQ2h5WlhGMVpYTjBMbU55WldSbGJuUnBZV3h6SUQwOVBTQW5hVzVqYkhWa1pTY3BJSHRjYmlBZ0lDQWdJQ0FnZUdoeUxuZHBkR2hEY21Wa1pXNTBhV0ZzY3lBOUlIUnlkV1ZjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tDZHlaWE53YjI1elpWUjVjR1VuSUdsdUlIaG9jaUFtSmlCemRYQndiM0owTG1Kc2IySXBJSHRjYmlBZ0lDQWdJQ0FnZUdoeUxuSmxjM0J2Ym5ObFZIbHdaU0E5SUNkaWJHOWlKMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0J5WlhGMVpYTjBMbWhsWVdSbGNuTXVabTl5UldGamFDaG1kVzVqZEdsdmJpaDJZV3gxWlN3Z2JtRnRaU2tnZTF4dUlDQWdJQ0FnSUNCNGFISXVjMlYwVW1WeGRXVnpkRWhsWVdSbGNpaHVZVzFsTENCMllXeDFaU2xjYmlBZ0lDQWdJSDBwWEc1Y2JpQWdJQ0FnSUhob2NpNXpaVzVrS0hSNWNHVnZaaUJ5WlhGMVpYTjBMbDlpYjJSNVNXNXBkQ0E5UFQwZ0ozVnVaR1ZtYVc1bFpDY2dQeUJ1ZFd4c0lEb2djbVZ4ZFdWemRDNWZZbTlrZVVsdWFYUXBYRzRnSUNBZ2ZTbGNiaUFnZlZ4dUlDQnpaV3htTG1abGRHTm9MbkJ2YkhsbWFXeHNJRDBnZEhKMVpWeHVmU2tvZEhsd1pXOW1JSE5sYkdZZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2MyVnNaaUE2SUhSb2FYTXBPMXh1SWl3aWFXMXdiM0owSUV4cGMzUkpkR1Z0SUdaeWIyMGdKeTR2VEdsemRFbDBaVzBuTzF4dWFXMXdiM0owSUhKbFkzVnljMmwyWlVsMFpYSmhkRzl5SUdaeWIyMGdKM0psWTNWeWMybDJaUzFwZEdWeVlYUnZjaWM3WEc1cGJYQnZjblFnYjJKcVpXTjBVR0YwYUNCbWNtOXRJQ2R2WW1wbFkzUXRjR0YwYUNjN1hHNWNibU5zWVhOeklFUmhkR0ZNYVhOMElHVjRkR1Z1WkhNZ1VtVmhZM1F1UTI5dGNHOXVaVzUwSUh0Y2JpQWdJQ0J6WlhSR2FXVnNaRTFoY0Nod1lYUm9MQ0JsZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0JsZG1WdWRDNXdjbVYyWlc1MFJHVm1ZWFZzZENncE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIdGJaWFpsYm5RdWRHRnlaMlYwTG1SaGRHRnpaWFF1Wm1sbGJHUmRPaUJ3WVhSb2ZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnVaR1Z5VG05a1pYTW9aR0YwWVNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1QySnFaV04wTG10bGVYTW9aR0YwWVNrdWJXRndLR2wwWlcwZ1BUNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2FXWWdLR2wwWlcwZ1BUMDlJQ2R2WW1wbFkzUlFZWFJvSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdiR1YwSUdOb2FXeGtJRDBnUEV4cGMzUkpkR1Z0SUd0bGVUMTdhWFJsYlM1MGIxTjBjbWx1WnlncGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIWmhiSFZsUFh0cGRHVnRmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRzlpYW1WamREMTdaR0YwWVZ0cGRHVnRYWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JtYVdWc1pFMWhjRDE3ZEdocGN5NXdjbTl3Y3k1bWFXVnNaRTFoY0gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHRnBibVZ5UFh0bElEMCtJSFJvYVhNdWMyVjBSbWxsYkdSTllYQW9aR0YwWVZ0cGRHVnRYUzV2WW1wbFkzUlFZWFJvTENCbEtYMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnZia05zYVdOclZHbDBiR1U5ZTJVZ1BUNGdkR2hwY3k1elpYUkdhV1ZzWkUxaGNDaGtZWFJoVzJsMFpXMWRMQ0JsS1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCdmJrTnNhV05yUTI5dWRHVnVkRDE3WlNBOVBpQjBhR2x6TG5ObGRFWnBaV3hrVFdGd0tHUmhkR0ZiYVhSbGJWMHNJR1VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSeVlXNXpiR0YwYVc5dVBYdDBhR2x6TG5CeWIzQnpMblJ5WVc1emJHRjBhVzl1ZlM4K08xeHVYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHUmhkR0ZiYVhSbGJWMGdQVDA5SUNkdlltcGxZM1FuSUNZbUlHUmhkR0ZiYVhSbGJWMGdJVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JqYUdsc1pDQTlJRkpsWVdOMExtTnNiMjVsUld4bGJXVnVkQ2hqYUdsc1pDd2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCamFHbHNaSEpsYmpvZ1FYSnlZWGt1YVhOQmNuSmhlU2hrWVhSaFcybDBaVzFkS1NBL0lIUm9hWE11Y21WdVpHVnlUbTlrWlhNb1pHRjBZVnRwZEdWdFhWc3dYU2tnT2lCMGFHbHpMbkpsYm1SbGNrNXZaR1Z6S0dSaGRHRmJhWFJsYlYwcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJqYUdsc1pEdGNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ1WkdWeUtDa2dlMXh1SUNBZ0lDQWdJQ0JqYjI1emRDQjdkSEpoYm5Oc1lYUnBiMjRzSUdSaGRHRjlJRDBnZEdocGN5NXdjbTl3Y3p0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnWm1sbGJHUk5ZWEFnUFNCMGFHbHpMbkJ5YjNCekxtWnBaV3hrVFdGd08xeHVYRzRnSUNBZ0lDQWdJR2xtSUNoQmNuSmhlUzVwYzBGeWNtRjVLR1JoZEdFcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJRDBnSnljN1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0JwWmlBb1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaUE5UFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29aR0YwWVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmtZWFJoSUQwZ1pHRjBZVnN3WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNBZ0lDQWdabTl5SUNoc1pYUWdlM0JoY21WdWRDd2dibTlrWlN3Z2EyVjVMQ0J3WVhSb2ZTQnZaaUJ1WlhjZ2NtVmpkWEp6YVhabFNYUmxjbUYwYjNJb1pHRjBZU2twSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHNXZaR1VnUFQwOUlDZHZZbXBsWTNRbklDWW1JRzV2WkdVZ0lUMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYkdWMElIQmhkR2hUZEhKcGJtY2dQU0J3WVhSb0xtcHZhVzRvSnk0bktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYjJKcVpXTjBVR0YwYUM1elpYUW9aR0YwWVN3Z2NHRjBhRk4wY21sdVp5QXJJQ2N1YjJKcVpXTjBVR0YwYUNjc0lIQmhkR2hUZEhKcGJtY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOGFETStlM1J5WVc1emJHRjBhVzl1TG5ObGJHVmpkRWwwWlcxelEyOXVkR0ZwYm1WeWZUd3ZhRE0rWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEeDFiQ0JqYkdGemMwNWhiV1U5WENKcWMyOXVMWFJ5WldWY0lqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIdDBhR2x6TG5KbGJtUmxjazV2WkdWektHUmhkR0VwZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMM1ZzUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUd4bGRDQnZZbXBsWTNSRVlYUmhJRDBnYjJKcVpXTjBVR0YwYUM1blpYUW9aR0YwWVN3Z1ptbGxiR1JOWVhBdWFYUmxiVU52Ym5SaGFXNWxjaWs3WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR2xtSUNoQmNuSmhlUzVwYzBGeWNtRjVLRzlpYW1WamRFUmhkR0VwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2IySnFaV04wUkdGMFlTQTlJRzlpYW1WamRFUmhkR0ZiTUYwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2JHVjBJSHR3WVhKbGJuUXNJRzV2WkdVc0lHdGxlU3dnY0dGMGFIMGdiMllnYm1WM0lISmxZM1Z5YzJsMlpVbDBaWEpoZEc5eUtHOWlhbVZqZEVSaGRHRXBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCdWIyUmxJQ0U5UFNBbmIySnFaV04wSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JzWlhRZ2NHRjBhRk4wY21sdVp5QTlJSEJoZEdndWFtOXBiaWduTGljcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J2WW1wbFkzUlFZWFJvTG5ObGRDaHZZbXBsWTNSRVlYUmhMQ0J3WVhSb1UzUnlhVzVuTENCd1lYUm9VM1J5YVc1bktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdnelBudDBjbUZ1YzJ4aGRHbHZiaTV6Wld4bFkzUlVhWFJzWlVOdmJuUmxiblI5UEM5b016NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhWc0lHTnNZWE56VG1GdFpUMWNJbXB6YjI0dGRISmxaVndpUGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZTNSb2FYTXVjbVZ1WkdWeVRtOWtaWE1vYjJKcVpXTjBSR0YwWVNsOVhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHd2ZFd3K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1ZlZ4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCRVlYUmhUR2x6ZERzaUxDSnBiWEJ2Y25RZ1JHRjBZVXhwYzNRZ1puSnZiU0FuTGk5RVlYUmhUR2x6ZENjN1hHNXBiWEJ2Y25RZ1oyVjBRWEJwUkdGMFlTQm1jbTl0SUNjdUxpOHVMaTlWZEdsc2FYUnBaWE12WjJWMFFYQnBSR0YwWVNjN1hHNWNibU5zWVhOeklFWnBaV3hrVTJWc1pXTjBhVzl1SUdWNGRHVnVaSE1nVW1WaFkzUXVRMjl0Y0c5dVpXNTBJSHRjYmlBZ0lDQmpiMjF3YjI1bGJuUkVhV1JOYjNWdWRDZ3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NW5aWFJFWVhSaEtDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ1oyVjBSR0YwWVNncElIdGNiaUFnSUNBZ0lDQWdZMjl1YzNRZ2UzVnliQ3dnZEhKaGJuTnNZWFJwYjI1OUlEMGdkR2hwY3k1d2NtOXdjenRjYmlBZ0lDQWdJQ0FnWjJWMFFYQnBSR0YwWVNoMWNtd3BYRzRnSUNBZ0lDQWdJQ0FnSUNBdWRHaGxiaWhjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FvZTNKbGMzVnNkSDBwSUQwK0lIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYVdZZ0tDRnlaWE4xYkhRZ2ZId2dUMkpxWldOMExtdGxlWE1vY21WemRXeDBLUzVzWlc1bmRHZ2dQVDA5SURBcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIUm9hWE11Y0hKdmNITXVjMlYwUlhKeWIzSW9SWEp5YjNJb2RISmhibk5zWVhScGIyNHVZMjkxYkdST2IzUkdaWFJqYUNrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV3Y205d2N5NXpaWFJNYjJGa1pXUW9kSEoxWlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZEdocGN5NXdjbTl3Y3k1elpYUkpkR1Z0Y3loeVpYTjFiSFFwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMbk5sZEV4dllXUmxaQ2gwY25WbEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQjlMQ0FvZTJWeWNtOXlmU2tnUFQ0Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuQnliM0J6TG5ObGRFeHZZV1JsWkNoMGNuVmxLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RHaHBjeTV3Y205d2N5NXpaWFJGY25KdmNpaGxjbkp2Y2lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IxY0dSaGRHVkdhV1ZzWkUxaGNDaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5CeWIzQnpMblZ3WkdGMFpVWnBaV3hrVFdGd0tIWmhiSFZsS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5Wlc1a1pYSW9LU0I3WEc0Z0lDQWdJQ0FnSUdOdmJuTjBJSHQxY213c0lHVnljbTl5TENCbWFXVnNaRTFoY0N3Z2RISmhibk5zWVhScGIyNHNJR2x6VEc5aFpHVmtMQ0JwZEdWdGMzMGdQU0IwYUdsekxuQnliM0J6TzF4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2hsY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUR4a2FYWWdZMnhoYzNOT1lXMWxQVndpYm05MGFXTmxJRzV2ZEdsalpTMWxjbkp2Y2lCcGJteHBibVZjSWo0OGNENTdaWEp5YjNJdWJXVnpjMkZuWlgwOEwzQStQQzlrYVhZK08xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLQ0ZwYzB4dllXUmxaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlEeGthWFlnWTJ4aGMzTk9ZVzFsUFZ3aWMzQnBibTVsY2lCcGN5MWhZM1JwZG1WY0lqNDhMMlJwZGo0N1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdLRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhFWVhSaFRHbHpkRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCa1lYUmhQWHRwZEdWdGMzMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhKc1BYdDFjbXg5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHWnBaV3hrVFdGd1BYdG1hV1ZzWkUxaGNIMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhCa1lYUmxSbWxsYkdSTllYQTllM1JvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkSEpoYm5Oc1lYUnBiMjQ5ZTNSeVlXNXpiR0YwYVc5dWZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVmVnh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JHYVdWc1pGTmxiR1ZqZEdsdmJqc2lMQ0pqYjI1emRDQkpibkIxZEVacFpXeGtjeUE5SUNoN1ptbGxiR1JOWVhBc0lIVnliSDBwSUQwK1hHNGdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdQR2x1Y0hWMElIUjVjR1U5WENKb2FXUmtaVzVjSWlCdVlXMWxQVndpYlc5a1gycHpiMjVmY21WdVpHVnlYM1Z5YkZ3aUlIWmhiSFZsUFh0MWNteDlMejVjYmlBZ0lDQWdJQ0FnUEdsdWNIVjBJSFI1Y0dVOVhDSm9hV1JrWlc1Y0lpQnVZVzFsUFZ3aWJXOWtYMnB6YjI1ZmNtVnVaR1Z5WDJacFpXeGtiV0Z3WENJZ2RtRnNkV1U5ZTBwVFQwNHVjM1J5YVc1bmFXWjVLR1pwWld4a1RXRndLWDB2UGx4dUlDQWdJRHd2WkdsMlBqdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdTVzV3ZFhSR2FXVnNaSE03SWl3aVkyOXVjM1FnVEdsemRFbDBaVzBnUFNBb2UzWmhiSFZsTENCamFHbHNaSEpsYml3Z1ptbGxiR1JOWVhBc0lHOWlhbVZqZEN3Z2IyNURiR2xqYTFScGRHeGxMQ0J2YmtOc2FXTnJRMjl1ZEdWdWRDd2diMjVEYkdsamEwTnZiblJoYVc1bGNpd2dkSEpoYm5Oc1lYUnBiMjU5S1NBOVBpQjdYRzRnSUNBZ2FXWWdLR05vYVd4a2NtVnVLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUFvUEd4cFBseHVJQ0FnSUNBZ0lDQWdJQ0FnZTBGeWNtRjVMbWx6UVhKeVlYa29iMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlEMDlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThjM0JoYmo0OGMzQmhiaUJqYkdGemMwNWhiV1U5WENKa1lYTm9hV052Ym5NZ1pHRnphR2xqYjI1ekxYQnZjblJtYjJ4cGIxd2lQand2YzNCaGJqNGdlM1poYkhWbGZTQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0luUnlaV1V0YzJWc1pXTjBYQ0lnWkdGMFlTMW1hV1ZzWkQxY0ltbDBaVzFEYjI1MFlXbHVaWEpjSWlCdmJrTnNhV05yUFh0dmJrTnNhV05yUTI5dWRHRnBibVZ5ZlQ1N2RISmhibk5zWVhScGIyNHVjMlZzWldOMGZUd3ZZVDQ4TDNOd1lXNCtJRG9nSUR4emNHRnVQbnQyWVd4MVpYMDhMM053WVc0K2ZWeHVJQ0FnSUNBZ0lDQWdJQ0FnUEhWc1BudGphR2xzWkhKbGJuMDhMM1ZzUGx4dUlDQWdJQ0FnSUNBOEwyeHBQaWs3WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlDZzhiR2srWEc0Z0lDQWdJQ0FnSUNBZ0lDQjdabWxsYkdSTllYQXVkR2wwYkdVZ1BUMDlJRzlpYW1WamRDQW1KaUJtYVdWc1pFMWhjQzUwYVhSc1pTQS9JRHh6ZEhKdmJtYytlM1J5WVc1emJHRjBhVzl1TG5ScGRHeGxmVG9nUEM5emRISnZibWMrSURvZ0p5ZDlYRzRnSUNBZ0lDQWdJQ0FnSUNCN1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZENBOVBUMGdiMkpxWldOMElDWW1JR1pwWld4a1RXRndMbU52Ym5SbGJuUWdQeUE4YzNSeWIyNW5QbnQwY21GdWMyeGhkR2x2Ymk1amIyNTBaVzUwZlRvZ1BDOXpkSEp2Ym1jK0lEb2dKeWQ5WEc0Z0lDQWdJQ0FnSUNBZ0lDQThjM0JoYmo1N2RtRnNkV1Y5UEM5emNHRnVQbHh1SUNBZ0lDQWdJQ0FnSUNBZ2V5Rm1hV1ZzWkUxaGNDNTBhWFJzWlNBbUppQW9abWxsYkdSTllYQXVZMjl1ZEdWdWRDQWhQVDBnYjJKcVpXTjBLU0FtSmlCbWFXVnNaRTFoY0M1cGRHVnRRMjl1ZEdGcGJtVnlJQ0U5UFNCdWRXeHNJRDljYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4WVNCb2NtVm1QVndpSTF3aUlHTnNZWE56VG1GdFpUMWNJblJ5WldVdGMyVnNaV04wWENJZ1pHRjBZUzFtYVdWc1pEMWNJblJwZEd4bFhDSWdiMjVEYkdsamF6MTdiMjVEYkdsamExUnBkR3hsZlQ1N2RISmhibk5zWVhScGIyNHVkR2wwYkdWOVBDOWhQaUE2SUNjbmZWeHVJQ0FnSUNBZ0lDQWdJQ0FnZXlGbWFXVnNaRTFoY0M1amIyNTBaVzUwSUNZbUlDaG1hV1ZzWkUxaGNDNTBhWFJzWlNBaFBUMGdiMkpxWldOMEtTQW1KaUJtYVdWc1pFMWhjQzVwZEdWdFEyOXVkR0ZwYm1WeUlDRTlQU0J1ZFd4c0lEOWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThZU0JvY21WbVBWd2lJMXdpSUdOc1lYTnpUbUZ0WlQxY0luUnlaV1V0YzJWc1pXTjBYQ0lnWkdGMFlTMW1hV1ZzWkQxY0ltTnZiblJsYm5SY0lpQnZia05zYVdOclBYdHZia05zYVdOclEyOXVkR1Z1ZEgwK2UzUnlZVzV6YkdGMGFXOXVMbU52Ym5SbGJuUjlQQzloUGlBNklDY25mVnh1SUNBZ0lDQWdJQ0E4TDJ4cFBpazdYRzRnSUNBZ2ZWeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnVEdsemRFbDBaVzA3SWl3aWFXMXdiM0owSUVacFpXeGtVMlZzWldOMGFXOXVJR1p5YjIwZ0p5NHZSbWxsYkdSVFpXeGxZM1JwYjI0bk8xeHVhVzF3YjNKMElFbHVjSFYwUm1sbGJHUnpJR1p5YjIwZ0p5NHZTVzV3ZFhSR2FXVnNaSE1uTzF4dWFXMXdiM0owSUZOMWJXMWhjbmtnWm5KdmJTQW5MaTlUZFcxdFlYSjVKenRjYmx4dVkyeGhjM01nVTJWMGRHbHVaM01nWlhoMFpXNWtjeUJTWldGamRDNURiMjF3YjI1bGJuUWdlMXh1SUNBZ0lHTnZibk4wY25WamRHOXlLSEJ5YjNCektTQjdYRzRnSUNBZ0lDQWdJSE4xY0dWeUtIQnliM0J6S1R0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTV6ZEdGMFpTQTlJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lITm9iM2RHYVdWc1pGTmxiR1ZqZEdsdmJqb2dabUZzYzJVc1hHNGdJQ0FnSUNBZ0lDQWdJQ0IxY213NklDY25MRnh1SUNBZ0lDQWdJQ0FnSUNBZ2FYTk1iMkZrWldRNklHWmhiSE5sTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdaWEp5YjNJNklHNTFiR3dzWEc0Z0lDQWdJQ0FnSUNBZ0lDQnBkR1Z0Y3pvZ1cxMHNYRzRnSUNBZ0lDQWdJQ0FnSUNCbWFXVnNaRTFoY0RvZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lHbDBaVzFEYjI1MFlXbHVaWEk2SUc1MWJHd3NYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkR2wwYkdVNklDY25MRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUTZJQ2NuWEc0Z0lDQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSDA3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdZMjl0Y0c5dVpXNTBSR2xrVFc5MWJuUW9LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVhVzVwZEU5d2RHbHZibk1vS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0JwYm1sMFQzQjBhVzl1Y3lncElIdGNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ0YjJSS2MyOXVVbVZ1WkdWeUxtOXdkR2x2Ym5NZ0lUMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqYjI1emRDQnZjSFJwYjI1eklEMGdiVzlrU25OdmJsSmxibVJsY2k1dmNIUnBiMjV6TzF4dUlDQWdJQ0FnSUNBZ0lDQWdkR2hwY3k1elpYUlRkR0YwWlNoN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RYSnNPaUJ2Y0hScGIyNXpMblZ5YkNBL0lHOXdkR2x2Ym5NdWRYSnNJRG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1ptbGxiR1JOWVhBNklHOXdkR2x2Ym5NdVptbGxiR1JOWVhBZ1B5QktVMDlPTG5CaGNuTmxLRzl3ZEdsdmJuTXVabWxsYkdSTllYQXBJRG9nZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQnBkR1Z0UTI5dWRHRnBibVZ5T2lCdWRXeHNMRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCMGFYUnNaVG9nSnljc1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR052Ym5SbGJuUTZJQ2NuWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZlN4Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCemFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0NklDRWhiM0IwYVc5dWN5NTFjbXhjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkWEpzUTJoaGJtZGxLR1YyWlc1MEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWMyVjBVM1JoZEdVb2UzVnliRG9nWlhabGJuUXVkR0Z5WjJWMExuWmhiSFZsZlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYUdGdVpHeGxVM1ZpYldsMEtHVjJaVzUwS1NCN1hHNGdJQ0FnSUNBZ0lHVjJaVzUwTG5CeVpYWmxiblJFWldaaGRXeDBLQ2s3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjMlYwVTNSaGRHVW9lM05vYjNkR2FXVnNaRk5sYkdWamRHbHZiam9nZEhKMVpYMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lISmxjMlYwVDNCMGFXOXVjeWhsZG1WdWRDa2dlMXh1SUNBZ0lDQWdJQ0JsZG1WdWRDNXdjbVYyWlc1MFJHVm1ZWFZzZENncE8xeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0emFHOTNSbWxsYkdSVFpXeGxZM1JwYjI0NklHWmhiSE5sTENCMWNtdzZJQ2NuTENCbWFXVnNaRTFoY0RvZ2UybDBaVzFEYjI1MFlXbHVaWEk2SUc1MWJHd3NJSFJwZEd4bE9pQW5KeXdnWTI5dWRHVnVkRG9nSnlkOWZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RYQmtZWFJsUm1sbGJHUk5ZWEFvZG1Gc2RXVXBJSHRjYmlBZ0lDQWdJQ0FnWTI5dWMzUWdibVYzVm1Gc0lEMGdUMkpxWldOMExtRnpjMmxuYmloMGFHbHpMbk4wWVhSbExtWnBaV3hrVFdGd0xDQjJZV3gxWlNrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11YzJWMFUzUmhkR1VvZTJacFpXeGtUV0Z3T2lCdVpYZFdZV3g5S1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0J6WlhSRmNuSnZjaWhsY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxuTmxkRk4wWVhSbEtIdGxjbkp2Y24wcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUhObGRFeHZZV1JsWkNoMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbk5sZEZOMFlYUmxLSHRwYzB4dllXUmxaRG9nZG1Gc2RXVjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnpaWFJKZEdWdGN5aHBkR1Z0Y3lrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG5ObGRGTjBZWFJsS0h0cGRHVnRjem9nYVhSbGJYTjlLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaVzVrWlhJb0tTQjdYRzRnSUNBZ0lDQWdJR052Ym5OMElIdDBjbUZ1YzJ4aGRHbHZibjBnUFNCMGFHbHpMbkJ5YjNCek8xeHVJQ0FnSUNBZ0lDQmpiMjV6ZENCN2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dUxDQjFjbXdzSUdWeWNtOXlMQ0JwYzB4dllXUmxaQ3dnYVhSbGJYTjlJRDBnZEdocGN5NXpkR0YwWlR0Y2JpQWdJQ0FnSUNBZ1kyOXVjM1FnZTJsMFpXMURiMjUwWVdsdVpYSXNJSFJwZEd4bExDQmpiMjUwWlc1MGZTQTlJSFJvYVhNdWMzUmhkR1V1Wm1sbGJHUk5ZWEE3WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFZ5YkNBbUppQnBkR1Z0UTI5dWRHRnBibVZ5SUNFOVBTQnVkV3hzSUNZbUlIUnBkR3hsSUNZbUlHTnZiblJsYm5RcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFvWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEdScGRqNWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEZOMWJXMWhjbmxjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJSHN1TGk1MGFHbHpMbk4wWVhSbGZWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ2RISmhibk5zWVhScGIyNDllM1J5WVc1emJHRjBhVzl1ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQXZQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFNXNXdkWFJHYVdWc1pITWdleTR1TG5Sb2FYTXVjM1JoZEdWOUlDOCtYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4d1BqeGhJR2h5WldZOVhDSWpYQ0lnYjI1RGJHbGphejE3ZEdocGN5NXlaWE5sZEU5d2RHbHZibk11WW1sdVpDaDBhR2x6S1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1kyeGhjM05PWVcxbFBWd2lZblYwZEc5dVhDSStlM1J5WVc1emJHRjBhVzl1TG5KbGMyVjBVMlYwZEdsdVozTjlQQzloUGp3dmNENWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMMlJwZGo1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ2s3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MyaHZkMFpwWld4a1UyVnNaV04wYVc5dUtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnS0Z4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4a2FYWStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR4R2FXVnNaRk5sYkdWamRHbHZibHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdkWEpzUFh0MWNteDlYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmxjbkp2Y2oxN1pYSnliM0o5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0J6WlhSRmNuSnZjajE3ZEdocGN5NXpaWFJGY25KdmNpNWlhVzVrS0hSb2FYTXBmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWE5NYjJGa1pXUTllMmx6VEc5aFpHVmtmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdjMlYwVEc5aFpHVmtQWHQwYUdsekxuTmxkRXh2WVdSbFpDNWlhVzVrS0hSb2FYTXBmVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdhWFJsYlhNOWUybDBaVzF6ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnYzJWMFNYUmxiWE05ZTNSb2FYTXVjMlYwU1hSbGJYTXVZbWx1WkNoMGFHbHpLWDFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJR1pwWld4a1RXRndQWHQwYUdsekxuTjBZWFJsTG1acFpXeGtUV0Z3ZlZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnZFhCa1lYUmxSbWxsYkdSTllYQTllM1JvYVhNdWRYQmtZWFJsUm1sbGJHUk5ZWEF1WW1sdVpDaDBhR2x6S1gxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUhSeVlXNXpiR0YwYVc5dVBYdDBjbUZ1YzJ4aGRHbHZibjFjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0x6NWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEVsdWNIVjBSbWxsYkdSeklIc3VMaTUwYUdsekxuTjBZWFJsZlNBdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0E4Y0Q0OFlTQm9jbVZtUFZ3aUkxd2lJRzl1UTJ4cFkyczllM1JvYVhNdWNtVnpaWFJQY0hScGIyNXpMbUpwYm1Rb2RHaHBjeWw5WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUdOc1lYTnpUbUZ0WlQxY0ltSjFkSFJ2Ymx3aVBudDBjbUZ1YzJ4aGRHbHZiaTV5WlhObGRGTmxkSFJwYm1kemZUd3ZZVDQ4TDNBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BDOWthWFkrWEc0Z0lDQWdJQ0FnSUNBZ0lDQXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNoY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOFpHbDJJR05zWVhOelRtRnRaVDFjSW5keVlYQmNJajVjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BHWnZjbTBnYjI1VGRXSnRhWFE5ZTNSb2FYTXVhR0Z1Wkd4bFUzVmliV2wwTG1KcGJtUW9kR2hwY3lsOVBseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ1BIQStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEd4aFltVnNQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThjM1J5YjI1blBrRlFTU0JWVWt3OEwzTjBjbTl1Wno1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThMMnhoWW1Wc1BseHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJRHhpY2k4K1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQR2srZTNSeVlXNXpiR0YwYVc5dUxuWmhiR2xrU25OdmJsVnliSDA4TDJrK1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBOEwzQStYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQThhVzV3ZFhRZ2RIbHdaVDFjSW5SbGVIUmNJaUJqYkdGemMwNWhiV1U5WENKMWNtd3RhVzV3ZFhSY0lpQjJZV3gxWlQxN2RYSnNmU0J2YmtOb1lXNW5aVDE3ZEdocGN5NTFjbXhEYUdGdVoyVXVZbWx1WkNoMGFHbHpLWDB2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnUEhBK1BHbHVjSFYwSUhSNWNHVTlYQ0p6ZFdKdGFYUmNJaUJqYkdGemMwNWhiV1U5WENKaWRYUjBiMjRnWW5WMGRHOXVMWEJ5YVcxaGNubGNJaUIyWVd4MVpUMTdkSEpoYm5Oc1lYUnBiMjR1YzJWdVpGSmxjWFZsYzNSOUx6NDhMM0ErWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lEd3ZabTl5YlQ1Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNBZ0lDQWdQRWx1Y0hWMFJtbGxiR1J6SUhzdUxpNTBhR2x6TG5OMFlYUmxmU0F2UGx4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FnSUR3dlpHbDJQbHh1SUNBZ0lDQWdJQ0FnSUNBZ0tUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lIMWNibjFjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnVTJWMGRHbHVaM003SWl3aVkyOXVjM1FnVTNWdGJXRnllU0E5SUNoN2RYSnNMQ0JtYVdWc1pFMWhjQ3dnZEhKaGJuTnNZWFJwYjI1OUtTQTlQbHh1SUNBZ0lEeGthWFkrWEc0Z0lDQWdJQ0FnSUR4d1BseHVJQ0FnSUNBZ0lDQWdJQ0FnUEhOMGNtOXVaejVCVUVrZ1ZWSk1QQzl6ZEhKdmJtYytQR0p5THo1Y2JpQWdJQ0FnSUNBZ0lDQWdJRHhoSUdoeVpXWTllM1Z5YkgwZ2RHRnlaMlYwUFZ3aVgySnNZVzVyWENJK2UzVnliSDA4TDJFK1hHNGdJQ0FnSUNBZ0lEd3ZjRDVjYmlBZ0lDQWdJQ0FnUEhBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4YzNSeWIyNW5QbnQwY21GdWMyeGhkR2x2Ymk1MGFYUnNaWDA4TDNOMGNtOXVaejQ4WW5JdlBseHVJQ0FnSUNBZ0lDQWdJQ0FnZTJacFpXeGtUV0Z3TG5ScGRHeGxMbkpsY0d4aFkyVW9KeTRuTENBbklPS0FrejRnSnlsOVhHNGdJQ0FnSUNBZ0lEd3ZjRDVjYmlBZ0lDQWdJQ0FnUEhBK1hHNGdJQ0FnSUNBZ0lDQWdJQ0E4YzNSeWIyNW5QbnQwY21GdWMyeGhkR2x2Ymk1amIyNTBaVzUwZlR3dmMzUnliMjVuUGp4aWNpOCtYRzRnSUNBZ0lDQWdJQ0FnSUNCN1ptbGxiR1JOWVhBdVkyOXVkR1Z1ZEM1eVpYQnNZV05sS0NjdUp5d2dKeURpZ0pNK0lDY3BmVnh1SUNBZ0lDQWdJQ0E4TDNBK1hHNGdJQ0FnUEM5a2FYWStPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JUZFcxdFlYSjVPeUlzSWk4dklGQnZiSGxtYVd4c2MxeHVhVzF3YjNKMElDZGxjell0Y0hKdmJXbHpaU2M3WEc1cGJYQnZjblFnSjJsemIyMXZjbkJvYVdNdFptVjBZMmduTzF4dUx5OGdRMjl0Y0c5dVpXNTBjMXh1YVcxd2IzSjBJRk5sZEhScGJtZHpJR1p5YjIwZ0p5NHZRMjl0Y0c5dVpXNTBjeTlUWlhSMGFXNW5jeWM3WEc1Y2JtTnZibk4wSUcxdlpFcHpiMjVTWlc1a1pYSkZiR1Z0Wlc1MElEMGdKMjF2WkhWc1lYSnBkSGt0YW5OdmJpMXlaVzVrWlhJbk8xeHVZMjl1YzNRZ1pHOXRSV3hsYldWdWRDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tHMXZaRXB6YjI1U1pXNWtaWEpGYkdWdFpXNTBLVHRjYm1OdmJuTjBJSHQwY21GdWMyeGhkR2x2Ym4wZ1BTQnRiMlJLYzI5dVVtVnVaR1Z5TzF4dVhHNVNaV0ZqZEVSUFRTNXlaVzVrWlhJb1hHNGdJQ0FnUEZObGRIUnBibWR6SUhSeVlXNXpiR0YwYVc5dVBYdDBjbUZ1YzJ4aGRHbHZibjBnTHo0c1hHNGdJQ0FnWkc5dFJXeGxiV1Z1ZEZ4dUtUc2lMQ0ptZFc1amRHbHZiaUJuWlhSQmNHbEVZWFJoS0hWeWJDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCbVpYUmphQ2gxY213cFhHNGdJQ0FnSUNBZ0lDNTBhR1Z1S0hKbGN5QTlQaUJ5WlhNdWFuTnZiaWdwS1Z4dUlDQWdJQ0FnSUNBdWRHaGxiaWhjYmlBZ0lDQWdJQ0FnSUNBZ0lDaHlaWE4xYkhRcElEMCtJQ2g3Y21WemRXeDBmU2tzWEc0Z0lDQWdJQ0FnSUNBZ0lDQW9aWEp5YjNJcElEMCtJQ2g3WlhKeWIzSjlLVnh1SUNBZ0lDQWdJQ0FwTzF4dWZWeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQm5aWFJCY0dsRVlYUmhPMXh1SWwxOVxuIl0sImZpbGUiOiJBZG1pbi9JbmRleEFkbWluLmpzIn0=
