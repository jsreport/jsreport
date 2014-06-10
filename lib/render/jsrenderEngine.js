/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

module.exports = function (html, helpers, data) {
    var jsrender = require('node-jsrender');
    
    jsrender.jsviews.views.settings.tryCatch = false;
  
    jsrender.loadString('template', html);

    return jsrender.render.template(data || {}, helpers);
}