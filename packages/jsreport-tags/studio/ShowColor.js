import React from 'react'
import simpleCheckForValidColor from './simpleCheckForValidColor'
import colorLuminance from './colorLuminance'

const ShowColor = (props) => {
  const {
    color,
    height = 15,
    width = 20
  } = props

  let borderColor = props.borderColor
  let currentColor = 'inherit'

  if (simpleCheckForValidColor(color)) {
    currentColor = color
  }

  if (!borderColor) {
    borderColor = colorLuminance(currentColor, -0.35)
  }

  return (
    <span
      style={{
        backgroundColor: currentColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: borderColor,
        display: 'inline-block',
        height: height,
        verticalAlign: 'middle',
        width: width
      }}
    />
  )
}

export default ShowColor
