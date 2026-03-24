import classNames from 'classnames'
import React, { Fragment, useEffect } from 'react'
import { getSmoothStepPath } from '@xyflow/react'
import styles from '../../Preview.css'

const DefaultEdge = React.memo(function DefaultEdge (props) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd
  } = props

  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const expanderClass = classNames('react-flow__edge-path', styles.profileOperationEdgeExpander)
  const mainClass = classNames('react-flow__edge-path', styles.main)

  useEffect(() => {
    // NOTE: this id depends on the version of react flow, if we update we should review if the id
    // remains the same, and update it if needed, also ensure we update selectors in Preview.css
    // which references the ${elId}-active
    const elId = '1__type=arrowclosed'
    const clonedElId = 'custom-arrowclosed-active'

    if (document.getElementById(clonedElId) == null) {
      const markerEndEl = document.getElementById(elId)
      const clonedMarkerEndEl = markerEndEl.cloneNode(true)
      clonedMarkerEndEl.id = clonedElId
      markerEndEl.parentElement.appendChild(clonedMarkerEndEl)
    }
  }, [])

  return (
    // eslint-disable-next-line
    <Fragment>
      <path
        id={`${id}-expander`}
        style={style}
        className={expanderClass}
        d={edgePath}
      />
      <path
        id={id}
        style={style}
        className={mainClass}
        d={edgePath}
        markerEnd={markerEnd}
      />
    </Fragment>
  )
})

export default DefaultEdge
