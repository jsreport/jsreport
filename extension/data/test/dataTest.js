var assert = require("assert"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(["data"], function (reporter) {
    
    describe('data', function() {

        it('should find and use data', function (done) {
            var dataItem = {
                name: "test",
                dataJson: JSON.stringify({ a: 'xx' }) + "",
            };

            reporter.data.create(dataItem).then(function(data) {
                var request = {
                    reporter: reporter,
                    template: { content: "html", dataItemId: data.shortid },
                    options: { recipe: "html" },
                };

                reporter.data.handleBeforeRender(request, {}).then(function() {
                    assert.equal(request.data.a, JSON.parse(dataItem.dataJson).a);

                    done();
                });
            });
        });
        
        it('should callback error when missing data', function(done) {
            var request = {
                reporter: reporter,
                template: { content: "html", dataItemId: "AAAAAAAAAAAAAAAAAAAAAAAA" },
                options: { recipe: "html" },
            };

            reporter.data.handleBeforeRender(request, {}).fail(function (err) {
                assert.notEqual(null, err);
                done();
            });
        });

    });
});
