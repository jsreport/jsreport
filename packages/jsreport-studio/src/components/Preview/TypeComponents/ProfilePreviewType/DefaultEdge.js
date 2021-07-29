import classNames from 'classnames'
import React, { Fragment, useEffect } from 'react'
import { getSmoothStepPath, getMarkerEnd } from 'react-flow-renderer'
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
    arrowHeadType,
    markerEndId
  } = props

  const edgePath = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const markerEnd = getMarkerEnd(arrowHeadType, markerEndId)
  const expanderClass = classNames('react-flow__edge-path', styles.profileOperationEdgeExpander)
  const mainClass = classNames('react-flow__edge-path', styles.main)

  useEffect(() => {
    const elId = 'react-flow__arrowclosed'
    const clonedElId = `${elId}-active`

    if (document.getElementById(clonedElId) == null) {
      const markerEndEl = document.getElementById(elId)
      const clonedMarkerEndEl = markerEndEl.cloneNode(true)
      clonedMarkerEndEl.id = `${clonedMarkerEndEl.id}-active`
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
