/* import PropTypes from 'prop-types' */
import React, { Component } from 'react'
import { values as configuration } from '../../lib/configuration'

class TemplateProperties extends Component {
  /*
  static propTypes = {
    entity: PropTypes.object,
    entities: PropTypes.object,
    onChange: PropTypes.func.isRequired
  }
  */

  renderEngines () {
    const { entity, onChange } = this.props

    return (
      <select value={entity.engine} onChange={(v) => onChange({ _id: entity._id, engine: v.target.value })}>
        {configuration.engines.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
    )
  }

  static title (entity) {
    return entity.engine + ', ' + entity.recipe
  }

  renderRecipes () {
    const { entity, onChange } = this.props

    return (
      <select value={entity.recipe} onChange={(v) => onChange({ _id: entity._id, recipe: v.target.value })}>
        {configuration.recipes.map((e) => <option key={e} value={e}>{e}</option>)}
      </select>
    )
  }

  render () {
    if (this.props.entity.__entitySet !== 'templates') {
      return <div />
    }

    return (
      <div className='properties-section'>
        <div className='form-group'><label>engine</label> {this.renderEngines()}</div>
        <div className='form-group'><label>recipe</label> {this.renderRecipes()}</div>
      </div>
    )
  }
}

export default TemplateProperties
