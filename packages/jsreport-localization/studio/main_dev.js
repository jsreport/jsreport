import LocalizationProperties from './LocalizationProperties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent(LocalizationProperties.title, LocalizationProperties, (entity) => entity.__entitySet === 'templates')
