const { parseArgs } = require('@pkgjs/parseargs');
const { fetchUnreleasedCommits } = require('../utils/unreleased-commits');
const { getSemverForCommitRange, releaseIsDraft } = require('../utils/helpers');
const { fetchNeedsManualPRs } = require('../utils/needs-manual-prs');
const { fetchReviewQueuePRs } = require('../utils/review-queue-prs');
const { fetchUnmergedPRs } = require('../utils/unmerged-prs');
const { expect } = require('chai');

const argOptions = {
  withValue: ['branch', 'tag', 'author', 'prefix'],
};

const { argValues } = parseArgs(process.argv, argOptions);

const branch = argValues?.branch || '17-x-y';
const tag = argValues?.tag || 'v17.0.0';
const prefix = argValues?.prefix || 'api-review';
const author = argValues?.author || null;

describe('API tests', () => {
  it('can fetch unreleased commits', async () => {
    const { commits } = await fetchUnreleasedCommits(branch);
    expect(commits).to.be.an('array');
  });

  it('can get the semver value for a commit range', async () => {
    const { commits } = await fetchUnreleasedCommits(branch);
    const semverType = await getSemverForCommitRange(commits);
    const values = ['semver/major', 'semver/minor', 'semver/patch'];
    expect(values).to.contain(semverType);
  });

  it('can determine if a given release is a draft release', async () => {
    const isDraft = await releaseIsDraft(tag);
    expect(isDraft).to.be.false;
  });

  it('can fetch PRs needing manual backport', async () => {
    const prs = await fetchNeedsManualPRs(branch, author);
    expect(prs).to.be.an('array');
  });

  it('can fetch PRs needing API review', async () => {
    const prs = await fetchReviewQueuePRs(prefix);
    expect(prs).to.be.an('array');
  });

  it('can fetch PRs needing merge', async () => {
    const prs = await fetchUnmergedPRs(branch);
    expect(prs).to.be.an('array');
  });
});
