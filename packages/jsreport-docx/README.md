# @jsreport/jsreport-docx
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-docx.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-docx)

**jsreport recipe for creating docx reports**

See the documentation https://jsreport.net/learn/docx

## Changelog

### 4.9.0

- update deps to fix audit
- make document with section breaks to work properly with conditional content
- fix block_helper_container recognition not working for single block that start and end in single text nodes

### 4.8.0

- update deps to fix audit
- docxHtml images now supports passing a custom loader function to allow a custom method to fetch images without loading all images in memory.
- docxImage now supports using a loader function for `src`, `fallbackSrc` to allow a custom method to fetch images without loading all images in memory.
- docxHtml support for getting `content` and `inline` parameters from async execution
- fix regression when multiple docxTable are used with docxHtml content
- dont remove xmlns from elements

### 4.7.1

- fix regression of complex template not working
- improve errors
- fix case with multiple docxHtml calls and conditionals

### 4.7.0

- update deps to fix audit
- fix regression in docxImage when reading jpg with CMYK color code
- docxHtml: fix lists numbering not getting generated properly when there is more than one docxhtml call
- docxHtml support for `<colgroup>`, `<col>` tags in table
- fix docxHtml border left normalization
- fix docxHtml condition for possible null value
- docxTable support col width customization

### 4.6.0

- update axios to fix audit
- `docxHtml` ol lists now support the `start` attribute
- fix `docxStyle` working with tables
- add `docxObject` helper to allow embedding `docx` file into another docx

### 4.5.0

- docxHtml table cell support for vertical-align style
- fix docxHtml throwing error when table have a div as sibling with two inline elements
- usage of Handlebars.createFrame should inherit existing data to ensure it correctly propagates existing values

### 4.4.0

- use decodeURIComponentRecursive helper to handle better different cases of MS Programs storing target urls encoded multiple times
- docxHtml: add support for generating nested tables
- docxHtml: support for table, row, cell background color and color styles

### 4.3.0

- add support for using docxStyle in loop
- docxHtml: fix icon used in third level of lists and don't break when rendering list with level greater than max level (9)
- improve error message when fetching images, include url to image in the message
- docxHtml: add padding, margin support for cells
- docxHtml: add border support for table, cell
- docxHtml: fix rendering multiple paragraphs in single cell

### 4.2.1

- docxHtml: fix title and list not working when having a wrapping <p> tag

### 4.2.0

- add support for docxStyle to target paragraph, cell, row so styles can be applied to container instead of just text
- docxHtml: fix case when nested ul/li not rendering in the correct order
- allow customizing bookmark of docxImage and general normalization of bookmarks
- fix concat tags logic
- docxImage: optimization when rending a lot of remote images
- internal changes to support new `response.output` api

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
