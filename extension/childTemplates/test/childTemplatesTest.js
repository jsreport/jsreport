/*globals describe, it, beforeEach, afterEach */

var path = require("path"),
    should = require("should"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(path.join(__dirname, "../../"), ["html", "templates", "childTemplates"], function (reporter) {

    describe('childTemplates', function () {

        it('should replace child template mark with its content', function (done) {
            reporter.documentStore.collection("templates").insert({
                content: "xx",
                engine: "jsrender",
                recipe: "html",
                name: "t1" }).then(function (t) {

                var request = {
                    template: { content: "{#child t1}" },
                    options: {}
                };

                return reporter.childTemplates.evaluateChildTemplates(request, {}, true).then(function () {
                    request.template.content.should.be.eql("xx");
                    done();
                });
            }).catch(done);
        });

        it('should handle multiple templates in one', function (done) {
            reporter.documentStore.collection("templates").insert({
                content: "{{>~a()}}",
                engine: "jsrender",
                helpers: "function a() { return \"foo\"; }",
                recipe: "html",
                name: "t1" }).then(function (t) {

                var request = {
                    template: { content: "a{#child t1}ba{#child t1}" },
                    options: {}
                };

                return reporter.childTemplates.evaluateChildTemplates(request, {}, true).then(function () {
                    request.template.content.should.be.eql("afoobafoo");
                    done();
                });
            }).catch(done);
        });

        it('should throw when there is circle in templates', function (done) {
            reporter.documentStore.collection("templates").insert({ content: "{#child t2}", engine: "jsrender", recipe: "html", name: "t1" }).then(function (t1) {
                return reporter.documentStore.collection("templates").insert({ content: "{#child t1}", engine: "jsrender", recipe: "html", name: "t2" }).then(function (t2) {
                    return reporter.render({ template: { shortid: t1.shortid}}, {}).then(function () {
                        done(new Error("Should throw"));
                    });
                });
            }).catch(function(e) {
                e.weak.should.be.ok;
                done();
            });
        });
    });
});
