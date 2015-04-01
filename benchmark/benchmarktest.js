var Benchmark = require('benchmark');
// basic usage (the `new` operator is optional)
// or options only
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

var suite = new Benchmark.Suite;
 
// add tests 
suite.add('AeroSpikeStore#set', function() {
  
  AeroSpikeStore.set('pranav',{cookie:{maxAge:2000},name:'nilesh gawde'}, function(err, ok){
          if(err) throw err;
         // done();
        });
    ///o/.test('Hello World!');
})
.add('AeroSpikeStore#get', function() {
    AeroSpikeStore.get('pranav', function(err, ok){  
        assert.ok(err.code === 0, 'get error!!!!');
    });
})
.add('AeroSpikeStore#length', function() {
    AeroSpikeStore.length(function(length){return length;});
})
.add('AeroSpikeStore#destroy', function() {
    AeroSpikeStore.destroy('pranav', function(err){
       // if(err.message) throw err;
       // done();
      });
})
// add listeners 
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
// run async 
.run({ 'async': true });
 
// logs: 
// > RegExp#test x 4,161,532 +-0.99% (59 cycles) 
// > String#indexOf x 6,139,623 +-1.00% (131 cycles) 
// > Fastest is String#indexOf 