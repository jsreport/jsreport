import { useRef } from 'react'
import { connect } from 'react-redux'
import { values as configuration } from './lib/configuration'
import TextEditor from './components/Editor/TextEditor'
import EntityRefSelect from './components/common/EntityRefSelect'
import EntityTree from './components/EntityTree/EntityTree'
import SplitPane from './components/common/SplitPane/SplitPane'
import Popover from './components/common/Popover'
import Popup from './components/common/Popup'
import MultiSelect from './components/common/MultiSelect'
import FileInput from './components/common/FileInput/FileInput'
import TemplateProperties from './components/Properties/TemplateProperties'
import EntityTreeButton from './components/EntityTree/EntityTreeButton'
import EntityTreeNewButton from './components/EntityTree/EntityTreeNewButton'
import EntityTreeInputSearch from './components/EntityTree/EntityTreeInputSearch'
import EntityTreeTextSearchButton from './components/EntityTree/EntityTreeTextSearchButton'
import EntityTreeNavigateButton from './components/EntityTree/EntityTreeNavigateButton'
import Preview from './components/Preview/Preview'
import FramePreview from './components/Preview/FramePreview'
import Startup from './containers/Startup/Startup'
import Profiler from './containers/Profiler/Profiler'
import LinkModal from './components/Modals/LinkModal'
import AboutModal from './components/Modals/AboutModal'
import ThemeModal from './components/Modals/ThemeModal'
import ApiModal from './components/Modals/ApiModal'
import NewEntityModal from './components/Modals/NewEntityModal'
import NewTemplateModal from './components/Modals/NewTemplateModal'
import NewFolderModal from './components/Modals/NewFolderModal'
import EntityDefinitionModal from './components/Modals/EntityDefinitionModal'
import ConcurrentUpdateErrorModal from './components/Modals/ConcurrentUpdateErrorModal'
import DownloadPreviewAction from './components/Preview/MenuActions/DownloadAction'
import DownloadLogsAction from './components/Preview/MenuActions/DownloadLogsAction'
import DownloadProfilePreviewAction from './components/Preview/MenuActions/DownloadProfileAction'
import UploadProfilePreviewAction from './components/Preview/MenuActions/UploadProfileAction'
import OpenNewTabPreviewAction from './components/Preview/MenuActions/OpenNewTabAction'
import RawContentPreviewType from './components/Preview/TypeComponents/RawContentPreviewType'
import TextSearchPreviewType from './components/Preview/TypeComponents/TextSearchPreviewType/TextSearchPreviewType'
import ReportPreviewType from './components/Preview/TypeComponents/ReportPreviewType'
import ProfilePreviewType from './components/Preview/TypeComponents/ProfilePreviewType/ProfilePreviewType'
import ReportProfilePreviewType from './components/Preview/TypeComponents/ReportProfilePreviewType'
import { openModal } from './helpers/openModal'
import createGroupEntitiesByFolders from './helpers/groupEntitiesByFolders'
import { openTab, cancelProfile } from './redux/editor/actions'
import storeMethods from './redux/methods'

export default () => {
  configuration.sharedComponents.TextEditor = TextEditor
  configuration.sharedComponents.SplitPane = SplitPane
  configuration.sharedComponents.Popover = Popover
  configuration.sharedComponents.Popup = Popup
  configuration.sharedComponents.EntityTree = EntityTree
  configuration.sharedComponents.EntityTreeButton = EntityTreeButton
  configuration.sharedComponents.MultiSelect = MultiSelect
  configuration.sharedComponents.FileInput = FileInput
  configuration.sharedComponents.EntityRefSelect = EntityRefSelect
  configuration.sharedComponents.Preview = Preview
  configuration.sharedComponents.FramePreview = FramePreview

  configuration.propertiesComponents.push({
    title: TemplateProperties.title,
    shouldDisplay: (entity) => entity.__entitySet === 'templates',
    component: TemplateProperties
  })

  configuration.editorComponents.templates = require('./components/Editor/TemplateEditor.js').default

  configuration.editorComponents.templates.reformat = (reformatter, entity) => {
    const content = reformatter(entity.content, 'html')
    const helpers = reformatter(entity.helpers, 'js')

    return {
      content: content,
      helpers: helpers
    }
  }

  configuration.editorComponents.folders = require('./components/Editor/FolderEditor.js').default
  configuration.editorComponents.startup = Startup
  configuration.editorComponents.profiler = Profiler

  configuration.editorComponents.inspectJSON = require('./components/Editor/InspectJSONEditor.js').default

  configuration.entitySets.templates = {
    name: 'templates',
    visibleName: 'template',
    referenceAttributes: ['name', 'recipe', 'shortid'],
    entityTreePosition: 1000,
    onNew: (options) => openModal(NewTemplateModal, options)
  }

  configuration.sharedComponents.NewTemplateModal = NewTemplateModal

  configuration.entitySets.folders = {
    name: 'folders',
    faIcon: 'fa-folder',
    visibleName: 'folder',
    visibleInTree: false,
    referenceAttributes: ['name', 'shortid'],
    onNew: (options) => openModal(NewFolderModal, options)
  }

  configuration.sharedComponents.NewEntityModal = NewEntityModal
  configuration.sharedComponents.NewFolderModal = NewFolderModal

  // default grouping mode
  configuration.entityTreeGroupModes.folders = {
    createGrouper: createGroupEntitiesByFolders
  }

  // default filter by name strategy
  configuration.entityTreeFilterItemResolvers.push((entity, entitySets, filterInfo) => {
    const { name } = filterInfo

    if (name == null || name === '') {
      return true
    }

    return entity.name.indexOf(name) !== -1
  })

  configuration.entityTreeContextMenuItemsResolvers.push(({
    node,
    entity,
    entitySets,
    editSelection,
    isRoot,
    isGroupEntity,
    getVisibleEntitySetsInTree,
    onNewEntity
  }) => {
    if (editSelection != null) {
      return
    }

    const items = []

    if (isRoot || isGroupEntity) {
      items.push({
        key: 'New Entity',
        title: 'New Entity',
        icon: 'fa-file',
        onClick: () => false,
        items: getVisibleEntitySetsInTree(entitySets).map((entitySet) => ({
          key: entitySet.name,
          title: entitySet.visibleName,
          icon: entitySet.faIcon != null ? entitySet.faIcon : 'fa-file',
          onClick: () => {
            onNewEntity(
              isRoot ? undefined : node,
              entitySet.name,
              { defaults: { folder: isRoot ? null : { shortid: entity.shortid } } }
            )
          }
        }))
      })

      items.push({
        key: 'New Folder',
        title: 'New Folder',
        icon: 'fa-folder',
        onClick: () => {
          onNewEntity(
            isRoot ? null : node,
            'folders',
            { defaults: { folder: isRoot ? null : { shortid: entity.shortid } } }
          )
        }
      })
    }

    return {
      grouped: true,
      items
    }
  })

  configuration.entityTreeContextMenuItemsResolvers.push(({
    node,
    clipboard,
    entity,
    editSelection,
    isRoot,
    isGroupEntity,
    disabledClassName,
    getAllEntitiesInHierarchy,
    getEntityNodeById,
    getNormalizedEditSelection,
    setClipboard,
    releaseClipboardTo,
    onOpen,
    onRename,
    onClone,
    onRemove
  }) => {
    const items = []

    if (!isRoot && editSelection == null) {
      items.push({
        key: 'Definition',
        title: 'Definition',
        icon: 'fa-code',
        onClick: () => {
          openModal(EntityDefinitionModal, { entity })
        }
      })
    }

    if (isGroupEntity && editSelection == null) {
      items.push({
        key: 'Edit',
        title: 'Edit',
        icon: 'fa-edit',
        onClick: () => {
          onOpen(entity)
        }
      })
    }

    if (!isRoot && editSelection == null) {
      items.push({
        key: 'Rename',
        title: 'Rename',
        icon: 'fa-pencil',
        onClick: () => {
          onRename(entity._id)
        }
      })
    }

    if (!isRoot && editSelection == null) {
      items.push({
        key: 'Clone',
        title: 'Clone',
        icon: 'fa-clone',
        onClick: () => {
          onClone(entity)
        }
      })
    }

    if (!isRoot && editSelection == null) {
      items.push({
        key: 'Cut',
        title: 'Cut',
        icon: 'fa-cut',
        className: entity.__isNew === true ? disabledClassName : '',
        onClick: () => {
          if (entity.__isNew === true) {
            // prevents menu to be hidden
            return false
          }

          setClipboard({
            action: 'move',
            source: {
              id: entity._id,
              entitySet: entity.__entitySet
            }
          })
        }
      })
    }

    if (!isRoot) {
      items.push({
        key: 'Copy',
        title: 'Copy',
        icon: 'fa-copy',
        className: entity.__isNew === true ? disabledClassName : '',
        onClick: () => {
          if (entity.__isNew === true) {
            // prevents menu to be hidden
            return false
          }

          if (editSelection == null) {
            setClipboard({
              action: 'copy',
              source: {
                id: entity._id,
                entitySet: entity.__entitySet
              }
            })
          } else {
            const editSelectionNormalized = getNormalizedEditSelection(editSelection)

            const source = editSelectionNormalized.map((selectedId) => {
              const entity = storeMethods.getEntityById(selectedId)

              return {
                id: entity._id,
                entitySet: entity.__entitySet
              }
            })

            setClipboard({
              action: 'copy',
              source
            })
          }
        }
      })
    }

    if (
      (isRoot || isGroupEntity) &&
      editSelection == null
    ) {
      items.push({
        key: 'Paste',
        title: 'Paste',
        icon: 'fa-paste',
        className: clipboard == null ? disabledClassName : '',
        onClick: () => {
          if (clipboard == null) {
            // prevents menu to be hidden
            return false
          }

          releaseClipboardTo({
            shortid: isRoot ? null : (isGroupEntity ? entity.shortid : (entity.folder != null ? entity.folder.shortid : null)),
            children: isRoot ? [] : (isGroupEntity ? getAllEntitiesInHierarchy(node) : [])
          })
        }
      })
    }

    if (!isRoot) {
      items.push({
        key: 'Delete',
        title: 'Delete',
        icon: 'fa-trash',
        onClick: () => {
          let toRemove

          if (editSelection == null) {
            const children = getAllEntitiesInHierarchy(node)

            toRemove = {
              id: entity._id,
              childrenIds: children.length > 0 ? children : undefined
            }
          } else {
            const editSelectionNormalized = getNormalizedEditSelection(editSelection)

            toRemove = editSelectionNormalized.map((selectedId) => {
              const nodeOfSelected = getEntityNodeById(selectedId)
              const children = getAllEntitiesInHierarchy(nodeOfSelected)

              return {
                id: selectedId,
                childrenIds: children.length > 0 ? children : undefined
              }
            })
          }

          onRemove(toRemove)
        }
      })
    }

    return {
      items
    }
  })

  configuration.entityTreeToolbarComponents.single.push(EntityTreeNewButton)

  configuration.entityTreeToolbarComponents.single.push(EntityTreeInputSearch)

  configuration.entityTreeToolbarComponents.single.push(EntityTreeTextSearchButton)

  configuration.entityTreeToolbarComponents.single.push(EntityTreeNavigateButton)

  configuration.toolbarComponents.settings.push(connect(
    undefined,
    { openTab }
  )((props) => {
    if (!configuration.extensions.studio.options.startupPage) {
      return null
    }

    return (
      <div
        onClick={() => {
          props.openTab({ key: 'StartupPage', editorComponentKey: 'startup', title: 'Startup' })
          props.closeMenu()
        }}
      >
        <i className='fa fa-home' />Startup page
      </div>
    )
  }))

  // eslint-disable-next-line
  configuration.aboutModal = AboutModal

  configuration.toolbarComponents.left.push(function LinkButton (props) {
    if (!props.tab || !props.tab.tab || props.tab.tab.type !== 'entity' || !props.tab.entity || props.tab.entity.__entitySet !== 'templates') {
      return <span />
    }

    if (configuration.extensions.studio.options.linkButtonVisibility === false) {
      return <span />
    }

    return (
      <div className='toolbar-button' onClick={() => openModal(LinkModal, { entity: props.tab.entity })}>
        <i className='fa fa-link' />Link
      </div>
    )
  })

  configuration.toolbarComponents.left.push(connect((state) =>
    ({ activeProfile: state.editor.activeProfile }),
  { cancelProfile }
  )((props) => {
    if (props.activeProfile == null || (props.activeProfile.state !== 'running' && props.activeProfile.state !== 'queued')) {
      return <></>
    }

    return (
      <div className='toolbar-button button danger' onClick={() => props.cancelProfile(props.activeProfile)}>
        <i className='fa fa-times' />Cancel
      </div>
    )
  }))

  configuration.toolbarComponents.settings.push((props) => (
    <div
      onClick={() => {
        openModal(configuration.aboutModal, {
          version: configuration.version,
          engines: configuration.engines,
          recipes: configuration.recipes,
          extensions: configuration.extensions
        })

        props.closeMenu()
      }}
    >
      <i className='fa fa-info-circle' />About
    </div>
  ))

  configuration.toolbarComponents.settings.push((props) => (
    <div
      onClick={() => {
        openModal(ThemeModal, {
          availableThemes: configuration.extensions.studio.options.availableThemes,
          availableEditorThemes: configuration.extensions.studio.options.availableEditorThemes
        })

        props.closeMenu()
      }}
    >
      <i className='fa fa-paint-brush' />Theme
    </div>
  ))

  configuration.toolbarComponents.settings.push((props) => (
    <div
      onClick={() => {
        openModal(ApiModal, { })
        props.closeMenu()
      }}
    >
      <i className='fa fa-plug' />API
    </div>
  ))

  configuration.toolbarComponents.settings.push((props) => {
    const uploadProfileInputRef = useRef(null)

    return (
      <div
        onClick={() => {
          if (uploadProfileInputRef.current) {
            uploadProfileInputRef.current.openSelection()
          }
        }}
      >
        <i className='fa fa-upload' />Profile
        <div style={{ display: 'none' }}>
          <FileInput
            ref={uploadProfileInputRef}
            onFileSelect={(file) => {
              UploadProfilePreviewAction.handleUploadProfile(file)
              props.closeMenu()
            }}
          />
        </div>
      </div>
    )
  })

  // eslint-disable-next-line
  configuration.concurrentUpdateModal = ConcurrentUpdateErrorModal

  configuration.reportPreviewStyleResolvers.push((reportFile) => {
    if (reportFile.contentType === 'text/html') {
      // match default browser styles
      return {
        backgroundColor: '#fff',
        color: '#000'
      }
    }
  })

  const EmptyPreviewType = () => null

  configuration.previewComponents.empty = {
    component: EmptyPreviewType
  }

  configuration.previewComponents.rawContent = {
    component: RawContentPreviewType
  }

  configuration.previewComponents['text-search'] = {
    component: TextSearchPreviewType,
    tabs: [{ name: 'search', title: 'search' }]
  }

  configuration.previewComponents.report = {
    component: ReportPreviewType,
    tabs: [{ name: 'report', title: 'report' }],
    actions: [{
      component: DownloadPreviewAction
    }, {
      component: UploadProfilePreviewAction
    }, {
      component: OpenNewTabPreviewAction
    }]
  }

  configuration.previewComponents.profile = {
    component: ProfilePreviewType,
    tabs: [{ name: 'profile', title: 'profile' }],
    actions: [{
      component: DownloadLogsAction
    }, {
      component: DownloadProfilePreviewAction
    }, {
      component: UploadProfilePreviewAction
    }]
  }

  configuration.previewComponents['report-profile'] = {
    component: ReportProfilePreviewType,
    defaultActiveTab: 'report',
    tabs: [{ name: 'report', title: 'report' }, { name: 'profile', title: 'profile' }],
    actions: [{
      component: DownloadPreviewAction
    }, {
      component: DownloadLogsAction
    }, {
      component: DownloadProfilePreviewAction
    }, {
      component: UploadProfilePreviewAction
    }, {
      component: OpenNewTabPreviewAction
    }]
  }

  configuration.initializeListeners.push(() => {
    configuration.entityTreeIconResolvers.push((entity) => {
      if (entity.__entitySet !== 'templates') {
        return
      }

      if (entity.recipe === 'html') {
        return 'fa-html5'
      }

      if (entity.recipe.indexOf('xlsx') !== -1) {
        return 'fa-table'
      }

      if (entity.recipe.indexOf('pdf') !== -1) {
        return 'fa-file-pdf-o'
      }

      if (entity.recipe.indexOf('html') !== -1) {
        return 'fa-html5'
      }
    })

    configuration.entityTreeIconResolvers.push((entity, info = {}) => {
      if (entity.__entitySet === 'folders') {
        if (info.isCollapsed) {
          return 'fa-folder'
        } else {
          return 'fa-folder-open'
        }
      }
    })
  })

  // eslint-disable-next-line
  configuration.startupComponents = []
}
