var assert = require("assert");
var should = require("should");
var express = require('express');
var session = require('express-session');
var aerospikeStore = require('../lib/aerospike-session-store')(session);

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


describe('AeroSpikeStore', function(){
  describe('set()', function(){
    it('should set session when no error', function(done){
     	 AeroSpikeStore.set('session1',{cookie:{maxAge:2000},name:'firstname lastname'}, function(err, ok){
          if(err) throw err;
     		done();
     	});
    })
  })
  
  describe('length()', function(){
  	it('should return 1 if session is present', function(done){
  		AeroSpikeStore.length(function(length){
        assert.equal(1, length);
        done();
      });
  	})
  })

  describe('get()', function(){
  	it('should return session if session is present', function(done){
  		AeroSpikeStore.get('session1', function(err, ok){
  			assert.ok(err.code === 0, 'get error!!!!');
  			done(); 		
  		});
  	})
    it('should throw error in case session is not found',function(done){
      assert.throws(AeroSpikeStore.get('session2', function(err, ok){
        if(err) throw err;
        done();
      })); 
    })
	it('should return session if session has not expired', function(done){
  		AeroSpikeStore.get('session1', function(err, ok){
  			assert.ok(ok.cookie.maxAge === 2000, 'get maxAge error!!!!');
  			done();		
		});
	})
  it('should throw error in case session has expired',function(done){
      AeroSpikeStore.get('session1', function(err, ok){
        assert.notEqual(ok.cookie.maxAge,3000);
        done();
      }); 
    })
	it('should not return error if session value is matching', function(done){
		AeroSpikeStore.get('session1', function(err, ok){
			assert.ok(ok.name === 'last lastname', 'get name error!!!');
			done();		
	});
	})
  it('should throw error in case session value is not matching',function(done){
    AeroSpikeStore.get('session1', function(err, ok){
      assert.notEqual(ok.name,'firstname m. lastname', 'get name error!!!');
      done();
    }); 
  })
})

  describe('destroy()', function(){
  	it('should not throw error if able to destroy session', function(done){
  		AeroSpikeStore.destroy('session1', function(err){
  			if(err) throw err;
     		done();
  		});
      
  	})
  })

  describe('length()', function(){
    it('should return 0 if session is destroyed', function(done){
      AeroSpikeStore.length(function(length){
        assert.equal(0, length);
        done();
      });
    })
  })
});