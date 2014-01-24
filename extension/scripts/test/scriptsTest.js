var assert = require("assert"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    Q = require("q");


describeReporting(["scripts"], function (reporter) {

    describe('scripts', function () {
        
        function prepareTemplate(scriptContent) {
            var script = new reporter.scripts.ScriptType({ content: scriptContent });
            reporter.scripts.entitySet.add(script);
            return reporter.scripts.entitySet.saveChanges().then(function () {
                return reporter.templates.create({
                    html: "foo",
                    scriptId: script._id
                });
            });
        }
        
        function prepareRequest(scriptContent) {
            return prepareTemplate(scriptContent).then(function(template) {
                return Q({
                    request: { template: template }, 
                    response: {}
                });
            });
        }

        it('shoulb be able to modify response', function (done) {
            prepareRequest("response.test = 'xxx'; done()").then(function(res) {
                reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.response.test);
                    done();
                });
            });
        });
        
        it('shoulb be able to use linked modules', function (done) {
            var scriptContent = "var h = require('handlebars'); " +
                "var compiledTemplate = h.compile('foo'); " +
                "response.test = compiledTemplate();" +
                "done();";
            
            prepareRequest(scriptContent).then(function (res) {
                reporter.scripts.handleBeforeRender(res.request, res.response).then(function() {
                    assert.equal('foo', res.response.test);
                    done();
                });
            });
        });
        
        it('shoulb not be able to read local files', function (done) {
            var scriptContent = "var fs = require('fs'); " +
                "fs.readdir('d:\', function(err, files) { response.filesLength = files.length; done(); });";

            prepareRequest(scriptContent).then(function(res) {
                reporter.scripts.handleBeforeRender(res.request, res.response).fail(function() {
                    assert.equal(res.response.filesLength == null, true);
                    done();
                });
            });
        });
    });
});