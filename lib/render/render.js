/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Rendering wrapper that is starting actual rendering safely in child process.
 */

var path = require("path"),
    q = require("q");

var _prepareTemplate = function (request, cb) {
    if (!request.template)
        throw new Error("template must be defined");

    if (!request.template.content && request.template.content !== "")
        throw new Error("content must be defined");

    request.template.helpers = request.template.helpers || "{}";
    request.template.engine = request.template.engine || "handlebars";
};

var _renderHtml = function (request, response) {
    return request.taskManager.execute({
        body: {
            template: request.template.initData || request.template,
            data: request.data || {}
        },
        execModulePath: path.join(__dirname, "renderExecution.js"),
        timeout: request.options.timeout
    }).then(function(resp) {
        response.result = resp.content;
        return response;
    });
};

module.exports = function (request, response) {

    return q().then(function() {
        _prepareTemplate(request);
    }).then(function() {
        return _renderHtml(request, response);
    });
};

