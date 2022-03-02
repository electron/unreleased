const { octokit, linkifyPRs, releaseIsDraft } = require('./helpers');

const {
  BUMP_COMMIT_PATTERN,
  ORGANIZATION_NAME,
  REPO_NAME,
} = require('../constants');

// Fetch every tag all the time is expensive, GitHub returns the most recent tags first
// So we fetch all tags once, then the next time we only fetch new tags until we find one
// we have seen before
const tagsCache = [];

function isCached(tag) {
  return !!tagsCache.find(t => t.node_id === tag.node_id);
}

let initialCacheFill;

async function fetchTags(force = false) {
  if (initialCacheFill) await initialCacheFill;

  return octokit
    .paginate(
      octokit.repos.listTags,
      {
        owner: ORGANIZATION_NAME,
        repo: REPO_NAME,
      },
      ({ data }, done) => {
        for (const tag of data) {
          if (!force && isCached(tag)) done(); // stop octokit pagination
          tagsCache.push(tag);
        }
      },
    )
    .then(() => {
      return tagsCache;
    })
    .catch(err => {
      console.error('Failed to prepopulate tag cache', err);
    });
}

// populate the cache on startup
initialCacheFill = fetchTags(true);

// Fetch all unreleased commits for a specified release line branch.
async function fetchUnreleasedCommits(branch, force = false) {
  const tags = await fetchTags(force);
  const unreleased = [];

  octokit.paginate(
    octokit.repos.listCommits,
    {
      owner: ORGANIZATION_NAME,
      repo: REPO_NAME,
      sha: branch,
    },
    async ({ data }, done) => {
      for (const payload of data) {
        const tag = tags.find(t => t.commit.sha === payload.sha);
        if (tag) {
          const isDraft = await releaseIsDraft(tag.name);
          if (!isDraft) {
            done();
          }
        }

        // Filter out bump commits.
        if (BUMP_COMMIT_PATTERN.test(payload.commit.message)) continue;

        unreleased.push(payload);
      }
    },
  );

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
