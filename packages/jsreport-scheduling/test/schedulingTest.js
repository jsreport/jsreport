require('should')
const jsreport = require('@jsreport/jsreport-core')

describe('with scheduling extension', function () {
  let reporter
  let template

  beforeEach(async () => {
    reporter = jsreport({
      extensions: {
        scheduling: {
          minScheduleInterval: 0
        }
      }
    })
    reporter.use(require('@jsreport/jsreport-reports')())
    reporter.use(require('../')())

    await reporter.init()

    template = await reporter.documentStore.collection('templates').insert({
      name: 'template-test',
      content: 'foo',
      engine: 'none',
      recipe: 'html'
    })
  })

  afterEach(() => reporter.close())

  it('creating schedule should add default values', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })

    schedule.nextRun.should.be.ok()
    schedule.creationDate.should.be.ok()
    schedule.state.should.be.exactly('planned')
  })

  it('updating schedule should recalculate nextRun', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })
    await reporter.documentStore.collection('schedules').update({ shortid: schedule.shortid }, {
      $set: {
        name: 'foo',
        state: 'planned',
        cron: '*/1 * * * * *',
        nextRun: null,
        templateShortid: template.shortid
      }
    })

    const schedules = await reporter.documentStore.collection('schedules').find({})
    schedules[0].nextRun.should.be.ok()
  })

  it('enabling a schedule should initialize nextRun again', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid,
      enabled: false
    })

    // wait 1s
    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })

    await reporter.documentStore.collection('schedules').update({
      _id: schedule._id
    }, {
      $set: {
        enabled: true
      }
    })

    const afterUpdateSchedule = await reporter.documentStore.collection('schedules').findOne({
      _id: schedule._id
    })

    schedule.nextRun.getTime().should.be.not.eql(afterUpdateSchedule.nextRun.getTime())
  })

  it('render process job should render report', async () => {
    reporter.scheduling.stop()

    let counter = 0

    reporter.beforeRenderListeners.insert(0, 'test init', this, () => counter++)

    const task = await reporter.documentStore.collection('tasks').insert({})
    await reporter.scheduling.renderReport({ templateShortid: template.shortid }, task)
    counter.should.be.exactly(1)
  })

  it('updating enabled schedule with empty template should throw', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })

    return reporter.documentStore.collection('schedules').update({ shortid: schedule.shortid }, {
      $set: {
        name: 'foo2',
        cron: '*/1 * * * * *',
        templateShortid: null,
        state: 'planned'
      }
    }).should.be.rejectedWith(/needs to include template/)
  })

  it('updating disabled schedule with empty template should be fine', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid,
      enabled: false
    })

    await reporter.documentStore.collection('schedules').update({ shortid: schedule.shortid }, {
      $set: {
        name: 'foo2',
        cron: '*/1 * * * * *',
        templateShortid: null,
        state: 'planned'
      }
    })

    const existingSchedule = await reporter.documentStore.collection('schedules').findOne({
      name: 'foo2'
    })

    existingSchedule.templateShortid.should.be.eql('')
  })

  it('updating schedule with empty cron should throw', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })

    return reporter.documentStore.collection('schedules').update({ shortid: schedule.shortid }, {
      $set: {
        name: 'foo2',
        cron: null,
        templateShortid: template.shortid,
        state: 'planned'
      }
    }).should.be.rejectedWith(/cron expression must be set/)
  })

  it('updating schedule with invalid cron should throw', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })

    return reporter.documentStore.collection('schedules').update({ shortid: schedule.shortid }, {
      $set: {
        name: 'foo2',
        cron: 'dsdsd',
        templateShortid: template.shortid,
        state: 'planned'
      }
    }).should.be.rejectedWith(/invalid cron pattern/)
  })
})

describe('with scheduling extension and minimal schedule interval limit', () => {
  let reporter
  let template

  beforeEach(async () => {
    reporter = jsreport({
      extensions: {
        scheduling: {
          minScheduleInterval: 120000
        }
      }
    })
    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-reports')())

    await reporter.init()
    template = await reporter.documentStore.collection('templates').insert({
      name: 'template-test',
      content: 'foo',
      engine: 'none',
      recipe: 'html'
    })
  })

  it('should pass with the bigger interval', () => {
    return reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '1 1 * * * *',
      templateShortid: template.shortid
    })
  })

  it('should throw with the smaller interval', () => {
    return reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '1 * * * * *',
      templateShortid: template.shortid
    }).should.be.rejected()
  })

  it('should throw with cron expression with less than 5 parts', () => {
    return reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '* * *',
      templateShortid: template.shortid
    }).should.be.rejected()
  })
})

describe('with scheduling extension and history clean enabled', () => {
  let reporter
  let template

  beforeEach(async () => {
    reporter = jsreport({
      extensions: {
        scheduling: {
          cleanScheduleHistoryInterval: 500,
          maxHistoryPerSchedule: 2
        }
      }
    })

    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-reports')())

    await reporter.init()

    template = await reporter.documentStore.collection('templates').insert({
      name: 'template-test',
      content: 'foo',
      engine: 'none',
      recipe: 'html'
    })
  })

  afterEach(() => reporter && reporter.close())

  it('should clean history', async () => {
    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '* * * * *',
      templateShortid: template.shortid
    })

    const getTask = ({ creationDate, state, ...rest }) => {
      return {
        ...rest,
        creationDate,
        scheduleShortid: schedule.shortid,
        state: state,
        ping: creationDate
      }
    }

    const now = Date.now()

    const t1 = await reporter.documentStore.collection('tasks').insert(getTask({
      _id: '1',
      state: 'success'
    }))

    await reporter.documentStore.collection('tasks').update({
      _id: t1._id
    }, {
      $set: {
        creationDate: new Date(now - 900)
      }
    })

    const t2 = await reporter.documentStore.collection('tasks').insert(getTask({
      _id: '2',
      state: 'error',
      error: 'Error'
    }))

    await reporter.documentStore.collection('tasks').update({
      _id: t2._id
    }, {
      $set: {
        creationDate: new Date(now - 800)
      }
    })

    const t3 = await reporter.documentStore.collection('tasks').insert(getTask({
      _id: '3',
      state: 'error',
      error: 'Error'
    }))

    await reporter.documentStore.collection('tasks').update({
      _id: t3._id
    }, {
      $set: {
        creationDate: new Date(now - 700)
      }
    })

    const tError = await reporter.documentStore.collection('tasks').insert(getTask({
      _id: '4',
      state: 'error',
      error: 'Error'
    }))

    await reporter.documentStore.collection('tasks').update({
      _id: tError._id
    }, {
      $set: {
        creationDate: new Date(now - 600)
      }
    })

    const tRunning = await reporter.documentStore.collection('tasks').insert(getTask({
      _id: '5',
      creationDate: new Date(now - 500),
      state: 'running'
    }))

    await reporter.documentStore.collection('tasks').update({
      _id: tRunning._id
    }, {
      $set: {
        creationDate: new Date(now - 400)
      }
    })

    const tSuccess = await reporter.documentStore.collection('tasks').insert(getTask({
      _id: '6',
      creationDate: new Date(now - 300),
      state: 'success'
    }))

    await reporter.documentStore.collection('tasks').update({
      _id: tSuccess._id
    }, {
      $set: {
        creationDate: new Date(now - 200)
      }
    })

    await delay(700)

    const results = await reporter.documentStore.collection('tasks').find({
      scheduleShortid: schedule.shortid
    })

    results.should.have.length(3)

    results.should.matchSome((t) => t._id.should.be.eql(tRunning._id) && t.state.should.be.eql('running'))
    results.should.matchSome((t) => t._id.should.be.eql(tError._id) && t.state.should.be.eql('error'))
    results.should.matchSome((t) => t._id.should.be.eql(tSuccess._id) && t.state.should.be.eql('success'))
  })
})

function delay (timeToWait) {
  return new Promise((resolve) => setTimeout(resolve, timeToWait))
}
