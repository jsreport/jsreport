import classNames from 'classnames'
import dagre from '@dagrejs/dagre'
import sortGraph from './sortGraph'
import getStateAtProfileOperation from '../../../../helpers/getStateAtProfileOperation'
import styles from '../../Preview.css'

const timestampFormatter = new Intl.DateTimeFormat(navigator.language,
  {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    fractionalSecondDigits: 3,
    hour12: false
  }
)

export default function getElementsFromOperations (operations, errorEvent) {
  const result = {
    nodes: [],
    edges: []
  }

  const mainProfileOperation = operations.find(o => o.startEvent && o.startEvent.subtype === 'profile')

  if (!mainProfileOperation) {
    return [result.nodes, result.edges]
  }

  const mainRenderOperation = operations.find(o => o.startEvent && o.startEvent.subtype === 'render')

  const allEvents = [errorEvent, ...operations.map(o => o.startEvent), ...operations.map(o => o.endEvent)].filter(e => e)

  allEvents.sort((a, b) => (a.timestamp - b.timestamp))

  const lastEvent = allEvents[allEvents.length - 1]
  const mainStartTimestamp = mainProfileOperation.startEvent.timestamp
  const mainEndTimestamp = mainProfileOperation.endEvent ? mainProfileOperation.endEvent.timestamp : lastEvent.timestamp

  let erroredOperation

  if (errorEvent && errorEvent.previousOperationId) {
    erroredOperation = operations.find(o => o.id === errorEvent.previousOperationId)
  }

  const defaultPosition = { x: 0, y: 0 }

  const needsEndNode = []
  let lastNode

  let hasSubgroups = false

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i]
    let parentId = operation.startEvent.operationGroupId

    if (parentId) {
      parentId = `${parentId}-group`
    }

    if (operation.previousOperationId != null) {
      result.edges.push(createEdge(operation.previousOperationId, operation.id, {
        data: {
          outputId: operation.previousOperationId,
          inputId: operation.id
        }
      }))
    }

    const newNode = {
      id: operation.id,
      data: {
        label: operation.name,
        timestamp: operation.startEvent.timestamp,
        operation,
        error: errorEvent
      },
      position: defaultPosition,
      type: 'operation'
    }

    if (i === 0) {
      // the first node (the main profile) is always a start node
      newNode.data.startNode = 'profile'
    }

    if (operation.startEvent.group != null) {
      const groupNodeId = `${operation.id}-group`

      const groupClass = classNames('react-flow__node-group', styles.profileOperationGroupNode)

      if (!hasSubgroups && parentId != null) {
        hasSubgroups = true
      }

      const groupNode = {
        id: groupNodeId,
        data: {
          label: operation.startEvent.group,
          timestamp: operation.startEvent.timestamp,
          time: getTime(operation, mainEndTimestamp),
          timeCost: getTimeCost(operation, mainStartTimestamp, mainEndTimestamp)
        },
        position: defaultPosition,
        type: 'operationGroup',
        className: groupClass
      }

      if (parentId) {
        groupNode.parentId = parentId
      }

      result.nodes.push(groupNode)

      newNode.data.startNode = operation.startEvent.subtype === 'render' ? 'render' : 'operation'
      newNode.parentId = groupNodeId
    } else if (parentId) {
      newNode.parentId = parentId
    }

    if (operation.startEvent.subtype === 'render' && operation.endEvent) {
      const endNodeValues = []

      if (mainRenderOperation?.id === operation.id) {
        // dont make the end node of main render part of the group
        endNodeValues.push(null)
      } else {
        endNodeValues.push(newNode.parentId)
      }

      endNodeValues.push(operation)
      needsEndNode.push(endNodeValues)
    }

    if (newNode.data.startNode) {
      // for start nodes we calculate time against the next start event for next operation
      const customOperation = {
        startEvent: {
          timestamp: newNode.data.timestamp
        },
        endEvent: {
          timestamp: mainEndTimestamp
        }
      }

      let nextEvent

      // take the event of the next operation
      const nextOperation = operations.slice(i + 1).find((o) => (
        o.previousOperationId === operation.id &&
        o.startEvent.previousEventId === operation.startEvent.id
      ))

      if (operation.endEvent?.previousEventId === operation.startEvent.id && !nextOperation) {
        // if the end event is immediately after the start event and there is no next operation
        nextEvent = operation.endEvent
      } else {
        nextEvent = nextOperation?.startEvent
      }

      if (nextEvent) {
        customOperation.endEvent.timestamp = nextEvent.timestamp
      }

      newNode.data.time = getTime(customOperation, mainEndTimestamp)
      newNode.data.timeCost = getTimeCost(customOperation, mainStartTimestamp, mainEndTimestamp)
    } else {
      newNode.data.time = getTime(operation, mainEndTimestamp)
      newNode.data.timeCost = getTimeCost(operation, mainStartTimestamp, mainEndTimestamp)
    }

    newNode.domAttributes = {
      title: timestampFormatter.format(newNode.data.timestamp)
    }

    const nodeClass = classNames('react-flow__node-default', styles.profileOperationNode, {
      // constant blinking of the render operation is a bit annoying, so we don't do that
      // the global error with unknown operation is typically a timeout, so we keep blinking what was running
      [styles.running]: !operation.endEvent && operation.startEvent.subtype !== 'render' && erroredOperation == null && (i !== 0 || operations.length === 1),
      [styles.error]: erroredOperation === operation,
      [styles.profileStartNode]: newNode.data.startNode != null
    })

    newNode.className = nodeClass

    lastNode = newNode
    result.nodes.push(newNode)
  }

  const isFullRequestProfilingEnabled = operations[0].startEvent.data.mode === 'full'

  let mainEndNode

  // eslint-disable-next-line
  for (const [parentId, operation] of needsEndNode) {
    const endNodeClass = classNames('react-flow__node-default', styles.profileOperationNode, styles.profileEndNode)
    const endNodeId = `${operation.id}-end`
    let targetOperation = operation

    if (mainRenderOperation?.id === operation.id) {
      // the end node of the main render should display the whole time spent, including
      // from the profiler
      targetOperation = {
        startEvent: {
          timestamp: mainStartTimestamp
        },
        endEvent: {
          timestamp: operation.endEvent != null ? operation.endEvent.timestamp : mainEndTimestamp
        }
      }
    }

    const endNode = {
      id: endNodeId,
      data: {
        timestamp: targetOperation.endEvent.timestamp,
        time: getTime(targetOperation, mainEndTimestamp),
        timeCost: getTimeCost(targetOperation, mainStartTimestamp, mainEndTimestamp),
        isFullRequestProfilingEnabled,
        renderResult: {
          getContent: () => getStateAtProfileOperation(operations, operation.id, true)
        },
        mainEndNode: false,
        end: true
      },
      position: defaultPosition,
      type: 'operation',
      className: endNodeClass,
      domAttributes: {
        title: timestampFormatter.format(targetOperation.endEvent.timestamp)
      }
    }

    if (parentId) {
      endNode.parentId = parentId
    }

    if (mainRenderOperation?.id === operation.id) {
      mainEndNode = endNode
    }

    result.nodes.push(endNode)

    result.edges.push(createEdge(operation.endEvent.previousOperationId, endNodeId, {
      data: {
        outputId: operation.id,
        inputId: null
      }
    }))
  }

  // adding end node error if the render finished with error
  if (erroredOperation != null && lastNode != null && erroredOperation.id === lastNode.id) {
    const endNodeClass = classNames('react-flow__node-default', styles.profileOperationNode, styles.profileEndNode)
    const endNodeId = `${erroredOperation.id}-end`

    const customOperation = {
      startEvent: {
        timestamp: mainStartTimestamp
      },
      endEvent: {
        timestamp: erroredOperation.endEvent != null ? erroredOperation.endEvent.timestamp : mainEndTimestamp
      }
    }

    const time = getTime(customOperation, mainEndTimestamp)

    const endNode = {
      id: endNodeId,
      data: {
        time,
        timeCost: getTimeCost(customOperation, mainStartTimestamp, mainEndTimestamp),
        isFullRequestProfilingEnabled,
        error: errorEvent,
        mainEndNode: false,
        end: true
      },
      position: defaultPosition,
      type: 'operation',
      className: endNodeClass,
      domAttributes: {
        title: timestampFormatter.format(mainStartTimestamp + time)
      }
    }

    mainEndNode = endNode

    result.nodes.push(endNode)

    result.edges.push(createEdge(lastNode.id, endNodeId, {
      data: {
        outputId: lastNode.id,
        inputId: null
      }
    }))
  }

  if (mainEndNode) {
    mainEndNode.data.mainEndNode = true
  }

  const dagreGraph = new dagre.graphlib.Graph({ compound: true })

  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR', edgesep: 40 })

  for (const node of result.nodes) {
    // when the graph has subgroups we make the default height a bit bigger so there
    // is more space at the bottom of main group
    const dimensions = { width: 150, height: 50 }

    if (node.data?.startNode) {
      // we apply different width for the start node
      dimensions.width = 50
    } else if (node.data?.renderResult) {
      // we apply different width for the end/download node
      dimensions.width = 70
    } else if (node.type === 'operationGroup') {
      delete dimensions.width
      delete dimensions.height
    }

    dagreGraph.setNode(node.id, dimensions)

    if (node.parentId) {
      dagreGraph.setParent(node.id, node.parentId)
    }
  }

  for (const edge of result.edges) {
    dagreGraph.setEdge(edge.source, edge.target)
  }

  dagre.layout(dagreGraph, {
    customOrder: (graph) => {
      sortGraph(graph)
    }
  })

  for (const node of result.nodes) {
    const nodeWithPosition = dagreGraph.node(node.id)

    node.targetPosition = 'left'
    node.sourcePosition = 'right'

    if (node.type === 'operationGroup') {
      // when group, take the calculated dimensions from dagre layout
      node.style = {
        width: nodeWithPosition.width,
        height: nodeWithPosition.height
      }
    } else {
      // we need to declare this in order for nodes to appear on the minimap
      node.initialWidth = nodeWithPosition.width
      node.initialHeight = nodeWithPosition.height
    }

    if (node.parentId) {
      const parentNodeWithPosition = dagreGraph.node(node.parentId)

      node.position = {
        x: nodeWithPosition.x - (parentNodeWithPosition.x - parentNodeWithPosition.width / 2) - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - (parentNodeWithPosition.y - parentNodeWithPosition.height / 2) - nodeWithPosition.height / 2
      }
    } else {
      // we are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      node.position = {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2
      }
    }
  }

  return [result.nodes, result.edges]
}

function getTime (operation, endTimestamp) {
  return (operation.endEvent ? operation.endEvent.timestamp : endTimestamp) - operation.startEvent.timestamp
}

function getTimeCost (operation, startTimestamp, endTimestamp) {
  const totalCost = endTimestamp - startTimestamp
  const cost = (operation.endEvent ? operation.endEvent.timestamp : endTimestamp) - operation.startEvent.timestamp
  return cost / totalCost
}

function createEdge (sourceId, targetId, opts = {}) {
  const edgeId = `${sourceId}-edge-${targetId}`

  const edge = {
    id: edgeId,
    source: sourceId,
    target: targetId,
    type: 'customDefault',
    className: styles.profileOperationEdge,
    markerEnd: { type: 'arrowclosed' },
    ...opts
  }

  return edge
}
