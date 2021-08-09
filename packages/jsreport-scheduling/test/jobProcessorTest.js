require('should')
const JobProcessor = require('../lib/jobProcessor')
const jsreport = require('@jsreport/jsreport-core')

describe('for jobProcessor', () => {
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

    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-reports')())

    await reporter.init()

    template = await reporter.documentStore.collection('templates').insert({
      name: 'test',
      content: 'foo',
      engine: 'none',
      recipe: 'html'
    })
  })

  afterEach(() => reporter.close())

  it('process should call handler and create task', async function () {
    this.timeout(3000)
    reporter.scheduling.stop()

    await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })
    let counter = 0

    function exec () {
      counter++
      return Promise.resolve()
    }

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: exec,
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 50,
        maxParallelJobs: 1,
        // mark now as 1 second in future in order to find the schedule
        now: () => new Date(new Date().getTime() + 1000)
      }
    })

    await jobProcessor.process({ waitForJobToFinish: true })
    const tasks = await reporter.documentStore.collection('tasks').find({})
    tasks.length.should.be.exactly(1)
    tasks[0].state.should.be.exactly('success')
    tasks[0].finishDate.should.be.ok()
    counter.should.be.exactly(1)
  })

  it('should not cross maxParallelJobs', async function () {
    this.timeout(2000)
    reporter.scheduling.stop()

    await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })
    let counter = 0

    function exec () {
      counter++
      return Promise.resolve()
    }

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: exec,
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 50,
        maxParallelJobs: 0,
        // mark now as 1 second in future in order to find the schedule
        now: () => new Date(new Date().getTime() + 1000)
      }
    })
    await jobProcessor.process({ waitForJobToFinish: true })
    counter.should.be.exactly(0)
  })

  it('should recover failed tasks', async () => {
    reporter.scheduling.stop()

    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: `* * * * * ${new Date().getDay()}`,
      templateShortid: template.shortid
    })
    await reporter.documentStore.collection('tasks').insert({
      ping: new Date(1),
      state: 'running',
      scheduleShortid: schedule.shortid
    })

    let counter = 0

    function exec () {
      counter++
      return Promise.resolve()
    }

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: exec,
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 20,
        maxParallelJobs: 1,
        taskPingTimeout: 10
      }
    })

    await jobProcessor.process({ waitForJobToFinish: true })
    counter.should.be.exactly(1)
  })

  it('should ping running tasks', async () => {
    reporter.scheduling.stop()

    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: `* * * * * ${new Date().getDay()}`,
      templateShortid: template.shortid
    })

    const task = await reporter.documentStore.collection('tasks').insert({
      ping: new Date(new Date().getTime() - 1000),
      state: 'running',
      scheduleShortid: schedule.shortid
    })

    function exec () {
      return Promise.resolve()
    }

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: exec,
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 20,
        maxParallelJobs: 1
      }
    })

    jobProcessor.currentlyRunningTasks.push(task)

    await jobProcessor.process({ waitForJobToFinish: true })
    const tasks = await reporter.documentStore.collection('tasks').find({})
    tasks[0].ping.should.not.be.exactly(task.ping)
  })

  it('should run misfired schedule by default', async () => {
    reporter.scheduling.stop()

    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      state: 'planned',
      cron: '0 * * * *', // each hour
      templateShortid: template.shortid,
      enabled: true
    })

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: () => Promise.resolve(),
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 20,
        maxParallelJobs: 1
      }
    })

    await reporter.documentStore.collection('schedules').update({
      _id: schedule._id
    }, {
      $set: {
        // 3 hours ago
        nextRun: jobProcessor.getNextRun(schedule, new Date(Date.now() - (3 * 60 * 60000)))
      }
    })

    await jobProcessor.process({ waitForJobToFinish: true })

    const tasks = await reporter.documentStore.collection('tasks').find({})

    tasks.should.have.length(1)
    tasks[0].state.should.be.eql('success')
  })

  it('should not run misfired schedules when misfireThreshold is set', async () => {
    reporter.scheduling.stop()

    const schedule = await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      state: 'planned',
      cron: '0 * * * *', // each hour
      templateShortid: template.shortid,
      enabled: true
    })

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: () => Promise.resolve(),
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 20,
        misfireThreshold: 120000, // 2min
        maxParallelJobs: 1
      }
    })

    const lastRun = jobProcessor.getNextRun(schedule, new Date(Date.now() - (3 * 60 * 60000)))

    await reporter.documentStore.collection('schedules').update({
      _id: schedule._id
    }, {
      $set: {
        nextRun: lastRun // 3 hours ago
      }
    })

    const now = new Date()

    await jobProcessor.process({ waitForJobToFinish: true })

    const tasks = await reporter.documentStore.collection('tasks').find({})

    const sched = await reporter.documentStore.collection('schedules').findOne({
      _id: schedule._id
    })

    sched.nextRun.getTime().should.be.greaterThan(now)
    tasks.should.have.length(0)
  })

  it('_findTasksToRecover should skip tasks without schedules', async () => {
    reporter.scheduling.stop()

    await reporter.documentStore.collection('tasks').insert({
      ping: new Date(1),
      state: 'running',
      scheduleShortid: 'invalid'
    })

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: function () {},
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 50,
        maxParallelJobs: 1
      }
    })

    const tasks = await jobProcessor._findTasksToRecover()

    tasks.should.have.length(0)
  })

  it('process should error schedules with missing templates', async function () {
    this.timeout(3000)
    reporter.scheduling.stop()

    await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: 'invalid'
    })

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: function () { },
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 50,
        maxParallelJobs: 1,
        // mark now as 1 second in future in order to find the schedule
        now: () => new Date(new Date().getTime() + 1000)
      }
    })

    await jobProcessor.process({ waitForJobToFinish: true })
    const tasks = await reporter.documentStore.collection('tasks').find({})
    tasks.length.should.be.exactly(1)
    tasks[0].state.should.be.exactly('error')
    tasks[0].error.should.containEql('Template')
  })
})

describe('for jobProcessor with auth enabled', () => {
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

    reporter.use(require('../')())
    reporter.use(require('@jsreport/jsreport-authentication')({
      admin: {
        username: 'admin',
        password: 'password'
      },
      cookieSession: {
        secret: 'foo'
      }
    }))
    reporter.use(require('@jsreport/jsreport-authorization')())
    reporter.use(require('@jsreport/jsreport-reports')())

    await reporter.init()

    template = await reporter.documentStore.collection('templates').insert({
      name: 'test',
      content: 'foo',
      engine: 'none',
      recipe: 'html'
    })
  })

  it('process should call handler and create task', async function () {
    this.timeout(3000)
    reporter.scheduling.stop()

    await reporter.documentStore.collection('schedules').insert({
      name: 'schedule-test',
      cron: '*/1 * * * * *',
      templateShortid: template.shortid
    })
    let counter = 0

    function exec () {
      counter++
      return Promise.resolve()
    }

    const jobProcessor = new JobProcessor({
      beforeProcessJobListeners: reporter.createListenerCollection(),
      executionHandler: exec,
      documentStore: reporter.documentStore,
      logger: reporter.logger,
      Request: reporter.Request,
      TaskType: reporter.scheduling.TaskType,
      options: {
        interval: 50,
        maxParallelJobs: 1,
        // mark now as 1 second in future in order to find the schedule
        now: () => new Date(new Date().getTime() + 1000)
      }
    })

    await jobProcessor.process({ waitForJobToFinish: true })
    const tasks = await reporter.documentStore.collection('tasks').find({})
    tasks.length.should.be.exactly(1)
    tasks[0].state.should.be.exactly('success')
    tasks[0].finishDate.should.be.ok()
    counter.should.be.exactly(1)
  })
})
