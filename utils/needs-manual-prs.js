const fetch = require('node-fetch');
const { ORGANIZATION_NAME, REPO_NAME } = require('../constants');
const { searchIssues } = require('./issue-search');

// Fetch all PRs targeting 'master' that have a 'needs-manual/<branch>' label on them.
async function fetchNeedsManualPRs(branch, prAuthor) {
  const search = {
    repo: `${ORGANIZATION_NAME}/${REPO_NAME}`,
    type: 'pr',
    state: 'closed',
    label: `"needs-manual-bp/${branch}"`
  }
  if (prAuthor)
    search.author = prAuthor

  return await searchIssues(search)
}

// Build the text blob that will be posted to Slack.
function buildNeedsManualPRsMessage(branch, prs, shouldRemind) {
  if (prs.length === 0) {
    return `*No PR(s) needing manual backport to ${branch}*`;
  }

  let formattedPRs = prs
    .map(c => {
      let line = `- <${c.html_url}|#${c.number}> - ${
        c.title.split(/[\r\n]/, 1)[0]
      }`;
      if (shouldRemind) line += ` (<@${c.user.login.toLowerCase()}>)`;
      return line;
    })
    .join('\n');

  formattedPRs += `\n *${prs.length} PR(s) needing manual backport to \`${branch}\`!*`;

  return formattedPRs;
}

module.exports = {
  buildNeedsManualPRsMessage,
  fetchNeedsManualPRs,
};
