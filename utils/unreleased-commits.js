const { getAllGenerator } = require('./api-helpers');
const { linkifyPRs, releaseIsDraft } = require('./helpers');

const {
  ORGANIZATION_NAME,
  REPO_NAME,
  GH_API_PREFIX,
  BUMP_COMMIT_PATTERN,
} = require('../constants');

// Fetch every tag all the time is expensive, GitHub returns the most recent tags first
// So we fetch all tags once, then the next time we only fetch new tags until we find one
// we have seen before
const tagsCache = [];
async function getAllTagsWithCache() {
  for await (const tag of getAllGenerator(
    `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/tags?per_page=100`,
  )) {
    if (tagsCache.find(t => tag.node_id === t.node_id)) break;
    tagsCache.push(tag);
  }
  return tagsCache;
}

getAllTagsWithCache().catch(err => {
  console.error('Failed to prepopulate tag cache', err);
});

// Fetch all unreleased commits for a specified release line branch.
async function fetchUnreleasedCommits(branch) {
  const tags = await getAllTagsWithCache();
  const unreleased = [];
  const url = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/commits?sha=${branch}&per_page=100`;

  for await (const payload of getAllGenerator(url)) {
    const tag = tags.find(t => t.commit.sha === payload.sha);
    if (tag) {
      const isDraft = await releaseIsDraft(tag.name);
      if (!isDraft) {
        break;
      }
    }

    // Filter out bump commits.
    if (BUMP_COMMIT_PATTERN.test(payload.commit.message)) continue;

    unreleased.push(payload);
  }
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
