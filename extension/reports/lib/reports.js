/*! 
 * Copyright(c) 2014 Jan Blaha 
 *
 * Reports extension allows to store rendering output into storage for later use.
 */

var events = require("events"),
    util = require("util"),
    async = require("async"),
    _ = require("underscore"),
    q = require("q"),
    toArray = require('stream-to-array');

var Reporting = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this.reporter.afterRenderListeners.add(definition.name, this, Reporting.prototype.handleAfterRender);
    this.reporter.on("express-configure", Reporting.prototype.configureExpress.bind(this));

    this._defineEntities();
};

Reporting.prototype.configureExpress = function (app) {
    var self = this;
    app.get("/reports/:id/content", function (req, res, next) {
        self.reporter.documentStore.collection("reports").find({_id: req.params.id}).then(function (result) {
            if (result.length !== 1)
                throw new Error("Report " + req.params.id + " not found");

            return q.ninvoke(self.reporter.blobStorage, "read", result[0].blobName).then(function(stream) {
                stream.on('error', function(err) {
                    res.error(err);
                });

                res.setHeader('Content-Type', result[0].contentType);
                res.setHeader('File-Extension', result[0].fileExtension);
                stream.pipe(res);
            });
        }).catch(next);
    });
};

Reporting.prototype.handleAfterRender = function (request, response) {
    var self = this;

    request.options.reports = request.options.reports || {};
    if (request.options.saveResult)
        request.options.reports.save = true;

    if (!request.options.reports.save || request.options.isChildRequest) {
        this.reporter.logger.debug("Skipping storing report.");
        return q();
    }

    var report = _.extend(request.options.reports.mergeProperties || {}, {
            recipe: request.template.recipe,
            name: request.template.name,
            fileExtension: response.headers["File-Extension"],
            templateShortid: request.template.shortid,
            creationDate: new Date(),
            contentType: response.headers['Content-Type']
        });

    self.reporter.logger.debug("Inserting report into storage.");

    return self.reporter.documentStore.collection("reports").insert(report).then(function () {
        self.reporter.logger.debug("Writing report content to blob.");
        return q.ninvoke(self.reporter.blobStorage, "write", report._id + "." + report.fileExtension, response.result);
    }).then(function (blobName) {
        self.reporter.logger.debug("Updating report blob name " + blobName);
        return self.reporter.documentStore.collection("reports").update({ _id: report._id }, {$set: {blobName: blobName}});
    }).then(function () {
        if (request.headers)
            response.headers["Permanent-Link"] = request.protocol + "://" + request.headers.host + "/api/report/" + report._id + "/content";

        response.headers["Report-Id"] = report._id;
        response.headers["Report-BlobName"] = report.blobName;
    });
};

Reporting.prototype._defineEntities = function () {

    this.ReportType = this.reporter.documentStore.registerEntityType("ReportType", {
        _id: {type: "Edm.String", key: true},
        creationDate: {type: "Edm.DateTimeOffset"},
        recipe: {type: "Edm.String"},
        blobName: {type: "Edm.String"},
        contentType: {type: "Edm.String"},
        name: {type: "Edm.String"},
        fileExtension: {type: "Edm.String"},
        templateShortid: {type: "Edm.String"}
    });

    this.reporter.documentStore.registerEntitySet("reports", {entityType: "jsreport.ReportType"});
};

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Reporting(reporter, definition);
};