import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { values as configuration } from '../../lib/configuration'
import { createGetByIdSelector } from '../../redux/entities/selectors'
import { actions as entitiesActions } from '../../redux/entities'

class ConcurrentUpdateErrorModal extends Component {
  constructor (props) {
    super(props)

    this.state = {
      isSaving: false
    }

    this.latestRef = React.createRef()
    this.componentMounted = false
  }

  componentDidMount () {
    this.componentMounted = true

    setTimeout(() => this.latestRef.current.focus(), 0)
  }

  componentWillUnmount () {
    this.componentMounted = false
  }

  async override () {
    const { isSaving } = this.state
    const { entity } = this.props

    if (isSaving) {
      return
    }

    this.setState({
      isSaving: true
    })

    try {
      await this.props.save(entity._id, { ignoreFailed: false, validateConcurrent: false })
    } catch (e) {
      console.error(e)
    }

    if (this.componentMounted) {
      this.setState({
        isSaving: false
      })

      this.props.close()
    }
  }

  async useLatest () {
    const { isSaving } = this.state
    const { entity } = this.props

    if (isSaving) {
      return
    }

    this.setState({
      isSaving: true
    })

    try {
      const freshEntity = await this.props.load(entity._id, true)
      freshEntity.__entitySet = entity.__entitySet
      this.props.replace(undefined, freshEntity)
    } catch (e) {
      console.error(e)
    }

    if (this.componentMounted) {
      this.setState({
        isSaving: false
      })

      this.props.close()
    }
  }

  render () {
    const { isSaving } = this.state
    const { entity } = this.props

    return (
      <div>
        <h2>Entity&nbsp;<b>{entity.name} ({configuration.entitySets[entity.__entitySet].visibleName || entity.__entitySet})</b> was updated by another source.</h2>
        <div>
          You can either choose <b>"Refresh entity"</b>, which will discard the local changes you have
          {' '}done and will load the entity from the store again, or you can choose <b>"Override"</b>, which will save the local changes to
          the store overriding any previous change.
        </div>

        <div className='button-bar'>
          <button
            ref={this.latestRef}
            className='button confirmation'
            disabled={isSaving}
            onClick={() => this.useLatest()}
          >
            Refresh entity
          </button>
          <button
            className='button danger'
            disabled={isSaving}
            onClick={() => this.override()}
          >
            Override
          </button>
        </div>
      </div>
    )
  }
}

ConcurrentUpdateErrorModal.propTypes = {
  close: PropTypes.func.isRequired,
  options: PropTypes.object.isRequired
}

function makeMapStateToProps () {
  const getById = createGetByIdSelector()

  return (state, props) => ({
    entity: getById(state, { id: props.options.entityId })
  })
}

export default connect(
  makeMapStateToProps,
  { ...entitiesActions }
)(ConcurrentUpdateErrorModal)
