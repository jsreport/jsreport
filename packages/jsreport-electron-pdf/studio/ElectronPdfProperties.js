import React, { Component } from 'react'

class ElectronPdfProperties extends Component {
  constructor (props) {
    super(props)

    this.state = {
      customPaperFormat: false,
      paperWidth: null,
      paperHeight: null
    }
  }

  getStandardFormats () {
    return [{
      name: 'A4',
      value: 'A4'
    }, {
      name: 'A3',
      value: 'A3'
    }, {
      name: 'Legal',
      value: 'Legal'
    }, {
      name: 'Letter',
      value: 'Letter'
    }, {
      name: 'Tabloid',
      value: 'Tabloid'
    }]
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

  changeCustomPaperSize ({ width, height, customPaperFormat }) {
    const { paperWidth, paperHeight } = this.state
    const { entity, onChange } = this.props
    const stateToSet = {}
    const paperSize = {}

    if (customPaperFormat === false) {
      stateToSet.customPaperFormat = customPaperFormat
      stateToSet.paperWidth = null
      stateToSet.paperHeight = null

      onChange({ ...entity, electron: { ...entity.electron, format: 'A4' } })
    } else {
      if (customPaperFormat != null) {
        stateToSet.customPaperFormat = customPaperFormat
      }

      if (width != null) {
        if (!isNaN(parseInt(width, 10))) {
          paperSize.width = parseInt(width, 10)
        } else {
          paperSize.width = null
        }
      } else {
        paperSize.width = paperWidth
      }

      if (height != null) {
        if (!isNaN(parseInt(height, 10))) {
          paperSize.height = parseInt(height, 10)
        } else {
          paperSize.height = null
        }
      } else {
        paperSize.height = paperHeight
      }

      stateToSet.paperWidth = paperSize.width
      stateToSet.paperHeight = paperSize.height

      if (paperSize.width != null || paperSize.height != null) {
        onChange({ ...entity, electron: { ...entity.electron, format: JSON.stringify(paperSize) } })
      } else {
        onChange({ ...entity, electron: { ...entity.electron, format: null } })
      }
    }

    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet)
    }
  }

  normalizeUIState (entity) {
    const stateToSet = {}

    if (entity.__isNew) {
      stateToSet.customPaperFormat = false
      stateToSet.paperWidth = null
      stateToSet.paperHeight = null
    } else {
      stateToSet.customPaperFormat = false
      stateToSet.paperWidth = null
      stateToSet.paperHeight = null

      if (entity.electron && entity.electron.format) {
        const standardFormats = this.getStandardFormats().map(format => format.value)
        let customFormat

        if (standardFormats.indexOf(entity.electron.format) === -1) {
          try {
            customFormat = JSON.parse(entity.electron.format)
          } catch (e) {}

          if (customFormat) {
            stateToSet.customPaperFormat = true

            if (customFormat.width != null) {
              stateToSet.paperWidth = customFormat.width
            }

            if (customFormat.height != null) {
              stateToSet.paperHeight = customFormat.height
            }
          }
        }
      }
    }

    if (Object.keys(stateToSet).length > 0) {
      this.setState(stateToSet)
    }
  }

  render () {
    const { customPaperFormat, paperWidth, paperHeight } = this.state
    const { entity, onChange } = this.props
    const electron = entity.electron || {}

    const change = (change) => onChange({ ...entity, electron: { ...entity.electron, ...change } })

    return (
      <div className='properties-section'>
        <div className='form-group'><label>Margin type</label>
          <select value={electron.marginsType || 0} onChange={(v) => change({ marginsType: parseInt(v.target.value) })}>
            <option key='0' value='0'>Default</option>
            <option key='1' value='1'>None</option>
            <option key='2' value='2'>Minimum</option>
          </select>
        </div>
        <div className='form-group'>
          <label>Paper format</label>
          <label>
            <input
              type='checkbox' checked={customPaperFormat === true}
              onChange={(v) => this.changeCustomPaperSize({ customPaperFormat: v.target.checked })}
            />
            Use custom format
          </label>
          {customPaperFormat && (
            <div>
              <label style={{ display: 'block' }}>
                Paper width <a href='https://en.wikipedia.org/wiki/Micrometre' target='_blank' rel='noreferrer'>(in microns)</a>
              </label>
              <input
                style={{ display: 'block', width: '100%' }}
                type='text' placeholder='148000' value={paperWidth}
                onChange={(v) => this.changeCustomPaperSize({ width: v.target.value })}
              />
            </div>
          )}
          {customPaperFormat && (
            <div>
              <label style={{ display: 'block' }}>
                Paper height <a href='https://en.wikipedia.org/wiki/Micrometre' target='_blank' rel='noreferrer'>(in microns)</a>
              </label>
              <input
                style={{ display: 'block', width: '100%' }}
                type='text' placeholder='210000' value={paperHeight}
                onChange={(v) => this.changeCustomPaperSize({ height: v.target.value })}
              />
            </div>
          )}
          {customPaperFormat && (
            <div>
              <span>
                <i>
                  <a href='http://www.papersizes.org/a-sizes-all-units.htm' target='_blank' rel='noreferrer'>
                    See this for common paper sizes in microns
                  </a>
                </i>
              </span>
            </div>
          )}
          {!customPaperFormat && (
            <select value={electron.format || ''} onChange={(v) => change({ format: v.target.value })}>
              {this.getStandardFormats().map((paperFormat) => (
                <option key={paperFormat.name} value={paperFormat.value}>{paperFormat.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className='form-group'><label>Web Page width</label>
          <input
            type='text' placeholder='600' value={electron.width || ''}
            onChange={(v) => change({ width: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Web Page height</label>
          <input
            type='text' placeholder='600' value={electron.height || ''}
            onChange={(v) => change({ height: v.target.value })}
          />
        </div>
        <div className='form-group'><label>Orientation</label>
          <select value={electron.landscape + ''} onChange={(v) => change({ landscape: v.target.value === 'true' })}>
            <option key='false' value='false'>Portrait</option>
            <option key='true' value='true'>Landscape</option>
          </select>
        </div>
        <div className='form-group'><label>Print background</label>
          <input
            type='checkbox' checked={electron.printBackground === true}
            onChange={(v) => change({ printBackground: v.target.checked })}
          />
        </div>

        <div className='form-group'><label>Print delay</label>
          <input
            type='text' placeholder='800' value={electron.printDelay || ''}
            onChange={(v) => change({ printDelay: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label title='window.JSREPORT_READY_TO_START=true;'>Wait for printing trigger</label>
          <input
            type='checkbox' title='window.JSREPORT_READY_TO_START=true;' checked={electron.waitForJS === true}
            onChange={(v) => change({ waitForJS: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>Block javascript</label>
          <input
            type='checkbox' checked={electron.blockJavaScript === true}
            onChange={(v) => change({ blockJavaScript: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}

export default ElectronPdfProperties
