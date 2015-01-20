var assert = require("assert"),
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../"), ["templates","data"], function (reporter) {
    
    describe('data', function() {

        it('should find and use data', function (done) {
            var dataItem = {
                name: "test",
                dataJson: JSON.stringify({ a: 'xx' }) + ""
            };

            reporter.data.create(reporter.context, dataItem).then(function(data) {
                var request = {
                    reporter: reporter,
                    template: { content: "html", dataItemId: data.shortid },
                    options: { recipe: "html" },
                    context: reporter.context
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
                template: { content: "html", dataItemId: "MnI0b0QwNXBhZHlRSXBhRg==" },
                options: { recipe: "html" },
                context: reporter.context
            };

            reporter.data.handleBeforeRender(request, {}).fail(function (err) {
                assert.notEqual(null, err);
                done();
            });
        });
        
        it('should ignore extension when no data specified', function(done) {
            var request = {
                reporter: reporter,
                template: { content: "html", dataItemId: null },
                options: { recipe: "html" },
                context: reporter.context
            };

            reporter.data.handleBeforeRender(request, {}).then(function () {
                done();
            });
        });

    });
});
