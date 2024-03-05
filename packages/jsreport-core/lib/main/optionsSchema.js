const { getDefaultTempDirectory, getDefaultLoadConfig } = require('./defaults')
// we use deepmerge instead of node.extend here because it supports
// concatenating arrays instead of replacing them, something necessary
// to support extending some values in schemas like the "enum"
const deepMerge = require('deepmerge')

module.exports.getRootSchemaOptions = () => ({
  type: 'object',
  properties: {
    rootDirectory: {
      type: 'string',
      description: 'specifies where is the application root and where jsreport searches for extensions'
    },
    appDirectory: {
      type: 'string',
      description: 'specifies directory of the script that was used to start node.js, this value is mostly metadata that is useful for your own code inside jsreport scripts'
    },
    tempDirectory: {
      type: 'string',
      default: getDefaultTempDirectory(),
      description: 'specifies where jsreport stores temporary files used by the conversion pipeline'
    },
    loadConfig: {
      type: 'boolean',
      default: getDefaultLoadConfig(),
      description: 'specifies if jsreport should load configuration values from external sources (cli args, env vars, configuration files) or not'
    },
    autoTempCleanup: {
      type: 'boolean',
      default: true,
      description: 'specifies if after some interval jsreport should automatically clean up temporary files generated while rendering reports'
    },
    discover: {
      type: 'boolean',
      defaultNotInitialized: true,
      description: 'specifies if jsreport should discover/search installed extensions in project and use them automatically'
    },
    useExtensionsLocationCache: {
      type: 'boolean',
      default: true,
      description: 'whether if jsreport should read list of extensions from a previous generated cache or if it should crawl and try to search extensions again, set it to false when you want to always force crawling node_modules when searching for extensions while starting jsreport'
    },
    logger: {
      type: 'object',
      properties: {
        silent: { type: 'boolean' }
      }
    },
    reportTimeout: {
      type: ['string', 'number'],
      '$jsreport-acceptsDuration': true,
      description: 'global single timeout that controls how much a report generation should wait before it times out',
      default: 60000
    },
    reportTimeoutMargin: {
      type: ['string', 'number'],
      description: 'the time to wait before the worker thread is forcibly  killed after timeout',
      '$jsreport-acceptsDuration': true,
      default: '2s'
    },
    enableRequestReportTimeout: { type: 'boolean', default: false, description: 'option that enables passing a custom report timeout per request using req.options.timeout. this enables that the caller of the report generation control the report timeout so enable it only when you trust the caller' },
    trustUserCode: { type: 'boolean', default: false, description: 'option that control whether code sandboxing is enabled or not, code sandboxing has an impact on performance when rendering large reports. when true code sandboxing will be disabled meaning that users can potentially penetrate the local system if you allow code from external users to be part of your reports' },
    allowLocalFilesAccess: { type: 'boolean', default: false },
    encryption: {
      type: 'object',
      default: {},
      properties: {
        secretKey: {
          type: 'string',
          minLength: 16,
          maxLength: 16
        },
        enabled: {
          type: 'boolean',
          default: true
        }
      }
    },
    sandbox: {
      type: 'object',
      default: {},
      properties: {
        isolateModules: { type: 'boolean', default: true, description: 'option that control whether require/import of modules during rendering are isolated from other renders or not. when this is false the require/import of modules will behave like normal require, which means that module is evaluated only once and next require/import are resolved from a cache' },
        allowedModules: {
          anyOf: [{
            type: 'string',
            '$jsreport-constantOrArray': ['*']
          }, {
            type: 'array',
            items: { type: 'string' }
          }]
        },
        cache: {
          type: 'object',
          default: {},
          properties: {
            max: { type: 'number', default: 100 },
            enabled: { type: 'boolean', default: true }
          }
        }
      }
    },
    workers: {
      type: 'object',
      default: {},
      properties: {
        numberOfWorkers: {
          type: 'number',
          default: 2,
          description: 'Number of workers allocated. Every worker can process a single request in parallel. This means increasing numberOfWorkers will increase the parallelization.'
        },
        initTimeout: {
          type: ['string', 'number'],
          '$jsreport-acceptsDuration': true,
          description: 'Timeout for initializing a worker thread. This should be increased only when running at very slow HW environment.',
          default: '30s'
        },
        resourceLimits: {
          type: 'object',
          description: 'Limits for the individual workers. See https://nodejs.org/api/worker_threads.html#worker_threads_worker_resourcelimits',
          properties: {
            maxOldGenerationSizeMb: { type: 'number' },
            maxYoungGenerationSizeMb: { type: 'number' },
            codeRangeSizeMb: { type: 'number' },
            stackSizeMb: { type: 'number' }
          }
        }
      }
    },
    store: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['memory'] },
        transactions: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', default: true }
          }
        }
      }
    },
    blobStorage: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['memory'] }
      }
    },
    extensions: {
      type: 'object',
      properties: {}
    },
    extensionsList: {
      anyOf: [
        {
          type: 'string',
          '$jsreport-constantOrArray': []
        },
        {
          type: 'array',
          items: { type: 'string' }
        }
      ]
    },
    profiler: {
      type: 'object',
      default: {},
      properties: {
        defaultMode: {
          type: 'string',
          default: 'standard'
        },
        fullModeDurationCheckInterval: {
          type: ['string', 'number'],
          '$jsreport-acceptsDuration': true,
          default: '10m'
        },
        fullModeDuration: {
          type: ['string', 'number'],
          '$jsreport-acceptsDuration': true,
          default: '4h'
        },
        maxProfilesHistory: {
          type: 'number',
          default: 1000
        },
        cleanupInterval: {
          type: ['string', 'number'],
          '$jsreport-acceptsDuration': true,
          default: '1m'
        },
        maxUnallocatedProfileAge: {
          type: ['string', 'number'],
          '$jsreport-acceptsDuration': true,
          default: '24h'
        },
        maxDiffSize: {
          type: ['string', 'number'],
          '$jsreport-acceptsSize': true,
          default: '50mb'
        }
      }
    }
  }
})

module.exports.extendRootSchemaOptions = (rootSchema, schema) => {
  const schemasToApply = Array.isArray(schema) ? schema : [schema]

  rootSchema.properties = rootSchema.properties || {}

  rootSchema.properties.extensions = rootSchema.properties.extensions || {
    type: 'object',
    properties: {}
  }

  schemasToApply.forEach((sch) => {
    if (sch == null) {
      return
    }

    if (sch.schema == null && sch.name != null) {
      rootSchema.properties.extensions.properties[sch.name] = {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' }
        }
      }
      return
    } else if (sch.schema == null) {
      return
    }

    Object.keys(sch.schema).forEach((key) => {
      const current = sch.schema[key]

      if (key === 'extensions') {
        if (current == null) {
          return
        }

        Object.keys(current).forEach(s => {
          rootSchema.properties.extensions.properties[s] = deepMerge(rootSchema.properties.extensions.properties[s] || {}, current[s])

          if (
            rootSchema.properties.extensions.properties[s].properties &&
            rootSchema.properties.extensions.properties[s].properties.enabled == null
          ) {
            rootSchema.properties.extensions.properties[s].properties.enabled = { type: 'boolean' }
          }
        })
      } else if (current != null) {
        rootSchema.properties[key] = deepMerge(rootSchema.properties[key] || {}, current)
      }
    })
  })

  return rootSchema
}

module.exports.ignoreInitialSchemaProperties = [
  'properties.store.properties.provider',
  'properties.blobStorage.properties.provider'
]
