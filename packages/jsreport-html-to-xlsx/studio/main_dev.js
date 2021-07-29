import Properties from './HtmlToXlsxProperties'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('html to xlsx', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'html-to-xlsx')

Studio.runListeners.push((request, entities) => {
  if (request.template.recipe !== 'html-to-xlsx') {
    return
  }

  if (Studio.extensions['html-to-xlsx'].options.preview.enabled === false) {
    return
  }

  if (Studio.extensions['html-to-xlsx'].options.preview.showWarning === false) {
    return
  }

  if (Studio.getSettingValueByKey('office-preview-informed', false) === true) {
    return
  }

  Studio.setSetting('office-preview-informed', true)

  Studio.openModal(() => (
    <div>
      We need to upload your office report to our publicly hosted server to be able to use
      Office Online Service for previewing here in the studio. You can disable it in the configuration, see
      <a
        href='https://jsreport.net/learn/html-to-xlsx'
        target='_blank'
        rel='noopener noreferrer'
      >
        https://jsreport.net/learn/html-to-xlsx
      </a> for details.
    </div>
  ))
})
