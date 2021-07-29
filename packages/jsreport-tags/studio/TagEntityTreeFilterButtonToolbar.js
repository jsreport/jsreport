import React, { Component } from 'react'
import Studio, { Popover } from 'jsreport-studio'
import * as organizeState from './organizeState'
import emitter from './emitter'
import TagEntityTreeFilterByTags from './TagEntityTreeFilterByTags'
import styles from './TagEntityTreeButtonToolbar.css'

class TagEntityTreeFilterButtonToolbar extends Component {
  constructor (props) {
    super(props)

    this.state = {
      showFilter: false,
      selectedTags: organizeState.filterTags || []
    }

    this.openFilter = this.openFilter.bind(this)
    this.closeFilter = this.closeFilter.bind(this)
    this.handleTagSelectChange = this.handleTagSelectChange.bind(this)
  }

  openFilter (ev) {
    ev.stopPropagation()
    this.setState({ showFilter: true })
  }

  closeFilter () {
    this.setState({ showFilter: false })
    this.props.closeMenu()
  }

  handleTagSelectChange (selectedTags) {
    const { setFilter } = this.props

    setFilter({
      tags: selectedTags
    })

    this.setState({
      selectedTags
    }, () => {
      emitter.emit('filterByTagsChanged', selectedTags)
    })
  }

  render () {
    const { showFilter, selectedTags } = this.state
    const allTags = Studio.getReferences().tags
    const isActive = selectedTags.length > 0

    return (
      <div
        title='Filter entities tree by tag'
        style={{ display: 'inline-block' }}
        onClick={this.openFilter}
      >
        <span style={{ display: 'inline-block' }}>
          <span
            style={{ display: 'inline-block', marginRight: '0.3rem' }}
            className={isActive ? styles.active : ''}
          >
            <span className='fa fa-filter' />
            &nbsp;
            <span className='fa fa-tag' />
          </span>
          <span style={{ display: 'inline-block' }}>
            Filter by tag
          </span>
        </span>
        <Popover
          open={showFilter}
          onClose={this.closeFilter}
        >
          <TagEntityTreeFilterByTags
            tags={allTags}
            selectedTags={selectedTags}
            onTagSelectChange={this.handleTagSelectChange}
            onFilterClose={this.closeFilter}
          />
        </Popover>
      </div>
    )
  }
}

export default TagEntityTreeFilterButtonToolbar
