const { ORGANIZATION_NAME, REPO_NAME } = require('../constants');
const { getOctokit } = require('./octokit');

// Fetch issues matching the given search criteria.
// e.g.
// {
//   repo: 'electron/electron',
//   type: 'pr',
//   state: 'open',
//   label: 'needs-manual-bp/10-x-y'
// }
async function searchIssues(search) {
  const octokit = await getOctokit();
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `${[...Object.entries(search)].map(([k, v]) => `${k}:${v}`).join('+')}`,
  });
  return data.items;
}

// Fetch all PRs targeting 'main' that have a 'needs-manual/<branch>' label on them.
async function fetchNeedsManualPRs(branch, prAuthor) {
  const search = {
    repo: `${ORGANIZATION_NAME}/${REPO_NAME}`,
    type: 'pr',
    state: 'closed',
    label: `"needs-manual-bp/${branch}"`,
  };

  if (prAuthor) {
    search.author = prAuthor;
  }

  return await searchIssues(search);
}

// Build the text blob that will be posted to Slack.
function buildNeedsManualPRsMessage(branch, prs, shouldRemind) {
  if (prs.length === 0) {
    return `*No PR(s) needing manual backport to ${branch}*`;
  }

  let formattedPRs = prs
    .map((c) => {
      let line = `* <${c.html_url}|#${c.number}> - ${
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
