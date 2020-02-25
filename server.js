const express = require('express')
const bodyParser = require('body-parser')
const { WebClient } = require('@slack/web-api')

const {
  buildUnreleasedCommitsMessage,
  fetchUnreleasedCommits,
} = require('./utils/unreleased-commits')
const {
  buildUnmergedPRsMessage,
  fetchUnmergedPRs,
} = require('./utils/unmerged-prs')
const {
  buildNeedsManualPRsMessage,
  fetchNeedsManualPRs,
} = require('./utils/needs-manual-prs')
const { postToSlack, getSupportedBranches } = require('./utils/helpers')
const { RELEASE_BRANCH_PATTERN, SLACK_BOT_TOKEN } = require('./constants')

const slackWebClient = new WebClient(SLACK_BOT_TOKEN)

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(express.static('public'))

// Check for pull requests targeting a specified release branch
// that have not yet been merged.
app.post('/unmerged', async (req, res) => {
  const branch = req.body.text
  const { profile } = await slackWebClient.users.profile.get({
    user: req.body.user_id,
  })
  const initiator = {
    id: req.body.user_id,
    name: profile.display_name_normalized,
  }

  console.log(
    `${initiator.name} initiated unmerged audit for branch: ${branch}`,
  )

  if (!RELEASE_BRANCH_PATTERN.test(branch)) {
    console.log(`${branch} is not a valid branch`)
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    )
  }

  console.log(`Auditing unmerged PRs on branch: ${branch}`)

  try {
    const prs = await fetchUnmergedPRs(branch)
    console.log(`Found ${prs.length} unmerged PRs targeting ${branch}`)

    let message
    if (!prs || prs.length === 0) {
      message = `*No PRs needing manual backport to ${branch}*`
    } else {
      message = `Unmerged pull requests targeting *${branch}* (from <@${initiator.id}>):\n`
      message += buildUnmergedPRsMessage(branch, prs)
    }

    postToSlack(
      {
        response_type: 'in_channel',
        text: message,
      },
      req.body.response_url,
    )

    return res.status(200).end()
  } catch (err) {
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    )
  }
})

// Check for pull requests which have been merged to master and labeled
// with target/BRANCH_NAME that trop failed for and which still need manual backports
app.post('/needs-manual', async (req, res) => {
  const branches = await getSupportedBranches()

  const [branch, author] = req.body.text.split(' ')
  const { profile } = await slackWebClient.users.profile.get({
    user: req.body.user_id,
  })
  const initiator = {
    id: req.body.user_id,
    name: profile.display_name_normalized,
  }

  console.log(
    `${initiator.name} initiated needs-manual audit for branch: ${branch}`,
  )

  if (!RELEASE_BRANCH_PATTERN.test(branch) || !branches.includes(branch)) {
    console.log(`${branch} is not a valid branch`)
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    )
  }

  if (author) {
    console.log(`Scoping needs-manual PRs to those opened by ${author}`)
  }

  try {
    const prs = await fetchNeedsManualPRs(branch, author)
    console.log(`Found ${prs.length} prs on ${branch}`)

    let message
    if (!prs || prs.length === 0) {
      message = `*No PRs needing manual backport to ${branch}*`
    } else {
      message = `PRs needing manual backport to *${branch}* (from <@${initiator.id}>):\n`
      message += buildNeedsManualPRsMessage(branch, prs)
    }

    // If someone is running an audit on the needs-manual PRs that only
    // they are responsible for, make the response ephemeral.
    const responseType = initiator.name === author ? 'ephemeral' : 'in_channel'

    postToSlack(
      {
        response_type: responseType,
        text: message,
      },
      req.body.response_url,
    )

    return res.status(200).end()
  } catch (err) {
    console.error(err)
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    )
  }
})

// Check for commits which have been merged to a release branch but
// not been released in a beta or stable.
app.post('/unreleased', async (req, res) => {
  const branches = await getSupportedBranches()

  const auditTarget = req.body.text
  const { profile } = await slackWebClient.users.profile.get({
    user: req.body.user_id,
  })
  const initiator = {
    id: req.body.user_id,
    name: profile.display_name_normalized,
  }

  // Allow for manual batch audit of all supported release branches
  if (auditTarget === 'all') {
    console.log(
      `${initiator.name} triggered audit for all supported release branches`,
    )

    for (const branch of branches) {
      console.log(`Auditing branch ${branch}`)
      try {
        const commits = await fetchUnreleasedCommits(branch)
        console.log(`Found ${commits.length} commits on ${branch}`)
        postToSlack(
          {
            response_type: 'in_channel',
            text: buildUnreleasedCommitsMessage(branch, commits, initiator.id),
          },
          req.body.response_url,
        )
      } catch (err) {
        console.error(err)
        return postToSlack(
          {
            response_type: 'ephemeral',
            text: `Error: ${err}`,
          },
          req.body.response_url,
        )
      }
    }
    return res.status(200).end()
  }

  console.log(
    `${initiator.name} initiated unreleased commit audit for branch: ${auditTarget}`,
  )

  if (
    !RELEASE_BRANCH_PATTERN.test(auditTarget) ||
    !branches.includes(auditTarget)
  ) {
    console.log(`${auditTarget} is not a valid branch`)
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    )
  }

  try {
    const commits = await fetchUnreleasedCommits(auditTarget)
    console.log(`Found ${commits.length} commits on ${auditTarget}`)

    postToSlack(
      {
        response_type: 'in_channel',
        text: buildUnreleasedCommitsMessage(auditTarget, commits, initiator.id),
      },
      req.body.response_url,
    )

    return res.status(200).end()
  } catch (err) {
    console.error(err)
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    )
  }
})

// Combines checks for all PRs that either need manual backport to a given
// release line or which are targeting said line and haven't been merged.
app.post('/audit-pre-release', async (req, res) => {
  const branches = await getSupportedBranches()

  const branch = req.body.text
  const { profile } = await slackWebClient.users.profile.get({
    user: req.body.user_id,
  })
  const initiator = {
    id: req.body.user_id,
    name: profile.display_name_normalized,
  }

  console.log(
    `${initiator.name} initiated pre-release audit for branch: ${branch}`,
  )

  if (!RELEASE_BRANCH_PATTERN.test(branch) || !branches.includes(branch)) {
    console.log(`${branch} is not a valid branch`)
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    )
  }

  try {
    // In a prerelease audit, we don't want to scope by author so we pass null intentionally
    const needsManualPRs = await fetchNeedsManualPRs(branch, null)
    console.log(
      `Found ${needsManualPRs.length} PRs needing manual backport on ${branch}`,
    )

    const unmergedPRs = await fetchUnmergedPRs(branch)
    console.log(`Found ${unmergedPRs.length} unmerged PRs targeting ${branch}`)

    let message
    if (needsManualPRs.length + unmergedPRs.length === 0) {
      message = `*No PRs unmerged or needing manual backport for ${branch}*`
    } else {
      message = `Pre-release audit for *${branch}* (from <@${initiator.id}>)\n`

      if (needsManualPRs.length !== 0) {
        message += `PRs needing manual backport to *${branch}*:\n`
        message += `${buildNeedsManualPRsMessage(branch, needsManualPRs)}\n`
      }

      if (unmergedPRs.length !== 0) {
        message += `Unmerged pull requests targeting *${branch}*:\n`
        message += `${buildUnmergedPRsMessage(branch, unmergedPRs)}\n`
      }
    }

    postToSlack(
      {
        response_type: 'in_channel',
        text: message,
      },
      req.body.response_url,
    )

    return res.status(200).end()
  } catch (err) {
    console.error(err)
    return postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    )
  }
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`release-branch-auditor listening on ${listener.address().port}`)
})
