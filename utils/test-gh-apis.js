const { parseArgs } = require('@pkgjs/parseargs');

const { fetchUnreleasedCommits } = require('./unreleased-commits');

const { getSemverForCommitRange, releaseIsDraft } = require('./helpers');

const { fetchNeedsManualPRs } = require('./needs-manual-prs');

const { fetchReviewQueuePRs } = require('./review-queue-prs');

const { fetchUnmergedPRs } = require('./unmerged-prs');

const argOptions = {
  withValue: ['branch', 'tag', 'author', 'prefix'],
};

const { argValues } = parseArgs(process.argv, argOptions);

const branch = (argValues && argValues.branch) || 'main';
const tag = (argValues && argValues.tag) || 'v17.0.0';
const prefix = (argValues && argValues.prefix) || 'api-review';
const author = (argValues && argValues.author) || null;

async function testIt() {
  try {
    console.log(`Testing fetchUnreleasedCommits for ${branch}`);
    const commits = await fetchUnreleasedCommits(branch, true);
    console.log(`Testing  getSemverForCommitRange for ${branch}`);
    const semverType = await getSemverForCommitRange(commits);
    console.log(
      `SUCCESS getting getSemverForCommitRange; semver type for ${branch} is ${semverType}`,
    );
    console.log(`Testing if ${tag} is draft`);
    const isDraft = await releaseIsDraft(tag);
    if (isDraft) {
      console.log(`SUCCESS ${tag} is draft`);
    } else {
      console.log(`SUCCESS ${tag} is NOT draft`);
    }
    console.log(
      `Testing fetchNeedsManualPRs for ${branch} and ${author || 'any author'}`,
    );
    const manualPRS = await fetchNeedsManualPRs(branch, author);
    console.log(
      `SUCCESS running fetchNeedsManualPRs for ${branch} and ${author ||
        'any author'}; there are ${manualPRS.length} needing manual PRs`,
    );
    console.log(`Testing fetchReviewQueuePRs for ${prefix}`);
    const reviewQueuePRS = await fetchReviewQueuePRs(prefix);
    console.log(
      `SUCCESS running fetchReviewQueuePR for ${prefix}; there are ${reviewQueuePRS.length} needing manual PRs`,
    );
    console.log(`Testing fetchUnmergedPRs for ${branch}`);
    const unmergedPRS = await fetchUnmergedPRs(branch);
    console.log(
      `SUCCESS running fetchReviewQueuePR for ${branch}; there are ${unmergedPRS.length} needing manual PRs`,
    );
  } catch (err) {
    console.error(`Error testing GitHub API calls`);
  }
}
testIt();
