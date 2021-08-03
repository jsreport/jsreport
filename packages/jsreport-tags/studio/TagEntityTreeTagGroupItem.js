import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ShowColor from './ShowColor'
import findTagInSet from './findTagInSet'

class TagEntityTreeTagGroupItem extends Component {
  render () {
    const { __entitySet } = this.props

    if (__entitySet !== 'tags' && __entitySet !== 'folders') {
      return null
    }

    let tags = []

    if (__entitySet === 'tags') {
      tags.push({ name: this.props.name, shortid: this.props.shortid, color: this.props.color })
    } else {
      tags = this.props.tags || []

      tags = tags.map((t) => {
        return findTagInSet(Studio.getReferences().tags, t.shortid)
      })
    }

    const tagsLength = tags.length

    return (
      <div style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }}>
        {tags.map((tag, tagIndex) => {
          if (!tag) {
            return null
          }

          return (
            <span key={tag.shortid} title={tag.name}>
              <ShowColor color={tag.color} width={8} height={15} />
              {(tagIndex !== tagsLength - 1) ? ' ' : null}
            </span>
          )
        })}
      </div>
    )
  }
}

export default TagEntityTreeTagGroupItem
