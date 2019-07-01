const https = require('https')
const url = require('url')

const express = require('express')
const bodyParser = require('body-parser')

const { fetchUnreleasedCommits, linkifyPRs } = require ('./utils')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(express.static('public'))

app.post('/audit', async (req, res) => {
  const branch = req.body.text

  if (!branch.match(/[0-9]+-[0-9]+-x/)) {
    return postToSlack({
      response_type: 'ephemeral',
      text: 'Branch name not valid. Try again?'
    }, req.body.response_url)
  }

  try {
    let response
    const commits = await fetchUnreleasedCommits(branch)
    if (commits.length === 0) {
      response = `*No unreleased commits on ${branch}*`
    } else {
      const formattedCommits = commits.map(c => {
        const prLink = linkifyPRs(c.commit.message.split(/[\r\n]/)[0])
        return `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${prLink}` 
      }).join('\n')

      response = `Unreleased commits in *${branch}* (from <@${req.body.user_id}>):\n${formattedCommits}`
      if (commits.length >= 10) {
        response += `\n <@releases-wg>, there are a lot of unreleased commits on \`${branch}\`! Time for a release?`
      }
    }
  
    postToSlack({
      response_type: 'in_channel',
      text: response
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
