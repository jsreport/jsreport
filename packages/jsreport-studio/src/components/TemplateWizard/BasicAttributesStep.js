import { useRef, useCallback, useEffect } from 'react'
import { engines, recipes } from '../../lib/configuration'

function BasicAttributesStep (props) {
  const nameInputRef = useRef(null)
  const { template, setAttributes, setNext, processing } = props

  useEffect(() => {
    nameInputRef.current && nameInputRef.current.focus()
  }, [])

  const onKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      setNext()
    }
  }, [setNext])

  return (
    <div>
      <div className='form-group'>
        <label>name</label>
        <input
          type='text'
          ref={nameInputRef}
          onKeyPress={onKeyPress}
          onChange={(ev) => setAttributes({ name: ev.target.value })}
          disabled={processing}
          value={template.name || ''}
        />
      </div>
      <div className='form-group'>
        <label>engine</label>
        <select
          value={template.engine}
          onChange={(ev) => setAttributes({ engine: ev.target.value })}
        >
          {engines.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div className='form-group'>
        <label>recipe</label>
        <select
          value={template.recipe}
          onChange={(ev) => setAttributes({ recipe: ev.target.value })}
        >
          {recipes.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </div>
  )
}

export default BasicAttributesStep
