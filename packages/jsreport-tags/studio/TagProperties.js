import React, { Component } from 'react'
import ShowColor from './ShowColor'
import ColorPicketTrigger from './ColorPickerTrigger'

export default class TagProperties extends Component {
  static title (entity, entities) {
    return (
      <span>
        <span>
          tag (color: <ShowColor color={entity.color} width={15} height={15} />)
        </span>
      </span>
    )
  }

  constructor (props) {
    super(props)

    this.state = {
      displayColorPicker: false
    }
  }

  render () {
    const { displayColorPicker } = this.state
    const { entity, onChange } = this.props

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>Color</label>

          <div>
            <ColorPicketTrigger
              displayColorPicker={displayColorPicker}
              containerStyles={{ border: '1px dashed #000' }}
              color={entity.color}
              onClickColorTrigger={() => this.setState({ displayColorPicker: true })}
              onCloseColorPicker={() => this.setState({ displayColorPicker: false })}
              onInputChange={(colorInputValue) => colorInputValue !== entity.color && onChange({ _id: entity._id, color: colorInputValue })}
              onChangeSelectionColor={(colorHex) => onChange({ _id: entity._id, color: colorHex })}
            />
          </div>
        </div>
        <div className='form-group'>
          <label>Description</label>
          <textarea
            rows='4'
            style={{ resize: 'vertical' }}
            value={entity.description || ''}
            onChange={(v) => onChange({ _id: entity._id, description: v.target.value })}
          />
        </div>
      </div>
    )
  }
}
