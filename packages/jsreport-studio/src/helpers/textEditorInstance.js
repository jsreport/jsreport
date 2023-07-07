import { values as configuration } from '../lib/configuration'

function findTextEditor (nameOrArray) {
  const names = []

  if (Array.isArray(nameOrArray)) {
    names.push(...nameOrArray)
  } else {
    names.push(nameOrArray)
  }

  let found

  for (const name of names) {
    found = configuration.textEditorInstances.find((info) => info.name === name)

    if (found) {
      break
    }
  }

  if (!found) {
    return
  }

  return found.instance
}

function selectLine (textEditor, { lineNumber, endLineNumber, startColumn, endColumn, error }) {
  textEditor.revealLineInCenter(lineNumber)

  const range = {
    startLineNumber: lineNumber,
    endLineNumber: endLineNumber == null ? lineNumber : endLineNumber,
    startColumn: startColumn == null ? 1 : startColumn
  }

  if (endColumn == null) {
    const endLineContent = textEditor.getModel().getLineContent(range.endLineNumber)
    range.endColumn = endLineContent.length + 1
  } else {
    range.endColumn = endColumn
  }

  textEditor.setSelection(range)

  if (error) {
    const identifiers = textEditor.deltaDecorations([], [
      { range, options: { inlineClassName: 'errorLineDecoration' } }
    ])

    setTimeout(() => textEditor.deltaDecorations(identifiers, []), 3100)
  }
}

export { findTextEditor, selectLine }
