const express = require('express')
const session = require('express-session')
const AerospikeStore = require('aerospike-session-store')(session)

var app = express()
app.use(session({
  secret: '123456789QWERTY',
  store: new AerospikeStore({
    namespace: 'express',
    set: 'session',
    ttl: 86400, // 1 day
    hosts: process.env.AEROSPIKE_HOSTS
  }),
  resave: false,
  saveUninitialized: false
}))
app.get('/', (req, res) => {
  var sess = req.session
  if (sess.views) {
    sess.views++
    res.setHeader('Content-Type', 'text/html')
    res.write('<p>views: ' + sess.views + '</p>')
    res.end()
  } else {
    console.log('initializing new session: ', req.sessionID)
    sess.views = 1
    res.end('welcome to the session demo. refresh!')
  }
  console.log('[%s] views=%s', req.sessionID, sess.views)
})
app.listen(3000, () => {
  console.log('Session store example listening at http://localhost:3000/.')
})
