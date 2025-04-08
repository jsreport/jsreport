/* eslint-disable no-unused-vars, no-var */
function conversion () {
  var tables = document.querySelectorAll('table')
  var tablesOutput = []
  var i

  if (tables.length === 0) {
    return tablesOutput
  }

  var tableNames = []
  var tablesWithoutName = []

  function evaluateRow (row) {
    var rowResult = []
    var isPlaceholder = row.dataset != null ? row.dataset.rowsPlaceholder != null : false

    if (isPlaceholder) {
      return { id: row.id, files: row.dataset.files === '' ? [] : row.dataset.files.split(',') }
    }

    for (var c = 0, m = row.cells.length; c < m; c++) {
      var cell = row.cells[c]
      var cs = document.defaultView.getComputedStyle(cell, null)
      var type = cell.dataset.cellType != null && cell.dataset.cellType !== '' ? cell.dataset.cellType.toLowerCase() : undefined
      var formatStr = cell.dataset.cellFormatStr != null ? cell.dataset.cellFormatStr : undefined
      var formatEnum = cell.dataset.cellFormatEnum != null && !isNaN(parseInt(cell.dataset.cellFormatEnum, 10)) ? parseInt(cell.dataset.cellFormatEnum, 10) : undefined
      var inlineStyles = parseStyle(cell.getAttribute('style'))

      rowResult.push({
        type: type,
        // returns the html inside the td element with special html characters like "&" escaped to &amp;
        value: cell.innerHTML,
        // returns just the real text inside the td element with special html characters like "&" left as it is
        valueText: cell.innerText,
        formatStr: formatStr,
        formatEnum: formatEnum,
        backgroundColor: cs.getPropertyValue('background-color').match(/\d+/g),
        foregroundColor: cs.getPropertyValue('color').match(/\d+/g),
        fontFamily: cs.getPropertyValue('font-family').replace(/["']/g, ''),
        fontSize: cs.getPropertyValue('font-size'),
        fontStyle: cs.getPropertyValue('font-style'),
        fontWeight: cs.getPropertyValue('font-weight'),
        // we take transform as inline style value because computed style does not return
        // the original style instead it returns the transformed value in form of
        // matrix(.., .., .., etc)
        transform: inlineStyles.transform,
        textDecoration: {
          line: cs.getPropertyValue('text-decoration').split(' ')[0]
        },
        // we parse writing-mode from inline styles first because some of its values
        // are not fully supported for all browsers (even on latest versions of Chrome)
        // so we instead take the value from the style attribute because computed style does
        // not return the original style if it is not supported by the browser
        writingMode: inlineStyles['writing-mode'] != null ? inlineStyles['writing-mode'] : cs.getPropertyValue('writing-mode'),
        // phantomjs does not return text-orientation from computed style, we need to take
        // it from the style attribute
        textOrientation: inlineStyles['text-orientation'],
        verticalAlign: cs.getPropertyValue('vertical-align'),
        horizontalAlign: cs.getPropertyValue('text-align'),
        wrapText: cs.getPropertyValue('overflow'),
        width: cell.clientWidth,
        height: cell.clientHeight,
        rowspan: cell.rowSpan,
        colspan: cell.colSpan,
        border: {
          top: cs.getPropertyValue('border-top-style'),
          topColor: cs.getPropertyValue('border-top-color').match(/\d+/g),
          topStyle: cs.getPropertyValue('border-top-style'),
          topWidth: cs.getPropertyValue('border-top-width'),
          right: cs.getPropertyValue('border-right-style'),
          rightColor: cs.getPropertyValue('border-right-color').match(/\d+/g),
          rightStyle: cs.getPropertyValue('border-right-style'),
          rightWidth: cs.getPropertyValue('border-right-width'),
          bottom: cs.getPropertyValue('border-bottom-style'),
          bottomColor: cs.getPropertyValue('border-bottom-color').match(/\d+/g),
          bottomStyle: cs.getPropertyValue('border-bottom-style'),
          bottomWidth: cs.getPropertyValue('border-bottom-width'),
          left: cs.getPropertyValue('border-left-style'),
          leftColor: cs.getPropertyValue('border-left-color').match(/\d+/g),
          leftStyle: cs.getPropertyValue('border-left-style'),
          leftWidth: cs.getPropertyValue('border-left-width')
        }
      })
    }

    return rowResult
  }

  function parseStyle (styleStr) {
    var style = {}
    var styleText = styleStr == null ? '' : styleStr

    var styleArr = styleText.split(';').filter(function (value) {
      return value.trim() !== ''
    })

    for (var i = 0; i < styleArr.length; i++) {
      var parsed = styleArr[i].split(':')
      var propName = parsed[0]
      var propValue = parsed[1]

      if (propName == null || propValue == null) {
        continue
      }

      propName = parsed[0].trim()
      propValue = parsed[1].trim()

      if (propName === '' || propValue === '') {
        continue
      }

      style[propName] = propValue
    }

    return style
  }

  for (i = 0; i < tables.length; i++) {
    var table = tables[i]
    var tableOut = { rows: [] }
    var nameAttr = table.getAttribute('name')
    var dataSheetName = table.dataset.sheetName
    var dataIgnoreName = table.dataset.ignoreSheetName

    if (dataIgnoreName == null) {
      if (dataSheetName != null) {
        tableOut.name = dataSheetName
      } else if (nameAttr != null) {
        tableOut.name = nameAttr
      }
    }

    if (tableOut.name == null) {
      tablesWithoutName.push(tableOut)
    } else {
      tableNames.push(tableOut.name)
    }

    for (var r = 0, n = table.rows.length; r < n; r++) {
      tableOut.rows.push(evaluateRow(table.rows[r]))
      table.evaluateRow = evaluateRow
    }

    tablesOutput.push(tableOut)
  }

  var currentIndex = 0
  var targetTableName

  for (i = 0; i < tablesWithoutName.length; i++) {
    do {
      currentIndex++
      targetTableName = 'Sheet' + currentIndex
    } while (tableNames.indexOf(targetTableName) !== -1)

    tablesWithoutName[i].name = targetTableName
  }

  if (tablesOutput.length === 1) {
    return tablesOutput[0]
  }

  return tablesOutput
}
