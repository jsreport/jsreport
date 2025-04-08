const BaseXform = require('../base-xform');

// <cellStyle name="[name]" xfId="[xfId]" builtinId="[builtinId]"/>

// Style assists translation from style model to/from xlsx
class CellStyleXform extends BaseXform {
  get tag() {
    return 'cellStyle';
  }

  render(xmlStream, model) {
    xmlStream.openNode('cellStyle', {
      name: model.name,
      xfId: model.xfId || 0,
      builtinId: model.builtinId || 0,
    });

    xmlStream.closeNode();
  }

  parseOpen(node) {
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }

    // used during sax parsing of xml to build object
    switch (node.name) {
      case 'cellStyle':
        this.model = {
          name: node.attributes.name,
          xfId: parseInt(node.attributes.xfId, 10),
          builtinId: parseInt(node.attributes.builtinId, 10),
        };
        return true;
      default:
        return false;
    }
  }

  parseText() {}

  parseClose() {
    return false;
  }
}

module.exports = CellStyleXform;
