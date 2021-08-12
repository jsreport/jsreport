/* import PropTypes from 'prop-types' */
import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { createGetByIdSelector } from '../../redux/entities/selectors'
import * as entitiesActions from '../../redux/entities/actions'
import api from '../../helpers/api'

class RenameModal extends Component {
  constructor (props) {
    super(props)

    this.nameRef = React.createRef()

    this.state = {
      error: null
    }
  }

  componentDidMount () {
    setTimeout(() => this.nameRef.current.focus(), 0)
  }

  handleKeyPress (e) {
    if (e.key === 'Enter') {
      this.rename()
    }
  }

  async rename () {
    if (!this.nameRef.current.value) {
      return
    }

    const newName = this.nameRef.current.value

    try {
      await api.post('/studio/validate-entity-name', {
        data: {
          _id: this.props.entity._id,
          name: newName,
          entitySet: this.props.entity.__entitySet,
          folderShortid: this.props.entity.folder != null ? this.props.entity.folder.shortid : null
        }
      })
    } catch (e) {
      this.setState({
        error: e.message
      })

      return
    }

    this.setState({
      error: null
    })

    this.props.close()

    this.props.update({
      _id: this.props.entity._id,
      name: newName
    })

    this.props.save(this.props.entity._id)
  }

  render () {
    const { error } = this.state
    const { entity } = this.props

    return (
      <div>
        <div className='form-group'>
          <label>rename entity</label>
          <input
            ref={this.nameRef}
            type='text'
            defaultValue={entity.name}
            onKeyPress={(e) => this.handleKeyPress(e)}
          />
        </div>
        <div className='form-group'>
          <span style={{ color: 'red', display: error ? 'block' : 'none' }}>{error}</span>
        </div>
        <div className='button-bar'>
          <button className='button confirmation' onClick={() => this.rename()}>Ok</button>
          <button className='button confirmation' onClick={() => this.props.close()}>Cancel</button>
        </div>
      </div>
    )
  }
}

function makeMapStateToProps () {
  const getById = createGetByIdSelector()

  return (state, props) => ({
    entity: getById(state, { id: props.options._id })
  })
}

RenameModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

export default connect(
  makeMapStateToProps,
  { ...entitiesActions }
)(RenameModal)
