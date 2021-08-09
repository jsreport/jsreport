import PermissionProperties from './PermissionProperties.js'
import Studio from 'jsreport-studio'

Studio.initializeListeners.push(async () => {
  if (!Studio.authentication || !Studio.authentication.user.isAdmin) {
    return
  }

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
