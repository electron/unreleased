const https = require('https')
const url = require('url')

const express = require('express')
const bodyParser = require('body-parser')

const { buildCommitsMessage, fetchUnreleasedCommits } = require ('./utils/commits')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(express.static('public'))

// Check for commits which have been merged to a release branch but
// not been released in a beta or stable.
app.post('/audit', async (req, res) => {
  const initiatedBy = `<@${req.body.user_id}>`
  const branch = req.body.text

  if (!branch.match(/[0-9]+-[0-9]+-x/)) {
    return postToSlack({
      response_type: 'ephemeral',
      text: 'Branch name not valid. Try again?'
    }, req.body.response_url)
  }

  try {
    const commits = await fetchUnreleasedCommits(branch)
  
    postToSlack({
      response_type: 'in_channel',
      text: buildCommitsMessage(branch, commits, initiatedBy)
    }, req.body.response_url)

    return res.status(200).end()
  } catch (err) {
    return postToSlack({
      response_type: 'ephemeral',
      text: `Error: ${err}`
    }, req.body.response_url)
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`electron-unreleased-commits listening on ${listener.address().port}`)
})

const postToSlack = (data, postUrl) => {
  const r = https.request({
    ...url.parse(postUrl),
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    }
  })
  r.end(JSON.stringify(data))
}
