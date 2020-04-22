const GH_API_PREFIX = 'https://api.github.com'

const ORGANIZATION_NAME = process.env.ORGANIZATION_NAME || 'electron'
const REPO_NAME = process.env.REPO_NAME || 'electron'

const NUM_SUPPORTED_VERSIONS = process.env.NUM_SUPPORTED_VERSIONS || 4

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const ACTION_TYPE = process.env.ACTION_TYPE

const RELEASE_BRANCH_PATTERN = /(\d)+-(?:(?:[0-9]+-x$)|(?:x+-y$))/

module.exports = {
  GH_API_PREFIX,
  ORGANIZATION_NAME,
  RELEASE_BRANCH_PATTERN,
  REPO_NAME,
  SLACK_BOT_TOKEN,
  ACTION_TYPE,
  NUM_SUPPORTED_VERSIONS,
  GITHUB_TOKEN,
}
