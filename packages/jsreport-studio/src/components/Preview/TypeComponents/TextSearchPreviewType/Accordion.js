import { useCallback } from 'react'
import classNames from 'classnames'
import styles from './Accordion.css'

function Accordion (props) {
  const { title, expanded, onToggle, children } = props

  const handleOnToggle = useCallback(function handleOnToggle () {
    onToggle()
  }, [onToggle])

  const contentBoxClass = classNames(styles.accordionContentBox, {
    [styles.expanded]: expanded
  })

  let titleEl

  if (typeof title === 'string') {
    titleEl = <span>{title}</span>
  } else {
    titleEl = title
  }

  return (
    <div>
      <div
        className={styles.accordionTitle}
        onClick={handleOnToggle}
      >
        {titleEl}
      </div>
      <div className={contentBoxClass}>
        {children}
      </div>
    </div>
  )
}

export default Accordion
