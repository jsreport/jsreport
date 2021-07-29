module.exports = (reporter, definition) => {
  reporter.documentStore.registerEntityType('DemoType', {
    name: { type: 'Edm.String' },
    secret: { type: 'Edm.String', visible: false }
  })

  reporter.documentStore.registerEntitySet('demos', { entityType: 'jsreport.DemoType', humanReadableKey: 'name' })

  reporter.initializeListeners.add('test', () => {
    reporter.express.exposeOptionsToApi('test', {
      publicProp: definition.options.publicProp,
      publicDeepProp: {
        foo: definition.options.publicDeepProp.foo
      },
      publicArray: definition.options.publicArray
    })
  })
}
