
import React, { Component } from 'react'
import style from './HourTimeSelect.css'

class HourTimeSelectItem extends Component {
  constructor (props) {
    super(props)

    this.onClick = this.onClick.bind(this)
  }

  onClick () {
    this.props.onClick(this.props.value)
  }

  render () {
    const {
      value,
      active
    } = this.props

    return (
      <div
        className={style.item + ' ' + (active ? style.itemSelected : '')}
        onClick={this.onClick}
      >
        {value}
      </div>
    )
  }
}

class HourTimeSelect extends Component {
  constructor (props) {
    super(props)

    this.onItemClick = this.onItemClick.bind(this)
  }

  componentDidMount () {
    this.itemsContainer.focus()
  }

  onItemClick (value) {
    this.props.onSelect(value)
  }

  render () {
    const { type = 'hour' } = this.props
    const title = `Time: ${type[0].toUpperCase() + type.slice(1)}`
    let maxItems
    let columnLimit = 6
    let rowCount = 0
    let items = []
    let maxRowCount

    if (type === 'hour') {
      maxItems = 24
    } else if (type === 'minute') {
      maxItems = 60
    }

    maxRowCount = maxItems / columnLimit

    while (rowCount < maxRowCount) {
      let value = rowCount
      let cols = []

      for (let i = 0; i < columnLimit; i++) {
        cols.push(value + (maxRowCount * i))
      }

      items = items.concat(cols.map((colValue) => {
        let valueItem = String(colValue).length === 1 ? `0${colValue}` : String(colValue)

        return (
          <HourTimeSelectItem
            key={colValue}
            active={this.props.value === valueItem}
            value={valueItem}
            onClick={this.onItemClick}
          />
        )
      }))

      rowCount++
    }

    return (
      <div
        className={style.container}
        style={{
          width: '150px'
        }}
      >
        <div
          className={style.title}
        >
          {title}
        </div>
        {/* tabIndex is used to make the div focusable and allow scrolling */}
        <div
          className={style.list}
          ref={(itemsContainer) => { this.itemsContainer = itemsContainer }}
          tabIndex='-1'
        >
          {items}
        </div>
      </div>
    )
  }
}

export default HourTimeSelect
