import { useContext } from 'react'
import EntityTreeContext from './EntityTreeContext'
import { checkIsGroupNode } from './utils'

const NodeSelect = ({ id, node }) => {
  const { selectable, selectionMode, onNodeSelect, isNodeSelected } = useContext(EntityTreeContext)

  if (!selectable) {
    return null
  }

  let currentSelectionMode = selectionMode != null ? selectionMode : 'multiple'

  if (typeof currentSelectionMode === 'string') {
    currentSelectionMode = { mode: currentSelectionMode }
  }

  const isGroup = checkIsGroupNode(node)

  if (
    currentSelectionMode.isSelectable &&
    !currentSelectionMode.isSelectable(isGroup, node.data)
  ) {
    return null
  }

  const isSelected = isNodeSelected(node)

  function handleSelectChange (v) {
    const newValue = !!v.target.checked
    onNodeSelect(node, newValue, currentSelectionMode.mode)
  }

  if (isGroup) {
    return (
      <input
        id={id}
        key='select-group'
        style={{ marginRight: '5px' }}
        type={currentSelectionMode.mode === 'single' ? 'radio' : 'checkbox'}
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
      type={currentSelectionMode.mode === 'single' ? 'radio' : 'checkbox'}
      onChange={handleSelectChange}
      checked={isSelected}
    />
  )
}

export default NodeSelect
