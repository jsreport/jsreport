import { useState, useCallback, useRef, useEffect } from 'react'
import shortid from 'shortid'
import EntityRefSelect from '../common/EntityRefSelect'

function SampleDataStep (props) {
  const { template, setAttributes, setNext, processing } = props
  const [entityRefControlKey, setEntityRefControlKey] = useState(() => shortid.generate())
  const mountedRef = useRef(false)
  const nameInputRef = useRef(null)

  let activeMode = 'new'

  if (template.data && template.data.name == null) {
    activeMode = 'existing'
  }

  const onKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      setNext()
    }
  }, [setNext])

  const updateMode = useCallback(function updateMode (newMode) {
    if (newMode === 'new') {
      setAttributes({ data: null })
    } else if (newMode === 'existing') {
      setAttributes({ data: {} })
    }
  }, [setAttributes])

  const onModeChange = useCallback((ev) => {
    const newMode = ev.target.value
    updateMode(newMode)
  }, [updateMode])

  useEffect(() => {
    if (activeMode === 'new') {
      nameInputRef.current && nameInputRef.current.focus()
    }

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
            disabled={processing}
            style={{ marginLeft: '0px', marginTop: '0px', verticalAlign: 'middle' }}
          />
          <span style={{ verticalAlign: 'middle' }}>Create new</span>
        </label>
        <input
          ref={nameInputRef}
          type='text'
          placeholder='name...'
          value={template.data != null && template.data.name != null ? template.data.name : ''}
          onKeyPress={onKeyPress}
          onFocus={() => { activeMode !== 'new' && updateMode('new') }}
          onChange={(ev) => setAttributes({ data: { name: ev.target.value } })}
        />
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
              headingLabel='Select data'
              filter={(references) => ({ data: references.data })}
              value={template.data && template.data.shortid != null ? template.data.shortid : null}
              onChange={(selected) => {
                setAttributes({ data: selected.length > 0 ? { shortid: selected[0].shortid } : {} })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SampleDataStep
