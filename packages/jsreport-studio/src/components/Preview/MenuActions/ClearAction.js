import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { actions } from '../../../redux/editor'

const ClearAction = ({ closeMenu }) => {
  const dispatch = useDispatch()

  const clearPreview = useCallback(() => {
    dispatch(actions.clearPreview())
  }, [dispatch])

  return (
    <div
      onClick={() => {
        clearPreview()
        closeMenu()
      }}
    >
      <i className='fa fa-times' /><span>Clear</span>
    </div>
  )
}

export default ClearAction
