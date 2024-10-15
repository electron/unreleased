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
  SLACK_BOT_TOKEN,
  ACTION_TYPE,
  AUDIT_POST_CHANNEL,
  MILLISECONDS_PER_DAY,
  UNRELEASED_DAYS_WARN_THRESHOLD,
} = require('./constants');

const Actions = {
  UNRELEASED: 'unreleased',
  NEEDS_MANUAL: 'needs-manual',
};

const { getSupportedBranches } = require('./utils/helpers');

const slackWebClient = new WebClient(SLACK_BOT_TOKEN);

async function run() {
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
      const earliestCommit = commits[0];
      if (earliestCommit !== undefined) {
        const unreleasedDays = Math.floor(
          (Date.now() - new Date(earliestCommit.committer.date).getTime()) /
            MILLISECONDS_PER_DAY,
        );
        if (unreleasedDays > UNRELEASED_DAYS_WARN_THRESHOLD) {
          text += `\n ⚠️ *There have been unreleased commits on \`${branch}\` for ${unreleasedDays} days!*`;
        }
      }
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
      core.info(`✅ Audit message sent for ${branch} 🚀`);
    } else {
      core.setFailed(
        `❌ Unable to send audit info for ${branch}: ` + result.error,
      );
    }
  }
  core.info(` ✅ All release branches audited successfully`);
}

run().catch((e) => {
  core.setFailed(`Workflow failed: ${e.message}`);
});
