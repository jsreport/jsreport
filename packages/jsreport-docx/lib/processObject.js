const { customAlphabet } = require('nanoid')
const { DOMParser } = require('@xmldom/xmldom')
const { nodeListToArray, createNode } = require('./utils')
const generateRandomSuffix = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789', 5)

const previewImageContentTypeMap = Object.assign(Object.create(null), {
  jpeg: { extension: 'jpeg', contentType: 'image/jpeg' },
  png: { extension: 'png', contentType: 'image/png' }
})

module.exports = function processObject (data, objectInfo) {
  const { idManagers, localIdManagers, newDefaultContentTypes, newDocumentRels, defaultShapeTypeByObjectType, newFiles } = data
  const { content: objectContent, preview: objectPreview } = objectInfo
  let objectXML

  switch (objectContent.fileType) {
    case 'docx': {
      const randomSuffix = generateRandomSuffix()

      const embeddedContentFilename = `Word_Document_${randomSuffix}.docx`
      const embeddedContentRelId = idManagers.get('documentRels').generate().id

      newDefaultContentTypes.set('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')

      newDocumentRels.add({
        id: embeddedContentRelId,
        type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package',
        target: `embeddings/${embeddedContentFilename}`
      })

      newFiles.set(`word/embeddings/${embeddedContentFilename}`, objectContent.buffer)

      const previewImageInfo = previewImageContentTypeMap[objectPreview.fileType]

      if (previewImageInfo == null) {
        throw new Error(`ContentType for image "${objectPreview.fileType}" not found`)
      }

      const embeddedPreviewFilename = `eObjectPreview_${randomSuffix}.${previewImageInfo.extension}`
      const embeddedPreviewRelId = idManagers.get('documentRels').generate().id

      newDefaultContentTypes.set(objectPreview.fileType, previewImageInfo.contentType)

      newDocumentRels.add({
        id: embeddedPreviewRelId,
        type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
        target: `media/${embeddedPreviewFilename}`
      })

      newFiles.set(`word/media/${embeddedPreviewFilename}`, objectPreview.buffer)

      const doc = new DOMParser().parseFromString('<docxXml></docxXml>')
      const objectChildren = []

      const needsShapeType = !defaultShapeTypeByObjectType.has(objectContent.fileType)
      let shapeTypeId

      if (needsShapeType) {
        let shapeTypeNum

        ({ numId: shapeTypeNum, id: shapeTypeId } = localIdManagers.get('shapeType').generate())

        defaultShapeTypeByObjectType.set(objectContent.fileType, shapeTypeId)

        // just for quick reminder, a shapetype is an element that acts
        // as a template for a shape (v:shape), it defines the shape's geometry
        // there can be a single shapetype shared by multiple shape instances in a document
        objectChildren.push(
          createNode(doc, 'v:shapetype', {
            attributes: {
              id: shapeTypeId,
              'o:spt': shapeTypeNum,
              'o:preferrelative': 't',
              // this weird syntax of m@x@y... is called a command with parameterized paths that use
              // formulas defined in an element, the @4 references the 4 index (zero based) v:f defined
              // full details at http://webapp.docx4java.org/OnlineDemo/ecma376/VML/path.html,
              // search for: "v (Path Definition)" on the page
              path: 'm@4@5l@4@11@9@11@9@5xe',
              filled: 'f',
              stroked: 'f'
            },
            children: [
              createNode(doc, 'v:stroke', {
                attributes: { joinstyle: 'miter' }
              }),
              createNode(doc, 'v:formulas', {
                children: [
                  createNode(doc, 'v:f', { attributes: { eqn: 'if lineDrawn pixelLineWidth 0' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'sum @0 1 0' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'sum 0 0 @1' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'prod @2 1 2' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'prod @3 21600 pixelWidth' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'prod @3 21600 pixelHeight' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'sum @0 0 1' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'prod @6 1 2' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'prod @7 21600 pixelWidth' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'sum @8 21600 0' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'prod @7 21600 pixelHeight' } }),
                  createNode(doc, 'v:f', { attributes: { eqn: 'sum @10 21600 0' } })
                ]
              }),
              createNode(doc, 'v:path', {
                attributes: {
                  'o:extrusionok': 'f',
                  gradientshapeok: 't',
                  'o:connecttype': 'rect'
                }
              }),
              createNode(doc, 'o:lock', {
                attributes: {
                  'v:ext': 'edit',
                  aspectratio: 't'
                }
              })
            ]
          })
        )
      } else {
        shapeTypeId = defaultShapeTypeByObjectType.get(objectContent.fileType)
      }

      const shapeId = idManagers.get('shape').generate().id

      objectChildren.push(
        createNode(doc, 'v:shape', {
          attributes: {
            id: shapeId,
            type: `#${shapeTypeId}`,
            alt: '',
            style: `width:${objectPreview.size.width}pt;height:${objectPreview.size.height}pt;mso-width-percent:0;mso-height-percent:0;mso-width-percent:0;mso-height-percent:0`,
            // the empty values are important for Word in windows,
            // otherwise the Word can not open the embedded docx with double click
            'o:ole': ''
          },
          children: [
            createNode(doc, 'v:imagedata', {
              attributes: {
                'r:id': embeddedPreviewRelId,
                // the empty values are important for Word in windows,
                // otherwise the Word can not open the embedded docx with double click
                'o:title': ''
              }
            })
          ]
        })
      )

      objectChildren.push(
        createNode(doc, 'o:OLEObject', {
          attributes: {
            Type: 'Embed',
            ProgID: 'Word.Document.12',
            ShapeID: shapeId,
            DrawAspect: 'Icon',
            ObjectID: `_jsr_o${generateRandomSuffix()}`,
            'r:id': embeddedContentRelId
          },
          children: [
            createNode(doc, 'o:FieldCodes', {
              properties: {
                textContent: '\\s'
              }
            })
          ]
        })
      )

      doc.documentElement.appendChild(
        createNode(doc, 'w:r', {
          children: [
            createNode(doc, 'w:rPr', {
              children: [
                createNode(doc, 'w:noProof')
              ]
            }),
            createNode(doc, 'w:object', {
              children: objectChildren
            })
          ]
        })
      )

      objectXML = nodeListToArray(doc.documentElement.childNodes).map((el) => el.toString()).join('')

      break
    }
    default:
      throw new Error(`Unsupported file type "${objectContent.fileType}"`)
  }

  return objectXML
}
