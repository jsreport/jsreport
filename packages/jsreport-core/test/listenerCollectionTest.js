/* globals describe, it, beforeEach */
const assert = require('assert')
const should = require('should')
const createListenerCollection = require('../lib/shared/listenerCollection')

describe('ListenerCollection', function () {
  let listeners

  beforeEach(function () {
    listeners = createListenerCollection()
  })

  it('should fire listeners', async () => {
    let invokeCount = 0

    listeners.add('test', function () {
      invokeCount++
    })

    await listeners.fire()

    should(invokeCount).be.eql(1)
  })

  it('remove listener should remove function', async () => {
    let invokeCount = 0

    listeners.add('test', function () {
      invokeCount++
    })

    listeners.remove('test')

    await listeners.fire()

    should(invokeCount).be.eql(0)
  })

  it('should fire listeners with arguments', async () => {
    listeners.add('test', function (a, b) {
      assert.equal('param1', a)
      assert.equal('param2', b)
    })

    await listeners.fire('param1', 'param2')
  })

  it('should be able to use context', async () => {
    const context = { x: 1 }

    listeners.add('test', context, function () {
      assert.equal(1, this.x)
    })

    await listeners.fire()
  })

  it('insert should respect the after condition', async () => {
    const invocations = []

    listeners.add('test', function () {
      invocations.push('test')
    })

    listeners.add('test3', function () {
      invocations.push('test3')
    })

    listeners.insert({ after: 'test' }, 'test2', this, function () {
      invocations.push('test2')
    })

    await listeners.fire()

    invocations.should.have.length(3)
    invocations[0].should.be.eql('test')
    invocations[1].should.be.eql('test2')
    invocations[2].should.be.eql('test3')
  })

  it('insert should respect the after and before condition', async () => {
    const invocations = []

    listeners.add('test3', function () {
      invocations.push('test3')
    })

    listeners.insert({ after: 'test', before: 'test3' }, 'test2', this, function () {
      invocations.push('test2')
    })

    await listeners.fire()

    invocations.should.have.length(2)
    invocations[0].should.be.eql('test2')
    invocations[1].should.be.eql('test3')
  })

  it('insert should work if the conditioned element not present', async () => {
    const invocations = []

    listeners.add('test3', function () {
      invocations.push('test3')
    })

    listeners.insert('test2', this, { after: 'test' }, function () {
      invocations.push('test2')
    })

    await listeners.fire()

    invocations.should.have.length(2)
    invocations[0].should.be.eql('test3')
    invocations[1].should.be.eql('test2')
  })

  it('firePromise should return a valid awaitable promise', async () => {
    listeners.add('test', function () {
      return Promise.resolve(1)
    })
    listeners.add('test', function () {
      return Promise.resolve(2)
    })

    const res = await listeners.fire()

    assert.equal(1, res[0])
    assert.equal(2, res[1])
  })

  it('firePromise should fire with arguments', async () => {
    const obj = {}

    listeners.add('test', function (o) {
      o.a = true
    })

    await listeners.fire(obj)

    assert.equal(true, obj.a)
  })

  it('firePromise should return a valid promise that can catch errors', async () => {
    listeners.add('test', function () {
      return Promise.reject(new Error('foo'))
    })

    return should(listeners.fire()).be.rejected()
  })

  it('firePromise rethrow error', function () {
    const listeners2 = createListenerCollection()
    listeners2.add('test', function () {
      return new Promise(function (resolve, reject) {
        reject(new Error('foo'))
      })
    })

    listeners.add('test', function () {
      return new Promise(function (resolve, reject) {
        resolve('ok')
      })
    })

    return listeners.fire().then(function () {
      return listeners2.fire()
    }).catch(function (e) {
      throw e
    }).catch(function (e) {
    })
  })

  it('firePromise should apply pre hooks', async () => {
    let i = 0
    listeners.pre(function () {
      i++
    })
    listeners.pre(function () {
      i++
    })
    listeners.add('test', function () {
      return Promise.resolve(1)
    })

    await listeners.fire()

    assert.equal(2, i)
  })

  it('firePromise should apply post hooks', async () => {
    let postResult
    listeners.post(function () {
      postResult = this.key
    })

    listeners.add('test', function () {
      return Promise.resolve(1)
    })

    await listeners.fire()

    assert.equal('test', postResult)
  })

  it('firePromise should apply postError hooks', async () => {
    let error
    listeners.postFail(function (err) {
      error = err
    })

    listeners.add('test', function () {
      return Promise.reject(new Error('foo'))
    })

    return listeners.fire().catch(function (err) {
      assert.equal(err, error)
    })
  })
})
