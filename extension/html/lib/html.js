/*! 
 * Copyright(c) 2014 Jan Blaha 
 */ 

var Q = require("q"),
    FS = require("q-io/fs"),
    path = require("path");

var Html = module.exports  = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "html",
        execute: function(request, response) {
            response.headers["Content-Type"] = "text/html";
            response.headers["File-Extension"] = "html";
            response.headers["Content-Disposition"] = "inline; filename=\"report.html\"";

            return reporter.renderContent(request, response);
        }
    });
};