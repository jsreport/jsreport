import React, { Component } from 'react'

class OfficePasswordTemplateProperties extends Component {
  static title (entity, entities) {
    if (!entity.officePassword) {
      return 'office password'
    }

    return entity.officePassword.passwordFilled ? 'office password filled' : 'office password'
  }

  render () {
    const { entity, onChange } = this.props

    const officePassword = entity.officePassword || {}

    const changeOfficePassword = (change) => onChange({ ...entity, officePassword: { ...entity.officePassword, ...change } })

    let password = officePassword.passwordRaw

    if (password == null || password === '') {
      password = officePassword.passwordFilled === true ? '******' : ''
    }

    return (
      <div className='properties-section'>
        <div className='form-group' title='The entity needs to be saved in order to make the change effect.'>
          <label>Password</label>
          <input
            type='password'
            value={password}
            onChange={(v) => changeOfficePassword({ passwordRaw: v.target.value, passwordFilled: v.target.value !== '' })}
          />
        </div>
        <div className='form-group'>
          <label>Enabled</label>
          <input
            type='checkbox'
            checked={officePassword.enabled !== false}
            onChange={(v) => changeOfficePassword({ enabled: v.target.checked })}
          />
        </div>
      </div>
    )
  }
}

export default OfficePasswordTemplateProperties
