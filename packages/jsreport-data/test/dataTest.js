require('should')
const data = require('../')
const handlebars = require('@jsreport/jsreport-handlebars')
const jsreport = require('@jsreport/jsreport-core')
const Request = jsreport.Request

describe('data', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      trustUserCode: true
    })
    reporter.use(handlebars())
    reporter.use(data())
    reporter.use(jsreport.tests.listeners())

    return reporter.init()
  })

  afterEach(() => reporter.close())

  it('should accept null as data', async () => {
    const request = {
      template: { content: 'content', data: null, engine: 'handlebars', recipe: 'html' }
    }

    const res = await reporter.render(request)
    res.content.toString().should.be.eql('content')
  })

  it('should find and use data ref based on shortid', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ a: 'xx' })
    }

    const data = await reporter.documentStore.collection('data').insert(dataItem)
    const request = {
      template: { content: '{{a}}', data: { shortid: data.shortid }, engine: 'handlebars', recipe: 'html' }
    }

    const res = await reporter.render(request)
    res.content.toString().should.be.eql('xx')
  })

  it('should find and use data ref based on name', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ a: 'xx' })
    }

    await reporter.documentStore.collection('data').insert(dataItem)
    const request = {
      template: { content: '{{a}}', data: { name: 'test' }, engine: 'handlebars', recipe: 'html' }
    }

    const res = await reporter.render(request)
    res.content.toString().should.be.eql('xx')
  })

  it('should result in error when data ref does not exists', async () => {
    return reporter.render({
      template: { content: 'html', data: { shortid: 'missing' } }
    }).should.be.rejectedWith(/data/)
  })

  it('should ignore extension on child request when data is specificed on parent', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ b: 'xx' })
    }

    await reporter.documentStore.collection('data').insert(dataItem)

    reporter.tests.beforeRenderEval(async (req, res, { reporter }) => {
      if (req.template.content === 'main') {
        await reporter.render({
          template: { content: '{{a}}-{{b}}', data: { name: 'test' }, engine: 'handlebars', recipe: 'html' }
        }, req)
      }
    })

    let res
    reporter.tests.afterRenderListeners.add('test', this, (req, ares) => {
      if (req.template.content !== 'main') {
        res = ares
      }
    })

    await reporter.render({
      template: { content: 'main', engine: 'handlebars', recipe: 'html' },
      data: { a: 'a' }
    })

    res.content.toString().should.be.eql('a-')
  })

  it('should ignore extension on child request when data is specified on child', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ b: 'xx' })
    }

    await reporter.documentStore.collection('data').insert(dataItem)

    const parent = Request({
      context: {
        logs: []
      },
      template: { content: '{{a}}', engine: 'handlebars', recipe: 'html' }
    })

    const res = await reporter.render({
      template: { content: '{{a}}-{{b}}', data: { name: 'test' }, engine: 'handlebars', recipe: 'html' },
      data: { a: 'a', b: 'b' }
    }, parent)

    res.content.toString().should.be.eql('a-b')
  })

  it('should ignore extension on child request when data is specified on parent and child', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ b: 'xx' })
    }

    await reporter.documentStore.collection('data').insert(dataItem)

    reporter.tests.beforeRenderEval(async (req, res, { reporter }) => {
      if (req.template.content === 'main') {
        await reporter.render({
          template: { content: '{{a}}-{{b}}', data: { name: 'test' }, engine: 'handlebars', recipe: 'html' },
          data: { b: 'b' }
        }, req)
      }
    })

    let res
    reporter.tests.afterRenderListeners.add('test', this, (req, ares) => {
      if (req.template.content !== 'main') {
        res = ares
      }
    })

    await reporter.render({
      template: { content: 'main', engine: 'handlebars', recipe: 'html' },
      data: { a: 'a' }
    })

    res.content.toString().should.be.eql('a-b')
  })

  it('should find and use data ref on child request when data is not specified on parent', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ b: 'xx' })
    }

    await reporter.documentStore.collection('data').insert(dataItem)

    const parent = Request({
      context: {
        logs: []
      },
      template: { content: '{{a}}', engine: 'handlebars', recipe: 'html' }
    })

    const res = await reporter.render({
      template: { content: '{{b}}', data: { name: 'test' }, engine: 'handlebars', recipe: 'html' }
    }, parent)

    res.content.toString().should.be.eql('xx')
  })

  it('should ignore extension on child request if parent find and use data ref', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ a: 'xx' })
    }

    const dataItem2 = {
      name: 'test2',
      dataJson: JSON.stringify({ b: 'bb' })
    }

    await reporter.documentStore.collection('data').insert(dataItem)
    await reporter.documentStore.collection('data').insert(dataItem2)

    reporter.tests.beforeRenderListeners.add('test', async (req, res) => {
      if (req.template.content === 'main') {
        const res = await reporter.render({
          template: { content: 'nested{{a}}-{{b}}', data: { name: 'test2' }, engine: 'handlebars', recipe: 'html' }
        })
        res.content.should.be.eql('nestedxx-')
      }
    })
    return reporter.render({
      template: { content: 'main{{a}}', data: { name: 'test' }, engine: 'handlebars', recipe: 'html' }
    })
  })

  it('should merge data on child request if parent find and use data ref and data is specified on child', async () => {
    const dataItem = {
      name: 'test',
      dataJson: JSON.stringify({ a: 'xx' })
    }

    await reporter.documentStore.collection('data').insert(dataItem)

    reporter.tests.beforeRenderListeners.add('test', async (req, res) => {
      if (req.template.content === 'main') {
        const res = await reporter.render({
          template: { content: 'nested{{a}}-{{b}}', data: { b: 'bb' }, engine: 'handlebars', recipe: 'html' }
        })
        res.content.should.be.eql('nestedxx-bb')
      }
    })
    return reporter.render({
      template: { content: 'main{{a}}', data: { name: 'test' }, engine: 'handlebars', recipe: 'html' }
    })
  })
})
