const path = require('path')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const { getPackagesInWorkspace } = require('./shared/extensionsOrder')

const args = process.argv.slice(2)

const tempDir = path.join(process.cwd(), 'scripts/temp')

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true })
}

if (args[0] == null || args[0] === '') {
  throw new Error('extensionsList arg is required. First positional argument')
}

if (args[0] === '--clean') {
  console.log('\n..executing clean steps for audit..\n')

  const pkgs = fs.readdirSync(path.join(process.cwd(), 'packages')).filter((n) => n !== '.DS_Store')

  for (const pkgFolderName of pkgs) {
    const targetFile = path.join(process.cwd(), 'packages', pkgFolderName, 'package-lock.json')

    if (fs.existsSync(targetFile)) {
      fs.rmSync(targetFile)
    }
  }

  const { error: yarnInstallError, status: yarnInstallStatus } = spawnSync('yarn', ['install'], {
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

const extensionsList = args[0].split(',').map(x => x.trim())
const packagesInWorkspace = getPackagesInWorkspace()

for (const ext of extensionsList) {
  if (!packagesInWorkspace.has(ext)) {
    throw new Error(`${ext} is not a valid extension`)
  }
}

fs.mkdirSync(tempDir)

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

  if (auditError || auditStatus === 1) {
    console.error('Command failed to run')

    if (auditError) {
      throw auditError
    }

    process.exit(1)
  }

  const output = stdout.toString().trim()

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
