import React, { Component } from 'react'
import ReactList from 'react-list'
import colorLuminance from './colorLuminance'
import getColorLuminance from './getColorLuminance'
import ShowColor from './ShowColor'
import style from './TagEntityTreeFilterByTags.css'

class TagEntityTreeFilterByTags extends Component {
  constructor (props) {
    super(props)

    this.tagSelectionRef = React.createRef()
    this.tagSelectionInputRef = React.createRef()
    this.tagListRef = React.createRef()

    this.state = {
      showTagsList: true,
      filterText: ''
    }

    this.createRenderer = this.createRenderer.bind(this)
    this.addSelectedTag = this.addSelectedTag.bind(this)
    this.handleTagSelectionClick = this.handleTagSelectionClick.bind(this)
    this.handleChangeInputTag = this.handleChangeInputTag.bind(this)
    this.handleKeyDownInputTag = this.handleKeyDownInputTag.bind(this)
    this.onRemoveTagItem = this.onRemoveTagItem.bind(this)
  }

  componentDidMount () {
    this.focus()
  }

  createRenderer (tags) {
    return (index, key) => this.renderTagItem(tags[index])
  }

  addSelectedTag (tag) {
    const previousSelectedTags = this.props.selectedTags

    const selectedTags = [
      ...previousSelectedTags,
      tag
    ]

    this.props.onTagSelectChange(selectedTags)
    this.focus()
  }

  focus () {
    if (this.tagSelectionInputRef.current && typeof this.tagSelectionInputRef.current.focus === 'function') {
      this.tagSelectionInputRef.current.focus()
    }
  }

  getTagsToShow (allTags, selectedTags, filterText) {
    if (selectedTags.length === 0 && filterText === '') {
      return allTags
    }

    return allTags.filter((tag) => {
      let filterPass = true

      if (filterText !== '') {
        filterPass = tag.name.indexOf(filterText) !== -1
      }

      if (!filterPass) {
        return false
      }

      const foundInSelectedTags = selectedTags.some((selectTag) => {
        return selectTag.shortid === tag.shortid
      })

      return !foundInSelectedTags
    })
  }

  handleTagSelectionClick (ev) {
    // if the tag selection area is directly clicked
    // focus the input
    if (ev.target === this.tagSelectionRef.current) {
      this.focus()
    }
  }

  handleChangeInputTag (ev) {
    this.setState({
      filterText: ev.target.value
    })
  }

  handleKeyDownInputTag (ev) {
    if (ev.defaultPrevented) {
      return
    }

    const keyCode = ev.keyCode
    const inputTag = ev.target
    let remove = false
    const enterKey = 13
    const removeKey = 8

    if (keyCode === enterKey) {
      ev.preventDefault()

      return this.props.onFilterClose()
    }

    if (keyCode === removeKey) {
      remove = true
    }

    if (remove && inputTag.value === '') {
      const selectedTags = this.props.selectedTags
      const selectedTagsLastIndex = selectedTags.length - 1

      ev.preventDefault()

      if (selectedTagsLastIndex >= 0) {
        this.onRemoveTagItem(selectedTags[selectedTagsLastIndex], selectedTagsLastIndex)
      }
    }
  }

  onRemoveTagItem (tag, tagIndex) {
    const originalSelectedTags = this.props.selectedTags

    const selectedTags = [
      ...originalSelectedTags.slice(0, tagIndex),
      ...originalSelectedTags.slice(tagIndex + 1)
    ]

    this.props.onTagSelectChange(selectedTags)
  }

  renderTagItem (tag) {
    return (
      <div
        key={tag.shortid}
        className={style.tagsListItem}
        onClick={() => this.addSelectedTag(tag)}
      >
        <ShowColor color={tag.color} />
        &nbsp;
        <span>{tag.name}</span>
      </div>
    )
  }

  render () {
    const { showTagsList, filterText } = this.state
    const { tags, selectedTags } = this.props
    const tagsToShowInList = this.getTagsToShow(tags, selectedTags, filterText)

    const stylesForTagsList = {}
    const stylesForInputTag = {}

    if (showTagsList) {
      stylesForTagsList.display = 'block'
    } else {
      stylesForTagsList.display = 'none'
    }

    if (selectedTags.length === 0) {
      stylesForInputTag.width = '100%'
    }

    return (
      <div className={style.searchTagsContainer}>
        <div className={style.searchTagsInputBox}>
          <i className={style.searchTagsInputBoxIcon} />
          <div ref={this.tagSelectionRef} className={style.tagsSelect} onClick={this.handleTagSelectionClick}>
            <span>
              {selectedTags.map((tag, tagIndex) => {
                const tagStyles = {
                  backgroundColor: tag.color,
                  borderColor: colorLuminance(tag.color, -0.35),
                  color: getColorLuminance(tag.color) >= 0.5 ? '#000' : '#fff'
                }

                return (
                  <span key={tag.shortid} className={style.tagsSelectItem} style={tagStyles}>
                    {tag.name}
                    <a className={style.tagsSelectItemRemove} onClick={() => this.onRemoveTagItem(tag, tagIndex)} />
                  </span>
                )
              })}
              <input
                ref={this.tagSelectionInputRef}
                type='text'
                placeholder={selectedTags.length === 0 ? 'select a tag' : ''}
                className={style.searchTags}
                style={stylesForInputTag}
                onChange={this.handleChangeInputTag}
                onKeyDown={this.handleKeyDownInputTag}
              />
            </span>
          </div>
        </div>
        <div
          ref={this.tagListRef}
          className={style.tagsListContainer}
          style={stylesForTagsList}
        >
          <div className={style.tagsList}>
            {tags.length === 0
              ? (
                <div className={style.tagsListEmpty}>
                  No tags registered
                </div>
                )
              : (
                <ReactList
                  itemRenderer={this.createRenderer(tagsToShowInList)}
                  length={tagsToShowInList.length}
                />
                )}
          </div>
        </div>
      </div>
    )
  }
}

TagEntityTreeFilterByTags.defaultProps = {
  onTagSelectChange: () => {}
}

export default TagEntityTreeFilterByTags
