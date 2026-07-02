const crypto = require('node:crypto');

const { WebClient } = require('@slack/web-api');

const {
  ORGANIZATION_NAME,
  REPO_NAME,
  RELEASE_BRANCH_PATTERN,
  SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET,
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

  const results = await Promise.all(
    commits.map((commit) =>
      octokit.repos
        .listPullRequestsAssociatedWithCommit({
          owner: ORGANIZATION_NAME,
          repo: REPO_NAME,
          commit_sha: commit.sha,
        })
        .then(({ data }) => ({ commit, data })),
    ),
  );

  for (const { commit, data } of results) {
    const prs = data.filter(
      (pr) => pr.base.ref === branch && pr.merge_commit_sha === commit.sha,
    );
    if (prs.length > 0) {
      if (prs.length === 1) {
        const pr = prs[0];
        const isMajor = pr.labels.some(
          (label) => label.name === SEMVER_TYPE.MAJOR,
        );
        const isMinor = pr.labels.some(
          (label) => label.name === SEMVER_TYPE.MINOR,
        );
        if (isMajor) {
          resultantSemver = SEMVER_TYPE.MAJOR;
        } else if (isMinor && resultantSemver !== SEMVER_TYPE.MAJOR) {
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
  const resp = await fetch(
    'https://releases.electronjs.org/schedule.json?eolGracePeriod=7',
  );
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch supported branches: ${resp.status} ${resp.statusText}`,
    );
  }
  const schedule = await resp.json();

  return Object.values(schedule)
    .filter(({ status }) => ['prerelease', 'stable'].includes(status))
    .map(({ branch }) => branch);
}

// Post a message to a Slack workspace.
const postToSlack = async (data, postUrl) => {
  await fetch(postUrl, {
    body: JSON.stringify(data),
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  });
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

const SLACK_SIGNATURE_VERSION = 'v0';
const MAX_REQUEST_AGE_SECONDS = 60 * 5; // reject anything older than 5 minutes

// Express middleware verifying that an incoming request was signed by Slack.
// See https://docs.slack.dev/authentication/verifying-requests-from-slack
function verifySlackRequest(req, res, next) {
  if (!SLACK_SIGNING_SECRET) {
    console.error('SLACK_SIGNING_SECRET is not configured');
    return res.status(500).end();
  }

  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];

  if (!signature || !timestamp) {
    return res.status(401).end('Unauthorized');
  }

  // Guard against replay attacks using a stale (or future) timestamp.
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > MAX_REQUEST_AGE_SECONDS) {
    return res.status(401).end('Unauthorized');
  }

  // The `verify` hook stashes the unparsed body on req.rawBody.
  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.alloc(0);
  const basestring = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  const expected = `${SLACK_SIGNATURE_VERSION}=${crypto
    .createHmac('sha256', SLACK_SIGNING_SECRET)
    .update(basestring)
    .digest('hex')}`;

  if (!timingSafeEqual(signature, expected)) {
    return res.status(401).end('Unauthorized');
  }

  return next();
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
  verifySlackRequest,
};
