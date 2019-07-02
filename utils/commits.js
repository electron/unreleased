const fetch = require('node-fetch')
const { linkifyPRs, releaseIsDraft } = require('./helpers')

const {
  GITHUB_TOKEN,
  ORGANIZATION_NAME,
  REPO_NAME,
  GH_API_PREFIX,
  SLACK_USER
} = require('../constants')

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

// Fetch all unreleased commits for a specified release line branch
async function fetchUnreleasedCommits(branch) {
  const tags = await getAll(`${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/tags`)
  const unreleased = []
  const url = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/commits?sha=${branch}`

  for await (const commit of getAllGenerator(url)) {
    const tag = tags.find(t => t.commit.sha === commit.sha)
    if (tag) {
      const isDraft = await releaseIsDraft(tag.name)
      if (!isDraft) break
    }
    unreleased.push(commit)
  }
  return unreleased
}

// Build the text blob that will be posted to Slack &
// conditionally notify the release team if it's time to release
function buildCommitsMessage(branch, commits, initiatedBy) {
  if (!commits || commits.length === 0) return `*No unreleased commits on ${branch}*`

  const formattedCommits = commits.map(c => {
    const prLink = linkifyPRs(c.commit.message.split(/[\r\n]/, 1)[0])
    return `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${prLink}`
  }).join('\n')

  let response = `Unreleased commits in *${branch}* (from ${initiatedBy}):\n${formattedCommits}`
  if (commits.length >= 10) {
    response += `\n <@${SLACK_USER}>, there are a lot of unreleased commits on \`${branch}\`! Time for a release?`
  }
  return response
}

module.exports = {
  buildCommitsMessage,
  fetchUnreleasedCommits
}
