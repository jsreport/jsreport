module.exports = function(doc, { lorem, font }) {
  { // afm
    const text = doc.text()
    text.add(lorem.shorter, { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true })
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar', { strikethrough: true })
  }

  { // otf
    const text = doc.text({ font: font.opensans.regular, fontSize: 9.5 })
    text.add(lorem.shorter, { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar')
    text.add('foobar', { fontSize: 18 })
    text.add('foobar', { strikethrough: true })
    text.add('foobar')
    text.add('foobar', { strikethrough: true })
    text.add('foobar', { strikethrough: true, fontSize: 18 })
    text.add('foobar', { strikethrough: true })
  }

  { // single word line break
    doc.text('foobar', { strikethrough: true, fontSize: 8.5 })
    doc.text(lorem.shorter, { strikethrough: true, fontSize: 8.5 })
  }

  { // long word
    const text = doc.text()
    text.add('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', { strikethrough: true })
    text.add('foobar')
  }

  { // color change
    const text = doc.text()
    text.add('foo', { strikethrough: true })
    text.add('bar', { strikethrough: true, color: 0xff0000 })
  }

  { // append
    doc.text()
       .add('fo', { strikethrough: true })
       .append('ob')
       .append('ar', { strikethrough: true })
  }
}
