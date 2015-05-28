/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Extension allowing to assemble and render template using other child templates.
 * Syntax is {#child [template name]}
 */

var q = require("q"),
    asyncReplace = require("async-replace"),
    extend = require("node.extend");

var ChildTemplates = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    var self = this;
    reporter.beforeRenderListeners.add(definition.name, this, function (request, response) {
        return self.evaluateChildTemplates(request, response, true);
    });

    reporter.afterTemplatingEnginesExecutedListeners.add(definition.name, this, function (request, response) {
        return self.evaluateChildTemplates(request, response, false);
    });
};

ChildTemplates.prototype.evaluateChildTemplates = function (request, response, evaluateInTemplateContent) {
    var self = this;

    request.childsCircleCache = request.childsCircleCache || {};

    function convert(str, p1, offset, s, done) {
        if (request.childsCircleCache[p1] && request.options.isChildRequest) {
            var e = new Error("circle in using child template " + p1);
            e.weak = true;
            return done(e);
        }

        request.childsCircleCache[p1] = true;

        self.reporter.documentStore.collection("templates").find({name: p1}).then(function (res) {
            if (res.length < 1)
                return done(null);

            var req = extend(true, {}, request);

            req.template = res[0];
            req.options.isChildRequest = true;
            self.reporter.logger.debug("Rendering child template " + p1);
            return self.reporter.render(req).then(function (resp) {
                done(null, resp.content.toString());
            });
        }).catch(done);
    }

    var test = /{#child ([^{}]{0,50})}/g;

    return q.nfcall(asyncReplace, evaluateInTemplateContent ? request.template.content : response.content.toString(), test, convert).then(function (result) {
        if (evaluateInTemplateContent) {
            request.template.content = result;
        }
        else {
            response.content = new Buffer(result);
        }
    });
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new ChildTemplates(reporter, definition);
};