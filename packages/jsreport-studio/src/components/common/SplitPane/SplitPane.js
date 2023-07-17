import PropTypes from 'prop-types'
import React, { Component } from 'react'
import Pane from './Pane'
import Resizer from './Resizer'
import { values as configuration } from '../../../lib/configuration'

class SplitPane extends Component {
  constructor (props) {
    super(props)

    this.splitPaneRef = React.createRef()
    this.resizerRef = React.createRef()
    this.pane1Ref = React.createRef()
    this.pane2Ref = React.createRef()

    this.state = {
      active: false,
      resized: false
    }

    this.getExternalEventListeners = this.getExternalEventListeners.bind(this)
    this.triggerEvent = this.triggerEvent.bind(this)
    this.collapse = this.collapse.bind(this)
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
  }

  componentDidMount () {
    this.setSize(this.props, this.state, (newSize) => {
      this.triggerEvent('change', newSize)
      this.triggerEvent('dragFinished')
    })

    document.addEventListener('mouseup', this.onMouseUp)
  }

  componentWillUnmount () {
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  getExternalEventListeners (eventName) {
    const listeners = []

    if (this.splitPaneRef.current == null) {
      return listeners
    }

    // eslint-disable-next-line
    for (const handler of configuration._splitResizeHandlers) {
      if (this.splitPaneRef.current.contains(handler.el) && handler.fnMap[eventName] != null) {
        listeners.push(handler.fnMap[eventName])
      }
    }

    return listeners
  }

  triggerEvent (eventName, ...payload) {
    try {
      if (eventName === 'change') {
        if (typeof this.props.onChange !== 'function') {
          return
        }

        return this.props.onChange(...payload)
      } else if (eventName === 'dragStarted') {
        if (typeof this.props.onDragStarted !== 'function') {
          return
        }

        return this.props.onDragStarted(...payload)
      } else if (eventName === 'dragFinished') {
        if (typeof this.props.onDragFinished !== 'function') {
          return
        }

        return this.props.onDragFinished(...payload)
      } else if (eventName === 'collapsing') {
        if (typeof this.props.onCollapsing !== 'function') {
          return
        }

        return this.props.onCollapsing(...payload)
      } else if (eventName === 'beforeCollapseChange') {
        if (typeof this.props.onBeforeCollapseChange !== 'function') {
          return
        }

        return this.props.onBeforeCollapseChange(...payload)
      } else if (eventName === 'collapseChange') {
        if (typeof this.props.onCollapseChange !== 'function') {
          return
        }

        return this.props.onCollapseChange(...payload)
      }
    } finally {
      const listeners = this.getExternalEventListeners(eventName)

      // eslint-disable-next-line
      for (const listener of listeners) {
        listener(...payload)
      }
    }
  }

  setSize (props, state, cb) {
    const ref = this.props.primary === 'first' ? this.pane1Ref.current : this.pane2Ref.current
    let newSize

    if (ref) {
      newSize = props.size || (state && state.draggedSize) || props.defaultSize || props.minSize

      ref.setState({
        size: newSize
      }, () => cb(newSize))
    }
  }

  unFocus () {
    if (document.selection) {
      document.selection.empty()
    } else {
      window.getSelection().removeAllRanges()
    }
  }

  merge (into, obj) {
    Object.assign(into, obj)
  }

  collapse (v) {
    const shouldCollapseAsync = (this.props.onCollapsing != null) ? this.triggerEvent('collapsing', v) : true

    Promise.resolve(shouldCollapseAsync).then((shouldCollapse) => {
      const ref1 = this.props.collapsable === 'first' ? this.pane2Ref.current : this.pane1Ref.current
      const ref2 = this.props.collapsable === 'first' ? this.pane1Ref.current : this.pane2Ref.current

      let stateToUpdate

      if (!shouldCollapse) {
        return
      }

      if (!v) {
        if (ref1) {
          ref1.setState({
            size: this.lastSize
          })
        }

        if (ref2) {
          ref2.setState({
            size: this.lastSize2
          })
        }

        stateToUpdate = {
          resized: true,
          collapsed: v,
          draggedSize: this.lastSize,
          position: this.lastSize
        }

        this.triggerEvent('beforeCollapseChange', v)

        this.setState(stateToUpdate, () => {
          this.triggerEvent('collapseChange', v)
        })
      } else {
        if (ref1) {
          this.lastSize = ref1.state.size
        }

        if (ref2) {
          this.lastSize2 = ref2.state.size
        }

        stateToUpdate = {
          collapsed: v,
          resized: true,
          draggedSize: undefined,
          position: undefined
        }

        this.triggerEvent('beforeCollapseChange', v)

        if (ref1) {
          ref1.setState({
            size: undefined
          })
        }

        if (ref2) {
          ref2.setState({
            size: 0
          })
        }

        this.setState(stateToUpdate, () => {
          this.triggerEvent('collapseChange', v)
        })
      }

      this.triggerEvent('dragFinished')
    })
  }

  onMouseDown (event) {
    if (this.props.allowResize && !this.props.size) {
      this.unFocus()
      const position = this.props.split === 'vertical' ? event.clientX : event.clientY

      this.triggerEvent('dragStarted')

      this.setState({
        active: true,
        position: position
      })

      document.addEventListener('mousemove', this.onMouseMove)
    }
  }

  onMouseMove (event, force) {
    if (this.props.allowResize && !this.props.size && !this.state.collapsed) {
      if (this.state.active || force) {
        this.unFocus()
        const ref = this.props.primary === 'first' ? this.pane1Ref.current : this.pane2Ref.current
        if (ref) {
          const node = ref.node

          if (node.getBoundingClientRect) {
            const width = node.getBoundingClientRect().width
            const height = node.getBoundingClientRect().height
            const current = this.props.split === 'vertical' ? event.clientX : event.clientY
            const size = this.props.split === 'vertical' ? width : height
            const position = this.state.position
            const newPosition = this.props.primary === 'first' ? (position - current) : (current - position)

            let newSize = size - newPosition

            if (newSize < this.props.minSize) {
              newSize = this.props.minSize
            } else {
              this.setState({
                position: current,
                resized: true
              })
            }

            this.triggerEvent('change', newSize)

            this.setState({
              draggedSize: newSize
            })

            ref.setState({
              size: newSize
            })
          }
        }
      }
    }
  }

  onMouseUp () {
    document.removeEventListener('mousemove', this.onMouseMove)

    if (this.props.allowResize && !this.props.size) {
      if (this.state.active) {
        this.triggerEvent('dragFinished')

        this.setState({
          active: false
        })
      }
    }
  }

  renderPane (type, pane) {
    return pane
  }

  render () {
    const {
      split,
      allowResize,
      resizerClassName,
      renderCollapsedIcon,
      collapsedText,
      collapsable,
      buttons = true
    } = this.props

    const { collapsed } = this.state
    const disabledClass = allowResize ? '' : 'disabled'

    const style = {
      display: 'flex',
      flex: 1,
      outline: 'none',
      overflow: 'hidden',
      MozUserSelect: 'text',
      WebkitUserSelect: 'text',
      msUserSelect: 'text',
      userSelect: 'text'
    }

    if (split === 'vertical') {
      this.merge(style, {
        flexDirection: 'row'
      })
    } else {
      this.merge(style, {
        flexDirection: 'column',
        width: '100%'
      })
    }

    const children = this.props.children
    const classes = ['SplitPane', this.props.className, split, disabledClass]

    return (
      <div className={classes.join(' ')} style={style} ref={this.splitPaneRef}>
        {this.renderPane(
          'first',
          <Pane ref={this.pane1Ref} key='pane1' className='Pane1' split={split}>{children[0]}</Pane>
        )}
        <Resizer
          ref={this.resizerRef}
          key='resizer'
          collapsable={collapsable}
          renderCollapsedIcon={renderCollapsedIcon}
          collapsedText={collapsedText}
          className={disabledClass + ' ' + resizerClassName}
          // eslint-disable-next-line
          onMouseDown={this.onMouseDown}
          collapsed={collapsed}
          split={split}
          collapse={this.collapse}
          buttons={buttons}
        />
        {this.renderPane(
          'second',
          <Pane ref={this.pane2Ref} key='pane2' className='Pane2' split={split}>{children[1]}</Pane>
        )}
      </div>
    )
  }
}

SplitPane.propTypes = {
  primary: PropTypes.oneOf(['first', 'second']),
  minSize: PropTypes.number,
  defaultSize: PropTypes.string,
  size: PropTypes.number,
  allowResize: PropTypes.bool,
  resizerClassName: PropTypes.string,
  split: PropTypes.oneOf(['vertical', 'horizontal']),
  onDragStarted: PropTypes.func,
  onDragFinished: PropTypes.func,
  onCollapsing: PropTypes.func,
  onBeforeCollapseChange: PropTypes.func,
  onCollapseChange: PropTypes.func
}

SplitPane.defaultProps = {
  split: 'vertical',
  minSize: 50,
  allowResize: true,
  primary: 'first',
  collapsable: 'second',
  defaultSize: '50%'
}

export default SplitPane
