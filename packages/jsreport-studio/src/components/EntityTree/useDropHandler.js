import { useEffect, useRef, useCallback } from 'react'
import { useDrop } from 'react-dnd'
import acceptDrop from './acceptDrop'
import usePrevious from '../../hooks/usePrevious'
import { pointIsInsideContainer } from './utils'
import { values as configuration } from '../../lib/configuration'

export default function useDropHandler ({
  listRef,
  dragOverContextRef,
  onDragOverNode,
  onDragOut,
  onDragEnd
}) {
  const dragLastClientOffsetRef = useRef(null)

  const onDragOver = ({ clientOffset, sourceNode, isOverShallow }) => {
    const listNodeDimensions = listRef.current.node.getBoundingClientRect()
    const isInsideContainer = pointIsInsideContainer(listNodeDimensions, clientOffset)

    if (
      isOverShallow &&
      !isInsideContainer
    ) {
      if (clientOffset.y < listNodeDimensions.top) {
        dragOverContextRef.current = null
        return onDragOut()
      }

      return onDragOverNode(sourceNode)
    }

    const { targetNode } = dragOverContextRef.current || {}

    if (!targetNode) {
      return
    }

    onDragOverNode(sourceNode, targetNode)
  }

  const [{ isDraggingOver, canDrop, draggedNode }, connectDropTarget] = useDrop({
    accept: acceptDrop(),
    collect: (monitor) => ({
      draggedNode: monitor.getItem(),
      isDraggingOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    }),
    hover: (item, monitor) => {
      if (!monitor.isOver()) {
        return
      }

      const clientOffset = monitor.getClientOffset()

      if (
        dragLastClientOffsetRef.current != null &&
        dragLastClientOffsetRef.current.x === clientOffset.x &&
        dragLastClientOffsetRef.current.y === clientOffset.y
      ) {
        // skip update if the we are at the same position
        // this prevents triggering a lot of setState calls
        return
      }

      dragLastClientOffsetRef.current = clientOffset

      onDragOver({
        clientOffset,
        sourceNode: monitor.getItem().node,
        isOverShallow: monitor.isOver({ shallow: true })
      })
    },
    drop: (item, monitor) => {
      const draggedItem = monitor.getItem()
      const dropResolvers = configuration.entityTreeDropResolvers.filter((resolver) => resolver.type === monitor.getItemType())

      if (dropResolvers.length === 0) {
        return
      }

      const dropComplete = () => {
        dragLastClientOffsetRef.current = null
        dragOverContextRef.current = null
        onDragEnd()
      }

      const runResolvers = (resolvers, idx) => {
        const i = idx || 0
        const currentResolver = resolvers[i]

        const end = (value) => {
          value++

          if (value === resolvers.length) {
            return
          }

          runResolvers(resolvers, value)
        }

        currentResolver.handler({
          draggedItem,
          dragOverContext: dragOverContextRef.current,
          dropComplete
        }).then(() => {
          end(i)
        }, (err) => {
          console.error(err)
          end(i)
        })
      }

      runResolvers(dropResolvers)
    }
  })

  const dragOverNode = useCallback((dragOverContext) => {
    if (!dragOverContext) {
      return
    }

    if (
      dragOverContextRef.current != null &&
      dragOverContextRef.current.targetNode.data._id === dragOverContext.targetNode.data._id
    ) {
      dragOverContextRef.current = Object.assign(dragOverContextRef.current, dragOverContext)
    } else {
      dragOverContextRef.current = dragOverContext
    }
  }, [dragOverContextRef])

  const prevIsDraggingOver = usePrevious(isDraggingOver)
  const prevCanDrop = usePrevious(canDrop)
  const prevDraggedNode = usePrevious(draggedNode)

  useEffect(() => {
    const draggedNodeChanged = prevDraggedNode && !draggedNode

    const draggingOverChanged = (
      prevIsDraggingOver &&
      !isDraggingOver &&
      // ensure that we don't process this part when dropping
      // (when dropping, canDrop changes to false)
      prevCanDrop &&
      canDrop
    )

    if (draggedNodeChanged || draggingOverChanged) {
      dragOverContextRef.current = null
      dragLastClientOffsetRef.current = null

      if (draggingOverChanged) {
        onDragOut()
      } else {
        onDragEnd()
      }
    }
  })

  return {
    draggedNode,
    dragOverNode,
    connectDropTarget
  }
}
