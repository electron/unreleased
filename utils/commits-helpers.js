const fetch = require('node-fetch')

const { GITHUB_TOKEN } = require('../constants')

// Formulate a list of all commits based on a certain url endpoint
// for a release tag on Electron
async function getAll(urlEndpoint) {
  const objects = []
  for await (const obj of getAllGenerator(urlEndpoint)) objects.push(obj)
  return objects
}

// Generate and iterate through the JSON blob representing commits
async function* getAllGenerator(urlEndpoint) {
  let next = urlEndpoint
  while (true) {
    const resp = await fetch(next, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    })

    if (!resp.ok) {
      if (resp.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = Math.round(resp.headers.get('x-ratelimit-reset') - Date.now() / 1000)
        throw new Error(`Ratelimited. Resets in ${resetTime} seconds.`)
      }
      throw new Error(`${resp.status} ${resp.statusText}`)
    }

    const json = await resp.json()
    yield* json

    if (!resp.headers.get('link')) break
    const next_link = resp.headers.get('link')
      .split(/,/)
      .map(x => x.split(/;/))
      .find(x => x[1].includes('next'))

    if (!next_link) break
    next = next_link[0].trim().slice(1, -1)
  }
}

module.exports = {
  getAll,
  getAllGenerator
}
