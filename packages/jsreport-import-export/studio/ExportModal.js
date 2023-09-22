import React, { useState, useRef, useMemo, useCallback } from 'react'
import Studio, { EntityTree } from 'jsreport-studio'
import fileSaver from 'filesaver.js-npm'

const useEntitiesSelector = Studio.createUseEntitiesSelector()

function ExportModal (props) {
  const { options } = props
  const references = useEntitiesSelector((entities) => entities)
  const [processing, setProcessing] = useState(false)
  const entityTreeRef = useRef(null)

  const exportableReferences = useMemo(() => {
    const exportableEntitySets = Studio.extensions['import-export'].options.exportableEntitySets

    return Object.keys(references).reduce((acu, entitySetName) => {
      if (exportableEntitySets.indexOf(entitySetName) !== -1) {
        acu[entitySetName] = references[entitySetName]
      }

      return acu
    }, {})
  }, [references])

  const initialSelected = useMemo(() => {
    const selections = {}

    Object.keys(exportableReferences).forEach((k) => {
      Object.keys(exportableReferences[k]).forEach((e) => {
        if (options.initialSelected != null) {
          const selected = Array.isArray(options.initialSelected) ? options.initialSelected : [options.initialSelected]

          selected.forEach((s) => {
            if (exportableReferences[k][e]._id === s) {
              selections[exportableReferences[k][e]._id] = true
            } else if (selections[exportableReferences[k][e]._id] == null) {
              selections[exportableReferences[k][e]._id] = false
            }
          })
        } else {
          selections[exportableReferences[k][e]._id] = true
        }
      })
    })

    return selections
  }, [])

  const download = useCallback(async () => {
    if (processing) {
      return
    }

    setProcessing(true)

    try {
      const selected = entityTreeRef.current.selected

      const response = await Studio.api.post('api/export', {
        data: {
          selection: Object.keys(selected).filter((k) => selected[k] === true)
        },
        responseType: 'blob'
      }, true)

      fileSaver.saveAs(response, 'export.jsrexport')

      setProcessing(false)
    } catch (e) {
      setProcessing(false)

      alert('Unable to prepare export ' + e.message + ' ' + e.stack)
    }
  }, [processing])

  return (
    <div className='form-group'>
      <div>
        <h1><i className='fa fa-download' /> Export objects</h1>
      </div>
      <div style={{ height: '30rem', overflow: 'auto' }}>
        <EntityTree
          ref={entityTreeRef}
          entities={exportableReferences}
          selectable
          initialSelected={initialSelected}
        />
      </div>
      <div className='button-bar'>
        <a className={`button confirmation ${processing ? 'disabled' : ''}`} onClick={() => download()}>
          <i className='fa fa-circle-o-notch fa-spin' style={{ display: processing ? 'inline-block' : 'none' }} />
          <span style={{ display: processing ? 'none' : 'inline' }}>Download</span>
        </a>
      </div>
    </div>
  )
}

export default ExportModal
