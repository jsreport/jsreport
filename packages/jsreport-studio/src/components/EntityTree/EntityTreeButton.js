import PropTypes from 'prop-types'
import React, { Component } from 'react'
import style from './EntityTreeButton.css'

class EntityTreeButton extends Component {
  render () {
    const { onClick, active } = this.props

    return (
      <button
        className={style.entityTreeButton + ' ' + (active ? style.active : '')}
        onClick={onClick}
      >
        {this.props.children}
      </button>
    )
  }
}

EntityTreeButton.propTypes = {
  onClick: PropTypes.func,
  active: PropTypes.bool
}

export default EntityTreeButton
