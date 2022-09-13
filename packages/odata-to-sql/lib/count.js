const _ = require('lodash')
module.exports = function (table, options) {
  let query

  options = _.extend({
    $orderBy: {},
    $select: {},
    $filter: {}
  }, options)

  query = table.select(table.star().count())
  query = query.from(table)

  for (const filter in options.$filter) {
    console.log('filter', filter)
    query = query.where(table[filter].equals(options.$filter[filter]))
  }

  return query.toQuery()
}
