import storeMethods from '../redux/methods'
import { findTextEditor, selectLine as selectLineInTextEditor } from './textEditorInstance'

export default async function openEditorLine (entityShortid, opts = {}) {
  const { lineNumber, endLineNumber, startColumn, endColumn, getEditorName, isContentTheSame, error } = opts
  await storeMethods.openEditorTab({ shortid: entityShortid })

  setTimeout(() => {
    const entity = storeMethods.getEntityByShortid(entityShortid)
    const contentIsTheSame = typeof isContentTheSame !== 'function' ? false : isContentTheSame(entity) === true
    const editorName = typeof getEditorName !== 'function' ? undefined : getEditorName(entity)
    const entityEditor = editorName == null ? undefined : findTextEditor(editorName)

    if (entityEditor != null && contentIsTheSame) {
      selectLineInTextEditor(entityEditor, {
        lineNumber,
        endLineNumber,
        startColumn,
        endColumn,
        error
      })
    }
  }, 300)
}
