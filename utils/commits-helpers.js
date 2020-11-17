const { BLOCKS_RELEASE_LABEL } = require('../constants');

function getReleaseBlockers(prs) {
  return prs.filter(pr => {
    return pr.labels.some(label => label.name === BLOCKS_RELEASE_LABEL);
  });
}

module.exports = {
  getReleaseBlockers,
};
