module.exports = {
  'Edm.String': (attributes) => 'varchar(10241024)',
  'Edm.DateTimeOffset': (attributes) => 'timestamp',
  'Edm.Boolean': (attributes) => 'boolean',
  'Edm.Int32': (attributes) => 'integer',
  'Edm.Int64': (attributes) => 'bigint',
  'Edm.Decimal': (attributes) => 'decimal(18,4)',
  'Edm.Binary': (attributes) => 'bytea'
}
