const urlModule = require('url')
const http = require('http')
const getTempPaths = require('@jsreport/jsreport-cli/lib/utils/getTempPaths')
const { addStack } = require('@jsreport/jsreport-cli/lib/utils/error')
const daemonHandler = require('@jsreport/jsreport-cli/lib/daemonHandler')

module.exports = async function delegateRender ({ cwd, args, instanceVersion }) {
  let processInfo

  const log = (...params) => {
    if (args.includes('--verbose') || args.includes('-b')) {
      console.log(...params)
    }
  }

  const tempPaths = getTempPaths()

  tempPaths.createPaths()

  const workerSockPath = tempPaths.workerSockPath

  try {
    processInfo = await daemonHandler.findProcessByCWD(workerSockPath, cwd)
  } catch (processLookupErr) {
    return onCriticalError(processLookupErr)
  }

  if (!processInfo) {
    return { processFound: false }
  }

  const currentVersion = instanceVersion

  if (
    currentVersion &&
    (
      // if it is an older version, kill it
      processInfo.version == null ||
      processInfo.version !== currentVersion
    )
  ) {
    log(`instance version daemonized previously (pid: ${processInfo.pid}${
      processInfo.version != null ? `, version: ${processInfo.version}` : ''
    }) does not match with the current instance (version: ${currentVersion}), killing previously daemonized instance..`)

    await daemonHandler.kill(processInfo)

    log(`instance daemonized previously (pid: ${processInfo.pid}${
      processInfo.version != null ? `, version: ${processInfo.version}` : ''
    }) was killed..`)

    log('going to create new daemonized instance in:', workerSockPath, 'cwd:', cwd)

    return { processFound: false }
  }

  const adminAuthentication = processInfo.adminAuthentication || {}

  try {
    const response = await sendRequest({
      url: processInfo.url,
      user: adminAuthentication.username,
      password: adminAuthentication.password,
      body: {
        cwd,
        args
      }
    })

    response.data.logs.forEach((l) => {
      if (l.type === 'error') {
        console.error(l.message)
      } else {
        console.log(l.message)
      }
    })

    if (response.failure) {
      return { processFound: true, failure: true }
    }

    return { processFound: true }
  } catch (e) {
    return onCriticalError(e)
  }
}

async function sendRequest ({ url, user, password, body }) {
  try {
    const response = await new Promise((resolve, reject) => {
      try {
        const reqTimeout = 0
        const urlInfo = new urlModule.URL(url)

        const serializedRequestBody = JSON.stringify(body)

        const requestOpts = {
          host: urlInfo.hostname,
          port: urlInfo.port,
          path: '/api/cli/render-keep-alive',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(serializedRequestBody)
          },
          timeout: reqTimeout
        }

        if (user) {
          requestOpts.auth = `${user}:${password}`
        }

        const postReq = http.request(requestOpts, (res) => {
          getResponseData(res, (err, result) => {
            if (err) {
              return reject(err)
            }

            if (result.statusCode >= 200 && result.statusCode < 300) {
              resolve({
                statusCode: result.statusCode,
                data: result.data
              })
            } else if (result.statusCode === 404) {
              reject(new Error(`Couldn't connect to remote jsreport server in: ${
                url
              } , Please verify that a jsreport server is running`))
            } else if (result.statusCode === 401) {
              reject(new Error(`Couldn't connect to remote jsreport server in: ${
                url
              } , Authentication error, Please pass correct --user and --password options`))
            } else {
              resolve({
                statusCode: result.statusCode,
                failure: true,
                data: result.data
              })
            }
          })
        })

        postReq.setTimeout(reqTimeout)

        postReq.on('error', reject)
        postReq.write(serializedRequestBody)
        postReq.end()
      } catch (e) {
        reject(e)
      }
    })

    return response
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      throw new Error(`Couldn't connect to remote jsreport server in: ${
        url
      } , Please verify that a jsreport server is running`)
    }

    throw e
  }
}

function getResponseData (res, cb) {
  let body = Buffer.from([])

  res.on('error', cb)

  res.on('data', (chunk) => {
    body = Buffer.concat([body, chunk])
  })

  res.on('end', () => {
    const d = Buffer.concat([body]).toString()

    try {
      const obj = d !== '' ? JSON.parse(d) : {}

      cb(null, {
        statusCode: res.statusCode,
        data: obj
      })
    } catch (e) {
      const err = new Error(`Server returned a non JSON body, status code ${res.statusCode}, raw: ${d}`)
      cb(err)
    }
  })
}

function onCriticalError (err) {
  const originalMsg = err.message

  addStack(err, err.stack, {
    stripMessage: true
  })

  err.message = `A critical error occurred while trying to execute the render command (delegate mode): ${originalMsg}. info: ${JSON.stringify(err)}`

  throw err
}
