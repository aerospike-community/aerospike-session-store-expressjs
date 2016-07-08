const Promise = require('bluebird')
const test = require('blue-tape')
const session = require('express-session')
const AerospikeStore = require('../')(session)
const Aerospike = Promise.promisifyAll(require('aerospike'))

function lifecycleTest (store, t) {
  Promise.promisifyAll(store)

  return store.setAsync('sid', { cookie: { maxAge: 2000 }, name: 'jan' })
    .then(function () {
      t.pass('#set() ok')
      return store.getAsync('sid')
    })
    .then(function (data) {
      t.deepEqual({ cookie: { maxAge: 2000 }, name: 'jan' }, data, '#get() ok')
      return store.client.close(false)
    })
}

test('defaults', function (t) {
  var store = new AerospikeStore()
  t.equal(store.as_namespace, 'test', 'sets default namespace to test')
  t.equal(store.as_set, 'express-session', 'sets default set name to express-session')
  t.notOk(store.ttl, 'ttl not set')
  t.ok(store.client, 'creates client')

  store.client.close(false)
  t.end()
})

test('basic', function (t) {
  t.throws(AerospikeStore, TypeError, 'constructor not callable as function')
  var store = new AerospikeStore()
  return lifecycleTest(store, t)
})

test('existing client', function (t) {
  return Aerospike.connectAsync()
    .then(function (client) {
      var store = new AerospikeStore({ client: client })
      return lifecycleTest(store, t)
    })
})

test('options', function (t) {
  var store = new AerospikeStore({
    namespace: 'express',
    set: 'session',
    ttl: 3600
  })

  t.equal(store.as_namespace, 'express', 'uses provided namespace')
  t.equal(store.as_set, 'session', 'uses provided set name')
  t.equal(store.ttl, 3600, 'sets ttl')

  return lifecycleTest(store, t)
})

test('failed connection', function (t) {
  var store = new AerospikeStore({ hosts: '127.0.0.1:3333', connTimeoutMs: 500 })
  Promise.promisifyAll(store)

  return store.setAsync('sid', { cookie: { maxAge: 2000 }, name: 'jan' })
    .catch(function (err) {
      t.ok(/Not connected/.test(err.message), 'failed connection')
      store.client.close(false)
    })
})

test('serializer', function (t) {
  var serializer = {
    stringify: function () { return 'XXX' + JSON.stringify.apply(JSON, arguments) },
    parse: function (x) {
      t.ok(x.match(/^XXX/))
      return JSON.parse(x.substring(3))
    }
  }
  t.equal(serializer.stringify('UnitTest'), 'XXX"UnitTest"')
  t.equal(serializer.parse(serializer.stringify('UnitTest')), 'UnitTest')

  var store = new AerospikeStore({ serializer: serializer })
  return lifecycleTest(store, t)
})

test('after', function (t) {
  Aerospike.releaseEventLoop()
  t.end()
})
