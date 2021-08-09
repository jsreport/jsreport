import ElectronPdfProperties from './ElectronPdfProperties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(
  'electron-pdf',
  ElectronPdfProperties,
  (entity) => entity.__entitySet === 'templates' && entity.recipe === 'electron-pdf'
)
