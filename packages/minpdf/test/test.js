const { Document, External } = require('../')
const fs = require('fs')
const { validate } = require('./util')
const path = require('path')
const zlib = require('zlib')
const { createHash } = require('crypto')
const should = require('should')

describe('minpdf', () => {
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
    document.append(external2, [1])
    const pdfBuffer = await document.asBuffer()
    const { catalog, texts } = await validate(pdfBuffer)
    catalog.properties.get('Pages').object.properties.get('Kids').should.have.length(2)
    texts[0].should.be.eql('main')
    texts[1].should.be.eql('Page 2')
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
    document.append(external, [1])
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
    fs.writeFileSync('out.pdf', pdfBuffer)
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
      language: 'cz-CZ'
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
    info.properties.get('Lang').toString().should.be.eql('(cz-CZ)')
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
})
