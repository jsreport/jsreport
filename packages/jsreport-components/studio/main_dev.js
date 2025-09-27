import NewComponentModal from './NewComponentModal'
import ComponentProperties from './ComponentProperties'
import ComponentPreview from './ComponentPreview'
import PreviewComponentToolbar from './PreviewComponentToolbar'
import Studio from 'jsreport-studio'
import crawlEntityPath from '../lib/crawlEntityPath'

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

Studio.textEditorInitializeListeners.push(({ monaco }) => {
  registerHandlebarsLanguage(monaco)
})

/**
 * We implement monaco registerLinkProvider & registerLinkOpener for Handlebars.
 * This allows to Ctrl+Click (or Cmd+Click on Mac) on {{component "path/to/component"}} expressions
 */
function registerHandlebarsLanguage (monaco) {
  const languageId = 'handlebars'
  const handlebarComponentRegex = /\{\{\s*component\s+(["'])([^"']+)\1[^}]*?\}\}/g
  const handlebarLinkScheme = 'jsreport-studio'
  const handlebarLinkAuthority = 'handlebars-link'

  monaco.languages.registerLinkProvider(languageId, {
    provideLinks: (model) => {
      const links = []
      const lines = model.getLinesContent()

      for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        let match
        while ((match = handlebarComponentRegex.exec(lines[lineNumber])) !== null) {
          const path = match[2]
          // verify that the path can be resolved to avoid broken links
          const targetEntity = crawlEntityPath(
            Studio.getAllEntities(),
            path,
            Studio.getActiveEntity()
          )
          if (targetEntity?.__entitySet !== 'components') {
            continue
          }
          // Add link to the editor model
          const url = `${handlebarLinkScheme}://${handlebarLinkAuthority}/${encodeURIComponent(path)}`
          const startColumn = match.index + match[0].indexOf(path)
          const endColumn = startColumn + path.length
          links.push({
            range: new monaco.Range(lineNumber + 1, startColumn + 1, lineNumber + 1, endColumn + 1),
            url: url
          })
        }
      }
      return { links }
    }
  })

  monaco.editor.registerLinkOpener({
    open: (url) => {
      if (!(url.scheme === handlebarLinkScheme && url.authority === handlebarLinkAuthority)) {
        return false
      }

      const targetEntity = crawlEntityPath(
        Studio.getAllEntities(),
        url.path.slice(1), // url.path contains an extra leading slash
        Studio.getActiveEntity()
      )

      if (!targetEntity) {
        return false
      }

      Studio.openTab({ _id: targetEntity._id })

      return true
    }
  })
}
