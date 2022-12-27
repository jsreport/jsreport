import PhantomEditor from './PhantomEditor.js'
import PhantomPdfProperties from './PhantomPdfProperties.js'
import PhantomTitle from './PhantomTitle.js'
import * as Constants from './constants.js'
import Studio from 'jsreport-studio'

Studio.addPropertiesComponent('phantom pdf', PhantomPdfProperties, (entity) => entity.__entitySet === 'templates' && entity.recipe === 'phantom-pdf')

const supportedDocProps = ['phantom.header', 'phantom.footer']

const shortNameMap = {
  'phantom.header': 'header',
  'phantom.footer': 'footer'
}

const reformat = (reformatter, entity, tab) => {
  const lastPhantomProperties = entity.phantom || {}
  const targetProp = shortNameMap[tab.docProp]
  const reformated = reformatter(lastPhantomProperties[targetProp], 'html')

  return {
    phantom: {
      ...lastPhantomProperties,
      [targetProp]: reformated
    }
  }
}

Studio.addEditorComponent(Constants.PHANTOM_TAB_EDITOR, PhantomEditor, reformat)
Studio.addTabTitleComponent(Constants.PHANTOM_TAB_TITLE, PhantomTitle)

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

Studio.entityEditorComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, Constants.PHANTOM_TAB_EDITOR))
Studio.tabTitleComponentKeyResolvers.push((entity, docProp) => componentKeyResolver(entity, docProp, Constants.PHANTOM_TAB_TITLE))

Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'templates' && entity.recipe === 'phantom-pdf') ? 'fa-file-pdf-o' : null)
