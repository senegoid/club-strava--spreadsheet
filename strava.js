const fs = require('fs').promises
const strava = require('strava-v3')
// const sheet = require('./spreadsheet')

let cfg = null

const config = async (force = false) => {
  if (cfg == null || force) {
    const content = await fs.readFile('data/strava_config')
    cfg = JSON.parse(content)
    await strava.config(cfg)
  }
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
