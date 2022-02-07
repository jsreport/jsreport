process.env.jsreportTest = true

const util = require('util')
const path = require('path')
const fs = require('fs')
const childProcess = require('child_process')
const compile = require('../')
const unlinkAsync = util.promisify(fs.unlink)
const readFileAsync = util.promisify(fs.readFile)

require('should')

async function jsreportExe (args) {
  const pathToExe = path.join(__dirname, 'exe')

  return new Promise((resolve, reject) => {
    childProcess.execFile(pathToExe, args, {
      cwd: __dirname
    }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        return reject(error)
      }

      resolve({
        stdout,
        stderr
      })
    })
  })
}

describe('compilation', function () {
  const originalCWD = process.cwd()
  let jsreport

  before(function () {
    // change cwd to root directory of monorepo
    process.chdir(path.join(__dirname, '../../../'))

    const input = path.join(__dirname, 'entry.js')
    const output = path.join(__dirname, 'exe')

    return unlinkAsync(path.join(__dirname, 'exe')).catch(function (e) {}).then(function () {
      return compile({
        nodeVersion: '16',
        input,
        output,
        debug: true,
        handleArguments: false
      })
    })
  })

  after(function () {
    process.chdir(originalCWD)
  })

  it('should initialize jsreport instance', async function () {
    await jsreportExe()
  })

  it.skip('should discover and include engines', function () {
    return jsreport.render({
      template: {
        content: 'foo',
        engine: 'test',
        recipe: 'html'
      }
    }).then(function (res) {
      res.content.toString().should.be.eql('test:foo')
    })
  })

  it.skip('should compile and get resources', function () {
    jsreport.test.resource.toString().should.be.eql('foo')
  })

  it.skip('should include and resolve specified modules', function () {
    jsreport.test.include.should.be.eql('external')
  })

  it.skip('should compile and get resource directory in temp', function () {
    return readFileAsync(path.join(jsreport.test.resourceFolder, 'innerFolder', 'deep.txt'))
      .then((content) => content.toString().should.be.eql('foo'))
  })
})
