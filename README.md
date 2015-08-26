# reuser

Reuser is a simple resource manager that handles setup and teardown for you. 

I needed to handle closing db connections when my cli apps were done but I didn't want to pass the connection from the
top of have to explicitly call teardown myself.

## Installation

npm install reuser

## Usage

```js
var reuser = require('reuser');

function setupDB(cb) {
  // build db here
  cb(null, db);
}

function tearownDB(cb) {
  // down teardown here
  cb();
}

// Create a reuser function
var useDb = reuser(setupDB, teardownDB);

useDb(function(db, cb) {
  // Do something with db
  cb();
});

useDb(function(db, cb) {
  // Do somethng with db
  // ...
  useDb(function(db, cb) {
    // Do something with same db here
    cb();
  }, cb);
});

```

If you're more into the terseness of Promises you can do this too:

```js
var reuser = require('reuser');
     
function setupDB() {
  // create db or Promise resolving to db
  return db;
}

function teardownDB() {
  // down teardown here
}

// Create a reuser function
var useDb = reuser(setupDB, teardownDB);

useDb(function(db) {
  // Do something with db and return a Promise if the action is asynchronous
});
```

By default resources are torndown as soon as the use function is complete. If you would like to reuse the resource with
a window of time (in ms), you may pass in an optional teardownDelay option like below:

```js
var useDb = reuser(setupDB, teardownDB, { teardownDelay: 1000 });
```
