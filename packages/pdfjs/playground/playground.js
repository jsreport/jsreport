const pdf = require('../')
require('whatwg-fetch')

const fonts = {
  CourierBold: require('../font/Courier-Bold.js'),
  CourierBoldOblique: require('../font/Courier-BoldOblique.js'),
  CourierOblique: require('../font/Courier-Oblique.js'),
  Courier: require('../font/Courier.js'),
  HelveticaBold: require('../font/Helvetica-Bold.js'),
  HelveticaBoldOblique: require('../font/Helvetica-BoldOblique.js'),
  HelveticaOblique: require('../font/Helvetica-Oblique.js'),
  Helvetica: require('../font/Helvetica.js'),
  Symbol: require('../font/Symbol.js'),
  TimesBold: require('../font/Times-Bold.js'),
  TimesBoldItalic: require('../font/Times-BoldItalic.js'),
  TimesItalic: require('../font/Times-Italic.js'),
  TimesRoman: require('../font/Times-Roman.js'),
  ZapfDingbats: require('../font/ZapfDingbats.js'),
}

function render(doc) {
  return doc.asBuffer()
    .then(buf => {
      const blob = new Blob([buf], { type: 'application/pdf' })
      return URL.createObjectURL(blob)
    })
}

function init(logo, opensans) {
  fonts.OpenSans = opensans

  var container = document.getElementById('editor')
  var initialValue = container.textContent
  container.textContent = ''
  container.classList.remove('hidden')
  var editor = monaco.editor.create(container, {
    value: initialValue,
    language: 'javascript',
    theme: 'vs-dark'
  })

  var debounce
  var previewEl = document.getElementById('preview')
  var errorEl = document.getElementById('error')
  var lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cum id fugiunt, re eadem quae Peripatetici, verba. Tenesne igitur, inquam, Hieronymus Rhodius quid dicat esse summum bonum, quo putet omnia referri oportere? Quia nec honesto quic quam honestius nec turpi turpius.'

  function rerender() {
    debounce = undefined
    var body = editor.getValue() + '\nreturn doc'

    try {
      var fn = new Function("pdf", "fonts", "logo", "lorem", body)
      var doc = fn(pdf, fonts, logo, lorem)

      render(doc)
        .then(function(url) {
          errorEl.classList.remove('open')
          previewEl.data = url
        })
        .catch(err => {
          console.error(err)
          errorEl.textContent = err.message
          errorEl.classList.add('open')
        })
    } catch(err) {
      console.error(err)
      errorEl.textContent = err.message
      errorEl.classList.add('open')
    }
  }

  editor.onDidChangeModelContent(function() {
    if (debounce) {
      clearTimeout(debounce)
    }
    debounce = setTimeout(rerender, 1000)
  })
  rerender()
}

window.main = function() {
  const fixtrues = [
    fetch('/logo.pdf'),
    fetch('/opensans.ttf'),
  ]
  Promise.all(fixtrues)
    .then(res => Promise.all(res.map(r => r.arrayBuffer())))
    .then(res => init(
      new pdf.Image(res[0]),
      new pdf.Font(res[1]),
    ))
}