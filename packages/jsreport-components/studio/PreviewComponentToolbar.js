import { useState, useRef, useCallback, useEffect } from 'react'
import Studio from 'jsreport-studio'

const PreviewComponentToolbar = (props) => {
  const [isRunning, setIsRunning] = useState(false)
  const stopPreviewRef = useRef(null)
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
        shortid: componentShortid,
        content: entity.content || ''
      }
    }

    if (entity.engine != null) {
      componentPayload.component.engine = entity.engine
    }

    if (entity.helpers != null) {
      componentPayload.component.helpers = entity.helpers
    }

    if (entity.data && entity.data.shortid) {
      // try to fill request.data from the active open tab with sample data
      const dataDetails = Studio.getAllEntities()
        .filter((d) => d.shortid === entity.data.shortid && d.__entitySet === 'data' && (d.__isLoaded || d.__isDirty || d.__isNew))

      if (dataDetails.length > 0) {
        componentPayload.data = dataDetails[0].dataJson ? JSON.parse(dataDetails[0].dataJson) : {}
      }
    }

    const componentUrl = Studio.resolveUrl('/api/component')

    const previewController = new AbortController()

    stopPreviewRef.current = () => {
      previewController.abort()
    }

    window.fetch(componentUrl, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(componentPayload),
      signal: previewController.signal
    }).then((response) => {
      let contentType = ''

      if (response.headers != null) {
        contentType = response.headers.get('Content-Type') || ''
      }

      let contentPromise

      if (response.status !== 200) {
        if (contentType.indexOf('application/json') === 0) {
          contentPromise = response.json()
        } else {
          contentPromise = response.text()
        }
      } else {
        contentPromise = response.text()
      }

      return contentPromise.then((content) => ({
        status: response.status,
        content
      }))
    }).then(({ status, content }) => {
      if (status !== 200) {
        let notOkError

        if (typeof content !== 'string' && content.message && content.stack) {
          notOkError = new Error(content.message)
          notOkError.stack = content.stack
        } else {
          notOkError = new Error(`Got not ok response, status: ${status}, message: ${content}`)
        }

        throw notOkError
      }

      setIsRunning(false)
      Studio.stopProgress()
      stopPreviewRef.current = null

      Studio.updatePreview(previewId, {
        data: {
          type: 'text/html',
          content
        },
        completed: true
      })
    }).catch((err) => {
      setIsRunning(false)
      Studio.stopProgress()
      stopPreviewRef.current = null

      Studio.updatePreview(previewId, {
        data: {
          type: 'text/plain',
          content: `Component${componentName != null ? ` "${componentName}"` : ''} preview failed.\n\n${err.message}\n${err.stack || ''}`
        },
        completed: true
      })
    })
  }, [entity, isRunning])

  const stopPreviewComponent = useCallback(function stopPreviewComponent () {
    if (stopPreviewRef.current != null) {
      stopPreviewRef.current()
    }
  })

  const handleEarlyShortcut = useCallback(function handleEarlyShortcut (e) {
    if (e.which === 120 && entity && entity.__entitySet === 'components') {
      e.preventDefault()
      e.stopPropagation()

      if (isRunning) {
        stopPreviewComponent()
      } else {
        previewComponent(entity.shortid, entity.name)
      }

      return false
    }
  }, [previewComponent, isRunning, entity])

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
      className='toolbar-button'
      onClick={() => {
        if (isRunning) {
          stopPreviewComponent()
        } else {
          previewComponent(props.tab.entity.shortid, props.tab.entity.name)
        }
      }}
    >
      <i className={`fa fa-${isRunning ? 'stop' : 'eye'}`} />Component
    </div>
  )
}

export default PreviewComponentToolbar
