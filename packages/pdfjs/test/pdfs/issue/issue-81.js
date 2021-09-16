module.exports = function(doc, { font }) {
  doc.text()
    .add('Manage your calories by', { font: font.opensans.regular })
    .add('eating a quarter pack per day.', { font: font.opensans.bold });
}
