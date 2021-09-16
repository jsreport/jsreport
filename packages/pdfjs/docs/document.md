## Document

Includes all methods of a [Fragment](fragment.md)

### .header()

Add a header to the document. Returns a [Header Object](header.md).

**Example**:

```js
const header = doc.header()
header.text('This is a header')
```

### .footer()

Add a footer to the document. Returns a [Footer Object](header.md).

**Example**:

```js
const footer = doc.footer()
footer.text('This is a footer')
```

### .addPagesOf(external)

Add all pages of an external PDF into this document (aka merge an external document into this document).

**Arguments:**

- **external** - a `pdf.ExternalDocument` object

**Example:**

```js
const src = fs.readFileSync('other.pdf')
const ext = new pdf.ExternalDocument(src)
doc.addPagesOf(ext)
```

### .addPageOf(page, external)

Add one specific page of an external PDF into this document (aka merge an external document into this document).

**Arguments:**

- **page** - the number of the page that should be added
- **external** - a `pdf.ExternalDocument` object

**Example:**

```js
const src = fs.readFileSync('other.pdf')
const ext = new pdf.ExternalDocument(src)
doc.addPageOf(1, ext)
doc.addPageOf(3, ext)
```

### .setTemplate(external)

Use an external document as a page template (i.e. external PDF will be used as a starting point / as a background for all pages).

**Arguments:**

- **external** - a `pdf.ExternalDocument` object

**Example:**

```js
const src = fs.readFileSync('other.pdf')
const ext = new pdf.ExternalDocument(src)
doc.setTemplate(ext)
```

### .pipe(stream)

Document is a `Readable` stream and can therefore piped into other streams, e.g.:

```
doc.pipe(fs.createWriteStream('output.pdf'))
```

### async .end()

Must be called to finish writing the PDF document.

**Note:** Make sure something is reading from the document, otherwise this will not finish.

```
await doc.end()
```

### .asBuffer([callback])

Can be used to render the document as a buffer. Returns a `Promise`; the usage of `callback` is optional.

Note: When using `.asBuffer()`, do not call `.end()` (neither before nor after `asBuffer`).

```
doc.asBuffer().then(data => fs.writeFileSync('test.pdf', data, { encoding: 'binary' }))
```


```
doc.asBuffer((err, data) => {
  if (err) {
    console.error(err)
  } else {
    fs.writeFileSync('test.pdf', data, { encoding: 'binary' })
  }
})
```

