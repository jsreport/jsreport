## Documentation

```js
const pdf = require('pdfjs')
```

### new pdf.Document([opts])

Creates a new [PDF document](document.md).

**Arguments:**

- **opts** - document styling options

**Options:**

- **width** (default: [595.296](#units)) - the page width
- **height** (default: [841.896](#units)) - the page height
- **padding** (default: 20) - the page padding
- **font** (required) - expects an `pdf.Font` object being either a AFM font or a OTF font
- **fontSize** (default: 11) - the font size
- **color** (default: black) - the font color as hex number (e.g. 0x000000)
- **lineHeight** (default: 1.15) - the line height
- **properties** - document properties - see below

**Properties:**

- **title** (string) - the document's title
- **author** (string) - the name of the person who created the document
- **subject** (string) - the subject of the document
- **keywords** (string) - keywords associated with the document
- **creator** (string) - if the document was converted to PDF from another format, the name of the conforming product that created the original document from which it was converted
- **producer** (string, default: pdfjs v1.3 (github.com/rkusa/pdfjs)) -  if the document was converted to PDF from another format, the name of the conforming product that converted it to PDF
- **creationDate** (date, default: `new Date()`) - the date and time the document was created
- **modDate** (date) - the date and time the document was most recently modified

**Example:**

```js
const doc = new pdf.Document({
  font:    require('pdfjs/font/Helvetica'),
  padding: 10
})
doc.pipe(fs.createWriteStream('output.pdf'))

// render something onto the document

await doc.end()
```

For an explanation of the units and different paper sizes have a look at the [units](#units) section.

### new pdf.Font(arg)

Creates a new OTF font object that can be used with PDF documents. Font objects can be used multiple times.

**Arguments:**

- **arg** - the font data, as either Buffer or ArrayBuffer of an OTF font

```js
new pdf.Font(fs.readFileSync('./opensans/regular.ttf'))
```

### AFM fonts

AFM fonts are default fonts understood by every PDF reader. It is therefore not necessary to embed
additional font data.

**Available AFM fonts:**

- `pdfjs/font/Courier`
- `pdfjs/font/Courier-Bold`
- `pdfjs/font/Courier-BoldOblique`
- `pdfjs/font/Courier-Oblique`
- `pdfjs/font/Helvetica`
- `pdfjs/font/Helvetica-Bold`
- `pdfjs/font/Helvetica-BoldOblique`
- `pdfjs/font/Helvetica-Oblique`
- `pdfjs/font/Symbol`
- `pdfjs/font/Times`
- `pdfjs/font/Times-Bold`
- `pdfjs/font/Times-BoldItalic`
- `pdfjs/font/Times-Italic`
- `pdfjs/font/Times-Roman`
- `pdfjs/font/ZapfDingbats`

**Examples:**

```js
require('pdfjs/font/Helvetica')
```

### new pdf.Image(src)

Creates a new image that can be added to one or multiple documents.

**Arguments:**

- **src** - a buffer of the image source (supported formats: jpeg, pdf)

**Example:**

```js
const src = fs.readFileSync('image.jpg')
const img = new pdf.Image(src)
doc.image(img)
```

### new pdfExternalDocument(src)

Creates a new external PDF document that can be merged into the document or that can be added to the document as a page template.

**Note:** Please keep in mind that due to the complexity of the PDF specification and slightly different implementations of it, there is no guarantee that `pdfjs` successfully parses every available PDF document. It is recommended to wrap the usage of `ExternDocument` into a try/catch statement. If you encounter an error while parsing a PDF document or if you encounter a PDF document that is not parsed correctly, feel free to open an issue.

**Arguments:**

- **src** - a buffer of the PDF source

**Example:**

```js
const src = fs.readFileSync('other.pdf')
const ext = new pdf.ExternalDocument(src)
doc.setTemplate(ext)
doc.addPagesOf(ext)
doc.addPageOf(1, ext)
```

### Units

PDFs are measured in points (`1/72"`), i.e., **each point is `1/72` of an inch**. That is, the paper size of an US letter is in points `8.5 * 72 = 612` wide and `11 * 72 = 792` high.

The following helper are exported:

- `pdf.mm`
- `pdf.cm`

**Example:**

```
{ padding: 15 * pdf.mm }
```

**Paper Sizes:**

- **A4** (default) - 210mm × 297mm (8.27in × 11.7in) = 595.296 x 841.896
- **American Letter** - 215.9mm × 279.4mm (8.5in × 11in) = 612 x 792

