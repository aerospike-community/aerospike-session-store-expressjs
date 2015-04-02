aerospike-session-store
=======================
aerospike-session-store is an implementation of the ExpressJS session store that uses Aerospike as the persistence layer for sessions.

## Installation

via npm:

```bash
$ npm install aerospike-session-store
```

## Options

* `ttl` Aerospike record ttl in seconds.
* `hosts` The collection of hosts on which Aerospike is deployed.
* `prefix` The optional prefix for each session key, in case the Aerospike servers are shared with something generating its own keys. Default 'sess:' is used if no value is provided.
* `ns` The optional Aerospike namespace to be used for session storage. The 'test' namespace is used if no value is provided.
* `st` The name of the Aerospike set used to create the session store. A set named 'store' is used if no value is provided.


## Usage

### Initialization

```js
var session = require('express-session');
var aerospikeStore = require('aerospike-session-store')(session);

var AeroSpikeStore = new aerospikeStore({
  ttl: 86400,
  hosts: ['127.0.0.1:3000'],
  prefix: 'sess:',
  ns: 'test'
});

var app = express();
app.use(session({
  secret: '123456789QWERTY',
  store: AeroSpikeStore,
  resave: false,
  saveUninitialized: false
}));
```

### Set session

Stores the session into the Aerospike session store. Session values are serialized into a string and saved in the Aerospike session store as a string.

`set(<sessionID>, {cookie:{maxAge:<n seconds>}, <session value>}, <callback_function(err,res)>)` 

#### Options
* `sessionID` The unique session id.
* `maxAge` The ttl value for session. This value is in seconds.
* `session value` e.g., email: 'email@domain.com'.
* `callback_function(err,res)` Returns error codes. `err` = returns error, if any. `res` contains session key.

### Example
```js
AeroSpikeStore.set('session1',{cookie:{maxAge:2000},name:'firstname lastname'}, function(err, ok){
          if(err) throw err;
      });
```


### Get session
Retrieves session based on the given sessionID. Returns error if the requested session is not found.

`get(<sessionID>, <callback_function(err,res)>)`

#### Options
* `sessionID` The ID of the session id to be retrieved.
* `callback_function(err,res)` Returns error codes or session object in JSON. `err` holds error. `res` holds session object.

### Example
```js
AeroSpikeStore.get('session1', function(err, ok){
        assert.ok(err.code === 0, 'get error!!!!');
        assert.ok(ok.cookie.maxAge===2000,'get maxAge error!!!!');
        assert.ok(ok.name ==='y.p','get name error!!!!'); 
      });
```

### Session length
Returns the number of sessions stored in the session store.

`length(<callback_function(err,res)>)`

#### Options
* `callback_function(err,res)` Returns error codes or length as integer (0 or >0. `err` holds error. `res` holds length as integer.

### Example
```js
AeroSpikeStore.length(function(length){
        console.log(length);
      });
```

### Destroy particular user session
Destroys the requested session

`destroy(<sessionID>,<callback_function(err,res)>)`

#### Options
* `sessionID` The ID of the session to be destroyed.
* `callback_function(err,res)` Returns error if the requested session cannot be destroyed.

### Example
```js
AeroSpikeStore.destroy('session1', function(err){
        if(err) throw err;
      });
```

### Session length
Returns the number of sessions stored in the session store.

`length(<callback_function(err,res)>)`

#### Options
* `callback_function(err,res)` Returns error codes or length as integer (0 or >0. `err` holds error. `res` holds length as integer.

### Example
```js
AeroSpikeStore.length(function(length){
        console.log(length);
      });
```

### Destroy particular user session
Destroys the requested session

`destroy(<sessionID>,<callback_function(err,res)>)`

#### Options
* `sessionID` The ID of the session to be destroyed.
* `callback_function(err,res)` Returns error if the requested session cannot be destroyed.

### Example
```js
AeroSpikeStore.destroy('session1', function(err){
  			if(err) throw err;
  		});
```

## Tests

You need `mocha`.

```bash
make test
```
OR

```bash
mocha test
```

## Benchmark

You need `benchmark`.

```js
node ./benchmark/benchmark.js
```

## License



Copyright (c) 2011-2015 

{Licence and copyright notice to go here}

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.