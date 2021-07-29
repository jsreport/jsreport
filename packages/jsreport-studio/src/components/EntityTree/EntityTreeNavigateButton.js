import React from 'react'
import EntityTreeButton from './EntityTreeButton'
import EntityFuzzyFinderModal from '../Modals/EntityFuzzyFinderModal.js'
import { openModal } from '../../helpers/openModal'

export default () => (
  <EntityTreeButton onClick={() => openModal(EntityFuzzyFinderModal, {})}>
    <i className='fa fa-arrow-right' title='Navigate CTRL+P' />
  </EntityTreeButton>
)
