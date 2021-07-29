
import React, { Component, PureComponent } from 'react'
import debounce from 'lodash.debounce'
import simpleCheckForValidColor from '../simpleCheckForValidColor'

const colorToState = (data) => {
  const color = data.hex ? data.hex : data

  return {
    hex: `${color}`
  }
}

const ColorWrap = (Picker) => {
  class ColorPicker extends (PureComponent || Component) {
    constructor (props) {
      super(props)

      this.state = {
        ...colorToState(props.color),
        visible: props.display
      }

      this.debounce = debounce((fn, data, event) => {
        fn(data, event)
      }, 100)

      this.handleChange = this.handleChange.bind(this)
    }

    static getDerivedStateFromProps (props) {
      return {
        ...colorToState(props.color),
        visible: props.display
      }
    }

    handleChange (data, event) {
      const isValidColor = simpleCheckForValidColor(data.hex)

      if (isValidColor) {
        const colors = colorToState(data)
        this.setState(colors)
        this.props.onChangeComplete && this.debounce(this.props.onChangeComplete, colors, event)
        this.props.onChange && this.props.onChange(colors, event)
      }
    }

    render () {
      return (
        <Picker
          {...this.props}
          {...this.state}
          onChange={this.handleChange}
        />
      )
    }
  }

  ColorPicker.defaultProps = {
    color: ''
  }

  return ColorPicker
}

export default ColorWrap
