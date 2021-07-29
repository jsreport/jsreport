import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { actions as editorActions } from '../../redux/editor'
import storeMethods from '../../redux/methods'
import { findTextEditor, selectLine as selectLineInTextEditor } from '../../helpers/textEditorInstance'

function useOpenErrorLine () {
  const dispatch = useDispatch()

  const openErrorLine = useCallback((error) => {
    dispatch(editorActions.openTab({ shortid: error.entity.shortid })).then(() => {
      setTimeout(() => {
        const entity = storeMethods.getEntityByShortid(error.entity.shortid)
        const contentIsTheSame = entity.content === error.entity.content
        const entityEditor = findTextEditor(error.property === 'content' ? entity._id : `${entity._id}_helpers`)

        if (entityEditor != null && contentIsTheSame) {
          selectLineInTextEditor(entityEditor, { lineNumber: error.lineNumber })
        }
      }, 300)
    })
  }, [dispatch])

  return openErrorLine
}

export default useOpenErrorLine
