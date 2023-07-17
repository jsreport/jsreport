const jsreportStudioDev = require('@jsreport/studio-dev')
const createBabelOptions = jsreportStudioDev.babelOptions

const babelOptions = Object.assign(createBabelOptions({ withReact: true, withTransformRuntime: true }), {
  // we don't want to take config from babelrc files
  babelrc: false
})

require('@babel/register')(babelOptions);

var JSDOM = require('jsdom').JSDOM;

var exposedProperties = ['window', 'navigator', 'document'];

var dom = new JSDOM('', {
  url: "http://localhost",
  pretendToBeVisual: true
}).window;

global.document = dom.document;
global.window = document.defaultView

Object.keys(document.defaultView).forEach((property) => {
  if (typeof global[property] === 'undefined') {
    exposedProperties.push(property);
    global[property] = document.defaultView[property];
  }
});

global.navigator = {
  userAgent: 'node.js'
};

//documentRef = document;
