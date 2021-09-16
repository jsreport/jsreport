## Table

### .header([opts])

Add a table header. Returns a [Row Object](row.md).

**Example:**

```js
const table = doc.table({
  widths: [200, 200],
  borderWidth: 1,
})

const header = table.header()
header.cell('Header Left')
header.cell('Header Right')
```

### .row([opts])

Starts a table row. Returns a [Row Object](row.md).

**Options:**

- **minHeight** (default: 0) - the minimum height of the row

**Example:**

```js
const table = doc.table({
  widths: [200, 200],
  borderWidth: 1,
})

const row = table.row()
row.cell('Cell Left')
row.cell('Cell Right')
```
