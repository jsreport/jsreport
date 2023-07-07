import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { values as configuration } from '../../lib/configuration'
import { actions as entitiesActions } from '../../redux/entities'
import { createGetByIdSelector } from '../../redux/entities/selectors'
import storeMethods from '../../redux/methods'

class DeleteConfirmationModal extends Component {
  constructor (props) {
    super(props)

    this.cancelRef = React.createRef()
  }

  async remove () {
    const { entitiesToRemove } = this.props

    this.props.close()

    for (const item of entitiesToRemove) {
      await this.props.remove(item.entity._id, item.childrenIds)
    }
  }

  cancel () {
    this.props.close()
  }

  componentDidMount () {
    setTimeout(() => this.cancelRef.current.focus(), 0)
  }

  render () {
    const { entitiesToRemove } = this.props

    if (!entitiesToRemove || entitiesToRemove.length === 0) {
      return null
    }

    const isSingleDelete = entitiesToRemove.length === 1
    let content

    const contentStyle = {
      maxWidth: '350px'
    }

    const getEntitySetDisplayName = (entitySet) => configuration.entitySets[entitySet].visibleName || entitySet

    if (isSingleDelete) {
      const entity = entitiesToRemove[0].entity
      let entityDisplay

      if (entity.name) {
        entityDisplay = storeMethods.resolveEntityPath(entity)
      } else {
        entityDisplay = `entity with _id: ${entity._id}`
      }

      content = (
        <div style={contentStyle}>
          Are you sure you want to delete&nbsp;<b>{entityDisplay}</b>&nbsp;({getEntitySetDisplayName(entity.__entitySet)})?
        </div>
      )
    } else {
      content = (
        <div style={contentStyle}>
          Are you sure you want to delete the following entities ({entitiesToRemove.length})?
          <ul>
            {entitiesToRemove.map(item => {
              const entity = item.entity
              let entityDisplay

              if (entity.name) {
                entityDisplay = storeMethods.resolveEntityPath(entity)
              } else {
                entityDisplay = `entity with _id: ${entity._id}`
              }

              return (
                <li key={item.entity._id}>
                  <b>{entityDisplay}</b>&nbsp;({getEntitySetDisplayName(entity.__entitySet)})
                </li>
              )
            })}
          </ul>
        </div>
      )
    }

    return (
      <div>
        {content}
        <div className='button-bar'>
          <button
            className='button danger'
            onClick={() => this.remove()}
          >
            Yes
          </button>
          <button
            ref={this.cancelRef}
            className='button confirmation'
            onClick={() => this.cancel()}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }
}

DeleteConfirmationModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

function makeMapStateToProps () {
  const getById = createGetByIdSelector()

  return (state, props) => {
    const toRemove = props.options.toRemove
    const entitiesToRemove = []

    if (!Array.isArray(toRemove)) {
      entitiesToRemove.push({
        entity: getById(state, { id: toRemove.id }),
        childrenIds: toRemove.childrenIds
      })
    } else {
      const toRemoveItems = toRemove.map((item) => ({
        entity: getById(state, { id: item.id }),
        childrenIds: item.childrenIds
      }))

      entitiesToRemove.push(...toRemoveItems)
    }

    return {
      entitiesToRemove
    }
  }
}

export default connect(
  makeMapStateToProps,
  { ...entitiesActions }
)(DeleteConfirmationModal)
