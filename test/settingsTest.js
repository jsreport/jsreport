/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    Settings = require("../lib/util/settings.js"),
    DocumentStore = require("../lib/store/documentStore.js"),
    connectionString = require("./helpers.js").connectionString;

describe('Settings', function () {

    beforeEach(function (done) {
        var self = this;

        self.settings = new Settings();

        self.documentStore = new DocumentStore({
            connectionString: connectionString,
            dataDirectory: "data",
            logger: new (require("../lib/util/consoleLogger.js"))()
        });
        self.settings.registerEntity(self.documentStore);

        self.documentStore.init().then(function () {
            return self.documentStore.drop().then(function() {
                return self.documentStore.init().then(function() {
                    return self.settings.init(self.documentStore).then(function () {
                        done();
                    });
                });
            });
        }).catch(done);
    });

    it('add update get should result into updated value', function (done) {
        var self = this;
        this.settings.add("test", "val").then(function () {
            return self.settings.set("test", "modified").then(function () {
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