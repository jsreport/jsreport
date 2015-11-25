# jsreport
[![NPM Version](http://img.shields.io/npm/v/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![NPM Downloads](https://img.shields.io/npm/dm/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![Build Status](https://travis-ci.org/jsreport/jsreport.png?branch=master)](https://travis-ci.org/jsreport/jsreport)

**Official distribution of jsreport**<br/>
*An open source platform for designing and rendering various reports.*

jsreport is a reporting server which lets developers define reports using  javascript templating engines (like jsrender or handlebars). It supports various report output formats like html, pdf, excel and others.  It also includes advanced reporting features like user management, REST API, scheduling, designer or sending emails.

You can find more information on the official project website http://jsreport.net

## Installation
see [http://jsreport.net/downloads](http://jsreport.net/downloads)

> **npm install jsreport**<br/>
> **node node_modules/jsreport --init**<br/>
> **npm start**

To change environment use cmd `set NODE_ENV=development` or use options your IDE provides. If you don't specify node environment jsreport assumes production as default.

##Configuration
jsreport loads `dev.config.json` or `prod.config.json` configuration file on start up based on nodejs environment. The configuration file is the most common way to adapt jsreport settings like http port. In addition to configuration file you can use also corresponding command line arguments or options passed directly through nodejs code.

See [config](https://github.com/jsreport/jsreport/blob/master/config.md) documentation for details.

##Extensions
The jsreport official distribution includes the most of the currently implemented extensions. However there are still new extensions popping up which are not yet part of jsreport and you may like to additionally install it. See the list of extensions [here](https://github.com/jsreport/jsreport-core#list-of-extensions).

You are also not limited to extensions we provide to you and  you can implement your own. See the [Implementing custom extension](http://jsreport.net/learn/custom-extension) article.

## Node.js

You can find documentation for adapting this jsreport distribution using nodejs and also information for integrating it into an existing nodejs application in article [adapting jsreport](http://jsreport.net/learn/adapting-jsreport).

This distribution includes many extensions like jsreport studio you may not need. To start from the ground see repository [jsreport-core](https://github.com/jsreport/jsreport-core).

##Contributions

jsreport is split into many separated repositories usually representing extensions or other reusable libraries. Please forward your contributions to the dedicated repository.

##Roadmap

Following we have in mind for the upcoming release 1.0

- **drag and drop designer**
- electron based studio and client application
- new recipes using electron to print pdf
- sql based template storage
- image reports
- azure blob storage support
- tons of new extensions, recipes, engines....


**Missing a feature? Submit a feature request.**

##Licensing
Copyright (C) 2015 Jan Blaha

Do you want to use jsreport for a personal purpose, in a school project or a non-profit organisation?
Then you don't need the author's permission, just go on and use it. You can use jsreport without author's permission
also when having maximum 5 templates stored in jsreport storage.

For commercial projects using more than 5 stored report templates see [Pricing page](http://jsreport.net/buy).

Under any of the licenses, free or not, you are allowed to download the source code and make your own edits.


