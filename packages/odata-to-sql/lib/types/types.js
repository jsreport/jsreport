module.exports = function (dialect) {
  switch (dialect) {
    case 'mssql':
      return require('./mssql')
    case 'postgres':
      return require('./postgres')
    case 'oracle':
      return require('./oracle')
  }

  throw new Error('Dialect ' + dialect + ' not supproted in type mappings')
}
