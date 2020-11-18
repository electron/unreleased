const { ORGANIZATION_NAME, REPO_NAME } = require('../constants');
const { searchIssues } = require('./issue-search');

// Fetch all PRs needing review from the API Working Group.
async function fetchReviewQueuePRs(prefix) {
  const search = {
    repo: `${ORGANIZATION_NAME}/${REPO_NAME}`,
    type: 'pr',
    state: 'open',
    label: `"${prefix}/requested 🗳"`,
  };

  const prs = await searchIssues(search);
  return prs;
}

// Build the text blob that will be posted to Slack.
function buildReviewQueueMessage(prefix, prs) {
  let formattedPRs = prs
    .map(c => {
      const daysOld = Math.round(
        (+new Date() - +new Date(c.created_at)) / (1000 * 60 * 60 * 24),
      );
      const parts = [
        `<${c.html_url}|#${c.number}> - ${c.title.split(/[\r\n]/, 1)[0]}`,
        `_${c.user.login}_`,
        `_${daysOld} day${daysOld === 1 ? '' : 's'} old_`,
      ];
      return `* ${parts.join(' · ')}`;
    })
    .join('\n');

  formattedPRs += `\n *Found ${prs.length} open PRs with label \`${prefix}/requested 🗳\`*`;

  return formattedPRs;
}

module.exports = {
  buildReviewQueueMessage,
  fetchReviewQueuePRs,
};
