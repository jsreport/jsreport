// resolve references in json specified by $ref and $id attribute, this is handy when user send cycles in json
module.exports = function (json) {
  if (typeof json === 'string') {
    json = JSON.parse(json)
  }

  const byid = {} // all objects by id
  const refs = [] // references to objects that could not be resolved
  json = (function recurse (obj, prop, parent) {
    if (typeof obj !== 'object' || !obj) { // a primitive value
      return obj
    }
    if (Object.prototype.toString.call(obj) === '[object Array]') {
      for (let i = 0; i < obj.length; i++) {
        if (obj[i] === null) {
          continue
        }

        if (Object.prototype.hasOwnProperty.call(obj[i], '$ref')) {
          obj[i] = recurse(obj[i], i, obj)
        } else {
          obj[i] = recurse(obj[i], prop, obj)
        }
      }
      return obj
    }

    if ('$ref' in obj) { // a reference
      const ref = obj.$ref
      if (ref in byid) {
        return byid[ref]
      }
      // else we have to make it lazy:
      refs.push([parent, prop, ref])
      return
    } else if ('$id' in obj) {
      const id = obj.$id
      delete obj.$id
      if ('$values' in obj) { // an array
        obj = obj.$values.map(recurse)
      } else { // a plain object
        for (const p in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, p)) {
            obj[p] = recurse(obj[p], p, obj)
          }
        }
      }
      byid[id] = obj
    }

    return obj
  })(json) // run it!

  for (let i = 0; i < refs.length; i++) { // resolve previously unknown references
    const ref = refs[i]
    ref[0][ref[1]] = byid[ref[2]]
    // Notice that this throws if you put in a reference at top-level
  }
  return json
}
