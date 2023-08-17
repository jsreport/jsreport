# serializator
[![NPM Version](http://img.shields.io/npm/v/serializator.svg?style=flat-square)](https://npmjs.com/package/serializator)
[![License](http://img.shields.io/npm/l/serializator.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/jsreport/serializator.png?branch=master)](https://travis-ci.org/jsreport/serializator)

> ⚠️ WARNING: this is an internal package that we use inside [jsreport](https://github.com/jsreport/jsreport) dependencies, if you plan to use it be aware that we can make breaking changes at any time according to our needs, so use it at your own risk.

> **Serialize javascript objects to JSON with support for rich data structures**

This module let you serialize and parse javascript objects to JSON with support for data structures like `Date`, `Buffer`. Additionally properties with value of `undefined` will be serialized to `null` in order to preserve the property key definition.

## License
See [license](https://github.com/jsreport/serializator/blob/master/LICENSE)
