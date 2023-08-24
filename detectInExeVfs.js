const path = require('path')
const existsSync = require('fs').existsSync
const fs = require('fs/promises')

if (!existsSync('./vfs.json')) {
  throw new Error('There is no vfs.json, make sure to run the compilation with -d flag')
}

const vfs = require('./vfs.json')

async function main () {
  console.log(`There are ${vfs.files.length} files(s) in the exe\n\n`)
  await detectNotJsOrJsonFiles()
  console.log('===============')
  await detectLargeFiles()
  console.log('===============')
  await detectDuplicatedModules()
  console.log('===============')
  console.log(`Check details stored at the ${path.resolve('compileDetection')} folder`)
}

main().catch((err) => {
  console.error('Error executing detection..')
  console.error(err)
})

async function detectNotJsOrJsonFiles () {
  const found = []
  let counter = 0

  for (const [idx, file] of vfs.files.entries()) {
    const detail = vfs.details[idx]
    const getVRootRegExpr = () => /^\/snapshot\/jsreport/

    if (file === '/snapshot') {
      continue
    }

    if (getVRootRegExpr().test(file)) {
      const realPath = file.replace(getVRootRegExpr(), process.cwd())
      const fileStat = await fs.stat(realPath)

      if (fileStat.isDirectory()) {
        continue
      }
    }

    if (!file.endsWith('.js') && !file.endsWith('.mjs') && !file.endsWith('.cjs') && !file.endsWith('.json')) {
      found.push(`${file} (${Object.keys(detail).filter((k) => k !== 'TOTAL_SIZE').join('|')} - ${detail.TOTAL_SIZE})`)
      counter++
    }
  }

  console.log(`There are ${counter} files that are not ".js|.json"`)
  quickLook(found)

  const output = 'detectedNotJSJSONFiles.json'

  await saveToFile(output, found)
  console.log('\nAll found files are stored in:', output)
}

async function detectLargeFiles () {
  let found = vfs.files.map((file, idx) => ({
    idx,
    detail: vfs.details[idx],
    path: file
  }))

  found.sort((a, b) => {
    return b.detail.TOTAL_SIZE - a.detail.TOTAL_SIZE
  })

  found = found.map((item) => `${item.path} (${item.detail.TOTAL_SIZE})`)

  console.log('Files sorted by large size DESC')
  quickLook(found)

  const output = 'detectedLargeFiles.json'

  await saveToFile(output, found)
  console.log('\nSorted large files are stored in:', output)
}

async function detectDuplicatedModules () {
  const foundMap = new Map()

  const getModuleInfo = (filePath) => {
    const normalizedPath = filePath.replace(/^\/snapshot\/jsreport\//, '')
    const parts = normalizedPath.split('/')
    let level = 0
    let modulePath
    let moduleName

    for (const [idx, part] of parts.entries()) {
      if (
        part === 'node_modules' ||
        (idx === 0 && part === 'packages')
      ) {
        let nextPart = parts[idx + 1]
        let childOfNextPart

        if (nextPart == null) {
          continue
        }

        if (nextPart.startsWith('@')) {
          if (parts[idx + 2] != null) {
            nextPart = path.join(nextPart, parts[idx + 2])
            childOfNextPart = parts[idx + 3]
          }
        } else {
          childOfNextPart = parts[idx + 2]
        }

        if (childOfNextPart != null) {
          level++
          moduleName = nextPart
          modulePath = [...parts.slice(0, idx + 1), nextPart].join('/')
        }
      }
    }

    if (level > 0 && modulePath != null && moduleName != null) {
      return {
        level,
        modulePath,
        moduleName
      }
    }

    return null
  }

  for (const file of vfs.files) {
    const moduleInfo = getModuleInfo(file)

    if (moduleInfo == null) {
      continue
    }

    if (!foundMap.has(moduleInfo.moduleName)) {
      foundMap.set(moduleInfo.moduleName, { count: 0, detail: [] })
    }

    const item = foundMap.get(moduleInfo.moduleName)
    const existsInSameLevelAndPath = item.detail.find((item) => item.level === moduleInfo.level && item.path === moduleInfo.modulePath) != null

    if (!existsInSameLevelAndPath) {
      item.count++

      item.detail.push({
        level: moduleInfo.level,
        path: moduleInfo.modulePath,
        version: require(path.join(process.cwd(), moduleInfo.modulePath, 'package.json')).version
      })
    }
  }

  let found = []

  for (const [moduleName, moduleStat] of foundMap.entries()) {
    found.push({
      name: moduleName,
      ...moduleStat
    })
  }

  found = found.filter((item) => item.count > 1)

  found.sort((a, b) => {
    return b.count - a.count
  })

  const descFound = found.map((item) => `${item.name} (${item.count})`)

  console.log('Duplicated modules sorted by count size DESC')
  quickLook(descFound)

  const output = 'detectedDuplicatedModules.json'

  await saveToFile(output, found)
  console.log('\nDetails of duplicated modules are stored in:', output)
}

function quickLook (list) {
  const maxCount = 10

  if (list.length > maxCount) {
    console.log('\nSome of them are:\n')
  } else {
    console.log('\nFiles:\n')
  }

  for (let i = 0; i < maxCount; i++) {
    const item = list[i]

    if (item == null) {
      break
    }

    console.log(item)
  }
}

async function saveToFile (filename, list) {
  await fs.mkdir('compileDetection', { recursive: true })
  await fs.writeFile(path.join('compileDetection', filename), JSON.stringify(list, null, 2))
}
