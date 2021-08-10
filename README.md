
# jsreport

[![Join the chat at https://gitter.im/jsreport/jsreport](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jsreport/jsreport?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![NPM Version](http://img.shields.io/npm/v/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![NPM Downloads](https://img.shields.io/npm/dt/jsreport.svg?style=flat-square)](https://npmjs.com/package/jsreport)
[![Docker Pulls](https://img.shields.io/docker/pulls/jsreport/jsreport)](https://hub.docker.com/r/jsreport/jsreport)
[![build status](https://github.com/jsreport/jsreport/actions/workflows/main.yml/badge.svg)](https://github.com/jsreport/jsreport/actions)

*An open-source platform for designing and rendering various reports.*

jsreport is a reporting server letting developers define reports using javascript templating engines like handlebars. It supports various report output formats like html, pdf, excel, docx, and others.  It also includes advanced reporting features like user management, REST API, scheduling, designer, or sending emails.

You can find more information on the official project website https://jsreport.net

![studio](https://github.com/jsreport/website/blob/master/public/img/jsreport-demo.gif?raw=true)

## Installation

Basic installation from the npm
```sh            
npm install -g @jsreport/jsreport-cli
jsreport init
jsreport configure
jsreport start
```

You can also download compiled binary or pull from the official docker images. See [https://jsreport.net/on-prem](http://jsreport.net/on-prem) for the details.

## Documentation

See the [https://jsreport.net/learn](https://jsreport.net/learn) for an overview of concepts, guides, clients, and general documentation.

## Extensions
The jsreport official distribution in npm, docker, or compiled binary includes the most commonly used extensions. However, the list of available extensions is much longer, and you may want to install some of the missing ones as well.  See the list of available packages [here](https://github.com/jsreport/jsreport/tree/master/packages) or in the [documentation](https://jsreport.net/learn).

You are also not limited to extensions we provide to you. You can implement your extensions. See the [Implementing custom extension](https://jsreport.net/learn/custom-extension) article.

## Node.js

You can find documentation for adapting this jsreport distribution using nodejs and also information for integrating it into an existing nodejs application in the article [adapting jsreport](https://jsreport.net/learn/adapting-jsreport).

The official jsreport distribution wires the most popular extensions into the ready-to-use package.
However, if you are skilled, you are free to start from the ground using [jsreport-core](https://github.com/jsreport/jsreport/tree/master/packages/jsreport-core).

## Development
We use [yarn](https://yarnpkg.com/) to manage the monorepo. The basic workflow is the following
```sh
git clone https://github.com/jsreport/jsreport
yarn install
yarn start
```
The tests for the individual package runs the following way

```
yarn workspace @jsreport/jsreport-scripts test
```

The studio extensions development with the hot reload can be started using
```
set NODE_ENV=jsreport-development&&yarn start
```

## Roadmap
- integrate to the xlsx recipe the same templating capabilities as in the docx
- pdf linearization, PDF/A
- docx/pptx - simple html embedding, raw openxml, memory optimization
- html-to-xlsx - images, filters...

More in the [backlog](https://github.com/jsreport/jsreport/issues).

**Missing a feature? Submit a feature request.**

## Vulnerabilities

We guarantee every release is stable and has 0 vulnerabilities mentioned in the npm audit. Please wait until we release the next version with the dependencies update when you see a security warning in your audit. There is no need to create a ticket for it. In case you see a direct impact on jsreport security, please send us an email and we will apply a direct hotfix if it will be possible.

## Licensing
Copyright (C) 2021 Jan Blaha

Do you want to use jsreport for a personal purpose, in a school project or a non-profit organization?
Then you don't need the author's permission, just go on and use it. You can use jsreport without the author's permission
also when having a maximum 5 templates stored in jsreport storage.

For commercial projects using more than 5 stored report templates see [Pricing page](https://jsreport.net/buy).

Under any of the licenses, free or not, you are allowed to download the source code and make your own edits.

In every case, there are no warranties of any kind provided:

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
