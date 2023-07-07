import { values as configuration } from '../lib/configuration'
import storeMethods from '../redux/methods'

function openStartup () {
  if (!configuration.extensions.studio.options.startupPage) {
    return
  }

  if (configuration.shouldOpenStartupPage) {
    storeMethods.openEditorTab({
      key: 'StartupPage',
      editorComponentKey: 'startup',
      title: 'Startup'
    })
  }
}

export default openStartup
