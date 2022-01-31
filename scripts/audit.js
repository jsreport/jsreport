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

  const { error: yarnInstallError, status: yarnInstallStatus } = spawnSync('yarn', ['install', '--check-files'], {
    cwd: process.cwd(),
    stdio: 'inherit'
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

  const args = ['install', '--legacy-peer-deps', '--ignore-scripts']

  const { error: npmInstallError, status: npmInstallStatus } = spawnSync('npm', args, {
    cwd: path.join(process.cwd(), 'packages', packagesInWorkspace.get(ext)),
    stdio: 'inherit'
  })

  if (npmInstallError || npmInstallStatus === 1) {
    console.error('Command failed to run')

    if (npmInstallError) {
      throw npmInstallError
    }

    process.exit(1)
  }

  const { error: auditError, stdout, status: auditStatus } = spawnSync('npm', ['audit', '--omit', 'dev'], {
    cwd: path.join(process.cwd(), 'packages', packagesInWorkspace.get(ext)),
    stdio: 'pipe'
  })

  const output = stdout != null ? stdout.toString().trim() : ''

  if (auditError || auditStatus === 1) {
    console.error(`Audit command failed to run for ${ext}`)

    if (auditError) {
      throw auditError
    }

    if (output === '') {
      process.exit(1)
    }
  }

  if (output !== 'found 0 vulnerabilities') {
    const outputPath = path.join(tempDir, `audit-${ext.replace(/\//g, '-')}.log`)
    fs.writeFileSync(outputPath, output)
    withVulnerabilities.push({ name: ext, output: outputPath })
  }
}

console.log('\n===== Results =====')

if (withVulnerabilities.length > 0) {
  console.log('\nThe following packages have vulnerabilities:')
  console.log(`${withVulnerabilities.map((e) => `- ${e.name} (${e.output})`).join('\n')}`)
} else {
  console.log('\nNo packages with vulnerabilities found')
}

console.log('\nYou can run the following to clean the workspace after audit: node scripts/audit.js clean')
