import Studio from 'jsreport-studio'
import NewTagModal from './NewTagModal'
import TagEditor from './TagEditor'
import TagProperties from './TagProperties'
import EntityTagProperties from './EntityTagProperties'
import TagEntityTreeOrganizeButtonToolbar from './TagEntityTreeOrganizeButtonToolbar'
import TagEntityTreeFilterButtonToolbar from './TagEntityTreeFilterButtonToolbar'
import TagEntityTreeItem from './TagEntityTreeItem'
import TagEntityTreeTagGroupItem from './TagEntityTreeTagGroupItem'
import emitter from './emitter'
import { values as organizeState } from './organizeState'
import filterItemWithTagsStrategy from './filterItemWithTagsStrategy'
import createGroupEntitiesByTags from './groupEntitiesByTags'

Studio.addEntitySet({
  name: 'tags',
  faIcon: 'fa-tag',
  visibleName: 'tag',
  onNew: (options) => Studio.openModal(NewTagModal, options),
  helpUrl: 'http://jsreport.net/learn/tags',
  referenceAttributes: ['color'],
  entityTreePosition: 300
})

Studio.sharedComponents.NewTagModal = NewTagModal

// wait for all extensions to be loaded
Studio.initializeListeners.push(() => {
  // add tags to referenceAttributes in all entities
  Object.keys(Studio.entitySets).forEach((entitySetName) => {
    const entitySet = Studio.entitySets[entitySetName]

    // ignore tags entity set
    if (entitySet.name === 'tags') {
      return
    }

    if (entitySet.referenceAttributes.indexOf('tags') === -1) {
      entitySet.referenceAttributes.push('tags')
    }
  })
})

// eslint-disable-next-line no-import-assign
emitter.on('filterByTagsChanged', (selectedTags) => { organizeState.filterTags = selectedTags })

Studio.addEntityTreeGroupMode('tags', {
  createGrouper: createGroupEntitiesByTags
})

Studio.addEditorComponent('tags', TagEditor)
Studio.addPropertiesComponent(TagProperties.title, TagProperties, (entity) => entity.__entitySet === 'tags')
Studio.addPropertiesComponent(EntityTagProperties.title, EntityTagProperties, (entity) => entity.__entitySet !== 'tags')

Studio.addEntityTreeToolbarComponent(TagEntityTreeFilterButtonToolbar, 'group')
Studio.addEntityTreeToolbarComponent(TagEntityTreeOrganizeButtonToolbar, 'group')

Studio.addEntityTreeItemComponent(TagEntityTreeItem)

Studio.addEntityTreeItemComponent(TagEntityTreeTagGroupItem, 'groupRight')

Studio.entityTreeFilterItemResolvers.push(filterItemWithTagsStrategy)
