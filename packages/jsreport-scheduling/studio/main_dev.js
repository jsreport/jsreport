import ScheduleEditor from './ScheduleEditor.js'
import ScheduleProperties from './ScheduleProperties.js'
import DownloadButton from './DownloadButton.js'
import Studio from 'jsreport-studio'

Studio.initializeListeners.push(async () => {
  if (Studio.authentication && !Studio.authentication.isUserAdmin(Studio.authentication.user)) {
    return
  }

  Studio.addEntitySet({
    name: 'schedules',
    faIcon: 'fa-calendar',
    visibleName: 'schedule',
    entityTreePosition: 400
  })

  Studio.addEditorComponent('schedules', ScheduleEditor)
  Studio.addPropertiesComponent(ScheduleProperties.title, ScheduleProperties, (entity) => entity.__entitySet === 'schedules')
  Studio.addToolbarComponent(DownloadButton)
})
