var _ = require('lodash')
module.exports = function (table, options) {
  var query

  options = _.extend({
    $orderBy: {},
    $select: {},
    $filter: {}
  }, options)

  query = table.select(table.star().count())
  query = query.from(table)

  for (var filter in options.$filter) {
    query = query.where(table[filter].equals(options.$filter[filter]))
  }

  return query.toQuery()
}
