const { octokit } = require('./helpers');

// Fetch issues matching the given search criteria.
// e.g.
// {
//   repo: 'electron/electron',
//   type: 'pr',
//   state: 'open',
//   label: 'needs-manual-bp/10-x-y'
// }
async function searchIssues(search) {
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `${[...Object.entries(search)].map(([k, v]) => `${k}:${v}`).join('+')}`,
  });
  return data.items;
}

module.exports = {
  searchIssues,
};
