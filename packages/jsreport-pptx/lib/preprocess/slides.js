const regexp = /{{pptxSlides [^{}]{0,500}}}/

module.exports = (files) => {
  for (const f of files.filter(f => f.path.includes('ppt/slides/slide'))) {
    const doc = f.doc
    const elements = doc.getElementsByTagName('a:t')

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]

      if (el.textContent.includes('{{pptxSlides')) {
        const pptxSlidesCall = el.textContent.match(regexp)[0]
        el.textContent = el.textContent.replace(regexp, '')

        const startFake = doc.createElement('pptxRemove')
        startFake.textContent = pptxSlidesCall.replace('{{', '{{#')

        const endFake = doc.createElement('pptxRemove')
        endFake.textContent = '{{/pptxSlides}}'

        const pSld = doc.getElementsByTagName('p:sld')[0]
        const containerEl = doc.createElement('container')

        // code to replace the document element to another container
        containerEl.appendChild(startFake)
        containerEl.appendChild(pSld)
        containerEl.appendChild(endFake)

        doc.appendChild(containerEl)

        if (el.textContent === '') {
          const toRemove = el.parentNode.parentNode.parentNode.parentNode
          toRemove.parentNode.removeChild(toRemove)
        }
      } else if (el.textContent.includes('{{#pptxSlides')) {
        throw new Error('pptxSlides helper must be called as a simple helper call "{{pptxSlides ...}}", block helper call "{{#pptxSlides ...}}" is not supported')
      }
    }
  }
}
