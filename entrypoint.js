const { Toolkit } = require('actions-toolkit')
const { WebClient } = require('@slack/web-api')

const {
  buildUnreleasedCommitsMessage,
  fetchUnreleasedCommits,
} = require('./utils/unreleased-commits')
const { getSupportedBranches } = require('./utils/helpers')
const { SLACK_BOT_TOKEN } = require('./constants')

const slackWebClient = new WebClient(SLACK_BOT_TOKEN)
const AUDIT_POST_CHANNEL = process.env.AUDIT_POST_CHANNEL || '#wg-releases'

Toolkit.run(
  async tools => {
    const initiatedBy = 'automatic audit'
    const branches = await getSupportedBranches()
    for (const branch of branches) {
      tools.log.info(`Auditing branch ${branch}`)

      const commits = await fetchUnreleasedCommits(branch)

      tools.log.info(`Found ${commits.length} commits on ${branch}`)
      if (commits.length >= 10) {
        tools.log.info(
          `Reached ${commits.length} commits on ${branch}, time to release.`,
        )
      }

      const result = await slackWebClient.chat.postMessage({
        channel: AUDIT_POST_CHANNEL,
        text: buildUnreleasedCommitsMessage(branch, commits, initiatedBy),
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
