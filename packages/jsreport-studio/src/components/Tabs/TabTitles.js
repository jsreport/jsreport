import { Component } from 'react'
import { connect } from 'react-redux'
import TabTitle from './TabTitle'
import CloseConfirmationModal from '../Modals/CloseConfirmationModal'
import { createGetTabWithEntitiesSelector } from '../../redux/editor/selectors'
import { activateTab, closeTab } from '../../redux/editor/actions'
import storeMethods from '../../redux/methods'
import { openModal } from '../../helpers/openModal'
import { values as configuration } from '../../lib/configuration'
import style from './Tabs.css'

const getEntityName = (e) => configuration.entitySets[e.__entitySet].nameAttribute ? e[configuration.entitySets[e.__entitySet].nameAttribute] : e.name

class TabTitles extends Component {
  constructor (props) {
    super(props)
    this.state = {}

    this.handleCloseTab = this.handleCloseTab.bind(this)
    this.handleTabClick = this.handleTabClick.bind(this)
    this.handleTabContextMenu = this.handleTabContextMenu.bind(this)
  }

  componentDidMount () {
    window.addEventListener('click', () => this.tryHide())
  }

  componentWillUnmount () {
    window.removeEventListener('click', () => this.tryHide())
  }

  tryHide () {
    if (this.state.contextMenuKey) {
      this.setState({ contextMenuKey: null })
    }
  }

  closeOtherTabs (tabKey) {
    const { tabs } = this.props

    tabs.forEach((t) => {
      if (t.tab.key === tabKey) {
        return
      }

      this.handleCloseTab(t.tab.key)
    })
  }

  closeTabsToTheRight (tabKey) {
    const { tabs } = this.props
    let currentTabIndex

    tabs.some((t, idx) => {
      if (t.tab.key === tabKey) {
        currentTabIndex = idx
        return true
      }

      return false
    })

    if (currentTabIndex != null) {
      for (let i = currentTabIndex + 1; i < tabs.length; i++) {
        this.handleCloseTab(tabs[i].tab.key)
      }
    }
  }

  closeTabsToTheLeft (tabKey) {
    const { tabs } = this.props
    let currentTabIndex

    tabs.some((t, idx) => {
      if (t.tab.key === tabKey) {
        currentTabIndex = idx
        return true
      }

      return false
    })

    if (currentTabIndex != null) {
      for (let i = 0; i < currentTabIndex; i++) {
        this.handleCloseTab(tabs[i].tab.key)
      }
    }
  }

  closeSavedTabs () {
    const { tabs } = this.props

    tabs.forEach((t) => {
      if (t.entity && t.entity.__isDirty === true) {
        return
      }

      this.handleCloseTab(t.tab.key)
    })
  }

  closeAllTabs () {
    const { tabs } = this.props

    tabs.forEach((t) => {
      this.handleCloseTab(t.tab.key)
    })
  }

  revealInTree (entity) {
    configuration.collapseEntityHandler({ _id: entity._id }, false, {
      parents: true,
      self: false,
      revealEntityId: entity._id
    })
  }

  handleTabClick (e, t) {
    if (
      (e.nativeEvent &&
      e.nativeEvent.which === 2) ||
      (!e.nativeEvent && e.which === 2)
    ) {
      e.stopPropagation()
      return this.handleCloseTab(t.tab.key)
    }

    this.props.activateTab(t.tab.key)
  }

  handleCloseTab (tabKey) {
    const entity = storeMethods.getEntityById(tabKey, false)

    if (!entity || !entity.__isDirty) {
      return this.props.closeTab(tabKey)
    }

    openModal(CloseConfirmationModal, { _id: tabKey })
  }

  handleTabContextMenu (e, t) {
    e.preventDefault()
    this.setState({ contextMenuKey: t.tab.key })
  }

  renderContextMenu (t) {
    const isDependantEntityTab = (
      t.tab.type === 'entity' &&
      // this check includes tabs like header-footer/pdf-utils
      t.tab.key !== t.tab._id
    )

    return (
      <div key='entity-contextmenu' className={style.contextMenuContainer}>
        <div className={style.contextMenu}>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.handleCloseTab(t.tab.key); this.tryHide() }}
          >
            Close Tab
          </div>
          {!isDependantEntityTab && (
            <div
              className={style.contextButton}
              onClick={(e) => { e.stopPropagation(); this.closeOtherTabs(t.tab.key); this.tryHide() }}
            >
              Close Other Tabs
            </div>
          )}
          {!isDependantEntityTab && (
            <div
              className={style.contextButton}
              onClick={(e) => { e.stopPropagation(); this.closeTabsToTheRight(t.tab.key); this.tryHide() }}
            >
              Close Tabs to the Right
            </div>
          )}
          {!isDependantEntityTab && (
            <div
              className={style.contextButton}
              onClick={(e) => { e.stopPropagation(); this.closeTabsToTheLeft(t.tab.key); this.tryHide() }}
            >
              Close Tabs to the Left
            </div>
          )}
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeSavedTabs(); this.tryHide() }}
          >
            Close Saved Tabs
          </div>
          <div
            className={style.contextButton}
            onClick={(e) => { e.stopPropagation(); this.closeAllTabs(); this.tryHide() }}
          >
            Close All Tabs
          </div>
          {t.entity && (
            <hr />
          )}
          {t.entity && (
            <div
              className={style.contextButton}
              onClick={(e) => { e.stopPropagation(); this.revealInTree(t.entity); this.tryHide() }}
            >
              Reveal in Tree
            </div>
          )}
        </div>
      </div>
    )
  }

  renderTitle (t) {
    const { tabs, activeTabKey } = this.props
    const { contextMenuKey } = this.state
    let complementTitle

    if (t.tab.type === 'entity' && t.entity) {
      const currentName = getEntityName(t.entity)
      const duplicated = tabs.some((targetT) => {
        if (targetT.entity != null && targetT.entity._id !== t.entity._id) {
          const targetName = getEntityName(targetT.entity)
          return currentName != null && targetName != null && currentName === targetName
        }

        return false
      })

      if (duplicated) {
        const currentPath = storeMethods.resolveEntityPath(t.entity)
        complementTitle = `${currentPath.split('/').slice(1, -1).join('/')}`

        if (complementTitle === '') {
          complementTitle = null
        }
      }
    }

    return (
      <TabTitle
        key={t.tab.key}
        active={t.tab.key === activeTabKey}
        contextMenu={contextMenuKey != null && contextMenuKey === t.tab.key ? this.renderContextMenu(t) : undefined}
        tab={t}
        complementTitle={complementTitle}
        onClick={this.handleTabClick}
        onContextMenu={this.handleTabContextMenu}
        onClose={this.handleCloseTab}
      />
    )
  }

  render () {
    return (
      <div className={style.tabTitles}>
        {this.props.tabs.map((t) => this.renderTitle(t))}
      </div>
    )
  }
}

function makeMapStateToProps () {
  const getTabWithEntities = createGetTabWithEntitiesSelector()

  return (state) => ({
    activeTabKey: state.editor.activeTabKey,
    tabs: getTabWithEntities(state)
  })
}

export default connect(makeMapStateToProps, {
  activateTab,
  closeTab
})(TabTitles)
