import Preview from './Preview'
import FrameDisplay from './FrameDisplay'

const FramePreview = (props) => {
  const { ref, src, styles, blobCleanup, onLoad, renderActions } = props

  return (
    <Preview
      renderActions={renderActions}
    >
      <FrameDisplay
        ref={ref}
        src={src}
        styles={styles}
        blobCleanup={blobCleanup}
        onLoad={onLoad}
      />
    </Preview>
  )
}

export default FramePreview
