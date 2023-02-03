const core = require('@actions/core');
const { WebClient } = require('@slack/web-api');

const {
  buildUnreleasedCommitsMessage,
  fetchUnreleasedCommits,
} = require('./utils/unreleased-commits');

const {
  buildNeedsManualPRsMessage,
  fetchNeedsManualPRs,
} = require('./utils/needs-manual-prs');

const {
  buildReviewQueueMessage,
  fetchReviewQueuePRs,
} = require('./utils/review-queue-prs');

const {
  SLACK_BOT_TOKEN,
  ACTION_TYPE,
  AUDIT_POST_CHANNEL,
} = require('./constants');

const Actions = {
  UNRELEASED: 'unreleased',
  NEEDS_MANUAL: 'needs-manual',
  REVIEW_QUEUE: 'review-queue',
};

// eslint-disable-next-line no-useless-escape
const success = `\e[0;32m`;

const { getSupportedBranches } = require('./utils/helpers');

const slackWebClient = new WebClient(SLACK_BOT_TOKEN);

async function run() {
  if (ACTION_TYPE === Actions.REVIEW_QUEUE) {
    core.info(`Auditing ${ACTION_TYPE} PRs`);

    const prefix = 'api-review';
    const prs = await fetchReviewQueuePRs(prefix);

    core.info(
      `Found ${prs.length} open PRs with label \`${prefix}/requested 🗳\`'`,
    );

    let text;
    if (!prs || prs.length === 0) {
      text = `*No open PRs with label \`${prefix}/requested 🗳\`*`;
    } else {
      text = `${prs.length} PR${
        prs.length === 1 ? '' : 's'
      } awaiting ${prefix} (from automatic audit):\n`;
      text += buildReviewQueueMessage(prefix, prs);
    }

    const result = await slackWebClient.chat.postMessage({
      channel: AUDIT_POST_CHANNEL,
      unfurl_links: false,
      text,
    });

    if (result.ok) {
      core.info(`${success}Audit message sent for review-queue PRs 🚀`);
    } else {
      core.setFailed(
        'Unable to send audit info for review-queue PRs: ' + result.error,
      );
    }
  } else {
    const initiatedBy = 'automatic audit';
    const branches = await getSupportedBranches();
    for (const branch of branches) {
      core.info(`Auditing ${ACTION_TYPE} on branch ${branch}`);

      let commits;
      if (ACTION_TYPE === Actions.UNRELEASED) {
        commits = (await fetchUnreleasedCommits(branch)).commits;
      } else if (ACTION_TYPE === Actions.NEEDS_MANUAL) {
        commits = await fetchNeedsManualPRs(branch, null /* author */);
      }

      core.info(`Found ${commits.length} commits on ${branch}`);
      if (ACTION_TYPE === 'unreleased' && commits.length >= 10) {
        core.info(
          `Reached ${commits.length} commits on ${branch}, time to release.`,
        );
      }

      let text = '';
      if (ACTION_TYPE === Actions.UNRELEASED) {
        text += buildUnreleasedCommitsMessage(branch, commits, initiatedBy);
      } else if (ACTION_TYPE === Actions.NEEDS_MANUAL) {
        text += buildNeedsManualPRsMessage(
          branch,
          commits,
          true /* shouldRemind */,
        );
      }

      const result = await slackWebClient.chat.postMessage({
        channel: AUDIT_POST_CHANNEL,
        unfurl_links: false,
        text,
      });

      if (result.ok) {
        core.info(`${success}Audit message sent for ${branch} 🚀`);
      } else {
        core.setFailed(
          `Unable to send audit info for ${branch}: ` + result.error,
        );
      }
    }
    core.info(`${success}All release branches audited successfully`);
  }
}

run();
