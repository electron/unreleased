const {
  getTokenForRepo,
  appCredentialsFromString,
} = require('@electron/github-app-auth');
const {
  GITHUB_TOKEN,
  ORGANIZATION_NAME,
  REPO_NAME,
  UNRELEASED_GITHUB_APP_CREDS,
} = require('../constants');
const { Octokit } = require('@octokit/rest');

const getOctokit = async () => {
  let auth;
  if (GITHUB_TOKEN) {
    auth = GITHUB_TOKEN;
  } else {
    auth = await getTokenForRepo(
      {
        owner: ORGANIZATION_NAME,
        name: REPO_NAME,
      },
      appCredentialsFromString(UNRELEASED_GITHUB_APP_CREDS),
    );
  }

  return new Octokit({ auth });
};

module.exports = { getOctokit };
