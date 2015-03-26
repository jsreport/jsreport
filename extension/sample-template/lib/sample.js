/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Sample report used in standard and multitenant version
 */

var util = require("util"),
    async = require("async"),
    _ = require("underscore"),
    join = require("path").join,
    fs = require("fs"),
    Q = require("q");

module.exports = function (reporter, definition) {

    reporter.initializeListener.add(definition.name, this, function () {

        if (!reporter.settings.get("sample-created")) {
            var dataObj = {
                name: "Sample data",
                dataJson: fs.readFileSync(join(__dirname, 'sample/data.js')).toString("utf8")
            };

            var templateObj = {
                name: "Sample report",
                content: fs.readFileSync(join(__dirname, 'sample/sample.html')).toString("utf8"),
                helpers: fs.readFileSync(join(__dirname, 'sample/helpers.js')).toString("utf8"),
                engine: "handlebars",
                recipe: "phantom-pdf",
                phantom: {
                    header: "<h1 style='background-color: lightGray'>Library monthly report</h1> "
                }
            };

            return reporter.documentStore.collection("data").insert(dataObj).then(function () {
                templateObj.data = {
                    shortid: dataObj.shortid
                };

                return reporter.documentStore.collection("templates").insert(templateObj).then(function () {
                    return reporter.settings.add("sample-created", true);
                });
            });
        }
    });
};
