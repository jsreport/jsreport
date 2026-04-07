import * as util from './util'

export default function resolveConflicts (entries, constraintGraph) {
  const mappedEntries = {}
  entries.forEach((entry, i) => {
    const tmp = {
      indegree: 0,
      in: [],
      out: [],
      vs: [entry.v],
      i: i
    }

    if (entry.barycenter !== undefined) {
      tmp.barycenter = entry.barycenter
      tmp.weight = entry.weight
    }
    mappedEntries[entry.v] = tmp
  })

  constraintGraph.edges().forEach(e => {
    const entryV = mappedEntries[e.v]
    const entryW = mappedEntries[e.w]

    if (entryV !== undefined && entryW !== undefined) {
      entryW.indegree++
      entryV.out.push(entryW)
    }
  })

  const sourceSet = Object.values(mappedEntries).filter(entry => !entry.indegree)

  return doResolveConflicts(sourceSet)
}

function doResolveConflicts (sourceSet) {
  const entries = []

  function handleIn (vEntry) {
    return (uEntry) => {
      if (uEntry.merged) {
        return
      }

      if (uEntry.barycenter === undefined ||
        vEntry.barycenter === undefined ||
        uEntry.barycenter >= vEntry.barycenter) {
        mergeEntries(vEntry, uEntry)
      }
    }
  }

  function handleOut (vEntry) {
    return (wEntry) => {
      wEntry.in.push(vEntry)
      if (--wEntry.indegree === 0) {
        sourceSet.push(wEntry)
      }
    }
  }

  while (sourceSet.length) {
    const entry = sourceSet.pop()
    entries.push(entry)
    entry.in.reverse().forEach(handleIn(entry))
    entry.out.forEach(handleOut(entry))
  }

  return entries.filter(entry => !entry.merged).map(entry => {
    return util.pick(entry, ['vs', 'i', 'barycenter', 'weight'])
  })
}

function mergeEntries (target, source) {
  let sum = 0
  let weight = 0

  if (target.weight) {
    sum += target.barycenter * target.weight
    weight += target.weight
  }

  if (source.weight) {
    sum += source.barycenter * source.weight
    weight += source.weight
  }

  target.vs = source.vs.concat(target.vs)
  target.barycenter = sum / weight
  target.weight = weight
  target.i = Math.min(source.i, target.i)
  source.merged = true
}
