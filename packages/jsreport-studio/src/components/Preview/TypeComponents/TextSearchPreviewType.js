import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import debounce from 'lodash/debounce'
import Highlighter from 'react-highlight-words'
import resolveUrl from '../../../helpers/resolveUrl'
import { resolveEntityTreeIconStyle } from '../../EntityTree/utils'
import openEditorLine from '../../../helpers/openEditorLine'
import { entitySets } from '../../../lib/configuration'
import storeMethods from '../../../redux/methods'
import styles from './TextSearchPreviewType.css'

function TextSearchPreviewType (props) {
  const searchElRef = useRef(null)
  const searchAbortControllerRef = useRef(null)
  const [text, setText] = useState('')
  const [searchResult, setSearchResult] = useState(null)

  const debouncedTextSearch = useMemo(() => {
    return debounce(doTextSearch, 350)
  }, [])

  const updateTextareaHeight = useCallback(() => {
    if (searchElRef.current == null) {
      return
    }

    const space = 6

    searchElRef.current.style.height = 0
    // includes the top/bottom padding
    searchElRef.current.style.height = `${searchElRef.current.scrollHeight + space}px`
    searchElRef.current.style.paddingTop = `${space}px`

    if (searchElRef.current.style.visibility === 'hidden') {
      searchElRef.current.style.visibility = 'visible'
    }
  }, [])

  const executeSearch = useCallback(function executeSearch (text, useDebounce = true) {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
    }

    if (text === '') {
      setSearchResult(null)
      return
    }

    const searchFn = useDebounce ? debouncedTextSearch : doTextSearch

    searchFn(text, {
      onStart: () => {
        searchAbortControllerRef.current = new AbortController()
        return searchAbortControllerRef.current.signal
      },
      onSuccess: (data) => {
        searchAbortControllerRef.current = null
        setSearchResult(data)
      },
      onFail: (err) => {
        searchAbortControllerRef.current = null

        if (err.name === 'AbortError') {
          return
        }

        setSearchResult({ error: err.message })
      }
    })
  }, [])

  const handleTextChange = useCallback(function handleTextChange (ev) {
    const newText = ev.target.value
    updateTextareaHeight()
    setText(newText)
    executeSearch(newText)
  }, [updateTextareaHeight, executeSearch])

  const handleKeyPress = useCallback(function handleKeyPress (ev) {
    if (ev.defaultPrevented) {
      return
    }

    const keyCode = ev.keyCode
    const enterKey = 13

    if (keyCode === enterKey && !ev.shiftKey) {
      ev.preventDefault()
      executeSearch(ev.target.value, false)
    }
  }, [executeSearch])

  useEffect(() => {
    if (searchElRef.current == null) {
      return
    }

    updateTextareaHeight()

    setTimeout(() => {
      searchElRef.current.focus()
    }, 150)
  }, [updateTextareaHeight])

  return (
    <div className='block'>
      <div className='form-group'>
        <textarea
          ref={searchElRef}
          id='jsreport-entities-text-search'
          className='text-input'
          autoCorrect='false'
          autoCapitalize='false'
          spellCheck='false'
          wrap='off'
          style={{ resize: 'none', visibility: 'hidden', fontFamily: 'Arial' }}
          placeholder='Search'
          value={text}
          onKeyDown={handleKeyPress}
          onChange={handleTextChange}
        />
      </div>
      <ResultDisplay text={text} result={searchResult} />
    </div>
  )
}

function ResultDisplay (props) {
  const { text, result } = props

  if (result == null) {
    return null
  }

  const { error, matchesCount, entitiesCount, results } = result

  if (error != null) {
    return (
      <div className='form-group'>
        <span style={{ color: 'red' }}>Error while executing text search: {error}</span>
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  const getResultItemKey = (result) => `${result.entity._id}-${result.entitySet}`

  const [expanded, setExpanded] = useState(() => results.reduce((acu, result) => {
    acu[getResultItemKey(result)] = true
    return acu
  }, {}))

  const getEntityParentPath = (entityPath) => {
    const fullPath = entityPath.split('/').slice(0, -1).join('/')
    return fullPath === '' ? '/' : fullPath
  }

  return (
    <div className='form-group'>
      <div style={{ marginTop: '-0.5rem' }}>
        <span className={styles.secondaryText}>{matchesCount} result(s) in {entitiesCount} {entitiesCount > 1 ? 'entities' : 'entity'}</span>
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        {results.map((result) => {
          const itemKey = getResultItemKey(result)
          const isExpanded = expanded[itemKey] != null
          const localEntity = storeMethods.getEntityById(result.entity._id)
          const entityIconClass = resolveEntityTreeIconStyle(localEntity) || (entitySets[result.entitySet].faIcon || styles.defaultEntityIcon)
          const matchesCount = result.docPropMatches.reduce((count, item) => count + item.lineMatches.length, 0)

          const title = (
            <div className={styles.itemTitle}>
              <span className={styles.expandedIcon}>
                <i className={`fa fa-chevron-${isExpanded ? 'down' : 'right'} ${styles.fullWidthIcon}`} />
              </span>
              <span className={styles.entityIcon}>
                <i className={`fa ${entityIconClass} ${styles.fullWidthIcon}`} />
              </span>
              {result.entity.name}
              <span className={styles.secondaryText + ' ' + styles.parentPath}>•&nbsp;{getEntityParentPath(result.entityPath)}</span>
              <span className={styles.matchesBadge}>{matchesCount}</span>
            </div>
          )

          const matches = result.docPropMatches.map((docPropMatch) => (
            <div key={docPropMatch.docProp}>
              <div className={`${styles.docPropMatchTitle} ${styles.secondaryText}`}>
                <span><i className='fa fa-bars' /> {docPropMatch.docProp}</span>
                <span className={styles.matchesBadge}>{docPropMatch.lineMatches.length}</span>
                <div className={styles.docPropMatchSeparator} />
              </div>
              {docPropMatch.lineMatches.map((match, idx) => (
                <div
                  key={`${docPropMatch.prop}-${idx}`}
                  className={styles.match}
                  onClick={() => {
                    openEditorLine(result.entity.shortid, {
                      lineNumber: match.start,
                      endLineNumber: match.end,
                      startColumn: match.startCharacter + 1,
                      endColumn: match.endCharacter + 1,
                      getEditorName: (e) => docPropMatch.docProp.indexOf('.') === -1 ? e._id : `${e._id}_${docPropMatch.docProp.replace(/\./g, '_')}`,
                      isContentTheSame: (e) => e.__isDirty !== true
                    })
                  }}
                >
                  <Highlighter
                    className={styles.matchText}
                    activeIndex={match.preview.match == null ? -1 : 0}
                    highlightTag='span'
                    activeClassName={styles.matchHighlightText}
                    title={match.preview.text}
                    searchWords={[text]}
                    textToHighlight={match.preview.text}
                    findChunks={() => {
                      if (match.preview.match == null) {
                        return []
                      }

                      return [{
                        start: match.preview.match.start,
                        end: match.preview.match.end
                      }]
                    }}
                  />
                  <div className={`${styles.matchLineNumber} ${styles.secondaryText}`} title={`From line ${match.start}${match.end - match.start > 0 ? ` + ${match.end - match.start} line(s)` : ''}`}>:{match.start}{match.end - match.start > 0 ? `+${match.end - match.start}` : ''}</div>
                </div>
              ))}
            </div>
          ))

          return (
            <Accordion
              key={itemKey}
              title={title}
              expanded={isExpanded}
              onToggle={() => {
                setExpanded((prevExpanded) => {
                  const newExpanded = { ...prevExpanded }

                  if (isExpanded) {
                    delete newExpanded[itemKey]
                  } else {
                    newExpanded[itemKey] = true
                  }

                  return newExpanded
                })
              }}
            >
              <div className={styles.itemContent}>
                {matches}
                <div className={styles.itemContentGuide} />
              </div>
            </Accordion>
          )
        })}
      </div>
    </div>
  )
}

function Accordion (props) {
  const { title, expanded, onToggle, children } = props
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
        onClick={onToggle}
      >
        {titleEl}
      </div>
      <div className={styles.accordionContentBox + ' ' + (expanded ? styles.expanded : '')}>
        {children}
      </div>
    </div>
  )
}

function doTextSearch (searchText, cbs) {
  let signal

  if (cbs.onStart) {
    signal = cbs.onStart()
  }

  window.fetch(`${resolveUrl('/studio/text-search')}?${new URLSearchParams({ text: searchText })}`, {
    method: 'GET',
    cache: 'no-cache',
    signal
  }).then((response) => {
    if (response.ok) {
      return response.json()
    }

    return response.text()
  }).then((data) => {
    if (typeof data === 'string') {
      throw new Error(data)
    }

    cbs.onSuccess && cbs.onSuccess(data)
  }).catch((err) => {
    cbs.onFail && cbs.onFail(err)
  })
}

export default TextSearchPreviewType
