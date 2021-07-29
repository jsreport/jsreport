import { Fragment } from 'react'
import classNames from 'classnames'
import styles from './Wizard.css'

function Wizard (props) {
  const { steps, activeStep, controlsDisabled = false, renderContent, renderFinish, onPrevious, onNext } = props
  const lastStepIndex = steps.length - 1
  let activeStepIndex

  for (let i = 0; i < steps.length; i++) {
    if (steps[i].name === activeStep) {
      activeStepIndex = i
      break
    }
  }

  return (
    // eslint-disable-next-line
    <Fragment> 
      <div className={styles.wizardTitles}>
        {steps.map((step, stepIndex) => {
          const isComplete = stepIndex < activeStepIndex
          const isActive = stepIndex === activeStepIndex

          const stepClass = classNames(styles.wizardTitle, {
            [styles.active]: isActive,
            [styles.completed]: isComplete
          })

          return (
            <div key={step.name} className={stepClass}>
              <span>{step.icon != null
                ? (
                  <span className={styles.wizardTitleIcon}><i className={`fa ${step.icon}`} />&nbsp;</span>
                  )
                : ''}{step.title}
              </span>
            </div>
          )
        })}
      </div>
      <div className={styles.wizardContent}>
        {renderContent()}
        {steps.length > 1 && (
          <div className='button-bar'>
            <button
              className={classNames('button', 'confirmation', { disabled: controlsDisabled })}
              onClick={!controlsDisabled && activeStepIndex !== lastStepIndex ? onNext : undefined}
              style={{
                display: activeStepIndex === lastStepIndex && renderFinish != null ? 'none' : undefined,
                visibility: activeStepIndex !== lastStepIndex ? 'visible' : 'hidden'
              }}
            >
              Next
            </button>
            {activeStepIndex === lastStepIndex && renderFinish && (
              renderFinish()
            )}
            <button
              className={classNames('button', 'confirmation', { disabled: controlsDisabled })}
              onClick={!controlsDisabled && activeStepIndex !== 0 ? onPrevious : undefined}
              style={{ visibility: activeStepIndex !== 0 ? 'visible' : 'hidden' }}
            >
              Previous
            </button>
          </div>
        )}
      </div>
    </Fragment>
  )
}

export default Wizard
