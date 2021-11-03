import Linter from 'eslint-browser'
import BabelEslint from 'babel-eslint-browser'
import flatten from 'lodash/flatten'
import defaultConfig from './defaultLinterConfig'

const linter = new Linter()

linter.defineParser(
  'babel-eslint',
  BabelEslint
)

/* eslint-disable-next-line no-undef */
self.addEventListener('message', (event) => {
  const { filename, code, version } = event.data

  if (!filename && !code) {
    return
  }

  const config = Object.assign({}, defaultConfig)

  const validations = linter.verify(code, config, {
    filename,
    // we need to make eslint ignore the jsreport call
    preprocess: (text, filename) => {
      const syntaxRegexp = /{#[a-z]+ ([^{}]*)}/g

      // replace the jsreport call with empty strings to preserve line/column position
      // of the eslint messages
      const newText = text.replace(syntaxRegexp, (match, p1, offset, str) => {
        const emptyStrs = []

        for (let i = 0; i < match.length; i++) {
          emptyStrs.push(' ')
        }

        return emptyStrs.join('')
      })

      return [newText]
    },
    postprocess: (messages, filename) => {
      return flatten(messages)
    }
  })

  const markers = validations.map((error) => {
    const { line: startL, column: startCol } = getPos(error, true)
    const { line: endL, column: endCol } = getPos(error, false)

    return {
      severity: getSeverity(error),
      startColumn: startCol,
      startLineNumber: startL,
      endColumn: endCol,
      endLineNumber: endL,
      message: `${error.message}${error.ruleId != null ? ` (${error.ruleId})` : ''}`,
      source: 'eslint'
    }
  })

  /* eslint-disable-next-line no-undef */
  self.postMessage({
    markers,
    version
  })
})

function getPos (error, from) {
  let line = error.line - 1
  let ch = from ? error.column : error.column + 1

  if (error.source != null && ch > error.source.length) {
    ch -= 1
  }

  if (error.node && error.node.loc) {
    line = from ? error.node.loc.start.line - 1 : error.node.loc.end.line - 1
    ch = from ? error.node.loc.start.column : error.node.loc.end.column
  }

  return { line: line + 1, column: ch }
}

function getSeverity (error) {
  switch (error.severity) {
    case 1:
      // warning
      return 4
    case 2:
      // error
      return 8
    default:
      // default to error
      return 8
  }
}
