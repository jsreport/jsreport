import dagre from '@dagrejs/dagre'
import * as util from './util'
import initOrder from './initOrder'
import sortSubgraph from './sort-subgraph'
import buildLayerGraph from './build-layer-graph'
import addSubgraphConstraints from './add-subgraph-constraints'

// NOTE: most of this code was extracted from dagre order function
// https://github.com/dagrejs/dagre/blob/master/lib/order/index.ts

// we have just adapt it to just consider the layering using up layers, instead
// of trying different combinations and choosing the one with best cross count score
export default function sortGraph (graph) {
  const maxRank = util.maxRank(graph)
  // const downLayerGraphs = buildLayerGraphs(graph, range(1, maxRank + 1), 'inEdges')
  const upLayerGraphs = buildLayerGraphs(graph, util.range(maxRank - 1, -1, -1), 'outEdges')

  let layering = initOrder(graph)

  assignOrder(graph, layering)

  const constraints = []

  sweepLayerGraphs(upLayerGraphs, true, constraints)

  layering = util.buildLayerMatrix(graph)

  assignOrder(graph, layering)
}

function buildLayerGraphs (graph, ranks, relationship) {
  // Build an index mapping from rank to the nodes with that rank.
  // This helps to avoid a quadratic search for all nodes with the same rank as
  // the current node.
  const nodesByRank = new Map()

  const addNodeToRank = (rank, node) => {
    if (!nodesByRank.has(rank)) {
      nodesByRank.set(rank, [])
    }

    nodesByRank.get(rank).push(node)
  }

  // Visit the nodes in their original order in the graph, and add each
  // node to the ranks(s) that it belongs to.
  for (const v of graph.nodes()) {
    const node = graph.node(v)

    if (typeof node.rank === 'number') {
      addNodeToRank(node.rank, v)
    }

    // If there is a range of ranks, add it to each, but skip the `node.rank` which
    // has already had the node added.
    if (typeof node.minRank === 'number' && typeof node.maxRank === 'number') {
      for (let r = node.minRank; r <= node.maxRank; r++) {
        if (r !== node.rank) {
          // Don't add this node to its `node.rank` twice.
          addNodeToRank(r, v)
        }
      }
    }
  }

  return ranks.map(function (rank) {
    return buildLayerGraph(graph, rank, relationship, nodesByRank.get(rank) || [])
  })
}

function sweepLayerGraphs (layerGraphs, biasRight, constraints) {
  const cg = new dagre.graphlib.Graph()

  layerGraphs.forEach(function (lg) {
    constraints.forEach(con => cg.setEdge(con.left, con.right))
    const root = (lg.graph()).root
    const sorted = sortSubgraph(lg, root, cg, biasRight)

    sorted.vs.forEach((v, i) => {
      lg.node(v).order = i
    })

    addSubgraphConstraints(lg, cg, sorted.vs)
  })
}

function assignOrder (graph, layering) {
  for (const layer of Object.values(layering)) {
    for (const [i, v] of layer.entries()) {
      graph.node(v).order = i
    }
  }
}
