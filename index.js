var Promise = require('bluebird');
var timestamp = require('monotonic-timestamp');

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

  var lastUsed = null;
  var teardownDelay = options.teardownDelay || 0;

  var resource = null;

  if (setup.length === 1) {
    setup = Promise.promisify(setup);
  }

  if (teardown.length === 1) {
    teardown = Promise.promisify(teardown);
  }

  return function(fn) {
    var myTime = timestamp();
    lastUsed = myTime;

    if (resource === null) {
      resource = Promise.resolve(setup());
    }

    if (fn.length === 2) {
      fn = Promise.promisify(fn);
    }

    return resource.then(fn).then(function(result) {
      return Promise.delay(result, teardownDelay || 0).then(deref);
    }, function(err) {
      return Promise.delay(teardownDelay || 0).then(deref).then(function() {
        throw err;
      });
    });

    function deref(value) {
      if (lastUsed === myTime) {
        return Promise.resolve(teardown()).then(function() {
          resource = null;
          return value;
        });
      }

      return value;
    }
  };
}
