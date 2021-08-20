
module.exports = {
  name: 'html-to-text',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  dependencies: [],
  optionsSchema: {
    extensions: {
      'html-to-text': {
        type: 'object',
        properties: {
          wordWrap: { type: 'number' },
          hideLinkHrefIfSameAsText: { type: 'boolean' },
          ignoreHref: { type: 'boolean' },
          ignoreImage: { type: 'boolean' },
          preserveNewlines: { type: 'boolean' },
          uppercaseHeadings: { type: 'boolean' },
          singleNewLineParagraphs: { type: 'boolean' },
          returnDomByDefault: { type: 'boolean' },
          forceWrapOnLimit: { type: 'boolean' },
          longWordSplit: {
            type: 'object',
            properties: {
              wrapCharacters: { type: 'string' },
              forceWrapOnLimit: { type: 'boolean' }
            }
          },
          longWordSplitForceWrapOnLimit: { type: 'boolean' }
        }
      }
    }
  },
  requires: {
    core: '3.x.x',
    studio: '3.x.x'
  }
}
