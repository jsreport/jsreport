const should = require('should')
const fs = require('fs')
const path = require('path')
const jsreport = require('@jsreport/jsreport-core')
const { imageSize } = require('image-size')
const { nodeListToArray, pxToEMU, cmToEMU, getDocPrEl, getPictureElInfo, getPictureCnvPrEl } = require('../lib/utils')
const { getDocumentsFromDocxBuf, getImageMeta } = require('./utils')

const docxDirPath = path.join(__dirname, './docx')
const outputPath = path.join(__dirname, '../out.docx')

describe('docx image', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      sandbox: {
        allowedModules: ['fs']
      },
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
        const imageDimensions = imageSize(imageBuf)

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
        const imageDimensions = imageSize(imageBuf)

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

      it('image from custom loader function', async () => {
        const { imageBuf, imagePath, imageExtension } = readImage(format, 'image')
        const imageDimensions = imageSize(imageBuf)

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
                content: fs.readFileSync(path.join(docxDirPath, 'image-with-loader.docx'))
              }
            },
            helpers: `
            function imageLoader(src) {
              // a loader should always return a stream and type (extension or content type for image)
              return function loader () {
                const fs = require('fs')

                // the idea here is that user can load the image from anywhere, user can use
                // a custom http request library, load from fs or from S3, etc.
                // the idea of allowing this is that user can still benefit from our
                // parallel limits and logic of batching images on disk to prevent
                // loading all images on memory and failing to render when using a lot of images
                return new Promise((resolve) => resolve({
                  type: '${format}',
                  stream: fs.createReadStream(src)
                }))
              }
            }
            `
          },
          data: {
            src: imagePath
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

      if (format === 'jpeg') {
        it('image can render jpeg with CMYK color code', async () => {
          const { imageBuf, imageExtension } = readImage(format, 'cmyk')
          const imageDimensions = imageSize(imageBuf)

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
      }

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

      if (format === 'jpeg') {
        it('image can render jpeg with CMYK color code from url', async () => {
          const url = `https://some-server.com/some-image.${format}`

          reporter.tests.beforeRenderEval((req, res, { require }) => {
            require('nock')('https://some-server.com')
              .get(`/some-image.${req.data.imageFormat}`)
              .replyWithFile(200, req.data.imagePath, {
                'content-type': req.data.imageMimeType
              })
          })

          const { imagePath, imageExtension } = readImage(format, 'cmyk')

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
      }

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

  it('image with extra static tooltip text', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))

    const data = {
      src: `data:image/png;base64,${imageBuf.toString('base64')}`
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-extra-tooltip.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('img1'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const pictureElInfo = getPictureElInfo(drawingEl)
      const linkClickEls = pictureElInfo.links
      const linkClickEl = linkClickEls[0]
      const tooltip = linkClickEl.getAttribute('tooltip')

      should(tooltip).be.eql('custom tooltip')

      const currentBookmarkStart = drawingEl.parentNode.previousSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))

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
      Buffer.compare(imageFile.data, imageBuf).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image with extra dynamic tooltip text', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))

    const data = {
      src: `data:image/png;base64,${imageBuf.toString('base64')}`,
      tooltip: 'another custom tooltip'
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-extra-dynamic-tooltip.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('img1'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const pictureElInfo = getPictureElInfo(drawingEl)
      const linkClickEls = pictureElInfo.links
      const linkClickEl = linkClickEls[0]
      const tooltip = linkClickEl.getAttribute('tooltip')

      should(tooltip).be.eql(data.tooltip)

      const currentBookmarkStart = drawingEl.parentNode.previousSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))

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
      Buffer.compare(imageFile.data, imageBuf).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('raw image with extra dynamic tooltip text', async () => {
    const data = {
      tooltip: 'another custom tooltip'
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'raw-image-with-static-tooltip.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(0)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = outputBookmarkMeta.bookmarkStartEls

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const pictureElInfo = getPictureElInfo(drawingEl)
      const linkClickEls = pictureElInfo.links
      const linkClickEl = linkClickEls[0]
      const tooltip = linkClickEl.getAttribute('tooltip')

      should(tooltip).be.eql(data.tooltip)

      const currentBookmarkStart = drawingEl.parentNode.previousSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))

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

      should(imageFile.path).be.eql('word/media/image1.jpg')

      // compare returns 0 when buffers are equal
      // Buffer.compare(imageFile.data, imageBuf).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image should be generated with bookmark that wraps it', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))

    const data = {
      src: `data:image/png;base64,${imageBuf.toString('base64')}`
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('img1'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))

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
      Buffer.compare(imageFile.data, imageBuf).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image should be able to customize generated bookmark name', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))

    const data = {
      src: `data:image/png;base64,${imageBuf.toString('base64')}`,
      bookmarkName: 'narutoImage'
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-custom-bookmark.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = [...newBookmarkMeta.bookmarkStartEls]

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling
      const currentBookmarkEnd = drawingEl.parentNode.nextSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(data.bookmarkName)
      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkEnd.getAttribute('w:id')).be.eql(currentBookmarkStart.getAttribute('w:id'))

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
      Buffer.compare(imageFile.data, imageBuf).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image with custom helper wrapping docxImage', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))

    const data = {
      src: null
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-custom-helper.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        },
        helpers: `
          function customImage (options) {
            return docxImage.call(this, {
              ...options,
              hash: {
                ...options.hash,
                src: \`data:image/png;base64,${imageBuf.toString('base64')}\`
              }
            })
          }
        `
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('img1'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))

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
      Buffer.compare(imageFile.data, imageBuf).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image with custom async helper wrapping docxImage', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))

    const data = {
      src: null
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-with-custom-helper.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        },
        helpers: `
          async function customImage (options) {
            await new Promise((resolve) => setTimeout(resolve, 400))

            return docxImage.call(this, {
              ...options,
              hash: {
                ...options.hash,
                src: \`data:image/png;base64,${imageBuf.toString('base64')}\`
              }
            })
          }
        `
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(1)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('img1'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))

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
      Buffer.compare(imageFile.data, imageBuf).should.be.eql(0)

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
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
    const imageDimensions = imageSize(fallbackImageBuf)

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

  it('image error message should include url to image when src points to remote image', async () => {
    const format = 'png'
    const url = `https://some-server.com/some-image.${format}`

    reporter.tests.beforeRenderEval((req, res, { require }) => {
      require('nock')('https://some-server.com')
        .get(`/some-image.${req.data.imageFormat}`)
        .reply(500)
    })

    try {
      await reporter.render({
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
          src: url
        }
      })

      throw new Error('should not reach here')
    } catch (error) {
      error.message.should.containEql(`unable to fetch remote image at ${url}`)
    }
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

  it('image error message when no src as image loader did not return valid value', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(docxDirPath, 'image-with-loader.docx'))
            }
          },
          helpers: `
          function imageLoader(src) {
            return function loader () {
              return null
            }
          }
          `
        },
        data: {
          src: null
        }
      })
      .should.be.rejectedWith(/empty content-type or extension for remote image/)
  })

  it('image error message when no src as image loader did not return type value', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(docxDirPath, 'image-with-loader.docx'))
            }
          },
          helpers: `
          function imageLoader(src) {
            return function loader () {
              return {
                stream: true
              }
            }
          }
          `
        },
        data: {
          src: null
        }
      })
      .should.be.rejectedWith(/empty content-type or extension for remote image/)
  })

  it('image error message when no src as image loader did not return stream value', async () => {
    return reporter
      .render({
        template: {
          engine: 'handlebars',
          recipe: 'docx',
          docx: {
            templateAsset: {
              content: fs.readFileSync(path.join(docxDirPath, 'image-with-loader.docx'))
            }
          },
          helpers: `
          function imageLoader(src) {
            return function loader () {
              return {
                stream: true,
                type: 'jpg'
              }
            }
          }
          `
        },
        data: {
          src: null
        }
      })
      .should.be.rejectedWith(/expected stream but got a different value for remote image/)
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
    const imageDimensions = imageSize(fallbackImageBuf)

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

    for (const [idx, drawingEl] of drawingEls.entries()) {
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
    }
  })

  it('image loop with customized bookmark names', async () => {
    const images = [
      fs.readFileSync(path.join(docxDirPath, 'image.png')),
      fs.readFileSync(path.join(docxDirPath, 'image2.png')),
      fs.readFileSync(path.join(docxDirPath, 'image.png')),
      fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    ]

    const data = {
      photos: images.map((imageBuf, imageIdx) => {
        return {
          src: 'data:image/png;base64,' + imageBuf.toString('base64'),
          bookmarkName: `customBookmark${imageIdx + 1}`
        }
      })
    }

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-loop-with-custom-bookmark.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(4)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(4)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('customBookmark'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling
      const currentBookmarkEnd = drawingEl.parentNode.nextSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(data.photos[idx].bookmarkName)
      should(currentBookmarkEnd.tagName).be.eql('w:bookmarkEnd')
      should(currentBookmarkEnd.getAttribute('w:id')).be.eql(currentBookmarkStart.getAttribute('w:id'))

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

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
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

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-loop-url.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
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

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(2)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(2)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('docxImage1'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      isImg.should.be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling
      const currentBookmarkEnd = drawingEl.parentNode.nextSibling

      // we are validating here that each docxImage generated from loop has its own bookmark,
      // even if the link target of image was not pointing to bookmark
      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))
      should(currentBookmarkEnd.tagName).be.eql('w:bookmarkEnd')
      should(currentBookmarkEnd.getAttribute('w:id')).be.eql(currentBookmarkStart.getAttribute('w:id'))

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
    }
  })

  it('image loop with custom bookmarks and linking between them', async () => {
    const images = [
      {
        url: '#customBookmark2',
        buf: fs.readFileSync(path.join(docxDirPath, 'image.png')),
        bookmarkName: 'customBookmark1'
      },
      {
        url: '#customBookmark1',
        buf: fs.readFileSync(path.join(docxDirPath, 'image2.png')),
        bookmarkName: 'customBookmark2'
      }
    ]

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-loop-url-with-custom-bookmark-linking.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data: {
        photos: images.map((image) => {
          return {
            src: 'data:image/png;base64,' + image.buf.toString('base64'),
            url: image.url,
            bookmarkName: image.bookmarkName
          }
        })
      }
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(2)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(2)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('customBookmark'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      isImg.should.be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling
      const currentBookmarkEnd = drawingEl.parentNode.nextSibling

      // we are validating here that each docxImage generated from loop has its own bookmark,
      // even if the link target of image was not pointing to bookmark
      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(images[idx].bookmarkName)
      should(currentBookmarkEnd.tagName).be.eql('w:bookmarkEnd')
      should(currentBookmarkEnd.getAttribute('w:id')).be.eql(currentBookmarkStart.getAttribute('w:id'))

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
    }
  })

  it('image loop without existing bookmarks', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))

    const data = {
      items: [
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` },
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` },
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` }
      ]
    }

    const images = [imageBuf, imageBuf, imageBuf]

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-without-bookmark-loop.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(3)

    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(3)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('docxImage1'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling
      const currentBookmarkEnd = drawingEl.parentNode.nextSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))
      should(currentBookmarkEnd.tagName).be.eql('w:bookmarkEnd')
      should(currentBookmarkEnd.getAttribute('w:id')).be.eql(currentBookmarkStart.getAttribute('w:id'))

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

      should(hyperlinkRelEl.getAttribute('Target')).be.eql('https://jsreport.net/')
    }
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

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-bookmark-loop.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(4)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(5)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:name').startsWith('image'))

    for (const [idx, drawingEl] of drawingEls.entries()) {
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

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image loop with bookmarks (ensure bookmarks are normalized inside same container of image', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))
    const image2Buf = fs.readFileSync(path.join(docxDirPath, 'naruto2.png'))

    const data = {
      items: [
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` },
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` },
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` }
      ],
      items2: [
        { src: `data:image/png;base64,${image2Buf.toString('base64')}` },
        { src: `data:image/png;base64,${image2Buf.toString('base64')}` },
        { src: `data:image/png;base64,${image2Buf.toString('base64')}` }
      ]
    }

    const images = [imageBuf, imageBuf, imageBuf, image2Buf, image2Buf, image2Buf]

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-bookmark-loop-normalize.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(6)

    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(6)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => (
      el.getAttribute('w:name').startsWith('naruto_') ||
      el.getAttribute('w:name').startsWith('naruto2_')
    ))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling
      const currentBookmarkEnd = drawingEl.parentNode.nextSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))
      should(currentBookmarkEnd.tagName).be.eql('w:bookmarkEnd')
      should(currentBookmarkEnd.getAttribute('w:id')).be.eql(currentBookmarkStart.getAttribute('w:id'))

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

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image loop with bookmarks (ensure images that point to same single bookmark are normalized to have its own bookmark)', async () => {
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'naruto.png'))
    const image2Buf = fs.readFileSync(path.join(docxDirPath, 'naruto2.png'))

    const data = {
      items: [
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` },
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` },
        { src: `data:image/png;base64,${imageBuf.toString('base64')}` }
      ],
      items2: [
        { src: `data:image/png;base64,${image2Buf.toString('base64')}` },
        { src: `data:image/png;base64,${image2Buf.toString('base64')}` },
        { src: `data:image/png;base64,${image2Buf.toString('base64')}` }
      ]
    }

    const images = [imageBuf, imageBuf, imageBuf, image2Buf, image2Buf, image2Buf]

    const templateBuf = fs.readFileSync(path.join(docxDirPath, 'image-bookmark-loop-duplicated.docx'))

    const result = await reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'docx',
        docx: {
          templateAsset: {
            content: templateBuf
          }
        }
      },
      data
    })

    fs.writeFileSync(outputPath, result.content)

    const [templateDoc] = await getDocumentsFromDocxBuf(templateBuf, ['word/document.xml'])
    const { files, documents: [doc, docRels] } = await getDocumentsFromDocxBuf(result.content, ['word/document.xml', 'word/_rels/document.xml.rels'], { returnFiles: true })
    const drawingEls = nodeListToArray(doc.getElementsByTagName('w:drawing'))

    const templateBookmarkMeta = extractBookmarks(templateDoc)
    const outputBookmarkMeta = extractBookmarks(doc, { filterGoBack: false })

    const newBookmarkMeta = checkBookmarks(templateBookmarkMeta, outputBookmarkMeta)

    should(drawingEls.length).be.eql(6)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(6)
    should(newBookmarkMeta.bookmarkStartEls.length).be.eql(newBookmarkMeta.bookmarkEndEls.length)

    const targetBookmarks = newBookmarkMeta.bookmarkStartEls.filter((el) => (
      el.getAttribute('w:name').startsWith('naruto_r1') ||
      el.getAttribute('w:name').startsWith('naruto_r2')
    ))

    for (const [idx, drawingEl] of drawingEls.entries()) {
      const isImg = drawingEl.getElementsByTagName('pic:pic').length > 0

      should(isImg).be.True()

      const currentBookmarkStart = drawingEl.parentNode.previousSibling
      const currentBookmarkEnd = drawingEl.parentNode.nextSibling

      should(currentBookmarkStart.tagName).be.eql('w:bookmarkStart')
      should(currentBookmarkStart.getAttribute('w:id')).be.ok()
      should(currentBookmarkStart.getAttribute('w:id')).be.eql(targetBookmarks[idx].getAttribute('w:id'))
      should(currentBookmarkStart.getAttribute('w:name')).be.ok()
      should(currentBookmarkStart.getAttribute('w:name')).be.eql(targetBookmarks[idx].getAttribute('w:name'))
      should(currentBookmarkEnd.tagName).be.eql('w:bookmarkEnd')
      should(currentBookmarkEnd.getAttribute('w:id')).be.eql(currentBookmarkStart.getAttribute('w:id'))

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

      should(hyperlinkRelEl.getAttribute('Target')).be.eql(`#${targetBookmarks[idx].getAttribute('w:name')}`)
    }
  })

  it('image in document header', async () => {
    const headerImageBuf = fs.readFileSync(path.join(docxDirPath, 'image.png'))
    const headerImageDimensions = imageSize(headerImageBuf)
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    const imageDimensions = imageSize(imageBuf)

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
    const footerImageDimensions = imageSize(footerImageBuf)
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    const imageDimensions = imageSize(imageBuf)

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
    const headerFooterImageDimensions = imageSize(headerFooterImageBuf)
    const imageBuf = fs.readFileSync(path.join(docxDirPath, 'image2.png'))
    const imageDimensions = imageSize(imageBuf)

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

function checkBookmarks (templateBookmarkMeta, outputBookmarkMeta) {
  // validates that all bookmarks have a start with a single end
  for (const bookmarkStartEl of outputBookmarkMeta.bookmarkStartEls) {
    const matched = outputBookmarkMeta.bookmarkEndEls.filter((el) => el.getAttribute('w:id') === bookmarkStartEl.getAttribute('w:id'))
    should(matched.length).be.eql(1)
  }

  should(outputBookmarkMeta.bookmarkStartEls.length).be.eql(outputBookmarkMeta.bookmarkEndEls.length)

  const newBookmark = {
    bookmarkStartEls: [],
    bookmarkEndEls: []
  }

  // validates that the original bookmarks are present in the output
  for (const bookmarkStartEl of outputBookmarkMeta.bookmarkStartEls) {
    const matched = templateBookmarkMeta.bookmarkStartEls.filter((el) => el.getAttribute('w:id') === bookmarkStartEl.getAttribute('w:id'))

    if (matched.length === 0) {
      newBookmark.bookmarkStartEls.push(bookmarkStartEl)
      continue
    }

    should(matched.length).be.aboveOrEqual(1)
  }

  for (const bookmarkStartEl of newBookmark.bookmarkStartEls) {
    const bookmarkEndEl = outputBookmarkMeta.bookmarkEndEls.find((el) => el.getAttribute('w:id') === bookmarkStartEl.getAttribute('w:id'))
    should(bookmarkEndEl).be.ok()
    newBookmark.bookmarkEndEls.push(bookmarkEndEl)
  }

  return newBookmark
}

function extractBookmarks (doc, opts = {}) {
  const { filterGoBack = true } = opts

  let bookmarkStartEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkStart'))
  let bookmarkEndEls = nodeListToArray(doc.getElementsByTagName('w:bookmarkEnd'))

  if (filterGoBack) {
    let filtered = []
    let goBackBookmarkEl

    for (const el of bookmarkStartEls) {
      if (el.getAttribute('w:name') === '_GoBack') {
        goBackBookmarkEl = el
        continue
      }

      filtered.push(el)
    }

    bookmarkStartEls = filtered
    filtered = []

    for (const el of bookmarkEndEls) {
      if (goBackBookmarkEl != null && el.getAttribute('w:id') === goBackBookmarkEl.getAttribute('w:id')) {
        continue
      }

      filtered.push(el)
    }

    bookmarkEndEls = filtered
  }

  const result = {
    bookmarkStartEls,
    bookmarkEndEls
  }

  return result
}
