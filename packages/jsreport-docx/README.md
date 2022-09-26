# @jsreport/jsreport-docx
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-docx.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-docx)

**jsreport recipe for creating docx reports**

See the documentation https://jsreport.net/learn/docx

## Changelog

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
