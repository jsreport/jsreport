import React, { useCallback } from 'react'
import getLogNodeId from './getLogNodeId'
import styles from '../../Preview.css'

const LogsDisplay = React.memo(function LogsDisplay (props) {
  const { logs } = props

  const getRelativeTimestamp = useCallback((prevTimestamp, currentTimestamp) => {
    return currentTimestamp - prevTimestamp
  }, [])

  const getUTCDate = useCallback((dateInput) => {
    const year = dateInput.getUTCFullYear()
    const month = ('0' + (dateInput.getUTCMonth() + 1).toString()).slice(-2)
    const date = ('0' + dateInput.getUTCDate().toString()).slice(-2)
    const hours = ('0' + dateInput.getUTCHours().toString()).slice(-2)
    const minutes = ('0' + dateInput.getUTCMinutes().toString()).slice(-2)
    const seconds = ('0' + dateInput.getUTCSeconds().toString()).slice(-2)

    return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}Z`
  }, [])

  const logsLength = logs.length
  const logsElements = []
  let prevLog
  let currentClass = styles.standard

  for (let i = 0; i < logsLength; i++) {
    const log = logs[i]
    const relativeTime = `+${prevLog == null ? '0' : String(getRelativeTimestamp(prevLog.timestamp, log.timestamp))}`
    const logDate = new Date(log.timestamp)

    if (prevLog != null && prevLog.previousOperationId !== log.previousOperationId) {
      if (currentClass === styles.standard) {
        currentClass = styles.alternative
      } else {
        currentClass = styles.standard
      }
    }

    const logClassificationClass = currentClass

    logsElements.push(
      <div id={getLogNodeId(i)} className={`${styles.profileLogItem} ${logClassificationClass}`} key={i}>
        <span className={`${styles.profileLogItemLevel} ${styles[log.level]}`}>{log.level}</span>
        <span
          className={styles.profileLogItemTime}
          title={getUTCDate(logDate)}
        >
          {relativeTime}
        </span>
        <span
          className={styles.profileLogItemMessage}
          title={log.message}
        >
          {log.message}
        </span>
      </div>
    )

    prevLog = log
  }

  return (
    <div className={styles.profileLogs}>
      {logsElements}
    </div>
  )
})

export default LogsDisplay
