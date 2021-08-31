import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

function selectDataItems (entities) {
  return Object.keys(entities).filter((k) => entities[k].__entitySet === 'data').map((k) => entities[k])
}

export default class Properties extends Component {
  static title (entity, entities) {
    if (!entity.data || !entity.data.shortid) {
      return 'data'
    }

    const foundItems = selectDataItems(entities).filter((e) => entity.data.shortid === e.shortid)

    if (!foundItems.length) {
      return 'data'
    }

    return 'sample data: ' + foundItems[0].name
  }

  componentDidMount () {
    this.removeInvalidDataReferences()
  }

  componentDidUpdate () {
    this.removeInvalidDataReferences()
  }

  removeInvalidDataReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.data) {
      return
    }

    const updatedDataItems = Object.keys(entities).filter((k) => entities[k].__entitySet === 'data' && entities[k].shortid === entity.data.shortid)

    if (updatedDataItems.length === 0) {
      onChange({ _id: entity._id, data: null })
    }
  }

  render () {
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <EntityRefSelect
            headingLabel='Select data'
            newLabel='New data for template'
            filter={(references) => ({ data: references.data })}
            value={entity.data ? entity.data.shortid : null}
            onChange={(selected) => onChange({ _id: entity._id, data: selected.length > 0 ? { shortid: selected[0].shortid } : null })}
            renderNew={(modalProps) => <sharedComponents.NewEntityModal {...modalProps} options={{ ...modalProps.options, entitySet: 'data', defaults: { folder: entity.folder }, activateNewTab: false }} />}
          />
        </div>
      </div>
    )
  }
}
