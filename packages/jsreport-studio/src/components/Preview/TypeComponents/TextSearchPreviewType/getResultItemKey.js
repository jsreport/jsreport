
export default function getResultItemKey (result) {
  return `${result.entity._id}-${result.entitySet}`
}
