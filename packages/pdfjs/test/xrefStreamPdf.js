// generates a small valid PDF whose cross-reference is a FlateDecode xref stream (ISO 32000-1 7.5.8)
// with catalog and pages tree stored inside an object stream (/ObjStm), so both type 1 (offset)
// and type 2 (compressed) xref entries are used.
//
// object numbers listed in "gaps" are skipped, so the xref stream /Index contains one range
// per run of consecutive object numbers, e.g. the defaults produce a single page document with
// /Index [0 3 4 5] (object 3 is not present).
//
// options:
// - pageCount: number of pages, page N has MediaBox width 600 + N so the page order can be checked
// - compressedPages: how many of the last pages are stored inside the object stream (type 2 entries)
// - gaps: object numbers that are not used
// - omitIndex: do not write /Index (the default [0 Size] is used by readers)
// - w: the /W field widths, a zero width means the field is not written (the type defaults to 1, the generation to 0)
// - useObjStm: store catalog and pages tree in an object stream, when false all objects are regular (type 1) objects
// - unknownTypeIds: object numbers written as entries with type 3, which readers shall treat as references to the null object
//
// the fixtures in jsreport-pdf-utils/test were produced with:
// fs.writeFileSync('xref-stream-index-ranges.pdf', createXrefStreamPdf())
// fs.writeFileSync('xref-stream-index-ranges-multipage.pdf', createXrefStreamPdf(createXrefStreamPdf.multiPageOptions))
const zlib = require('zlib')

const multiPageOptions = { pageCount: 3, compressedPages: 1, gaps: [3, 9] }

module.exports = function createXrefStreamPdf ({
  pageCount = 1,
  compressedPages = 0,
  gaps = [3],
  omitIndex = false,
  w = [1, 4, 2],
  useObjStm = true,
  unknownTypeIds = []
} = {}) {
  if (compressedPages > pageCount) {
    throw new Error('compressedPages can not be greater than pageCount')
  }

  if (!useObjStm && compressedPages > 0) {
    throw new Error('compressedPages requires useObjStm')
  }

  if (w[0] === 0 && (useObjStm || unknownTypeIds.length > 0)) {
    throw new Error('without the type field all entries are type 1, useObjStm and unknownTypeIds are not supported')
  }

  let nextId = 1

  const allocateId = () => {
    while (gaps.includes(nextId)) {
      nextId++
    }

    return nextId++
  }

  const contentIds = []

  for (let i = 0; i < pageCount; i++) {
    contentIds.push(allocateId())
  }

  const infoId = allocateId()
  const objStmId = useObjStm ? allocateId() : null
  const plainPageIds = []

  for (let i = 0; i < pageCount - compressedPages; i++) {
    plainPageIds.push(allocateId())
  }

  const catalogId = allocateId()
  const pagesId = allocateId()
  const compressedPageIds = []

  for (let i = 0; i < compressedPages; i++) {
    compressedPageIds.push(allocateId())
  }

  const xrefId = allocateId()
  const pageIds = [...plainPageIds, ...compressedPageIds]

  const chunks = []
  let length = 0
  const offsets = {}

  const write = (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'latin1')
    chunks.push(buf)
    length += buf.length
  }

  const writeObject = (id, dict, streamData) => {
    offsets[id] = length

    if (streamData == null) {
      write(`${id} 0 obj\n${dict}\nendobj\n`)
      return
    }

    write(`${id} 0 obj\n${dict}\nstream\n`)
    write(streamData)
    write('\nendstream\nendobj\n')
  }

  const pageDict = (pageIdx) => {
    return `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${600 + pageIdx + 1} 792] /Resources << >> /Contents ${contentIds[pageIdx]} 0 R >>`
  }

  write('%PDF-1.6\n%\xe2\xe3\xcf\xd3\n')

  contentIds.forEach((id, pageIdx) => {
    const content = zlib.deflateSync(Buffer.from(`0 0 1 rg 100 100 ${200 + pageIdx} 200 re f\n`, 'latin1'))
    writeObject(id, `<< /Length ${content.length} /Filter /FlateDecode >>`, content)
  })

  writeObject(infoId, '<< /Producer (xref stream index ranges test) >>')

  // the objects compressed in the object stream
  const compressed = [
    [catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`],
    [pagesId, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`],
    ...compressedPageIds.map((id, idx) => [id, pageDict(plainPageIds.length + idx)])
  ]

  if (useObjStm) {
    let objStmBody = ''
    const objStmHeader = []

    for (const [id, body] of compressed) {
      objStmHeader.push(`${id} ${objStmBody.length}`)
      objStmBody += body + '\n'
    }

    const objStmHeaderStr = objStmHeader.join(' ') + '\n'
    const objStmData = zlib.deflateSync(Buffer.from(objStmHeaderStr + objStmBody, 'latin1'))

    writeObject(
      objStmId,
      `<< /Type /ObjStm /N ${compressed.length} /First ${objStmHeaderStr.length} /Length ${objStmData.length} /Filter /FlateDecode >>`,
      objStmData
    )
  } else {
    for (const [id, body] of compressed) {
      writeObject(id, body)
    }
  }

  plainPageIds.forEach((id, pageIdx) => writeObject(id, pageDict(pageIdx)))

  // xref stream entries [type, field 2, field 3]
  const entries = new Map()

  // without the type field the free entry of object 0 can not be written, the /Index then starts at 1
  if (w[0] !== 0) {
    entries.set(0, [0, 0, 65535])
  }

  for (const id of [...contentIds, infoId, ...plainPageIds]) {
    entries.set(id, [1, offsets[id], 0])
  }

  if (useObjStm) {
    entries.set(objStmId, [1, offsets[objStmId], 0])
    compressed.forEach(([id], ix) => entries.set(id, [2, objStmId, ix]))
  } else {
    compressed.forEach(([id]) => entries.set(id, [1, offsets[id], 0]))
  }

  for (const id of unknownTypeIds) {
    entries.set(id, [3, 0, 0])
  }

  const xrefOffset = length
  entries.set(xrefId, [1, xrefOffset, 0])

  const sortedIds = [...entries.keys()].sort((a, b) => a - b)
  const size = sortedIds[sortedIds.length - 1] + 1

  // one /Index sub-section per run of consecutive object numbers
  const index = []

  for (const id of sortedIds) {
    if (index.length > 0 && index[index.length - 2] + index[index.length - 1] === id) {
      index[index.length - 1]++
    } else {
      index.push(id, 1)
    }
  }

  // fields are written big-endian, a field with zero width is not written
  const rows = sortedIds.map((id) => {
    const fields = entries.get(id)
    const row = Buffer.alloc(w[0] + w[1] + w[2])
    let pos = 0

    fields.forEach((value, fieldIdx) => {
      if (w[fieldIdx] > 0) {
        row.writeUIntBE(value, pos, w[fieldIdx])
        pos += w[fieldIdx]
      }
    })

    return row
  })

  const xrefData = zlib.deflateSync(Buffer.concat(rows))
  const indexStr = omitIndex ? '' : ` /Index [${index.join(' ')}]`

  writeObject(
    xrefId,
    `<< /Type /XRef /Size ${size}${indexStr} /W [${w.join(' ')}] /Root ${catalogId} 0 R /Info ${infoId} 0 R /Length ${xrefData.length} /Filter /FlateDecode >>`,
    xrefData
  )

  write(`startxref\n${xrefOffset}\n%%EOF\n`)

  return Buffer.concat(chunks)
}

module.exports.multiPageOptions = multiPageOptions
