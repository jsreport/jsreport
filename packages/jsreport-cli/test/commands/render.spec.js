const path = require('path')
const fs = require('fs')
const should = require('should')
const { nanoid } = require('nanoid')
const daemonHandler = require('../../lib/daemonHandler')

const { getTempDir, createTempDir, setup, init, exec } = require('../testUtils')({
  cliModuleName: path.join(__dirname, '../../'),
  baseDir: path.join(__dirname, '../temp'),
  rootDirectory: path.join(__dirname, '../../'),
  defaultExtensions: [
    '@jsreport/jsreport-fs-store',
    '@jsreport/jsreport-handlebars',
    '@jsreport/jsreport-express',
    '@jsreport/jsreport-authentication'
  ],
  defaultOpts: {
    loadConfig: true,
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

describe('render command', () => {
  describe('when using local instance', () => {
    const dirName = 'render-local'

    beforeEach(async () => {
      await setup(dirName)
    })

    common(dirName)
  })

  describe('when using local instance (authentication enabled)', () => {
    const dirName = 'render-local-with-auth'

    beforeEach(async () => {
      await setup(dirName, [], undefined, {
        extensions: {
          authentication: {
            cookieSession: {
              secret: '<your strong secret>'
            },
            admin: {
              username: 'admin',
              password: 'password'
            },
            enabled: true
          }
        }
      })
    })

    common(dirName)
  })

  describe('when using local instance with keepAlive option', () => {
    const dirName = 'rlkalive'
    let localPathToSocketDir
    let localPathToWorkerSocketDir

    beforeEach(async () => {
      await setup(dirName, [], undefined, {
        httpPort: 9768
      })

      localPathToSocketDir = createTempDir(`${dirName}/sock`)
      localPathToWorkerSocketDir = createTempDir(`${dirName}/wSock`)
    })

    afterEach(async () => {
      const fullDir = getTempDir(dirName)
      const proc = await daemonHandler.findProcessByCWD(localPathToWorkerSocketDir, fullDir)

      if (proc) {
        await daemonHandler.kill(proc)
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    it('should render normally and next calls to render should use the same daemon process', async function () {
      const fullDir = getTempDir(dirName)
      const requestJSONPath = path.join(fullDir, 'request.json')
      const outputPath = path.join(fullDir, `${nanoid(7)}.html`)

      fs.writeFileSync(requestJSONPath, `
        {
          "template": {
            "content": "<h1>Test instance, render keepalive</h1>",
            "engine": "none",
            "recipe": "html"
          }
        }
      `)

      let cmd = `render --verbose --keepAlive --request=${requestJSONPath} --out=${outputPath}`

      const { stdout } = await exec(dirName, cmd, {
        env: {
          cli_socketsDirectory: localPathToSocketDir
        }
      })

      should(stdout).containEql('instance has been daemonized and initialized successfully')
      should(fs.existsSync(outputPath)).be.eql(true)
      should(fs.readFileSync(outputPath).toString()).containEql('Test instance, render keepalive')

      const requestJSONPath2 = path.join(fullDir, 'request.json')
      const outputPath2 = path.join(fullDir, `${nanoid(7)}.html`)

      fs.writeFileSync(requestJSONPath2, `
        {
          "template": {
            "content": "<h1>Test instance, render keepalive (second time)</h1>",
            "engine": "none",
            "recipe": "html"
          }
        }
      `)

      cmd = `render --verbose --keepAlive --request=${requestJSONPath2} --out=${outputPath2}`

      const { stdout: stdout2 } = await exec(dirName, cmd, {
        env: {
          cli_socketsDirectory: localPathToSocketDir
        }
      })

      should(stdout2).containEql('using instance daemonized previously')

      should(fs.existsSync(outputPath2)).be.eql(true)
      should(fs.readFileSync(outputPath2).toString()).containEql('Test instance, render keepalive (second time)')
    })

    it('should render normally when there are concurrent calls and daemon process has not started', async function () {
      const fullDir = getTempDir(dirName)
      const concurrentRenders = 5
      const files = []
      const renders = []

      const requestJSONPath = path.join(fullDir, 'request.json')

      fs.writeFileSync(requestJSONPath, `
        {
          "template": {
            "content": "<h1>Test instance, render keepalive</h1>",
            "engine": "none",
            "recipe": "html"
          }
        }
      `)

      for (let i = 0; i < concurrentRenders; i++) {
        const outputPath = path.join(fullDir, `${nanoid(7)}.html`)

        files.push(outputPath)

        const cmd = `render --keepAlive --request=${requestJSONPath} --out=${outputPath}`

        renders.push(
          exec(dirName, cmd, {
            env: {
              cli_socketsDirectory: localPathToSocketDir
            }
          })
        )
      }

      const results = await Promise.all(renders)

      const pid = results[0].stdout.match(/\(pid: (\d+)\)/)[1]

      should(pid).be.ok()

      should(results).matchEach((o) => should(o.stdout).containEql('instance has been daemonized and initialized successfully'))
      should(results).matchEach((o) => should(o.stdout.match(/\(pid: (\d+)\)/)[1]).be.eql(pid))
      should(files).matchEach((file) => should(fs.existsSync(file)).be.eql(true))
    })
  })

  describe('when using remote instance', () => {
    const dirName = 'render-remote'
    const remoteDirName = 'render-remote-instance'
    const remotePort = 9387
    let reporter

    beforeEach(async () => {
      await setup(dirName)
      await setup(remoteDirName)

      reporter = await init(remoteDirName, { httpPort: remotePort })
    })

    afterEach(() => reporter && reporter.close())

    common(dirName, {
      url: `http://localhost:${remotePort}`
    })
  })

  describe('when using remote instance (authentication enabled)', () => {
    const dirName = 'render-remote-auth'
    const remoteDirName = 'render-remote-auth-instance'
    const remotePort = 9387

    const adminUser = {
      user: 'admin',
      password: 'xxxx'
    }

    let reporter

    beforeEach(async () => {
      await setup(dirName)
      await setup(remoteDirName)

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
    })

    afterEach(() => reporter && reporter.close())

    common(dirName, {
      url: `http://localhost:${remotePort}`,
      user: adminUser.user,
      password: adminUser.password
    })
  })

  function common (dirName, remote) {
    function addRemoteArgs (cmd, customUrl) {
      if (remote) {
        return `${cmd} --serverUrl=${customUrl != null ? customUrl : remote.url}${remote.user != null ? ` --user=${remote.user} --password=${remote.password}` : ''}`
      }

      return cmd
    }

    if (remote) {
      it('should fail when connecting to invalid server', async () => {
        const fullDir = getTempDir(dirName)
        const requestJSONPath = path.join(fullDir, 'request.json')
        const outputPath = path.join(fullDir, `${nanoid(7)}.html`)

        fs.writeFileSync(requestJSONPath, `
          {
            "template": {
              "content": "<h1>Test instance, request option</h1>",
              "engine": "none",
              "recipe": "html"
            }
          }
        `)

        const cmd = addRemoteArgs(`render --request=${requestJSONPath} --out=${outputPath}`, 'http://localhost:9988')

        return should(exec(dirName, cmd)).be.rejectedWith(/Couldn't connect to remote jsreport server/)
      })
    }

    it('should handle a failed render', async () => {
      const fullDir = getTempDir(dirName)
      const outputPath = path.join(fullDir, `${nanoid(7)}.html`)
      let cmd = `render --template.shortid=unknown --out=${outputPath}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      return should(exec(dirName, cmd)).be.rejectedWith(/Unable to find specified template/)
    })

    if (!remote) {
      it('render failing instance should provide init error', () => {
        const fullDir = getTempDir(dirName)
        const contentPath = path.join(fullDir, 'content.html')
        const outputPath = path.join(fullDir, `${nanoid(7)}.html`)
        const configFilePath = path.join(fullDir, 'jsreport.config.json')

        fs.writeFileSync(contentPath, `
          <h1>Test instance, template option</h1>
        `)

        fs.writeFileSync(configFilePath, 'intention')

        let cmd = `render --template.content=${contentPath} --template.engine=none --template.recipe=html --out=${outputPath}`

        if (remote) {
          cmd = addRemoteArgs(cmd)
        }

        return should(exec(dirName, cmd, {
          env: {
            configFile: configFilePath
          }
        })).be.rejectedWith(/Error parsing your configuration file/)
      })
    }

    it('should render normally with request option (--request)', async () => {
      const fullDir = getTempDir(dirName)
      const requestJSONPath = path.join(fullDir, 'request.json')
      const outputPath = path.join(fullDir, `${nanoid(7)}.html`)

      fs.writeFileSync(requestJSONPath, `
        {
          "template": {
            "content": "<h1>Test instance, request option</h1>",
            "engine": "none",
            "recipe": "html"
          }
        }
      `)

      let cmd = `render --request=${requestJSONPath} --out=${outputPath}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      should(stdout).containEql('rendering has finished')
      should(fs.existsSync(outputPath)).be.eql(true)
      should(fs.readFileSync(outputPath).toString()).containEql('Test instance, request option')
    })

    it('should render normally with template option (--template=<file.json>)', async () => {
      const fullDir = getTempDir(dirName)
      const templateJSONPath = path.join(fullDir, 'template.json')
      const outputPath = path.join(fullDir, `${nanoid(7)}.html`)

      fs.writeFileSync(templateJSONPath, `
        {
          "content": "<h1>Test instance, template option</h1>",
          "engine": "none",
          "recipe": "html"
        }
      `)

      let cmd = `render --template=${templateJSONPath} --out=${outputPath}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      should(stdout).containEql('rendering has finished')
      should(fs.existsSync(outputPath)).be.eql(true)
      should(fs.readFileSync(outputPath).toString()).containEql('Test instance, template option')
    })

    it('should render normally with template option (--template.content=<content.html>)', async () => {
      const fullDir = getTempDir(dirName)
      const contentPath = path.join(fullDir, 'content.html')
      const outputPath = path.join(fullDir, `${nanoid(7)}.html`)

      fs.writeFileSync(contentPath, `
        <h1>Test instance, template option</h1>
      `)

      let cmd = `render --template.content=${contentPath} --template.engine=none --template.recipe=html --out=${outputPath}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      should(stdout).containEql('rendering has finished')
      should(fs.existsSync(outputPath)).be.eql(true)
      should(fs.readFileSync(outputPath).toString()).containEql('Test instance, template option')
    })

    it('should render normally with template and data option', async () => {
      const fullDir = getTempDir(dirName)
      const templateJSONPath = path.join(fullDir, 'template.json')
      const dataJSONPath = path.join(fullDir, 'data.json')
      const outputPath = path.join(fullDir, `${nanoid(7)}.html`)

      fs.writeFileSync(templateJSONPath, `
        {
          "content": "<h1>Hello i'm {{name}}, using template and data option</h1>",
          "engine": "handlebars",
          "recipe": "html"
        }
      `)

      fs.writeFileSync(dataJSONPath, `
        {
          "name": "jsreport"
        }
      `)

      let cmd = `render --template=${templateJSONPath} --data=${dataJSONPath} --out=${outputPath}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      should(stdout).containEql('rendering has finished')
      should(fs.existsSync(outputPath)).be.eql(true)
      should(fs.readFileSync(outputPath).toString()).containEql('Hello i\'m jsreport, using template and data option')
    })

    it('should store meta response to specified file', async () => {
      const fullDir = getTempDir(dirName)
      const templateJSONPath = path.join(fullDir, 'template.json')
      const outputPath = path.join(fullDir, `${nanoid(7)}.html`)
      const metaPath = path.join(fullDir, `${nanoid(7)}.json`)

      fs.writeFileSync(templateJSONPath, `
        {
          "content": "<h1>Test instance, meta option</h1>",
          "engine": "none",
          "recipe": "html"
        }
      `)

      let cmd = `render --template=${templateJSONPath} --meta=${metaPath} --out=${outputPath}`

      if (remote) {
        cmd = addRemoteArgs(cmd)
      }

      const { stdout } = await exec(dirName, cmd)

      should(stdout).containEql('rendering has finished')
      should(fs.existsSync(outputPath)).be.eql(true)
      should(fs.existsSync(metaPath)).be.eql(true)
      should(fs.readFileSync(outputPath).toString()).containEql('Test instance, meta option')

      if (remote) {
        // only test in remote instance since in local instance express extension is disabled
        should(JSON.parse(fs.readFileSync(metaPath).toString())).have.property('contentDisposition')
      }
    })
  }
})
