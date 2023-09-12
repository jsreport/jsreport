import PropTypes from 'prop-types'
import React, { Fragment, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import EntityTree from '../EntityTree/EntityTree'
import { createGetReferencesSelector } from '../../redux/entities/selectors'
import storeMethods from '../../redux/methods'
import styles from './EntityTreeSelectionModal.css'

function EntityTreeSelectionModal ({ options, close }) {
  const [newMode, setNewMode] = useState(false)
  const cancelRef = useRef(null)
  const newEntityCreatedRef = useRef(null)
  const entityTreeRef = useRef(null)

  const getReferences = useMemo(createGetReferencesSelector, [])
  const references = useSelector(getReferences)

  const {
    multiple,
    headingLabel,
    newLabel,
    filter,
    selectableFilter,
    renderNew,
    treeStyle = {},
    onSave
  } = options

  const entities = useMemo(() => {
    if (!filter) {
      return references
    }

    let result = filter(references)

    result = result == null ? {} : result

    result = Object.keys(references).reduce((acu, k) => {
      if (acu[k] == null) {
        acu[k] = []
      }

      return acu
    }, result)

    return result
  }, [references, filter])

  const initialSelected = useMemo(() => {
    const { selected } = options

    const initial = selected != null
      ? (
          !Array.isArray(selected) ? [selected] : selected
        )
      : []

    return initial.reduce((acu, shortid) => {
      const entity = storeMethods.getEntityByShortid(shortid, false)

      if (entity) {
        acu[entity._id] = true
      }

      return acu
    }, {})
  }, [])

  const selectionMode = useMemo(() => {
    return {
      mode: multiple ? 'multiple' : 'single',
      isSelectable: (isGroup, entity) => {
        if (selectableFilter) {
          return Boolean(selectableFilter(isGroup, entity))
        }

        if (isGroup) {
          return false
        }

        return true
      }
    }
  }, [])

  const handleCancel = useCallback(() => {
    if (close) {
      close()
    }
  }, [close])

  const handleNew = useCallback(() => {
    setNewMode(true)
  }, [])

  const handleUnselect = useCallback(() => {
    entityTreeRef.current.clearSelected()
  }, [])

  const handleCloseNewMode = useCallback(() => {
    if (newEntityCreatedRef.current != null) {
      return
    }

    setNewMode(false)
  }, [])

  const handleSave = useCallback((newEntity) => {
    const selected = newEntity != null ? { [newEntity._id]: true } : entityTreeRef.current.selected
    const values = []

    Object.keys(selected).forEach((_id) => {
      const entity = storeMethods.getEntityById(_id, false)

      if (!entity) {
        return
      }

      values.push(entity)
    })

    if (onSave) {
      onSave(values)
    }

    if (close) {
      close()
    }
  }, [close, onSave])

  useEffect(() => {
    if (cancelRef.current) {
      setTimeout(() => cancelRef.current.focus(), 0)
    }
  }, [])

  let content

  if (newMode) {
    const onNewEntity = (newEntity) => {
      newEntityCreatedRef.current = true
      handleSave(newEntity)
    }

    content = (
      <div>
        <div className={styles.backSection}>
          <span className={styles.backButton} onClick={handleCloseNewMode}>
            <i className={`fa fa-arrow-left ${styles.backLabel}`} /> <span className={styles.backLabel}>Back to selection</span>
          </span>
        </div>
        {renderNew({
          close,
          options: { onNewEntity }
        })}
      </div>
    )
  } else {
    content = (
      // eslint-disable-next-line react/jsx-fragments
      <Fragment>
        <div style={Object.assign({ minHeight: '30rem', maxHeight: '30rem', overflow: 'auto' }, treeStyle)}>
          <EntityTree
            ref={entityTreeRef}
            entities={entities}
            selectable
            selectionMode={selectionMode}
            initialSelected={initialSelected}
          />
        </div>
        <div className='button-bar'>
          <button
            ref={cancelRef}
            className='button confirmation'
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button className='button confirmation' onClick={handleUnselect}>Unselect</button>
          {renderNew != null && (
            <button
              className='button confirmation'
              onClick={handleNew}
            >
              New
            </button>
          )}
          <button className='button danger' onClick={() => handleSave()}>Ok</button>
        </div>
      </Fragment>
    )
  }

  return (
    <div>
      <div>
        <h1>
          <i className='fa fa-check-square-o' />
          &nbsp;
          {newMode ? newLabel != null ? newLabel : 'New entity' : headingLabel != null ? headingLabel : 'Select entity'}
        </h1>
      </div>
      {content}
    </div>
  )
}

EntityTreeSelectionModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

export default EntityTreeSelectionModal
