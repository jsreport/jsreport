/*globals describe, it, beforeEach, afterEach */

var should = require("should"),
    DocumentStore = require("../lib/store/documentStore.js");


describe('document store', function () {
    var documentStore;

    beforeEach(function (done) {
        require("../lib/util/util.js").deleteFiles("../data");
        documentStore = new DocumentStore({
            connectionString: {name: "neDB"},
            dataDirectory: "../data",
            logger: new (require("../lib/util/consoleLogger.js"))()
        });
        documentStore.registerEntityType("User", {
            "_id": {"type": "Edm.String", key: true},
            "test": {"type": "Edm.String"},
            "num": {"type": "Edm.Int32"}
        });
        documentStore.registerEntitySet("users", {
            entityType: "jsreport.User"
        });

        documentStore.init().then(function () {
            done();
        }).catch(done);
    });

    it('insert should not fail', function (done) {
        documentStore.collection("users").insert({test: "foo"})
            .then(function (doc) {
                doc._id.should.be.ok;
                done();
            }).catch(done);
    });

    it('insert and find should return', function (done) {
        documentStore.collection("users").insert({test: "foo"})
            .then(function (doc) {
                return documentStore.collection("users").find({test: "foo"});
            }).then(function (docs) {
                docs[0].test.should.be.eql("foo");
                done();
            }).catch(done);
    });

    it('insert and update and find should return updated', function (done) {
        documentStore.collection("users").insert({test: "foo"})
            .then(function (doc) {
                return documentStore.collection("users").update({test: "foo"}, {$set: {test: "foo2"}});
            }).then(function () {
                return documentStore.collection("users").find({});
            }).then(function (docs) {
                docs[0].test.should.be.eql("foo2");
                done();
            }).catch(done);
    });
});
