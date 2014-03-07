# jsreport

[![Build Status](https://travis-ci.org/jsreport/jsreport.png?branch=master)](https://travis-ci.org/jsreport/jsreport)

**Open source platform for designing and rendering various business reports.**

It uses different approach than the most of the other commercial platforms. It's intention is not to provide an ultimate fancy UI with report designer like other does. Idea is that any fancy WYSIWYG editor will never be good enough to the developers. jsreport lets developers to define reports using  javascript templating engines (like jsrender or handlebars). For more informations about the platform please visit http://jsreport.net

## Development
To be able to install and start jsreport on your development machine you need to do following.
1. Install nodejs
2. Install and start mongodb
3. Install java and apache fop into the executable path, if you want to execute fop-pdf recipe
4. Install phantomjs into the executable path, if you want to executa phantom-pdf recipe
5. Clone this repository
6. Provide connection string into config.js
7. cmd in the local repo dir: npm install 
8. cmd in the local repo dir: node server.js

jsreport has two test suits:
grunt test - start unit tests, only running mongodb is required
grunt test-all - start all tests, java, fop and phantomjs must be in the exec path

## Extensions and Contributions
The easisest way how to contribute to jsreport open source community is to implement jsreport extension.
The detail description how to do it is located here.

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
