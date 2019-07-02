const fetch = require('node-fetch')
const {
  ORGANIZATION_NAME,
  REPO_NAME,
  GH_API_PREFIX,
  NUM_SUPPORTED_VERSIONS
} = require('../constants')

// Add a live PR link to a given commit
function linkifyPRs(msg) {
  return msg.replace(/#(\d+)/g, (_, pr_id) =>
    `<https://github.com/${ORGANIZATION_NAME}/${REPO_NAME}/pull/${pr_id}|#${pr_id}>`)
}

// Determine whether a given release is in draft state or not
async function releaseIsDraft(tag) {
  const releaseEndpoint = `${GH_API_PREFIX}/repos/${ORGANIZATION_NAME}/${REPO_NAME}/releases/tags/${tag}`
  const res = await fetch(releaseEndpoint)
  return res.status === 404
}

// Get an array of Electron's currently supported branches
// according to https://electronjs.org/docs/tutorial/support
async function getSupportedBranches() {
  const branchEndpoint = `${GH_API_PREFIX}/${ORGANIZATION_NAME}/${REPO_NAME}/branches`
  const resp = await fetch(branchEndpoint)

  let branches = await resp.json()
  branches = branches.filter(branch => {
    return branch.protected && branch.name.match(/[0-9]-[0-9]-x/)
  }).map(b => b.name)

  const filtered = {}
  branches.sort().forEach(branch => filtered[branch.charAt(0)] = branch)
  return Object.values(filtered).slice(-NUM_SUPPORTED_VERSIONS)
}

module.exports = {
  releaseIsDraft,
  getSupportedBranches,
  linkifyPRs
}