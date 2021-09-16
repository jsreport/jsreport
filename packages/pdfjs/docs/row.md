## Row

### .cell([text], [opts])

Add a cell to the row. Returns a [Fragment object](fragment.md).

**Arguments:**

- **text** - a string that should be rendered into the cell
- **opts** - styling options

**Options:**

- **colspan** (default: 1) - how many columns the cell should span
- **padding**, **paddingTop**, **paddingRight**, **paddingBottom**, **paddingLeft** (default: 0) - the cell padding
- **backgroundColor** (default: none) - the background color the cell
- **minHeight** (default: 0) - the minimum height of the cell

**Example:**

```js
const table = doc.table({
  widths: [200, 200]
})

const row = table.row()
row.cell('Cell Left')
row.cell('Cell Right')
```
