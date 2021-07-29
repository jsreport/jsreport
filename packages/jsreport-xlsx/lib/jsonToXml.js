const convertAttributes = (obj) => {
  let xml = ''

  if (obj.$) {
    // eslint-disable-next-line no-unused-vars
    for (const attrKey in obj.$) {
      xml += ` ${attrKey}="${convertEntitiesInAttr(obj.$[attrKey])}"`
    }
  }

  return xml
}

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '=': '&#x3D;'
}

const convertEntitiesInAttr = (str) => {
  if (!str) {
    return str
  }

  return str.replace(/[<>&'"](?!(amp;|lt;|gt;|quot;|#x27;|#x2F;|#x3D;))/g, (s) => {
    return entityMap[s]
  })
}

const convertEntitiesInValue = (str) => {
  if (!str) {
    return str
  }

  // the '" is valid in xml node value, so we don't escape it unlike in attribute values
  return str.replace(/[<>&](?!(amp;|lt;|gt;|quot;|#x27;|#x2F;|#x3D;))/g, (s) => {
    return entityMap[s]
  })
}

module.exports = (o) => {
  const files = []

  const convertBody = (obj) => {
    if (obj == null) {
      return ''
    }

    if (typeof obj === 'string') {
      return convertEntitiesInValue(obj.toString())
    }

    let xml = ''

    // eslint-disable-next-line no-unused-vars
    for (const key in obj) {
      if (obj[key] == null || key === '$') {
        continue
      }

      let body = ''

      if (Array.isArray(obj[key])) {
        for (let i = 0; i < obj[key].length; i++) {
          if (obj[key][i].$$ != null) {
            files.push(obj[key][i].$$)
            xml += '&&'
            continue
          }

          if (Object.keys(obj[key][i]).length > 1 || Object.keys(obj[key][i])[0] !== '$') {
            body = convertBody(obj[key][i])
            xml += '<' + key + convertAttributes(obj[key][i])
            xml += body != null ? (`>${body}</${key}>\n`) : '/>'
          } else {
            xml += `<${key}${convertAttributes(obj[key][i])}/>`
          }
        }

        continue
      }

      if (key === '_') {
        if (obj[key] !== '') {
          return convertEntitiesInValue(obj[key].toString())
        }
        continue
      }

      xml += '<' + key

      xml += convertAttributes(obj[key])
      body = convertBody(obj[key])
      xml += body != null ? (`>${body}</${key}>`) : '/>'
    }

    return xml
  }

  return {
    xml: '<?xml version="1.0" encoding="UTF-8"?>\n' + convertBody(o),
    files: files
  }
}
