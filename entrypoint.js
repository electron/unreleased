const { Toolkit } = require('actions-toolkit')
const { WebClient } = require('@slack/web-api')

const { fetchUnreleasedCommits, linkifyPRs } = require('./utils')

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

const slackWebClient =  new WebClient(SLACK_BOT_TOKEN)

Toolkit.run(async tools => {
  const branches = tools.arguments._[0].split(',') || 'master'
  for (const branch of branches) {
    tools.log.info(`Auditing branch ${branch}`)

    const commits = await fetchUnreleasedCommits(branch)
    tools.log.info(`Found ${commits.length} commits on ${branch}`)

    if (commits.length === 0) {
      response = `*No unreleased commits on ${branch}*`
    } else {
      response = `Unreleased commits in *${branch}*:\n${commits.map(c => `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${linkifyPRs(c.commit.message.split(/[\r\n]/)[0])}`).join('\n')}`
    }

    const result = await slackWebClient.chat.postMessage({
      channel: '#wg-releases',
      text: response
    })

    if (result.ok) {
      tools.log.info(`Audit message sent for ${branch} 🚀`)
    } else {
      tools.exit.failure(`Unable to send audit info for ${branch}: ` + result.error)
    }
  }
  tools.exit.success(`All release branches audited`)
}, {
  secrets: ['GITHUB_TOKEN', 'SLACK_BOT_TOKEN']
})
