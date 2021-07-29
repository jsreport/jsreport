import React, { Component } from 'react'

class Pane extends Component {
  constructor (props) {
    super(props)
    this.state = {}
    this.nodeRef = React.createRef()
  }

  get node () {
    if (this.nodeRef && this.nodeRef.current) {
      return this.nodeRef.current
    }
  }

  render () {
    const { split } = this.props
    const classes = ['Pane', split, this.props.className]

    const style = {
      flex: 1,
      display: 'flex',
      outline: 'none'
    }

    if (this.state.size !== undefined) {
      if (split === 'vertical') {
        style.width = this.state.size
      } else {
        style.height = this.state.size
        style.display = 'flex'
      }
      style.flex = 'none'
    }

    style.minHeight = 0
    style.minWidth = 0

    return (
      <div ref={this.nodeRef} className={classes.join(' ')} style={style}>
        {this.props.children}
      </div>
    )
  }
}

export default Pane
