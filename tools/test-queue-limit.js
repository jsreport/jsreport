// Fires parallel slow renders at /api/report and reports how many got 200 vs 429.
// Start the server first, e.g.: $env:workers_numberOfWorkers='1'; $env:workers_maxQueueSize='0'; node server.js
// Usage: node tools/test-queue-limit.js [--requests 5] [--renderMs 2000] [--baseUrl http://localhost:5488]
const { parseArgs } = require('util')

const { values } = parseArgs({
  options: {
    baseUrl: { type: 'string', default: 'http://localhost:5488' },
    requests: { type: 'string', default: '5' },
    renderMs: { type: 'string', default: '2000' }
  }
})
const baseUrl = values.baseUrl
const requests = Number(values.requests)
const renderMs = Number(values.renderMs)

;(async () => {
  const body = JSON.stringify({
    template: {
      content: '{{slow}}',
      engine: 'handlebars',
      recipe: 'html',
      helpers: `function slow(){ const s=Date.now(); while(Date.now()-s<${renderMs}){}; return 'done' }`
    }
  })

  console.log(`Sending ${requests} parallel renders (${renderMs} ms each) to ${baseUrl}/api/report`)
  const renders = Array.from({ length: requests }, () =>
    fetch(`${baseUrl}/api/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  )

  // OData must stay available while workers are busy
  await new Promise((resolve) => setTimeout(resolve, 300))
  const odata = fetch(`${baseUrl}/odata/templates?$select=name&$top=1`)

  const results = await Promise.all(renders.map(async (p, i) => {
    const res = await p
    const text = await res.text()
    return { request: i + 1, status: res.status, body: text.slice(0, 70).replace(/\s+/g, ' ') }
  }))
  console.table(results)
  console.log('OData query during load:', (await odata).status)

  const ok = results.filter((r) => r.status === 200).length
  const rejected = results.filter((r) => r.status === 429).length
  console.log(`200: ${ok}  429: ${rejected}  other: ${requests - ok - rejected}`)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
