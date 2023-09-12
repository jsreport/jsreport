import { useCallback, useContext } from 'react'
import { useContextSelector } from 'use-context-selector'
import EntityTreeContext, { EntityTreeSelectedContext } from './EntityTreeContext'
import { checkIsGroupNode } from '../../helpers/checkEntityTreeNodes'

const NodeSelect = ({ id, node }) => {
  const { selectable, selectionMode } = useContext(EntityTreeContext)
  const isSelected = useContextSelector(EntityTreeSelectedContext, (ctx) => ctx[0][node.data._id] === true)
  const selectDispatch = useContextSelector(EntityTreeSelectedContext, (ctx) => ctx[1])
  let currentSelectionModeInfo = selectionMode != null ? selectionMode : 'multiple'

  if (typeof currentSelectionModeInfo === 'string') {
    currentSelectionModeInfo = { mode: currentSelectionModeInfo }
  }

  const currentSelectionMode = currentSelectionModeInfo.mode

  const handleSelectChange = useCallback((v) => {
    const newValue = !!v.target.checked

    selectDispatch({
      type: 'set',
      mode: currentSelectionMode,
      node,
      value: newValue
    })
  }, [selectDispatch, currentSelectionMode, node])

  if (!selectable) {
    return null
  }

  const isGroup = checkIsGroupNode(node)

  if (
    currentSelectionModeInfo.isSelectable &&
    !currentSelectionModeInfo.isSelectable(isGroup, node.data)
  ) {
    return null
  }

  if (isGroup) {
    return (
      <input
        id={id}
        key='select-group'
        style={{ marginRight: '5px' }}
        type={currentSelectionMode === 'single' ? 'radio' : 'checkbox'}
        checked={isSelected}
        onChange={handleSelectChange}
      />
    )
  }

  return (
    <input
      id={id}
      key='select-entity'
      style={{ marginRight: '5px' }}
      type={currentSelectionMode === 'single' ? 'radio' : 'checkbox'}
      onChange={handleSelectChange}
      checked={isSelected}
    />
  )
}

export default NodeSelect
