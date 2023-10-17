const should = require('should')
const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const sizeOf = require('image-size')
const { nodeListToArray, pxToEMU, cmToEMU, getDocPrEl, getPictureElInfo, getPictureCnvPrEl } = require('../lib/utils')
const { getDocumentsFromDocxBuf, getImageMeta } = require('./utils')

const docxDirPath = path.join(__dirname, './docx')
const outputPath = path.join(__dirname, '../out.docx')

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

  // we are testing the formats we are sure it works because we have test them manually too,
  // however it is likely that other format of images that are not listed here also work
  const knownFormats = ['png', 'jpeg', 'svg']

  knownFormats.forEach(format => {
    describe(`image format ${format}`, () => {
      it('image', async () => {
        const { imageBuf, imageExtension } = readImage(format, 'image')
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
                content: fs.readFileSync(path.join(docxDirPath, 'image.docx'))
              }
            }
          },
          data: {
            src: getImageDataUri(format, imageBuf)
          }
        })

        const outputImageMeta = await getImageMeta(result.content)
        const outputImageSize = outputImageMeta.size

        outputImageMeta.image.extension.should.be.eql(`.${imageExtension}`)

        // should preserve original image size by default
        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync(outputPath, result.content)
      })

      it('image from async result', async () => {
        const { imageBuf, imageExtension } = readImage(format, 'image')
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
                content: fs.readFileSync(path.join(docxDirPath, 'image-async.docx'))
              }
            },
            helpers: `
            function getImage() {
              return new Promise((resolve) => resolve('${getImageDataUri(format, imageBuf)}') )
            }
            `
          }
        })

        const outputImageMeta = await getImageMeta(result.content)
        const outputImageSize = outputImageMeta.size

        outputImageMeta.image.extension.should.be.eql(`.${imageExtension}`)

        // should preserve original image size by default
        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync(outputPath, result.content)
      })

      it('image can render from url', async () => {
        const url = `https://some-server.com/some-image.${format}`

        reporter.tests.beforeRenderEval((req, res, { require }) => {
          require('nock')('https://some-server.com')
            .get(`/some-image.${req.data.imageFormat}`)
            .replyWithFile(200, req.data.imagePath, {
              'content-type': req.data.imageMimeType
            })
        })

        const { imagePath, imageExtension } = readImage(format, 'image')

        const result = await reporter.render({
          template: {
            engine: 'handlebars',
            recipe: 'docx',
            docx: {
              templateAsset: {
                content: fs.readFileSync(path.join(docxDirPath, 'image.docx'))
              }
            }
          },
          data: {
            src: url,
            imageFormat: format,
            imageMimeType: getImageMimeType(format),
            imagePath
          }
        })

        const outputImageMeta = await getImageMeta(result.content)

        outputImageMeta.image.extension.should.be.eql(`.${imageExtension}`)

        fs.writeFileSync(outputPath, result.content)
      })

      it('image can render from url with returning parametrized content type', async () => {
        const url = `https://some-server.com/some-image.${format}`

        reporter.tests.beforeRenderEval((req, res, { require }) => {
          require('nock')('https://some-server.com')
            .get(`/some-image.${req.data.imageFormat}`)
            .replyWithFile(200, req.data.imagePath, {
              'content-type': `${req.data.imageMimeType}; qs=0.7`
            })
        })

        const { imagePath, imageExtension } = readImage(format, 'image')

        const result = await reporter
          .render({
            template: {
              engine: 'handlebars',
              recipe: 'docx',
              docx: {
                templateAsset: {
                  content: fs.readFileSync(path.join(docxDirPath, 'image.docx'))
                }
              }
            },
            data: {
              src: url,
              imageFormat: format,
              imageMimeType: getImageMimeType(format),
              imagePath
            }
          })

        const [contentTypesDoc] = await getDocumentsFromDocxBuf(result.content, ['[Content_Types].xml'])
        contentTypesDoc.toString().should.not.containEql('image/png; qs=0.7')

        const outputImageMeta = await getImageMeta(result.content)

        outputImageMeta.image.extension.should.be.eql(`.${imageExtension}`)

        fs.writeFileSync(outputPath, result.content)
      })

      it('image with placeholder size (usePlaceholderSize)', async () => {
        const { imageBuf, imageExtension } = readImage(format, 'image')

        const docxBuf = fs.readFileSync(
          path.join(docxDirPath, 'image-use-placeholder-size.docx')
        )

        const placeholderImageMeta = await getImageMeta(docxBuf)
        const placeholderImageSize = placeholderImageMeta.size

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
            src: getImageDataUri(format, imageBuf)
          }
        })

        const outputImageMeta = await getImageMeta(result.content)
        const outputImageSize = outputImageMeta.size

        outputImageMeta.image.extension.should.be.eql(`.${imageExtension}`)

        outputImageSize.width.should.be.eql(placeholderImageSize.width)
        outputImageSize.height.should.be.eql(placeholderImageSize.height)

        fs.writeFileSync(outputPath, result.content)
      })
    })
  })

  const units = ['cm', 'px']

  units.forEach(unit => {
    describe(`image size in ${unit}`, () => {
      it('image with custom size (width, height)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            docxDirPath,
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
                .readFileSync(path.join(docxDirPath, 'image.png'))
                .toString('base64')
          }
        })

        const outputImageMeta = await getImageMeta(result.content)
        const outputImageSize = outputImageMeta.size

        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync(outputPath, result.content)
      })

      it('image with custom size (width set and height automatic - keep aspect ratio)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            docxDirPath,
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
                .readFileSync(path.join(docxDirPath, 'image.png'))
                .toString('base64')
          }
        })

        const outputImageMeta = await getImageMeta(result.content)
        const outputImageSize = outputImageMeta.size

        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync(outputPath, result.content)
      })

      it('image with custom size (height set and width automatic - keep aspect ratio)', async () => {
        const docxBuf = fs.readFileSync(
          path.join(
            docxDirPath,
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
                .readFileSync(path.join(docxDirPath, 'image.png'))
                .toString('base64')
          }
        })

        const outputImageMeta = await getImageMeta(result.content)
        const outputImageSize = outputImageMeta.size

        outputImageSize.width.should.be.eql(targetImageSize.width)
        outputImageSize.height.should.be.eql(targetImageSize.height)

        fs.writeFileSync(outputPath, result.content)
      })
    })
  })

  it('image with hyperlink inside', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'image.png'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'image-with-hyperlink.docx'))
          }
        }
      },
      data: {
        src: 'data:image/png;base64,' + imageBuf.toString('base64'),
        url: 'https://jsreport.net'
      }
    })

    fs.writeFileSync(outputPath, result.content)

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

  it('image with fallbackSrc when remote src can not be resolved', async () => {
    const format = 'png'
    const url = `https://some-server.com/some-image.${format}`

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get(`/some-image.${req.data.imageFormat}`)
        .reply(500)
    })

    const { imageBuf: fallbackImageBuf, imageExtension: fallbackImageExtension } = readImage(format, 'image')
    const imageDimensions = sizeOf(fallbackImageBuf)

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
            content: fs.readFileSync(path.join(docxDirPath, 'image-with-fallback.docx'))
          }
        }
      },
      data: {
        src: url,
        fallbackSrc: getImageDataUri(format, fallbackImageBuf),
        imageFormat: format
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    const outputImageSize = outputImageMeta.size

    outputImageMeta.image.extension.should.be.eql(`.${fallbackImageExtension}`)

    // should have the image size of the fallback by default
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    fs.writeFileSync(outputPath, result.content)
  })

  it('image placeholder should be able to be preserved when remote src can not be resolved', async () => {
    const format = 'png'
    const url = `https://some-server.com/some-image.${format}`

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get(`/some-image.${req.data.imageFormat}`)
        .reply(500)
    })

    const docxInputBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-failure-placeholder-action.docx'))
    const inputImageMeta = await getImageMeta(docxInputBuf)
    const targetImageSize = inputImageMeta.size

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxInputBuf
          }
        }
      },
      data: {
        src: url,
        failurePlaceholderAction: 'preserve',
        imageFormat: format
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    const outputImageSize = outputImageMeta.size

    outputImageMeta.image.extension.should.be.eql(inputImageMeta.image.extension)

    // should have the image size of the original placeholder in docx
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    fs.writeFileSync(outputPath, result.content)
  })

  it('image placeholder should be able to be removed when remote src can not be resolved', async () => {
    const format = 'png'
    const url = `https://some-server.com/some-image.${format}`

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get(`/some-image.${req.data.imageFormat}`)
        .reply(500)
    })

    const docxInputBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-failure-placeholder-action.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxInputBuf
          }
        }
      },
      data: {
        src: url,
        failurePlaceholderAction: 'remove',
        imageFormat: format
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    should(outputImageMeta).be.not.ok()

    fs.writeFileSync(outputPath, result.content)
  })

  it('image error message when no src provided', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(docxDirPath, 'image.docx'))
            }
          }
        },
        data: {
          src: null
        }
      })
      .should.be.rejectedWith(/src parameter to be set/)
  })

  it('image error message when src not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(docxDirPath, 'image.docx'))
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
                path.join(docxDirPath, 'image-with-wrong-width.docx')
              )
            }
          }
        },
        data: {
          src:
            'data:image/png;base64,' +
            fs
              .readFileSync(path.join(docxDirPath, 'image.png'))
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
                path.join(docxDirPath, 'image-with-wrong-height.docx')
              )
            }
          }
        },
        data: {
          src:
            'data:image/png;base64,' +
            fs
              .readFileSync(path.join(docxDirPath, 'image.png'))
              .toString('base64')
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires height parameter to be valid number with unit/
      )
  })

  it('image should not error when only fallbackSrc is provided', async () => {
    const format = 'png'

    const { imageBuf: fallbackImageBuf, imageExtension: fallbackImageExtension } = readImage(format, 'image')
    const imageDimensions = sizeOf(fallbackImageBuf)

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
            content: fs.readFileSync(path.join(docxDirPath, 'image-with-fallback.docx'))
          }
        }
      },
      data: {
        fallbackSrc: getImageDataUri(format, fallbackImageBuf),
        imageFormat: format
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    const outputImageSize = outputImageMeta.size

    outputImageMeta.image.extension.should.be.eql(`.${fallbackImageExtension}`)

    // should have the image size of the fallback by default
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    fs.writeFileSync(outputPath, result.content)
  })

  it('image should not error when only failurePlaceholderAction is provided', async () => {
    const format = 'png'

    const docxInputBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-failure-placeholder-action.docx'))
    const inputImageMeta = await getImageMeta(docxInputBuf)
    const targetImageSize = inputImageMeta.size

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: docxInputBuf
          }
        }
      },
      data: {
        failurePlaceholderAction: 'preserve',
        imageFormat: format
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    const outputImageSize = outputImageMeta.size

    outputImageMeta.image.extension.should.be.eql(inputImageMeta.image.extension)

    // should have the image size of the original placeholder in docx
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    fs.writeFileSync(outputPath, result.content)
  })

  it('image error message when fallbackSrc not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(docxDirPath, 'image-with-fallback.docx'))
            }
          }
        },
        data: {
          fallbackSrc: 'data:image/gif;base64,R0lG'
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires fallbackSrc parameter to be valid data uri/
      )
  })

  it('image error message when failurePlaceholderAction not valid param', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(docxDirPath, 'image-with-failure-placeholder-action.docx'))
            }
          }
        },
        data: {
          failurePlaceholderAction: 'invalid'
        }
      })
      .should.be.rejectedWith(
        /docxImage helper requires failurePlaceholderAction parameter to be either/
      )
  })

  it('image loop', async () => {
    const images = [
      fs.readFileSync(path.join(docxDirPath, 'image.png')),
      fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'image-loop.docx'))
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

    fs.writeFileSync(outputPath, result.content)

    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    drawingEls.length.should.be.eql(2)

    drawingEls.forEach((drawingEl, idx) => {
      const docPrEl = getDocPrEl(drawingEl)
      const pictureEl = getPictureElInfo(drawingEl).picture
      const pictureCnvPrEl = getPictureCnvPrEl(pictureEl)
      const isImg = pictureEl != null

      isImg.should.be.True()

      // should autogenerate id when image is created from loop
      docPrEl.getAttribute('id').should.be.eql(pictureCnvPrEl.getAttribute('id'))

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
        buf: fs.readFileSync(path.join(docxDirPath, 'image.png'))
      },
      {
        url: 'https://www.google.com/intl/es-419/chrome/',
        buf: fs.readFileSync(path.join(docxDirPath, 'image2.png'))
      }
    ]

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: fs.readFileSync(path.join(docxDirPath, 'image-loop-url.docx'))
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

    fs.writeFileSync(outputPath, result.content)

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
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'cuzco1.jpg'))
    const image2Buf = fs.readFileSync(path.join(docxDirPath, 'cuzco2.jpg'))

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
            content: fs.readFileSync(path.join(docxDirPath, 'image-bookmark-loop.docx'))
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

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

  it('image in document header', async () => {
    const headerImageBuf = fs.readFileSync(path.join(docxDirPath, 'image.png'))
    const headerImageDimensions = sizeOf(headerImageBuf)
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    const imageDimensions = sizeOf(imageBuf)

    const targetHeaderImageSize = {
      width: pxToEMU(headerImageDimensions.width),
      height: pxToEMU(headerImageDimensions.height)
    }

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
            content: fs.readFileSync(path.join(docxDirPath, 'image-header.docx'))
          }
        }
      },
      data: {
        headerSrc: 'data:image/png;base64,' + headerImageBuf.toString('base64'),
        src: 'data:image/png;base64,' + imageBuf.toString('base64')
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    const outputImageSize = outputImageMeta.size

    // should preserve original image size by default
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    const withImageInHeader = []

    for (const headerPath of ['word/header1.xml', 'word/header2.xml', 'word/header3.xml']) {
      const outputInHeaderImageMeta = await getImageMeta(result.content, headerPath)
      const outputInHeaderImageSize = outputInHeaderImageMeta?.size

      if (outputInHeaderImageSize == null) {
        continue
      }

      withImageInHeader.push(outputInHeaderImageSize)
    }

    should(withImageInHeader).have.length(1)

    // should preserve original image size in header by default
    withImageInHeader[0].width.should.be.eql(targetHeaderImageSize.width)
    withImageInHeader[0].height.should.be.eql(targetHeaderImageSize.height)

    fs.writeFileSync(outputPath, result.content)
  })

  it('image in document footer', async () => {
    const footerImageBuf = fs.readFileSync(path.join(docxDirPath, 'image.png'))
    const footerImageDimensions = sizeOf(footerImageBuf)
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    const imageDimensions = sizeOf(imageBuf)

    const targetFooterImageSize = {
      width: pxToEMU(footerImageDimensions.width),
      height: pxToEMU(footerImageDimensions.height)
    }

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
            content: fs.readFileSync(path.join(docxDirPath, 'image-footer.docx'))
          }
        }
      },
      data: {
        footerSrc: 'data:image/png;base64,' + footerImageBuf.toString('base64'),
        src: 'data:image/png;base64,' + imageBuf.toString('base64')
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    const outputImageSize = outputImageMeta.size

    // should preserve original image size by default
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    const withImageInFooter = []

    for (const footerPath of ['word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml']) {
      const outputInFooterImageMeta = await getImageMeta(result.content, footerPath)
      const outputInFooterImageSize = outputInFooterImageMeta?.size

      if (outputInFooterImageSize == null) {
        continue
      }

      withImageInFooter.push(outputInFooterImageSize)
    }

    should(withImageInFooter).have.length(1)

    // should preserve original image size in header by default
    withImageInFooter[0].width.should.be.eql(targetFooterImageSize.width)
    withImageInFooter[0].height.should.be.eql(targetFooterImageSize.height)

    fs.writeFileSync(outputPath, result.content)
  })

  it('image in document header and footer', async () => {
    const headerFooterImageBuf = fs.readFileSync(path.join(docxDirPath, 'image.png'))
    const headerFooterImageDimensions = sizeOf(headerFooterImageBuf)
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    const imageDimensions = sizeOf(imageBuf)

    const targetHeaderFooterImageSize = {
      width: pxToEMU(headerFooterImageDimensions.width),
      height: pxToEMU(headerFooterImageDimensions.height)
    }

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
            content: fs.readFileSync(path.join(docxDirPath, 'image-header-footer.docx'))
          }
        }
      },
      data: {
        headerSrc: 'data:image/png;base64,' + headerFooterImageBuf.toString('base64'),
        footerSrc: 'data:image/png;base64,' + headerFooterImageBuf.toString('base64'),
        src: 'data:image/png;base64,' + imageBuf.toString('base64')
      }
    })

    const outputImageMeta = await getImageMeta(result.content)
    const outputImageSize = outputImageMeta.size

    // should preserve original image size by default
    outputImageSize.width.should.be.eql(targetImageSize.width)
    outputImageSize.height.should.be.eql(targetImageSize.height)

    const withImageInHeader = []

    for (const headerPath of ['word/header1.xml', 'word/header2.xml', 'word/header3.xml']) {
      const outputInHeaderImageMeta = await getImageMeta(result.content, headerPath)
      const outputInHeaderImageSize = outputInHeaderImageMeta?.size

      if (outputInHeaderImageSize == null) {
        continue
      }

      withImageInHeader.push(outputInHeaderImageSize)
    }

    should(withImageInHeader).have.length(1)

    // should preserve original image size in header by default
    withImageInHeader[0].width.should.be.eql(targetHeaderFooterImageSize.width)
    withImageInHeader[0].height.should.be.eql(targetHeaderFooterImageSize.height)

    const withImageInFooter = []

    for (const footerPath of ['word/footer1.xml', 'word/footer2.xml', 'word/footer3.xml']) {
      const outputInHeaderImageMeta = await getImageMeta(result.content, footerPath)
      const outputInHeaderImageSize = outputInHeaderImageMeta?.size

      if (outputInHeaderImageSize == null) {
        continue
      }

      withImageInFooter.push(outputInHeaderImageSize)
    }

    should(withImageInFooter).have.length(1)

    // should preserve original image size in header by default
    withImageInFooter[0].width.should.be.eql(targetHeaderFooterImageSize.width)
    withImageInFooter[0].height.should.be.eql(targetHeaderFooterImageSize.height)

    fs.writeFileSync(outputPath, result.content)
  })
})

function getImageMimeType (format) {
  return `image/${format}${format === 'svg' ? '+xml' : ''}`
}

function getImageDataUri (format, imageBuf) {
  const mimeType = getImageMimeType(format)
  return `data:${mimeType};base64,` + imageBuf.toString('base64')
}

function readImage (format, basename) {
  const fileExtensions = format === 'jpeg' ? ['jpeg', 'jpg'] : [format]

  while (fileExtensions.length > 0) {
    const fileExtension = fileExtensions.shift()

    try {
      const imagePath = path.join(docxDirPath, `${basename}.${fileExtension}`)
      const buf = fs.readFileSync(imagePath)
      return { imageBuf: buf, imagePath, imageExtension: fileExtension }
    } catch (error) {
      const shouldThrow = error.code !== 'ENOENT' || fileExtensions.length === 0

      if (shouldThrow) {
        throw error
      }
    }
  }
}
