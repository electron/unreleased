const { BLOCKS_RELEASE_LABEL, GITHUB_TOKEN } = require('../constants');

function getReleaseBlockers(prs) {
  return prs.filter(pr => {
    return pr.labels.some(label => label.name === BLOCKS_RELEASE_LABEL);
  });
}

module.exports = {
  getReleaseBlockers,
};
