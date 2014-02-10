# jsReport

[![Build Status](https://travis-ci.org/jsreport/jsreport.png?branch=master)](https://travis-ci.org/jsreport/jsreport)

jsReport is free open source platform for designing and rendering various business reports.

It uses different aproach than the most of the other comercial platforms. It's intention is not to provide an ultimate fancy UI with report designer like other does. Idea is that any fancy wysiwyg editor will never be good enought to the developers. jsReport lets developers to define reports using code (mostly javascript).


The reports are defined using standard javascript templating engines (like jsrender or handlebars) which developers can choose. Using markup langage these engines provides is the report afterwards defined. jsReport is great for rendering output formats based on xml like html. It can also easily convert html into pdf using phantomjs. Or even generate precise pdf using Apache FOP. Output formats can be easily extended by jsReport recipes.

There are three versions of jsReport:

 * [playground](http://jsreport.net/plaground) for trying and fiddling with reports
 * [on-prem](http://jsreport.net/on-prem) for installing jsReport on your server
 * [online](http://jsreport.net/online) for using multitenant SaaS jsReport in the cloud

For more informations visit http://jsreport.net

## License 

(The MIT License)

Copyright (c) 2014 Jan Blaha &lt;jan.blaha@hotmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.