import React, { Component } from 'react'

class HtmlToTextProperties extends Component {
  render () {
    const { entity, onChange } = this.props
    const recipeProps = entity.htmlToText || {}
    const changeProps = (change) => onChange(Object.assign({}, entity, { htmlToText: Object.assign({}, entity.htmlToText, change) }))

    return (
      <div className='properties-section'>
        <div className='form-group'><label>tables</label>
          <input
            title='Comma separated css selectors of tables to pick' placeholder='#invoice, .address'
            value={recipeProps.tables}
            onChange={(v) => changeProps({ tables: v.target.value })}
          />
        </div>
        <div className='form-group'><label>select all tables</label>
          <input
            title='Select all tables'
            type='checkbox'
            value={recipeProps.tablesSelectAll}
            onChange={(v) => changeProps({ tablesSelectAll: v.target.checked })}
          />
        </div>
        <div className='form-group'><label>word wrap</label>
          <input
            title='Wrap the line after x characters' type='number' placeholder='130' min='0' max='1000'
            value={recipeProps.wordwrap}
            onChange={(v) => changeProps({ wordwrap: parseInt(v.target.value) })}
          />
        </div>
        <div className='form-group'><label>linkHrefBaseUrl</label>
          <input
            title='linkHrefBaseUrl' placeholder='/' value={recipeProps.linkHrefBaseUrl}
            onChange={(v) => changeProps({ linkHrefBaseUrl: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>hideLinkHrefIfSameAsText</label>
          <input type='checkbox' checked={recipeProps.hideLinkHrefIfSameAsText === true} onChange={(v) => changeProps({ hideLinkHrefIfSameAsText: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>ignoreHref</label>
          <input type='checkbox' checked={recipeProps.ignoreHref === true} onChange={(v) => changeProps({ ignoreHref: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>ignoreImage</label>
          <input type='checkbox' checked={recipeProps.ignoreImage === true} onChange={(v) => changeProps({ ignoreImage: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>preserveNewlines</label>
          <input type='checkbox' checked={recipeProps.preserveNewlines === true} onChange={(v) => changeProps({ preserveNewlines: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>decodeOptions</label>
          <input
            title='decodeOptions'
            value={recipeProps.decodeOptions}
            onChange={(v) => changeProps({ decodeOptions: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>uppercaseHeadings</label>
          <input type='checkbox' checked={recipeProps.uppercaseHeadings !== false} onChange={(v) => changeProps({ uppercaseHeadings: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>singleNewLineParagraphs</label>
          <input type='checkbox' checked={recipeProps.singleNewLineParagraphs === true} onChange={(v) => changeProps({ singleNewLineParagraphs: v.target.checked })} />
        </div>
        <div className='form-group'>
          <label>baseElement</label>
          <input
            title='baseElement'
            value={recipeProps.baseElement}
            onChange={(v) => changeProps({ baseElement: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>returnDomByDefault</label>
          <input type='checkbox' checked={recipeProps.returnDomByDefault === true} onChange={(v) => changeProps({ returnDomByDefault: v.target.checked })} />
        </div>
        <div className='form-group'><label>longWordSplitWrapCharacters</label>
          <input
            title='Comma separated characters that may be wrapped on, these are used in order'
            value={recipeProps.longWordSplitWrapCharacters}
            onChange={(v) => changeProps({ longWordSplitWrapCharacters: v.target.value })}
          />
        </div>
        <div className='form-group'>
          <label>longWordSplitForceWrapOnLimit</label>
          <input type='checkbox' checked={recipeProps.longWordSplitForceWrapOnLimit === true} onChange={(v) => changeProps({ longWordSplitForceWrapOnLimit: v.target.checked })} />
        </div>
      </div>
    )
  }
}

export default HtmlToTextProperties
