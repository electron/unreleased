const { expect } = require('chai');
const { buildReviewQueueMessage } = require('../utils/review-queue-prs');

describe('review-queue', () => {
  it('can build the review queue PRs message', () => {
    const prs = require('./fixtures/review-queue.json');
    const prefix = 'api-review';
    const message = buildReviewQueueMessage(prefix, prs);

    const days = prs.map(pr => {
      return Math.round(
        (+new Date() - +new Date(pr.created_at)) / (1000 * 60 * 60 * 24),
      );
    })

    const expected = `* <https://github.com/electron/electron/pull/25198|#25198> - feat: implement allowFileAccess loadExtension option · _ChALkeR_ · _${days[0]} days old_
* <https://github.com/electron/electron/pull/24849|#24849> - feat: add session.setCorsOriginAccessList API · _lishid_ · _${days[1]} days old_
* <https://github.com/electron/electron/pull/23460|#23460> - [wip] feat: add hooks for profiling startup performance · _ckerr_ · _${days[2]} days old_
 *Found 3 open PRs with label \`api-review/requested 🗳\`*`;

    expect(message).to.equal(expected);
  });
});
