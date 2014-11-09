/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Connects mongo client just once and keeps database object for whole application lifecycle. This allows to leverage
 * connection pool.
 *
 * Mongo client is disconnecting somehow when running behind azure firewall so this also contains some custom retry
 * policy.
 */

var mongodb = require("mongodb"),
    _ = require("underscore");

var _cachedDb = null;
var waitingRequests = [];
var isOperationRunning = false;

var socketOptions = {
    keepAlive: 1,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 60000
};
var pingTimeoutMS = 5000;

module.exports = function(providerConfiguration) {
    var logger = providerConfiguration.getLogger();
    var dbName = providerConfiguration.databaseName;

    return function(cb) {
        if (isOperationRunning) {
            waitingRequests.push({ dbName: dbName, cb: cb });
            return;
        }

        isOperationRunning = true;

        tryWithRetry(function (_cb) {
            getDbWithoutRetry(dbName, function (err, database) {
                if(err){
                    _cachedDb = null;
                    return _cb(err);
                }

                var timeout = false;
                var done = false;
                setTimeout(function () {
                    if (done)
                        return;

                    logger.warn("Mongo ping has timeout, db will reconnect");
                    _cachedDb = null;
                    timeout = true;
                    _cb("Timeout")
                }, pingTimeoutMS);

                database.executeDbCommand({ping: 1}, {failFast: true}, function (err) {
                    if (timeout)
                        return;

                    done = true;

                    if (err) {
                        logger.warn("Mongo ping failed, db will reconnect " + err.stack);
                        _cachedDb = null;
                        return _cb(err);
                    }

                    return _cb(null, database);
                });
            });
        }, function (err, database) {
            isOperationRunning = false;
            var _waitingRequests = waitingRequests.slice();
            waitingRequests = [];

            process.nextTick(function () {
                _waitingRequests.forEach(function (req) {
                    req.cb(err, database ? database.db(req.dbName) : null);
                });
            });

            cb(err, database);
        });
    }

    function tryWithRetry(fn, cb, retry) {
        retry = retry || 0;

        fn(function (err, result) {
            if (!err) {
                return cb(null, result);
            }

            if (err && retry > 10) {
                logger.warn("Retry count exceeded");
                return cb(err);
            }

            retry++;
            logger.warn("Retry in one second");
            setTimeout(function () {
                tryWithRetry(fn, cb, retry);
            }, 1000);
        });
    }

    function getDbWithoutRetry(dbName, cb) {
        if (_cachedDb) {
            return cb(null, _cachedDb.db(dbName));
        }

        var connectionString = "mongodb://";

        if (providerConfiguration.username) {
            connectionString += providerConfiguration.username + ":" + providerConfiguration.password + "@";
        }

        if (!_.isArray(providerConfiguration.address)) {
            providerConfiguration.address = [providerConfiguration.address];
            providerConfiguration.port = [providerConfiguration.port];
        }

        for (var i = 0; i < providerConfiguration.address.length; i++) {
            connectionString += providerConfiguration.address[i] + ":" + providerConfiguration.port[i] + ",";
        }

        connectionString = connectionString.substring(0, connectionString.length - 1);
        connectionString += "/admin";

        if (providerConfiguration.replicaSet) {
            connectionString += "?replicaSet=" + providerConfiguration.replicaSet;
        }

        var d = require('domain').create();

        d.on('error', function (er) {
            logger.warn("Mongo client running inside node domain crashed. Recycling domain... " + er);
            _cachedDb = null;
            cb(er);
        });

        logger.info("connecting to mongo");

        d.run(function () {
            mongodb.MongoClient.connect(connectionString, { server: { auto_reconnect: true, socketOptions: socketOptions },
                replSet: { auto_reconnect: true, socketOptions: socketOptions } }, function (err, database) {

                if (err) {
                    logger.error("initial connection to mongo failed " + err.err);
                    return cb(new Error(err.err));
                }

                _cachedDb = database;

                logger.debug("initial connection to mongo succeeded");
                cb(null, database.db(dbName));
            });
        });
    }
}

