function getOperation (el, obj) {
  if (operations[el]) {
    return operations[el]
  }

  if (obj != null) {
    for (var key in operations) {
      if (obj[key]) {
        return operations[key]
      }
    }
  }

  return eq
}

function gt (table, col, el, v, entityType) {
  return table[col].gt(v.$gt)
}

function gte (table, col, el, v, entityType) {
  return table[col].gte(v.$gte)
}

function lt (table, col, el, v, entityType) {
  return table[col].lt(v.$lt)
}

function lte (table, col, el, v, entityType) {
  return table[col].lte(v.$lte)
}

function eq (table, col, el, v, entityType) {
  if (entityType[el].complexType) {
    if (v == null) {
      // we check that all columns on complex prop are null in case the root prop is null
      let sq
      for (const prop in entityType[el].complexType) {
        const op = table[el + '_' + prop].isNull()
        sq = sq == null ? op : sq.and(op)
      }
      return sq
    }

    let sq
    for (const pp in entityType[el].complexType) {
      if (typeof v[pp] !== 'undefined') {
        const op = getOperation(pp, v[pp])(table, el + '_' + pp, pp, v[pp], entityType[el].complexType)
        sq = sq == null ? op : sq.and(op)
      }
    }
    return sq
  }

  if (v == null) {
    return table[col].isNull()
  }

  if (entityType[el].isPrimitive) {
    return table[col].equals(v)
  } else {
    return table[col].like('%' + v + '%')
  }
}

function and (table, col, el, v, entityType) {
  let cq
  for (const andV of v) {
    const sq = filterObject(table, andV, entityType)
    cq = cq == null ? sq : cq.and(sq)
  }
  return cq
}

function or (table, col, el, v, entityType) {
  let cq
  for (const orV of v) {
    const sq = filterObject(table, orV, entityType)
    cq = cq == null ? sq : cq.or(sq)
  }
  return cq
}

function inFn (table, col, el, v, entityType) {
  return table[el].in(v.$in)
}

function filterObject (table, filter, entityType) {
  let cq
  for (const el in filter) {
    const sq = getOperation(el, filter[el])(table, el, el, filter[el], entityType)
    cq = cq == null ? sq : cq.and(sq)
  }
  return cq
}

module.exports = function (query, table, filter, entityType) {
  if (!Object.keys(filter).length) {
    return query
  }

  return query.where(filterObject(table, filter, entityType))
}

var operations = {
  $gt: gt,
  $gte: gte,
  $lt: lt,
  $lte: lte,
  $and: and,
  $or: or,
  $in: inFn
}
