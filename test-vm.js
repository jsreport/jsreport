const path = require('path')
const http = require('http')
const Request = require('./packages/jsreport-core/lib/shared/request')
const generateRequestId = require('./packages/jsreport-core/lib/shared/generateRequestId')
const ExecuteEngine = require('./packages/jsreport-core/lib/worker/render/executeEngine')
const reporter = require('./test-reporter')

let renderCount = 0

const executeEngine = ExecuteEngine(reporter)

const server = http.createServer((req, res) => {
  if (req.url === '/render') {
    renderCount++
    console.log(`Starting render ${renderCount}`)

    console.time(`render ${renderCount}`)

    render().then((result) => {
      console.log(`render ${renderCount} OK`)
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(result.content.toString())
    }).catch((err) => {
      console.log(`render ${renderCount} FAILED\n${err.message}\n\n${err.stack}`)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(`Error when render\n${err.message}\n\n${err.stack}`)
    }).finally(() => {
      console.timeEnd(`render ${renderCount}`)
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
})

const PORT = 3000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

async function render () {
  const hbRawPath = require.resolve('handlebars')
  const hbPath = path.join(path.dirname(hbRawPath), '../')

  const engine = require('./packages/jsreport-handlebars/lib/handlebarsEngine')({
    handlebarsModulePath: hbPath
  })

  engine.name = 'handlebars'

  const data = {}

  const content = "<img  src='data:image/png;base64,{{barcode}}' />"

  const helpers = `
    const bwipjs = require('bwip-js');

    function barcode()  {
      return bwipjs.toBuffer({
        bcid:  'code128',
        text:  '0123456789',
        scale:  3,
        height:  10,
        includetext:  true,
        textxalign:  'center',
      }).then(p => p.toString('base64'))
    }
  `

  const req = Request({})

  req.context.rootId = req.context.rootId || generateRequestId()
  req.context.id = req.context.rootId
  req.template.content = content
  req.template.helpers = helpers
  req.template.engine = engine.name
  req.data = data

  try {
    reporter.requestModulesCache.set(req.context.rootId, Object.create(null))

    const engineRes = await executeEngine(engine, req)

    const response = {}
    response.content = Buffer.from(engineRes.content != null ? engineRes.content : '')

    return response
  } finally {
    reporter.requestModulesCache.delete(req.context.rootId)
  }
}
