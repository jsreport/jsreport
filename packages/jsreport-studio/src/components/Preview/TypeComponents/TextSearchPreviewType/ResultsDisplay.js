import React, { useState, useMemo, useCallback } from 'react'
import getResultItemKey from './getResultItemKey'
import ResultItem from './ResultItem'
import styles from './TextSearchPreviewType.css'

function ResultDisplay (props) {
  const { text, result } = props
  const { matchesCount, entitiesCount, results } = result.data

  if (results.length === 0) {
    return null
  }

  const rawExpanded = useMemo(() => results.reduce((acu, result) => {
    acu[getResultItemKey(result)] = true
    return acu
  }, {}), [results])

  const [expanded, setExpanded] = useState(rawExpanded)

  const handleResultItemToggle = useCallback(function handleResultItemToggle (itemKey) {
    setExpanded((prevExpanded) => {
      const newExpanded = { ...prevExpanded }
      const isExpanded = newExpanded[itemKey] != null

      if (isExpanded) {
        delete newExpanded[itemKey]
      } else {
        newExpanded[itemKey] = true
      }

      return newExpanded
    })
  }, [])

  return (
    <div className='form-group'>
      <div style={{ marginTop: '-0.5rem' }}>
        <span className={styles.secondaryText}>{matchesCount} result(s) in {entitiesCount} {entitiesCount > 1 ? 'entities' : 'entity'}</span>
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        {results.map((result) => {
          const itemKey = getResultItemKey(result)

          return (
            <ResultItem
              key={itemKey}
              id={itemKey}
              text={text}
              result={result}
              expanded={expanded[itemKey] != null}
              onToggle={handleResultItemToggle}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ResultDisplay
