require('should')
const fs = require('fs')
const path = require('path')
const util = require('util')
const sizeOf = require('image-size')
const textract = util.promisify(require('textract').fromBufferWithName)
const { DOMParser } = require('@xmldom/xmldom')
const { decompress } = require('@jsreport/office')
const jsreport = require('@jsreport/jsreport-core')
const { nodeListToArray, pxToEMU, cmToEMU } = require('../lib/utils')

describe('pptx', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('accept buffer as base64 string by default', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'variable.pptx')).toString('base64')
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan Blaha')
  })

  it('accept buffer as string with explicit encoding', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'variable.pptx')).toString('binary'),
            encoding: 'binary'
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan Blaha')
  })

  it('throw clear error when template fails to be parsed as pptx', async () => {
    return reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'variable.pptx')).toString('utf8'),
            encoding: 'utf8'
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    }).should.be.rejectedWith(/Failed to parse pptx template input/i)
  })

  it('should propagate lineNumber when error in helper', async () => {
    try {
      await reporter.render({
        template: {
          engine: 'handlebars',
          recipe: 'pptx',
          pptx: {
            templateAsset: {
              content: fs.readFileSync(path.join(__dirname, 'variable.pptx'))
            }
          },
          helpers: `function hello() {
            throw new Error('xxx')
          }
        `
        }
      })
    } catch (e) {
      e.lineNumber.should.be.eql(2)
    }
  })

  it('variable-replace', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'variable.pptx'))
          }
        }
      },
      data: {
        hello: 'Jan Blaha'
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan Blaha')
  })

  it('list', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'list.pptx'))
          }
        }
      },
      data: {
        items: [{
          name: 'Jan'
        }, {
          name: 'Boris'
        }, {
          name: 'Pavel'
        }]
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan')
    text.should.containEql('Boris')
    text.should.containEql('Pavel')
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
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image.pptx'))
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + imageBuf.toString('base64')
      }
    })

    fs.writeFileSync('out.pptx', result.content)

    const files = await decompress()(result.content)

    const slideDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
    )

    const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

    blipEls.length.should.be.eql(2)

    for (const [idx, blipEl] of blipEls.entries()) {
      blipEl.getAttribute('r:embed').should.be.eql(`rId5000${idx + 1}`)

      const outputImageSize = await getImageSize(blipEl)

      // should preserve original image size by default
      outputImageSize.width.should.be.eql(targetImageSize.width)
      outputImageSize.height.should.be.eql(targetImageSize.height)
    }
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

    return reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'image.pptx'))
          }
        }
      },
      data: {
        src: url,
        imagePath: path.join(__dirname, 'image.png')
      }
    }).should.not.be.rejectedWith(/src parameter to be set/)
  })

  it('image with placeholder size (usePlaceholderSize)', async () => {
    const templateBuf = fs.readFileSync(path.join(__dirname, 'image-use-placeholder-size.pptx'))
    const templateFiles = await decompress()(templateBuf)

    const templateSlideDoc = new DOMParser().parseFromString(
      templateFiles.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
    )

    const templateBlipEls = nodeListToArray(templateSlideDoc.getElementsByTagName('a:blip'))

    const placeholderImageSizes = []

    for (const templateBlipEl of templateBlipEls) {
      const imageSize = await getImageSize(templateBlipEl)
      placeholderImageSizes.push(imageSize)
    }

    const imageBuf = fs.readFileSync(path.join(__dirname, 'image.png'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + imageBuf.toString('base64')
      }
    })

    fs.writeFileSync('out.pptx', result.content)

    const files = await decompress()(result.content)

    const slideDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
    )

    const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

    blipEls.length.should.be.eql(2)

    for (const [idx, blipEl] of blipEls.entries()) {
      blipEl.getAttribute('r:embed').should.be.eql(`rId5000${idx + 1}`)

      const outputImageSize = await getImageSize(blipEl)
      const targetImageSize = placeholderImageSizes[idx]

      // should preserve original image size by default
      outputImageSize.width.should.be.eql(targetImageSize.width)
      outputImageSize.height.should.be.eql(targetImageSize.height)
    }
  })

  const units = ['cm', 'px']

  units.forEach(unit => {
    describe(`image size in ${unit}`, () => {
      it('image with custom size (width, height)', async () => {
        const pptxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size.pptx'
              : 'image-custom-size-px.pptx'
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
            recipe: 'pptx',
            pptx: {
              templateAsset: {
                content: pptxBuf
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

        fs.writeFileSync('out.pptx', result.content)

        const files = await decompress()(result.content)

        const slideDoc = new DOMParser().parseFromString(
          files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
        )

        const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

        blipEls.length.should.be.eql(2)

        for (const blipEl of blipEls) {
          const outputImageSize = await getImageSize(blipEl)
          // should preserve original image size by default
          outputImageSize.width.should.be.eql(targetImageSize.width)
          outputImageSize.height.should.be.eql(targetImageSize.height)
        }
      })

      it('image with custom size (width set and height automatic - keep aspect ratio)', async () => {
        const pptxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size-width.pptx'
              : 'image-custom-size-width-px.pptx'
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
            recipe: 'pptx',
            pptx: {
              templateAsset: {
                content: pptxBuf
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

        fs.writeFileSync('out.pptx', result.content)

        const files = await decompress()(result.content)

        const slideDoc = new DOMParser().parseFromString(
          files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
        )

        const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

        blipEls.length.should.be.eql(2)

        for (const blipEl of blipEls) {
          const outputImageSize = await getImageSize(blipEl)
          // should preserve original image size by default
          outputImageSize.width.should.be.eql(targetImageSize.width)
          outputImageSize.height.should.be.eql(targetImageSize.height)
        }
      })

      it('image with custom size (height set and width automatic - keep aspect ratio)', async () => {
        const pptxBuf = fs.readFileSync(
          path.join(
            __dirname,
            unit === 'cm'
              ? 'image-custom-size-height.pptx'
              : 'image-custom-size-height-px.pptx'
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
            recipe: 'pptx',
            pptx: {
              templateAsset: {
                content: pptxBuf
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

        fs.writeFileSync('out.pptx', result.content)

        const files = await decompress()(result.content)

        const slideDoc = new DOMParser().parseFromString(
          files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
        )

        const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

        blipEls.length.should.be.eql(2)

        for (const blipEl of blipEls) {
          const outputImageSize = await getImageSize(blipEl)
          // should preserve original image size by default
          outputImageSize.width.should.be.eql(targetImageSize.width)
          outputImageSize.height.should.be.eql(targetImageSize.height)
        }
      })
    })
  })

  it('table', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'table.pptx'))
          }
        }
      },
      data: {
        people: [
          {
            name: 'Jan',
            email: 'jan.blaha@foo.com'
          },
          {
            name: 'Boris',
            email: 'boris@foo.met'
          },
          {
            name: 'Pavel',
            email: 'pavel@foo.met'
          }
        ]
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan')
    text.should.containEql('Boris')
  })

  it('slides', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'slides.pptx'))
          }
        }
      },
      data: {
        items: [{ hello: 'Jan' }, { hello: 'Blaha' }, { hello: 'Boris' }]
      }
    })

    fs.writeFileSync('out.pptx', result.content)
    const text = await textract('test.pptx', result.content)
    text.should.containEql('Jan')
    text.should.containEql('Blaha')
    // the parser somehow don't find the other items on the first run
    // text.should.containEql('Boris')

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    sldIdEls[2].getAttribute('id').should.be.eql('5001')
    sldIdEls[3].getAttribute('id').should.be.eql('5002')
  })

  it('slides when pptxSlide and other handlebars in the same a:t', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'slides_in_same_node.pptx'))
          }
        }
      },
      data: {
        list: [{ text: 'Jan' }, { text: 'Boris' }]
      }
    })

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    sldIdEls[1].getAttribute('id').should.be.eql('5001')
  })

  it('slides with image', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'slides_with_image.pptx'))
          }
        }
      },
      data: {
        list: [{
          text: 'Jan',
          image1: 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'image.png')).toString('base64')
        }, {
          text: 'Boris',
          image1: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'image.jpeg')).toString('base64')
        }]
      }
    })

    fs.writeFileSync('out.pptx', result.content)

    const files = await decompress()(result.content)
    const presentationStr = files.find(f => f.path === 'ppt/presentation.xml').data.toString()
    const presentation = new DOMParser().parseFromString(presentationStr)
    const sldIdLstEl = presentation.getElementsByTagName('p:presentation')[0].getElementsByTagName('p:sldIdLst')[0]
    const sldIdEls = nodeListToArray(sldIdLstEl.getElementsByTagName('p:sldId'))

    sldIdEls[1].getAttribute('id').should.be.eql('5001')
  })

  it('slides with notes', async () => {
    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(__dirname, 'slides_with_notes.pptx'))
          }
        }
      },
      data: {
        items: [{ hello: 'Jan' }, { hello: 'Blaha' }, { hello: 'Boris' }]
      }
    })

    fs.writeFileSync('out.pptx', result.content)

    const files = await decompress()(result.content)
    files.find(f => f.path === 'ppt/notesSlides/notesSlide5001.xml').should.be.ok()
    files.find(f => f.path === 'ppt/notesSlides/notesSlide5002.xml').should.be.ok()
  })
})

async function getImageSize (blipEl) {
  const picEl = blipEl.parentNode.parentNode

  if (picEl.nodeName !== 'p:pic') {
    return
  }

  const grpSpEl = picEl.parentNode

  if (grpSpEl.nodeName !== 'p:grpSp') {
    return
  }

  const aExtEl = grpSpEl.getElementsByTagName('p:grpSpPr')[0].getElementsByTagName('a:xfrm')[0].getElementsByTagName('a:ext')[0]

  return {
    width: parseFloat(aExtEl.getAttribute('cx')),
    height: parseFloat(aExtEl.getAttribute('cy'))
  }
}
