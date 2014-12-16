/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    should = require("should"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    q = require("q");


describeReporting(path.join(__dirname, "../../"), ["html", "templates", "scripts"], function (reporter) {

    describe('scripts', function () {

        function prepareTemplate(scriptContent) {
            var script = new reporter.scripts.ScriptType({content: scriptContent});
            reporter.context.scripts.add(script);
            return reporter.context.scripts.saveChanges().then(function () {
                return reporter.templates.create({
                    content: "foo",
                    script: {shortid: script.shortid}
                });
            });
        }

        function prepareRequest(scriptContent) {
            return prepareTemplate(scriptContent).then(function (template) {
                return q({
                    request: {template: template, context: reporter.context, reporter: reporter},
                    response: {}
                });
            });
        }

        it('should be able to modify request.data', function (done) {
            prepareRequest("request.data = 'xxx'; done()").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.data);
                    done();
                });
            }).catch(done);
        });

        it('should be able to modify complex request.data', function (done) {
            prepareRequest("request.data = { a: 'xxx' }; done()").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.data.a);
                    done();
                });
            }).catch(done);
        });

        it('should be able to modify request.template.content', function (done) {
            prepareRequest("request.template.content = 'xxx'; done()").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.template.content);
                });
            }).fin(done);
        });

        it('should be able to use linked modules', function (done) {
            var scriptContent = "var h = require('handlebars'); " +
                "var compiledTemplate = h.compile('foo'); " +
                "request.template.content = compiledTemplate();" +
                "done();";

            prepareRequest(scriptContent).then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('foo', res.request.template.content);
                    done();
                });
            }).catch(done);
        });

        it('should not be able to read local files', function (done) {
            var scriptContent = "var fs = require('fs'); " +
                "fs.readdir('d:\', function(err, files) { response.filesLength = files.length; done(); });";

            prepareRequest(scriptContent)
                .then(function (res) {
                    return reporter.scripts.handleBeforeRender(res.request, res.response);
                }).then(function () {
                    done(new Error('no error was thrown when it should have been'));
                }).catch(function () {
                    done();
                });
        });

        it('should be able to processes async test', function (done) {
            prepareRequest("setTimeout(function(){ request.template.content = 'xxx'; done(); }, 10);").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.template.content);
                    done();
                });
            }).catch(done);
        });

        it('should be able to processes beforeRender function', function (done) {
            prepareRequest("function beforeRender(done){ request.template.content = 'xxx'; done(); }").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.template.content);
                    done();
                });
            }).catch(done);
        });

        it('should be able to processes afterRender function', function (done) {
            prepareRequest("function afterRender(done){ response.content[0] = 1; done(); }").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    res.response.result = new Buffer([1]);
                    return reporter.scripts.handleAfterRender(res.request, res.response).then(function () {
                        assert.equal(1, res.response.result[0]);
                        done();
                    });
                });
            }).catch(done);
        });

        it('should be able to add property to request', function (done) {
            prepareRequest("request.foo = 'xxx'; done(); ").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    assert.equal('xxx', res.request.foo);
                    done();
                });
            }).catch(done);
        });

        it('should be able to cancel request', function (done) {
            prepareRequest("request.cancel();").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    done(new Error('no error was thrown when it should have been'));
                });
            }).catch(function() {
                done();
            });
        });

        it('should propagate exception from async back', function (done) {
            prepareRequest("setTimeout(function() { foo; }, 0);").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    done(new Error('no error was thrown when it should have been'));
                });
            }).catch(function(e) {
                try {
                    e.message.should.containEql("foo");
                }
                catch(e) { return done(e);}
                done();
            });
        });
    });
});