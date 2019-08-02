## Electron Unreleased Commit Audit

This repository allows users to query information relating to release branches on [`electron/electron`](https://github.com/electron/electron).

There are four potential actions possible:
1. Reporting commits unreleased for a specific release branch.
2. Reporting pull requests targeting a specific release branch that have not yet been merged.
3. Reporting pull requests which need to be manually backported to a particular release line.
4. Perform a pre-release audit combining actions 2 and 3.

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

### Check Needs Manual

An audit of pull requests needing manual backport to a particular release line can be triggered via Slack using the following:

```sh
/check-needs-manual <branch-name>
```

where `branch-name` matches the name of a release line branch of the Electron repository.

Example:

```sh
/check-needs-manual 5-0-x
```

This can also be scoped by author of the original PR. For example:

```sh
/check-needs-manual 5-0-x codebytere
```

will return all pull requests needing manual backport to a particular release line where the author of the original PR was @codebytere.

### Perform Pre-Release Audit

This combines the needs-manual audit with the unmerged audit to return a full list of action items that may needs to occur before a beta or stable release.

```sh
/audit-pre-release <branch-name>
```

where `branch-name` matches the name of a release line branch of the Electron repository.

Example:

```sh
/audit-pre-release 5-0-x
```
