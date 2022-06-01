const path = require('path')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const { getPackagesInWorkspace, getExtensionsInOrder } = require('./shared/extensionsOrder')
const args = process.argv.slice(2)

const firstCommit = args[0]

if (firstCommit == null || firstCommit === '') {
  throw new Error('firstCommit arg is required. First positional argument')
}

const lastCommit = args[1]

if (lastCommit == null || lastCommit === '') {
  throw new Error('lastCommit arg is required. Second positional argument')
}

const targetPkg = args[2]

if (targetPkg != null && targetPkg !== '') {
  const packagesInWorkspace = getPackagesInWorkspace()

  if (!packagesInWorkspace.has(targetPkg)) {
    throw new Error(`${targetPkg} is not a valid extension`)
  }

  const targetPkgFoldername = packagesInWorkspace.get(targetPkg)
  const packageJSONPath = path.join(process.cwd(), 'packages', targetPkgFoldername, 'package.json')
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath))
  const commands = ['git', 'log', '--pretty=format:[%an] %H %ad | %s', '--date=short', `${firstCommit}..${lastCommit}`, '--', `packages/${packagesInWorkspace.get(targetPkg)}`]

  console.log(`running ${commands.join(' ')}`)

  const { stdout, stderr, error, status } = spawnSync(commands[0], commands.slice(1), {
    stdio: 'pipe',
    shell: true
  })

  if (error || status === 1) {
    console.error('Command failed to run')

    if (error) {
      console.error(error)
    }

    if (stdout) {
      console.log(stdout.toString())
    }

    if (stderr) {
      console.log(stderr.toString())
    }

    process.exit(1)
  } else {
    const commits = stdout.toString().split('\n').filter(x => x !== '')

    console.log(`\ncommit changes: ${commits.length}\n`)
    console.log(commits.join('\n'))

    console.log(`\nCurrent version of ${targetPkg}:`, packageJSON.version)

    console.log('\nAfter deciding the target version update, you can continue by running:')
    console.log(`- node scripts/audit.js ${targetPkg}`)
    console.log(`- node scripts/publish.js ${targetPkg} <version>`)
  }
} else {
  const commands = ['git', 'diff', '--name-only', lastCommit, firstCommit]

  console.log(`running ${commands.join(' ')}`)

  const { stdout, stderr, error, status } = spawnSync(commands[0], commands.slice(1), {
    stdio: 'pipe',
    shell: true
  })

  if (error || status === 1) {
    console.error('Command failed to run')

    if (error) {
      console.error(error)
    }

    if (stdout) {
      console.log(stdout.toString())
    }

    if (stderr) {
      console.log(stderr.toString())
    }

    process.exit(1)
  } else {
    const filesChanged = stdout.toString().split('\n').filter(x => x)
    const extensionsChanged = new Set()

    for (const fileChanged of filesChanged) {
      const parts = fileChanged.split(/\\|\//)

      if (parts[0] !== 'packages' || parts[1] == null) {
        continue
      }

      const pkgFolderName = parts.slice(0, 2).join('/')

      const targetFile = path.join(process.cwd(), pkgFolderName, 'package.json')

      try {
        const pkg = JSON.parse(fs.readFileSync(targetFile, 'utf8'))
        extensionsChanged.add(pkg.name)
      } catch (err) {
        console.error(`invalid package.json found at ${targetFile}`)
        throw err
      }
    }

    const extensions = getExtensionsInOrder([...extensionsChanged])

    if (extensions.length === 0) {
      console.log('no packages were changed')
    } else {
      console.log(`\ndetected changed packages: ${extensions.length}`)

      const packagesInWorkspace = getPackagesInWorkspace()
      const jsreportPackages = getPackagesIn(path.join(process.cwd(), 'packages/jsreport'), packagesInWorkspace)

      const packagesRelevantForJsreportRelease = []
      const otherPackages = []

      for (const extension of extensions) {
        if (jsreportPackages.includes(extension) || extension === 'jsreport') {
          packagesRelevantForJsreportRelease.push(extension)
        } else {
          otherPackages.push(extension)
        }
      }

      if (packagesRelevantForJsreportRelease.length > 0) {
        const jsreportPackageJSON = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'packages/jsreport/package.json'), 'utf8'))
        const jsreportDeps = Object.keys(jsreportPackageJSON.dependencies)

        console.log('\nRelevant packages for jsreport release: (* means that it is official dependency of jsreport)')
        console.log(packagesRelevantForJsreportRelease.map((p) => `- ${p}${jsreportDeps.includes(p) ? ' *' : ''}`).join('\n'))
      }

      if (otherPackages.length > 0) {
        console.log('\nOther packages:')
        console.log(otherPackages.map((p) => `- ${p}`).join('\n'))
      }

      if (packagesRelevantForJsreportRelease.length > 0) {
        console.log(`\nYou can run the audit check for packages by running: node scripts/audit.js ${packagesRelevantForJsreportRelease.join(' ')}`)
      }

      console.log(`\nYou can get details about the commit changes of each package by running: node scripts/changed.js ${firstCommit} ${lastCommit} ${extensions[0]}`)
    }
  }
}

function getPackagesIn (pkgPath, packagesInWorkspace, stop = false) {
  const packageJSON = JSON.parse(fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf8'))
  const packagesFromDeps = [...Object.keys(packageJSON.dependencies || {}), ...Object.keys(packageJSON.devDependencies || {})]
  const results = new Set()

  for (const pkg of packagesFromDeps) {
    if (packagesInWorkspace.has(pkg) && !stop) {
      results.add(pkg)

      const childResults = getPackagesIn(path.join(process.cwd(), 'packages', packagesInWorkspace.get(pkg)), packagesInWorkspace, true)

      for (const r of childResults) {
        results.add(r)
      }
    } else {
      results.add(pkg)
    }
  }

  return [...results]
}
