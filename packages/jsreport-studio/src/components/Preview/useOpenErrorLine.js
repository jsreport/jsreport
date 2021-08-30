import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { actions as editorActions } from '../../redux/editor'
import storeMethods from '../../redux/methods'
import { findTextEditor, selectLine as selectLineInTextEditor } from '../../helpers/textEditorInstance'

const base64Check = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/
function convertFromBase64 (v) {
  if (base64Check.test(v)) {
    return decodeURIComponent(escape(atob(v)))
  }
  return v
}

function useOpenErrorLine () {
  const dispatch = useDispatch()

  const openErrorLine = useCallback((error) => {
    dispatch(editorActions.openTab({ shortid: error.entity.shortid })).then(() => {
      setTimeout(() => {
        const entity = storeMethods.getEntityByShortid(error.entity.shortid)
        const contentIsTheSame = convertFromBase64(entity.content) === error.entity.content
        const entityEditor = findTextEditor(error.property === 'content' ? entity._id : `${entity._id}_helpers`)

        if (entityEditor != null && contentIsTheSame) {
          selectLineInTextEditor(entityEditor, { lineNumber: error.lineNumber, error: true })
        }
      }, 300)
    })
  }, [dispatch])

  return openErrorLine
}

export default useOpenErrorLine
