const { Document, External } = require('../')
const fs = require('fs')
const { validate } = require('./util')
const path = require('path')
const zlib = require('zlib')
const { createHash } = require('crypto')
const should = require('should')

describe('pdfjs', () => {
  it('append should add whole document', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external2)
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(2)
  })

  it('append should add specific pages', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, '3pages.pdf')))
    document.append(external2, { pageIndexes: [1] })
    const pdfBuffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', pdfBuffer)
    const { catalog, texts } = await validate(pdfBuffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(2)
    texts[0].should.be.eql('main')
    texts[1].should.be.eql('Page 2')
  })

  it('append should insert after specific number', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, '3pages.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external2, { appendAfterIndex: 0 })
    const pdfBuffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', pdfBuffer)
    const { catalog, texts } = await validate(pdfBuffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(4)
    texts[0].should.be.eql('Page 1')
    texts[1].should.be.eql('main')
    texts[2].should.be.eql('Page 2')
  })

  it('append should not break acroForm fields', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, '2pages2fields.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, '2pages2fields.pdf')))
    document.append(external2)
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    const pages = catalog.properties.get('Pages').object.properties.get('Kids').map(kid => kid.object)
    pages[0].properties.get('Annots').should.have.length(1)
    pages[1].properties.get('Annots').should.have.length(1)
    pages[2].properties.get('Annots').should.have.length(1)
    pages[3].properties.get('Annots').should.have.length(1)
    catalog.properties.get('AcroForm').object.properties.get('Fields').should.have.length(4)
  })

  it('append should not break acroForm fields when adding specific pages', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, '2pages2fields.pdf')))
    document.append(external, { pageIndexes: [1] })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    const pages = catalog.properties.get('Pages').object.properties.get('Kids').map(kid => kid.object)
    pages[0].properties.get('Annots').should.have.length(1)
    catalog.properties.get('AcroForm').object.properties.get('Fields').should.have.length(1)
  })

  it('append should not break signed pdf', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.sign({
      certificateBuffer: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
      password: 'node-signpdf',
      reason: 'some reason'
    })
    const pdfBuffer = await document.asBuffer()
    await validate(pdfBuffer)
  })

  it('append should not break encrypted pdf', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.encrypt({
      password: 'password',
      ownerPassword: 'password'
    })
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer, { password: 'password' })
    texts[0].should.be.eql('main')
    fs.writeFileSync('out.pdf', pdfBuffer)
  })

  it('append should preserve previous attachments', async () => {
    let document = new Document()
    let external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.attachment(Buffer.from('first'), {
      name: 'first.txt',
      creationDate: new Date(),
      description: 'first description',
      modificationDate: new Date()
    })
    const bufWithAttachment = await document.asBuffer()
    document = new Document()
    external = new External(bufWithAttachment)
    document.append(external)
    document.attachment(Buffer.from('second'), { name: 'second.txt' })

    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    const names = catalog.properties.get('Names').object
    const embeddedFiles = names.properties.get('EmbeddedFiles')
    const namesArray = embeddedFiles.get('Names')
    namesArray[0].toString().should.be.eql('(first.txt)')
    namesArray[2].toString().should.be.eql('(second.txt)')
  })

  it('append should preserve info', async () => {
    let document = new Document()
    let external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.info({
      creationDate: new Date(2021, 2, 2),
      title: 'Foo-title',
      author: 'Foo-author',
      subject: 'Foo-subject',
      keywords: 'Foo-keywords',
      creator: 'Foo-creator',
      producer: 'Foo-producer',
      language: 'cz-CZ',
      custom: {
        serialNumber: 'Foo-123',
        'Property With Spaces': 'foo-property-with-spaces',
        Property_With_Underscores: 'foo-property-with-underscores'
      }
    })

    const pdfWithInfo = await document.asBuffer()
    document = new Document()
    external = new External(pdfWithInfo)
    document.append(external)
    const pdfBuffer = await document.asBuffer()

    const { catalog } = await validate(pdfBuffer)
    const info = catalog.properties.get('Info').object
    info.properties.get('Type').name.should.be.eql('Info')
    info.properties.get('CreationDate').toString().should.startWith('(D:')
    info.properties.get('Title').toString().should.be.eql('(Foo-title)')
    info.properties.get('Author').toString().should.be.eql('(Foo-author)')
    info.properties.get('Subject').toString().should.be.eql('(Foo-subject)')
    info.properties.get('Keywords').toString().should.be.eql('(Foo-keywords)')
    info.properties.get('Creator').toString().should.be.eql('(Foo-creator)')
    info.properties.get('Producer').toString().should.be.eql('(Foo-producer)')
    info.properties.get('serialNumber').toString().should.be.eql('(Foo-123)')
    info.properties.get('Property With Spaces').toString().should.be.eql('(foo-property-with-spaces)')
    info.properties.get('Property_With_Underscores').toString().should.be.eql('(foo-property-with-underscores)')
    catalog.properties.get('Lang').toString().should.be.eql('(cz-CZ)')
  })

  it('append should merge the StructTreeRoot', async () => {
    const document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'main.pdf'))), { copyAccessibilityTags: true })
    document.append(new External(fs.readFileSync(path.join(__dirname, 'main.pdf'))), { copyAccessibilityTags: true })

    const pdf = await document.asBuffer()
    fs.writeFileSync('out.pdf', pdf)
    const { catalog } = await validate(pdf)
    catalog.properties.get('MarkInfo').get('Marked').should.be.true()
    const page2 = catalog.properties.get('Pages').object.properties.get('Kids')[1].object
    page2.properties.get('StructParents').should.be.eql(1)

    const structTreeRoot = catalog.properties.get('StructTreeRoot').object

    const idtree = structTreeRoot.properties.get('IDTree').object
    const limits = idtree.properties.get('Kids')[0].object.properties.get('Limits')
    limits.should.have.length(2)
    limits[0].str.should.be.eql('node00000002')
    limits[1].str.should.be.eql('node00000006')

    const names = idtree.properties.get('Kids')[0].object.properties.get('Names')
    names.should.have.length((3 + 2) * 2)

    structTreeRoot.properties.get('ParentTreeNextKey').should.be.eql(2)
    const parentTree = structTreeRoot.properties.get('ParentTree').object
    parentTree.properties.get('Nums').should.have.length(4)
    parentTree.properties.get('Nums')[0].should.be.eql(0)
    parentTree.properties.get('Nums')[2].should.be.eql(1)

    const documentNode = structTreeRoot.properties.get('K').object
    documentNode.properties.get('K').should.have.length(2)
    documentNode.properties.get('K')[1].object.properties.get('ID').str.should.be.eql('node00000005')
    documentNode.properties.get('K')[1].object.properties.get('P').should.be.eql(documentNode.properties.get('K')[0].object.properties.get('P'))
  })

  it('merge should merge pages', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, 'header.pdf')))
    document.merge(external2)
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer)
    texts.should.have.length(1)
    texts[0].should.containEql('main')
    texts[0].should.containEql('header')
    require('fs').writeFileSync('out.pdf', pdfBuffer)
  })

  it('merge should merge to specific page when specified', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, '3pages.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.merge(external2, { mergeToFront: true, pageNum: 1 })
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer)

    texts.should.have.length(3)
    texts[0].should.containEql('Page 1')
    texts[1].should.containEql('Page 2main')
    texts[2].should.containEql('Page 3')
  })

  it('merge should merge to specific page and to back layer', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, '3pages.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.merge(external2, { mergeToFront: false, pageNum: 1 })
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer)

    texts.should.have.length(3)
    texts[0].should.containEql('Page 1')
    texts[1].should.containEql('mainPage 2')
    texts[2].should.containEql('Page 3')
  })

  it('append merge should work with nested pages object', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'nestedPages.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, 'nestedPages.pdf')))
    document.merge(external2)
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer)
    texts.should.have.length(97)
  })

  it('merge with multiple fields and pages', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, '2pages2fields.pdf')))
    document.append(external)
    const external2 = new External(fs.readFileSync(path.join(__dirname, '2pages2fields.pdf')))
    document.merge(external2)
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    const pages = catalog.properties.get('Pages').object.properties.get('Kids').map(kid => kid.object)
    pages[0].properties.get('Annots').should.have.length(2)
    pages[1].properties.get('Annots').should.have.length(2)
    catalog.properties.get('AcroForm').object.properties.get('Fields').should.have.length(4)

    const acroForm = catalog.properties.get('AcroForm').object
    acroForm.properties.get('NeedAppearances').toString().should.be.eql('true')
    const fonts = acroForm.properties.get('DR').get('Font')
    fonts.get('Helvetica').should.be.ok()
  })

  it('merge should merge the StructTreeRoot', async () => {
    const document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'main.pdf'))), { copyAccessibilityTags: true })
    document.merge(new External(fs.readFileSync(path.join(__dirname, 'header.pdf'))), { copyAccessibilityTags: true })

    const pdf = await document.asBuffer()
    fs.writeFileSync('out.pdf', pdf)

    const { catalog } = await validate(pdf)
    catalog.properties.get('MarkInfo').get('Marked').should.be.true()

    const page = catalog.properties.get('Pages').object.properties.get('Kids')[0].object
    page.properties.get('StructParents').should.be.eql(0)
    page.properties.get('Resources').get('XObject').get('X1.0').object.properties.get('StructParents').should.be.eql(1)

    const structTreeRoot = catalog.properties.get('StructTreeRoot').object

    const idtree = structTreeRoot.properties.get('IDTree').object
    const limits = idtree.properties.get('Kids')[0].object.properties.get('Limits')
    limits.should.have.length(2)
    limits[0].str.should.be.eql('node00000002')
    limits[1].str.should.be.eql('node00000006')

    const names = idtree.properties.get('Kids')[0].object.properties.get('Names')
    names.should.have.length((3 + 2) * 2)

    structTreeRoot.properties.get('ParentTreeNextKey').should.be.eql(2)
    const parentTree = structTreeRoot.properties.get('ParentTree').object
    parentTree.properties.get('Nums').should.have.length(4)
    parentTree.properties.get('Nums')[0].should.be.eql(0)
    parentTree.properties.get('Nums')[2].should.be.eql(1)

    const documentNode = structTreeRoot.properties.get('K').object
    documentNode.properties.get('K').should.have.length(2)
    documentNode.properties.get('K')[1].object.properties.get('ID').str.should.be.eql('node00000005')
    documentNode.properties.get('K')[1].object.properties.get('P').should.be.eql(documentNode.properties.get('K')[0].object.properties.get('P'))
    documentNode.properties.get('K')[1].object.properties.get('K')[0].object.properties.get('K')[0].get('Stm').object.should.be.eql(
      page.properties.get('Resources').get('XObject').get('X1.0').object
    )
  })

  it('merge followed with prepend should add xobj to the extra item in ParentTree', async () => {
    let document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'main.pdf'))), { copyAccessibilityTags: true })
    document.merge(new External(fs.readFileSync(path.join(__dirname, 'header.pdf'))), { copyAccessibilityTags: true })
    const bufBeforePrepent = await document.asBuffer()
    document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'main.pdf'))), { copyAccessibilityTags: true })
    document.append(new External(bufBeforePrepent), { copyAccessibilityTags: true })

    const pdf = await document.asBuffer()
    fs.writeFileSync('out.pdf', pdf)

    const { catalog } = await validate(pdf)

    const structTreeRoot = catalog.properties.get('StructTreeRoot').object
    structTreeRoot.properties.get('ParentTreeNextKey').should.be.eql(3)
  })

  it('attachment should add buffer', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.attachment(Buffer.from('first'), {
      name: 'first.txt',
      creationDate: new Date(),
      description: 'first description',
      modificationDate: new Date()
    })
    document.attachment(Buffer.from('second'), { name: 'second.txt' })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    const names = catalog.properties.get('Names').object
    const embeddedFiles = names.properties.get('EmbeddedFiles')
    const namesArray = embeddedFiles.get('Names')
    namesArray[0].toString().should.be.eql('(first.txt)')
    namesArray[2].toString().should.be.eql('(second.txt)')

    const fileSpec = namesArray[1].object
    fileSpec.properties.get('F').toString().should.be.eql('(first.txt)')
    fileSpec.properties.get('Type').toString().should.be.eql('/Filespec')
    fileSpec.properties.get('Desc').toString().should.be.eql('(first description)')

    const ef = fileSpec.properties.get('EF')
    const f = ef.get('F').object
    f.properties.get('Filter').toString().should.be.eql('/FlateDecode')
    f.properties.get('Type').toString().should.be.eql('/EmbeddedFile')
    f.properties.get('Length').toString().should.be.eql('13')
    f.properties.get('Params').get('CreationDate').toString().should.startWith('(D:')
    f.properties.get('Params').get('ModDate').toString().should.startWith('(D:')
    f.properties.get('Params').get('Size').toString().should.be.eql(Buffer.from('first').length + '')
    f.properties.get('Params').get('CheckSum').toString().should.be.eql(`(${createHash('md5').update(Buffer.from('first')).digest('hex')})`)
    zlib.inflateSync(f.content.content).toString().should.be.eql('first')
  })

  it('outlines should add bookmarks', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'links.pdf')))
    document.append(external)
    document.outlines([{
      title: '1 title',
      id: '1'
    }, {
      title: '2 title',
      id: '2',
      parent: '1'
    }])
    const pdfBuffer = await document.asBuffer()

    require('fs').writeFileSync('out.pdf', pdfBuffer)

    const { catalog } = await validate(pdfBuffer)
    const outlines = catalog.properties.get('Outlines').object
    const outline1 = outlines.properties.get('First').object
    outlines.properties.get('Last').object.should.be.eql(outline1)
    outline1.properties.get('Title').toString().should.be.eql('(1 title)')
    outline1.properties.get('A').get('S').toString().should.be.eql('/GoTo')
    outline1.properties.get('A').get('D')[0].object.properties.get('Type').toString().should.be.eql('/Page')
    const outline2 = outline1.properties.get('First').object
    outline2.should.not.be.eql(outline1)
    outline1.properties.get('Last').object.should.be.eql(outline2)
    outline2.properties.get('Title').toString().should.be.eql('(2 title)')
    should(outline2.properties.get('First')).be.eql(undefined)
    should(outline2.properties.get('Last')).be.eql(undefined)

    const dests = catalog.properties.get('Dests')
    dests.object.properties.get('1')[0].object.properties.get('Type').toString().should.be.eql('/Page')
    dests.object.properties.get('2')[0].object.properties.get('Type').toString().should.be.eql('/Page')
  })

  it('append should copy outliness', async () => {
    let document = new Document()
    let external = new External(fs.readFileSync(path.join(__dirname, 'links.pdf')))
    document.append(external)
    document.outlines([{
      title: '1 title',
      id: '1'
    }, {
      title: '2 title',
      id: '2',
      parent: '1'
    }])

    const pdfWithOutlines = await document.asBuffer()

    document = new Document()
    external = new External(fs.readFileSync(path.join(__dirname, 'links2.pdf')))
    document.append(external)
    document.outlines([{
      title: '21 title',
      id: '21'
    }, {
      title: '22 title',
      id: '22',
      parent: '21'
    }])

    const pdfWithOutlines2 = await document.asBuffer()

    document = new Document()
    document.append(new External(pdfWithOutlines))
    document.append(new External(pdfWithOutlines2))

    const pdfBuffer = await document.asBuffer()

    require('fs').writeFileSync('out.pdf', pdfBuffer)

    const { catalog } = await validate(pdfBuffer)
    const outlines = catalog.properties.get('Outlines').object
    const first = outlines.properties.get('First').object
    const last = outlines.properties.get('Last').object

    first.should.not.be.eql(last)
    first.properties.get('Next').object.should.be.eql(last)
    last.properties.get('Prev').object.should.be.eql(first)
  })

  it('append and merge outlined pdf shouldnt break', async () => {
    const document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'main.pdf'))))
    document.merge(new External(fs.readFileSync(path.join(__dirname, 'outline.pdf'))))
    const pdfBuffer = await document.asBuffer()
    await validate(pdfBuffer)
  })

  it('append shouldnt duplicate outlines', async () => {
    const document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'outline.pdf'))))
    document.append(new External(fs.readFileSync(path.join(__dirname, 'outline.pdf'))))
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    const outlines = catalog.properties.get('Outlines').object
    const first = outlines.properties.get('First').object
    const last = outlines.properties.get('Last').object

    first.should.be.eql(last)
  })

  it('merge should union Dests', async () => {
    const document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'links.pdf'))))
    document.merge(new External(fs.readFileSync(path.join(__dirname, 'link.pdf'))))

    const pdfBuffer = await document.asBuffer()
    require('fs').writeFileSync('out.pdf', pdfBuffer)
    const { catalog } = await validate(pdfBuffer)

    const dests = catalog.properties.get('Dests')
    dests.object.properties.get('1')[0].object.properties.get('Type').toString().should.be.eql('/Page')
    dests.object.properties.get('2')[0].object.properties.get('Type').toString().should.be.eql('/Page')
  })

  it('processText should support remove and getPosition callbacks', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.processText({
      resolver: (text, { remove, getPosition }) => {
        remove(0, 1)
        remove(1, 3)

        getPosition(0, text.length).position.should.have.length(6)
      }
    })
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer)
    texts[0].should.be.eql('a')
  })

  it('acroform with text type', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.processText({
      resolver: async (text, { remove, getPosition }) => {
        remove(0, text.length)
        const { pageIndex, position } = getPosition(0, text.length)

        await document.acroForm({
          name: 'test',
          width: 100,
          height: 20,
          position,
          pageIndex,
          fontSize: 12,
          color: '#FF0000',
          backgroundColor: '#00FF00',
          fontFamily: 'Helvetica',
          type: 'text',
          value: 'value',
          defaultValue: 'defaultValue',
          textAlign: 'right',
          readOnly: true,
          formatType: 'number',
          formatFractionalDigits: 2,
          formatSepComma: true,
          formatNegStyle: 'ParensRed',
          formatCurrency: '$',
          formatCurrencyPrepend: true
        })
      }
    })
    const pdfBuffer = await document.asBuffer()

    const { catalog } = await validate(pdfBuffer)
    const acroform = catalog.properties.get('AcroForm').object
    acroform.properties.get('NeedAppearances').should.be.true()
    const field = acroform.properties.get('Fields')[0].object
    field.properties.get('Type').name.should.be.eql('Annot')
    field.properties.get('T').toString().should.be.eql('(test)')
    field.properties.get('FT').toString().should.be.eql('/Tx')
    field.properties.get('DV').toString().should.be.eql('(defaultValue)')
    field.properties.get('V').toString().should.be.eql('(value)')
    field.properties.get('Q').should.be.eql(2)// textAlign
    field.properties.get('Ff').should.be.eql(1)// read only flag
    field.properties.get('DA').toString().should.be.eql('(/Helvetica 12 Tf 1 0 0 rg)')
    field.properties.get('MK').get('BG').toString().should.be.eql('[0 1 0]')

    field.properties.get('AA').get('K').get('S').toString().should.be.eql('/JavaScript')
    field.properties.get('AA').get('K').get('JS').toString().should.be.eql('(AFNumber_Keystroke\\(2,0,"ParensRed",null,"$",true\\);)')

    field.properties.get('AA').get('F').get('S').toString().should.be.eql('/JavaScript')
    field.properties.get('AA').get('F').get('JS').toString().should.be.eql('(AFNumber_Format\\(2,0,"ParensRed",null,"$",true\\);)')

    const da = field.properties.get('DA').toString()
    const fontRef = da.substring(1, da.length - 1).split(' ')[0]
    const fonts = acroform.properties.get('DR').get('Font')

    should(fonts.get(fontRef)).not.be.null()
    fonts.get(fontRef).object.properties.get('BaseFont').toString().should.be.eql('/Helvetica')
  })

  it('acroform with signature type', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.processText({
      resolver: async (text, { remove, getPosition }) => {
        remove(0, text.length)
        const { pageIndex, position } = getPosition(0, text.length)

        await document.acroForm({
          name: 'test',
          width: 100,
          height: 20,
          position,
          pageIndex,
          type: 'signature'
        })
      }
    })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)

    const acroform = catalog.properties.get('AcroForm').object
    const field = acroform.properties.get('Fields')[0].object
    field.properties.get('FT').name.should.be.eql('Sig')
  })

  it('acroform with combo type', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.processText({
      resolver: async (text, { remove, getPosition }) => {
        remove(0, text.length)
        const { pageIndex, position } = getPosition(0, text.length)

        await document.acroForm({
          name: 'test',
          width: 100,
          height: 20,
          position,
          pageIndex,
          value: 'b',
          items: ['a', 'b', 'c'],
          type: 'combo'
        })
      }
    })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)

    const acroform = catalog.properties.get('AcroForm').object
    const field = acroform.properties.get('Fields')[0].object
    field.properties.get('Ff').should.be.eql(131072)
    field.properties.get('FT').toString().should.be.eql('/Ch')
    field.properties.get('Opt').toString().should.be.eql('[(a) (b) (c)]')
  })

  it('acroform with submit reset button', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.processText({
      resolver: async (text, { remove, getPosition }) => {
        remove(0, text.length)
        const { pageIndex, position } = getPosition(0, text.length)

        await document.acroForm({
          name: 'btn1',
          width: 100,
          height: 20,
          position,
          pageIndex,
          action: 'submit',
          label: 'submit',
          url: 'http://myendpoint.com',
          exportFormat: true,
          type: 'button'
        })

        await document.acroForm({
          name: 'btn2',
          width: 100,
          height: 20,
          position,
          pageIndex,
          action: 'reset',
          label: 'reset',
          type: 'button'
        })
      }
    })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)

    const acroform = catalog.properties.get('AcroForm').object
    const submitField = acroform.properties.get('Fields')[0].object
    submitField.properties.get('FT').toString().should.be.eql('/Btn')
    submitField.properties.get('A').get('S').toString().should.be.eql('/SubmitForm')
    submitField.properties.get('A').get('F').toString().should.be.eql('(http://myendpoint.com)')
    submitField.properties.get('A').get('Type').toString().should.be.eql('/Action')
    submitField.properties.get('A').get('Flags').should.be.eql(4)
    submitField.properties.get('Ff').should.be.eql(65536)

    const resetField = acroform.properties.get('Fields')[1].object
    resetField.properties.get('FT').toString().should.be.eql('/Btn')
    resetField.properties.get('A').get('S').toString().should.be.eql('/ResetForm')
    resetField.properties.get('A').get('Type').toString().should.be.eql('/Action')
  })

  it('acroform with checkbox type', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.processText({
      resolver: async (text, { remove, getPosition }) => {
        remove(0, text.length)
        const { pageIndex, position } = getPosition(0, text.length)

        await document.acroForm({
          name: 'test',
          width: 100,
          height: 20,
          position,
          pageIndex,
          visualType: 'square',
          type: 'checkbox'
        })
      }
    })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)

    const acroform = catalog.properties.get('AcroForm').object
    const field = acroform.properties.get('Fields')[0].object
    acroform.properties.get('DR').get('Font').get('ZaDb').should.be.ok()

    field.properties.get('AS').toString().should.be.eql('/Off')
    field.properties.get('DA').toString().should.be.eql('(/ZaDb 0 Tf 0 g)')

    const apDictionary = field.properties.get('AP')
    const yes = apDictionary.get('N').get('Yes').object

    const content = zlib.unzipSync(yes.content.content).toString('latin1')
    content.should.containEql('(n)')
    apDictionary.get('N').get('Off').object.should.be.ok()
  })

  it('acroform with checkbox type with default value', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.processText({
      resolver: async (text, { remove, getPosition }) => {
        remove(0, text.length)
        const { pageIndex, position } = getPosition(0, text.length)

        await document.acroForm({
          name: 'test',
          width: 100,
          height: 20,
          position,
          pageIndex,
          visualType: 'square',
          type: 'checkbox',
          defaultValue: true,
          value: true
        })
      }
    })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)

    const acroform = catalog.properties.get('AcroForm').object
    const field = acroform.properties.get('Fields')[0].object
    acroform.properties.get('DR').get('Font').get('ZaDb').should.be.ok()

    field.properties.get('V').toString().should.be.eql('/Yes')
    field.properties.get('AS').toString().should.be.eql('/Yes')
    field.properties.get('MK').get('CA').toString().should.be.eql('(n)')
  })

  it('acroform should preserve previously used fonts', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, '2pages2fields.pdf')))
    document.append(external)
    await document.acroForm({
      name: 'test',
      width: 100,
      height: 20,
      position: [0, 0, 50, 50, 100, 100],
      pageIndex: 0,
      fontFamily: 'Courier',
      type: 'text',
      value: 'value'
    })
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)

    const acroform = catalog.properties.get('AcroForm').object
    acroform.properties.get('DR').get('Font').get('Courier').should.be.ok()
    acroform.properties.get('DR').get('Font').get('Helvetica').should.be.ok()
  })

  it('info should add meta', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.info({
      creationDate: new Date(2021, 2, 2),
      title: 'Foo-title',
      author: 'Foo-author',
      subject: 'Foo-subject',
      keywords: 'Foo-keywords',
      creator: 'Foo-creator',
      producer: 'Foo-producer',
      language: 'cz-CZ',
      custom: {
        serialNumber: 'Foo-123',
        'Property With Spaces': 'foo-property-with-spaces',
        Property_With_Underscores: 'foo-property-with-underscores'
      }
    })

    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    const info = catalog.properties.get('Info').object
    info.properties.get('Type').name.should.be.eql('Info')
    info.properties.get('CreationDate').toString().should.startWith('(D:')
    info.properties.get('Title').toString().should.be.eql('(Foo-title)')
    info.properties.get('Author').toString().should.be.eql('(Foo-author)')
    info.properties.get('Subject').toString().should.be.eql('(Foo-subject)')
    info.properties.get('Keywords').toString().should.be.eql('(Foo-keywords)')
    info.properties.get('Creator').toString().should.be.eql('(Foo-creator)')
    info.properties.get('Producer').toString().should.be.eql('(Foo-producer)')
    info.properties.get('serialNumber').toString().should.be.eql('(Foo-123)')
    info.properties.get('Property With Spaces').toString().should.be.eql('(foo-property-with-spaces)')
    info.properties.get('Property_With_Underscores').toString().should.be.eql('(foo-property-with-underscores)')
    catalog.properties.get('Lang').toString().should.be.eql('(cz-CZ)')
  })

  it('encrypt should password protect', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.encrypt({
      password: 'password',
      ownerPassword: 'password'
    })
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer, { password: 'password' })
    texts[0].should.be.eql('main')
    pdfBuffer.toString().should.containEql('/Encrypt')
  })

  it('encrypt should password protect nested dictionaries', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'nested-dictionary.pdf')))
    document.append(external)
    document.encrypt({
      password: 'password',
      ownerPassword: 'password'
    })
    const pdfBuffer = await document.asBuffer()
    pdfBuffer.toString().should.not.containEql('https://jsreport.net')
  })

  it('should sign', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external)
    document.sign({
      certificateBuffer: fs.readFileSync(path.join(__dirname, 'certificate.p12')),
      password: 'node-signpdf',
      reason: 'some reason'
    })
    const pdfBuffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', pdfBuffer)
    const { catalog } = await validate(pdfBuffer, { password: 'node-signpdf' })
    const acroForm = catalog.properties.get('AcroForm').object
    acroForm.properties.get('SigFlags').should.be.eql(3)
    const sigField = acroForm.properties.get('Fields')[0].object
    sigField.properties.get('T').toString().should.be.eql('(Signature1)')
  })

  it('should handle stream length in extra object', async () => {
    const document = new Document()
    const ext = new External(fs.readFileSync(path.join(__dirname, 'multiple-embedded-xobj.pdf')))
    document.append(ext)
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(1)
  })

  it('should handle nested xobj during merge', async () => {
    const document = new Document()
    const ext = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(ext)
    const ext2 = new External(fs.readFileSync(path.join(__dirname, 'multiple-embedded-xobj.pdf')))
    document.merge(ext2)
    const pdfBuffer = await document.asBuffer()
    const { catalog } = await validate(pdfBuffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(1)
  })

  it('should handle word produced with national chars pdf during merge', async () => {
    const document = new Document()
    const ext = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(ext)
    const ext2 = new External(fs.readFileSync(path.join(__dirname, 'word.pdf')))
    document.merge(ext2)
    document.processText({
      resolver: () => {}
    })
    const pdfBuffer = await document.asBuffer()
    const { texts } = await validate(pdfBuffer)
    texts[0].should.containEql('dénommé')
  })

  it('should handle phantomjs produced pdf', async () => {
    const document = new Document()
    const ext = new External(fs.readFileSync(path.join(__dirname, 'phantomHeader.pdf')))
    document.append(ext)
    const ext2 = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.merge(ext2)
    const pdfBuffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', pdfBuffer)
    const { texts } = await validate(pdfBuffer)
    texts[0].should.containEql('mainheadermain')
  })

  it('handle pdfs with Parent prop not targeting Pages dictionary', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'parentPropNotTargetingPages.pdf')))
    document.append(external)
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)
    const { catalog } = await validate(buffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(1)
  })

  it('handle linearized pdf', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'linearized.pdf')))
    document.append(external)
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)
    const { catalog } = await validate(buffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(4)
  })

  it('handle linearized pdf with no line break after endobject', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'linearized-no-linebreak-after-endobject.pdf')))
    document.append(external)
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)
    const { catalog } = await validate(buffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(1)
  })

  it('handle cross reference streams', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'cross-reference-streams.pdf')))
    document.append(external)
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)
    const { catalog } = await validate(buffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(1)
  })

  it('handle cross reference streams with predictor', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'cross-reference-streams-predictor.pdf')))
    document.append(external)
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)
    const { catalog } = await validate(buffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(1)
  })

  it('pdf/A basic', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    document.append(external, {
      copyAccessibilityTags: true
    })
    document.info({
      creationDate: new Date(2021, 2, 2, 5, 30),
      title: 'Foo-title',
      subject: 'Foo-subject',
      creator: 'Foo-creator',
      producer: 'Foo-producer'
    })
    document.pdfA()
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)

    const { catalog, trailer } = await validate(buffer)

    trailer.get('ID').should.be.ok()
    catalog.properties.get('Names').object.properties.has('EmbeddedFiles').should.be.false()
    const metadataXml = catalog.properties.get('Metadata').object.content.toString()
    metadataXml.should.containEql('Foo-title')
    metadataXml.should.containEql('Foo-subject')
    metadataXml.should.containEql('Foo-creator')
    metadataXml.should.containEql('Foo-producer')
    metadataXml.should.containEql('2021-03-02T05:30:00')

    catalog.properties.get('OutputIntents').should.be.ok()
    catalog.properties.get('StructTreeRoot').should.be.ok()
  })

  it('pdf/A smask', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'pdfa-smask.pdf')))
    document.append(external)
    document.pdfA()
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)

    const { catalog } = await validate(buffer)
    const page = catalog.properties.get('Pages').object.properties.get('Kids')[0].object
    const imageXObj = page.properties.get('Resources').get('XObject').get('X4').object
    imageXObj.properties.has('SMask').should.be.false()

    const mask = imageXObj.properties.get('Mask').object
    mask.properties.get('BitsPerComponent').should.be.eql(1)
    mask.properties.get('ImageMask').should.be.eql(true)

    const maskBuf = mask.content.getDecompressed()
    maskBuf[0].should.be.eql(127)
    maskBuf[1].should.be.eql(159)
  })

  it('pdf/A font subset', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'pdfa-fontsubset.pdf')))
    document.append(external)
    document.pdfA()
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)

    const { catalog } = await validate(buffer)
    const page = catalog.properties.get('Pages').object.properties.get('Kids')[0].object
    const font = page.properties.get('Resources').get('Font').get('F4').object
    font.properties.get('BaseFont').name.should.be.eql('TimesNewRomanPSMT')
    const df = font.properties.get('DescendantFonts')[0].object
    df.properties.get('BaseFont').name.should.be.eql('TimesNewRomanPSMT')
    const desc = df.properties.get('FontDescriptor').object
    desc.properties.get('FontName').name.should.be.eql('TimesNewRomanPSMT')
  })

  it('pdf/UA', async () => {
    const document = new Document()
    const external = new External(fs.readFileSync(path.join(__dirname, 'invoice.pdf')))
    document.append(external, {
      copyAccessibilityTags: true
    })
    document.info({
      creationDate: new Date(2021, 2, 2, 5, 30),
      title: 'Foo-title',
      subject: 'Foo-subject',
      creator: 'Foo-creator',
      producer: 'Foo-producer'
    })
    document.pdfUA()
    const buffer = await document.asBuffer()
    fs.writeFileSync('out.pdf', buffer)

    const { catalog, trailer } = await validate(buffer)
    trailer.get('ID').should.be.ok()
    catalog.properties.get('Names').object.properties.has('EmbeddedFiles').should.be.false()
    const metadataXml = catalog.properties.get('Metadata').object.content.toString()
    metadataXml.should.containEql('Foo-title')
    metadataXml.should.containEql('pdfuaid')

    catalog.properties.get('ViewerPreferences').get('DisplayDocTitle').should.be.true()

    const pageContentBuf = catalog.properties.get('Pages').object.properties.get('Kids')[0].object.properties.get('Contents').object.content.content
    const pageContent = zlib.unzipSync(pageContentBuf).toString('latin1')

    pageContent.should.containEql(
      ['/Artifact BMC',
        '404 315 298 1 re',
        'f',
        'EMC'].join('\n'))

    pageContent.should.containEql(
      ['/Artifact BMC',
        'BT',
        '/F14 16 Tf',
        '1 0 0 -1 687.84375 375 Tm',
        '<0141> Tj',
        'EMC',
        'ET'].join('\n'))
  })

  it('pdf/UA shouldnt be applied twice', async () => {
    let document = new Document()
    let external = new External(fs.readFileSync(path.join(__dirname, 'invoice.pdf')))
    document.append(external, {
      copyAccessibilityTags: true
    })
    document.info({
      creationDate: new Date(2021, 2, 2, 5, 30),
      title: 'Foo-title',
      subject: 'Foo-subject',
      creator: 'Foo-creator',
      producer: 'Foo-producer'
    })
    document.pdfUA()
    let buffer = await document.asBuffer()

    document = new Document()
    external = new External(buffer)
    document.append(external, {
      copyAccessibilityTags: true
    })
    document.pdfUA()
    buffer = await document.asBuffer()

    const { catalog } = await validate(buffer)

    const pageContentBuf = catalog.properties.get('Pages').object.properties.get('Kids')[0].object.properties.get('Contents').object.content.content
    const pageContent = zlib.unzipSync(pageContentBuf).toString('latin1')

    pageContent.should.not.containEql(
      ['/Artifact BMC',
        '/Artifact BMC'
      ].join('\n'))
  })

  it('external pdf with missing EOL at the end of the objectstream should be supported', async () => {
    const document = new Document()
    document.append(new External(fs.readFileSync(path.join(__dirname, 'missingEOLobjectstream.pdf'))))
    const buffer = await document.asBuffer()
    await validate(buffer)
  })

  it('external text parsing', async () => {
    const external = new External(fs.readFileSync(path.join(__dirname, 'main.pdf')))
    const pages = await external.parseText()
    pages.should.have.length(1)
    pages[0].should.be.eql('main')
  })
})
