const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { buildUnmergedPRsMessage } = require('../utils/unmerged-prs');

describe('unmerged', () => {
  it('can build the unmerged PRs message', () => {
    const prs = require('./fixtures/unmerged.json');
    const branch = '10-x-y';
    const message = buildUnmergedPRsMessage(branch, prs);

    const expected = `* <https://github.com/electron/electron/pull/24838|#24838> - fix: provide AXTextChangeValueStartMarker for macOS a11y value change notifications
* <https://github.com/electron/electron/pull/24706|#24706> - chore: bump chromium to 85.0.4183.65 (10-x-y)
* <https://github.com/electron/electron/pull/20625|#20625> (*DRAFT*) - fix: loading dedicated/shared worker scripts over custom protocol
 *3 unmerged PR(s) targeting \`10-x-y\`!*`;

    assert.strictEqual(message, expected);
  });
});
