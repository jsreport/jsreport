const { nodeListToArray } = require('../utils')
const { DOMParser } = require('@xmldom/xmldom')

module.exports = (files) => {
  const contentTypeDoc = files.find(f => f.path === '[Content_Types].xml').doc
  const presentationRels = files.find(f => f.path === 'ppt/_rels/presentation.xml.rels').doc
  const presentation = files.find(f => f.path === 'ppt/presentation.xml').doc

  // we start with slide ids at very high value to avoid collision with existing
  let slideNumber = 5000

  for (const file of files.filter(f => f.path.includes('ppt/slides/slide'))) {
    const doc = file.doc
    const slides = nodeListToArray(doc.getElementsByTagName('p:sld'))
    const originalSlideNumber = parseInt(file.path.replace('ppt/slides/slide', '').replace('.xml', ''))

    const cleanup = () => {
      if (slides.length === 0) {
        return
      }

      // removing the container to the original slide
      if (doc.documentElement.localName === 'container') {
        doc.replaceChild(slides[0], doc.documentElement)
      }
    }

    if (slides.length <= 1) {
      cleanup()
      continue
    }

    const defSlidePath = file.path.substring('ppt/'.length)
    const presentationRelEls = nodeListToArray(presentationRels.getElementsByTagName('Relationships')[0].getElementsByTagName('Relationship'))
    const defSlideRId = presentationRelEls.find(e => e.getAttribute('Target') === defSlidePath).getAttribute('Id')
    const sldIdEls = nodeListToArray(presentation.getElementsByTagName('p:sldIdLst')[0].getElementsByTagName('p:sldId'))
    const defSldIdEl = sldIdEls.find((e) => e.getAttribute('r:id') === defSlideRId)
    const sldIdElAfterSeq = defSldIdEl.nextSibling
    const originalSlideRelsFile = files.find(f => f.path === `ppt/slides/_rels/slide${originalSlideNumber}.xml.rels`)

    const extraElsToClone = [{
      name: 'comment',
      namespace: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments'
    }, {
      name: 'notesSlide',
      namespace: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide'
    }]

    for (let i = 1; i < slides.length; i++) {
      slideNumber++

      const newSlideDoc = new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${slides[i].toString()}`)

      // this attribute is going to be removed later as some of the last steps of postprocess
      newSlideDoc.documentElement.setAttribute('originalSlideNumber', originalSlideNumber)

      files.push({
        path: `ppt/slides/slide${slideNumber}.xml`,
        doc: newSlideDoc
      })

      const slideRelsDoc = new DOMParser().parseFromString(originalSlideRelsFile.data)

      files.push({
        path: `ppt/slides/_rels/slide${slideNumber}.xml.rels`,
        doc: slideRelsDoc
      })

      slides[i].parentNode.removeChild(slides[i])

      const sldIdEl = presentation.createElement('p:sldId')
      sldIdEl.setAttribute('id', slideNumber)// I have no clue what is this id, so I put there also slideNumber
      sldIdEl.setAttribute('r:id', `rId${slideNumber}`)
      presentation.getElementsByTagName('p:sldIdLst')[0].insertBefore(sldIdEl, sldIdElAfterSeq)

      const overrideEl = contentTypeDoc.createElement('Override')
      overrideEl.setAttribute('PartName', `/ppt/slides/slide${slideNumber}.xml`)
      overrideEl.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml')
      contentTypeDoc.getElementsByTagName('Types')[0].appendChild(overrideEl)

      const relationship = contentTypeDoc.createElement('Relationship')
      relationship.setAttribute('Id', `rId${slideNumber}`)
      relationship.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide')
      relationship.setAttribute('Target', `slides/slide${slideNumber}.xml`)
      presentationRels.getElementsByTagName('Relationships')[0].appendChild(relationship)

      for (const extraEl of extraElsToClone) {
        const extraElFile = files.find(f => f.path === `ppt/${extraEl.name}s/${extraEl.name}${originalSlideNumber}.xml`)
        const extraElRelFile = files.find(f => f.path === `ppt/${extraEl.name}s/_rels/${extraEl.name}${originalSlideNumber}.xml.rels`)

        if (extraElFile) {
          files.push({
            path: `ppt/${extraEl.name}s/${extraEl.name}${slideNumber}.xml`,
            doc: extraElFile.doc
          })

          const slideRelationships = nodeListToArray(slideRelsDoc.getElementsByTagName('Relationships')[0].getElementsByTagName('Relationship'))
          const extraElRelEl = slideRelationships.find(r => r.getAttribute('Type') === extraEl.namespace)
          extraElRelEl.setAttribute('Target', `../${extraEl.name}s/${extraEl.name}${slideNumber}.xml`)

          if (extraElRelFile) {
            const extraElRelDoc = new DOMParser().parseFromString(extraElRelFile.data)

            const extraElRelationships = nodeListToArray(extraElRelDoc.getElementsByTagName('Relationships')[0].getElementsByTagName('Relationship'))
            const slideRelEl = extraElRelationships.find(r => r.getAttribute('Type') === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide')
            slideRelEl.setAttribute('Target', `../slides/slide${slideNumber}.xml`)

            files.push({
              path: `ppt/${extraEl.name}s/_rels/${extraEl.name}${slideNumber}.xml.rels`,
              doc: extraElRelDoc
            })
          }
        }
      }
    }

    cleanup()
  }
}
