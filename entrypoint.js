const { Toolkit } = require('actions-toolkit')
const { WebClient } = require('@slack/web-api')

const { fetchUnreleasedCommits, linkifyPRs, getSupportedBranches } = require('./utils')

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const slackWebClient =  new WebClient(SLACK_BOT_TOKEN)

Toolkit.run(async tools => {
  const branches = await getSupportedBranches()
  for (const branch of branches) {
    tools.log.info(`Auditing branch ${branch}`)

    let response
    const commits = await fetchUnreleasedCommits(branch)
    tools.log.info(`Found ${commits.length} commits on ${branch}`)

    if (commits.length === 0) {
      response = `*No unreleased commits on ${branch}*`
    } else {
      const formattedCommits = commits.map(c => {
        const prLink = linkifyPRs(c.commit.message.split(/[\r\n]/)[0])
        return `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${prLink}` 
      }).join('\n')

      response = `Unreleased commits in *${branch}* (automatic audit):\n${formattedCommits}`
      if (commits.length >= 10) {
        tools.log.info(`Reached ${commits.length} commits on ${branch}, time to release.`)
        response += `\n <@releases-wg>, there are a lot of unreleased commits on \`${branch}\`! Time for a release?`
      }
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
