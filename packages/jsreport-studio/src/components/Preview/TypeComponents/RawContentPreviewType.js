import { useMemo } from 'react'
import FrameDisplay from '../FrameDisplay'

function RawContentPreviewType (props) {
  const { data } = props

  const src = useMemo(() => {
    if (data.type == null && data.content == null) {
      return null
    }

    if (data.type === 'url') {
      return data.content
    }

    const blob = new Blob([data.content], { type: data.type })
    return window.URL.createObjectURL(blob)
  }, [data.type, data.content])

  return (
    <div className='block'>
      <FrameDisplay
        src={src}
      />
    </div>
  )
}

export default RawContentPreviewType
