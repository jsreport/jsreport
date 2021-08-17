/* import PropTypes from 'prop-types' */
import React, { Component } from 'react'
import Studio from 'jsreport-studio'

export default class ComponentProperties extends Component {
  renderEngines () {
    const { entity, onChange } = this.props

    return (
      <select value={entity.engine} onChange={(v) => onChange({ _id: entity._id, engine: v.target.value })}>
        {Studio.engines.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
    )
  }

  static title (entity) {
    return entity.engine
  }

  render () {
    if (this.props.entity.__entitySet !== 'components') {
      return <div />
    }

    return (
      <div className='properties-section'>
        <div className='form-group'><label>engine</label> {this.renderEngines()}</div>
      </div>
    )
  }
}
