/*
* aerospike session store module
* saves session information in aerospike
*/

/* 
* dependencies
*/
var _ = require('lodash');
//var crypto = require('crypto');
var util = require('util');
var aerospike = require('aerospike');



/**
 * Default options
 */
var _default_port = 3000;

var defaultOptions = {
  hosts: ['127.0.0.1:3000'],
  log_level: '5',
  time_out: 10,
  prefix: 'sess:',
  stringify: true,
  hash: false,
  ns: 'test',
  st: 'store',
  ttl:  60 * 60 * 24 * 14, // 14 days
};


var defaultHashOptions = {
  salt: '123456789QWERTY',
  algorigthm: 'sha1'
};


var defaultSerializationOptions = {
  serialize: function(session){
    var obj = {};
    for(var prop in session){
      if(prop === 'cookie'){
        obj.cookie = session.cookie.toJSON ? session.cookie.toJSON() : session.cookie;
      } else {
        obj[prop] = session[prop];
      }
    }
    return obj;
  },
  unserialize: _.identity
};

var stringifySerializationOptions = {
  serialize: JSON.stringify,
  unserialize: JSON.parse
};


/*
* aerospike-session-store
* returns AerospikeSessionStore object
*/

module.exports = function(session){
	 
	var Store = session.Store;
	


/*
* initialize aerospike-session-store with passed options
* @param {object} options
*/
	function AerospikeSessionStore(options){
		var self = this;
		options = _.defaults(options || {}, defaultOptions);
		Store.call(self, options);
		//Store = session.Store;

		self.prefix = options.prefix;
    	self.ns = options.ns;
    	self.st = options.st;
    	self.ttl = options.ttl;
    	//console.log(options.ns);
		if(options.hosts){
			var hosts = options.hosts.map(function(host){
				var _val = host.split(':');
				var _host = _val[0];
				  var _port = ~~_val[1] || _default_port
				return { addr:_host,port:parseInt(_port)};
			});
		}

		/* connection to aerospike */
		aerospike.client({
			hosts:hosts,
			log:{
				level: options.log_level
			},
			policies: {
				timeout: options.time_out
			}
		}).connect(function(err,client){
			if(err.code != aerospike.status.AEROSPIKE_OK){
				console.error('Aerospike server connection Error : %j', err);
			} else {
				self.client = client;
			}
		});
		
		this.getSessionId = function(sid){
      		if(options.hash){
        		return crypto.createHash(options.hash.algorithm).update(options.hash.salt + this.prefix + sid).digest('hex');
      		} else {
        		return this.prefix + sid;
      		}
    	}

	};

/* inherit from Store */
	util.inherits(AerospikeSessionStore, Store);

/*
* save a particular session to aerospike
* @param {string} sid
* @param {session} session
* @param {function} callback
*/

	AerospikeSessionStore.prototype.set = function(sid, session, callback){
		if(!callback) callback = _.noop;
		//console.log(session);
		sid = this.getSessionId(sid);
		var maxAge = session.cookie.maxAge;
		var ttl = this.ttl;
		var key = aerospike.key(this.ns, this.st, sid);
		//console.log(key);
		ttl = ttl || (typeof maxAge === 'number' ? maxAge/1000 | 0 : oneDay);
		var meta = {gen:0, ttl:ttl};
		var sessionString = JSON.stringify(session);
		this.client.put(key, {sessionString: sessionString}, meta, function(err, key){
			//console.log(err);
			if(err.code != aerospike.status.AEROSPIKE_OK){
				
				callback(err);
			}else {
				
				callback(null, key);
			}
		});
		//return(sid+ ' - ' + maxAge + ' ' +ttl + ' '+ key);
	};

/*
* destroy a particular session value
* @param {string} sid
* @param {function} callback
*/
	AerospikeSessionStore.prototype.get = function(sid, callback){
		if(!callback) callback = _.noop;
		sid = this.getSessionId(sid);
		var key = aerospike.key(this.ns, this.st, sid);
		//console.log(key);
		this.client.get(key, function(err, res, meta){
			if(err.code	 === aerospike.status.AEROSPIKE_OK){
				var session;
				if(typeof res.sessionString === 'undefined'){
					session = res;
				} else{
					var sessionString = res.sessionString || '{}';
					session = JSON.parse(sessionString);
				}
				//console.log(sessionString);
				return callback({code: 0}, session);
			} else if(err.code === aerospike.status.AEROSPIKE_ERR_RECORD_NOT_FOUND){
				return callback();
			} else {
				return callback(err);
			}
		});
	},

/*
* calculate session length
* @param {function} callback
*/

	AerospikeSessionStore.prototype.length = function(callback){
		if(!callback) callback = _.noop;
		var key = aerospike.key(this.ns, this.st);
		var infocommand = 'sets/'+this.ns+'/'+this.st;
		
		this.client.info(infocommand,function(err, res, key){
				//console.log(res);
				var count_user = res.split(':');
				count_user = count_user[0].split('=');
				var numSession = 0;
				if(parseInt(count_user[1])>0){
						numSession = parseInt(count_user[1]);
					}
					//console.log(numSession);
				return callback(numSession);
		});
	};

/*
* destroy a particular session
* @param {string} sid
* @param {function} callback
*/

	AerospikeSessionStore.prototype.destroy = function(sid, callback){
		if(!callback) callback = _.noop;
		sid = this.getSessionId(sid);
		var key = aerospike.key(this.ns, this.st, sid);
		this.client.remove(key, function(err, key){
			if(err.code != aerospike.status.AEROSPIKE_OK){
				//console.log('error %s', err.message);
				callback(err);
			}else {
				//console.log('session destroyed')
				callback(null, key);
			}
		});


	};

return AerospikeSessionStore;

};