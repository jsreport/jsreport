## Header / Footer

Includes all methods of a [Fragment](fragment.md)

### .pageNumber([fn], [opts])

Add page numbers.

**Arguments:**

- **fn** - a function that is used to format the page numbers
- **opts** - options

**Options:**

- **font** - expects an `pdf.Font` object being either a AFM font or a OTF font
- **fontSize** (default: 11) - the font size
- **color** (default: black) - the font color as hex number (e.g. 0x000000)
- **lineHeight** (default: 1.15) - the line height
- **textAlign** / **alignment** (default: 'left') - the text alignment (possible options: left, right, center, justify)

**Examples:**

```js
const footer = doc.footer()
footer.pageNumber({ textAlign: 'center' })
```

```js
const header = doc.header()
header.pageNumber((curr, total) => `${curr} / ${total}`)
```
