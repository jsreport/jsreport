
export function textAsHtmlParts (textOrBuffer) {
  return ['<pre style="word-wrap: break-word; white-space: pre-wrap;">', textOrBuffer, '</pre>']
}

export function toFile (reportFileInfo) {
  // we render text as html because when you send text to preview the browser
  // inject some color scheme tag that mess with colors rendered, it is fixed
  // if you render html instead
  const targetContent = reportFileInfo.contentType === 'text/plain' ? textAsHtmlParts(reportFileInfo.rawData.buffer) : [reportFileInfo.rawData.buffer]
  const targetContentType = reportFileInfo.contentType === 'text/plain' ? 'text/html' : reportFileInfo.contentType

  return new window.File(targetContent, reportFileInfo.filename, {
    type: targetContentType
  })
}
