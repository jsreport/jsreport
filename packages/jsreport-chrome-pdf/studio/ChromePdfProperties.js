import React, { Component } from 'react'
import Studio from 'jsreport-studio'

class ChromePdfProperties extends Component {
  constructor (props) {
    super(props)

    this.applyDefaultsToEntity = this.applyDefaultsToEntity.bind(this)
    this.changeChrome = this.changeChrome.bind(this)
  }

  componentDidMount () {
    this.applyDefaultsToEntity(this.props)
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.entity._id !== this.props.entity._id) {
      this.applyDefaultsToEntity(this.props)
    }
  }

  inform () {
    if (Studio.getSettingValueByKey('chrome-header-informed', false) === true) {
      return
    }

    Studio.setSetting('chrome-header-informed', true)

    Studio.openModal(() => (
      <div>
        Here you can define chrome native headers/footers.
        Make sure "display header/footer" is selected and use margin to prepare the space for the header.
        <br />
        Please note chrome currently prints headers with smaller font size and you need to style text explicitly to workaround it.
        <br />
        <br />
        <b>
          The chrome native implementation is also very limited and we recommend to use jsreport
          <a href='https://jsreport.net/learn/pdf-utils' target='_blank' rel='noreferrer'> pdf utils extension</a> in more complex use cases.
        </b>
      </div>
    ))
  }

  openHeaderFooter (type) {
    this.inform()

    Studio.openTab({
      _id: this.props.entity._id,
      docProp: `chrome.${type}Template`
    })
  }

  applyDefaultsToEntity (props) {
    const { entity } = props
    let entityNeedsDefault = false

    if (
      entity.__isNew &&
      (entity.chrome == null || entity.chrome.printBackground == null)
    ) {
      entityNeedsDefault = true
    }

    if (entityNeedsDefault) {
      this.changeChrome(props, {
        printBackground: true
      })
    }
  }

  changeChrome (props, change) {
    const { entity, onChange } = props
    const chrome = entity.chrome || {}

    onChange({
      ...entity,
      chrome: { ...chrome, ...change }
    })
  }

  render () {
    const { entity } = this.props
    const chrome = entity.chrome || {}
    const changeChrome = this.changeChrome

    return (
      <div className='properties-section'>
        <div className='form-group'><label>scale</label>
          <input
            type='text'
            placeholder='1'
            value={chrome.scale || ''}
            onChange={(v) => {
              let scaleValue = v.target.value

              if (scaleValue.trim() === '') {
                scaleValue = null
              }

              changeChrome(this.props, { scale: scaleValue })
            }}
          />
        </div>
        <div className='form-group'>
          <label>print background</label>
          <input
            type='checkbox'
            checked={chrome.printBackground === true}
            onChange={(v) => changeChrome(this.props, { printBackground: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>landscape</label>
          <input
            type='checkbox'
            checked={chrome.landscape === true}
            onChange={(v) => changeChrome(this.props, { landscape: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>pageRanges</label>
          <input
            type='text'
            placeholder='1-5, 8, 11-13'
            value={chrome.pageRanges || ''}
            onChange={(v) => changeChrome(this.props, { pageRanges: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>format</label>
          <input
            type='text'
            placeholder='Letter'
            value={chrome.format || ''}
            title='Specifies a pre-defined size for the pdf'
            onChange={(v) => changeChrome(this.props, { format: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>pdf width</label>
          <input
            type='text'
            placeholder='10cm'
            value={chrome.width || ''}
            title='Specifies a custom width for the pdf'
            onChange={(v) => changeChrome(this.props, { width: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>pdf height</label>
          <input
            type='text'
            placeholder='10cm'
            value={chrome.height || ''}
            title='Specifies a custom height for the pdf'
            onChange={(v) => changeChrome(this.props, { height: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>pdf margin top</label>
          <input
            type='text'
            placeholder='10cm'
            value={chrome.marginTop || ''}
            onChange={(v) => changeChrome(this.props, { marginTop: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>pdf margin right</label>
          <input
            type='text'
            placeholder='10cm'
            value={chrome.marginRight || ''}
            onChange={(v) => changeChrome(this.props, { marginRight: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>pdf margin bottom</label>
          <input
            type='text'
            placeholder='10cm'
            value={chrome.marginBottom || ''}
            onChange={(v) => changeChrome(this.props, { marginBottom: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>pdf margin left</label>
          <input
            type='text'
            placeholder='10cm'
            value={chrome.marginLeft || ''}
            onChange={(v) => changeChrome(this.props, { marginLeft: v.target.value })}
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
          <label>display header/footer</label>
          <input
            type='checkbox'
            checked={chrome.displayHeaderFooter === true}
            onChange={(v) => changeChrome(this.props, { displayHeaderFooter: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>header</label>
          <button onClick={() => this.openHeaderFooter('header')}>open in tab...</button>
        </div>
        <div className='form-group'>
          <label>footer</label>
          <button onClick={() => this.openHeaderFooter('footer')}>open in tab...</button>
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
            type='checkbox'
            checked={chrome.waitForNetworkIdle === true}
            onChange={(v) => changeChrome(this.props, { waitForNetworkIdle: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label title='window.JSREPORT_READY_TO_START=true;'>wait for printing trigger</label>
          <input
            type='checkbox'
            title='window.JSREPORT_READY_TO_START=true;' checked={chrome.waitForJS === true}
            onChange={(v) => changeChrome(this.props, { waitForJS: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}

export default ChromePdfProperties
