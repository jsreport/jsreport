import React, { Component } from 'react'
import * as organizeState from './organizeState'
import emitter from './emitter'
import styles from './TagEntityTreeButtonToolbar.css'

class TagEntityTreeOrganizeButtonToolbar extends Component {
  constructor (props) {
    super(props)

    this.handleOrganizationModeChange = this.handleOrganizationModeChange.bind(this)
  }

  handleOrganizationModeChange (ev) {
    ev.stopPropagation()

    // notify parent that the organization mode has changed
    emitter.emit('organizationModeByTagsChanged', !organizeState.current)
    this.props.closeMenu()
  }

  render () {
    return (
      <div
        title='Group and organize entities tree by tag'
        style={{ display: 'inline-block' }}
        onClick={this.handleOrganizationModeChange}
      >
        <span
          style={{ display: 'inline-block', marginRight: '0.3rem' }}
          className={organizeState.current ? styles.active : ''}
        >
          <span className='fa fa-tags' />
        </span>
        <span style={{ display: 'inline-block' }}>
          Group by tag
        </span>
      </div>
    )
  }
}

export default TagEntityTreeOrganizeButtonToolbar
