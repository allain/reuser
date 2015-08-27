var test = require('tape');
var reuser = require('./index.js');
var Promise = require('bluebird');

test('supports simple lifecycle', function(t) {
  var setupCount = 0;
  var tearDownCount = 0;

  var resource = {};

  var use = reuser(function() {
    setupCount++;
    return resource;
  }, function() {
    tearDownCount++;
  });

  use(function(res) {
    t.equal(res, resource, 'passes in resource by ref');
    return 'result';
  }).then(function(result) {
    t.equal(result, 'result');
    t.equal(setupCount, 1);
    t.equal(tearDownCount, 1);
    t.end();
  });
});

test('teardown is optional', function(t) {
  var use = reuser(Math.random);

  use(function(time) {
    t.ok(time);
  }).then(t.end);
});

test('supports callbacks in setup and teardown and use', function(t) {
  var setupCount = 0;
  var tearDownCount = 0;

  var resource = {};

  var use = reuser(function(cb) {
    setupCount++;
    cb(null, resource);
  }, function(cb) {
    tearDownCount++;
    cb();
  });

  use(function(res, cb) {
    t.equal(res, resource, 'passes in resource by ref');
    cb();
  }).then(function() {
    t.equal(setupCount, 1);
    t.equal(tearDownCount, 1);
    t.end();
  });
});

test('actually reuses resource in nested uses', function(t) {
  var setupCount = 0;
  var tearDownCount = 0;

  var resource = {};

  var use = reuser(function() {
    setupCount++;
    return resource;
  }, function() {
    tearDownCount++;
  });

  use(function(res1) {
    t.equal(res1, resource, 'passes in resource by ref');
    return use(function(res2) {
      t.equal(res2, resource, 'passes in resource by ref');
    });
  }).then(function() {
    t.equal(setupCount, 1, 'setup count');
    t.equal(tearDownCount, 1, 'tear down count');
    t.end();
  });
});

test('creates a new instance when all uses are finished', function(t) {
  var use = reuser(Math.random);

  var res1;

  use(function(res) {
    res1 = res;
  }).then(function() {
    use(function(res2) {
      t.notEqual(res2, res1);
      t.end();
    });
  });
});

test('supports delaying the teardown', function(t) {
  var use = reuser(Math.random, {
    teardownDelay: 150
  });

  var res1;
  use(function(r1) {
    res1 = r1;
    return 'result';
  }).then(function(result) {
    t.equal(result, 'result');
  });

  setTimeout(function() {
    use(function(res2) {
      t.equal(res2, res1, 'reuses resource in the teardownDelay window');
    });
  }, 100);

  setTimeout(function() {
    use(function(res3) {
      t.notEqual(res3, res1, 'recreates resource after teardownDelay');
      t.end();
    });
  }, 300);
});

test('failing uses still teardown', function(t) {
  var tearDownCount = 0;
  var use = reuser(Math.random, function tearDown() {
    tearDownCount++;
  });

  use(function() {
    throw new Error('deliberate failure');
  }).catch(function(err) {
    t.ok(err);
    t.equal(1, tearDownCount);
    t.end();
  });
});

test('does not tear down till returned promise resolves', function(t) {
  var tearDownCount = 0;
  var use = reuser(Math.random, function tearDown() {
    tearDownCount++;
  });

  use(function() {
    return Promise.delay(50).then(function() {
      t.equal(tearDownCount, 0);
      t.end();
    });
  });

});
