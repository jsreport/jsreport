# @jsreport/jsreport-fs-store
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-fs-store.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-fs-store)

**[jsreport](https://github.com/jsreport/jsreport) template store extension. Supports editing templates in the external editors and browser's live reload and preview!**

See the docs https://jsreport.net/learn/fs-store

## Installation

> npm install jsreport-fs-store

Then alter jsreport configuration
```js
{
	'store': { 'provider': 'fs' }
}
```

## Changelog

### 4.1.1

- update @jsreport/serializator

### 4.1.0

- remove external sync modifications code based on old transactions model
- optimizations for big workspaces
- reimplement and optimize fs transactions

### 4.0.5

- update socket.io, socket.io-client deps to fix audit

### 4.0.4

- update socket.io, socket.io-client deps to fix audit

### 4.0.3

- fix bug with transactions that takes long and locks

### 4.0.2

- update rimraf to fix audit

### 4.0.1

- fix parameter mutations passed to store methods producing unexpected changes in store
- add indexes to fs store to improve big import performance
- fix too many open files open error on windows with big import

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.2.5

- update deps to fix npm audit warnings

### 3.2.4

- update deps to fix npm audit warnings

### 3.2.3

- fix $in queries

### 3.2.2

- corrupted journal should be cleaned to avoid interval errors

### 3.2.1

- fix external entities changes sync reload
- changes to enable new `trustUserCode` option

### 3.2.0

- properly support absolute path in blobStorage.dataDirectory
- various optimizations regarding profiler persistence

### 3.1.0

- add fs-store ignore option to ignore directories/files during the load
- add socket.io as explicit dep
- optimization: don't delete nested folders when updating folder
- fix losing entities in fs store data directory when updating folder in transaction

### 3.0.0-beta.1

Adaptations for the v3 APIs

## Development
(This section is intended to jsreport extension developers audience.)

### Entity definitions
Use `splitIntoDirectories` attribute in `registerEntitySet` to use the directory structure for storing. Otherwise the storage will put every entity row into the one single file.

```js
this.documentStore.registerEntitySet("templates", {entityType: "jsreport.TemplateType", splitIntoDirectories: true});
```

Not every jsreport entity should be spitted into the tree structure. It is especially not desired for the entities where you expect thousands of entries.  In this case just remove the `splitIntoDirectories` attribute.

The second required step is to extend the entity type with `name` attribute which defines the attribute used for the row directory name. And also adding the `document` for the attributes you want to extract into dedicated files.

```js
var templateAttributes = {
	...
    shortid: { type: "Edm.String" },
    name: { type: "Edm.String" },
    content: {
        type: "Edm.String",
	    document: { extension: "html", engine: true }
	}
    ...
};
```

### Engines

Engines like handlebars or jade are able to override the default file extension for the template content files. This can be done using file extension resolver....

```js
reporter.documentStore.addFileExtensionResolver(function(doc, entitySetName, entityType, propertyType) {
        if (doc.engine === "handlebars" && propertyType.document.engine) {
            return "handlebars";
        };
    });
```
