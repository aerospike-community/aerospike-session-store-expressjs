const Promise = require('bluebird')
const test = require('blue-tape')
const session = require('express-session')
const AerospikeStore = require('../')(session)
const Aerospike = Promise.promisifyAll(require('aerospike'))

function LifecycleTest (store, t) {
  Promise.promisifyAll(store)

  return store.setAsync('sid', { cookie: { maxAge: 3600 }, name: 'jan' })
    .then(function () {
      t.pass('#set() ok')
      return store.getAsync('sid')
    })
    .then(function (data) {
      t.deepEqual({ cookie: { maxAge: 3600 }, name: 'jan' }, data, '#get() ok')
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
  return LifecycleTest(store, t)
})

test('existing client', function (t) {
  return Aerospike.connectAsync()
    .then(function (client) {
      var store = new AerospikeStore({ client: client })
      return LifecycleTest(store, t)
    })
})

test('options', function (t) {
  var store = new AerospikeStore({
    set: 'session',
    ttl: 3600
  })

  t.equal(store.as_set, 'session', 'uses provided set name')
  t.equal(store.ttl, 3600, 'sets ttl')

  return LifecycleTest(store, t)
})

test('after', function (t) {
  Aerospike.releaseEventLoop()
  t.end()
})
