const GH_API_PREFIX = 'https://api.github.com'

const ORGANIZATION_NAME = 'electron'
const REPO_NAME = 'electron'
const SLACK_USER = 'releases-wg'

const NUM_SUPPORTED_VERSIONS = 4

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

module.exports = {
  GH_API_PREFIX,
  ORGANIZATION_NAME,
  REPO_NAME,
  SLACK_BOT_TOKEN,
  SLACK_USER,
  NUM_SUPPORTED_VERSIONS,
  GITHUB_TOKEN
}