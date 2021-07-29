import React, { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import EntityTree from './EntityTree'
import NewFolderModal from '../Modals/NewFolderModal'
import NewEntityModal from '../Modals/NewEntityModal'
import DeleteConfirmationModal from '../Modals/DeleteConfirmationModal'
import RenameModal from '../Modals/RenameModal'
import { createGetReferencesSelector } from '../../redux/entities/selectors'
import { createGetActiveEntitySelector } from '../../redux/editor/selectors'
import { openModal } from '../../helpers/openModal'
import getCloneName from '../../../shared/getCloneName'
import { entitySets, entityTreeWrapperComponents, removeHandler } from '../../lib/configuration'
import styles from './EntityTreeBox.css'

const EntityTreeBox = () => {
  const getReferences = useMemo(createGetReferencesSelector, [])
  const getActiveEntity = useMemo(createGetActiveEntitySelector, [])
  const references = useSelector(getReferences)
  const activeEntity = useSelector(getActiveEntity)

  const executeNewHandling = useCallback(function executeNewHandling (es, options) {
    if (entitySets[es].onNew) {
      return entitySets[es].onNew(options || {})
    }

    openModal(NewEntityModal, { ...options, entitySet: es })
  }, [])

  const executeRenameHandling = useCallback(function executeRenameHandling (id) {
    openModal(RenameModal, { _id: id })
  }, [])

  const executeCloneHandling = useCallback(function executeCloneHandling (entity) {
    let modalToOpen

    const options = {
      cloning: true,
      entity: entity,
      initialName: getCloneName(entity.name)
    }

    if (entity.__entitySet === 'folders') {
      modalToOpen = NewFolderModal
    } else {
      modalToOpen = NewEntityModal
      options.entitySet = entity.__entitySet
    }

    openModal(modalToOpen, options)
  }, [])

  const executeRemoveHandling = useCallback(function executeRemoveHandling (id, children) {
    if (removeHandler) {
      return removeHandler(id, children)
    }

    openModal(DeleteConfirmationModal, { _id: id, childrenIds: children })
  }, [])

  let entityTreeEl = null

  const containerStyles = {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    // firefox needs min-height and min-width explicitly declared to allow descendants flex items to be scrollable (overflow)
    minWidth: 0,
    minHeight: 0
  }

  const entityTreeProps = {
    main: true,
    toolbar: true,
    onNewEntity: executeNewHandling,
    onRename: executeRenameHandling,
    onClone: executeCloneHandling,
    onRemove: executeRemoveHandling,
    activeEntity,
    entities: references
  }

  // if there are no components registered, defaults to rendering the EntityTree alone
  if (!entityTreeWrapperComponents.length) {
    entityTreeEl = React.createElement(EntityTree, entityTreeProps)
  } else {
    // composing components
    const wrappedEntityTree = entityTreeWrapperComponents.reduce((prevElement, component) => {
      const propsToWrapper = {
        entities: references,
        entitySets: entitySets,
        containerStyles
      }

      if (prevElement == null) {
        return React.createElement(
          component,
          propsToWrapper,
          React.createElement(EntityTree, entityTreeProps)
        )
      }

      return React.createElement(
        component,
        propsToWrapper,
        prevElement
      )
    }, null)

    if (wrappedEntityTree != null) {
      entityTreeEl = wrappedEntityTree
    }
  }

  return (
    <div className={styles.boxContainer}>
      {entityTreeEl}
    </div>
  )
}

export default EntityTreeBox
