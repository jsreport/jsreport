import UserEditor from './UserEditor.js'
import LogoutSettingsButton from './LogoutSettingsButton.js'
import ChangePasswordSettingsButton from './ChangePasswordSettingsButton.js'
import ChangePasswordButton from './ChangePasswordButton.js'
import Studio from 'jsreport-studio'
import NewUserModal from './NewUserModal.js'

Studio.sharedComponents.NewUserModal = NewUserModal

// we want to be at the front, because other extension like scheduling relies on loaded user
Studio.initializeListeners.unshift(async () => {
  const response = await Studio.api.get('/api/settings')

  if (!response.tenant) {
    // authentication not enabled in config
    return
  }

  Studio.authentication = { user: response.tenant, useEditorComponents: [] }

  if (Studio.authentication.user.isAdmin) {
    Studio.addEntitySet({
      name: 'users',
      faIcon: 'fa-user',
      visibleName: 'user',
      onNew: (options) => Studio.openModal(NewUserModal, options),
      entityTreePosition: 200
    })

    Studio.addEditorComponent('users', UserEditor)
    Studio.addToolbarComponent(ChangePasswordButton)
  }

  Studio.addToolbarComponent(ChangePasswordSettingsButton, 'settings')

  Studio.addToolbarComponent(() => (
    <div className='toolbar-button'>
      <span><i className={`fa fa-${Studio.authentication.user.isGroup ? 'users' : 'user'}`} />{Studio.authentication.user.name}</span>
    </div>
  ), 'settingsBottom')

  Studio.addToolbarComponent(LogoutSettingsButton, 'settingsBottom')
})
