/*globals describe, it, beforeEach, afterEach */

var assert = require("assert"),
    path = require("path"),
    validate = require("../lib/configuration/validate.js");

describe('validating configuration', function () {

    it('should throw when cluster enabled with nedb', function () {
        var configuration = {
            cluster: {
                numberOfWorkers : 2,
                enabled : true
            },
            connectionString: { name: "neDB"},
            rootDirectory: path.join(__dirname, "../")
        };

        assert.throws(function() {
            validate(configuration);
        });
    });

    it('should pass when cluster disabled with nedb', function () {
        var configuration = {
                cluster: {
                    numberOfWorkers : 2,
                    enabled : false
                },
                connectionString: { name: "neDB"}
        };

        validate(configuration);
    });

    it('should pass when cluster enabled with mongo', function () {
        var configuration = {
            cluster: {
                numberOfWorkers : 2,
                enabled: true
            },
            connectionString: { name: "mongoDB", databaseName: "test", address: "127.0.0.1", port: 27017 },
            rootDirectory: path.join(__dirname, "../")
        };

        validate(configuration);
    });

    it('should fail without valid connection string', function () {
        var configuration = {
            cluster: {
                numberOfWorkers : 2,
                enabled: true
            },
            rootDirectory: path.join(__dirname, "../")
        };

        assert.throws(function() {
            validate(configuration);
        });
    });

    it('should fail without connection string name', function () {
        var configuration = {
            cluster: {
                numberOfWorkers : 2,
                enabled: true
            },
            rootDirectory: path.join(__dirname, "../"),
            connectionString: {  }
        };

        assert.throws(function() {
            validate(configuration);
        });
    });
});
