import React from 'react'
import EntityTreeButton from './EntityTreeButton'
import EntityFuzzyFinderModal from '../Modals/EntityFuzzyFinderModal.js'
import { openModal } from '../../helpers/openModal'

const EntityTreeNavigateButton = () => {
  return (
    <div style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }} title='Navigate CTRL+P'>
      <EntityTreeButton className='EntityTree-toolbarGroup' onClick={() => openModal(EntityFuzzyFinderModal, {})}>
        <i className='fa fa-arrow-right' />
      </EntityTreeButton>
    </div>
  )
}

export default EntityTreeNavigateButton
