import sort from './sort'
import resolveConflicts from './resolve-conflicts'

export default function sortSubgraph (graph, v, constraintGraph, biasRight) {
  let movable = graph.children(v)
  const node = graph.node(v)
  const bl = node ? node.borderLeft : undefined
  const br = node ? node.borderRight : undefined
  const subgraphs = {}

  if (bl) {
    movable = movable.filter(w => w !== bl && w !== br)
  }

  const barycenters = barycenter(graph, movable)

  barycenters.forEach(entry => {
    if (graph.children(entry.v).length) {
      const subgraphResult = sortSubgraph(graph, entry.v, constraintGraph, biasRight)
      subgraphs[entry.v] = subgraphResult

      if (Object.hasOwn(subgraphResult, 'barycenter')) {
        mergeBarycenters(entry, subgraphResult)
      }
    }
  })

  const entries = resolveConflicts(barycenters, constraintGraph)
  expandSubgraphs(entries, subgraphs)

  const result = sort(entries, biasRight)

  if (bl && br) {
    result.vs = [bl, result.vs, br].flat(1)
    const blPredecessors = graph.predecessors(bl)

    if (blPredecessors && blPredecessors.length) {
      const blPred = graph.node(blPredecessors[0])
      const brPredecessors = graph.predecessors(br)
      const brPred = graph.node(brPredecessors[0])

      if (!Object.hasOwn(result, 'barycenter')) {
        result.barycenter = 0
        result.weight = 0
      }

      result.barycenter = (result.barycenter * result.weight +
          blPred.order + brPred.order) / (result.weight + 2)

      result.weight += 2
    }
  }

  return result
}

function expandSubgraphs (entries, subgraphs) {
  entries.forEach(entry => {
    entry.vs = entry.vs.flatMap(v => {
      if (subgraphs[v]) {
        return subgraphs[v].vs
      }
      return v
    })
  })
}

function barycenter (graph, movable = []) {
  return movable.map(v => {
    const inV = graph.inEdges(v)

    if (!inV || !inV.length) {
      return { v: v }
    } else {
      const result = inV.reduce((acc, e) => {
        const edge = graph.edge(e)
        const nodeU = graph.node(e.v)
        return {
          sum: acc.sum + (edge.weight * nodeU.order),
          weight: acc.weight + edge.weight
        }
      }, { sum: 0, weight: 0 })

      return {
        v: v,
        barycenter: result.sum / result.weight,
        weight: result.weight
      }
    }
  })
}

function mergeBarycenters (target, other) {
  if (target.barycenter !== undefined) {
    target.barycenter = (
      target.barycenter * target.weight +
      other.barycenter * other.weight
    ) / (target.weight + other.weight)
    target.weight += other.weight
  } else {
    target.barycenter = other.barycenter
    target.weight = other.weight
  }
}
