const GH_API_PREFIX = 'https://api.github.com';

const ORGANIZATION_NAME = process.env.ORGANIZATION_NAME || 'electron';
const REPO_NAME = process.env.REPO_NAME || 'electron';

const NUM_SUPPORTED_VERSIONS = process.env.NUM_SUPPORTED_VERSIONS || 4;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

module.exports = {
  GH_API_PREFIX,
  ORGANIZATION_NAME,
  REPO_NAME,
  SLACK_BOT_TOKEN,
  NUM_SUPPORTED_VERSIONS,
  GITHUB_TOKEN,
};
