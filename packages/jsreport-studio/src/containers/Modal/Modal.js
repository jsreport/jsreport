import PropTypes from 'prop-types'
import React, { Component } from 'react'
import ReactModal from 'react-modal'
import { connect } from 'react-redux'
import { actions as modalActions } from 'redux/modal'
import debounce from 'lodash/debounce'
import { values as configuration } from '../../lib/configuration'
import style from './Modal.css'

class ModalContent extends Component {
  constructor (props) {
    super(props)
    this.setNode = this.setNode.bind(this)
    this.adjustPosition = this.adjustPosition.bind(this)
  }

  componentDidMount () {
    this.adjustPosition()

    this.debouncedAdjustPosition = debounce(this.adjustPosition, 200)
    window.addEventListener('resize', this.debouncedAdjustPosition)
  }

  componentWillUnmount () {
    window.removeEventListener('resize', this.debouncedAdjustPosition)
  }

  setNode (el) {
    this.node = el
  }

  adjustPosition () {
    const containerNode = this.node.parentNode
    let maxWidth
    let maxHeight

    // get viewport without scrollbars
    const viewPort = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    }

    const containerDimensions = {
      // get the real height of content (even part that is not visible because overflow)
      width: Math.max(containerNode.scrollWidth, containerNode.clientWidth),
      height: Math.max(containerNode.scrollHeight, containerNode.clientHeight)
    }

    if (viewPort.width >= containerDimensions.width) {
      maxWidth = null
    } else {
      const targetMaxWidth = viewPort.width - 30
      maxWidth = targetMaxWidth > 0 ? targetMaxWidth : viewPort.width
    }

    if (viewPort.height >= containerDimensions.height) {
      maxHeight = null
    } else {
      const targetMaxHeight = viewPort.height - 30
      maxHeight = targetMaxHeight > 0 ? targetMaxHeight : viewPort.height
    }

    this.props.updateContainerPosition({
      viewPort,
      content: {
        width: maxWidth != null ? maxWidth : containerDimensions.width,
        height: maxHeight != null ? maxHeight : containerDimensions.height
      },
      maxWidth,
      maxHeight
    })
  }

  renderBody () {
    const { getBodyParams, onClose } = this.props
    const { componentOrText, options } = getBodyParams()

    if (componentOrText != null && typeof componentOrText !== 'string') {
      return React.createElement(componentOrText, {
        close: () => onClose(),
        options
      })
    }

    return (
      <div dangerouslySetInnerHTML={{ __html: componentOrText }} />
    )
  }

  render () {
    const { onClose, frameless } = this.props

    return (
      <div ref={this.setNode}>
        {frameless ? '' : <span className={style.close} onClick={() => onClose()} />}
        {this.renderBody()}
      </div>
    )
  }
}

class Modal extends Component {
  constructor () {
    super()

    this.state = this.defaultState()
    this.mounted = false

    this.getBodyParams = this.getBodyParams.bind(this)
    this.updateContainerPosition = this.updateContainerPosition.bind(this)
    this.close = this.close.bind(this)
    configuration.registerModalHandler(this)
  }

  componentDidMount () {
    this.mounted = true

    if (this.props.openCallback != null) {
      this.props.openCallback(this.open.bind(this))
    }
  }

  componentDidUpdate (prevProps) {
    if (prevProps.contentId !== this.props.contentId) {
      this.setState(this.defaultState())
    }
  }

  getBodyParams () {
    let componentOrText

    if (this.componentOrText != null) {
      componentOrText = this.componentOrText
    } else {
      componentOrText = this.props.text
    }

    return {
      componentOrText,
      options: this.options
    }
  }

  updateContainerPosition ({ viewPort, content, maxWidth, maxHeight }) {
    const stateToUpdate = {}
    const topSpace = 88

    if (viewPort.width > content.width) {
      stateToUpdate.left = '50%'
    } else {
      stateToUpdate.left = '0'
    }

    if (viewPort.height > content.height) {
      stateToUpdate.top = '50%'
    } else {
      stateToUpdate.top = '0'
    }

    const adjustedHeight = (content.height + topSpace)

    if (
      viewPort.height > adjustedHeight &&
      viewPort.height - adjustedHeight > topSpace
    ) {
      stateToUpdate.marginTop = `-${topSpace}px`
    } else {
      stateToUpdate.marginTop = null
    }

    stateToUpdate.maxWidth = maxWidth
    stateToUpdate.maxHeight = maxHeight

    this.setState(stateToUpdate)
  }

  defaultState () {
    return {
      top: '50%',
      left: '50%',
      marginTop: null,
      maxWidth: null,
      maxHeight: null
    }
  }

  renderContent () {
    return (
      <ModalContent
        key={this.props.contentId}
        getBodyParams={this.getBodyParams}
        updateContainerPosition={this.updateContainerPosition}
        frameless={this.componentOrText && this.componentOrText.frameless}
         // eslint-disable-next-line
        onClose={this.close}
      />
    )
  }

  open (componentOrText, options = {}) {
    this.componentOrText = componentOrText
    this.options = options
    this.props.open()
  }

  close () {
    this.options = null
    this.componentOrText = null
    this.props.close()
  }

  isModalOpen () {
    return this.props.isOpen === true
  }

  render () {
    const { text } = this.props
    const { top, left, marginTop, maxWidth, maxHeight } = this.state
    const isOpen = this.isModalOpen()

    // if error message from API was set then reset componentOrText and options
    if (this.mounted && text != null) {
      this.componentOrText = undefined
      this.options = {}
    }

    return (
      <ReactModal
        key='ReactModal'
        isOpen={isOpen}
        overlayClassName={style.overlay}
        className={style.content}
        style={{
          content: {
            top,
            left,
            marginTop,
            transform: `translateX(${left !== '0' ? `-${left}` : left}) translateY(${top !== '0' ? `-${top}` : top})`,
            maxWidth,
            maxHeight,
            overflow: 'auto',
            padding: (this.componentOrText && this.componentOrText.frameless) ? '0px' : '1.5rem'
          }
        }}
        contentRef={(el) => { this.contentRef = el }}
        overlayRef={(el) => { this.overlayRef = el }}
        onRequestClose={() => this.close()}
      >
        {isOpen ? this.renderContent() : ''}
      </ReactModal>
    )
  }
}

Modal.propTypes = {
  openCallback: PropTypes.func
}

export default connect((state) => ({
  contentId: state.modal.contentId,
  isOpen: state.modal.isOpen,
  text: state.modal.text
}), { ...modalActions })(Modal)
