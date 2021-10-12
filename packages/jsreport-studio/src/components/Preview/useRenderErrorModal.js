import { useCallback, useState } from 'react'
import ErrorModal from '../Modals/ErrorModal'
import styles from './Preview.css'

function useRenderErrorModal (openErrorLine) {
  const [showErrorModal, setShowErrorModal] = useState(true)

  const renderErrorModal = useCallback(function renderErrorModal (error) {
    if (!showErrorModal || error == null) {
      return null
    }

    const showGoToLineButton = (
      error.entity != null &&
      (error.property === 'content' || error.property === 'helpers') &&
      error.lineNumber != null
    )

    const errorTitle = 'preview error'

    return (
      <div className={styles.errorModal}>
        <div className={styles.errorModalContent}>
          <ErrorModal
            close={() => setShowErrorModal(false)}
            options={{
              title: errorTitle,
              error,
              containerStyle: { maxWidth: 'none', maxHeight: '320px' },
              renderCustomButtons: showGoToLineButton
                ? () => {
                    return (
                      <button
                        className='button confirmation'
                        onClick={() => {
                          openErrorLine(error)
                        }}
                      >
                        Go to error line
                      </button>
                    )
                  }
                : undefined
            }}
          />
        </div>
      </div>
    )
  }, [showErrorModal, openErrorLine])

  return {
    renderErrorModal
  }
}

export default useRenderErrorModal
