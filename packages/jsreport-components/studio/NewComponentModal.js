/* import PropTypes from 'prop-types' */
import React, { Component } from 'react'
import Studio from 'jsreport-studio'

function getDefaultEngine () {
  const found = Studio.engines.find((e) => e === 'handlebars')

  if (found) {
    return found
  }

  return Studio.engines[0]
}

class NewComponentModal extends Component {
  constructor (props) {
    super(props)

    this.nameInputRef = React.createRef()
    this.engineInputRef = React.createRef()

    this.state = {
      error: null,
      processing: false
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

    const name = val || this.nameInputRef.current.value

    const entity = {
      ...this.props.options.defaults,
      name,
      engine: this.engineInputRef.current.value,
      __entitySet: 'components'
    }

    this.setState({ processing: true })

    try {
      await Studio.api.post('/studio/validate-entity-name', {
        data: {
          _id: this.props.options.cloning === true ? undefined : entity._id,
          name: name,
          entitySet: 'components',
          folderShortid: entity.folder != null ? entity.folder.shortid : null
        }
      }, true)
    } catch (e) {
      this.setState({
        error: e.message,
        processing: false
      })

      return
    }

    this.setState({
      error: null,
      processing: false
    })

    this.props.close()
    Studio.openNewTab({
      entity,
      entitySet: 'components',
      name
    })
  }

  render () {
    const { error, processing } = this.state

    return (
      <div>
        <div className='form-group'>
          <label>New component</label>
        </div>
        <div className='form-group'>
          <label>name</label>
          <input
            type='text'
            placeholder='name...'
            ref={this.nameInputRef}
            onKeyPress={(e) => this.handleKeyPress(e)}
          />
        </div>
        <div className='form-group'>
          <label>engine</label>
          <select
            defaultValue={getDefaultEngine()}
            ref={this.engineInputRef}
          >
            {Studio.engines.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className='form-group'>
          <span
            style={{
              color: 'red',
              display: error ? 'block' : 'none',
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: '360px'
            }}
          >
            {error}
          </span>
        </div>
        <div className='button-bar'>
          <button className='button confirmation' disabled={processing} onClick={() => this.submit()}>Ok</button>
        </div>
      </div>
    )
  }
}

export default NewComponentModal
