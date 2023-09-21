import React from 'react'
import { createContext } from 'use-context-selector'

const EntityTreeContext = React.createContext({})
const EntityTreeSelectedContext = createContext({})
const EntityTreeCollapsedContext = createContext({})

export default EntityTreeContext
export { EntityTreeSelectedContext, EntityTreeCollapsedContext }
