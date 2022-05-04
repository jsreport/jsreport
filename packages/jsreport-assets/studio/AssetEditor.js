import React, { Component } from 'react'
import AssetUploadButton from './AssetUploadButton.js'
import Studio, { templateEditorModeResolvers, SplitPane, FramePreview, TextEditor } from 'jsreport-studio'
import superagent from 'superagent'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import binaryExtensions from 'binary-extensions'
import style from './AssetEditor.css'

binaryExtensions.push('p12')

// Studio.api currently always open dialogs on failures and that is what we don't want, so arbitrary implementation here
const getTextFromApi = (path) => {
  return new Promise((resolve, reject) => {
    const request = superagent.get(Studio.resolveUrl(path))
    request.end((err, { text } = {}) => err ? reject(new Error(text || err.toString())) : resolve(text))
  })
}

class AssetEditor extends Component {
  constructor (props) {
    super(props)

    let defaultCodeActive = false

    if (props.codeEntity != null && props.initialCodeActive != null) {
      defaultCodeActive = props.initialCodeActive
    }

    this.state = {
      initialLoading: true,
      codeActive: defaultCodeActive,
      previewOpen: false,
      previewLoading: false
    }

    this.previewLoadFinish = this.previewLoadFinish.bind(this)
  }

  async componentDidMount () {
    const { entity } = this.props

    if (!entity) {
      return this.setState({
        initialLoading: false
      })
    }

    let content = entity.content

    if (entity.link) {
      await Studio.saveEntity(entity._id)
      const ab = await Studio.api.get(`assets/${entity._id}/content`, { responseType: 'arraybuffer' })
      const str = String.fromCharCode.apply(null, new Uint8Array(ab))
      const fixedStr = decodeURIComponent(escape(str))
      content = btoa(unescape(encodeURIComponent(fixedStr)))
    }

    this.setState({ content, initialLoading: false })
  }

  async componentDidUpdate (prevProps) {
    const { entity } = this.props

    if (!entity) {
      return
    }

    if (entity.link && (!this.state.link || prevProps.entity.link !== entity.link)) {
      try {
        const link = await getTextFromApi(`assets/link/${encodeURIComponent(entity.link)}`)
        this.setState({ link: link })
      } catch (e) {
        this.setState({ link: e.message })
      }
    }
  }

  isOfficeFile (entity) {
    if (entity == null) { return false }
    return entity.name.match(/\.(docx|xlsx|pptx)$/) != null
  }

  isImage (entity) {
    if (entity == null) { return false }
    return entity.name.match(/\.(jpeg|jpg|gif|png|svg)$/) != null
  }

  isFont (entity) {
    if (entity == null) { return false }
    return entity.name.match(/\.(otf|woff|ttf|eot|woff2)$/) != null
  }

  isPdf (entity) {
    if (entity == null) { return false }
    return entity.name.match(/\.(pdf)$/) != null
  }

  getFormat (extension) {
    switch (extension) {
      case 'ttf': return 'truetype'
      case 'woff2': return 'woff2'
      case 'eot': return 'embedded-opentype'
      default: return 'woff'
    }
  }

  getEmbeddingCode (entity) {
    if (entity == null) { return '' }

    const parts = entity.name.split('.')
    const extension = parts[parts.length - 1]

    if (this.props.embeddingCode != null) {
      return this.props.embeddingCode
    }

    if (this.isImage(entity)) {
      return `<img src="{{asset "${Studio.resolveEntityPath(entity)}" "dataURI"}}" />`
    }

    if (this.isFont(entity)) {
      return `@font-face {
  font-family: '${parts[0]}';
  src: url({{asset "${Studio.resolveEntityPath(entity)}" "dataURI"}});
  format('${this.getFormat(extension)}');
}`
    }

    if (this.isOfficeFile(entity)) {
      return `{{asset "${Studio.resolveEntityPath(entity)}" "base64"}}`
    }

    return `{{asset "${Studio.resolveEntityPath(entity)}"}}`
  }

  getLazyPreviewStatus (entity) {
    if (this.props.lazyPreview != null) {
      return this.props.lazyPreview
    }

    if (this.isOfficeFile(entity)) {
      return true
    }

    return false
  }

  getPreviewEnabledStatus (entity) {
    if (this.props.previewEnabled != null) {
      return this.props.previewEnabled
    }

    if (this.isOfficeFile(entity)) {
      return Studio.extensions.assets.options.officePreview.enabled !== false
    }

    return true
  }

  preview (entity) {
    const { previewOpen } = this.state
    const { onPreview } = this.props
    const lazyPreview = this.getLazyPreviewStatus(entity)
    const previewEnabled = this.getPreviewEnabledStatus(entity)

    if (!lazyPreview || !previewEnabled) {
      return
    }

    if (onPreview) {
      onPreview(entity)
    } else if (this.isOfficeFile(entity)) {
      if (
        Studio.extensions.assets.options.officePreview.showWarning !== false &&
        Studio.getSettingValueByKey('office-preview-informed', false) === false
      ) {
        Studio.setSetting('office-preview-informed', true)

        Studio.openModal(() => (
          <div>
            We need to upload your office asset to our publicly hosted server to be able to use
            Office Online Service for previewing here in the studio. You can disable it in the configuration, see
            <a
              href='https://jsreport.net/learn/xlsx#preview-in-studio' target='_blank' rel='noopener noreferrer'
            >
              the docs for details
            </a>.
          </div>
        ))
      }
    }

    if (previewOpen) {
      this.clearPreview(() => {
        this.preview(entity)
      })
    } else {
      Studio.startProgress()

      this.setState({
        previewLoading: true,
        previewOpen: true,
        codeActive: false
      })
    }
  }

  previewLoadFinish () {
    Studio.stopProgress()

    this.setState({
      previewLoading: false
    })
  }

  clearPreview (done) {
    this.setState({
      previewOpen: false
    }, () => done && done())
  }

  renderBinary (entity) {
    return (
      <div className='custom-editor'>
        <div>
          <h1><i className='fa fa-file-o' /> {entity.name}</h1>
        </div>
        <div>
          <a className='button confirmation' rel='noreferrer' target='_blank' href={Studio.resolveUrl(`assets/${entity._id}/content?download=true`)} title='Download'>
            <i className='fa fa-download' /> Download
          </a>
          <button className='button confirmation' onClick={() => AssetUploadButton.OpenUpload()}>
            <i className='fa fa-upload' /> Upload
          </button>
        </div>
      </div>
    )
  }

  renderEditorToolbar () {
    const { link, previewLoading, previewOpen, codeActive } = this.state
    const { entity, codeEntity, displayName, icon, onDownload, onUpload } = this.props
    const lazyPreview = this.getLazyPreviewStatus(entity)
    const previewEnabled = this.getPreviewEnabledStatus(entity)
    const embeddingCode = this.getEmbeddingCode(entity)

    let visibleName = displayName

    if (!visibleName && entity) {
      visibleName = entity.name
    }

    if (!visibleName) {
      visibleName = '<none>'
    }

    return (
      <div className={style.toolbarContainer}>
        <div className={style.toolbarRow}>
          <h3 className={style.toolbarAssetName}>
            <div>
              <i className={`fa ${icon}`} />
              &nbsp;
              {entity != null ? <a href='#' onClick={(ev) => { ev.preventDefault(); Studio.openTab({ _id: entity._id }) }}>{visibleName}</a> : visibleName}
            </div>
          </h3>
          {embeddingCode !== '' && (
            <CopyToClipboard text={embeddingCode}>
              <a className='button confirmation' title='Copy the embedding code to clipboard'>
                <i className='fa fa-clipboard' />
              </a>
            </CopyToClipboard>
          )}
          {entity != null && (
            <button
              className='button confirmation'
              title='Download'
              onClick={() => {
                if (onDownload) {
                  onDownload(entity)
                } else {
                  const downloadEl = document.createElement('a')
                  downloadEl.target = '_blank'
                  downloadEl.href = Studio.resolveUrl(`assets/${entity._id}/content?download=true`)
                  downloadEl.click()
                }
              }}
            >
              <i className='fa fa-download' />
            </button>
          )}
          {entity != null && !entity.link && (
            <button
              className='button confirmation'
              title='Upload'
              onClick={() => {
                const cb = () => {
                  let wasOpen = false

                  if (lazyPreview && this.state.previewOpen) {
                    wasOpen = true
                  }

                  this.clearPreview(() => {
                    if (wasOpen) {
                      this.preview(entity)
                    }
                  })
                }

                if (onUpload) {
                  onUpload(entity, cb)
                } else {
                  AssetUploadButton.OpenUpload({
                    targetAsset: {
                      _id: entity._id,
                      name: entity.name
                    },
                    uploadCallback: cb
                  })
                }
              }}
            >
              <i className='fa fa-upload' />
            </button>
          )}
          {lazyPreview && entity != null && (
            <button
              className={`button confirmation ${!previewEnabled || previewLoading ? 'disabled' : ''}`}
              onClick={() => this.preview(entity)}
              title={previewOpen ? 'Refresh' : 'Preview'}
            >
              <i className={`fa fa-${previewLoading ? '' : previewOpen ? 'retweet' : 'eye'}`} /> {previewLoading ? 'Loading..' : ''}
            </button>
          )}
          {lazyPreview && entity != null && previewOpen && !previewLoading && (
            <button
              className={`button confirmation ${!previewEnabled || previewLoading ? 'disabled' : ''}`}
              onClick={() => this.clearPreview()}
              title='Clear'
            >
              <i className='fa fa-times' />
            </button>
          )}
          {codeEntity != null && (
            <button
              className={`button ${codeActive ? 'danger' : 'confirmation'}`}
              onClick={() => this.setState((state) => {
                const change = {}

                if (state.codeActive) {
                  Studio.store.dispatch(Studio.entities.actions.flushUpdates())
                } else {
                  change.previewOpen = false
                  change.previewLoading = false
                  Studio.stopProgress()
                }

                return { codeActive: !state.codeActive, ...change }
              })}
              title={`${codeActive ? 'Hide' : 'Show'} ${codeEntity.content != null ? 'content and helpers' : 'helpers'}`}
            >
              <i className='fa fa-code' />
            </button>
          )}
        </div>
        {entity != null && entity.link && (
          <div className={style.toolbarRow} style={{ margin: '0.6rem' }}>
            <span><b><i className='fa fa-folder-open' /> linked to file:</b> {link}</span>
          </div>
        )}
      </div>
    )
  }

  renderEditorContent () {
    const { entity, codeEntity, emptyMessage, getPreviewContent, onUpdate } = this.props
    const { codeActive } = this.state

    if (codeEntity != null && codeActive) {
      const helpersEditor = (
        <TextEditor
          key={codeEntity._id + '_helpers'}
          name={codeEntity._id + '_helpers'}
          getFilename={() => `${codeEntity.name} (helpers)`}
          mode='javascript'
          onUpdate={(v) => onUpdate(Object.assign({ _id: codeEntity._id }, { helpers: v }))}
          value={codeEntity.helpers || ''}
        />
      )

      if (Object.prototype.hasOwnProperty.call(codeEntity, 'content')) {
        return (
          <SplitPane
            primary='second'
            split='horizontal'
            resizerClassName='resizer-horizontal'
            defaultSize={(window.innerHeight * 0.2) + 'px'}
          >
            <TextEditor
              key={codeEntity._id}
              name={codeEntity._id}
              getFilename={() => codeEntity.name}
              mode={resolveTemplateEditorMode(codeEntity) || 'handlebars'}
              onUpdate={(v) => onUpdate(Object.assign({ _id: codeEntity._id }, { content: v }))}
              value={codeEntity.content || ''}
            />
            {helpersEditor}
          </SplitPane>
        )
      }

      return helpersEditor
    }

    if (entity == null) {
      return (
        <div style={{ padding: '2rem' }}>
          <i>{emptyMessage != null ? emptyMessage : 'Asset is empty'}</i>
        </div>
      )
    }

    const parts = entity.name.split('.')
    const extension = parts[parts.length - 1]
    const lazyPreview = this.getLazyPreviewStatus(entity)

    let previewOpen = true

    if (lazyPreview) {
      previewOpen = this.state.previewOpen
    }

    if (!previewOpen) {
      return null
    }

    if (getPreviewContent) {
      return getPreviewContent(entity, {
        previewLoadFinish: this.previewLoadFinish
      })
    }

    if (this.isImage(entity)) {
      return (
        <div style={{ overflow: 'auto' }}>
          <img
            src={Studio.resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`)}
            style={{ display: 'block', margin: '3rem auto' }}
          />
        </div>
      )
    }

    if (this.isFont(entity)) {
      const newStyle = document.createElement('style')

      newStyle.appendChild(document.createTextNode(`@font-face {
         font-family: '${parts[0]}';
         src: url('${Studio.resolveUrl(`/assets/${entity._id}/content`)}');
         format('${extension === 'ttf' ? 'truetype' : 'woff'}');
        }`))

      document.head.appendChild(newStyle)

      return (
        <div style={{ overflow: 'auto', fontFamily: parts[0], padding: '2rem' }}><h1> Hello world font {entity.name}</h1>
          <p>
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's
            standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to
            make a type specimen book.
          </p>
        </div>
      )
    }

    if (this.isPdf(entity)) {
      return (
        <div className='block' style={{ height: '100%' }}>
          <object style={{ height: '100%' }} data={Studio.resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`)} type='application/pdf'>
            <embed src={Studio.resolveUrl(`assets/${entity._id}/content?v=${new Date().getTime()}`)} type='application/pdf' />
          </object>
        </div>
      )
    }

    if (this.isOfficeFile(entity)) {
      const officeSrc = Studio.resolveUrl(`assets/office/${entity._id}/content`)

      return (
        <FramePreview
          onLoad={() => this.previewLoadFinish()}
          src={officeSrc}
        />
      )
    }

    if (entity.name.split('.').length > 1 && binaryExtensions.includes(entity.name.split('.')[1])) {
      return this.renderBinary(entity)
    }

    let mode = parts[parts.length - 1]

    if (extension === 'js') {
      mode = 'javascript'
    }

    if (extension === 'html') {
      mode = 'handlebars'
    }

    const content = ((entity.content || entity.forceUpdate) ? entity.content : this.state.content) || ''
    let text
    try {
      text = decodeURIComponent(escape(atob(content)))
    } catch (e) {
      return this.renderBinary(entity)
    }

    return (
      <TextEditor
        name={entity._id}
        mode={mode}
        value={text}
        onUpdate={(v) => this.props.onUpdate(Object.assign({}, entity, { content: btoa(unescape(encodeURIComponent(v))), forceUpdate: true }))}
      />
    )
  }

  render () {
    const { initialLoading } = this.state

    if (initialLoading) {
      return <div />
    }

    return (
      <div className='block'>
        {this.renderEditorToolbar()}
        {this.renderEditorContent()}
      </div>
    )
  }
}

AssetEditor.defaultProps = {
  icon: 'fa-file-o'
}

function resolveTemplateEditorMode (template) {
  // eslint-disable-next-line
  for (const k in templateEditorModeResolvers) {
    const mode = templateEditorModeResolvers[k](template)
    if (mode) {
      return mode
    }
  }

  return null
}

export default AssetEditor
