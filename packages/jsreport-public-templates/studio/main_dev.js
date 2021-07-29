import Studio from 'jsreport-studio'
import ShareModal from './ShareModal.js'

Studio.addToolbarComponent((props) => {
  if (!props.tab || !props.tab.entity || props.tab.entity.__entitySet !== 'templates') {
    return <span />
  }

  return (
    <div
      className='toolbar-button'
      onClick={() => {
        Studio.openModal(ShareModal, { entity: props.tab.entity })
        props.closeMenu()
      }}
    >
      <i className='fa fa-unlock' />Share
    </div>
  )
})
