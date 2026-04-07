import React, { Fragment } from 'react'
import TimeSpent from './TimeSpent'
import styles from '../../Preview.css'

const OperationGroupNode = React.memo(function OperationGroupNode (props) {
  const { data } = props

  const { label, time, timeCost } = data

  return (
    // eslint-disable-next-line
    <Fragment>
      <div className={styles.profileOperationGroupHeader}>
        <span><i>{label}</i></span>
      </div>
      <TimeSpent time={time} timeCost={timeCost} />
    </Fragment>
  )
})

export default OperationGroupNode
