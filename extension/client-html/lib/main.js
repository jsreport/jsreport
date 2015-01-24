/*! 
 * Copyright(c) 2014 Jan Blaha
 *
 * This extension adds client-html recipe. This recipe is running inside the browser and doesn't need
 * and access to the jsreport server.
 */

var q = require("q"),
    FS = require("q-io/fs"),
    path = require("path");

module.exports = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "client-html",
        execute: function (request, response) {
            response.headers["Content-Type"] = "text/html";
            response.headers["File-Extension"] = "html";
            response.headers["Content-Disposition"] = "inline; filename=\"report.html\"";

            return FS.read(path.join(__dirname, "wrapper.html")).then(function(wrapper) {
                response.result = wrapper
                    .replace("$template", encodeURIComponent(JSON.stringify(request.template)))
                    .replace("$data", request.data ? JSON.stringify(request.data, null, 2) : "null")
                    .replace(/\$serverUrl/g, request.protocol + "://" + request.headers.host);
            });
        }
    });
};