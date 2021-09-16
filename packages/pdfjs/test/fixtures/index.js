const fs   = require('fs')
const path = require('path')
const pdf  = require('../../lib')

const openSansRegular = fs.readFileSync(path.join(__dirname, 'font/opensans/regular.ttf'))
const openSansBold = fs.readFileSync(path.join(__dirname, 'font/opensans/bold.ttf'))
const jpegImage = fs.readFileSync(path.join(__dirname, 'image/pdfjs.jpg'))
const pdfImage = fs.readFileSync(path.join(__dirname, 'image/pdfjs.pdf'))
const complexPdfImage = fs.readFileSync(path.join(__dirname, 'image/complex.pdf'))

exports.create = function() {
  return {
    font: {
      opensans: {
        regular: new pdf.Font(openSansRegular),
        bold:    new pdf.Font(openSansBold)
      },
      afm: {
        regular: require('../../font/Helvetica'),
        bold: require('../../font/Helvetica-Bold'),
        monoRegular: require('../../font/Courier'),
        monoBold: require('../../font/Courier-Bold'),
      }
    },
    image: {
      jpeg:       new pdf.Image(jpegImage),
      pdf:        new pdf.Image(pdfImage),
      complexPdf: new pdf.Image(complexPdfImage),
    },
    lorem: {
      long:  'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.\n\nDuis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.\n\nUt wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.',
      short: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      shorter: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.',
    },
    document: {
      test: new pdf.ExternalDocument(fs.readFileSync(path.join(__dirname, 'document/test.pdf'))),
      pdfjsCreated: new pdf.ExternalDocument(fs.readFileSync(path.join(__dirname, 'document/pdfjs-created.pdf'))),
    }
  }
}
