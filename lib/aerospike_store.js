// *****************************************************************************
// Copyright 2016 Aerospike, Inc.
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

const Aerospike = require('aerospike')
const Key = Aerospike.Key

const debug = require('debug')('session:aerospike')
const util = require('util')

module.exports = function (session) {
  const Store = session.Store

  function AerospikeStore (options) {
    options = options || {}
    Store.call(this, options)
    var self = this

    this.as_namespace = options.namespace || 'test'
    this.as_set = options.set || 'express-session'
    this.config = options.config || {}
    if (options.hosts) {
      this.config.hosts = options.hosts
    }
    this.ttl = options.ttl
    this.disableTTL = options.disableTTL
    this.serializer = options.serializer || JSON

    if (options.client) {
      this.client = options.client
    } else {
      this.client = Aerospike.client(this.config)
      this.client.connect(function (err) {
        if (err) {
          debug('ERROR - %s', err.message)
          self.emit('disconnect')
        } else {
          self.emit('connect')
        }
      })
    }
  }

  util.inherits(AerospikeStore, Store)

  AerospikeStore.prototype._key = function (sid) {
    return new Key(this.as_namespace, this.as_set, sid)
  }

  // Determines the time-to-live (TTL) to use when writing a record for
  // session.set() or session.touch(). The default ttl can be set by passing
  // the ttl option when creating a new store instance. Otherwise, the maxAge
  // entry of an existing session cookie will be used to determine ttl.  If
  // disableTTL is set to true for the store, the client will not write any
  // ttl; however, the namespace wide default-ttl will still be used, if
  // configured.
  AerospikeStore.prototype._ttl = function (session) {
    if (this.disableTTL) {
      return null
    }
    if (this.ttl) {
      return this.ttl
    }
    var maxAge = session.cookie && session.cookie.maxAge
    if (typeof maxAge === 'number') {
      return Math.floor(maxAge / 1000)
    }
    return null
  }

  // Get a session from the store given a session ID (sid).
  AerospikeStore.prototype.get = function (sid, callback) {
    var self = this
    var key = this._key(sid)
    debug('GET "%s"', sid)
    this.client.get(key, function (err, record) {
      if (err) {
        switch (err.code) {
          case Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
            return callback()
          default:
            return callback(err)
        }
      }

      var session = record.session
      if (session) {
        try {
          session = self.serializer.parse(session)
        } catch (err) {
          return callback(err)
        }
      }
      return callback(null, session)
    })
  }

  // Remove a session from the store given a session ID (sid).
  AerospikeStore.prototype.destroy = function (sid, callback) {
    if (typeof callback !== 'function') {
      callback = function (err) { if (err) debug('ERR', err.message) }
    }
    var key = this._key(sid)
    debug('REMOVE "%s"', sid)
    this.client.remove(key, callback)
  }

  // Upsert a session into the store given a session ID (sid) and session (session) object.
  AerospikeStore.prototype.set = function (sid, session, callback) {
    var self = this
    var key = this._key(sid)
    try {
      session = self.serializer.stringify(session)
    } catch (err) {
      process.nextTick(function () { callback(err) })
      return
    }
    var record = { session: session }
    var meta = {}
    var ttl = this._ttl(session)
    if (ttl) {
      meta.ttl = ttl
      debug('PUT "%s", ttl: %s', sid, ttl)
    } else {
      debug('PUT "%s"', sid)
    }
    this.client.put(key, record, meta, callback)
  }

  // "Touch" a given session given a session ID (sid) and session (session) object.
  AerospikeStore.prototype.touch = function (sid, session, callback) {
    var key = this._key(sid)
    var ttl = this._ttl(session)
    if (ttl) {
      var ops = [ Aerospike.operations.touch(ttl) ]
      debug('TOUCH "%s" %s', sid, ttl)
      this.client.operate(key, ops, callback)
    } else {
      process.nextTick(callback)
    }
  }

  return AerospikeStore
}
