const { getAllGenerator } = require('./commits-helpers');

const { ORGANIZATION_NAME, REPO_NAME, GH_API_PREFIX } = require('../constants');

const formatMessage = pr => {
  return `- ${pr.title.split(/[\r\n]/, 1)[0]} (<${pr.html_url}|#${pr.number}>)`;
};

// Fetch all PRs targeting a specified release line branch that have NOT been merged.
async function fetchUnmergedPRs(branch) {
  const url = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/pulls?base=${branch}`;
  const unmerged = [];
  for await (const pr of getAllGenerator(url)) {
    unmerged.push(pr);
  }
  return unmerged;
}

// Build the text blob that will be posted to Slack.
function buildUnmergedPRsMessage(branch, prs) {
  if (prs.length === 0) {
    return `*No unmerged PRs targeting \`${branch}\`!*`;
  }

  let message = prs.map(formatMessage).join('\n');

  message += `\n *${prs.length} unmerged PRs targeting \`${branch}\`!*`;

  const releaseBlockers = getReleaseBlockers(prs);
  if (releaseBlockers.length > 0) {
    message += '\n\n';
    message += releaseBlockers.map(formatMessage).join('\n');
    message += `\n *${releaseBlockers.length} unmerged PRs blocking release of \`${branch}\`!*`;
  }

  return message;
}

module.exports = {
  buildUnmergedPRsMessage,
  fetchUnmergedPRs,
};
