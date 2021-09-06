import Properties from './PhantomProperties.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('phantom image', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'phantom-image')
