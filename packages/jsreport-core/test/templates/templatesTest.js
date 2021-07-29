const JsReport = require('../../index')
require('should')

describe('templating', function () {
  let jsreport

  beforeEach(() => {
    jsreport = new JsReport()
    jsreport.use(JsReport.tests.listeners())

    return jsreport.init()
  })

  afterEach(() => jsreport.close())

  it('should find by _id and use template', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({ content: 'foo', name: 'foo', engine: 'none', recipe: 'html' })
    const response = await jsreport.render({ template: { _id: template._id } })
    response.content.toString().should.be.eql('foo')
  })

  it('should callback weak error when missing template', () => {
    return jsreport.render({ template: { _id: 'aaa' } }).should.be.rejectedWith(/Unable to find specified template/)
  })

  it('should find by shortid and use template', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({ content: 'foo', name: 'foo', recipe: 'html', engine: 'none' })
    const res = await jsreport.render({ template: { shortid: template.shortid } })
    res.content.toString().should.be.eql('foo')
  })

  it('should find by name and use template', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({ name: 'xxx', content: 'foo', recipe: 'html', engine: 'none' })
    const res = await jsreport.render({ template: { name: template.name } })
    res.content.toString().should.be.eql('foo')
  })

  it('should fallback to use inline content when template not found', async () => {
    const res = await jsreport.render({ template: { name: 'unknown', content: 'foo', recipe: 'html', engine: 'none' } })
    res.content.toString().should.be.eql('foo')
  })

  it('should set report name as template name by default', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({ name: 'baz', content: 'foo', recipe: 'html', engine: 'none' })
    const res = await jsreport.render({ template: { name: template.name } })
    res.meta.reportName.should.be.eql('baz')
  })

  it('should not override custom report name', async () => {
    const template = await jsreport.documentStore.collection('templates').insert({ name: 'bar', content: 'foo', recipe: 'html', engine: 'none' })
    const res = await jsreport.render({ template: { name: template.name }, options: { reportName: 'custom-report-name' } })
    res.meta.reportName.should.be.eql('custom-report-name')
  })

  it('render should throw when no content and id specified', () => {
    return jsreport.render({ template: { } }).should.be.rejectedWith(/emplate must contains _id/)
  })

  it('should fail when creating template without engine', () => {
    return jsreport.documentStore.collection('templates')
      .insert({ name: 'xxx', content: 'foo', recipe: 'html' })
      .should.be.rejected()
  })

  it('should fail when creating template without recipe', () => {
    return jsreport.documentStore.collection('templates')
      .insert({ name: 'xxx', content: 'foo', engine: 'none' })
      .should.be.rejected()
  })

  it('should fill reportName meta', async () => {
    await jsreport.documentStore.collection('templates')
      .insert({ name: 'xxx', engine: 'none', content: 'foo', recipe: 'html' })

    const res = await jsreport.render({ template: { name: 'xxx' } })
    res.meta.reportName.should.be.eql('xxx')
  })

  it('should fill context.currentFolderPath in render', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    })
    await jsreport.documentStore.collection('templates')
      .insert({
        name: 'xxx',
        engine: 'none',
        content: 'foo',
        recipe: 'html',
        folder: { shortid: 'folder' }
      })

    return new Promise((resolve, reject) => {
      jsreport.tests.beforeRenderListeners.add('test', (req, res) => {
        req.context.currentFolderPath.should.be.eql('/folder')
        resolve()
      })
      jsreport.render({ template: { name: 'xxx' } }).catch(reject)
    })
  })

  it('should throw error when duplicated results are found', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    })
    await jsreport.documentStore.collection('templates').insert({
      name: 'xxx',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: { shortid: 'folder' }
    })
    await jsreport.documentStore.collection('templates').insert({
      name: 'xxx',
      engine: 'none',
      content: 'foo',
      recipe: 'html'
    })
    try {
      await jsreport.render({
        template: {
          name: 'xxx'
        }
      })

      throw new Error('should have failed when duplicates are found')
    } catch (e) {
      e.message.includes('Duplicated templates').should.be.true()
    }
  })

  it('should find template specified using absolute path', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    })
    await jsreport.documentStore.collection('templates').insert({
      name: 'xxx',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: { shortid: 'folder' }
    })
    const res = await jsreport.render({
      template: {
        name: '/folder/xxx'
      }
    })

    res.content.toString().should.be.eql('foo')
  })

  it('should find template at specifed path when there are others with same name', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    })
    await jsreport.documentStore.collection('templates').insert({
      name: 'xxx',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: { shortid: 'folder' }
    })
    await jsreport.documentStore.collection('templates').insert({
      name: 'xxx',
      engine: 'none',
      content: 'foo-root',
      recipe: 'html'
    })
    const res = await jsreport.render({
      template: {
        name: '/xxx'
      }
    })

    res.content.toString().should.be.eql('foo-root')
  })

  it('should find template just by name no matter its location if there is no other template with same name', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    })
    await jsreport.documentStore.collection('templates').insert({
      name: 'xxx',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: { shortid: 'folder' }
    })
    const res = await jsreport.render({
      template: {
        name: 'xxx'
      }
    })

    res.content.toString().should.be.eql('foo')
  })

  it('should not find template if it does not exists at the specified absolute path (query root and template nested)', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'templates',
      shortid: 'templates'
    })

    await jsreport.documentStore.collection('templates').insert({
      name: 'foo',
      content: 'foo',
      engine: 'none',
      recipe: 'html',
      folder: {
        shortid: 'templates'
      }
    })

    return jsreport.render({
      template: {
        name: '/foo'
      }
    }).should.be.rejectedWith(/Unable to find specified template/)
  })

  it('should not find template if it does not exists at the specified absolute path (query nested and template at root)', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'templates',
      shortid: 'templates'
    })

    await jsreport.documentStore.collection('templates').insert({
      name: 'foo',
      content: 'foo',
      engine: 'none',
      recipe: 'html'
    })

    return jsreport.render({
      template: {
        name: '/templates/foo'
      }
    }).should.be.rejectedWith(/Unable to find specified template/)
  })

  it('should not find template if it does not exists at the specified absolute path (query nested and parent folder does not exists)', async () => {
    await jsreport.documentStore.collection('templates').insert({
      name: 'foo',
      content: 'foo',
      engine: 'none',
      recipe: 'html'
    })

    return jsreport.render({
      template: {
        name: '/templates/foo'
      }
    }).should.be.rejectedWith(/Unable to find specified template/)
  })

  it('should throw error when path is not absolute', async () => {
    await jsreport.documentStore.collection('folders').insert({
      name: 'folder',
      shortid: 'folder'
    })
    await jsreport.documentStore.collection('templates').insert({
      name: 'xxx',
      engine: 'none',
      content: 'foo',
      recipe: 'html',
      folder: { shortid: 'folder' }
    })

    try {
      await jsreport.render({
        template: {
          name: 'folder/xxx'
        }
      })

      throw new Error('should have failed when passing non absolute path')
    } catch (e) {
      e.message.includes('Invalid template path').should.be.true()
    }
  })

  it('should throw error when using invalid paths', async () => {
    try {
      await jsreport.render({
        template: {
          name: '/'
        }
      })

      throw new Error('should have failed when passing invalid path')
    } catch (e) {
      e.message.includes('Invalid template path').should.be.true()
    }

    try {
      await jsreport.render({
        template: {
          name: '///'
        }
      })

      throw new Error('should have failed when passing invalid path')
    } catch (e) {
      e.message.includes('Invalid template path').should.be.true()
    }
  })

  it.skip('should prevent simple cycles', async () => {
    await jsreport.documentStore.collection('templates').insert({ content: 'foo', name: 'A', engine: 'none', recipe: 'html' })

    jsreport.tests.afterRenderEval(async (req, res, { reporter }) => {
      await reporter.render({ template: { name: 'A' } }, req)
    })

    return jsreport.render({ template: { name: 'A' } }).should.be.rejectedWith(/cycle/)
  })

  it('should not catch cycles when same template rendered multiple times at the same hierarchy level', async () => {
    await jsreport.documentStore.collection('templates').insert({ content: 'foo', name: 'A', engine: 'none', recipe: 'html' })
    await jsreport.documentStore.collection('templates').insert({ content: 'foo', name: 'B', engine: 'none', recipe: 'html' })

    jsreport.tests.afterRenderEval(async (req, res, { reporter }) => {
      if (req.template.name !== 'A') {
        return
      }

      await reporter.render({ template: { name: 'B' } }, req)
      await reporter.render({ template: { name: 'B' } }, req)
    })

    await jsreport.render({ template: { name: 'A' } })
  })
})
