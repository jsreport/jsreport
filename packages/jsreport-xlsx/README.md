# @jsreport/jsreport-xlsx
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-xlsx.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-xlsx)

**jsreport recipe which renders excel reports based on uploaded excel templates by modifying the xlsx source using predefined templating engine helpers**

See the docs https://jsreport.net/learn/xlsx

## Changelog

### 3.2.3

- fix xlsx generation with template using shared formulas
- fix producing corrupted shared strings

### 3.2.2

- fix xlsx helpers execution during transformation step

### 3.2.1

- fix xlsx block helpers not working with asset call in helper body

### 3.2.0

- add support for generating xlsx based on handlebars tags present directly in a xlsx template file
- the old way of generating xlsx (transforming/assembling xml using templating engines and helpers) is still supported and it is now executed taking the generated xlsx as input

### 3.0.1

- fix error line numbers in xlsx recipe

### 3.0.0-beta.1

Adaptations for the v3 APIs
