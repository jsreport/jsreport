# @jsreport/jsreport-docx
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-docx.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-docx)

**jsreport recipe for creating docx reports**

See the documentation https://jsreport.net/learn/docx

## Changelog

### 4.1.1

- fix data access to @root data variables

### 4.1.0

- fix handling of heading titles that dont have prefix (style ids that use just numbers, like the case when docx is generated when chinese is the default language)
- `docxRaw` support to get xml from inline string in docx
- docxImage add support for fallbackSrc, failurePlaceholderAction options
- add support for svg images in docxImage
- allow `docxChild` handlebars content to be evaluated as part of the caller document

### 4.0.1

- remove NUL, VERTICAL TAB characters

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel
- fix docxHtml should not normalize space of elements that have siblings in the content

### 3.7.2

- fix table cells not being well-formed when user uses conditions (#if) across table rows and cells
- support setting docxImage src from async result

### 3.7.1

- fix docx rendering with handlebars partials

### 3.7.0

- fix `template.docx.templateAsset` from payload not overwriting the `template.docx.templateAssetShortid`
- fix parsing of end of `if` and start of another `if` in same line
- add support for `table` tag in `docxHtml` helper
- add support for `img` tag in `docxHtml` helper

### 3.6.0

- make `docxStyle` work in document header/footer
- add `docxChild` helper to allow merging text of another docx
- accept buffer strings as base64 and throw better error when failed to parse office template input
- make `docxImage` and `docxChart` to work in document header/footer
- make `docxHtml` work in document header/footer

### 3.5.1

- fix normalizing space for middle text element in `docxHtml`

### 3.5.0

- add initial support for embedding html in docx (docxHtml helper)
- add helper `docxTOCOptions` to support configuring TOC behavior (only option available there right now is `updateFields` which controls if the generated docx file should show a prompt when it is being open in Word to decide if the TOC should be updated)

### 3.4.0

- add updateFields setting on docx when there is TOC, this allows MS Word to ask the user to update the page numbers of TOC when the document is opened
- support configuring watermark options
- add support for removal of conditional TOC titles

### 3.3.1

- changes to enable caching of system helpers

### 3.3.0

- make TOC logic to work with documents created with other languages
- add backgroundColor support for docxStyle

### 3.2.0

- update table of contents in docx
- add support for defining merged cells in dynamic table

### 3.0.0-beta.1

Adaptations for the v3 APIs
