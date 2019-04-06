## Electron Unreleased Commit Audit

This Action checks for and reports commits unreleased for a specific release branch.

It's triggered automatically via cron job on Monday mornings at 9am for all supported release branches of Electron.

It can also be triggered via Slack with:

```sh
/check-unreleased <branch-name>
```

where `branch-name` matches the name of a release line branch of the Electron repository.

Example:

```sh
/check-unreleased 5-0-x
```