module.exports = function(doc, { font }) {
  const txt1 = doc.text('foo', { font: font.afm.monoRegular })
                 .append('bar', { font: font.afm.monoBold })
                 .append('_')

  for (let i = 0; i < 100; ++i) {
    txt1.add('.')
  }

  const txt2 = doc.text('foo', { font: font.afm.monoRegular, textAlign: 'center' })
                 .append('bar', { font: font.afm.monoBold })
                 .append('_')

  for (let i = 0; i < 30; ++i) {
    txt2.add('.')
  }
}
