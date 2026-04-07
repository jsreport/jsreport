import * as util from './util'
import dagre from '@dagrejs/dagre'

export default function buildLayerGraph (
  graph,
  rank,
  relationship,
  nodesWithRank
) {
  if (!nodesWithRank) {
    nodesWithRank = graph.nodes()
  }

  const root = createRootNode(graph)

  const result = new dagre.graphlib.Graph({ compound: true })
    .setGraph({ root: root })
    .setDefaultNodeLabel((v) => graph.node(v))

  nodesWithRank.forEach((v) => {
    const node = graph.node(v)
    const parent = graph.parent(v)

    if (node.rank === rank || (node.minRank <= rank && rank <= node.maxRank)) {
      result.setNode(v)
      result.setParent(v, parent || root)

      // This assumes we have only short edges!
      const edges = graph[relationship](v)

      if (edges) {
        edges.forEach(e => {
          const u = e.v === v ? e.w : e.v
          const edge = result.edge(u, v)
          const weight = edge !== undefined ? edge.weight : 0
          result.setEdge(u, v, { weight: graph.edge(e).weight + weight })
        })
      }

      if (Object.hasOwn(node, 'minRank')) {
        result.setNode(v, {
          borderLeft: node.borderLeft[rank],
          borderRight: node.borderRight[rank]
        })
      }
    }
  })

  return result
}

function createRootNode (graph) {
  let v

  // eslint-disable-next-line
  while (graph.hasNode((v = util.uniqueId("_root"))));

  return v
}
