import ReportEditor from './ReportEditor'
import ReportsButton from './ReportsButton'
import DownloadButton from './DownloadButton.js'
import DeleteButton from './DeleteButton.js'
import Studio from 'jsreport-studio'

Studio.addEditorComponent('reports', ReportEditor)

Studio.addToolbarComponent(ReportsButton, 'settings')
Studio.addToolbarComponent(DownloadButton)
Studio.addToolbarComponent(DeleteButton)
