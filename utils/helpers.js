const queue = require('queue').default;
const https = require('https');
const url = require('url');
const { WebClient } = require('@slack/web-api');
const { Octokit } = require('@octokit/rest');

const {
  ORGANIZATION_NAME,
  REPO_NAME,
  NUM_SUPPORTED_VERSIONS,
  RELEASE_BRANCH_PATTERN,
  SLACK_BOT_TOKEN,
} = require('../constants');

const slackWebClient = new WebClient(SLACK_BOT_TOKEN);
const octokit = new Octokit({
  auth: process.env.UNRELEASED_GITHUB_TOKEN,
});

const SEMVER_TYPE = {
  MAJOR: 'semver/major',
  MINOR: 'semver/minor',
  PATCH: 'semver/patch',
};

// Filter through commits in a given range and determine the overall semver type.
async function getSemverForCommitRange(commits) {
  const commitQueue = queue({
    concurrency: 5,
  });

  let resultantSemver = SEMVER_TYPE.PATCH;
  for (const commit of commits) {
    commitQueue.push(async () => {
      const { data } = await octokit.pulls.list({
        owner: ORGANIZATION_NAME,
        repo: REPO_NAME,
        state: 'closed',
      });

      const prs = data.filter(pr => pr.merge_commit_sha === commit.sha);

      if (prs.length === 1) {
        const pr = prs[0];
        const labels = pr.labels.map(label => label.name);
        if (labels.some(label => label === SEMVER_TYPE.MAJOR)) {
          resultantSemver = SEMVER_TYPE.MAJOR;
        } else if (
          labels.some(label => label === SEMVER_TYPE.MINOR) &&
          resultantSemver !== SEMVER_TYPE.MAJOR
        ) {
          resultantSemver = SEMVER_TYPE.MINOR;
        }
      } else {
        throw new Error(`Invalid number of PRs associated with ${commit.sha}`);
      }
    });
  }

  await new Promise((resolve, reject) => {
    commitQueue.start(err => {
      if (err) return reject(err);
      resolve();
    });
  });

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
  const { draft } = await octokit.repos.getReleaseByTag({
    owner: ORGANIZATION_NAME,
    repo: REPO_NAME,
    tag,
  });

  return draft;
}

// Fetch an array of the currently supported branches.
async function getSupportedBranches() {
  const branches = await octokit.paginate(
    octokit.repos.listBranches.endpoint.merge({
      owner: ORGANIZATION_NAME,
      repo: REPO_NAME,
      protected: true,
    }),
  );

  const {
    data: { default_branch: mainBranchName },
  } = await octokit.repos.get({
    owner: ORGANIZATION_NAME,
    repo: REPO_NAME,
  });

  const releaseBranches = branches.filter(branch => {
    const isRelease = branch.name.match(RELEASE_BRANCH_PATTERN);
    const isMain = branch.name === mainBranchName;
    return isRelease || isMain;
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

module.exports = {
  fetchInitiator,
  getSemverForCommitRange,
  getSupportedBranches,
  linkifyPRs,
  postToSlack,
  releaseIsDraft,
};
