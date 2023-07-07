import React, { Component } from 'react'
import { values as configuration } from '../../lib/configuration'

class TabContent extends Component {
  constructor (props) {
    super(props)
    this.tabRef = React.createRef()
  }

  componentDidUpdate (prevProps) {
    if (this.props.active && !prevProps.active) {
      for (const handler of configuration._tabActiveHandlers) {
        if (this.tabRef.current.contains(handler.el)) {
          handler.fn()
        }
      }
    }
  }

  shouldComponentUpdate (nextProps) {
    return this.props.active || nextProps.active
  }

  render () {
    const { active } = this.props

    return (
      <div ref={this.tabRef} className='block' style={{ display: active ? 'flex' : 'none' }}>
        {this.props.children}
      </div>
    )
  }
}

export default TabContent
