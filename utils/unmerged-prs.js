const { getReleaseBlockers } = require('./commits-helpers');
const { getOctokit } = require('./octokit');

const { ORGANIZATION_NAME, REPO_NAME } = require('../constants');

const formatMessage = pr => {
  return `* <${pr.html_url}|#${pr.number}>${pr.draft ? ' (*DRAFT*)' : ''} - ${
    pr.title.split(/[\r\n]/, 1)[0]
  }`;
};

// Fetch all PRs targeting a specified release line branch that have NOT been merged.
async function fetchUnmergedPRs(branch) {
  const octokit = await getOctokit();
  return await octokit.paginate(octokit.pulls.list, {
    owner: ORGANIZATION_NAME,
    repo: REPO_NAME,
    base: branch,
  });
}

// Build the text blob that will be posted to Slack.
function buildUnmergedPRsMessage(branch, prs) {
  if (prs.length === 0) {
    return `*No unmerged PRs targeting \`${branch}\`!*`;
  }

  let message = prs.map(formatMessage).join('\n');

  message += `\n *${prs.length} unmerged PR(s) targeting \`${branch}\`!*`;

  const releaseBlockers = getReleaseBlockers(prs);
  if (releaseBlockers.length > 0) {
    message += '\n\n';
    message += releaseBlockers.map(formatMessage).join('\n');
    message += `\n *${releaseBlockers.length} unmerged PR(s) blocking release of \`${branch}\`!*`;
  }

  return message;
}

module.exports = {
  buildUnmergedPRsMessage,
  fetchUnmergedPRs,
};
