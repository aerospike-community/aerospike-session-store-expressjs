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

const Aerospike = require('aerospike')
const DataMapper = require('./data_mapper')

const debug = require('debug')('session:aerospike')
const util = require('util')

module.exports = function (session) {
  const Store = session.Store

  /**
   * Return the `AerospikeStore` extending `express`'s session Store.
   *
   * @param {Object} express session
   * @return {Function}
   * @public
   */
  function AerospikeStore (options) {
    if (!(this instanceof AerospikeStore)) {
      throw new TypeError('Cannot call AerospikeStore constructor as a function')
    }

    options = options || {}
    Store.call(this, options)

    this.as_namespace = options.namespace || 'test'
    this.as_set = options.set || 'express-session'
    this.ttl = options.ttl
    this.mapper = options.mapper || new DataMapper()

    if (options.serializer) {
      throw new Error('The `serializer` option is no longer supported - supply a custom data mapper instead.')
    }

    if (options.client) {
      this.client = options.client
    } else {
      this.client = Aerospike.client(options)
      this.client.connect(error => {
        if (error) {
          debug('ERROR - %s', error.message)
          process.nextTick(() => this._onDisconnected())
        } else {
          process.nextTick(() => this._onConnected())
        }
      })
    }

    this.connected = false
    this.client.on('nodeAdded', () => this._onConnected())
    this.client.on('disconnected', () => this._onDisconnected())
  }

  util.inherits(AerospikeStore, Store)

  AerospikeStore.prototype._onConnected = function () {
    if (this.connected) return
    debug('CONNECT')
    this.connected = true
    this.emit('connect')
  }

  AerospikeStore.prototype._onDisconnected = function () {
    if (!this.connected) return
    debug('DISCONNECT')
    this.connected = false
    this.emit('disconnect')
  }

  AerospikeStore.prototype._key = function (sid) {
    return new Aerospike.Key(this.as_namespace, this.as_set, sid)
  }

  /**
   * Determines the time-to-live (TTL) to use when writing a record for
   * session.set() or session.touch(). The default ttl can be set by passing
   * the ttl option when creating a new store instance. Otherwise, the maxAge
   * of the session cookie will be used to determine ttl. If ttl is zero or
   * negative, ttl will not be used. However, note that the Aerospike server
   * might still have a default ttl at the namespace level.
   *
   * @param {Object} express session
   * @private
   */
  AerospikeStore.prototype._ttl = function (session) {
    let ttl = null
    if (typeof this.ttl === 'number') {
      ttl = this.ttl
    } else {
      const maxAge = session.cookie && session.cookie.maxAge
      if (typeof maxAge === 'number') {
        ttl = Math.floor(maxAge / 1000)
      }
    }
    if (ttl <= 0) {
      ttl = null
    }
    return ttl
  }

  /**
   * Get a session from the store given a session ID `sid`.
   *
   * @param {String} sid - Session ID
   * @param {Function} callback - Callback function
   * @public
   */
  AerospikeStore.prototype.get = function (sid, callback) {
    const key = this._key(sid)
    debug('GET "%s"', sid)
    this.client.get(key, (error, record) => {
      if (error) {
        switch (error.code) {
          case Aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND:
            return callback()
          default:
            return callback(error)
        }
      }

      try {
        const bins = record.bins
        const session = this.mapper.fromRecord(bins)
        return callback(null, session)
      } catch (error) {
        return callback(error)
      }
    })
  }

  /**
   * Remove a session from the store given a session ID `sid`.
   *
   * @param {String} sid - Session ID
   * @param {Function} callback - Callback function
   */
  AerospikeStore.prototype.destroy = function (sid, callback) {
    const key = this._key(sid)
    debug('REMOVE "%s"', sid)
    this.client.remove(key, error => callback(error))
  }

  /**
   * Upsert a session into the store given a session ID `sid` and session
   * object `session`.
   *
   * @param {String} sid - Session ID
   * @param {Object} session - Session object
   * @param {Function} callback - Callback function
   * @public
   */
  AerospikeStore.prototype.set = function (sid, session, callback) {
    try {
      const key = this._key(sid)
      const bins = this.mapper.toRecord(session)
      const meta = { ttl: this._ttl(session) }
      debug('PUT "%s", ttl: %s', sid, meta.ttl)
      this.client.put(key, bins, meta, error => callback(error))
    } catch (error) {
      process.nextTick(callback, error)
    }
  }

  /**
   * Refresh the time-to-live for the session with the given session ID `sid`.
   *
   * @param {String} sid - Session ID
   * @param {Object} session - Session object
   * @param {Function} callback - Callback function
   * @public
   */
  AerospikeStore.prototype.touch = function (sid, session, callback) {
    const key = this._key(sid)
    const ttl = this._ttl(session)
    if (ttl) {
      debug('TOUCH "%s" %s', sid, ttl)
      const ops = [ Aerospike.operations.touch(ttl) ]
      this.client.operate(key, ops, error => callback(error))
    } else {
      process.nextTick(callback)
    }
  }

  /**
   * Delete all sessions from the store.
   *
   * @param {Function} callback - Callback function
   * @public
   */
  AerospikeStore.prototype.clear = function (callback) {
    debug('CLEAR')
    this.client.truncate(this.as_namespace, this.as_set, error => callback(error))
  }

  /**
   * Closes the Aerospike client connection.
   *
   * @param {boolean} [releaseEventLoop=true] - Whether to release the event
   * loop handle after the client is closed.
   *
   * @see http://www.aerospike.com/apidocs/nodejs/module-aerospike.html#.releaseEventLoop
   *
   * @public
   */
  AerospikeStore.prototype.close = function (releaseEventLoop) {
    debug('CLOSE - release event loop: %s', releaseEventLoop)
    this.client.close(releaseEventLoop)
    this._onDisconnected()
  }

  return AerospikeStore
}
