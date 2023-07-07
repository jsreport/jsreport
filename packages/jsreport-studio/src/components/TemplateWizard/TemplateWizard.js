import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import classNames from 'classnames'
import Wizard from '../Wizard/Wizard'
import BasicAttributesStep from './BasicAttributesStep'
import SampleDataStep from './SampleDataStep'
import OfficeTemplateStep, { officeRecipes } from './OfficeTemplateStep'
import { values as configuration } from '../../lib/configuration'

function TemplateWizard (props) {
  const { onChange, onValidate, onError, onSave } = props
  const isFirstRender = useRef(true)
  const [templateAttributes, setTemplateAttributes] = useState({ ...props.defaults })
  const [activeStep, setActiveStep] = useState('basic')
  const [processing, setProcessing] = useState(false)

  const initialSteps = useMemo(() => {
    const initial = [{
      name: 'basic',
      icon: 'fa-file',
      title: 'Basic'
    }]

    if (configuration.extensions.data != null) {
      initial.push({
        name: 'data',
        icon: 'fa-database',
        title: 'Sample Data'
      })
    }

    return initial
  }, [])

  const [steps, setSteps] = useState(initialSteps)

  const activeStepIndex = useMemo(() => {
    let activeStepIndex

    for (let i = 0; i < steps.length; i++) {
      if (steps[i].name === activeStep) {
        activeStepIndex = i
        break
      }
    }

    return activeStepIndex
  }, [steps, activeStep])

  const doSave = useCallback(() => {
    processing === false && onSave(templateAttributes, setProcessing)
  }, [processing, onSave, templateAttributes, setProcessing])

  const setPrevious = useCallback(() => {
    if (activeStepIndex === 0) {
      return
    }

    setActiveStep(steps[activeStepIndex - 1].name)
  }, [steps, activeStepIndex])

  const setNext = useCallback(() => {
    const lastStepIndex = steps.length - 1

    const continueToNext = () => {
      if (activeStepIndex === lastStepIndex) {
        return doSave()
      }

      setActiveStep(steps[activeStepIndex + 1].name)
    }

    if (onValidate) {
      try {
        const validateResult = onValidate(activeStep, templateAttributes)

        if (validateResult != null && typeof validateResult.then === 'function') {
          setProcessing(true)

          validateResult.then(() => {
            setProcessing(false)
            continueToNext()
          }).catch((asyncValidateError) => {
            setProcessing(false)
            onError(asyncValidateError)
          })
        } else {
          continueToNext()
        }
      } catch (validateError) {
        onError(validateError)
      }
    } else {
      continueToNext()
    }
  }, [steps, activeStep, activeStepIndex, templateAttributes, onValidate, onError, doSave])

  const onPrevious = useCallback(() => {
    setPrevious()
  }, [setPrevious])

  const onNext = useCallback(() => {
    setNext()
  }, [setNext])

  const setAttributes = useCallback((changes) => {
    setTemplateAttributes((prev) => {
      const newTemplate = { ...prev, ...changes }
      return newTemplate
    })
  }, [])

  useEffect(() => {
    if (!isFirstRender.current) {
      const hasOfficeStep = steps.find((s) => s.name === 'office') != null

      if (
        officeRecipes.indexOf(templateAttributes.recipe) === -1 &&
        hasOfficeStep
      ) {
        setSteps([...initialSteps])
      } else if (
        activeStep === 'basic' &&
        officeRecipes.indexOf(templateAttributes.recipe) !== -1 &&
        !hasOfficeStep
      ) {
        setSteps((prev) => [...prev, {
          name: 'office',
          icon: 'fa-file',
          title: 'Office Template'
        }])
      }

      onChange(activeStep, templateAttributes)
    }
  }, [initialSteps, steps, onChange, activeStep, templateAttributes])

  useEffect(() => {
    isFirstRender.current = false
  }, [])

  const renderContent = useCallback(() => {
    const stepProps = {
      template: templateAttributes,
      setAttributes,
      setPrevious,
      setNext,
      processing
    }

    if (activeStep === 'basic') {
      return (
        <BasicAttributesStep {...stepProps} />
      )
    } else if (activeStep === 'data') {
      return (
        <SampleDataStep {...stepProps} />
      )
    } else if (activeStep === 'office') {
      return (
        <OfficeTemplateStep {...stepProps} />
      )
    }

    throw new Error(`No content defined yet for step "${activeStep}"`)
  }, [activeStep, templateAttributes, setAttributes, setPrevious, setNext, processing])

  const renderFinish = useCallback(() => {
    const className = classNames('button', 'confirmation', { disabled: processing })

    return (
      <button
        className={className}
        disabled={processing}
        onClick={() => doSave()}
      >
        Ok
      </button>
    )
  }, [processing, doSave])

  return (
    <Wizard
      steps={steps}
      activeStep={activeStep}
      onPrevious={onPrevious}
      onNext={onNext}
      controlsDisabled={processing}
      renderContent={renderContent}
      renderFinish={renderFinish}
    />
  )
}

export default TemplateWizard
