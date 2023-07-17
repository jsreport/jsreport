import React, { Component } from 'react'
import EntityTreeButton from './EntityTreeButton'
import NewFolderModal from '../Modals/NewFolderModal'
import getVisibleEntitySetsInTree from '../../helpers/getVisibleEntitySetsInTree'
import { openModal } from '../../helpers/openModal'
import { values as configuration } from '../../lib/configuration'
import styles from './EntityTree.css'

class EntityTreeNewButton extends Component {
  constructor (props) {
    super(props)

    this.state = {
      isMenuActive: false
    }

    this.setMenuNode = this.setMenuNode.bind(this)
    this.tryHide = this.tryHide.bind(this)
    this.handleGlobalClick = this.handleGlobalClick.bind(this)
  }

  componentDidMount () {
    window.addEventListener('click', this.handleGlobalClick, true)
  }

  componentWillUnmount () {
    window.removeEventListener('click', this.handleGlobalClick, true)
  }

  setMenuNode (el) {
    this.menuNode = el
  }

  tryHide () {
    this.setState({
      isMenuActive: false
    })
  }

  handleGlobalClick (ev) {
    const LEFT_CLICK = 1
    const button = ev.which || ev.button

    if (!this.state.isMenuActive || !this.menuNode) {
      return
    }

    if (ev.target.type === 'file') {
      return
    }

    ev.preventDefault()

    if (!this.menuNode.contains(ev.target)) {
      ev.stopPropagation()

      // handle quirk in firefox that fires and additional click event during
      // contextmenu event, this code prevents the context menu to
      // immediately be closed after being shown in firefox
      if (button === LEFT_CLICK) {
        this.tryHide()
      }
    }
  }

  renderMenu () {
    const { isMenuActive } = this.state
    const menuItems = []

    if (!isMenuActive) {
      return null
    }

    const entitySetsMenuItems = getVisibleEntitySetsInTree(configuration.entitySets).map((entitySet) => (
      <div
        key={entitySet.name}
        className={styles.contextButton}
        onClick={() => {
          this.props.onNewEntity(entitySet.name)
          this.tryHide()
        }}
      >
        <i className={`fa ${entitySet.faIcon != null ? entitySet.faIcon : 'fa-file'}`} /> {entitySet.visibleName}
      </div>
    ))

    menuItems.push(
      <div
        key='New Entity'
        className={`${styles.contextButton} ${styles.hasNestedLevels}`}
        onClick={(e) => { e.stopPropagation() }}
      >
        <i className='fa fa-file' /> New Entity
        <div key='entity-contextmenu' className={`${styles.contextMenuContainer} ${styles.nestedLevel}`}>
          <div className={styles.contextMenu}>
            {entitySetsMenuItems}
          </div>
        </div>
        <span className={styles.contextButtonNestedIcon} />
      </div>
    )

    menuItems.push(
      <div
        key='New Folder'
        className={styles.contextButton}
        onClick={(e) => {
          e.stopPropagation()

          openModal(NewFolderModal, {})
          this.tryHide()
        }}
      >
        <i className='fa fa-folder' /> New Folder
      </div>
    )

    return (
      <div key='entity-contextmenu' ref={this.setMenuNode} className={styles.contextMenuContainer}>
        <div className={styles.contextMenu}>
          {menuItems}
        </div>
      </div>
    )
  }

  render () {
    return (
      <div title='Add new' style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }}>
        <EntityTreeButton onClick={() => this.setState((state) => ({ isMenuActive: !state.isMenuActive }))}>
          <span style={{ display: 'inline-block' }}>
            <i className='fa fa-plus' />
          </span>
        </EntityTreeButton>
        {this.renderMenu()}
      </div>
    )
  }
}

export default EntityTreeNewButton
