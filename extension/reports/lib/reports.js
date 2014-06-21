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

module.exports = function (reporter, definition) {
    reporter[definition.name] = new Reporting(reporter, definition);
};


var Reporting = function (reporter, definition) {
    this.reporter = reporter;
    this.definition = definition;

    this.reporter.afterRenderListeners.add(definition.name, this, Reporting.prototype.handleAfterRender);
    this.reporter.on("express-configure", Reporting.prototype.configureExpress.bind(this));

    this._defineEntities();
};

Reporting.prototype.configureExpress = function (app) {
    var self = this;
    app.get("/api/report/:id/content", function (req, res, next) {
        self.reporter.dataProvider.startContext().then(function (context) {
            context.reports.find(req.params.id).then(function (result) {
                self.reporter.blobStorage.read(result.blobName, function (err, stream) {
                    res.setHeader('Content-Type', result.contentType);
                    res.setHeader('File-Extension', result.fileExtension);
                    stream.pipe(res);
                });
            }, function () {
                res.send(404);
            });
        });
    });
};

Reporting.prototype.handleAfterRender = function (request, response) {
    this.reporter.logger.info("Reporting saveResult options: " + request.options.saveResult);
    var self = this;

    if (!request.options.saveResult)
        return q();

    function ensureBuffer() {
        if (response.isStream) {
            return q.nfcall(toArray, response.result).then(function (arr) {
                response.result = Buffer.concat(arr);
            });
        }

        return q();
    }

    var report = new this.ReportType({
        recipe: request.options.recipe,
        name: request.template.name,
        fileExtension: response.headers["File-Extension"],
        templateShortid: request.template.shortid,
        creationDate: new Date(),
        contentType: response.headers['Content-Type']
    });


    return ensureBuffer().then(function () {
        self.reporter.logger.info("Inserting report to storage.");
        request.context.reports.add(report);
        return request.context.reports.saveChanges();
    }).then(function () {
        self.reporter.logger.info("Writing report content to blob.");
        return q.ninvoke(self.reporter.blobStorage, "write", report._id + "." + report.fileExtension, response.result);
    }).then(function (blobName) {
        self.reporter.logger.info("Updating report blob name " + blobName);
        request.context.reports.attach(report);
        report.blobName = blobName;
        return request.context.reports.saveChanges();
    }).then(function () {
        response.headers["Permanent-Link"] = "https://" + request.headers.host + "/api/report/" + report._id + "/content";
        response.headers["Report-Id"] = report._id;
        response.headers["Report-BlobName"] = report.blobName;
    });
};

Reporting.prototype._defineEntities = function () {

    this.ReportType = this.reporter.dataProvider.createEntityType("ReportType", {
        _id: { type: "id", key: true, computed: true, nullable: false },
        creationDate: { type: "date" },
        recipe: { type: "string" },
        blobName: { type: "string" },
        contentType: { type: "string" },
        name: { type: "string" },
        fileExtension: { type: "string" },
        templateShortid: { type: "string" }
    });

    this.reporter.dataProvider.registerEntitySet("reports", this.ReportType, { tableOptions: { nedbPersistance: "singleFile" }  });
};