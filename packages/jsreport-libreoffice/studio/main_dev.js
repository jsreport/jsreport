import Properties from './LibreOfficeProperties'
import Studio from 'jsreport-studio'
import LibreOfficePdfExportOptionsEditor from './LibreOfficePdfExportOptionsEditor.js'
import LibreOfficePdfExportOptionsTitle from './LibreOfficePdfExportOptionsTitle.js'

import * as Constants from './constants.js'

Studio.addPropertiesComponent(Properties.title, Properties, (entity) => entity.__entitySet === 'templates')

Studio.addEditorComponent(Constants.LIBREOFFICE_PDF_EXPORT_TAB_EDITOR, LibreOfficePdfExportOptionsEditor)
Studio.addTabTitleComponent(Constants.LIBREOFFICE_PDF_EXPORT_TAB_TITLE, LibreOfficePdfExportOptionsTitle)
