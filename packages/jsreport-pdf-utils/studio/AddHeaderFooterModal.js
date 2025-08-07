import { Component, useState, useRef, useEffect, useCallback } from 'react'
import Studio from 'jsreport-studio'

const Content = (props) => {
  const { close, options } = props
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [templateName, setTemplateName] = useState('header-footer')
  const [pageMargin, setPageMargin] = useState('2cm')
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
      setError(`New header/footer template validation error: ${e.message}`)

      return
    }

    let newHeaderFooterTemplate

    try {
      const response = await Studio.api.post('/odata/templates', {
        data: {
          name: templateName,
          content: getDefaultHeaderFooterContent(),
          engine: 'handlebars',
          recipe: mainTemplate.recipe,
          helpers: getDefaultHeaderFooterHelpers(),
          folder: mainTemplate.folder != null ? { shortid: mainTemplate.folder.shortid } : null
        }
      }, true)

      response.__entitySet = 'templates'

      newHeaderFooterTemplate = Object.assign({}, response)

      Studio.addExistingEntity(newHeaderFooterTemplate)
    } catch (e) {
      setProcessing(false)
      setError(`Add new template "${templateName}" error: ${e.message}`)

      return
    }

    try {
      const updateChanges = {
        pdfOperations: [...(mainTemplate.pdfOperations || []), {
          type: 'merge',
          templateShortid: newHeaderFooterTemplate.shortid,
          mergeWholeDocument: true
        }]
      }

      if (mainTemplate.recipe === 'chrome-pdf') {
        updateChanges.chrome = {
          ...mainTemplate.chrome,
          marginTop: pageMargin,
          marginBottom: pageMargin
        }
      }

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

    await Studio.openTab(newHeaderFooterTemplate)

    close()
  }, [processing, templateName, mainTemplate])

  return (
    <div>
      <div>
        <h3>Add header/footer</h3>
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
      <div className='form-group'>
        <label>Top/Bottom Page margin</label>
        <input
          type='text'
          placeholder='2cm'
          value={pageMargin}
          onChange={(e) => setPageMargin(e.target.value)}
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

class AddHeaderFooterModal extends Component {
  render () {
    return (
      <Content {...this.props} />
    )
  }
}

function getDefaultHeaderFooterContent () {
  return (
`<html>
    <head>
        <style>
          * {
              box-sizing: border-box;
          }

          html, body {
              margin: 0px;
              padding: 0px;
          }

          .main {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              width: 100%;
              height: 100vh;
          }

          .header {
              width: 100%;
              padding-top: 20px;
              border-bottom: 1px solid black;
          }

          .footer {
              width: 100%;
              padding-bottom: 20px;
              border-top: 1px solid black;
          }
        </style>
    </head>
    <body>
        {{#each $pdf.pages}}
          {{#if @index}}
            <div style="page-break-before: always;"></div>
          {{/if}}
          <main class="main">
            <header class="header">
              Header
            </header>
            <footer class="footer">
                <span>Page {{getPageNumber @index}} of {{getTotalPages ../$pdf.pages}}</span>
            </footer>
          </main>
        {{/each}}
    </body>
</html>
`
  )
}

function getDefaultHeaderFooterHelpers () {
  return (
`function getPageNumber (pageIndex) {
    if (pageIndex == null) {
        return ''
    }

    const pageNumber = pageIndex + 1

    return pageNumber
}

function getTotalPages (pages) {
    if (!pages) {
        return ''
    }

    return pages.length
}
`
  )
}

export default AddHeaderFooterModal
