const { parse } = require('querystring')
const { text, json, buffer } = require('micro')
const { fetchUnreleasedCommits, linkifyPRs } = require ('./utils')

module.exports = async (req, res) => {
  let response, responseType
  const branch = parse(await text(req)).text
  const commits = await fetchUnreleasedCommits(branch)

  if (commits.length === 0) {
    response = `*No unreleased commits on ${branch}*`
  } else {
    response = `Unreleased commits in *${branch}*:\n${commits.map(c => `- \`<${c.html_url}|${c.sha.slice(0, 8)}>\` ${linkifyPRs(c.commit.message.split(/[\r\n]/)[0])}`).join('\n')}`
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ responseType, text: response }))
}
