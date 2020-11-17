const fetch = require('node-fetch');

// Formulate a list of all objects based on a certain url endpoint.
async function getAll(urlEndpoint) {
  const objects = [];
  for await (const obj of getAllGenerator(urlEndpoint)) objects.push(obj);
  return objects;
}

// Fetch all pages from the given URL.
async function* getAllGenerator(urlEndpoint) {
  let next = urlEndpoint;
  while (next) {
    const resp = await fetch(next, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });

    if (!resp.ok) {
      if (resp.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = Math.ceil(
          resp.headers.get('x-ratelimit-reset') - Date.now() / 1000,
        );
        throw new Error(`Ratelimited. Resets in ${resetTime} seconds.`);
      }
      throw new Error(`${resp.status} ${resp.statusText}`);
    }

    const json = await resp.json();
    yield* json;

    if (!resp.headers.get('link')) break;

    // Try to get the next link from the `link` header.
    // ex. this link:
    // <https://api.github.com/repositories/9384267/tags?page=15>; rel="prev",
    // <https://api.github.com/repositories/9384267/tags?page=17>; rel="next",
    // <https://api.github.com/repositories/9384267/tags?page=18>; rel="last",
    // <https://api.github.com/repositories/9384267/tags?page=1>; rel="first"
    // would extract this next_link:
    // [ ' <https://api.github.com/repositories/9384267/tags?page=17>', ' rel="next"' ]
    const next_link = resp.headers
      .get('link')
      .split(/,/)
      .map(x => x.split(/;/))
      .find(x => x[1].includes('next'));

    if (!next_link) break;
    next = next_link[0].trim().slice(1, -1);
  }
}

module.exports = {
  getAll,
  getAllGenerator,
}
