import React, { Component } from 'react'
import ShowColor from './ShowColor'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

const selectValues = (selected) => {
  const tags = selected.map((v) => {
    return { shortid: v.shortid }
  })

  return tags
}

class EntityTagProperties extends Component {
  static getSelectedTags (entity, entities) {
    const getNameAndColor = (t) => {
      const foundTags = Object.keys(entities).map((k) => entities[k]).filter((tg) => tg.shortid === t.shortid)

      return foundTags.length ? { name: foundTags[0].name, color: foundTags[0].color } : { name: '', color: undefined }
    }

    return (entity.tags || []).map((t) => ({
      ...t,
      ...getNameAndColor(t)
    }))
  }

  static title (entity, entities) {
    if (!entity.tags || !entity.tags.length) {
      return 'tags'
    }

    return (
      <span>
        tags:&nbsp;
        <span>
          {
            EntityTagProperties.getSelectedTags(entity, entities).map((t, tIndex, allSelectTags) => {
              return (
                <span key={t.shortid} style={{ display: 'inline-block', marginRight: '2px' }}>
                  <ShowColor color={t.color} width={12} height={15} />
                  &nbsp;
                  {t.name}
                  {tIndex === allSelectTags.length - 1 ? '' : ','}
                </span>
              )
            })
          }
        </span>
      </span>
    )
  }

  componentDidMount () {
    this.removeInvalidTagReferences()
  }

  componentDidUpdate () {
    this.removeInvalidTagReferences()
  }

  removeInvalidTagReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.tags) {
      return
    }

    const updatedTags = entity.tags.filter((t) => Object.keys(entities).filter((k) => entities[k].__entitySet === 'tags' && entities[k].shortid === t.shortid).length)

    if (updatedTags.length !== entity.tags.length) {
      onChange({ _id: entity._id, tags: updatedTags })
    }
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <EntityRefSelect
            headingLabel='Select tags'
            newLabel='New tag for template'
            filter={(references) => ({ tags: references.tags })}
            value={entity.tags ? entity.tags.map((t) => t.shortid) : []}
            onChange={(selected) => onChange({ _id: entity._id, tags: selectValues(selected) })}
            renderNew={(modalProps) => <sharedComponents.NewTagModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
            multiple
          />
        </div>
      </div>
    )
  }
}

export default EntityTagProperties
