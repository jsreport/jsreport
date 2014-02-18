var winston = require("winston"),
    Q = require("q"),
    asyncReplace = require("async-replace");

var logger = winston.loggers.get('jsreport');

module.exports = function(reporter, definition) {
    reporter[definition.name] = new ChildTemplates(reporter, definition);
};

ChildTemplates = function(reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    reporter.extensionsManager.beforeRenderListeners.add(definition.name, this, ChildTemplates.prototype.handleBeforeRender);
};

ChildTemplates.prototype.handleBeforeRender = function(request, response) {
    var self = this;
    var promise = Q.defer();

    function convert(str, p1, offset, s, done) {
        request.context.templates.filter(function(t) { return t.name == this.name; }, { name: p1 }).toArray().then(function(res) {
            if (res.length < 1)
                return done(null);
            
            self.reporter.render(res[0], request.data, { }, function(err, resp) {
                done(null, resp.result);
            });
        });
    }
    
    var test = /{#([^{}]+)+}/g;

    asyncReplace(request.template.html, test, convert, function(er, result) {
        request.template.html = result;
        promise.resolve();
    });


    return promise.promise;
};