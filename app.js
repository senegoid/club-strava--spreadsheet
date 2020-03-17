require('dotenv').config()
const express = require('express')
const logger = require('morgan')
const fs = require('fs').promises
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const methodOverride = require('method-override')
const passport = require('passport')
const util = require('util')
const path = require('path')
const StravaStrategy = require('passport-strava-oauth2').Strategy
const engine = require('ejs-locals')
const spreadsheet = require('./spreadsheet')
const strava = require('./strava')
const stravaConfigTemplate = '/scripts/strava_config'
const stravaConfig = 'data/strava_config'

// use ejs-locals for all ejs templates:

const usuarios = []

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
const STRAVA_CALLBACK_URL = process.env.STRAVA_CALLBACK_URL
const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN

passport.serializeUser(function (user, done) {
  done(null, user)
})

passport.deserializeUser(function (obj, done) {
  done(null, obj)
})

passport.use(new StravaStrategy({
  clientID: STRAVA_CLIENT_ID,
  clientSecret: STRAVA_CLIENT_SECRET,
  callbackURL: STRAVA_CALLBACK_URL
},
function (accessToken, refreshToken, profile, done) {
  usuarios.push({ accessToken, refreshToken, profile })
  process.nextTick(function () {
    return done(null, profile)
  })
}
))

const app = express()

// configure Express
app.engine('ejs', engine)
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')
app.use(logger('dev'))
app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride())
app.use(session({ secret: 'keyboard cat' }))
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(path.join(__dirname, '/public')))

app.get('/', function (req, res) {
  res.render('index', { user: req.user })
})

app.get('/account', ensureAuthenticated, async function (req, res) {
  res.render('account', { user: req.user })
})

app.get('/login', function (req, res) {
  res.render('login', { user: req.user })
})

app.get('/auth/strava',
  passport.authenticate('strava', { scope: ['activity:write,profile:write,read_all,profile:read_all,activity:read_all'] }),
  function (req, res) {

  })

app.get('/auth/strava/callback',
  passport.authenticate('strava', { failureRedirect: '/login' }),
  function (req, res) {
    usuarios[usuarios.length - 1].code = req.query.code
    gravarConfig(usuarios[usuarios.length - 1])
    res.redirect('/')
  })

app.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/')
})

app.post('/webhook', function (req, res) {
  console.log('webhook event received!', req.query, req.body)
  spreadsheet.gravarEvento(req.body)
  res.status(200).send('EVENT_RECEIVED')
})

app.get('/webhook', function (req, res) {
  let mode = req.query['hub.mode']
  let token = req.query['hub.verify_token']
  let challenge = req.query['hub.challenge']
  if (mode && token) {
    if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED')
      res.json({ 'hub.challenge': challenge })
    } else {
      res.sendStatus(403)
    }
  } else {
    res.sendStatus(404)
  }
})

app.listen(process.env.PORT || 3000)

function ensureAuthenticated (req, res, next) {
  if (req.isAuthenticated()) { return next() }
  res.redirect('/login')
}

async function gravarConfig (user) {
  var content = await fs.readFile(path.join(__dirname, stravaConfigTemplate))
  await fs.writeFile(stravaConfig, content)
  content = await fs.readFile(stravaConfig)
  var config = JSON.parse(content)
  config.client_id = STRAVA_CLIENT_ID
  config.client_secret = STRAVA_CLIENT_SECRET
  config.access_token = user.accessToken
  config.redirect_uri = STRAVA_CALLBACK_URL
  config.code = user.code

  await fs.writeFile(stravaConfig, JSON.stringify(config, null, 2))
  await strava.config()
  return true
}
