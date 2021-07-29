import React, { Component } from 'react'

class Properties extends Component {
  static title (entity, entities) {
    if (!entity.pdfSign) {
      return 'pdf sign'
    }

    return entity.pdfSign.passwordFilled ? 'pdf sign password filled' : 'pdf sign'
  }

  render () {
    const { entity, onChange } = this.props

    const pdfSign = entity.pdfSign || {}

    const changePdfSign = (change) => onChange({ ...entity, pdfSign: { ...entity.pdfSign, ...change } })

    let password = pdfSign.passwordRaw

    if (password == null || password === '') {
      password = pdfSign.passwordFilled === true ? '******' : ''
    }

    return (
      <div className='properties-section'>
        <div className='form-group'><label>password</label>
          <input
            type='password' value={password}
            onChange={(v) => changePdfSign({ passwordRaw: v.target.value })}
          />
        </div>
      </div>
    )
  }
}

export default Properties
