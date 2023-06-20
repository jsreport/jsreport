import { entityTreeIconResolvers } from '../lib/configuration.js'

function resolveEntityTreeIconStyle (entity, info) {
  // eslint-disable-next-line
  for (const k in entityTreeIconResolvers) {
    const mode = entityTreeIconResolvers[k](entity, info)

    if (mode) {
      return mode
    }
  }

  return null
}

export default resolveEntityTreeIconStyle
