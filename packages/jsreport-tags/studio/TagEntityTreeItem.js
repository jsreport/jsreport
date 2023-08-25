import React, { Component } from 'react'
import ShowColor from './ShowColor'
import findTagInSet from './findTagInSet'

class TagEntityTreeItem extends Component {
  render () {
    const { entity, tags } = this.props
    let entityTags = entity.tags || []

    // for tags, display the color right in the entity tree
    if (entity.__entitySet === 'tags') {
      entityTags = [entity]
    }

    const tagsLength = entityTags.length

    return (
      <div style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }}>
        {entityTags.map((entityTag, tagIndex) => {
          const tagFound = findTagInSet(tags, entityTag.shortid) || {}

          return (
            <span key={entityTag.shortid} title={tagFound.name}>
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
