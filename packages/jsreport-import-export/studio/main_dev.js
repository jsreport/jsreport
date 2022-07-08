import ExportModal from './ExportModal.js'
import ImportModal from './ImportModal.js'
import Studio from 'jsreport-studio'

Studio.addToolbarComponent((props) => (
  <div
    className='toolbar-button'
    onClick={() => {
      Studio.openModal(ExportModal)
      props.closeMenu()
    }}
  >
    <i className='fa fa-download' />Export
  </div>
), 'settings')

Studio.addToolbarComponent((props) => (
  <div
    className='toolbar-button'
    onClick={() => {
      Studio.openModal(ImportModal)
      props.closeMenu()
    }}
  >
    <i className='fa fa-upload' />Import
  </div>
), 'settings')

Studio.addEntityTreeContextMenuItemsResolver(({
  node,
  entity,
  editSelection,
  isRoot,
  isGroupEntity,
  getAllEntitiesInHierarchy
}) => {
  if (editSelection != null) {
    return
  }

  const items = []

  if (isRoot) {
    items.push({
      key: 'Import',
      title: 'Import',
      icon: 'fa-upload',
      onClick: () => {
        Studio.openModal(ImportModal)
      }
    })

    items.push({
      key: 'Export',
      title: 'Export',
      icon: 'fa-download',
      onClick: () => {
        Studio.openModal(ExportModal)
      }
    })
  } else if (isGroupEntity && entity.__entitySet === 'folders') {
    items.push({
      key: 'Import',
      title: 'Import into folder',
      icon: 'fa-upload',
      onClick: () => {
        Studio.openModal(ImportModal, { selectedFolderShortid: entity.shortid })
      }
    })

    items.push({
      key: 'Export',
      title: 'Export folder',
      icon: 'fa-download',
      onClick: () => {
        const selected = getAllEntitiesInHierarchy(node, true)
        Studio.openModal(ExportModal, { initialSelected: selected })
      }
    })
  }

  return {
    grouped: true,
    items
  }
})

Studio.entityTreeDropResolvers.push({
  type: Studio.dragAndDropNativeTypes.FILE,
  async handler ({
    draggedItem,
    dragOverContext,
    dropComplete
  }) {
    const files = draggedItem.files

    const targetInfo = {
      shortid: null
    }

    if (dragOverContext && dragOverContext.containerTargetEntity) {
      targetInfo.shortid = dragOverContext.containerTargetEntity.shortid
    }

    if (
      files &&
      files.length === 1 &&
      (
        /\.zip$/.test(files[0].name) ||
        /\.jsrexport$/.test(files[0].name)
      )
    ) {
      dropComplete()

      const opts = {
        selectedFile: files[0]
      }

      if (targetInfo.shortid) {
        opts.selectedFolderShortid = targetInfo.shortid
      }

      Studio.openModal(ImportModal, opts)
    }
  }
})
