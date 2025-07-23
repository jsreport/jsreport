# @jsreport/jsreport-studio
![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-studio.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-studio)

![studio](http://jsreport.net/img/jsreport-studio.gif)

See http://jsreport.net/learn/studio

## Studio development

```sh
git clone https://github.com/jsreport/jsreport
yarn install
set NODE_ENV=jsreport-development&&yarn start
```

## Studio extension development
The documentation can be found [here](https://jsreport.net/learn/extending-studio).

## Changelog

### 4.3.2

- update deps to fix audit

### 4.3.1

- migrate from Enzyme to @testing-library/react to fix running tests
- update deps to fix audit

### 4.3.0

- implement canceling requests from profiler
- add duration column to the profiler page

### 4.2.0

- fix npm audit
- add option `favicon` (path to a file) to allow changing the favicon used in studio
- fix firefox bug triggering click event after mouseup event caused by user selecting text
- fix middle click to close tab not working on firefox

### 4.1.1

- fix getting studio preview as dark theme when using light theme

### 4.1.0

- internal changes to support new `response.output` api

### 4.0.2

- fix "was modified previously by another source" dialogs when updating an entity in studio a second time

### 4.0.1

- fix deleting entity inside a folder does not refresh EntityTree
- multiple optimizations for studio when working with a large number of entities

### 4.0.0

- minimum node.js version is now `18.15.0`
- initial optimizations when working with a large number of entities
- update build dependencies (monaco-editor, babel, webpack)
- avoid http basic authentication error dialog when authorization errors happen from studio actions
- internal changes to support multi admin users

### 3.9.3

- remove title (the one that appears when you put mouse over it for some seconds) of log messages, to prevent them showing when trying to read the log and scrolling

### 3.9.2

- show full profile duration limit on profile UI

### 3.9.1

- throw error when opening an orphan profile

### 3.9.0

- add support for text search across entities content
- fix starting multi selection with ⇧ + click when there is only active entity tab opened
- fix delete of multiple folders (with multi selection) was removing only the folders and leaving its children as root entities
- closing a main editor tab now also closes all dependant tabs (like pdf utils, chrome header/footer)
- `.openTab` method now supports opening dependant editor tabs (like chrome header/footer tabs) with the option `docProp`
- define `/studio/hierarchyMove` api endpoint as post route explicitly

### 3.8.0

- improve ⇧ + ↑, ⇧ + ↓ entity tree multi selection in studio
- add studio range select with ⇧ + click to start and end

### 3.7.0

- fix preview tabs showing when container collapsed
- add download profile logs action
- improve the profile operations display when there render fails
- disable profile menu actions and click on nodes when the rendering is in progress
- fix long name in nodes breaking profile canvas display
- add support for multi selection in entity tree (ctrl/cmd + click)
- add support to control the entity tree edit selection with keyboard (⇧↑ and ⇧↓)
- add support for copy, delete when multiple entities are selected
- format user logs differently on studio (profile logs)

### 3.6.0

- fix Maximum call stack error when rendering a report that produces a lot of logs
- improvements to handle reports that produce big profiles

### 3.5.0

- improve the Profiler page
- improve the display of profile with big data
- improve the Startup page

### 3.4.0

- fix exe compilation
- remove socket.io, it is now only part of where it is actually used (fs-store)

### 3.1.0

- add entity definition button in entity tree item context menu
- fix loading of monaco editor icons
- improve styles for profiler logs
- fix studio editor linter error for top level await in script/helpers (add babel-eslint to our linter in studio)
- fix jsreport-studio-start when running with —runOnly in extension starter kit
- fix layout issue with profiler when a large base64 image is logged

### 3.0.0-beta.1

Adaptations for the v3 APIs
