
export default function addSubgraphConstraints (graph, constraintGraph, vs) {
  const prev = {}
  let rootPrev

  vs.forEach(v => {
    let child = graph.parent(v)
    let parent
    let prevChild
    while (child) {
      parent = graph.parent(child)

      if (parent) {
        prevChild = prev[parent]
        prev[parent] = child
      } else {
        prevChild = rootPrev
        rootPrev = child
      }

      if (prevChild && prevChild !== child) {
        constraintGraph.setEdge(prevChild, child)
        return
      }

      child = parent
    }
  })

  /*
  function dfs(v) {
    var children = v ? g.children(v) : g.children();
    if (children.length) {
      var min = Number.POSITIVE_INFINITY,
          subgraphs = [];
      children.forEach(function(child) {
        var childMin = dfs(child);
        if (g.children(child).length) {
          subgraphs.push({ v: child, order: childMin });
        }
        min = Math.min(min, childMin);
      });
      _.sortBy(subgraphs, "order").reduce(function(prev, curr) {
        cg.setEdge(prev.v, curr.v);
        return curr;
      });
      return min;
    }
    return g.node(v).order;
  }
  dfs(undefined);
  */
}
