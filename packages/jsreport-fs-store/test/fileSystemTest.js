const path = require('path')
const fs = require('fs/promises')
const { rimraf } = require('rimraf')
const FS = require('../lib/fileSystem')
const should = require('should')

describe('fileSystem', () => {
  const tmpDir = path.join(__dirname, 'tmp')
  let fileSystem

  beforeEach(async () => {
    await rimraf(tmpDir)
    await fs.mkdir(tmpDir)
    fileSystem = FS({ dataDirectory: tmpDir, externalModificationsSync: true })
  })

  afterEach(async () => {
    await rimraf(tmpDir)
  })

  it('mkdir', async () => {
    await fileSystem.mkdir(fileSystem.path.join('foo', 'foo2'))
    const res = await fileSystem.exists(fileSystem.path.join('foo', 'foo2'))
    res.should.be.true()
  })

  it('writeFile and readFile', async () => {
    await fileSystem.writeFile('foo.txt', 'Hello')
    const res = await fileSystem.readFile('foo.txt')
    res.toString().should.be.eql('Hello')
  })

  it('stat isDirectory', async () => {
    await fileSystem.writeFile('foo.txt', 'Hello')

    const fileStat = await fileSystem.stat('foo.txt')
    const dirStat = await fileSystem.stat('/')

    fileStat.isDirectory().should.be.false()
    dirStat.isDirectory().should.be.true()
  })

  it('readdir', async () => {
    await fileSystem.writeFile('foo.txt', 'Hello')
    await fileSystem.mkdir('foo')

    const list = await fileSystem.readdir('/')

    list.should.have.length(2)
    list[0].should.be.eql('foo')
    list[1].should.be.eql('foo.txt')
  })

  it('rename exists', async () => {
    await fileSystem.writeFile('foo.txt', 'Hello')
    await fileSystem.rename('foo.txt', 'changed.txt')

    const oldFileStat = await fileSystem.exists('foo.txt')
    oldFileStat.should.be.false()

    const newFileStat = await fileSystem.exists('changed.txt')
    newFileStat.should.be.true()
  })

  it('remove exists', async () => {
    await fileSystem.mkdir('foo')
    await fileSystem.writeFile(fileSystem.path.join('foo', 'foo.txt'), 'Hello')

    await fileSystem.remove('foo')

    const fooDirStat = await fileSystem.exists('foo')
    fooDirStat.should.be.false()
  })

  it('remove shouldnt clear memory state for equaly prefixed folders', async () => {
    await fileSystem.mkdir('foo')
    await fileSystem.mkdir('foo2')
    await fileSystem.writeFile(fileSystem.path.join('foo', 'foo.txt'), 'Hello')
    await fileSystem.writeFile(fileSystem.path.join('foo2', 'foo.txt'), 'Hello2')
    await fileSystem.remove('foo')
    should(fileSystem.memoryState[path.join(tmpDir, 'foo', 'foo.txt')]).not.be.ok()
    should(fileSystem.memoryState[path.join(tmpDir, 'foo2', 'foo.txt')]).be.ok()
  })

  it('lock should be periodicaly refreshed to avoid staling when long transaction is still running', async () => {
    fileSystem.lockOptions = {
      stale: 100,
      wait: 100,
      retries: 10,
      retryWait: 10
    }

    let locks = ''

    fileSystem.lock().then(async (l) => {
      await new Promise((resolve) => setTimeout(resolve, 200))
      locks += '1'
      return fileSystem.releaseLock(l)
    }).should.not.be.rejected()

    await new Promise((resolve) => setTimeout(resolve, 10))

    fileSystem.lock().then((l) => {
      locks += '2'
      return fileSystem.releaseLock(l)
    }).should.not.be.rejected()

    await new Promise((resolve) => setTimeout(resolve, 300))

    locks.should.be.eql('12')
  })
})
