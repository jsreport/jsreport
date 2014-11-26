/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

var regex = /<script[^>]*id=["'](.*?)["'].*type=["']text\/x-jsrender['"][\s\S.^>]*?>([\s\S]*?)<\/script>/gi;
var jsrender = require('node-jsrender');

function trim (str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

module.exports = function (html, helpers, data) {
    //load <script id="columnTemplate" type="text/x-jsrender"> ... </script> jsrender child templates
    var templates = [];
    var matches = html.match(new RegExp(regex));

    try {

        jsrender.jsviews.views.settings.tryCatch = false;

        for (var i in matches) {
            var parts = new RegExp(regex).exec(matches[i]);
            templates.push(parts[1]);
            jsrender.loadString(parts[1], trim(parts[2]));
            html = html.replace(parts[0], "");
        }

        jsrender.loadString('template', html);

        return jsrender.render.template(data || {}, helpers);
    }
    finally {
        //templates are registered globally, we need to remove them afterwards so other requests don't see them
        //actually I don't know how to physically remove them, so I just assign template name to its content and
        //that has same affect as removing.
        for (var id in templates) {
            jsrender.loadString(templates[id], templates[id]);
        }
    }
}