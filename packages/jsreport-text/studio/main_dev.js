import Properties from './Properties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('text', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'text')
