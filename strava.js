const client = require('strava-v3')
const sheet = require('./spreadsheet')

const atividade = async (id, token) => {
  const payload = await client.activities.get({ 'id': id, 'access_token': token })
  // console.log(payload)
  return payload
}
const atv = atividade('3172895150', '75ee4157d893a0da62e8947baa12d0282b26f58e')
sheet.gravarAtividade(atv)
// Ladeira = 491156
module.exports = {
  atividade
}
