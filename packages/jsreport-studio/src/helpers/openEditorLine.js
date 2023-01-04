import storeMethods from '../redux/methods'
import { findTextEditor, selectLine as selectLineInTextEditor } from './textEditorInstance'

export default async function openEditorLine (entityShortid, opts = {}) {
  const { docProp, lineNumber, endLineNumber, startColumn, endColumn, getEditorName, isContentTheSame, error } = opts
  const openTabPayload = { shortid: entityShortid }

  if (docProp != null) {
    openTabPayload.docProp = docProp
  }

  const entityExists = storeMethods.getEntityByShortid(entityShortid, false) != null

  if (!entityExists) {
    return
  }

  await storeMethods.openEditorTab(openTabPayload)

  setTimeout(() => {
    const entity = storeMethods.getEntityByShortid(entityShortid, false)

    if (entity == null) {
      return
    }

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
