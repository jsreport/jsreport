/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    Settings = require("../lib/util/settings.js"),
    foo = require("odata-server"),
    DataProvider = require("../lib/dataProvider.js"),
    connectionString = require("./helpers.js").connectionString;

describe('Settings', function () {

    beforeEach(function (done) {
        var self = this;

        self.settings = new Settings();

        self.dataProvider = new DataProvider(connectionString, { dataDirectory: "data", logger : new (require("../lib/util/consoleLogger.js"))()});
        self.settings.registerEntity(self.dataProvider);
        self.dataProvider.buildContext();

        self.dataProvider.dropStore().then(function() {
            self.dataProvider.startContext().then(function (context) {
                self.settings.init(context).then(function () {
                    done();
                });
            });
        });
    });

    it('add update get should result into updated value', function (done) {
        var self = this;
        this.settings.add("test", "val").then(function () {
            self.settings.set("test", "modified").then(function () {
                assert.equal("modified", self.settings.get("test").value);
                done();
            });
        }).catch(done);
    });

    it('add and get should result into same value', function (done) {
        var self = this;
        this.settings.add("test", "val").then(function () {
            assert.equal("val", self.settings.get("test").value);
            done();
        }).catch(done);
    });
});