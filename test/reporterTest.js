var assert = require("assert"),
    Reporter = require("../reporter.js"),
    fs = require('fs'),
    path = require("path"),
    util = require("../util.js"),
    describeReporting = require("./helpers.js").describeReporting;

describeReporting([], function (reporter) {
    
    describe('reporter', function () {
        
        it('should render html', function (done) {
            reporter.render({ template: { content: "Hey", engine: "handlebars", recipe: "html" } }).then(function(resp) {
                assert.equal("Hey", resp.result);
                done();
            });
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
            });
        });
    });
});