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

