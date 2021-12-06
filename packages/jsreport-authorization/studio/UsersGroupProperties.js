import { useEffect, useCallback } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

const UsersGroupProperties = (props) => {
  const { entity, entities, onChange } = props

  const removeInvalidUserReferences = useCallback(function removeInvalidUserReferences () {
    if (!entity.users) {
      return
    }

    const updatedUsers = entity.users.filter((u) => Object.keys(entities).filter((k) => entities[k].__entitySet === 'users' && entities[k].shortid === u.shortid).length)

    if (updatedUsers.length !== entity.users.length) {
      onChange({ _id: entity._id, users: updatedUsers })
    }
  }, [entity, entities, onChange])

  useEffect(() => {
    removeInvalidUserReferences()
  })

  return (
    <div className='properties-section'>
      <div className='form-group'>
        <EntityRefSelect
          headingLabel='Select user'
          newLabel='New user for group'
          filter={(references) => {
            const users = references.users.filter((e) => !e.__isNew)
            return { users }
          }}
          value={entity.users ? entity.users.map((u) => u.shortid) : []}
          onChange={(selected) => onChange({ _id: entity._id, users: selected.map((u) => ({ shortid: u.shortid })) })}
          renderNew={(modalProps) => <sharedComponents.NewUserModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
          multiple
        />
      </div>
    </div>
  )
}

UsersGroupProperties.title = (entity, entities) => {
  if (!entity.users || !entity.users.length) {
    return 'users'
  }

  return `users (${entity.users.length})`
}

export default UsersGroupProperties
