import Properties from './Properties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('browser client', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'html-with-browser-client')
