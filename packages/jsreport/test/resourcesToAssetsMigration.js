
module.exports = function (reporter) {
  reporter.documentStore.internalAfterInitListeners.add('test-migration-resources-to-assets', async () => {
    const d1 = await reporter.documentStore.collection('data').insert({
      name: 'en-data',
      dataJson: JSON.stringify({
        message: 'Hello World'
      })
    })

    const d2 = await reporter.documentStore.collection('data').insert({
      name: 'de-data',
      dataJson: JSON.stringify({
        message: 'Hallo Welt'
      })
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'main',
      content: '{{$localizedResource.message}}',
      engine: 'handlebars',
      recipe: 'html',
      resources: {
        items: [{
          entitySet: 'data',
          shortid: d1.shortid
        }, {
          entitySet: 'data',
          shortid: d2.shortid
        }],
        defaultLanguage: 'de'
      }
    })

    await reporter.documentStore.collection('templates').insert({
      name: 'debug',
      content: '{{{toJSON @root}}}',
      helpers: `
        function toJSON(data) {
          return JSON.stringify(data)
        }
      `,
      engine: 'handlebars',
      recipe: 'html',
      resources: {
        items: [{
          entitySet: 'data',
          shortid: d1.shortid
        }, {
          entitySet: 'data',
          shortid: d2.shortid
        }],
        defaultLanguage: 'de'
      }
    })
  })
}
