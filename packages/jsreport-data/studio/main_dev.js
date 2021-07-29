import DataEditor from './DataEditor.js'
import Properties from './DataProperties.js'
import Studio from 'jsreport-studio'

Studio.addEntitySet({
  name: 'data',
  faIcon: 'fa-database',
  visibleName: 'sample data',
  helpUrl: 'http://jsreport.net/learn/inline-data',
  entityTreePosition: 900
})

Studio.addPropertiesComponent(Properties.title, Properties, (entity) => entity.__entitySet === 'templates')
Studio.addEditorComponent('data', DataEditor, (reformatter, entity) => ({ dataJson: reformatter(entity.dataJson, 'js') }))

Studio.runListeners.push((request, entities) => {
  if (!request.template.data || !request.template.data.shortid) {
    return
  }

  // try to fill request.data from the active open tab with sample data

  let dataDetails = Object.keys(entities).map((e) => entities[e])
    .filter((d) => d.shortid === request.template.data.shortid && d.__entitySet === 'data' && (d.__isLoaded || d.__isNew))

  if (!dataDetails.length) {
    return
  }

  request.data = dataDetails[0].dataJson || JSON.stringify({})
})

Studio.entityNewListeners.push((entity) => {
  if (entity.__entitySet === 'data' && entity.dataJson == null) {
    entity.dataJson = '{}'
  }
})

Studio.entitySaveListeners.push((entity) => {
  if (entity.__entitySet === 'data' && entity.dataJson != null) {
    try {
      JSON.parse(entity.dataJson)
    } catch (e) {
      e.message = `Error validating new data entity, Invalid JSON input. ${e.message}`
      throw e
    }
  }
})
