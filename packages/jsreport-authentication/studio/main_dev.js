import Studio from 'jsreport-studio'
import UserGroupsInfo from './UserGroupsInfo'
import UserEditor from './UserEditor.js'
import LogoutSettingsButton from './LogoutSettingsButton.js'
import ChangePasswordSettingsButton from './ChangePasswordSettingsButton.js'
import ChangePasswordButton from './ChangePasswordButton.js'
import NewUserModal from './NewUserModal.js'

Studio.sharedComponents.NewUserModal = NewUserModal

// we want to be at the front, because other extension like scheduling relies on loaded user
Studio.initializeListeners.unshift(async () => {
  const response = await Studio.api.get('/api/settings')

  if (!response.tenant) {
    // authentication not enabled in config
    return
  }

  const isTenantAdmin = response.isTenantAdmin === true

  Studio.authentication = {
    user: response.tenant,
    useEditorComponents: [],
    isUserAdmin: (userInfo) => {
      if (userInfo == null) {
        return false
      }

      if (userInfo.isSuperAdmin) {
        return true
      }

      const isGroup = userInfo.isGroup === true || userInfo.__entitySet === 'usersGroups'

      const { users, usersGroups: groups } = Studio.getReferences()

      const validateUserInfoProps = (data, props) => {
        let currentProp

        for (const targetProp of props) {
          if (data[targetProp] == null || data[targetProp] === '') {
            continue
          }

          currentProp = targetProp
          break
        }

        if (currentProp == null) {
          const propsLabel = props.map((p) => '.' + p).join(', ')
          throw new Error(`Studio.authentication.isUserAdmin needs to have one of these ${propsLabel} properties on the user info param`)
        }

        return currentProp
      }

      if (users == null || groups == null) {
        const targetProp = isGroup ? '_id' : 'name'

        validateUserInfoProps(userInfo, [targetProp])

        // when we are checking the current user we return the result of isTenantAdmin
        // which comes from server, this is useful when we call this check when the entitySets
        // are not yet registered
        if (userInfo[targetProp] === Studio.authentication.user[targetProp]) {
          return isTenantAdmin
        } else {
          throw new Error('Could not find users or usersGroups entity sets')
        }
      }

      const targetProp = validateUserInfoProps(userInfo, isGroup ? ['_id'] : ['_id', 'shortid', 'name'])

      if (isGroup) {
        const groupInStore = groups.find((u) => u[targetProp] === userInfo[targetProp])

        if (groupInStore == null) {
          return false
        }

        return groupInStore.isAdmin === true
      } else {
        const userInStore = users.find((u) => u[targetProp] === userInfo[targetProp])

        if (userInStore == null) {
          return false
        }

        if (userInStore.isAdmin) {
          return true
        }

        const adminGroupsForUser = groups.filter((g) => {
          const users = g.users || []
          return g.isAdmin === true && users.find((u) => u.shortid === userInStore.shortid) != null
        })

        return adminGroupsForUser.length > 0
      }
    }
  }

  if (Studio.authentication.user.isSuperAdmin) {
    Studio.authentication.useEditorComponents.push((user) => (
      <div>
        <h2>Admin Management</h2>
        <div>
          <div className='form-group'>
            <label>Give admin privileges</label>
            <input
              type='checkbox'
              checked={user.isAdmin === true}
              onChange={(v) => Studio.updateEntity({ ...user, isAdmin: v.target.checked })}
            />
          </div>
        </div>
      </div>
    ))
  }

  Studio.authentication.useEditorComponents.push((user) => (
    <UserGroupsInfo user={user} />
  ))

  const userIcon = 'fa-user'

  if (Studio.authentication.isUserAdmin(Studio.authentication.user)) {
    Studio.addEntitySet({
      name: 'users',
      faIcon: userIcon,
      visibleName: 'user',
      referenceAttributes: ['isAdmin'],
      onNew: (options) => Studio.openModal(NewUserModal, options),
      entityTreePosition: 200
    })

    Studio.addEditorComponent('users', UserEditor)
    Studio.addToolbarComponent(ChangePasswordButton)
  }

  Studio.entityTreeIconResolvers.push((entity) => {
    if (entity.__entitySet === 'users') {
      return Studio.authentication.isUserAdmin(entity) === true ? 'fa-user-gear' : userIcon
    } else if (entity.__entitySet === 'usersGroups') {
      return Studio.authentication.isUserAdmin(entity) === true ? 'fa-users-gear' : 'fa-users'
    }
  })

  Studio.addToolbarComponent(ChangePasswordSettingsButton, 'settings')

  Studio.addToolbarComponent(() => {
    let faUserIcon

    if (Studio.authentication.user.isGroup) {
      faUserIcon = Studio.authentication.isUserAdmin(Studio.authentication.user) ? 'fa-users-gear' : 'fa-users'
    } else {
      faUserIcon = Studio.authentication.isUserAdmin(Studio.authentication.user) ? 'fa-user-gear' : userIcon
    }

    return (
      <div className='toolbar-button'>
        <span><i className={`fa ${faUserIcon}`} />{Studio.authentication.user.name}</span>
      </div>
    )
  }, 'settingsBottom')

  Studio.addToolbarComponent(LogoutSettingsButton, 'settingsBottom')
})
