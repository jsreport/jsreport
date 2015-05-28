/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    should = require("should"),
    streamToString = require("./streamToString.js"),
    describeReporting = require("./helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../"), ["jsrender", "html", "templates", "childTemplates", "data", "scripts"], function (reporter) {

    describe('all extensions', function () {

        it('child template should be resolvable dynamically', function (done) {

            reporter.documentStore.collection("templates").insert({
                content: "child content", engine: "jsrender", recipe: "html", name: "foo"
            }).then(function () {
                return reporter.render({
                    template: {content: "{#child {{:a}}}", engine: "jsrender", recipe: "html"},
                    data: {a: "foo"}
                }).then(function (resp) {
                    resp.content.toString().should.be.eql("child content");
                    done();
                });
            }).catch(done);

        });

        it('scripts should be able to use sample data loaded before evaluating scripts', function (done) {

            reporter.documentStore.collection("data").insert({
                dataJson: "{ \"a\": \"foo\" }", shortid: "data"
            }).then(function () {
                return reporter.render({
                    template: {
                        content: "foo", engine: "jsrender", recipe: "html",
                        data: {shortid: "data"},
                        script: {
                            content: "function beforeRender(done) { request.template.content = request.data.a; done(); }"
                        }
                    }
                }).then(function (resp) {
                    resp.content.toString().should.be.eql("foo");
                    done();
                });
            }).catch(done);

        });

        it('scripts should be able to load data for the child template', function (done) {

            reporter.documentStore.collection("templates").insert({
                content: "{{:foo}}", engine: "jsrender", recipe: "html", name: "foo"
            }).then(function () {
                return reporter.render({
                    template: {
                        content: "{#child foo}", engine: "jsrender", recipe: "html",
                        script: {
                            content: "function beforeRender(done) { request.data.foo = 'x'; done(); }"
                        }
                    }
                }).then(function (resp) {
                    resp.content.toString().should.be.eql("x");
                    done();
                });
            }).catch(done);
        });

        it('child templates should be able to have assigned scripts loading data', function (done) {

            reporter.documentStore.collection("templates").insert({
                content: "{{:foo}}", engine: "jsrender", recipe: "html", name: "foo",
                script: {content: "function beforeRender(done) { request.data.foo = 'yes'; done(); }"}
            }).then(function () {
                return reporter.render({
                    template: {
                        content: "{#child foo}", engine: "jsrender", recipe: "html",
                        script: {
                            content: "function beforeRender(done) { request.data.foo = 'no'; done(); }"
                        }
                    }
                }).then(function (resp) {
                    resp.content.toString().should.be.eql("yes");
                    done();
                });
            }).catch(done);
        });

        it('should be able to process high volume inputs', function (done) {
            this.timeout(7000);
            var data = {people: []};
            for (var i = 0; i < 1000000; i++) {
                data.people.push(i);
            }
            return reporter.render({
                template: {content: "foo", engine: "jsrender", recipe: "html"},
                data: data
            }).then(function (resp) {
                resp.content.toString().should.be.eql("foo");
                done();
            }).catch(done);
        });
    });
});