import React, { Component } from 'react'

export default class ImageProperties extends Component {
  constructor (props) {
    super(props)
    this.changeChrome = this.changeChrome.bind(this)
  }

  changeChrome (props, change) {
    const { entity, onChange } = props
    const chromeImage = entity.chromeImage || {}

    onChange({
      ...entity,
      chromeImage: { ...chromeImage, ...change }
    })
  }

  render () {
    const { entity } = this.props
    const chrome = entity.chromeImage || {}
    const changeChrome = this.changeChrome

    return (
      <div className='properties-section'>
        <div className='form-group'><label>format</label>
          <select value={chrome.type || 'png'} onChange={(v) => changeChrome(this.props, { type: v.target.value })}>
            <option key='png' value='png'>png</option>
            <option key='jpeg' value='jpeg'>jpeg</option>
          </select>
        </div>
        {chrome.type === 'jpeg' && (
          <div className='form-group'><label>quality</label>
            <input
              type='text'
              placeholder='0 - 100'
              value={chrome.quality != null ? chrome.quality : ''}
              onChange={(v) => {
                let qualityValue = v.target.value

                if (qualityValue.trim() === '') {
                  qualityValue = null
                }

                changeChrome(this.props, { quality: qualityValue })
              }}
            />
          </div>
        )}
        <div className='form-group'>
          <label>full page</label>
          <input
            type='checkbox'
            checked={chrome.fullPage === true}
            title='Specifies whether to take a screenshot of the full scrollable page or not'
            onChange={(v) => changeChrome(this.props, { fullPage: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>viewport width</label>
          <input
            type='text'
            value={chrome.viewportWidth != null ? chrome.viewportWidth : ''}
            title='Specifies the target viewport width of the chrome page'
            placeholder='800'
            onChange={(v) => {
              let viewportWidthValue = v.target.value

              if (viewportWidthValue.trim() === '') {
                viewportWidthValue = null
              }

              changeChrome(this.props, { viewportWidth: viewportWidthValue })
            }}
          />
        </div>
        <div className='form-group'>
          <label>viewport height</label>
          <input
            type='text'
            value={chrome.viewportHeight != null ? chrome.viewportHeight : ''}
            title='Specifies the target viewport height of the chrome page'
            placeholder='600'
            onChange={(v) => {
              let viewportHeightValue = v.target.value

              if (viewportHeightValue.trim() === '') {
                viewportHeightValue = null
              }

              changeChrome(this.props, { viewportHeight: viewportHeightValue })
            }}
          />
        </div>
        <div className='form-group'>
          <label>clip X</label>
          <input
            type='text'
            value={chrome.clipX != null ? chrome.clipX : ''}
            title='Specifies the x-coordinate of top-left corner of clipping region of the page'
            onChange={(v) => {
              let clipXValue = v.target.value

              if (clipXValue.trim() === '') {
                clipXValue = null
              }

              changeChrome(this.props, { clipX: clipXValue })
            }}
          />
        </div>
        <div className='form-group'>
          <label>clip Y</label>
          <input
            type='text'
            value={chrome.clipY != null ? chrome.clipY : ''}
            title='Specifies the y-coordinate of top-left corner of clipping region of the page'
            onChange={(v) => {
              let clipYValue = v.target.value

              if (clipYValue.trim() === '') {
                clipYValue = null
              }

              changeChrome(this.props, { clipY: clipYValue })
            }}
          />
        </div>
        <div className='form-group'><label>clip width</label>
          <input
            type='text'
            value={chrome.clipWidth != null ? chrome.clipWidth : ''}
            title='Specifies the width of clipping region of the page'
            onChange={(v) => {
              let clipWidthValue = v.target.value

              if (clipWidthValue.trim() === '') {
                clipWidthValue = null
              }

              changeChrome(this.props, { clipWidth: clipWidthValue })
            }}
          />
        </div>
        <div className='form-group'><label>clip height</label>
          <input
            type='text' value={chrome.clipHeight != null ? chrome.clipHeight : ''}
            title='Specifies the height of clipping region of the page'
            onChange={(v) => {
              let clipHeightValue = v.target.value

              if (clipHeightValue.trim() === '') {
                clipHeightValue = null
              }

              changeChrome(this.props, { clipHeight: clipHeightValue })
            }}
          />
        </div>
        <div className='form-group'>
          <label>omit background</label>
          <input
            type='checkbox' checked={chrome.omitBackground === true}
            title='Specifies if the background should be hidden, therefore allowing capturing screenshots with transparency'
            onChange={(v) => changeChrome(this.props, { omitBackground: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>media type</label>
          <select value={chrome.mediaType || 'print'} onChange={(v) => changeChrome(this.props, { mediaType: v.target.value })}>
            <option key='print' value='print'>print</option>
            <option key='screen' value='screen'>screen</option>
          </select>
        </div>
        <div className='form-group'>
          <label>wait for network idle</label>
          <input
            type='checkbox' checked={chrome.waitForNetworkIdle === true}
            onChange={(v) => changeChrome(this.props, { waitForNetworkIdle: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label title='window.JSREPORT_READY_TO_START=true;'>wait for printing trigger</label>
          <input
            type='checkbox' title='window.JSREPORT_READY_TO_START=true;' checked={chrome.waitForJS === true}
            onChange={(v) => changeChrome(this.props, { waitForJS: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}
