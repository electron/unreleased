const { expect } = require('chai');
const { buildReviewQueueMessage } = require('../utils/review-queue-prs');

describe('review-queue', () => {
  it('can build the review queue PRs message', () => {
    const prs = require('./fixtures/review-queue.json');
    const prefix = 'api-review';
    const message = buildReviewQueueMessage(prefix, prs);

    const expected = `* <https://github.com/electron/electron/pull/25198|#25198> - feat: implement allowFileAccess loadExtension option · _ChALkeR_ · _81 days old_
* <https://github.com/electron/electron/pull/24849|#24849> - feat: add session.setCorsOriginAccessList API · _lishid_ · _105 days old_
* <https://github.com/electron/electron/pull/23460|#23460> - [wip] feat: add hooks for profiling startup performance · _ckerr_ · _195 days old_
 *Found 3 open PRs with label \`api-review/requested 🗳\`*`;

    expect(message).to.equal(expected);
  });
});
