module.exports = function(doc, { font }) {
  doc.header().text('Test', { font: font.afm.bold })

  doc.footer().text('Footer', { font: font.afm.mono })

  doc.text('TEST:', { fontSize: 16, font: font.afm.bold })
  doc.text().add('TE').append('ST', { font: font.afm.monoRegular })

}
