# jsreport

[![Build Status](https://travis-ci.org/jsreport/jsreport.png?branch=master)](https://travis-ci.org/jsreport/jsreport)

**Open source platform for designing and rendering various reports.**

jsreport lets developers to define reports using  javascript templating engines (like jsrender or handlebars) and print them into pdf using [phantomjs](http://phantomjs.org) or [fop](http://xmlgraphics.apache.org/fop/). For more informations about the platform please visit http://jsreport.net

## Development
To be able to install and start jsreport on your development machine you need to do following.

1. install nodejs
2. clone this repository
3. npm install
4. grunt init
5. set NODE_ENV=development
6. node lib/server.js

jsreport has two test suits:
**grunt test** - start unit tests, only running mongodb is required
**grunt test-all** - start all tests, needs to have java and apache in the executable path

## Extensions and Contributions
The easisest way how to contribute to jsreport open source community is to implement jsreport extension.
Please see [contrib repository](https://github.com/jsreport/jsreport-contrib) for examples.

Pull requests to this core repository are also welcome.

##Roadmap

###current
jsreport is currently in beta state. We are focusing mostly on the following areas:

1. Fixing incoming bugs from users
2. Improve codebase to make easier open source contributions, splitting main jsreport github repository into separated jsreport, playground, online
3. Provide playground and online hosted solutions high availability in azure
4. Java sdk
5. Collect new features for jsreport vNext

###vNext

Following features are currently on the list, but it's subject to be changed.

####Scheduled reports generation

####End user custom reporting extension 
Developers can export from jsreport lightweight embeddable html page allowing end user to simply modify report colors or reorganize report by drag and drop.

####Visual studio integration

####Chrome javascript helpers debugging

####Other features???

## License 

Copyright (c) 2014 Jan Blaha &lt;jan.blaha at hotmail.com&gt;

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see http://www.gnu.org/licenses/agpl-3.0.html.
