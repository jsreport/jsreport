import React, { Component } from 'react'

class Resizer extends Component {
  constructor (props) {
    super(props)

    this.onMouseDown = this.onMouseDown.bind(this)
  }

  onMouseDown (event) {
    if (!this.props.collapsed) {
      this.props.onMouseDown(event)
    }
  }

  render () {
    const {
      split,
      className,
      collapsed,
      collapse,
      collapsedText,
      renderCollapsedIcon,
      collapsable,
      buttons
    } = this.props

    const classes = ['Resizer', split, className]

    let toggleButtonEl = null

    if (buttons) {
      if (collapsed) {
        toggleButtonEl = (
          <div className='pane-holder' onClick={(e) => collapse(false)}>
            {renderCollapsedIcon != null && (
              renderCollapsedIcon()
            )}
            {collapsedText}
          </div>
        )
      } else {
        toggleButtonEl = (
          <div
            title='Minimize pane'
            className={'docker ' + (collapsable === 'first' ? 'left' : '')}
            onClick={(e) => collapse(true)}
          >
            <i className={'fa ' + (collapsable === 'first' ? 'fa-long-arrow-left' : 'fa-long-arrow-right')} />
          </div>
        )
      }
    }

    return (
      <div
        className={classes.join(' ') + (collapsed ? ' collapsed' : '')}
        // eslint-disable-next-line
        onMouseDown={this.onMouseDown}
      >
        <div className='resizer-line' />
        {toggleButtonEl}
      </div>
    )
  }
}

export default Resizer
