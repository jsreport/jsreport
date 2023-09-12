import React from 'react'
import { createContext } from 'use-context-selector'

const EntityTreeContext = React.createContext({})
const EntityTreeSelectedContext = createContext({})

export default EntityTreeContext
export { EntityTreeSelectedContext }
