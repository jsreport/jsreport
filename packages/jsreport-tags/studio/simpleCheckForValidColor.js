const HEX_COLOR_REGEXP = /^#[0-9A-F]{6}$/i

const simpleCheckForValidColor = (color) => {
  return HEX_COLOR_REGEXP.test(color)
}

export default simpleCheckForValidColor
