# @jsreport/jsreport-version-control
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-version-control.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-version-control)

**jsreport extension adding support for versioning entities and providing API as well as the studio UI for common commands like commit, diff, revert or history.**

See https://jsreport.net/learn/version-control

![version control](https://jsreport.net/img/version-control.gif)

## Changelog

### 4.1.1

- update deps

### 4.1.0

- update deps to fix audit
- move not so much used "commits" button to the settings toolbar
- add clear all commits button

### 4.0.0

- minimum node.js version is now `18.15.0`
- update studio build against new webpack and babel

### 3.1.2

- fix and improve of the version control blog storage write
- sort folders by hierarchy when committing folders
- fix the revert of entity remove when the entity is marked as bigfile
- fix for producing empty diffs

### 3.1.1

- add missing changes column to fix migration

### 3.1.0

update deps to fix npm audit warnings

### 3.0.1

- improve revert changes warning in studio

### 3.0.0-beta.1

Storing diffs in the blobs instead of the entities.
