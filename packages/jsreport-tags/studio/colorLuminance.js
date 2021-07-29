
export default (hex, lum) => {
  const selectedLum = lum || 0
  let selectedHex

  selectedHex = String(hex).replace(/[^0-9a-f]/gi, '')

  if (selectedHex.length < 6) {
    selectedHex = selectedHex[0] + selectedHex[0] + selectedHex[1] + selectedHex[1] + selectedHex[2] + selectedHex[2]
  }

  // convert to decimal and change luminosity
  let rgb = '#'
  let c
  let i

  for (i = 0; i < 3; i++) {
    c = parseInt(selectedHex.substr(i * 2, 2), 16)
    c = Math.round(Math.min(Math.max(0, c + (c * selectedLum)), 255)).toString(16)
    rgb += ('00' + c).substr(c.length)
  }

  return rgb
}
