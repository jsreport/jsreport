const fsStandard = require('fs')
const v8 = require('v8')
const path = require('path')
const jsreportClient = require('@jsreport/nodejs-client')('http://localhost:5488')

if (!fsStandard.existsSync('tools/snapshots')) {
  fsStandard.mkdirSync('tools/snapshots')
}

const jsreport = require('jsreport')({
  rootDirectory: path.join(__dirname, '../'),
  logger: {
    silent: true
  }
})
const snapshots = 1
let elapsedTime = 0

const data = {
  people: []
}
for (let i = 0; i < 10000; i++) {
  data.people.push({
    name: 'jan' + i
  })
}

(async () => {
  console.log('initializing...')
  await jsreport.init()
  console.log('rendering...')

  console.time('reports took')

  for (let i = 1; i < 100000; i++) {
    const start = new Date().getTime()
    await jsreportClient.render({
      template: {
        content: 'hello', // {{#each people}}{{name}}{{/each}}',
        recipe: 'chrome-pdf',
        engine: 'handlebars',
        pdfOperations: [{
          type: 'merge',
          template: { content: 'Header', engine: 'none', recipe: 'chrome-pdf' }
        }]
      },
      data
    })
    elapsedTime += new Date().getTime() - start

    if (i % 100 === 0) {
      console.log(`${i} avg report time: ${Math.round(elapsedTime / 100)}mns`)
      elapsedTime = 0
    }

    if (i % 1000 === 0) {
      console.log('dumping memory...')
      global.gc()
      await new Promise(resolve => setTimeout(resolve, 2000))
      const memoryUsed = Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100
      console.log(`memory used: ${memoryUsed} MB`)

      // const workserSnapshotStream = await jsreport._workersManager.pool.workers[0].worker.getHeapSnapshot()
      // console.log('writing snapshot memory...')
      // workserSnapshotStream.pipe(fsStandard.createWriteStream(`tools/snapshots/snapshot-worker-${snapshots}.heapsnapshot`))

      // v8.getHeapSnapshot().pipe(fsStandard.createWriteStream(`tools/snapshots/snapshot-${snapshots++}.heapsnapshot`))
    }
  }
  await jsreport.close()
})().catch(console.error)
