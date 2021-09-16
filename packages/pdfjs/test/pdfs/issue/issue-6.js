module.exports = function(doc, fixtures) {
  doc.text('абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', { font: fixtures.font.opensans.regular })
  doc.text('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', { font: fixtures.font.opensans.regular })
}
