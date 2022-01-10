import React, { Component } from 'react'
import scopeOptions from './scopeOptions'
import Studio from 'jsreport-studio'

class NewScriptModal extends Component {
  constructor (props) {
    super(props)

    this.nameInputRef = React.createRef()

    this.state = {
      selectedScope: 'template',
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
      scope: this.state.selectedScope,
      __entitySet: 'scripts'
    }

    this.setState({ processing: true })

    try {
      await Studio.api.post('/studio/validate-entity-name', {
        data: {
          _id: this.props.options.cloning === true ? undefined : entity._id,
          name: name,
          entitySet: 'scripts',
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
      entitySet: 'scripts',
      name
    })
  }

  render () {
    const { selectedScope, error, processing } = this.state
    const currentScopeValue = selectedScope
    const currentScopeOption = scopeOptions.find((opt) => opt.value === currentScopeValue)

    return (
      <div>
        <div className='form-group'>
          <label>New script</label>
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
          <label>scope</label>
          <select
            value={currentScopeValue}
            onChange={(v) => {
              const newScope = v.target.value

              this.setState({
                selectedScope: newScope
              })
            }}
          >
            {scopeOptions.map((opt) => (
              <option key={opt.key} value={opt.value} title={opt.desc}>{opt.title}</option>
            ))}
          </select>
          <em>{currentScopeOption.desc}</em>
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

export default NewScriptModal
