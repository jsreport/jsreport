import { useState, useCallback, useEffect } from 'react'
import Studio from 'jsreport-studio'

const PreviewComponentToolbar = (props) => {
  const [isRunning, setIsRunning] = useState(false)
  const entity = props.tab != null && props.tab.entity != null ? props.tab.entity : undefined

  const previewComponent = useCallback(function previewComponent (componentShortid, componentName) {
    if (isRunning) {
      return
    }

    setIsRunning(true)
    Studio.startProgress()

    const previewId = Studio.preview({
      type: 'component',
      data: {}
    })

    const componentPayload = {
      component: {
        content: entity.content || '',
        shortid: componentShortid
      }
    }

    if (entity.data && entity.data.shortid) {
      // try to fill request.data from the active open tab with sample data
      const dataDetails = Studio.getAllEntities()
        .filter((d) => d.shortid === entity.data.shortid && d.__entitySet === 'data' && (d.__isLoaded || d.__isDirty || d.__isNew))

      if (dataDetails.length > 0) {
        componentPayload.data = dataDetails[0].dataJson ? JSON.parse(dataDetails[0].dataJson) : {}
      }
    }

    Studio.api.post('/api/component', {
      data: componentPayload,
      responseType: 'text'
    }).then((componentHtml) => {
      setIsRunning(false)

      Studio.updatePreview(previewId, {
        data: {
          type: 'text/html',
          content: componentHtml
        },
        completed: true
      })
    }).catch((err) => {
      setIsRunning(false)

      Studio.updatePreview(previewId, {
        data: {
          type: 'text/plain',
          content: `Component${componentName != null ? ` "${componentName}"` : ''} preview failed.\n\n${err.message}\n${err.stack}`
        },
        completed: true
      })
    })
  }, [entity, isRunning])

  const handleEarlyShortcut = useCallback(function handleEarlyShortcut (e) {
    if (e.which === 120 && entity && entity.__entitySet === 'components') {
      e.preventDefault()
      e.stopPropagation()

      previewComponent(entity.shortid, entity.name)

      return false
    }
  }, [previewComponent, entity])

  useEffect(() => {
    window.addEventListener('keydown', handleEarlyShortcut, true)

    return () => {
      window.removeEventListener('keydown', handleEarlyShortcut, true)
    }
  }, [handleEarlyShortcut])

  if (!props.tab || !props.tab.entity || props.tab.entity.__entitySet !== 'components') {
    return <span />
  }

  return (
    <div
      title='Run and preview component (F9)'
      className={'toolbar-button ' + (isRunning ? 'disabled' : '')}
      onClick={() => {
        previewComponent(props.tab.entity.shortid, props.tab.entity.name)
      }}
    >
      <i className='fa fa-eye' />Component
    </div>
  )
}

export default PreviewComponentToolbar
