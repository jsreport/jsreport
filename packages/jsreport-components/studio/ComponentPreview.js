import { useMemo } from 'react'
import Studio from 'jsreport-studio'

const FramePreview = Studio.sharedComponents.FramePreview

const ComponentPreview = (props) => {
  const { data } = props

  const src = useMemo(() => {
    if (data.type == null && data.content == null) {
      return null
    }

    const blob = new Blob([data.content], { type: data.type })
    return window.URL.createObjectURL(blob)
  }, [data.type, data.content])

  const styles = useMemo(() => {
    if (data.type !== 'text/html') {
      return {}
    }

    // match default browser styles
    return {
      backgroundColor: '#fff',
      color: '#000'
    }
  }, [data.type])

  return (
    <FramePreview
      src={src}
      styles={styles}
    />
  )
}

export default ComponentPreview
