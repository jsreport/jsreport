import PropTypes from 'prop-types'
import React, { Fragment, Component } from 'react'
import { connect } from 'react-redux'
import EntityTree from '../EntityTree/EntityTree'
import { createGetReferencesSelector } from '../../redux/entities/selectors'
import { actions as entitiesActions } from '../../redux/entities'
import storeMethods from '../../redux/methods'
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
    this.newEntityCreatedRef = React.createRef()

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
      treeStyle = {}
    } = this.props.options

    const { newMode, selected } = this.state

    const entities = this.filterEntities(this.props.references)

    let content

    if (newMode) {
      const onNewEntity = (newEntity) => {
        this.newEntityCreatedRef.current = true
        this.handleSelectionChange({ [newEntity._id]: true })
        this.save()
      }

      const close = () => {
        if (this.newEntityCreatedRef.current === true) {
          return
        }

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
            options: { onNewEntity }
          })}
        </div>
      )
    } else {
      content = (
        // eslint-disable-next-line react/jsx-fragments
        <Fragment>
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

function makeMapStateToProps () {
  const getReferences = createGetReferencesSelector()

  return (state) => ({
    references: getReferences(state)
  })
}

export default connect(makeMapStateToProps, {
  addExistingEntity: entitiesActions.addExisting
})(EntityTreeSelectionModal)
