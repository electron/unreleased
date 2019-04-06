const { Toolkit } = require('actions-toolkit')
const IncomingWebhook = require('@slack/webhook')
const url = require('url')
const fetch = require('node-fetch')

const GH_API_PREFIX = 'https://api.github.com'
const ORGANIZATION_NAME = 'electron'
const REPO_NAME = 'electron'

const ACCESS_TOKEN = process.env.GH_ACCESS_TOKEN

const SLACK_CHANNEL_URL = process.env.SLACK_WEBHOOK_URL
const webhook = new IncomingWebhook(SLACK_CHANNEL_URL)

Toolkit.run(async tools => {
  const branches = tools.arguments._[0].split(',') || 'master'
  for (const branch of branches) {
    const commits = await fetchUnreleasedCommits(branchName)
    const response = `Unreleased commits in *${branchName}*:\n${commits.map(c => {
      `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${linkifyPRs(c.commit.message.split(/[\r\n]/)[0])}`
    }).join('\n')}`

    await webhook.send({ text: response });
  }
},{
  secrets: ['GH_ACCESS_TOKEN']
})

async function getAll(urlEndpoint) {
  const objects = []
  for await (const obj of getAllGenerator(urlEndpoint)) objects.push(obj)
  return objects
}

async function* getAllGenerator(urlEndpoint) {
  let next = urlEndpoint
  while (true) {
    const resp = await fetch(next, { 
      headers: { Authorization: `token ${ACCESS_TOKEN}` }
    })

    if (!resp.ok) {
      if (resp.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = Math.round(resp.headers.get('x-ratelimit-reset') - Date.now() / 1000)
        throw new Error(`Ratelimited. Resets in ${resetTime} seconds.`)
      }
      throw new Error(`${resp.status} ${resp.statusText}`)
    }

    const json = await resp.json()
    yield *json
    if (!resp.headers.get('link')) break
    const next_link = resp.headers.get('link').split(/,/).map(x => { 
      x.split(/;/)
    }).find(x => {
      x[1].includes('next')
    })

    if (!next_link) break
    next = next_link[0].trim().slice(1, -1)
  }
}

const postToSlack = (data) => {
  const r = https.request({
    ...url.parse(req.body.response_url),
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    }
  })
  r.end(JSON.stringify(data))
}

function linkifyPRs(msg) {
  return msg.replace(/#(\d+)/g, (_, pr_id) =>
    `<https://github.com/${ORGANIZATION_NAME}/${REPO_NAME}/pull/${pr_id}|#${pr_id}>`)
}

async function fetchUnreleasedCommits(branchName) {
  const tags = await getAll(`${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/tags`)
  const unreleased = []
  const url = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/commits?sha=${branchName}`

  for await (const commit of getAllGenerator(url)) {
    const tag = tags.find(t => t.commit.sha === commit.sha)
    if (tag) break
    unreleased.push(commit)
  }
  return unreleased
}
