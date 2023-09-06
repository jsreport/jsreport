import React, { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import EntityTree from './EntityTree'
import NewFolderModal from '../Modals/NewFolderModal'
import NewEntityModal from '../Modals/NewEntityModal'
import DeleteConfirmationModal from '../Modals/DeleteConfirmationModal'
import RenameModal from '../Modals/RenameModal'
import { createGetReferencesSelector } from '../../redux/entities/selectors'
import { openModal } from '../../helpers/openModal'
import getCloneName from '../../../shared/getCloneName'
import { values as configuration } from '../../lib/configuration'
import styles from './EntityTreeBox.css'

const EntityTreeBox = () => {
  const getReferences = useMemo(createGetReferencesSelector, [])
  const references = useSelector(getReferences)

  const executeNewHandling = useCallback(function executeNewHandling (es, options) {
    if (configuration.entitySets[es].onNew) {
      return configuration.entitySets[es].onNew(options || {})
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

  const executeRemoveHandling = useCallback(function executeRemoveHandling (toRemove) {
    openModal(DeleteConfirmationModal, { toRemove })
  }, [])

  const entityTreeProps = {
    main: true,
    toolbar: true,
    onNewEntity: executeNewHandling,
    onRename: executeRenameHandling,
    onClone: executeCloneHandling,
    onRemove: executeRemoveHandling,
    entities: references
  }

  return (
    <div className={styles.boxContainer}>
      <EntityTree
        {...entityTreeProps}
      />
    </div>
  )
}

export default EntityTreeBox
