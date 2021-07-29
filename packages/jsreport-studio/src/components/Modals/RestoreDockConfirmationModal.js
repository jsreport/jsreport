/* import PropTypes from 'prop-types' */
import React, { Component } from 'react'
import { connect } from 'react-redux'

class RestoreDockConfirmationModal extends Component {
  /* TODO
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }
  */

  constructor (props) {
    super(props)

    this.cancelRef = React.createRef()
  }

  componentDidMount () {
    setTimeout(() => this.cancelRef.current && this.cancelRef.current.focus(), 0)
  }

  dock () {
    this.props.close(true)
  }

  cancel () {
    this.props.close(false)
  }

  onResponse (ok) {
    if (ok) {
      this.dock()
      return
    }

    this.cancel()
  }

  render () {
    return (
      <div>
        <div>
          This action will close all preview tabs and will redirect rendering output back to pane.
          Do you want to continue?
        </div>

        <div className='button-bar'>
          <button className='button danger' onClick={() => this.onResponse(true)}>Yes</button>
          <button className='button confirmation' ref={this.cancelRef} onClick={() => this.onResponse(false)}>Cancel</button>
        </div>
      </div>
    )
  }
}

export default connect(
  undefined,
  undefined,
  (stateProps, dispatchProps, ownProps) => ({
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    close: (ok) => {
      ownProps.options.onResponse(ok)
      ownProps.close && ownProps.close()
    }
  })
)(RestoreDockConfirmationModal)
