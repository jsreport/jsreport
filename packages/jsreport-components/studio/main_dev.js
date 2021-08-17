import NewComponentModal from './NewComponentModal.js'
import ComponentProperties from './ComponentProperties.js'
import Studio from 'jsreport-studio'

Studio.addEntitySet({
  name: 'components',
  faIcon: 'fa-puzzle-piece',
  visibleName: 'component',
  onNew: (options) => Studio.openModal(NewComponentModal, options),
  entityTreePosition: 800
})

Studio.entityEditorComponentKeyResolvers.push((entity) => {
  if (entity.__entitySet === 'components') {
    return {
      key: 'templates',
      entity
    }
  }
})

Studio.addPropertiesComponent(ComponentProperties.title, ComponentProperties, (entity) => entity.__entitySet === 'components')
