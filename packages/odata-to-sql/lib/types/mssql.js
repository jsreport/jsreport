module.exports = {
  'Edm.String': (attributes) => 'varchar(max)',
  'Edm.DateTimeOffset': (attributes) => 'datetime2(2)',
  'Edm.Boolean': (attributes) => 'bit',
  'Edm.Int32': (attributes) => 'integer',
  'Edm.Int64': (attributes) => 'bigint',
  'Edm.Decimal': (attributes) => 'decimal(18,4)',
  'Edm.Binary': (attributes) => 'varbinary(max)'
}
