import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import openEditorLine from '../../helpers/openEditorLine'

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
    openEditorLine(error.entity.shortid, {
      lineNumber: error.lineNumber,
      getEditorName: (e) => error.property === 'content' ? e._id : `${e._id}_helpers`,
      isContentTheSame: (e) => convertFromBase64(e.content) === error.entity.content,
      error: true
    })
  }, [dispatch])

  return openErrorLine
}

export default useOpenErrorLine
