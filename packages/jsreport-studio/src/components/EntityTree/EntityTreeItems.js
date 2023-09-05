import React, { Fragment } from 'react'

function EntityTreeItems (props) {
  const { components, propsToItem } = props

  return (
    // eslint-disable-next-line
    <Fragment>
      {components.map((EntityTreeItemComponent, i) => {
        return React.createElement(EntityTreeItemComponent, {
          key: i,
          ...propsToItem
        })
      })}
    </Fragment>
  )
}

export default React.memo(EntityTreeItems)
