import * as util from './util'

export default function initOrder (graph) {
  const visited = {}
  const simpleNodes = graph.nodes().filter(v => !graph.children(v).length)
  const simpleNodesRanks = simpleNodes.map(v => graph.node(v).rank)
  const maxRank = util.applyWithChunking(Math.max, simpleNodesRanks)
  const layers = util.range(maxRank + 1).map(() => [])

  function dfs (v) {
    if (visited[v]) {
      return
    }

    visited[v] = true
    const node = graph.node(v)

    layers[node.rank].push(v)

    const successors = graph.successors(v)

    if (successors) {
      successors.forEach(dfs)
    }
  }

  const orderedVs = simpleNodes.sort((a, b) => graph.node(a).rank - graph.node(b).rank)
  orderedVs.forEach(dfs)

  return layers
}
