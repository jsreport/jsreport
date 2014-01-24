var render = require('../../../render/render.js'),
    Q = require("q");

module.exports = Html = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "html",
        execute: function(request, response) {
            response.contentType = "text/html";
            response.fileExtension = "html";

            return Q.nfcall(render, request, response);
        }
    });
};