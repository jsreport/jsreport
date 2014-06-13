/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    fs = require('fs'),
    path = require("path"),
    _ = require("underscore"),
    describeReporting = require("../../../test/helpers.js").describeReporting;


describeReporting(path.join(__dirname, "../../"), ["html", "fop-pdf"], function(reporter) {
    describe('fop pdf', function () {
        
        it('should be rendered', function(done) {
            this.timeout(10000);
            
            var request = {
                options: { recipe: "fop", timeout: 10000 },
                template: { content: "<?xml version='1.0' encoding='utf-8'?><fo:root xmlns:fo='http://www.w3.org/1999/XSL/Format'><fo:layout-master-set><fo:simple-page-master master-name='A4' page-width='297mm' page-height='210mm' margin-top='1cm' margin-bottom='1cm' margin-left='1cm' margin-right='1cm'><fo:region-body margin='3cm'/><fo:region-before extent='2cm'/><fo:region-after extent='2cm'/><fo:region-start extent='2cm'/><fo:region-end extent='2cm'/></fo:simple-page-master></fo:layout-master-set><fo:page-sequence master-reference='A4' format='A'><fo:flow flow-name='xsl-region-body'><fo:block><fo:inline font-weight='bold'>Hello world!</fo:inline></fo:block></fo:flow></fo:page-sequence></fo:root>" }
            };
            
            _.findWhere(reporter.extensionsManager.recipes, { name: "fop-pdf" }).execute(request, { headers : {}}).then(function () {
                done();
            });
        });
        
        it('should fail with invalid fo', function(done) {
            this.timeout(10000);
            var request = {
                options: { recipe: "fop", timeout: 10000 },
                template: { content: "hngngh<?xml version='1.0' encoding='utf-8'?><fo:FAIL xmlns:fo='http://www.w3.org/1999/XSL/Format'><fo:layout-master-set><fo:simple-page-master master-name='A4' page-width='297mm' page-height='210mm' margin-top='1cm' margin-bottom='1cm' margin-left='1cm' margin-right='1cm'><fo:region-body margin='3cm'/><fo:region-before extent='2cm'/><fo:region-after extent='2cm'/><fo:region-start extent='2cm'/><fo:region-end extent='2cm'/></fo:simple-page-master></fo:layout-master-set><fo:page-sequence master-reference='A4' format='A'><fo:flow flow-name='xsl-region-body'><fo:block><fo:inline font-weight='bold'>Hello world!</fo:inline></fo:block></fo:flow></fo:page-sequence></fo:root>" }
            };
            
            _.findWhere(reporter.extensionsManager.recipes, { name: "fop-pdf" }).execute(request, { headers : {}}).then(function () {}, function() {
                done();
            });
        });

    });
});
