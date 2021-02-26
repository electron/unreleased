const express = require('express');
const bodyParser = require('body-parser');

const {
  buildUnreleasedCommitsMessage,
  fetchUnreleasedCommits,
} = require('./utils/unreleased-commits');
const {
  buildUnmergedPRsMessage,
  fetchUnmergedPRs,
} = require('./utils/unmerged-prs');
const {
  buildNeedsManualPRsMessage,
  fetchNeedsManualPRs,
} = require('./utils/needs-manual-prs');
const {
  buildReviewQueueMessage,
  fetchReviewQueuePRs,
} = require('./utils/review-queue-prs');
const {
  fetchInitiator,
  getSupportedBranches,
  postToSlack,
} = require('./utils/helpers');
const { RELEASE_BRANCH_PATTERN } = require('./constants');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static('public'));

// Check for pull requests targeting a specified release branch
// that have not yet been merged.
app.post('/unmerged', async (req, res) => {
  const branches = await getSupportedBranches();
  const branch = req.body.text;

  const initiator = await fetchInitiator(req);
  console.log(
    `${initiator.name} initiated unmerged audit for branch: ${branch}`,
  );

  const isInvalidBranch =
    !RELEASE_BRANCH_PATTERN.test(branch) || !branches.includes(branch);
  if (branch !== 'all' && isInvalidBranch) {
    console.error(`${branch} is not a valid branch`);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    );
    return res.status(200).end();
  }

  console.log(`Auditing unmerged PRs on branch: ${branch}`);

  try {
    const branchesToCheck = branch === 'all' ? branches : [branch];

    let messages = [];
    for (const branch of branchesToCheck) {
      const prs = await fetchUnmergedPRs(branch);
      console.log(`Found ${prs.length} unmerged PR(s) targeting ${branch}`);

      let message;
      if (!prs || prs.length === 0) {
        message = `*No PR(s) pending merge to ${branch}*`;
      } else {
        message = `Unmerged pull requests targeting *${branch}* (from <@${initiator.id}>):\n`;
        message += buildUnmergedPRsMessage(branch, prs);
      }
      messages.push(message);
    }

    postToSlack(
      {
        response_type: 'in_channel',
        text: messages.join('\n'),
      },
      req.body.response_url,
    );
  } catch (err) {
    console.error(err);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    );
  }

  return res.status(200).end();
});

// Check for pull requests which have been merged to master and labeled
// with target/BRANCH_NAME that trop failed for and which still need manual backports.
app.post('/needs-manual', async (req, res) => {
  const branches = await getSupportedBranches();
  const REMIND = 'remind';

  let [branch, author, remind] = req.body.text.split(' ');

  let shouldRemind = false;
  if (author === REMIND && remind === undefined) {
    shouldRemind = true;
    author = null;
  } else if (remind === REMIND) {
    shouldRemind = true;
  }

  const initiator = await fetchInitiator(req);
  console.log(
    `${initiator.name} initiated needs-manual audit for branch: ${branch}`,
  );

  const isInvalidBranch =
    !RELEASE_BRANCH_PATTERN.test(branch) || !branches.includes(branch);
  if (branch !== 'all' && isInvalidBranch) {
    console.error(`${branch} is not a valid branch`);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    );
    return res.status(200).end();
  }

  if (author) {
    console.log(`Scoping needs-manual PRs to those opened by ${author}`);
  }

  try {
    const branchesToCheck = branch === 'all' ? branches : [branch];

    let messages = [];
    for (const branch of branchesToCheck) {
      const prs = await fetchNeedsManualPRs(branch, author);
      console.log(`Found ${prs.length} prs on ${branch}`);

      let message;
      if (!prs || prs.length === 0) {
        message = `*No PR(s) needing manual backport to ${branch}*`;
      } else {
        message = `PR(s) needing manual backport to *${branch}* (from <@${initiator.id}>):\n`;
        message += buildNeedsManualPRsMessage(branch, prs, shouldRemind);
      }
      messages.push(message);
    }

    // If someone is running an audit on the needs-manual PRs that only
    // they are responsible for, make the response ephemeral.
    const responseType = initiator.name === author ? 'ephemeral' : 'in_channel';

    postToSlack(
      {
        response_type: responseType,
        text: messages.join('\n'),
      },
      req.body.response_url,
    );
  } catch (err) {
    console.error(err);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    );
  }

  return res.status(200).end();
});

// Check for commits which have been merged to a release branch but
// not been released in a beta or stable.
app.post('/unreleased', async (req, res) => {
  const branches = await getSupportedBranches();

  const auditTarget = req.body.text;
  const initiator = await fetchInitiator(req);

  // Allow for manual batch audit of all supported release branches.
  if (auditTarget === 'all') {
    console.log(
      `${initiator.name} triggered audit for all supported release branches`,
    );

    for (const branch of branches) {
      console.log(`Auditing branch ${branch}`);
      try {
        const commits = await fetchUnreleasedCommits(branch);
        console.log(`Found ${commits.length} commits on ${branch}`);
        postToSlack(
          {
            response_type: 'in_channel',
            text: buildUnreleasedCommitsMessage(branch, commits, initiator.id),
          },
          req.body.response_url,
        );
      } catch (err) {
        console.error(err);
        postToSlack(
          {
            response_type: 'ephemeral',
            text: `Error: ${err}`,
          },
          req.body.response_url,
        );
      }
    }

    return res.status(200).end();
  }

  console.log(
    `${initiator.name} initiated unreleased commit audit for branch: ${auditTarget}`,
  );

  if (
    !RELEASE_BRANCH_PATTERN.test(auditTarget) ||
    !branches.includes(auditTarget)
  ) {
    console.error(`${auditTarget} is not a valid branch`);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    );
    return res.status(200).end();
  }

  try {
    const commits = await fetchUnreleasedCommits(auditTarget);
    console.log(`Found ${commits.length} commits on ${auditTarget}`);

    postToSlack(
      {
        response_type: 'in_channel',
        text: buildUnreleasedCommitsMessage(auditTarget, commits, initiator.id),
      },
      req.body.response_url,
    );
  } catch (err) {
    console.error(err);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    );
  }

  return res.status(200).end();
});

// Combines checks for all PRs that either need manual backport to a given
// release line or which are targeting said line and haven't been merged.
app.post('/audit-pre-release', async (req, res) => {
  const branches = await getSupportedBranches();

  const branch = req.body.text;

  const initiator = await fetchInitiator(req);
  console.log(
    `${initiator.name} initiated pre-release audit for branch: ${branch}`,
  );

  if (!RELEASE_BRANCH_PATTERN.test(branch) || !branches.includes(branch)) {
    console.error(`${branch} is not a valid branch`);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: 'Branch name not valid. Try again?',
      },
      req.body.response_url,
    );
    return res.status(200).end();
  }

  try {
    // In a prerelease audit, we don't want to scope by author so we pass null intentionally.
    const needsManualPRs = await fetchNeedsManualPRs(branch, null);
    console.log(
      `Found ${needsManualPRs.length} PR(s) needing manual backport on ${branch}`,
    );

    const unmergedPRs = await fetchUnmergedPRs(branch);
    console.log(`Found ${unmergedPRs.length} unmerged PRs targeting ${branch}`);

    let message;
    if (needsManualPRs.length + unmergedPRs.length === 0) {
      message = `*No PR(s) unmerged or needing manual backport for ${branch}*`;
    } else {
      message = `Pre-release audit for *${branch}* (from <@${initiator.id}>)\n`;

      if (needsManualPRs.length !== 0) {
        message += `PR(s) needing manual backport to *${branch}*:\n`;
        message += `${buildNeedsManualPRsMessage(branch, needsManualPRs)}\n`;
      }

      if (unmergedPRs.length !== 0) {
        message += `Unmerged pull requests targeting *${branch}*:\n`;
        message += `${buildUnmergedPRsMessage(branch, unmergedPRs)}\n`;
      }
    }

    postToSlack(
      {
        response_type: 'in_channel',
        text: message,
      },
      req.body.response_url,
    );
  } catch (err) {
    console.error(err);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    );
  }

  return res.status(200).end();
});

// Check for pull requests which have the "${x}/requested 🗳" tag.
app.post('/review-queue', async (req, res) => {
  const [prefix] = req.body.text.split(' ');

  const initiator = await fetchInitiator(req);
  console.log(`${initiator.name} initiated review-queue for prefix: ${prefix}`);

  try {
    const prs = await fetchReviewQueuePRs(prefix);

    console.log(
      `Found ${prs.length} open PRs with label \`${prefix}/requested 🗳\``,
    );

    let message;
    if (!prs || prs.length === 0) {
      message = `*No open PRs with label \`${prefix}/requested 🗳\`*`;
    } else {
      message = `${prs.length} PR${
        prs.length === 1 ? '' : 's'
      } awaiting ${prefix} (from <@${initiator.id}>):\n`;
      message += buildReviewQueueMessage(prefix, prs);
    }

    postToSlack(
      {
        response_type: 'in_channel',
        text: message,
      },
      req.body.response_url,
    );
  } catch (err) {
    console.error(err);
    postToSlack(
      {
        response_type: 'ephemeral',
        text: `Error: ${err}`,
      },
      req.body.response_url,
    );
  }

  return res.status(200).end();
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`release-branch-auditor listening on ${listener.address().port}`);
});
