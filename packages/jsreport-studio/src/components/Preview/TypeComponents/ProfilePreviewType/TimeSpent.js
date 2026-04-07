import { Fragment, useMemo } from 'react'
import humanizeReportDuration from '../../../../helpers/humanizeReportDuration'
import styles from '../../Preview.css'

function TimeSpent ({ time, timeCost, icon }) {
  const timeCostCategoryClass = useMemo(() => timeCost == null ? '' : getTimeCostCategoryClass(timeCost * 100), [timeCost])
  const humanizedTime = useMemo(() => humanizeReportDuration(time), [time])

  let timeContent = humanizedTime

  if (icon) {
    timeContent = (
      // eslint-disable-next-line
      <Fragment>
        {icon}&nbsp;{humanizedTime}
      </Fragment>
    )
  }

  return (
    // eslint-disable-next-line
    <Fragment>
      {timeCost != null && (
        <div
          className={`${styles.profileExecutionTimeCost} ${timeCostCategoryClass}`}
          style={{ width: `${timeCost * 100}%` }}
        >
          &nbsp;
        </div>
      )}
      <div className={styles.profileExecutionTime}>
        <span className={styles.profileExecutionTimeLabel}>{timeContent}</span>
      </div>
      <div className={styles.profileExecutionTimeCover} title={`${time}ms`}>
        &nbsp;
      </div>
    </Fragment>
  )
}

export default TimeSpent

function getTimeCostCategoryClass (percentageCost) {
  if (percentageCost < 20) {
    return styles.low
  } else if (percentageCost < 60) {
    return styles.medium
  } else {
    return styles.high
  }
}
