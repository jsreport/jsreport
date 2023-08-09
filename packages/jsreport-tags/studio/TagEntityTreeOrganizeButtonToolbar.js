import React, { Component } from 'react'
import styles from './TagEntityTreeButtonToolbar.css'

class TagEntityTreeOrganizeButtonToolbar extends Component {
  constructor (props) {
    super(props)

    this.handleOrganizationModeChange = this.handleOrganizationModeChange.bind(this)
  }

  handleOrganizationModeChange (ev) {
    ev.stopPropagation()

    const { setGroupMode } = this.props

    setGroupMode((currentGroupMode) => {
      return currentGroupMode === 'tags' ? null : 'tags'
    })

    this.props.closeMenu()
  }

  render () {
    const { groupMode } = this.props

    return (
      <div
        title='Group and organize entities tree by tag'
        style={{ display: 'inline-block' }}
        onClick={this.handleOrganizationModeChange}
      >
        <span
          style={{ display: 'inline-block', marginRight: '0.3rem' }}
          className={groupMode === 'tags' ? styles.active : ''}
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
