const { expect } = require('chai');
const {
  buildUnreleasedCommitsMessage,
} = require('../utils/unreleased-commits');

describe('unmerged', () => {
  it('can build the unmerged PRs message', () => {
    const commits = require('./fixtures/unreleased-commits.json');
    const branch = '9-x-y';
    const initiator = 'codebytere';
    const message = buildUnreleasedCommitsMessage(branch, commits, initiator);

    const expected = `Unreleased commits in *9-x-y* (from <@codebytere>):
- \`<https://github.com/electron/electron/commit/f799b6eb37cb8ef40f8f65c002fe1d752ca439ef|f799b6eb>\` build: ensure symbol files are named lowercase on disk so that boto can find them (<https://github.com/electron/electron/pull/24858|24858>)
- \`<https://github.com/electron/electron/commit/7063ba73dfe8862e02d6b1a01b7742e52bac2515|7063ba73>\` fix: do not render inactive titlebar as active on Windows (<https://github.com/electron/electron/pull/24873|24873>)
- \`<https://github.com/electron/electron/commit/f01bb5f43b384527b7f1cdebfc4e5c1d067b9af6|f01bb5f4>\` fix: increase max crash key value length (<https://github.com/electron/electron/pull/24854|24854>)`;

    expect(message).to.equal(expected);
  });
});
