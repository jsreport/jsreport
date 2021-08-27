import PropTypes from 'prop-types'
import React, { Fragment, Component } from 'react'
import { connect } from 'react-redux'
import EntityTreeButton from '../EntityTree/EntityTreeButton'
import EntityTree from '../EntityTree/EntityTree'
import { createGetReferencesSelector } from '../../redux/entities/selectors'
import { actions as entitiesActions } from '../../redux/entities'
import storeMethods from '../../redux/methods'
import api from '../../helpers/api'
import styles from './EntityTreeSelectionModal.css'

class EntityTreeSelectionModal extends Component {
  constructor (props) {
    super(props)

    const initialSelected = props.options.selected != null
      ? (
          !Array.isArray(props.options.selected) ? [props.options.selected] : props.options.selected
        )
      : []

    this.state = {
      newFolderEdit: null,
      newMode: false,
      selected: initialSelected.reduce((acu, shortid) => {
        const entity = storeMethods.getEntityByShortid(shortid, false)

        if (entity) {
          acu[entity._id] = true
        }

        return acu
      }, {})
    }

    this.cancelRef = React.createRef()

    this.createNewFolder = this.createNewFolder.bind(this)
    this.handleSelectionChange = this.handleSelectionChange.bind(this)
  }

  componentDidMount () {
    setTimeout(() => this.cancelRef.current.focus(), 0)
  }

  handleSelectionChange (selected) {
    this.setState({
      selected: selected
    })
  }

  filterEntities (references) {
    const { filter } = this.props.options

    if (!filter) {
      return references
    }

    let result = filter(references)

    result = result == null ? {} : result

    result = Object.keys(references).reduce((acu, k) => {
      if (acu[k] == null) {
        acu[k] = []
      }

      return acu
    }, result)

    return result
  }

  unselect () {
    this.setState({
      selected: {}
    })
  }

  async createNewFolder (folderName, parentShortid) {
    const entity = {
      name: folderName
    }

    if (parentShortid != null) {
      entity.folder = {
        shortid: parentShortid
      }
    }

    try {
      await api.post('/studio/validate-entity-name', {
        data: {
          name: entity.name,
          entitySet: 'folders',
          folderShortid: entity.folder != null ? entity.folder.shortid : null
        }
      })

      const response = await api.post('/odata/folders', {
        data: entity
      })

      response.__entitySet = 'folders'

      this.props.addExistingEntity(response)

      this.setState({
        newFolderEdit: null
      })
    } catch (e) {
      this.setState({
        newFolderEdit: {
          ...this.state.newFolderEdit,
          error: e.message
        }
      })
    }
  }

  save () {
    const selected = this.state.selected
    const values = []

    Object.keys(selected).forEach((_id) => {
      const entity = storeMethods.getEntityById(_id, false)

      if (!entity) {
        return
      }

      values.push(entity)
    })

    this.props.options.onSave(values)

    this.props.close()
  }

  cancel () {
    this.props.close()
  }

  render () {
    const {
      multiple,
      headingLabel,
      newLabel,
      selectableFilter,
      renderNew,
      allowNewFolder = false,
      treeStyle = {}
    } = this.props.options

    const { newMode, selected, newFolderEdit } = this.state

    const entities = this.filterEntities(this.props.references)

    let content

    if (newMode) {
      const close = () => {
        this.setState({
          newMode: false
        })
      }

      content = (
        <div>
          <div className={styles.backSection}>
            <span className={styles.backButton} onClick={() => close()}>
              <i className={`fa fa-arrow-left ${styles.backLabel}`} /> <span className={styles.backLabel}>Back to selection</span>
            </span>
          </div>
          {renderNew({
            close,
            options: {}
          })}
        </div>
      )
    } else {
      content = (
        // eslint-disable-next-line react/jsx-fragments
        <Fragment>
          {allowNewFolder && (
            <div>
              <NewFolderInline
                onAdd={() => this.setState({
                  newFolderEdit: {}
                })}
                /* eslint-disable-next-line */
                onSave={this.createNewFolder}
                onCancel={() => this.setState({ newFolderEdit: null })}
                editMode={newFolderEdit}
              />
            </div>
          )}
          {allowNewFolder && (
            <br />
          )}
          <div style={Object.assign({ minHeight: '30rem', maxHeight: '30rem', overflow: 'auto' }, treeStyle)}>
            <EntityTree
              entities={entities}
              selectable
              selectionMode={{
                mode: multiple ? 'multiple' : 'single',
                isSelectable: (isGroup, entity) => {
                  if (selectableFilter) {
                    return Boolean(selectableFilter(isGroup, entity))
                  }

                  if (isGroup) {
                    return false
                  }

                  return true
                }
              }}
              selected={selected}
              onSelectionChanged={this.handleSelectionChange}
              getContextMenuItems={allowNewFolder
                ? ({ entity, isRoot }) => {
                    if (isRoot) {
                      return
                    }

                    return [{
                      key: 'New Folder',
                      title: 'New Folder',
                      icon: 'fa-folder',
                      onClick: () => this.setState({
                        newFolderEdit: { parentShortid: entity.shortid }
                      })
                    }]
                  }
                : undefined}
            />
          </div>
          <div className='button-bar'>
            <button
              ref={this.cancelRef}
              className='button confirmation'
              onClick={() => this.cancel()}
            >
              Cancel
            </button>
            <button className='button confirmation' onClick={() => this.unselect()}>Unselect</button>
            {renderNew != null && (
              <button
                className='button confirmation'
                onClick={() => {
                  this.setState({ newMode: true })
                }}
              >
                New
              </button>
            )}
            <button className='button danger' onClick={() => this.save()}>Ok</button>
          </div>
        </Fragment>
      )
    }

    return (
      <div>
        <div>
          <h1>
            <i className='fa fa-check-square-o' />
            &nbsp;
            {newMode ? newLabel != null ? newLabel : 'New entity' : headingLabel != null ? headingLabel : 'Select entity'}
          </h1>
        </div>
        {content}
      </div>
    )
  }
}

EntityTreeSelectionModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

class NewFolderInline extends Component {
  constructor (props) {
    super(props)
    this.setInputNameNode = this.setInputNameNode.bind(this)
  }

  componentDidUpdate (prevProps) {
    if (
      ((prevProps.editMode == null && this.props.editMode != null) ||
      (prevProps.editMode && this.props.editMode && prevProps.editMode.parentShortid !== this.props.editMode.parentShortid)) &&
      this.inputNameNode
    ) {
      setTimeout(() => this.inputNameNode.focus(), 0)
    }

    if (
      prevProps.editMode &&
      this.props.editMode &&
      prevProps.editMode.parentShortid !== this.props.editMode.parentShortid &&
      this.inputNameNode
    ) {
      this.inputNameNode.value = ''
    }
  }

  setInputNameNode (el) {
    this.inputNameNode = el
  }

  renderEditMode () {
    const { editMode, onSave, onCancel } = this.props
    let parentName

    if (editMode.parentShortid != null) {
      parentName = storeMethods.resolveEntityPath(storeMethods.getEntityByShortid(editMode.parentShortid))
    }

    return (
      <div>
        <div style={{ fontSize: '0.8rem', marginBottom: '5px' }}>
          Creating new folder <b>{editMode.parentShortid != null ? `inside folder ${parentName}` : 'in the root level'}</b>
        </div>
        <input
          ref={this.setInputNameNode}
          type='text'
          placeholder='folder name'
          defaultValue=''
          style={{ display: 'inline-block', width: '120px' }}
        />
        <div style={{ display: 'inline-block' }}>
          <button className='button confirmation' onClick={() => onSave(this.inputNameNode.value, editMode.parentShortid)}>
            Save
          </button>
          <button className='button confirmation' onClick={() => onCancel()}>Cancel</button>
        </div>
        {editMode.error != null && (
          <div style={{ color: 'red', marginTop: '3px' }}>
            Error when creating folder: {editMode.error}
          </div>
        )}
      </div>
    )
  }

  render () {
    const { editMode, onAdd } = this.props

    return (
      <div title='Add new folder' style={{ display: 'inline-block' }}>
        {!editMode
          ? (
            <EntityTreeButton onClick={onAdd}>
              <span style={{ display: 'inline-block' }}>
                <i className='fa fa-folder' />&nbsp;New folder
              </span>
            </EntityTreeButton>
            )
          : (
              this.renderEditMode()
            )}
      </div>
    )
  }
}

function makeMapStateToProps () {
  const getReferences = createGetReferencesSelector()

  return (state) => ({
    references: getReferences(state)
  })
}

export default connect(makeMapStateToProps, {
  addExistingEntity: entitiesActions.addExisting
})(EntityTreeSelectionModal)
