const { External } = require('@jsreport/pdfjs')

function parseGroup (text, hiddenPageFields) {
  let id = null

  // we need to consider spaces in the string because in other OS the parsed text
  // can gives us string with space between the letters
  const regexp = /g[ ]?r[ ]?o[ ]?u[ ]?p[ ]?@[ ]?@[ ]?@([^@]*)@[ ]?@[ ]?@/gm
  let match = regexp.exec(text)

  while (match != null) {
    if (match.length < 1) {
      return id
    }

    if (match[1] != null && match[1] !== '') {
      id = match[1].replace(/[ ]/g, '')
    }

    match = regexp.exec(text)
  }

  if (id == null) {
    return null
  }

  const f = hiddenPageFields[id]

  if (!f) {
    return null
  }

  return JSON.parse(Buffer.from(f, 'base64').toString())
}

function parseItems (text, hiddenPageFields) {
  // we need to consider spaces in the string because in other OS the parsed text
  // can gives us string with space between the letters
  const regexp = /i[ ]?t[ ]?e[ ]?m[ ]?@[ ]?@[ ]?@([^@]*)@[ ]?@[ ]?@/g
  let match = regexp.exec(text)

  const items = []

  while (match != null) {
    if (match.length < 1) {
      return items
    }

    if (match[1] != null && match[1] !== '') {
      const id = match[1].replace(/[ ]/g, '')
      const f = hiddenPageFields[id]

      if (!f) {
        return null
      }

      items.push(JSON.parse(Buffer.from(f, 'base64').toString()))
    }

    match = regexp.exec(text)
  }

  return items
}

module.exports = async (contentBuffer, {
  hiddenPageFields = {},
  includeText = false,
  password = null
}) => {
  let pages = null
  try {
    const ext = new External(contentBuffer)
    pages = await ext.parseText()
  } catch (e) {
    // keep the back compatibility and avoid hard crash on pdf parse
    console.warn('Failed to parse pdf. Items, groups and text isn\'t filled: ' + e)

    return {
      pages: [{
        items: []
      }]
    }
  }

  let lastGroup

  const result = { pages: [] }
  for (const text of pages) {
    const parsedGroup = parseGroup(text, hiddenPageFields)
    const page = {
      group: parsedGroup == null ? lastGroup : parsedGroup,
      items: parseItems(text, hiddenPageFields)
    }
    lastGroup = page.group

    if (includeText) {
      page.text = text
    }

    result.pages.push(page)
  }

  return result
}
