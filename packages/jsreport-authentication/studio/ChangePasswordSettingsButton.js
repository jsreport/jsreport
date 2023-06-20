import ChangePasswordModal from './ChangePasswordModal.js'
import Studio from 'jsreport-studio'

const ChangePasswordSettingsButton = (props) => {
  if (Studio.authentication.user.isSuperAdmin || Studio.authentication.user.isGroup) {
    return <span />
  }

  return (
    <div>
      <a
        id='changePassword'
        onClick={() => {
          Studio.openModal(ChangePasswordModal, { entity: Studio.authentication.user })
          props.closeMenu()
        }}
        style={{ cursor: 'pointer' }}
      >
        <i className='fa fa-key' />Change password
      </a>
    </div>
  )
}

export default ChangePasswordSettingsButton
