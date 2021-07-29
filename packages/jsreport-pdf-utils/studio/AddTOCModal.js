import { Component, useState, useRef, useEffect, useCallback } from 'react'
import Studio from 'jsreport-studio'

const Content = (props) => {
  const { close, options } = props
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [templateName, setTemplateName] = useState('toc')
  const nameInputRef = useRef(null)

  const { entity: mainTemplate } = options

  useEffect(() => {
    nameInputRef.current && nameInputRef.current.focus()
  }, [])

  const handleSave = useCallback(async () => {
    if (processing) {
      return
    }

    setError(null)
    setProcessing(true)

    try {
      await Studio.api.post('/studio/validate-entity-name', {
        data: {
          name: templateName,
          entitySet: 'templates',
          folderShortid: mainTemplate.folder != null ? mainTemplate.folder.shortid : null
        }
      }, true)
    } catch (e) {
      setProcessing(false)
      setError(`New table of contents template validation error: ${e.message}`)

      return
    }

    let newTOCTemplate

    try {
      const response = await Studio.api.post('/odata/templates', {
        data: {
          name: templateName,
          content: getDefaultTOCContent(),
          engine: 'handlebars',
          recipe: mainTemplate.recipe,
          helpers: getDefaultTOCHelpers(),
          chrome: mainTemplate.recipe === 'chrome-pdf' ? { marginTop: (mainTemplate.chrome || {}).marginTop || undefined, marginLeft: (mainTemplate.chrome || {}).marginLeft, marginRight: (mainTemplate.chrome || {}).marginRight, marginBottom: (mainTemplate.chrome || {}).marginBottom || undefined } : mainTemplate.chrome,
          folder: mainTemplate.folder != null ? { shortid: mainTemplate.folder.shortid } : null
        }
      }, true)

      response.__entitySet = 'templates'

      newTOCTemplate = Object.assign({}, response)

      Studio.addExistingEntity(newTOCTemplate)
    } catch (e) {
      setProcessing(false)
      setError(`Add new template "${templateName}" error: ${e.message}`)

      return
    }

    try {
      const updateChanges = {
        pdfOperations: [...(mainTemplate.pdfOperations || []), {
          type: 'merge',
          templateShortid: newTOCTemplate.shortid,
          mergeWholeDocument: true
        }]
      }

      updateChanges.content = `${getDefaultTOCContentForMainTemplate()}\n${(mainTemplate.content || '')}`
      updateChanges.helpers = `${getDefaultTOCHelpersForMainTemplate()}\n${(mainTemplate.helpers || '')}`

      await Studio.updateEntity({
        _id: mainTemplate._id,
        ...updateChanges
      })

      await Studio.saveEntity(mainTemplate._id)
    } catch (e) {
      setProcessing(false)
      setError(`Update template "${mainTemplate.name}" error: ${e.message}`)

      return
    }

    await Studio.openTab(newTOCTemplate)

    close()
  }, [processing, templateName, mainTemplate])

  return (
    <div>
      <div>
        <h3>Add Table of Contents</h3>
      </div>
      <div className='form-group' style={{ marginLeft: '0px', marginRight: '0px' }}>
        <span style={{ color: 'red', display: error ? 'block' : 'none' }}>{error}</span>
      </div>
      <div className='form-group'>
        <label>Template</label>
        <input
          type='text'
          placeholder='name...'
          ref={nameInputRef}
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />
      </div>
      <div className='button-bar'>
        <button className='button danger' onClick={() => close()}>
          Cancel
        </button>
        <button className='button confirmation' onClick={() => handleSave()}>
          Ok
        </button>
      </div>
    </div>
  )
}

class AddTOCModal extends Component {
  render () {
    return (
      <Content {...this.props} />
    )
  }
}

function getDefaultTOCContent () {
  return (
`<style>
    html, body {
        margin: 0px;
        padding: 0px;
        /*this disables the scrollbars of page thus making the available with the same on both renders*/
        /*this is needed to have the TOC page at the same position than the main template.*/
        overflow: hidden;
    }

    .toc-title {
        margin-top: 0px;
        text-align: center;
        font-size: 24px;
        font-family: arial;
    }

    .toc-content {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        border-bottom: 1px dashed rgb(200, 200, 200);
    }

    .toc span {
        font-size: 16px;
        text-align: right;
    }

    .toc li {
        list-style: none;
        padding-bottom: 5px;
    }

    .toc ul {
        font-size: 20px;
        font-family: arial;
    }

    .toc ul ul,
    .toc ul ul span {
        font-size: 0.8em;
    }

    .toc ul {
        padding-left: 0em;
    }

    .toc ul ul {
        padding-left: 15px;
    }

    .toc a {
        text-decoration: none;
        color: black;
    }

    .toc-no-border {
        border-bottom-color: transparent;
    }

    .toc-hidden {
        visibility: hidden;
    }
</style>

<div class='toc'>
    <h1 class='toc-title {{{addClassOnPdfMerge @root "toc-hidden"}}}'>Table of contents</h1>
    <ul>
        {{#level (getChapters) null}}
        <li>
            <div class='toc-content {{{addClassOnPdfMerge @root "toc-no-border"}}}'>
                <a class='{{{addClassOnPdfMerge @root "toc-hidden"}}}' href='#{{id}}' data-pdf-outline data-pdf-outline-parent='{{parent}}'>
                    {{title}}
                </a>
                <span>{{getPage @root id}}</span>
            </div>
        </li>
        {{/level}}
    </ul>
</div>
`
  )
}

function getDefaultTOCHelpers () {
  return (
`function addClassOnPdfMerge(root, c) {
    if (root.$pdf) {
        return c
    }
    return ''
}

function level(chapters, parent, opts) {
    let res = ''

    for (const ch of chapters) {
        res += opts.fn({
            ...ch,
            parent
        })

        if (ch.chapters) {
            res += '<ul>' + level(ch.chapters, ch.id, opts) + '</ul>'
        }
    }

    return res
}

function getPage(root, id) {
    if (!root.$pdf) {
        // the main template
        return ''
    }

    for (let i = 0; i < root.$pdf.pages.length; i++) {
        const item = root.$pdf.pages[i].items.find(item => item.id === id)

        if (item) {
            return i + 1
        }
    }
}

function getChapters() {
    // NOTE: replace this and return something based on your real data
    return [{
        "id": "1",
        "title": "The Song of the Bow",
        "chapters": [{
            "id": "4",
            "title": "A Forgotten Tale"
        }, {
            "id": "5",
            "title": "Pennarry Mine"
        }]
    }, {
        "id": "2",
        "title": "Cremona"
    }, {
        "id": "3",
        "title": "The Storming Party"
    }]
}
`
  )
}

function getDefaultTOCContentForMainTemplate () {
  return (
`<!--
    TOC
    -----------
    we render TOC template twice
    the first in the main template - this is needed for inner pdf links
    the second time it is rendered as merge operation in pdf utils - this is needed to for gettign page numbers in TOC
-->
{#child ./toc @template.recipe=html}
{{#level (getChapters)}}
    <div style='page-break-before: always;'></div>
    <h1 id="{{id}}">{{title}}</h1>
    <!-- pdf utils page item is used for getting page numbers in TOC template -->
    {{{pdfAddPageItem id=id}}}
{{/level}}
<!-- END TOC -->
`
  )
}

function getDefaultTOCHelpersForMainTemplate () {
  return (
`function getChapters() {
    // NOTE: replace this and return something based on your real data
    return [{
        "id": "1",
        "title": "The Song of the Bow",
        "chapters": [{
            "id": "4",
            "title": "A Forgotten Tale"
        }, {
            "id": "5",
            "title": "Pennarry Mine"
        }]
    }, {
        "id": "2",
        "title": "Cremona"
    }, {
        "id": "3",
        "title": "The Storming Party"
    }]
}

function level(chapters, opts) {
    let res = ''

    for (const ch of chapters) {
        res += opts.fn(ch)

        if (ch.chapters) {
            res += level(ch.chapters, opts)
        }
    }

    return res
}
`
  )
}

export default AddTOCModal
