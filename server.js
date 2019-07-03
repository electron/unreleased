const express = require('express')
const bodyParser = require('body-parser')

const { buildUnreleasedCommitsMessage, fetchUnreleasedCommits } = require ('./utils/unreleased-commits')
const { buildUnmergedPRsMessage, fetchUnmergedPRs } = require('./utils/unmerged-commits')
const { postToSlack, getSupportedBranches } = require('./utils/helpers')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.use(express.static('public'))

// Check for pull requests targeting a specified release branch
// that have not yet been merged.
app.post('/unmerged', async (req, res) => {
  const initiatedBy = `<@${req.body.user_id}>`

  const branch = req.body.text
  if (!branch.match(/[0-9]+-[0-9]+-x/)) {
    console.log(`User initiated unmerged audit with invalid branch: ${branch}`)
    return postToSlack({
      response_type: 'ephemeral',
      text: 'Branch name not valid. Try again?'
    }, req.body.response_url)
  }

  try {
    const prs = await fetchUnmergedPRs(branch)
    console.log(`Found ${prs.length} unmerged PRs targeting ${branch}`)

    postToSlack({
      response_type: 'in_channel',
      text: buildUnmergedPRsMessage(branch, prs, initiatedBy)
    }, req.body.response_url)

    return res.status(200).end()
  } catch (err) {
    return postToSlack({
      response_type: 'ephemeral',
      text: `Error: ${err}`
    }, req.body.response_url)
  }
})

// Check for commits which have been merged to a release branch but
// not been released in a beta or stable.
app.post('/audit', async (req, res) => {
  const initiatedBy = `<@${req.body.user_id}>`
  const auditTarget = req.body.text

  // Allow for manual batch audit of all supported release branches
  if (auditTarget === 'all') {
    console.log(`Auditing all supported release branches`)

    const branches = await getSupportedBranches()
    for (const branch of branches) {
      console.log(`auditing branch ${branch}`)
      try {
        const commits = await fetchUnreleasedCommits(branch)
        console.log(`Found ${commits.length} commits on ${branch}`)
        postToSlack({
          response_type: 'in_channel',
          text: buildCommitsMessage(branch, commits, initiatedBy)
        }, req.body.response_url)
      } catch (err) {
        console.log(err)
        return postToSlack({
          response_type: 'ephemeral',
          text: `Error: ${err}`
        }, req.body.response_url)
      }
    }
    return res.status(200).end()
  }
  
  if (!auditTarget.match(/[0-9]+-[0-9]+-x/)) {
    console.log(`User initiated unreleased audit with invalid branch: ${auditTarget}`)
    return postToSlack({
      response_type: 'ephemeral',
      text: 'Branch name not valid. Try again?'
    }, req.body.response_url)
  }

  console.log(`auditing branch ${branch}`)

  try {
    const commits = await fetchUnreleasedCommits(auditTarget)
    console.log(`Found ${commits.length} commits on ${branch}`)

    postToSlack({
      response_type: 'in_channel',
      text: buildUnreleasedCommitsMessage(branch, commits, initiatedBy)
    }, req.body.response_url)

    return res.status(200).end()
  } catch (err) {
    console.log(err)
    return postToSlack({
      response_type: 'ephemeral',
      text: `Error: ${err}`
    }, req.body.response_url)
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`electron-unreleased-commits listening on ${listener.address().port}`)
})
