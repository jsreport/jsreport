import React, { Component } from 'react'
import styles from './FileInput.css'

class FileInput extends Component {
  constructor (props) {
    super(props)

    this.inputFileRef = React.createRef()

    this.state = {}
  }

  openSelection () {
    this.inputFileRef.current.dispatchEvent(new window.MouseEvent('click', {
      view: window,
      bubbles: false,
      cancelable: true
    }))
  }

  render () {
    const { placeholder, selectedFile, onFileSelect, disabled } = this.props

    let placeholderText

    if (placeholder) {
      placeholderText = placeholder
    } else {
      placeholderText = 'select file...'
    }

    return (
      <div
        className={styles.selectInput} onClick={() => !disabled && this.openSelection()}
        style={{ opacity: disabled ? 0.7 : 1 }}
      >
        <i className='fa fa-upload' />
        <span
          title={placeholderText}
          className={styles.nameLabel}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()

            if (!disabled) {
              this.openSelection()
            }
          }}
        >
          {selectedFile ? selectedFile.name : placeholderText}
        </span>
        <input
          type='file'
          key='file'
          ref={this.inputFileRef}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (!e.target.files.length) {
              return
            }

            onFileSelect(e.target.files[0])
          }}
        />
      </div>
    )
  }
}

(function (window) {
  try {
    new MouseEvent('test')  // eslint-disable-line
    return false // No need to polyfill
  } catch (e) {
    // Need to polyfill - fall through
  }

  // Polyfills DOM4 MouseEvent
  const MouseEvent = function (eventType, params) {
    params = params || { bubbles: false, cancelable: false }
    const mouseEvent = document.createEvent('MouseEvent')
    mouseEvent.initMouseEvent(eventType, params.bubbles, params.cancelable, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)

    return mouseEvent
  }

  MouseEvent.prototype = window.Event.prototype

  window.MouseEvent = MouseEvent
})(window)

export default FileInput
