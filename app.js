require('dotenv').config()
var express = require('express')


var logger = require('morgan')


var cookieParser = require('cookie-parser')


var bodyParser = require('body-parser')


var session = require('express-session')


var methodOverride = require('method-override')


var passport = require('passport')


var util = require('util')


var StravaStrategy = require('passport-strava-oauth2').Strategy

var STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
var STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Strava profile is
//   serialized and deserialized.
passport.serializeUser(function (user, done) {
  done(null, user)
})

passport.deserializeUser(function (obj, done) {
  done(null, obj)
})

// Use the StravaStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Strava
//   profile), and invoke a callback with a user object.
passport.use(new StravaStrategy({
  clientID: STRAVA_CLIENT_ID,
  clientSecret: STRAVA_CLIENT_SECRET,
  callbackURL: process.env.STRAVA_CALLBACK_URL
},
  function (accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      // To keep the example simple, the user's Strava profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Strava account with a user record in your database,
      // and return that user instead.
      return done(null, profile)
    })
  }
))

var app = express()

// configure Express
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(logger('dev'))
app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride())
app.use(session({ secret: 'keyboard cat' }))
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
  res.render('index', { user: req.user })
})

app.get('/account', ensureAuthenticated, function (req, res) {
  res.render('account', { user: req.user })
})

app.get('/login', function (req, res) {
  res.render('login', { user: req.user })
})

// GET /auth/strava
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Strava authentication will involve
//   redirecting the user to strava.com.  After authorization, Strava
//   will redirect the user back to this application at /auth/strava/callback
app.get('/auth/strava',
  passport.authenticate('strava', { scope: ['activity:read_all'] }),
  function (req, res) {
    // The request will be redirected to Strava for authentication, so this
    // function will not be called.
  })

// GET /auth/strava/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/strava/callback',
  passport.authenticate('strava', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/')
  })

app.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/')
})

app.route('/webhook').post((req, res) => {
  console.log('webhook event received!', req.query, req.body)
  res.status(200).send('EVENT_RECEIVED')
}).get((req, res) => {
  const VERIFY_TOKEN = 'STRAVA'
  let mode = req.query['hub.mode']
  let token = req.query['hub.verify_token']
  let challenge = req.query['hub.challenge']
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED')
      res.json({ 'hub.challenge': challenge })
    } else {
      res.sendStatus(403)
    }
  }
})

app.listen(process.env.PORT || 3000)

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next() }
  res.redirect('/login')
}
