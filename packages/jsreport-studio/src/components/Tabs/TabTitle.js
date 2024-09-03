import React, { Component } from 'react'
import { values as configuration } from '../../lib/configuration'
import storeMethods from '../../redux/methods'
import style from './Tabs.css'

class TabTitle extends Component {
  constructor (props) {
    super(props)
    this.setNode = this.setNode.bind(this)
    this.handleAuxClick = this.handleAuxClick.bind(this)
  }

  componentDidMount () {
    // workaround for chrome and firefox not handling middle click on normal "onClick" listener
    const isFirefox = typeof InstallTrigger !== 'undefined'
    const isChrome = !!window.chrome
    const shouldHandleAuxClick = isChrome || isFirefox

    if (shouldHandleAuxClick && this.node) {
      this.node.addEventListener('auxclick', this.handleAuxClick)
    }
  }

  componentWillUnmount () {
    // workaround for chrome and firefox not handling middle click on normal "onClick" listener
    const isFirefox = typeof InstallTrigger !== 'undefined'
    const isChrome = !!window.chrome
    const shouldHandleAuxClick = isChrome || isFirefox

    if (shouldHandleAuxClick && this.node) {
      this.node.removeEventListener('auxclick', this.handleAuxClick)
    }
  }

  setNode (el) {
    this.node = el
  }

  handleAuxClick (e) {
    if (e.which === 2) {
      return this.props.onClick(e, this.props.tab)
    }
  }

  render () {
    const { tab, active, contextMenu, complementTitle, onClick, onContextMenu, onClose } = this.props
    let tabTooltip
    let titleEl
    let titleComponentKey = tab.tab.titleComponentKey
    let customProps

    if (tab.entity) {
      const fullPath = storeMethods.resolveEntityPath(tab.entity, { parents: true, self: false })

      if (fullPath) {
        tabTooltip = fullPath
      }

      if (titleComponentKey == null) {
        let tabTitleComponentResult = {}

        configuration.tabTitleComponentKeyResolvers.some((componentKeyResolverFn) => {
          const componentKey = componentKeyResolverFn(tab.entity, tab.tab.docProp)
          let found = false

          if (componentKey) {
            tabTitleComponentResult = componentKey
            found = true
          }

          return found
        })

        customProps = { ...tabTitleComponentResult.props }
        titleComponentKey = tabTitleComponentResult.key
      }
    }

    if (titleComponentKey) {
      titleEl = React.createElement(configuration.tabTitleComponents[titleComponentKey], {
        ...customProps,
        entity: tab.entity,
        complementTitle,
        tab: tab.tab
      })
    } else {
      titleEl = [
        <span key='main-title' className={style.tabMainTitle}>{tab.tab.title || (tab.entity.name + (tab.entity.__isDirty ? '*' : ''))}</span>,
        (complementTitle != null && (
          <span key='complement-title' className={style.tabComplementTitle}>&nbsp;{`- ${complementTitle}`}</span>
        ))
      ]
    }

    return (
      <div
        ref={this.setNode}
        key={tab.tab.key}
        className={style.tabTitle + ' ' + (active ? style.active : '')}
        data-tab-key={tab.tab.key}
        title={tabTooltip}
        onClick={(e) => onClick(e, tab)}
        onContextMenu={(e) => onContextMenu(e, tab)}
      >
        <span>
          {titleEl}
        </span>
        <div className={style.tabClose} onClick={(e) => { e.stopPropagation(); onClose(tab.tab.key) }} />
        {contextMenu != null ? contextMenu : <div key='empty-contextmenu' />}
      </div>
    )
  }
}

export default TabTitle
