
import React, { Component } from 'react'
import { Popover } from 'jsreport-studio'
import HourTimeSelect from './HourTimeSelect'

class HourTimePicker extends Component {
  constructor (props) {
    super(props)

    this.state = {
      editing: false
    }

    this.handleSelect = this.handleSelect.bind(this)
  }

  handleSelect (val) {
    this.setState({ editing: false })
    this.props.onChange(val)
  }

  render () {
    const { editing } = this.state
    const { type, value } = this.props

    return (
      <div style={{ display: 'inline-block' }}>
        <input
          type='text'
          readOnly
          style={{ width: '30px', cursor: 'pointer' }}
          value={value}
          onClick={() => this.setState({ editing: true })}
        />
        <Popover
          wrapper={false}
          open={editing}
          onClose={() => this.setState({ editing: false })}
        >
          <HourTimeSelect
            type={type}
            value={value}
            onSelect={this.handleSelect}
          />
        </Popover>
      </div>
    )
  }
}

export default HourTimePicker
