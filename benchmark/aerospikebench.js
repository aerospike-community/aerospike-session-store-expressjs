const session = require('express-session')
const AerospikeStore = require('../')(session)

var store = new AerospikeStore({ ttl: 3600 })

var sessionsToCreate = 100000
var sessionsCreated = 0
var inFlight = 0
var maxConcurrent = 300

var payload = { cookie: { maxAge: 2000 }, name: 'sample name' }

var task = function (err, init) {
  if (err) throw err
  if (!init) inFlight--
  if (sessionsCreated < sessionsToCreate && inFlight < maxConcurrent) {
    var sessionID = 'test' + (sessionsCreated + 1)
    store.set(sessionID, payload, task)
    sessionsCreated++
    inFlight++
  } else if (sessionsCreated === sessionsToCreate && inFlight === 0) {
    console.timeEnd('bench ' + sessionsToCreate)
    store.close()
  }
}

console.time('bench ' + sessionsToCreate)
for (var i = 0; i < maxConcurrent; i++) {
  task(null, true)
}
