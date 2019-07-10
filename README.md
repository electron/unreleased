## Electron Unreleased Commit Audit

This repository allows users to query information relating to release branches on [`electron/electron`](https://github.com/electron/electron).

There are two potential actions possible:
1. Reporting commits unreleased for a specific release branch.
2. Reporting pull requests targeting a specific release branch that have not yet been merged.

An unreleased commit audit is triggered automatically via cron job on Monday mornings at 9AM PST for all supported release branches of Electron.

### Check Unreleased

An unreleased commit audit can be triggered via Slack using the following:

```sh
/check-unreleased <branch-name>
```

where `branch-name` matches the name of a release line branch of the Electron repository.

Example:

```sh
/check-unreleased 5-0-x
```

To manually query the status of all [currently supported](https://electronjs.org/docs/tutorial/support) Electron release branches:

```sh
/check-unreleases all
```

### Check Unmerged

An unmerged pull request audit can be triggered via Slack using the following:

```sh
/check-unmerged <branch-name>
```

where `branch-name` matches the name of a release line branch of the Electron repository.

Example:

```sh
/check-unmerged 5-0-x
```
