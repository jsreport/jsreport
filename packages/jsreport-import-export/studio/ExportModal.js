import React, { Component } from 'react'
import Studio, { EntityTree } from 'jsreport-studio'
import fileSaver from 'filesaver.js-npm'

class ExportModal extends Component {
  constructor (props) {
    super(props)

    const { options } = props

    const selections = {}

    const references = this.getExportableReferences(Studio.getReferences())

    Object.keys(references).forEach((k) => {
      Object.keys(references[k]).forEach((e) => {
        if (options.initialSelected != null) {
          const selected = Array.isArray(options.initialSelected) ? options.initialSelected : [options.initialSelected]

          selected.forEach((s) => {
            if (references[k][e]._id === s) {
              selections[references[k][e]._id] = true
            } else if (selections[references[k][e]._id] == null) {
              selections[references[k][e]._id] = false
            }
          })
        } else {
          selections[references[k][e]._id] = true
        }
      })
    })

    this.state = {}
    this.state.processing = false

    this.initialSelected = selections

    this.entityTreeRef = React.createRef()
  }

  getExportableReferences (references) {
    const exportableEntitySets = Studio.extensions['import-export'].options.exportableEntitySets

    return Object.keys(references).reduce((acu, entitySetName) => {
      if (exportableEntitySets.indexOf(entitySetName) !== -1) {
        acu[entitySetName] = references[entitySetName]
      }

      return acu
    }, {})
  }

  async download () {
    if (this.state.processing) {
      return
    }

    this.setState({
      processing: true
    })

    try {
      const selected = this.entityTreeRef.current.selected

      const response = await Studio.api.post('api/export', {
        data: {
          selection: Object.keys(selected).filter((k) => selected[k] === true)
        },
        responseType: 'blob'
      }, true)

      fileSaver.saveAs(response, 'export.jsrexport')

      this.setState({
        processing: false
      })
    } catch (e) {
      this.setState({
        processing: false
      })

      alert('Unable to prepare export ' + e.message + ' ' + e.stack)
    }
  }

  render () {
    const references = this.getExportableReferences(Studio.getReferences())
    const initialSelected = this.initialSelected
    const { processing } = this.state

    return (
      <div className='form-group'>
        <div>
          <h1><i className='fa fa-download' /> Export objects</h1>
        </div>
        <div style={{ height: '30rem', overflow: 'auto' }}>
          <EntityTree
            ref={this.entityTreeRef}
            entities={references}
            selectable
            initialSelected={initialSelected}
          />
        </div>
        <div className='button-bar'>
          <a className={`button confirmation ${processing ? 'disabled' : ''}`} onClick={() => this.download()}>
            <i className='fa fa-circle-o-notch fa-spin' style={{ display: processing ? 'inline-block' : 'none' }} />
            <span style={{ display: processing ? 'none' : 'inline' }}>Download</span>
          </a>
        </div>
      </div>
    )
  }
}

export default ExportModal
