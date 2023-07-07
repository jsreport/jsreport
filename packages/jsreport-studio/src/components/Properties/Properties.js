import React, { useCallback, useMemo, useState } from 'react'
import styles from './Properties.css'
import { createGetActiveEntitySelector, createGetActiveTabSelector } from '../../redux/editor/selectors'
import { values as configuration } from '../../lib/configuration'
import { useDispatch, useSelector } from 'react-redux'
import { update } from '../../redux/editor/actions'

function Properties () {
  const entities = useSelector(state => state.entities)
  const getActiveTab = useMemo(createGetActiveTabSelector, [])
  const getActiveEntity = useMemo(createGetActiveEntitySelector, [])
  const activeEntity = useSelector(getActiveEntity)
  const activeTab = useSelector(getActiveTab)
  const dispatch = useDispatch()
  const [expanded, setExpanded] = useState({})

  const updateEntity = useCallback(function updateEntity (entity) {
    if (activeTab && activeTab.readOnly) {
      return
    }

    return dispatch(update(entity))
  }, [activeTab, dispatch])

  const handleEntityNameChange = useCallback(function handleEntityNameChange (v) {
    updateEntity({ _id: activeEntity._id, name: v.target.value })
  }, [activeEntity, updateEntity])

  const handlePropertyToggle = useCallback(function handlePropertyToggle (propertyIdx) {
    setExpanded((prevExpanded) => ({
      ...expanded,
      [propertyIdx]: !expanded[propertyIdx]
    }))
  }, [expanded])

  let propertiesContentEl = ''

  if (activeEntity) {
    propertiesContentEl = (
      <div className={styles.propertiesNodes}>
        <div>
          <div className='form-group'>
            <label>name</label>
            <input
              type='text'
              value={activeEntity.name || ''}
              onChange={handleEntityNameChange}
            />
          </div>
        </div>
        {configuration.propertiesComponents.map((def, i) => (
          <Property
            key={i}
            def={def}
            entity={activeEntity}
            entities={entities}
            expanded={expanded[i] === true}
            onActiveToggle={() => handlePropertyToggle(i)}
            onChange={updateEntity}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.title}>Properties</div>
      <div className={styles.propertiesContainer}>
        {propertiesContentEl}
      </div>
    </div>
  )
}

function Property (props) {
  const { def, entity, entities, expanded, onActiveToggle, onChange } = props

  if (!def.shouldDisplay(entity)) {
    return <div />
  }

  let titleEl

  if (typeof def.title === 'string') {
    titleEl = (
      <span>{def.title}</span>
    )
  } else {
    titleEl = def.title(entity, entities)
  }

  return (
    <div className={styles.propertyBox}>
      <div
        className={styles.propertyTitle + ' ' + (expanded ? styles.expanded : '')}
        onClick={onActiveToggle}
      >
        {titleEl}
      </div>
      <div
        className={styles.propertyContentBox + ' ' + (expanded ? styles.expanded : '')}
      >
        {React.createElement(def.component, {
          entity: entity,
          entities: entities,
          onChange: onChange
        })}
      </div>
    </div>
  )
}

export default Properties
