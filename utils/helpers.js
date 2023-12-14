const crypto = require('crypto');
const https = require('https');
const url = require('url');
const { WebClient } = require('@slack/web-api');

const {
  ORGANIZATION_NAME,
  REPO_NAME,
  NUM_SUPPORTED_VERSIONS,
  RELEASE_BRANCH_PATTERN,
  SLACK_BOT_TOKEN,
} = require('../constants');
const { getOctokit } = require('./octokit');

const slackWebClient = new WebClient(SLACK_BOT_TOKEN);

const SEMVER_TYPE = {
  MAJOR: 'semver/major',
  MINOR: 'semver/minor',
  PATCH: 'semver/patch',
};

const isInvalidBranch = (branches, branch) => {
  return !RELEASE_BRANCH_PATTERN.test(branch) || !branches.includes(branch);
};

// Filter through commits in a given range and determine the overall semver type.
async function getSemverForCommitRange(commits, branch) {
  let resultantSemver = SEMVER_TYPE.PATCH;
  const octokit = await getOctokit();
  const allClosedPrs = await octokit.paginate(octokit.pulls.list, {
    owner: ORGANIZATION_NAME,
    repo: REPO_NAME,
    state: 'closed',
    base: branch,
  });

  for (const commit of commits) {
    const prs = allClosedPrs.filter(pr => pr.merge_commit_sha === commit.sha);
    if (prs.length > 0) {
      if (prs.length === 1) {
        const pr = prs[0];
        const isMajor = pr.labels.some(
          label => label.name === SEMVER_TYPE.MAJOR,
        );
        const isMinor = pr.labels.some(
          label => label.name === SEMVER_TYPE.MINOR,
        );
        if (isMajor) {
          resultantSemver = SEMVER_TYPE.MAJOR;
        } else if (isMinor) {
          resultantSemver = SEMVER_TYPE.MINOR;
        }
      } else {
        throw new Error(
          `Invalid number of PRs associated with ${commit.sha}`,
          prs,
        );
      }
    }
  }

  return resultantSemver;
}

// Add a live PR link to a given commit.
function linkifyPRs(msg) {
  return msg.replace(
    /#(\d+)/g,
    (_, pr_id) =>
      `<https://github.com/${ORGANIZATION_NAME}/${REPO_NAME}/pull/${pr_id}|#${pr_id}>`,
  );
}

async function fetchInitiator(req) {
  const { profile } = await slackWebClient.users.profile.get({
    user: req.body.user_id,
  });

  return {
    id: req.body.user_id,
    name: profile.display_name_normalized,
  };
}

// Determine whether a given release is in draft state or not.
async function releaseIsDraft(tag) {
  const octokit = await getOctokit();

  try {
    const {
      data: { draft },
    } = await octokit.repos.getReleaseByTag({
      owner: ORGANIZATION_NAME,
      repo: REPO_NAME,
      tag,
    });
    return draft;
  } catch {
    return false;
  }
}

// Fetch an array of the currently supported branches.
async function getSupportedBranches() {
  const octokit = await getOctokit();

  const branches = await octokit.paginate(
    octokit.repos.listBranches.endpoint.merge({
      owner: ORGANIZATION_NAME,
      repo: REPO_NAME,
      protected: true,
    }),
  );

  const releaseBranches = branches.filter(branch => {
    return branch.name.match(RELEASE_BRANCH_PATTERN);
  });

  const filtered = {};
  releaseBranches
    .sort((a, b) => {
      const aParts = a.name.split('-');
      const bParts = b.name.split('-');
      for (let i = 0; i < aParts.length; i++) {
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

// NOTE: This assumes `a` is a user-controlled string and
// `b` is our sensitive value. This ensures that even in
// length mismatch cases this function does a
// crypto.timingSafeEqual comparison of `b.length`, so an
// attacker can't change `a.length` to estimate `b.length`
function timingSafeEqual(a, b) {
  const bufferA = Buffer.from(a, 'utf-8');
  const bufferB = Buffer.from(b, 'utf-8');

  if (bufferA.length !== bufferB.length) {
    crypto.timingSafeEqual(bufferB, bufferB);
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

module.exports = {
  fetchInitiator,
  getSemverForCommitRange,
  getSupportedBranches,
  isInvalidBranch,
  linkifyPRs,
  postToSlack,
  releaseIsDraft,
  SEMVER_TYPE,
  timingSafeEqual,
};
