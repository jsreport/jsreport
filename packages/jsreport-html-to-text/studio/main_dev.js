import HtmlToTextProperties from './Properties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('html-to-text', HtmlToTextProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'html-to-text')
