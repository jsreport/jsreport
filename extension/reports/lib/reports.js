/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Reports extension allows to store rendering output into storage for later use.
 */ 

var Readable = require("stream").Readable,
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
    
    this.reporter.afterRenderListeners.add(definition.name, this, Reporting.prototype.handleAfterRender);
    this.reporter.entitySetRegistrationListners.add(definition.name, this, Reporting.prototype.createEntitySetDefinitions);
    this.reporter.on("express-configure", Reporting.prototype.configureExpress.bind(this));
};

Reporting.prototype.configureExpress = function (app) {
    var self = this;
    app.get("/api/report/:id/content", function (req, res, next) {
        self.reporter.startContext().reports.find(req.params.id).then(function (result) {
            self.reporter.blobStorage.read(result.blobName, function(err, stream) {
               res.setHeader('Content-Type', result.contentType);
               res.setHeader('File-Extension', result.fileExtension);
               stream.pipe(res);
            });
        }, function() {
             res.send(404);
        });
    });
};

Reporting.prototype.handleAfterRender = function (request, response) {
    logger.info("Reporting saveResult options: " + request.options.saveResult);
    var self = this;
    
    if (!request.options.saveResult)
        return Q();

    function ensureBuffer() {
        if (response.isStream) {
            return Q.nfcall(toArray, response.result).then(function(arr) {
                response.result = Buffer.concat(arr);
            });
        }

        return Q();
    }
    
    var report = new this.ReportType({
        recipe: request.options.recipe,
        name: request.template.name + " - " + request.template.generatedReportsCounter,
        fileExtension: response.headers["File-Extension"],
        templateShortid: request.template.shortid,
        creationDate: new Date(),
        contentType: response.headers['Content-Type'],
    });


    return ensureBuffer().then(function() {
        logger.info("Inserting report to storage.");
        request.context.reports.add(report);
        return request.context.reports.saveChanges();
    }).then(function() {
        logger.info("Writing report content to blob.");
        return Q.ninvoke(self.reporter.blobStorage, "write", report._id + "." + report.fileExtension, response.result);
    }).then(function(blobName) {
        logger.info("Updating report blob name " + blobName);
        request.context.reports.attach(report);
        report.blobName = blobName;
        return request.context.reports.saveChanges();
    }).then(function() {
        response.headers["Permanent-Link"] = "https://" + request.headers.host + "/api/report/" + report._id + "/content";
        response.headers["Report-Id"] = report._id;
    });
};

Reporting.prototype.createEntitySetDefinitions = function (entitySets) {
    
    this.ReportType = $data.Class.define(this.reporter.extendGlobalTypeName("$entity.Report"), $data.Entity, null, {
        _id: { type: "id", key: true, computed: true, nullable: false },
        creationDate: { type: "date" },
        recipe: { type: "string" },
        blobName: { type: "string" },
        contentType: { type: "string" },
        name: { type: "string" },
        fileExtension: { type: "string" },
        templateShortid: { type: "string" },
    }, null);
    
    entitySets["reports"] = { type: $data.EntitySet, elementType: this.ReportType }; 
};

Reporting.prototype.find = function (preficate, params, cb) {
    this.reporter.context.reports.filter(preficate, params).toArray().then(function (res) { cb(null, res); });
};