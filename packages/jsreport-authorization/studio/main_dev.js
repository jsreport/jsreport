import NewUsersGroupModal from './NewUsersGroupModal'
import UsersGroupEditor from './UsersGroupEditor'
import UsersGroupProperties from './UsersGroupProperties'
import PermissionProperties from './PermissionProperties'
import Studio from 'jsreport-studio'

Studio.sharedComponents.NewUsersGroupModal = NewUsersGroupModal

Studio.initializeListeners.push(async () => {
  if (!Studio.authentication || !Studio.authentication.isUserAdmin(Studio.authentication.user)) {
    return
  }

  Studio.addEntitySet({
    name: 'usersGroups',
    faIcon: 'fa-users',
    visibleName: 'group',
    referenceAttributes: ['users', 'isAdmin'],
    onNew: (options) => Studio.openModal(NewUsersGroupModal, options),
    entityTreePosition: 300
  })

  Studio.addEditorComponent('usersGroups', UsersGroupEditor)

  Studio.addPropertiesComponent(UsersGroupProperties.title, UsersGroupProperties, (entity) => entity.__entitySet === 'usersGroups')

  Studio.addPropertiesComponent('permissions', PermissionProperties, (entity) => {
    return Studio.extensions.authorization.options.sharedEntitySets.indexOf(entity.__entitySet) === -1
  })

  Studio.authentication.useEditorComponents.push((user) => (
    <div>
      <h2>Authorization</h2>
      <div>
        <div className='form-group'>
          <label>Allow read all entities</label>
          <input
            type='checkbox'
            checked={user.readAllPermissions === true}
            onChange={(v) => Studio.updateEntity({ ...user, readAllPermissions: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>Allow edit all entities</label>
          <input
            type='checkbox'
            checked={user.editAllPermissions === true}
            onChange={(v) => Studio.updateEntity({ ...user, editAllPermissions: v.target.checked })}
          />
        </div>
      </div>
    </div>
  ))
})
