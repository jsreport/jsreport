const path = require('path')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const { getPackagesInWorkspace, getExtensionsInOrder } = require('./shared/extensionsOrder')
const args = process.argv.slice(2)

const firstCommit = args[0]

if (firstCommit == null || firstCommit === '') {
  throw new Error('firstCommit arg is required. First positional argument')
}

if (firstCommit === 'inspect') {
  const targetCommit = args[1]

  if (targetCommit == null || targetCommit === '') {
    throw new Error('when in inspect mode the target commit arg is required. Second positional argument')
  }

  const targetPkg = args[2]
  let hasTargetPkg = false

  if (targetPkg != null && targetPkg !== '') {
    hasTargetPkg = true
  }

  const commandArgs = ['show', targetCommit, '--name-only']

  if (hasTargetPkg) {
    const packagesInWorkspace = getPackagesInWorkspace()

    if (!packagesInWorkspace.has(targetPkg)) {
      throw new Error(`${targetPkg} is not a valid extension`)
    }

    const targetPkgFoldername = packagesInWorkspace.get(targetPkg)

    commandArgs.push('--')
    commandArgs.push(`packages/${targetPkgFoldername}`)
  }

  const {
    stdout: getCommitShowStdout,
    stderr: getCommitShowStderr,
    error: getCommitShowError,
    status: getCommitShowStatus
  } = spawnSync('git', commandArgs, {
    stdio: 'pipe',
    shell: true
  })

  const commitShowStdout = getCommitShowStdout?.toString() ?? ''
  const commitShowStderr = getCommitShowStderr?.toString() ?? ''

  if (getCommitShowError || getCommitShowStatus !== 0) {
    console.error('get commit details command failed to run')

    if (getCommitShowError) {
      console.error(getCommitShowError)
    }

    if (commitShowStdout) {
      console.log(commitShowStdout)
    }

    if (commitShowStderr) {
      console.log(commitShowStderr)
    }
  } else {
    if (hasTargetPkg) {
      console.log(`\n--(details showing only files changed relevant to ${targetPkg} package)--`)
    } else {
      console.log('\n--(details showing all files changed in this commit)--')
    }

    console.log(commitShowStdout)
  }

  if (hasTargetPkg) {
    console.log(`\nYou can also show all files changed in this commit by running: node scripts/changed.js inspect ${targetCommit}`)
  }

  process.exit(0)
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
  const commands = ['git', 'log', '--pretty="format:[%an] %H %ad | %s"', '--date=short', `${firstCommit}..${lastCommit}`, '--', `packages/${targetPkgFoldername}`]

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

    const {
      stdout: getPackageJSONInCommitStdout,
      stderr: getPackageJSONInCommitStderr,
      error: getPackageJSONInCommitErr,
      status: getPackageJSONInCommitStatus
    } = spawnSync('git', ['show', `${firstCommit}:${path.relative(process.cwd(), packageJSONPath)}`], {
      stdio: 'pipe',
      shell: true
    })

    let npmVersionInFirstCommit

    const packageJSONInCommitStdout = getPackageJSONInCommitStdout?.toString() ?? ''
    const packageJSONInCommitStderr = getPackageJSONInCommitStderr?.toString() ?? ''

    if (getPackageJSONInCommitErr || getPackageJSONInCommitStatus !== 0) {
      console.error('get package.json file at first commit command failed to run')

      if (getPackageJSONInCommitErr) {
        console.error(getPackageJSONInCommitErr)
      }

      if (packageJSONInCommitStdout) {
        console.log(packageJSONInCommitStdout)
      }

      if (packageJSONInCommitStderr) {
        console.log(packageJSONInCommitStderr)
      }
    } else if (packageJSONInCommitStdout !== '') {
      let packageJSONInCommit = {}

      try {
        packageJSONInCommit = JSON.parse(packageJSONInCommitStdout)
      } catch {}

      if (packageJSONInCommit?.version != null && packageJSONInCommit?.version !== '') {
        npmVersionInFirstCommit = packageJSONInCommit.version
      }
    }

    const {
      stdout: getNpmVersionStdout,
      stderr: getNpmVersionStderr,
      error: getNpmVersionError,
      status: getNpmVersionErrorStatus
    } = spawnSync('npm', ['view', targetPkg, 'version'], {
      stdio: 'pipe',
      shell: true
    })

    let npmVersionInRegistry

    const npmVersionStdout = getNpmVersionStdout?.toString() ?? ''
    const npmVersionStderr = getNpmVersionStderr?.toString() ?? ''

    if (getNpmVersionError || getNpmVersionErrorStatus !== 0) {
      console.error('npm version command failed to run')

      if (getNpmVersionError) {
        console.error(getNpmVersionError)
      }

      if (npmVersionStdout) {
        console.log(npmVersionStdout)
      }

      if (npmVersionStderr) {
        console.log(npmVersionStderr)
      }

      if (!npmVersionStderr.includes('404 Not Found') || !npmVersionStderr.includes('is not in this registry')) {
        process.exit(1)
      }
    } else if (npmVersionStdout !== '') {
      npmVersionInRegistry = npmVersionStdout.replaceAll('\n', '')
    }

    console.log(`\ncommit changes: ${commits.length}\n`)
    console.log('--(commits sorted from latest to oldest)--')
    console.log(commits.join('\n'))

    console.log(`\nCurrent version of ${targetPkg}: ${packageJSON.version} (local), ${npmVersionInRegistry ?? '<not published>'} (npm)`)

    if (npmVersionInFirstCommit == null) {
      console.log(`\n!!It seems that ${packageJSONPath} at commit ${firstCommit} was not available, this means that probably the package is new or was renamed/moved in the next commits starting from ${firstCommit} to HEAD, make sure to review this and decide what to do!!`)
    } else if (npmVersionInFirstCommit !== packageJSON.version && npmVersionInRegistry != null && packageJSON.version === npmVersionInRegistry) {
      console.log(`\n!!It seems that this package was already published in commits between ${firstCommit} and HEAD, version at first commit ${firstCommit} is ${npmVersionInFirstCommit}, if this is true there is no need to publish this package, make sure to review this and decide what to do!!`)
    }

    if (
      npmVersionInRegistry != null &&
      packageJSON.version !== npmVersionInRegistry &&
      npmVersionInFirstCommit != null &&
      npmVersionInFirstCommit !== packageJSON.version
    ) {
      console.log('\n!!It seems that the version of this package (local) is not up to date with the npm version in registry, perhaps the package.json version was already modified in another commit but without publishing it, make sure to review this and decide what to do!!')
    }

    console.log('\nAfter deciding the target version update, you can continue by running:')
    console.log(`- node scripts/changed.js inspect <commit> ${targetPkg} (to inspect changed files of ${targetPkg} in specific commit)`)
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
