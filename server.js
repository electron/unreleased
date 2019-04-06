const https = require('https')
const url = require('url')

const express = require('express')
const bodyParser = require('body-parser')

const { fetchUnreleasedCommits, linkifyPRs } = require ('./utils')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(express.static('public'))

app.post('/audit', (req, res) => {
  const respond = (data) => {
    const r = https.request({
      ...url.parse(req.body.response_url),
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    })
    r.end(JSON.stringify(data))
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

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port);
})
