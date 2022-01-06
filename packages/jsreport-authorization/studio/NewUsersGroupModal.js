import { useState, useEffect, useRef, useCallback } from 'react'
import Studio from 'jsreport-studio'

const NewUsersGroupModal = (props) => {
  const close = props.close
  const onNewEntity = props.options.onNewEntity
  const activateNewTab = props.options.activateNewTab
  const defaults = props.options.defaults || {}
  const [groupNameError, setGroupNameError] = useState(false)
  const [apiError, setApiError] = useState(null)
  const groupNameRef = useRef()

  const validateGroupName = useCallback(() => {
    setGroupNameError(groupNameRef.current.value === '')
    setApiError(null)
  }, [])

  const createGroup = useCallback(async () => {
    let entity = {}

    if (defaults != null) {
      entity = Object.assign(entity, defaults)
    }

    if (!groupNameRef.current.value) {
      return setGroupNameError(true)
    }

    entity.name = groupNameRef.current.value
    entity.users = entity.users || []

    try {
      const response = await Studio.api.post('/odata/usersGroups', {
        data: entity
      })

      response.__entitySet = 'usersGroups'

      Studio.addExistingEntity(response)
      Studio.openTab(response, activateNewTab)

      if (onNewEntity) {
        onNewEntity(response)
      }

      close()
    } catch (e) {
      setApiError(e.message)
    }
  }, [defaults, activateNewTab, onNewEntity, close])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      createGroup()
    }
  }, [createGroup])

  useEffect(() => {
    setTimeout(() => groupNameRef.current.focus(), 0)
  }, [])

  return (
    <div>
      <div className='form-group'>
        <label>New group</label>
      </div>
      <div className='form-group'>
        <label>name</label>
        <input type='text' ref={groupNameRef} onChange={() => validateGroupName()} onKeyPress={(e) => handleKeyPress(e)} />
      </div>
      <div className='form-group'>
        <span
          style={{ color: 'red', display: groupNameError ? 'block' : 'none' }}
        >
          group name must be filled
        </span>
        <span style={{ color: 'red', display: apiError ? 'block' : 'none' }}>{apiError}</span>
      </div>
      <div className='button-bar'>
        <button className='button confirmation' onClick={() => createGroup()}>ok</button>
      </div>
    </div>
  )
}

export default NewUsersGroupModal
