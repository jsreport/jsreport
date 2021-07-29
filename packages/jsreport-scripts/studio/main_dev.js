import ScriptEditor from './ScriptEditor.js'
import TemplateScriptProperties from './TemplateScriptProperties.js'
import ScriptProperties from './ScriptProperties.js'
import Studio from 'jsreport-studio'

Studio.addEntitySet({
  name: 'scripts',
  faIcon: 'fa-cog',
  visibleName: 'script',
  helpUrl: 'http://jsreport.net/learn/scripts',
  referenceAttributes: ['isGlobal'],
  entityTreePosition: 800
})

Studio.addPropertiesComponent(TemplateScriptProperties.title, TemplateScriptProperties, (entity) => entity.__entitySet === 'templates')
Studio.addPropertiesComponent(ScriptProperties.title, ScriptProperties, (entity) => entity.__entitySet === 'scripts')

Studio.addEditorComponent('scripts', ScriptEditor, (reformatter, entity) => ({ content: reformatter(entity.content, 'js') }))

Studio.runListeners.push((request, entities) => {
  if (!request.template.scripts) {
    return
  }

  request.template.scripts = request.template.scripts.map((s) => {
    const script = Studio.getEntityByShortid(s.shortid, false)

    if (!script) {
      return s
    }

    return script
  }).filter((s) => !s.__isNew || s.content)
})

Studio.entityNewListeners.push((entity) => {
  if (entity.__entitySet === 'scripts' && entity.content == null) {
    entity.content = getDefaultScriptContent()
  }
})

Studio.entitySaveListeners.push((entity) => {
  if (
    entity.__entitySet === 'scripts' &&
    entity.content != null &&
    entity.content.indexOf('function beforeRender') === -1 &&
    entity.content.indexOf('function afterRender') === -1
  ) {
    Studio.openModal(() => (
      <div>
        The script "{entity.name}" doesn't have a function hook defined. This means the script won't do anything. You should define either "beforeRender" or "afterRender" function hooks.
        <br />See the <a href='https://jsreport.net/learn/scripts'>scripts docummentation</a> for the details.
      </div>
    ))
  }
})

Studio.entityTreeIconResolvers.push((entity) => (entity.__entitySet === 'scripts' && entity.isGlobal) ? 'fa-cogs' : null)

function getDefaultScriptContent () {
  return (
    `// Use the "beforeRender" or "afterRender" hook
// to manipulate and control the report generation
async function beforeRender (req, res) {

}`)
}
