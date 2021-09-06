import React, { Component } from 'react'

export default class Properties extends Component {
  render () {
    const { entity, onChange } = this.props
    const phantomImage = entity.phantomImage || {}

    const changePhantom = (change) => onChange(Object.assign({}, entity, { phantomImage: Object.assign({}, entity.phantomImage, change) }))

    return (
      <div className='properties-section'>
        <div className='form-group'><label>image type</label>
          <select value={phantomImage.imageType || 'png'} onChange={(v) => changePhantom({ imageType: v.target.value })}>
            <option key='png' value='png'>png</option>
            <option key='jpeg' value='jpeg'>jpeg</option>
            <option key='gif' value='gif'>gif</option>
          </select>
        </div>

        <div className='form-group'><label>quality</label>
          <input
            type='text' placeholder='100' value={phantomImage.quality || ''}
            onChange={(v) => changePhantom({ quality: v.target.value })}
          />
        </div>

        <div className='form-group'><label>print delay</label>
          <input
            type='text' placeholder='1000' value={phantomImage.printDelay || ''}
            onChange={(v) => changePhantom({ printDelay: v.target.value })}
          />
        </div>

        <div className='form-group'>
          <label title='window.JSREPORT_READY_TO_START=true;'>wait for printing trigger</label>
          <input
            type='checkbox' title='window.JSREPORT_READY_TO_START=true;' checked={phantomImage.waitForJS === true}
            onChange={(v) => changePhantom({ waitForJS: v.target.checked })}
          />
        </div>

        <div className='form-group'>
          <label>block javascript</label>
          <input
            type='checkbox' checked={phantomImage.blockJavaScript === true}
            onChange={(v) => changePhantom({ blockJavaScript: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}
