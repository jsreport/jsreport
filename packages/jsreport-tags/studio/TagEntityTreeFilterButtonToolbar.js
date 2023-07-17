import React, { Component } from 'react'
import Studio, { Popover } from 'jsreport-studio'
import { values as organizeState } from './organizeState'
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

    this.handleFilterClick = this.handleFilterClick.bind(this)
    this.handleCloseFilter = this.handleCloseFilter.bind(this)
    this.handleTagSelectChange = this.handleTagSelectChange.bind(this)
  }

  handleFilterClick (ev) {
    ev.stopPropagation()
    this.setState({ showFilter: true })
  }

  handleCloseFilter () {
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
        onClick={this.handleFilterClick}
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
          onClose={this.handleCloseFilter}
        >
          <TagEntityTreeFilterByTags
            tags={allTags}
            selectedTags={selectedTags}
            onTagSelectChange={this.handleTagSelectChange}
            onFilterClose={this.handleCloseFilter}
          />
        </Popover>
      </div>
    )
  }
}

export default TagEntityTreeFilterButtonToolbar
