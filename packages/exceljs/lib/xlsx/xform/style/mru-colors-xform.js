const BaseXform = require('../base-xform');

// <mruColors>
//  <color rgb="[rgb]"/>
//  <color rgb="[rgb]"/>
//  <color rgb="[rgb]"/>
//  <color rgb="[rgb]"/>
//  <color rgb="[rgb]"/>
//  <color rgb="[rgb]"/>
//  <color rgb="[rgb]"/>
//  <color rgb="[rgb]"/>
// </mruColors>

// Style assists translation from style model to/from xlsx
class MruColorsXform extends BaseXform {
  constructor(options) {
    super();
  }

  get tag() {
    return 'mruColors';
  }

  render(xmlStream, model) {
    xmlStream.openNode('mruColors');
    model.colors.forEach(color => {
      xmlStream.openNode('color', {
        rgb: color.rgb,
      });
      xmlStream.closeNode();
    });
    xmlStream.closeNode();
  }

  parseOpen(node) {
    // used during sax parsing of xml to build object
    switch (node.name) {
      case 'mruColors':
        this.model = {
          colors: [],
        };
        return true;
      case 'color':
        this.model.colors.push({
          rgb: node.attributes.rgb,
        });
        return true;
      default:
        return false;
    }
  }

  parseText() {}

  parseClose(name) {
    return name !== 'mruColors';
  }
}

module.exports = MruColorsXform;
