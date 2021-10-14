import React, { Component } from 'react'
import Studio from 'jsreport-studio'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

class HtmlToXlsxProperties extends Component {
  static selectAssets (entities) {
    return Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets').map((k) => entities[k])
  }

  static title (entity, entities) {
    if (
      (!entity.htmlToXlsx || !entity.htmlToXlsx.templateAssetShortid)
    ) {
      return 'xlsx template'
    }

    const foundAssets = HtmlToXlsxProperties.selectAssets(entities).filter((e) => entity.htmlToXlsx != null && entity.htmlToXlsx.templateAssetShortid === e.shortid)

    if (!foundAssets.length) {
      return 'xlsx template'
    }

    const name = foundAssets[0].name

    return 'xlsx template: ' + name
  }

  constructor (props) {
    super(props)

    this.applyDefaultsToEntity = this.applyDefaultsToEntity.bind(this)
    this.changeHtmlToXlsx = this.changeHtmlToXlsx.bind(this)
  }

  componentDidMount () {
    this.applyDefaultsToEntity(this.props)
    this.removeInvalidHtmlEngine()
    this.removeInvalidXlsxTemplateReferences()
  }

  componentDidUpdate (prevProps) {
    // when component changes because another template is created
    if (prevProps.entity._id !== this.props.entity._id) {
      this.applyDefaultsToEntity(this.props)
    }

    this.removeInvalidHtmlEngine()
    this.removeInvalidXlsxTemplateReferences()
  }

  removeInvalidXlsxTemplateReferences () {
    const { entity, entities } = this.props

    if (!entity.htmlToXlsx) {
      return
    }

    const updatedXlsxAssets = Object.keys(entities).filter((k) => entities[k].__entitySet === 'assets' && entity.htmlToXlsx != null && entities[k].shortid === entity.htmlToXlsx.templateAssetShortid)

    if (entity.htmlToXlsx && entity.htmlToXlsx.templateAssetShortid && updatedXlsxAssets.length === 0) {
      this.changeHtmlToXlsx(this.props, {
        templateAssetShortid: null
      })
    }
  }

  removeInvalidHtmlEngine () {
    const { entity } = this.props

    if (!entity.htmlToXlsx || !entity.htmlToXlsx.htmlEngine) {
      return
    }

    const htmlEngines = Studio.extensions['html-to-xlsx'].options.htmlEngines
    const isValidHtmlEngine = htmlEngines.includes(entity.htmlToXlsx.htmlEngine)

    if (!isValidHtmlEngine) {
      this.changeHtmlToXlsx(this.props, { htmlEngine: htmlEngines[0] })
    }
  }

  applyDefaultsToEntity (props) {
    const { entity } = props
    const htmlEngines = Studio.extensions['html-to-xlsx'].options.htmlEngines
    let entityNeedsDefault = false

    if (
      entity.__isNew ||
      (entity.htmlToXlsx == null || entity.htmlToXlsx.htmlEngine == null)
    ) {
      entityNeedsDefault = true
    }

    if (htmlEngines != null && htmlEngines[0] != null && entityNeedsDefault) {
      this.changeHtmlToXlsx(props, {
        htmlEngine: htmlEngines[0]
      })
    }
  }

  changeHtmlToXlsx (props, change) {
    const { entity, onChange } = props
    const htmlToXlsx = entity.htmlToXlsx || {}

    onChange({
      ...entity,
      htmlToXlsx: { ...htmlToXlsx, ...change }
    })
  }

  render () {
    const { entity } = this.props
    const htmlToXlsx = entity.htmlToXlsx || {}
    const htmlEngines = Studio.extensions['html-to-xlsx'].options.htmlEngines

    return (
      <div className='properties-section'>
        <div className='form-group'>
          <label>html engine</label>
          <select
            value={htmlToXlsx.htmlEngine}
            onChange={(v) => this.changeHtmlToXlsx(this.props, { htmlEngine: v.target.value })}
          >
            {htmlEngines.map((engine) => (
              <option key={engine} value={engine}>{engine}</option>
            ))}
          </select>
        </div>
        <div className='form-group'>
          <label>xlsx asset</label>
          <EntityRefSelect
            headingLabel='Select xlsx template'
            newLabel='New xlsx asset for template'
            filter={(references) => ({ data: references.assets })}
            value={entity.htmlToXlsx ? entity.htmlToXlsx.templateAssetShortid : null}
            onChange={(selected) => this.changeHtmlToXlsx(this.props, {
              templateAssetShortid: selected != null && selected.length > 0 ? selected[0].shortid : null
            })}
            renderNew={(modalProps) => <sharedComponents.NewAssetModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
          />
        </div>
        {htmlToXlsx.htmlEngine !== 'cheerio' && (
          <div className='form-group'>
            <label title='window.JSREPORT_READY_TO_START=true;'>wait for conversion trigger</label>
            <input
              type='checkbox' title='window.JSREPORT_READY_TO_START=true;' checked={htmlToXlsx.waitForJS === true}
              onChange={(v) => this.changeHtmlToXlsx(this.props, { waitForJS: v.target.checked })}
            />
          </div>
        )}
      </div>
    )
  }
}

export default HtmlToXlsxProperties
