module.exports = function(doc, { lorem }) {
  doc.text('Lorem ipsum dolor sit amet, consetetur sadipscing elitr')
     .append(',')
     .add('sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat.')
}
