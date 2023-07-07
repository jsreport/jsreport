import { values as configuration } from '../lib/configuration'

function resolveEntityTreeIconStyle (entity, info) {
  // eslint-disable-next-line
  for (const k in configuration.entityTreeIconResolvers) {
    const mode = configuration.entityTreeIconResolvers[k](entity, info)

    if (mode) {
      return mode
    }
  }

  return null
}

export default resolveEntityTreeIconStyle
