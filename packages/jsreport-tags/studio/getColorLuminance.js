import hexToRgb from './hexToRgb'

export default (hex) => {
  const rgb = hexToRgb(hex)

  let RsRGB, GsRGB, BsRGB, R, G, B

  RsRGB = rgb.r / 255
  GsRGB = rgb.g / 255
  BsRGB = rgb.b / 255

  if (RsRGB <= 0.03928) {
    R = RsRGB / 12.92
  } else {
    R = Math.pow(((RsRGB + 0.055) / 1.055), 2.4)
  }

  if (GsRGB <= 0.03928) {
    G = GsRGB / 12.92
  } else {
    G = Math.pow(((GsRGB + 0.055) / 1.055), 2.4)
  }

  if (BsRGB <= 0.03928) {
    B = BsRGB / 12.92
  } else {
    B = Math.pow(((BsRGB + 0.055) / 1.055), 2.4)
  }

  return (0.2126 * R) + (0.7152 * G) + (0.0722 * B)
}
