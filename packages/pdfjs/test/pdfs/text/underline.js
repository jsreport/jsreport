module.exports = function(doc, { lorem, font }) {
  { // afm
    const text = doc.text()
    text.add(lorem.shorter, { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true })
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar', { underline: true })
  }

  { // otf
    const text = doc.text({ font: font.opensans.regular, fontSize: 9.5 })
    text.add(lorem.shorter, { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { underline: true })
    text.add('foobar')
    text.add('foobar', { underline: true })
    text.add('foobar', { underline: true, fontSize: 18 })
    text.add('foobar', { underline: true })
  }

  { // single word line break
    doc.text('foobar', { underline: true, fontSize: 8.5 })
    doc.text(lorem.shorter, { underline: true, fontSize: 8.5 })
  }

  { // long word
    const text = doc.text()
    text.add('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', { underline: true })
    text.add('foobar')
  }

  { // color change
    const text = doc.text()
    text.add('foo', { underline: true })
    text.add('bar', { underline: true, color: 0xff0000 })
  }

  { // append
    doc.text()
       .add('fo', { underline: true })
       .append('ob')
       .append('ar', { underline: true })
  }
}
