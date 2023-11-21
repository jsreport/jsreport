
const PDF = require('../../object')
const fs = require('fs')
const path = require('path')
const metadataXml = fs.readFileSync(path.join(__dirname, 'metadata.xml')).toString()
const zlib = require('zlib')

module.exports = (doc) => {
  doc.pdfUA = () => {
    doc.pdfA()
    doc.finalizers.push(() => pdfUA(doc))
  }
}

async function pdfUA (doc) {
  const info = doc.catalog.properties.get('Info').object

  let creationDateStr = info.properties.get('CreationDate')?.toString() || ''
  if (creationDateStr) {
  // D:20210302000000+01'00' > 2022-08-26T19:43:26+00:00
    creationDateStr = creationDateStr
      .substring(3)
      .slice(0, -1)
      .replace('\'', '')
      .replace('\'', '')

    creationDateStr = creationDateStr.slice(0, 4) + '-' + creationDateStr.slice(4)
    creationDateStr = creationDateStr.slice(0, 7) + '-' + creationDateStr.slice(7)
    creationDateStr = creationDateStr.slice(0, 10) + 'T' + creationDateStr.slice(10)
    creationDateStr = creationDateStr.slice(0, 13) + ':' + creationDateStr.slice(13)
    creationDateStr = creationDateStr.slice(0, 16) + ':' + creationDateStr.slice(16)
    creationDateStr = creationDateStr.slice(0, 22) + ':' + creationDateStr.slice(22)
  }

  const metadata = new PDF.Stream()
  const finalXml = metadataXml
    .replace('@title', info.properties.get('Title')?.str || '')
    .replace('@subject', info.properties.get('Subject')?.str || '')
    .replace('@description', info.properties.get('Subject')?.str || '')
    .replace('@createDate', creationDateStr)
    .replace('@createDate', creationDateStr)
    .replace('@creatorTool', info.properties.get('Creator')?.str || '')
    .replace('@creator', info.properties.get('Creator')?.str || '')
    .replace('@producer', info.properties.get('Producer')?.str || '')
    .replace('@modifyDate', creationDateStr)
  metadata.writeLine(finalXml.replace(/\n/g, ''))
  metadata.object.properties.set('Type', new PDF.Name('Metadata'))
  metadata.object.properties.set('Subtype', new PDF.Name('XML'))
  doc.catalog.properties.set('Metadata', metadata.toReference())

  await processUntaggedObjects(doc)
}

async function processUntaggedObjects (doc) {
  doc.catalog.prop('ViewerPreferences', new PDF.Dictionary({
    DisplayDocTitle: true
  }))

  for (const pageObject of doc.pages) {
    const streamObject = pageObject.properties.get('Contents').object.content

    await processStreamWithUntaggedObjects({
      doc,
      streamObject,
      page: pageObject,
      pages: doc.pages
    })
  }
}

// the pdfua needs everything in the stream to have tag in the StructTree or be marked as artifact without a meaning for accessibility
function processStreamWithUntaggedObjects ({ doc, streamObject, page, pages }) {
  // we just support known structures chrome produces
  if (streamObject == null || !streamObject.object.properties.get('Filter')) {
    return
  }

  if (streamObject.object.properties.get('Filter').name !== 'FlateDecode') {
    return
  }

  // optimize and don't go into images
  if (streamObject.object.properties.get('Subtype') && streamObject.object.properties.get('Subtype').name === 'Image') {
    return
  }

  const lines = zlib.unzipSync(streamObject.content).toString('latin1').split('\n')

  // good reference for pdf stream instructions
  // https://gendignoux.com/blog/images/pdf-graphics/cheat-sheet-by-nc-sa.png

  const finalLines = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (lines[i - 1] !== '/Artifact BMC' && (line.endsWith(' m') || line.endsWith(' l') || line.endsWith(' c'))) {
      let j = i
      while (lines[j + 1].endsWith(' m') || lines[j + 1].endsWith(' l') || lines[j + 1].endsWith(' c') || lines[j + 1].endsWith('h')) {
        j++
      }

      if (lines[j + 1].endsWith('f')) {
        finalLines.push('/Artifact BMC')
        finalLines.push(line)
        while (lines[i + 1].endsWith(' m') || lines[i + 1].endsWith(' l') || lines[i + 1].endsWith(' c') || lines[i + 1].endsWith('h')) {
          finalLines.push(lines[++i])
        }

        if (lines[i + 1].endsWith('f')) {
          finalLines.push(lines[++i])
        }

        finalLines.push('EMC')
      } else {
        finalLines.push(line)
        while (lines[i + 1].endsWith(' m') || lines[i + 1].endsWith(' l') || lines[i + 1].endsWith(' c') || lines[i + 1].endsWith('h')) {
          finalLines.push(lines[++i])
        }
      }

      continue
    }

    if (line.endsWith('re') && i > 4 && lines[i + 1] !== 'W* n' && lines[i + 1] !== 'W n' && lines[i - 1] !== '/Artifact BMC') {
      finalLines.push('/Artifact BMC')
      finalLines.push(line)
      if (lines[i + 1] === 'S' || lines[i + 1] === 'f') {
        finalLines.push(lines[++i])
      }

      finalLines.push('EMC')
    } else if (line === 'BT' && !lines[i + 1].startsWith('/P') && lines[i - 1] !== '/Artifact BMC') {
      // tagging texts (like fontawesome icons) that are not tagged as artifacts
      finalLines.push('/Artifact BMC')
      while (lines[i++] !== 'ET') {
        finalLines.push(lines[i - 1])
      }
      finalLines.push('EMC')
      finalLines.push('ET')
      i--
    } else if (line.endsWith('Do')) {
      // process xobjects/images
      try {
        const pline = lines[i - 1]
        if (!pline.includes('MCID')) {
          // we seems to need to check if that thing isn't actually tagged...
          const xobjectName = line.replace(' Do', '').substring(1)
          const xObject = page.properties.get('Resources').get('XObject').get(xobjectName)
          if (xObject && xObject.object.properties.get('StructParents') != null) {
            // but we will need to process everything also for the xobject content
            finalLines.push(line)
            continue
          }

          // there isnt a tag so we make an artifact from image
          finalLines.push('/Artifact BMC')
          finalLines.push(line)
          finalLines.push('EMC')
          continue
        }

        // /P <</MCID 0 >>BDC
        const mcid = pline.replace('/P <</MCID ', '').replace(' >>BDC', '')
        const node = findInStructTree(mcid, doc)
        node.prop('A', new PDF.Array([new PDF.Dictionary({
          BBox: new PDF.Array([0, 0, 104, 630]),
          O: new PDF.Name('Layout')
        })]))
        finalLines.push(line)
      } catch (e) {
        finalLines.push(line)
      }
    } else {
      finalLines.push(line)
    }
  }

  streamObject.content = zlib.deflateSync(Buffer.from(finalLines.join('\n'), 'latin1'))
  streamObject.object.prop('Length', streamObject.content.length)
}

function findInStructTree (mcid, doc) {
  function findInNode (node) {
    if (!node) {
      return
    }

    const firstKItem = node.properties.get('K')[0]

    if (firstKItem.get) {
      if (firstKItem.get('Type').toString() === '/MCR' && firstKItem.get('MCID')?.toString() === mcid) {
        return node
      }
    }

    for (const child of node.properties.get('K')) {
      const r = findInNode(child.object)
      if (r) {
        return r
      }
    }
  }
  const docStructTreeRoot = doc.catalog.properties.get('StructTreeRoot').object
  const firstNodes = docStructTreeRoot.properties.get('K').object.properties.get('K')
  for (const node of firstNodes) {
    const r = findInNode(node.object)
    if (r) {
      return r
    }
  }
}
