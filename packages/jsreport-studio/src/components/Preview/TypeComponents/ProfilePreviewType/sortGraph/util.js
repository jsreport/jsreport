
const CHUNKING_THRESHOLD = 65535

export function applyWithChunking (fn, argsArray) {
  if (argsArray.length > CHUNKING_THRESHOLD) {
    const chunks = splitToChunks(argsArray)
    return fn(...chunks.map(chunk => fn(...chunk)))
  } else {
    return fn(...argsArray)
  }
}

export function range (start, limit, step = 1) {
  if (limit == null) {
    limit = start
    start = 0
  }

  let endCon = (i) => i < limit

  if (step < 0) {
    endCon = (i) => limit < i
  }

  const range = []

  for (let i = start; endCon(i); i += step) {
    range.push(i)
  }

  return range
}

export function maxRank (graph) {
  const nodes = graph.nodes()

  const nodeRanks = nodes.map(v => {
    const rank = graph.node(v).rank

    if (rank === undefined) {
      return Number.MIN_VALUE
    }

    return rank
  })

  return applyWithChunking(Math.max, nodeRanks)
}

/*
 * Given a DAG with each node assigned "rank" and "order" properties, this
 * function will produce a matrix with the ids of each node.
 */
export function buildLayerMatrix (graph) {
  const layering = range(maxRank(graph) + 1).map(() => [])

  graph.nodes().forEach(v => {
    const node = graph.node(v)
    const rank = node.rank

    if (rank !== undefined) {
      if (!layering[rank]) {
        layering[rank] = []
      }
      layering[rank][node.order] = v
    }
  })

  return layering
}

export function partition (collection, fn) {
  const result = { lhs: [], rhs: [] }

  collection.forEach(value => {
    if (fn(value)) {
      result.lhs.push(value)
    } else {
      result.rhs.push(value)
    }
  })

  return result
}

export function pick (source, keys) {
  const dest = {}

  for (const key of keys) {
    if (source[key] !== undefined) {
      dest[key] = source[key]
    }
  }

  return dest
}

let idCounter = 0

export function uniqueId (prefix) {
  const id = ++idCounter
  return prefix + ('' + id)
}

function splitToChunks (array, chunkSize = CHUNKING_THRESHOLD) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize)
    chunks.push(chunk)
  }
  return chunks
}
