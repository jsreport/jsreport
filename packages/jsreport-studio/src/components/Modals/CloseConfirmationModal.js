import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createGetByIdSelector } from '../../redux/entities/selectors'
import { actions as editorActions } from '../../redux/editor'

class CloseConfirmationModal extends Component {
  constructor (props) {
    super(props)

    this.cancelRef = React.createRef()
  }

  remove () {
    this.props.close()
    this.props.closeTab(this.props.entity._id)
  }

  cancel () {
    this.props.close()
  }

  componentDidMount () {
    setTimeout(() => this.cancelRef.current.focus(), 0)
  }

  render () {
    const { entity } = this.props

    if (!entity) {
      return <div />
    }

    return (
      <div>
        <div>Are you sure you want to close {entity.name} and lose the changes ? </div>

        <div className='button-bar'>
          <button className='button danger' onClick={() => this.remove()}>Yes</button>
          <button className='button confirmation' ref={this.cancelRef} onClick={() => this.cancel()}>Cancel</button>
        </div>
      </div>
    )
  }
}

CloseConfirmationModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

function makeMapStateToProps () {
  const getById = createGetByIdSelector()

  return (state, props) => ({
    entity: getById(state, { id: props.options._id })
  })
}

export default connect(
  makeMapStateToProps,
  { ...editorActions }
)(CloseConfirmationModal)
