const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { parseArgs } = require('node:util');

const { fetchUnreleasedCommits } = require('../utils/unreleased-commits');
const { getSemverForCommitRange, releaseIsDraft } = require('../utils/helpers');
const { fetchNeedsManualPRs } = require('../utils/needs-manual-prs');
const { fetchUnmergedPRs } = require('../utils/unmerged-prs');

const argOptions = {
  author: { type: 'string' },
  branch: { type: 'string' },
  tag: { type: 'string' },
};

const { values: argValues } = parseArgs({ options: argOptions });

const branch = argValues?.branch || '17-x-y';
const tag = argValues?.tag || 'v17.0.0';
const author = argValues?.author || null;

describe('API tests', () => {
  it('can fetch unreleased commits', async () => {
    const { commits } = await fetchUnreleasedCommits(branch);
    assert.ok(Array.isArray(commits));
  });

  it('can get the semver value for a commit range', async () => {
    const { commits } = await fetchUnreleasedCommits(branch);
    const semverType = await getSemverForCommitRange(commits, branch);
    const values = ['semver/major', 'semver/minor', 'semver/patch'];
    assert.ok(values.includes(semverType));
  });

  it('can determine if a given release is a draft release', async () => {
    const isDraft = await releaseIsDraft(tag);
    assert.strictEqual(isDraft, false);
  });

  it('can fetch PRs needing manual backport', async () => {
    const prs = await fetchNeedsManualPRs(branch, author);
    assert.ok(Array.isArray(prs));
  });

  it('can fetch PRs needing merge', async () => {
    const prs = await fetchUnmergedPRs(branch);
    assert.ok(Array.isArray(prs));
  });
});
