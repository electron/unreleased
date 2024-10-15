const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { buildNeedsManualPRsMessage } = require('../utils/needs-manual-prs');

describe('needs manual', () => {
  it('can build the needs-manual PRs message', () => {
    const prs = require('./fixtures/needs-manual.json');
    const branch = '8-x-y';
    const message = buildNeedsManualPRsMessage(
      branch,
      prs,
      null /* shouldRemind */,
    );

    const expected = `* <https://github.com/electron/electron/pull/24856|#24856> - build: ensure symbol files are named lowercase on disk so that boto can find them
* <https://github.com/electron/electron/pull/24534|#24534> - fix: ensure that errors thrown in the context bridge are created in the correct context
* <https://github.com/electron/electron/pull/24114|#24114> - feat: add worldSafe flag for executeJS results
* <https://github.com/electron/electron/pull/24014|#24014> - fix: Close protocol response streams when aborted
* <https://github.com/electron/electron/pull/20625|#20625> - fix: loading dedicated/shared worker scripts over custom protocol
 *5 PR(s) needing manual backport to \`8-x-y\`!*`;

    assert.strictEqual(message, expected);
  });

  it('can build the needs-manual PRs message with remind', () => {
    const prs = require('./fixtures/needs-manual.json');
    const branch = '8-x-y';
    const message = buildNeedsManualPRsMessage(
      branch,
      prs,
      true /* shouldRemind */,
    );

    const expected = `* <https://github.com/electron/electron/pull/24856|#24856> - build: ensure symbol files are named lowercase on disk so that boto can find them (<@marshallofsound>)
* <https://github.com/electron/electron/pull/24534|#24534> - fix: ensure that errors thrown in the context bridge are created in the correct context (<@marshallofsound>)
* <https://github.com/electron/electron/pull/24114|#24114> - feat: add worldSafe flag for executeJS results (<@marshallofsound>)
* <https://github.com/electron/electron/pull/24014|#24014> - fix: Close protocol response streams when aborted (<@pfrazee>)
* <https://github.com/electron/electron/pull/20625|#20625> - fix: loading dedicated/shared worker scripts over custom protocol (<@deepak1556>)
 *5 PR(s) needing manual backport to \`8-x-y\`!*`;

    assert.strictEqual(message, expected);
  });
});
