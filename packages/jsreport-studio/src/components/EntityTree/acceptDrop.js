import { values as configuration } from '../../lib/configuration'

export default function acceptDrop () {
  const valid = []

  configuration.entityTreeDropResolvers.forEach((resolver) => {
    if (valid.indexOf(resolver.type) === -1) {
      valid.push(resolver.type)
    }
  })

  return valid
}
