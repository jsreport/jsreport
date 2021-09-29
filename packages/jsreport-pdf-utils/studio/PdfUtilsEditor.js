import React, { Component, useState } from 'react'
import Studio from 'jsreport-studio'
import AddHeaderFooterModal from './AddHeaderFooterModal'
import AddTOCModal from './AddTOCModal'
import AddCoverModal from './AddCoverModal'
import styles from './PdfUtilsEditor.css'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

const AdvancedMergeModal = (props) => {
  const { operation: initialOperation, update } = props.options
  const [operation, setOperation] = useState(initialOperation)

  const updateOperation = (op) => {
    update(op)
    setOperation({ ...operation, ...op })
  }
  return (
    <div>
      <h2>advanced merge configuration</h2>
      <div className='form-group'>
        <h3>Merge whole document</h3>
        <p>
          render specified template and merge the result into the current pdf.
          The first page of the template output will be merged into the first page of the current pdf, the second page to the second one and so on.
          When the option is deselected, the first page of the template output will be merged to all pages of the current pdf.
        </p>
        <input type='checkbox' disabled={operation.renderForEveryPage} checked={operation.mergeWholeDocument === true} onChange={(v) => updateOperation({ mergeWholeDocument: v.target.checked, renderForEveryPage: false })} />
      </div>

      <div style={{ marginTop: '1rem' }} className='form-group'>
        <h3>Render for every page (deprecated)</h3>
        <p>if true, the operation invokes rendering of the specified template for every pdf page (slow), otherwise it is invoked just once and the single output is merged</p>
        <input type='checkbox' disabled={operation.mergeWholeDocument} checked={operation.renderForEveryPage === true} onChange={(v) => updateOperation({ renderForEveryPage: v.target.checked, mergeWholeDocument: false })} />
      </div>

      <div style={{ marginTop: '1rem' }} className='form-group'>
        <h3>Merge to front</h3>
        <p>if true, the pdf produced by the operation is merged to the front layer, otherwise it is merged to the background</p>
        <input type='checkbox' checked={operation.mergeToFront === true} onChange={(v) => updateOperation({ mergeToFront: v.target.checked })} />
      </div>

      <div className='button-bar'>
        <button className='button confirmation' onClick={() => props.close()}>ok</button>
      </div>
    </div>
  )
}

class PdfUtilsEditor extends Component {
  constructor (props) {
    super(props)

    this.state = {
      activeTab: 'operations'
    }
  }

  addHeaderFooter () {
    const { entity } = this.props
    Studio.openModal(AddHeaderFooterModal, { entity })
  }

  addTOC () {
    const { entity } = this.props
    Studio.openModal(AddTOCModal, { entity })
  }

  addCover () {
    const { entity } = this.props
    Studio.openModal(AddCoverModal, { entity })
  }

  addOperation (entity) {
    Studio.updateEntity(Object.assign({}, entity, { pdfOperations: [...entity.pdfOperations || [], { type: 'merge', mergeWholeDocument: true }] }))
  }

  updateOperation (entity, index, update) {
    Studio.updateEntity(Object.assign({}, entity, { pdfOperations: entity.pdfOperations.map((o, i) => i === index ? Object.assign({}, o, update) : o) }))
  }

  updateMeta (entity, update) {
    let pdfMeta = entity.pdfMeta || {}

    pdfMeta = { ...pdfMeta, ...update }

    Object.keys(pdfMeta).forEach((metaKey) => {
      if (pdfMeta[metaKey] === '') {
        delete pdfMeta[metaKey]
      }
    })

    const keys = Object.keys(pdfMeta)

    if (keys.length === 0 || keys.every((k) => pdfMeta[k] == null)) {
      const newEntity = Object.assign({}, entity)
      newEntity.pdfMeta = null
      return Studio.updateEntity(newEntity)
    }

    Studio.updateEntity(Object.assign({}, entity, { pdfMeta }))
  }

  updatePassword (entity, update) {
    let pdfPassword = entity.pdfPassword || {}

    pdfPassword = { ...pdfPassword, ...update }

    Object.keys(pdfPassword).forEach((metaKey) => {
      if (pdfPassword[metaKey] === '') {
        delete pdfPassword[metaKey]
      }
    })

    const keys = Object.keys(pdfPassword)

    if (keys.length === 0 || keys.every((k) => pdfPassword[k] == null || pdfPassword[k] === false)) {
      const newEntity = Object.assign({}, entity)
      newEntity.pdfPassword = null
      return Studio.updateEntity(newEntity)
    }

    Studio.updateEntity(Object.assign({}, entity, { pdfPassword }))
  }

  updateSign (entity, update) {
    let pdfSign = entity.pdfSign || {}

    pdfSign = { ...pdfSign, ...update }

    Object.keys(pdfSign).forEach((metaKey) => {
      if (pdfSign[metaKey] === '') {
        delete pdfSign[metaKey]
      }
    })

    const keys = Object.keys(pdfSign)

    if (keys.length === 0 || keys.every((k) => pdfSign[k] == null)) {
      const newEntity = Object.assign({}, entity)
      newEntity.pdfSign = null
      return Studio.updateEntity(newEntity)
    }

    Studio.updateEntity(Object.assign({}, entity, { pdfSign }))
  }

  removeOperation (entity, index) {
    Studio.updateEntity(Object.assign({}, entity, { pdfOperations: entity.pdfOperations.filter((a, i) => i !== index) }))
  }

  moveDown (entity, index) {
    const pdfOperations = [...entity.pdfOperations]
    const tmp = pdfOperations[index + 1]
    pdfOperations[index + 1] = pdfOperations[index]
    pdfOperations[index] = tmp
    Studio.updateEntity(Object.assign({}, entity, { pdfOperations: pdfOperations }))
  }

  moveUp (entity, index) {
    const pdfOperations = [...entity.pdfOperations]
    const tmp = pdfOperations[index - 1]
    pdfOperations[index - 1] = pdfOperations[index]
    pdfOperations[index] = tmp
    Studio.updateEntity(Object.assign({}, entity, { pdfOperations: pdfOperations }))
  }

  renderOperation (entity, operation, index) {
    return (
      <tr key={index}>
        <td style={{ minWidth: '170px' }}>
          <EntityRefSelect
            headingLabel='Select template'
            newLabel='New template'
            filter={(references) => {
              const templates = references.templates.filter((e) => e.shortid !== entity.shortid && e.recipe.includes('pdf'))
              return { templates: templates }
            }}
            value={operation.templateShortid ? operation.templateShortid : null}
            onChange={(selected) => this.updateOperation(entity, index, { templateShortid: selected != null && selected.length > 0 ? selected[0].shortid : null })}
            renderNew={(modalProps) => <sharedComponents.NewTemplateModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
          />
        </td>
        <td>
          <select
            value={operation.type}
            onChange={(v) => this.updateOperation(entity, index, { type: v.target.value })}
          >
            <option value='merge'>merge</option>
            <option value='append'>append</option>
            <option value='prepend'>prepend</option>
          </select>
        </td>
        <td>
          {operation.type === 'merge' && <button onClick={() => Studio.openModal(AdvancedMergeModal, { operation: entity.pdfOperations[index], update: (o) => this.updateOperation(entity, index, o) })}>advanced</button>}
        </td>
        <td>
          <input type='checkbox' checked={operation.enabled !== false} onChange={(v) => this.updateOperation(entity, index, { enabled: v.target.checked })} />
        </td>
        <td>
          <button className='button' style={{ backgroundColor: '#c6c6c6' }} onClick={() => this.removeOperation(entity, index)}><i className='fa fa-times' /></button>
        </td>
        <td>
          {entity.pdfOperations[index - 1] ? <button className='button' style={{ backgroundColor: '#c6c6c6' }} onClick={() => this.moveUp(entity, index)}><i className='fa fa-arrow-up' /></button> : ''}
        </td>
        <td>
          {entity.pdfOperations[index + 1] ? <button className='button' style={{ backgroundColor: '#c6c6c6' }} onClick={() => this.moveDown(entity, index)}><i className='fa fa-arrow-down' /></button> : ''}
        </td>
      </tr>
    )
  }

  renderOperations (entity) {
    return (
      <table className={styles.operationTable}>
        <thead>
          <tr>
            <th>Template</th>
            <th>Operation</th>
            <th>Advanced</th>
            <th>Enabled</th>
            <th />
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {(entity.pdfOperations || []).map((o, i) => this.renderOperation(entity, o, i))}
        </tbody>
      </table>
    )
  }

  render () {
    const { activeTab } = this.state
    const { entity } = this.props

    const pdfMeta = entity.pdfMeta || {}
    const pdfPassword = entity.pdfPassword || {}
    const pdfSign = entity.pdfSign || {}

    return (
      <div className='block custom-editor' style={{ overflowX: 'auto' }}>
        <h1>
          <i className='fa fa-file-pdf-o' /> pdf utils configuration
        </h1>
        <div>
          <h2 style={{ marginTop: '0.2rem' }}>quick actions</h2>
          <div style={{ marginTop: '1rem', marginBottom: '0.8rem' }}>
            <button className='button confirmation' style={{ marginLeft: 0 }} onClick={() => this.addHeaderFooter()}>Add header/footer</button>
            <button className='button confirmation' onClick={() => this.addTOC()}>Add Table of Contents</button>
            <button className='button confirmation' onClick={() => this.addCover()}>Add cover page</button>
          </div>
        </div>
        <div className={styles.separator} />
        <div className={styles.tabContainer}>
          <ul className={styles.tabTitles}>
            <li
              className={`${styles.tabTitle} ${activeTab === 'operations' ? styles.active : ''}`}
              onClick={() => this.setState({ activeTab: 'operations' })}
            >
              operations
            </li>
            <li
              className={`${styles.tabTitle} ${activeTab === 'meta' ? styles.active : ''}`}
              onClick={() => this.setState({ activeTab: 'meta' })}
            >
              meta
            </li>
            <li
              className={`${styles.tabTitle} ${activeTab === 'password' ? styles.active : ''}`}
              onClick={() => this.setState({ activeTab: 'password' })}
            >
              password
            </li>
            <li
              className={`${styles.tabTitle} ${activeTab === 'sign' ? styles.active : ''}`}
              onClick={() => this.setState({ activeTab: 'sign' })}
            >
              sign
            </li>
          </ul>
          <div className={`${styles.tabPanel} ${activeTab === 'operations' ? styles.active : ''}`}>
            <p style={{ marginTop: '1rem' }}>
              Use merge/append operations to add dynamic headers or concatenate multiple pdf reports into one.
              See more docs and examples <a href='https://jsreport.net/learn/pdf-utils'>here</a>.
            </p>
            <div style={{ marginTop: '1rem' }}>
              {this.renderOperations(entity)}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button className='button confirmation' onClick={() => this.addOperation(entity)}>Add operation</button>
            </div>
          </div>
          <div className={`${styles.tabPanel} ${activeTab === 'meta' ? styles.active : ''}`}>
            <p style={{ marginTop: '1rem' }}>
              Add metadata information to the final PDF.
            </p>
            <div style={{ marginTop: '1rem', paddingBottom: '0.5rem' }}>
              <div className='form-group'>
                <label>Title</label>
                <input type='text' value={pdfMeta.title || ''} onChange={(v) => this.updateMeta(entity, { title: v.target.value })} />
              </div>
              <div className='form-group'>
                <label>Author</label>
                <input type='text' value={pdfMeta.author || ''} onChange={(v) => this.updateMeta(entity, { author: v.target.value })} />
              </div>
              <div className='form-group'>
                <label>Subject</label>
                <input type='text' value={pdfMeta.subject || ''} onChange={(v) => this.updateMeta(entity, { subject: v.target.value })} />
              </div>
              <div className='form-group'>
                <label>Keywords</label>
                <input type='text' value={pdfMeta.keywords || ''} onChange={(v) => this.updateMeta(entity, { keywords: v.target.value })} />
              </div>
              <div className='form-group'>
                <label>Creator</label>
                <input type='text' value={pdfMeta.creator || ''} onChange={(v) => this.updateMeta(entity, { creator: v.target.value })} />
              </div>
              <div className='form-group'>
                <label>Producer</label>
                <input type='text' value={pdfMeta.producer || ''} onChange={(v) => this.updateMeta(entity, { producer: v.target.value })} />
              </div>
              <div className='form-group'>
                <label>Language</label>
                <input type='text' value={pdfMeta.language || ''} onChange={(v) => this.updateMeta(entity, { language: v.target.value })} />
              </div>
            </div>
          </div>
          <div className={`${styles.tabPanel} ${activeTab === 'password' ? styles.active : ''}`}>
            <div style={{ marginTop: '1rem' }}>
              Add encryption and access privileges to the final PDF.

              You can specify either user password, owner password or both passwords. Behavior differs according to passwords you provides:

              <ul>
                <li>
                  When only user password is provided, users with user password are able to decrypt the file and have full access to the document.
                </li>
                <li>
                  When only owner password is provided, users are able to decrypt and open the document without providing any password, but the access is limited to those operations explicitly permitted. Users with owner password have full access to the document.
                </li>
                <li>
                  When both passwords are provided, users with user password are able to decrypt the file but only have limited access to the file according to permission settings. Users with owner password have full access to the document.
                </li>
              </ul>
            </div>
            <div style={{ marginTop: '1rem', paddingBottom: '0.5rem' }}>
              <div>
                <h2>Encryption</h2>
                <div key='password-field' className='form-group'>
                  <label>User Password</label>
                  <input
                    type='password'
                    autoComplete='off'
                    title='Users will be prompted to enter the password to decrypt the file when opening it'
                    placeholder='user password'
                    value={pdfPassword.password || ''}
                    onChange={(v) => this.updatePassword(entity, { password: v.target.value })}
                  />
                </div>
              </div>
              <div>
                <h2>Access privileges</h2>
                <p>
                  To set access privileges for the PDF, you need to provide an owner password and permission settings.
                </p>
                <div key='owner-password-field' className='form-group'>
                  <label>Owner Password</label>
                  <input
                    type='password'
                    autoComplete='off'
                    title='Users with the owner password will always have full access to the PDF (no matter the permission settings)'
                    placeholder='owner password'
                    value={pdfPassword.ownerPassword || ''}
                    onChange={(v) => this.updatePassword(entity, { ownerPassword: v.target.value })}
                  />
                </div>
                <div key='printing-permission-field' className='form-group'>
                  <label>Printing permission</label>
                  <select
                    value={pdfPassword.printing || '-1'}
                    title='Whether printing the file is allowed, and in which resolution the printing can be done'
                    onChange={(v) => this.updatePassword(entity, { printing: v.target.value === '-1' ? null : v.target.value })}
                  >
                    <option key='-1' value='-1'>Not allowed</option>
                    <option key='lowResolution' value='lowResolution' title='Allows the printing in degraded resolution'>Low Resolution</option>
                    <option key='highResolution' value='highResolution' title='Allows the printing in the best resolution'>High Resolution</option>
                  </select>
                </div>
                <div key='modify-permission-field' className='form-group'>
                  <label title='Whether modifying the file is allowed'>
                    Modify permission
                    <br />
                    <input
                      type='checkbox' checked={pdfPassword.modifying === true}
                      onChange={(v) => this.updatePassword(entity, { modifying: v.target.checked })}
                    />
                  </label>
                </div>
                <div key='copy-permission-field' className='form-group'>
                  <label title='Whether copying text or graphics from the file is allowed'>
                    Copy permission
                    <br />
                    <input
                      type='checkbox' checked={pdfPassword.copying === true}
                      onChange={(v) => this.updatePassword(entity, { copying: v.target.checked })}
                    />
                  </label>
                </div>
                <div key='annotation-permission-field' className='form-group'>
                  <label title='Whether annotating, form filling the file is allowed'>
                    Annotation permission
                    <br />
                    <input
                      type='checkbox' checked={pdfPassword.annotating === true}
                      onChange={(v) => this.updatePassword(entity, { annotating: v.target.checked })}
                    />
                  </label>
                </div>
                <div key='fillingForms-permission-field' className='form-group'>
                  <label title='Whether form filling and signing the file is allowed'>
                    Filling Forms permission
                    <br />
                    <input
                      type='checkbox' checked={pdfPassword.fillingForms === true}
                      onChange={(v) => this.updatePassword(entity, { fillingForms: v.target.checked })}
                    />
                  </label>
                </div>
                <div key='contentAccessibility-permission-field' className='form-group'>
                  <label title='Whether copying text from the file for accessibility is allowed'>
                    Content Accessibility permission
                    <br />
                    <input
                      type='checkbox' checked={pdfPassword.contentAccessibility === true}
                      onChange={(v) => this.updatePassword(entity, { contentAccessibility: v.target.checked })}
                    />
                  </label>
                </div>
                <div key='documentAssembly-permission-field' className='form-group'>
                  <label title='Whether assembling document is allowed'>
                    Assembling Document permission
                    <br />
                    <input
                      type='checkbox' checked={pdfPassword.documentAssembly === true}
                      onChange={(v) => this.updatePassword(entity, { documentAssembly: v.target.checked })}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles.tabPanel} ${activeTab === 'sign' ? styles.active : ''}`}>
            <p style={{ marginTop: '1rem' }}>
              Add a digital signature to the final PDF.
            </p>
            <div style={{ marginTop: '1rem', paddingBottom: '0.5rem' }}>
              <div className='form-group'>
                <label>Select certificate (asset)</label>
                <EntityRefSelect
                  headingLabel='Select certificate'
                  newLabel='New certificate asset'
                  value={pdfSign.certificateAssetShortid || ''}
                  onChange={(selected) => this.updateSign(entity, { certificateAssetShortid: selected.length > 0 ? selected[0].shortid : null })}
                  filter={(references) => ({ data: references.assets })}
                  renderNew={(modalProps) => <sharedComponents.NewAssetModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
                />
              </div>
              <div className='form-group'>
                <label>Sign Reason filled to pdf</label>
                <input type='text' placeholder='signed...' value={pdfSign.reason} onChange={(v) => this.updateSign(entity, { reason: v.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default PdfUtilsEditor
