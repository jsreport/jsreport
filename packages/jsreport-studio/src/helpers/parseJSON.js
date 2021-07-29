const iso = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/

export default (str) => {
  if (!str) {
    return str
  }

  if (typeof str !== 'string') {
    return str
  }

  return JSON.parse(str, (k, v) => {
    if (v && typeof v === 'string' && iso.test(v)) {
      return new Date(Date.parse(v))
    }

    return v
  })
}
