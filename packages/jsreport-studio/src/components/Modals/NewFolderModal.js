import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { actions as editorActions } from '../../redux/editor'
import { actions as entitiesActions } from '../../redux/entities'
import api from '../../helpers/api.js'

class NewFolderModal extends Component {
  constructor (props) {
    super(props)

    this.nameInputRef = React.createRef()

    this.state = {
      processing: false,
      error: null
    }
  }

  // the modal component for some reason after open focuses the panel itself
  componentDidMount () {
    setTimeout(() => this.nameInputRef.current.focus(), 0)
  }

  handleKeyPress (e) {
    if (e.key === 'Enter') {
      this.submit(e.target.value)
    }
  }

  async submit (val) {
    if (this.state.processing) {
      return
    }

    let entity = Object.assign({}, this.props.options.entity)
    const name = val || this.nameInputRef.current.value
    const isCloning = this.props.options.cloning === true
    let response

    entity.name = name

    if (this.props.options.defaults != null) {
      entity = Object.assign(this.props.options.defaults, entity)
    }

    this.setState({ processing: true })

    try {
      await api.post('/studio/validate-entity-name', {
        data: {
          _id: isCloning ? undefined : entity._id,
          name: entity.name,
          entitySet: 'folders',
          folderShortid: entity.folder != null ? entity.folder.shortid : null
        }
      })

      if (isCloning) {
        delete entity._id
        delete entity.shortid
      }

      response = await api.post('/odata/folders', {
        data: entity
      })
    } catch (e) {
      this.setState({
        processing: false,
        error: e.message
      })

      return
    }

    response.__entitySet = 'folders'

    this.props.addExisting(response)

    if (this.props.options.onNewEntity) {
      this.props.options.onNewEntity(response)
    }

    if (isCloning) {
      try {
        await this.props.hierarchyMove({
          id: this.props.options.entity._id,
          entitySet: 'folders',
          onlyChildren: true
        }, {
          shortid: response.shortid,
          updateReferences: true
        }, true, false, false)
      } catch (e) {
        this.setState({
          error: e.message,
          processing: false
        })

        return
      }
    }

    this.setState({
      error: null,
      processing: false
    })

    this.props.close()
  }

  render () {
    const { error, processing } = this.state
    const { initialName } = this.props.options

    return (
      <div>
        <div className='form-group'>
          <label>New folder</label>
        </div>
        <div className='form-group'>
          <label>name</label>
          <input
            type='text'
            placeholder='name...'
            ref={this.nameInputRef}
            defaultValue={initialName}
            onKeyPress={(e) => this.handleKeyPress(e)}
          />
        </div>
        <div className='form-group'>
          <span style={{ color: 'red', display: error ? 'block' : 'none' }}>{error}</span>
        </div>
        <div className='button-bar'>
          <button className='button confirmation' disabled={processing} onClick={() => this.submit()}>Ok</button>
        </div>
      </div>
    )
  }
}

NewFolderModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

export default connect(
  undefined,
  { ...entitiesActions, ...editorActions }
)(NewFolderModal)
