import * as Constants from './constants.js'
import React, { Component } from 'react'
import Studio from 'jsreport-studio'

class PhantomPdfProperties extends Component {
  constructor (props) {
    super(props)

    this.state = {
      customMargin: false,
      marginOptions: undefined
    }
  }

  componentDidMount () {
    this.normalizeUIState(this.props.entity)
  }

  componentDidUpdate (prevProps) {
    // when component changes because another entity is selected
    // or when saving a new entity
    if (prevProps.entity._id !== this.props.entity._id) {
      this.normalizeUIState(this.props.entity)
    }
  }

  normalizeUIState (entity) {
    const stateToSet = {}

    stateToSet.customMargin = false
    stateToSet.marginOptions = undefined

    if (entity.phantom && entity.phantom.margin) {
      let customMargin

      if (entity.phantom.margin.trim()[0] === '{') {
        try {
          customMargin = JSON.parse(entity.phantom.margin)
        } catch (e) {}

        if (customMargin) {
          stateToSet.customMargin = true

          if (
            customMargin.top != null ||
            customMargin.left != null ||
            customMargin.right != null ||
            customMargin.bottom != null
          ) {
            stateToSet.marginOptions = customMargin
          }
        }
      }
    }

    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet)
    }
  }

  changeCustomMargin ({ left, right, top, bottom, customMargin }) {
    const {
      marginOptions: {
        top: marginTop,
        left: marginLeft,
        right: marginRight,
        bottom: marginBottom
      } = {}
    } = this.state
    const { entity, onChange } = this.props
    const stateToSet = {}
    const margin = {}

    if (customMargin === false) {
      stateToSet.customMargin = customMargin
      stateToSet.marginOptions = undefined

      onChange({ ...entity, phantom: { ...entity.phantom, margin: '' } })
    } else {
      if (customMargin != null) {
        stateToSet.customMargin = customMargin
      }

      if (top != null) {
        margin.top = top
      } else {
        margin.top = marginTop
      }

      if (left != null) {
        margin.left = left
      } else {
        margin.left = marginLeft
      }

      if (right != null) {
        margin.right = right
      } else {
        margin.right = marginRight
      }

      if (bottom != null) {
        margin.bottom = bottom
      } else {
        margin.bottom = marginBottom
      }

      stateToSet.marginOptions = margin

      if (
        margin.top != null ||
        margin.left != null ||
        margin.right != null ||
        margin.bottom != null
      ) {
        onChange({ ...entity, phantom: { ...entity.phantom, margin: JSON.stringify(margin) } })
      } else {
        onChange({ ...entity, phantom: { ...entity.phantom, margin: '' } })
      }
    }

    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet)
    }
  }

  openHeaderFooter (type) {
    Studio.openTab({
      key: this.props.entity._id + '_phantom' + type,
      _id: this.props.entity._id,
      headerOrFooter: type,
      editorComponentKey: Constants.PHANTOM_TAB_EDITOR,
      titleComponentKey: Constants.PHANTOM_TAB_TITLE
    })
  }

  render () {
    const { customMargin, marginOptions = {} } = this.state
    const { entity, onChange } = this.props
    const phantom = entity.phantom || {}

    const changePhantom = (change) => onChange({ ...entity, phantom: { ...entity.phantom, ...change } })

    const phantoms = Studio.extensions['phantom-pdf'].options.phantoms

    return (
      <div className='properties-section'>
        <div className='form-group'><label>phantomjs version</label>
          <select value={phantom.phantomjsVersion || phantoms[0].version} onChange={(v) => changePhantom({ phantomjsVersion: v.target.value })}>
            {phantoms.map((p) => <option key={p.version} value={p.version}>{p.version}</option>)}
          </select>
        </div>

        <div className='form-group'>
          <label>margin</label>
          <label>
            <input
              type='checkbox' checked={customMargin === true}
              onChange={(v) => this.changeCustomMargin({ customMargin: v.target.checked })}
            />
            Use custom margin
          </label>
          {customMargin && (
            <div>
              <label style={{ display: 'block' }}>Margin left</label>
              <input
                style={{ display: 'block', width: '100%' }}
                type='text' placeholder='8px' value={marginOptions.left}
                onChange={(v) => this.changeCustomMargin({ left: v.target.value })}
              />
            </div>
          )}
          {customMargin && (
            <div>
              <label style={{ display: 'block' }}>Margin right</label>
              <input
                style={{ display: 'block', width: '100%' }}
                type='text' placeholder='8px' value={marginOptions.right}
                onChange={(v) => this.changeCustomMargin({ right: v.target.value })}
              />
            </div>
          )}
          {customMargin && (
            <div>
              <label style={{ display: 'block' }}>Margin top</label>
              <input
                style={{ display: 'block', width: '100%' }}
                type='text' placeholder='8px' value={marginOptions.top}
                onChange={(v) => this.changeCustomMargin({ top: v.target.value })}
              />
            </div>
          )}
          {customMargin && (
            <div>
              <label style={{ display: 'block' }}>Margin bottom</label>
              <input
                style={{ display: 'block', width: '100%' }}
                type='text' placeholder='8px' value={marginOptions.bottom}
                onChange={(v) => this.changeCustomMargin({ bottom: v.target.value })}
              />
            </div>
          )}
          {!customMargin && (
            <input
              type='text' placeholder='1cm' value={phantom.margin || ''}
              onChange={(v) => changePhantom({ margin: v.target.value })}
            />
          )}
        </div>

        <div className='form-group'><label>header height</label>
          <input
            type='text' placeholder='1cm' value={phantom.headerHeight || ''}
            onChange={(v) => changePhantom({ headerHeight: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>header</label>
          <button onClick={() => this.openHeaderFooter('header')}>open in tab...</button>
        </div>

        <div className='form-group'><label>footer height</label>
          <input
            type='text' placeholder='1cm' value={phantom.footerHeight || ''}
            onChange={(v) => changePhantom({ footerHeight: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>footer</label>
          <button onClick={() => this.openHeaderFooter('footer')}>open in tab...</button>
        </div>

        <div className='form-group'><label>paper format</label>
          <select value={phantom.format || ''} onChange={(v) => changePhantom({ format: v.target.value })}>
            <option key='A4' value='A4'>A4</option>
            <option key='A3' value='A3'>A3</option>
            <option key='A5' value='A5'>A5</option>
            <option key='Legal' value='Legal'>Legal</option>
            <option key='Letter' value='Letter'>Letter</option>
            <option key='Tabloid' value='Tabloid'>Tabloid</option>
          </select>
        </div>

        <div className='form-group'><label>paper width</label>
          <input
            type='text' placeholder='1cm' value={phantom.width || ''}
            onChange={(v) => changePhantom({ width: v.target.value })}
          />
        </div>
        <div className='form-group'><label>paper height</label>
          <input
            type='text' placeholder='1cm' value={phantom.height || ''}
            onChange={(v) => changePhantom({ height: v.target.value })}
          />
        </div>

        <div className='form-group'><label>orientation</label>
          <select value={phantom.orientation || ''} onChange={(v) => changePhantom({ orientation: v.target.value })}>
            <option key='portrait' value='portrait'>portrait</option>
            <option key='landscape' value='landscape'>landscape</option>
          </select>
        </div>

        <div className='form-group'><label>print delay</label>
          <input
            type='text' placeholder='1000' value={phantom.printDelay || ''}
            onChange={(v) => changePhantom({ printDelay: v.target.value })}
          />
        </div>

        <div className='form-group'><label>resource timeout</label>
          <input
            type='text' placeholder='1000' value={phantom.resourceTimeout || ''}
            onChange={(v) => changePhantom({ resourceTimeout: v.target.value })}
          />
        </div>

        <div className='form-group'>
          <label title='window.JSREPORT_READY_TO_START=true;'>wait for printing trigger</label>
          <input
            type='checkbox' title='window.JSREPORT_READY_TO_START=true;' checked={phantom.waitForJS === true}
            onChange={(v) => changePhantom({ waitForJS: v.target.checked })}
          />
        </div>

        <div className='form-group'>
          <label>block javascript</label>
          <input
            type='checkbox' checked={phantom.blockJavaScript === true}
            onChange={(v) => changePhantom({ blockJavaScript: v.target.checked })}
          />
        </div>

        <div className='form-group'>
          <label>fit to page</label>
          <input
            type='checkbox' checked={phantom.fitToPage === true}
            onChange={(v) => changePhantom({ fitToPage: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>use custom phantomjs (deprecated)</label>
          <input
            type='checkbox' checked={phantom.customPhantomJS === true}
            onChange={(v) => changePhantom({ customPhantomJS: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}

export default PhantomPdfProperties
