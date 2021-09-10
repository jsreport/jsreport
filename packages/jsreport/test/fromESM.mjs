import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import jsreport from 'jsreport'

const require = createRequire(import.meta.url)
const jsreportDir = join(dirname(fileURLToPath(import.meta.url)), '../')

async function main () {
  const packageJson = JSON.parse(await readFile(join(jsreportDir, 'package.json')))

  const jsreportExtensions = Object.keys(packageJson.dependencies).filter((extName) => {
    return extName !== '@jsreport/jsreport-core' && extName.startsWith('@jsreport')
  })

  let reporter = jsreport({
    discover: false,
    rootDirectory: jsreportDir,
    loadConfig: false
  })

  for (const extName of jsreportExtensions) {
    reporter = reporter.use(require(extName)())
  }

  await reporter.init()
  await reporter.close()
  process.exit()
}

main()
