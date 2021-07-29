import { extensions, shouldOpenStartupPage } from '../lib/configuration'
import storeMethods from '../redux/methods'

function openStartup () {
  if (!extensions.studio.options.startupPage) {
    return
  }

  if (shouldOpenStartupPage) {
    storeMethods.openEditorTab({
      key: 'StartupPage',
      editorComponentKey: 'startup',
      title: 'Startup'
    })
  }
}

export default openStartup
