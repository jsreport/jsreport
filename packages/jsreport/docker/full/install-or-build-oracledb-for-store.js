const args = process.argv.slice(2)
const spawnSync = require('child_process').spawnSync

const argv = {}

for (const arg of args) {
  if (arg.startsWith('--target=')) {
    const [, value] = arg.split('=')
    argv.target = value
  } else if (arg.startsWith('--storeVersion=')) {
    const [, value] = arg.split('=')
    argv.storeVersion = value
  }
}

if (!argv.target || argv.target === '') {
  throw new Error('target is required')
}

if (!argv.storeVersion || argv.storeVersion === '') {
  throw new Error('target is required')
}

const storeFullPackage = `@jsreport/jsreport-oracle-store@${argv.storeVersion}`
const installArgs = ['npm', 'install', storeFullPackage, '--save', '--save-exact']

console.log(`running ${installArgs.join(' ')}\n`)

const { error: npmInstallError, stdout: npmInstallStdout, stderr: npmInstallStderr, status: npmInstallStatus } = spawnSync(installArgs[0], installArgs.slice(1), {
  stdio: 'pipe',
  shell: true
})

const installOutput = npmInstallStdout != null ? npmInstallStdout.toString().trim() : ''
const installOutputErr = npmInstallStderr != null ? npmInstallStderr.toString().trim() : ''

if (installOutput !== '') {
  console.log(installOutput)
}

if (installOutputErr !== '') {
  console.error(installOutputErr)
}

let npmInstallWithError = false

if (npmInstallError || npmInstallStatus !== 0) {
  npmInstallWithError = true

  if (npmInstallError) {
    console.error('install error:', npmInstallError)
  }

  console.error('\ninstall failed to run')
} else {
  console.log(`\ninstall ${storeFullPackage} finished successfully`)
}

if (npmInstallWithError) {
  if (argv.target === 'linux/amd64') {
    // if there was error during the install for amd64 we just exit with the failing
    process.exit(1)
  } else {
    // for the arm64 we try to build the oracledb dep from source
    let oracledbVersion = getOracledbVersionFrom(storeFullPackage, 'dependencies')

    if (oracledbVersion == null) {
      oracledbVersion = getOracledbVersionFrom(storeFullPackage, 'optionalDependencies')
    }

    if (oracledbVersion == null) {
      throw new Error(`Can not find oracledb version in the ${storeFullPackage} package`)
    }

    console.log(`building oracledb@${oracledbVersion} from source\n`)

    const buildArgs = ['bash', 'build-oracledb-src.sh', oracledbVersion]

    const { error: buildError, status: buildStatus } = spawnSync(buildArgs[0], buildArgs.slice(1), {
      stdio: 'inherit',
      shell: true
    })

    if (buildError || buildStatus !== 0) {
      npmInstallWithError = true

      if (buildError) {
        throw buildError
      }

      process.exit(1)
    }
  }
}

function getOracledbVersionFrom (pkg, from) {
  const viewDepsArgs = ['npm', 'view', pkg, from, '--json']
  let version

  console.log(`\nrunning ${viewDepsArgs.join(' ')}\n`)

  const { error: viewDepsError, stdout: viewDepsStdout, stderr: viewDepsStderr, status: viewDepsStatus } = spawnSync(viewDepsArgs[0], viewDepsArgs.slice(1), {
    stdio: 'pipe',
    shell: true
  })

  const viewDepsOutput = viewDepsStdout != null ? viewDepsStdout.toString().trim() : ''
  const viewDepsOutputErr = viewDepsStderr != null ? viewDepsStderr.toString().trim() : ''

  if (viewDepsError || viewDepsStatus !== 0) {
    if (viewDepsOutput !== '') {
      console.log(viewDepsOutput)
    }

    if (viewDepsOutputErr !== '') {
      console.error(viewDepsOutputErr)
    }

    if (viewDepsError) {
      console.error(`view ${from} error:`, viewDepsError)
    }

    process.exit(1)
  }

  const dependencies = JSON.parse(viewDepsOutput)

  if (dependencies.oracledb != null) {
    version = dependencies.oracledb
  }

  return version
}
