/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    should = require("should"),
    S = require("string"),
    describeReporting = require("../../../test/helpers.js").describeReporting,
    q = require("q");


describeReporting(path.join(__dirname, "../../../"), ["jsrender", "html", "templates", "scripts"], function (reporter) {

    describe('scripts', function () {

        function prepareTemplate(scriptContent) {
            return reporter.documentStore.collection("scripts").insert({content: scriptContent}).then(function (script) {
                return reporter.documentStore.collection("templates").insert({
                    content: "foo",
                    script: {shortid: script.shortid}
                });
            });
        }

        function prepareRequest(scriptContent) {
            return prepareTemplate(scriptContent).then(function (template) {
                return q({
                    request: {template: template, reporter: reporter, options: {}},
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
            var scriptContent = "request.template.content = require('underscore').isArray([]); " +
                "done();";

            prepareRequest(scriptContent).then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {

                    res.request.template.content.should.be.eql(true);
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
                    res.response.content = new Buffer([1]);
                    return reporter.scripts.handleAfterRender(res.request, res.response).then(function () {
                        assert.equal(1, res.response.content[0]);
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
            }).catch(function () {
                done();
            });
        });

        it('should propagate exception from async back', function (done) {
            prepareRequest("setTimeout(function() { foo; }, 0);").then(function (res) {
                return reporter.scripts.handleBeforeRender(res.request, res.response).then(function () {
                    done(new Error('no error was thrown when it should have been'));
                });
            }).catch(function (e) {
                try {
                    e.message.should.containEql("foo");
                }
                catch (e) {
                    return done(e);
                }
                done();
            });
        });

        it('should be abble to callback and call reporter.render', function (done) {
            reporter.documentStore.collection("templates").insert({
                name: "foo",
                content: "foo",
                engine: "jsrender",
                recipe: "html"
            }).then(function (tmpl) {
                var request = {
                    template: {
                        content: "original",
                        recipe: "html",
                        engine: "jsrender",
                        script: {
                            content: "function afterRender(done) { reporter.render({ template: { shortid: '" + tmpl.shortid + "'} }, function(err, resp) { if (err) return done(err); response.content = resp.content; done(); }); };"
                        }
                    }
                };
                return reporter.render(request).then(function (response) {
                    response.content.toString().should.be.eql("foo");
                    done();
                });
            }).catch(done);
        });

        it('should callback error should be gracefully handled', function (done) {
            var request = {
                template: {
                    content: "original",
                    recipe: "html",
                    engine: "jsrender",
                    script: {
                        content: "function afterRender(done) { reporter.render({ }, function(err, resp) { if (err) return done(err); response.content = resp.content; done(); }); };"
                    }
                }
            };
            return reporter.render(request).then(function (response) {
                done(new Error("Should have failed."));
            }).catch(function (e) {
                e.message.should.containEql("template property must");
                done();
            });
        });

        it('should be able to substitute template with another template using callback', function (done) {
            reporter.documentStore.collection("templates").insert({
                name: "foo",
                content: "foo",
                engine: "jsrender",
                recipe: "html"
            }).then(function (tmpl) {
                var request = {
                    template: {
                        content: "original",
                        recipe: "html",
                        engine: "jsrender",
                        script: {
                            content: "function beforeRender(done) { reporter.render({ template: { shortid: '" + tmpl.shortid + "'} }, function(err, resp) { if (err) return done(err); " +
                            "request.template.content = new Buffer(resp.content).toString(); done(); }); };"
                        }
                    }
                };
                return reporter.render(request).then(function (response) {
                    response.content.toString().should.be.eql("foo");
                    done();
                });
            }).catch(done);
        });

        it('should monitor rendering cycles', function (done) {
            this.timeout(5000);
            reporter.documentStore.collection("templates").insert({
                name: "foo",
                content: "foo",
                engine: "jsrender",
                recipe: "html",
                shortid: "id",
                script: {
                    content: "function beforeRender(done) { reporter.render({ template: { shortid: 'id'} }, function(err, resp) { if (err) return done(err); " +
                    "request.template.content = new Buffer(resp.content).toString(); done(); }); };"
                }
            }).then(function (tmpl) {
                var request = {
                    template: {
                        shortid: "id"
                    }
                };
                return reporter.render(request).then(function (response) {
                    done(new Error("It should have failed"));
                });
            }).catch(function (e) {
                e.message.should.containEql("cycle");
                done();
            });
        });
    });
});