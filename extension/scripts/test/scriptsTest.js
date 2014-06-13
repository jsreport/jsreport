/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    q = require("q");


describeReporting(path.join(__dirname, "../../"), ["html", "templates", "scripts"], function (reporter) {

    describe('scripts', function () {
        
        function prepareTemplate(scriptContent) {
            var script = new reporter.scripts.ScriptType({ content: scriptContent });
            reporter.context.scripts.add(script);
            return reporter.context.scripts.saveChanges().then(function () {
                return reporter.templates.create({
                    content: "foo",
                    scriptId: script.shortid
                });
            });
        }
        
        function prepareRequest(scriptContent) {
            return prepareTemplate(scriptContent).then(function(template) {
                return q({
                    request: { template: template, context: reporter.context }, 
                    response: {}
                });
            });
        }

        it('shoulb be able to modify request.data', function (done) {
            prepareRequest("request.data = 'xxx'; done()").then(function(res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.data);
                    done();
                });
            }).catch(done);
        });
        
         it('shoulb be able to modify request.template.content', function (done) {
            prepareRequest("request.template.content = 'xxx'; done()").then(function(res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.template.content);
                });
            }).fin(done);
        });

        it('shoulb be able to use linked modules', function (done) {
            var scriptContent = "var h = require('handlebars'); " +
                "var compiledTemplate = h.compile('foo'); " +
                "request.template.content = compiledTemplate();" +
                "done();";

            prepareRequest(scriptContent).then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function() {
                    assert.equal('foo', res.request.template.content);
                    done();
                });
            }).catch(done);
        });

        it('shoulb not be able to read local files', function (done) {
            var scriptContent = "var fs = require('fs'); " +
                "fs.readdir('d:\', function(err, files) { response.filesLength = files.length; done(); });";

            prepareRequest(scriptContent)
                .then(function(res) {
                    return reporter.scripts.handleBeforeRender(res.request, res.response);
                }).then(function() {
                        done(new Error('no error was thrown when it should have been'));
                }).catch(function() {
                    done();
                });
        });
    });
});