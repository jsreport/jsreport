import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ShowColor from './ShowColor'

const useEntitiesSelector = Studio.createUseEntitiesSelector()

class TagEntityTreeItem extends Component {
  render () {
    const { entity } = this.props
    let entityTags = entity.tags || []

    // for tags, display the color right in the entity tree
    if (entity.__entitySet === 'tags') {
      entityTags = [entity]
    }

    const tagsLength = entityTags.length

    return (
      <div style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }}>
        {entityTags.map((entityTag, tagIndex) => {
          return (
            <TagInfo key={entityTag.shortid} shortid={entityTag.shortid}>
              {(tagIndex !== tagsLength - 1) ? ' ' : null}
            </TagInfo>
          )
        })}
      </div>
    )
  }
}

const TagInfo = ({ shortid, children }) => {
  const tag = useEntitiesSelector((entities) => entities.tags.find((t) => t.shortid === shortid))

  if (tag == null) {
    return null
  }

  return (
    <span title={tag.name}>
      <ShowColor color={tag.color} width={8} height={15} />
      {children}
    </span>
  )
}

export default TagEntityTreeItem
