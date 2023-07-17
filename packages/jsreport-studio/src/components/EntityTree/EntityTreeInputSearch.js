import React, { useState, useEffect, useRef } from 'react'
import Popover from '../../components/common/Popover'
import EntityTreeButton from './EntityTreeButton'
import styles from './EntityTreeInputSearch.css'

const InputSearch = ({ value, onChange, onKeyDown }) => {
  const inputFilterRef = useRef(null)

  useEffect(() => {
    inputFilterRef.current && inputFilterRef.current.focus()
  }, [])

  return (
    <div className={styles.search}>
      <i className={styles.searchIcon} />
      <input
        ref={inputFilterRef}
        type='text'
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

const initialFilterState = {
  filterActive: false,
  filterByName: ''
}

const EntityTreeInputSearch = ({ setFilter }) => {
  const [displayInput, setDisplayInput] = useState(false)
  const [{ filterActive, filterByName }, setFilterState] = useState(initialFilterState)

  const handleNameFilterChange = (ev) => {
    const name = ev.target.value

    setFilterState({
      filterActive: Boolean(name),
      filterByName: name
    })

    setFilter({ name })
  }

  const handleKeyDownInput = (ev) => {
    if (ev.defaultPrevented) {
      return
    }

    const keyCode = ev.keyCode
    const enterKey = 13

    if (keyCode === enterKey) {
      ev.preventDefault()
      setDisplayInput(false)
    }
  }

  return (
    <div title='Filter entities tree by name' className={styles.container}>
      <EntityTreeButton active={filterActive} onClick={() => setDisplayInput(true)}>
        <span style={{ display: 'inline-block' }}>
          <i className='fa fa-filter' />
          &nbsp;
          <i className='fa fa-font' />
        </span>
      </EntityTreeButton>
      <Popover
        open={displayInput}
        onClose={() => setDisplayInput(false)}
      >
        <InputSearch
          value={filterByName}
          onChange={handleNameFilterChange}
          onKeyDown={handleKeyDownInput}
        />
      </Popover>
    </div>
  )
}

export default EntityTreeInputSearch
