// *****************************************************************************
// Copyright 2016-2017 Aerospike, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License")
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// *****************************************************************************

'use strict'

const Promise = require('bluebird')
const test = require('blue-tape')
const session = require('express-session')
const AerospikeStore = require('../')(session)
const Aerospike = require('aerospike')
const delay = require('util').promisify(setTimeout)

function lifecycleTest (store, t) {
  Promise.promisifyAll(store)

  const session = { cookie: { maxAge: 2000 }, name: 'jan' }
  return store.setAsync('sid', session)
    .then(() => t.pass('#set() ok'))
    .then(() => store.getAsync('sid'))
    .then(data => t.deepEqual({ cookie: { maxAge: 2000 }, name: 'jan' }, data, '#get() ok'))
    .then(() => store.touchAsync('sid', session))
    .then(() => t.pass('#touch() ok'))
    .then(() => store.destroyAsync('sid'))
    .then(() => store.getAsync('sid'))
    .then(data => t.equal(undefined, data, '#destroy() ok'))
    .then(() => store.close(false))
}

test('defaults', function (t) {
  const store = new AerospikeStore()
  t.equal(store.as_namespace, 'test', 'sets default namespace to test')
  t.equal(store.as_set, 'express-session', 'sets default set name to express-session')
  t.notOk(store.ttl, 'ttl not set')
  t.ok(store.client, 'creates client')

  store.client.close(false)
  t.end()
})

test('basic', function (t) {
  t.throws(AerospikeStore, TypeError, 'constructor not callable as function')
  const store = new AerospikeStore()
  return lifecycleTest(store, t)
})

test('clear', function (t) {
  const store = new AerospikeStore()
  Promise.promisifyAll(store)

  return store.setAsync('sess1', { name: 'jan' })
    .then(() => store.clearAsync())
    .then(() => delay(100))
    .then(() => store.getAsync('sess1'))
    .then(session => t.equal(session, undefined, 'all sessions cleared'))
    .then(() => store.close(false))
})

test('existing client', function (t) {
  return Aerospike.connect()
    .then(function (client) {
      const store = new AerospikeStore({ client: client })
      return lifecycleTest(store, t)
    })
})

test('options', function (t) {
  const store = new AerospikeStore({
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
  const store = new AerospikeStore({ hosts: '127.0.0.1:3333', connTimeoutMs: 500 })
  Promise.promisifyAll(store)

  return store.setAsync('sid', { cookie: { maxAge: 2000 }, name: 'jan' })
    .catch(function (err) {
      t.ok(/Not connected/.test(err.message), 'failed connection')
      store.close(false)
    })
})

test('serializer', function (t) {
  const serializer = {
    stringify: (value, replacer, space) => 'XXX' + JSON.stringify(value, replacer, space),
    parse: str => {
      t.ok(str.match(/^XXX/))
      return JSON.parse(str.substring(3))
    }
  }
  t.equal(serializer.stringify('UnitTest'), 'XXX"UnitTest"')
  t.equal(serializer.parse(serializer.stringify('UnitTest')), 'UnitTest')

  const store = new AerospikeStore({ serializer: serializer })
  return lifecycleTest(store, t)
})

test('serializer error', function (t) {
  const a = {}
  const b = {}
  // create circular reference to cause serialization error
  a.b = b
  b.a = a

  const store = new AerospikeStore()
  store.set('sid', a, error => {
    t.ok(error, 'serialization error is passed to callback')
    store.close()
    t.end()
  })
})

test('after', function (t) {
  Aerospike.releaseEventLoop()
  t.end()
})
