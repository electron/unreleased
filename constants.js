const ORGANIZATION_NAME = process.env.ORGANIZATION_NAME || 'electron';
const REPO_NAME = process.env.REPO_NAME || 'electron';

const NUM_SUPPORTED_VERSIONS = process.env.NUM_SUPPORTED_VERSIONS || 4;

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const ACTION_TYPE = process.env.ACTION_TYPE;
const UNRELEASED_GITHUB_APP_CREDS = process.env.UNRELEASED_GITHUB_APP_CREDS;

const BLOCKS_RELEASE_LABEL =
  process.env.BLOCKS_RELEASE_LABEL || 'blocks-release';

const AUDIT_POST_CHANNEL = process.env.AUDIT_POST_CHANNEL || '#wg-releases';

const RELEASE_BRANCH_PATTERN = /^(\d)+-(?:(?:[0-9]+-x$)|(?:x+-y$))$/;

const BUMP_COMMIT_PATTERN = /Bump v(\d)+.(\d)+.(\d)+(-(beta|nightly)(.\d+))?/;

module.exports = {
  ACTION_TYPE,
  AUDIT_POST_CHANNEL,
  BLOCKS_RELEASE_LABEL,
  BUMP_COMMIT_PATTERN,
  NUM_SUPPORTED_VERSIONS,
  ORGANIZATION_NAME,
  RELEASE_BRANCH_PATTERN,
  REPO_NAME,
  SLACK_BOT_TOKEN,
  UNRELEASED_GITHUB_APP_CREDS,
};
