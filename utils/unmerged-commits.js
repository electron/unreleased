const { getAllGenerator } = require('./commits-helpers')
const { linkifyPRs } = require('./helpers')

const {
  ORGANIZATION_NAME,
  REPO_NAME,
  GH_API_PREFIX,
  SLACK_USER
} = require('../constants')

// Fetch all PRs targeting a specified release line branch that have NOT been merged
async function fetchUnmergedPRs(branch) {
  const url = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/pulls?base=${branch}`
  const unmerged = []
  for await (const commit of getAllGenerator(url)) {
    unmerged.push(commit)
  }
  return unmerged
}

// Build the text blob that will be posted to Slack
function buildUnmergedPRsMessage(branch, prs, initiatedBy) {
  if (!prs || prs.length === 0) return `*No unmerged PRs for ${branch}*`

  const formattedPRs = prs.map(c => {
    const prLink = linkifyPRs(c.title.split(/[\r\n]/, 1)[0])
    // TODO
    // return `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${prLink}`
  }).join('\n')

  let response = `Unreleased pull requests targeting *${branch}* (from ${initiatedBy}):\n${formattedPRs}`
  if (prs.length !== 0) {
    response += `\n <@${SLACK_USER}>, there are unmerged PRs targeting \`${branch}\`! Don't release just yet!`
  }
  return response
}

module.exports = {
  buildUnmergedPRsMessage,
  fetchUnmergedPRs
}