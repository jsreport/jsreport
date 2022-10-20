const PDF = require('../object')
const { formatDate } = require('../util')

module.exports = (doc) => {
  doc.catalog.prop('Info', new PDF.Object('Info').toReference())
  doc.finalizers.push(() => doc.catalog.properties.get('Info').object.prop('CreationDate', new PDF.String(formatDate(new Date()))))

  doc.info = (infoOptions) => doc.finalizers.push(() => info(doc, infoOptions))
}

function info (doc, infoOptions) {
  const infoObject = doc.catalog.properties.get('Info').object

  if (infoOptions.title) {
    infoObject.prop('Title', new PDF.String(infoOptions.title))
  }

  if (infoOptions.creationDate) {
    infoObject.prop('CreationDate', new PDF.String(formatDate(infoOptions.creationDate)))
  }

  if (infoOptions.author) {
    infoObject.prop('Author', new PDF.String(infoOptions.author))
  }

  if (infoOptions.subject) {
    infoObject.prop('Subject', new PDF.String(infoOptions.subject))
  }

  if (infoOptions.keywords) {
    infoObject.prop('Keywords', new PDF.String(infoOptions.keywords))
  }

  if (infoOptions.creator) {
    infoObject.prop('Creator', new PDF.String(infoOptions.creator))
  }

  if (infoOptions.producer) {
    infoObject.prop('Producer', new PDF.String(infoOptions.producer))
  }

  if (infoOptions.language) {
    doc.catalog.prop('Lang', new PDF.String(infoOptions.language))
  }

  if (infoOptions.custom) {
    Object.keys(infoOptions.custom).forEach(key => {
      infoObject.prop(key, new PDF.String(infoOptions.custom[key]))
    })
  }
}
