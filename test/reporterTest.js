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
        
        //TODO
    });

});