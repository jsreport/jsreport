const parseCron = require('./parseCron')

module.exports = class JobProcessor {
  constructor ({ beforeProcessJobListeners, executionHandler, documentStore, logger, Request, TaskType, options }) {
    if (!options.taskPingTimeout) {
      options.taskPingTimeout = 2 * options.interval
    }

    this.beforeProcessJobListeners = beforeProcessJobListeners
    this.documentStore = documentStore
    this.logger = logger
    this.options = options
    this.executionHandler = executionHandler
    this.currentlyRunningTasks = []
    this.Request = Request
    this.TaskType = TaskType

    options.misfireThreshold = options.misfireThreshold != null ? options.misfireThreshold : Infinity

    options.now =
      options.now ||
      function () {
        return new Date()
      }
  }

  start () {
    this.interval = setInterval(() => this.process(), this.options.interval)
    this.interval.unref()
  }

  stop () {
    if (this.interval != null) {
      clearInterval(this.interval)
    }
  }

  async process (options = {}) {
    try {
      await this._pingRunningTasks()

      if (this.currentlyRunningTasks.length >= this.options.maxParallelJobs) {
        return
      }

      const tasks = await this._findTasksToRecover()

      const recoveryPromise = Promise.all(
        tasks.map(task => {
          this.logger.info('Recovering task ' + task.schedule.name)
          return this.processOne(task.schedule, task)
        })
      )

      if (options.waitForJobToFinish) {
        await recoveryPromise
      }

      let schedules = await this.documentStore.collection('schedules').find(this._schedulesToProcessFilter())
      const misfiredSchedules = []

      schedules = schedules.filter((sched) => {
        const lastExpectedRun = sched.nextRun
        const now = this.options.now()
        const diffMs = now.getTime() - lastExpectedRun.getTime()

        if (diffMs < 0) {
          // we only care about older schedule tasks, future schedules tasks are fine
          return true
        }

        const valid = this.options.misfireThreshold > diffMs

        if (!valid) {
          misfiredSchedules.push(sched)
        }

        return valid
      })

      if (misfiredSchedules.length) {
        this.logger.info(`Detected ${misfiredSchedules.length} misfired schedule(s)`)

        await Promise.all(misfiredSchedules.map(async (sched) => {
          const nextRun = this.getNextRun(sched, this.options.now())

          const count = await this.documentStore.collection('schedules').update(
            {
              _id: sched._id,
              state: 'planned'
            },
            { $set: { nextRun: new Date(nextRun.getTime()) } },
            localReqWithoutModificationDateUpdate(this.Request, this.Request({}))
          )

          if (count === 1) {
            this.logger.info(`Next run for misfired schedule ${sched.name} was synced`)
          }
        }))
      }

      const processPromise = Promise.all(schedules.map(s => this.processOne(s, null)))

      if (options.waitForJobToFinish) {
        await processPromise
      }
    } catch (e) {
      this.logger.warn('unable to load planned schedules, but no need to worry, we will retry, details:' + e.stack)
    }
  }

  _schedulesToProcessFilter () {
    return {
      $and: [{ nextRun: { $lte: this.options.now() } }, { state: 'planned' }, { enabled: true }]
    }
  }

  _tasksToRecoverFilter () {
    return {
      $and: [{ ping: { $lt: new Date(this.options.now().getTime() - this.options.taskPingTimeout) } }, { state: 'running' }]
    }
  }

  _pingRunningTasks () {
    const ids = this.currentlyRunningTasks.map(t => t._id)
    return this.documentStore.collection('tasks').update({ _id: { $in: ids } }, { $set: { ping: this.options.now() } })
  }

  async _findTasksToRecover () {
    const tasks = await this.documentStore.collection('tasks').find(this._tasksToRecoverFilter())

    if (tasks.length === 0) {
      return []
    }

    const schedules = await this.documentStore.collection('schedules').find({})

    tasks.forEach(t => {
      t.schedule = schedules.find(s => s.shortid === t.scheduleShortid)
    })

    // someone could have deleted schedule or disable the schedule, ignore these tasks
    return tasks.filter(t => {
      const result = t.schedule != null

      if (!result) {
        return result
      }

      return t.schedule.enabled !== false
    })
  }

  getNextRun (sched, fromDate) {
    const cron = parseCron(sched.cron, {
      currentDate: fromDate
    })

    const nextRun = cron.next().toDate()

    return nextRun
  }

  async processOne (schedule, task) {
    if (this.currentlyRunningTasks.length >= this.options.maxParallelJobs) {
      return
    }

    const req = this.Request
      ? this.Request({
          context: {
            skipAuthorization: true
          }
        })
      : undefined

    await this.beforeProcessJobListeners.fire(schedule, task, req)

    try {
      const count = await this.documentStore.collection('schedules').update(
        {
          _id: schedule._id,
          state: 'planned'
        },
        { $set: { state: 'planning' } },
        localReqWithoutModificationDateUpdate(this.Request, req)
      )

      if (count === 1) {
        return this.execute(schedule, task, req)
      }
    } catch (e) {
      this.logger.error('unable to update schedule state. ' + e.stack)
    }
  }

  async execute (schedule, task, req, executeNow) {
    this.logger.debug(`Processing schedule ${schedule.name} is starting${executeNow ? ' (manual)' : ''}.`)

    const insertTaskIfNotExists = async () => {
      if (!task) {
        task = {
          creationDate: this.options.now(),
          scheduleShortid: schedule.shortid,
          state: 'running',
          ping: this.options.now()
        }

        this.currentlyRunningTasks.push(task)

        const doc = await this.documentStore.collection('tasks').insert(task, req)

        task._id = doc._id
      } else {
        this.currentlyRunningTasks.push(task)
      }
    }

    await insertTaskIfNotExists()

    try {
      if (!executeNow) {
        const nextRun = this.getNextRun(schedule, new Date(schedule.nextRun.getTime() + 1000))

        await this.documentStore.collection('schedules').update(
          {
            _id: schedule._id
          },
          {
            $set: {
              state: 'planned',
              nextRun: new Date(nextRun.getTime())
            }
          },
          localReqWithoutModificationDateUpdate(this.Request, req)
        )
      }

      const templates = await this.documentStore.collection('templates').find(
        {
          shortid: schedule.templateShortid
        },
        req
      )

      if (templates.length > 0) {
        await this.executionHandler(schedule, task)

        this.logger.debug(`Processing schedule ${schedule.name} succeeded.`)

        await this.documentStore.collection('tasks').update(
          {
            _id: task._id
          },
          {
            $set: {
              state: 'success',
              finishDate: this.options.now()
            }
          },
          req
        )

        return
      }

      this.logger.debug('Schedule template not found, marking task as error')

      await this.documentStore.collection('tasks').update(
        {
          _id: task._id
        },
        {
          $set: {
            state: 'error',
            error: 'Template shortid:' + schedule.templateShortid + ' was not found',
            finishDate: this.options.now()
          }
        },
        req
      )
    } catch (e) {
      this.logger.debug(`Processing schedule ${schedule.name} failed with : ${e.stack}`)

      await this.documentStore.collection('tasks').update(
        {
          _id: task._id
        },
        {
          $set: {
            state: e.canceled ? 'canceled' : 'error',
            error: e.stack,
            finishDate: this.options.now()
          }
        },
        req
      )
    } finally {
      this.currentlyRunningTasks = this.currentlyRunningTasks.filter(t => t._id !== task._id)
    }
  }
}

function localReqWithoutModificationDateUpdate (Request, req) {
  if (req == null) {
    return req
  }

  // we create copy here to avoid persisting the context.skipModificationDateUpdate field in the
  // original req
  const localReq = Request(req)
  localReq.context.skipModificationDateUpdate = true

  return localReq
}
