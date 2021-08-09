# jsreport-core
[![NPM Version](http://img.shields.io/npm/v/jsreport-core.svg?style=flat-square)](https://npmjs.com/package/jsreport-core)
[![Build Status](https://travis-ci.org/jsreport/jsreport-core.png?branch=master)](https://travis-ci.org/jsreport/jsreport-core)

**The minimalist [jsreport](http://jsreport.net) rendering core.**
Full distribution can be found in [jsreport/jsreport](https://github.com/jsreport/jsreport) repository.

[jsreport](http://jsreport.net) is platform providing dynamic documents assembling and printing. It supports various document types or printing techniques.

`jsreport-core` contains the jsreport rendering core which is useless alone. It is up to you which extensions from the [long list](#list-of-extensions) you additionally apply and which document printing techniques you use.

## Quick example

To generate a document using jsreport you always need a javascript templating engine. The **engine** is used to dynamically assemble the document based on the input values. For start lets pick [jsreport-handlebars](https://github.com/jsreport/jsreport-handlebars) engine from the [list](#engines) and install it using npm.

Next to the engine you need also something we call **recipe**. Recipe represents the technique which is used to print the document. This can be html to pdf conversion, excel rendering and others. In this example lets pick [jsreport-chrome-pdf](https://github.com/jsreport/jsreport-chrome-pdf) from the [list](#recipes) of supported recipes.  This recipe implements html to pdf conversion using [chrome](https://developers.google.com/web/updates/2017/04/headless-chrome). So in this example we use handlebars to assemble html based on the input data and then print the output into final pdf.

Note that `jsreport-core` by default auto discovers installed extensions and apply them. In other words it is enough to just install following packages and there is no need for other configuration.

> npm install jsreport-core<br/>
> npm install jsreport-handlebars<br/>
> npm install puppeteer jsreport-chrome-pdf

```js
const jsreport = require('@jsreport/jsreport-core')()

jsreport.init().then(() => {
	return jsreport.render({
		template: {
			content: '<h1>Hello {{foo}}</h1>',
			engine: 'handlebars',
			recipe: 'chrome-pdf'
		},
		data: {
			foo: "world"
		}
	}).then((resp) => {
	 	// prints pdf with headline Hello world
		console.log(resp.content.toString())
 	});
}).catch((e) => {
	console.error(e)
})
```

## Render
`render` is the main method which invokes report generation. The only parameter is an object representing rendering request. The request has following structure:
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

In case you have the template stored in the [jsreport templates store](https://github.com/jsreport/jsreport-core#template-store), you can reference the template using name or path.

```js
{
    template: {
        name: '/myfolder/mytemplate'
    },
    data: { foo: "hello world"}
    ...
}
```

The render returns promise with the single response value
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

The convention is that jsreport repository extension  starts with `jsreport-xxx`, but the extension real name and also the recipes or engines it registers excludes the `jsreport-` prefix. This means if you install extension `jsreport-handlebars` the engine's name you specify in the render should be `handlebars`.


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

Additionally jsreport provides global variables which can be used to build the local script path and read it.

```js
const jsreport = require('@jsreport/jsreport-core')({
	sandbox: { allowedModules: '*' }
})

jsreport.init().then(() => {
  return jsreport.render({
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
})
```

The following variables are available in the global scope:

`__rootDirectory` - two directories up from jsreport-core
`__appDirectory` - directory of the script which is used when starting node
`__parentModuleDirectory` - directory of script which was initializing jsreport-core

## Extensions
As you see in the first example. Even for the simplest pdf printing you need to install additional packages(extensions).  This is the philosophy of jsreport and you will need to install additional extensions very often. There are not just extensions adding support for a particular templating engine or printing technique. There are many extensions adding support for persisting templates, dynamic script evaluation or even visual html designer and API. To get the idea of the whole platform you can install the full [jsreport](http://jsreport.net/) distribution and pick what you like. Then you can go back to `jsreport-core` and install extensions you need.

You are also welcome to write your own extension or even publish it to the community. See the following articles how to get started.

- [Implementing custom jsreport extension](http://jsreport.net/learn/custom-extension)
- [Implementing custom jsreport recipe](http://jsreport.net/learn/custom-recipe)
- [Implementing custom jsreport engine](http://jsreport.net/learn/custom-engine)

## Extensions auto discovery
jsreport by default auto discovers extensions in the application's directory tree. This means jsreport by default searches for files `jsreport.config.js` which describes the extensions and applies all the extensions that are found.

jsreport extensions auto discovery slows down the startup and can be explicitly overrided using `use` function.

```js
const jsreport = require('@jsreport/jsreport-core')({...})
jsreport.use(require('@jsreport/jsreport-phantom-pdf')())
jsreport.use(require('@jsreport/jsreport-jsrender')())
jsreport.init()
```

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
2. command line arguments
3. process environment variables
4. options passed directly to `require('@jsreport/jsreport-core')({})`

Each extension (recipe, store...) usually provides some options you can apply and adapt its behavior. These options can be typically set through standard configuration under the top level `extensions` property, options in there with the name corresponding to the extension's name are forwarded to the particular extension. This is the common way how to globally configure all extensions at one place.

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
jsreport extensions are mainly using the system of event listeners to adapt the rendering process. Extension can for example listen to event which is called before the rendering process starts and adapt the input values.

```js
//jsreport must be initialized at this time
jsreport.beforeRenderListeners.add('name-of-listener', (req, res) => {
	req.template.content = 'Changing the template in listener!'
})
```

To start listening you must first add the listener function to the right listener. In the example is used `beforeRenderListeners` which is called before the rendering starts. jsreport then in the right time sequentially fires all the listener functions and let them do the required work. If the function returns a promise, jsreport awaits until it is fulfilled.

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
jsreport includes also visual html studio and rest API. This is provided through two extensions, [jsreport-express](https://github.com/jsreport/jsreport-express) extension to have a web server available and [jsreport-studio](https://github.com/jsreport/jsreport-studio) for the web UI, both extensions should be installed in order to have studio ready. See the documentation of each extension for details.

## Template store
`jsreport-core` includes API for persisting and accessing report templates. This API is then used by extensions mainly in combination with jsreport [studio](#studio). `jsreport-core` implements just in-memory persistence, but you can add other persistence methods through extensions. See the [list](#store-providers).

The persistence API is almost compatible to mongodb API:
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
## List of extensions

### Store providers
- [jsreport-fs-store](https://github.com/jsreport/jsreport-fs-store)
- [jsreport-mongodb-store](https://github.com/jsreport/jsreport-mongodb-store)
- [jsreport-embedded-store](https://github.com/jsreport/jsreport-embedded-store)
- [jsreport-mssql-store](https://github.com/jsreport/jsreport-mssql-store)
- [jsreport-postgres-store](https://github.com/jsreport/jsreport-postgres-store)

### Engines
- [jsreport-jsrender](https://github.com/jsreport/jsreport-jsrender)
- [jsreport-handlebars](https://github.com/jsreport/jsreport-handlebars)
- [jsreport-ejs](https://github.com/jsreport/jsreport-ejs)
- [jsreport-jade](https://github.com/bjrmatos/jsreport-jade)

### Recipes
- [jsreport-chrome-pdf](https://github.com/jsreport/jsreport-chrome-pdf)
- [jsreport-phantom-pdf](https://github.com/jsreport/jsreport-phantom-pdf)
- [jsreport-electron-pdf](https://github.com/bjrmatos/jsreport-electron-pdf)
- [jsreport-weasyprint-pdf](https://github.com/jsreport/jsreport-weasyprint-pdf)
- [jsreport-text](https://github.com/jsreport/jsreport-text)
- [jsreport-xlsx](https://github.com/jsreport/jsreport-xlsx)
- [jsreport-html-to-xlsx](https://github.com/jsreport/jsreport-html-to-xlsx)

- [jsreport-phantom-image](https://github.com/jsreport/jsreport-phantom-image)
- [jsreport-html-to-text](https://github.com/jsreport/jsreport-html-to-text)
- [jsreport-fop-pdf](https://github.com/jsreport/jsreport-fop-pdf)
- [jsreport-client-html](https://github.com/jsreport/jsreport-client-html)
- [jsreport-wrapped-html](https://github.com/jsreport/jsreport-embedding)
- [jsreport-wkhtmltopdf](https://github.com/jsreport/jsreport-wkhtmltopdf)

### Misc

- [jsreport-express (studio)](https://github.com/jsreport/jsreport-express)
- [jsreport-data](https://github.com/jsreport/jsreport-data)
- [jsreport-scripts](https://github.com/jsreport/jsreport-scripts)
- [jsreport-reports](https://github.com/jsreport/jsreport-reports)
- [jsreport-images](https://github.com/jsreport/jsreport-images)
- [jsreport-scheduling](https://github.com/jsreport/jsreport-scheduling)
- [jsreport-statistics](https://github.com/jsreport/jsreport-statistics)
- [jsreport-public-templates](https://github.com/jsreport/jsreport-public-templates)
- [jsreport-authorization](https://github.com/jsreport/jsreport-authorization)
- [jsreport-authentication](https://github.com/jsreport/jsreport-authentication)
- [jsreport-child-templates](https://github.com/jsreport/jsreport-child-templates)
- [jsreport-embedding](https://github.com/jsreport/jsreport-embedding)
- [jsreport-resources](https://github.com/jsreport/jsreport-resources)
- [jsreport-static-resources](https://github.com/jsreport/jsreport-static-resources)
- [jsreport-client-app](https://github.com/jsreport/jsreport-client-app)
- [jsreport-freeze](https://github.com/jsreport/jsreport-freeze)
- [jsreport-debug](https://github.com/jsreport/jsreport-debug)

### Blob storages
- [jsreport-azure-storage](https://github.com/jsreport/jsreport-azure-storage)

## License
LGPL
