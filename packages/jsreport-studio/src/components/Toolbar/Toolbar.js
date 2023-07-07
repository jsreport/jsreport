import PropTypes from 'prop-types'
import React, { Component, Fragment } from 'react'
import { connect } from 'react-redux'
import Popup from '../common/Popup'
import EntityFuzzyFinderModal from '../Modals/EntityFuzzyFinderModal'
import { createGetCanRunSelector, createGetActiveTabSelector, createGetActiveTabWithEntitySelector, createGetCanSaveSelector, createGetCanSaveAllSelector } from '../../redux/editor/selectors'
import { actions as editorActions } from '../../redux/editor'
import { openModal, isModalOpen } from '../../helpers/openModal'
import runLastActiveTemplate from '../../helpers/runLastActiveTemplate'
import openTextSearch from '../../helpers/openTextSearch'
import openStartup from '../../helpers/openStartup'
import resolveUrl from '../../helpers/resolveUrl'
import { values as configuration } from '../../lib/configuration'
import style from './Toolbar.css'
import logo from './js-logo.png'

const isMac = () => window.navigator.platform.toUpperCase().indexOf('MAC') >= 0

class Toolbar extends Component {
  constructor () {
    super()

    this.state = {
      activeRunAction: 'run',
      saving: false,
      expandedRun: false,
      expandedSettings: false
    }

    this.handleUpdate = this.handleUpdate.bind(this)
    this.handleRun = this.handleRun.bind(this)
    this.handleStopRun = this.handleStopRun.bind(this)
    this.handleShortcut = this.handleShortcut.bind(this)
    this.handleEarlyShortcut = this.handleEarlyShortcut.bind(this)
    this.handleRunMenuTrigger = this.handleRunMenuTrigger.bind(this)
    this.handleSettingsMenuTrigger = this.handleSettingsMenuTrigger.bind(this)
    this.handleSave = this.handleSave.bind(this)

    this.runMenuTriggerRef = React.createRef()
    this.runMenuContainerRef = React.createRef()
    this.settingsMenuTriggerRef = React.createRef()
    this.settingsMenuContainerRef = React.createRef()

    this.runActions = {
      run: {
        title: 'Run',
        icon: 'play',
        description: 'Run and preview report',
        action: () => {
          this.handleRun()
        }
      },
      runFullProfile: {
        title: 'Run (full profile)',
        icon: 'play-circle',
        description: 'Run with full profiling enabled',
        action: () => {
          this.handleRun({ profilerMode: 'full' })
        }
      },
      download: {
        title: 'Download',
        icon: 'download',
        description: 'Run and download output',
        action: () => {
          this.handleRun({ target: 'download' })
        }
      }
    }
  }

  componentDidMount () {
    window.addEventListener('keydown', this.handleShortcut)
    window.addEventListener('keydown', this.handleEarlyShortcut, true)
  }

  componentWillUnmount () {
    window.removeEventListener('keydown', this.handleShortcut)
    window.removeEventListener('keydown', this.handleEarlyShortcut, true)
  }

  handleUpdate (...params) {
    if (this.props.activeTab && this.props.activeTab.readOnly) {
      return
    }

    return this.props.update(...params)
  }

  handleRun (opts = {}) {
    runLastActiveTemplate(opts)
  }

  handleStopRun () {
    if (this.props.templateRunning != null) {
      this.props.stopRun(this.props.templateRunning)
    }
  }

  // this place captures key events very early (capture phase) so it can work
  // across other contexts that are using keybindings too (like the Ace editor)
  handleEarlyShortcut (e) {
    // ctrl + p -> activates Entity fuzzy finder modal
    if (e.ctrlKey && e.which === 80) {
      if (!isModalOpen()) {
        e.preventDefault()
        e.stopPropagation()

        openModal(EntityFuzzyFinderModal, {})
        return false
      }
    }

    // ctrl + shift + f, cmd + shift + f -> activates text search
    if (
      (isMac() && e.metaKey && e.shiftKey && e.which === 70) ||
      (!isMac() && e.ctrlKey && e.shiftKey && e.which === 70)
    ) {
      if (!isModalOpen()) {
        e.preventDefault()
        e.stopPropagation()

        openTextSearch()
        return false
      }
    }

    if (e.which === 119 && this.props.canRun) {
      const { activeRunAction } = this.state
      const activeRunActionInfo = this.runActions[activeRunAction]

      e.preventDefault()
      e.stopPropagation()

      if (this.props.templateRunning != null) {
        this.handleStopRun()
      } else {
        activeRunActionInfo.action()
      }

      return false
    }
  }

  handleShortcut (e) {
    if (
      (e.ctrlKey && e.shiftKey && e.which === 83) ||
      // handles CMD + SHIFT + S on Mac
      (isMac() && e.metaKey && e.shiftKey && e.which === 83)
    ) {
      e.preventDefault()

      if (this.props.canSaveAll && configuration.toolbarVisibilityResolver('SaveAll')) {
        this.handleSave(this.props.saveAll)
        return false
      }
    }

    if (
      (e.ctrlKey && e.which === 83) ||
      // handles CMD + S on Mac
      (isMac() && e.metaKey && e.which === 83)
    ) {
      e.preventDefault()

      if (this.props.canSave && configuration.toolbarVisibilityResolver('SaveAll')) {
        this.handleSave(this.props.save)
        return false
      }
    }
  }

  async handleSave (onSave) {
    if (this.state.saving) {
      return
    }

    try {
      this.setState({
        saving: true
      })

      await onSave()
    } finally {
      this.setState({
        saving: false
      })
    }
  }

  handleRunMenuTrigger (e) {
    e.stopPropagation()

    if (this.props.templateRunning != null) {
      return
    }

    if (
      this.runMenuTriggerRef.current == null ||
      this.runMenuContainerRef.current == null
    ) {
      return
    }

    if (
      this.runMenuTriggerRef.current.contains(e.target) &&
      !this.runMenuContainerRef.current.contains(e.target)
    ) {
      this.setState((prevState) => ({
        expandedRun: !prevState.expandedRun
      }))
    }
  }

  handleSettingsMenuTrigger (e) {
    e.stopPropagation()

    if (
      this.settingsMenuTriggerRef.current == null ||
      this.settingsMenuContainerRef.current == null
    ) {
      return
    }

    if (
      this.settingsMenuTriggerRef.current.contains(e.target) &&
      !this.settingsMenuContainerRef.current.contains(e.target)
    ) {
      this.setState((prevState) => ({
        expandedSettings: !prevState.expandedSettings
      }))
    }
  }

  renderButton (onClick, enabled, text, imageClass, tooltip) {
    if (configuration.toolbarVisibilityResolver(text) === false) {
      return null
    }

    return (
      <div
        title={tooltip}
        className={'toolbar-button ' + ' ' + (enabled ? '' : 'disabled')}
        onClick={enabled ? onClick : () => {}}
      >
        <i className={imageClass} /><span>{text}</span>
      </div>
    )
  }

  renderRun () {
    const { activeRunAction } = this.state
    const { templateRunning, canRun } = this.props
    const activeRunActionInfo = this.runActions[activeRunAction]

    const subRunActions = []

    Object.keys(this.runActions).forEach((action) => {
      if (action === activeRunAction) {
        return
      }

      const runActionInfo = this.runActions[action]

      subRunActions.push((itemProps) => (
        this.renderButton((e) => {
          e.stopPropagation()
          itemProps.closeMenu()
          this.setState({ activeRunAction: action })
          runActionInfo.action()
        }, canRun, runActionInfo.title, `fa fa-${runActionInfo.icon}`, runActionInfo.description)
      ))
    })

    return (
      <div
        ref={this.runMenuTriggerRef}
        title={`${activeRunActionInfo.description} (F8)`}
        className={'toolbar-button ' + (canRun ? '' : 'disabled')}
        onClick={() => {
          if (!canRun) {
            return
          }

          if (templateRunning != null) {
            this.handleStopRun()
          } else {
            activeRunActionInfo.action()
          }

          this.setState({ expandedRun: false })
        }}
      >
        <i className={`fa fa-${templateRunning != null ? 'stop' : activeRunActionInfo.icon}`} />{templateRunning != null ? 'Stop' : activeRunActionInfo.title}
        <span
          className={style.runCaret}
          onClick={this.handleRunMenuTrigger}
        />
        <Popup
          ref={this.runMenuContainerRef}
          open={this.state.expandedRun}
          position={{ top: undefined, right: undefined }}
          onRequestClose={() => this.setState({ expandedRun: false })}
        >
          {(itemProps) => {
            if (!itemProps.open) {
              return
            }

            return (
              // eslint-disable-next-line react/jsx-fragments
              <Fragment>
                {subRunActions.map((Action, idx) => <Action key={idx} {...itemProps} />)}
              </Fragment>
            )
          }}
        </Popup>
      </div>
    )
  }

  renderToolbarComponents (position, onCloseMenu) {
    return configuration.toolbarComponents[position].map((p, i) => React.createElement(p, {
      key: i,
      tab: this.props.activeTabWithEntity,
      closeMenu: position === 'settings' || position === 'settingsBottom' ? onCloseMenu : undefined,
      onUpdate: this.handleUpdate,
      canRun: this.props.canRun,
      canSaveAll: this.props.canSaveAll
    }))
  }

  renderSettings () {
    if (configuration.toolbarVisibilityResolver('settings') === false) {
      return false
    }

    return (
      <div
        ref={this.settingsMenuTriggerRef}
        className='toolbar-button'
        onClick={this.handleSettingsMenuTrigger}
      >
        <i className='fa fa-cog' />
        <Popup
          ref={this.settingsMenuContainerRef}
          open={this.state.expandedSettings}
          position={{ top: undefined }}
          onRequestClose={() => this.setState({ expandedSettings: false })}
        >
          {(itemProps) => {
            if (!itemProps.open) {
              return
            }

            return (
              // eslint-disable-next-line
              <Fragment>
                {this.renderToolbarComponents('settings', itemProps.closeMenu)}
                {configuration.toolbarComponents.settingsBottom.length ? <hr /> : ''}
                {this.renderToolbarComponents('settingsBottom', itemProps.closeMenu)}
              </Fragment>
            )
          }}
        </Popup>
      </div>
    )
  }

  render () {
    const metaKey = isMac() ? 'CMD' : 'CTRL'
    const { canSave, canSaveAll, save, saveAll, isPending } = this.props

    return (
      <div className={style.toolbar}>
        <div className={style.logo} onClick={() => openStartup()}>
          <img
            src={configuration.extensions.studio.options.customLogo === true ? resolveUrl(`/studio/assets/custom-logo?${configuration.extensions.studio.options.serverStartupHash}`) : logo}
            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', display: 'inline-block' }}
          />
        </div>
        {this.renderRun()}
        {this.renderButton(() => this.handleSave(save), canSave, 'Save', 'fa fa-floppy-o', `Save current tab (${metaKey}+S)`)}
        {this.renderButton(() => this.handleSave(saveAll), canSaveAll, 'SaveAll', 'fa fa-floppy-o', `Save all tabs (${metaKey}+SHIFT+S`)}
        {this.renderToolbarComponents('left')}
        <div className={style.spinner}>
          {isPending ? <i className='fa fa-spinner fa-spin fa-fw' /> : ''}
        </div>
        {this.renderToolbarComponents('right')}
        {this.renderSettings()}
      </div>
    )
  }
}

Toolbar.propTypes = {
  templateRunning: PropTypes.string,
  isPending: PropTypes.bool.isRequired,
  canRun: PropTypes.bool.isRequired,
  canSave: PropTypes.bool.isRequired,
  canSaveAll: PropTypes.bool.isRequired,
  activeTab: PropTypes.object,
  activeTabWithEntity: PropTypes.object
}

function makeMapStateToProps () {
  const getActiveTab = createGetActiveTabSelector()
  const getActiveTabWithEntity = createGetActiveTabWithEntitySelector()
  const getCanRun = createGetCanRunSelector()
  const getCanSave = createGetCanSaveSelector()
  const getCanSaveAll = createGetCanSaveAllSelector()

  return (state) => ({
    templateRunning: state.editor.running,
    isPending: state.progress.isPending,
    canRun: getCanRun(state),
    canSave: getCanSave(state),
    canSaveAll: getCanSaveAll(state),
    activeTab: getActiveTab(state),
    activeTabWithEntity: getActiveTabWithEntity(state)
  })
}

export default connect(makeMapStateToProps, {
  stopRun: editorActions.stopRun,
  save: editorActions.save,
  saveAll: editorActions.saveAll,
  update: editorActions.update
})(Toolbar)
