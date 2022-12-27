import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import shortid from 'shortid'
import debounce from 'lodash/debounce'
import resolveUrl from '../../../../helpers/resolveUrl'
import ResultDisplay from './ResultsDisplay'

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
    searchElRef.current.style.paddingTop = `${space + 1}px`

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
        setSearchResult({
          ...data,
          id: shortid.generate()
        })
      },
      onFail: (err) => {
        searchAbortControllerRef.current = null

        if (err.name === 'AbortError') {
          return
        }

        setSearchResult({
          id: shortid.generate(),
          error: err.message
        })
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

  let resultEl

  if (searchResult != null) {
    if (searchResult.error) {
      resultEl = (
        <div className='form-group'>
          <span style={{ color: 'red' }}>Error while executing text search: {searchResult.error}</span>
        </div>
      )
    } else {
      resultEl = (
        <ResultDisplay
          key={searchResult.id}
          text={text}
          result={searchResult}
        />
      )
    }
  } else {
    resultEl = null
  }

  return (
    <div className='block' style={{ overflow: 'auto' }}>
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
      {resultEl}
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
