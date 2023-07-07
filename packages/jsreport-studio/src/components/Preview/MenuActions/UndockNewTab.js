import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createGetActiveTabWithEntitySelector } from '../../../redux/editor/selectors'
import { values as configuration } from '../../../lib/configuration'
import { actions as editorActions } from '../../../redux/editor'

function UndockNewTab ({ id, completed, data, closeMenu }) {
  const dispatch = useDispatch()
  const getActiveTabWithEntity = useMemo(createGetActiveTabWithEntitySelector, [])
  const undockMode = useSelector((state) => state.editor.undockMode)
  const activeTabWithEntity = useSelector(getActiveTabWithEntity)

  const activateUndockMode = useCallback(() => {
    return dispatch(editorActions.activateUndockMode())
  }, [dispatch])

  const active = undockMode ? true : activeTabWithEntity != null && activeTabWithEntity.entity != null && activeTabWithEntity.entity.__entitySet === 'templates'

  if (!active) {
    return null
  }

  const enabled = !undockMode && completed

  return (
    <div
      className={enabled ? '' : 'disabled'} onClick={() => {
        if (!enabled) {
          return
        }

        activateUndockMode()
        configuration.collapsePreviewHandler(true)
        closeMenu()
      }}
    >
      <i className='fa fa-window-restore' /><span>Undock to new tab</span>
    </div>
  )
}

export default UndockNewTab
