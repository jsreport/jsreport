import { useRef } from 'react'
import FileInput from '../../common/FileInput/FileInput'
import openProfileFromStreamReader from '../../../helpers/openProfileFromStreamReader'
import api from '../../../helpers/api'

const UploadProfileAction = ({ completed, closeMenu }) => {
  const uploadProfileInputRef = useRef(null)
  const enabled = completed

  return (
    <div
      className={enabled ? '' : 'disabled'}
      onClick={() => {
        if (!enabled) {
          return
        }

        if (uploadProfileInputRef.current) {
          uploadProfileInputRef.current.openSelection()
        }
      }}
    >
      <i className='fa fa-upload' /><span>Upload Profile</span>
      <div style={{ display: 'none' }}>
        <FileInput
          ref={uploadProfileInputRef}
          onFileSelect={(file) => {
            handleUploadProfile(file)
            closeMenu()
          }}
        />
      </div>
    </div>
  )
}

async function handleUploadProfile (file) {
  try {
    const responseBlob = await api.post('/api/profile/events', {
      attach: { filename: 'profile.jsrprofile', file },
      responseType: 'blob'
    })

    await openProfileFromStreamReader(() => responseBlob.stream().getReader(), {
      name: 'anonymous',
      shortid: null
    })
  } catch (err) {
    console.error(`Unable to upload profile "${file.name}"`, err)
  }
}

UploadProfileAction.handleUploadProfile = handleUploadProfile

export default UploadProfileAction
