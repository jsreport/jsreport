const should = require('should')
const path = require('path')
const fs = require('fs')
const fsAsync = require('fs/promises')
const jsreport = require('@jsreport/jsreport-core')
const { DOMParser } = require('@xmldom/xmldom')
const { imageSize } = require('image-size')
const { nodeListToArray, pxToEMU, cmToEMU } = require('../lib/utils')
const { decompressResponse, getImageSize, getImageDataUri } = require('./utils')

const pptxDirPath = path.join(__dirname, './pptx')
const outputPath = path.join(__dirname, '../out.pptx')

describe('pptx image', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport().use(require('../')())
      .use(require('@jsreport/jsreport-handlebars')())
      .use(require('@jsreport/jsreport-assets')())
      .use(jsreport.tests.listeners())
    return reporter.init()
  })

  afterEach(() => reporter && reporter.close())

  it('image', async () => {
    const imageBuf = fs.readFileSync(path.join(pptxDirPath, 'image.png'))
    const imageDimensions = imageSize(imageBuf)

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
            content: fs.readFileSync(path.join(pptxDirPath, 'image.pptx'))
          }
        }
      },
      data: {
        src: getImageDataUri('png', imageBuf)
      }
    })

    await fsAsync.writeFile(outputPath, await result.output.getBuffer())

    const files = await decompressResponse(result)

    const slideDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
    )

    const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

    should(blipEls.length).be.eql(2)

    for (const [idx, blipEl] of blipEls.entries()) {
      should(blipEl.getAttribute('r:embed')).be.eql(`rId5000${idx + 1}`)

      const outputImageSize = await getImageSize(blipEl)

      // should preserve original image size by default
      should(outputImageSize.width).be.eql(targetImageSize.width)
      should(outputImageSize.height).be.eql(targetImageSize.height)
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

    return should(reporter.render({
      template: {
        engine: 'handlebars',
        recipe: 'pptx',
        pptx: {
          templateAsset: {
            content: fs.readFileSync(path.join(pptxDirPath, 'image.pptx'))
          }
        }
      },
      data: {
        src: url,
        imagePath: path.join(pptxDirPath, 'image.png')
      }
    })).not.be.rejectedWith(/src parameter to be set/)
  })

  it('image with placeholder size (usePlaceholderSize)', async () => {
    const templateBuf = fs.readFileSync(path.join(pptxDirPath, 'image-use-placeholder-size.pptx'))
    const templateFiles = await decompressResponse(templateBuf)

    const templateSlideDoc = new DOMParser().parseFromString(
      templateFiles.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
    )

    const templateBlipEls = nodeListToArray(templateSlideDoc.getElementsByTagName('a:blip'))

    const placeholderImageSizes = []

    for (const templateBlipEl of templateBlipEls) {
      const imageSize = await getImageSize(templateBlipEl)
      placeholderImageSizes.push(imageSize)
    }

    const imageBuf = fs.readFileSync(path.join(pptxDirPath, 'image.png'))

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
        src: getImageDataUri('png', imageBuf)
      }
    })

    await fsAsync.writeFile(outputPath, await result.output.getBuffer())

    const files = await decompressResponse(result)

    const slideDoc = new DOMParser().parseFromString(
      files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
    )

    const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

    should(blipEls.length).be.eql(2)

    for (const [idx, blipEl] of blipEls.entries()) {
      should(blipEl.getAttribute('r:embed')).be.eql(`rId5000${idx + 1}`)

      const outputImageSize = await getImageSize(blipEl)
      const targetImageSize = placeholderImageSizes[idx]

      // should preserve original image size by default
      should(outputImageSize.width).be.eql(targetImageSize.width)
      should(outputImageSize.height).be.eql(targetImageSize.height)
    }
  })

  const units = ['cm', 'px']

  units.forEach(unit => {
    describe(`image size in ${unit}`, () => {
      it('image with custom size (width, height)', async () => {
        const pptxBuf = fs.readFileSync(
          path.join(
            pptxDirPath,
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
            src: getImageDataUri('png', fs.readFileSync(path.join(pptxDirPath, 'image.png')))
          }
        })

        await fsAsync.writeFile(outputPath, await result.output.getBuffer())

        const files = await decompressResponse(result)

        const slideDoc = new DOMParser().parseFromString(
          files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
        )

        const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

        should(blipEls.length).be.eql(2)

        for (const blipEl of blipEls) {
          const outputImageSize = await getImageSize(blipEl)
          // should preserve original image size by default
          should(outputImageSize.width).be.eql(targetImageSize.width)
          should(outputImageSize.height).be.eql(targetImageSize.height)
        }
      })

      it('image with custom size (width set and height automatic - keep aspect ratio)', async () => {
        const pptxBuf = fs.readFileSync(
          path.join(
            pptxDirPath,
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
            src: getImageDataUri('png', fs.readFileSync(path.join(pptxDirPath, 'image.png')))
          }
        })

        await fsAsync.writeFile(outputPath, await result.output.getBuffer())

        const files = await decompressResponse(result)

        const slideDoc = new DOMParser().parseFromString(
          files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
        )

        const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

        should(blipEls.length).be.eql(2)

        for (const blipEl of blipEls) {
          const outputImageSize = await getImageSize(blipEl)
          // should preserve original image size by default
          should(outputImageSize.width).be.eql(targetImageSize.width)
          should(outputImageSize.height).be.eql(targetImageSize.height)
        }
      })

      it('image with custom size (height set and width automatic - keep aspect ratio)', async () => {
        const pptxBuf = fs.readFileSync(
          path.join(
            pptxDirPath,
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
            src: getImageDataUri('png', fs.readFileSync(path.join(pptxDirPath, 'image.png')))
          }
        })

        await fsAsync.writeFile(outputPath, await result.output.getBuffer())

        const files = await decompressResponse(result)

        const slideDoc = new DOMParser().parseFromString(
          files.find(f => f.path === 'ppt/slides/slide1.xml').data.toString()
        )

        const blipEls = nodeListToArray(slideDoc.getElementsByTagName('a:blip'))

        should(blipEls.length).be.eql(2)

        for (const blipEl of blipEls) {
          const outputImageSize = await getImageSize(blipEl)
          // should preserve original image size by default
          should(outputImageSize.width).be.eql(targetImageSize.width)
          should(outputImageSize.height).be.eql(targetImageSize.height)
        }
      })
    })
  })
})
