


# jsreport

[![Join the chat at https://gitter.im/jsreport/jsreport](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jsreport/jsreport?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![NPM Version](http://img.shields.io/npm/v/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![NPM Downloads](https://img.shields.io/npm/dt/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![Docker Pulls](https://img.shields.io/docker/pulls/jsreport/jsreport)](https://hub.docker.com/r/jsreport/jsreport)
[![Build Status](https://travis-ci.org/jsreport/jsreport.png?branch=master)](https://travis-ci.org/jsreport/jsreport)

**Official distribution of jsreport**<br/>
*An open-source platform for designing and rendering various reports.*

jsreport is a reporting server which lets developers define reports using  javascript templating engines (like jsrender or handlebars). It supports various report output formats like html, pdf, excel and others.  It also includes advanced reporting features like user management, REST API, scheduling, designer or sending emails.

You can find more information on the official project website https://jsreport.net    

![studio](https://github.com/jsreport/website/blob/master/public/img/jsreport-demo.gif?raw=true)

## Installation
see [https://jsreport.net/on-prem](http://jsreport.net/on-prem)

> **npm install -g jsreport-cli**<br/>
> **jsreport init**<br/>
> **jsreport configure**<br/>
> **jsreport start**

To change environment use cmd `set NODE_ENV=development` or use options your IDE provides. If you don't specify node environment jsreport assumes `development` as default.

## Documentation

see [https://jsreport.net/learn](https://jsreport.net/learn) for an overview of concepts, guides, clients and general documentation.

## Configuration
jsreport loads `jsreport.config.json` configuration file on start. The configuration file is the most common way to adapt jsreport settings like http port. In addition to configuration file you can use also corresponding command-line arguments or options passed directly through nodejs code.

See [config](https://jsreport.net/learn/configuration) documentation for details.

## Extensions
The jsreport official distribution includes the most of the currently implemented extensions. However, there are still new extensions popping up which are not yet part of jsreport and you may like to additionally install it. See the list of extensions [here](https://github.com/jsreport/jsreport-core#list-of-extensions).

You are also not limited to extensions we provide to you and  you can implement your own. See the [Implementing custom extension](https://jsreport.net/learn/custom-extension) article.

## Node.js

You can find documentation for adapting this jsreport distribution using nodejs and also information for integrating it into an existing nodejs application in the article [adapting jsreport](https://jsreport.net/learn/adapting-jsreport).

This distribution includes many extensions like jsreport studio you may not need. To start from the ground see repository [jsreport-core](https://github.com/jsreport/jsreport-core).

## Contributions

jsreport is split into many separated repositories usually representing extensions or other reusable libraries. Please forward your contributions to the dedicated repository.

## Roadmap
- integrate to the xlsx recipe the same templating capabilities as in the docx
- pdf linearization, PDF/A
- docx/pptx - simple html embedding, raw openxml, memory optimization
- word extension for reports design
- async studio rendering - real-time log output
- signing jsreport.exe
- html-to-xlsx - images, filters...
- nodejs workers usage
- drag and drop designer [#121](../../issues/121) 

More in the [backlog](https://github.com/jsreport/jsreport/issues).

**Missing a feature? Submit a feature request.**

## Vulnerabilities

We guarantee every release is stable and has 0 vulnerabilities mentioned in the npm audit. When you see a security warning in your audit, please just wait until we release the next version with the dependencies update, there is no need to create a ticket for it. In case you see a direct impact on jsreport security, please send us an email and we will apply a direct hotfix if it will be possible.

## Licensing
Copyright (C) 2020 Jan Blaha

Do you want to use jsreport for a personal purpose, in a school project or a non-profit organization?
Then you don't need the author's permission, just go on and use it. You can use jsreport without the author's permission
also when having a maximum 5 templates stored in jsreport storage.

For commercial projects using more than 5 stored report templates see [Pricing page](https://jsreport.net/buy).

Under any of the licenses, free or not, you are allowed to download the source code and make your own edits.

In every case, there are no warranties of any kind provided:

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
