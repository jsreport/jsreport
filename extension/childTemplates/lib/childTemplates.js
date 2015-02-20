/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Extension allowing to assemble and render template using other child templates.
 * Syntax is {#child [template name]}
 */

var Q = require("q"),
    asyncReplace = require("async-replace"),
    extend = require("node.extend");

var ChildTemplates = function(reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    reporter.beforeRenderListeners.add(definition.name, this, ChildTemplates.prototype.handleBeforeRender);
};

ChildTemplates.prototype.handleBeforeRender = function(request, response) {
    var self = this;
    
    var isRootRequest = false;
    if (!request.childs) {
        request.childs = {};
        isRootRequest = true;
    }

    request.childs.childsCircleCache = request.childs.childsCircleCache || {};

    function convert(str, p1, offset, s, done) {
        if (request.childs.childsCircleCache[p1] && !isRootRequest) {
            return done(null, "circle in using child template " + p1);
        }

        request.childs.childsCircleCache[p1] = true;

        self.reporter.documentStore.collection("templates").find({ name: p1 }).then(function(res) {
            if (res.length < 1)
                return done(null);

            var req = extend(true, {}, request);

            if (!isRootRequest)
                req.childs.childsCircleCache = request.childs.childsCircleCache;

            req.template = res[0];
            req.options.isRootRequest = false;
            return self.reporter.render(req).then(function(resp) {
                done(null, resp.result);
            });
        }).catch(done);
    }

    var test = /{#child ([^{}]{0,50})}/g;

    return Q.nfcall(asyncReplace, request.template.content, test, convert).then(function(result) {
        request.template.content = result;
    });
};

module.exports = function(reporter, definition) {
    reporter[definition.name] = new ChildTemplates(reporter, definition);
};