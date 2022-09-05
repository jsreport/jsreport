let Objects = []

exports.parse = function (xref, lexer) {
  // lazy load, cause circular referecnes
  if (!Objects.length) {
    Objects = [
      require('./boolean'),
      require('./null'),
      require('./name'),
      require('./dictionary'), // must be tried before string!
      require('./string'),
      require('./array'),
      require('./reference'), // must be tried before number!
      require('./number')
    ]
  }

  // try
  for (let i = 0; i < Objects.length; ++i) {
    const value = Objects[i].parse(xref, lexer, true)
    if (value !== undefined) {
      return value
    }
  }

  lexer._error('Invalid value:' + lexer.getString(100))
  return undefined
}
