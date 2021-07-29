import React, { Component } from 'react'
import ShowColor from './ShowColor'
import findTagInSet from './findTagInSet'

class TagEntityTreeItem extends Component {
  render () {
    const { entity, entities } = this.props
    let tags = entity.tags || []

    // for tags, display the color right in the entity tree
    if (entity.__entitySet === 'tags') {
      tags = [entity]
    }

    const tagsLength = tags.length

    return (
      <div style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }}>
        {tags.map((tag, tagIndex) => {
          const tagFound = findTagInSet(entities.tags, tag.shortid) || {}

          return (
            <span key={tag.shortid} title={tagFound.name}>
              <ShowColor color={tagFound.color} width={8} height={15} />
              {(tagIndex !== tagsLength - 1) ? ' ' : null}
            </span>
          )
        })}
      </div>
    )
  }
}

export default TagEntityTreeItem
