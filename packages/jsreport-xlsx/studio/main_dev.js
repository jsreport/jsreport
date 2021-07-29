import fileSaver from 'filesaver.js-npm'
import XlsxEditor from './XlsxEditor.js'
import b64toBlob from './b64toBlob.js'
import XlsxUploadButton from './XlsxUploadButton.js'
import XlsxTemplateProperties from './XlsxTemplateProperties.js'
import Studio, { Preview } from 'jsreport-studio'

Studio.addEntitySet({
  name: 'xlsxTemplates',
  faIcon: 'fa-file-excel-o',
  visibleName: 'xlsx template',
  onNew: (options = {}) => XlsxUploadButton.OpenUpload(true, options),
  entityTreePosition: 500
})

Studio.addEditorComponent('xlsxTemplates', XlsxEditor)

Studio.entityEditorComponentKeyResolvers.push((entity) => {
  if (entity.__entitySet === 'xlsxTemplates') {
    let editorKey = 'xlsxTemplates'
    const editorProps = {}

    if (Studio.extensions.assets) {
      // use assets editor for xlsxTemplate when
      // asset extension exists
      editorKey = 'assets'

      editorProps.icon = 'fa-file-excel-o'
      editorProps.embeddingCode = ''
      editorProps.displayName = entity.name

      editorProps.onPreview = () => {
        if (
          Studio.extensions.xlsx.options.preview.showWarning !== false &&
          Studio.getSettingValueByKey('office-preview-informed', false) !== true
        ) {
          Studio.setSetting('office-preview-informed', true)

          Studio.openModal(() => (
            <div>
              We need to upload your xlsx to our publicly hosted server to be able to use
              Office Online Service for previewing here in the studio. You can disable it in the configuration, see <a href='https://jsreport.net/learn/xlsx#preview-in-studio' rel='noopener noreferrer' target='_blank'>the docs</a> for details.
            </div>
          ))
        }
      }

      editorProps.onDownload = (entity) => {
        const blob = b64toBlob(entity.contentRaw, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        fileSaver.saveAs(blob, entity.name)
      }

      editorProps.onUpload = (entity, cb) => {
        XlsxUploadButton.OpenUpload(false, {
          uploadCallback: cb
        })
      }

      editorProps.getPreviewContent = (entity, { previewLoadFinish }) => {
        return (
          <Preview
            onLoad={previewLoadFinish}
            initialSrc={Studio.resolveUrl(`xlsxTemplates/office/${entity._id}/content`)}
          />
        )
      }

      editorProps.emptyMessage = 'xlsxTemplate is empty'
    }

    return {
      key: editorKey,
      entity: editorKey === 'assets' ? {
        ...entity,
        name: `${entity.name}.xlsx`
      } : entity,
      props: editorProps
    }
  }
})

Studio.addToolbarComponent(XlsxUploadButton)
Studio.addPropertiesComponent(XlsxTemplateProperties.title, XlsxTemplateProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'xlsx')

Studio.runListeners.push((request, entities) => {
  if (request.template.recipe !== 'xlsx') {
    return
  }

  if (Studio.extensions.xlsx.options.preview.enabled === false) {
    return
  }

  if (Studio.extensions.xlsx.options.preview.showWarning === false) {
    return
  }

  if (Studio.getSettingValueByKey('office-preview-informed', false) === true) {
    return
  }

  Studio.setSetting('office-preview-informed', true)

  Studio.openModal(() => (
    <div>
    We need to upload your office report to our publicly hosted server to be able to use
    Excel Online Service for previewing here in the studio. You can disable it in the configuration, see <a href='https://jsreport.net/learn/xlsx' rel='noopener noreferrer' target='_blank'>https://jsreport.net/learn/xlsx</a> for details.
    </div>
  ))
})
