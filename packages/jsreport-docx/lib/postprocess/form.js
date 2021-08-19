const { DOMParser } = require('@xmldom/xmldom')
const { serializeXml, nodeListToArray } = require('../utils')

function processCheckbox (sdtEl) {
  const checkboxEls = sdtEl.getElementsByTagName('w14:checkbox')

  if (checkboxEls.length === 0) {
    return
  }

  const aliasEls = sdtEl.getElementsByTagName('w:alias')

  if (aliasEls.length === 0) {
    return
  }

  const aliasVal = aliasEls[0].getAttribute('w:val')
  if (!aliasVal.includes('$docxCheckbox')) {
    return
  }

  let match = aliasVal.match(/\$docxCheckbox([^$]*)\$/)
  aliasEls[0].setAttribute('w:val', aliasVal.replace(match[0], ''))
  const checkboxData = JSON.parse(Buffer.from(match[1], 'base64').toString())

  const checkedEl = sdtEl.getElementsByTagName('w14:checked')[0]
  checkedEl.setAttribute('w14:val', checkboxData.value === true ? '1' : '0')

  const checkedStateChar = sdtEl.getElementsByTagName('w14:checkedState')[0].getAttribute('w14:val')
  const uncheckedStateChar = sdtEl.getElementsByTagName('w14:uncheckedState')[0].getAttribute('w14:val')

  const selectiobnCharEl = sdtEl.getElementsByTagName('w:t')[0]
  selectiobnCharEl.textContent = checkboxData.value === true
    ? String.fromCodePoint('0x' + checkedStateChar)
    : String.fromCodePoint('0x' + uncheckedStateChar)

  const tagEls = sdtEl.getElementsByTagName('w:tag')
  if (tagEls.length === 0) {
    return
  }

  const tagVal = tagEls[0].getAttribute('w:val')
  match = tagVal.match(/\$docxCheckbox([^$]*)\$/)
  if (match.length === 2) {
    tagEls[0].setAttribute('w:val', tagVal.replace(match[0], ''))
  }
}

function processCombo (sdtEl) {
  const comboboxEls = sdtEl.getElementsByTagName('w:comboBox')

  if (comboboxEls.length === 0) {
    return
  }

  const aliasEls = sdtEl.getElementsByTagName('w:alias')
  if (aliasEls.length === 0) {
    return
  }

  const aliasVal = aliasEls[0].getAttribute('w:val')
  if (!aliasVal.includes('$docxCombobox')) {
    return
  }

  let match = aliasVal.match(/\$docxCombobox([^$]*)\$/)
  aliasEls[0].setAttribute('w:val', aliasVal.replace(match[0], ''))
  const comboboxData = JSON.parse(Buffer.from(match[1], 'base64').toString())

  if (comboboxData.items) {
    const comboboxEl = comboboxEls[0]

    for (const item of comboboxData.items) {
      const itemEl = sdtEl.createElement('w:listItem')
      const itemConverted = item.value != null ? item : { value: item, text: item }
      itemEl.setAttribute('w:value', itemConverted.value)
      itemEl.setAttribute('w:displayText', itemConverted.text)
      comboboxEl.appendChild(itemEl)
    }
  }

  const items = nodeListToArray(sdtEl.getElementsByTagName('w:listItem')).map(e => ({
    value: e.getAttribute('w:value'),
    displayText: e.getAttribute('w:displayText')
  }))

  if (comboboxData.value != null) {
    const itemToSelect = items.find(i => i.value === comboboxData.value)

    if (!itemToSelect) {
      throw new Error(`Unable to find value ${comboboxData.value} for docx combobox with items ${items.map(v => v.value).join(',')}`)
    }

    const valueText = sdtEl.getElementsByTagName('w:t')[0]
    valueText.textContent = itemToSelect.displayText
  }

  const tagEls = sdtEl.getElementsByTagName('w:tag')
  if (tagEls.length === 0) {
    return
  }

  const tagVal = tagEls[0].getAttribute('w:val')
  match = tagVal.match(/\$docxCombobox([^$]*)\$/)
  if (match.length === 2) {
    tagEls[0].setAttribute('w:val', tagVal.replace(match[0], ''))
  }
}

module.exports = (files) => {
  const f = files.find(f => f.path === 'word/document.xml')

  f.data = f.data.toString().replace(/<w:sdt>.*?(?=<\/w:sdt>)<\/w:sdt>/g, (val) => {
    // no need to pass xml namespaces here because the nodes there are just used for reads,
    // and are not inserted (re-used) somewhere else
    const sdtEl = new DOMParser().parseFromString(val)
    processCheckbox(sdtEl)
    processCombo(sdtEl)
    return serializeXml(sdtEl)
  })
}
