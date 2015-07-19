var assert = require("assert"),
    path = require("path"),
    describeReporting = require("../../../test/helpers.js").describeReporting;

describeReporting(path.join(__dirname, "../../../"), ["templates","data"], function (reporter) {
    
    describe('data', function() {

        it('should find and use data based on shortid', function (done) {
            var dataItem = {
                name: "test",
                dataJson: JSON.stringify({ a: 'xx' }) + ""
            };

            return reporter.documentStore.collection("data").insert(dataItem).then(function(data) {
                var request = {
                    reporter: reporter,
                    template: { content: "html", data: { shortid: data.shortid } },
                    options: { recipe: "html" }
                };

                return reporter.data.handleBeforeRender(request, {}).then(function() {
                    assert.equal(request.data.a, JSON.parse(dataItem.dataJson).a);
                    done();
                });
            }).catch(done);
        });

        it('should find and use data based on name', function (done) {
            var dataItem = {
                name: "test",
                dataJson: JSON.stringify({ a: 'xx' }) + ""
            };

            return reporter.documentStore.collection("data").insert(dataItem).then(function(data) {
                var request = {
                    reporter: reporter,
                    template: { content: "html", data: { name: "test" } },
                    options: { recipe: "html" }
                };

                return reporter.data.handleBeforeRender(request, {}).then(function() {
                    assert.equal(request.data.a, JSON.parse(dataItem.dataJson).a);
                    done();
                });
            }).catch(done);
        });
        
        it('should callback error when missing data', function(done) {
            var request = {
                reporter: reporter,
                template: { content: "html", data: { shortid : "MnI0b0QwNXBhZHlRSXBhRg=="} },
                options: { recipe: "html" }
            };

            return reporter.data.handleBeforeRender(request, {}).fail(function (err) {
                assert.notEqual(null, err);
                done();
            });
        });
        
        it('should ignore extension when no data specified', function(done) {
            var request = {
                reporter: reporter,
                template: { content: "html", dataItemId: null },
                options: { recipe: "html" }
            };

            reporter.data.handleBeforeRender(request, {}).then(function () {
                done();
            }).catch(done);
        });

    });
});
