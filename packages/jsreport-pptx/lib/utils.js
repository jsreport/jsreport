
function pxToEMU (val) {
  return Math.round(val * 914400 / 96)
}

function cmToEMU (val) {
  // cm to dxa
  // eslint-disable-next-line no-loss-of-precision
  const dxa = val * 567.058823529411765
  // dxa to EMU
  return Math.round(dxa * 914400 / 72 / 20)
}

module.exports.contentIsXML = (content) => {
  if (!Buffer.isBuffer(content) && typeof content !== 'string') {
    return false
  }

  const str = content.toString()

  return str.startsWith('<?xml') || (/^\s*<[\s\S]*>/).test(str)
}

module.exports.nodeListToArray = (nodes) => {
  const arr = []
  for (let i = 0; i < nodes.length; i++) {
    arr.push(nodes[i])
  }
  return arr
}

module.exports.pxToEMU = pxToEMU
module.exports.cmToEMU = cmToEMU
