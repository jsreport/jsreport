var render = require('../../../render/render.js'),
    Q = require("q");

module.exports = Html = function (reporter, definition) {
    reporter.extensionsManager.recipes.push({
        name: "html",
        execute: function(request, response) {
            response.headers["Content-Type"] = "text/html";
            response.headers["File-Extension"] = "html";

            return Q.nfcall(render, request, response);
        }
    });
};