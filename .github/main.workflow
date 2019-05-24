workflow "Check Unreleased Commits" {
  resolves = ["Check unreleased commits"]
  on = "schedule(0 09 * * 1)"
}

action "Check unreleased commits" {
  uses = "./"
  secrets = ["GITHUB_TOKEN", "SLACK_BOT_TOKEN"]
}
