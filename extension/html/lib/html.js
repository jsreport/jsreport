/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var q = require("q"),
    toner = require("toner");

var Html = module.exports  = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "html",
        execute: function(request, response) {
            return q.nfcall(toner.htmlRecipe, request, response);
        }
    });

    reporter.extensionsManager.engines.push({
        name: "none",
        pathToEngine: toner.noneEngine
    });
};