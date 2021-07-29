
const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i

export default (hex) => {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  let fullHex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b
  })

  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)

  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}
