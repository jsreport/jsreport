import WKEditor from './WKEditor.js'
import Properties from './WKProperties.js'
import WKTitle from './WKTitle.js'
import * as Constants from './constants.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('wkhtmltopdf', Properties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'wkhtmltopdf')

const supportedDocProps = ['wkhtmltopdf.header', 'wkhtmltopdf.footer', 'wkhtmltopdf.cover']

const shortNameMap = {
  'wkhtmltopdf.header': 'header',
  'wkhtmltopdf.footer': 'footer',
  'wkhtmltopdf.cover': 'cover'
}

const reformat = (reformatter, entity, tab) => {
  const targetProp = shortNameMap[tab.docProp]
  const reformated = reformatter(entity.wkhtmltopdf[targetProp], 'html')

  return {
    wkhtmltopdf: {
      [targetProp]: reformated
    }
  }
}

Studio.addEditorComponent(Constants.WK_TAB_EDITOR, WKEditor, reformat)
Studio.addTabTitleComponent(Constants.WK_TAB_TITLE, WKTitle)

function componentKeyResolver (entity, docProp, key) {
  if (docProp == null) {
    return
  }

  if (entity.__entitySet === 'templates' && supportedDocProps.includes(docProp)) {
    return {
      key,
      props: {
        headerOrFooter: shortNameMap[docProp]
      }
    }
  }
}

Studio.entityEditorComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, Constants.WK_TAB_EDITOR))
Studio.tabTitleComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, Constants.WK_TAB_TITLE))
