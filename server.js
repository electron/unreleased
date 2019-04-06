const https = require('https')
const url = require('url')
const express = require('express')

const { fetchUnreleasedCommits, linkifyPRs } = require ('index.js')

const app = express()

app.get("/audit", (req, res) => {
  const respond = (data) => {
    const r = https.request({
      ...url.parse(req.body.response_url),
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    })
    r.send(JSON.stringify(data))
  }

  const branch = req.body.text
  async function go() {
    let response
    const commits = await fetchUnreleasedCommits(branch)

    if (commits.length === 0) {
      response = `*No unreleased commits on ${branch}*`
    } else {
      response = `Unreleased commits in *${branch}*:\n${commits.map(c => `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${linkifyPRs(c.commit.message.split(/[\r\n]/)[0])}`).join('\n')}`
    }

    return respond({
      response_type: 'in_channel',
      text: response
    })
  }

  go().catch(e => {
    return respond({
      response_type: 'ephemeral',
      text: `Error: ${e}`
    })
  })

  return res.status(200).end()
})

module.exports = app
