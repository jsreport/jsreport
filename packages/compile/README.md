# @jsreport/compile
[![NPM Version](http://img.shields.io/npm/v/@jsreport/compile.svg?style=flat-square)](https://npmjs.com/package/@jsreport/compile)

**Compile jsreport into single executable**

## Usage

```bash
npm install jsreport
npm install @jsreport/compile
"node_modules/.bin/compile"
...
jsreport.exe start
```

## Changelog

### 4.1.0

- add support for generating both arm64 and x64 from machine with macos arm64

### 4.0.1

- fix compilation with axios

### 4.0.0

- minimum node.js version is now `18.15.0`
- updates to make it work with SES

### 3.1.0

- support store simple values

### 3.0.3

- fix keep alive rendering
- don't log to files by default

### 3.0.2

Fix for compile after deps update because npm audit warnings
