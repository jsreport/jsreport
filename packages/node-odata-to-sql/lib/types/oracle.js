module.exports = {
  'Edm.String': (attributes) => attributes.maxLength !== 'max' ? 'varchar2(4000)' : 'clob',
  'Edm.DateTimeOffset': (attributes) => 'timestamp',
  'Edm.Boolean': (attributes) => 'number(1)',
  'Edm.Int32': (attributes) => 'number',
  'Edm.Int64': (attributes) => 'number',
  'Edm.Decimal': (attributes) => 'number(18,4)',
  'Edm.Binary': (attributes) => 'blob'
}
