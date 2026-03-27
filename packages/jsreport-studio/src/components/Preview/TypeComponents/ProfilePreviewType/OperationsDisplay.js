import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import classNames from 'classnames'
import { ReactFlowProvider, ReactFlow, Controls, isNode } from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import OperationNode from './OperationNode'
import DefaultEdge from './DefaultEdge'
import getStateAtProfileOperation from '../../../../helpers/getStateAtProfileOperation'
import '@xyflow/react/dist/style.css'
import styles from '../../Preview.css'

const nodeTypes = {
  operation: OperationNode
}

const edgeTypes = {
  customDefault: DefaultEdge
}

const proOptions = { hideAttribution: true }

const defaultViewport = { x: 0, y: 0, zoom: 0.8 }

const OperationsDisplay = React.memo(function OperationsDisplay (props) {
  const { templateShortid, profileOperations, profileErrorEvent, onCanvasClick, onElementClick, renderErrorModal } = props
  const lastFitViewDisplayRef = useRef(undefined)
  const graphInstanceRef = useRef(undefined)

  const handleInit = useCallback((reactFlowInstance) => {
    graphInstanceRef.current = reactFlowInstance
    lastFitViewDisplayRef.current = null

    let storedViewInfo = window.sessionStorage.getItem('profileCanvasView')

    if (storedViewInfo == null) {
      lastFitViewDisplayRef.current = Date.now()
      return
    }

    storedViewInfo = JSON.parse(storedViewInfo)

    if (storedViewInfo.templateShortid === templateShortid) {
      graphInstanceRef.current.setViewport({ x: storedViewInfo.x, y: storedViewInfo.y, zoom: storedViewInfo.zoom })
    } else {
      window.sessionStorage.removeItem('profileCanvasView')
      lastFitViewDisplayRef.current = Date.now()
      // initial fit to view
      graphInstanceRef.current.fitView({ padding: 0.25 })
    }
  }, [templateShortid])

  const handleElementClick = useCallback((ev, element) => {
    if (isNode(element)) {
      onElementClick({ id: element.id, isEdge: false, data: { operation: element.data.operation, error: element.data.error } })
    } else {
      onElementClick({ id: element.id, isEdge: true, data: { edge: element } })
    }
  }, [onElementClick])

  const [nodes, edges] = useMemo(() => getElementsFromOperations(profileOperations, profileErrorEvent), [profileOperations, profileErrorEvent])

  const mainRenderOperation = profileOperations.find(o => o.startEvent && o.startEvent.subtype === 'render')
  const isCompleted = mainRenderOperation && (mainRenderOperation.endEvent || profileErrorEvent)

  // handle progressive fit to view in canvas
  useEffect(() => {
    const elementsCount = nodes.length + edges.length

    if (elementsCount === 0 || lastFitViewDisplayRef.current == null || isCompleted) {
      return
    }

    const timeoutId = setTimeout(() => {
      lastFitViewDisplayRef.current = Date.now()
      graphInstanceRef.current.fitView({ padding: 0.25 })
    }, 50)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [nodes, edges, isCompleted])

  // handle the last fit to view when the operations are completed, it also
  // remembers the final canvas view information that the operations produced,
  // so the next preview of same template will start with the same canvas view information
  useEffect(() => {
    if (graphInstanceRef.current == null) {
      return
    }

    const timeoutId = setTimeout(() => {
      if (graphInstanceRef.current == null) {
        return
      }

      if (isCompleted) {
        graphInstanceRef.current.fitView().then(() => {
          const instanceInfo = graphInstanceRef.current.toObject()

          window.sessionStorage.setItem('profileCanvasView', JSON.stringify({
            templateShortid,
            x: instanceInfo.viewport.x,
            y: instanceInfo.viewport.y,
            zoom: instanceInfo.viewport.zoom
          }))
        })
      }
    }, 200)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [isCompleted, templateShortid])

  return (
    <div className={styles.profileOperations}>
      {renderErrorModal(profileErrorEvent)}
      <ReactFlowProvider>
        <ReactFlow
          colorMode='light'
          proOptions={proOptions}
          nodes={nodes}
          edges={edges}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnScroll
          selectNodesOnDrag={false}
          onlyRenderVisibleElements={false}
          minZoom={0}
          defaultViewport={defaultViewport}
          onInit={handleInit}
          onNodeClick={handleElementClick}
          onEdgeClick={handleElementClick}
          onPaneClick={onCanvasClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
        >
          <Controls className={styles.profileControls} showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
})

function getElementsFromOperations (operations, errorEvent) {
  const result = {
    nodes: [],
    edges: []
  }

  const mainProfileOperation = operations.find(o => o.startEvent && o.startEvent.subtype === 'profile')

  if (!mainProfileOperation) {
    return [result.nodes, result.edges]
  }

  const allEvents = [errorEvent, ...operations.map(o => o.startEvent), ...operations.map(o => o.endEvent)].filter(e => e)

  allEvents.sort((a, b) => (a.timestamp - b.timestamp))

  const lastEvent = allEvents[allEvents.length - 1]
  const startTimestamp = mainProfileOperation.startEvent.timestamp
  const endTimestamp = mainProfileOperation.endEvent ? mainProfileOperation.endEvent.timestamp : lastEvent.timestamp

  let erroredOperation

  if (errorEvent && errorEvent.previousOperationId) {
    erroredOperation = operations.find(o => o.id === errorEvent.previousOperationId)
  }

  const defaultPosition = { x: 0, y: 0 }

  const needsEndNode = []
  let lastNode

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i]

    if (operation.previousOperationId != null) {
      result.edges.push(createEdge(operation.previousOperationId, operation.id, {
        data: {
          outputId: operation.previousOperationId,
          inputId: operation.id
        }
      }))
    }

    if (operation.startEvent.subtype === 'render' && operation.endEvent) {
      needsEndNode.push(operation)
    }

    const nodeClass = classNames('react-flow__node-default', styles.profileOperationNode, {
      // constant blinking of the render operation is a bit annoying, so we don't do that
      // the global error with unknown operation is typically a timeout, so we keep blinking what was running
      [styles.running]: !operation.endEvent && operation.startEvent.subtype !== 'render' && erroredOperation == null && (i !== 0 || operations.length === 1),
      [styles.error]: erroredOperation === operation,
      [styles.profileStartNode]: i === 0
    })

    const node = {
      id: operation.id,
      data: {
        isMainProfileNode: i === 0,
        label: operation.name,
        timestamp: startTimestamp,
        time: getTime(operation, endTimestamp),
        timeCost: getTimeCost(operation, startTimestamp, endTimestamp),
        operation,
        error: errorEvent
      },
      position: defaultPosition,
      type: 'operation',
      className: nodeClass
    }

    lastNode = node
    result.nodes.push(node)
  }

  // eslint-disable-next-line
  for (const operation of needsEndNode) {
    const endNodeClass = classNames('react-flow__node-default', styles.profileOperationNode, styles.profileEndNode)
    const endNodeId = `${operation.id}-end`

    const endNode = {
      id: endNodeId,
      data: {
        time: getTime(operation, endTimestamp),
        timeCost: getTimeCost(operation, startTimestamp, endTimestamp),
        isFullRequestProfilingEnabled: operations[0].startEvent.data.mode === 'full',
        renderResult: {
          getContent: () => getStateAtProfileOperation(operations, operation.id, true)
        },
        end: true
      },
      position: defaultPosition,
      type: 'operation',
      className: endNodeClass
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

    const endNode = {
      id: endNodeId,
      data: {
        time: getTime(erroredOperation, endTimestamp),
        timeCost: getTimeCost(erroredOperation, startTimestamp, endTimestamp),
        isFullRequestProfilingEnabled: operations[0].startEvent.data.mode === 'full',
        error: errorEvent,
        end: true
      },
      position: defaultPosition,
      type: 'operation',
      className: endNodeClass
    }

    result.nodes.push(endNode)

    result.edges.push(createEdge(lastNode.id, endNodeId, {
      data: {
        outputId: lastNode.id,
        inputId: null
      }
    }))
  }

  const dagreGraph = new dagre.graphlib.Graph()

  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: 'LR' })

  for (const node of result.nodes) {
    const dimensions = { width: 150, height: 50 }

    if (node.type === 'start') {
      dimensions.width = 10
    }

    dagreGraph.setNode(node.id, dimensions)
  }

  for (const edge of result.edges) {
    dagreGraph.setEdge(edge.source, edge.target)
  }

  dagre.layout(dagreGraph)

  for (const node of result.nodes) {
    const nodeWithPosition = dagreGraph.node(node.id)

    node.targetPosition = 'left'
    node.sourcePosition = 'right'

    // we need this little hack to pass a slightly different position
    // in order to notify react flow about the change
    node.position = {
      x: nodeWithPosition.x + Math.random() / 1000,
      y: nodeWithPosition.y
    }
  }

  return [result.nodes, result.edges]
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

function getTime (operation, endTimestamp) {
  return (operation.endEvent ? operation.endEvent.timestamp : endTimestamp) - operation.startEvent.timestamp
}

function getTimeCost (operation, startTimestamp, endTimestamp) {
  const totalCost = endTimestamp - startTimestamp
  const cost = (operation.endEvent ? operation.endEvent.timestamp : endTimestamp) - operation.startEvent.timestamp
  return cost / totalCost
}

export default OperationsDisplay
