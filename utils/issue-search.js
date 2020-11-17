const fetch = require('node-fetch');

// Fetch issues matching the given search criteria.
// e.g.
// {
//   repo: 'electron/electron',
//   type: 'pr',
//   state: 'open',
//   label: 'needs-manual-bp/10-x-y'
// }
async function searchIssues(search) {
  const baseUrl = `https://api.github.com/search/issues`;

  // Assemble final endpoint.
  const url =
    baseUrl +
    `?q=${[...Object.entries(search)]
      .map(([k, v]) => `${k}:${v}`)
      .map(encodeURIComponent)
      .join('+')}`;

  const resp = await fetch(url);
  const { items } = await resp.json();

  return items;
}

module.exports = {
  searchIssues,
};
