/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var q = require("q");

module.exports  = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "client-html",
        execute: function(request, response) {
            return q.fail("This recipe should be executed on the client side.");
        }
    });
};