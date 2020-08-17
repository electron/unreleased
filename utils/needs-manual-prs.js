const fetch = require('node-fetch');
const { ORGANIZATION_NAME, REPO_NAME } = require('../constants');

// Fetch all PRs targeting 'master' that have a 'needs-manual/<branch>' label on them.
async function fetchNeedsManualPRs(branch, prAuthor) {
  const baseUrl = `https://api.github.com/search/issues?`;

  // Construct queryString components.
  const repo = `repo:${ORGANIZATION_NAME}/${REPO_NAME}`;
  const type = `type:pr`;
  const state = `state:closed`;
  const label = `label:"needs-manual-bp/${branch}"`;
  const author = prAuthor ? `+author:${prAuthor}` : ``;

  // Assemble final endpoint.
  const url = baseUrl + `q=${type}+${repo}+${state}+${label}${author}`;

  const resp = await fetch(url);
  const prs = (await resp.json()).items;

  return prs;
}

// Build the text blob that will be posted to Slack.
function buildNeedsManualPRsMessage(branch, prs, shouldRemind) {
  if (prs.length === 0) {
    return `*No PRs needing manual backport to ${branch}*`;
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

  formattedPRs += `\n *${prs.length} PRs needing manual backport to \`${branch}\`!*`;

  return formattedPRs;
}

module.exports = {
  buildNeedsManualPRsMessage,
  fetchNeedsManualPRs,
};
