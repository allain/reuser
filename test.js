var test = require('tape')
var reuser = require('./index.js')
var Promise = require('any-promise')
var delay = reuser.delay

test('supports simple lifecycle', function (t) {
  var setupCount = 0
  var tearDownCount = 0

  var resource = {}

  var use = reuser(function () {
    setupCount++
    return resource
  }, function () {
    tearDownCount++
  })

  use(function (res) {
    t.equal(res, resource, 'passes in resource by ref')
    return 'result'
  }).then(function (result) {
    t.equal(result, 'result')
    t.equal(setupCount, 1)
    t.equal(tearDownCount, 1)
    t.end()
  })
})

test('teardown is optional', function (t) {
  var use = reuser(Math.random)

  use(function (time) {
    t.ok(time)
  }).then(t.end)
})

test('supports callbacks in setup and teardown and use', function (t) {
  var setupCount = 0
  var tearDownCount = 0

  var resource = {}

  var use = reuser(function (cb) {
    setupCount++
    cb(null, resource)
  }, function (res, cb) {
    t.equal(res, resource, 'teardown should receive resource')
    tearDownCount++
    cb()
  })

  use(function (res, cb) {
    t.equal(res, resource, 'passes in resource by ref')
    cb()
  }).then(function () {
    t.equal(setupCount, 1, 'setup count should be 1')
    t.equal(tearDownCount, 1, 'teardown count should be 1')
    t.end()
  })
})

test('actually reuses resource in nested uses', function (t) {
  var setupCount = 0
  var tearDownCount = 0

  var resource = {}

  var use = reuser(function () {
    setupCount++
    return resource
  }, function () {
    tearDownCount++
  })

  use(function (res1) {
    t.equal(res1, resource, 'passes in resource by ref')
    return use(function (res2) {
      t.equal(res2, resource, 'passes in resource by ref')
    })
  }).then(function () {
    t.equal(setupCount, 1, 'setup count')
    t.equal(tearDownCount, 1, 'tear down count')
    t.end()
  })
})

test('creates a new instance when all uses are finished', function (t) {
  var use = reuser(Math.random)

  var res1

  use(function (res) {
    res1 = res
  }).then(function () {
    use(function (res2) {
      t.notEqual(res2, res1)
      t.end()
    })
  })
})

test('supports passing built thing to teardown', function (t) {
  var use = reuser(Math.random, function (num, cb) {
    t.equal(typeof num, 'number', 'passes built thing to teardown')
    t.equal(typeof cb, 'function', 'cb is a function')
    t.end()
  })

  use(function (num, cb) {
    cb(null)
  })
})

test('supports delaying the teardown', function (t) {
  var use = reuser(Math.random, {
    teardownDelay: 150
  })

  var res1
  use(function (r1) {
    t.equal(typeof r1, 'number', 'expected resource to be number')
    res1 = r1
    return 'result'
  }).then(function (result) {
    t.equal(result, 'result', 'returning a value from use gets passed through')
  })

  setTimeout(function () {
    use(function (res2) {
      t.equal(res2, res1, 'reuses resource in the teardownDelay window')
    })
  }, 100)

  setTimeout(function () {
    use(function (res3) {
      t.equal(typeof res3, 'number', 'expected resource to be number')

      t.notEqual(res3, res1, 'recreates resource after teardownDelay')
      t.end()
    })
  }, 300)
})

test('failing uses still teardown', function (t) {
  var tearDownCount = 0
  var use = reuser(Math.random, function tearDown () {
    tearDownCount++
  })

  use(function () {
    throw new Error('deliberate failure')
  }).catch(function (err) {
    t.ok(err)
    t.equal(1, tearDownCount)
    t.end()
  })
})

test('does not tear down till returned promise resolves', function (t) {
  var tearDownCount = 0
  var use = reuser(Math.random, function tearDown () {
    tearDownCount++
  })

  use(function () {
    return delay(50).then(function () {
      t.equal(tearDownCount, 0)
      t.end()
    })
  })
})

test('delay in teardown does not slow down return of usage', function (t) {
  var tearDownCount = 0
  var use = reuser(Math.random, function tearDown () {
    tearDownCount++
  }, {
    teardownDelay: 150
  })

  use(function () {
    return Date.now()
  }).then(function (result) {
    t.ok(Date.now() - result < 10, 'should be almost immediate')
    t.end()
  })
})
