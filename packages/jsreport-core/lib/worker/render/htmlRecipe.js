/*!
 * Copyright(c) 2016 Jan Blaha
 *
 * Recipe running no document transformations. Just adds html response headers
 */

module.exports = function (req, res) {
  res.meta.contentType = 'text/html'
  res.meta.fileExtension = 'html'
}
