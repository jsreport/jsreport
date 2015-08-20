# jsreport
[![NPM Version](http://img.shields.io/npm/v/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![NPM Downloads](https://img.shields.io/npm/dm/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![Build Status](https://travis-ci.org/jsreport/jsreport.png?branch=master)](https://travis-ci.org/jsreport/jsreport)

**Open source platform for designing and rendering various reports.**

jsreport is a reporting server which lets developers define reports using  javascript templating engines (like jsrender or handlebars). It supports various report output formats like html, pdf, excel and others.  It also includes advanced reporting features like user management, REST API, scheduling, designer or sending emails.

You can find more information on the official project website http://jsreport.net

## Production installation
see [http://jsreport.net/downloads](http://jsreport.net/downloads)

## Development
To be able to install and start jsreport on your development machine you need to do following.

1. install nodejs
2. clone this repository
3. npm install
4. npm start

You may find installation troubleshooting guide specific for your platform [here](https://github.com/jsreport/docs/tree/master/installation).

See [Gruntfile.js](https://github.com/jsreport/jsreport/blob/master/Gruntfile.js) for build automation options.

###Environemnts
jsreport adapts to `production` and `development` nodejs environments. Difference is that in `production` environment you get javascript files combined and minified for fast web application startup opposite to `development` environment where you get all js files individually what makes debugging easier. Second difference is that in `production` environment jsreport use `prod.config.json` as configuration file opposite to `dev.config.json` in `development.

To change environment use cmd `set NODE_ENV=development` or use options your IDE provides. If you don't specify node environment jsreport assumes production as default.

###Configurations
jsreport loads `dev.config.json` or `prod.config.json` configuration file on start up based on nodejs environment. If configuration file is not found, jsreport creates default configuration file from `example.config.json`.

See [config](https://github.com/jsreport/jsreport/blob/master/config.md) documentation for details.

###Tests

 **grunt test** - start tests with file system based db (neDb), no mongo needed

 **grunt test-mongo** - start tests with mongo db, mongodb must be running on localhost

 **grunt test-all** - start tests with nedb and then once again with mongo (used with travis CI)

 **grunt test-integration** - start all tests with nedb including integration tests,  needs java, fop and phantomjs running

##Contributions

jsreport is split into many separated repositories usually representing reusable libraries. All of the repositories accepts
pull requests without further complications. Only this main jsreport repository currently requires you to send us a
signed [contributor license agreement](http://jsreport.net/CopyrightAssignmentAgreement.pdf). This will be required only
for limited time until we will separate this repository into free GPL licensed jsreport and repository with payed enterprise features.

To motivate contributions we provide free enterprise licenses to contributors.

##Roadmap

We are currently planning next development, some of these features we have in mind..

- drag and drop designer
- improved statistics extension with logs from failed requests
- all templates wide scripts
- code completion for templating engines based on sample data


**Missing a feature? Submit a feature request.**

##Licensing
Copyright (C) 2015 Jan Blaha

Do you want to use jsreport for a personal purpose, in a school project or a non-profit organisation?
Then you don't need the author's permission, just go on and use it. You can use jsreport without author's permission
also when having maximum 5 templates stored in jsreport storage.

For commercial projects using more than 5 stored report templates see [Pricing page](http://jsreport.net/buy).

Under any of the licenses, free or not, you are allowed to download the source code and make your own edits.


