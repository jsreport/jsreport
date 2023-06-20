import Studio from 'jsreport-studio'
import React, { Component } from 'react'
import HistoryEditor from './HistoryEditor'
import LocalChangesEditor from './LocalChangesEditor'
import style from './VersionControl.css'

const Popup = Studio.Popup

Studio.initializeListeners.push(async () => {
  if (Studio.authentication && !Studio.authentication.isUserAdmin(Studio.authentication.user)) {
    return
  }

  Studio.addEditorComponent('versionControlHistory', HistoryEditor)
  Studio.addEditorComponent('versionControlLocalChanges', LocalChangesEditor)

  class VCToolbar extends Component {
    constructor (props) {
      super(props)

      this.state = {
        expandedMenu: false
      }

      this.handleVCMenuTrigger = this.handleVCMenuTrigger.bind(this)

      this.vcMenuTriggerRef = React.createRef()
      this.vcMenuContainerRef = React.createRef()
    }

    openHistory (e) {
      e.stopPropagation()
      Studio.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' })
    }

    openLocalChanges (e) {
      e.stopPropagation()
      Studio.openTab({ key: 'versionControlLocalChanges', editorComponentKey: 'versionControlLocalChanges', title: 'Uncommited changes' })
    }

    handleVCMenuTrigger (e) {
      e.stopPropagation()

      if (
        this.vcMenuTriggerRef.current == null ||
        this.vcMenuContainerRef.current == null
      ) {
        return
      }

      if (
        this.vcMenuTriggerRef.current.contains(e.target) &&
        !this.vcMenuContainerRef.current.contains(e.target)
      ) {
        this.setState((prevState) => ({
          expandedMenu: !prevState.expandedMenu
        }))
      }
    }

    render () {
      return (
        <div
          ref={this.vcMenuTriggerRef}
          className='toolbar-button'
          onClick={(e) => {
            this.openLocalChanges(e)
            this.setState({ expandedMenu: false })
          }}
        >
          <i className='fa fa-history ' />Commit
          <span
            className={style.runCaret}
            onClick={this.handleVCMenuTrigger}
          />
          <Popup
            ref={this.vcMenuContainerRef}
            open={this.state.expandedMenu}
            position={{ top: undefined, right: undefined }}
            onRequestClose={() => this.setState({ expandedMenu: false })}
          >
            {(itemProps) => {
              if (!itemProps.open) {
                return
              }

              return (
                <div
                  title='History'
                  className='toolbar-button'
                  onClick={(e) => {
                    this.openHistory(e)
                    itemProps.closeMenu()
                  }}
                >
                  <i className='fa fa-history' /><span>History</span>
                </div>
              )
            }}
          </Popup>
        </div>
      )
    }
  }

  Studio.addToolbarComponent(VCToolbar)
})
