var Promise = require('any-promise')
var timestamp = require('monotonic-timestamp')
var promisify = require('any-promisify')

function reuser (setup, teardown, options) {
  if (!teardown && !options) {
    teardown = function () {}
    options = {}
  } else if (typeof teardown === 'object') {
    options = teardown
    teardown = function () {}
  } else {
    options = {}
  }

  var lastUsed = null
  var teardownDelay = options.teardownDelay || 0

  var resource = null

  setup = promisify(setup)
  teardown = promisify(teardown)

  return function (fn) {
    var myTime = timestamp()
    lastUsed = myTime

    if (resource === null) {
      resource = Promise.resolve(setup())
    }

    fn = promisify(fn)

    return resource.then(fn).then(function (result) {
      return delay(teardownDelay || 0, result).then(deref)
    }, function (err) {
      return delay(teardownDelay || 0).then(deref).then(function () {
        throw err
      })
    })

    function deref (value) {
      if (lastUsed !== myTime)
        return value

      return resource.then(function (resource) {
        return teardown(resource)
      }).then(function () {
        resource = null
        return value
      })
    }
  }
}

function delay (n, result) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(result)
    }, n)
  })
}

reuser.delay = delay

module.exports = reuser