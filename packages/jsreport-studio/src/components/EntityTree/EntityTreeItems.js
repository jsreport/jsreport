import React, { Fragment, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { createGetReferencesSelector } from '../../redux/entities/selectors'
import { createSelector } from 'reselect'

function EntityTreeItems (props) {
  const { position, components, propsToItem } = props

  return (
    // eslint-disable-next-line
    <Fragment>
      {components.map((p, i) => {
        const componentMeta = typeof p.entitiesSelector === 'function' ? p : { component: p }
        const { component, entitiesSelector } = componentMeta
        const needsToBeConnected = position === 'right' && entitiesSelector != null
        const EntityTreeItemComponent = needsToBeConnected ? ConnectedEntityTreeItem : component
        const itemProps = needsToBeConnected ? { ...propsToItem, component, entitiesSelector: entitiesSelector } : propsToItem

        return React.createElement(EntityTreeItemComponent, {
          key: i,
          ...itemProps
        })
      })}
    </Fragment>
  )
}

function makeEntitiesMapperSelector (entitiesMapperSelector) {
  const getReferences = createGetReferencesSelector()

  return createSelector(getReferences, (entities) => {
    const { prop, value } = entitiesMapperSelector(entities)
    return { prop, value }
  })
}

function ConnectedEntityTreeItem (props) {
  const { component: EntityTreeItemCustomComponent, entitiesSelector, ...restProps } = props
  // we don't care about the chance of customSelector prop to be different
  // because this selector are expected to come from configuration
  // and it is not dynamic
  const getEntitiesMapper = useMemo(() => (
    makeEntitiesMapperSelector(entitiesSelector)
  ), [entitiesSelector])

  const entitiesMapInfo = useSelector(getEntitiesMapper)
  const itemProps = { ...restProps, [entitiesMapInfo.prop]: entitiesMapInfo.value }

  return (
    <EntityTreeItemCustomComponent
      {...itemProps}
    />
  )
}

export default React.memo(EntityTreeItems)
