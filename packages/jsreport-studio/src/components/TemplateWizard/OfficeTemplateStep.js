import { useState, useCallback, useRef, useEffect } from 'react'
import shortid from 'shortid'
import FileInput from '../common/FileInput/FileInput'
import EntityRefSelect from '../common/EntityRefSelect'

const officeRecipes = ['docx', 'pptx', 'html-to-xlsx', 'xlsx']

function OfficeTemplateStep (props) {
  const { template, setAttributes, processing } = props
  const [entityRefControlKey, setEntityRefControlKey] = useState(() => shortid.generate())
  const mountedRef = useRef(false)
  const attrInfo = getAttributeForRecipe(template.recipe)

  let activeMode = 'new'

  if (template[attrInfo.attrName] && template[attrInfo.attrName].file == null) {
    activeMode = 'existing'
  }

  const updateMode = useCallback(function updateMode (newMode) {
    if (newMode === 'new') {
      setAttributes({ [attrInfo.attrName]: null })
    } else if (newMode === 'existing') {
      setAttributes({ [attrInfo.attrName]: {} })
    }
  }, [setAttributes, attrInfo.attrName])

  const onModeChange = useCallback((ev) => {
    const newMode = ev.target.value
    updateMode(newMode)
  }, [updateMode])

  useEffect(() => {
    // reset entity ref control state
    if (activeMode === 'new' && mountedRef.current) {
      setEntityRefControlKey(shortid.generate())
    }

    if (!mountedRef.current) {
      mountedRef.current = true
    }
  }, [activeMode])

  return (
    <div>
      <div className='form-group'>
        <label>
          <input
            name='mode'
            type='radio'
            value='new'
            checked={activeMode === 'new'}
            onChange={onModeChange}
            style={{ marginLeft: '0px', marginTop: '0px', verticalAlign: 'middle' }}
          />
          <span style={{ verticalAlign: 'middle' }}>Create new</span>
        </label>
        <div onClickCapture={() => { activeMode !== 'new' && updateMode('new') }}>
          <FileInput
            placeholder={attrInfo.selectLabel}
            selectedFile={template[attrInfo.attrName] != null ? template[attrInfo.attrName].file : undefined}
            onFileSelect={(file) => setAttributes({ [attrInfo.attrName]: { file } })}
            disabled={processing}
          />
        </div>
      </div>
      <div className='form-group' style={{ marginTop: '1.2rem' }}>
        <label>
          <input
            name='mode'
            type='radio'
            value='existing'
            checked={activeMode === 'existing'}
            onChange={onModeChange}
            style={{ marginLeft: '0px', marginTop: '0px', verticalAlign: 'middle' }}
          />
          <span style={{ verticalAlign: 'middle' }}>Select existing</span>
        </label>
        <div style={{ border: '1px dashed black', padding: '0.6rem' }}>
          <div onClickCapture={() => { activeMode !== 'existing' && updateMode('existing') }} style={{ maxHeight: '20rem', overflow: 'auto' }}>
            <EntityRefSelect
              key={entityRefControlKey}
              noModal
              treeStyle={{ minHeight: 'auto', maxHeight: 'none' }}
              headingLabel={attrInfo.selectLabel}
              filter={(references) => ({ data: references.assets })}
              value={template[attrInfo.attrName] && template[attrInfo.attrName][attrInfo.shortidAttrName] != null ? template[attrInfo.attrName][attrInfo.shortidAttrName] : null}
              onChange={(selected) => {
                setAttributes({ [attrInfo.attrName]: selected.length > 0 ? { [attrInfo.shortidAttrName]: selected[0].shortid } : {} })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function getAttributeForRecipe (recipe) {
  if (recipe === 'docx' || recipe === 'pptx' || recipe === 'xlsx') {
    return {
      attrName: recipe,
      shortidAttrName: 'templateAssetShortid',
      selectLabel: `select ${recipe} template`
    }
  } else if (recipe === 'html-to-xlsx') {
    return {
      attrName: 'htmlToXlsx',
      shortidAttrName: 'templateAssetShortid',
      selectLabel: 'select xlsx template'
    }
  }

  throw new Error(`Recipe "${recipe}" not supported for TemplateWizard`)
}

export default OfficeTemplateStep

export { officeRecipes, getAttributeForRecipe }
