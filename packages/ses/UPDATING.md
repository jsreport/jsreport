## Updating SES

When the time comes to update the ses dependency we should follow these steps:

- update the  package.json to new version, install it.
- copy the file specified in `node_modules/ses/package.json#exports` at entry "./lockdown" -> "require" to `./index.js`,
  if there was not a bigger architecture in the sources files this file should be `node_modules/ses/dist/ses.cjs`.
- inspect the diff in git to give some insight of the changes introduced by the ses
- add a commit with format `add @jsreport/ses (ses@x.x.x)` replace `x.x.x` with the new ses version.
  it is important to commit the new file as it is (without changes) so we can preserve clear diffs about the changes we introduce taking into account the original ses source.
- if there was no bigger change we can re-apply our changes, look for commit with message
  format `update @jsreport/ses changes (ses@x.x.x)`, for example the first commit that
  introduced our changes was `update @jsreport/ses changes (ses@0.18.7)`.
  check the changes and apply them again.
- add a commit with format `update @jsreport/ses (ses@x.x.x)` replace `x.x.x` with the new ses version,
  make sure to document any new change introduced in the commit details.
