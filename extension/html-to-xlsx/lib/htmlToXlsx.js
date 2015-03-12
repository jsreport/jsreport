/*! 
 * Copyright(c) 2014 Jan Blaha
 *
 * html-to-xlsx recipe transforms html into xlsx. The process is based on extracting html and css attributes
 * using phantomjs and then assembling excel Open XML.
 */

var path = require("path"),
    q = require("q");

var conversion;

module.exports = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "html-to-xlsx",
        execute: function (request, response) {
            return reporter.renderContent(request, response).then(function () {
                return q.nfcall(conversion, response.result).then(function (stream) {
                    return reporter.xlsx.responseXlsx(request, response, stream);
                });
            });
        }
    });

    if (!conversion) {
        conversion = require("html-to-xlsx")({
            numberOfWorkers: 1
        });
    }
};