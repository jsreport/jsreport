describe('foo', function () {

    var server = sinon.fakeServer.create();

//    server.respondWith("GET", "/html-templates",
//        [200, { "Content-Type": "application/json" },
//            JSON.stringify(templates)]);

    it('should not fail', function (done) {
        require(["app"], function(app) {
            server.requests[1].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify(templates));

            server.requests[2].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify(["html", "phantom-pdf"]));

            server.requests[3].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify(["jsrender", "handlebars"]));

            server.requests[4].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify([]));

            console.log("h");

            setTimeout(function() {
                console.log(server.requests.length);
                server.requests[5].respond(
                    200,
                    { "Content-Type": "application/json" },
                    JSON.stringify([]));
                server.respondWith("GET", "/api/extensions", [200, { "Content-Type": "application/json" }, JSON.stringify(extensions)]);

                setTimeout(function() {
                    server.requests[6].respond(
                        200,
                        { "Content-Type": "application/xml" },
                        settings);

                    console.log(server.requests.length);
                }, 500);
            }, 500);

            //

            //console.log("sending requests " + JSON.stringify(server.requests));

        });



//        require(["marionette", "../" + "../../../test/ui/squire"], function(Marionette, Squire) {
//            var injector = new Squire();
//            var appMock = new Marionette.Application();
//            appMock.serverUrl = "testChange";
//
//            injector.mock('app', appMock)
//                .require(['app', "layout"], function(app, Layout) {
//                    //expect.eql(app.serverUrl, "testChange5");
//                    expect(app.serverUrl).to.be.eql('testChange');
//                    done();
//                });
//        });
            
            
        //    //var injector = new Squire();
        //    var appMock = new Marionette.Application();
        //    appMock.serverUrl = "testChange";
        //    done();

        //    //injector.mock('app', appMock)
        //    //  .require(['app', "core/extensions/module"], function (app, extensionsModule) {
        //    //      expect.eql(app.serverUrl, "testChange");
        //    //      done();
        //    //  });
        //});

    });
});