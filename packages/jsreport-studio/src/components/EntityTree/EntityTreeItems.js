import React, { Fragment, useContext } from 'react'
import { EntityTreeAllEntitiesContext } from './EntityTreeContext'

function EntityTreeItems (props) {
  const { position } = props
  const needsToBeConnected = position === 'container' || position === 'right'
  const TargetEntityTreeItems = needsToBeConnected ? ConnectedEntityTreeItems : RawEntityTreeItems

  return (
    <TargetEntityTreeItems
      {...props}
    />
  )
}

function ConnectedEntityTreeItems (props) {
  const entities = useContext(EntityTreeAllEntitiesContext)

  return (
    <RawEntityTreeItems
      {...props}
      entities={entities}
    />
  )
}

function RawEntityTreeItems (props) {
  const { position, components, entities, propsToItem, originalChildren } = props
  const targetPropsToItem = entities != null ? { ...propsToItem, entities } : propsToItem

  if (position === 'container') {
    // composing components when position is container
    const wrappedItemElement = components.reduce((prevElement, b) => {
      if (prevElement == null) {
        return React.createElement(b, targetPropsToItem, originalChildren)
      }

      return React.createElement(b, targetPropsToItem, prevElement)
    }, null)

    if (!wrappedItemElement) {
      return null
    }

    return wrappedItemElement
  }

  return (
    // eslint-disable-next-line
    <Fragment>
      {components.map((p, i) => (
        React.createElement(p, {
          key: i,
          ...targetPropsToItem
        }))
      )}
    </Fragment>
  )
}

export default React.memo(EntityTreeItems)
