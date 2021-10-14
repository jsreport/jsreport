const path = require('path')
const fs = require('fs')

module.exports = function (reporter) {
  reporter.documentStore.internalAfterInitListeners.add('test-migration-xlsxTemplates-to-assets', async () => {
    const xlsxT = await reporter.documentStore.collection('xlsxTemplates').insert({
      name: 'table-chart',
      contentRaw: fs.readFileSync(path.join(__dirname, 'table-chart.xlsx'))
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'test',
      engine: 'none',
      recipe: 'html',
      xlsxTemplate: {
        shortid: xlsxT.shortid
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'test2',
      engine: 'none',
      recipe: 'html',
      baseXlsxTemplate: {
        shortid: xlsxT.shortid
      }
    })
  })
}
