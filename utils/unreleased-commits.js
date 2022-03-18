const { octokit, linkifyPRs, releaseIsDraft } = require('./helpers');
const { graphql } = require('@octokit/graphql');

const {
  BUMP_COMMIT_PATTERN,
  ORGANIZATION_NAME,
  REPO_NAME,
  GITHUB_TOKEN,
} = require('../constants');

async function fetchTags() {
  return graphql({
    query: `{
      repository(owner: "electron", name: "electron") {
        refs(refPrefix: "refs/tags/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
          edges {
            node {
              name
              target {
                commitUrl
              }
            }
          }
        }
      }
    }`,
    headers: {
      authorization: `token ${GITHUB_TOKEN}`,
    },
  }).then(({ repository }) => {
    return repository.refs.edges.map(edge => {
      const url = edge.node.target.commitUrl.split('/');
      return {
        name: edge.node.name,
        commit_sha: url[url.length - 1],
      };
    });
  });
}

// Fetch all unreleased commits for a specified release line branch.
async function fetchUnreleasedCommits(branch) {
  const tags = await fetchTags();
  const unreleased = [];

  await (async () => {
    for await (const response of octokit.paginate.iterator(
      octokit.repos.listCommits,
      {
        owner: ORGANIZATION_NAME,
        repo: REPO_NAME,
        sha: branch,
        per_page: 100,
      },
    )) {
      let foundLastRelease = false;
      for (const payload of response.data) {
        const tag = tags.find(t => t.commit_sha === payload.sha);
        if (tag) {
          const isDraft = await releaseIsDraft(tag.name);
          if (!isDraft) {
            foundLastRelease = true;
            break;
          }
        }

        // Filter out bump commits.
        if (BUMP_COMMIT_PATTERN.test(payload.commit.message)) continue;

        unreleased.push(payload);
      }
      if (foundLastRelease) {
        break;
      }
    }
  })();

  return unreleased;
}

// Build the text blob that will be posted to Slack.
function buildUnreleasedCommitsMessage(branch, commits, initiator) {
  if (!commits || commits.length === 0)
    return `*No unreleased commits on ${branch}*`;

  const formattedCommits = commits
    .map(c => {
      const prLink = linkifyPRs(c.commit.message.split(/[\r\n]/, 1)[0]);
      return `* \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${prLink}`;
    })
    .join('\n');

  // For unreleased commits only, we don't want to deduce slack user for auto-audit.
  const from = initiator === 'automatic audit' ? initiator : `<@${initiator}>`;
  let response = `Unreleased commits in *${branch}* (from ${from}):\n${formattedCommits}`;
  if (commits.length >= 10) {
    response += `\n *There are a lot of unreleased commits on \`${branch}\`! Time for a release?*`;
  }
  return response;
}

module.exports = {
  buildUnreleasedCommitsMessage,
  fetchUnreleasedCommits,
};
