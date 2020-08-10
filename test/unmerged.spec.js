const { expect } = require('chai');
const { buildUnmergedPRsMessage } = require('../utils/unmerged-prs');

describe('unmerged', () => {
  it('can build the unmerged PRs message', () => {
    const prs = require('./fixtures/unmerged.json');
    const branch = '10-x-y';
    const message = buildUnmergedPRsMessage(branch, prs);

    const expected = `- fix: provide AXTextChangeValueStartMarker for macOS a11y value change notifications (<https://github.com/electron/electron/pull/24838|#24838>)
- chore: bump chromium to 85.0.4183.65 (10-x-y) (<https://github.com/electron/electron/pull/24706|#24706>)
 *2 unmerged PRs targeting \`10-x-y\`!*`;

    expect(message).to.equal(expected);
  });
});
