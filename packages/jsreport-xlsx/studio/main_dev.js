import XlsxTemplateProperties from './XlsxTemplateProperties.js'
import Studio from 'jsreport-studio'

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
