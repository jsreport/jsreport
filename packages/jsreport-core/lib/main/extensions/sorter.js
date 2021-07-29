module.exports = (pa, pb) => {
  // todo, sort better by dependencies
  pa.dependencies = pa.dependencies || []
  pb.dependencies = pb.dependencies || []

  if (pa.dependencies.length > pb.dependencies.length) return 1
  if (pa.dependencies.length < pb.dependencies.length) return -1

  return 0
}
