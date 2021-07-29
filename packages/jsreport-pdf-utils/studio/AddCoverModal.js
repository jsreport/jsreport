import { Component, useState, useRef, useEffect, useCallback } from 'react'
import getCoverImgContent from './getCoverImgContent'
import Studio from 'jsreport-studio'

const Content = (props) => {
  const { close, options } = props
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [templateName, setTemplateName] = useState('cover')
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

    const newCoverAssetName = 'cover.jpg'

    try {
      await Studio.api.post('/studio/validate-entity-name', {
        data: {
          name: newCoverAssetName,
          entitySet: 'assets',
          folderShortid: mainTemplate.folder != null ? mainTemplate.folder.shortid : null
        }
      }, true)
    } catch (e) {
      setProcessing(false)
      setError(`New cover asset validation error: ${e.message}`)

      return
    }

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
      setError(`New cover template validation error: ${e.message}`)

      return
    }

    let newCoverAsset

    try {
      const response = await Studio.api.post('/odata/assets', {
        data: {
          name: newCoverAssetName,
          content: getCoverImgContent(),
          folder: mainTemplate.folder != null ? { shortid: mainTemplate.folder.shortid } : null
        }
      }, true)

      response.__entitySet = 'assets'

      newCoverAsset = Object.assign({}, response)

      Studio.addExistingEntity(newCoverAsset)
    } catch (e) {
      setProcessing(false)
      setError(`Add new asset "${newCoverAssetName}" error: ${e.message}`)

      return
    }

    let newCoverTemplate

    try {
      const response = await Studio.api.post('/odata/templates', {
        data: {
          name: templateName,
          content: getDefaultCoverContent(),
          engine: 'handlebars',
          recipe: mainTemplate.recipe,
          chrome: mainTemplate.recipe === 'chrome-pdf' ? { marginTop: '0px', marginLeft: '0px', marginRight: '0px', marginBottom: '0px' } : mainTemplate.chrome,
          folder: mainTemplate.folder != null ? { shortid: mainTemplate.folder.shortid } : null
        }
      }, true)

      response.__entitySet = 'templates'

      newCoverTemplate = Object.assign({}, response)

      Studio.addExistingEntity(newCoverTemplate)
    } catch (e) {
      setProcessing(false)
      setError(`Add new template "${templateName}" error: ${e.message}`)

      return
    }

    try {
      const updateChanges = {
        pdfOperations: [...(mainTemplate.pdfOperations || []), {
          type: 'prepend',
          templateShortid: newCoverTemplate.shortid
        }]
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

    await Studio.openTab(newCoverTemplate)

    close()
  }, [processing, templateName, mainTemplate])

  return (
    <div>
      <div>
        <h3>Add Cover</h3>
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

class AddCover extends Component {
  render () {
    return (
      <Content {...this.props} />
    )
  }
}

function getDefaultCoverContent () {
  return (
`<html>
<head>
    <style>
        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0px;
            padding: 0px;
            font-family: Arial, serif;
            font-size: 12px;
        }

        .cover {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: url("{#asset ./cover.jpg @encoding=dataURI}");
            background-repeat: no-repeat;
            background-position-x: center;
            background-position-y: 35%;
            background-size: auto 100%;
            width: 100%;
            height: 100%;
        }

        .cover-logo {
            display: inline-block;
            background-color: #333;
            padding: 8px;
            border-radius: 10px;
            text-align: right;
        }

        .cover-header {
            position: relative;
            display: flex;
            justify-content: flex-end;
            width: 100%;
            height: 250px;
        }

        .cover-header:before {
            content: "";
            position: absolute;
            z-index: 1;
            top: 0;
            right: 0;
            height: 60%;
        }

        .cover-footer {
            position: relative;
            display: flex;
            align-items: flex-end;
            width: 100%;
            height: 200px;
            opacity: 0.8;
        }

        .cover-footer-bg {
            position: absolute;
            left: 0;
            z-index: 2;
            width: 100%;
            height: 100%;
            background-color: #1F2C38;
        }

        .cover-footer-content {
            font-size: 50px;
            z-index: 4;
            margin-left: 10%;
            margin-bottom: 5%;
        }

        .cover-footer-title-primary {
            color: #fff;
        }

        .cover-footer-title-secondary {
            color: #32AABA;
        }
    </style>
</head>

<body>
    <main class="cover">
        {{{pdfAddPageItem}}}
        <div class="cover-header">
        </div>
        <div class="cover-footer">
            <div class="cover-footer-bg"></div>
            <div class="cover-footer-content">
                <span class="cover-footer-title-primary">SAMPLE</span>
                <br />
                <span class="cover-footer-title-secondary">COVER TEMPLATE</span>
            </div>
        </div>
    </main>
</body>
</html>
`
  )
}

export default AddCover
