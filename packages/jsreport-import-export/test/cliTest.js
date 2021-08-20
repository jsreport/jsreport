const should = require('should')
const path = require('path')
const fs = require('fs')

const { getTempDir, setup, init, exec } = require('@jsreport/jsreport-cli/test/testUtils')({
  baseDir: path.join(__dirname, 'temp'),
  rootDirectory: path.join(__dirname, '../'),
  defaultExtensions: [
    '@jsreport/jsreport-fs-store',
    '@jsreport/jsreport-data',
    '@jsreport/jsreport-express',
    path.join(__dirname, '../')
  ],
  defaultOpts: {
    store: {
      provider: 'fs'
    }
  },
  deps: {
    extend: require('node.extend.without.arrays'),
    mkdirp: require('mkdirp'),
    rimraf: require('rimraf'),
    execa: require('execa')
  }
})

const { unzipEntities } = require('../lib/helpers')

describe('cli import/export', () => {
  describe('export', () => {
    it('should return help usage (export -h)', async () => {
      const dirname = 'export-help'

      await setup(dirname)

      const { stdout } = await exec(dirname, 'export -h')

      should(stdout).containEql('Export the entities of the specified')
      should(stdout).containEql('Usage')
      should(stdout).containEql('Positionals')
      should(stdout).containEql('Command options')
      should(stdout).containEql('--entitiesPath')
      should(stdout).containEql('--entities')
      should(stdout).containEql('Options')
      should(stdout).containEql('Examples')
    })

    it('should fail when missing exportFile argument', async () => {
      const dirname = 'export-throw'
      await setup(dirname)

      return should(exec(dirname, 'export')).be.rejectedWith(/"exportFile" argument is required/)
    })

    describe('local instance', () => {
      const dirName = 'export-local'

      beforeEach(async () => {
        await setup(dirName)

        const reporter = await init(dirName)

        await reporter.documentStore.collection('templates').insert({
          _id: 'foo',
          name: 'foo',
          content: 'foo',
          engine: 'none',
          recipe: 'html'
        })

        await reporter.documentStore.collection('templates').insert({
          _id: 'bar',
          name: 'bar',
          content: 'bar',
          engine: 'none',
          recipe: 'html'
        })

        await reporter.close()
      })

      commonExport(dirName)
    })

    describe('remote instance', () => {
      const dirName = 'export-remote-cli'
      const remoteDirName = 'export-remote-instance'
      const remotePort = 3900
      let reporter

      beforeEach(async () => {
        await setup(dirName)
        await setup(remoteDirName)

        reporter = await init(remoteDirName, { httpPort: remotePort })

        await reporter.documentStore.collection('templates').insert({
          _id: 'foo',
          name: 'foo',
          content: 'foo',
          engine: 'none',
          recipe: 'html'
        })

        await reporter.documentStore.collection('templates').insert({
          _id: 'bar',
          name: 'bar',
          content: 'bar',
          engine: 'none',
          recipe: 'html'
        })
      })

      afterEach(() => reporter && reporter.close())

      commonExport(dirName, {
        url: `http://localhost:${remotePort}`
      })
    })

    describe('remote instance (with authentication)', () => {
      const dirName = 'export-remote-auth-cli'
      const remoteDirName = 'export-remote-auth-instance'
      const remotePort = 3900

      const adminUser = {
        user: 'admin',
        password: 'xxxx'
      }

      let reporter

      beforeEach(async () => {
        await setup(dirName)
        await setup(remoteDirName, ['@jsreport/jsreport-authentication'])

        reporter = await init(remoteDirName, {
          httpPort: remotePort,
          extensions: {
            authentication: {
              cookieSession: {
                secret: 'secret string'
              },
              admin: {
                username: adminUser.user,
                password: adminUser.password
              },
              enabled: true
            }
          }
        })

        await reporter.documentStore.collection('templates').insert({
          _id: 'foo',
          name: 'foo',
          content: 'foo',
          engine: 'none',
          recipe: 'html'
        })

        await reporter.documentStore.collection('templates').insert({
          _id: 'bar',
          name: 'bar',
          content: 'bar',
          engine: 'none',
          recipe: 'html'
        })
      })

      afterEach(() => reporter && reporter.close())

      commonExport(dirName, {
        url: `http://localhost:${remotePort}`,
        user: adminUser.user,
        password: adminUser.password
      })
    })
  })

  describe('import', () => {
    it('should return help usage (import -h)', async () => {
      const dirname = 'import-help'
      await setup(dirname)

      const { stdout } = await exec(dirname, 'import -h')

      should(stdout).containEql('Import an export file with entities in the specified')
      should(stdout).containEql('Usage')
      should(stdout).containEql('Positionals')
      should(stdout).containEql('Command options')
      should(stdout).containEql('--targetFolder')
      should(stdout).containEql('--fullImport')
      should(stdout).containEql('--validation')
      should(stdout).containEql('Options')
      should(stdout).containEql('Examples')
    })

    it('should fail when missing exportFile argument', async () => {
      const dirname = 'import-throw'
      await setup(dirname)

      return should(exec(dirname, 'import')).be.rejectedWith(/"exportFile" argument is required/)
    })

    describe('local instance', () => {
      const dirName = 'import-local'

      beforeEach(async () => {
        const fullDir = getTempDir(dirName)

        await setup(dirName)

        fs.copyFileSync(path.join(__dirname, 'export-test.jsrexport'), path.join(fullDir, 'export.jsrexport'))

        const reporter = await init(dirName)

        await reporter.documentStore.collection('templates').insert({
          _id: 'testing',
          name: 'testing',
          content: 'testing',
          engine: 'none',
          recipe: 'html'
        })

        await reporter.documentStore.collection('folders').insert({
          _id: 'target',
          name: 'target',
          shortid: 'target'
        })

        await reporter.close()
      })

      commonImport(dirName, dirName)
    })

    describe('local instance authenticated', () => {
      const dirName = 'import-local-authenticated'

      beforeEach(async () => {
        const fullDir = getTempDir(dirName)

        await setup(dirName, ['@jsreport/jsreport-authentication', '@jsreport/jsreport-authorization'], null, {
          extensions: {
            authentication: {
              cookieSession: {
                secret: 'secret string'
              },
              admin: {
                username: 'admin',
                password: 'password'
              },
              enabled: true
            }
          }
        })

        fs.copyFileSync(path.join(__dirname, 'export-test.jsrexport'), path.join(fullDir, 'export.jsrexport'))

        const reporter = await init(dirName)
        await reporter.documentStore.collection('templates').insert({ name: 'xxx', engine: 'none', recipe: 'html' })
        await reporter.close()
      })

      it('should be able to do full import', async () => {
        await exec(dirName, 'import --fullImport export.jsrexport')
      })
    })

    describe('remote instance', () => {
      const dirName = 'import-remote-cli'
      const remoteDirName = 'import-remote-instance'
      const remotePort = 3900
      let reporter

      beforeEach(async () => {
        const fullDir = getTempDir(dirName)
        await setup(dirName)
        await setup(remoteDirName)

        fs.copyFileSync(path.join(__dirname, 'export-test.jsrexport'), path.join(fullDir, 'export.jsrexport'))

        reporter = await init(remoteDirName, { httpPort: remotePort })

        await reporter.documentStore.collection('templates').insert({
          _id: 'testing',
          name: 'testing',
          content: 'testing',
          engine: 'none',
          recipe: 'html'
        })

        await reporter.documentStore.collection('folders').insert({
          _id: 'target',
          name: 'target',
          shortid: 'target'
        })
      })

      afterEach(() => reporter && reporter.close())

      commonImport(dirName, remoteDirName, {
        url: `http://localhost:${remotePort}`
      })
    })

    describe('remote instance (with authentication)', () => {
      const dirName = 'import-remote-auth-cli'
      const remoteDirName = 'import-remote-auth-instance'
      const remotePort = 3900

      const adminUser = {
        user: 'admin',
        password: 'xxxx'
      }

      let reporter

      beforeEach(async () => {
        const fullDir = getTempDir(dirName)
        await setup(dirName)
        await setup(remoteDirName, ['@jsreport/jsreport-authentication'])

        fs.copyFileSync(path.join(__dirname, 'export-test.jsrexport'), path.join(fullDir, 'export.jsrexport'))

        reporter = await init(remoteDirName, {
          httpPort: remotePort,
          extensions: {
            authentication: {
              cookieSession: {
                secret: 'secret string'
              },
              admin: {
                username: adminUser.user,
                password: adminUser.password
              },
              enabled: true
            }
          }
        })

        await reporter.documentStore.collection('templates').insert({
          _id: 'testing',
          name: 'testing',
          content: 'testing',
          engine: 'none',
          recipe: 'html'
        })

        await reporter.documentStore.collection('folders').insert({
          _id: 'target',
          name: 'target',
          shortid: 'target'
        })
      })

      afterEach(() => reporter && reporter.close())

      commonImport(dirName, remoteDirName, {
        url: `http://localhost:${remotePort}`,
        user: adminUser.user,
        password: adminUser.password
      })
    })
  })

  function commonExport (dirName, remote) {
    function addRemoteArgs (cmd, customUrl) {
      if (remote) {
        return `${cmd} --serverUrl=${customUrl != null ? customUrl : remote.url}${remote.user != null ? ` --user=${remote.user} --password=${remote.password}` : ''}`
      }

      return cmd
    }

    if (remote) {
      it('should fail when connecting to invalid server', async () => {
        const cmd = addRemoteArgs('export export.jsrexport', 'http://localhost:9768')

        return should(exec(dirName, cmd)).be.rejectedWith(/Couldn't connect to remote jsreport server/)
      })
    }

    it('should export to relative location (export export.jsrexport)', async () => {
      const fullDir = getTempDir(dirName)
      let cmd = 'export export.jsrexport'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      should(fs.existsSync(path.join(fullDir, 'export.jsrexport'))).be.true()
    })

    it('should export to absolute location (export /path/to/export.jsrexport)', async () => {
      const fullDir = getTempDir(dirName)
      let cmd = `export ${path.join(fullDir, 'export.jsrexport')}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      should(fs.existsSync(path.join(fullDir, 'export.jsrexport'))).be.true()
    })

    it('should export all entities by default', async () => {
      const fullDir = getTempDir(dirName)
      let cmd = 'export export.jsrexport'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      should(stdout).containEql('total entities exported: 2')

      const result = await unzipEntities(path.join(fullDir, 'export.jsrexport'))

      should(result.entities.templates.length).be.eql(2)
      should(result.metadata).be.ok()
    })

    it('should export selected entities (--entities=entityId)', async () => {
      const fullDir = getTempDir(dirName)
      let cmd = 'export export.jsrexport --entities=foo'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      should(stdout).containEql('total entities exported: 1')

      const result = await unzipEntities(path.join(fullDir, 'export.jsrexport'))

      should(result.entities.templates.length).be.eql(1)
      should(result.metadata).be.ok()
    })

    it('should export selected entities from file (--entitiesPath=entities.json)', async () => {
      const fullDir = getTempDir(dirName)

      fs.writeFileSync(path.join(fullDir, 'entities.json'), '["foo"]')

      let cmd = 'export export.jsrexport --entitiesPath=entities.json'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      should(stdout).containEql('total entities exported: 1')

      const result = await unzipEntities(path.join(fullDir, 'export.jsrexport'))

      should(result.entities.templates.length).be.eql(1)
      should(result.metadata).be.ok()
    })
  }

  function commonImport (dirName, targetDirName, remote) {
    function addRemoteArgs (cmd, customUrl) {
      if (remote) {
        return `${cmd} --serverUrl=${customUrl != null ? customUrl : remote.url}${remote.user != null ? ` --user=${remote.user} --password=${remote.password}` : ''}`
      }

      return cmd
    }

    if (remote) {
      it('should fail when connecting to invalid server', async () => {
        const cmd = addRemoteArgs('import export.jsrexport', 'http://localhost:9768')

        return should(exec(dirName, cmd)).be.rejectedWith(/Couldn't connect to remote jsreport server/)
      })
    }

    it('should import from relative location (import export.jsrexport)', async () => {
      let cmd = 'import export.jsrexport'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      const reporter = await init(targetDirName, {
        extensions: {
          express: {
            enabled: false
          }
        }
      })

      const foo = await reporter.documentStore.collection('templates').findOne({
        name: 'foo'
      })

      const bar = await reporter.documentStore.collection('templates').findOne({
        name: 'bar'
      })

      should(foo).be.ok()
      should(bar).be.ok()
      should(foo._id).be.eql('foo')
      should(bar._id).be.eql('bar')

      await reporter.close()
    })

    it('should import from absolute location (import /path/to/export.jsrexport)', async () => {
      const fullDir = getTempDir(dirName)

      let cmd = `import ${path.join(fullDir, 'export.jsrexport')}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      const reporter = await init(targetDirName, {
        extensions: {
          express: {
            enabled: false
          }
        }
      })

      const foo = await reporter.documentStore.collection('templates').findOne({
        name: 'foo'
      })

      const bar = await reporter.documentStore.collection('templates').findOne({
        name: 'bar'
      })

      should(foo._id).be.eql('foo')
      should(bar._id).be.eql('bar')

      await reporter.close()
    })

    it('should import at target folder (--targetFolder)', async () => {
      let cmd = 'import export.jsrexport --targetFolder=target'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      const reporter = await init(targetDirName, {
        extensions: {
          express: {
            enabled: false
          }
        }
      })

      const foo = await reporter.documentStore.collection('templates').findOne({
        name: 'foo'
      })

      const bar = await reporter.documentStore.collection('templates').findOne({
        name: 'bar'
      })

      should(foo._id).be.eql('foo')
      should(foo.folder.shortid).be.eql('target')
      should(bar._id).be.eql('bar')
      should(bar.folder.shortid).be.eql('target')

      await reporter.close()
    })

    it('should be able to do a full import (--fullImport)', async () => {
      let cmd = 'import export.jsrexport --fullImport'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      const reporter = await init(targetDirName, {
        extensions: {
          express: {
            enabled: false
          }
        }
      })

      const templates = await reporter.documentStore.collection('templates').find({})
      const folders = await reporter.documentStore.collection('folders').find({})

      should(templates.length).be.eql(2)
      should(templates).matchAny((v) => should(v._id).be.eql('foo'))
      should(templates).matchAny((v) => should(v._id).be.eql('bar'))
      should(folders.length).be.eql(0)

      await reporter.close()
    })

    it('should be able to do an import validation (--validation)', async () => {
      let cmd = 'import export.jsrexport --validation'

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      if (remote) {
        should(stdout).containEql('in http://')
      } else {
        should(stdout).containEql('in local instance')
      }

      should(stdout).containEql('import validation')

      const reporter = await init(targetDirName, {
        extensions: {
          express: {
            enabled: false
          }
        }
      })

      const templates = await reporter.documentStore.collection('templates').find({})
      const folders = await reporter.documentStore.collection('folders').find({})

      should(templates.length).be.eql(1)
      should(folders.length).be.eql(1)
      should(templates).matchAny((v) => should(v._id).be.eql('testing'))
      should(folders).matchAny((v) => should(v._id).be.eql('target'))

      await reporter.close()
    })
  }
})
