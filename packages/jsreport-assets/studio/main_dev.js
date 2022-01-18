import AssetEditor from './AssetEditor.js'
import AssetUploadButton from './AssetUploadButton.js'
import NewAssetModal from './NewAssetModal.js'
import AssetProperties from './AssetProperties.js'
import Studio from 'jsreport-studio'

Studio.addEntitySet({
  name: 'assets',
  faIcon: 'fa-file',
  visibleName: 'asset',
  onNew: (options) => Studio.openModal(NewAssetModal, options),
  referenceAttributes: ['isSharedHelper', 'sharedHelpersScope'],
  entityTreePosition: 700
})

Studio.sharedComponents.NewAssetModal = NewAssetModal
Studio.addEditorComponent('assets', AssetEditor)

Studio.addToolbarComponent(AssetUploadButton)
Studio.addPropertiesComponent(AssetProperties.title, AssetProperties, (entity) => entity.__entitySet === 'assets')

Studio.entityTreeIconResolvers.push((entity) => {
  if (entity.__entitySet !== 'assets') {
    return
  }

  const parts = entity.name.split('.')

  if (parts.length === 1) {
    return
  }

  const extension = parts[parts.length - 1]

  switch (extension) {
    case 'html': return 'fa-html5'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg': return 'fa-camera'
    case 'js': return entity.isSharedHelper ? 'fa-cogs' : 'fa-cog'
    case 'css': return 'fa-css3'
    default: return 'fa-file-o '
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

    const errors = []

    for (const file of files) {
      if (
        /\.zip$/.test(file.name) ||
        /\.jsrexport$/.test(file.name)
      ) {
        continue
      }

      try {
        const assetFile = await new Promise((resolve, reject) => {
          const fileName = file.name
          const reader = new FileReader()

          reader.onloadend = async () => {
            resolve({
              name: fileName,
              content: reader.result.substring(reader.result.indexOf('base64,') + 'base64,'.length)
            })
          }

          reader.onerror = function () {
            const errMsg = `There was an error reading the file "${fileName}"`
            reject(errMsg)
          }

          reader.readAsDataURL(file)
        })

        if (targetInfo.shortid != null) {
          assetFile.folder = {
            shortid: targetInfo.shortid
          }
        }

        const response = await Studio.api.post('/odata/assets', {
          data: assetFile
        }, true)

        response.__entitySet = 'assets'

        Studio.addExistingEntity(response)
        Studio.openTab(Object.assign({}, response))

        // delay the collapsing a bit to avoid showing ugly transition of collapsed -> uncollapsed
        setTimeout(() => {
          Studio.collapseEntity({ shortid: response.shortid }, false, { parents: true, self: false })
        }, 200)
      } catch (e) {
        errors.push(e)
      }
    }

    dropComplete()

    if (errors.length > 0) {
      const assetsUploadedError = new Error(`Could not complete asset upload${files.length > 1 ? ' of some files' : ''}.\n\n${errors.map((e) => e.message).join('\n')}`)
      Studio.apiFailed(assetsUploadedError)
    }
  }
})
