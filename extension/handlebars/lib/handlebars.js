/*! 
 * Copyright(c) 2014 Jan Blaha 
 */

var fs = require("fs"),
    path = require("path");

module.exports = function (reporter, definition) {

    var handlebarsPath = path.join(__dirname, "../", "../", "../", "node_modules", "toner-handlebars", "node_modules", "handlebars");

    //make sure this works also with flattened packages and when the main app references handlebars
    if (!fs.existsSync(handlebarsPath))
        handlebarsPath = path.join(__dirname, "../", "../", "../", "../", "handlebars");

    if (!fs.existsSync(handlebarsPath))
        handlebarsPath =  path.join(__dirname, "../", "../", "../", "node_modules", "handlebars");

    reporter.options.tasks.nativeModules.push({
        globalVariableName: "handlebars",
        module: handlebarsPath
    });

    reporter.extensionsManager.engines.push({
        name: "handlebars",
        pathToEngine: require("toner-handlebars")
    });

    reporter.documentStore.addFileExtensionResolver(function(doc, entitySetName, entityType, propertyType) {
        if (doc.engine === "handlebars" && propertyType.document.engine) {
            return "handlebars";
        };
    });
};