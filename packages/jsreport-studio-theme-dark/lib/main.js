const path = require('path')

module.exports = (reporter, definition) => {
  if (reporter.studio) {
    reporter.studio.registerTheme({
      name: 'dark',
      variablesPath: path.join(__dirname, './themeVars.json'),
      previewColor: '#1D1D1D',
      editorTheme: 'vs-dark'
    })
  }
}
