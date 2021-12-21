
module.exports = {
  name: 'docker-workers',
  main: 'lib/main.js',
  dependencies: ['express'],
  requires: {
    core: '3.x.x',
    express: '3.x.x'
  },
  optionsSchema: {
    ip: { type: 'string' },
    stack: { type: 'string', default: 'default' },
    extensions: {
      'docker-workers': {
        type: 'object',
        properties: {
          discriminatorPath: { type: 'string', default: 'context.rootId' },
          containerParallelRequestsLimit: { type: 'number' },
          pingServersInterval: {
            type: ['string', 'number'],
            '$jsreport-acceptsDuration': true,
            default: 5000
          },
          pingHealthyInterval: {
            type: ['string', 'number'],
            '$jsreport-acceptsDuration': true,
            default: 20000
          },
          container: {
            type: 'object',
            default: {
              image: 'jsreport/worker',
              namePrefix: 'jsreport_worker',
              exposedPort: 2000,
              basePublishPort: 2001,
              baseDebugPort: 9230,
              startTimeout: 10000,
              restartPolicy: true,
              warmupPolicy: true,
              debuggingSession: false,
              memorySwap: '512m',
              memory: '420m',
              cpus: '0.5',
              logDriver: 'json-file'
            },
            properties: {
              image: { type: 'string', default: 'jsreport/worker' },
              namePrefix: { type: 'string', default: 'jsreport_worker' },
              exposedPort: { type: 'number', default: 2000 },
              basePublishPort: { type: 'number', default: 2001 },
              baseDebugPort: { type: 'number', default: 9230 },
              customEnv: {
                anyOf: [{
                  type: 'string',
                  '$jsreport-constantOrArray': []
                }, {
                  type: 'array',
                  items: { type: 'string' }
                }]
              },
              startTimeout: {
                type: ['string', 'number'],
                '$jsreport-acceptsDuration': true,
                default: 10000
              },
              restartPolicy: { type: 'boolean', default: true },
              warmupPolicy: { type: 'boolean', default: true },
              restartTimeout: {
                type: ['string', 'number'],
                '$jsreport-acceptsDuration': true,
                default: 5000
              },
              debuggingSession: { type: 'boolean', default: false },
              memorySwap: { type: 'string', default: '512m' },
              memory: { type: 'string', default: '420m' },
              cpus: { type: 'string', default: '0.5' },
              logDriver: { type: 'string', default: 'json-file' },
              logOpt: { type: 'object' }
            }
          },
          reportTimeoutMargin: {
            type: ['string', 'number'],
            description: 'the time to wait before the container is forcibly killed after timeout',
            '$jsreport-acceptsDuration': true,
            default: '2s'
          },
          subnet: { type: 'string', default: '172.30.0.0/24' },
          network: { type: 'string', default: 'nw_jsreport_docker_workers' },
          busyQueueWaitingTimeout: {
            type: ['string', 'number'],
            '$jsreport-acceptsDuration': true,
            default: 10000
          },
          numberOfWorkers: { type: 'number', minimum: 1, default: 4 }
        }
      }
    }
  }
}
