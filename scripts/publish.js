const path = require('path')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const readline = require('readline')
const { getPackagesInWorkspace } = require('./shared/extensionsOrder')

const args = process.argv.slice(2)

const targetPkg = args[0]

if (targetPkg == null || targetPkg === '') {
  throw new Error('packageName arg is required. First positional argument')
}

const targetVersion = args[1]

const restArgs = args.slice(2)

const skipScripts = restArgs.includes('--skip-scripts')

if (targetVersion == null || targetVersion === '') {
  throw new Error('packageVersion arg is required. Second positional argument')
}

if (!/^\d/.test(targetVersion)) {
  throw new Error(`packageVersion should start with a number. Value: ${targetVersion}. Second positional argument`)
}

const packagesInWorkspace = getPackagesInWorkspace()

if (!packagesInWorkspace.has(targetPkg)) {
  throw new Error(`${targetPkg} is not a valid package`)
}

const targetPkgFoldername = packagesInWorkspace.get(targetPkg)
const workspaceRootPackageJSONPath = path.join(process.cwd(), 'package.json')
const workspaceRootPackageJSON = JSON.parse(fs.readFileSync(workspaceRootPackageJSONPath))
const packageJSONPath = path.join(process.cwd(), 'packages', targetPkgFoldername, 'package.json')
const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath))

const deps = packageJSON.dependencies || {}
const devDeps = packageJSON.devDependencies || {}

const extraneousDeps = []

for (const [name, version] of Object.entries(deps)) {
  if (!/^\^?\d/.test(version)) {
    extraneousDeps.push({ name, version })
  }
}

for (const [name, version] of Object.entries(devDeps)) {
  if (!/^\^?\d/.test(version)) {
    extraneousDeps.push({ name, version, dev: true })
  }
}

if (extraneousDeps.length > 0) {
  console.log('\nThe following dependencies in package.json have extraneous versions:')
  console.log(extraneousDeps.map((d) => `- "${d.name}": "${d.version}"${d.dev ? ' (dev dep)' : ''}`).join('\n'))
} else {
  if (!skipScripts && packageJSON.scripts && packageJSON.scripts.build) {
    const buildCommand = ['yarn', 'workspace', targetPkg, 'build']

    console.log(`\nrunning ${buildCommand.join(' ')}`)

    const { error: yarnBuildError, status: yarnBuildStatus } = spawnSync(buildCommand[0], buildCommand.slice(1), {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true
    })

    if (yarnBuildError || yarnBuildStatus === 1) {
      console.error('Command failed to run')

      if (yarnBuildError) {
        throw yarnBuildError
      }

      process.exit(1)
    }
  }

  if (!skipScripts && packageJSON.scripts && packageJSON.scripts.test) {
    const testCommand = ['yarn', 'workspace', targetPkg, 'test']

    console.log(`\nrunning ${testCommand.join(' ')}`)

    const { error: yarnTestError, status: yarnTestStatus } = spawnSync(testCommand[0], testCommand.slice(1), {
      cwd: process.cwd(),
      shell: true,
      stdio: 'inherit'
    })

    if (yarnTestError || yarnTestStatus === 1) {
      console.error('Command failed to run')

      if (yarnTestError) {
        throw yarnTestError
      }

      process.exit(1)
    }
  }

  console.log('\nwriting package version across workspace..')

  packageJSON.version = targetVersion

  fs.writeFileSync(packageJSONPath, `${JSON.stringify(packageJSON, null, 2)}\n`)

  for (const currentPkgFolderName of packagesInWorkspace.values()) {
    if (targetPkgFoldername === currentPkgFolderName) {
      continue
    }

    const currentPackageJSONPath = path.join(process.cwd(), 'packages', currentPkgFolderName, 'package.json')
    const currentPackageJSON = JSON.parse(fs.readFileSync(currentPackageJSONPath))

    if (currentPackageJSON.dependencies && currentPackageJSON.dependencies[targetPkg]) {
      currentPackageJSON.dependencies[targetPkg] = targetVersion
    }

    if (currentPackageJSON.devDependencies && currentPackageJSON.devDependencies[targetPkg]) {
      currentPackageJSON.devDependencies[targetPkg] = targetVersion
    }

    fs.writeFileSync(currentPackageJSONPath, `${JSON.stringify(currentPackageJSON, null, 2)}\n`)
  }

  if (workspaceRootPackageJSON.dependencies && workspaceRootPackageJSON.dependencies[targetPkg]) {
    workspaceRootPackageJSON.dependencies[targetPkg] = targetVersion
  }

  if (workspaceRootPackageJSON.devDependencies && workspaceRootPackageJSON.devDependencies[targetPkg]) {
    workspaceRootPackageJSON.devDependencies[targetPkg] = targetVersion
  }

  fs.writeFileSync(workspaceRootPackageJSONPath, `${JSON.stringify(workspaceRootPackageJSON, null, 2)}\n`)

  console.log('\npackage version updated!')

  const installCommand = ['yarn', 'install', '--check-files']

  console.log(`\nrunning ${installCommand.join(' ')} to normalize node_modules tree after version update`)

  const { error: yarnInstallError, status: yarnInstallStatus } =
  (installCommand[0], installCommand.slice(1), {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true
  })

  if (yarnInstallError || yarnInstallStatus === 1) {
    console.error('Command failed to run')

    if (yarnInstallError) {
      throw yarnInstallError
    }

    process.exit(1)
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  console.log('\nAll done, make sure to check if the following things are pending or already covered:')
  console.log('- something else is pending to commit in git')
  console.log('- CHANGELOG section in README.md is updated')

  rl.question('About to start publish. Do you want to continue? (y/N): ', (answer) => {
    const shouldContinue = (answer === 'y')

    rl.close()

    if (!shouldContinue) {
      console.log('\nPublish cancelled')
      return process.exit(1)
    }

    const publishCommand = ['npm', 'publish']

    console.log(`\nrunning ${publishCommand.join(' ')}`)

    const { error: publishError, status: publishStatus } = spawnSync(publishCommand[0], publishCommand.slice(1), {
      cwd: path.join(process.cwd(), 'packages', targetPkgFoldername),
      stdio: 'inherit',
      shell: true
    })

    if (publishError || publishStatus === 1) {
      console.error('Command failed to run')

      if (publishError) {
        throw publishError
      }

      process.exit(1)
    }

    console.log(`\nPublish ${targetPkg} ${targetVersion} done!`)
  })
}
