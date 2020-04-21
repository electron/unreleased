const { Toolkit } = require('actions-toolkit')
const { WebClient } = require('@slack/web-api')

const {
  buildUnreleasedCommitsMessage,
  fetchUnreleasedCommits,
} = require('./utils/unreleased-commits')

const {
  buildNeedsManualPRsMessage,
  fetchNeedsManualPRs,
} = require('./utils/needs-manual-prs')

const { getSupportedBranches } = require('./utils/helpers')
const { SLACK_BOT_TOKEN, ACTION_TYPE } = require('./constants')

const slackWebClient = new WebClient(SLACK_BOT_TOKEN)
const AUDIT_POST_CHANNEL = process.env.AUDIT_POST_CHANNEL || '#wg-releases'

Toolkit.run(
  async tools => {
    const initiatedBy = 'automatic audit'
    const branches = await getSupportedBranches()
    for (const branch of branches) {
      tools.log.info(`Auditing ${ACTION_TYPE} on branch ${branch}`)

      let commits
      if (ACTION_TYPE === 'unreleased') {
        commits = await fetchUnreleasedCommits(branch)
      } else if (ACTION_TYPE === 'needs-manual') {
        commits = await fetchNeedsManualPRs(branch, null /* author */)
      }

      tools.log.info(`Found ${commits.length} commits on ${branch}`)
      if (ACTION_TYPE === 'unreleased' && commits.length >= 10) {
        tools.log.info(
          `Reached ${commits.length} commits on ${branch}, time to release.`,
        )
      }

      let text = `${ACTION_TYPE} audit`
      if (ACTION_TYPE === 'unreleased') {
        text += buildUnreleasedCommitsMessage(branch, commits, initiatedBy)
      } else if (ACTION_TYPE === 'needs-manual') {
        text += buildNeedsManualPRsMessage(
          branch,
          commits,
          true /* shouldRemind */,
        )
      }

      const result = await slackWebClient.chat.postMessage({
        channel: AUDIT_POST_CHANNEL,
        text,
      })

      if (result.ok) {
        tools.log.info(`Audit message sent for ${branch} 🚀`)
      } else {
        tools.exit.failure(
          `Unable to send audit info for ${branch}: ` + result.error,
        )
      }
    }
    tools.exit.success(`All release branches audited`)
  },
  {
    secrets: ['GITHUB_TOKEN', 'SLACK_BOT_TOKEN'],
  },
)
