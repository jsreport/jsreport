/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    describeReporting = require("./helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../"), ["html", "templates"], function (reporter) {
    
    describe('reporter', function () {
        
        it('should render html', function (done) {
            reporter.render({ template: { content: "Hey", engine: "handlebars", recipe: "html" } }).then(function(resp) {
                assert.equal("Hey", resp.result);
                done();
            }).catch(done);
        });
        
        it('should call before render and after render listeners', function (done) {

            var listenersCall = [];
            reporter.beforeRenderListeners.add("test", this, function() {
                listenersCall.push("before");
            });

            reporter.afterRenderListeners.add("test", this, function() {
                listenersCall.push("after");
            });

            reporter.render({ template: { content: "Hey", engine: "handlebars", recipe: "html" } }).then(function(resp) {
                assert.equal(listenersCall[0], "before");
                assert.equal(listenersCall[1], "after");
                done();
            }).catch(done);
        });

        it('should parse string request.data into json', function (done) {
            reporter.render({
                template: { content: "{{{a}}}", engine: "handlebars", recipe: "html" },
                data: "{ \"a\":\"1\" }"
            }).then(function(resp) {
                assert.equal("1", resp.result);
                done();
            });
        });

        it('getEngines should return some engines', function (done) {
            reporter.getEngines().then(function(res) {
                assert.equal(true, res.length > 0);
                done();
            }).catch(done);
        });

    });
});