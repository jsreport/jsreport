describe('data', function () {

    this.timeout(5000);

    beforeEach(function(done) {
        window.location.hash = "";
        ensureStarted(done);
    });

    it('should not fail', function (done) {
        require(["jquery"], function ($) {
            window.location.hash = "/extension/data/detail";
            setTimeout(function() {
                done();
            }, 500);
        });
    });
});
