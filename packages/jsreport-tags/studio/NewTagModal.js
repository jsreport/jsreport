import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ColorPicketTrigger from './ColorPickerTrigger'

class NewTagModal extends Component {
  constructor (props) {
    super(props)

    this.nameRef = React.createRef()
    this.descriptionRef = React.createRef()

    this.state = {
      displayColorPicker: false,
      selectedColor: '',
      error: null
    }
  }

  // the modal component for some reason after open focuses the panel itself
  componentDidMount () {
    setTimeout(() => this.nameRef.current.focus(), 0)
  }

  handleKeyPress (e) {
    if (e.key === 'Enter') {
      this.createTag()
    }
  }

  async createTag () {
    let entity = {}

    if (!this.nameRef.current.value) {
      return this.setState({
        error: 'name field cannot be empty'
      })
    }

    if (!this.state.selectedColor) {
      return this.setState({
        error: 'color field cannot be empty'
      })
    }

    if (this.props.options.defaults != null) {
      entity = Object.assign(entity, this.props.options.defaults)
    }

    entity.name = this.nameRef.current.value
    entity.color = this.state.selectedColor
    entity.description = this.descriptionRef.current.value

    try {
      const response = await Studio.api.post('/odata/tags', {
        data: entity
      })

      response.__entitySet = 'tags'

      Studio.addExistingEntity(response)
      Studio.openTab(response, this.props.options.activateNewTab)

      if (this.props.options.onNewEntity) {
        this.props.options.onNewEntity(response)
      }

      this.props.close()
    } catch (e) {
      this.setState({
        error: e.message
      })
    }
  }

  render () {
    const {
      displayColorPicker,
      selectedColor,
      error
    } = this.state

    return (
      <div>
        <div className='form-group'>
          <label>New tag</label>
        </div>
        <div className='form-group'>
          <label>name</label>
          <input type='text' name='name' ref={this.nameRef} placeholder='tag name...' onKeyPress={(e) => this.handleKeyPress(e)} />
        </div>
        <div className='form-group'>
          <label>color</label>

          <div>
            <ColorPicketTrigger
              displayColorPicker={displayColorPicker}
              containerStyles={{ border: '1px dashed #000' }}
              color={selectedColor}
              onClickColorTrigger={() => this.setState({ displayColorPicker: true })}
              onCloseColorPicker={() => this.setState({ displayColorPicker: false })}
              onInputChange={(colorInputValue) => colorInputValue !== selectedColor && this.setState({ selectedColor: colorInputValue })}
              onChangeSelectionColor={(colorHex) => this.setState({ selectedColor: colorHex })}
            />
          </div>
        </div>
        <div className='form-group'>
          <label>Description</label>
          <textarea
            name='description'
            ref={this.descriptionRef}
            placeholder='You can add more details about this tag here...'
            rows='4'
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className='form-group'>
          <span
            style={{ color: 'red', display: error ? 'block' : 'none' }}
          >
            {error}
          </span>
        </div>
        <div className='form-group' style={{ opacity: 0.8 }}>
          <hr />
          <span>
            You can use tags to organize jsreport objects.<br />
            This can be for example a tag to organize and group related templates, images, data, scripts, assets, etc. <br />
            See the <a target='_blank' rel='noreferrer' title='Help' href='http://jsreport.net/learn/tags'>documentation</a> for details.
          </span>
        </div>
        <div className='button-bar'>
          <button onClick={() => this.createTag()} className='button confirmation'>Ok</button>
        </div>
      </div>
    )
  }
}

export default NewTagModal
