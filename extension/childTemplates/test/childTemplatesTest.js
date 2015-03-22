/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
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

                return reporter.childTemplates.handleBeforeRender(request, {}).then(function () {
                    assert.equal("xx", request.template.content);
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

                return reporter.childTemplates.handleBeforeRender(request, {}).then(function () {
                    assert.equal("afoobafoo", request.template.content);
                    done();
                });
            }).catch(done);
        });
    });
});