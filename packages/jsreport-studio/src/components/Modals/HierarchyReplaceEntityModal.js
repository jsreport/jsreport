import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { values as configuration } from '../../lib/configuration'
import { connect } from 'react-redux'
import { actions as editorActions } from '../../redux/editor'
import storeMethods from '../../redux/methods'
import { createGetByIdSelector, createGetByShortidSelector } from '../../redux/entities/selectors'

class HierarchyReplaceEntityModal extends Component {
  replace () {
    const { sourceEntity, targetEntity, options, hierarchyMove, close } = this.props
    const { existingEntity } = options

    close()

    hierarchyMove({
      id: sourceEntity._id,
      entitySet: sourceEntity.__entitySet
    }, {
      shortid: targetEntity != null ? targetEntity.shortid : null,
      children: targetEntity == null ? [existingEntity._id] : options.targetChildren
    }, options.shouldCopy, true, false)
  }

  cancel () {
    this.props.close()
  }

  componentDidMount () {
    if (!this.cancelBtn) {
      return
    }

    setTimeout(() => this.cancelBtn.focus(), 0)
  }

  render () {
    const { sourceEntity, targetEntity, options } = this.props
    const { existingEntity, existingEntityEntitySet } = options

    if (!sourceEntity) {
      return <div />
    }

    const sourceEntityName = sourceEntity.name
    const sourceEntitySetVisibleName = configuration.entitySets[sourceEntity.__entitySet].visibleName || configuration.entitySets[sourceEntity.__entitySet].name
    const existingEntityEntitySetVisibleName = configuration.entitySets[existingEntityEntitySet].visibleName || configuration.entitySets[existingEntityEntitySet].name
    const shouldCopy = options.shouldCopy

    return (
      <div>
        <div>
          <b>{shouldCopy ? 'Copy' : 'Move'}</b> failed. Entity with name <b>{sourceEntityName}</b> already exists {targetEntity != null ? 'in target folder ' : 'at root level'}{targetEntity != null && (
            <b>{storeMethods.resolveEntityPath(targetEntity)}</b>
          )}.
          <br />
          <br />
          <div>
            <b>source entity: </b> {storeMethods.resolveEntityPath(sourceEntity)} ({sourceEntitySetVisibleName})
            <br />
            <b>target entity: </b> {storeMethods.resolveEntityPath(existingEntity)} ({existingEntityEntitySetVisibleName})
          </div>
          <br />
          Do you want to replace it?
        </div>
        <div className='button-bar'>
          <button className='button danger' onClick={() => this.replace()}>Yes</button>
          <button className='button confirmation' ref={(el) => { this.cancelBtn = el }} onClick={() => this.cancel()}>Cancel</button>
        </div>
      </div>
    )
  }
}

HierarchyReplaceEntityModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

function makeMapStateToProps () {
  const getById = createGetByIdSelector()
  const getByShortid = createGetByShortidSelector()

  return (state, props) => ({
    sourceEntity: getById(state, { id: props.options.sourceId }),
    targetEntity: getByShortid(state, { shortid: props.options.targetShortId })
  })
}

export default connect(
  makeMapStateToProps,
  { ...editorActions }
)(HierarchyReplaceEntityModal)
