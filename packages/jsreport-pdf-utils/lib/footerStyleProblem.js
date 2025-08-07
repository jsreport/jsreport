module.exports = ({
  startupCheck,
  getTemlatesAndAssetsWithProblematicFooterStyle,
  fixTemlatesAndAssetsWithProblematicFooterStyle
})

const hasPossibleProblemRegexp =
  /(\.main\s*{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*justify-content:\s*space-between;[^}]*width:\s*100%;[^}]*height:\s*)(100%)(;[^}]*})/

async function getTemlatesAndAssetsWithProblematicFooterStyle (reporter, onlyCheck) {
  function hasPossibleProblem (content) {
    return content && hasPossibleProblemRegexp.test(content)
  }

  const problematicEntities = []
  const templateIds = await reporter.documentStore.collection('templates').find({}, { _id: 1 })
  for (const id of templateIds) {
    const template = await reporter.documentStore.collection('templates').findOne({ _id: id._id }, { content: 1, name: 1 })
    if (hasPossibleProblem(template.content)) {
      if (onlyCheck) {
        return true
      }

      problematicEntities.push({
        entitySet: 'templates',
        path: await reporter.folders.resolveEntityPath(template, 'templates'),
        _id: template._id
      })
    }
  }

  if (!reporter.assets) {
    return onlyCheck ? false : problematicEntities
  }

  const assetIds = await reporter.documentStore.collection('assets').find({}, { _id: 1 })
  for (const id of assetIds) {
    const asset = await reporter.documentStore.collection('assets').findOne({ _id: id._id }, { content: 1, name: 1 })

    if (!asset.name.endsWith('.css')) {
      continue
    }

    if (hasPossibleProblem(asset.content)) {
      if (onlyCheck) {
        return true
      }

      problematicEntities.push({
        entitySet: 'assets',
        path: await reporter.folders.resolveEntityPath(asset, 'assets'),
        _id: asset._id
      })
    }
  }

  return onlyCheck ? false : problematicEntities
}

async function startupCheck (reporter) {
  if (reporter.options.checkForFooterStyleProblemIssue === false) {
    return
  }

  const checked = await reporter.settings.findValue('pdf-utils-footer-style-problem-checked')

  if (checked) {
    return
  }

  await reporter.settings.addOrSet('pdf-utils-footer-style-problem-checked', true)

  reporter.logger.info('pdf footers check started')

  const hasProblem = await getTemlatesAndAssetsWithProblematicFooterStyle(reporter, true)
  if (hasProblem) {
    await reporter.settings.addOrSet('pdf-utils-footer-style-problem-checked-found', true)
    reporter.logger.warn('There is a template or asset in the template store with problematic CSS that can eventaully cause footer to be badly aligned. You can open studio to trigger the automatic fix.')
  }
  reporter.logger.info('pdf footers check finished without found problems')
}

async function fixTemlatesAndAssetsWithProblematicFooterStyle (reporter) {
  const problematicEntities = await getTemlatesAndAssetsWithProblematicFooterStyle(reporter, false)

  for (const { _id, entitySet } of problematicEntities) {
    const entity = await reporter.documentStore.collection(entitySet).findOne({ _id })
    const newContent = entity.content.toString().replace(hasPossibleProblemRegexp, '$1100vh$3')

    await reporter.documentStore.collection(entitySet).update({ _id }, { $set: { content: entitySet === 'templates' ? newContent : Buffer.from(newContent) } })
  }
}
