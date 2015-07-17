/*! 
 * Copyright(c) 2014 Jan Blaha 
 */  

module.exports  = function (reporter, definition) {
   reporter.options.tasks.nativeModules.push({
       globalVariableName: "handlebars",
       //TODO this path is broken when using flatten-packages
       module: require("path").join(__dirname, "../", "../", "../", "node_modules", "toner-handlebars", "node_modules", "handlebars") });
   reporter.extensionsManager.engines.push({
        name: "handlebars",
        pathToEngine: require("toner-handlebars")
    });
};