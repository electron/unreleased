const { getAll, getAllGenerator } = require('./commits-helpers')
const { linkifyPRs, releaseIsDraft } = require('./helpers')

const {
  ORGANIZATION_NAME,
  REPO_NAME,
  GH_API_PREFIX,
  SLACK_USER
} = require('../constants')

// Fetch all unreleased commits for a specified release line branch
async function fetchUnreleasedCommits(branch) {
  const tags = await getAll(`${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/tags`)
  const unreleased = []
  const url = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/commits?sha=${branch}`

  for await (const commit of getAllGenerator(url)) {
    const tag = tags.find(t => t.commit.sha === commit.sha)
    if (tag) {
      const isDraft = await releaseIsDraft(tag.name)
      if (!isDraft) break
    }
    unreleased.push(commit)
  }
  return unreleased
}

// Build the text blob that will be posted to Slack &
// conditionally notify the release team if it's time to release
function buildUnreleasedCommitsMessage(branch, commits, initiatedBy) {
  if (!commits || commits.length === 0) return `*No unreleased commits on ${branch}*`

  const formattedCommits = commits.map(c => {
    const prLink = linkifyPRs(c.commit.message.split(/[\r\n]/, 1)[0])
    return `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${prLink}`
  }).join('\n')

  let response = `Unreleased commits in *${branch}* (from ${initiatedBy}):\n${formattedCommits}`
  if (commits.length >= 10) {
    response += `\n <@${SLACK_USER}>, there are a lot of unreleased commits on \`${branch}\`! Time for a release?`
  }
  return response
}

module.exports = {
  buildUnreleasedCommitsMessage,
  fetchUnreleasedCommits
}