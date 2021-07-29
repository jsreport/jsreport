import beautify from 'js-beautify-jsreport'

function reformatter (code, mode) {
  return beautify[mode](code || '', {
    unformatted: ['script']
  })
}

export default reformatter
