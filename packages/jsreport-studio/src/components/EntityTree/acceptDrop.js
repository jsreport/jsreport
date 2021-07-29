import { entityTreeDropResolvers } from '../../lib/configuration.js'

export default function acceptDrop () {
  const valid = []

  entityTreeDropResolvers.forEach((resolver) => {
    if (valid.indexOf(resolver.type) === -1) {
      valid.push(resolver.type)
    }
  })

  return valid
}
