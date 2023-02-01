## Electron Unreleased Commit Audit

[![Test](https://github.com/electron/unreleased/actions/workflows/test.yml/badge.svg)](https://github.com/electron/unreleased/actions/workflows/test.yml)
[![Perform Manual Backport Audit](https://github.com/electron/unreleased/actions/workflows/needs-manual-audit.yml/badge.svg)](https://github.com/electron/unreleased/actions/workflows/needs-manual-audit.yml)
[![Perform Unreleased Audit](https://github.com/electron/unreleased/actions/workflows/unreleased-audit.yml/badge.svg)](https://github.com/electron/unreleased/actions/workflows/unreleased-audit.yml)

This repository allows users to query information relating to release branches on a desired repository.

There are four potential actions possible:
1. Reporting commits unreleased for a specific release branch.
2. Reporting pull requests targeting a specific release branch that have not yet been merged.
3. Reporting pull requests which need to be manually backported to a particular release line.
4. Perform a pre-release audit combining actions 2 and 3.

An unreleased commit audit is triggered automatically via cron job on Monday mornings at 9AM PST for all supported release branches of your repository.

### Setup

This tool will default to setting the organization and repository name to [`electron/electron`](https://github.com/electron/electron), but you can set your own by setting `ORGANIZATION_NAME` and `REPO_NAME` as environment variables.

You can also set the number of currently supported release lines with the `NUM_SUPPORTED_VERSIONS` env var.

### Check Unreleased

An unreleased commit audit can be triggered via Slack using the following:

```sh
/check-unreleased <branch_name>
```

where `branch-name` matches the name of a release line branch of the desired repository.

Example:

```sh
/check-unreleased 9-x-y
```

To manually query the status of all currently supported release branches:

```sh
/check-unreleased all
```

### Check Unmerged

An unmerged pull request audit can be triggered via Slack using the following:

```sh
/check-unmerged <branch_name>
```

where `branch-name` matches the name of a release line branch of the repository.

Example:

```sh
/check-unmerged 10-x-y
```

### Check Needs Manual

An audit of pull requests needing manual backport to a particular release line can be triggered via Slack using the following:

```sh
/check-needs-manual <branch_name> <author> <remind>
```

where `branch_name` matches the name of a release line branch of the repository.

Example:

```sh
/check-needs-manual 8-x-y
```

### Verify Upcoming Release Type

An verification of the semver type of the next release for a given branch can be triggered via Slack using the following:

```sh
/verify-semver <branch_name>
```

where `branch_name` matches the name of a release line branch of the repository.

Example:

```sh
/verify-semver <branch_name>
```

Example output:

> Next release type for `12-x-y` is: **semver/patch**

#### Scoping By Author 

This command can be scoped by author of the original PR. For example:

```sh
/check-needs-manual 8-x-y codebytere
```

will return all pull requests needing manual backport to a particular release line where the author of the original PR was @codebytere

```
PRs needing manual backport to 8-x-y (from @codebytere):
* #23782 - fix: volume key globalShortcut registration
* #23776 - fix: asynchronous URL loading in BW Proxy
* #22342 - fix: don't run environment bootstrapper
There are 3 PR(s) needing manual backport to 8-x-y!
```

#### Reminding Authors

You can `@mention` authors in the audit to remind them of the manual backports they need to handle:

```sh
/check-needs-manual 8-x-y remind
```

This will produce a list similar to the following:

```
PR(s) needing manual backport to 8-x-y (from @codebytere):
* #23782 - fix: volume key globalShortcut registration (@codebytere)
* #23776 - fix: asynchronous URL loading in BW Proxy (@codebytere)
* #23678 - fix: read GTK dark theme setting on Linux (@zcbenz)
* #23653 - docs: errors in isolated world are not dispatched to foreign worlds (@zcbenz)
* #23415 - test: skip "handles Promise timeouts correctly" when ELECTRON_RUN_AS_NODE is disabled (@miniak)
* #22342 - fix: don't run environment bootstrapper (@codebytere)
There are 6 PR(s) needing manual backport to 8-x-y!
```

### Perform Pre-Release Audit

A pre-release audit combines the needs-manual audit with the unmerged audit to return a full list of action items that may needs to occur before a beta or stable release.

```sh
/audit-pre-release <branch_name>
```

where `branch_name` matches the name of a release line branch of the repository.

Example:

```sh
/audit-pre-release 8-x-y
```

### Check Review Queue

List PRs that are pending review. Specifically, PRs in the repo that match the
search `state:open "label:<prefix>/requested 🗳"`.

```sh
/review-queue <prefix>
```

where `prefix` is the beginning of the label to search for.

Example:

```sh
/review-queue api-review
```

## Environment Variables

If you would like to use `unreleased`, there are several environment variables you will need to leverage to customize it to serve your needs.

* `ORGANIZATION_NAME` - the name of your organization, e.g. `electron`.
* `REPO_NAME` - the name of the repository to run audits in, e.g. `electron`.
* `NUM_SUPPORTED_VERSIONS` - the number of supported backport release lines (default is 4).
* `UNRELEASED_GITHUB_APP_CREDS` - private key credentials generated for a GitHub App (required).
* `SLACK_BOT_TOKEN` - the token that will be used to post audit result into a Slack workspace channel (required).
* `BLOCKS_RELEASE_LABEL` - the GitHub label used to denote unmerged pull requests that should block a release (default is `blocks-release`).
* `AUDIT_POST_CHANNEL` - the Slack workspace channel in which to post audit results.
