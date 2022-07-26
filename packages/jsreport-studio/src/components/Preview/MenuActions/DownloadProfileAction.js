import { useRef } from 'react'
import resolveUrl from '../../../helpers/resolveUrl'

const DownloadProfileAction = ({ completed, data, closeMenu }) => {
  const { profileOperations } = data
  const mainProfileOperation = profileOperations.find((op) => op.startEvent.subtype === 'profile')
  const containerRef = useRef(null)

  const enabled = completed && mainProfileOperation != null

  return (
    <div
      ref={containerRef}
      className={enabled ? '' : 'disabled'}
      title='Download profile'
      onClick={() => {
        if (!mainProfileOperation) {
          return
        }

        handleDownload(containerRef, mainProfileOperation.startEvent.data._id)
        closeMenu()
      }}
    >
      <i className='fa fa-download' /><span>Download Profile</span>
    </div>
  )
}

function handleDownload (containerRef, profileId) {
  const downloadEl = document.createElement('a')

  downloadEl.style.display = 'none'
  downloadEl.href = `${window.location.origin}${resolveUrl(`/api/profile/${profileId}`)}`
  downloadEl.download = `${profileId}.jsrprofile`

  containerRef.current.appendChild(downloadEl)

  const evt = new window.MouseEvent('click', {
    bubbles: false,
    cancelable: false,
    view: window
  })

  downloadEl.dispatchEvent(evt)

  containerRef.current.removeChild(downloadEl)
}

export default DownloadProfileAction
