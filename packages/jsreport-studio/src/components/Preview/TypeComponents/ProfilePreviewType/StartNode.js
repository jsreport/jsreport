import React, { useRef, useEffect } from 'react'
import { Handle } from 'react-flow-renderer'
import styles from '../../Preview.css'

const StartNode = React.memo(function StartNode (props) {
  const {
    id,
    isConnectable,
    targetPosition = 'top',
    sourcePosition = 'bottom'
  } = props

  const elRef = useRef(null)

  useEffect(() => {
    if (elRef.current != null) {
      elRef.current.parentElement.title = 'preview start'
    }
  }, [])

  return (
    <div ref={elRef}>
      <Handle type='target' position={targetPosition} isConnectable={isConnectable} />
      <span id={id}><i className={`fa fa-play ${styles.profileStartNodeLabel}`} /></span>
      <Handle type='source' position={sourcePosition} isConnectable={isConnectable} />
    </div>
  )
})

export default StartNode
