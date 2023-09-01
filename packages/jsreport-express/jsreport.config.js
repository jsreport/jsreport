
const schemaProperties = {
  hostname: { type: 'string' },
  httpPort: { type: 'number' },
  httpsPort: { type: 'number' },
  appPath: {
    type: 'string',
    description: 'optionally set application path, if you run application on http://appdomain.com/reporting then set "/reporting" to `appPath`. The default behavior is that it is assumed that jsreport is running behind a proxy, so you need to do url url rewrite /reporting -> / to make it work correctly, See `mountOnAppPath` when there is no proxy + url rewrite involved in your setup.'
  },
  mountOnAppPath: {
    type: 'boolean',
    default: false,
    description: 'use this option along with `appPath`. it specifies if all jsreport routes should be available with appPath as prefix, therefore making `appPath` the new root url of application'
  },
  certificate: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      cert: { type: 'string' }
    }
  }
}

module.exports = {
  name: 'express',
  main: 'lib/main.js',
  worker: 'lib/worker.js',
  requires: {
    core: '4.x.x',
    studio: '4.x.x'
  },
  optionsSchema: {
    ...schemaProperties,
    extensions: {
      express: {
        type: 'object',
        properties: {
          ...schemaProperties,
          start: {
            type: 'boolean',
            default: true,
            description: 'specifies if the server should be started automatically during jsreport initialization, if false you should start the server manually by using jsreport.express.start() after jsreport is initialized'
          },
          trustProxy: { type: 'boolean', default: true },
          inputRequestLimit: { type: 'string', default: '50mb' },
          exposeHttpHeaders: {
            type: 'boolean',
            default: false,
            description: 'specifies if incoming request http headers should be exposed as `req.context.http.headers` inside jsreport scripts'
          },
          responseHeaders: {
            type: 'object'
          },
          cors: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true }
            }
          }
        }
      }
    }
  }
}
