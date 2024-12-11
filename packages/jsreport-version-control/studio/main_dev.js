import Studio from 'jsreport-studio'
import React from 'react'
import HistoryEditor from './HistoryEditor'
import LocalChangesEditor from './LocalChangesEditor'

Studio.initializeListeners.push(async () => {
  if (Studio.authentication && !Studio.authentication.isUserAdmin(Studio.authentication.user)) {
    return
  }

  Studio.addEditorComponent('versionControlHistory', HistoryEditor)
  Studio.addEditorComponent('versionControlLocalChanges', LocalChangesEditor)

  Studio.addToolbarComponent(() =>
    <div
      title='History'
      className='toolbar-button'
      onClick={() => Studio.openTab({ key: 'versionControlLocalChanges', editorComponentKey: 'versionControlLocalChanges', title: 'Uncommited changes' })}
    ><i className='fa fa-history' /><span>Version control</span>
    </div>, 'settings')
})
