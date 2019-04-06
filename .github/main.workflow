workflow "Check Unreleased Commits" {
  resolves = ["Check unreleased commits"]
  on = "issues"
}

action "Check unreleased commits" {
  uses = "./"
  args = "5-0-x,4-1-x,3-1-x"
  secrets = ["GITHUB_TOKEN"]
}
