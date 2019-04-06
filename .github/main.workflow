workflow "Check Unreleased Commits" {
  resolves = ["Check unreleased commits"]
  on = "schedule(0 09 * * 1)"
}

action "Check unreleased commits" {
  uses = "./"
  args = "5-0-x,4-1-x,3-1-x"
  secrets = ["GITHUB_TOKEN", "SLACK_BOT_TOKEN"]
}
