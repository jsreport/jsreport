# jsreport

[![Build Status](https://travis-ci.org/jsreport/jsreport.png?branch=master)](https://travis-ci.org/jsreport/jsreport)

**Open source platform for designing and rendering various reports.**

jsreport is a reporting sever which lets developers define reports using  javascript templating engines (like jsrender or handlebars). It supports various report output formats like html, pdf, excel and others.  It also includes advanced reporting features like user management, REST API, scheduling, designer or sending emails.

For more informations about the platform please visit http://jsreport.net

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

## Contributions
The easiest way how to contribute to jsreport open source community is to implement jsreport extension. Pull requests to this core repository are also welcome.

##Roadmap

The project is currently in the stabilization phase. 

Features which should come shortly in Q1 2015:
 
- java sdk
- advanced pdf features: table of contents, metadata
- code quality: splitting jsreport into multiple npm packages, more tests, replace jaydata
- better logging

Features planned for Q2 2015

- some kind of a WYSIWYG editor integrated to embedded designer allowing non-developers to customize reports

**Missing a feature? Submit a feature request.**




## License 

Copyright (c) 2014 Jan Blaha &lt;jan.blaha at hotmail.com&gt;


This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 3.0 of the License, or (at your option) any later version.
This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU
Lesser General Public License](http://www.gnu.org/licenses/lgpl.html) for more details.
You should have received a copy of the GNU Lesser General Public
License along with this library.


