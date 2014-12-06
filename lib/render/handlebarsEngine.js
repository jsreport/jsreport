/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

module.exports = function (html, helpers, data) {
    var handlebars = require("handlebars");

    if (helpers) {
        for (var h in helpers) {
            if (helpers.hasOwnProperty(h))
                handlebars.registerHelper(h, helpers[h]);
        }
    }

    // replace {#image {{a}}} with {#image {{a}}%}% and back so it compiles
    html = html.replace(/({#[^{}]{0,20} {{{[^{}]{0,20})(}}}})/g, "$1}}}%}%");
    html = html.replace(/({#[^{}]{0,20} {{[^{}]{0,20})(}}})/g, "$1}}%}%");

    var compiledTemplate = handlebars.compile(html);
    return compiledTemplate(data).replace("%}%", "}");
};