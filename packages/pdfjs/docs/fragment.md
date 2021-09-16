## Fragment

### .text([text], [opts])

Add some text to the document. Returns a [Text object](text.md).

**Arguments:**

- **text** - a string that should be rendered
- **opts** - options

**Options:**

- **font** - expects an `pdf.Font` object being either a AFM font or a OTF font
- **fontSize** (default: 11) - the font size
- **color** (default: black) - the font color as hex number (e.g. 0x000000)
- **lineHeight** (default: 1.15) - the line height
- **textAlign** / **alignment** (default: 'left') - the text alignment (possible options: left, right, center, justify)
- **underline** - whether to underline the text
- **strikethrough** - whether to strikethrough the text
- **link** - a URI the text should link to
- **destination** - a name for a destination which could be used for document-local links
- **goTo** - the name of the document-local destination the text should link to

**Example:**

```js
doc.text('Lorem Ipsum ...')
const text = doc.text({ fontSize: 12 })
text.add('Lorem Ipsum ...')
```

### .cell([text], [opts])

Add a cell to the document. Returns a [Fragment object](fragment.md).

**Arguments:**

- **text** - a string that should be rendered into the cell
- **opts** - styling options

**Options:**

- **width** (default: 100%) - the cell width
- **minHeight** (default: 0) - the minimum height of the cell
- **x** (default: undefined) - x coordinate of where to render the cell
- **y** (default: undefined) - y (y starts at the bottom of the document) coordinate of where to render the cell
- **padding**, **paddingTop**, **paddingRight**, **paddingBottom**, **paddingLeft** (default: 0) - the cell padding
- **backgroundColor** (default: none) - the background color the cell
- **borderWidth**, **borderTopWidth**, **borderRightWidth**, **borderBottomWidth**, **borderLeftWidth** (default: 0) - the border width of the cell
- **borderColor**, **borderTopColor**, **borderRightColor**, **borderBottomColor**, **borderLeftColor** (default: black) - the border color of the cell

**Example:**

```js
const cell = doc.cell('Cell Text', { padding: 10 })
cell.text('More text ...')
```

### .table([opts])

Add a table to the document. Returns a [Table object](table.md).

**Arguments:**

- **opts** - options

**Options:**

- **widths** (required!) - an array of the widths of all table columns
- **width** (default: 100%) - the table width
- **borderWidth** (default: 0) - the width of all borders
- **borderColor** (default: black) - the color of all borders
- **borderVerticalWidth** (default: none) - the border width of all vertical borders of the table
- **borderVerticalWidths** (default: none) - an array defining the widths of all vertical borders of the table
- **borderVerticalColor** (default: black) - the border color of all vertical borders of the table
- **borderVerticalColors** (default: none) - an array defining the colors of all vertical borders of the table
- **borderHorizontalWidth** (default: 0) - the border width of all horizontal borders
- **borderHorizontalWidths** (default: none) - a function that is used to determine the width of all horizontal borders (e.g. `i => i * 5`)
- **borderHorizontalColor** (default: black) - the border color of all horizontal borders
- **borderHorizontalColors** (default: none) - a function that is used to determine the color of all horizontal borders

**Example:**

```js
const table = doc.table({
  widths: [256, 256],
  borderHorizontalWidth: 10
})

const row = table.row()
row.cell('Cell 1')
row.cell('Cell 2')
```

### .image(img, [opts])

Add an image to the document.

**Arguments:**

- **img** - a `pdf.Image` object of the image
- **opts** - options

**Options:**

- **width** (default: auto) - the image width
- **width** (default: auto) - the image height
- **x** (default: undefined) - x coordinate of where to render the image
- **y** (default: undefined) - y (y starts at the bottom of the document) coordinate of where to render the image
- **wrap** (default: false) - whether to wrap text or not
- **align** (default: 'left') - horizontal alignment of the image (left, center or right)
- **link** - a URI the image should link to
- **destination** - a name for a destination which could be used for document-local links
- **goTo** - the name of the document-local destination the image should link to

**Example:**

```js
const img = new pdf.Image(fs.readFileSync('image.jpg'))
doc.image(img, {
  height: 55, align: 'center'
})
```

### .pageBreak()

A manual page break.

### .op(args...) | .op(fn)

Execute PDF operations manually

**Example:**

```js
doc.op(1, 0, 0, 'sc')
doc.op((x, y) => {
  const height = 40
  return [x, y - height, x + 60, height, 're']
})
doc.op('f')
```

### .destination(name)

Add a named destination to the document and the current position.

**Example:**

```js
doc.text('goto', { goTo: 'here' })
doc.pageBreak()
doc.destination('here')
```

### .outline(title, destination, [parent])

Add an entry to the documents outline.

**Arguments:**

- **title** - the title shown for this outline entry
- **destination** - the name of the destination the outline entry should point to (must be created separately)
- **parent** - the title of the parent outline entry

**Example:**

```js
doc.text('1. Section', { destination: '1' })
doc.pageBreak()
doc.text('1.1. Subsection', { destination: '1.1' })

doc.outline('Section', '1')
doc.outline('Subsection', '1.1', 'Section')
```
