process.env.debug = 'jsreport'

const jsreport = require('@jsreport/jsreport-core')
const util = require('util')
const path = require('path')
const omit = require('lodash.omit')
const writeFileAsync = util.promisify(require('fs').writeFile)

const xlsx = require('@jsreport/jsreport-xlsx')
const data = require('@jsreport/jsreport-data')
const pdfUtils = require('@jsreport/jsreport-pdf-utils')
const scripts = require('@jsreport/jsreport-scripts')
const assets = require('@jsreport/jsreport-assets')
const handlebars = require('@jsreport/jsreport-handlebars')
const chromePdf = require('@jsreport/jsreport-chrome-pdf')
const fsStore = require('@jsreport/jsreport-fs-store')

const reporter = jsreport({ store: { provider: 'fs' } })

reporter.use(data())
reporter.use(xlsx())
reporter.use(scripts({ allowedModules: '*' }))
reporter.use(assets())
reporter.use(pdfUtils())
reporter.use(handlebars())
reporter.use(chromePdf())
reporter.use(fsStore({ dataDirectory: path.join(__dirname, '../samples') }))

const entitySets = ['folders', 'data', 'templates', 'assets', 'scripts']

async function run () {
  try {
    await reporter.init()
    const results = await Promise.all(entitySets.map((es) => {
      return reporter.documentStore.collection(es).find({})
    }))

    const allInOne = {}

    for (let i = 0; i < results.length; i++) {
      console.log(entitySets[i] + ':' + results[i].length)
      allInOne[entitySets[i]] = results[i].map((e) => omit(e, ['_id', 'modificationDate', 'creationDate']))

      const doc = await reporter.documentStore.collection(entitySets[i]).serializeProperties(allInOne[entitySets[i]])

      allInOne[entitySets[i]] = doc
    }

    await writeFileAsync('samples.json', JSON.stringify(allInOne))
    console.log('entities saved into samples.json')
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

run()
