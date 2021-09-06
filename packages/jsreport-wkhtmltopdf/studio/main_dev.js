import WKEditor from './WKEditor.js'
import Properties from './WKProperties.js'
import WKTitle from './WKTitle.js'
import * as Constants from './constants.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('wkhtmltopdf', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'wkhtmltopdf')

const reformat = (reformatter, entity, tab) => {
  const reformated = reformatter(entity.wkhtmltopdf[tab.headerOrFooter], 'html')

  return {
    wkhtmltopdf: {
      [tab.headerOrFooter]: reformated
    }
  }
}

Studio.addEditorComponent(Constants.WK_TAB_EDITOR, WKEditor, reformat)
Studio.addTabTitleComponent(Constants.WK_TAB_TITLE, WKTitle)
