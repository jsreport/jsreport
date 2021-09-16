module.exports = function(doc, { lorem, font }) {
  doc.text('AVA')
  doc.text('A').append('VA')

  // alignment
  doc.text('AVA\n_ V _', { textAlign: 'center' })
  doc.text('AVA\n_ A', { textAlign: 'right' })
  doc.text('AVA ' + lorem.short, { textAlign: 'justify' })

  // break long
  doc.text('AVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAV')

  // OTF font

  doc.text('AVA', { font: font.opensans.regular })
  doc.text('A', { font: font.opensans.regular }).append('VA', { font: font.opensans.regular })

  // alignment
  doc.text('AVA\n_ V _', { textAlign: 'center', font: font.opensans.regular })
  doc.text('AVA\n_ A', { textAlign: 'right', font: font.opensans.regular })
  doc.text('AVA ' + lorem.short, { textAlign: 'justify', font: font.opensans.regular })

  // break long
  doc.text('AVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAVAV', { font: font.opensans.regular })
}
