const path = require('path')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const { getPackagesInWorkspace } = require('./shared/extensionsOrder')

const args = process.argv.slice(2)

const tempDir = path.join(process.cwd(), 'scripts/temp')

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true })
}

if (args[0] === 'clean') {
  console.log('\n..executing clean steps for audit..\n')

  const pkgs = fs.readdirSync(path.join(process.cwd(), 'packages')).filter((n) => n !== '.DS_Store')

  for (const pkgFolderName of pkgs) {
    const targetFile = path.join(process.cwd(), 'packages', pkgFolderName, 'package-lock.json')

    if (fs.existsSync(targetFile)) {
      fs.rmSync(targetFile)
    }
  }

  const rootPkgLock = path.join(process.cwd(), 'package-lock.json')

  if (fs.existsSync(rootPkgLock)) {
    fs.rmSync(rootPkgLock)
  }

  const { error: yarnInstallError, status: yarnInstallStatus } = spawnSync('yarn', ['install', '--force'], {
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

  console.log('workspace cleaned!')

  process.exit()
}

const runForAll = args[0] == null || args[0] === ''

const packagesInWorkspace = getPackagesInWorkspace()
const extensionsList = runForAll ? [...packagesInWorkspace.keys()] : args.map(x => x.trim())

for (const ext of extensionsList) {
  if (!packagesInWorkspace.has(ext)) {
    throw new Error(`${ext} is not a valid extension`)
  }
}

fs.mkdirSync(tempDir)

if (runForAll) {
  console.log('\nrunning audit for all packages..\n')
}

const withVulnerabilities = []

for (const ext of extensionsList) {
  console.log(`\n..checking audit for ${ext}..\n`)

  const args = ['install', '--legacy-peer-deps', '--ignore-scripts', '--workspaces=false']

  console.log('\n===== dependencies install started =====')

  const { error: npmInstallError, status: npmInstallStatus } = spawnSync('npm', args, {
    cwd: path.join(process.cwd(), 'packages', packagesInWorkspace.get(ext)),
    stdio: 'inherit',
    shell: true
  })

  console.log('\n===== dependencies install finished (logs above) =====\n')

  if (npmInstallError || npmInstallStatus === 1) {
    console.error('npm install failed to run')

    if (npmInstallError) {
      throw npmInstallError
    }

    process.exit(1)
  }

  const { error: auditError, stdout: auditStdout, stderr: auditStderr, status: auditStatus } = spawnSync('npm', ['audit', '--omit', 'dev', '--workspaces=false'], {
    cwd: path.join(process.cwd(), 'packages', packagesInWorkspace.get(ext)),
    stdio: 'pipe',
    shell: true
  })

  const auditOutput = auditStdout != null ? auditStdout.toString().trim() : ''
  const auditOutputErr = auditStderr != null ? auditStderr.toString().trim() : ''

  if (auditError || auditStatus === 1) {
    console.error(`Audit command failed to run for ${ext}\n`)

    if (auditError) {
      throw auditError
    }

    if (auditOutput === '') {
      if (auditOutputErr !== '') {
        console.error(auditOutputErr)
      }

      process.exit(1)
    }
  }

  if (auditOutput !== 'found 0 vulnerabilities') {
    const outputPath = path.join(tempDir, `audit-${ext.replace(/\//g, '-')}.log`)
    fs.writeFileSync(outputPath, auditOutput)
    withVulnerabilities.push({ name: ext, source: 'npm', output: outputPath })
  }

  // snyk test needs that we have done npm install first (which create package-lock.json),
  // otherwise it reports vulnerabilities also of dev dependencies which is not what we want.
  // in our case, we have done the install as the initial step, so we are fine.
  // see https://docs.snyk.io/snyk-cli/getting-started-with-the-snyk-cli#scan-your-development-project
  // and https://support.snyk.io/hc/en-us/articles/360015552617-Which-projects-must-be-built-before-testing-with-CLI-
  // more useful links that describe snyk:
  // - https://docs.snyk.io/scan-applications/snyk-open-source/manage-vulnerabilities/differences-in-open-source-vulnerability-counts-across-environments#differences-between-snyk-scans-and-other-tests
  const snykTestArgs = ['snyk', 'test']

  const { error: snykTestError, stdout: snykTestStdout, stderr: snykTestStderr, status: snykTestStatus } = spawnSync('npx', snykTestArgs, {
    cwd: path.join(process.cwd(), 'packages', packagesInWorkspace.get(ext)),
    stdio: 'pipe',
    shell: true
  })

  const snykTestOutput = snykTestStdout != null ? snykTestStdout.toString().trim() : ''
  const snykTestOutputErr = snykTestStderr != null ? snykTestStderr.toString().trim() : ''

  // when snyk returns 1 it means, scan completed and vulnerability found,
  // for the rest of case we assume error
  // https://docs.snyk.io/snyk-cli/commands/test#exit-codes
  if (snykTestStatus === 1) {
    const outputPath = path.join(tempDir, `snyk-${ext.replace(/\//g, '-')}.log`)
    fs.writeFileSync(outputPath, snykTestOutput)
    withVulnerabilities.push({ name: ext, source: 'snyk', output: outputPath })
  } else if (snykTestStatus !== 0) {
    console.error('snyk test failed to run')

    if (snykTestError) {
      throw snykTestError
    }

    if (snykTestOutput !== '') {
      console.error(snykTestOutput)
    }

    if (snykTestOutputErr !== '') {
      console.error(snykTestError)
    }

    process.exit(1)
  }
}

console.log('===== Results =====')

if (withVulnerabilities.length > 0) {
  const groupedPackages = withVulnerabilities.reduce((acu, item) => {
    if (!acu.has(item.name)) {
      acu.set(item.name, [])
    }

    const sources = acu.get(item.name)

    sources.push({
      name: item.source,
      output: item.output
    })

    return acu
  }, new Map())

  console.log('\nThe following packages have vulnerabilities:')

  for (const [pkgName, pkgSources] of groupedPackages) {
    console.log(`- ${pkgName}\n${pkgSources.map((source) => `   ${source.name}: ${source.output}`).join('\n')}\n`)
  }
} else {
  console.log('\nNo packages with vulnerabilities found')
}

console.log('\nYou can run the following to clean the workspace after audit: node scripts/audit.js clean')
