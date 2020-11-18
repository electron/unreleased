const fetch = require('node-fetch');
const https = require('https');
const url = require('url');

const {
  ORGANIZATION_NAME,
  REPO_NAME,
  GH_API_PREFIX,
  NUM_SUPPORTED_VERSIONS,
  RELEASE_BRANCH_PATTERN,
} = require('../constants');

// Add a live PR link to a given commit.
function linkifyPRs(msg) {
  return msg.replace(
    /#(\d+)/g,
    (_, pr_id) =>
      `<https://github.com/${ORGANIZATION_NAME}/${REPO_NAME}/pull/${pr_id}|#${pr_id}>`,
  );
}

// Determine whether a given release is in draft state or not.
async function releaseIsDraft(tag) {
  const releaseEndpoint = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/releases/tags/${tag}`;
  const res = await fetch(releaseEndpoint);
  return res.status === 404;
}

// Get array of currently supported branches.
async function getSupportedBranches() {
  const branchEndpoint = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/branches`;
  const resp = await fetch(branchEndpoint);

  let branches = await resp.json();
  const releaseBranches = branches.filter(branch => {
    return branch.name.match(RELEASE_BRANCH_PATTERN);
  });
  const filtered = {};
  releaseBranches
    .sort((a, b) => {
      const aParts = a.name.split('-');
      const bParts = b.name.split('-');
      for (let i = 0; i < aParts.length; i += 1) {
        if (aParts[i] === bParts[i]) continue;
        return parseInt(aParts[i], 10) - parseInt(bParts[i], 10);
      }
      return 0;
    })
    .forEach(branch => {
      return (filtered[branch.name.split('-')[0]] = branch.name);
    });

  const values = Object.values(filtered);
  return values
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .slice(-NUM_SUPPORTED_VERSIONS);
}

// Post a message to a Slack workspace.
const postToSlack = (data, postUrl) => {
  const r = https.request({
    ...url.parse(postUrl),
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  });
  r.end(JSON.stringify(data));
};

module.exports = {
  releaseIsDraft,
  getSupportedBranches,
  linkifyPRs,
  postToSlack,
};
