import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const FileInput = Studio.FileInput
const sharedComponents = Studio.sharedComponents

class ImportFinishedModal extends Component {
  componentDidMount () {
    setTimeout(() => this.confirmBtn.focus(), 0)
  }

  componentWillUnmount () {
    Studio.reset().catch(() => {})
  }

  confirm () {
    this.props.close()

    Studio.reset().catch((e) => { console.error(e) })
  }

  render () {
    const { log } = this.props.options

    return (
      <div>
        <h1><i className='fa fa-info-circle' /> Import finished</h1>
        {log != null && log !== '' && (
          <div className='form-group'>
            <div>
              <i>Some errors/warnings happened during the import:</i>
            </div>
            <textarea style={{ width: '100%', boxSizing: 'border-box' }} rows='10' readOnly value={log} />
          </div>
        )}
        <div className='form-group'>
          <i>Now we need to reload the studio..</i>
        </div>
        <div className='button-bar'>
          <button ref={(el) => { this.confirmBtn = el }} className='button confirmation' onClick={() => this.confirm()}>
            Ok
          </button>
        </div>
      </div>
    )
  }
}

class ImportModal extends Component {
  constructor (props) {
    super(props)

    this.state = {
      selectedFolderShortid: props.options != null && props.options.selectedFolderShortid ? props.options.selectedFolderShortid : null,
      fullImport: false,
      retryWithContinueOnFail: false,
      validated: false
    }

    if (props.options && props.options.selectedFile) {
      this.state.selectedFile = props.options.selectedFile
    }

    this.handleImportModeChange = this.handleImportModeChange.bind(this)
  }

  handleImportModeChange (ev) {
    if (this.state.processing === true || this.state.validated) {
      return
    }

    let fullImport = false

    if (ev.target.value === 'full') {
      fullImport = true
    }

    this.setState({
      fullImport
    })
  }

  async validate (file) {
    if (!file || this.state.processing) {
      return
    }

    this.setState({
      status: '1',
      processing: true,
      log: 'Validating import....'
    })

    try {
      const params = {
        fullImport: this.state.fullImport
      }

      if (this.state.selectedFolderShortid != null) {
        params.targetFolder = this.state.selectedFolderShortid
      }

      const result = await Studio.api.post('api/validate-import', {
        params,
        attach: { filename: 'import.jsrexport', file }
      }, true)

      this.setState({
        validated: true,
        status: result.status,
        processing: false,
        log: result.log
      })
    } catch (e) {
      this.setState({
        validated: true,
        status: '1',
        processing: false,
        log: e.message + ' ' + e.stack
      })
    }
  }

  async import () {
    if (this.state.processing) {
      return
    }

    const { retryWithContinueOnFail } = this.state

    try {
      this.setState({
        status: '1',
        processing: true,
        log: 'Working on import....'
      })

      const params = {
        fullImport: this.state.fullImport,
        continueOnFail: retryWithContinueOnFail
      }

      if (this.state.selectedFolderShortid != null) {
        params.targetFolder = this.state.selectedFolderShortid
      }

      const result = await Studio.api.post('api/import', {
        params,
        attach: { filename: 'import.jsrexport', file: this.state.selectedFile }
      }, true)

      this.setState({
        processing: false,
        retryWithContinueOnFail: false
      })

      Studio.openModal(ImportFinishedModal, {
        log: result.log
      })
    } catch (e) {
      const stateToUpdate = {
        status: '1',
        processing: false,
        log: e.message + ' ' + e.stack
      }

      if (!retryWithContinueOnFail && e.canContinueAfterFail) {
        stateToUpdate.retryWithContinueOnFail = true
      } else {
        stateToUpdate.retryWithContinueOnFail = false
      }

      this.setState(stateToUpdate)
    }
  }

  cancel () {
    if (this.state.processing) {
      return
    }

    this.setState({
      status: null,
      log: null,
      retryWithContinueOnFail: false,
      validated: false
    })
  }

  render () {
    return (
      <div>
        <h1><i className='fa fa-upload' /> Import objects</h1>
        <div className='form-group'>
          <p>
            A <b>validation is run first</b>, so you can safely upload the exported package and review the changes which will be performed. Afterwards <b>you can confirm or cancel the import</b>.
          </p>
        </div>
        <div className='form-group'>
          <FileInput
            placeholder='select export file to import...'
            selectedFile={this.state.selectedFile}
            onFileSelect={(file) => this.setState({ selectedFile: file })}
            disabled={this.state.processing === true || this.state.validated}
          />
        </div>
        <div className='form-group'>
          <fieldset style={{ padding: '0px', margin: '0px', borderWidth: '1px' }}>
            <legend style={{ marginLeft: '0.2rem' }}>Options</legend>
            <div className='form-group'>
              <div style={{ opacity: (this.state.processing === true || this.state.validated) ? 0.7 : 1 }}>
                <label>
                  <input
                    type='radio'
                    name='import-mode'
                    value='merge'
                    style={{ verticalAlign: 'middle', margin: '0px' }}
                    checked={!this.state.fullImport}
                    onChange={this.handleImportModeChange}
                  />
                  <span style={{ display: 'inline-block', verticalAlign: 'middle', paddingLeft: '0.2rem', paddingRight: '0.5rem' }}>Merge</span>
                </label>
                <label>
                  <input
                    type='radio'
                    name='import-mode'
                    value='full'
                    style={{ verticalAlign: 'middle', margin: '0px' }}
                    checked={this.state.fullImport}
                    onChange={this.handleImportModeChange}
                  />
                  <span style={{ display: 'inline-block', verticalAlign: 'middle', paddingLeft: '0.2rem', paddingRight: '0.5rem' }}>Full</span>
                </label>
              </div>
            </div>
            <div className='form-group'>
              <div
                style={{
                  display: !this.state.fullImport ? 'block' : 'none',
                  border: '1px dashed black',
                  padding: '0.6rem',
                  opacity: (this.state.processing === true || this.state.validated) ? 0.7 : 1
                }}
              >
                <label style={{ display: 'inline-block', marginBottom: '5px' }}>
                  <b>Optionally</b> you can select a folder in which the entities  will be inserted
                </label>
                <div style={{ maxHeight: '20rem', overflow: 'auto' }}>
                  <EntityRefSelect
                    noModal
                    treeStyle={{ minHeight: 'auto', maxHeight: 'none' }}
                    headingLabel='Select folder'
                    newLabel='New folder for import'
                    filter={(references) => ({ folders: references.folders })}
                    selectableFilter={(isGroup, entity) => entity.__entitySet === 'folders'}
                    value={this.state.selectedFolderShortid}
                    disabled={this.state.processing === true || this.state.validated}
                    onChange={(selected) => {
                      this.setState({
                        selectedFolderShortid: selected.length > 0 ? selected[0].shortid : null
                      })
                    }}
                    renderNew={(modalProps) => <sharedComponents.NewFolderModal {...modalProps} options={{ ...modalProps.options, entitySet: 'folders' }} />}
                  />
                </div>
              </div>
              {this.state.fullImport && (
                <p style={{ marginTop: '10px' }}>
                  A <b>full import</b> means that <b>all the entities that are not present in the export file will be deleted</b>, after the import <b>you will have only the entities that were present in the export file</b>.
                </p>
              )}
            </div>
          </fieldset>
        </div>
        <div className='form-group'>
          {!this.state.validated && (
            <div className='button-bar'>
              <button
                className={`button confirmation ${this.state.processing ? 'disabled' : ''}`}
                style={{ opacity: this.state.selectedFile == null ? 0.7 : 1 }}
                disabled={this.state.selectedFile == null}
                onClick={() => this.validate(this.state.selectedFile)}
              >
                <i className='fa fa-circle-o-notch fa-spin' style={{ display: this.state.processing ? 'inline-block' : 'none' }} />
                <span style={{ display: this.state.processing ? 'none' : 'inline' }}>Validate</span>
              </button>
            </div>
          )}
          <br />
          {this.state.validated && (
            <div>
              <div>
                <i>Log of changes with the import:</i>
              </div>
              <textarea style={{ width: '100%', boxSizing: 'border-box' }} rows='10' readOnly value={this.state.log} />
            </div>
          )}
          {this.state.validated && (
            <div className='button-bar'>
              <button className={`button danger ${this.state.processing ? 'disabled' : ''}`} onClick={() => this.cancel()}>
                Cancel
              </button>
              {(this.state.status === '0' || this.state.retryWithContinueOnFail) && (
                <button className={`button confirmation ${this.state.processing ? 'disabled' : ''}`} onClick={() => this.import()}>
                  <i className='fa fa-circle-o-notch fa-spin' style={{ display: this.state.processing ? 'inline-block' : 'none' }} />
                  <span style={{ display: this.state.processing ? 'none' : 'inline' }}>{this.state.retryWithContinueOnFail ? 'Ignore errors and continue' : 'Import'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
}

export default ImportModal
