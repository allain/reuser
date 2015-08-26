var Promise = require('bluebird');

module.exports = reuser;

function reuser(setup, teardown, options) {
  if (!teardown && !options) {
    teardown = function() {
    };
    options = {};
  } else if (typeof teardown === 'object') {
    options = teardown;
    teardown = function() {
    };
  } else {
    options = {};
  }

  var teardownDelay = options.teardownDelay || 0;

  var resource = null;
  var refCount = 0;

  if (setup.length === 1) {
    setup = Promise.promisify(setup);
  }

  if (teardown.length === 1) {
    teardown = Promise.promisify(teardown);
  }

  return function(fn) {
    if (refCount === 0) {
      resource = Promise.resolve(setup());
    }
    refCount++;

    if (fn.length === 2) {
      fn = Promise.promisify(fn);
    }

    return resource.then(fn).then(function(result) {
      if (teardownDelay) {
        Promise.delay(teardownDelay).then(deref);
        return result;
      } else {
        return deref().then(function() {
          return result;
        });
      }
    });
  };

  function deref() {
    refCount--;

    if (refCount === 0) {
      return Promise.resolve(teardown()).then(function() {
        resource = null;
      });
    } else {
      return Promise.resolve();
    }
  }
}
