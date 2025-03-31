const http = require('http')
const https = require('http')
const { pipeline } = require('stream')

let initPromise
let server
module.exports = {
  init: () => {
    if (initPromise) {
      return initPromise
    }

    initPromise = new Promise((resolve, reject) => {
      server = http.createServer((req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
        const timeout = parseInt(parsedUrl.searchParams.get('timeout'))

        const proxyReq = (parsedUrl.protocol === 'http' ? http : https).request(decodeURIComponent(parsedUrl.searchParams.get('url')), (r) => {
          for (const h in r.headers) {
            res.setHeader(h, r.headers[h])
          }

          pipeline(r, res, (err) => {
            if (err) {
              res.statusCode = 500
              res.statusMessage = err.message
              res.end()
            }
          })
        })

        let timedOut = false
        const reqTimeoutRef = setTimeout(() => {
          if (timedOut) {
            return
          }
          timedOut = true
          proxyReq.destroy()
        }, timeout).unref()

        proxyReq.once('error', (err) => {
          clearTimeout(reqTimeoutRef)
          res.statusCode = timedOut ? 504 : 500
          res.statusMessage = timedOut ? `Resource request timedout after ${timeout}ms` : err.message
          res.end()
        })

        proxyReq.once('close', () => {
          clearTimeout(reqTimeoutRef)
        })

        proxyReq.end()
      })

      server.listen(0, 'localhost', (err) => {
        if (err) {
          return reject(err)
        }

        resolve()
      })
    })

    return initPromise
  },
  close: () => {
    return server.close()
  },
  makeUrl: (url, timeout) => {
    return `http://localhost:${server.address().port}/?url=${encodeURIComponent(url)}&timeout=${timeout}`
  }

}
