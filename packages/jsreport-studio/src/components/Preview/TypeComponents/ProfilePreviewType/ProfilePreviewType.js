import React, { useState, useEffect, useCallback } from 'react'
import SplitPane from '../../../common/SplitPane/SplitPane'
import OperationsDisplay from './OperationsDisplay'
import LogsDisplay from './LogsDisplay'
import ProfileInspectModal from '../../../Modals/ProfileInspectModal'
import ErrorModal from '../../../Modals/ErrorModal'
import usePrevious from '../../../../hooks/usePrevious'
import useOpenErrorLine from '../../useOpenErrorLine'
import useRenderErrorModal from '../../useRenderErrorModal'
import { openModal } from '../../../../helpers/openModal'
import getStateAtProfileOperation from '../../../../helpers/getStateAtProfileOperation'
import getLogNodeId from './getLogNodeId'
import styles from '../../Preview.css'

const ProfilePreviewType = React.memo(function ProfilePreviewType (props) {
  const { data, completed } = props
  const { template, profileOperations, profileLogs, profileErrorEvent } = data
  const [activeElement, setActiveElement] = useState(null)
  const prevActiveElement = usePrevious(activeElement)
  const openErrorLine = useOpenErrorLine()
  const { renderErrorModal } = useRenderErrorModal(openErrorLine)

  const handleCanvasClick = useCallback(() => {
    setActiveElement(null)
  }, [])

  const handleElementClick = useCallback((meta) => {
    if (!completed) {
      return
    }

    if (!meta.isEdge) {
      if (meta.data.error != null && meta.data.operation == null) {
        openModal(ErrorModal, { error: meta.data.error })
      } else if (meta.data.error != null && meta.data.operation != null) {
        if (
          meta.data.error.entity != null &&
          (meta.data.error.property === 'content' || meta.data.error.property === 'helpers') &&
          meta.data.error.lineNumber != null
        ) {
          openErrorLine(meta.data.error)
        } else {
          openModal(ErrorModal, { error: meta.data.error })
        }
      }

      if (meta.data.operation == null) {
        return setActiveElement(null)
      }
    } else {
      openInspectModal({
        profileOperations: profileOperations,
        sourceId: meta.data.edge.source,
        targetId: meta.data.edge.target,
        inputId: meta.data.edge.data.inputId,
        outputId: meta.data.edge.data.outputId,
        onClose: () => setActiveElement(null)
      })
    }

    setActiveElement((prevActiveElement) => {
      if (prevActiveElement != null && prevActiveElement.id === meta.id) {
        return null
      }

      return meta
    })
  }, [profileOperations, completed, openErrorLine])

  let activeOperation

  if (activeElement != null && !activeElement.isEdge) {
    activeOperation = activeElement
  }

  const prevActiveOperation = usePrevious(activeOperation)

  useEffect(function setActiveElementStyle () {
    if (prevActiveElement != null) {
      const prevElementNode = document.getElementById(prevActiveElement.id)

      if (prevElementNode == null || prevElementNode.parentNode == null) {
        return
      }

      if (prevElementNode.parentNode.classList.contains(styles.active)) {
        prevElementNode.parentNode.classList.remove(styles.active)
      }
    }

    if (activeElement != null) {
      const elementNode = document.getElementById(activeElement.id)

      if (elementNode == null || elementNode.parentNode == null) {
        return
      }

      if (!elementNode.parentNode.classList.contains(styles.active)) {
        elementNode.parentNode.classList.add(styles.active)
      }
    }
  }, [prevActiveElement, activeElement])

  useEffect(function setActiveLogsStyle () {
    if (prevActiveOperation != null) {
      const prevActiveLogIndexes = []

      for (let i = 0; i < profileLogs.length; i++) {
        if (profileLogs[i].previousOperationId === prevActiveOperation.id) {
          prevActiveLogIndexes.push(i)
        }
      }

      let firstLogNode

      for (let i = 0; i < prevActiveLogIndexes.length; i++) {
        const logIndex = prevActiveLogIndexes[i]
        const logNode = document.getElementById(getLogNodeId(logIndex))

        if (logNode == null) {
          continue
        }

        if (i === 0) {
          firstLogNode = logNode
        }

        if (logNode.classList.contains(styles.active)) {
          logNode.classList.remove(styles.active)
        }
      }

      if (firstLogNode && firstLogNode.parentNode && firstLogNode.parentNode.classList.contains(styles.active)) {
        firstLogNode.parentNode.classList.remove(styles.active)
      }
    }

    if (activeOperation != null) {
      const activeLogIndexes = []

      for (let i = 0; i < profileLogs.length; i++) {
        if (profileLogs[i].previousOperationId === activeOperation.id) {
          activeLogIndexes.push(i)
        }
      }

      let firstLogNode

      for (let i = 0; i < activeLogIndexes.length; i++) {
        const logIndex = activeLogIndexes[i]
        const logNode = document.getElementById(getLogNodeId(logIndex))

        if (logNode == null) {
          continue
        }

        if (i === 0) {
          firstLogNode = logNode
        }

        if (!logNode.classList.contains(styles.active)) {
          logNode.classList.add(styles.active)
        }
      }

      if (firstLogNode) {
        if (firstLogNode.parentNode && !firstLogNode.parentNode.classList.contains(styles.active)) {
          firstLogNode.parentNode.classList.add(styles.active)
        }

        firstLogNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start' })
      }
    }
  }, [prevActiveOperation, activeOperation, profileLogs])

  return (
    <div className='block'>
      <SplitPane
        primary='second'
        split='horizontal'
        resizerClassName='resizer-horizontal'
        buttons={false}
        defaultSize={(window.innerHeight * 0.2) + 'px'}
      >
        <OperationsDisplay
          templateShortid={template.shortid}
          profileOperations={profileOperations}
          profileErrorEvent={profileErrorEvent}
          onCanvasClick={handleCanvasClick}
          onElementClick={handleElementClick}
          renderErrorModal={renderErrorModal}
        />
        <LogsDisplay
          logs={profileLogs}
        />
      </SplitPane>
    </div>
  )
})

function openInspectModal ({
  profileOperations,
  sourceId,
  targetId,
  inputId,
  outputId,
  onClose = () => {}
}) {
  if (profileOperations[0].startEvent.data.mode !== 'full') {
    return openModal('This request was performed in the standard mode. The inspection works only when the full request profiling is enabled.')
  }
  openModal(ProfileInspectModal, {
    data: {
      sourceId,
      targetId,
      getContent: () => {
        let operationState

        if (outputId == null) {
          operationState = getStateAtProfileOperation(profileOperations, inputId, false)
        } else if (inputId == null) {
          operationState = getStateAtProfileOperation(profileOperations, outputId, true)
        } else {
          operationState = getStateAtProfileOperation(profileOperations, inputId, false)
        }

        return operationState
      }
    },
    onModalClose: onClose
  })
}

export default ProfilePreviewType
