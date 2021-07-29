import React, { Component } from 'react'
import styles from './MultiSelect.css'

class MultiSelect extends Component {
  constructor (props) {
    super(props)

    this.setListNode = this.setListNode.bind(this)
    this.areAllSelected = this.areAllSelected.bind(this)
    this.handleSelectUnselectAllClick = this.handleSelectUnselectAllClick.bind(this)
    this.handleOptionClick = this.handleOptionClick.bind(this)
    this.renderOption = this.renderOption.bind(this)
  }

  setListNode (el) {
    this.listNode = el
  }

  areAllSelected (options, value) {
    return options.filter((opt) => value.indexOf(opt.value) === -1).length === 0
  }

  handleSelectUnselectAllClick (ev) {
    const { options, value, onChange } = this.props
    const allSelected = this.areAllSelected(options, value)
    const target = ev.target
    const isCheckBox = target.tagName.toLowerCase() === 'input' && target.type === 'checkbox'
    let newValue

    // if it is not checkbox prevent default to avoid getting two click events
    if (!isCheckBox) {
      ev.preventDefault()
    }

    ev.stopPropagation()

    if (allSelected) {
      newValue = []
    } else {
      newValue = options.map((opt) => opt.value)
    }

    if (onChange) {
      onChange({
        options,
        value: newValue
      })
    }
  }

  handleOptionClick (ev, valueFrom) {
    const { value, options, onChange } = this.props
    const listNode = this.listNode
    const target = ev.target
    const isCheckBox = target.tagName.toLowerCase() === 'input' && target.type === 'checkbox'

    // if it is not checkbox prevent default to avoid getting two click events
    if (!isCheckBox) {
      ev.preventDefault()
    }

    ev.stopPropagation()

    const newValue = [...value]
    const existsIndex = newValue.indexOf(valueFrom)

    if (existsIndex === -1) {
      newValue.push(valueFrom)
    } else {
      newValue.splice(existsIndex, 1)
    }

    if (onChange) {
      onChange({
        options,
        value: newValue
      })
    }

    listNode.focus()
  }

  renderOption (option) {
    const { value: selectedValue } = this.props
    const { name, value } = option
    const key = option.key != null ? option.key : value
    const isSelected = selectedValue.indexOf(value) !== -1

    return (
      <li
        key={key}
        onClick={(ev) => this.handleOptionClick(ev, value)}
        className={`${styles.listOption} ${isSelected ? styles.listOptionSelected : ''}`}
      >
        <label className={styles.listOptionLabel}>
          <input type='checkbox' checked={isSelected} readOnly />
          {name}
        </label>
      </li>
    )
  }

  render () {
    const { value, options, size = 5, title } = this.props
    const allSelected = this.areAllSelected(options, value)
    const height = 16.46 * size

    return (
      <div>
        <div className={styles.allCheckContainer}>
          <label className={styles.allCheck} onClick={this.handleSelectUnselectAllClick}>
            <input type='checkbox' checked={allSelected} readOnly />
            Select/Unselect all
          </label>
        </div>
        <div className={styles.multiSelect} title={title}>
          <ul
            ref={this.setListNode}
            className={styles.list}
            tabIndex='0'
            style={{ minHeight: height, maxHeight: height }}
          >
            {options.map(this.renderOption)}
          </ul>
        </div>
      </div>
    )
  }
}

export default MultiSelect
