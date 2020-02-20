# Aerospike Express Session Store [![travis][travis-image]][travis-url] [![codecov][codecov-image]][codecov-url] [![npm][npm-image]][npm-url]

[travis-image]: https://travis-ci.org/aerospike-community/aerospike-session-store-expressjs.svg?branch=master
[travis-url]: https://travis-ci.org/aerospike-community/aerospike-session-store-expressjs
[codecov-image]: https://codecov.io/gh/aerospike-community/aerospike-session-store-expressjs/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/aerospike-community/aerospike-session-store-expressjs
[npm-image]: https://img.shields.io/npm/v/aerospike-session-store.svg
[npm-url]: https://www.npmjs.com/package/aerospike-session-store

The Aerospike Express Session Store is an implementation of the Express.js
session store that uses Aerospike as the persistence layer for sessions. The
session middleware for Express is provided by the
[session-express](https://github.com/expressjs/session) module. Aerospike DB is
a high-performance NoSQL key-value store:
[www.aerospike.com](http://www.aerospike.com/).

## Installation

Via npm:

```bash
$ npm install aerospike-session-store
```
## Usage

### Initialization

Pass the `express-session` store into `aerospike-session-store` to create an
`AerospikeStore` constructor. Then use that constructor to create a new store
instance:

```js
const session = require('express-session')
const AerospikeStore = require('aerospike-session-store')(session)

var app = express()
app.use(session({
  secret: '123456789QWERTY',
  store: new AerospikeStore({
    namespace: 'express',
    set: 'session',
    ttl: 86400, // 1 day
    hosts: '10.0.0.1:3000,10.0.0.2:3000'
  }),
  resave: false,
  saveUninitialized: false
}))
```

### Options

The session store requires an Aerospike Client instance to connect to the DB
cluster. An existing client instance can be passed in using the `client`
option. Otherwise, the session store will create it's own client instance. The
Aerospike session store can be initialized with a number of optional
parameters:

* `client` - An existing Aerospike client instance that the session
  store should use instead of creating it's own instance.
* `namespace` - The Aerospike namespace to be used for session storage. (default: 'test')
* `set` - The Aerospike set name used when creating session records. (default: 'express-session')
* `ttl` - Time-to-live in seconds for the session records created in the
  Aerospike db. If not specified, the ttl will be determined based on the
  `maxAge` of the session cookie, if any. Set `ttl` to zero to disable usage of
  ttl. However, note that a default ttl at the namespace level might still apply.
* `mapper` - A custom data mapper to convert session objects to/from a
  format suitable for storage in an Aerospike record. By default, the `JSON`
  module is used to serialize session objects to/from JSON format.

Additional options are passed on to the Aerospike client when creating a new
client instance (i.e. unless the `client` paramter is used.) Please refer to
the client's [API
documentation](http://www.aerospike.com/apidocs/nodejs/Config.html) for a
detailed list of supported paramters.

## License

The Aerospike Express Session Store is made availabled under the terms of the
Apache License, Version 2, as stated in the file LICENSE.

Individual files may be made available under their own specific license, all
compatible with Apache License, Version 2. Please see individual files for
details.
