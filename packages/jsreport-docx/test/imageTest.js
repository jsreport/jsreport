const should = require('should')
const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const sizeOf = require('image-size')
const { nodeListToArray, pxToEMU, cmToEMU } = require('../lib/utils')
const { getDocumentsFromDocxBuf, getImageSize } = require('./utils')

describe('docx image', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      store: {
        provider: 'memory'
      }
    })
      .use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(async () => {
    if (reporter) {
      await reporter.close()
    }
  })

  it('image', async () => {
    const imageBuf = fs.readFileSync(path.join(__dirname, 'image.png'))
    const imageDimensions = sizeOf(imageBuf)

    const targetImageSize = {
      width: pxToEMU(imageDimensions.width),
      height: pxToEMU(imageDimensions.height)
    }

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image.docx'))
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + imageBuf.toString('base64')
      }
    })

    const outputImageSize = await getImageSize(result.content)

    // should preserve original image size by default
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    fs.writeFileSync('out.docx', result.content)
  })

  it('image with placeholder size (usePlaceholderSize)', async () => {
    const docxBuf = fs.readFileSync(
      path.join(__dirname, 'image-use-placeholder-size.docx')
    )

    const placeholderImageSize = await getImageSize(docxBuf)

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxBuf
          }
        }
      },
      data: {
        src:
          'data:image/png;base64,' +
          fs.readFileSync(path.join(__dirname, 'image.png')).toString('base64')
      }
    })

    const outputImageSize = await getImageSize(result.content)

    outputImageSize.width.should.be.eql(placeholderImageSize.width)
    outputImageSize.height.should.be.eql(placeholderImageSize.height)

    fs.writeFileSync('out.docx', result.content)
  })

  const units = ['cm', 'px']

  units.forEach(unit => {
    describe(`image size in ${unit}`, () => {
      it('image with custom size (width, height)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size.docx'
              : 'image-custom-size-px.docx'
          )
        )

        // 3cm defined in the docx
        const targetImageSize = {
          width: unit === 'cm' ? cmToEMU(3) : pxToEMU(100),
          height: unit === 'cm' ? cmToEMU(3) : pxToEMU(100)
        }

        const result = await reporter.render({
          template: {
            engine: 'handlebars',
            recipe: 'docx',
            docx: {
              templateAsset: {
                content: docxBuf
              }
            }
          },
          data: {
            src:
              'data:image/png;base64,' +
              fs
                .readFileSync(path.join(__dirname, 'image.png'))
                .toString('base64')
          }
        })

        const outputImageSize = await getImageSize(result.content)

        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync('out.docx', result.content)
      })

      it('image with custom size (width set and height automatic - keep aspect ratio)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size-width.docx'
              : 'image-custom-size-width-px.docx'
          )
        )

        const targetImageSize = {
          // 2cm defined in the docx
          width: unit === 'cm' ? cmToEMU(2) : pxToEMU(100),
          // height is calculated automatically based on aspect ratio of image
          height:
            unit === 'cm'
              ? cmToEMU(0.5142851308524194)
              : pxToEMU(25.714330708661418)
        }

        const result = await reporter.render({
          template: {
            engine: 'handlebars',
            recipe: 'docx',
            docx: {
              templateAsset: {
                content: docxBuf
              }
            }
          },
          data: {
            src:
              'data:image/png;base64,' +
              fs
                .readFileSync(path.join(__dirname, 'image.png'))
                .toString('base64')
          }
        })

        const outputImageSize = await getImageSize(result.content)

        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync('out.docx', result.content)
      })

      it('image with custom size (height set and width automatic - keep aspect ratio)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size-height.docx'
              : 'image-custom-size-height-px.docx'
          )
        )

        const targetImageSize = {
          // width is calculated automatically based on aspect ratio of image
          width:
            unit === 'cm'
              ? cmToEMU(7.777781879962101)
              : pxToEMU(194.4444094488189),
          // 2cm defined in the docx
          height: unit === 'cm' ? cmToEMU(2) : pxToEMU(50)
        }

        const result = await reporter.render({
          template: {
            engine: 'handlebars',
            recipe: 'docx',
            docx: {
              templateAsset: {
                content: docxBuf
              }
            }
          },
          data: {
            src:
              'data:image/png;base64,' +
              fs
                .readFileSync(path.join(__dirname, 'image.png'))
                .toString('base64')
          }
        })

        const outputImageSize = await getImageSize(result.content)

        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync('out.docx', result.content)
      })
    })
  })

  it('image with hyperlink inside', async () => {
    const imageBuf = fs.readFileSync(path.join(__dirname, 'image.png'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-with-hyperlink.docx'))
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + imageBuf.toString('base64'),
        url: 'https://jsreport.net'
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const [doc, docRels] = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'])
    const drawingEls = doc.getElementsByTagName('w:drawing')

    drawingEls.length.should.be.eql(1)

    const drawingEl = drawingEls[0]

    const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

    isImg.should.be.True()

    const elLinkClick = drawingEl.getElementsByTagName('a:hlinkClick')[0]
    const hyperlinkRelId = elLinkClick.getAttribute('r:id')

    const hyperlinkRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
      return el.getAttribute('Id') === hyperlinkRelId
    })

    const target = decodeURIComponent(hyperlinkRelEl.getAttribute('Target'))

    target.should.be.eql('https://jsreport.net')
  })

  it('image error message when no src provided', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: null
        }
      })
      .should.be.rejectedWith(/src parameter to be set/)
  })

  it('image can render from url', async () => {
    const url = 'https://some-server.com/some-image.png'

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get('/some-image.png')
        .replyWithFile(200, req.data.imagePath, {
          'content-type': 'image/png'
        })
    })

    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: url,
          imagePath: path.join(__dirname, 'image.png')
        }
      }).should.not.be.rejectedWith(/src parameter to be set/)
  })

  it('image can render from url with returning parametrized content type', async () => {
    const url = 'https://some-server.com/some-image.png'

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get('/some-image.png')
        .replyWithFile(200, req.data.imagePath, {
          'content-type': 'image/png; qs=0.7'
        })
    })

    const result = await reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: url,
          imagePath: path.join(__dirname, 'image.png')
        }
      })

    const [contentTypesDoc] = await getDocumentsFromDocxBuf(result.content, ['[Content_Types].xml'])
    contentTypesDoc.toString().should.not.containEql('image/png; qs=0.7')
  })

  it('image error message when src not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'image.docx'))
            }
          }
        },
        data: {
          src: 'data:image/gif;base64,R0lG'
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires src parameter to be valid data uri/
      )
  })

  it('image error message when width not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(__dirname, 'image-with-wrong-width.docx')
              )
            }
          }
        },
        data: {
          src:
            'data:image/png;base64,' +
            fs
              .readFileSync(path.join(__dirname, 'image.png'))
              .toString('base64')
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires width parameter to be valid number with unit/
      )
  })

  it('image error message when height not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(
                path.join(__dirname, 'image-with-wrong-height.docx')
              )
            }
          }
        },
        data: {
          src:
            'data:image/png;base64,' +
            fs
              .readFileSync(path.join(__dirname, 'image.png'))
              .toString('base64')
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires height parameter to be valid number with unit/
      )
  })

  it('image loop', async () => {
    const images = [
      fs.readFileSync(path.join(__dirname, 'image.png')),
      fs.readFileSync(path.join(__dirname, 'image2.png'))
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-loop.docx'))
          }
        }
      },
      data: {
        photos: images.map((imageBuf) => {
          return {
            src: 'data:image/png;base64,' + imageBuf.toString('base64')
          }
        })
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    drawingEls.length.should.be.eql(2)

    drawingEls.forEach((drawingEl, idx) => {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      isImg.should.be.True()

      const imageRelId = drawingEl.getElementsByTagName('a:blip')[0].getAttribute('r:embed')

      const imageRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === imageRelId
      })

      imageRelEl.getAttribute('Type').should.be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')

      const imageFile = files.find(f => f.path === `word/${imageRelEl.getAttribute('Target')}`)

      // compare returns 0 when buffers are equal
      Buffer.compare(imageFile.data, images[idx]).should.be.eql(0)
    })
  })

  it('image loop and hyperlink inside', async () => {
    const images = [
      {
        url: 'https://jsreport.net',
        buf: fs.readFileSync(path.join(__dirname, 'image.png'))
      },
      {
        url: 'https://www.google.com/intl/es-419/chrome/',
        buf: fs.readFileSync(path.join(__dirname, 'image2.png'))
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-loop-url.docx'))
          }
        }
      },
      data: {
        photos: images.map((image) => {
          return {
            src: 'data:image/png;base64,' + image.buf.toString('base64'),
            url: image.url
          }
        })
      }
    })

    fs.writeFileSync('out.docx', result.content)

    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    drawingEls.length.should.be.eql(2)

    drawingEls.forEach((drawingEl, idx) => {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      isImg.should.be.True()

      const imageRelId = drawingEl.getElementsByTagName('a:blip')[0].getAttribute('r:embed')

      const imageRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === imageRelId
      })

      imageRelEl.getAttribute('Type').should.be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')

      const imageFile = files.find(f => f.path === `word/${imageRelEl.getAttribute('Target')}`)

      // compare returns 0 when buffers are equal
      Buffer.compare(imageFile.data, images[idx].buf).should.be.eql(0)

      const elLinkClick = drawingEl.getElementsByTagName('a:hlinkClick')[0]
      const hyperlinkRelId = elLinkClick.getAttribute('r:id')

      const hyperlinkRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === hyperlinkRelId
      })

      const target = decodeURIComponent(hyperlinkRelEl.getAttribute('Target'))

      target.should.be.eql(images[idx].url)
    })
  })

  it('image loop with bookmarks', async () => {
    const imageBuf = fs.readFileSync(path.join(__dirname, 'cuzco1.jpg'))
    const image2Buf = fs.readFileSync(path.join(__dirname, 'cuzco2.jpg'))

    const data = {
      rows: [{
        title: 'one',
        uri1: `data:image/png;base64,${imageBuf.toString('base64')}`,
        uri2: `data:image/png;base64,${image2Buf.toString('base64')}`
      }, {
        title: 'two',
        uri1: `data:image/png;base64,${imageBuf.toString('base64')}`,
        uri2: `data:image/png;base64,${image2Buf.toString('base64')}`
      }]
    }

    const images = [imageBuf, image2Buf, imageBuf, image2Buf]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image-bookmark-loop.docx'))
          }
        }
      },
      data
    })

    fs.writeFileSync('out.docx', result.content)

    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const bookmarkEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkStart')).filter((el) => {
      return el.getAttribute('w:name').startsWith('image')
    })

    should(drawingEls.length).be.eql(4)
    should(bookmarkEls.length).be.eql(4)

    drawingEls.forEach((drawingEl, idx) => {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const hyperlinkRelId = drawingEl.getElementsByTagName('wp:docPr')[0].getElementsByTagName('a:hlinkClick')[0].getAttribute('r:id')
      const imageRelId = drawingEl.getElementsByTagName('a:blip')[0].getAttribute('r:embed')

      const hyperlinkRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === hyperlinkRelId
      })

      const imageRelEl = nodeListToArray(docRels.getElementsByTagName('Relationship')).find((el) => {
        return el.getAttribute('Id') === imageRelId
      })

      should(hyperlinkRelEl.getAttribute('Type')).be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink')
      should(imageRelEl.getAttribute('Type')).be.eql('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')

      const imageFile = files.find(f => f.path === `word/${imageRelEl.getAttribute('Target')}`)

      // compare returns 0 when buffers are equal
      Buffer.compare(imageFile.data, images[idx]).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${bookmarkEls[idx].getAttribute('w:name')}`)
    })
  })
})
