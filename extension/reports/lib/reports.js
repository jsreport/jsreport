var Readable = require("stream").Readable,
    shortid = require("shortid"),
    winston = require("winston"),
    events = require("events"),
    util = require("util"),
    sformat = require("stringformat"),
    async = require("async"),
    _ = require("underscore"),
    Q = require("q"),
    toArray = require('stream-to-array');


var logger = winston.loggers.get('jsreport');

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Reporting(reporter, definition);
};


Reporting = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;
    
    Object.defineProperty(this, "entitySet", {
        get: function () {
            return reporter.context.reports;
        }
    });
    
    this.reporter.extensionsManager.afterRenderListeners.add(definition.name, this, Reporting.prototype.handleAfterRender);
    this.reporter.extensionsManager.entitySetRegistrationListners.add(definition.name, this, Reporting.prototype.createEntitySetDefinitions);
    this.reporter.on("express-configure", Reporting.prototype.configureExpress.bind(this));
};

Reporting.prototype.configureExpress = function (app) {
    var self = this;
    app.get("/report/:id/content", function (req, res, next) {
        self.entitySet.find(req.params.id, function (result) {
            self.reporter.blobStorage.read(result.blobName, function(err, stream) {
               res.setHeader('Content-Type', result.contentType);
               stream.pipe(res); 
            });
        });
    });
};

Reporting.prototype.handleAfterRender = function (request, response) {
    logger.info("Reporting async options: " + request.options.async);
    var self = this;
    if (!request.options.async)
        return;

    function ensureBuffer(cb) {
        if (response.isStream) {
            return toArray(response.result, function(err, arr) {
                response.result = Buffer.concat(arr);
                cb();
            });
        }

        cb();
    }
    
    var report = new this.ReportType({
        recipe: request.options.recipe,
        name: request.template.name + "-" + request.template.generatedReportsCounter++,
        templateId: request.template._id,
        creationDate: new Date(),
        contentType: response.contentType,
    });

    var deferred = Q.defer();
    async.waterfall([
            function(callback) {
                ensureBuffer(callback);
            },
            function (callback) {
                logger.info("Inserting report to storage.");
                self.entitySet.add(report);
                self.entitySet.saveChanges().then(function () {
                    callback(null, null);
                }).fail(function (e) {
                    callback(e, null);
                });
            },
            function (res, callback) {
                logger.info("Writing report content to blob.");
                self.reporter.blobStorage.write(report._id + "." + response.fileExtension, response.result, callback);
            },
            function (blobName, callback) {
                logger.info("Updating report blob name " + blobName);
                self.entitySet.attach(report);
                report.blobName = blobName;
                return self.entitySet.saveChanges().then(function () { callback(null, null); });
            }
    ], function (err) {
        if (err)
            return deferred.reject(err);
        
        response.result = {
            _id: report._id,
            creationDate: report.creationDate,
            blobName: report.blobName,
            name: report.name
        };
        deferred.resolve();
    });

    return deferred.promise;
};

Reporting.prototype.createEntitySetDefinitions = function (entitySets, next) {
    
    this.ReportType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.Report"), $data.Entity, null, {
        _id: { type: "id", key: true, computed: true, nullable: false },
        creationDate: { type: "date" },
        recipe: { type: "string" },
        blobName: { type: "string" },
        contentType: { type: "string" },
        name: { type: "string" },
        templateId: { type: "id" },
    }, null);
    
    entitySets["reports"] = { type: $data.EntitySet, elementType: this.ReportType };

    next(); 
};

Reporting.prototype.find = function (preficate, params, cb) {
    this.entitySet.filter(preficate, params).toArray().then(function (res) { cb(null, res); });
};