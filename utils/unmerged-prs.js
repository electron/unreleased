const { getAllGenerator } = require('./commits-helpers');

const { ORGANIZATION_NAME, REPO_NAME, GH_API_PREFIX } = require('../constants');

// Fetch all PRs targeting a specified release line branch that have NOT been merged
async function fetchUnmergedPRs(branch) {
  const url = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/pulls?base=${branch}`;
  const unmerged = [];
  for await (const pr of getAllGenerator(url)) {
    unmerged.push(pr);
  }
  return unmerged;
}

// Build the text blob that will be posted to Slack
function buildUnmergedPRsMessage(branch, prs) {
  let formattedPRs = prs
    .map(c => {
      return `- ${c.title.split(/[\r\n]/, 1)[0]} (<${c.html_url}|#${
        c.number
      }>)`;
    })
    .join('\n');

  if (prs.length !== 0) {
    formattedPRs += `\n *There are ${prs.length} unmerged PRs targeting \`${branch}\`!*`;
  }

  return formattedPRs;
}

module.exports = {
  buildUnmergedPRsMessage,
  fetchUnmergedPRs,
};
