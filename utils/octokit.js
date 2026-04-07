const {
  ORGANIZATION_NAME,
  REPO_NAME,
  UNRELEASED_GITHUB_APP_CREDS,
} = require('../constants');

let octokit;
const getOctokit = async () => {
  if (octokit) return octokit;

  const { Octokit } = await import('@octokit/rest');

  if (UNRELEASED_GITHUB_APP_CREDS) {
    const { appCredentialsFromString, getAuthOptionsForRepo } = await import(
      '@electron/github-app-auth'
    );
    const creds = appCredentialsFromString(UNRELEASED_GITHUB_APP_CREDS);
    const authOpts = await getAuthOptionsForRepo(
      {
        owner: ORGANIZATION_NAME,
        name: REPO_NAME,
      },
      creds,
    );
    octokit = new Octokit({ ...authOpts });
  } else if (process.env.GITHUB_TOKEN) {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  } else {
    octokit = new Octokit();
  }

  return octokit;
};

module.exports = { getOctokit };
