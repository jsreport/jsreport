import React, { Component } from 'react'
import ordinal from 'ordinal-number-suffix'
import CronBuilder from 'cron-builder'
import cronstrue from 'cronstrue'
import Studio from 'jsreport-studio'
import HourTimePicker from './HourTimePicker'

const EntityRefSelect = Studio.EntityRefSelect
const sharedComponents = Studio.sharedComponents

class ScheduleProperties extends Component {
  constructor (props) {
    super(props)

    this.state = {
      useExpression: true,
      showHour: false,
      showMinute: false,
      showDay: false,
      showMonth: false,
      selectedPeriod: '',
      selectedHour: null,
      selectedMinute: null,
      selectedDay: null,
      selectedMonth: null,
      days: []
    }
  }

  static title (entity, entities) {
    const templates = Object.keys(entities).map((k) => entities[k])
      .filter((t) => t.__entitySet === 'templates' && t.shortid === entity.templateShortid)

    if (!templates.length) {
      return 'schedule (select template...)'
    }

    return `schedule (${templates[0].name}) ${entity.enabled !== true && entity.enabled != null ? '(disabled)' : ''}`
  }

  componentDidMount () {
    this.normalizeUIState(this.props.entity)
    this.removeInvalidTemplateReferences()
  }

  componentDidUpdate (prevProps) {
    // when component changes because another schedule is selected
    // or when saving a new schedule
    if (prevProps.entity._id !== this.props.entity._id) {
      this.normalizeUIState(this.props.entity)
    }

    this.removeInvalidTemplateReferences()
  }

  normalizeUIState (entity) {
    let cronInfo

    if ((entity.__isNew && !entity.cron) || !entity.cron) {
      cronInfo = this.onPeriodChange('', true)
    } else {
      cronInfo = this.getCronInformation(entity.cron)
    }

    if (cronInfo) {
      cronInfo.useExpression = false
    } else {
      // if we couldn't parse the cron for the UI
      // reset values and enable the raw expression input.
      // false is returned when we want to still show the value in the UI editor
      if (cronInfo === false) {
        cronInfo = this.onPeriodChange('', true)
        cronInfo.useExpression = false
      } else {
        cronInfo = this.onPeriodChange('', true)
        cronInfo.useExpression = true
      }
    }

    this.setState(cronInfo)
  }

  getCronInformation (cron) {
    if (cron == null || cron === '') {
      return false
    }

    try {
      const cronExp = new CronBuilder(cron)
      const parsedCron = cronExp.getAll()
      let cronInfo
      let selectedPeriod
      let selectedHour
      let selectedMinute
      let selectedDay
      let selectedMonth
      let selectedDayOfTheMonth
      let selectedDayOfTheWeek

      // our cron editor doesn't support complex values
      if (
        parsedCron.dayOfTheMonth.length !== 1 ||
        parsedCron.dayOfTheWeek.length !== 1 ||
        parsedCron.hour.length !== 1 ||
        parsedCron.minute.length !== 1 ||
        parsedCron.month.length !== 1
      ) {
        return null
      }

      if (
        parsedCron.dayOfTheMonth[0] === '*' ||
        !isNaN(parseInt(parsedCron.dayOfTheMonth[0], 10))
      ) {
        selectedDayOfTheMonth = parsedCron.dayOfTheMonth[0] !== '*' ? parseInt(parsedCron.dayOfTheMonth[0], 10) : parsedCron.dayOfTheMonth[0]
      }

      if (
        parsedCron.dayOfTheWeek[0] === '*' ||
        !isNaN(parseInt(parsedCron.dayOfTheWeek[0], 10))
      ) {
        selectedDayOfTheWeek = parsedCron.dayOfTheWeek[0] !== '*' ? parseInt(parsedCron.dayOfTheWeek[0], 10) : parsedCron.dayOfTheWeek[0]
      }

      if (
        parsedCron.hour[0] === '*' ||
        !isNaN(parseInt(parsedCron.hour[0], 10))
      ) {
        selectedHour = parsedCron.hour[0] !== '*' ? ('0' + parsedCron.hour[0]).slice(-2) : parsedCron.hour[0]
      }

      if (
        parsedCron.minute[0] === '*' ||
        !isNaN(parseInt(parsedCron.minute[0], 10))
      ) {
        selectedMinute = parsedCron.minute[0] !== '*' ? ('0' + parsedCron.minute[0]).slice(-2) : parsedCron.minute[0]
      }

      if (
        parsedCron.month[0] === '*' ||
        !isNaN(parseInt(parsedCron.month[0], 10))
      ) {
        selectedMonth = parsedCron.month[0] !== '*' ? ('0' + parsedCron.month[0]).slice(-2) : parsedCron.month[0]
      }

      // return early if we don't have any value
      if (
        !selectedDayOfTheMonth &&
        !selectedDayOfTheWeek &&
        !selectedHour &&
        !selectedMinute &&
        !selectedMonth
      ) {
        return null
      }

      if (selectedDayOfTheWeek !== '*') {
        selectedDay = selectedDayOfTheWeek
      } else {
        selectedDay = selectedDayOfTheMonth
      }

      if (
        selectedDayOfTheMonth === '*' &&
        selectedDayOfTheWeek === '*' &&
        selectedHour === '*' &&
        selectedMinute === '*' &&
        selectedMonth === '*'
      ) {
        selectedPeriod = 'mn'
        cronInfo = {}
      } else if (
        selectedDayOfTheMonth === '*' &&
        selectedDayOfTheWeek === '*' &&
        selectedHour === '*' &&
        selectedMonth === '*' &&
        selectedMinute !== '*'
      ) {
        selectedPeriod = 'h'

        cronInfo = {
          selectedMinute: selectedMinute
        }
      } else if (
        selectedDayOfTheMonth === '*' &&
        selectedDayOfTheWeek === '*' &&
        selectedMonth === '*' &&
        selectedHour !== '*' &&
        selectedMinute !== '*'
      ) {
        selectedPeriod = 'd'

        cronInfo = {
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        }
      } else if (
        selectedDayOfTheMonth === '*' &&
        selectedMonth === '*' &&
        selectedDayOfTheWeek !== '*' &&
        selectedHour !== '*' &&
        selectedMinute !== '*'
      ) {
        selectedPeriod = 'w'

        cronInfo = {
          selectedDay: selectedDay,
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        }
      } else if (
        selectedDayOfTheWeek === '*' &&
        selectedMonth === '*' &&
        selectedDayOfTheMonth !== '*' &&
        selectedHour !== '*' &&
        selectedMinute !== '*'
      ) {
        selectedPeriod = 'm'

        cronInfo = {
          selectedDay: selectedDay,
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        }
      } else if (
        selectedDayOfTheWeek === '*' &&
        selectedDayOfTheMonth !== '*' &&
        selectedMonth !== '*' &&
        selectedHour !== '*' &&
        selectedMinute !== '*'
      ) {
        selectedPeriod = 'y'

        cronInfo = {
          selectedDay: selectedDay,
          selectedMonth: selectedMonth,
          selectedHour: selectedHour,
          selectedMinute: selectedMinute
        }
      }

      // if the period can't be detected just return
      if (!selectedPeriod) {
        return null
      }

      cronInfo = { ...this.onPeriodChange(selectedPeriod, true), ...cronInfo }

      return cronInfo
    } catch (e) {
      return null
    }
  }

  removeInvalidTemplateReferences () {
    const { entity, entities, onChange } = this.props

    if (!entity.templateShortid) {
      return
    }

    const updatedTemplates = Object.keys(entities).filter((k) => entities[k].__entitySet === 'templates' && entities[k].shortid === entity.templateShortid)

    if (updatedTemplates.length === 0) {
      onChange({ _id: entity._id, templateShortid: null })
    }
  }

  onUseExpressionChange (checked) {
    const { entity } = this.props
    let resetCron = false
    let uiCronInfo

    if (!checked) {
      uiCronInfo = this.getCronInformation(entity.cron)

      if (!uiCronInfo) {
        uiCronInfo = this.onPeriodChange('', true)
        resetCron = true
      }
    } else {
      uiCronInfo = this.onPeriodChange('', true)
    }

    this.onCronBuilderChange({
      useExpression: checked,
      ...uiCronInfo
    }, resetCron)
  }

  onCronBuilderChange (stateToSet, resetCron) {
    const cronExp = new CronBuilder()

    const {
      onChange,
      entity
    } = this.props

    let {
      selectedPeriod,
      selectedHour,
      selectedMinute,
      selectedDay,
      selectedMonth
    } = this.state

    let cron = false

    if (stateToSet && stateToSet.selectedPeriod !== undefined) {
      selectedPeriod = stateToSet.selectedPeriod
    }

    if (stateToSet && stateToSet.selectedHour !== undefined) {
      selectedHour = stateToSet.selectedHour
    }

    if (stateToSet && stateToSet.selectedMinute !== undefined) {
      selectedMinute = stateToSet.selectedMinute
    }

    if (stateToSet && stateToSet.selectedDay !== undefined) {
      selectedDay = stateToSet.selectedDay
    }

    if (stateToSet && stateToSet.selectedMonth !== undefined) {
      selectedMonth = stateToSet.selectedMonth
    }

    if (selectedPeriod === 'mn') {
      cron = '* * * * *'
    } else if (selectedPeriod === 'h') {
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)))
    } else if (selectedPeriod === 'd') {
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)))
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)))
    } else if (selectedPeriod === 'w') {
      cronExp.addValue('dayOfTheWeek', String(parseInt(selectedDay, 10)))
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)))
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)))
    } else if (selectedPeriod === 'm') {
      cronExp.addValue('dayOfTheMonth', String(parseInt(selectedDay, 10)))
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)))
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)))
    } else if (selectedPeriod === 'y') {
      cronExp.addValue('dayOfTheMonth', String(parseInt(selectedDay, 10)))
      cronExp.addValue('hour', String(parseInt(selectedHour, 10)))
      cronExp.addValue('minute', String(parseInt(selectedMinute, 10)))
      cronExp.addValue('month', String(parseInt(selectedMonth, 10)))
    } else {
      cron = resetCron ? '' : this.props.entity.cron
    }

    if (cron === false) {
      cron = cronExp.build()
    }

    if (cron !== this.props.entity.cron) {
      onChange({
        _id: entity._id,
        cron: cron
      })
    }

    if (stateToSet) {
      this.setState(stateToSet)
    }
  }

  onPeriodChange (period, returnState) {
    const newState = {
      selectedPeriod: period
    }

    newState.days = []

    if (period === 'm' || period === 'y') {
      for (let i = 1; i <= 31; i++) {
        newState.days.push({
          name: ordinal(i),
          value: i
        })
      }
    }

    if (period === 'mn') {
      newState.showHour = false
      newState.showMinute = false
      newState.showDay = false
      newState.showMonth = false
      newState.selectedHour = null
      newState.selectedMinute = null
      newState.selectedDay = null
      newState.selectedMonth = null
    } else if (period === 'h') {
      newState.showHour = false
      newState.showMinute = true
      newState.showDay = false
      newState.showMonth = false
      newState.selectedHour = null
      newState.selectedMinute = '00'
      newState.selectedDay = null
      newState.selectedMonth = null
    } else if (period === 'd') {
      newState.showHour = true
      newState.showMinute = true
      newState.showDay = false
      newState.showMonth = false
      newState.selectedHour = '12'
      newState.selectedMinute = '00'
      newState.selectedDay = null
      newState.selectedMonth = null
    } else if (period === 'w') {
      newState.showHour = true
      newState.showMinute = true
      newState.showDay = true
      newState.showMonth = false
      newState.selectedHour = '12'
      newState.selectedMinute = '00'
      newState.selectedDay = 1
      newState.selectedMonth = null

      newState.days = [{
        name: 'Monday',
        value: 1
      }, {
        name: 'Tuesday',
        value: 2
      }, {
        name: 'Wednesday',
        value: 3
      }, {
        name: 'Thursday',
        value: 4
      }, {
        name: 'Friday',
        value: 5
      }, {
        name: 'Saturday',
        value: 6
      }, {
        name: 'Sunday',
        value: 0
      }]
    } else if (period === 'm') {
      newState.showHour = true
      newState.showMinute = true
      newState.showDay = true
      newState.showMonth = false
      newState.selectedHour = '12'
      newState.selectedMinute = '00'
      newState.selectedDay = 1
      newState.selectedMonth = null
    } else if (period === 'y') {
      newState.showHour = true
      newState.showMinute = true
      newState.showDay = true
      newState.showMonth = true
      newState.selectedHour = '12'
      newState.selectedMinute = '00'
      newState.selectedDay = 1
      newState.selectedMonth = '01'
    } else {
      newState.showHour = false
      newState.showMinute = false
      newState.showDay = false
      newState.showMonth = false
      newState.selectedHour = null
      newState.selectedMinute = null
      newState.selectedDay = null
      newState.selectedMonth = null
    }

    if (returnState) {
      return newState
    }

    this.setState(newState)
  }

  render () {
    const {
      useExpression,
      showHour,
      showMinute,
      showDay,
      showMonth,
      selectedPeriod,
      selectedHour,
      selectedMinute,
      selectedDay,
      selectedMonth,
      days
    } = this.state
    const { entity, onChange } = this.props
    let cronDescription = ''

    if (entity.cron) {
      try {
        cronDescription = cronstrue.toString(entity.cron)
      } catch (e) {
        cronDescription = 'Invalid cron expression'
      }
    }

    if (!entity || entity.__entitySet !== 'schedules') {
      return <div />
    }

    return (
      <div>
        <div className='form-group'>
          <label>Template</label>
          <EntityRefSelect
            headingLabel='Select template'
            newLabel='New template for schedule'
            filter={(references) => ({ templates: references.templates })}
            value={entity.templateShortid ? entity.templateShortid : null}
            onChange={(selected) => onChange({ _id: entity._id, templateShortid: selected != null && selected.length > 0 ? selected[0].shortid : null })}
            renderNew={(modalProps) => <sharedComponents.NewTemplateModal {...modalProps} options={{ ...modalProps.options, defaults: { folder: entity.folder }, activateNewTab: false }} />}
          />
        </div>
        <div className='form-group'>
          <label>CRON</label>
          {!useExpression && (
            <div className='form-group'>
              <span>Expression: {entity.cron}</span>
            </div>
          )}
          <div className='form-group'>
            <span>Description: {cronDescription}</span>
          </div>
          <div className='form-group'>
            <label>
              <input
                type='checkbox'
                checked={useExpression}
                onChange={(v) => this.onUseExpressionChange(v.target.checked)}
              />
              Use expression
            </label>
            {useExpression && (
              <input
                type='text'
                value={entity.cron || ''}
                onChange={(v) => onChange({ _id: entity._id, cron: v.target.value })}
              />
            )}
          </div>
          {!useExpression && (
            <div className='form-group'>
              <label>
                Every
                {' '}
                <select
                  value={selectedPeriod}
                  onChange={(ev) => this.onCronBuilderChange(this.onPeriodChange(ev.target.value, true))}
                >
                  <option key='-' value=''>- not selected -</option>
                  <option key='mn' value='mn'>minute</option>
                  <option key='h' value='h'>hour</option>
                  <option key='d' value='d'>day</option>
                  <option key='w' value='w'>week</option>
                  <option key='m' value='m'>month</option>
                  <option key='y' value='y'>year</option>
                </select>
              </label>
            </div>
          )}
          {!useExpression && showDay && (
            <div className='form-group'>
              <label>
                {`on${showMonth ? ' the' : ''}`}
                {' '}
                <select
                  value={selectedDay}
                  onChange={(ev) => this.onCronBuilderChange({ selectedDay: ev.target.value })}
                >
                  {days.map((day) => <option key={day.value} value={day.value}>{day.name}</option>)}
                </select>
              </label>
            </div>
          )}
          {!useExpression && showMonth && (
            <div className='form-group'>
              <label>
                of
                {' '}
                <select
                  value={selectedMonth}
                  onChange={(ev) => this.onCronBuilderChange({ selectedMonth: ev.target.value })}
                >
                  <option key='01' value='01'>January</option>
                  <option key='02' value='02'>February</option>
                  <option key='03' value='03'>March</option>
                  <option key='04' value='04'>April</option>
                  <option key='05' value='05'>May</option>
                  <option key='06' value='06'>June</option>
                  <option key='07' value='07'>July</option>
                  <option key='08' value='08'>August</option>
                  <option key='09' value='09'>September</option>
                  <option key='10' value='10'>October</option>
                  <option key='11' value='11'>November</option>
                  <option key='12' value='12'>December</option>
                </select>
              </label>
            </div>
          )}
          {!useExpression && (showHour || showMinute) && (
            <div className='form-group'>
              <div>
                at
                {' '}
                <div style={{ display: 'inline-block' }}>
                  {showHour && (
                    <HourTimePicker
                      type='hour'
                      value={selectedHour}
                      onChange={(val) => this.onCronBuilderChange({ selectedHour: val })}
                    />
                  )}
                  {showHour && showMinute && ' : '}
                  {showMinute && (
                    <HourTimePicker
                      type='minute'
                      value={selectedMinute}
                      onChange={(val) => this.onCronBuilderChange({ selectedMinute: val })}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className='form-group'>
          <label>Enabled</label>
          <input type='checkbox' checked={entity.enabled !== false} onChange={(v) => onChange({ _id: entity._id, enabled: v.target.checked })} />
        </div>
      </div>
    )
  }
}

export default ScheduleProperties
