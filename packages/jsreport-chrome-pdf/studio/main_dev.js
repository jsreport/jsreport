import PdfProperties from './ChromePdfProperties.js'
import ImageProperties from './ChromeImageProperties.js'
import Studio from 'jsreport-studio'
import ChromeEditor from './ChromeEditor.js'
import * as Constants from './constants.js'
import ChromeTitle from './ChromeTitle.js'

Studio.addPropertiesComponent('chrome pdf', PdfProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf')
Studio.addPropertiesComponent('chrome image', ImageProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'chrome-image')

Studio.addEditorComponent(Constants.CHROME_TAB_EDITOR, ChromeEditor)
Studio.addTabTitleComponent(Constants.CHROME_TAB_TITLE, ChromeTitle)
Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'chrome-pdf') ? 'fa-file-pdf-o' : null)
Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'chrome-image') ? 'fa-file-image-o' : null)
