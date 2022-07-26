import { Fragment } from 'react'
import ReportPreviewType from './ReportPreviewType'
import ProfilePreviewType from './ProfilePreviewType/ProfilePreviewType'

function ReportProfilePreviewType (props) {
  const { activeTab, completed } = props

  // NOTE: we need these styles instead of just display: none
  // because it seems that iframe have weird behavior when it goes to
  // display none and then display to visible, the content stays invisible,
  // so we need to make the content "invisible" without display: none.
  // also when the tab is not visible we use top, left, right, bottom to 0
  // to emulate full dimensions, this is important for iframe content like pdf
  // viewer which calculates its initial view based on the current dimensions
  const inactiveStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1
  }

  return (
    // eslint-disable-next-line
    <Fragment>
      <div
        className='block'
        style={activeTab === 'report' ? undefined : { ...inactiveStyles }}
      >
        <ReportPreviewType id={props.id} data={props.data} completed={completed} />
      </div>
      <div
        className='block'
        style={activeTab === 'profile' ? undefined : { ...inactiveStyles }}
      >
        <ProfilePreviewType id={props.id} data={props.data} completed={completed} />
      </div>
    </Fragment>
  )
}

export default ReportProfilePreviewType
