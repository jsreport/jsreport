# @jsreport/jsreport-puppeteer-compile

You should not need this extension, only in case you try to compile your own jsreport.exe

## Changelog

### 4.0.0

- minimum node.js version is now `18.15.0`

### 3.1.0

- we now do not rely on hardcoded executable name for chrome, the name is derived from the path that puppeteer uses

### 3.0.2

- check presence of chrome binary when decompressing binary

### 3.0.1

- fix problems with xlsx generation and archiver in compilation
