/* globals requests */

var server = sinon.fakeServer.create();
var started = false;

expect.Assertion.prototype.shown = function (cb) {
    var self = this;

    this.evaluate(function() {
        return $(self.obj).length;
    }, cb, 0);
};

expect.Assertion.prototype.evaluate = function (fn, cb, attemp) {
    attemp = attemp || 1;

    if (attemp > 50) {
        throw new Error("Element " + this.obj + " did not pop up");
    }

    if (fn()) {
        return cb();
    }

    var self = this;
    setTimeout(function() {
        self.evaluate(fn, cb, attemp + 1);
    }, 50);
};

function waitUntil(condition, cb) {
    if (condition()) {
        return cb();
    }
    setTimeout(function () {
        waitUntil(condition, cb);
    }, 10);
}

function ensureStarted(cb) {
    waitUntil(function() { return started;}, function() {
        waitUntil(function() {
            return typeof ace !== 'undefined';
        }, cb);
    });
}

function startApplication(cb) {

    require(["app"], function (app) {

        //app.options.showIntro = false;
        app.on("after-start", function() {
            setTimeout(cb, 500);
        });

        waitUntil(function () {
            return server.requests.length > 1;
        }, function () {
            server.requests[1].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify(requests.templates));

            server.requests[2].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify(["html", "phantom-pdf", "templates", "scripts"]));

            server.requests[3].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify(["jsrender", "handlebars"]));

            server.requests[4].respond(
                200,
                { "Content-Type": "application/json" },
                JSON.stringify([]));

            waitUntil(function () {
                return server.requests.length === 6;
            }, function () {
                server.requests[5].respond(
                    200,
                    { "Content-Type": "application/json" },
                    JSON.stringify(requests.extensions));

                waitUntil(function () {
                    return server.requests.length === 7;
                }, function () {
                    server.requests[6].respond(
                        200,
                        { "Content-Type": "application/xml" },
                        requests.settings);
                });
            });
        });
    });
}

setTimeout(function() {
    startApplication(function() { return started = true;});
}, 1000);
