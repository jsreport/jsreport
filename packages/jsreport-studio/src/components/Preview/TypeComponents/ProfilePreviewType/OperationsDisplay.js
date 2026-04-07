import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import classNames from 'classnames'
import { ReactFlowProvider, ReactFlow, Controls, ControlButton, MiniMap, isNode } from '@xyflow/react'
import OperationGroupNode from './OperationGroupNode'
import OperationNode from './OperationNode'
import DefaultEdge from './DefaultEdge'
import getElementsFromOperations from './getElementsFromOperations'
import '@xyflow/react/dist/style.css'
import styles from '../../Preview.css'

const nodeTypes = {
  operationGroup: OperationGroupNode,
  operation: OperationNode
}

const edgeTypes = {
  customDefault: DefaultEdge
}

const proOptions = { hideAttribution: true }

const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 0.8 }

const OperationsDisplay = React.memo(function OperationsDisplay (props) {
  const { templateShortid, profileOperations, profileErrorEvent, onCanvasClick, onElementClick, renderErrorModal } = props
  const lastFitViewDisplayRef = useRef(undefined)
  const graphInstanceRef = useRef(undefined)

  const defaultViewport = useMemo(() => {
    let storedViewInfo = window.sessionStorage.getItem('profileCanvasView')

    if (storedViewInfo == null) {
      return DEFAULT_VIEWPORT
    }

    storedViewInfo = JSON.parse(storedViewInfo)

    if (storedViewInfo.templateShortid !== templateShortid) {
      return DEFAULT_VIEWPORT
    }

    // when rendering the same template, start with the last viewport stored to minimize
    // layout shift/jumping
    return { x: storedViewInfo.x, y: storedViewInfo.y, zoom: storedViewInfo.zoom }
  }, [templateShortid])

  const handleInit = useCallback((reactFlowInstance) => {
    graphInstanceRef.current = reactFlowInstance
    lastFitViewDisplayRef.current = null

    let storedViewInfo = window.sessionStorage.getItem('profileCanvasView')

    if (storedViewInfo == null) {
      lastFitViewDisplayRef.current = Date.now()
      return
    }

    storedViewInfo = JSON.parse(storedViewInfo)

    if (storedViewInfo.templateShortid !== templateShortid) {
      // when new template, start with fit view with padding to minimize layout shift/jumping
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

  const minimapStyle = useMemo(() => ({ width: 150, height: 100 }), [])

  const [minimapActive, setMinimapActive] = useState(() => {
    return window.sessionStorage.getItem('profileMinimapActive') === 'true'
  })

  const minimapBtnClass = classNames({
    [styles.profileActiveControl]: minimapActive
  })

  const minimapToggler = useCallback(() => {
    setMinimapActive((cActive) => {
      const newActive = !cActive
      window.sessionStorage.setItem('profileMinimapActive', newActive)
      return newActive
    })
  }, [])

  let minimapContent = null

  if (minimapActive) {
    minimapContent = (
      <MiniMap
        style={minimapStyle}
        bgColor='rgba(221, 161, 52, 0.5)'
        maskStrokeColor='rgba(0, 0, 0, 0.5)'
        maskStrokeWidth={2}
        pannable
        zoomable
      />
    )
  }

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
          <Controls className={styles.profileControls} showInteractive={false}>
            <ControlButton onClick={minimapToggler}>
              <i className={`fa fa-map ${minimapBtnClass}`} />
            </ControlButton>
          </Controls>
          {minimapContent}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
})

export default OperationsDisplay
