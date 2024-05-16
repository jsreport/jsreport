import React, { Component } from 'react'

class HtmlToTextProperties extends Component {
  constructor (props) {
    super(props)

    this.applyDefaultsToEntity = this.applyDefaultsToEntity.bind(this)
    this.changeHtmlToText = this.changeHtmlToText.bind(this)
  }

  componentDidMount () {
    this.applyDefaultsToEntity(this.props)
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.entity._id !== this.props.entity._id) {
      this.applyDefaultsToEntity(this.props)
    }
  }

  applyDefaultsToEntity (props) {
    const { entity } = props
    let entityNeedsDefault = false

    if (
      entity.__isNew ||
      (
        entity.htmlToText == null ||
        entity.htmlToText.decodeEntities == null ||
        entity.htmlToText.uppercaseHeadings == null ||
        entity.htmlToText.returnDomByDefault == null
      )
    ) {
      entityNeedsDefault = true
    }

    if (entityNeedsDefault) {
      const newProps = {}

      if (entity.htmlToText == null || entity.htmlToText.decodeEntities == null) {
        newProps.decodeEntities = true
      }

      if (entity.htmlToText == null || entity.htmlToText.uppercaseHeadings == null) {
        newProps.uppercaseHeadings = true
      }

      if (entity.htmlToText == null || entity.htmlToText.returnDomByDefault == null) {
        newProps.returnDomByDefault = true
      }

      this.changeHtmlToText(props, newProps)
    }
  }

  changeHtmlToText (props, change) {
    const { entity, onChange } = props
    const htmlToText = entity.htmlToText || {}

    onChange({
      ...entity,
      htmlToText: { ...htmlToText, ...change }
    })
  }

  render () {
    const { entity } = this.props
    const recipeProps = entity.htmlToText || {}
    const changeHtmlToText = this.changeHtmlToText

    return (
      <div className='properties-section'>
        <div className='form-group'><label>tables</label>
          <input
            title='Comma separated css selectors of tables to pick' placeholder='#invoice, .address'
            value={recipeProps.tables}
            onChange={(v) => changeHtmlToText(this.props, { tables: v.target.value })}
          />
        </div>
        <div className='form-group'><label>select all tables</label>
          <input
            title='Select all tables'
            type='checkbox'
            checked={recipeProps.tablesSelectAll === true}
            onChange={(v) => changeHtmlToText(this.props, { tablesSelectAll: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>word wrap</label>
          <input
            title='Wrap the line after x characters' type='number' placeholder='80' min='0' max='1000'
            value={recipeProps.wordWrap != null && recipeProps.wordWrap !== '' ? recipeProps.wordWrap : ''}
            onChange={(v) => {
              const targetValue = parseInt(v.target.value)
              changeHtmlToText(this.props, { wordWrap: isNaN(targetValue) ? null : targetValue })
            }}
          />
          <span><i>when set to 0 word wrap is disabled</i></span>
        </div>
        <div className='form-group'><label>linkHrefBaseUrl</label>
          <input
            title='linkHrefBaseUrl' placeholder='/' value={recipeProps.linkHrefBaseUrl}
            onChange={(v) => changeHtmlToText(this.props, { linkHrefBaseUrl: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>hideLinkHrefIfSameAsText</label>
          <input type='checkbox' checked={recipeProps.hideLinkHrefIfSameAsText === true} onChange={(v) => changeHtmlToText(this.props, { hideLinkHrefIfSameAsText: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>ignoreHref</label>
          <input type='checkbox' checked={recipeProps.ignoreHref === true} onChange={(v) => changeHtmlToText(this.props, { ignoreHref: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>ignoreImage</label>
          <input type='checkbox' checked={recipeProps.ignoreImage === true} onChange={(v) => changeHtmlToText(this.props, { ignoreImage: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>preserveNewlines</label>
          <input type='checkbox' checked={recipeProps.preserveNewlines === true} onChange={(v) => changeHtmlToText(this.props, { preserveNewlines: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>decodeEntities</label>
          <input
            type='checkbox'
            title='decodeEntities'
            checked={recipeProps.decodeEntities === true}
            onChange={(v) => changeHtmlToText(this.props, { decodeEntities: v.target.checked })}
          />
        </div>
        <div className='form-group'>
          <label>uppercaseHeadings</label>
          <input type='checkbox' checked={recipeProps.uppercaseHeadings !== false} onChange={(v) => changeHtmlToText(this.props, { uppercaseHeadings: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>singleNewLineParagraphs</label>
          <input type='checkbox' checked={recipeProps.singleNewLineParagraphs === true} onChange={(v) => changeHtmlToText(this.props, { singleNewLineParagraphs: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>baseElement</label>
          <input
            title='Comma separated css selectors of element to pick content' placeholder='#content, #content2'
            value={recipeProps.baseElement}
            onChange={(v) => changeHtmlToText(this.props, { baseElement: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>returnDomByDefault</label>
          <input type='checkbox' checked={recipeProps.returnDomByDefault === true} onChange={(v) => changeHtmlToText(this.props, { returnDomByDefault: v.target.checked })} />
        </div>
        <div className='form-group'><label>longWordSplitWrapCharacters</label>
          <input
            title='Comma separated characters that may be wrapped on, these are used in order'
            value={recipeProps.longWordSplitWrapCharacters}
            onChange={(v) => changeHtmlToText(this.props, { longWordSplitWrapCharacters: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>longWordSplitForceWrapOnLimit</label>
          <input type='checkbox' checked={recipeProps.longWordSplitForceWrapOnLimit === true} onChange={(v) => changeHtmlToText(this.props, { longWordSplitForceWrapOnLimit: v.target.checked })} />
        </div>
      </div>
    )
  }
}

export default HtmlToTextProperties
