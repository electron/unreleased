const express = require('express')
const bodyParser = require('body-parser')

const { buildUnreleasedCommitsMessage, fetchUnreleasedCommits } = require ('./utils/unreleased-commits')
const { buildUnmergedPRsMessage, fetchUnmergedPRs } = require('./utils/unmerged-prs')
const { buildNeedsManualPRsMessage, fetchNeedsManualPRs } = require('./utils/needs-manual-prs')
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
    console.log(`User initiated unmerged audit for invalid branch: ${branch}`)
    return postToSlack({
      response_type: 'ephemeral',
      text: 'Branch name not valid. Try again?'
    }, req.body.response_url)
  }

  console.log(`Auditing unmerged PRs on branch: ${branch}`)

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

// Check for pull requests which have been merged to master and labeled 
// with target/BRANCH_NAME that trop failed for and which still need manual backports
app.post('/needs-manual', async (req, res) => {
  const initiatedBy = `<@${req.body.user_id}>`
  const branch = req.body.text

  if (!auditTarget.match(/[0-9]+-[0-9]+-x/)) {
    console.log(`User initiated needs-manual audit for invalid branch: ${branch}`)
    return postToSlack({
      response_type: 'ephemeral',
      text: 'Branch name not valid. Try again?'
    }, req.body.response_url)
  }

  console.log(`Auditing PRs needing manual backport to branch: ${branch}`)

  try {
    const prs = await fetchNeedsManualPRs(branch)
    console.log(`Found ${prs.length} prs on ${branch}`)

    postToSlack({
      response_type: 'in_channel',
      text: buildNeedsManualPRsMessage(branch, prs, initiatedBy)
    }, req.body.response_url)

    return res.status(200).end()
  } catch (err) {
    console.error(err)
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
        console.error(err)
        return postToSlack({
          response_type: 'ephemeral',
          text: `Error: ${err}`
        }, req.body.response_url)
      }
    }
    return res.status(200).end()
  }
  
  if (!auditTarget.match(/[0-9]+-[0-9]+-x/)) {
    console.log(`User initiated unreleased commit audit for invalid branch: ${auditTarget}`)
    return postToSlack({
      response_type: 'ephemeral',
      text: 'Branch name not valid. Try again?'
    }, req.body.response_url)
  }

  console.log(`Auditing unreleased commits on branch: ${auditTarget}`)

  try {
    const commits = await fetchUnreleasedCommits(auditTarget)
    console.log(`Found ${commits.length} commits on ${auditTarget}`)

    postToSlack({
      response_type: 'in_channel',
      text: buildUnreleasedCommitsMessage(auditTarget, commits, initiatedBy)
    }, req.body.response_url)

    return res.status(200).end()
  } catch (err) {
    console.error(err)
    return postToSlack({
      response_type: 'ephemeral',
      text: `Error: ${err}`
    }, req.body.response_url)
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`electron-unreleased-commits listening on ${listener.address().port}`)
})
