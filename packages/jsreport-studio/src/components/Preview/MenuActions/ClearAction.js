import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { actions } from '../../../redux/editor'

const ClearAction = ({ completed, closeMenu }) => {
  const dispatch = useDispatch()

  const clearPreview = useCallback(() => {
    dispatch(actions.clearPreview())
  }, [dispatch])

  const enabled = completed

  return (
    <div
      className={enabled ? '' : 'disabled'}
      onClick={() => {
        if (!enabled) {
          return
        }

        clearPreview()
        closeMenu()
      }}
    >
      <i className='fa fa-times' /><span>Clear</span>
    </div>
  )
}

export default ClearAction
