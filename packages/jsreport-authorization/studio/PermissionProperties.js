import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect

const selectValues = (selected) => {
  return selected.map((e) => e._id)
}

export default class PermissionProperties extends Component {
  componentDidMount () {
    this.removeInvalidUserReferences()
  }

  componentDidUpdate () {
    this.removeInvalidUserReferences()
  }

  removeInvalidUserReferences () {
    const { entity, onChange } = this.props

    if (Array.isArray(entity.readPermissions) && entity.readPermissions.length > 0) {
      const updatedReadPermissions = entity.readPermissions.map((_id) => {
        const currentEntity = Studio.getEntityById(_id, false)
        return currentEntity ? currentEntity._id : null
      }).filter((i) => i != null)

      if (updatedReadPermissions.length !== entity.readPermissions.length) {
        onChange({ _id: entity._id, readPermissions: updatedReadPermissions })
      }
    }

    if (Array.isArray(entity.editPermissions) && entity.editPermissions.length > 0) {
      const updatedEditPermissions = entity.editPermissions.map((_id) => {
        const currentEntity = Studio.getEntityById(_id, false)
        return currentEntity ? currentEntity._id : null
      }).filter((i) => i != null)

      if (updatedEditPermissions.length !== entity.editPermissions.length) {
        onChange({ _id: entity._id, editPermissions: updatedEditPermissions })
      }
    }
  }

  render () {
    const { entity, onChange } = this.props

    if (entity.__entitySet === 'users') {
      return <div />
    }

    const readPermissionsEntities = entity.readPermissions ? entity.readPermissions.map((_id) => {
      const currentEntity = Studio.getEntityById(_id, false)
      return currentEntity != null ? currentEntity : null
    }).filter((i) => i != null) : []

    const editPermissionsEntities = entity.editPermissions ? entity.editPermissions.map((_id) => {
      const currentEntity = Studio.getEntityById(_id, false)
      return currentEntity != null ? currentEntity : null
    }).filter((i) => i != null) : []

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>read permissions</label>
          <EntityRefSelect
            headingLabel='Select user (read permissions)'
            filter={(references) => {
              const users = references.users.filter((e) => !e.__isNew)
              return { users: users }
            }}
            value={readPermissionsEntities.map((r) => r.shortid)}
            onChange={(selected) => onChange({ _id: entity._id, readPermissions: selectValues(selected) })}
            multiple
          />
        </div>
        <div className='form-group'>
          <label>edit permissions</label>
          <EntityRefSelect
            headingLabel='Select user (edit permissions)'
            filter={(references) => {
              const users = references.users.filter((e) => !e.__isNew)
              return { users: users }
            }}
            value={editPermissionsEntities.map((e) => e.shortid)}
            onChange={(selected) => onChange({ _id: entity._id, editPermissions: selectValues(selected) })}
            multiple
          />
        </div>
      </div>
    )
  }
}
