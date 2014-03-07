/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

module.exports = function (html, helpers, data) {
    var handlebars = require("handlebars");

    if (helpers != null) {
        for (var h in helpers) {
            handlebars.registerHelper(h, helpers[h]);
        }
    }

    var compiledTemplate = handlebars.compile(html);
    return compiledTemplate(data);
};