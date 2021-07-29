import { textEditorInstances } from '../lib/configuration'

function findTextEditor (name) {
  const found = textEditorInstances.find((info) => info.name === name)

  if (!found) {
    return
  }

  return found.instance
}

function selectLine (textEditor, { lineNumber }) {
  textEditor.revealLineInCenter(lineNumber)

  const lineContent = textEditor.getModel().getLineContent(lineNumber)

  textEditor.setSelection({
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: 1,
    endColumn: lineContent.length + 1
  })
}

export { findTextEditor, selectLine }
