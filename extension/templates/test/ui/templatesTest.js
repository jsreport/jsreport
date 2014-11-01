describe('templates', function () {
    this.timeout(5000);

    beforeEach(function (done) {
        window.location.hash = "";
        ensureStarted(done);
    });

    it('template module should be ok', function (done) {
        require(["app"], function (app) {
            expect(app.template).to.be.ok();
            done();
        });
    });

    it('navigating to playground should open page', function (done) {
        window.location.hash = "/playground";

        expect("#previewCommand").to.be.shown(done);
    });

});


