import { textEditorInstances } from '../lib/configuration'

function findTextEditor (name) {
  const found = textEditorInstances.find((info) => info.name === name)

  if (!found) {
    return
  }

  return found.instance
}

function selectLine (textEditor, { lineNumber, error }) {
  textEditor.revealLineInCenter(lineNumber)

  const lineContent = textEditor.getModel().getLineContent(lineNumber)

  const range = {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: 1,
    endColumn: lineContent.length + 1
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
