const {
  appCredentialsFromString,
  getAuthOptionsForRepo,
} = require('@electron/github-app-auth');
const {
  GITHUB_TOKEN,
  ORGANIZATION_NAME,
  REPO_NAME,
  UNRELEASED_GITHUB_APP_CREDS,
} = require('../constants');
const { Octokit } = require('@octokit/rest');

let octokit;
const getOctokit = async () => {
  if (octokit) return octokit;

  if (GITHUB_TOKEN) {
    octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });
  } else {
    const creds = appCredentialsFromString(UNRELEASED_GITHUB_APP_CREDS);
    const authOpts = await getAuthOptionsForRepo(
      {
        owner: ORGANIZATION_NAME,
        name: REPO_NAME,
      },
      creds,
    );
    octokit = new Octokit({ ...authOpts });
  }

  return octokit;
};

module.exports = { getOctokit };
