# @jsreport/jsreport-core
[![NPM Version](http://img.shields.io/npm/v/@jsreport/jsreport-core.svg?style=flat-square)](https://npmjs.com/package/@jsreport/jsreport-core)

**The minimalist [jsreport](http://jsreport.net) rendering core.**
The full distribution can be found in the [jsreport](https://npmjs.com/package/jsreport) package.

[jsreport](http://jsreport.net) is a platform providing dynamic documents assembling and printing. It supports various document types or printing techniques.

`@jsreport/jsreport-core` contains the jsreport rendering core that is useless alone. It is up to you which jsreport extensions you combine

## Quick example

To generate a document using jsreport, you always need a javascript templating engine. The **engine** is used to dynamically assemble the document based on the input values. For start lets pick [@jsreport/jsreport-handlebars](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-handlebars) engine and install it using npm.

Next to the engine, you need something we call **recipe**. A recipe represents the technique used to print the document. It can be an HTML to pdf conversion, DOCX rendering, and others. In this example lets pick [@jsreport/jsreport-chrome-pdf](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-chrome-pdf).  This recipe implements HTML to pdf conversion using [chrome](https://developers.google.com/web/updates/2017/04/headless-chrome). So in this example, we use handlebars to assemble HTML based on the input data and then print the output into the final pdf.

> npm install @jsreport/jsreport-core<br/>
> npm install @jsreport/jsreport-handlebars<br/>
> npm install puppeteer @jsreport/jsreport-chrome-pdf

```js
const fs = require('fs').promises

const jsreport = require('@jsreport/jsreport-core')()
jsreport.use(require('@jsreport/jsreport-chrome-pdf')())
jsreport.use(require('@jsreport/jsreport-handlebars')())

await jsreport.init()
const result = await jsreport.render({
	template: {
		content: '<h1>Hello {{foo}}</h1>',
		engine: 'handlebars',
		recipe: 'chrome-pdf'
	},
	data: {
		foo: "world"
	}
})
await fs.writeFile('out.pdf', result.content)
```

## Render
`render` is the main method that invokes report generation. A single parameter is an object representing describing what to render. It has the following structure:
```js
{
    //[required definition of the document]
    template: {
        //[required] templating engine used to assemble document
        engine: "handlebars",
        //[required] recipe used for printing previously assembled document
        recipe: "chrome-pdf",
        //[required] template for the engine
        content: "<h1>{{foo}}</h1>",
        //javascript helper functions used by templating engines
        helpers: "function foo() { ...} " +
                "function foo2() { ... }"
        //any other settings used by recipes
        ...
    },
    //dynamic data inputs used by templating engines
    data: { foo: "hello world"}
    ...
}
```

In case you have the template stored in the [jsreport templates store](https://github.com/jsreport/jsreport-core#template-store), you can reference the template using a name or path.

```js
{
    template: {
        name: '/myfolder/mytemplate'
    },
    data: { foo: "hello world"}
    ...
}
```

The render returns a promise with the single response value
```js
{
	//node.js buffer with the document
	content: ...
	//stream with the document
	stream: ...
	//object containing metadata about the report generation (reportName, logs, etc)..
	meta: { ... }
}
```

The convention is that jsreport repository extension  starts with `jsreport-xxx`, but the extension real name and also the recipes or engines it registers excludes the `jsreport-` prefix. This means if you install extension `@jsreport/jsreport-handlebars` the engine's name you specify in the render should be `handlebars`.


### Require in the helpers
jsreport by default runs helpers in the sandbox where is the `require` function blocked. To unblock particular modules or local scripts you need to configure `sandbox.allowedModules` option.

```js
const jsreport = require('@jsreport/jsreport-core')({
	sandbox: { allowedModules: ['moment'] }
})

// or unblock everything

const jsreport = require('@jsreport/jsreport-core')({
	sandbox: { allowedModules: '*' }
})
```

Additionally, jsreport provides global variables which can be used to build the local script path and read it.

```js
const jsreport = require('@jsreport/jsreport-core')({
	sandbox: { allowedModules: '*' }
})

await jsreport.init()
await jsreport.render({
	template: {
		content: '<script>{{jquery}}</script>',
		helpers: `
			function jquery() {
				const fs = require('fs')
				const path = require('path')

				return fs.readFileSync(path.join(__rootDirectory, 'jquery.js'))
			}
		`,
		engine: 'handlebars',
		recipe: 'chrome-pdf'
	}
})

```

The following variables are available in the global scope:

- `__rootDirectory` - two directories up from jsreport-core
- `__appDirectory` - directory of the script which is used when starting node
- `__parentModuleDirectory` - directory of script which was initializing jsreport-core

## Extensions
You need to install additional packages (extensions) even for the simplest pdf printing. This is the philosophy of jsreport, and you will need to install additional extensions very often. There are many extensions adding support for persisting templates, dynamic script evaluation, adding browser based reports studio or exposing API. To get the idea of the whole platform you can install the full [jsreport](http://jsreport.net/) distribution and pick what you like. Then you can go back to `jsreport-core` and install extensions you need.

You are also welcome to write your own extension or even publish it to the community. See the following articles how to get started.

- [Implementing custom jsreport extension](http://jsreport.net/learn/custom-extension)
- [Implementing custom jsreport recipe](http://jsreport.net/learn/custom-recipe)
- [Implementing custom jsreport engine](http://jsreport.net/learn/custom-engine)

The best place to find availible extensions is in the [jsreport documentation](https://jsreport.net/learn) or you can search in this [monorepo's packages](https://github.com/jsreport/jsreport/tree/master/packages) - every package with `jsreport-` prefix is an extension.

## Extensions auto discovery
jsreport by default auto-discovers extensions in the application's directory tree. This means, there is no need to explicitely `require` and call `jsreport.use` for all extensions you want to use. However it is prefered for the clarity.

## Configuration
jsreport accepts options as the first parameter. The core options are the following:

```js
require('@jsreport/jsreport-core')({
	// optionally specifies where's the application root and where jsreport searches for extensions
	rootDirectory: path.join(__dirname, '../../'),
	// optionally specifies where the application stores temporary files used by the conversion pipeline
	tempDirectory: path.join(dataDirectory, 'temp'),
	// options for logging
	logger: {
		silent: false // when true, it will silence all transports defined in logger
	},
	// options for templating engines and other scripts execution
	// see the https://github.com/pofider/node-script-manager for more information
	sandbox: {
		cache: {
			max: 100, //LRU cache with max 100 entries, see npm lru-cache for other options
			enabled: true //disable cache
		}
	},
	loadConfig: false,
	// the temporary files used to render reports are cleaned up by default
	autoTempCleanup: true,
	// set to false when you want to always force crawling node_modules when searching for extensions and starting jsreport
	useExtensionsLocationCache: true
})
```

`jsreport-core` is also able to load configuration from other sources including configuration file, environment variables and command line parameters. This can be opted in through option `loadConfig:true`. If this option is set to true the configuration is merged from the following sources in the particular order:

1. configuration file jsreport.config.json or the one specified in `configFile` environment variable
2. command-line arguments
3. process environment variables
4. options passed directly to `require('@jsreport/jsreport-core')({})`

Each extension (recipe, store...) usually provides some options you can apply and adapt its behavior. These options can be typically set through standard configuration under the top-level `extensions` property, options in there with the name corresponding to the extension's name are forwarded to the particular extension. This is the common way how to globally configure all extensions at one place.

```js
require('@jsreport/jsreport-core')({
	...
	"extensions": {
		"scripts": {
		  "allowedModules": ["url"]
		}
	}
})
```

You can find configuration notes for the full jsreport distribution [here](http://jsreport.net/learn/configuration).

## Logging
jsreport leverages [winston](https://github.com/winstonjs/winston) logging abstraction together with [debug](https://github.com/visionmedia/debug) utility. To output logs in the console just simply set the `DEBUG` environment variable

```bash
DEBUG=jsreport node app.js
```

on windows do

```bash
set DEBUG=jsreport & node app.js
```

To declarative configure logging levels and outputs you can see [this page](https://jsreport.net/learn/configuration#logging-configuration) which contains all the details for that.

jsreport also exposes `logger` property which can be used to adapt the logging as you like. You can for example just add [winston](https://github.com/winstonjs/winston) console transport and filter in only important log messages into console.

```js
const winston = require('winston')
const jsreport = require('@jsreport/jsreport-core')()
jsreport.logger.add(winston.transports.Console, { level: 'info' })
```

## Typescript
jsreport types are in the [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) repository.
You can install [@types/jsreport-core](https://www.npmjs.com/package/@types/jsreport-core) and invidual types for extensions, or get all types at once from [@types/jsreport](https://www.npmjs.com/package/@types/jsreport).

You can also find [jsreport typescript examples here](https://github.com/jsreport/jsreport-typescript-example).

## Listeners
jsreport extensions are mainly using the system of event listeners to adapt the rendering process. Extensions, can for example listen to event, which is called before the rendering process starts and adapt the input values.

```js
//jsreport must be initialized at this time
jsreport.beforeRenderListeners.add('name-of-listener', (req, res) => {
	req.template.content = 'Changing the template in listener!'
})
```

To start the listening, you must first add the listener function to the right listener. In the example is used `beforeRenderListeners` which is called before the rendering starts. jsreport then in the right time sequentially fires all the listener functions and let them do the required work. If the function returns a promise, jsreport awaits until it is fulfilled.

Note this technique can be used in extensions, but also outside in nodejs application using jsreport.

jsreport currently support these main listeners

- `initializeListeners()`- called when all extensions are initialized<br/>
- `beforeRenderListeners(req, res)` - very first in the rendering pipeline, used to load templates and parse input data<br/>
- `validateRenderListeners(req, res)` - possible to reject rendering before it starts, jsut return failed promise or exception<br/>
- `afterTemplatingEnginesExecutedListeners(req, res)` - engine like handlebars or jsrender extracted the content, the `res.content` contains Buffer with extracted content<br/>
- `afterRenderListeners(req, res)` - recipes are executed, `res.content` contains final buffer which will be returned as a stream back, the last change to modify the output or send it elsewhere<br/>
- `renderErrorListeners(req, res, err)` - fired when there is error somewhere in the rendering pipeline
- `closeListeners()` called when jsreport is about to be closed, you will usually put here some code that clean up some resource

## Studio
jsreport includes also visual html studio and rest API. This is provided through two extensions, [@jsreport/jsreport-express](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-express) extension to have a web server available and [@jsreport/jsreport-studio](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-studio) for the web UI, both extensions should be installed in order to have the studio ready. See the documentation of each extension for the details

## Template store
`jsreport-core` includes API for persisting and accessing report templates. This API is then used by extensions mainly in combination with jsreport [studio](#studio). `jsreport-core` implements just in-memory persistence, but you can add other persistence methods through extensions, see the [template stores](https://jsreport.net/learn/template-stores) docummentation

The persistence API is almost compatible to the mongodb API:
```js
jsreport.documentStore.collection('templates')
	.find({name: 'test'})
	.then((res) => {})

jsreport.documentStore.collection('templates')
	.update({name: 'test'}, { $set: { attr: 'value' })
	.then((res) => {})

jsreport.documentStore.collection('templates')
	.insert({name: 'test'})
	.then((res) => {})

jsreport.documentStore.collection('templates')
	.remove({name: 'test'})
	.then((res) => {})
```

## Changelog

### 4.7.1

- update @jsreport/ses to 1.4.0 to fix audit

### 4.7.0

- update deps to fix npm audit
- expose methods to create temporary files in jsreport-proxy
- add support for taking nested errors from error.cause
- add worker id to worker creation

### 4.6.1

- clear profiles canceling check interval during reporter close

### 4.6.0

- update nanoid to fix security issue
- optimize fs store operations for big workspaces
- reimplement and optimize fs transactions
- fix async reports with mongo store
- create store indexes during schema creation fix
- implement canceling requests from profiler

### 4.5.0

- fix blobStorage failing to save reports bigger than 1gb
- decrease default value of `options.profile.maxDiffSize` to `10mb`
- fix logs metadata for main logs
- fix support for using of async helper that returns a value other than string in template engines
- improve support for `jsreport.templateEngines.waitForAsyncHelpers` when used in async helper

### 4.4.1

- fix timestamp shown in logging

### 4.4.0

- trigger async report using header to avoid allocating worker
- fix require('..') and require('.') in sandbox
- fix component rendering in loop with async work on helpers
- update @jsreport/ses to 1.1.0

### 4.3.1

- fix `waitForAsyncHelper`, `waitForAsyncHelpers` not working with trustUserCode: true

### 4.3.0

- expose safe properties of `req.context.user` in sandbox
- fix component execution when wrapped with async helper
- fix jsdom require in sandbox

### 4.2.2

- fix recursive component rendering

### 4.2.1

- response.output.update now accepts Web ReadableStream (which is what new version of puppeteer returns)

### 4.2.0

- the response object has new structure and api, the `response.output` is new addition and contains different methods to work with the response output. the  `response.content`, `response.stream` are now soft deprecated (will be removed in future versions)
- the internal architecture has been updated to support working with template content and report output as streams, this means that the render will be able to handle and produce bigger reports without getting hit by out of memory errors

### 4.1.0

- update deps to fix npm audit
- fix memory being held when timeouts are large
- fix node.js 21 compatibility when sandbox is used (`trustUserCode: false`
- support using different cache key per template engine if it supports it

### 4.0.1

- fix parameter mutations passed to store methods producing unexpected changes in store

### 4.0.0

- minimum node.js version is now `18.15.0`
- remove old migration options `migrateXlsxTemplatesToAssets`, `migrateResourcesToAssets`
- sandbox now uses SES instead of vm2 for evaluating user code
- internal changes to support multi admin users

### 3.12.0

- update vm2 to fix security issues
- render requests are now rotated across not busy workers but considering its last usage too
- require in sandbox now uses a custom require implementation that takes care of isolate module resolving and that uses our own cache (different to built in require.cache) to avoid using a lot of memory when there are a lot of requests. if module isolation is not needed (because user can trust the templates) then it can be disabled by using `sandbox.isolateModules: false`

### 3.11.4

- update unset-value to fix security issue

### 3.11.3

- update vm2 to fix security issue
- automatically disable full profiling after some time to avoid performance degradation
- improvements to full profile serialization (prevent blocking)
- fix profiles cleaning and calculate timeout in beforeRender

### 3.11.2

- add `options.onReqReady` to be able to receive the parsed req values

### 3.11.1

- fix error when trying to read `req.options` on reporter main code when `enableRequestReportTimeout` is enabled

### 3.11.0

- log when worker returns bad res.content
- fix profiler leaks
- remove settings sync API and avoid loading all items to memory
- throw weak error when validating duplicated entity
- ensure we end with profiles with error state when there is server or req timeout

### 3.10.0

- `mainReporter.executeWorkerAction` now supports cancellation with `AbortController.signal`
- add support for specifying what are the main document properties of templates entitySet

### 3.9.0

- add more store methods `collection.findAdmin`, `collection.findOneAdmin`, `reporter.adminRequest` to easily allow execure store queries without taking into account permissions
- improve logging for child requests and user level logs
- differentiate between template not found errors and permissions related errors (it is now more clean what is the cause of specific error)
- normalize to error when non-errors are throw (like throw "string")
- improve errors in helpers (it now includes the helper name)
- improve error message when template was not found in child request
- improve error handling in sandbox

### 3.8.1

- update vm2 for fix security issue

### 3.8.0

- make "config.json" a reserved name for entities

### 3.7.0

- add support for multiple source entities when copying and moving
- fix some issues with blobs and profiles
- format user logs differently on stdout
- fix logging of req as http.IncomingRequest
- fix profile compatibility with jsreport container based execution
- fix memory leak in profiling
- add support for logs of main reporter to show in profile

### 3.6.1

- update @jsreport/advanced-workers to fix bug with cloning req.data when `trustUserCode` is true

### 3.6.0

- improve handling of worker exit
- add a way to disable the safe execution and prevent the performance penalty
- cache system helpers function
- `profiler.maxDiffSize` applies to both req and res
- improved the support for running jsreport as serverless function
- added new apis in `jsreport-proxy` for better working with async helpers

### 3.5.0

- fix parsing issue of code with comment in the sandbox (helpers, scripts)
- improve profiling when there is big data
- make transactions support in store configurable
- improve timeout for the whole request
- fix applying req.options.timeout when enableRequestReportTimeout is true
- optimization regarding profile persistence

### 3.4.2

- update dep `vm2` to fix security vulnerability in sandbox

### 3.4.1

- fix passing data to async report
- fix blob appends

### 3.4.0

- fix for reports execution
- fix for render profiling
- fix for blob storage remove
- update deps to fix npm audit

### 3.1.0

- fix blob storage append to not existing blob (mongo)
- use relative path to the currently evaluated entity
- fix performance issue in sandbox with long buffer (don't use restore() of sandbox through a method attached to the sandbox)
- update migration `xlsxTemplatesToAssets`, `resourcesToAssets` to inherit permissions and change name for resource script to `${template.name}_resources`
- refactor ListenerCollection for better stack traces
- fix startup extensions logs not recognized as npm source
- fix extensions cache entry root path
- don't crash process when monitoring persist fails
- fix compilation (updates to vm2)

## License
LGPL
