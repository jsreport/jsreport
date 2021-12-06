import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

const selectValues = (selected) => {
  return selected.map((e) => e._id)
}

class PermissionProperties extends Component {
  componentDidMount () {
    this.removeInvalidUserReferences()
    this.removeInvalidUsersGroupReferences()
  }

  componentDidUpdate () {
    this.removeInvalidUserReferences()
    this.removeInvalidUsersGroupReferences()
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

  removeInvalidUsersGroupReferences () {
    const { entity, onChange } = this.props

    if (Array.isArray(entity.readPermissionsGroup) && entity.readPermissionsGroup.length > 0) {
      const updatedReadPermissionsGroup = entity.readPermissionsGroup.map((_id) => {
        const currentEntity = Studio.getEntityById(_id, false)
        return currentEntity ? currentEntity._id : null
      }).filter((i) => i != null)

      if (updatedReadPermissionsGroup.length !== entity.readPermissionsGroup.length) {
        onChange({ _id: entity._id, readPermissionsGroup: updatedReadPermissionsGroup })
      }
    }

    if (Array.isArray(entity.editPermissionsGroup) && entity.editPermissionsGroup.length > 0) {
      const updatedEditPermissionsGroup = entity.editPermissionsGroup.map((_id) => {
        const currentEntity = Studio.getEntityById(_id, false)
        return currentEntity ? currentEntity._id : null
      }).filter((i) => i != null)

      if (updatedEditPermissionsGroup.length !== entity.editPermissionsGroup.length) {
        onChange({ _id: entity._id, editPermissionsGroup: updatedEditPermissionsGroup })
      }
    }
  }

  render () {
    const { entity, onChange } = this.props

    if (entity.__entitySet === 'users' || entity.__entitySet === 'usersGroups') {
      return <div />
    }

    const readPermissionsEntities = entity.readPermissions
      ? entity.readPermissions.map((_id) => {
          const currentEntity = Studio.getEntityById(_id, false)
          return currentEntity != null ? currentEntity : null
        }).filter((i) => i != null)
      : []

    const editPermissionsEntities = entity.editPermissions
      ? entity.editPermissions.map((_id) => {
          const currentEntity = Studio.getEntityById(_id, false)
          return currentEntity != null ? currentEntity : null
        }).filter((i) => i != null)
      : []

    const readPermissionsGroupEntities = entity.readPermissionsGroup
      ? entity.readPermissionsGroup.map((_id) => {
          const currentEntity = Studio.getEntityById(_id, false)
          return currentEntity != null ? currentEntity : null
        }).filter((i) => i != null)
      : []

    const editPermissionsGroupEntities = entity.editPermissionsGroup
      ? entity.editPermissionsGroup.map((_id) => {
          const currentEntity = Studio.getEntityById(_id, false)
          return currentEntity != null ? currentEntity : null
        }).filter((i) => i != null)
      : []

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>read permissions</label>
          <EntityRefSelect
            headingLabel='Select user (read permissions)'
            newLabel='New user (read permissions)'
            filter={(references) => {
              const users = references.users.filter((e) => !e.__isNew)
              return { users: users }
            }}
            value={readPermissionsEntities.map((r) => r.shortid)}
            onChange={(selected) => onChange({ _id: entity._id, readPermissions: selectValues(selected) })}
            renderNew={(modalProps) => <sharedComponents.NewUserModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder } }} />}
            multiple
          />
        </div>
        <div className='form-group'>
          <label>edit permissions</label>
          <EntityRefSelect
            headingLabel='Select user (edit permissions)'
            newLabel='New user (edit permissions)'
            filter={(references) => {
              const users = references.users.filter((e) => !e.__isNew)
              return { users: users }
            }}
            value={editPermissionsEntities.map((e) => e.shortid)}
            onChange={(selected) => onChange({ _id: entity._id, editPermissions: selectValues(selected) })}
            renderNew={(modalProps) => <sharedComponents.NewUserModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder } }} />}
            multiple
          />
        </div>
        <div className='form-group'>
          <label>read permissions group</label>
          <EntityRefSelect
            headingLabel='Select group (read permissions group)'
            newLabel='New group (read permissions group)'
            filter={(references) => {
              const groups = references.usersGroups.filter((e) => !e.__isNew)
              return { usersGroups: groups }
            }}
            value={readPermissionsGroupEntities.map((r) => r.shortid)}
            onChange={(selected) => onChange({ _id: entity._id, readPermissionsGroup: selectValues(selected) })}
            renderNew={(modalProps) => <sharedComponents.NewUsersGroupModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder } }} />}
            multiple
          />
        </div>
        <div className='form-group'>
          <label>edit permissions group</label>
          <EntityRefSelect
            headingLabel='Select group (edit permissions group)'
            newLabel='New group (edit permissions group)'
            filter={(references) => {
              const groups = references.usersGroups.filter((e) => !e.__isNew)
              return { usersGroups: groups }
            }}
            value={editPermissionsGroupEntities.map((e) => e.shortid)}
            onChange={(selected) => onChange({ _id: entity._id, editPermissionsGroup: selectValues(selected) })}
            renderNew={(modalProps) => <sharedComponents.NewUsersGroupModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder } }} />}
            multiple
          />
        </div>
      </div>
    )
  }
}

export default PermissionProperties
