/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension capable of planning reoccurring jobs which are printing specified templates into reports.
 */
const parseCron = require('./parseCron')
const JobProcessor = require('./jobProcessor')
const moment = require('moment')

class Scheduling {
  constructor (reporter, definition) {
    this.reporter = reporter
    this.definition = definition
    this.cleanScheduleHistoryRunning = false

    this.beforeProcessJobListeners = reporter.createListenerCollection('Scheduling@beforeProcessJob')

    this.ScheduleType = this.reporter.documentStore.registerEntityType('ScheduleType', {
      cron: { type: 'Edm.String' },
      name: { type: 'Edm.String' },
      templateShortid: { type: 'Edm.String', referenceTo: 'templates' },
      nextRun: { type: 'Edm.DateTimeOffset', schema: { type: 'null' }, index: true },
      enabled: { type: 'Edm.Boolean' },
      state: { type: 'Edm.String' }
    })

    this.TaskType = this.reporter.documentStore.registerEntityType('TaskType', {
      scheduleShortid: { type: 'Edm.String', referenceTo: 'schedules' },
      finishDate: { type: 'Edm.DateTimeOffset' },
      state: { type: 'Edm.String', index: true, length: 255 },
      error: { type: 'Edm.String' },
      ping: { type: 'Edm.DateTimeOffset' }
    })

    this.reporter.documentStore.registerEntitySet('schedules', {
      entityType: 'jsreport.ScheduleType',
      shared: true,
      splitIntoDirectories: true
    })

    this.reporter.documentStore.model.entityTypes.ReportType.taskId = { type: 'Edm.String' }

    this.reporter.documentStore.registerEntitySet('tasks', {
      entityType: 'jsreport.TaskType',
      shared: true,
      exportable: false
    })

    reporter.initializeListeners.add(definition.name, this, () => this._initialize())

    this.reporter.on('express-configure', (app) => {
      app.get('/api/scheduling/nextRun/:cron', (req, res) => {
        try {
          const cron = parseCron(req.params.cron, {
            currentDate: new Date()
          })

          try {
            res.send(cron.next().toDate())
          } catch (e) {
            res.send(new Date(0))
          }
        } catch (e) {
          res.status(400).send('invalid cron pattern, ' + e.message)
        }
      })

      app.post('/api/scheduling/runNow', async (req, res) => {
        try {
          const schedule = await reporter.documentStore.collection('schedules').find({
            _id: req.body.scheduleId
          }, req)

          if (schedule.length === 0) {
            res.status(404).end(`can't find a schedule with id ${req.body.scheduleId}`)
            return
          }

          await reporter.scheduling.jobProcessor.execute(schedule[0], null, req, true)

          res.status(200).end()
        } catch (err) {
          res.status(500).end(err.message)
        }
      })
    })

    if (definition.options.cleanScheduleHistoryInterval && definition.options.maxHistoryPerSchedule) {
      this.reporter.logger.info(`scheduling extension has enabled schedule history cleanup with interval ${definition.options.cleanScheduleHistoryInterval}ms and max history of ${definition.options.maxHistoryPerSchedule} per schedule`)
      this.cleanScheduleHistoryIntervalTimer = setInterval(() => this.cleanScheduleHistory(), definition.options.cleanScheduleHistoryInterval)
      this.cleanScheduleHistoryIntervalTimer.unref()
    }
  }

  _updateNextRun (entity) {
    let cron

    try {
      cron = parseCron(entity.cron, {
        currentDate: new Date()
      })

      entity.nextRun = cron.next().toDate()

      cron = parseCron(entity.cron, {
        currentDate: new Date(entity.nextRun.getTime() + 1000)
      })
    } catch (e) {
      throw this.reporter.createError('invalid cron pattern', {
        statusCode: 400,
        original: e
      })
    }

    const intervalMS = cron.next().toDate().getTime() - entity.nextRun.getTime()

    if (intervalMS < this.definition.options.minScheduleInterval) {
      throw this.reporter.createError(`Minimal interval for schedule is ${
        moment.duration(this.definition.options.minScheduleInterval).humanize()
      }. You are trying to set ${moment.duration(intervalMS - 10000).humanize()}`, {
        statusCode: 400
      })
    }
  }

  _beforeCreateHandler (entity) {
    if (!entity.cron) {
      throw this.reporter.createError('cron expression must be set', {
        statusCode: 400
      })
    }

    entity.state = 'planned'
    entity.enabled = entity.enabled !== false // default false
    this._updateNextRun(entity)

    if (entity.enabled !== false && !entity.templateShortid) {
      throw this.reporter.createError('Enabled schedules needs to include template', {
        statusCode: 400
      })
    }
  }

  async _beforeUpdateHandler (query, update, opts, req) {
    const entity = update.$set || {}

    // like if it comes from studio
    const isFullUpdate = (
      Object.prototype.hasOwnProperty.call(entity, 'name') &&
      Object.prototype.hasOwnProperty.call(entity, 'cron') &&
      Object.prototype.hasOwnProperty.call(entity, 'state') &&
      Object.prototype.hasOwnProperty.call(entity, 'enabled') &&
      Object.prototype.hasOwnProperty.call(entity, 'templateShortid')
    )

    let schedsCache

    const getMatchedScheds = async () => {
      if (schedsCache) {
        return schedsCache
      }

      schedsCache = await this.reporter.documentStore.collection('schedules').find(query, req)

      return schedsCache
    }

    if (isFullUpdate) {
      if (!entity.cron) {
        throw this.reporter.createError('cron expression must be set', {
          statusCode: 400
        })
      }

      this._updateNextRun(entity)
      entity.state = 'planned'

      if (entity.enabled !== false && !entity.templateShortid) {
        throw this.reporter.createError('Enabled schedules needs to include template', {
          statusCode: 400
        })
      }
    }

    if (!isFullUpdate && Object.prototype.hasOwnProperty.call(entity, 'cron')) {
      if (!entity.cron) {
        throw this.reporter.createError('cron expression must be set', {
          statusCode: 400
        })
      }

      this._updateNextRun(entity)
      entity.state = entity.state || 'planned'
    }

    if (!isFullUpdate && Object.prototype.hasOwnProperty.call(entity, 'templateShortid')) {
      const scheds = await getMatchedScheds()

      scheds.forEach((sched) => {
        if (sched.enabled !== true || entity.enabled === false) {
          // don't do nothing if the schedule is not enabled, we only validate templateShortid for
          // enabled schedules
          return
        }

        if (!entity.templateShortid) {
          throw this.reporter.createError('Enabled schedules needs to include template', {
            statusCode: 400
          })
        }
      })
    }

    if (entity.enabled === true) {
      // update next run if schedule is enabled,
      // this prevents generating a lot of tasks when the schedule was disabled and re-enabled after for some time
      const scheds = await getMatchedScheds()

      scheds.forEach((sched) => {
        if (sched.enabled === true) {
          // don't do nothing if the schedule enabled is not changed to different value
          return
        }

        const currentCron = entity.cron != null ? entity.cron : sched.cron

        entity.cron = currentCron

        this._updateNextRun(entity)
      })
    } else if (entity.enabled === false) {
      // remove tasks if schedule is disabled,
      // this allows the schedule to start clean again with no previous/pending tasks
      const scheds = await getMatchedScheds()

      await Promise.all(scheds.map(async (sched) => {
        if (sched.enabled === false) {
          // don't do nothing if the schedule enabled is not changed to different value
          return
        }

        await this.reporter.documentStore.collection('tasks').remove({
          state: 'running',
          scheduleShortid: sched.shortid
        }, req)
      }))
    }
  }

  _initialize () {
    if (this.definition.options.autoStart !== false) {
      this.start()
    }

    if (this.reporter.authorization) {
      const collections = [this.reporter.documentStore.collection('schedules'), this.reporter.documentStore.collection('tasks')]

      collections.forEach((col) => {
        col.beforeFindListeners.add(this.definition.name, async (q, p, req) => {
          const isAdmin = await this.reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (req && req.context && req.context.userFindCall && req.context.user && !isAdmin) {
            throw this.reporter.authorization.createAuthorizationError(col.name)
          }
        })

        col.beforeInsertListeners.add(this.definition.name, async (doc, req) => {
          const isAdmin = await this.reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (req && req.context && req.context.user && !isAdmin) {
            throw this.reporter.authorization.createAuthorizationError(col.name)
          }
        })

        col.beforeUpdateListeners.add(this.definition.name, async (q, u, options, req) => {
          const isAdmin = await this.reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (req && req.context && req.context.user && !isAdmin) {
            throw this.reporter.authorization.createAuthorizationError(col.name)
          }
        })

        col.beforeRemoveListeners.add(this.definition.name, async (q, req) => {
          const isAdmin = await this.reporter.authentication.isUserAdmin(req?.context?.user, req)

          if (req && req.context && req.context.user && !isAdmin) {
            throw this.reporter.authorization.createAuthorizationError(col.name)
          }
        })
      })
    }

    this.schedulesCollection = this.reporter.documentStore.collection('schedules')
    this.schedulesCollection.beforeInsertListeners.add('schedule', this._beforeCreateHandler.bind(this))
    this.schedulesCollection.beforeUpdateListeners.add('schedule', this._beforeUpdateHandler.bind(this))
  }

  stop () {
    this.jobProcessor.stop()
  }

  start () {
    this.jobProcessor.start()
  }

  async cleanScheduleHistory () {
    if (this.cleanScheduleHistoryRunning) {
      return
    }

    this.cleanScheduleHistoryRunning = true

    try {
      this.reporter.logger.debug('Cleaning up schedule history')

      const schedules = await this.reporter.documentStore.collection('schedules').find({})
      const tasksToRemove = []

      for (const schedule of schedules) {
        const scheduleTasks = await this.reporter.documentStore.collection('tasks').find({
          scheduleShortid: schedule.shortid,
          state: { $in: ['error', 'canceled', 'success'] }
        }).sort({ creationDate: -1 })

        const filteredTasks = scheduleTasks.slice(this.definition.options.maxHistoryPerSchedule)

        if (filteredTasks.length === 0) {
          continue
        }

        tasksToRemove.push(...filteredTasks)
      }

      if (tasksToRemove.length !== 0) {
        this.reporter.logger.debug(`Cleaning schedule history ${tasksToRemove.length} records`)
        await Promise.all(tasksToRemove.map((t) => this.reporter.documentStore.collection('tasks').remove({ _id: t._id })))
      }
    } catch (e) {
      this.reporter.logger.error('Failed to clean up schedule history', e)
    }

    this.cleanScheduleHistoryRunning = false
  }

  renderReport (schedule, task) {
    return this.reporter.render({
      template: {
        shortid: schedule.templateShortid
      },
      context: { user: { isSuperAdmin: true, isAdmin: true } },
      options: {
        scheduling: { taskId: task._id.toString(), schedule: schedule },
        reports: { save: true, mergeProperties: { taskId: task._id.toString() } }
      }
    })
  }
}

module.exports = function (reporter, definition) {
  if (definition.options.enabled === false) {
    return
  }

  reporter.scheduling = new Scheduling(reporter, definition)

  definition.options = Object.assign({
    interval: 5000,
    misfireThreshold: Infinity,
    maxParallelJobs: 5,
    minScheduleInterval: 60000
  }, definition.options)

  reporter.scheduling.jobProcessor = new JobProcessor({
    beforeProcessJobListeners: reporter.scheduling.beforeProcessJobListeners,
    executionHandler: reporter.scheduling.renderReport.bind(reporter.scheduling),
    documentStore: reporter.documentStore,
    logger: reporter.logger,
    TaskType: reporter.scheduling.TaskType,
    Request: reporter.Request,
    options: definition.options
  })

  reporter.closeListeners.add('scheduling', () => {
    clearInterval(reporter.scheduling.cleanScheduleHistoryIntervalTimer)
    reporter.scheduling.stop()
  })
}
