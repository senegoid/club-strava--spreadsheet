require('dotenv').config()
const fs = require('fs').promises
const strava = require('strava-v3')
const axios = require('axios')
const sheet = require('./spreadsheet')

let cfg = null
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
const STRAVA_WEBHOOK = process.env.STRAVA_WEBHOOK
const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN

const baseURL = 'https://www.strava.com/api/v3/push_subscriptions'

const config = async (force = false) => {
  if (cfg == null || force) {
    const content = await fs.readFile('data/strava_config')
    cfg = JSON.parse(content)
    await strava.config(cfg)

    const params = {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET
    }

    const subs = await axios.get(baseURL, { params })
    subs.data.map(async (sub) => {
      await axios.delete(`${baseURL}/${sub.id}`, { params })
    })
    params.callback_url = STRAVA_WEBHOOK
    params.verify_token = STRAVA_VERIFY_TOKEN
    const resp = await axios.post(baseURL, params)
    console.log(resp)
  }
  return true
}

const atividade = async (id) => {
  config()
  const payload = await strava.activities.get({ 'id': id })
  return payload
}
// sheet.gravarAtividade(atv)
// Ladeira = 491156
module.exports = {
  atividade,
  config
}
