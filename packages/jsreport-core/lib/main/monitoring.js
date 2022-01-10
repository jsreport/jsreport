const os = require('os')

function cpu () {
  // Create function to get CPU information
  function cpuAverage () {
  // Initialise sum of idle and time of cores and fetch CPU info
    let totalIdle = 0; let totalTick = 0
    const cpus = os.cpus()

    // Loop through CPU cores
    for (let i = 0, len = cpus.length; i < len; i++) {
    // Select CPU core
      const cpu = cpus[i]

      // Total up the time in the cores tick
      for (const type in cpu.times) {
        totalTick += cpu.times[type]
      }

      // Total up the idle time of the core
      totalIdle += cpu.times.idle
    }

    // Return the average Idle and Tick times
    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length }
  }

  // Grab first CPU Measure
  const startMeasure = cpuAverage()

  return new Promise((resolve) => {
    // Set delay for second Measure
    setTimeout(function () {
    // Grab second Measure
      const endMeasure = cpuAverage()

      // Calculate the difference in idle and total time between the measures
      const idleDifference = endMeasure.idle - startMeasure.idle
      const totalDifference = endMeasure.total - startMeasure.total

      // Calculate the average percentage CPU usage
      const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference)

      // Output result to console
      resolve(percentageCPU)
    }, 1000)
  })
}

class Monitoring {
  constructor (reporter) {
    this.reporter = reporter
  }

  async execute () {
    const monitoring = {
      cpu: await cpu(),
      freemem: Math.round(os.freemem() / 1024 / 1024),
      timestamp: new Date(),
      hostname: os.hostname()
    }
    return this.reporter.documentStore.collection('monitoring').insert(monitoring)
  }

  init () {
    this._interval = setInterval(() => {
      this.execute().catch((e) => this.reporter.logger.warn('unable to persist monitoring info, but no need to worry, we will retry, details:' + e.stack))
    }, 60000)
    this._interval.unref()
  }

  close () {
    clearInterval(this._interval)
  }
}

module.exports = (reporter) => {
  reporter.documentStore.registerEntityType('MonitoringType', {
    cpu: { type: 'Edm.Int32' },
    freemem: { type: 'Edm.Int32' },
    timestamp: { type: 'Edm.DateTimeOffset', schema: { type: 'null' } },
    hostname: { type: 'Edm.String' }
  })

  reporter.documentStore.registerEntitySet('monitoring', {
    entityType: 'jsreport.MonitoringType',
    exportable: false,
    shared: true
  })

  reporter.monitoring = new Monitoring(reporter)
}
