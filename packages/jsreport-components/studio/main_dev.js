import NewComponentModal from './NewComponentModal'
import ComponentProperties from './ComponentProperties'
import ComponentPreview from './ComponentPreview'
import PreviewComponentToolbar from './PreviewComponentToolbar'
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
Studio.addToolbarComponent(PreviewComponentToolbar)

Studio.addPreviewComponent('component', ComponentPreview)
