import React, { useCallback } from 'react'
import EntityTreeButton from './EntityTreeButton'
import openTextSearch from '../../helpers/openTextSearch'

const isMac = () => window.navigator.platform.toUpperCase().indexOf('MAC') >= 0

const EntityTreeTextSearchButton = () => {
  const handleOpeningTextSearch = useCallback(() => {
    openTextSearch()
  }, [])

  return (
    <div style={{ display: 'inline-block', marginLeft: '0.2rem', marginRight: '0.2rem' }} title={`Text based search ${isMac ? 'CMD' : 'CTRL'}+SHIFT+F`}>
      <EntityTreeButton onClick={handleOpeningTextSearch}>
        <i className='fa fa-search' />
      </EntityTreeButton>
    </div>
  )
}

export default EntityTreeTextSearchButton
