/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

var regex = new RegExp(/<script[^>]*id=["'](.*?)["'].*type=["']text\/x-jsrender['"].*>([\s\S]*?)<\/script>/gi);

module.exports = function (html, helpers, data) {
    var jsrender = require('node-jsrender');

    //load <script id="columnTemplate" type="text/x-jsrender"> ... </script> jsrender child templates
    var matches = html.match(regex);
    for (i in matches) {
        var parts = regex.exec(matches[i]);
        jsrender.loadString(parts[1], parts[2]);
        html = html.replace(parts[0], "");
    }

    if (html === "")
        return html;

    jsrender.jsviews.views.settings.tryCatch = false;

    jsrender.loadString('template', html);

    return jsrender.render.template(data || {}, helpers);
}