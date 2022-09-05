const PDFSecurity = require('./security/security')
const PDF = require('../../object')

module.exports = (doc) => {
  doc.getEncryptFn = (oid) => (v) => v

  doc.id = PDFSecurity.generateFileID({ CreationDate: new Date() })

  doc.trailerFinalizers.push(() => {
    doc.trailer.set('ID', new PDF.Array([new PDF.String(doc.id), new PDF.String(doc.id)]))
  })

  doc.encrypt = (options) => {
    const security = PDFSecurity.create({
      _id: doc.id,
      ref: (d) => d
    }, {
      userPassword: options.password,
      ownerPassword: options.ownerPassword,
      pdfVersion: '1.4',
      permissions: options.permissions
    })

    doc.getEncryptFn = (oid) => security.getEncryptFn(oid)

    const securityObject = new PDF.Object()
    securityObject.properties.set('Length', security.dictionary.Length)
    securityObject.properties.set('Filter', security.dictionary.Filter)
    securityObject.properties.set('V', security.dictionary.V)
    securityObject.properties.set('R', security.dictionary.R)
    securityObject.properties.set('O', new PDF.String(security.dictionary.O))
    securityObject.properties.set('U', new PDF.String(security.dictionary.U))
    securityObject.properties.set('P', security.dictionary.P)

    doc.finalizers.push(() => doc._writeObject(securityObject))

    doc.trailerFinalizers.push(() => {
      doc.trailer.set('Encrypt', securityObject.toReference())
    })
  }
}
